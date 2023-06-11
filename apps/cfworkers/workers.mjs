import { Router } from 'itty-router'
import { ResponseWrapper, json, mediaCacheSave, mediaExistPreCheck, updateGuestToken } from './share.mjs'
import { apiTemplate } from '../../libs/share/Constant.mjs'
import { AlbumSearch } from '../backend/CoreFunctions/album/Album.mjs'
import { ApiOfficialTranslate, ApiTranslate } from '../backend/CoreFunctions/translate/OnlineTranslate.mjs'
import { ApiTrends } from '../backend/CoreFunctions/online/OnlineTrends.mjs'
import { ApiListInfo, ApiListMemberList, ApiTypeahead } from '../backend/CoreFunctions/online/OnlineMisc.mjs'
import { ApiUserInfo } from '../backend/CoreFunctions/online/OnlineUserInfo.mjs'
import { ApiAudioSpace, ApiBroadcast, ApiMedia, ApiPoll, ApiSearch, ApiTweets } from '../backend/CoreFunctions/online/OnlineTweet.mjs'
import { MediaProxy } from '../backend/CoreFunctions/media/MediaProxy.mjs'

const workersApi = Router()

// middleware
const updateToken = async (req, env) => {
    if ((new URL(req.url)).pathname === '/favicon.ico') {return}
    //req.guest_token = JSON.parse((await env.kv.get('guest_token'))??'{}')// { token: {} }//new GuestToken
    env.guest_token2 = JSON.parse((await env.kv.get('guest_token2'))??'{}')//new GuestToken
    //if (!req.guest_token?.token || req.guest_token.expire < Date.now) {
    //    req.guest_token = await updateGuestToken(env, 'guest_token', 0, true)
    //}
    if (!env.guest_token2?.token || env.guest_token2.expire < Date.now) {
        env.guest_token2 = await updateGuestToken(env, 'guest_token2', 1, true)
    }
}

workersApi.all('*', (req, env) => {
    updateToken(req, env)
    env.json = json
    env.updateGuestToken = updateGuestToken
    env.ResponseWrapper = ResponseWrapper
    env.mediaExistPreCheck = mediaExistPreCheck
    env.mediaCacheSave = mediaCacheSave
})

//favicon
workersApi.all('/favicon.ico', () => new Response(null, { status: 200 }))

//robots.txt
workersApi.all('/robots.txt', () => new Response("User-agent: *\nDisallow: /*", { status: 200 }))

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


//online search
workersApi.get('/online/api/v3/data/hashtag/', (req) => { req.type = 'hashtag' }, ApiSearch)
workersApi.get('/online/api/v3/data/cashtag/', (req) => { req.type = 'cashtag' }, ApiSearch)
workersApi.get('/online/api/v3/data/search/', (req) => { req.type = 'search' }, ApiSearch)

//translator
workersApi.post('/translate/online/', async (req) => {
    if (req.body) {
        const reader = req.body.getReader();
        const pipe = []
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            pipe.push(value)
        }
        //https://gist.github.com/72lions/4528834
        let offset = 0
        let body = new Uint8Array(pipe.reduce((acc, cur) => acc + cur.byteLength, 0))
        for (const chunk of pipe) {
            body.set(new Uint8Array(chunk), offset)
            offset += chunk.byteLength
        }
        req.postBody = new URLSearchParams((new TextDecoder("utf-8")).decode(body))
    } else {
        req.postBody = new Map([['text', '']])
    }
}, ApiTranslate)
workersApi.get('/translate/', ApiOfficialTranslate)

//media
//media proxy
workersApi.get('/media/proxy/:link+', (req) => { req.type = 'media' }, MediaProxy)
workersApi.get('/amplify_video/:link+', (req) => { req.type = 'amplify_video' }, MediaProxy)
workersApi.get('/ext_tw_video/:link+', (req) => { req.type = 'ext_tw_video' }, MediaProxy)//for m3u8

workersApi.all('*', () => new Response(JSON.stringify(apiTemplate(403, 'Invalid Request', {}, 'global_api')), { status: 403 }))

export default {
    fetch: (...args) => workersApi.handle(...args).then(response => {
        response.headers.set('Access-Control-Allow-Origin', '*') // and other CORS headers
        return response
    }).catch((e) => {
        console.log(e)
        return new Response(JSON.stringify(apiTemplate(500, 'Unknown error', {}, 'global_api')), { status: 500 })
    })
}