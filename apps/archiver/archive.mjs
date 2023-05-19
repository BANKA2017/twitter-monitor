// Twitter Archiver
// @BANKA2017 && NEST.MOE
// Archive()

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { getFollowingOrFollowers, getImage, getPollResult, getTweets } from '../../libs/core/Core.fetch.mjs'

import { GuestToken, PathInfo, Sleep } from '../../libs/core/Core.function.mjs'
import path2array from '../../libs/core/Core.apiPath.mjs'
import { Tweet, TweetsInfo } from '../../libs/core/Core.tweet.mjs'
import { TGPush } from '../../libs/core/Core.push.mjs'
import { GenerateAccountInfo } from '../../libs/core/Core.account.mjs'
import { argv } from 'node:process'

// bash init.sh <SCREEN_NAME>   bash/zsh/...
// .\init.ps1 <SCREEN_NAME>     powershell
if (!existsSync('./screen_name.txt')) {
    console.log(`archiver: No active screen name!`)
    process.exit()
}
const name = readFileSync('./screen_name.txt').toString().trim()
const basePath = `./${name}`// ./twitter_archiver
let activeFlags = {
    user_info: true, 
    tweets: true, 
    followers: false, 
    following: false,
    media: true,//TODO
}
const argvList = {
    "--all": () => {
        console.log(`archiver: All data (UserInfo, Tweets, Following, Followers)`)
        activeFlags.following = true
        activeFlags.followers = true
    },
    "--followers": () => {
        console.log(`archiver: Add Followers`)
        activeFlags.followers = true
    },
    "--following": () => {
        console.log(`archiver: Add Following`)
        activeFlags.following = true
    }, 
    "--media": () => {
        console.log(`archiver: Add Media`)
        activeFlags.media = true
    }, 
}

// argv
for (const argvContent of argv.slice(2)) {
    if (argvList[argvContent]) {
        argvList[argvContent]()
    }
}

//TODO will be used in the future
//cookie for follower and following
//const cookie = {
//    auth_token: '',
//    ct0: ''
//}

let cursor = ''

//check base path
if (!existsSync(basePath)) {
    console.error(`archiver: path -->${basePath}<-- is NOT EXIST!`)
    process.exit()
} else {
    
}

//save date
let now = Date.now()
writeFileSync(basePath + '/range.json', JSON.stringify({start: now, end: 0}))


