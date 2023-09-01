import { writeFileSync } from 'fs'
import { getBearerToken, postOpenAccountInit } from '../../libs/core/Core.android.mjs'
import {
    Authorization,
    getAudioSpace,
    getBroadcast,
    getCommunityInfo,
    getCommunitySearch,
    getCommunityTweetsTimeline,
    getConversation,
    getEditHistory,
    getFollowingOrFollowers,
    getLikes,
    getListInfo,
    getListMember,
    getListTimeLine,
    getLiveVideoStream,
    getTranslate,
    getTrends,
    getTweets,
    getTypeahead,
    getUserInfo
} from '../../libs/core/Core.fetch.mjs'
import { Log, GuestToken } from '../../libs/core/Core.function.mjs'

const v = '✅'
const x = '❌'
globalThis.mute = true

const savePath = './data/rate_limit_status.json'
const markdownPath = './data/readme.md'

const oauth_token = process.env.TWITTER_GUEST_OAUTH_TOKEN || ''
const oauth_token_secret = process.env.TWITTER_GUEST_OAUTH_TOKEN_SECRET || ''

const androidGuestAccount = {
    authorization: getBearerToken(),
    oauth_token,
    oauth_token_secret
}

const getGuestTokenHandle = async (token, android = false, openAccount = null) => {
    if (openAccount) {
        let guest_token = new GuestToken('android')
        await guest_token.openAccountInit(openAccount)
        return guest_token
    } else {
        let guest_token = new GuestToken(android ? 'android' : 'browser')
        await guest_token.updateGuestToken(token)
        return guest_token
    }
}

const getStatusResponse = async (_function, guest_token, label = '_') => {
    let tmpRes = null
    let code = '200'
    let message = '_'
    const requestDate = Date.now()
    try {
        tmpRes = await _function
        code = tmpRes.status
        message = tmpRes.statusText
        //Log(false, 'log', JSON.stringify(tmpRes.data, null, 4))
        //process.exit()
        //Log(false, 'log', tmpRes)
    } catch (e) {
        Log(false, 'error', e, e?.e?.response)
        code = e.code > 0 ? e.code : null || e.e?.response?.status || '404'
        message = e.code > 0 ? e.message : null || e.e?.response?.statusText || 'Unknown error'
        tmpRes = e.e?.response
    }

    globalList[guest_token.token.authorization].list[label] = {
        code,
        message,
        rate_limit: Number(tmpRes.headers['x-rate-limit-limit']) || '_',
        rate_limit_reset: tmpRes.headers['x-rate-limit-reset'] ? Number(tmpRes.headers['x-rate-limit-reset']) - Math.ceil(requestDate / 1000) : '_',
        status: code === 200 && tmpRes.data ? v : x,
        url: tmpRes.config.url,
        method: tmpRes?.config?.method?.toUpperCase() || 'GET',
        data: tmpRes?.config?.data ? tmpRes.config.data : undefined,
        label
    }
    writeFileSync(savePath, JSON.stringify(globalList, null, 4))
    Log(false, 'log', `[${new Date()}] rate_limit: ${label}`)
    return globalList[guest_token.token.authorization][label]
}

const authorizationList = [
    [await getGuestTokenHandle(Authorization[0]), 'old web'],
    [await getGuestTokenHandle(Authorization[1]), 'new web'],
    //[await getGuestTokenHandle(Authorization[2]), '? web'],
    [await getGuestTokenHandle(Authorization[3]), 'tweetdeck legacy'],
    [await getGuestTokenHandle(Authorization[4]), 'tweetdeck preview'],
    [await getGuestTokenHandle(getBearerToken(), true), 'android']
]

if (androidGuestAccount.oauth_token && androidGuestAccount.oauth_token_secret) {
    authorizationList.push([await getGuestTokenHandle(null, true, androidGuestAccount), 'guest account'])
}

let globalList = {}

