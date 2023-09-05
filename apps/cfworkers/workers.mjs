import { Router } from 'itty-router'
import { PostBodyParser, ResponseWrapper, json, xml, mediaCacheSave, mediaExistPreCheck, updateGuestToken } from './share.mjs'
import { apiTemplate } from '../../libs/share/Constant.mjs'
import { AlbumSearch } from '../backend/CoreFunctions/album/Album.mjs'
import { ApiOfficialTranslate, ApiTranslate } from '../backend/CoreFunctions/translate/OnlineTranslate.mjs'
import { ApiTrends } from '../backend/CoreFunctions/online/OnlineTrends.mjs'
import { ApiCommunityInfo, ApiCommunitySearch, ApiListInfo, ApiListMemberList, ApiTypeahead } from '../backend/CoreFunctions/online/OnlineMisc.mjs'
import { ApiUserInfo } from '../backend/CoreFunctions/online/OnlineUserInfo.mjs'
import { ApiAudioSpace, ApiBroadcast, ApiMedia, ApiPoll, ApiSearch, ApiTweets } from '../backend/CoreFunctions/online/OnlineTweet.mjs'
import { MediaProxy } from '../backend/CoreFunctions/media/MediaProxy.mjs'
import { ApiLoginFlow, ApiLogout } from '../backend/CoreFunctions/online/OnlineLogin.mjs'
import { GuestToken, Log } from '../../libs/core/Core.function.mjs'

const workersApi = Router()

// middleware
const updateToken = async (req, env) => {
    const parseRequest = new URL(req.url)
    if (['/favicon.ico', '/robots.txt'].includes(parseRequest.pathname)) {
        return
    } else if (parseRequest.pathname.startsWith('/media/') || parseRequest.pathname.startsWith('/amplify_video/') || parseRequest.pathname.startsWith('/ext_tw_video/')) {
        return
    } else {
        env.guest_token2 = JSON.parse((await env.kv.get('guest_token2')) ?? '{}') //new GuestToken
        env.guest_accounts = JSON.parse((await env.kv.get('guest_accounts')) ?? '[]') //GuestAccount list

        env.guest_token3 = (new GuestToken('android')).openAccountInit(env.guest_accounts[Math.floor(Math.random()*env.guest_accounts.length)]).token
        if (!env.guest_token2?.token || env.guest_token2.expire < Date.now) {
            env.guest_token2 = await updateGuestToken(env, 'guest_token2', 4, true)
        }
    }
}

workersApi.all('*', async (req, env) => {
    await updateToken(req, env)
    env.json = json
    env.xml = xml
    env.updateGuestToken = updateGuestToken
    env.ResponseWrapper = ResponseWrapper
    env.mediaExistPreCheck = mediaExistPreCheck
    env.mediaCacheSave = mediaCacheSave
    env.PostBodyParser = PostBodyParser
    env.audio_apsce_cache = {}
    req.cookies = Object.fromEntries(
        (req.headers.get('cookie') || '')
            .split(';')
            .map((cookie) => cookie.trim().split('='))
            .filter((cookie) => cookie.length === 2)
    )
})

//favicon
workersApi.all('/favicon.ico', () => new Response(null, { status: 200 }))

//robots.txt
workersApi.all('/robots.txt', () => new Response('User-agent: *\nDisallow: /*', { status: 200 }))

//album
workersApi.get('/album/data/userinfo/', ApiUserInfo)
workersApi.get('/album/data/tweets/', ApiTweets)
workersApi.get('/album/data/list/', AlbumSearch)

