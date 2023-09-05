import express from 'express'

import { ApiUserInfo } from '../CoreFunctions/online/OnlineUserInfo.mjs'
import { ApiTweets } from '../CoreFunctions/online/OnlineTweet.mjs'
import { AlbumSearch } from '../CoreFunctions/album/Album.mjs'
import { apiTemplate } from '../../../libs/share/Constant.mjs'
import { Log } from '../../../libs/core/Core.function.mjs'

const album = express()

album.use(async (req, res, next) => {
    if (global.dbmode) {
        res.json(apiTemplate(403, 'DB Mode is not included album api'))
        return
    }
    await req.env.guest_token2_handle.updateGuestToken(4)
    await req.env.guest_token3_handle.openAccountInit(req.env.guest_accounts[Math.floor(Math.random()*req.env.guest_accounts.length)])
    if (req.env.guest_token2_handle.token.nextActiveTime) {
        Log(false, 'error', `[${new Date()}]: #Album #GuestToken #429 Wait until ${req.env.guest_token2_handle.token.nextActiveTime}`)
        res.json(apiTemplate(429, `Wait until ${req.env.guest_token2_handle.token.nextActiveTime}`), {}, 'album')
    } else {
        req.env.guest_token2 = req.env.guest_token2_handle.token
        req.env.guest_token3 = req.env.guest_token3_handle.token
        next()
    }
})

//album
album.get('/data/userinfo/', async (req, res) => {
    const _res = await ApiUserInfo(req, req.env)
    res.status(_res.status).json(_res.data)
})
album.get('/data/tweets/', async (req, res) => {
    const _res = await ApiTweets(req, req.env)
    res.status(_res.status).json(_res.data)
})
album.get('/data/list/', async (req, res) => {
    const _res = await AlbumSearch(req, req.env)
    res.status(_res.status).json(_res.data)
})

export default album
