import { Op } from 'sequelize'
import dbHandle from '../../src/core/Core.db.mjs'
import V2TwitterMedia from '../../src/model/twitter_monitor/v2_twitter_media.js'
import { GetBlurHash } from '../../src/core/Core.blurhash.mjs'

let t = await dbHandle.twitter_monitor.transaction()
let MediaCover = []
do {
    const startTime = new Date()

    MediaCover = [...new Set(await V2TwitterMedia.findAll({
        attributes: [[dbHandle.twitter_monitor.fn('ANY_VALUE', dbHandle.twitter_monitor.col(`cover`)), "cover"], [dbHandle.twitter_monitor.fn('ANY_VALUE', dbHandle.twitter_monitor.col(`tweet_id`)), "tweet_id"], [dbHandle.twitter_monitor.fn('ANY_VALUE', dbHandle.twitter_monitor.col(`source`)), "source"]],
        where: {
            //source: {[Op.ne]: 'cards'},
            blurhash: null,
            extension: {[Op.ne]: 'mp4'}
        },
        group: 'cover',
        limit: 100
    }))].map(media => media.cover)

    t = await dbHandle.twitter_monitor.transaction()
    const blurhashList = await Promise.allSettled(MediaCover.map(cover => GetBlurHash(cover)))
    for (const mediaIndex in MediaCover) {
        await V2TwitterMedia.update({
            blurhash: blurhashList[mediaIndex].value || blurhashList[mediaIndex].reason
        }, {
            where: {
                cover: MediaCover[mediaIndex]
            },
            transaction: t
        })
    }
    await t.commit()
    console.log(`blurhash: cost ${Number(new Date()) - startTime} ms, ${blurhashList.length}`)
} while (MediaCover.length > 0)

process.exit()
