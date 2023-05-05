import { TRANSLATE_TARGET, TRANSLATOR_PLATFORM } from "../../../../libs/assets/setting.mjs"
import { getTranslate } from "../../../../libs/core/Core.fetch.mjs"
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

const ApiOfficialTranslate = async (req, res) => {
    const id = VerifyQueryString(req.query.id, '')
    if (!id) {
        res.json(apiTemplate(403, 'Invalid id(tweet_id/uid)', {}, 'translate'))
        return
    }
    const type = VerifyQueryString(req.query.type, 'tweets')
    const target = VerifyQueryString(req.query.target, 'en')

    try {
        await global.guest_token2.updateGuestToken(1)
        if (global.guest_token2.token.nextActiveTime) {
            console.error(`[${new Date()}]: #Translate #GuestToken #429 Wait until ${global.guest_token2.token.nextActiveTime}`)
            return json(apiTemplate(429, `Wait until ${global.guest_token2.token.nextActiveTime}`), {}, 'translate')
        }
        global.guest_token2.updateRateLimit('Translation')
        const tmpTranslate = await getTranslate({id, type, target, guest_token: global.guest_token2.token})

        if (tmpTranslate.data || ((tmpTranslate.data?.translationState??'').toLowerCase() !== 'success')) {
            let tmpReaponse = {
                full_text: tmpTranslate.data.translation,
                translate: tmpTranslate.data.translation,
                cache: false,
                target: tmpTranslate.data.destinationLanguage,
                translate_source: tmpTranslate.data.translationSource + ' (for Twitter)',
                entities: Object.keys(tmpTranslate.data.entities).map(key => tmpTranslate.data.entities[key].map(value => ({
                    expanded_url: ((key, value) => {
                        switch (key) {
                            case 'hashtags': return `#/hashtag/${value.text}`
                            case 'symbols': return `#/cashtag/${value.text}`
                            case 'user_mentions': return `https://twitter.com/${value.screen_name}`
                            case 'urls': return value.expanded_url
                            default: return ''
                        }
                    })(key, value),
                    indices_end: value.indices[1],
                    indices_start: value.indices[0],
                    text: value.text??value.display_url??`@${value.screen_name}`??'',
                    type: key.slice(0, -1)
                }))).flat().sort((a, b) => a.indices_start - b.indices_start)
            }

            res.json(apiTemplate(200, 'OK', tmpReaponse, 'translate'))
        } else {
            res.json(apiTemplate(500, 'Unable to get translate content', {}, 'translate'))
        }
    } catch (e) {
        console.error(e)
        res.json(apiTemplate(500, 'Unable to get translate content', {}, 'translate'))
    }
}

export {ApiLocalTranslate, ApiTranslate, ApiPredict, ApiOfficialTranslate}