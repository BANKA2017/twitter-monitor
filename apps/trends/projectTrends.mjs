/*
 * twitter monitor v3 project trends
 * @banka2017 && NEST.MOE
 */
//only Aqours, Nijigasaki High School Idol Club and Liella, no μ's for lovelive
//all bandori members for bangdream
//official account > persional account
//GMT+9 Asia/Tokyo, Sunday is the first day
//Thanks https://space.bilibili.com/210961054/article

import V2Config from '../../libs/model/twitter_monitor/v2_config.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import TwitterData from '../../libs/model/twitter_monitor/twitter_data.js'
import V2TwitterTweets from '../../libs/model/twitter_monitor/v2_twitter_tweets.js'
import V2TwitterEntities from '../../libs/model/twitter_monitor/v2_twitter_entities.js'
import { Op } from 'sequelize'
import { TGPush } from '../../libs/core/Core.push.mjs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import { Log } from '../../libs/core/Core.function.mjs'

let trendsConfig = []
if (existsSync(basePath + '/../libs/assets/trends/trends_config.json')) {
    trendsConfig = JSON.parse(readFileSync(basePath + '/../libs/assets/trends/trends_config.json').toString())
}

for (const config of trendsConfig) {
    //to
    const to = config.path
    let pushText = ''
    //set timezone
    process.env.TZ = 'Asia/Tokyo'
    const latestDay = (day = 0, date = new Date()) => {
        date.setDate(date.getDate() - date.getDay() - 7 + day)
        date.setHours(0)
        date.setMinutes(0)
        date.setSeconds(0)
        date.setMilliseconds(0)
        return new Date(date)
    }

    const globalStart = latestDay()
    const range = { start: parseInt(globalStart / 1000), end: parseInt(parseInt(globalStart / 1000) + 24 * 60 * 60 * 7) }

    if (range.end - range.start < 604799) {
        Log(false, 'log', `${config.prefix}: Not now`)
        process.exit()
    }

    let dataTemplate = () => ({
        name: '', //id
        name_cn: '', //中文名称标记
        display_name: [], //用过的名字
        project: config.default_project,
        team: config.default_team,
        color: '',
        uid: 0, //uid
        tweets: {
            hour_count: new Array(24).fill(0),
            media: 0, //[0, 0, 0, 0],
            video_count: 0,
            count: 0,
            original: 0,
            retweet: 0,
            quote_status_count: 0,
            card: [],
            link: [],
            tag: []
        },
        followers: new Array(7).fill(null).map(() => ({
            start: 0,
            end: 0,
            highest: 0,
            lowest: 0
        }))
    })

    const memberList = JSON.parse(readFileSync(basePath + `/../libs/assets/trends/${config.member_list}`).toString())
    const globalList = JSON.parse(
        (
            await V2Config.findOne({
                attributes: ['data_original'],
                where: {
                    id: 1
                },
                raw: true
            })
        ).data_original
    ).users

    let globalListCount = globalList.filter((x) => x.name).length

    let generateData = { data: [], range }
    //-->重跑时需要注意下一行的减号<--
    const guestLatestTwitterDataId =
        (
            await TwitterData.findOne({
                attributes: ['id'],
                order: [['id', 'DESC']],
                raw: true
            })
        ).id -
        globalListCount * 11520

    for (const member of memberList) {
        const startTime = new Date()
        Log(false, 'log', member.name)
        let userData = dataTemplate()
        //自带数据
        userData.name_cn = member.name_cn
        userData.name = member.name
        userData.uid = member.uid
        userData.team = member.team
        userData.color = member.color
        //followers && display_name
        const sqlFollowersData = await TwitterData.findAll({
            attributes: ['display_name', 'followers', 'statuses_count', 'timestamp'],
            where: {
                id: { [Op.gt]: guestLatestTwitterDataId },
                uid: userData.uid,
                timestamp: { [Op.gte]: range.start, [Op.lte]: range.end }
            },
            raw: true
        })

        for (const sqlFollowersDataP of sqlFollowersData) {
            //display_name
            if (!userData.display_name.includes(sqlFollowersDataP.display_name)) {
                userData.display_name.push(sqlFollowersDataP.display_name)
            }
            //followers
            //dayRange
            const dayRange = new Date(sqlFollowersDataP.timestamp * 1000).getDay()
            if (userData.followers[dayRange].start === 0) {
                userData.followers[dayRange].start = sqlFollowersDataP.followers
                userData.followers[dayRange].highest = sqlFollowersDataP.followers
                userData.followers[dayRange].lowest = sqlFollowersDataP.followers
            }
            userData.followers[dayRange].end = sqlFollowersDataP.followers
            if (sqlFollowersDataP.followers > userData.followers[dayRange].highest) {
                userData.followers[dayRange].highest = sqlFollowersDataP.followers
            }
            if (sqlFollowersDataP.followers < userData.followers[dayRange].lowest) {
                userData.followers[dayRange].lowest = sqlFollowersDataP.followers
            }
        }

        //tweets && tweetsCount
        const sqlTweetsData = await V2TwitterTweets.findAll({
            attributes: [
                [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                'card',
                [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(quote_status AS text)') : 'quote_status', 'quote_status'],
                'media',
                'video',
                'retweet_from',
                'time'
            ],
            where: {
                time: { [Op.gte]: range.start, [Op.lte]: range.end },
                uid: userData.uid
            },
            raw: true
        })

        for (const sqlTweetsDataP of sqlTweetsData) {
            userData.tweets.count++
            userData.tweets.hour_count[new Date(sqlTweetsDataP.time * 1000).getHours()]++
            if (sqlTweetsDataP.retweet_from) {
                userData.tweets.retweet++
            } else {
                userData.tweets.original++
            }
            if (sqlTweetsDataP.card) {
                if (userData.tweets.card[sqlTweetsDataP.card]) {
                    userData.tweets.card[sqlTweetsDataP.card]++
                } else {
                    userData.tweets.card[sqlTweetsDataP.card] = 1
                }
            }
            if (sqlTweetsDataP.quote_status !== 0) {
                userData.tweets.quote_status_count++
            }
            if (sqlTweetsDataP.media !== 0 && sqlTweetsDataP.retweet_from !== '') {
                userData.tweets.media++
                if (sqlTweetsDataP.video === 1) {
                    userData.tweets.video_count++
                }
            }
        }

        //entities
        const sqlEntitiesData = await V2TwitterEntities.findAll({
            attributes: ['type', 'text', 'expanded_url'],
            where: {
                timestamp: { [Op.gte]: range.start, [Op.lte]: range.end },
                uid: userData.uid,
                type: { [Op.in]: ['hashtag', 'url'] }
            },
            raw: true
        })

        let tmpTag = {}
        let tmpLink = {}

        for (const singleEntitiesData of sqlEntitiesData) {
            switch (singleEntitiesData.type) {
                //hashtag and no cashtag// && cashtag
                case 'hashtag':
                case 'symbol':
                    if (tmpTag[singleEntitiesData.text]) {
                        tmpTag[singleEntitiesData.text]++
                    } else {
                        tmpTag[singleEntitiesData.text] = 1
                    }
                    break
                case 'url':
                    const hostname = new URL(singleEntitiesData.expanded_url).hostname
                    if (tmpLink[hostname]) {
                        tmpLink[hostname]++
                    } else {
                        tmpLink[hostname] = 1
                    }
                    break
            }
        }

        userData.tweets.tag = Object.fromEntries(
            Object.keys(tmpTag)
                .map((x) => [x, tmpTag[x]])
                .sort((a, b) => b[1] - a[1])
        )
        userData.tweets.link = Object.fromEntries(
            Object.keys(tmpLink)
                .map((x) => [x, tmpLink[x]])
                .sort((a, b) => b[1] - a[1])
        )

        generateData.data.push(userData)

        writeFileSync(`${to}/${globalStart.getFullYear()}-${String(globalStart.getMonth() + 1).padStart(2, '0')}-${String(globalStart.getDate()).padStart(2, '0')}.json`, JSON.stringify(generateData))
        pushText += `${config.prefix}: ${member.name_cn} cost: ${(new Date() - startTime) / 1000}\n`

        Log(false, 'log', `cost: ` + (new Date() - startTime) / 1000)
    }

    let dateInfo = []
    if (existsSync(`${to}/date.json`)) {
        dateInfo = JSON.parse(readFileSync(`${to}/date.json`).toString())
    }
    if (!dateInfo.includes(`${globalStart.getFullYear()}-${String(globalStart.getMonth() + 1).padStart(2, '0')}-${String(globalStart.getDate()).padStart(2, '0')}`)) {
        dateInfo.unshift(`${globalStart.getFullYear()}-${String(globalStart.getMonth() + 1).padStart(2, '0')}-${String(globalStart.getDate()).padStart(2, '0')}`)
    }
    writeFileSync(`${to}/date.json`, JSON.stringify(dateInfo))

    await TGPush(pushText + ` #${config.push_hash} `)
}

process.exit()
