// Twitter Monitor v3
// @BANKA2017 && NEST.MOE
// GetTweets()

import { readFileSync, writeFileSync } from 'node:fs'

import { getTweets, getUserInfo } from '../../libs/core/Core.fetch.mjs'
import { GenerateAccountInfo } from '../../libs/core/Core.info.mjs'

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

import { Log, GuestToken, setGlobalServerInfo, Sleep } from '../../libs/core/Core.function.mjs'
import path2array from '../../libs/core/Core.apiPath.mjs'
import { Tweet, TweetsInfo } from '../../libs/core/Core.tweet.mjs'
import dbHandle from '../../libs/core/Core.db.mjs'
import { TGPush } from '../../libs/core/Core.push.mjs'
import { TWEETS_SAVE_PATH } from '../../libs/assets/setting.mjs'
import { ConfigFile } from '../../libs/share/UpdateConfig.mjs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import { CYCLE_SECONDS } from '../../libs/assets/setting.mjs'

let GRAPHQL_MODE = true

// Use WAL in sqlite
if (dbHandle.twitter_monitor.options.dialect === 'sqlite') {
    dbHandle.twitter_monitor.query('PRAGMA journal_mode=WAL;')
}

/* https://stackoverflow.com/questions/73266169/pm2-is-catching-errors-before-they-reach-uncaught-exception-in-node-js */
process.on('uncaughtException', async (err, origin) => {
    Log(false, 'error', `tmv3: Restarting(Exception)...`, err)
    process.exit(0)
})

process.on('unhandledRejection', async (reason, promise) => {
    if (typeof reason === 'object' && reason?.success !== undefined && reason?.token !== undefined) {
        //guest token error
        Log(false, 'error', `tmv3: Restarting(guest_token)...`, reason)
        const sleepTime = 15 * 60 * 1000
        Log(false, 'error', `tmv3: #429 and wait ${sleepTime}ms`)
        await Sleep(sleepTime)
        process.exit(0)
    }
})

const once = (process.argv[2] || '') === 'once'
let firstRun = true

//get init token
global.guest_token = new GuestToken()
await global.guest_token.updateGuestToken(4)
const cycleMilliseconds = CYCLE_SECONDS * 1000