for (const index in authorizationList) {
    const guest_token = authorizationList[index][0]
    globalList[guest_token.token.authorization] = {}
    globalList[guest_token.token.authorization].authorization = guest_token.token.authorization
    globalList[guest_token.token.authorization].list = {}
    globalList[guest_token.token.authorization].label = authorizationList[index][1]

    // Userinfo
    await getStatusResponse(getUserInfo({ user: ['x', -3], guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: true }), guest_token, 'graphql:userinfo_screen_name')
    await getStatusResponse(getUserInfo({ user: ['x', -3], guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false }), guest_token, 'restful:userinfo_screen_name')
    await getStatusResponse(getUserInfo({ user: ['783214', -2], guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: true }), guest_token, 'graphql:userinfo_uid')
    await getStatusResponse(getUserInfo({ user: ['783214', -2], guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false }), guest_token, 'restful:userinfo_uid')

    // Timeline
    await getStatusResponse(getTweets({ queryString: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: true, graphqlMode: true, withReply: false }), guest_token, 'graphql:tweets_web')
    await getStatusResponse(
        getTweets({ queryString: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: true, graphqlMode: true, withReply: true }),
        guest_token,
        'graphql:tweets_with_replies_web'
    )
    await getStatusResponse(getTweets({ queryString: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: false, graphqlMode: true, withReply: false }), guest_token, 'graphql:tweets_v2')
    await getStatusResponse(
        getTweets({ queryString: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: false, graphqlMode: true, withReply: true }),
        guest_token,
        'graphql:tweets_with_replies_v2'
    )
    await getStatusResponse(getTweets({ queryString: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: true, graphqlMode: false, withReply: false }), guest_token, 'restful:tweets')

    // Conversation
    await getStatusResponse(getConversation({ tweet_id: '1623411536243965954', guest_token: guest_token.token, authorization: guest_token.token.authorization, web: true, graphqlMode: true }), guest_token, 'graphql:conversation')
    await getStatusResponse(getConversation({ tweet_id: '1623411536243965954', guest_token: guest_token.token, authorization: guest_token.token.authorization, web: false, graphqlMode: true }), guest_token, 'graphql:conversation_v2')
    await getStatusResponse(getConversation({ tweet_id: '1623411536243965954', guest_token: guest_token.token, authorization: guest_token.token.authorization, web: true, graphqlMode: false }), guest_token, 'restful:conversation')

    // Search
    await getStatusResponse(getTweets({ queryString: '#twitter', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: true, graphqlMode: true, searchMode: true }), guest_token, 'graphql:search')
    await getStatusResponse(getTweets({ queryString: '#twitter', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: false, graphqlMode: true, searchMode: true }), guest_token, 'graphql:search_client')
    await getStatusResponse(getTweets({ queryString: '#twitter', guest_token: guest_token.token, authorization: guest_token.token.authorization, online: true, web: true, graphqlMode: false, searchMode: true }), guest_token, 'restful:search')

    // EditHistory
    await getStatusResponse(getEditHistory({ tweet_id: '1623411536243965954', guest_token: guest_token.token, graphqlMode: true }), guest_token, 'graphql:edit_history')

    // AudioSpace
    await getStatusResponse(getAudioSpace({ id: '1djGXldPqNyGZ', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'graphql:audiospace')

    // Broadcast
    await getStatusResponse(getBroadcast({ id: '1jMKgLaeYoAGL', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'restful:broadcast')

    // LiveStream
    await getStatusResponse(getLiveVideoStream({ media_key: '28_1645992664519655424', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'restful:live_stream')

    // Typeahead
    await getStatusResponse(getTypeahead({ text: 'Twitter', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'restful:typeahead')

    // Trends
    await getStatusResponse(getTrends({ initial_tab_id: 'trends', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'restful:trends')

    // Translate
    await getStatusResponse(getTranslate({ id: '1683696495198089217', type: 'profile', target: 'zh-tw', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: true }), guest_token, 'graphql:translate_bio')
    await getStatusResponse(getTranslate({ id: '1623411536243965954', type: 'tweets', target: 'zh-tw', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: true }), guest_token, 'graphql:translate_tweet')
    await getStatusResponse(getTranslate({ id: '1683696495198089217', type: 'profile', target: 'zh-tw', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false }), guest_token, 'restful:translate_bio')
    await getStatusResponse(getTranslate({ id: '1623411536243965954', type: 'tweets', target: 'zh-tw', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false }), guest_token, 'restful:translate_tweet')

    // ListInfo
    await getStatusResponse(getListInfo({ id: '53645372', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'graphql:list_info')

    // ListMember
    await getStatusResponse(getListMember({ id: '53645372', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'graphql:list_member')

    // ListTimeline
    await getStatusResponse(getListTimeLine({ id: '53645372', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: true }), guest_token, 'graphql:list_timeline')
    await getStatusResponse(getListTimeLine({ id: '53645372', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false }), guest_token, 'restful:list_timeline')

    // CommunityInfo
    await getStatusResponse(getCommunityInfo({ id: '1539049437791666176', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'graphql:community_info')

    // CommunitySearch
    await getStatusResponse(getCommunitySearch({ queryString: 'Cat Twitter', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'graphql:community_search')

    // CommunityTimeline
    await getStatusResponse(getCommunityTweetsTimeline({ id: '1539049437791666176', guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'graphql:community_timeline')

    // Following/Followers
    await getStatusResponse(getFollowingOrFollowers({ id: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false, type: 'Following' }), guest_token, 'restful:following')
    await getStatusResponse(getFollowingOrFollowers({ id: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false, type: 'Followers' }), guest_token, 'restful:followers')

    // Likes
    await getStatusResponse(getLikes({ id: '783214', guest_token: guest_token.token, authorization: guest_token.token.authorization, graphqlMode: false }), guest_token, 'restful:likes')

    // Onbroading
    await getStatusResponse(postOpenAccountInit({ guest_token: guest_token.token, authorization: guest_token.token.authorization }), guest_token, 'restful:onbroading')

    globalList[guest_token.token.authorization].list = Object.values(globalList[guest_token.token.authorization].list)
}
globalList = Object.values(globalList)
//Log(false, 'log', globalList)
writeFileSync(savePath, JSON.stringify(globalList, null, 4))

let globalMarkdown = '# Rate limit checker\n\n---\n'

globalMarkdown += '\n- The number is the number of rate limit, and `_` means response headers have no field `x-rate-limit-limit`\n- ❌ means the endpoint is unavailable\n'

let labels = globalList.map((x) => x.label)
const title = '|' + new Array(30).fill(' ').join('') + ' | ' + labels.map((x) => x.padStart(18, ' ')).join(' | ') + '|'
globalMarkdown += '\n## Graphql\n\n' + title + '\n| :-- |' + new Array(labels.length).fill(' --: |').join('') + '\n'
const graphqlList = globalList.map((x) => Object.values(x.list).filter((y) => y.label.startsWith('graphql')))

const restfulList = globalList.map((x) => Object.values(x.list).filter((y) => y.label.startsWith('restful')))

for (const index in graphqlList[0]) {
    const tmpText = `| ${graphqlList[0][index].label.padEnd(31, ' ')} | ${graphqlList.map((xxx) => `${xxx[index].rate_limit} ${xxx[index].status}`.padStart(16, ' ')).join(' | ')} |`
    globalMarkdown += tmpText + '\n'
    //Log(false, 'log', tmpText)
}

globalMarkdown += '\n## Restful\n\n' + title + '\n| :-- |' + new Array(labels.length).fill(' --: |').join('') + '\n'

for (const index in restfulList[0]) {
    const tmpText = `| ${restfulList[0][index].label.padEnd(31, ' ')} | ${restfulList.map((xxx) => `${xxx[index].rate_limit} ${xxx[index].status}`.padStart(16, ' ')).join(' | ')} |`
    globalMarkdown += tmpText + '\n'
    //Log(false, 'log', tmpText)
}
//onsole.log(globalMarkdown)
globalMarkdown += '\n><https://github.com/BANKA2017/twitter-monitor/tree/node/apps/rate_limit_checker>\n'

writeFileSync(markdownPath, globalMarkdown)

process.exit()
