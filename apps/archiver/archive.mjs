// Twitter Archiver
// @BANKA2017 && NEST.MOE
// Archive()

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { getAudioSpace, getBroadcast, getFollowingOrFollowers, getImage, getLiveVideoStream, getPollResult, getTweets, AxiosFetch } from '../../libs/core/Core.fetch.mjs'

import { Log, GuestToken, PathInfo, Sleep } from '../../libs/core/Core.function.mjs'
import path2array from '../../libs/core/Core.apiPath.mjs'
//import { TGPush } from '../../libs/core/Core.push.mjs'
import { GenerateAccountInfo } from '../../libs/core/Core.info.mjs'
import { argv } from 'node:process'
import { GenerateData } from '../backend/CoreFunctions/online/OnlineTweet.mjs'
import { AudioSpace, Broadcast } from '../../libs/core/Core.tweet.mjs'
import { Parser } from 'm3u8-parser'

let activeFlags = {
    tweet: true,
    followers: false,
    following: false,
    media: false,
    broadcast: false,
    space: false
}
const argvList = {
    '--all': () => {
        Log(false, 'log', `archiver: All data`)
        activeFlags = Object.fromEntries(Object.entries(activeFlags).map((flag) => [flag[0], true]))
    },
    '--followers': () => {
        Log(false, 'log', `archiver: Add Followers`)
        activeFlags.followers = true
    },
    '--following': () => {
        Log(false, 'log', `archiver: Add Following`)
        activeFlags.following = true
    },
    '--media': () => {
        Log(false, 'log', `archiver: Add Media`)
        activeFlags.media = true
    },
    '--broadcast': () => {
        Log(false, 'log', `archiver: Add Broadcasts`)
        activeFlags.broadcast = true
    },
    '--space': () => {
        Log(false, 'log', `archiver: Add Spaces`)
        activeFlags.space = true
    }
}

//settings
let name = ''
let forceTimelineForUpdate = false
let update = false

// argv
for (const argvContent of argv.slice(2)) {
    if (argvList[argvContent]) {
        argvList[argvContent]()
    } else if (argvContent.startsWith('--skip_') && activeFlags[argvContent.replace('--skip_', '')]) {
        //TODO any better idea?
        activeFlags[argvContent.replace('--skip_', '')] = false
    } else if (argvContent === '--timeline') {
        Log(false, 'log', `archiver: force use timeline api to update tweets`)
        forceTimelineForUpdate = true
    } else if (argvContent.startsWith('--name=')) {
        name = argvContent.replace('--name=', '')
    } else if (argvContent === '--update') {
        update = true
    }
}

if (!name) {
    Log(false, 'log', `archiver: No active screen name!`)
    process.exit()
}

let basePath = `./${name}` // ./twitter_archiver

if (existsSync(basePath) && !update) {
    Log(false, 'log', `Path" ${basePath} "already exists, please rename or remove it.`)
    process.exit()
} else if (!update) {
    try {
        mkdirSync(basePath)
        mkdirSync(basePath + '/rawdata')
        mkdirSync(basePath + '/savedata')
        mkdirSync(basePath + '/savemedia')
        mkdirSync(basePath + '/scripts')
    } catch (e) {
        Log(false, 'error', `archiver: `, e)
        process.exit()
    }
}

//TODO will be used in the future
//cookie for follower and following
//const cookie = {
//    auth_token: '',
//    ct0: ''
//}

//check base path
if (!existsSync(basePath)) {
    Log(false, 'error', `archiver: path -->${basePath}<-- is NOT EXIST!`)
    process.exit()
} else {
    Log(false, 'log', `archive: init...`)
}

//save date
let now = Date.now()
let range = {
    time: { start: now, end: 0 },
    tweet_id: { max: '0', min: '0' }
}
if (existsSync(basePath + '/range.json')) {
    range = JSON.parse(readFileSync(basePath + '/range.json').toString())
} else {
    writeFileSync(basePath + '/range.json', JSON.stringify(range))
}

//get data from disk
let rawTweetData = {}
let rawUserInfoData = {}
let UserData = {
    account_info: null,
    account_list: {},
    tweets: {},
    type: 'full'
}

if (existsSync(basePath + '/rawdata/tweet.json')) {
    rawTweetData = JSON.parse(readFileSync(basePath + '/rawdata/tweet.json'))
}
if (existsSync(basePath + '/rawdata/user.json')) {
    rawUserInfoData = JSON.parse(readFileSync(basePath + '/rawdata/user.json'))
}
if (existsSync(basePath + '/savedata/data.json')) {
    UserData = JSON.parse(readFileSync(basePath + '/savedata/data.json'))
}

