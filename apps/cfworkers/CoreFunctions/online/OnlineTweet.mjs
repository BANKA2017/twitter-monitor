import path2array from "../../../../libs/core/Core.apiPath.mjs"
import { getAudioSpace, getLiveVideoStream, getConversation, getPollResult, getTweets, getBroadcast } from "../../../../libs/core/Core.fetch.mjs"
import { GetEntitiesFromText, VerifyQueryString } from "../../../../libs/core/Core.function.mjs"
import { AudioSpace, Broadcast, Time2SnowFlake, Tweet, TweetsInfo } from "../../../../libs/core/Core.tweet.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { json } from "../../share.mjs"

const ApiTweets = async (req, env) => {
    const isRssMode = req.query.format === 'rss'
    const queryCount = VerifyQueryString(req.query.count, 0)
    const count = queryCount ? (queryCount > 100 ? 100 : (queryCount < 1 ? 1 : queryCount)) : (isRssMode ? 20 : 10)
    const cursor = String(VerifyQueryString(req.query.tweet_id, 0))
    const name = VerifyQueryString(req.query.name, '')

    const queryArray = []
    //use $tweet_id to replace $cursor
    //TODO reuse cursor as name

    // display type all, self, retweet, media, album, space
    const displayType = ["all", "self", "retweet", "media", "album", "space"].includes(req.query.display) ? req.query.display : 'all'
    
    //conversation
    const isConversation = !!(Number(req.query.is_status, 0) && cursor !== '0')
    const loadConversation = VerifyQueryString(req.query.load_conversation, 0) !== 0

    let tweets = {}
    if (isConversation) {
        try {
            tweets = await getConversation(cursor, req.guest_token.token)
            //global.guest_token.updateRateLimit('TweetDetail')
        } catch (e) {
            console.error(`[${new Date()}]: #OnlineTweetsConversation #${cursor} #${e.code} ${e.message}`)
            return json(apiTemplate(e.code, e.message))
        }
        
    } 
    //else if (name !== '' && displayType === 'all') {
    //    try {
    //        tweets = await getTweets(name, cursor, req.guest_token.token, 40, true, true, false)
    //        //global.guest_token.updateRateLimit('UserTweets')
    //    } catch (e) {
    //        console.error(`[${new Date()}]: #OnlineTweetsConversation #${cursor} #${e.code} ${e.message}`)
    //        return json(apiTemplate(e.code, e.message))
    //    }
    //} 
    else {
        if (name === '') {
            return json(apiTemplate(404, 'No such account'))
        }
        queryArray.push('-filter:replies')
        if (name) {
            queryArray.push(`from:${name}`)
        }
        switch (displayType) {
            case 'self':
                queryArray.push('-filter:nativeretweets', '-filter:retweets', 'include:quote')
                break
            case 'retweet':
                queryArray.push('filter:nativeretweets', 'filter:retweets', 'include:quote')
                break
            case 'media':
                queryArray.push('filter:media')
                break
            case 'album':
                queryArray.push('-filter:nativeretweets', '-filter:retweets', 'include:quote', 'filter:media')
                break
            case 'space':
                queryArray.push('filter:spaces')
                break
            default:
                queryArray.push('include:nativeretweets', 'include:retweets', 'include:quote')
        }

        //$queryString = "from:$name since:2000-01-01 include:nativeretweets include:retweets include:quote";//$name 2000-01-01 include retweets
        if (cursor !== '0') {
            queryArray.push((VerifyQueryString(req.query.refresh, '0') !== '0') ? `since_id:${BigInt(cursor) + BigInt(1)}` : `max_id:${BigInt(cursor) - BigInt(1)}`)
        }

        try {
            tweets = await getTweets(queryArray.join(' '), '', req.guest_token.token, count, true, false, true)
            //global.guest_token.updateRateLimit('Search')
        } catch (e) {
            console.error(`[${new Date()}]: #OnlineTweetsTimeline #'${queryArray.join(' ')}' #${e.code} ${e.message}`)
            return json(apiTemplate(e.code, e.message))
        }
        
    }

    const {tweetsInfo, tweetsContent} = GenerateData(tweets, isConversation, (loadConversation ? '' : name))
    if (tweetsInfo.errors.code !== 0) {
        return json(apiTemplate(tweetsInfo.errors.code, tweetsInfo.errors.message))
    }
    return json(apiTemplate(200, 'OK', {
        tweets: isConversation ? tweetsContent.reverse() : tweetsContent,
        hasmore: !isConversation && !!tweetsContent.length,
        top_tweet_id: tweetsInfo.tweetRange.max || '0',
        bottom_tweet_id: tweetsInfo.tweetRange.min || '0'
    }))
}

