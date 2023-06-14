import express from 'express'
import { GuestToken } from '../../libs/core/Core.function.mjs'
import { apiTemplate } from '../../libs/share/Constant.mjs'
import { basePath } from "../../libs/share/NodeConstant.mjs"
//import { LanguageIdentification } from '../../packages/fasttext/language.mjs'
//Online api
import { MediaProxy } from './CoreFunctions/media/MediaProxy.mjs'
import online from './service/online.mjs'
import album from './service/album.mjs'
//Bot api
//import bot from './service/bot.mjs'
import { json, updateGuestToken, ResponseWrapper, mediaExistPreCheck, mediaCacheSave } from './share.mjs'
import { existsSync } from 'fs'
import { ApiTranslate } from './CoreFunctions/translate/OnlineTranslate.mjs'

//settings
let settingsFile = basePath + '/assets/setting.mjs'

let EXPRESS_PORT = 3000
let EXPRESS_ALLOW_ORIGIN = '*'
let ACTIVE_SERVICE = []

for (const argvContent of process.argv.slice(2)) {
    if (argvContent.startsWith('--config=')) {
        settingsFile = argvContent.replace('--config=', '')
    } else if (argvContent === '--noSettings') {
        settingsFile = ''
    }
}

if (settingsFile && existsSync(settingsFile)) {
    const settings = await import(settingsFile)
    EXPRESS_PORT = settings.EXPRESS_PORT
    EXPRESS_ALLOW_ORIGIN = settings.EXPRESS_ALLOW_ORIGIN
    ACTIVE_SERVICE = settings.ACTIVE_SERVICE
}

const app = express()
const media = express()
const port = EXPRESS_PORT

app.use(express.urlencoded({extended: false}))
app.use(express.json())

//get init token
global.guest_token = new GuestToken

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

const translate = express()
translate.post('/online/', async (req, res) => {
    req.postBody = new Map(Object.entries(req.body))
    const _res = await ApiTranslate(req, req.env)
    res.json(_res.data)
})

//translate api
app.use('/translate', translate)

//proxy api
app.use('/online/api/v3', online)
app.use('/album', album)
app.use('/media', media)
//app.use('/bot', bot)

//LanguageIdentification
//global.LanguageIdentification = new LanguageIdentification
//console.log('tmv3: Enabled language identification service')

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
