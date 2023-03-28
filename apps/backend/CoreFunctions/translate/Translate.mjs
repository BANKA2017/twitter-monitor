import { TRANSLATE_TARGET, TRANSLATOR_PLATFORM } from "../../../../libs/assets/setting.mjs"
import { VerifyQueryString } from "../../../../libs/core/Core.function.mjs"
import { Translate } from "../../../../libs/core/Core.translate.mjs"
import V2AccountInfo from "../../../../libs/model/twitter_monitor/v2_account_info.js"
import V2TwitterQuote from "../../../../libs/model/twitter_monitor/v2_twitter_quote.js"
import V2TwitterTweets from "../../../../libs/model/twitter_monitor/v2_twitter_tweets.js"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { GetUid } from "../local/Local.mjs"


const ApiLocalTranslate = async (req, res) => {
    const target = VerifyQueryString(req.query.to, TRANSLATE_TARGET)
    //const cacheText = target.toLowerCase() === TRANSLATE_TARGET.toLowerCase()//TODO remove
    const platform = VerifyQueryString(req.query.platform, TRANSLATOR_PLATFORM).toLowerCase()
    const tweetId = VerifyQueryString(req.query.tweet_id, 0)
    const {uid} = await GetUid(req.query)
    const translateType = VerifyQueryString(req.query.tr_type, 'tweets') === 'profile' ? 'profile' : 'tweets'
    if ((tweetId !== 0 && translateType === 'tweets') || (uid !== '0' && translateType === 'profile')) {
        let trInfo = null
        switch (translateType) {
            case 'tweets':
                try {
                    trInfo = await V2TwitterTweets.findOne({
                        attributes: ["full_text"],
                        where: {tweet_id: tweetId},
                        raw: true
                    })
                    
                    //if empty, then check quote tweets
                    if (!trInfo) {
                        trInfo = await V2TwitterQuote.findOne({
                            attributes: ["full_text"],
                            where: {tweet_id: tweetId},
                            raw: true
                        })
                    }
                } catch (e) {
                    res.json(apiTemplate(500, 'Unknown error #GetTweetTranslate', [], 'translate'))
                    return
                }
                break
            case 'profile':
                try {
                    trInfo = await V2AccountInfo.findOne({
                        attributes: [["description", "full_text"]],
                        where: {uid},
                        raw: true
                    })
                } catch (e) {
                    res.json(apiTemplate(500, 'Unknown error #GetProfileTranslate', [], 'translate'))
                    return
                }
                break
        }
        if (trInfo === null){
            res.json(apiTemplate(404, 'No translate text', {}, 'translate'))
            return
        } else {
            const {message, content} = await Translate(trInfo, target, platform)
            if (!message) {
                res.json(apiTemplate(200, 'OK', content, 'translate'))
            } else {
                res.json(apiTemplate(500, 'Unable to get translate content', content, 'translate'))
            }
        }
    } else {
        res.json(apiTemplate(404, 'No translate text', {}, 'translate'))
    }
}

const ApiTranslate = async (req, res) => {
    const target = VerifyQueryString(req.query.to, TRANSLATE_TARGET)
    //const cacheText = target.toLowerCase() === TRANSLATE_TARGET.toLowerCase()//TODO remove
    const platform = VerifyQueryString(req.query.platform, TRANSLATOR_PLATFORM).toLowerCase()
    const text = VerifyQueryString(req?.body?.text, '')
    if (text) {
        let trInfo = { full_text: text, cache: false, target, translate_source: "Twitter Monitor Translator", translate: "", entities: []}

        const {message, content} = await Translate(trInfo, target, platform)
        if (!message) {
            res.json(apiTemplate(200, 'OK', content, 'translate'))
        } else {
            res.json(apiTemplate(500, 'Unable to get translate content', content, 'translate'))
        }
    } else {
        res.json(apiTemplate(404, 'No translate text', {}, 'translate'))
    }
}

const ApiPredict = async (req, res) => {
    const text = VerifyQueryString(req.query.text, '')
    if (!text) {
        res.json(apiTemplate(200, 'OK', [], 'translate'))
    } else {
        if (!global.LanguageIdentification) {
            const { LanguageIdentification } =await import("../../fasttext/language.mjs")
            if (!LanguageIdentification) {
                res.json(apiTemplate(500, 'Not predict module #PredictService', [], 'translate'))
                return
            }
            global.LanguageIdentification = new LanguageIdentification
        }
        const tmpLang = global.LanguageIdentification.GetLanguage((text instanceof Array) ? text.join("\n") : text)
        res.json(apiTemplate(200, 'OK', tmpLang, 'translate'))
    }
}

export {ApiLocalTranslate, ApiTranslate, ApiPredict}