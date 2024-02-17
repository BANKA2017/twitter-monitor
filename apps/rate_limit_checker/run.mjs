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
    getUserInfo,
    getViewerUser
} from '../../libs/core/Core.fetch.mjs'
import { Log, GuestToken } from '../../libs/core/Core.function.mjs'

const v = '✅'
const x = '❌'
globalThis.mute = true

const savePath = './data/rate_limit_status.json'
const markdownPath = './data/readme.md'

// guest account
const guest_oauth_token = process.env.TWITTER_GUEST_OAUTH_TOKEN || ''
const guest_oauth_token_secret = process.env.TWITTER_GUEST_OAUTH_TOKEN_SECRET || ''
const androidGuestAccount = {
    authorization: getBearerToken(),
    oauth_token: guest_oauth_token,
    oauth_token_secret: guest_oauth_token_secret
}

// real account
const real_oauth_token = process.env.TWITTER_REAL_OAUTH_TOKEN || ''
const real_oauth_token_secret = process.env.TWITTER_REAL_OAUTH_TOKEN_SECRET || ''
const androidRealAccount = {
    authorization: getBearerToken(),
    oauth_token: real_oauth_token,
    oauth_token_secret: real_oauth_token_secret
}

// cookie
const cookie_auth_token = process.env.TWITTER_COOKIE_AUTH_TOKEN || ''
const cookie_ct0 = process.env.TWITTER_COOKIE_CT0 || ''
const cookie = {
    auth_token: cookie_auth_token,
    ct0: cookie_ct0
}

const getAuthorization = async (bearerToken, account = {}) => {
    if (account.oauth_token && account.oauth_token_secret) {
        let guest_token = new GuestToken('android')
        await guest_token.openAccountInit(account)
        return { guest_token: guest_token.token, authorization: bearerToken, cookie: {} }
    } else if (account.auth_token && account.ct0) {
        return { guest_token: {}, authorization: bearerToken, cookie: account }
    } else {
        let guest_token = new GuestToken()
        await guest_token.updateGuestToken(bearerToken)
        return { guest_token: guest_token.token, authorization: bearerToken, cookie: {} }
    }
}

const getStatusResponse = async (_function, authorizationType, label = '_') => {
    let tmpRes = null
    let code = '200'
    let message = '_'
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

    let reset = tmpRes.headers['x-rate-limit-reset'] ? Number(tmpRes.headers['x-rate-limit-reset']) - Number(new Date(tmpRes.headers['date'])) / 1000 : '_'
    // fix jitter issue
    if (reset !== '_' && reset > 880 && reset < 920) {
        reset = 900
    }

    globalList[authorizationType].list[label] = {
        code,
        message,
        rate_limit: Number(tmpRes.headers['x-rate-limit-limit']) || '_',
        rate_limit_reset: reset,
        status: code === 200 && tmpRes.data ? v : x,
        url: tmpRes.config.url,
        method: tmpRes?.config?.method?.toUpperCase() || 'GET',
        data: tmpRes?.config?.data ? tmpRes.config.data : undefined,
        label
    }
    writeFileSync(savePath, JSON.stringify(globalList, null, 4))
    Log(false, 'log', `[${new Date()}] rate_limit: ${label}`)
    return globalList[authorizationType][label]
}

const authorizationList = [
    [await getAuthorization(Authorization[0]), 'old web'],
    [await getAuthorization(Authorization[1]), 'new web'],
    //[await getAuthorization(Authorization[2]), '? web'],
    //[await getAuthorization(Authorization[3]), 'tweetdeck legacy'],
    [await getAuthorization(Authorization[4]), 'tweetdeck preview'],
    [await getAuthorization(getBearerToken()), 'android']
]

