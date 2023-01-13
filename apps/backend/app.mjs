import express from 'express'
import { ACTIVE_SERVICE, EXPRESS_ALLOW_ORIGIN, EXPRESS_PORT, STATIC_PATH } from '../../assets/setting.mjs'
import { GuestToken } from '../../src/core/Core.function.mjs'
import { apiTemplate, basePath } from '../../src/share/Constant.mjs'
import { LanguageIdentification } from '../../packages/fasttext/language.mjs'
//Online api
import { MediaProxy } from './CoreFunctions/media/MediaProxy.mjs'
import online from './service/online.mjs'
import album from './service/album.mjs'
import translate from './service/translate.mjs'
//import bot from './service/bot.mjs'

const app = express()
const media = express()
const port = EXPRESS_PORT

app.use(express.urlencoded({extended: false}))
app.use(express.json())

global.dbmode = (process.argv[2] || '') === 'dbmode'

app.use((req, res, next) => {
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
//app.use('/bot/', bot)

media.use((req, res, next) => {
    if (global.dbmode) {
        res.json(apiTemplate(403, 'DB Mode is not included media proxy api'))
        return
    }
    next()
})

//get init token
global.guest_token = new GuestToken
global.guest_token2 = new GuestToken
if (!global.dbmode) {
    await global.guest_token.updateGuestToken(0)
    await global.guest_token2.updateGuestToken(1)
}

//LanguageIdentification
global.LanguageIdentification = new LanguageIdentification
console.log('tmv3: Enabled language identification service')

//media proxy
media.use('/cache', express.static(basePath + '/../apps/backend/cache', {
    setHeaders: function (res, path, stat) {
      res.set('X-TMCache', 1)
    }
}))
media.get(/(proxy)\/(.*)/, MediaProxy)
app.get(/^\/(ext_tw_video|amplify_video)\/(.*)/, MediaProxy)//for m3u8

//global static file
if (STATIC_PATH) {
    app.use('/static', express.static(STATIC_PATH))
}

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
