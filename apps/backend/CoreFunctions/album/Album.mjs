import { getConversation, getTweets } from "../../../../src/core/Core.fetch.mjs"
import { VerifyQueryString } from "../../../../src/core/Core.function.mjs"
import { apiTemplate } from "../../../../src/share/Constant.mjs"
import { GenerateData } from "../online/OnlineTweet.mjs"

const AlbumSearch = async (req, res) => {
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
            tweets = await getConversation(tweetId, global.guest_token.token, true)
            global.guest_token.updateRateLimit('TweetDetail')
        } else {
            tweets = await getTweets(queryArray.join(' '), '', global.guest_token.token, 20, true, false, true)
            global.guest_token.updateRateLimit('Search')
        }
    } catch (e) {
        console.error(`[${new Date()}]: #Album #${e.code} ${e.message}`)
        res.json(apiTemplate(e.code, e.message, {}, 'album'))
        return
    }
    let {tweetsInfo, tweetsContent} = GenerateData(tweets, isPhotos)
    if (tweetsInfo.errors.code !== 0) {
        res.json(apiTemplate(tweetsInfo.errors.code, tweetsInfo.errors.message, {}, 'album'))
        return
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
    res.json(apiTemplate(200, 'OK', {
        tweets: tweetsContent,
        hasmore: !!tweetsContent.length,
        top_tweet_id: tweetsInfo.tweetRange.max || '0',
        bottom_tweet_id: tweetsInfo.tweetRange.min || '0',
    }, 'album'))
}

export {AlbumSearch}