//online
workersApi.get('/online/api/v3/data/accounts/', (req, env) => {
    return json(apiTemplate(200, 'OK'))
})
workersApi.get('/online/api/v3/data/userinfo/', ApiUserInfo)
workersApi.get('/online/api/v3/data/tweets/', ApiTweets)
workersApi.get('/online/api/v3/data/chart/', (req, env) => {
    return json(apiTemplate(200, 'No record found', []))
})
workersApi.get('/online/api/v3/data/poll/', ApiPoll)
workersApi.get('/online/api/v3/data/audiospace/', ApiAudioSpace)
workersApi.get('/online/api/v3/data/broadcast/', ApiBroadcast)
workersApi.get('/online/api/v3/data/media/', ApiMedia)
workersApi.get('/online/api/v3/data/trends/', ApiTrends)
workersApi.get('/online/api/v3/data/typeahead/', ApiTypeahead)
workersApi.get('/online/api/v3/data/listinfo/', ApiListInfo)
workersApi.get('/online/api/v3/data/listmember/', ApiListMemberList)
workersApi.get('/online/api/v3/data/communityinfo/', ApiCommunityInfo)
workersApi.get('/online/api/v3/data/communitysearch/', ApiCommunitySearch)

//online search
workersApi.get(
    '/online/api/v3/data/hashtag/',
    (req) => {
        req.type = 'hashtag'
    },
    ApiSearch
    //() => ResponseWrapper(apiTemplate(404, 'Search endpoint is not yet avaliable', {}, 'online'))
)
workersApi.get(
    '/online/api/v3/data/cashtag/',
    (req) => {
        req.type = 'cashtag'
    },
    ApiSearch
    //() => ResponseWrapper(apiTemplate(404, 'Search endpoint is not yet avaliable', {}, 'online'))
)
workersApi.get(
    '/online/api/v3/data/search/',
    (req) => {
        req.type = 'search'
    },
    ApiSearch
    //() => ResponseWrapper(apiTemplate(404, 'Search endpoint is not yet avaliable', {}, 'online'))
)

//translator
workersApi.post(
    '/translate/online/',
    async (req) => {
        PostBodyParser(req, new Map([['text', '']]))
    },
    ApiTranslate
)
workersApi.get('/translate/', ApiOfficialTranslate)

//media
//media proxy
workersApi.get(
    '/media/proxy/:link+',
    (req) => {
        req.type = 'media'
    },
    MediaProxy
)
workersApi.get(
    '/amplify_video/:link+',
    (req) => {
        req.type = 'amplify_video'
    },
    MediaProxy
)
workersApi.get(
    '/ext_tw_video/:link+',
    (req) => {
        req.type = 'ext_tw_video'
    },
    MediaProxy
) //for m3u8

// account
workersApi.post(
    '/online/api/v3/account/taskflow/',
    (req) => {
        env.PostBodyParser(req)
    },
    ApiLoginFlow
)
workersApi.post('/online/api/v3/account/logout/', ApiLogout)

workersApi.all('*', () => new Response(JSON.stringify(apiTemplate(403, 'Invalid Request', {}, 'global_api')), { status: 403 }))

export default {
    fetch: (req, env, ...args) =>
        workersApi
            .handle(req, env, ...args)
            .then((res) => {
                const WORKERS_ALLOW_ORIGIN = env.WORKERS_ALLOW_ORIGIN || []
                if (WORKERS_ALLOW_ORIGIN) {
                    const referer = req.headers.get('referer')
                    if (referer) {
                        const origin = new URL(referer).origin
                        const tmpReferer = WORKERS_ALLOW_ORIGIN.includes('*') ? '*' : WORKERS_ALLOW_ORIGIN.includes(origin) ? origin : ''
                        if (tmpReferer) {
                            res.headers.set('Access-Control-Allow-Origin', tmpReferer)
                        }
                    }
                }
                res.headers.set('X-Powered-By', 'Twitter Monitor Api')
                res.headers.set('Access-Control-Allow-Methods', '*')
                res.headers.set('Access-Control-Allow-Credentials', 'true')
                return res
            })
            .catch((e) => {
                Log(false, 'log', e)
                return new Response(JSON.stringify(apiTemplate(500, 'Unknown error', {}, 'global_api')), { status: 500 })
            })
}