const ApiSearch = async (req, res) => {
    const isRssMode = req.query.format === 'rss'
    const type = req.type//req.params[0]
    const advancedSearchMode = (req.query.advanced || '0') === '1'
    const cursor = BigInt(VerifyQueryString(req.query.tweet_id, 0))
    const queryCount = VerifyQueryString(req.query.count, 20)

    const refresh = (req.query.refresh || '0') !== '0'
    const start = Number(VerifyQueryString(req.query.start, 0))
    const end = Number(VerifyQueryString(req.query.end, 0))

    let tweets = []
    const queryArray = []
    if (type === 'hashtag') {
        if (!VerifyQueryString(req.query.hash, false)) {
            return json(apiTemplate())
        }
        queryArray.push(`#${req.query.hash}`)
    } else if (type === 'cashtag') {
        if (!VerifyQueryString(req.query.hash, false)) {
            return json(apiTemplate())
        }
        queryArray.push(`$${req.query.hash}`)
    } else if (advancedSearchMode) {
        const textOrMode = (req.query.text_or_mode || '0') !== '0'
        const textNotMode = (req.query.text_not_mode || '0') !== '0'
        const userOrMode = (req.query.user_and_mode || '0') !== '0'
        const userNotMode = (req.query.user_not_mode || '0') !== '0'
        //const tweetType = isNaN(req.query.tweet_type) ? 0 : ([0,1,2].includes(Number(req.query.tweet_type)) ? Number(req.query.tweet_type) : 0)
        const getMedia = !!(req.query.tweet_media || false)

        //keywords
        queryArray.push((VerifyQueryString(req.query.q, '')).split(' ').map((keyword, index) => {
            if (index > 0 && textOrMode) {
                return `OR ` + (textNotMode ? '-' : '') + keyword
            }
            return (textNotMode ? '-' : '') + keyword
        }).join(' '))

        //names
        queryArray.push(VerifyQueryString(req.query.user, '').replaceAll('@', '').split(' ').map((keyword, index) => {
            if (index > 0 && userOrMode) {
                return `OR ` + (userNotMode ? '-' : '') + keyword
            }
            return (userNotMode ? '-' : '') + keyword
        }).join(' '))

        if (getMedia) {
            queryArray.push('filter:media')
        }
    } else if (VerifyQueryString(req.query.q, '')) {
        queryArray.push(VerifyQueryString(req.query.q, ''))
    }
    
    //time
    ///start
    if (cursor !== BigInt(0) && refresh) {
        queryArray.push('since_id:' + String(cursor + BigInt(1)))
    } else if (start > 0) {
        queryArray.push('since_id:' + String(Time2SnowFlake(start * 1000)))
    } else {
        queryArray.push('since_id:0')
    }
    ///end
    if (cursor !== BigInt(0) && !refresh) {
        queryArray.push('max_id:' + String(cursor - BigInt(1)))
    } else if (end > 0 && end > start) {
        queryArray.push('max_id:' + String(Time2SnowFlake(end * 1000)))
    }
    try {
        tweets = await getTweets(queryArray.join(' '), '', req.guest_token.token, queryCount, true, false, true)
        //global.guest_token.updateRateLimit('Search')
    } catch (e) {
        console.error(`[${new Date()}]: #OnlineTweetsSearch #'${queryArray.join(' ')}' #${e.code} ${e.message}`)
        return json(apiTemplate(e.code, e.message))
    }
    
    const {tweetsInfo, tweetsContent} = GenerateData(tweets)
    if (tweetsInfo.errors.code !== 0) {
        return json(apiTemplate(tweetsInfo.errors.code, tweetsInfo.errors.message))
    }
    return json(apiTemplate(200, 'OK', {
        tweets: tweetsContent,
        hasmore: !!tweetsContent.length,
        top_tweet_id: tweetsInfo.tweetRange.max || '0',
        bottom_tweet_id: tweetsInfo.tweetRange.min || '0',
    }))
}

