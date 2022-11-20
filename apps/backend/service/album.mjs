import express from 'express'

import {ApiUserInfo} from '../CoreFunctions/online/OnlineUserInfo.mjs'
import {ApiTweets} from '../CoreFunctions/online/OnlineTweet.mjs'
import {AlbumSearch} from '../CoreFunctions/album/Album.mjs'

const album = express()

album.use(async (req, res, next) => {
    if (global.dbmode) {
        res.json(apiTemplate(403, 'DB Mode is not included album api'))
        return
    }
    await global.guest_token.updateGuestToken()
    if (global.guest_token.token.nextActiveTime) {
        console.error(`[${new Date()}]: #Album #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
        res.json(apiTemplate(429, `Wait until ${global.guest_token.token.nextActiveTime}`), {}, 'album')
    } else {
        next()
    }
})

//album
album.get('/data/userinfo/', ApiUserInfo)
album.get('/data/tweets/', ApiTweets)
album.get('/data/list/', AlbumSearch)

export default album