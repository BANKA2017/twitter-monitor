//annual 2022

import { Op } from "sequelize";
import { getConversation } from "../../../libs/core/Core.fetch.mjs";
import { Tweet, TweetsInfo } from "../../../libs/core/Core.tweet.mjs";
import V2TwitterTweets from "../../../libs/model/twitter_monitor/v2_twitter_tweets.js";
import {existsSync, readFileSync, writeFileSync} from 'node:fs'

const limit = 499
let offset = 0
let list = []
let errorList = []
let tweetList = []
if (existsSync('./errorList.json')) {
    errorList = JSON.parse(readFileSync('./errorList.json'))
}
if (existsSync('./tweetList.json')) {
    tweetList = JSON.parse(readFileSync('./tweetList.json'))
}
if (existsSync('./offset.txt')) {
    offset = Number(readFileSync('./offset.txt').toString())
}
if (offset === 0 && (errorList.length + tweetList.length) > 0) {
    offset = (errorList.length + tweetList.length) - ((errorList.length + tweetList.length) % 500)
}
let _count = {success: tweetList.length, error: errorList.length}
//get tweet_list
do {
    list = await V2TwitterTweets.findAll({
        attributes: ["tweet_id", "origin_tweet_id", "conversation_id_str", "uid", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source", "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"],
        where: {[Op.and]: {
        time: {[Op.gte]: 1640962800, [Op.lt]: 1672325999},
        uid: {[Op.in]: ['908617697033822208', '297833968', '114700374', '308818825', '944539874463383553', '319501205', '261196483', '119635653', '259302981', '1393924040', '3692123006', '3801397033', '260986258', '4065828913', '3177540343', '3177547086', '2598273120', '746579242431877121', '488304462', '2807026892', '991283114885365761', '760000974005997568', '847365153691582465', '1057615013282631680', '880621944101404672', '1176845285059747842', '2384783184', '1141319903250534400', '1075210326990217216', '4110103573', '4801716276', '1079700276104224768', '350173689', '1337943289329115136', '744906956649857024', '1316578527408353280', '827774278560948224', '1319293219427868677', '1430478886299525126', '1524967746752348161', '1524521415017639937', "253177157","3232514690","3152941584","2819975324","1419890600","106039584","1082826501609799680","619187741","888252840933605377","134172978","3161121853","1060132463584849920","1968809864","2242605476","767898518178582528","1713255452","3693557304","748671603127398400","242195987","1408066855","3195095402","737989496365449217","294626568","3060143636","258659153","930394603097702402","930439312209952768","1041938828682911744","957177496759185408","1112674980603428866","335689986","337116516"]}
        }},
        limit,
        offset: offset,
        order: [['tweet_id', 'DESC']],
        raw: true,
    })
    
    let tmpTweetIdList = list.map(x => String(x.tweet_id))
    let tweetDataList = await getConversation({tweet_id: tmpTweetIdList})
    //console.log(tweetDataList)
    //generate data
    tweetDataList.forEach((x, index) => {
        if (x.status ===  'fulfilled') {
            const tweetsInfo = TweetsInfo(x.value.data, true)
            //console.log(tweetsInfo.contents.filter(tweet => String(tweet?.content?.itemContent?.tweet_results?.result?.rest_id || '0') === tmpTweetIdList[index])[0])

            if (!tweetsInfo.contents.filter(tweet => String(tweet?.content?.itemContent?.tweet_results?.result?.rest_id || '0') === tmpTweetIdList[index])[0]) {
                console.log(`error: ${tmpTweetIdList[index]}`)
                errorList.push(tmpTweetIdList[index])
                writeFileSync('./errorList.json', JSON.stringify(errorList))
                _count.error++
                return
            }
            const tweetData = Tweet(tweetsInfo.contents.filter(tweet => String(tweet?.content?.itemContent?.tweet_results?.result?.rest_id || '0') === tmpTweetIdList[index])[0], {}, [], {}, true, false, true)
            if (tweetList.filter(x => x.tweet_id === String(tweetData.tweet_id)).length === 0) {
                tweetList.push({
                    tweet_id: String(tweetData.GeneralTweetData.tweet_id),
                    uid: String(tweetData.GeneralTweetData.uid),
                    name: tweetData.GeneralTweetData.name,
                    retweets: tweetData.interactiveData.retweet_count,
                    quotes: tweetData.interactiveData.quote_count,
                    replies: tweetData.interactiveData.reply_count,
                    likes: tweetData.interactiveData.favorite_count,
                    isRetweet: tweetData.isRetweet,
                    deletedStatus: false
                })
                console.log({
                    tweet_id: String(tweetData.GeneralTweetData.tweet_id),
                    uid: String(tweetData.GeneralTweetData.uid),
                    name: tweetData.GeneralTweetData.name,
                    retweets: tweetData.interactiveData.retweet_count,
                    quotes: tweetData.interactiveData.quote_count,
                    replies: tweetData.interactiveData.reply_count,
                    likes: tweetData.interactiveData.favorite_count,
                    isRetweet: tweetData.isRetweet,
                    deletedStatus: false
                })
                writeFileSync('./tweetList.json', JSON.stringify(tweetList))
            } else {
                console.log(String(tweetData.tweet_id) + ' is exist!')
            }
            _count.success++
        } else {
            console.log(`error: ${tmpTweetIdList[index]}`)
            errorList.push(tmpTweetIdList[index])
            writeFileSync('./errorList.json', JSON.stringify(errorList))
            _count.error++
        }
    })
    console.log(_count)
    offset += limit
    writeFileSync('./offset.txt', String(offset))
} while (list.length > 0)

process.exit()