while (true) {
    if (!once) {
        let now = Date.now()
        Log(false, 'log', `tmv3: Wait for ${cycleMilliseconds - (now % cycleMilliseconds)} ms`)
        await Sleep(cycleMilliseconds - (now % cycleMilliseconds))
    }

    // get config from file system
    let config = JSON.parse(readFileSync(basePath + '/../libs/assets/config.json').toString())

    const server_info = new setGlobalServerInfo()
    if (global.guest_token.token.nextActiveTime) {
        await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
        Log(false, 'error', `[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
        await Sleep(global.guest_token.token.nextActiveTime - Date.now())
        await global.guest_token.updateGuestToken(4)
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
        Log(false, 'log', `tmv3: #AutoBreak ` + breakAccountList.join(', '))
    }

    // updateable list
    let refreshableList = config.users
        .map((user, index) => [user, index])
        .filter((user) => user[0].name && !user[0].deleted && ((userId) => userId[1] || (userId[0] > 0 && userId[0] !== '0' && userId[0] !== 'undefined'))([user[0]?.uid, user[0]?.name]))
    let refreshableIdList = refreshableList.map((user) => {
        if (user[0].uid && Number(user[0].uid) > 0) {
            return [user[0]?.uid, -2]
        } else {
            return [user[0]?.name, -3]
        }
    })
    // TODO once have rete limit ban you have to stop crawler up to 30 mins
    let allInfoForAccount = []
    while (refreshableIdList.length) {
        const uidCount = refreshableIdList.filter((id) => !isNaN(id)).length
        const nameCount = refreshableIdList.filter((id) => isNaN(id)).length
        if (global.guest_token.preCheck('UserByScreenName', nameCount) && global.guest_token.preCheck('UserByRestId', uidCount)) {
            allInfoForAccount = allInfoForAccount.concat(await getUserInfo({ user: refreshableIdList, guest_token: global.guest_token.token, graphqlMode: GRAPHQL_MODE, authorization: 4 }))
            global.guest_token.updateRateLimit('UserByScreenName', nameCount)
            global.guest_token.updateRateLimit('UserByRestId', uidCount)
            break
        } else {
            const uidLimit = global.guest_token.getRateLimit('UserByRestId')
            const nameLimit = global.guest_token.getRateLimit('UserByScreenName')
            const tmpRefreshableIdList = refreshableIdList.splice(0, uidLimit > nameLimit ? nameLimit : uidLimit)
            allInfoForAccount = allInfoForAccount.concat(await getUserInfo({ user: tmpRefreshableIdList, guest_token: global.guest_token.token, graphqlMode: GRAPHQL_MODE, authorization: 4 }, global.guest_token.token, GRAPHQL_MODE))
            global.guest_token.updateRateLimit('UserByScreenName', tmpRefreshableIdList.filter((id) => id[1] === -3).length)
            global.guest_token.updateRateLimit('UserByRestId', tmpRefreshableIdList.filter((id) => id[1] === -2).length)
            await global.guest_token.updateGuestToken(4)
            server_info.updateValue('total_req_times')
            if (global.guest_token.token.nextActiveTime) {
                await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                Log(false, 'error', `[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                break // existing
            }
        }
    }

    const accountTransaction = await dbHandle.twitter_monitor.transaction()

    for (const index in allInfoForAccount) {
        const accountInfo = allInfoForAccount[index]
        //TODO accountInfo.code === 336 means feature issue
        Log(false, 'log', refreshableList[index][0].display_name, `(${refreshableList[index][0].name})`, refreshableList[index][1], index)
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
                Log(false, 'log', 'tmv3: #Autobreak' + refreshableList[index][0].display_name + ' -' + accountInfo.status)
            } else {
                Log(false, 'log', 'tmv3: #Autobreak' + refreshableList[index][0].display_name + ' -' + (accountInfo.value?.data?.errors?.[0]?.message || accountInfo?.value?.data?.user?.result?.reason || 'Unknown error'))
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
                    //deleted #50
                    //suspended #63
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
            //Log(false, 'error', accountInfo, accountInfo.value?.data)
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

        // screen_name
        // most people will not change their screen_name, but who knows...
        if (GeneralAccountData.name && refreshableList[index][0]?.name !== GeneralAccountData.name) {
            updateNameList = true
            config.users[refreshableList[index][1]].name = GeneralAccountData.name
        }

        //TODO Use display name
        // display_name (name)
        // Notice: this is a PHP code, do not uncomment them
        //if ($user_info["name"] && $account["display_name"] != $user_info["name"]) {
        //    $update_names = true;
        //    $config["users"][$account_s]["display_name"] = $user_info["name"];
        //}

        //TODO /10k followers monitor
        //monitor data
        if (!(refreshableList[index][0]?.not_analytics ?? false)) {
            monitorDataList.push(monitorDataInfo)
            //await TwitterData.create(monitorDataInfo)
            // temp table for /i/stats
            monitorDataInfo.visible = !(refreshableList[index][0].hidden || refreshableList[index][0].deleted || refreshableList[index][0].organization)
            await TmpTwitterData.upsert(monitorDataInfo, { transaction: accountTransaction })
        } else if (refreshableList[index][0]?.not_analytics ?? false) {
            Log(false, 'log', refreshableList[index][0]?.name + ' - not collect')
        } else {
            await TGPush(`tmv3: ${refreshableList[index][0]?.name} broken data #twitter_data`)
        }

        //check from database by uid
        //new->0 means new account, new->1 existing account
        let verifyInfo = await V2AccountInfo.findOne({
            attributes: [
                [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                'name',
                'display_name',
                'header',
                'banner',
                'description_origin',
                [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(top AS text)') : 'top', 'top'],
                'statuses_count',
                'hidden',
                'locked',
                'deleted',
                'new',
                'cursor',
                [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(last_cursor AS text)') : 'last_cursor', 'last_cursor']
            ],
            where: {
                uid: GeneralAccountData.uid
            }
        })
        if (verifyInfo === null) {
            Log(false, 'log', 'tmv3: new account')
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
            await V2AccountInfo.create(GeneralAccountData, { transaction: accountTransaction })
        } else {
            Log(false, 'log', 'tmv3: update account information')

            //verify
            if (verifyInfo.new === 1 && verifyInfo.statuses_count !== GeneralAccountData.statuses_count) {
                Log(false, 'log', 'tmv3: need update')
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
                Log(false, 'log', 'tmv3: locked')
            }
            await V2AccountInfo.update(GeneralAccountData, { where: { uid: GeneralAccountData.uid }, transaction: accountTransaction })
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
        Log(false, 'log', 'tmv3: now crawling tweets')
        //Log(false, 'log', `tmv3: set GRAPHQL_MODE false`)
        //GRAPHQL_MODE = false
        server_info.updateValue('total_users', nameCount.length)
        //TODO split nameCount if nameCount.length > 1000
        for (const accountInfo of nameCount) {
            if (accountInfo.locked) {
                Log(false, 'log', `tmv3: account ${accountInfo.display_name}(@${accountInfo.name}) is protected`)
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
            // To know more about rate limit, please use our another script https://github.com/BANKA2017/twitter-monitor/tree/node/apps/rate_limit_checker

            await global.guest_token.updateGuestToken(4)
            server_info.updateValue('total_req_times')
            if (global.guest_token.token.nextActiveTime) {
                await TGPush(`[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                Log(false, 'error', `[${new Date()}]: #Crawler #GuestToken #429 Wait until ${global.guest_token.token.nextActiveTime}`)
                break //existing
            }

            Log(false, 'log', `tmv3: ${accountInfo.display_name} (@${accountInfo.name}) #${String(accountInfo.uid)} ${accountInfo.last_cursor ? '- new' : ''}`)

            /* Notice
            To use the search endpoint(NOT A GOOD CHOICE) to the crawler, you might have to make some change:

            GRAPHQL_MODE = false
            await getTweets({
                queryString:`from:${accountInfo.name} ${accountInfo.last_cursor ? 'since_id:' + accountInfo.last_cursor : ''}`,
                guest_token: global.guest_token.token,
                count: 100,
                online: false,
                graphqlMode: GRAPHQL_MODE,
                searchMode: true,
                withReply: false,
                web: true
            })
            global.guest_token.updateRateLimit('Search')
            */
            const tweets = await getTweets({
                queryString: accountInfo.uid, //`from:${accountInfo.name} ${accountInfo.last_cursor ? 'since_id:' + accountInfo.last_cursor : ''}`, //
                cursor: accountInfo.cursor,
                guest_token: global.guest_token.token,
                count: 100,
                online: false,
                graphqlMode: GRAPHQL_MODE,
                searchMode: false,
                withReply: true,
                web: false
            })
            //global.guest_token.updateRateLimit('Search')
            global.guest_token.updateRateLimit('UserTweets')
            server_info.updateValue('total_req_times')
            const tmpTweetsInfo = TweetsInfo(tweets.data, GRAPHQL_MODE)
            if (tmpTweetsInfo.errors.code !== 0) {
                Log(false, 'log', `tmv3: error #${tmpTweetsInfo.errors.code} , ${tmpTweetsInfo.errors.message}`)
                TGPush(`tmv3: error #${tmpTweetsInfo.errors.code} , ${tmpTweetsInfo.errors.message}`)
                continue
            }

            server_info.updateValue('total_req_tweets', tmpTweetsInfo.contentLength)
            let singleAccountTweetsCount = 0
            Log(false, 'log', `tmv3: cursor -->${tmpTweetsInfo.cursor.top || `max_id:${tmpTweetsInfo.tweetRange.max}`}<-- (${tmpTweetsInfo.contentLength})`)

            for (const content of tmpTweetsInfo.contents) {
                //判断非推文//graphql only
                if (GRAPHQL_MODE && ((content.content.entryType !== 'TimelineTimelineItem' && content.content.__typename !== 'TimelineTimelineItem') || !content)) {
                    Log(false, 'log', 'tmv3: Not tweet, break')
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
                        Log(false, 'log', `tmv3: Not supported card ${generatedTweetData.cardMessage.card_name}`)
                        TGPush(generatedTweetData.cardMessage.message)
                    }

                    //writeFileSync(`../../savetweets/${inSql.tweet_id}.json`, JSON.stringify(generatedTweetData))
                    // throw duplicate tweets
                    if (
                        accountInfo.last_cursor &&
                        (await V2TwitterTweets.findOne({
                            attributes: ['id'],
                            where: {
                                tweet_id: inSql.tweet_id
                            }
                        }))
                    ) {
                        Log(false, 'log', `tmv3: throw #${++singleAccountTweetsCount} -> ${inSql.tweet_id} (duplicate)`)
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
                        Log(false, 'log', `tmv3: #${++singleAccountTweetsCount} Success -> ${inSql.tweet_id}`)
                    }
                } else {
                    server_info.updateValue('total_throw_tweets')
                    Log(false, 'log', `tmv3: throw ` + path2array('tweet_id', content) + ' (not account post)')
                }
            }

            //insert
            const t = await dbHandle.twitter_monitor.transaction()
            try {
                //for sqlite full text index
                //INSERT INTO v2_fts (tweet_id, full_text_origin) VALUES (0, "TwitterMonitorTest")
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
                Log(false, 'log', e)
            }
        }
        Log(false, 'log', `tmv3: task complete`)
    } else {
        Log(false, 'log', 'tmv3: no tweets')
    }

    server_info.updateValue('total_time_cost', new Date() / 1000 - server_info.getValue('microtime'))

    const serverInfo = server_info.value
    await V2ServerInfo.create(serverInfo)
    Log(false, 'log', `tmv3: Time cost ${serverInfo.total_time_cost} ms`) //TODO remove

    if (once) {
        process.exit()
    }
}

//await dbHandle.twitter_monitor.close()
//process.exit()
