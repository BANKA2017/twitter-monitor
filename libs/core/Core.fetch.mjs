import path2array from './Core.apiPath.mjs'

import {
    _AudioSpaceById,
    _Bookmarks,
    _CommunitiesFetchOneQuery,
    _CommunitiesSearchQuery,
    _CommunityTweetsTimeline,
    _ConversationControlChange,
    _ConversationControlDelete,
    _CreateBookmark,
    _CreateRetweet,
    _CreateTweet,
    _DeleteBookmark,
    _DeleteRetweet,
    _DeleteTweet,
    _FavoriteTweet,
    _Followers,
    _Following,
    _HomeLatestTimeline,
    _HomeTimeline,
    _Likes,
    _ListByRestId,
    _ListBySlug,
    _ListLatestTweetsTimeline,
    _ListMembers,
    _SearchTimeline as _SearchTimelineWeb,
    _TweetActivityQuery,
    _TweetDetail,
    _TweetEditHistory,
    _TwitterArticleByRestId,
    _UnfavoriteTweet,
    _UserByRestId,
    _UserByScreenName,
    _UserMedia,
    _UserTweets,
    _UserTweetsAndReplies,
    _UsersVerifiedAvatars,
    _Viewer
} from '../../libs/assets/graphql/graphqlQueryIdList.js'
import axiosFetch from 'axios-helper'
import GetMine from 'get-mime'
import { MockDocument } from '../share/MockFuntions.mjs'
import { parse } from 'acorn'
import { getOauthAuthorization } from './Core.android.mjs'
import { _ConversationTimelineV2, _SearchTimeline, _TranslateProfileQuery, _TranslateTweetQuery, _UserWithProfileTweetsAndRepliesQueryV2, _UserWithProfileTweetsQueryV2 } from '../assets/graphql/androidQueryIdList.js'

const generateCsrfToken = async () => {
    // @ts-ignore
    if (typeof process !== 'undefined' && !process?.browser) {
        //nodejs
        const { webcrypto } = await import('crypto')
        return webcrypto.randomUUID().replaceAll('-', '')
    } else if (typeof window !== 'undefined') {
        //browser // workers // deno
        return crypto.randomUUID().replaceAll('-', '')
    } else {
        return 0
    }
}

const TW_AUTHORIZATION = 'Bearer AAAAAAAAAAAAAAAAAAAAAPYXBAAAAAAACLXUNDekMxqa8h%2F40K4moUkGsoc%3DTYfbDKbT3jJPCEVnMYqilB28NHfOPqkca3qaAxGfsyKCs0wRbw' //old token

const TW_AUTHORIZATION2 = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA' //new token

const TW_AUTHORIZATION3 = 'Bearer AAAAAAAAAAAAAAAAAAAAAIK1zgAAAAAA2tUWuhGZ2JceoId5GwYWU5GspY4%3DUq7gzFoCZs1QfwGoVdvSac3IniczZEYXIcDyumCauIXpcAPorE' //another token

//for tweetdeck, but useless until login
// const TWEETDECK_AUTHORIZATION = 'Bearer AAAAAAAAAAAAAAAAAAAAAF7aAAAAAAAASCiRjWvh7R5wxaKkFp7MM%2BhYBqM%3DbQ0JPmjU9F6ZoMhDfI4uTNAaQuTDm2uO9x3WFVr2xBZ2nhjdP0' //tweetdeck
// const TWEETDECK_AUTHORIZATION2 = 'Bearer AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF' //new tweetdeck

const TW_WEBAPI_PREFIX = 'https://api.twitter.com'
const TW_ANDROID_PREFIX = 'https://global.albtls.t.co'
const TW_ANDROID_SEARCH_PREFIX = 'https://na.albtls.t.co'

const Authorization = [TW_AUTHORIZATION, TW_AUTHORIZATION2, TW_AUTHORIZATION3]
const ct0 = await generateCsrfToken()

const axios = axiosFetch()

const coreFetch = async (url = '', guest_token = {}, cookie = {}, authorization = 0, headers = {}, body = undefined) => {
    /* 
  To use some online service, you have to provide some cookie and headers
  cookie: auth_token, ct0 # ct0 is not always need
  headers: 
   - content-type: application/json
  */
    if (!url) {
        throw 'tmv3: Invalid url'
    }
    let loginMode = !!(cookie?.auth_token && cookie?.ct0) || (guest_token?.open_account?.oauth_token && guest_token?.open_account?.oauth_token_secret) || !guest_token
    //TODO fix rate limit
    if (!loginMode && !guest_token.success) {
        guest_token = await getToken(authorization)
    }
    const objectBody = typeof body === 'object' && body !== null && (!headers['content-type'] || headers['content-type'] === 'application/json')
    if (objectBody) {
        body = JSON.stringify(body)
    }
    //cookie
    let requestCookie = { ct0 }
    //guest token
    if (!loginMode) {
        requestCookie.gt = guest_token.token
        requestCookie = { ...requestCookie, ...Object.fromEntries(guest_token.cookies.map((tmpCookie) => tmpCookie.split('='))) }
    }

    //input cookie
    requestCookie = { ...requestCookie, ...cookie }

    // authorization

    if (guest_token?.open_account?.oauth_token && guest_token?.open_account?.oauth_token_secret) {
        //url = url.replace(TW_WEBAPI_PREFIX, TW_ANDROID_PREFIX)
        const oauthSign = getOauthAuthorization(guest_token.open_account.oauth_token, guest_token.open_account.oauth_token_secret, body !== undefined ? 'POST' : 'GET', url, body)
        authorization = `OAuth realm="http://api.twitter.com/", oauth_version="1.0", oauth_token="${oauthSign.oauth_token}", oauth_nonce="${oauthSign.oauth_nonce}", oauth_timestamp="${oauthSign.timestamp}", oauth_signature="${encodeURIComponent(
            oauthSign.sign
        )}", oauth_consumer_key="${oauthSign.oauth_consumer_key}", oauth_signature_method="HMAC-SHA1"`
    } else if (guest_token?.open_account?.authorization) {
        authorization = guest_token.open_account.authorization
    }

    let tmpHeaders = {
        authorization: typeof authorization === 'string' ? authorization : Authorization[authorization],
        'x-guest-token': loginMode || (typeof authorization === 'string' && authorization.startsWith('OAuth')) ? undefined : guest_token.token,
        'content-type': 'application/json',
        'x-csrf-token': requestCookie.ct0,
        cookie: Object.entries(requestCookie)
            .map((x) => x.join('='))
            .join(';')
    }
    if ((typeof authorization === 'string' && authorization.startsWith('OAuth')) || guest_token?.open_account) {
        if (typeof authorization === 'string' && authorization.startsWith('OAuth')) {
            delete tmpHeaders['x-guest-token']
        }
        tmpHeaders = {
            ...tmpHeaders,
            ...{
                'User-Agent': 'TwitterAndroid/9.95.0-release.0 (29950000-r-0) ONEPLUS+A3010/9 (OnePlus;ONEPLUS+A3010;OnePlus;OnePlus3;0;;1;2016)',
                'X-Twitter-API-Version': 5,
                'X-Twitter-Client': 'TwitterAndroid',
                'X-Twitter-Client-Version': '9.95.0-release.0',
                'OS-Version': '28',
                'System-User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; ONEPLUS A3010 Build/PKQ1.181203.001)',
                'X-Twitter-Active-User': 'yes'
            }
        }
    }

    return await new Promise((resolve, reject) => {
        axios(url, {
            headers: {
                ...tmpHeaders,
                ...headers
            },
            method: body !== undefined ? 'post' : 'get',
            data: body ? body : undefined
        })
            .then((response) => {
                if (!response.data) {
                    reject({ code: -1000, message: 'empty data' })
                }
                resolve(response)
            })
            .catch((e) => {
                console.log(e)
                if (!e.response) {
                    reject({ code: -1000, message: e.code, e })
                } else if (e.response?.status === 429) {
                    reject({ code: 429, message: e.response.data, e })
                } else {
                    reject({ code: e.response.data?.errors?.[0].code ?? -1000, message: e.response.data?.errors?.[0].message ?? e.message, e })
                }
            })
            .catch((e) => {
                reject(e)
            })
    })
}