//get data from disk
let rawTweetData = {}
let rawUserInfoData = {}
let UserData = {
    v2_account_info: null,
    v2_twitter_tweets: {},
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
if (existsSync(basePath + '/twitter_archive_cursor')) {
    cursor = readFileSync(basePath + '/twitter_archive_cursor').toString().trim()
}

if (cursor === '') {
    console.log(`archiver: new account`)
}
let uid = UserData.v2_account_info?.uid || null

//get init token
global.guest_token = new GuestToken
global.legacy_guest_token = new GuestToken
await global.guest_token.updateGuestToken(1)
await global.legacy_guest_token.updateGuestToken(0)

if (global.guest_token.token.nextActiveTime) {
    await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
    console.error(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
    await Sleep(global.guest_token.token.nextActiveTime - Date.now())
    await global.guest_token.updateGuestToken(1)
    if (!global.guest_token.token.success) {
        process.exit()
    }
}

console.log('archiver: tweets...')
if (cursor !== 'complete') {
    //TODO query string
    const query = [`from:${name}`, 'include:replies', 'include:nativeretweets', 'include:retweets', 'include:quote', 'since_id:0'].join(' ')
    console.log(`archiver: query string -->${query}<--`)
    do {
        await global.guest_token.updateGuestToken(1)
        if (global.guest_token.token.nextActiveTime) {
            await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
            console.error(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
            break//只处理现有的
        }
        let tweets = null
        try {
            tweets = await getTweets({queryString: query, cursor: cursor || '', guest_token: global.guest_token.token, count: false, online: true, graphqlMode: false, searchMode: true})
            global.guest_token.updateRateLimit('Search')
        } catch (e) {
            //try again
            console.log('archiver: first retry...')
            try {
                tweets = await getTweets({queryString: query, cursor: cursor || '', guest_token: global.guest_token.token, count: false, online: true, graphqlMode: false, searchMode: true})
                global.guest_token.updateRateLimit('Search')
            } catch (e) {
                console.log('archiver: retry failed...')
                console.error(e)
                process.exit()
            }
        }
        if (tweets === null) {
            console.error(`archiver: empty response`)
            process.exit()
        }

        const tmpTweetsInfo = TweetsInfo(tweets.data, true)
        if (tmpTweetsInfo.errors.code !== 0) {
            console.log(`archiver: error #${tmpTweetsInfo.errors.code} , ${tmpTweetsInfo.errors.message}`)
            TGPush(`archiver: error #${tmpTweetsInfo.errors.code} , ${tmpTweetsInfo.errors.message}`)
            continue
        }
        let singleAccountTweetsCount = 0
        console.log(`archiver: cursor -->${tmpTweetsInfo.cursor?.bottom || 'end'}<-- (${tmpTweetsInfo.contentLength})`)
        writeFileSync(basePath + `/rawdata/${tmpTweetsInfo.tweetRange.max}_${tmpTweetsInfo.tweetRange.min}.json`, JSON.stringify(tweets.data))

        //get account info
        if (uid === null) {
            try {
                //restful
                //uid = Object.values(tmpTweetsInfo.users).filter(user => user.screen_name.toLocaleLowerCase() === name.toLocaleLowerCase())[0]?.id_str || null
                //graphql
                uid = Object.values(tmpTweetsInfo.users).filter(user => user.legacy.screen_name.toLocaleLowerCase() === name.toLocaleLowerCase())[0]?.rest_id || null

                if (!uid) {
                    console.error(`archiver: no such account!!!`)
                    process.exit()
                }
            } catch (e) {
                console.error(e)
                process.exit()
            }

        }
        for (const content of tmpTweetsInfo.contents) {
            //判断非推文//graphql only
            //writeFileSync('./savetweets/' + path2array('tweet_id', content) + '.json', JSON.stringify(content))
            //判断是否本人发推
            if (String(path2array('tweet_uid', path2array('tweet_content', content))) === String(uid)) {
                const generatedTweetData = Tweet(content, {}, [], {}, true, false, true)
                if (UserData.v2_account_info === null) {
                    UserData.v2_account_info = generatedTweetData.userInfo
                }
                const GeneralTweetData = generatedTweetData.GeneralTweetData
                if (GeneralTweetData.card && !generatedTweetData.cardMessage.supported) {
                    console.log(`archiver: Not supported card ${generatedTweetData.cardMessage.card_name}`)
                    TGPush(generatedTweetData.cardMessage.message)
                }
                //writeFileSync(`../../savetweets/${GeneralTweetData.tweet_id}.json`, JSON.stringify(generatedTweetData))
                if (UserData.v2_twitter_tweets[GeneralTweetData.tweet_id]) {
                    console.log(`archiver: throw #${++singleAccountTweetsCount} -> ${GeneralTweetData.tweet_id} (duplicate)`)
                } else {
                    if (generatedTweetData.media.length) {
                        GeneralTweetData.media_object = generatedTweetData.media
                    }
                    //v2_twitter_entities
                    if (generatedTweetData.tags.length) {
                        GeneralTweetData.entities = generatedTweetData.tags
                    }
                    //v2_twitter_polls
                    if (GeneralTweetData.poll && generatedTweetData.polls.length) {
                        GeneralTweetData.polls = generatedTweetData.polls
                    }
                    //v2_twitter_cards
                    if (GeneralTweetData.card && !GeneralTweetData.poll) {
                        GeneralTweetData.card_object = generatedTweetData.card
                        if (generatedTweetData.cardApp.length) {
                            GeneralTweetData.card_app = generatedTweetData.cardApp
                        }
                    }
                    //v2_twitter_quote
                    if (generatedTweetData.isQuote) {
                        GeneralTweetData.quote_object = generatedTweetData.quote
                    }
                    //interactiveData
                    GeneralTweetData.interactive_data = generatedTweetData.interactiveData
                    //v2_twitter_tweets
                    UserData.v2_twitter_tweets[GeneralTweetData.tweet_id] = GeneralTweetData

                    console.log(`archiver: #${++singleAccountTweetsCount} Success -> ${GeneralTweetData.tweet_id}`)
                }
            } else {
                console.log(`archiver: throw ` + path2array('tweet_id', content) + ' (not account post)')
            }
        }
        //insert
        try {
            tmpTweetsInfo.contents.forEach(tweet => {
                const tmpTweetId = path2array('tweet_id', tweet)
                if (!rawTweetData[tmpTweetId]) {
                    rawTweetData[tmpTweetId] = tweet
                }
            })
            Object.keys(tmpTweetsInfo.users).forEach(uid => {
                if (!rawUserInfoData[uid]) {
                    rawUserInfoData[uid] = tmpTweetsInfo.users[uid]
                }
            })
            writeFileSync(basePath + '/rawdata/tweet.json', JSON.stringify(rawTweetData))
            writeFileSync(basePath + '/rawdata/user.json', JSON.stringify(rawUserInfoData))
            writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))
            cursor = (tmpTweetsInfo.contents.length ? tmpTweetsInfo.cursor?.bottom || '' : '')
            writeFileSync(basePath + '/twitter_archive_cursor', cursor)
        } catch (e) {
            console.error(e)
            process.exit()
        }
    } while (cursor)
    writeFileSync(basePath + '/twitter_archive_cursor', 'complete')
    console.log(`archiver: tweets complete, cost ${new Date() - now} ms`)
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
let pollsList = Object.values(UserData.v2_twitter_tweets).filter(tweet => tweet.polls && !tweet.polls[0].count)

console.log(`archiver: polls... (${pollsList.length})`)

for (; pollsIndex < pollsList.length; pollsIndex++) {
    if (now / 1000 > pollsList[pollsIndex].polls[0].end_datetime && rawTweetData[pollsList[pollsIndex].tweet_id]) {
        const cardInfo = path2array("tweet_card_path", rawTweetData[pollsList[pollsIndex].tweet_id])
        if (cardInfo && String(path2array("tweet_card_name", cardInfo)).startsWith('poll')) {
            const tmpPollKV = Object.fromEntries(Object.keys(cardInfo.binding_values).map(key => [key, cardInfo.binding_values[key]]))
            for(let x = 1; x <= 4; x++) {
                if (!tmpPollKV["choice" + x + "_count"]) {
                  break
                }
                pollsList[pollsIndex].polls[x - 1].count = tmpPollKV["choice" + x + "_count"].string_value
                console.log(`${pollsList[pollsIndex].tweet_id}: #${x} > ${pollsList[pollsIndex].polls[x - 1].count}`)
            }
        } else {
            getPollsFailedList.push(pollsList[pollsIndex].tweet_id)
            writeFileSync(basePath + '/twitter_monitor_polls_failed_list.json', JSON.stringify(getPollsFailedList))
            console.log(`archiver: NO POLLS CONTENT (${pollsList[pollsIndex].tweet_id}) #errorpoll`)
        }
    } else {
        const pollData = await getPollResult({tweet_id: pollsList[pollsIndex].tweet_id})
        if (pollData.code !== 200) {
            getPollsFailedList.push(pollsList[pollsIndex].tweet_id)
            writeFileSync(basePath + '/twitter_monitor_polls_failed_list.json', JSON.stringify(getPollsFailedList))
            console.log(`archiver: ${pollData.message} (${pollsList[pollsIndex].tweet_id}) #errorpoll`)
        } else {
            for (const pollDataIndex in pollData.data) {
                pollsList[pollsIndex].polls[pollDataIndex].count = pollData.data[pollDataIndex]
                console.log(`${pollsList[pollsIndex].tweet_id}: #${Number(pollDataIndex) + 1} > ${pollsList[pollsIndex].polls[pollDataIndex].count}`)
            }
        }
    }
    console.log(`archiver: ${pollsIndex + 1} / ${pollsList.length}`)
    writeFileSync(basePath + '/twitter_monitor_polls_index', String(pollsIndex))
}

pollsList.forEach(pollTweetItem => {
    UserData.v2_twitter_tweets[pollTweetItem.tweet_id] = pollTweetItem
})
writeFileSync(basePath + '/savedata/data.json', JSON.stringify(UserData))
//console.log(getPollsFailedList)

//TODO space
//TODO broadcasts

//save media
//Used token2, solved//TODO find mixed media tweets
let mediaIndex = 0
let getMediaFailedList = []
//if (existsSync(basePath + '/twitter_monitor_media_index')) {
//    mediaIndex = Number(readFileSync(basePath + '/twitter_monitor_media_index').toString())
//}
if (existsSync(basePath + '/twitter_monitor_media_failed_list.json')) {
    getMediaFailedList = JSON.parse(readFileSync(basePath + '/twitter_monitor_media_failed_list.json'))
}
//profile
let avatarLinkInfo = PathInfo(`https://`+UserData.v2_account_info.header)
if (!existsSync(basePath + `/savemedia/avatar_${UserData.v2_account_info.name}.${avatarLinkInfo.extension}`)) {
    try {
        const avatarBuffer = await getImage(`https://`+UserData.v2_account_info.header)
        writeFileSync(basePath + `/savemedia/avatar_${UserData.v2_account_info.name}.${avatarLinkInfo.extension}`, avatarBuffer.data)
        console.log(`archiver: saved avatar (${UserData.v2_account_info.name})`)
    } catch(e) {
        getMediaFailedList.push({
            url: `https://`+UserData.v2_account_info.header,
            basename: `avatar_${UserData.v2_account_info.name}.${avatarLinkInfo.extension}`
        })
        console.log(`archiver: unable to save avatar (${UserData.v2_account_info.name})`)
    }
}

if (!existsSync(basePath + `/savemedia/banner_${UserData.v2_account_info.name}.jpg`)) {
    try {
        const bannerBuffer = await getImage(`https://pbs.twimg.com/profile_banners/${UserData.v2_account_info.uid_str}/${UserData.v2_account_info.banner}`)
        writeFileSync(basePath + `/savemedia/banner_${UserData.v2_account_info.name}.jpg`, bannerBuffer.data)
        console.log(`archiver: saved banner (${UserData.v2_account_info.name})`)
    } catch (e) {
        getMediaFailedList.push({
            url: `https://pbs.twimg.com/profile_banners/${UserData.v2_account_info.uid_str}/${UserData.v2_account_info.banner}`,
            basename: `banner_${UserData.v2_account_info.name}.jpg`
        })
        console.log(`archiver: unable to save banner (${UserData.v2_account_info.name})`)
    }
}


writeFileSync(basePath + '/twitter_monitor_media_failed_list.json', JSON.stringify(getMediaFailedList))


let mediaList = Object.values(UserData.v2_twitter_tweets).filter(tweet => tweet.media_object).map(tweet => tweet.media_object).flat().reverse(0).map(media => {
    if (!['cover', 'card', 'cards'].includes(media.source) && media.extension !== 'mp4') {
        media.url = media.url + ':orig'
    }
    return media
})
//save media list
let statusCount = {success: 0, error: 0}
writeFileSync(basePath + '/savedata/media.json', JSON.stringify(mediaList))
for (; mediaIndex < mediaList.length; ) {
    let tmpMediaList = mediaList.slice(mediaIndex, mediaIndex + 99)
    const tmpLength = tmpMediaList.length
    //precheck
    tmpMediaList = tmpMediaList.filter(media => !existsSync(basePath + `/savemedia/${media.filename}.${media.extension}`))
    console.log(`archiver: ${tmpLength-tmpMediaList.length} media skipped`)
    statusCount.success += tmpLength-tmpMediaList.length
    await Promise.allSettled(tmpMediaList.map(mediaItem => new Promise((resolve, reject) => {
        getImage(mediaItem.url).then(response => {
            resolve({imageBuffer: response.data, meta: mediaItem})
        }).catch(e => {
            reject({imageBuffer: null, meta: mediaItem})
        })
    }))).then(response => {
        response.forEach(imageReaponse => {
            if (imageReaponse.status === 'fulfilled' && imageReaponse.value.imageBuffer) {
                writeFileSync(basePath + `/savemedia/${imageReaponse.value.meta.filename}.${imageReaponse.value.meta.extension}`, imageReaponse.value.imageBuffer)
                statusCount.success++
                console.log(`${imageReaponse.value.meta.url}\tsuccess: ${statusCount.success}, error: ${statusCount.error}, ${statusCount.success + statusCount.error} / ${mediaList.length}`)
            } else {
                getMediaFailedList.push({
                    url: imageReaponse.reason.meta.url,
                    basename: `${imageReaponse.value.meta.filename}.${imageReaponse.value.meta.extension}`
                })
                writeFileSync(basePath + '/twitter_monitor_media_failed_list.json', JSON.stringify(getMediaFailedList))
                statusCount.error++
                console.log(`archiver: image ${imageReaponse.reason.meta.url}\tsuccess: ${statusCount.success}, error: ${statusCount.error}, ${statusCount.success + statusCount.error} / ${mediaList.length}`)
            }
            
        })
    }).catch(e => {
        console.log(e)
    })
    mediaIndex+=100
    writeFileSync(basePath + '/twitter_monitor_media_index', String(mediaIndex))
}

writeFileSync(basePath + '/range.json', JSON.stringify({start: now, end: Date.now()}))
console.log(`archiver: online tasks complete`)

//TODO broadcasts via ffmpeg



//TODO split and generate offline data
//media / account info / analytics

//TODO follower and following with cookie
//cookie.auth_token && cookie.ct0
if (true) {
    console.log(`archiver: Following and Followers...`)
    const screen_name = UserData.v2_account_info?.name
    let cookieRequestsRateLimit = 0

    if (activeFlags.following) {
        let rawFollowingData = {}
        let FollowingData = {}
        let following_cursor = ''
        let following_count = 0

        if (existsSync(basePath + '/rawdata/following.json')) {
            rawFollowingData = JSON.parse(readFileSync(basePath + '/rawdata/following.json'))
        }
        if (existsSync(basePath + '/savedata/following.json')) {
            FollowingData = JSON.parse(readFileSync(basePath + '/savedata/following.json'))
        }
        if (existsSync(basePath + '/twitter_following_cursor')) {
            following_cursor = readFileSync(basePath + '/twitter_following_cursor').toString().trim()
        }
        if (following_cursor !== 'complete') {
            do {
                if (cookieRequestsRateLimit > 14) {
                    //guest token hack
                    global.legacy_guest_token.updateRateLimit('UserByRestId', 490)
                    await global.legacy_guest_token.updateGuestToken(0)
                    cookieRequestsRateLimit = 0
                }
                const followingResponse = await getFollowingOrFollowers({id: screen_name, type: 'Following', count: 200, cursor: following_cursor, guest_token: global.legacy_guest_token.token})
                //next_cursor_str
                //previous_cursor_str
                cookieRequestsRateLimit++

                for (const tmpUserInfo of followingResponse.data.users) {
                    following_count++
                    rawFollowingData[tmpUserInfo["id_str"]] = tmpUserInfo
                    FollowingData[tmpUserInfo["id_str"]] = GenerateAccountInfo(tmpUserInfo).GeneralAccountData
                    console.log(`archiver: Following\t${tmpUserInfo["id_str"]}\t[${FollowingData[tmpUserInfo["id_str"]]["display_name"]}](@${FollowingData[tmpUserInfo["id_str"]]["name"]})\t${following_count}`)
                }

                //save raw data
                writeFileSync(basePath + '/rawdata/following.json', JSON.stringify(rawFollowingData))
                writeFileSync(basePath + '/savedata/following.json', JSON.stringify(FollowingData))
                following_cursor = (followingResponse.data.users.length ? followingResponse.data.next_cursor_str || '' : '')
                if (following_cursor === '0') {
                    following_cursor = ''
                }
                writeFileSync(basePath + '/twitter_following_cursor', following_cursor)
            } while (following_cursor)
            writeFileSync(basePath + '/twitter_following_cursor', 'complete')
            console.log(`archiver: Following complete, cost ${new Date() - now} ms`)
        }
    }

    if (activeFlags.followers) {
        let rawFollowersData = {}
        let FollowersData = {}
        let follower_cursor = ''
        let followers_count = 0

        if (existsSync(basePath + '/rawdata/followers.json')) {
            rawFollowersData = JSON.parse(readFileSync(basePath + '/rawdata/followers.json'))
        }
        if (existsSync(basePath + '/savedata/followers.json')) {
            FollowersData = JSON.parse(readFileSync(basePath + '/savedata/followers.json'))
        }
        if (existsSync(basePath + '/twitter_followers_cursor')) {
            follower_cursor = readFileSync(basePath + '/twitter_followers_cursor').toString().trim()
        }

        if (follower_cursor !== 'complete') {
            do {
                if (cookieRequestsRateLimit > 14) {
                    //guest token hack
                    global.legacy_guest_token.updateRateLimit('UserByRestId', 490)
                    await global.legacy_guest_token.updateGuestToken(0)
                    cookieRequestsRateLimit = 0
                }
                const followersResponse = await getFollowingOrFollowers({id: screen_name, type: 'Followers', count: 200, cursor: follower_cursor, guest_token: global.legacy_guest_token.token})
                cookieRequestsRateLimit++

                for (const tmpUserInfo of followersResponse.data.users) {
                    followers_count++
                    rawFollowersData[tmpUserInfo["id_str"]] = tmpUserInfo
                    FollowersData[tmpUserInfo["id_str"]] = GenerateAccountInfo(tmpUserInfo).GeneralAccountData
                    console.log(`archiver: Follower\t${tmpUserInfo["id_str"]}\t[${FollowersData[tmpUserInfo["id_str"]]["display_name"]}](@${FollowersData[tmpUserInfo["id_str"]]["name"]})\t${followers_count}`)
                }
        
                //save raw data
                writeFileSync(basePath + '/rawdata/followers.json', JSON.stringify(rawFollowersData))
                writeFileSync(basePath + '/savedata/followers.json', JSON.stringify(FollowersData))
                follower_cursor = (followersResponse.data.users.length ? followersResponse.data.next_cursor_str || '' : '')
                if (follower_cursor === '0') {
                    follower_cursor = ''
                }
                writeFileSync(basePath + '/twitter_followers_cursor', follower_cursor)
            } while (follower_cursor)
            writeFileSync(basePath + '/twitter_followers_cursor', 'complete')
            console.log(`archiver: Followers complete, cost ${new Date() - now} ms`)
        }
    }
} else {
    console.log(`archiver: To archive following and followers, you have to provide 'auth_token' and 'ct0' in variable 'cookie'`)
}




console.log(`archiver: Time cost ${new Date() - now} ms`)//TODO remove

process.exit()

