import { Op } from 'sequelize'
import dbHandle from '../../libs/core/Core.db.mjs'
import V2TwitterMedia from '../../libs/model/twitter_monitor/v2_twitter_media.js'
import { GetBlurHash } from '../../libs/core/Core.blurhash.mjs'
import { Log } from '../../libs/core/Core.function.mjs'

let t = await dbHandle.twitter_monitor.transaction()
let MediaCover = []
do {
    const startTime = new Date()

    MediaCover = [
        ...new Set(
            await V2TwitterMedia.findAll({
                attributes: [
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? 'cover' : dbHandle.twitter_monitor.fn('ANY_VALUE', dbHandle.twitter_monitor.col(`cover`)), 'cover'],
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : dbHandle.twitter_monitor.fn('ANY_VALUE', dbHandle.twitter_monitor.col(`tweet_id`)), 'tweet_id'],
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? 'source' : dbHandle.twitter_monitor.fn('ANY_VALUE', dbHandle.twitter_monitor.col(`source`)), 'source']
                ],
                where: {
                    //source: {[Op.ne]: 'cards'},
                    blurhash: null,
                    extension: { [Op.ne]: 'mp4' }
                },
                group: 'cover',
                limit: 100
            })
        )
    ].map((media) => media.cover)

    t = await dbHandle.twitter_monitor.transaction()
    const blurhashList = await Promise.allSettled(MediaCover.map((cover) => GetBlurHash(cover)))
    for (const mediaIndex in MediaCover) {
        await V2TwitterMedia.update(
            {
                blurhash: blurhashList[mediaIndex].value || blurhashList[mediaIndex].reason
            },
            {
                where: {
                    cover: MediaCover[mediaIndex]
                },
                transaction: t
            }
        )
    }
    await t.commit()
    Log(false, 'log', `blurhash: cost ${Date.now() - startTime} ms, ${blurhashList.length}`)
} while (MediaCover.length > 0)

process.exit()
