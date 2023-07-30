//YOU HAVE TO HAVE EXISTS TWEET FILE
//BECAUSE THIS IS JUST A PATCH FILE
//Those card were became unified_card in latest twitter graphql api

//SELECT * FROM `v2_twitter_cards` WHERE `type` IN ('promo_video_website','appplayer','promo_video_convo');
//SELECT * FROM `v2_twitter_media` WHERE `origin_type` REGEXP '^promo_video_website|appplayer|promo_video_convo' AND `source` = 'cards';
//SELECT * FROM v2_twitter_media WHERE origin_type IN ('promo_video_website_card_photo', 'appplayer_card_photo', 'promo_video_convo_card_photo') AND tweet_id NOT IN (SELECT tweet_id FROM v2_twitter_media WHERE source = 'cards' AND (origin_type = 'promo_video_website_card_video' OR origin_type = 'appplayer_card_video' OR origin_type = 'promo_video_convo_card_video')) AND deleted = 0;

import { Op } from 'sequelize'
import V2TwitterMedia from '../../libs/model/twitter_monitor/v2_twitter_media.js'
import { Log, PathInfo } from '../../libs/core/Core.function.mjs'
import { readFileSync } from 'fs'
import dbHandle from '../../libs/core/Core.db.mjs'
import { TWEETS_SAVE_PATH } from '../../libs/assets/setting.mjs'
import axiosFetch from 'axios-helper'

let media = await V2TwitterMedia.findAll({
    where: {
        origin_type: { [Op.in]: ['promo_video_website_card_photo', 'appplayer_card_photo', 'promo_video_convo_card_photo'] },
        source: 'cards',
        tweet_id: {
            [Op.notIn]: dbHandle.twitter_monitor.literal(
                `(SELECT tweet_id FROM v2_twitter_media WHERE source = 'cards' AND (origin_type = 'promo_video_website_card_video' OR origin_type = 'appplayer_card_video' OR origin_type = 'promo_video_convo_card_video'))`
            )
        },
        deleted: 0
    },
    raw: true
})

const list = []
let errorList = []
for (const index in media) {
    Log(false, 'log', `${Number(index) + 1} / ${media.length}`)
    const x = media[index]
    let tmpMediaInfo = media.find((mediaObject) => x.tweet_id === mediaObject.tweet_id)
    //fix mediaInfo

    tmpMediaInfo.url = ''
    tmpMediaInfo.filename = ''
    tmpMediaInfo.basename = ''
    tmpMediaInfo.extension = ''
    tmpMediaInfo.content_type = ''
    tmpMediaInfo.blurhash = ''
    tmpMediaInfo.origin_type = tmpMediaInfo.origin_type.replace(/_photo$/gm, '_video')
    const tmpLink = readFileSync(TWEETS_SAVE_PATH + x.tweet_id + '.json')
        .toString()
        .replaceAll('\\/', '/')
        .replaceAll(/.*(https:\/\/([\S]+)\.vmap).*/gm, '$1')
    let tmpVmap = ''
    try {
        tmpVmap = await axiosFetch().get(tmpLink)
    } catch (e) {
        Log(false, 'error', e)
    }
    if (!tmpVmap.data) {
        errorList.push(x)
        continue
    }
    delete tmpMediaInfo.id
    tmpMediaInfo.media_key = tmpVmap.data.replaceAll(/(?:\s|\S)+contentId="([\w]+)".*(?:\s|\S)+/gm, '$1')
    let pattern = /<tw:videoVariant url="([\S]+)" content_type="([\S]+)"(?:| bit_rate="(\d+)")\/>/gmu
    let match
    const tmpList = []
    while ((match = pattern.exec(tmpVmap.data)) !== null) {
        if (match.index === pattern.lastIndex) {
            pattern.lastIndex++
        }
        tmpList.push({
            url: decodeURIComponent(match[1]),
            type: match[2],
            bitrate: match[3] ? Number(match[3]) : undefined
        })
    }
    const tmpVideoInfo = tmpList.sort((a, b) => b.bitrate - a.bitrate)[0]
    tmpMediaInfo.url = tmpVideoInfo.url
    tmpMediaInfo.content_type = tmpVideoInfo.type
    tmpMediaInfo.bitrate = tmpVideoInfo.bitrate || 0
    const tmpPathInfo = PathInfo(tmpVideoInfo.url)

    tmpMediaInfo.filename = tmpPathInfo.filename
    tmpMediaInfo.basename = tmpPathInfo.basename
    tmpMediaInfo.extension = tmpPathInfo.extension

    list.push(tmpMediaInfo)
}

if (list.length + errorList.length !== media.length) {
    Log(false, 'log', `Not enough records, ${JSON.stringify({ media: media.length, list: list.length, error: errorList.length })}`)
}
const t = await dbHandle.twitter_monitor.transaction()

try {
    await V2TwitterMedia.bulkCreate(list, { transaction: t })
    for (const errorItem of errorList) {
        await V2TwitterMedia.update(
            { deleted: 1 },
            {
                where: { id: errorItem.id },
                transaction: t
            }
        )
    }
    await t.commit()
} catch (e) {
    await t.rollback()
    Log(false, 'log', e)
}
Log(false, 'log', `done, total ${media.length}`)
//writeFileSync('errorList.json', JSON.stringify(errorList, null, 2))
//writeFileSync('list.json', JSON.stringify(list, null, 2))

process.exit()