let uid = UserData.account_info?.uid || null

//get init token
global.guest_token = new GuestToken()
global.legacy_guest_token = new GuestToken()
await global.guest_token.updateGuestToken(4)
await global.legacy_guest_token.updateGuestToken(0)

if (global.guest_token.token.nextActiveTime) {
    //await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
    Log(false, 'error', `[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
    await Sleep(global.guest_token.token.nextActiveTime - Date.now())
    await global.guest_token.updateGuestToken(4)
    if (!global.guest_token.token.success) {
        process.exit()
    }
}

// cursor
let cursor = {
    tweets: { maxId: '', tmpId: '', cursor: '' },
    followers: { maxId: '', tmpId: '', cursor: '' },
    following: { maxId: '', tmpId: '', cursor: '' },
    media: { maxId: '', tmpId: '', cursor: '' },
    broadcast: { maxId: '', tmpId: '', cursor: '' },
    space: { maxId: '', tmpId: '', cursor: '' }
}

//broadcast and audiospace
let broadcastAndAudiospaceScriptMessage = ''

try {
    if (existsSync(basePath + '/twitter_archive_cursor.json')) {
        const tmpCursor = JSON.parse(readFileSync(basePath + '/twitter_archive_cursor.json').toString())
        cursor = tmpCursor
    }
} catch (e) {
    Log(false, 'log', `archiver: Invalid cursor file`)
}

//userinfo and tweets
if (activeFlags.tweet) {
    if (cursor.tweets.cursor === '') {
        Log(false, 'log', `archiver: new account`)
    } else if (cursor.tweets.cursor === 'complete') {
        cursor.tweets.cursor = ''
        if (cursor.tweets.maxId && cursor.tweets.maxId !== 0) {
            cursor.tweets.tmpId = cursor.tweets.maxId
            cursor.tweets.maxId = ''
        }
    }
    Log(false, 'log', 'archiver: tweets...')
    if (!cursor.tweets.tmpId || !uid) {
        Log(false, 'log', `archiver: new task is unable to use timeline api`)
        forceTimelineForUpdate = false
    }
    if (cursor.tweets.cursor !== 'complete') {
        //TODO query string
        //TODO wait for retweets
        const query = [`from:${name}`, 'include:replies', 'include:nativeretweets', 'include:retweets', 'include:quote', `since_id:${cursor.tweets.tmpId ? cursor.tweets.tmpId : 0}`].join(' ')
        Log(false, 'log', `archiver: query string -->${query}<--`)
        do {
            await global.guest_token.updateGuestToken(4)
            if (global.guest_token.token.nextActiveTime) {
                //await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                Log(false, 'error', `[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                break //只处理现有的
            }
            let tweets = null
            try {
                tweets = await getTweets({
                    queryString: forceTimelineForUpdate ? uid : query,
                    cursor: forceTimelineForUpdate ? '' : cursor.tweets.cursor || '',
                    guest_token: global.guest_token.token,
                    count: !forceTimelineForUpdate ? 100 : 999,
                    online: true,
                    graphqlMode: forceTimelineForUpdate,
                    searchMode: !forceTimelineForUpdate,
                    withReply: true
                })
                global.guest_token.updateRateLimit('Search')
                Log(false, 'log', JSON.stringify(tweets.data))
            } catch (e) {
                //try again
                Log(false, 'log', 'archiver: first retry...')
                try {
                    tweets = await getTweets({
                        queryString: forceTimelineForUpdate ? uid : query,
                        cursor: forceTimelineForUpdate ? '' : cursor.tweets.cursor || '',
                        guest_token: global.guest_token.token,
                        count: !forceTimelineForUpdate ? 100 : 999,
                        online: true,
                        graphqlMode: forceTimelineForUpdate,
                        searchMode: !forceTimelineForUpdate,
                        withReply: true
                    })
                    global.guest_token.updateRateLimit('Search')
                } catch (e1) {
                    Log(false, 'log', 'archiver: retry failed...')
                    Log(false, 'error', e1)
                    process.exit()
                }
            }
            if (tweets === null) {
                Log(false, 'error', `archiver: empty response`)
                process.exit()
            }

            //const tmpTweetsInfo = TweetsInfo(tweets.data, true)
            const tmpTweetsInfo = GenerateData(tweets, false, '', forceTimelineForUpdate)
            if (tmpTweetsInfo.tweetsInfo.errors.code !== 0) {
                Log(false, 'log', `archiver: error #${tmpTweetsInfo.tweetsInfo.errors.code} , ${tmpTweetsInfo.tweetsInfo.errors.message}`)
                //TGPush(`archiver: error #${tmpTweetsInfo.tweetsInfo.errors.code} , ${tmpTweetsInfo.tweetsInfo.errors.message}`)
                continue
            }
            Log(false, 'log', `archiver: cursor -->${tmpTweetsInfo.tweetsInfo.cursor?.bottom || 'end'}<-- (${tmpTweetsInfo.tweetsInfo.contentLength})`)
            writeFileSync(basePath + `/rawdata/${forceTimelineForUpdate ? 'timeline_' : ''}${tmpTweetsInfo.tweetsInfo.tweetRange.max}_${tmpTweetsInfo.tweetsInfo.tweetRange.min}.json`, JSON.stringify(tweets.data))

            //get account info
            if (uid === null) {
                try {
                    //restful
                    //uid = Object.values(tmpTweetsInfo.tweetsInfo.users).filter(user => user.screen_name.toLocaleLowerCase() === name.toLocaleLowerCase())[0]?.id_str || null
                    //graphql
                    uid = ((user) => user?.rest_id || user?.id_str || null)(Object.values(tmpTweetsInfo.tweetsInfo.users).find((user) => (user?.legacy?.screen_name || user.screen_name || '').toLocaleLowerCase() === name.toLocaleLowerCase()))

                    if (!uid) {
                        Log(false, 'error', `archiver: no such account!!!`)
                        process.exit()
                    }
                } catch (e) {
                    Log(false, 'error', e)
                    process.exit()
                }
            }

            let singleAccountTweetsCount = 0
            //insert
            try {
                //raw
                tmpTweetsInfo.tweetsInfo.contents.forEach((tweet) => {
                    const tmpTweetId = path2array('tweet_id', tweet)
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
                for (const tweet of tmpTweetsInfo.tweetsContent) {
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
                    Log(false, 'log', `archiver: #${++singleAccountTweetsCount} Success -> ${tweet.tweet_id}`)
                }

                writeFileSync(basePath + '/rawdata/tweet.json', JSON.stringify(rawTweetData))
                writeFileSync(basePath + '/rawdata/user.json', JSON.stringify(rawUserInfoData))
                UserData.tweets = Object.fromEntries(Object.entries(UserData.tweets).sort((a, b) => b[1].time > a[1].time))
                writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))

                if (!forceTimelineForUpdate) {
                    cursor.tweets.cursor = tmpTweetsInfo.tweetsInfo.contents.length ? tmpTweetsInfo.tweetsInfo.cursor?.bottom || '' : ''
                    if (!cursor.tweets.maxId || cursor.tweets.maxId === '0') {
                        cursor.tweets.maxId = tmpTweetsInfo.tweetsInfo.tweetRange.max
                        range.tweet_id.max = tmpTweetsInfo.tweetsInfo.tweetRange.max
                    }
                    range.tweet_id.min = tmpTweetsInfo.tweetsInfo.tweetRange.min
                }

                range.time.end = Date.now()
                writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
                writeFileSync(basePath + '/range.json', JSON.stringify(range))
            } catch (e) {
                Log(false, 'error', e)
                process.exit()
            }
        } while (cursor.tweets.cursor && !forceTimelineForUpdate)
        cursor.tweets.cursor = 'complete'
        writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
        Log(false, 'log', `archiver: tweets complete, cost ${new Date() - now} ms`)
    }
    //TODO moment

    //get polls
    let getPollsFailedList = []
    let pollsIndex = 0
    if (existsSync(basePath + '/twitter_monitor_polls_index')) {
        pollsIndex = Number(readFileSync(basePath + '/twitter_monitor_polls_index').toString())
    }
    if (existsSync(basePath + '/twitter_monitor_polls_failed_list.json')) {
        getPollsFailedList = JSON.parse(readFileSync(basePath + '/twitter_monitor_polls_failed_list.json'))
    }
    let pollsList = Object.values(UserData.tweets).filter((tweet) => tweet.polls && !tweet.polls[0].count)

    Log(false, 'log', `archiver: polls... (${pollsList.length})`)

    for (; pollsIndex < pollsList.length; pollsIndex++) {
        if (now / 1000 > pollsList[pollsIndex].polls[0].end_datetime && rawTweetData[pollsList[pollsIndex].tweet_id]) {
            const cardInfo = path2array('tweet_card_path', rawTweetData[pollsList[pollsIndex].tweet_id])
            if (cardInfo && String(path2array('tweet_card_name', cardInfo)).startsWith('poll')) {
                const tmpPollKV = Object.fromEntries(Object.keys(cardInfo.binding_values).map((key) => [key, cardInfo.binding_values[key]]))
                for (let x = 1; x <= 4; x++) {
                    if (!tmpPollKV['choice' + x + '_count']) {
                        break
                    }
                    pollsList[pollsIndex].polls[x - 1].count = tmpPollKV['choice' + x + '_count'].string_value
                    Log(false, 'log', `${pollsList[pollsIndex].tweet_id}: #${x} > ${pollsList[pollsIndex].polls[x - 1].count}`)
                }
            } else {
                getPollsFailedList.push(pollsList[pollsIndex].tweet_id)
                writeFileSync(basePath + '/twitter_monitor_polls_failed_list.json', JSON.stringify(getPollsFailedList))
                Log(false, 'log', `archiver: NO POLLS CONTENT (${pollsList[pollsIndex].tweet_id}) #errorpoll`)
            }
        } else {
            const pollData = await getPollResult({ tweet_id: pollsList[pollsIndex].tweet_id })
            if (pollData.code !== 200) {
                getPollsFailedList.push(pollsList[pollsIndex].tweet_id)
                writeFileSync(basePath + '/twitter_monitor_polls_failed_list.json', JSON.stringify(getPollsFailedList))
                Log(false, 'log', `archiver: ${pollData.message} (${pollsList[pollsIndex].tweet_id}) #errorpoll`)
            } else {
                for (const pollDataIndex in pollData.data) {
                    pollsList[pollsIndex].polls[pollDataIndex].count = pollData.data[pollDataIndex]
                    Log(false, 'log', `${pollsList[pollsIndex].tweet_id}: #${Number(pollDataIndex) + 1} > ${pollsList[pollsIndex].polls[pollDataIndex].count}`)
                }
            }
        }
        Log(false, 'log', `archiver: ${pollsIndex + 1} / ${pollsList.length}`)
        writeFileSync(basePath + '/twitter_monitor_polls_index', String(pollsIndex))
    }

    pollsList.forEach((pollTweetItem) => {
        UserData.tweets[pollTweetItem.tweet_id] = pollTweetItem
    })
    writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))
    //Log(false, 'log', getPollsFailedList)
}