const ApiPoll = async (req, res) => {
    const tweet_id = VerifyQueryString(req.query.tweet_id, 0)
    if (!tweet_id) {
        return json(apiTemplate())
    }
    const tmpPollData = await getPollResult(tweet_id, req.guest_token.token)
    //global.guest_token.updateRateLimit('TweetDetail')
    if (tmpPollData.code === 200) {
        return json(apiTemplate(200, 'OK', tmpPollData.data.map(poll => Number(poll))))
    } else {
        console.error(`[${new Date()}]: #OnlinePoll #${tweet_id} #${tmpPollData.code} Something wrong`)
        return json(apiTemplate(tmpPollData.code, 'Something wrong', []))
    }
}

const ApiAudioSpace = async (req, res) => {
    const id = VerifyQueryString(req.query.id, '')
    if (!id) {
        return json(apiTemplate())
    }
    //await req.guest_token.updateGuestToken()
    const tmpAudioSpaceData = await getAudioSpace(id, req.guest_token.token)
    //global.guest_token.updateRateLimit('AudioSpaceById')
    if (tmpAudioSpaceData.data?.data?.audioSpace || false) {
        let tmpAudioSpace = AudioSpace(tmpAudioSpaceData.data)
        //get link
        if (tmpAudioSpace.is_available_for_replay || (Number(tmpAudioSpace.start) <= Date.now() && tmpAudioSpace.end === '0')) {
            try {
                const tmpAudioSpaceLink = await getLiveVideoStream(tmpAudioSpace.media_key)
                if (tmpAudioSpaceLink.data?.source?.noRedirectPlaybackUrl) {
                    tmpAudioSpace.playback = tmpAudioSpaceLink.data?.source?.noRedirectPlaybackUrl.replaceAll('?type=replay', '').replaceAll('?type=live', '')
                }
            } catch (e) {
                console.error(e)
            }
        }

        return json(apiTemplate(200, 'OK', tmpAudioSpace))
    } else if (tmpAudioSpaceData.data?.errors || tmpAudioSpaceData.data?.code) {
        console.error(`[${new Date()}]: #OnlineAudioSpace #${id} #500 Something wrong`, tmpAudioSpaceData.data?.code, tmpAudioSpaceData.data?.errors)
        return json(apiTemplate(500, 'Something wrong'))
    } else if (!tmpAudioSpaceData.data?.data?.audioSpace) {
        console.error(`[${new Date()}]: #OnlineAudioSpace #${id} #404 No such space`)
        return json(apiTemplate(404, 'No such space'))
    } else {
        console.error(`[${new Date()}]: #OnlineAudioSpace #${id} #500 Unkonwn Error`)
        return json(apiTemplate())
    }
}

const ApiBroadcast = async (req, res) => {
    const id = VerifyQueryString(req.query.id, '')
    if (!id) {
        return json(apiTemplate())
    }
    
    //TODO check Broadcast api rate limit
    //await req.guest_token.updateGuestToken()
    try {
        const tmpBroadcastData = await getBroadcast(id, req.guest_token.token)
        //global.guest_token.updateRateLimit('BroadCast')
        let tmpBroadcast = Broadcast(tmpBroadcastData.data)
        //get link
        if (tmpBroadcast.is_available_for_replay || (Number(tmpBroadcast.start) <= Date.now() && tmpBroadcast.end === '0')) {
            try {
                const tmpBroadcastLink = await getLiveVideoStream(tmpBroadcast.media_key)
                if (tmpBroadcastLink.data?.source?.noRedirectPlaybackUrl) {
                    tmpBroadcast.playback = tmpBroadcastLink.data?.source?.noRedirectPlaybackUrl.replaceAll('?type=replay', '').replaceAll('?type=live', '')
                }
            } catch (e) {
                console.error(e)
            }
        }
        return json(apiTemplate(200, 'OK', tmpBroadcast))
    } catch (e) {
        //global.guest_token.updateRateLimit('BroadCast')
        if (!(e?.code && e?.message) && e?.errors) {
            e = e.errors[0]
        }
        if (e?.code && e?.message) {
            console.error(`[${new Date()}]: #OnlineBroadcast #${id} #500 Something wrong`, e.code, e.message)
            return json(apiTemplate(500, `#${e.code} ${e.message}`))
        } else {
            console.error(`[${new Date()}]: #OnlineBroadcast #${id} #500 Unkonwn Error`)
            return json(apiTemplate())
        }
    }
}

