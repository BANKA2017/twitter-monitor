// Twitter Archiver
// @BANKA2017 && NEST.MOE
// Archive_LITE()

import { getAudioSpace, getBroadcast, getFollowingOrFollowers, getImage, getLiveVideoStream, getPollResult, getTweets, AxiosFetch } from '../../libs/core/Core.fetch.mjs'

import { GuestToken, PathInfo, Sleep } from '../../libs/core/Core.function.mjs'
import path2array from '../../libs/core/Core.apiPath.mjs'
import { GenerateAccountInfo } from '../../libs/core/Core.info.mjs'
import { GenerateData } from '../backend/CoreFunctions/online/OnlineTweet.mjs'
import { AudioSpace, Broadcast } from '../../libs/core/Core.tweet.mjs'
import { Parser } from 'm3u8-parser'

let name = globalThis.name //readFileSync('./screen_name.txt').toString().trim()
let forceTimelineForUpdate = globalThis.timelineFirst || false

//save date
let now = Date.now()
let range = {
    time: { start: now, end: 0 },
    tweet_id: { max: '0', min: '0' }
}

//get data from disk
let rawTweetData = {}
let rawUserInfoData = {}
let resetCursor = false
if (globalThis.UserData?.account_info?.name !== name) {
    globalThis.UserData = {
        account_info: null,
        account_list: {},
        tweets: {},
        type: 'lite'
    }
    resetCursor = true
}
let UserData = globalThis.UserData
let uid = UserData.account_info?.uid || null

//get init token
globalThis.guest_token = new GuestToken()
await globalThis.guest_token.updateGuestToken(4)

if (globalThis.guest_token.token.nextActiveTime) {
    await Sleep(globalThis.guest_token.token.nextActiveTime - Date.now())
    await globalThis.guest_token.updateGuestToken(4)
    if (!globalThis.guest_token.token.success) {
        throw globalThis.guest_token
    }
}

// cursor
if (resetCursor || !Object.values(globalThis.cursor || {}).some((v) => v.cursor)) {
    globalThis.cursor = {
        tweets: { maxId: '', tmpId: '', cursor: '' },
        broadcast: { maxId: '', tmpId: '', cursor: '' },
        space: { maxId: '', tmpId: '', cursor: '' }
    }
}
let cursor = globalThis.cursor