// to save broadcasts and spaces, you have to install ffmpeg and place another GPLv2 script named `broadcast.mjs`/`audiospace.mjs` in same path with this script or just place them in savedata/

// broadcasts
if (activeFlags.broadcast) {
    let broadcastsCards = Object.values(UserData.tweets)
        .filter((tweet) => (tweet.cardObject?.type === 'broadcast' || tweet.cardObject?.type === 'periscope_broadcast') && !tweet.broadcastObject)
        .map((tweet) => tweet.cardObject)
    //errors list
    let broadcastErrorList = []
    if (existsSync(basePath + '/twitter_monitor_broadcast_error_list.json')) {
        try {
            broadcastErrorList = JSON.parse(readFileSync(basePath + '/twitter_monitor_broadcast_error_list.json').toString())
        } catch (e) {}
    }
    //raw list
    let broadcastRawList = {}
    if (existsSync(basePath + '/rawdata/broadcast.json')) {
        try {
            broadcastRawList = JSON.parse(readFileSync(basePath + '/rawdata/broadcast.json').toString())
        } catch (e) {}
    }
    if (broadcastsCards.length <= 0) {
        Log(false, 'log', `archiver: no broadcast (0)`)
    } else {
        while (broadcastsCards.length > 0) {
            Log(false, 'log', `archiver: broadcast (${broadcastsCards.length})`)

            const tmpCardsList = broadcastsCards.splice(0, 100)
            await global.guest_token.updateGuestToken(4)
            const broadcasts = await getBroadcast({
                id: tmpCardsList.map((card) => card.url.replaceAll(/.*\/([^\/\?#]+)(?:$|\?.*|#.*)/gm, '$1')),
                guest_token: global.guest_token.token
            })
            global.guest_token.updateRateLimit('BroadCast', 100)

            for (const index in broadcasts) {
                const broadcastResponse = broadcasts[index]
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
                                    const tmpParsedM3u8Url = new URL(m3u8Url)
                                    const urlPrefix = tmpParsedM3u8Url.origin
                                    if (tmpParsedM3u8Url.pathname.split('/').pop().includes('master_dynamic_')) {
                                        const m3u8Data = (await AxiosFetch.get(m3u8Url)).data
                                        const m3u8Parser = new Parser()
                                        m3u8Parser.push(m3u8Data)
                                        m3u8Parser.end()
                                        m3u8Url = urlPrefix + m3u8Parser.manifest.playlists.sort((a, b) => b.attributes.BANDWIDTH - a.attributes.BANDWIDTH)[0].uri
                                    }
                                } catch (e) {
                                    Log(false, 'error', e)
                                    Log(false, 'log', `archiver: Unable to parse playlists from '${m3u8Url}', fallback.`)
                                }

                                tmpBroadcastResponseData.playback = m3u8Url.replaceAll('?type=replay', '').replaceAll('?type=live', '')
                            }
                        } catch (e) {
                            Log(false, 'error', e)
                        }
                    }
                    Log(false, 'log', `archiver: broadcast -->${tmpBroadcastResponseData.id}<--`)
                    broadcastRawList[tmpBroadcastResponseData.id] = { info: broadcastResponse.value.data, source: tmpBroadcastLink?.data }
                    UserData.tweets[tmpCardsList[index].tweet_id].broadcastObject = tmpBroadcastResponseData
                } else {
                    broadcastErrorList.push(tmpCardsList[index])
                    Log(false, 'log', `archiver: broadcast error -->${tmpCardsList[index].tweet_id}<--`)
                }
            }
            writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))
            writeFileSync(basePath + '/rawdata/broadcast.json', JSON.stringify(broadcastRawList))
            writeFileSync(basePath + '/twitter_monitor_broadcast_error_list.json', JSON.stringify(broadcastErrorList))
        }
    }
    //create ffmpeg script
    //not yet support windows...maybe not?
    //10Mbps for sources with fastly, and others is 1Mbps, change host manually is useless.
    // https://prod-ec-ap-northeast-1.video.pscp.tv
    // https://prod-fastly-ap-northeast-1.video.pscp.tv
    let broadcastScript = ''
    for (const broadcastItem of [
        ...new Set(
            Object.entries(UserData.tweets || {})
                .filter((tweet) => tweet[1].broadcastObject)
                .map((tweet) => [tweet[1].broadcastObject, tweet[1].cardObject])
        )
    ]) {
        if (!broadcastItem[0].playback) {
            Log(false, 'log', `archiver: Broadcast is not exist`)
            continue
        }
        broadcastScript += `ffmpeg -y -i "${broadcastItem[0].playback}" -c copy -bsf:a aac_adtstoasc ../savemedia/broadcast_${broadcastItem[0].id}.mp4\n`
    }
    if (broadcastScript) {
        broadcastAndAudiospaceScriptMessage += `bash broadcast.sh\n`
        writeFileSync(basePath + '/scripts/broadcast.sh', broadcastScript)
    }
}