// ANONYMOUS
const getToken = async (authorization = 0) => {
    let tmpResponse = {
        success: false,
        token: '',
        code: -1000,
        cookies: {},
        rate_limit: {
            UserByRestId: 495, //500
            UserByScreenName: 495, //500
            UserTweets: 495, //500
            TweetDetail: 495, //500//poll also use this
            AudioSpaceById: 495, //500
            BroadCast: 180, //187
            Search: 49, // 50 Android app && 195,// 200 graphql && 245,//250 restful
            Recommendation: 55, //60,
            Translation: 495, // graphql in Android app 180, //187 1.1
            Trending: 19990, //20000
            ListInfo: 495, //500
            ListMember: 495, //500
            ListTimeLime: 495, //500
            CommunityInfo: 495, //500
            CommunityTimeLime: 495, //500
            Login: 180 //187
        },
        expire: Date.now() + 870000 //15 min
    }
    return await new Promise((resolve, reject) => {
        //2000 per 30 min i guess
        axios
            .post(TW_WEBAPI_PREFIX + '/1.1/guest/activate.json', '', {
                headers: {
                    authorization: typeof authorization === 'string' ? authorization : Authorization[authorization],
                    'x-csrf-token': ct0,
                    cookie: 'ct0=' + ct0
                }
            })
            .then((response) => {
                if (response.status === 200 && response.data.guest_token) {
                    tmpResponse.code = 200
                    tmpResponse.token = response.data.guest_token
                    tmpResponse.success = true
                    tmpResponse.cookies = (response.headers instanceof Map ? [...response.headers].filter((header) => header[0] === 'set-cookie').map((header) => header[1]) ?? [] : response.headers?.['set-cookie'] ?? []).map(
                        (cookie) => cookie.split(';')[0]
                    )
                }
                resolve(tmpResponse)
            })
            .catch((e) => {
                tmpResponse.token = e.message
                reject(tmpResponse)
            })
    })
}

const preCheckCtx = (ctx = {}, defaultKV = {}) =>
    Object.fromEntries(
        Object.entries(defaultKV).map((kv) => {
            if (ctx[kv[0]] !== undefined) {
                kv[1] = ctx[kv[0]]
            }
            return kv
        })
    )

