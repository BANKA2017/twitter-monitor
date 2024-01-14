import { VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { Translate } from '../../../../libs/core/Core.translate.mjs'
import V2AccountInfo from '../../../../libs/model/twitter_monitor/v2_account_info.js'
import V2TwitterQuote from '../../../../libs/model/twitter_monitor/v2_twitter_quote.js'
import V2TwitterTweets from '../../../../libs/model/twitter_monitor/v2_twitter_tweets.js'
import { apiTemplate } from '../../../../libs/share/Constant.mjs'
import { GetUid } from '../local/Local.mjs'

const ApiLocalTranslate = async (req, res) => {
    const target = VerifyQueryString(req.query.to, 'en')
    const platform = VerifyQueryString(req.query.platform, 'google').toLowerCase()
    const tweetId = VerifyQueryString(req.query.tweet_id, 0)
    const { uid } = await GetUid(req.query)
    const translateType = VerifyQueryString(req.query.tr_type, 'tweets') === 'profile' ? 'profile' : 'tweets'
    if ((tweetId !== 0 && translateType === 'tweets') || (uid !== '0' && translateType === 'profile')) {
        let trInfo = null
        switch (translateType) {
            case 'tweets':
                try {
                    trInfo = await V2TwitterTweets.findOne({
                        attributes: ['full_text'],
                        where: { tweet_id: tweetId },
                        raw: true
                    })

                    //if empty, then check quote tweets
                    if (!trInfo) {
                        trInfo = await V2TwitterQuote.findOne({
                            attributes: ['full_text'],
                            where: { tweet_id: tweetId },
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
                        attributes: [['description', 'full_text']],
                        where: { uid },
                        raw: true
                    })
                } catch (e) {
                    res.json(apiTemplate(500, 'Unknown error #GetProfileTranslate', [], 'translate'))
                    return
                }
                break
        }
        if (trInfo === null) {
            res.json(apiTemplate(404, 'No translate text', {}, 'translate'))
            return
        } else {
            const { message, content } = await Translate(trInfo, target, platform)
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

const ApiPredict = async (req, res) => {
    const text = VerifyQueryString(req.query.text, '')
    if (!text) {
        res.json(apiTemplate(200, 'OK', [], 'translate'))
    } else {
        if (!global.LanguageIdentification) {
            res.json(apiTemplate(500, 'Unable to load the cld3 model', tmpLang, 'translate'))
        } else {
            const identifier = global.LanguageIdentification.create(0, 1000)
            const tmpLang = identifier.findLanguage(text)
            identifier.dispose()
            res.json(apiTemplate(200, 'OK', tmpLang, 'translate'))
        }
    }
}

export { ApiLocalTranslate, ApiPredict }