// audio spaces

if (activeFlags.space) {
    // spaces

    let audiospacesCards = Object.values(UserData.tweets)
        .filter((tweet) => tweet.cardObject?.type === 'audiospace' && !tweet.audiospaceObject)
        .map((tweet) => tweet.cardObject)

    //errors list
    let audiospaceErrorList = []
    if (existsSync(basePath + '/twitter_monitor_audiospace_error_list.json')) {
        try {
            audiospaceErrorList = JSON.parse(readFileSync(basePath + '/twitter_monitor_audiospace_error_list.json').toString())
        } catch (e) {}
    }
    //raw list
    let audiospaceRawList = {}
    if (existsSync(basePath + '/rawdata/audiospace.json')) {
        try {
            audiospaceRawList = JSON.parse(readFileSync(basePath + '/rawdata/audiospace.json').toString())
        } catch (e) {}
    }
    if (audiospacesCards.length <= 0) {
        Log(false, 'log', `archiver: no audiospace (0)`)
    } else {
        while (audiospacesCards.length > 0) {
            Log(false, 'log', `archiver: audiospace (${audiospacesCards.length})`)

            const tmpCardsList = audiospacesCards.splice(0, 100)
            await global.guest_token.updateGuestToken(4)
            const audiospaces = await getAudioSpace({ id: tmpCardsList.map((card) => card.url), guest_token: global.guest_token.token })
            global.guest_token.updateRateLimit('AudioSpaceById', 100)

            for (const index in audiospaces) {
                const audiospaceResponse = audiospaces[index]
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
                            Log(false, 'error', e)
                        }
                    }

                    Log(false, 'log', `archiver: audiospace -->${tmpAudioSpace.id}<--`)
                    audiospaceRawList[tmpAudioSpace.id] = { info: audiospaceResponse.value.data, source: tmpAudioSpaceLink?.data }
                    UserData.tweets[tmpCardsList[index].tweet_id].audiospaceObject = tmpAudioSpace
                } else {
                    audiospaceErrorList.push(tmpCardsList[index])
                    Log(false, 'log', `archiver: audiospace error -->${tmpCardsList[index].tweet_id}<--`)
                }
            }
            writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))
            writeFileSync(basePath + '/rawdata/audiospace.json', JSON.stringify(audiospaceRawList))
            writeFileSync(basePath + '/twitter_monitor_audiospace_error_list.json', JSON.stringify(audiospaceErrorList))
        }
    }

    let audioSpaceScript = ''
    for (const audiospaceItem of Object.entries(audiospaceRawList || {})) {
        //ffmpeg -i "" -c copy radio.aac
        if (!audiospaceItem[1]?.source) {
            Log(false, 'log', `archiver: Space is not exist`)
            continue
        }
        audioSpaceScript += `ffmpeg -y -i "${audiospaceItem[1].source.source?.noRedirectPlaybackUrl || audiospaceItem[1].source.source?.location}" -c copy ../savemedia/audiospace_${audiospaceItem[0]}.aac\n`
    }
    if (audioSpaceScript) {
        broadcastAndAudiospaceScriptMessage += `bash audiospace.sh\n`
        writeFileSync(basePath + '/scripts/audiospace.sh', audioSpaceScript)
    }
}