const ApiMedia = async (req, res) => {
    const tweet_id = VerifyQueryString(req.query.tweet_id, 0)
    const authorizationMode = VerifyQueryString(req.query.mode, 1)
    if (!tweet_id) {
        return json(apiTemplate())
    }

    getConversation(tweet_id, req.guest_token2.token, true, authorizationMode).then(response => {
        //global.guest_token2.updateRateLimit('TweetDetail')
        const tweetsInfo = TweetsInfo(response.data, true)
        if (tweetsInfo.errors.code !== 0) {
            return json(apiTemplate(tweetsInfo.errors.code, tweetsInfo.errors.message))
        } else if (!tweetsInfo.contents.some(tweet => path2array('tweet_id', tweet) === tweet_id)) {
            return json(apiTemplate(404, 'No such tweet'))
        } else {
            const tweetData = Tweet(tweetsInfo.contents.filter(tweet => path2array('tweet_id', tweet) === tweet_id)[0], {}, [], {}, true, false, true)
            return json(apiTemplate(200, 'OK', {
                video: !(Array.isArray(tweetData.video) && (tweetData.video.length === 0)),
                video_info: tweetData.video,
                media_info: tweetData.media.filter(media => media.source !== 'cover').map(media => {
                    media.cover = media.cover.replaceAll(/(https:\/\/|http:\/\/)/gm, '')
                    media.url = media.url.replaceAll(/(https:\/\/|http:\/\/)/gm, '')
                    return media
                })
            }))
        }
        
    }).catch(e => {
        console.log(e)
        console.error(`[${new Date()}]: #OnlineTweetMedia #${tweet_id} #${e.code} ${e.message}`)
        //global.guest_token2.updateRateLimit('TweetDetail')
        return json(apiTemplate(e.code, e.message))
    })
}

const TweetsData = (content = {}, users = {}, contents = [], precheckName = '', graphqlMode = true, isConversation = false) => {
    let exportTweet = Tweet(content, users, contents, {}, graphqlMode, false, true)
    exportTweet.GeneralTweetData.favorite_count = exportTweet.interactiveData.favorite_count
    exportTweet.GeneralTweetData.retweet_count = exportTweet.interactiveData.retweet_count
    exportTweet.GeneralTweetData.quote_count = exportTweet.interactiveData.quote_count
    exportTweet.GeneralTweetData.reply_count = exportTweet.interactiveData.reply_count
    exportTweet.GeneralTweetData.view_count = exportTweet.interactiveData.view_count//TODO only supported graphql now
    //rtl
    exportTweet.GeneralTweetData.rtl = exportTweet.isRtl
    // display text range
    exportTweet.GeneralTweetData.display_text_range = exportTweet.displayTextRange
    //vibe
    if (exportTweet.vibe?.text || exportTweet.vibe?.imgDescription) {
        exportTweet.GeneralTweetData.vibe = exportTweet.vibe
    }
    //place
    if (exportTweet.place?.id) {
        exportTweet.GeneralTweetData.place = exportTweet.place
    }
    //check poster
    if (isConversation || precheckName === '' || precheckName.toLocaleLowerCase() === exportTweet.GeneralTweetData.name.toLocaleLowerCase()) {
        return {
            code: 200,
            userInfo: exportTweet.userInfo,
            retweetUserInfo: exportTweet.retweetUserInfo,
            data: returnDataForTweets(exportTweet.GeneralTweetData, true, exportTweet.tags, exportTweet.polls, exportTweet.card, exportTweet.cardApp, exportTweet.quote, exportTweet.media)
        }
    }

    return {code: 0, data: {}}
}