// more...
// guest account
if (androidGuestAccount.oauth_token && androidGuestAccount.oauth_token_secret) {
    const tmpAuthorization = await getAuthorization(getBearerToken(), androidGuestAccount)
    if ((await getViewerUser({ guest_token: tmpAuthorization.guest_token }))?.status === 200) {
        authorizationList.push([tmpAuthorization, 'guest account'])
    }
}
// real account
if (androidRealAccount.oauth_token && androidRealAccount.oauth_token_secret) {
    const tmpAuthorization = await getAuthorization(getBearerToken(), androidRealAccount)
    if ((await getViewerUser({ guest_token: tmpAuthorization.guest_token }))?.status === 200) {
        authorizationList.push([tmpAuthorization, 'real account'])
    }
}
// cookie
if (cookie.auth_token && cookie.ct0) {
    const tmpAuthorization = await getAuthorization(Authorization[1], cookie)
    if ((await getViewerUser({ cookie: tmpAuthorization.cookie }))?.status === 200) {
        authorizationList.push([tmpAuthorization, 'cookie'])
    }
}

let globalList = {}

for (const index in authorizationList) {
    const authorization = authorizationList[index][0]
    const authorizationType = authorizationList[index][1]
    globalList[authorizationType] = {}
    globalList[authorizationType].label = authorizationList[index][1]
    globalList[authorizationType].authorization = authorization.authorization
    globalList[authorizationType].list = {}

    // Userinfo
    await getStatusResponse(getUserInfo({ user: ['x', -3], ...authorization, graphqlMode: true }), authorizationType, 'graphql:userinfo_screen_name')
    await getStatusResponse(getUserInfo({ user: ['x', -3], ...authorization, graphqlMode: false }), authorizationType, 'restful:userinfo_screen_name')
    await getStatusResponse(getUserInfo({ user: ['783214', -2], ...authorization, graphqlMode: true }), authorizationType, 'graphql:userinfo_uid')
    await getStatusResponse(getUserInfo({ user: ['783214', -2], ...authorization, graphqlMode: false }), authorizationType, 'restful:userinfo_uid')

    // Timeline
    await getStatusResponse(getTweets({ queryString: '783214', ...authorization, online: true, web: true, graphqlMode: true, withReply: false }), authorizationType, 'graphql:tweets_web')
    await getStatusResponse(getTweets({ queryString: '783214', ...authorization, online: true, web: true, graphqlMode: true, withReply: true }), authorizationType, 'graphql:tweets_with_replies_web')
    await getStatusResponse(getTweets({ queryString: '783214', ...authorization, online: true, web: false, graphqlMode: true, withReply: false }), authorizationType, 'graphql:tweets_v2')
    await getStatusResponse(getTweets({ queryString: '783214', ...authorization, online: true, web: false, graphqlMode: true, withReply: true }), authorizationType, 'graphql:tweets_with_replies_v2')
    await getStatusResponse(getTweets({ queryString: '783214', ...authorization, online: true, web: true, graphqlMode: false, withReply: false }), authorizationType, 'restful:tweets')

    // Conversation
    await getStatusResponse(getConversation({ tweet_id: '1623411536243965954', ...authorization, web: true, graphqlMode: true }), authorizationType, 'graphql:conversation')
    await getStatusResponse(getConversation({ tweet_id: '1623411536243965954', ...authorization, web: false, graphqlMode: true }), authorizationType, 'graphql:conversation_v2')
    await getStatusResponse(getConversation({ tweet_id: '1623411536243965954', ...authorization, web: 2, graphqlMode: true }), authorizationType, 'graphql:tweet_result_by_id')
    await getStatusResponse(getConversation({ tweet_id: '1623411536243965954', ...authorization, web: true, graphqlMode: false }), authorizationType, 'restful:conversation')

    // Search
    await getStatusResponse(getTweets({ queryString: '#twitter', ...authorization, online: true, web: true, graphqlMode: true, searchMode: true }), authorizationType, 'graphql:search')
    await getStatusResponse(getTweets({ queryString: '#twitter', ...authorization, online: true, web: false, graphqlMode: true, searchMode: true }), authorizationType, 'graphql:search_client')
    await getStatusResponse(getTweets({ queryString: '#twitter', ...authorization, online: true, web: true, graphqlMode: false, searchMode: true }), authorizationType, 'restful:search')

    // EditHistory
    await getStatusResponse(getEditHistory({ tweet_id: '1623411536243965954', guest_token: authorization.token, graphqlMode: true }), authorizationType, 'graphql:edit_history')

    // AudioSpace
    await getStatusResponse(getAudioSpace({ id: '1djGXldPqNyGZ', ...authorization }), authorizationType, 'graphql:audiospace')

    // Broadcast
    await getStatusResponse(getBroadcast({ id: '1jMKgLaeYoAGL', ...authorization }), authorizationType, 'restful:broadcast')

    // LiveStream
    await getStatusResponse(getLiveVideoStream({ media_key: '28_1645992664519655424', ...authorization }), authorizationType, 'restful:live_stream')

    // Typeahead
    await getStatusResponse(getTypeahead({ text: 'Twitter', ...authorization }), authorizationType, 'restful:typeahead')

    // Trends
    await getStatusResponse(getTrends({ initial_tab_id: 'trends', ...authorization }), authorizationType, 'restful:trends')

    // Translate
    await getStatusResponse(getTranslate({ id: '1683696495198089217', type: 'profile', target: 'zh-tw', ...authorization, graphqlMode: true }), authorizationType, 'graphql:translate_bio')
    await getStatusResponse(getTranslate({ id: '1623411536243965954', type: 'tweets', target: 'zh-tw', ...authorization, graphqlMode: true }), authorizationType, 'graphql:translate_tweet')
    await getStatusResponse(getTranslate({ id: '1683696495198089217', type: 'profile', target: 'zh-tw', ...authorization, graphqlMode: false }), authorizationType, 'restful:translate_bio')
    await getStatusResponse(getTranslate({ id: '1623411536243965954', type: 'tweets', target: 'zh-tw', ...authorization, graphqlMode: false }), authorizationType, 'restful:translate_tweet')

    // ListInfo
    await getStatusResponse(getListInfo({ id: '53645372', ...authorization }), authorizationType, 'graphql:list_info')

    // ListMember
    await getStatusResponse(getListMember({ id: '53645372', ...authorization }), authorizationType, 'graphql:list_member')

    // ListTimeline
    await getStatusResponse(getListTimeLine({ id: '53645372', ...authorization, graphqlMode: true }), authorizationType, 'graphql:list_timeline')
    await getStatusResponse(getListTimeLine({ id: '53645372', ...authorization, graphqlMode: false }), authorizationType, 'restful:list_timeline')

    // CommunityInfo
    await getStatusResponse(getCommunityInfo({ id: '1539049437791666176', ...authorization }), authorizationType, 'graphql:community_info')

    // CommunitySearch
    await getStatusResponse(getCommunitySearch({ queryString: 'Cat Twitter', ...authorization }), authorizationType, 'graphql:community_search')

    // CommunityTimeline
    await getStatusResponse(getCommunityTweetsTimeline({ id: '1539049437791666176', ...authorization }), authorizationType, 'graphql:community_timeline')

    // Following/Followers
    await getStatusResponse(getFollowingOrFollowers({ id: 'xdevelopers', ...authorization, graphqlMode: false, type: 'Following' }), authorizationType, 'restful:following')
    await getStatusResponse(getFollowingOrFollowers({ id: 'xdevelopers', ...authorization, graphqlMode: false, type: 'Followers' }), authorizationType, 'restful:followers')

    // Likes
    await getStatusResponse(getLikes({ id: '783214', ...authorization, graphqlMode: false }), authorizationType, 'restful:likes')

    // Onbroading
    await getStatusResponse(postOpenAccountInit({ ...authorization }), authorizationType, 'restful:onbroading')

    globalList[authorizationType].list = Object.values(globalList[authorizationType].list)
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
globalMarkdown += '\n><https://github.com/BANKA2017/twitter-monitor/tree/node/apps/rate_limit_checker>\n\n'
globalMarkdown += '- Now everyone can embed broadcast players directly, so the rate limit of the broadcast endpoint can be regarded as none [[original tweet](https://twitter.com/Live/status/1733197678706852095)]\n'
globalMarkdown += '- All guest accounts were expired, we have to remove them\n'
globalMarkdown += '- The *real account* registered on 2023-06\n'

writeFileSync(markdownPath, globalMarkdown)

process.exit()
