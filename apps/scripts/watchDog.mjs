import { Log } from '../../libs/core/Core.function.mjs'
import { TGPush } from '../../libs/core/Core.push.mjs'
import TwitterData from '../../libs/model/twitter_monitor/twitter_data.js'

const latestData = await TwitterData.findOne({
    attributes: ['id', 'timestamp'],
    limit: 1,
    order: [['id', 'DESC']],
    raw: true
})

if (latestData.timestamp + 1800 < new Date() / 1000) {
    await TGPush(`tmv3: ALERT NO NEW DATA IN LATEST 30 MINUTES #watch_dog`)
}

Log(false, 'log', latestData)

process.exit()
