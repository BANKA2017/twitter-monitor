/*
 * twitter monitor v3 staff trends
 * @banka2017 && NEST.MOE
 */

import { existsSync, readFileSync, writeFileSync } from "fs"
import { basePath } from "../../libs/share/NodeConstant.mjs"
import TwitterData from "../../libs/model/twitter_monitor/twitter_data.js"
import { Op } from "sequelize"
import V2TwitterTweets from "../../libs/model/twitter_monitor/v2_twitter_tweets.js"
import V2TwitterEntities from "../../libs/model/twitter_monitor/v2_twitter_entities.js"
import { TGPush } from "../../libs/core/Core.push.mjs"

//GMT+9 Asia/Tokyo, Sunday is the first day

//to
const to = '/var/www/tmv2/static/trends/'
let pushText = ''
process.env.TZ = 'Asia/Tokyo'

const dataTemplate = () => ({
    name: "",//id
    display_name: "",//中文名称标记
    display_name_list: [],//用过的名字
    project: "LoveLive!",
    uid: 0,//uid
    tweets_daily: [],
    followers: [],//["start: 0,"end: 0,"highest: 0,"lowest: 0,],
})

const tweetsDataTemplate = () => ({
    hour_count: (new Array(24)).fill(0),
    media: 0,//[0, 0, 0, 0],
    video_count: 0,
    count: 0,
    origin: 0,
    retweet: 0,
    quote_status_count: 0,
    card: [],
    link: [],
    tag: [],
})

const member_list = JSON.parse(readFileSync(basePath + '/../libs/assets/trends/staff.json').toString())

