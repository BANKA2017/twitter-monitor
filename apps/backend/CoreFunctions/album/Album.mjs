import { isEmpty, isObject } from 'lodash-es'
import { getEmbedConversation, getTweets } from '../../../../libs/core/Core.fetch.mjs'
import { Log, VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { Tweet } from '../../../../libs/core/Core.tweet.mjs'
import { apiTemplate } from '../../../../libs/share/Constant.mjs'
import { GenerateData } from '../online/OnlineTweet.mjs'

const AlbumSearch = async (req, env) => {
    const platformList = { ns: 'nintendo_switch_share', ps: 'PlayStation®Network', xbox: 'xbox_one_social', xbox_game_bar: 'xbox_game_bar' }
    const platform = ['ns', 'ps', 'xbox'].includes(req.query.platform) ? platformList[req.query.platform] : platformList['ns']
    const name = VerifyQueryString(req.query.name, '')
    const tweetId = VerifyQueryString(req.query.tweet_id, '')
    const gameName = VerifyQueryString(req.query.game, '')
    const queryArray = ['filter:twimg OR filter:consumer_video OR filter:pro_video', `source:${platform}`]
    if (platform === 'xbox_one_social') {
        queryArray.push(`OR source:xbox_game_bar OR #XboxShare`) //for game bar and android/iOS app
    }

    const isPhotos = !!req.query.photos
    if (!isPhotos) {
        if (name !== '') {
            queryArray.push(
                name
                    .split(' ')
                    .filter((tmpName) => tmpName)
                    .map((tmpName) => `from:${tmpName.startsWith('@') ? tmpName.slice(1) : tmpName}`)
                    .join(' OR ')
            )
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
            tweets = await getEmbedConversation({ tweet_id: tweetId })
        } else {
            tweets = await getTweets({
                queryString: queryArray.join(' '),
                cursor: '',
                guest_token: env.guest_token3,
                count: 20,
                online: true,
                graphqlMode: false,
                searchMode: true
            })
            //TODO update guest_account status
            //updateGuestToken
            //await env.updateGuestToken(env, 'guest_token2', 4, tweets.headers.get('x-rate-limit-remaining') < 1, 'Search')
        }
    } catch (e) {
        Log(false, 'error', `[${new Date()}]: #Album #${e.code} ${e.message}`)
        return env.json(apiTemplate(e.code, e.message, {}, 'album'))
    }

    if ((isPhotos && !isObject(tweets.data)) || isEmpty(tweets.data)) {
        Log(false, 'log', tweets)
        return env.json(apiTemplate(404, 'No such tweet', {}, 'album'))
    }

    let tweetsContent = []
    let tweetsInfo = {}
    if (isPhotos) {
        const tweetData = Tweet(tweets.data, {}, [], {}, false, false, true)
        const guessSource = (() => {
            if (tweetData.tags.some((tag) => ['ps6share', 'ps5share', 'ps4share', 'ps3share', 'ps2share', 'psshare'].includes(tag.text.toLowerCase()))) {
                return 'PlayStation®Network'
            } else if (tweetData.tags.some((tag) => ['nintendoswitch'].includes(tag.text.toLowerCase()))) {
                return 'Nintendo Switch Share'
            } else if (tweetData.tags.some((tag) => ['xbox', 'pcgaming', 'xboxshare', 'xboxseriesx', 'xboxseriess', 'xboxone'].includes(tag.text.toLowerCase()))) {
                return 'Xbox'
            } else {
                return ''
            }
        })()
        const tags = tweetData.tags
            .filter(
                (entity) =>
                    entity.type === 'hashtag' && !['ps6share', 'ps5share', 'ps4share', 'ps3share', 'ps2share', 'psshare', 'nintendoswitch', 'xbox', 'pcgaming', 'xboxshare', 'xboxseriesx', 'xboxseriess', 'xboxone'].includes(entity.text.toLowerCase())
            )
            .map((entity) => entity.text)
        tweetsContent.push({
            media: tweetData.media,
            entities: tags,
            source: guessSource, //tweetData.GeneralTweetData.source,// embed not include this
            time: tweetData.GeneralTweetData.time,
            tweet_id: tweetData.GeneralTweetData.tweet_id,
            uid: tweetData.GeneralTweetData.uid,
            name: tweetData.GeneralTweetData.name,
            display_name: tweetData.GeneralTweetData.display_name
        })
    } else {
        let { tweetsInfo, tweetsContent } = GenerateData(tweets, false, '', false, req)
        if (tweetsInfo.errors.code !== 0) {
            return env.json(apiTemplate(tweetsInfo.errors.code, tweetsInfo.errors.message, {}, 'album'))
        }
        tweetsContent = tweetsContent
            .filter((content) => (isPhotos ? content.tweet_id === tweetId : true))
            .map((content) => ({
                media: content.mediaObject,
                entities: content.entities
                    .filter(
                        (entity) =>
                            entity.type === 'hashtag' &&
                            !['ps6share', 'ps5share', 'ps4share', 'ps3share', 'ps2share', 'psshare', 'nintendoswitch', 'xbox', 'pcgaming', 'xboxshare', 'xboxseriesx', 'xboxseriess', 'xboxone'].includes(entity.text.toLowerCase())
                    )
                    .map((entity) => entity.text),
                source: content.source,
                time: content.time,
                tweet_id: content.tweet_id,
                uid: content.uid,
                name: content.name,
                display_name: content.display_name
            }))
    }

    return env.json(
        apiTemplate(
            200,
            'OK',
            {
                tweets: tweetsContent,
                hasmore: !!tweetsContent.length,
                top_tweet_id: tweetsInfo?.tweetRange?.max || '0',
                bottom_tweet_id: tweetsInfo?.tweetRange?.min || '0'
            },
            'album'
        )
    )
}

export { AlbumSearch }
