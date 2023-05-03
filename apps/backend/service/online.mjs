import express from 'express'
import {ApiUserInfo} from '../CoreFunctions/online/OnlineUserInfo.mjs'
import {ApiTweets, ApiSearch, ApiPoll, ApiAudioSpace, ApiMedia, ApiBroadcast} from '../CoreFunctions/online/OnlineTweet.mjs'
import { apiTemplate } from '../../../libs/share/Constant.mjs'
import { ApiTrends } from '../CoreFunctions/online/OnlineTrends.mjs'
import { ApiTypeahead } from '../CoreFunctions/online/OnlineMisc.mjs'

const online = express()
online.use(async (req, res, next) => {
    if (global.dbmode) {
        res.json(apiTemplate(403, 'DB Mode is not included onlone api'))
        return
    }
    await global.guest_token.updateGuestToken(0)
    await global.guest_token2.updateGuestToken(1)
    if (global.guest_token.token.nextActiveTime) {
        console.error(`[${new Date()}]: #Online #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
        res.json(apiTemplate(429, `Wait until ${global.guest_token.token.nextActiveTime}`))
    } else if (global.guest_token2.token.nextActiveTime) {
        console.error(`[${new Date()}]: #Online #GuestToken #429 Wait until ${global.guest_token2.token.nextActiveTime}`)
        res.json(apiTemplate(429, `Wait until ${global.guest_token2.token.nextActiveTime}`))
    } else {
        next()
    }
})

// online api
online.get('/data/accounts/', (req, res) => {
    res.json(apiTemplate(200, 'OK'))
})
online.get('/data/userinfo/', ApiUserInfo)
online.get('/data/tweets/', ApiTweets)
online.get('/data/chart/', (req, res) => {
    res.json(apiTemplate(200, 'No record found', []))
})
online.get(/^\/data\/(hashtag|cashtag|search)(\/|)$/, ApiSearch)
online.get('/data/poll/', ApiPoll)
online.get('/data/audiospace/', ApiAudioSpace)
online.get('/data/broadcast/', ApiBroadcast)
online.get('/data/media/', ApiMedia)
online.get('/data/trends/', ApiTrends)
online.get('/data/typeahead/', ApiTypeahead)

export default online