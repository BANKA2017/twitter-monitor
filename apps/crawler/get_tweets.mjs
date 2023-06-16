// Twitter Monitor v3
// @BANKA2017 && NEST.MOE
// GetTweets()

import { readFileSync, writeFileSync } from 'node:fs'

import { getTweets, getUserInfo } from '../../libs/core/Core.fetch.mjs'
import { GenerateAccountInfo } from '../../libs/core/Core.account.mjs'

//server info
import V2ServerInfo from '../../libs/model/twitter_monitor/v2_server_info.js'
import V2ErrorLog from '../../libs/model/twitter_monitor/v2_error_log.js'

//account info
import V2AccountInfo from '../../libs/model/twitter_monitor/v2_account_info.js'
import TwitterData from '../../libs/model/twitter_monitor/twitter_data.js'
import TmpTwitterData from '../../libs/model/twitter_monitor/tmp_twitter_data.js'

//tweets info
import V2TwitterMedia from '../../libs/model/twitter_monitor/v2_twitter_media.js'
import V2TwitterEntities from '../../libs/model/twitter_monitor/v2_twitter_entities.js'
import V2TwitterPolls from '../../libs/model/twitter_monitor/v2_twitter_polls.js'
import V2TwitterCards from '../../libs/model/twitter_monitor/v2_twitter_cards.js'
import V2TwitterCardApp from '../../libs/model/twitter_monitor/v2_twitter_card_app.js'
import V2TwitterQuote from '../../libs/model/twitter_monitor/v2_twitter_quote.js'
import V2TwitterTweets from '../../libs/model/twitter_monitor/v2_twitter_tweets.js'

import { GuestToken, setGlobalServerInfo, Sleep } from '../../libs/core/Core.function.mjs'
import path2array from '../../libs/core/Core.apiPath.mjs'
import { Tweet, TweetsInfo } from '../../libs/core/Core.tweet.mjs'
import dbHandle from '../../libs/core/Core.db.mjs'
import { TGPush } from '../../libs/core/Core.push.mjs'
import { TWEETS_SAVE_PATH } from '../../libs/assets/setting.mjs'
import { ConfigFile } from '../../libs/share/UpdateConfig.mjs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import { CYCLE_SECONDS } from '../../libs/assets/setting.mjs'

const GRAPHQL_MODE = true

/* https://stackoverflow.com/questions/73266169/pm2-is-catching-errors-before-they-reach-uncaught-exception-in-node-js */
process.on('uncaughtException', async (err, origin) => {
    console.error(`tmv3: Restarting(Exception)...`, err)
    process.exit(0)
})

process.on('unhandledRejection', async (reason, promise) => {
    if (typeof reason === 'object' && reason?.success !== undefined && reason?.token !== undefined) {
        //guest token error
        console.error(`tmv3: Restarting(guest_token)...`, reason)
        process.exit(0)
    }
})

const once = (process.argv[2] || '') === 'once'
let firstRun = true

//get init token
global.guest_token = new GuestToken()
await global.guest_token.updateGuestToken(1)
const cycleMilliseconds = CYCLE_SECONDS * 1000