const returnDataForTweets = (tweet = {}, historyMode = false, tweetEntities = [], tweetPolls = [], tweetCard = {}, tweetCardApp = {}, tweetQuote = {}, tweetMedia = []) => {
    tweet.type = 'tweet'
    if (historyMode) {
        //处理history模式
        tweet["entities"] = tweetEntities
    }
    //$tweet["full_text_origin"] = preg_replace('/ https:\/\/t.co\/[\w]+/', '', $tweet["full_text_origin"]);//TODO for history mode
    
    //处理投票
    tweet.pollObject = {}
    if (tweet.poll && tweetPolls.length) {
        //TODO check tweetID
        //console.log(String(poll.tweet_id), String(tweet.tweet_id), poll.tweet_id, tweet.tweet_id, poll.tweet_id === tweet.tweet_id)
        tweet.pollObject = tweetPolls.filter(poll => poll.tweet_id === tweet.tweet_id).map(poll => {
            delete poll.tweet_id
            poll.checked = !!poll.checked
            poll.count = 0
            return poll
        })
    }

    //处理卡片
    tweet.cardObject = {}
    if (tweet.card && Object.keys(tweetCard).length) {
        tweet.cardObject = tweetCard
        if (tweet.cardObject.unified_card_app) {
            tweet.cardObject.unified_card_app = !!tweet.cardObject.unified_card_app
            tweet.cardObject.app = tweetCardApp
        }
    }

    //处理引用
    tweet.quoteObject = {}
    if (tweet.quote_status && Object.keys(tweetQuote).length) {
        tweet.quoteObject = tweetQuote
        tweet.quoteObject.id_str = tweet.quoteObject.tweet_id
        tweet.quoteObject.tweet_id = tweet.quoteObject.tweet_id
        tweet.quote_status_str = tweet.quoteObject.id_str

        const {originText, entities} = GetEntitiesFromText(tweet.quoteObject.full_text, 'quote')
        tweet.quoteObject.full_text = originText
        tweet.quoteObject.entities = entities
    }

    //media
    let tmpInageText = ''
    tweet.mediaObject = []
    if (tweet.media || tweet.cardObject.media || tweet.quoteObject.media) {
        for (const queryMediaSingle of tweetMedia) {
            //TODO check equal tweet id
            if (queryMediaSingle.tweet_id === tweet.tweet_id || queryMediaSingle.tweet_id === tweet.quote_status) {
                queryMediaSingle.cover = queryMediaSingle.cover.replaceAll(/http(s|):\/\//gm, '')
                queryMediaSingle.url = queryMediaSingle.url.replaceAll(/http(s|):\/\//gm, '')
                if (!queryMediaSingle.title) {
                    delete queryMediaSingle.title
                }
                if (!queryMediaSingle.description) {
                    delete queryMediaSingle.description
                }
                if (queryMediaSingle.source === 'tweets' && queryMediaSingle.tweet_id === tweet.tweet_id) {
                    tmpInageText += `<img src="https://pbs.twimg.com/media/${queryMediaSingle.filename}?format=${queryMediaSingle.extension}&name=orig">`
                    tweet.mediaObject.push(queryMediaSingle)
                } else if (queryMediaSingle.source === 'cards' || queryMediaSingle.source === 'quote_status') {
                    tweet.mediaObject.push(queryMediaSingle)
                }
            }
        }
        //去重
        tweet.mediaObject = [...new Set(tweet.mediaObject)]
    }

    tweet.tweet_id_str = String(tweet.tweet_id)//Number.MAX_SAFE_INTEGER => 9007199254740991 "9007199254740991".length => 16
    tweet.uid_str = String(tweet.uid)

    return tweet
}

const GenerateData = (tweets, isConversation = false, filterName = '') => {
    const tweetsInfo = TweetsInfo(tweets.data, isConversation)
    if (tweetsInfo.errors.code !== 0) {
        return {tweetsInfo: tweetsInfo, tweetsContent: []}
    }
    const tweetsContent = tweetsInfo.contents.map(content => {
        if (isConversation && content?.content?.displayType === 'VerticalConversation') {
            return content.content.items.map(item => {
                let tmpData = TweetsData(item, tweetsInfo.users, tweetsInfo.contents, filterName, isConversation, isConversation)
        
                if (tmpData.code === 200 && Object.keys(tmpData.data).length) {
                    tmpData.data.user_info = tmpData.userInfo
                    tmpData.data.retweet_user_info = tmpData.retweetUserInfo
                    return tmpData.data
                }
                return false
            })
        } else {
            let tmpData = TweetsData(content, tweetsInfo.users, tweetsInfo.contents, filterName, isConversation, isConversation)
        
            if (tmpData.code === 200 && Object.keys(tmpData.data).length) {
                tmpData.data.user_info = tmpData.userInfo
                tmpData.data.retweet_user_info = tmpData.retweetUserInfo
                return tmpData.data
            }
        }   
        return false
    }).flat().filter(tweet => tweet?.tweet_id).sort((a, b) => b.tweet_id - a.tweet_id)

    return {tweetsInfo, tweetsContent}
}


export {ApiTweets, ApiSearch, ApiPoll, ApiAudioSpace, ApiBroadcast, ApiMedia, GenerateData}