//save media
//Used token2, solved//TODO find mixed media tweets

if (activeFlags.media) {
    let mediaIndex = 0
    let getMediaFailedList = []
    //if (existsSync(basePath + '/twitter_monitor_media_index')) {
    //    mediaIndex = Number(readFileSync(basePath + '/twitter_monitor_media_index').toString())
    //}
    if (existsSync(basePath + '/twitter_monitor_media_failed_list.json')) {
        getMediaFailedList = JSON.parse(readFileSync(basePath + '/twitter_monitor_media_failed_list.json'))
    }
    //profile

    Log(false, 'log', `archive: avatar and headers (${Object.keys(UserData.account_list).length})`)
    for (const avatar_header_uid in UserData.account_list) {
        const account = UserData.account_list[avatar_header_uid]
        let avatarLinkInfo = PathInfo(`https://` + account.header)
        if (!existsSync(basePath + `/savemedia/avatar_${account.uid_str}.${avatarLinkInfo.extension}`)) {
            try {
                const avatarBuffer = await getImage(`https://` + account.header)
                writeFileSync(basePath + `/savemedia/avatar_${account.uid_str}.${avatarLinkInfo.extension}`, avatarBuffer.data)
                Log(false, 'log', `archiver: saved avatar @${account.name}(${account.uid_str})`)
            } catch (e) {
                getMediaFailedList.push({
                    url: `https://` + account.header,
                    basename: `avatar_${account.uid}.${avatarLinkInfo.extension}`
                })
                Log(false, 'log', `archiver: unable to save avatar @${account.name}(${account.uid_str})`)
            }
        }

        if (!existsSync(basePath + `/savemedia/banner_${account.uid_str}.jpg`)) {
            try {
                const bannerBuffer = await getImage(`https://pbs.twimg.com/profile_banners/${account.uid_str}/${account.banner}`)
                writeFileSync(basePath + `/savemedia/banner_${account.uid_str}.jpg`, bannerBuffer.data)
                Log(false, 'log', `archiver: saved banner @${account.name}(${account.uid_str})`)
            } catch (e) {
                getMediaFailedList.push({
                    url: `https://pbs.twimg.com/profile_banners/${account.uid_str}/${account.banner}`,
                    basename: `banner_${account.uid_str}.jpg`
                })
                Log(false, 'log', `archiver: unable to save banner @${account.name}(${account.uid_str})`)
            }
        }
    }

    writeFileSync(basePath + '/twitter_monitor_media_failed_list.json', JSON.stringify(getMediaFailedList))

    let mediaList = Object.values(UserData.tweets)
        .filter((tweet) => tweet.mediaObject.length)
        .map((tweet) => tweet.mediaObject)
        .flat()
        .reverse(0)
        .map((media) => {
            if (!['cover', 'card', 'cards'].includes(media.source) && media.extension !== 'mp4') {
                media.url = media.url + ':orig'
            }
            media.url = 'https://' + media.url
            return media
        })
    //save media list
    let statusCount = { success: 0, error: 0 }
    writeFileSync(basePath + '/savedata/media.json', JSON.stringify(mediaList))
    for (; mediaIndex < mediaList.length; ) {
        let tmpMediaList = mediaList.slice(mediaIndex, mediaIndex + 99)
        const tmpLength = tmpMediaList.length
        //precheck
        tmpMediaList = tmpMediaList.filter((media) => !existsSync(basePath + `/savemedia/${media.filename}.${media.extension}`))
        Log(false, 'log', `archiver: ${tmpLength - tmpMediaList.length} media skipped`)
        statusCount.success += tmpLength - tmpMediaList.length
        await Promise.allSettled(
            tmpMediaList.map(
                (mediaItem) =>
                    new Promise((resolve, reject) => {
                        getImage(mediaItem.url)
                            .then((response) => {
                                resolve({ imageBuffer: response.data, meta: mediaItem })
                            })
                            .catch((e) => {
                                reject({ imageBuffer: null, meta: mediaItem })
                            })
                    })
            )
        )
            .then((response) => {
                response.forEach((imageReaponse) => {
                    if (imageReaponse.status === 'fulfilled' && imageReaponse.value.imageBuffer) {
                        writeFileSync(basePath + `/savemedia/${imageReaponse.value.meta.filename}.${imageReaponse.value.meta.extension}`, imageReaponse.value.imageBuffer)
                        statusCount.success++
                        Log(false, 'log', `${imageReaponse.value.meta.url}\tsuccess: ${statusCount.success}, error: ${statusCount.error}, ${statusCount.success + statusCount.error} / ${mediaList.length}`)
                    } else {
                        getMediaFailedList.push({
                            url: imageReaponse.reason.meta.url,
                            basename: `${imageReaponse.reason.meta.filename}.${imageReaponse.reason.meta.extension}`
                        })
                        writeFileSync(basePath + '/twitter_monitor_media_failed_list.json', JSON.stringify(getMediaFailedList))
                        statusCount.error++
                        Log(false, 'log', `archiver: image ${imageReaponse.reason.meta.url}\tsuccess: ${statusCount.success}, error: ${statusCount.error}, ${statusCount.success + statusCount.error} / ${mediaList.length}`)
                    }
                })
            })
            .catch((e) => {
                Log(false, 'log', e)
            })
        mediaIndex += 100
        writeFileSync(basePath + '/twitter_monitor_media_index', String(mediaIndex))
    }

    range.time.end = Date.now()
    writeFileSync(basePath + '/range.json', JSON.stringify(range))
    Log(false, 'log', `archiver: online tasks complete`)

    //TODO broadcasts via ffmpeg
}

