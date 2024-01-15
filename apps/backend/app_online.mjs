import express from 'express'
import { Log, GuestToken, GuestAccount } from '../../libs/core/Core.function.mjs'
import { apiTemplate } from '../../libs/share/Constant.mjs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import { loadModule } from 'cld3-asm'
//Online api
import { MediaProxy } from './CoreFunctions/media/MediaProxy.mjs'
import online from './service/online.mjs'
import album from './service/album.mjs'
//Bot api
//import bot from './service/bot.mjs'
import { json, xml, updateGuestToken, ResponseWrapper, mediaExistPreCheck, mediaCacheSave } from './share.mjs'
import { existsSync } from 'fs'
import { ApiTranslate } from './CoreFunctions/translate/OnlineTranslate.mjs'

//settings
let settingsFile = basePath + '/assets/setting.mjs'

let EXPRESS_PORT = 3000
let EXPRESS_ALLOW_ORIGIN = ['*']
let ACTIVE_SERVICE = []
let GUEST_ACCOUNT_HANDLE = new GuestAccount()
let AUDIO_SPACE_CACHE = {}

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
    if (settings.GUEST_ACCOUNT_HANDLE && Array.isArray(settings.GUEST_ACCOUNT_HANDLE) && settings.GUEST_ACCOUNT_HANDLE.length > 0) {
        GUEST_ACCOUNT_HANDLE.AddNewAccounts(false, settings.GUEST_ACCOUNT_HANDLE)
    }
    if (settings.GUEST_ACCOUNT_POOL && settings.GUEST_ACCOUNT_POOL_TOKEN) {
        GUEST_ACCOUNT_HANDLE.UpdatePoolLink(`${settings.GUEST_ACCOUNT_POOL}/data/random?count=5&key=${settings.GUEST_ACCOUNT_POOL_TOKEN}`)
    }
}

// guest accounts
if (existsSync(basePath + '/../guest_accounts.json')) {
    GUEST_ACCOUNT_HANDLE.AddNewAccounts(false, JSON.parse(readFileSync(basePath + '/../guest_accounts.json').toString()))
} else if (existsSync(resolve('.') + '/guest_accounts.json')) {
    GUEST_ACCOUNT_HANDLE.AddNewAccounts(false, JSON.parse(readFileSync(resolve('.') + '/guest_accounts.json').toString()))
}

// get guest account from guest account pool
if (GUEST_ACCOUNT_HANDLE.Link) {
    await GUEST_ACCOUNT_HANDLE.GetNewAccountsByRemote(true)
    setInterval(async () => {
        await GUEST_ACCOUNT_HANDLE.GetNewAccountsByRemote(true)
        GUEST_ACCOUNT_HANDLE.RemoveUselessAccounts()
    }, 1000 * 60 * 60) // per hour
}

// audio space cache
if (existsSync(`${basePath}/../apps/backend/cache/_audio_apsce_cache.json`)) {
    try {
        AUDIO_SPACE_CACHE = JSON.parse(readFileSync(`${basePath}/../apps/backend/cache/_audio_apsce_cache.json`).toString())
    } catch (e) {
        Log(false, 'log', `tmv3: Unable to read audio space cache`)
    }
}

const app = express()
const media = express()
const port = EXPRESS_PORT

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

//get init token

// userinfo, tweet_result_by_id, broadcast, live_stream, following, followers, onbroading
global.guest_token = new GuestToken(4)

// others
global.guest_token3 = new GuestToken('android')

app.use((req, res, next) => {
    req.env = {
        json,
        xml,
        updateGuestToken,
        ResponseWrapper,
        mediaExistPreCheck,
        mediaCacheSave,
        guest_token2_handle: global.guest_token,
        guest_token2: {},
        guest_token3_handle: global.guest_token3,
        guest_token3: {},
        guest_accounts: GUEST_ACCOUNT_HANDLE,
        audio_apsce_cache: AUDIO_SPACE_CACHE
    }

    res.setHeader('X-Powered-By', 'Twitter Monitor Api')
    if (EXPRESS_ALLOW_ORIGIN && req.headers.referer) {
        const origin = new URL(req.headers.referer).origin
        const tmpReferer = EXPRESS_ALLOW_ORIGIN.includes('*') ? '*' : EXPRESS_ALLOW_ORIGIN.includes(origin) ? origin : ''
        if (tmpReferer) {
            res.append('Access-Control-Allow-Origin', tmpReferer)
        }
    }
    res.append('Access-Control-Allow-Methods', '*')
    res.append('Access-Control-Allow-Credentials', 'true')
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
global.LanguageIdentification = await loadModule()
Log(false, 'log', 'tmv3: Enabled language identification service')

//media proxy
media.use(
    '/cache',
    express.static(basePath + '/../apps/backend/cache', {
        setHeaders: function (res, path, stat) {
            res.set('X-TMCache', 1)
        }
    })
)

//global static file
// TODO static path
//if (STATIC_PATH) {
//    app.use('/static', express.static(STATIC_PATH))
//}

media.get(/(proxy)\/(.*)/, async (req, res) => {
    req.params.link = req.params?.[1] || ''
    const _res = await MediaProxy(req, req.env)
    for (const header of [..._res.headers]) {
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
    for (const header of [..._res.headers]) {
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
}) //for m3u8

//robots.txt
app.all('/robots.txt', (req, res) => {
    res.type('txt').send('User-agent: *\nDisallow: /*')
})

//error control
app.all('*', (req, res) => {
    res.status(403).json(apiTemplate(403, 'Invalid Request', {}, 'global_api'))
})
app.use((err, req, res, next) => {
    Log(false, 'error', new Date(), err)
    res.status(500).json(apiTemplate(500, 'Unknown error', {}, 'global_api'))
})
app.listen(port, () => {
    Log(false, 'log', `V3Api listening on port ${port}`)
})