const getUserInfo = async (ctx = { user: '', guest_token: {}, graphqlMode: true, cookie: {}, authorization: 1 }, env = {}) => {
    let { user, guest_token, graphqlMode, cookie, authorization } = preCheckCtx(ctx, {
        user: '',
        guest_token: {},
        graphqlMode: true,
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(user)) {
        //TODO while user length larger then 500 (max value for one guest token)
        //if (user.length > 500)
        return await Promise.allSettled(user.map((userId) => getUserInfo({ user: userId, guest_token, graphqlMode, cookie, authorization })))
    } else {
        const generateUrl = (user = '', isGraphql = false) => {
            if (isGraphql) {
                let graphqlVariables = { withSuperFollowsUserFields: true, withSafetyModeUserFields: true }
                if (!isNaN(user)) {
                    graphqlVariables['userId'] = user
                    return (
                        TW_WEBAPI_PREFIX +
                        '/graphql/' +
                        _UserByRestId.queryId +
                        '/UserByRestId?' +
                        new URLSearchParams({
                            variables: JSON.stringify(graphqlVariables),
                            features: JSON.stringify(_UserByRestId.features)
                        }).toString()
                    )
                } else {
                    graphqlVariables['screen_name'] = user
                    return (
                        TW_WEBAPI_PREFIX +
                        '/graphql/' +
                        _UserByScreenName.queryId +
                        '/UserByScreenName?' +
                        new URLSearchParams({
                            variables: JSON.stringify(graphqlVariables),
                            features: JSON.stringify(_UserByScreenName.features)
                        }).toString()
                    )
                }
            } else {
                return (
                    TW_WEBAPI_PREFIX +
                    '/1.1/users/show.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&' +
                    (!isNaN(user) ? 'user_id=' : 'screen_name=') +
                    user
                )
            }
        }
        return await new Promise((resolve, reject) => {
            coreFetch(generateUrl(user, graphqlMode), guest_token, cookie, authorization)
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }
}

//account owned nft avatar or had blue verified
const getVerifiedAvatars = async (ctx = { uid: [], guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { uid, guest_token, cookie, authorization } = preCheckCtx(ctx, { uid: [], guest_token: {}, cookie: {}, authorization: 1 })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (!(uid instanceof Array)) {
        uid = [uid]
    }

    const graphqlVariables = {
        userIds: uid
    }
    //https://api.twitter.com/graphql/AkfLpq1RURPtDOcd56qyCg/UsersVerifiedAvatars?variables=%7B%22userIds%22%3A%5B%222392179773%22%2C%22815928932759285760%22%5D%7D&features=%7B%22responsive_web_twitter_blue_verified_badge_is_enabled%22%3Atrue%7D
    return await new Promise((resolve, reject) => {
        coreFetch(
            `${TW_WEBAPI_PREFIX}/graphql/${_UsersVerifiedAvatars.queryId}/UsersVerifiedAvatars?` +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_UsersVerifiedAvatars.features)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

//max is 37-38
const getRecommendations = async (ctx = { user: '', guest_token: {}, count: 40, cookie: {}, authorization: 1 }, env = {}) => {
    let { user, guest_token, count, cookie, authorization } = preCheckCtx(ctx, { user: '', guest_token: {}, count: 40, cookie: {}, authorization: 1 })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(user)) {
        //TODO while user length larger then 500 (max value for one guest token)
        //if (user.length > 500)
        return await Promise.allSettled(user.map((userId) => getRecommendations({ user: userId, guest_token, count, cookie, authorization })))
    } else {
        return await new Promise((resolve, reject) => {
            coreFetch(
                `${TW_WEBAPI_PREFIX}/1.1/users/recommendations.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&skip_status=1&&pc=true&display_location=profile_accounts_sidebar&limit=${count}&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CreplyvotingDownvotePerspective%2CvoiceInfo%2CbirdwatchPivot%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe&` +
                    (!isNaN(user) ? 'user_id=' : 'screen_name=') +
                    user,
                guest_token,
                cookie,
                authorization
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }
}

const getMediaTimeline = async (ctx = { uid: [], guest_token: {}, count: 20, graphqlMode: true, cookie: {}, authorization: 1 }, env = {}) => {
    let { uid, guest_token, count, graphqlMode, cookie, authorization } = preCheckCtx(ctx, {
        uid: [],
        guest_token: {},
        count: 20,
        graphqlMode: true,
        cookie: {},
        authorization: 1
    })
    count = (count || -1) > 0 ? count : 20
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(uid)) {
        return await Promise.allSettled(uid.map((singleUid) => getMediaTimeline({ uid: singleUid, guest_token, count, graphqlMode, cookie, authorization })))
    }
    //if (graphqlMode) {
    let graphqlVariables = {
        userId: uid,
        count,
        includePromotedContent: false,
        withSuperFollowsUserFields: true,
        withDownvotePerspective: false,
        withReactionsMetadata: false,
        withReactionsPerspective: false,
        withSuperFollowsTweetFields: true,
        withClientEventToken: false,
        withBirdwatchNotes: false,
        withVoice: true,
        withV2Timeline: true
    }

    //TODO check exist of cursor
    //if (cursor) {
    //  graphqlVariables["cursor"] = cursor
    //}

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _UserMedia.queryId +
                '/UserMedia?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_UserMedia.features)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
    //} else {
    //
    //}
}

const getTweets = async (
    ctx = {
        queryString: '',
        cursor: '',
        guest_token: {},
        count: false,
        online: false,
        graphqlMode: true,
        searchMode: false,
        withReply: false,
        cookie: {},
        authorization: 1,
        web: false
    },
    env = {}
) => {
    let { queryString, cursor, guest_token, count, online, graphqlMode, searchMode, withReply, cookie, authorization, web } = preCheckCtx(ctx, {
        queryString: '',
        cursor: '',
        guest_token: {},
        count: false,
        online: false,
        graphqlMode: true,
        searchMode: false,
        withReply: false,
        cookie: {},
        authorization: 1,
        web: false
    })
    count = count ? count : cursor ? 499 : online ? 40 : graphqlMode ? 499 : 999
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(queryString)) {
        return await Promise.allSettled(queryString.map((queryStringItem) => getTweets({ queryString: queryStringItem, cursor, guest_token, count, online, graphqlMode, searchMode, cookie, authorization })))
    }
    //实际上即使写了999网页api返回800-900条记录, 客户端返回约400-450条记录
    //如果是搜索就不需要写太多，反正上限为20
    //网页版使用的
    //https://api.twitter.com/2/timeline/conversation/:uid.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=20&ext=mediaStats%2CcameraMoment
    if (graphqlMode && !searchMode) {
        let graphqlVariables = {}

        if (web) {
            graphqlVariables = {
                userId: queryString,
                count,
                withTweetQuoteCount: true,
                withQuickPromoteEligibilityTweetFields: true,
                withSuperFollowsUserFields: true,
                withSuperFollowsTweetFields: true,
                withDownvotePerspective: false,
                withReactionsMetadata: false,
                includePromotedContent: true,
                withReactionsPerspective: false,
                withUserResults: false,
                withVoice: true,
                withNonLegacyCard: true,
                withV2Timeline: true // might cause count 'limit <= 20'
            }
        } else {
            graphqlVariables = {
                includeTweetImpression: true,
                includeHasBirdwatchNotes: false,
                includeEditPerspective: false,
                includeEditControl: true,
                count,
                rest_id: queryString,
                includeTweetVisibilityNudge: true,
                autoplay_enabled: true
            }
        }

        if (cursor) {
            graphqlVariables['cursor'] = cursor
        }

        return await new Promise((resolve, reject) => {
            coreFetch(
                TW_WEBAPI_PREFIX +
                    '/graphql/' +
                    (web
                        ? withReply
                            ? _UserTweetsAndReplies.queryId + '/UserTweetsAndReplies?'
                            : _UserTweets.queryId + '/UserTweets?'
                        : withReply
                        ? _UserWithProfileTweetsAndRepliesQueryV2.queryId + '/UserWithProfileTweetsAndRepliesQueryV2?'
                        : _UserWithProfileTweetsQueryV2.queryId + '/UserWithProfileTweetsQueryV2?') +
                    new URLSearchParams({
                        variables: JSON.stringify(graphqlVariables),
                        features: JSON.stringify(web ? (withReply ? _UserTweetsAndReplies.features : _UserTweets.features) : withReply ? _UserWithProfileTweetsAndRepliesQueryV2.features : _UserWithProfileTweetsQueryV2.features)
                    }).toString(),
                guest_token,
                cookie,
                authorization
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    } else if (searchMode) {
        //TODO Graphql for search
        //https://api.twitter.com/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=false&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&q=from%3Abang_dream_info&tweet_search_mode=live&count=20&query_source=recent_search_click&pc=1&spelling_corrections=1&include_ext_edit_control=true&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CbirdwatchPivot%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe
        let tmpQueryObject = {
            include_profile_interstitial_type: 1,
            include_blocking: 1,
            include_blocked_by: 1,
            include_followed_by: 1,
            include_want_retweets: 1,
            include_mute_edge: 1,
            include_can_dm: 1,
            include_can_media_tag: 1,
            include_ext_has_nft_avatar: 1,
            include_ext_is_blue_verified: 1,
            include_ext_verified_type: 1,
            skip_status: 1,
            cards_platform: 'Web-12',
            include_cards: 1,
            include_ext_alt_text: true,
            include_ext_limited_action_results: false,
            include_quote_count: true,
            include_reply_count: 1,
            tweet_mode: 'extended',
            include_ext_views: true,
            include_entities: true,
            include_user_entities: true,
            include_ext_media_color: true,
            include_ext_media_availability: true,
            include_ext_sensitive_media_warning: true,
            include_ext_trusted_friends_metadata: true,
            send_error_codes: true,
            simple_quoted_tweet: true,
            q: queryString.trim(),
            tweet_search_mode: 'live',
            query_source: 'typed_query',
            count,
            requestContext: 'launch',
            pc: 1,
            spelling_corrections: 1,
            include_ext_edit_control: true,
            ext: 'mediaStats,highlightedLabel,hasNftAvatar,voiceInfo,birdwatchPivot,enrichments,superFollowMetadata,unmentionInfo,editControl,vibe'
        }
        //https://abs.twimg.com/responsive-web/client-web/shared~ondemand.SettingsInternals~bundle.Place~bundle.Search~bundle.QuoteTweetActivity.431ada6a.js

        let graphqlVariables = {}

        if (web) {
            graphqlVariables = {
                timeline_type: 'Latest',
                rawQuery: queryString.trim(),
                count,
                product: 'Latest', //Top, People, Photos, Videos, Latest
                withDownvotePerspective: false,
                withReactionsMetadata: false,
                withReactionsPerspective: false
            }
        } else {
            graphqlVariables = {
                includeTweetImpression: true,
                query_source: 'typed_query',
                includeHasBirdwatchNotes: false,
                includeEditPerspective: false,
                includeEditControl: true,
                query: queryString.trim()
            }
        }

        if (cursor) {
            graphqlVariables['cursor'] = cursor
        }
        return await new Promise((resolve, reject) => {
            coreFetch(
                TW_ANDROID_PREFIX +
                    '/graphql/' +
                    (web ? _SearchTimelineWeb.queryId : _SearchTimeline.queryId) +
                    '/SearchTimeline?' +
                    new URLSearchParams({
                        variables: JSON.stringify(graphqlVariables),
                        features: JSON.stringify(web ? _SearchTimelineWeb.features : _SearchTimeline.features)
                    }).toString(),
                guest_token,
                cookie,
                authorization
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })

            //coreFetch(TW_WEBAPI_PREFIX+"/2/search/adaptive.json?" + (new URLSearchParams//(tmpQueryObject)).toString(), guest_token).then(response => {
            //  resolve(response)
            //}).catch(e => {
            //  reject(e)
            //})
        })
    } else {
        // no use because http 429 loop
        return await new Promise((resolve, reject) => {
            coreFetch(
                `${TW_WEBAPI_PREFIX}/2/timeline/profile/${queryString}.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&ext=mediaStats%2CcameraMoment&count=` +
                    (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
                guest_token,
                cookie,
                authorization
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }
}

const getConversation = async (ctx = { tweet_id: '', guest_token: {}, graphqlMode: true, authorization: 1, cursor: '', cookie: {}, web: false }, env = {}) => {
    let { tweet_id, guest_token, graphqlMode, authorization, cursor, cookie, web } = preCheckCtx(ctx, {
        tweet_id: '',
        guest_token: {},
        graphqlMode: true,
        authorization: 1,
        cursor: '',
        cookie: {},
        web: false
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(tweet_id)) {
        return await Promise.allSettled(tweet_id.map((tweetId) => getConversation({ tweet_id: tweetId, guest_token, graphqlMode, authorization, cursor, cookie })))
    }
    if (graphqlMode) {
        let graphqlVariables = {}
        if (web) {
            graphqlVariables = {
                focalTweetId: tweet_id,
                with_rux_injections: false,
                includePromotedContent: true,
                withCommunity: true,
                withQuickPromoteEligibilityTweetFields: true,
                withBirdwatchNotes: true,
                withSuperFollowsUserFields: true,
                withDownvotePerspective: false,
                withReactionsMetadata: false,
                withReactionsPerspective: false,
                withSuperFollowsTweetFields: true,
                withVoice: true,
                withV2Timeline: true
            }
        } else {
            graphqlVariables = {
                referrer: 'profile',
                includeTweetImpression: true,
                includeHasBirdwatchNotes: false,
                isReaderMode: false,
                includeEditPerspective: false,
                includeEditControl: true,
                focalTweetId: tweet_id,
                includeCommunityTweetRelationship: true,
                includeTweetVisibilityNudge: true
            }
        }
        if (cursor) {
            graphqlVariables.cursor = cursor
        }

        return await new Promise((resolve, reject) => {
            coreFetch(
                TW_WEBAPI_PREFIX +
                    '/graphql/' +
                    (web ? _TweetDetail.queryId + '/TweetDetail?' : _ConversationTimelineV2.queryId + '/ConversationTimelineV2?') +
                    new URLSearchParams({ variables: JSON.stringify(graphqlVariables), features: JSON.stringify(web ? _TweetDetail.features : _ConversationTimelineV2.features) }).toString(),
                guest_token,
                cookie,
                authorization
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    } else {
        return await new Promise((resolve, reject) => {
            coreFetch(
                TW_WEBAPI_PREFIX +
                    '/2/timeline/conversation/' +
                    tweet_id +
                    '.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=1&ext=mediaStats%2CcameraMoment',
                guest_token,
                cookie,
                authorization
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }
}

const getEditHistory = async (ctx = { tweet_id: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { tweet_id, guest_token, cookie, authorization } = preCheckCtx(ctx, { tweet_id: '', guest_token: {}, cookie: {}, authorization: 1 })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(tweet_id)) {
        return await Promise.allSettled(tweet_id.map((tweetId) => getEditHistory({ tweet_id: tweetId, guest_token, graphqlMode, cookie, authorization })))
    }
    const graphqlVariables = {
        tweetId: tweet_id,
        withSuperFollowsUserFields: true,
        withDownvotePerspective: false,
        withReactionsMetadata: false,
        withReactionsPerspective: false,
        withSuperFollowsTweetFields: true,
        withQuickPromoteEligibilityTweetFields: true
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + _TweetEditHistory.queryId + '/TweetEditHistory?' + new URLSearchParams({ variables: JSON.stringify(graphqlVariables), features: JSON.stringify(_TweetEditHistory.features) }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getAudioSpace = async (ctx = { id: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, guest_token, cookie, authorization } = preCheckCtx(ctx, { id: '', guest_token: {}, cookie: {}, authorization: 1 })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(id)) {
        return await Promise.allSettled(id.map((justId) => getAudioSpace({ id: justId, guest_token, cookie, authorization })))
    }
    const graphqlVariables = {
        id,
        isMetatagsQuery: true,
        withSuperFollowsUserFields: true,
        withDownvotePerspective: false,
        withReactionsMetadata: false,
        withReactionsPerspective: false,
        withSuperFollowsTweetFields: true,
        withReplays: true
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + _AudioSpaceById.queryId + '/AudioSpaceById?' + new URLSearchParams({ variables: JSON.stringify(graphqlVariables), features: JSON.stringify(_AudioSpaceById.features) }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getBroadcast = async (ctx = { id: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, guest_token, cookie, authorization } = preCheckCtx(ctx, { id: '', guest_token: {}, cookie: {}, authorization: 1 })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(id)) {
        return await Promise.allSettled(id.map((justId) => getBroadcast({ id: justId, guest_token, cookie, authorization })))
    }
    return await new Promise((resolve, reject) => {
        coreFetch(`${TW_WEBAPI_PREFIX}/1.1/broadcasts/show.json?ids=${id}&include_events=true`, guest_token, cookie, authorization)
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getLiveVideoStream = async (ctx = { media_key: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { media_key, guest_token, cookie, authorization } = preCheckCtx(ctx, { media_key: '', guest_token: {}, cookie: {}, authorization: 1 })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    if (Array.isArray(media_key)) {
        return await Promise.allSettled(id.map((justId) => getLiveVideoStream({ id: justId, guest_token, cookie, authorization })))
    }
    return await new Promise((resolve, reject) => {
        coreFetch(`${TW_WEBAPI_PREFIX}/1.1/live_video_stream/status/${media_key}?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com`, guest_token, cookie, authorization)
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getTypeahead = async (ctx = { text: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { text, guest_token, cookie, authorization } = preCheckCtx(ctx, { text: '', guest_token: {}, cookie: {}, authorization: 1 })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    return await new Promise((resolve, reject) => {
        coreFetch(`${TW_WEBAPI_PREFIX}/1.1/search/typeahead.json?include_ext_is_blue_verified=1&q=${text}&src=search_box&result_type=events%2Cusers%2Ctopics`, guest_token, cookie, authorization)
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getArticle = async (ctx = { id: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, guest_token, cookie, authorization } = preCheckCtx(ctx, { id: '', guest_token: {}, cookie: {}, authorization: 1 })
    if (!guest_token.success) {
        guest_token = await getToken(1)
    }

    const graphqlVariables = {
        twitterArticleId: id,
        withSuperFollowsUserFields: true,
        withDownvotePerspective: false,
        withReactionsMetadata: false,
        withReactionsPerspective: false,
        withSuperFollowsTweetFields: true
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _TwitterArticleByRestId.queryId +
                '/TwitterArticleByRestId?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_TwitterArticleByRestId.features)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getListInfo = async (ctx = { id: '', screenName: '', listSlug: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, screenName, listSlug, guest_token, cookie, authorization } = preCheckCtx(ctx, {
        id: '',
        screenName: '',
        listSlug: '',
        guest_token: {},
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }

    const listById = /^[\d]+$/.test(String(id))
    let graphqlVariables = {}
    if (!listById) {
        graphqlVariables.screenName = screenName
        graphqlVariables.listSlug = listSlug
    } else {
        graphqlVariables.listId = id
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                (!listById ? _ListBySlug.queryId + '/ListBySlug?' : _ListByRestId.queryId + '/ListByRestId?') +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(!listById ? _ListBySlug.features : _ListByRestId.features)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getListMember = async (ctx = { id: '', count: 20, cursor: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, count, cursor, guest_token, cookie, authorization } = preCheckCtx(ctx, {
        id: '',
        count: 20,
        cursor: '',
        guest_token: {},
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }

    const graphqlVariables = {
        listId: id,
        count,
        withSafetyModeUserFields: true
    }
    if (cursor) {
        graphqlVariables.cursor = cursor
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + _ListMembers.queryId + '/ListMembers?' + new URLSearchParams({ variables: JSON.stringify(graphqlVariables), features: JSON.stringify(_ListMembers.features) }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getListTimeLine = async (ctx = { id: '', count: 20, cursor: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, count, cursor, guest_token, cookie, authorization } = preCheckCtx(ctx, {
        id: '',
        count: 20,
        cursor: '',
        guest_token: {},
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }

    const graphqlVariables = {
        listId: id,
        count
    }
    if (cursor) {
        graphqlVariables.cursor = cursor
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _ListLatestTweetsTimeline.queryId +
                '/ListLatestTweetsTimeline?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_ListLatestTweetsTimeline.features)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getCommunityInfo = async (ctx = { id: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, guest_token, cookie, authorization } = preCheckCtx(ctx, {
        id: '',
        guest_token: {},
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }

    let graphqlVariables = {
        communityId: id
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _CommunitiesFetchOneQuery.queryId +
                '/CommunitiesFetchOneQuery?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_CommunitiesFetchOneQuery.features)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getCommunityTweetsTimeline = async (ctx = { id: '', count: 20, cursor: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { id, count, cursor, guest_token, cookie, authorization } = preCheckCtx(ctx, {
        id: '',
        count: 20,
        cursor: '',
        guest_token: {},
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }

    const graphqlVariables = {
        communityId: id,
        count,
        withCommunity: true
    }
    if (cursor) {
        graphqlVariables.cursor = cursor
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _CommunityTweetsTimeline.queryId +
                '/CommunityTweetsTimeline?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_CommunityTweetsTimeline.features)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getCommunitySearch = async (ctx = { queryString: '', count: 20, cursor: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    // Note: now 'count' is unused, it might useful in future
    let { queryString, count, cursor, guest_token, cookie, authorization } = preCheckCtx(ctx, {
        queryString: '',
        count: 20,
        cursor: '',
        guest_token: {},
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }

    const graphqlVariables = {
        query: queryString,
        count,
        cursor: cursor || null
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _CommunitiesSearchQuery.queryId +
                '/CommunitiesSearchQuery?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables)
                }).toString(),
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

//https://github.com/FixTweet/FixTweet/blob/main/src/helpers/translate.ts
const getTranslate = async (ctx = { id: '0', type: 'tweets', target: 'en', guest_token: {}, cookie: {}, authorization: 1, graphqlMode: true }, env = {}) => {
    let { id, type, target, guest_token, cookie, authorization, graphqlMode } = preCheckCtx(ctx, {
        id: '0',
        type: 'tweets',
        target: 'en',
        guest_token: {},
        cookie: {},
        authorization: 1,
        graphqlMode: true
    })
    if (!guest_token.success && !cookie?.ct0 && !cookie?.auth_token) {
        guest_token = await getToken(authorization)
    } else if (cookie?.ct0 && cookie?.auth_token) {
        guest_token = false
    }
    return await new Promise((resolve, reject) => {
        const url = graphqlMode
            ? TW_WEBAPI_PREFIX +
              '/graphql/' +
              (type === 'profile' ? _TranslateProfileQuery.queryId + '/TranslateProfileQuery' : _TranslateTweetQuery.queryId + '/TranslateTweetQuery?') +
              new URLSearchParams({
                  variables: JSON.stringify({
                      includeTweetImpression: true,
                      includeHasBirdwatchNotes: false,
                      includeEditPerspective: false,
                      includeEditControl: true,
                      ...(type === 'profile' ? { rest_id: id } : { tweet_id: id })
                  })
              })
            : type === 'profile'
            ? `${TW_WEBAPI_PREFIX}/1.1/strato/column/None/profileUserId=${id},destinationLanguage=None,translationSource=Some(Google)/translation/service/translateProfile`
            : `${TW_WEBAPI_PREFIX}/1.1/strato/column/None/tweetId=${id},destinationLanguage=None,translationSource=Some(Google),feature=None,timeout=None,onlyCached=None/translation/service/translateTweet`

        coreFetch(url, guest_token, cookie, authorization, { 'x-twitter-client-language': target })
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

//const getMmoment = async () => {
//
//}

// OTHERS (ANONYMOUS)
const getPollResult = async (ctx = { tweet_id: '', guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { tweet_id, guest_token, cookie, authorization } = preCheckCtx(ctx, { tweet_id: '', guest_token: {}, cookie: {}, authorization: 1 })
    if (!tweet_id) {
        return { code: 403, message: 'Invalid tweet id', data: [] }
    }
    let tmpTweet = await getConversation({ tweet_id, guest_token, graphqlMode: true, cookie, authorization })

    tmpTweet = path2array('tweets_contents', tmpTweet.data)
    if (!tmpTweet) {
        return { code: 404, message: 'No tweets', data: [] }
    }

    const tweetItem = path2array('tweet_content', tmpTweet.find((tmpTweetItem) => tmpTweetItem.entryId === 'tweet-' + tweet_id) ?? [])
    const cardInfo = path2array('tweet_card_path', tweetItem)
    if (cardInfo && String(path2array('tweet_card_name', cardInfo)).startsWith('poll')) {
        const data = []
        const tmpPollKV = Object.fromEntries(cardInfo.binding_values.map((binding_value) => [binding_value.key, binding_value.value]))
        for (let x = 1; x <= 4; x++) {
            if (!tmpPollKV['choice' + x + '_count']) {
                break
            }
            data.push(tmpPollKV['choice' + x + '_count'].string_value)
        }
        return { code: 200, message: 'Success', data }
    } else {
        return { code: 403, message: 'Invalid card type', data: [] }
    }
}

const getImage = async (path = '', headers = {}) => {
    if (path === '') {
        return ''
    }
    return axios.get(path, {
        responseType: typeof process === 'undefined' || (process?.browser ?? false) ? 'arrayBuffer' : 'arraybuffer',
        headers
        //timeout: 10000
    })
}

// ANONYMOUS (for server region)
// COOKIE REQUIRED (for custom region)
const getTrends = async (ctx = { initial_tab_id: 'trending', count: 20, guest_token: {}, cookie: {}, authorization: 1 }, env = {}) => {
    let { initial_tab_id, count, guest_token, cookie, authorization } = preCheckCtx(ctx, {
        initial_tab_id: 'trending',
        count: 20,
        guest_token: {},
        cookie: {},
        authorization: 1
    })
    if (!guest_token.success) {
        guest_token = await getToken(1)
    }
    return await new Promise((resolve, reject) => {
        coreFetch(
            initial_tab_id === 'trends'
                ? `${TW_WEBAPI_PREFIX}/2/guide.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=false&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_ext_views=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&count=${count}&candidate_source=trends&include_page_configuration=false&entity_tokens=false&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe`
                : `${TW_WEBAPI_PREFIX}/2/guide.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=false&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_ext_views=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&count=${count}&include_page_configuration=true&initial_tab_id=${initial_tab_id}&entity_tokens=false&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe${
                      cookie.length ? '%2CbirdwatchPivot' : ''
                  }`,
            guest_token,
            cookie,
            authorization
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

// ANONYMOUS (for restful api)
// COOKIE REQUIRED (for graphql api)
//type: `Followers` or `Following`
//id: `screen_name` in restful mode and `uid` in graphql mode
//count: max is `200`
const getFollowingOrFollowers = async (ctx = { cookie: {}, guest_token: {}, id: '', count: false, type: 'Followers', cursor: '', graphqlMode: false }, env = {}) => {
    let { cookie, guest_token, id, count, type, cursor, graphqlMode } = preCheckCtx(ctx, {
        cookie: {},
        guest_token: {},
        id: '',
        count: false,
        type: 'Followers',
        cursor: '',
        graphqlMode: false
    })
    //cookie: auth_token
    if (!guest_token.success) {
        guest_token = await getToken(Number(graphqlMode))
    }
    count = count || 20
    if (graphqlMode) {
        const graphqlVariables = {
            userId: id,
            count,
            includePromotedContent: false,
            withSuperFollowsUserFields: true,
            withDownvotePerspective: false,
            withReactionsMetadata: false,
            withReactionsPerspective: false,
            withSuperFollowsTweetFields: true,
            __fs_interactive_text: false,
            __fs_responsive_web_uc_gql_enabled: false,
            __fs_dont_mention_me_view_api_enabled: false
        }
        if (cursor) {
            graphqlVariables['cursor'] = cursor
        }

        return await new Promise((resolve, reject) => {
            coreFetch(
                TW_WEBAPI_PREFIX +
                    '/graphql/' +
                    (type === 'Followers' ? _Followers.queryId : _Following.queryId) +
                    `/${type}?` +
                    new URLSearchParams({
                        variables: JSON.stringify(graphqlVariables),
                        features: JSON.stringify(type === 'Followers' ? _Followers.features : _Following.features)
                    }).toString(),
                guest_token,
                cookie,
                1
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    } else {
        const queryObject = {
            screen_name: id,
            count
        }
        if (cursor) {
            queryObject.cursor = cursor
        }
        return await new Promise((resolve, reject) => {
            coreFetch(`${TW_WEBAPI_PREFIX}/1.1/${type === 'Followers' ? 'followers' : 'friends'}/list.json?` + new URLSearchParams(queryObject).toString(), guest_token, cookie, 0)
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }
}

//id: `screen_name` in restful mode and `uid` in graphql mode
const getLikes = async (ctx = { cookie: {}, guest_token: {}, id: '', count: 20, cursor: '', graphqlMode: false }, env = {}) => {
    let { cookie, guest_token, id, count, cursor, graphqlMode } = preCheckCtx(ctx, {
        cookie: {},
        guest_token: {},
        id: '',
        count: 20,
        cursor: '',
        graphqlMode: false
    })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!id || !cookie.ct0 || !cookie.auth_token) {
    }
    if (!guest_token.success) {
        guest_token = await getToken(Number(graphqlMode))
    }
    if (graphqlMode) {
        let graphqlVariables = {
            userId: id,
            count,
            includePromotedContent: false,
            withClientEventToken: false,
            withBirdwatchNotes: false,
            withVoice: true,
            withV2Timeline: true
        }
        if (cursor) {
            graphqlVariables.cursor = cursor
        }
        return await new Promise((resolve, reject) => {
            coreFetch(
                TW_WEBAPI_PREFIX +
                    '/graphql/' +
                    _Likes.queryId +
                    '/Likes?' +
                    new URLSearchParams({
                        variables: JSON.stringify(graphqlVariables),
                        features: JSON.stringify(_Likes.features)
                    }).toString(),
                guest_token,
                cookie,
                1
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    } else {
        const queryObject = {
            screen_name: id,
            count
        }
        if (cursor) {
            queryObject.max_id = cursor
        }
        return await new Promise((resolve, reject) => {
            coreFetch(`${TW_WEBAPI_PREFIX}/1.1/favorites/list.json?` + new URLSearchParams(queryObject).toString(), guest_token, cookie, 0)
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }
}

// COOKIE REQUIRED && GUEST_TOKEN REQUIRED

// TODO flow_name=password_reset
const postFlowTask = async (ctx = { flow_name: '', flow_token: '', sub_task: {}, guest_token: {}, cookie: {} }, env = {}) => {
    let { cookie, flow_name, flow_token, sub_task, guest_token } = preCheckCtx(ctx, {
        flow_name: '',
        flow_token: '',
        sub_task: {},
        guest_token: {},
        cookie: {}
    })
    try {
        const tmpResponse = await coreFetch(
            `${TW_WEBAPI_PREFIX}/1.1/onboarding/task.json${flow_name ? `?flow_name=${flow_name}` : ''}`,
            guest_token.token,
            cookie,
            1,
            {},
            flow_name
                ? {
                      input_flow_data: { flow_context: { debug_overrides: {}, start_location: { location: 'unknown' } } },
                      subtask_versions: {
                          action_list: 2,
                          alert_dialog: 1,
                          app_download_cta: 1,
                          check_logged_in_account: 1,
                          choice_selection: 3,
                          contacts_live_sync_permission_prompt: 0,
                          cta: 7,
                          email_verification: 2,
                          end_flow: 1,
                          enter_date: 1,
                          enter_email: 2,
                          enter_password: 5,
                          enter_phone: 2,
                          enter_recaptcha: 1,
                          enter_text: 5,
                          enter_username: 2,
                          generic_urt: 3,
                          in_app_notification: 1,
                          interest_picker: 3,
                          js_instrumentation: 1,
                          menu_dialog: 1,
                          notifications_permission_prompt: 2,
                          open_account: 2,
                          open_home_timeline: 1,
                          open_link: 1,
                          phone_verification: 4,
                          privacy_options: 1,
                          security_key: 3,
                          select_avatar: 4,
                          select_banner: 2,
                          settings_list: 7,
                          show_code: 1,
                          sign_up: 2,
                          sign_up_review: 4,
                          tweet_selection_urt: 1,
                          update_users: 1,
                          upload_media: 1,
                          user_recommendations_list: 4,
                          user_recommendations_urt: 1,
                          wait_spinner: 3,
                          web_modal: 1
                      }
                  }
                : JSON.stringify({
                      flow_token,
                      subtask_inputs: [sub_task]
                  })
        )
        //flow token
        return {
            code: 200,
            message: 'OK',
            flow_data: {
                subtask_id: tmpResponse.data?.subtasks ? tmpResponse.data.subtasks?.[0]?.subtask_id : 'Ended',
                flow_token: tmpResponse.data.flow_token,
                cookie: { ...cookie, ...Object.fromEntries((tmpResponse.headers['set-cookie'] || []).map((x) => x.split(';')[0].split('='))) }
            },
            ...tmpResponse
        }
    } catch (e) {
        return { code: e.code || -1005, message: `Unable to continue flow #${sub_task.subtask_id}, ${e.message || ''}`, e, flow_data: { subtask_id: 'Ended', flowToken: '', cookie } }
    }
}

const getViewer = async (ctx = { cookie: {}, guest_token: {} }, env = {}) => {
    let { cookie, guest_token } = preCheckCtx(ctx, { cookie: {}, guest_token: {} })
    //if (!guest_token.success) {
    //    guest_token = await getToken(1)
    //}
    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _Viewer.queryId +
                '/Viewer?' +
                new URLSearchParams({
                    variables: JSON.stringify({ withCommunitiesMemberships: true, withSubscribedTab: true, withCommunitiesCreation: true }),
                    features: JSON.stringify(_Viewer.features)
                }).toString(),
            false, //guest_token.token,
            cookie
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

// COOKIE REQUIRED

const getJsInstData = async (ctx = { jsInstrumentationLink: 'https://twitter.com/i/js_inst?c_name=ui_metrics', cookie: {} }, env = {}) => {
    let { cookie, jsInstrumentationLink } = preCheckCtx(ctx, {
        jsInstrumentationLink: 'https://twitter.com/i/js_inst?c_name=ui_metrics',
        cookie: {}
    })
    if (typeof globalThis.document === 'undefined') {
        globalThis.document = new MockDocument()
    }
    try {
        const jsInstData = await axios.get(jsInstrumentationLink, {
            headers: {
                cookie
            }
        })
        const rawJs = jsInstData.data
        const astParse = parse(rawJs, { ecmaVersion: 'latest' })
        const start = astParse.body[0].body.body[0].declarations[0].init.body.body[0].start
        const end = astParse.body[0].body.body[0].declarations[0].init.body.body[0].end

        const js_instrumentation = new Function(`const document=globalThis.document;return ${rawJs.slice(start, end)}()`)()
        return {
            code: 200,
            message: 'OK',
            data: rawJs,
            flow_data: {
                cookie: { ...cookie, ...Object.fromEntries(jsInstData.headers['set-cookie'].map((x) => x.split(';')[0].split('='))) },
                js_instrumentation
            }
        }
    } catch (e) {
        return { code: -1004, message: 'Unable to parse response', e, flow_data: { cookie, js_instrumentation: {} } }
    }
}

const postLogout = async (ctx = { cookie: {} }, env = {}) => {
    let { cookie } = preCheckCtx(ctx, { cookie: {} })
    // success {status: "ok"}
    return await coreFetch(`${TW_WEBAPI_PREFIX}/1.1/account/logout.json`, false, cookie, 1, {}, null)
}

// type: INIT | APPEND | FINALIZE | STATUS
// media: ArrayBuffer | null
// To use this feature, you have to upgrade to Node.js v18
const uploadMedia = async (ctx = { cookie: {}, media: null, type: 'INIT', media_id: '', segment_index: 0 }, env = {}) => {
    let { cookie, media, type, media_id, segment_index } = preCheckCtx(ctx, {
        cookie: {},
        media: null,
        type: 'INIT',
        media_id: '',
        segment_index: 0
    })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!cookie.ct0 || !cookie.auth_token) {
    }
    if ((['APPEND', 'INIT'].includes(type) && !media) || (['FINALIZE', 'STATUS', 'APPEND'].includes(type) && (!media_id || isNaN(media_id)))) {
        return Promise.reject({ code: -1003, message: `miss ${['FINALIZE', 'STATUS', 'APPEND'].includes(type) ? 'media id' : 'media buffer'}`, e: {} })
    } else {
        let queryObject = new URLSearchParams({
            command: type
        })
        const formData = new FormData()
        switch (type) {
            case 'INIT':
                queryObject.append('total_bytes', media.byteLength)
                const mime = GetMine(media, true)
                queryObject.append('media_type', mime.mime)
                const tmpMediaCategory = mime.mime.endsWith('/gif') ? 'tweet_gif' : mime.mime.startsWith('video') ? 'tweet_video' : 'tweet_image'
                queryObject.append('media_category', tmpMediaCategory)
                //TODO check duration is necessary?
                //and how to do by pure js?
                //if (tmpMediaCategory === 'tweet_video') {
                //    queryObject.append('video_duration_ms', ??)
                //}
                break
            case 'APPEND':
                queryObject.append('media_id', media_id)
                queryObject.append('segment_index', segment_index) //TODO length for slice
                formData.append('media', new Blob([media]), 'blob')

                break
            case 'FINALIZE':
                queryObject.append('allow_async', true)
            case 'STATUS':
                queryObject.append('media_id', media_id)
        }
        return await new Promise((resolve, reject) => {
            coreFetch(
                `https://upload.twitter.com/i/media/upload.json?${queryObject.toString()}`,
                {},
                cookie,
                1,
                {
                    referer: 'https://twitter.com/',
                    'content-type': type === 'APPEND' ? 'multipart/form-data' : 'application/x-www-form-urlencoded'
                },
                type === 'STATUS' ? undefined : formData
            )
                .then((response) => {
                    resolve(response)
                })
                .catch((e) => {
                    if (type === 'APPEND' && e.code === -1000 && e.message === 'empty data') {
                        resolve({ code: 200, message: `upload: segment ${segment_index} success` })
                    }
                    reject(e)
                })
        })
    }
}
/*conversation_control: Community | ByInvitation */
const postTweet = async (ctx = { cookie: {}, text: '', media: [], reply_tweet_id: '', quote_tweet_id: '', conversation_control: '' }, env = {}) => {
    let { cookie, text, media, reply_tweet_id, quote_tweet_id, conversation_control } = preCheckCtx(ctx, {
        cookie: {},
        text: '',
        media: [],
        reply_tweet_id: '',
        quote_tweet_id: '',
        conversation_control: ''
    })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if ((!text && media.length === 0) || !cookie.ct0 || !cookie.auth_token) {
    }

    let graphqlVariables = {
        tweet_text: text,
        dark_request: false,
        media: { media_entities: media, possibly_sensitive: false }, // {media_entities: [{media_id: "_", tagged_users: []}], possibly_sensitive: false}
        semantic_annotation_ids: []
    }

    if (reply_tweet_id) {
        graphqlVariables.reply = {
            exclude_reply_user_ids: [],
            in_reply_to_tweet_id: reply_tweet_id
        }
    }

    if (quote_tweet_id) {
        graphqlVariables.attachment_url = `https://twitter.com/i/status/${quote_tweet_id}`
    }

    if (['ByInvitation', 'Community'].includes(conversation_control)) {
        graphqlVariables.conversation_control = { mode: conversation_control }
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + _CreateTweet.queryId + '/CreateTweet',
            {},
            cookie,
            1,
            {},
            JSON.stringify({
                variables: graphqlVariables,
                features: _CreateTweet.features,
                queryId: _CreateTweet.queryId
            })
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}
const postConversationControl = async (ctx = { cookie: {}, tweet_id: '', conversation_control: '' }, env = {}) => {
    let { cookie, tweet_id, conversation_control } = preCheckCtx(ctx, {
        cookie: {},
        tweet_id: '',
        conversation_control: ''
    })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!tweet_id || !cookie.ct0 || !cookie.auth_token) {
    }
    let tmpMode = ''
    if (['ByInvitation', 'Community'].includes(conversation_control)) {
        tmpMode = conversation_control
    }
    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + (tmpMode ? _ConversationControlChange.queryId + '/ConversationControlChange' : _ConversationControlDelete.queryId + '/ConversationControlDelete'),
            {},
            cookie,
            1,
            {},
            JSON.stringify({
                variables: { tweet_id, mode: tmpMode },
                features: tmpMode ? _ConversationControlChange.features : _ConversationControlDelete.features,
                queryId: tmpMode ? _ConversationControlChange.queryId : _ConversationControlDelete.queryId
            })
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const postPinTweet = async (ctx = { cookie: {}, tweet_id: '', unpin: false }, env = {}) => {
    let { cookie, tweet_id, unpin } = preCheckCtx(ctx, { cookie: {}, tweet_id: '', unpin: false })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!tweet_id || !cookie.ct0 || !cookie.auth_token) {
    }
    return await new Promise((resolve, reject) => {
        coreFetch(
            `${TW_WEBAPI_PREFIX}/1.1/account/${unpin ? 'unpin_tweet' : 'pin_tweet'}.json`,
            {},
            cookie,
            1,
            { 'content-type': 'application/x-www-form-urlencoded' },
            new URLSearchParams({
                tweet_mode: 'extended',
                id: tweet_id
            }).toString()
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const postRetweet = async (ctx = { cookie: {}, tweet_id: '', deleteRetweet: false }, env = {}) => {
    let { cookie, tweet_id, deleteRetweet } = preCheckCtx(ctx, { cookie: {}, tweet_id: '', deleteRetweet: false })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!tweet_id || !cookie.ct0 || !cookie.auth_token) {
    }

    let graphqlVariables = {
        tweet_id,
        dark_request: false
    }
    if (deleteRetweet) {
        delete graphqlVariables.tweet_id
        graphqlVariables.source_tweet_id = tweet_id
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + (deleteRetweet ? _DeleteRetweet.queryId + '/DeleteRetweet' : _CreateRetweet.queryId + '/CreateRetweet'),
            {},
            cookie,
            1,
            {},
            JSON.stringify({
                variables: graphqlVariables,
                features: deleteRetweet ? _DeleteRetweet.features : _CreateRetweet.features,
                queryId: deleteRetweet ? _DeleteRetweet.queryId : _CreateRetweet.queryId
            })
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const postBookmark = async (ctx = { cookie: {}, tweet_id: '', deleteBookmark: false }, env = {}) => {
    let { cookie, tweet_id, deleteBookmark } = preCheckCtx(ctx, { cookie: {}, tweet_id: '', deleteBookmark: false })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!tweet_id || !cookie.ct0 || !cookie.auth_token) {
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + (deleteBookmark ? _DeleteBookmark.queryId + '/DeleteBookmark' : _CreateBookmark.queryId + '/CreateBookmark'),
            {},
            cookie,
            1,
            {},
            JSON.stringify({
                variables: { tweet_id },
                features: deleteBookmark ? _DeleteBookmark.features : _CreateBookmark.features,
                queryId: deleteBookmark ? _DeleteBookmark.queryId : _CreateBookmark.queryId
            })
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const postDeleteTweet = async (ctx = { cookie: {}, tweet_id: '' }, env = {}) => {
    let { cookie, tweet_id } = preCheckCtx(ctx, { cookie: {}, tweet_id: '' })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!tweet_id || !cookie.ct0 || !cookie.auth_token) {
    }
    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + _DeleteTweet.queryId + '/DeleteTweet',
            {},
            cookie,
            1,
            {},
            JSON.stringify({
                variables: { tweet_id, dark_request: false },
                features: _DeleteTweet.features,
                queryId: _DeleteTweet.queryId
            })
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const postHomeTimeLine = async (ctx = { cookie: {}, count: 20, cursor: '', isForYou: false }, env = {}) => {
    let { cookie, count, cursor, isForYou } = preCheckCtx(ctx, { cookie: {}, count: 20, cursor: '', isForYou: false })
    //cookie: {ct0, auth_token}

    let graphqlVariables = {
        count,
        includePromotedContent: true,
        latestControlAvailable: true,
        requestContext: 'launch',
        seenTweetIds: []
    }
    if (cursor) {
        //graphqlVariables.requestContext = 'ptr'
        delete graphqlVariables.requestContext
        graphqlVariables.cursor = cursor
    }
    if (isForYou) {
        graphqlVariables.withCommunity = true
    }
    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + (isForYou ? _HomeTimeline.queryId + '/HomeTimeline' : _HomeLatestTimeline.queryId + '/HomeLatestTimeline'),
            {},
            cookie,
            1,
            {},
            JSON.stringify({
                variables: graphqlVariables,
                features: isForYou ? _HomeTimeline.features : _HomeLatestTimeline.features,
                queryId: isForYou ? _HomeTimeline.queryId : _HomeLatestTimeline.queryId
            })
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getBookmark = async (ctx = { cookie: {}, count: 20, cursor: '' }, env = {}) => {
    let { cookie, count, cursor } = preCheckCtx(ctx, { cookie: {}, count: 20, cursor: '' })
    //cookie: {ct0, auth_token}

    let graphqlVariables = {
        count,
        includePromotedContent: true
    }
    if (cursor) {
        graphqlVariables.cursor = cursor
    }
    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _Bookmarks.queryId +
                '/Bookmarks?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_Bookmarks.features)
                }).toString(),
            {},
            cookie,
            1
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const getTweetAnalytics = async (ctx = { cookie: {}, tweet_id: '', time_range_from: '', time_range_to: '' }, env = {}) => {
    let { cookie, tweet_id, time_range_from, time_range_to } = preCheckCtx(ctx, { cookie: {}, tweet_id: '', time_range_from: '', time_range_to: '' })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!tweet_id || !cookie.ct0 || !cookie.auth_token) {
    }
    let graphqlVariables = {
        restId: tweet_id,
        from_time: time_range_from ? new Date(time_range_from).toISOString() : '',
        to_time: time_range_to ? new Date(time_range_to).toISOString() : '',
        first_48_hours_time: time_range_from ? new Date(Number(new Date(time_range_from)) + 48 * 60 * 60 * 1000).toISOString() : '',
        requested_organic_metrics: ['DetailExpands', 'Engagements', 'Follows', 'Impressions', 'LinkClicks', 'ProfileVisits'],
        requested_promoted_metrics: ['DetailExpands', 'Engagements', 'Follows', 'Impressions', 'LinkClicks', 'ProfileVisits', 'CostPerFollower']
    }
    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX +
                '/graphql/' +
                _TweetActivityQuery.queryId +
                '/TweetActivityQuery?' +
                new URLSearchParams({
                    variables: JSON.stringify(graphqlVariables),
                    features: JSON.stringify(_TweetActivityQuery.features)
                }).toString(),
            {},
            cookie,
            1
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const postFollow = async (ctx = { cookie: {}, uid: '', follow: true }, env = {}) => {
    let { cookie, uid, follow } = preCheckCtx(ctx, { cookie: {}, uid: '', follow: true })
    //TODO precheck
    //cookie: {ct0, auth_token}
    if (!uid || !cookie.ct0 || !cookie.auth_token) {
    }

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + `/1.1/friendships/${follow ? 'create' : 'destroy'}.json`,
            {},
            cookie,
            1,
            {
                'content-type': 'application/x-www-form-urlencoded'
            },
            new URLSearchParams({
                include_profile_interstitial_type: 1,
                include_blocking: 1,
                include_blocked_by: 1,
                include_followed_by: 1,
                include_want_retweets: 1,
                include_mute_edge: 1,
                include_can_dm: 1,
                include_can_media_tag: 1,
                include_ext_has_nft_avatar: 1,
                include_ext_is_blue_verified: 1,
                include_ext_verified_type: 1,
                include_ext_profile_image_shape: 1,
                skip_status: 1,
                user_id: uid
            }).toString()
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

const postLike = async (ctx = { cookie: {}, tweet_id: '', like: true }, env = {}) => {
    let { cookie, tweet_id, like } = preCheckCtx(ctx, { cookie: {}, tweet_id: '', like: true })
    //cookie: {ct0, auth_token}

    return await new Promise((resolve, reject) => {
        coreFetch(
            TW_WEBAPI_PREFIX + '/graphql/' + (like ? _FavoriteTweet.queryId + '/FavoriteTweet' : _UnfavoriteTweet.queryId + '/UnfavoriteTweet'),
            {},
            cookie,
            1,
            {},
            JSON.stringify({
                variables: { tweet_id },
                features: like ? _FavoriteTweet.features : _UnfavoriteTweet.features,
                queryId: like ? _FavoriteTweet.queryId : _UnfavoriteTweet.queryId
            })
        )
            .then((response) => {
                resolve(response)
            })
            .catch((e) => {
                reject(e)
            })
    })
}

//ANONYMOUS
export {
    axios as AxiosFetch,
    generateCsrfToken,
    preCheckCtx,
    getToken,
    coreFetch,
    getUserInfo,
    getVerifiedAvatars,
    getRecommendations,
    getMediaTimeline,
    getTweets,
    getConversation,
    getEditHistory,
    getPollResult,
    getAudioSpace,
    getBroadcast,
    getLiveVideoStream,
    getTypeahead,
    getArticle,
    getListInfo,
    getListMember,
    getListTimeLine,
    getCommunityInfo,
    getCommunityTweetsTimeline,
    getCommunitySearch,
    getTranslate,
    getTrends,
    getImage,
    Authorization
}
//COOKIE
export {
    getFollowingOrFollowers,
    postFlowTask,
    getViewer,
    postLogout,
    getJsInstData,
    uploadMedia,
    postTweet,
    postConversationControl,
    postPinTweet,
    postRetweet,
    postBookmark,
    postDeleteTweet,
    postHomeTimeLine,
    getBookmark,
    getLikes,
    getTweetAnalytics,
    postFollow,
    postLike
}
