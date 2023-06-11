import express from 'express'
import { ACTIVE_SERVICE, EXPRESS_ALLOW_ORIGIN, EXPRESS_PORT, STATIC_PATH } from '../../libs/assets/setting.mjs'
import { GuestToken } from '../../libs/core/Core.function.mjs'
import { apiTemplate } from '../../libs/share/Constant.mjs'
import { basePath } from "../../libs/share/NodeConstant.mjs"
import { LanguageIdentification } from '../../packages/fasttext/language.mjs'
//Online api
import { MediaProxy } from './CoreFunctions/media/MediaProxy.mjs'
import online from './service/online.mjs'
import album from './service/album.mjs'
import translate from './service/translate.mjs'
//Bot api
//import bot from './service/bot.mjs'
import { json, updateGuestToken, ResponseWrapper, mediaExistPreCheck, mediaCacheSave } from './share.mjs'

const app = express()
const media = express()
const port = EXPRESS_PORT

app.use(express.urlencoded({extended: false}))
app.use(express.json())

global.dbmode = (process.argv[2] || '') === 'dbmode'

//get init token
global.guest_token = new GuestToken
//if (!global.dbmode) {
//    //await global.guest_token.updateGuestToken(0)
//    await global.guest_token2.updateGuestToken(1)
//}

app.use((req, res, next) => {
    
    req.env = {
        json,
        updateGuestToken,
        ResponseWrapper,
        mediaExistPreCheck,
        mediaCacheSave,
        guest_token2_handle: global.guest_token,
        guest_token2: {}
    }

    res.set('X-Powered-By', 'Twitter Monitor Api')
    if (EXPRESS_ALLOW_ORIGIN) {
        res.append('Access-Control-Allow-Origin', [EXPRESS_ALLOW_ORIGIN])
    }
    res.append('Access-Control-Allow-Methods', 'GET')
    res.append('Access-Control-Allow-Headers', 'Content-Type')
    next()
})

//local api
if (ACTIVE_SERVICE.includes('tmv1')) {
    const {default: legacy} = await import('./service/legacy.mjs')
    app.use('/api/v1', legacy)
}
if (ACTIVE_SERVICE.includes('twitter_monitor')) {
    const {default: local} = await import('./service/local.mjs')
    app.use('/api/v3', local)
}

//translate api
app.use('/translate', translate)

//proxy api
app.use('/online/api/v3', online)
app.use('/album', album)
app.use('/media', media)
//app.use('/bot', bot)

media.use((req, res, next) => {
    if (global.dbmode) {
        res.json(apiTemplate(403, 'DB Mode is not included media proxy api'))
        return
    }
    next()
})

//LanguageIdentification
global.LanguageIdentification = new LanguageIdentification
console.log('tmv3: Enabled language identification service')

//media proxy
media.use('/cache', express.static(basePath + '/../apps/backend/cache', {
    setHeaders: function (res, path, stat) {
      res.set('X-TMCache', 1)
    }
}))
media.get(/(proxy)\/(.*)/, async (req, res) => {
    req.params.link = req.params?.[1] || ''
    const _res = await MediaProxy(req, req.env)
    for (const header of Object.entries(_res.headers)) {
        res.setHeader(header[0], header[1])
    }
    switch (_res.status) {
        case 301:
        case 302:
        case 307:
            res.status(_res.status).redirect(_res.data)
            break
        case 200:
            res.send(_res.data)
            break
        default:
            res.status(_res.status).end()
    }
})
app.get(/^\/(ext_tw_video|amplify_video)\/(.*)/, async (req, res) => {
    req.params.link = req.params?.[1] || ''
    const _res = await MediaProxy(req, req.env)
    for (const header of Object.entries(_res.headers)) {
        res.setHeader(header[0], header[1])
    }
    switch (_res.status) {
        case 301:
        case 302:
        case 307:
            res.status(_res.status).redirect(_res.data)
            break
        case 200:
            res.status(200).send(_res.data)
            break
        default:
            res.status(_res.status).end()
    }
})//for m3u8

//global static file
if (STATIC_PATH) {
    app.use('/static', express.static(STATIC_PATH))
}

//robots.txt
app.all('/robots.txt', (req, res) => {res.type('txt').send("User-agent: *\nDisallow: /*")})


//error control
app.all('*', (req, res) => {
    res.status(403).json(apiTemplate(403, 'Invalid Request', {}, 'global_api'))
})
app.use((err, req, res, next) => {
    console.error(new Date(), err)
    res.status(500).json(apiTemplate(500, 'Unknown error', {}, 'global_api'))
})
app.listen(port, () => {
  console.log(`V3Api listening on port ${port}`)
})