while (true) {
    if (!once) {
        let now = Date.now()
        console.log(`tmv3: Wait for ${cycleMilliseconds - (now % cycleMilliseconds)} ms`)
        await Sleep(cycleMilliseconds - (now % cycleMilliseconds))
    }

    // get config from file system
    let config = JSON.parse(readFileSync(basePath + '/../libs/assets/config.json').toString())

    const server_info = new setGlobalServerInfo()
    if (global.guest_token.token.nextActiveTime) {
        await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
        console.error(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
        await Sleep(global.guest_token.token.nextActiveTime - Date.now())
        await global.guest_token.updateGuestToken()
        server_info.updateValue('total_req_times') //for init guest token
        if (!global.guest_token.token.success) {
            continue
        }
    }

    // account have to update
    let nameCount = []
    // monitor data
    const monitorDataList = []
    // update account data
    let updateNameList = false
    // account count
    //let userInfoReqCount = 0
    // message for error push
    let userInfoErrorsForPush = ''

    // break account
    //TODO not console
    // remove locked accounts because locked account will continue return account info
    const breakAccountList = config.users.filter((user) => !user.name || user.deleted).map((account) => account.display_name || account.name || account.uid)
    if (breakAccountList.length) {
        console.log(`tmv3: #AutoBreak ` + breakAccountList.join(', '))
    }

    // updateable list
    let refreshableList = config.users
        .map((user, index) => [user, index])
        .filter((user) => user[0].name && !user[0].deleted && ((userId) => userId[1] || (userId[0] > 0 && userId[0] !== '0' && userId[0] !== 'undefined'))([user[0]?.uid, user[0]?.name]))
    let refreshableIdList = refreshableList.map((user) => {
        if (user[0].uid && Number(user[0].uid) > 0) {
            return user[0]?.uid
        } else {
            return user[0]?.name
        }
    })
    // TODO once have rete limit ban you have to stop crawler up to 30 mins
    let allInfoForAccount = []
    while (refreshableIdList.length) {
        const uidCount = refreshableIdList.filter((id) => !isNaN(id)).length
        const nameCount = refreshableIdList.filter((id) => isNaN(id)).length
        if (global.guest_token.preCheck('UserByScreenName', nameCount) && global.guest_token.preCheck('UserByRestId', uidCount)) {
            allInfoForAccount = allInfoForAccount.concat(await getUserInfo({ user: refreshableIdList, guest_token: global.guest_token.token, graphqlMode: GRAPHQL_MODE }))
            global.guest_token.updateRateLimit('UserByScreenName', nameCount)
            global.guest_token.updateRateLimit('UserByRestId', uidCount)
            break
        } else {
            const uidLimit = global.guest_token.getRateLimit('UserByRestId')
            const nameLimit = global.guest_token.getRateLimit('UserByScreenName')
            const tmpRefreshableIdList = refreshableIdList.splice(0, uidLimit > nameLimit ? nameLimit : uidLimit)
            allInfoForAccount = allInfoForAccount.concat(await getUserInfo({ user: tmpRefreshableIdList, guest_token: global.guest_token.token, graphqlMode: GRAPHQL_MODE }, global.guest_token.token, GRAPHQL_MODE))
            global.guest_token.updateRateLimit('UserByScreenName', tmpRefreshableIdList.filter((id) => isNaN(id)).length)
            global.guest_token.updateRateLimit('UserByRestId', tmpRefreshableIdList.filter((id) => !isNaN(id)).length)
            await global.guest_token.updateGuestToken(1)
            server_info.updateValue('total_req_times')
            if (global.guest_token.token.nextActiveTime) {
                await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                console.error(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                break //只处理现有的
            }
        }
    }

    const accountTransaction = await dbHandle.twitter_monitor.transaction()

    for (const index in allInfoForAccount) {
        const accountInfo = allInfoForAccount[index]
        //TODO accountInfo.code === 336 means feature issue
        console.log(refreshableList[index][0].display_name, `(${refreshableList[index][0].name})`, refreshableList[index][1], index)
        server_info.updateValue('total_req_times')
        if (
            accountInfo.status !== 'fulfilled' ||
            (accountInfo?.value?.data?.errors && !accountInfo?.value?.data?.data?.user) ||
            accountInfo?.value?.data?.data?.user?.result?.__typename === 'UserUnavailable' ||
            !accountInfo?.value?.data?.data?.user?.result ||
            path2array('user_info_legacy', accountInfo.value?.data || false)?.protected ||
            accountInfo.value?.data?.user?.result?.has_graduated_access
        ) {
            if (accountInfo.status !== 'fulfilled') {
                console.log('tmv3: #Autobreak' + refreshableList[index][0].display_name + ' -' + accountInfo.status)
            } else {
                console.log('tmv3: #Autobreak' + refreshableList[index][0].display_name + ' -' + (accountInfo.value?.data?.errors?.[0]?.message || accountInfo?.value?.data?.user?.result?.reason || 'Unknown error'))
                updateNameList = true

                // not continue
                if (!(path2array('user_info_legacy', accountInfo.value?.data)?.protected ?? accountInfo.value?.data?.user?.result?.has_graduated_access ?? false) && config.users[refreshableList[index][1]].locked) {
                    config.users[refreshableList[index][1]].locked = false
                    await V2AccountInfo.update({ locked: 0 }, { where: { name: refreshableList[index][0].name } })
                    TGPush(`tmv3: #Unlocked Account ${refreshableList[index][0].name}`)
                } else if (path2array('user_info_legacy', accountInfo.value?.data)?.protected ?? accountInfo.value?.data?.user?.result?.has_graduated_access ?? false) {
                    if (!config.users[refreshableList[index][1]].locked) {
                        config.users[refreshableList[index][1]].locked = true
                        await V2AccountInfo.update({ locked: 1 }, { where: { name: refreshableList[index][0].name } })
                        TGPush(`tmv3: #Locked Account ${refreshableList[index][0].name} was protected`)
                    }
                } else if ([50, 63].includes(accountInfo.value?.data?.errors?.[0]?.code)) {
                    //deleted 用于在twitter删除帐户的用户 #50
                    //suspended 用于被封禁帐户的用户 #63
                    config.users[refreshableList[index][1]].deleted = true
                    await V2AccountInfo.update({ deleted: 1 }, { where: { name: refreshableList[index][0].name } })
                    TGPush(`tmv3: #Deleted Account ${refreshableList[index][0].name} was deleted`)

                    continue
                } else if (accountInfo?.value?.data?.data?.user?.result?.__typename === 'UserUnavailable' || !accountInfo?.value?.data?.data?.user?.result) {
                    config.users[refreshableList[index][1]].deleted = true
                    await V2AccountInfo.update({ deleted: 1 }, { where: { name: refreshableList[index][0].name } })
                    TGPush(`tmv3: #Deleted Account ${refreshableList[index][0].name} was deleted (${accountInfo?.value?.data?.data?.user?.result?.reason})`)

                    continue
                } else {
                    // TODO configErrorCount
                    server_info.updateValue('total_errors_count')
                    userInfoErrorsForPush += refreshableList[index][0].name + ' wrong data ' + accountInfo.value?.data?.errors[0]?.message + ' #error' + accountInfo.value?.data?.errors[0]?.code + '\n'
                    await V2ErrorLog.create({
                        uid: refreshableList[index][0].uid ?? 0,
                        name: refreshableList[index][0].name,
                        code: accountInfo.value?.data?.errors[0]?.code,
                        message: accountInfo.value?.data?.errors[0]?.message,
                        timestamp: Math.floor(new Date() / 1000)
                    })

                    continue
                }
            }
        }
        let { GeneralAccountData, monitorDataInfo, update } = GenerateAccountInfo(accountInfo.value?.data, {
            hidden: refreshableList[index][0]?.hidden ?? 0,
            locked: refreshableList[index][0]?.locked ?? 0,
            deleted: refreshableList[index][0]?.deleted ?? 0,
            organization: refreshableList[index][0]?.organization ?? 0
        })

        if (!GeneralAccountData.uid) {
            userInfoErrorsForPush += refreshableList[index][0].name + ' wrong data #accont_info \n'
            continue
        }
        if (update) {
            updateNameList = true
        }
        //uid
        if ((refreshableList[index][0]?.uid ?? 0) !== GeneralAccountData.uid) {
            updateNameList = true
            config.users[refreshableList[index][1]].uid = GeneralAccountData.uid
        }

        //处理id
        //一般人都不会改名, 但是谁知道会不会真遇上呢
        if (GeneralAccountData.name && refreshableList[index][0]?.name !== GeneralAccountData.name) {
            updateNameList = true
            config.users[refreshableList[index][1]].name = GeneralAccountData.name
        }

        //TODO 毕竟现在用不上, 以后再添加
        //处理display_name
        //警告: 若取消注释则会强制同步display_name为该账户的twitter名称且无法使用自定义display_name
        //if ($user_info["name"] && $account["display_name"] != $user_info["name"]) {
        //    $update_names = true;
        //    $config["users"][$account_s]["display_name"] = $user_info["name"];
        //}

        //TODO 一万倍数检测
        //monitor data
        //同时满足时才会插入监控项目
        if (!(refreshableList[index][0]?.not_analytics ?? false)) {
            monitorDataList.push(monitorDataInfo)
            //await TwitterData.create(monitorDataInfo)
            // temp table for /i/stats
            monitorDataInfo.visible = !(refreshableList[index][0].hidden || refreshableList[index][0].deleted || refreshableList[index][0].organization)
            await TmpTwitterData.upsert(monitorDataInfo, { transaction: accountTransaction })
        } else if (refreshableList[index][0]?.not_analytics ?? false) {
            console.log(refreshableList[index][0]?.name + ' - not collect')
        } else {
            await TGPush(`tmv3: ${refreshableList[index][0]?.name} broken data #twitter_data`)
        }

        //check from database by uid
        //由于早期设计失误, new字段0时为新帐号, 为1时是完成首次爬取的帐号
        let verifyInfo = await V2AccountInfo.findOne({
            attributes: ['uid', 'name', 'display_name', 'header', 'banner', 'description_origin', 'top', 'statuses_count', 'hidden', 'locked', 'deleted', 'new', 'cursor', 'last_cursor'],
            where: {
                uid: GeneralAccountData.uid
            }
        })
        if (verifyInfo === null) {
            console.log('tmv3: new account')
            nameCount.push({
                name: GeneralAccountData.name,
                display_name: GeneralAccountData.display_name,
                last_cursor: 0,
                cursor: '',
                uid: GeneralAccountData.uid,
                pinned: GeneralAccountData.top,
                hidden: GeneralAccountData.hidden,
                locked: GeneralAccountData.locked
            })
            GeneralAccountData.last_cursor = 0
            GeneralAccountData.new = 1
            await V2AccountInfo.create(GeneralAccountData)
        } else {
            console.log('tmv3: update account information')

            //verify
            if (verifyInfo.new === 1 && verifyInfo.statuses_count !== GeneralAccountData.statuses_count) {
                console.log('tmv3: need update')
                nameCount.push({
                    name: GeneralAccountData.name,
                    display_name: verifyInfo.display_name,
                    last_cursor: verifyInfo.last_cursor,
                    cursor: verifyInfo.cursor,
                    uid: verifyInfo.uid,
                    pinned: GeneralAccountData.top,
                    hidden: GeneralAccountData.hidden,
                    locked: GeneralAccountData.locked
                })
            } else {
                console.log('tmv3: locked')
            }
            await V2AccountInfo.update(GeneralAccountData, { where: { uid: GeneralAccountData.uid } })
        }
    }

    if (monitorDataList.length) {
        await TwitterData.bulkCreate(monitorDataList, { transaction: accountTransaction })
    }
    await accountTransaction.commit()
    if (userInfoErrorsForPush) {
        await TGPush(userInfoErrorsForPush)
    }

    if (updateNameList || firstRun) {
        await ConfigFile(config, refreshableList, firstRun)
        if (firstRun) {
            firstRun = false
        }
    }

    if (nameCount.length) {
        console.log('tmv3: now crawling tweets')
        server_info.updateValue('total_users', nameCount.length)
        //TODO split nameCount if nameCount.length > 1000
        for (const accountInfo of nameCount) {
            if (accountInfo.locked) {
                console.log(`tmv3: account ${accountInfo.display_name}(@${accountInfo.name}) is protected`)
                continue
            }
            let insert = {
                v2_twitter_media: [],
                v2_twitter_entities: [],
                v2_twitter_polls: [],
                v2_twitter_cards: [],
                v2_twitter_card_app: [],
                v2_twitter_quote: [],
                v2_twitter_tweets: []
            }

            //const saveTweetsPromise = []
            //x-rate-limit-limit: 180
            //x-rate-limit-remaining: 179
            //x-rate-limit-reset: 1567401449
            //请求限制改成了180

            //这个rate-limit是靠csrf token判断的, 后面那堆吐槽不用看了//你以为真的是180？骗你的, 只要暂停请求又是新一轮180//但还是开着吧,谁知道会有什么影响呢//要取消限制只需要将下行   的 99 改成大的数字即可

            //更多关于请求限制的信息请参阅 https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
            //太长不看: 1000/guestToken -->这是旧的//180req/15min
            //graphql只需要在999更换即可

            await global.guest_token.updateGuestToken(1)
            server_info.updateValue('total_req_times')
            if (global.guest_token.token.nextActiveTime) {
                await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                console.error(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                break //只处理现有的
            }

            console.log(`tmv3: ${accountInfo.display_name} (@${accountInfo.name}) #${String(accountInfo.uid)} ${accountInfo.last_cursor ? '- new' : ''}`)
            const tweets = await getTweets({ queryString: accountInfo.uid, cursor: accountInfo.cursor, guest_token: global.guest_token.token, count: false, online: false, graphqlMode: GRAPHQL_MODE })
            global.guest_token.updateRateLimit('UserTweets')
            server_info.updateValue('total_req_times')
            const tmpTweetsInfo = TweetsInfo(tweets.data, GRAPHQL_MODE)
            if (tmpTweetsInfo.errors.code !== 0) {
                console.log(`tmv3: error #${tmpTweetsInfo.errors.code} , ${tmpTweetsInfo.errors.message}`)
                TGPush(`tmv3: error #${tmpTweetsInfo.errors.code} , ${tmpTweetsInfo.errors.message}`)
                continue
            }

            server_info.updateValue('total_req_tweets', tmpTweetsInfo.contentLength)
            let singleAccountTweetsCount = 0
            console.log(`tmv3: cursor -->${tmpTweetsInfo.cursor.top}<-- (${tmpTweetsInfo.contentLength})`)

            for (const content of tmpTweetsInfo.contents) {
                //判断非推文//graphql only
                if (GRAPHQL_MODE && (content.content.entryType !== 'TimelineTimelineItem' || !content)) {
                    console.log('tmv3: Not tweet, break')
                    continue
                }

                if (TWEETS_SAVE_PATH) {
                    writeFileSync(TWEETS_SAVE_PATH + path2array('tweet_id', content) + '.json', JSON.stringify(content))
                }
                //判断是否本人发推
                if (String(path2array('tweet_uid', GRAPHQL_MODE ? path2array('tweet_content', content) : content)) === String(accountInfo.uid)) {
                    const generatedTweetData = Tweet(content, {}, [], {}, GRAPHQL_MODE, accountInfo.hidden || false ? 1 : 0, false)
                    const inSql = generatedTweetData.GeneralTweetData
                    if (inSql.card && !generatedTweetData.cardMessage.supported) {
                        console.log(`tmv3: Not supported card ${generatedTweetData.cardMessage.card_name}`)
                        TGPush(generatedTweetData.cardMessage.message)
                    }

                    //writeFileSync(`../../savetweets/${inSql.tweet_id}.json`, JSON.stringify(generatedTweetData))
                    //翻译
                    //暂时用不上了
                    //$in_sql["translate_source"] = '';
                    //dbHandle
                    //来人, 把这个置顶给老子干掉
                    //丢弃策略必须重写19-6-18

                    //丢弃策略重写, 非置顶均放行, 请自行处理重复问题, 内容锁运行正常

                    //再次重写, 全部都检查, 只要重复就丢弃
                    if (
                        accountInfo.last_cursor &&
                        (await V2TwitterTweets.findOne({
                            attributes: ['id'],
                            where: {
                                tweet_id: inSql.tweet_id
                            }
                        }))
                    ) {
                        console.log(`tmv3: throw #${++singleAccountTweetsCount} -> ${inSql.tweet_id} (duplicate)`)
                        server_info.updateValue('total_throw_tweets')
                    } else {
                        server_info.updateValue('total_tweets')
                        if (generatedTweetData.media.length) {
                            server_info.updateValue('total_media_count', generatedTweetData.media.map((mediaItem) => mediaItem.url).filter((x) => x).length)
                            insert.v2_twitter_media = insert.v2_twitter_media.concat(generatedTweetData.media)
                        }

                        //v2_twitter_entities
                        insert.v2_twitter_entities = insert.v2_twitter_entities.concat(
                            generatedTweetData.tags.map((tag) => {
                                tag.hidden = inSql.hidden
                                tag.timestamp = inSql.time
                                return tag
                            })
                        )

                        //v2_twitter_polls
                        if (inSql.poll) {
                            insert.v2_twitter_polls = insert.v2_twitter_polls.concat(
                                generatedTweetData.polls.map((poll) => {
                                    poll.origin_tweet_id = inSql.origin_tweet_id
                                    poll.count = 0
                                    return poll
                                })
                            )
                        }

                        //v2_twitter_cards
                        if (inSql.card && !inSql.poll) {
                            insert.v2_twitter_cards.push(generatedTweetData.card)
                            if (generatedTweetData.cardApp.length) {
                                insert.v2_twitter_card_app = insert.v2_twitter_card_app.concat(generatedTweetData.cardApp)
                            }
                        }

                        //v2_twitter_quote
                        if (generatedTweetData.isQuote) {
                            insert.v2_twitter_quote.push(generatedTweetData.quote)
                        }

                        //v2_twitter_tweets
                        insert.v2_twitter_tweets.push(inSql)
                        console.log(`tmv3: #${++singleAccountTweetsCount} Success -> ${inSql.tweet_id}`)
                    }
                } else {
                    server_info.updateValue('total_throw_tweets')
                    console.log(`tmv3: throw ` + path2array('tweet_id', content) + ' (not account post)')
                }
            }

            //insert
            const t = await dbHandle.twitter_monitor.transaction()
            try {
                await V2TwitterTweets.bulkCreate(insert.v2_twitter_tweets, { transaction: t })
                await V2TwitterMedia.bulkCreate(insert.v2_twitter_media, { transaction: t })
                await V2TwitterEntities.bulkCreate(insert.v2_twitter_entities, { transaction: t })
                await V2TwitterPolls.bulkCreate(insert.v2_twitter_polls, { transaction: t })
                await V2TwitterCards.bulkCreate(insert.v2_twitter_cards, { transaction: t })
                await V2TwitterCardApp.bulkCreate(insert.v2_twitter_card_app, { transaction: t })

                //upsert for all quote
                for (const quote of insert.v2_twitter_quote) {
                    await V2TwitterQuote.upsert(quote, { transaction: t })
                }

                //一个号解决
                //差点整死我
                //echo $cursor . "\n";
                if (tmpTweetsInfo.tweetRange.max !== '0' && tmpTweetsInfo.cursor?.top) {
                    await V2AccountInfo.update(
                        {
                            last_cursor: tmpTweetsInfo.tweetRange.max,
                            cursor: tmpTweetsInfo.cursor?.top,
                            new: 1
                        },
                        { transaction: t, where: { uid: accountInfo.uid } }
                    )
                } else if (tmpTweetsInfo.cursor?.top) {
                    await V2AccountInfo.update(
                        {
                            cursor: tmpTweetsInfo.cursor?.top,
                            new: 1
                        },
                        { transaction: t, where: { uid: accountInfo.uid } }
                    )
                }
                await t.commit()
            } catch (e) {
                await t.rollback()
                console.log(e)
            }
        }
        console.log(`tmv3: task complete`)
    } else {
        console.log('tmv3: no tweets')
    }

    server_info.updateValue('total_time_cost', new Date() / 1000 - server_info.getValue('microtime'))

    const serverInfo = server_info.value
    await V2ServerInfo.create(serverInfo)
    console.log(`tmv3: Time cost ${serverInfo.total_time_cost} ms`) //TODO remove

    if (once) {
        process.exit()
    }
}

//await dbHandle.twitter_monitor.close()
//process.exit()
