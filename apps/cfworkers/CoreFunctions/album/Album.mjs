import { getConversation, getTweets } from "../../../../libs/core/Core.fetch.mjs"
import { VerifyQueryString } from "../../../../libs/core/Core.function.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { json } from "../../share.mjs"
import { GenerateData } from "../online/OnlineTweet.mjs"

const AlbumSearch = async (req, env) => {
    const platformList = {ns: 'nintendo_switch_share', ps: 'PlayStation®Network'}
    const platform = ['ns', 'ps'].includes(req.query.platform) ? platformList[req.query.platform] : platformList['ns']
    const name = VerifyQueryString(req.query.name, '')
    const tweetId = VerifyQueryString(req.query.tweet_id, '')
    const gameName = VerifyQueryString(req.query.game, '')
    const queryArray = ['filter:twimg OR filter:consumer_video OR filter:pro_video', `source:${platform}`]

    const isPhotos = !!(req.query.photos)
    if (!isPhotos) {
        if (name !== '') {
            queryArray.push(`from:${name}`)
        }
        if (tweetId !== '') {
            queryArray.push(`max_id:${tweetId}`)
        }
        if (gameName !== '') {
            queryArray.push(`#${gameName}`)
        }
    }
    
    let tweets = {}
    try {
        if (isPhotos) {
            //TODO fix tokens
            tweets = await getConversation(tweetId, req.guest_token.token, true)
            //global.guest_token.updateRateLimit('TweetDetail')
        } else {
            tweets = await getTweets(queryArray.join(' '), '', req.guest_token.token, 20, true, false, true)
            //global.guest_token.updateRateLimit('Search')
        }
    } catch (e) {
        console.error(`[${new Date()}]: #Album #${e.code} ${e.message}`)
        return json(apiTemplate(e.code, e.message, {}, 'album'))
    }
    let {tweetsInfo, tweetsContent} = GenerateData(tweets, isPhotos)
    if (tweetsInfo.errors.code !== 0) {
        return json(apiTemplate(tweetsInfo.errors.code, tweetsInfo.errors.message, {}, 'album'))
    }
    tweetsContent = tweetsContent.map(content => ({
        media: content.mediaObject,
        entities: content.entities.filter(entity => entity.type === 'hashtag' && !['ps6share', 'ps5share', 'ps4share', 'ps3share', 'ps2share', 'psshare', 'nintendoswitch'].includes(entity.text.toLowerCase())).map(entity => entity.text) ,
        source: content.source,
        time: content.time,
        tweet_id: content.tweet_id,
        uid: content.uid,
        name: content.name,
        display_name: content.display_name
    }))
    return json(apiTemplate(200, 'OK', {
        tweets: tweetsContent,
        hasmore: !!tweetsContent.length,
        top_tweet_id: tweetsInfo.tweetRange.max || '0',
        bottom_tweet_id: tweetsInfo.tweetRange.min || '0',
    }, 'album'))
}

export {AlbumSearch}