//userinfo and tweets
if (cursor.tweets.cursor === '') {
    console.log(`archiver: new account`)
} else if (cursor.tweets.cursor === 'complete') {
    cursor.tweets.cursor = ''
    if (cursor.tweets.maxId && cursor.tweets.maxId !== 0) {
        cursor.tweets.tmpId = cursor.tweets.maxId
        cursor.tweets.maxId = ''
    }
}
console.log('archiver: tweets...')
if (!cursor.tweets.tmpId || !uid) {
    console.log(`archiver: new task is unable to use timeline api`)
    forceTimelineForUpdate = false
}
if (cursor.tweets.cursor !== 'complete') {
    //TODO query string
    //TODO wait for retweets
    let query = [`from:${name}`, 'include:replies', 'include:nativeretweets', 'include:retweets', 'include:quote', `since_id:${cursor.tweets.tmpId ? cursor.tweets.tmpId : 0}`].join(' ')
    console.log(`archiver: query string -->${query}<--`)
    do {
        await globalThis.guest_token.updateGuestToken(4)
        if (globalThis.guest_token.token.nextActiveTime) {
            console.error(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${globalThis.guest_token.token.nextActiveTime}`)
            break //只处理现有的
        }
        let tweets = null
        try {
            tweets = await getTweets({
                queryString: forceTimelineForUpdate ? uid : query,
                cursor: forceTimelineForUpdate ? '' : cursor.tweets.cursor || '',
                guest_token: globalThis.guest_token.token,
                count: !forceTimelineForUpdate ? 100 : 999,
                online: true,
                graphqlMode: forceTimelineForUpdate,
                searchMode: !forceTimelineForUpdate,
                withReply: true,
                cookie: Object.fromEntries(
                    document.cookie
                        .split('; ')
                        .map((cookie) => cookie.split('='))
                        .filter((cookie) => cookie.length >= 2)
                )
            })
            globalThis.guest_token.updateRateLimit('Search')
        } catch (e) {
            //try again
            console.log('archiver: first retry...')
            try {
                tweets = await getTweets({
                    queryString: forceTimelineForUpdate ? uid : query,
                    cursor: forceTimelineForUpdate ? '' : cursor.tweets.cursor || '',
                    guest_token: globalThis.guest_token.token,
                    count: !forceTimelineForUpdate ? 100 : 999,
                    online: true,
                    graphqlMode: forceTimelineForUpdate,
                    searchMode: !forceTimelineForUpdate,
                    withReply: true
                })
                globalThis.guest_token.updateRateLimit('Search')
            } catch (e1) {
                console.log('archiver: retry failed...')
                throw e1
            }
        }
        if (tweets === null) {
            throw `archiver: empty response`
        }

        //let tmpTweetsInfo = TweetsInfo(tweets.data, true)
        let tmpTweetsInfo = GenerateData(tweets, false, '', forceTimelineForUpdate)
        if (tmpTweetsInfo.tweetsInfo.errors.code !== 0) {
            console.log(`archiver: error #${tmpTweetsInfo.tweetsInfo.errors.code} , ${tmpTweetsInfo.tweetsInfo.errors.message}`)
            continue
        }
        console.log(`archiver: cursor -->${tmpTweetsInfo.tweetsInfo.cursor?.bottom || 'end'}<-- (${tmpTweetsInfo.tweetsInfo.contentLength})`)
        //writeFileSync(basePath + `/rawdata/${forceTimelineForUpdate ? 'timeline_' : ''}${tmpTweetsInfo.tweetsInfo.tweetRange.max}_${tmpTweetsInfo.tweetsInfo.tweetRange.min}.json`, JSON.stringify(tweets.data))

        //get account info
        if (uid === null) {
            try {
                //restful
                //uid = Object.values(tmpTweetsInfo.tweetsInfo.users).filter(user => user.screen_name.toLocaleLowerCase() === name.toLocaleLowerCase())[0]?.id_str || null
                //graphql
                uid = ((user) => user?.rest_id || user?.id_str || null)(Object.values(tmpTweetsInfo.tweetsInfo.users).find((user) => (user?.legacy?.screen_name || user.screen_name || '').toLocaleLowerCase() === name.toLocaleLowerCase()))

                if (!uid) {
                    throw `archiver: no such account!!!`
                }
            } catch (e) {
                throw e
            }
        }

        let singleAccountTweetsCount = 0
        //insert
        try {
            //raw
            tmpTweetsInfo.tweetsInfo.contents.forEach((tweet) => {
                let tmpTweetId = path2array('tweet_id', tweet)
                if (!rawTweetData[tmpTweetId]) {
                    rawTweetData[tmpTweetId] = tweet
                }
            })
            //TODO get all accounts from other ways
            Object.keys(tmpTweetsInfo.tweetsInfo.users).forEach((uid) => {
                if (!rawUserInfoData[uid]) {
                    rawUserInfoData[uid] = tmpTweetsInfo.tweetsInfo.users[uid]
                }
            })

            //data
            for (let tweet of tmpTweetsInfo.tweetsContent) {
                //info
                if (UserData.account_info === null) {
                    UserData.account_info = tweet.user_info
                }
                //list
                if (!UserData.account_list[tweet.user_info.uid_str]) {
                    UserData.account_list[tweet.user_info.uid_str] = tweet.user_info
                }
                if (tweet.retweet_user_info.uid_str && !UserData.account_list[tweet.retweet_user_info.uid_str]) {
                    UserData.account_list[tweet.retweet_user_info.uid_str] = tweet.retweet_user_info
                }

                UserData.tweets[tweet.tweet_id] = tweet
                console.log(`archiver: #${++singleAccountTweetsCount} Success -> ${tweet.tweet_id}`)
            }

            //writeFileSync(basePath + '/rawdata/tweet.json', JSON.stringify(rawTweetData))
            //writeFileSync(basePath + '/rawdata/user.json', JSON.stringify(rawUserInfoData))
            UserData.tweets = Object.fromEntries(Object.entries(UserData.tweets).sort((a, b) => b[1].time > a[1].time))
            //writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))

            if (!forceTimelineForUpdate) {
                cursor.tweets.cursor = tmpTweetsInfo.tweetsInfo.contents.length ? tmpTweetsInfo.tweetsInfo.cursor?.bottom || '' : ''
                if (!cursor.tweets.maxId || cursor.tweets.maxId === '0') {
                    cursor.tweets.maxId = tmpTweetsInfo.tweetsInfo.tweetRange.max
                    range.tweet_id.max = tmpTweetsInfo.tweetsInfo.tweetRange.max
                }
                range.tweet_id.min = tmpTweetsInfo.tweetsInfo.tweetRange.min
            }

            range.time.end = Date.now()
            //writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
            //writeFileSync(basePath + '/range.json', JSON.stringify(range))
        } catch (e) {
            throw e
        }
    } while (cursor.tweets.cursor && !forceTimelineForUpdate)
    cursor.tweets.cursor = 'complete'
    //writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
    console.log(`archiver: tweets complete, cost ${new Date() - now} ms`)
}
//TODO moment

//get polls
let getPollsFailedList = []
let pollsIndex = 0
//if (existsSync(basePath + '/twitter_monitor_polls_index')) {
//    pollsIndex = Number(readFileSync(basePath + '/twitter_monitor_polls_index').toString())
//}
//if (existsSync(basePath + '/twitter_monitor_polls_failed_list.json')) {
//    getPollsFailedList = JSON.parse(readFileSync(basePath + '/twitter_monitor_polls_failed_list.json'))
//}
let pollsList = Object.values(UserData.tweets).filter((tweet) => tweet.polls && !tweet.polls[0].count)

console.log(`archiver: polls... (${pollsList.length})`)

for (; pollsIndex < pollsList.length; pollsIndex++) {
    const pollA = now / 1000 > pollsList[pollsIndex].polls[0].end_datetime
    const pollB = rawTweetData[pollsList[pollsIndex].tweet_id]
    if (pollA && pollB) {
        let cardInfo = path2array('tweet_card_path', rawTweetData[pollsList[pollsIndex].tweet_id])
        if (cardInfo && String(path2array('tweet_card_name', cardInfo)).startsWith('poll')) {
            let tmpPollKV = Object.fromEntries(Object.keys(cardInfo.binding_values).map((key) => [key, cardInfo.binding_values[key]]))
            for (let x = 1; x <= 4; x++) {
                if (!tmpPollKV['choice' + x + '_count']) {
                    break
                }
                pollsList[pollsIndex].polls[x - 1].count = tmpPollKV['choice' + x + '_count'].string_value
                console.log(`${pollsList[pollsIndex].tweet_id}: #${x} > ${pollsList[pollsIndex].polls[x - 1].count}`)
            }
        } else {
            getPollsFailedList.push(pollsList[pollsIndex].tweet_id)
            //writeFileSync(basePath + '/twitter_monitor_polls_failed_list.json', JSON.stringify(getPollsFailedList))
            console.log(`archiver: NO POLLS CONTENT (${pollsList[pollsIndex].tweet_id}) #errorpoll`)
        }
    } else {
        let pollData = await getPollResult({ tweet_id: pollsList[pollsIndex].tweet_id })
        if (pollData.code !== 200) {
            getPollsFailedList.push(pollsList[pollsIndex].tweet_id)
            //writeFileSync(basePath + '/twitter_monitor_polls_failed_list.json', JSON.stringify(getPollsFailedList))
            console.log(`archiver: ${pollData.message} (${pollsList[pollsIndex].tweet_id}) #errorpoll`)
        } else {
            for (let pollDataIndex in pollData.data) {
                pollsList[pollsIndex].polls[pollDataIndex].count = pollData.data[pollDataIndex]
                console.log(`${pollsList[pollsIndex].tweet_id}: #${Number(pollDataIndex) + 1} > ${pollsList[pollsIndex].polls[pollDataIndex].count}`)
            }
        }
    }
    console.log(`archiver: ${pollsIndex + 1} / ${pollsList.length}`)
    //writeFileSync(basePath + '/twitter_monitor_polls_index', String(pollsIndex))
}

pollsList.forEach((pollTweetItem) => {
    UserData.tweets[pollTweetItem.tweet_id] = pollTweetItem
})

// broadcasts
let broadcastsCards = Object.values(UserData.tweets)
    .filter((tweet) => (tweet.cardObject?.type === 'broadcast' || tweet.cardObject?.type === 'periscope_broadcast') && !tweet.broadcastObject)
    .map((tweet) => tweet.cardObject)
//errors list
let broadcastErrorList = []
//raw list
let broadcastRawList = {}
//if (existsSync(basePath + '/rawdata/broadcast.json')) {
//    try {
//        broadcastRawList = JSON.parse(readFileSync(basePath + '/rawdata/broadcast.json').toString())
//    } catch (e) {}
//}
if (broadcastsCards.length <= 0) {
    console.log(`archiver: no broadcast (0)`)
} else {
    while (broadcastsCards.length > 0) {
        console.log(`archiver: broadcast (${broadcastsCards.length})`)
        let tmpCardsList = broadcastsCards.splice(0, 100)
        await globalThis.guest_token.updateGuestToken(4)
        let broadcasts = await getBroadcast({
            id: tmpCardsList.map((card) => card.url.replaceAll(/.*\/([^\/\?#]+)(?:$|\?.*|#.*)/gm, '$1')),
            guest_token: globalThis.guest_token.token
        })
        globalThis.guest_token.updateRateLimit('BroadCast', 100)

        for (let index in broadcasts) {
            let broadcastResponse = broadcasts[index]
            if (broadcastResponse.status === 'fulfilled') {
                let tmpBroadcastResponseData = Broadcast(broadcastResponse.value.data)
                let tmpBroadcastLink = { data: null }
                //get link
                if (tmpBroadcastResponseData.is_available_for_replay || (Number(tmpBroadcastResponseData.start) <= Date.now() && tmpBroadcastResponseData.end === '0')) {
                    try {
                        tmpBroadcastLink = await getLiveVideoStream({ media_key: tmpBroadcastResponseData.media_key })
                        if (tmpBroadcastLink.data?.source?.noRedirectPlaybackUrl) {
                            let m3u8Url = tmpBroadcastLink.data?.source?.noRedirectPlaybackUrl
                            try {
                                let tmpParsedM3u8Url = new URL(m3u8Url)
                                let urlPrefix = tmpParsedM3u8Url.origin
                                if (tmpParsedM3u8Url.pathname.split('/').pop().includes('master_dynamic_')) {
                                    let m3u8Data = (await AxiosFetch.get(m3u8Url)).data
                                    let m3u8Parser = new Parser()
                                    m3u8Parser.push(m3u8Data)
                                    m3u8Parser.end()
                                    m3u8Url = urlPrefix + m3u8Parser.manifest.playlists.sort((a, b) => b.attributes.BANDWIDTH - a.attributes.BANDWIDTH)[0].uri
                                }
                            } catch (e) {
                                console.error(e)
                                console.log(`archiver: Unable to parse playlists from '${m3u8Url}', fallback.`)
                            }
                            tmpBroadcastResponseData.playback = m3u8Url.replaceAll('?type=replay', '').replaceAll('?type=live', '')
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
                console.log(`archiver: broadcast -->${tmpBroadcastResponseData.id}<--`)
                broadcastRawList[tmpBroadcastResponseData.id] = { info: broadcastResponse.value.data, source: tmpBroadcastLink?.data }
                UserData.tweets[tmpCardsList[index].tweet_id].broadcastObject = tmpBroadcastResponseData
            } else {
                broadcastErrorList.push(tmpCardsList[index])
                console.log(`archiver: broadcast error -->${tmpCardsList[index].tweet_id}<--`)
            }
        }
        //writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))
        //writeFileSync(basePath + '/rawdata/broadcast.json', JSON.stringify(broadcastRawList))
        //writeFileSync(basePath + '/twitter_monitor_broadcast_error_list.json', JSON.stringify(broadcastErrorList))
    }
}

// audio spaces

let audiospacesCards = Object.values(UserData.tweets)
    .filter((tweet) => tweet.cardObject?.type === 'audiospace' && !tweet.audiospaceObject)
    .map((tweet) => tweet.cardObject)

//errors list
let audiospaceErrorList = []

//raw list
let audiospaceRawList = {}

if (audiospacesCards.length <= 0) {
    console.log(`archiver: no audiospace (0)`)
} else {
    while (audiospacesCards.length > 0) {
        console.log(`archiver: audiospace (${audiospacesCards.length})`)

        let tmpCardsList = audiospacesCards.splice(0, 100)
        await globalThis.guest_token.updateGuestToken(4)
        let audiospaces = await getAudioSpace({ id: tmpCardsList.map((card) => card.url), guest_token: globalThis.guest_token.token })
        globalThis.guest_token.updateRateLimit('AudioSpaceById', 100)

        for (let index in audiospaces) {
            let audiospaceResponse = audiospaces[index]
            if (audiospaceResponse.status === 'fulfilled') {
                let tmpAudioSpace = AudioSpace(audiospaceResponse.value.data)
                let tmpAudioSpaceLink = { data: null }
                //get link
                if (tmpAudioSpace.is_available_for_replay || (Number(tmpAudioSpace.start) <= Date.now() && tmpAudioSpace.end === '0')) {
                    try {
                        tmpAudioSpaceLink = await getLiveVideoStream({ media_key: tmpAudioSpace.media_key })
                        if (tmpAudioSpaceLink.data?.source?.noRedirectPlaybackUrl) {
                            tmpAudioSpace.playback = tmpAudioSpaceLink.data?.source?.noRedirectPlaybackUrl.replaceAll('?type=replay', '').replaceAll('?type=live', '')
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
                console.log(`archiver: audiospace -->${tmpAudioSpace.id}<--`)
                audiospaceRawList[tmpAudioSpace.id] = { info: audiospaceResponse.value.data, source: tmpAudioSpaceLink?.data }
                UserData.tweets[tmpCardsList[index].tweet_id].audiospaceObject = tmpAudioSpace
            } else {
                audiospaceErrorList.push(tmpCardsList[index])
                console.log(`archiver: audiospace error -->${tmpCardsList[index].tweet_id}<--`)
            }
        }
        //writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))
        //writeFileSync(basePath + '/rawdata/audiospace.json', JSON.stringify(audiospaceRawList))
        //writeFileSync(basePath + '/twitter_monitor_audiospace_error_list.json', JSON.stringify(audiospaceErrorList))
    }
}

//writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))

//TODO save to local
//console.log(JSON.stringify(UserData))

//console.log(getPollsFailedList)

console.log(`archiver: Time cost ${new Date() - now} ms`) //TODO remove

// Download
const Download = (url, fileName) => {
    let element = document.createElement('a')
    element.setAttribute('href', url)
    element.setAttribute('download', fileName)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
}

Download(URL.createObjectURL(new Blob([JSON.stringify(globalThis.UserData, null, 4)], { type: 'application/json' })), `${name}.json`)