//TODO split and generate offline data
//media / account info / analytics

//TODO follower and following with cookie
//cookie.auth_token && cookie.ct0
if (true) {
    Log(false, 'log', `archiver: Following and Followers...`)
    const screen_name = UserData.account_info?.name
    let cookieRequestsRateLimit = 0

    if (activeFlags.following) {
        let rawFollowingData = {}
        let FollowingData = {}
        let following_count = 0

        if (existsSync(basePath + '/rawdata/following.json')) {
            rawFollowingData = JSON.parse(readFileSync(basePath + '/rawdata/following.json'))
        }
        if (existsSync(basePath + '/savedata/following.json')) {
            FollowingData = JSON.parse(readFileSync(basePath + '/savedata/following.json'))
        }

        if (cursor.following.cursor === 'complete') {
            //reset following cursor
            //TODO auto break
            cursor.following.cursor = ''
        } else if (cursor.following.cursor !== 'complete') {
            do {
                if (cookieRequestsRateLimit > 14) {
                    //guest token hack
                    global.legacy_guest_token.updateRateLimit('UserByRestId', 490)
                    await global.legacy_guest_token.updateGuestToken(0)
                    cookieRequestsRateLimit = 0
                }
                const followingResponse = await getFollowingOrFollowers({
                    id: screen_name,
                    type: 'Following',
                    count: 200,
                    cursor: cursor.following.cursor,
                    guest_token: global.legacy_guest_token.token
                })
                //next_cursor_str
                //previous_cursor_str
                cookieRequestsRateLimit++

                for (const tmpUserInfo of followingResponse.data.users) {
                    following_count++
                    rawFollowingData[tmpUserInfo['id_str']] = tmpUserInfo
                    FollowingData[tmpUserInfo['id_str']] = GenerateAccountInfo(tmpUserInfo).GeneralAccountData
                    Log(false, 'log', `archiver: Following\t${tmpUserInfo['id_str']}\t[${FollowingData[tmpUserInfo['id_str']]['display_name']}](@${FollowingData[tmpUserInfo['id_str']]['name']})\t${following_count}`)
                }

                //save raw data
                writeFileSync(basePath + '/rawdata/following.json', JSON.stringify(rawFollowingData))
                writeFileSync(basePath + '/savedata/following.json', JSON.stringify(FollowingData))
                cursor.following.cursor = followingResponse.data.users.length ? followingResponse.data.next_cursor_str || '' : ''
                if (cursor.following.cursor === '0') {
                    cursor.following.cursor = ''
                }
                writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
            } while (cursor.following.cursor)
            cursor.following.cursor = 'complete'
            writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
            Log(false, 'log', `archiver: Following complete, cost ${new Date() - now} ms`)
            range.time.end = Date.now()
            writeFileSync(basePath + '/range.json', JSON.stringify(range))
        }
    }

    if (activeFlags.followers) {
        let rawFollowersData = {}
        let FollowersData = {}
        let followers_count = 0

        if (existsSync(basePath + '/rawdata/followers.json')) {
            rawFollowersData = JSON.parse(readFileSync(basePath + '/rawdata/followers.json'))
        }
        if (existsSync(basePath + '/savedata/followers.json')) {
            FollowersData = JSON.parse(readFileSync(basePath + '/savedata/followers.json'))
        }

        if (cursor.followers.cursor === 'complete') {
            //reset followers cursor
            //TODO auto break
            cursor.followers.cursor = ''
        } else if (cursor.followers.cursor !== 'complete') {
            do {
                if (cookieRequestsRateLimit > 14) {
                    //guest token hack
                    global.legacy_guest_token.updateRateLimit('UserByRestId', 490)
                    await global.legacy_guest_token.updateGuestToken(0)
                    cookieRequestsRateLimit = 0
                }
                const followersResponse = await getFollowingOrFollowers({
                    id: screen_name,
                    type: 'Followers',
                    count: 200,
                    cursor: cursor.followers.cursor,
                    guest_token: global.legacy_guest_token.token
                })
                cookieRequestsRateLimit++

                for (const tmpUserInfo of followersResponse.data.users) {
                    followers_count++
                    rawFollowersData[tmpUserInfo['id_str']] = tmpUserInfo
                    FollowersData[tmpUserInfo['id_str']] = GenerateAccountInfo(tmpUserInfo).GeneralAccountData
                    Log(false, 'log', `archiver: Follower\t${tmpUserInfo['id_str']}\t[${FollowersData[tmpUserInfo['id_str']]['display_name']}](@${FollowersData[tmpUserInfo['id_str']]['name']})\t${followers_count}`)
                }

                //save raw data
                writeFileSync(basePath + '/rawdata/followers.json', JSON.stringify(rawFollowersData))
                writeFileSync(basePath + '/savedata/followers.json', JSON.stringify(FollowersData))
                cursor.followers.cursor = followersResponse.data.users.length ? followersResponse.data.next_cursor_str || '' : ''
                if (cursor.followers.cursor === '0') {
                    cursor.followers.cursor = ''
                }
                writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
            } while (cursor.followers.cursor)
            cursor.followers.cursor = 'complete'
            writeFileSync(basePath + '/twitter_archive_cursor.json', JSON.stringify(cursor))
            Log(false, 'log', `archiver: Followers complete, cost ${new Date() - now} ms`)
            range.time.end = Date.now()
            writeFileSync(basePath + '/range.json', JSON.stringify(range))
        }
    }
} else {
    Log(false, 'log', `archiver: To archive following and followers, you have to provide 'auth_token' and 'ct0' in variable 'cookie'`)
}

Log(false, 'log', `archiver: Time cost ${new Date() - now} ms`) //TODO remove

if (broadcastAndAudiospaceScriptMessage) {
    Log(false, 'log', `archiver: Archiver() have been created some scripts in folder ./${name}/scripts/, so you can exec command below:\n\ncd ${name}/scripts/\n${broadcastAndAudiospaceScriptMessage}\n`)
}

process.exit()
