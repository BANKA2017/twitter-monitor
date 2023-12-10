import express from 'express'
import { ApiUserInfo } from '../CoreFunctions/online/OnlineUserInfo.mjs'
import { ApiTweets, ApiSearch, ApiPoll, ApiAudioSpace, ApiMedia, ApiBroadcast } from '../CoreFunctions/online/OnlineTweet.mjs'
import { apiTemplate } from '../../../libs/share/Constant.mjs'
import { ApiTrends } from '../CoreFunctions/online/OnlineTrends.mjs'
import { ApiCommunityInfo, ApiCommunitySearch, ApiListInfo, ApiListMemberList, ApiTypeahead } from '../CoreFunctions/online/OnlineMisc.mjs'
import { ApiLoginFlow, ApiLogout } from '../CoreFunctions/online/OnlineLogin.mjs'
import cookieParser from 'cookie-parser'
import { Log } from '../../../libs/core/Core.function.mjs'

const online = express()
online.use(cookieParser())
online.use(async (req, res, next) => {
    if (global.dbmode) {
        res.json(apiTemplate(403, 'DB Mode is not included onlone api'))
        return
    }
    //await global.guest_token2.updateGuestToken(0)
    await req.env.guest_token2_handle.updateGuestToken(4)
    await req.env.guest_token3_handle.openAccountInit(req.env.guest_accounts[Math.floor(Math.random() * req.env.guest_accounts.length)])
    //if (global.guest_token2.token.nextActiveTime) {
    //    Log(false, 'error', `[${new Date()}]: #Online #GuestToken #429 Wait until ${global.guest_token2.token.nextActiveTime}`)
    //    res.json(apiTemplate(429, `Wait until ${global.guest_token2.token.nextActiveTime}`))
    //} else
    if (req.env.guest_token2_handle.token.nextActiveTime) {
        Log(false, 'error', `[${new Date()}]: #Online #GuestToken #429 Wait until ${req.env.guest_token2_handle.token.nextActiveTime}`)
        res.json(apiTemplate(429, `Wait until ${req.env.guest_token2_handle.token.nextActiveTime}`))
    } else {
        req.env.guest_token2 = req.env.guest_token2_handle.token
        req.env.guest_token3 = req.env.guest_token3_handle.token
        next()
    }
})

// online api
online.get('/data/accounts/', (req, res) => {
    res.json(apiTemplate(200, 'OK'))
})
online.get('/data/userinfo/', async (req, res) => {
    const _res = await ApiUserInfo(req, req.env)
    res.json(_res.data)
})
online.get('/data/tweets/', async (req, res) => {
    const _res = await ApiTweets(req, req.env)
    if (_res.format === 'xml') {
        res.append('content-type', 'application/xml;charset=UTF-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.send(_res.data)
    } else {
        res.json(_res.data)
    }
})
online.get('/data/chart/', (req, res) => {
    res.json(apiTemplate(200, 'No record found', []))
})
online.get(/^\/data\/(hashtag|cashtag|search)(\/|)$/, async (req, res) => {
    req.type = req.params[0] || ''
    const _res = await ApiSearch(req, req.env)
    if (_res.format === 'xml') {
        res.append('content-type', 'application/xml;charset=UTF-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.send(_res.data)
    } else {
        res.json(_res.data)
    }
    //res.json(apiTemplate(404, 'Search endpoint is not yet avaliable', {}, 'online'))
})
online.get('/data/poll/', async (req, res) => {
    const _res = await ApiPoll(req, req.env)
    res.json(_res.data)
})
online.get('/data/audiospace/', async (req, res) => {
    const _res = await ApiAudioSpace(req, req.env)
    res.json(_res.data)
})
online.get('/data/broadcast/', async (req, res) => {
    const _res = await ApiBroadcast(req, req.env)
    res.json(_res.data)
})
online.get('/data/media/', async (req, res) => {
    const _res = await ApiMedia(req, req.env)
    res.json(_res.data)
})
online.get('/data/trends/', async (req, res) => {
    const _res = await ApiTrends(req, req.env)
    res.json(_res.data)
})
online.get('/data/typeahead/', async (req, res) => {
    const _res = await ApiTypeahead(req, req.env)
    res.json(_res.data)
})
online.get('/data/listinfo/', async (req, res) => {
    const _res = await ApiListInfo(req, req.env)
    res.json(_res.data)
})
online.get('/data/listmember/', async (req, res) => {
    const _res = await ApiListMemberList(req, req.env)
    res.json(_res.data)
})
online.get('/data/communityinfo/', async (req, res) => {
    const _res = await ApiCommunityInfo(req, req.env)
    res.json(_res.data)
})
online.get('/data/communitysearch/', async (req, res) => {
    const _res = await ApiCommunitySearch(req, req.env)
    res.json(_res.data)
})

// cookie required

online.post('/account/taskflow/', async (req, res) => {
    req.postBody = new Map(Object.entries(req.body))
    //Log(false, 'log', req.body)
    const _res = await ApiLoginFlow(req, req.env)
    for (const header of [..._res.headers]) {
        res.append(header[0], header[1])
    }
    res.json(_res.data)
})

online.post('/account/logout/', async (req, res) => {
    const _res = await ApiLogout(req, req.env)
    for (const header of [..._res.headers]) {
        res.append(header[0], header[1])
    }
    res.json(_res.data)
})

export default online