for (const member of member_list) {
    const startTime = new Date()
    let savedData = {
        data: dataTemplate(),
        range: {start: 0, end: 0}
    }

    if (existsSync(`${to}/${member.name}.json`)) {
        savedData = JSON.parse(readFileSync(`${to}/${member.name}.json`).toString())
    }
    let range = {start: savedData.range.end, end: parseInt((new Date()) / 1000)}

    console.log(`${member.display_name}`)
    let userData = savedData.data

    //自带数据
    userData.display_name = member.display_name
    userData.name = member.name
    userData.uid = member.uid
    userData.project = member.project
    //followers && display_name_list
    const sqlFollowersData = await TwitterData.findAll({
        attributes: ["display_name", "followers", "statuses_count", "timestamp"],
        where: {
            id: {[Op.gt]: 0},
            uid: userData.uid,
            timestamp: {[Op.gte]: range.start, [Op.lte]: range.end}
        },
        raw: true
    })

    for (const sqlFollowersDataP of sqlFollowersData) {
        //display_name_list
        if (!userData.display_name.includes(sqlFollowersDataP.display_name_list)) {
            userData.display_name_list.push(sqlFollowersDataP.display_name)
        }
        //followers
        //dayRange
        const tmpNow = (new Date(sqlFollowersDataP.timestamp * 1000))
        const dayRange = '' + tmpNow.getFullYear() + String(tmpNow.getMonth() + 1).padStart(2, '0') + String(tmpNow.getDate()).padStart(2, '0')
        if (!userData.followers[dayRange]) {
            userData.followers[dayRange] = {}
        }
        if ((userData.followers?.[dayRange]?.start || 0) === 0) {
            userData.followers[dayRange].start = sqlFollowersDataP.followers
            userData.followers[dayRange].highest = sqlFollowersDataP.followers
            userData.followers[dayRange].lowest = sqlFollowersDataP.followers
        }
        userData.followers[dayRange].end = sqlFollowersDataP.followers
        if (sqlFollowersDataP.followers > userData.followers[dayRange].highest) {
            userData.followers[dayRange].highest = sqlFollowersDataP.followers
        }
        if (sqlFollowersDataP.followers < (userData.followers?.[dayRange]?.lowest || 0)) {
            userData.followers[dayRange].lowest = sqlFollowersDataP.followers
        }
    }
    //tweets && tweetsCount
    const sqlTweetsData = await V2TwitterTweets.findAll({
        attributes: ["tweet_id", "card", "quote_status", "media", "video", "retweet_from", "time"],
        where: {
            time: { [Op.gte]: range.start, [Op.lte]: range.end },
            uid: userData.uid,
        },
        raw: true
    })
    for (const sqlTweetsDataP of sqlTweetsData) {
        const tmpNow = (new Date(sqlTweetsDataP.time * 1000))
        const dayRange = '' + tmpNow.getFullYear() + String(tmpNow.getMonth() + 1).padStart(2, '0') + String(tmpNow.getDate()).padStart(2, '0')

        if (!userData.tweets_daily[dayRange]) {
            userData.tweets_daily[dayRange] = tweetsDataTemplate()
        }

        userData.tweets_daily[dayRange].count++
        userData.tweets_daily[dayRange].hour_count[tmpNow.getDay()]++
        if (sqlTweetsDataP.retweet_from !== '') {
            userData.tweets_daily[dayRange].retweet++
        } else {
            userData.tweets_daily[dayRange].origin++
        }

        if (sqlTweetsDataP.card !== '') {
            if (userData.tweets_daily[dayRange].card[sqlTweetsDataP.card]) {
                userData.tweets_daily[dayRange].card[sqlTweetsDataP.card]++
            } else {
                userData.tweets_daily[dayRange].card[sqlTweetsDataP.card] = 1
            }
        }

        if (sqlTweetsDataP.quote_status !== 0) {
            userData.tweets_daily[dayRange].quote_status_count++
        }

        if (sqlTweetsDataP.media !== 0 && sqlTweetsDataP.retweet_from !== '') {
            userData.tweets_daily[dayRange].media++
            if (sqlTweetsDataP.video === 1) {
                userData.tweets_daily[dayRange].video_count++
            }
        }
    }

    //entities
    const sqlEntitiesData = await V2TwitterEntities.findAll({
        attributes: ["type", "text", "expanded_url", "timestamp"],
        where: {
            timestamp: { [Op.gte]: range.start, [Op.lte]: range.end },
            uid: userData.uid,
            type: {[Op.in]: ['hashtag', 'symbol', 'url']}
        },
        raw: true
    })

    let tmpTag = {}
    let tmpLink = {}
    let cursorDate = 0

    let dayRange = 0
    for (const singleEntitiesData of sqlEntitiesData) {
        const tmpNow = (new Date(singleEntitiesData.timestamp * 1000))
        dayRange = Number('' + tmpNow.getFullYear() + (tmpNow.getMonth() + 1) + tmpNow.getDate())

        if (dayRange > cursorDate) {
            userData.tweets_daily[dayRange].tag = Object.fromEntries(Object.keys(tmpTag).map(x => [x, tmpTag[x]]).sort((a, b) => b[1] - a[1]))
            userData.tweets_daily[dayRange].link = Object.fromEntries(Object.keys(tmpLink).map(x => [x, tmpLink[x]]).sort((a, b) => b[1] - a[1]))
            tmpTag = {}
            tmpLink = {}
            cursorDate = dayRange
        }

        switch(singleEntitiesData.type) {
            //hashtag && cashtag
            case "hashtag":
            case "symbol":
                if (tmpTag[singleEntitiesData.text]) {
                    tmpTag[singleEntitiesData.text]++
                } else {
                    tmpTag[singleEntitiesData.text] = 1
                }
                break
            //links
            case "url":
                const hostname = (new URL(singleEntitiesData.expanded_url)).hostname
                if (tmpLink[hostname]) {
                    tmpLink[hostname]++
                } else {
                    tmpLink[hostname] = 1
                }
                break
        }
    }

    if (sqlEntitiesData.length) {
        //last day
        userData.tweets_daily[dayRange].tag = Object.fromEntries(Object.keys(tmpTag).map(x => [x, tmpTag[x]]).sort((a, b) => b[1] - a[1]))
        userData.tweets_daily[dayRange].link = Object.fromEntries(Object.keys(tmpLink).map(x => [x, tmpLink[x]]).sort((a, b) => b[1] - a[1]))
    }
    
    savedData.data = userData
    savedData.range = {start: range.start, end: range.end}
    writeFileSync(`${to}/${userData.name}.json`, JSON.stringify(savedData))
    pushText += `TM Trends: ${member.display_name} cost: ${(new Date() - startTime) / 1000}\n`
    console.log(`cost: ${(new Date() - startTime) / 1000}`)
}

//await TGPush(pushText + ` #tm_trends `);
process.exit()
