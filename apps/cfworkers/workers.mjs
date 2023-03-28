import { Router } from 'itty-router'
import { ApiUserInfo } from './CoreFunctions/online/OnlineUserInfo.mjs'
import { ApiAudioSpace, ApiBroadcast, ApiMedia, ApiPoll, ApiSearch, ApiTweets } from './CoreFunctions/online/OnlineTweet.mjs'
import { AlbumSearch } from './CoreFunctions/album/Album.mjs'
import { json } from './share.mjs'
import { ApiTrends } from './CoreFunctions/online/OnlineTrends.mjs'
import { apiTemplate } from '../../libs/share/Constant.mjs'
import { MediaProxy } from './CoreFunctions/media/MediaProxy.mjs'

const workersApi = Router()
//TODO just use one type
//const guest_token = new GuestToken
//const guest_token2 = new GuestToken
//
//guest_token.updateGuestToken(0)
//guest_token2.updateGuestToken(1)

//TODO middleware
const getToken = (req) => {
    req.guest_token = {token: {}}//new GuestToken
    req.guest_token2 = {token: {}}//new GuestToken
    //req.guest_token.updateGuestToken(0)
    //req.guest_token2.updateGuestToken(1)
}

workersApi.all('*', getToken)

//favicon
workersApi.all('/favicon.ico', () => new Response(null, {status: 200}))

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

//online search
workersApi.get('/online/api/v3/data/hashtag/', (req) => {req.type = 'hashtag'}, ApiSearch)
workersApi.get('/online/api/v3/data/cashtag/', (req) => {req.type = 'cashtag'}, ApiSearch)
workersApi.get('/online/api/v3/data/search/', (req) => {req.type = 'search'}, ApiSearch)

//media
//media proxy
workersApi.get('/media/proxy/:link+', (req) => {req.type = 'media'}, MediaProxy)
workersApi.get('/amplify_video/:link+', (req) => {req.type = 'amplify_video'}, MediaProxy)
workersApi.get('/ext_tw_video/:link+', (req) => {req.type = 'ext_tw_video'}, MediaProxy)//for m3u8

workersApi.all('*', () => new Response(JSON.stringify(apiTemplate(403, 'Invalid Request', {}, 'global_api')), {status: 403}))

export default {
    fetch: (...args) => workersApi.handle(...args).then(response => {
      response.headers.set('Access-Control-Allow-Origin', '*') // and other CORS headers
      return response
    }).catch(() => new Response(JSON.stringify(apiTemplate(500, 'Unknown error', {}, 'global_api')), {status: 500}))
}