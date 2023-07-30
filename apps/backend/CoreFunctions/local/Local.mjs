import { CONFIG_ID, SQL_CONFIG } from '../../../../libs/assets/setting.mjs'
import { apiTemplate } from '../../../../libs/share/Constant.mjs'

//settings
import V2Config from '../../../../libs/model/twitter_monitor/v2_config.js'

//account
import V2AccountInfo from '../../../../libs/model/twitter_monitor/v2_account_info.js'

//tweets info
import V2TwitterMedia from '../../../../libs/model/twitter_monitor/v2_twitter_media.js'
import V2TwitterEntities from '../../../../libs/model/twitter_monitor/v2_twitter_entities.js'
import V2TwitterPolls from '../../../../libs/model/twitter_monitor/v2_twitter_polls.js'
import V2TwitterCards from '../../../../libs/model/twitter_monitor/v2_twitter_cards.js'
import V2TwitterCardApp from '../../../../libs/model/twitter_monitor/v2_twitter_card_app.js'
import V2TwitterQuote from '../../../../libs/model/twitter_monitor/v2_twitter_quote.js'
import V2TwitterTweets from '../../../../libs/model/twitter_monitor/v2_twitter_tweets.js'

//twitter data
import TwitterData from '../../../../libs/model/twitter_monitor/twitter_data.js'

import { Log, GetEntitiesFromText, VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { Op, QueryTypes, where } from 'sequelize'
import { Rss } from '../../../../libs/core/Core.Rss.mjs'
import dbHandle from '../../../../libs/core/Core.db.mjs'
import TmpTwitterData from '../../../../libs/model/twitter_monitor/tmp_twitter_data.js'
import V2ServerInfo from '../../../../libs/model/twitter_monitor/v2_server_info.js'

const ApiLocalAccount = async (req, res) => {
    const { data_output } = await getConfigData()
    if (!data_output) {
        res.json(apiTemplate(404, 'No Record Found', {}, 'v3'))
    }
    res.json(apiTemplate(200, 'OK', data_output, 'v3'))
}

const ApiLocalUserInfo = async (req, res) => {
    const { uid } = await GetUid(req.query)
    if (uid === '0' || !uid) {
        res.json(apiTemplate(404, 'No such account', {}, 'v3'))
        return
    }
    let baseInfo = null
    try {
        baseInfo = await V2AccountInfo.findOne({
            attributes: [
                [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                'name',
                'display_name',
                'header',
                'banner',
                'following',
                'followers',
                'description',
                'statuses_count',
                [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(top AS text)') : 'top', 'top'],
                'locked',
                'deleted',
                'verified'
            ],
            where: {
                uid
            }
        })
    } catch (e) {
        res.json(apiTemplate(500, 'Unknown error #GetAccount', {}, 'v3'))
        return
    }
    if (baseInfo === null) {
        res.json(apiTemplate(404, 'No such account', {}, 'v3'))
    } else {
        let tmpData = baseInfo.dataValues
        tmpData.header = tmpData.header.replaceAll(/http:\/\/|https:\/\//gm, '')
        tmpData.uid_str = String(tmpData.uid)
        tmpData.top = tmpData.top || '0'
        tmpData.description = tmpData.description.replaceAll('\n', '<br>\n')
        const originTextAndEntities = GetEntitiesFromText(tmpData.description)
        res.json(
            apiTemplate(
                200,
                'OK',
                Object.assign({}, tmpData, {
                    description_origin: originTextAndEntities.originText,
                    description_entities: originTextAndEntities.entities
                }),
                'v3'
            )
        )
    }
}

const ApiLocalTweets = async (req, res) => {
    const queryForStatus = VerifyQueryString(req.query.is_status, '0') !== '0'
    const queryForConversation = VerifyQueryString(req.query.load_conversation, '0') !== '0'
    let isRssMode = VerifyQueryString(req.query.format, 'json') === 'rss'
    let query = req.query
    if (Object.keys(req.params).length > 0) {
        query.name = VerifyQueryString(req.params[0], '')
        isRssMode = true
    }
    const { uid } = await GetUid(query)
    if (!queryForStatus && !queryForConversation && (uid === '0' || !uid)) {
        res.json(apiTemplate(404, 'No such account', {}, 'v3'))
        return
    }
    const tweetId = VerifyQueryString(req.query.tweet_id, 0)
    if (tweetId >= 0) {
        const refresh = VerifyQueryString(req.query.refresh, '0') !== '0'
        const display = VerifyQueryString(req.query.display, 'all')
        const queryDate = Number(VerifyQueryString(req.query.date, 0))
        const hidden = VerifyQueryString(req.query.hidden, '0') !== '0'

        //count
        const queryCount = Number(VerifyQueryString(req.query.count, isRssMode ? 40 : 20))
        let count = queryCount > 200 ? 200 : queryCount < 1 ? 1 : queryCount
        let queryForTop = true
        let queryObject = []
        const tmpTweets = []
        let top = '0'

        //Log(false, 'log', tweetId, 0, (queryForStatus ? '=' : (tweetId === 0 ? '>' : (refresh ? '>': '<'))))
        //Log(false, 'log', queryForStatus, tweetId, refresh)
        if (!queryForConversation) {
            queryForTop = false

            //space is special
            if (display !== 'space') {
                queryObject.push({ tweet_id: { [queryForStatus ? Op.eq : tweetId === 0 ? Op.gt : refresh ? Op.gt : Op.lt]: tweetId } })
            }

            if (!queryForStatus) {
                if (uid !== '0') {
                    queryObject.push({ uid })
                }
                switch (display) {
                    case 'self':
                        queryObject.push({ retweet_from: { [Op.or]: [{ [Op.eq]: null }, { [Op.eq]: '' }] } })
                        break
                    case 'retweet':
                        queryObject.push({ retweet_from: { [Op.ne]: null, [Op.ne]: '' } })
                        break
                    case 'media':
                        queryObject.push({ media: 1 })
                        break
                    case 'album':
                        queryObject.push({ retweet_from: { [Op.or]: [{ [Op.eq]: null }, { [Op.eq]: '' }] } }, { media: 1 })
                        break
                    case 'space':
                        queryObject.push({
                            tweet_id: {
                                [Op.in]: dbHandle.twitter_monitor.literal(
                                    `(SELECT tweet_id FROM v2_twitter_cards WHERE type = 'audiospace' AND uid = ${dbHandle.twitter_monitor.escape(uid)} ${hidden && uid !== '0' ? 'AND hidden = 0' : ''} AND tweet_id ${
                                        (tweetId === 0 ? '>' : refresh ? '>' : '<') + dbHandle.twitter_monitor.escape(tweetId)
                                    })`
                                )
                            }
                        })
                        break
                    default:
                        queryForTop = !(queryForStatus || tweetId !== 0)
                }

                //date
                if (queryDate > 0 && display !== 'space') {
                    queryForTop = false
                    queryObject.push({
                        time: {
                            [Op.and]: {
                                [Op.lte]: queryDate
                            },
                            [Op.gt]: queryDate + 86400
                        }
                    })
                }

                //hide
                if (hidden && uid !== '0' && display !== 'space') {
                    queryObject.push({ hidden: 0 })
                }
                if (queryForTop && !isRssMode) {
                    let topStatusId = null
                    try {
                        topStatusId = await V2AccountInfo.findOne({
                            attributes: [[dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(top AS text)') : 'top', 'top']],
                            where: {
                                uid
                            }
                        })
                    } catch (e) {
                        res.json(apiTemplate(500, 'Unknown error #GetTop', {}, 'v3'))
                        return
                    }
                    let topTweet = null
                    if (topStatusId !== null && topStatusId?.top !== '0') {
                        try {
                            top = topStatusId.top
                            topTweet = await V2TwitterTweets.findOne({
                                attributes: [
                                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(origin_tweet_id AS text)') : 'origin_tweet_id', 'origin_tweet_id'],
                                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(conversation_id_str AS text)') : 'conversation_id_str', 'conversation_id_str'],
                                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                                    'name',
                                    'display_name',
                                    'media',
                                    'video',
                                    'card',
                                    'poll',
                                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(quote_status AS text)') : 'quote_status', 'quote_status'],
                                    'source',
                                    'full_text',
                                    'full_text_origin',
                                    'retweet_from',
                                    'retweet_from_name',
                                    'dispute',
                                    'time'
                                ],
                                where: {
                                    tweet_id: topStatusId.top
                                },
                                raw: true
                            })
                        } catch (e) {
                            res.json(apiTemplate(500, 'Unknown error #GetTopStatus', {}, 'v3'))
                            return
                        }
                        if (topTweet !== null) {
                            tmpTweets.push(topTweet)
                        }
                    }
                }
            }

            //count
            let tweetList = null
            try {
                tweetList = await V2TwitterTweets.findAll({
                    attributes: [
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(origin_tweet_id AS text)') : 'origin_tweet_id', 'origin_tweet_id'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(conversation_id_str AS text)') : 'conversation_id_str', 'conversation_id_str'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                        'name',
                        'display_name',
                        'media',
                        'video',
                        'card',
                        'poll',
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(quote_status AS text)') : 'quote_status', 'quote_status'],
                        'source',
                        'full_text',
                        'full_text_origin',
                        'retweet_from',
                        'retweet_from_name',
                        'dispute',
                        'time'
                    ],
                    where: { [Op.and]: queryObject },
                    limit: count + (top !== '0' ? 0 : 1),
                    order: [['tweet_id', 'DESC']],
                    raw: true
                })
            } catch (e) {
                Log(false, 'error', e)
                res.json(apiTemplate(500, 'Unknown error #GetTweets', {}, 'v3'))
                return
            }

            if (tweetList !== null) {
                tmpTweets.push(...tweetList)
            }
        } else {
            if (tweetId === 0) {
                res.json(apiTemplate(404, 'No such conversation', {}, 'v3'))
                return
            }
            let conversationList = null
            try {
                //TODO replace to raw query
                conversationList = await V2TwitterTweets.findAll({
                    attributes: [
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(origin_tweet_id AS text)') : 'origin_tweet_id', 'origin_tweet_id'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(conversation_id_str AS text)') : 'conversation_id_str', 'conversation_id_str'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                        'name',
                        'display_name',
                        'media',
                        'video',
                        'card',
                        'poll',
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(quote_status AS text)') : 'quote_status', 'quote_status'],
                        'source',
                        'full_text',
                        'full_text_origin',
                        'retweet_from',
                        'retweet_from_name',
                        'dispute',
                        'time'
                    ],
                    where: {
                        conversation_id_str: {
                            [Op.eq]: dbHandle.twitter_monitor.literal(`(SELECT conversation_id_str FROM v2_twitter_tweets WHERE tweet_id = '${dbHandle.twitter_monitor.twitter_monitor.escape(tweetId)}')`)
                        }
                    },
                    order: [['time']],
                    raw: true
                })
            } catch (e) {
                res.json(apiTemplate(500, 'Unknown error #GetConversationList', {}, 'v3'))
                return
            }
            if (conversationList !== null) {
                tmpTweets.push(...conversationList)
                ;(count = conversationList.length), (top = '0')
            }
        }
        //Log(false, 'log', tmpTweets.length, count, top, typeof top, count + 1)
        const tmpTweetData = await getDataFromTweets(tmpTweets, count + 1, top, true, isRssMode, false, req)
        if (isRssMode) {
            res.append('content-type', 'application/xml;charset=UTF-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.send(tmpTweetData?.rss_message || '')
        } else {
            res.json(apiTemplate(200, 'OK', tmpTweetData, 'v3'))
        }
    } else {
        res.json(apiTemplate(404, 'No such account', {}, 'v3'))
    }
}

const ApiLocalSearch = async (req, res) => {
    const advancedSearchMode = VerifyQueryString(req.query.advanced, '0') !== '0'
    let isRssMode = VerifyQueryString(req.query.format, 'json') === 'rss'
    //count
    const queryCount = Number(VerifyQueryString(req.query.count, isRssMode ? 40 : 20))
    let count = (queryCount > 200 ? 200 : queryCount < 1 ? 1 : queryCount) + 1

    //no idea
    let noRecord = false

    //query text
    const keyWord = VerifyQueryString(req.query.q, '')
        .split(' ')
        .filter((word) => word !== '')

    //tweet id
    const tweetId = VerifyQueryString(req.query.tweet_id, 0)
    const refresh = VerifyQueryString(req.query.refresh, '0') !== '0'
    const hidden = VerifyQueryString(req.query.hidden, '0') !== '0'
    if (advancedSearchMode) {
        //keywords
        const textOrMOde = VerifyQueryString(req.query.text_or_mode, '0') !== '0'
        const textNotMode = VerifyQueryString(req.query.text_not_mode, '0') !== '0'

        //users
        const user = VerifyQueryString(req.query.user, '')
            .replaceAll('@', '')
            .split(' ')
            .filter((word) => word !== '')
        const userAndMode = VerifyQueryString(req.query.user_and_mode, '0') !== '0'
        const userNotMode = VerifyQueryString(req.query.user_not_mode, '0') !== '0'

        //tweet type
        const tweetMedia = VerifyQueryString(req.query.tweet_media, '0') !== '0'
        const tmpTweetType = Number(VerifyQueryString(req.query.tweet_type, 0))
        const tweetType = tmpTweetType > -1 && tmpTweetType < 3 ? tmpTweetType : 0

        //time
        const start = Number(VerifyQueryString(req.query.start, -1))
        const end = Number(VerifyQueryString(req.query.end, -1))

        //order
        const order = VerifyQueryString(req.query.order, '0') !== '0'

        const queryArray = []
        const queryOrArray = []

        if (user.length > 0) {
            for (const userItem of user) {
                const { uid } = await GetUid({ name: userItem })
                if (uid !== '0') {
                    if (userAndMode && !userNotMode) {
                        queryArray.push({ uid })
                    } else if (userAndMode && userNotMode) {
                        queryArray.push({ uid: { [Op.ne]: uid } })
                    } else if (!userAndMode && !userNotMode) {
                        queryOrArray.push({ uid })
                    } else {
                        queryOrArray.push({ uid: { [Op.ne]: uid } })
                    }
                } else if (userAndMode) {
                    res.json(apiTemplate(404, 'No record found', {}, 'v3'))
                    return
                }
            }
        }

        if (keyWord.length > 0) {
            for (const word of keyWord) {
                //TODO fix fulltext scan
                const tmpSql = dbHandle.twitter_monitor.literal(
                    (textNotMode ? 'Not' : '') +
                        (dbHandle.twitter_monitor.options.dialect === 'sqlite'
                            ? dbHandle.twitter_monitor.literal(`tweet_id IN (SELECT tweet_id FROM v2_fts WHERE full_text_origin MATCH ${dbHandle.twitter_monitor.escape(word)})`)
                            : 'MATCH(`full_text_origin`) AGAINST (' + dbHandle.twitter_monitor.twitter_monitor.escape(word) + ' IN BOOLEAN MODE)')
                )
                if (textOrMOde) {
                    queryOrArray.push(tmpSql)
                } else {
                    queryArray.push(tmpSql)
                }
            }
        }
        if (queryOrArray.length > 0) {
            queryArray.push({ [Op.or]: queryOrArray })
        }
        //date
        if (start >= 0) {
            queryArray.push({ time: { [Op.gte]: start } })
        }
        if (end >= 0 && end >= start) {
            queryArray.push({ time: { [Op.lte]: end } })
        }

        //tweet type
        if (tweetType === 1) {
            queryArray.push({ retweet_from: { [Op.or]: [{ [Op.eq]: null }, { [Op.eq]: '' }] } })
        } else if (tweetType === 2) {
            queryArray.push({ retweet_from: { [Op.ne]: null, [Op.ne]: '' } })
        }

        //media
        if (tweetMedia) {
            queryArray.push({ media: 1 })
        }

        //hidden
        if (!hidden) {
            queryArray.push({ hidden: 0 })
        }

        //tweet id
        queryArray.push({ tweet_id: { [refresh || tweetId === 0 ? Op.gt : Op.lt]: tweetId } })

        const queryOrder = order ? [['time']] : [['time', 'DESC']]
        let tweets = null
        try {
            tweets = await V2TwitterTweets.findAll({
                attributes: [
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(origin_tweet_id AS text)') : 'origin_tweet_id', 'origin_tweet_id'],
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(conversation_id_str AS text)') : 'conversation_id_str', 'conversation_id_str'],
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                    'name',
                    'display_name',
                    'media',
                    'video',
                    'card',
                    'poll',
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(quote_status AS text)') : 'quote_status', 'quote_status'],
                    'source',
                    'full_text',
                    'full_text_origin',
                    'retweet_from',
                    'retweet_from_name',
                    'dispute',
                    'time'
                ],
                where: queryArray,
                order: queryOrder,
                limit: count,
                raw: true
            })
        } catch (e) {
            res.json(apiTemplate(500, 'Unknown error #GetAdvancedSearchTweets', {}, 'v3'))
            return
        }
        const tmpTweetData = await getDataFromTweets(tweets || [], count, '0', true, isRssMode, false, req)
        if (isRssMode) {
            res.append('content-type', 'application/xml;charset=UTF-8')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.send(tmpTweetData?.rss_message || '')
        } else {
            res.json(apiTemplate(200, 'OK', tmpTweetData, 'v3'))
        }
    } else {
        const queryArray = []
        const queryOrArray = []
        for (const index in keyWord) {
            const word = keyWord[index]
            let andMode = true
            if (index > 0 && (keyWord[index - 1] === 'or' || keyWord[index + 1] === 'or')) {
                andMode = false
            }
            if (word[0] === '@') {
                const { uid } = await GetUid({ name: word.slice(1) })
                if (uid !== '0') {
                    if (andMode) {
                        queryArray.push({ uid })
                    } else {
                        queryOrArray.push({ uid })
                    }
                } else if (andMode) {
                    noRecord = true
                }
            } else {
                //TODO fix fulltext scan
                //TODO fix fts in sqlite
                if (andMode) {
                    queryArray.push(
                        dbHandle.twitter_monitor.options.dialect === 'sqlite'
                            ? dbHandle.twitter_monitor.literal(`tweet_id IN (SELECT tweet_id FROM v2_fts WHERE full_text_origin MATCH ${dbHandle.twitter_monitor.escape(word)})`)
                            : dbHandle.twitter_monitor.literal('MATCH(`full_text_origin`) AGAINST (' + dbHandle.twitter_monitor.escape(word) + ' IN BOOLEAN MODE)')
                    )
                } else {
                    queryOrArray.push(
                        dbHandle.twitter_monitor.options.dialect === 'sqlite'
                            ? dbHandle.twitter_monitor.literal(`tweet_id IN (SELECT tweet_id FROM v2_fts WHERE full_text_origin MATCH ${dbHandle.twitter_monitor.escape(word)})`)
                            : dbHandle.twitter_monitor.literal('MATCH(`full_text_origin`) AGAINST (' + dbHandle.twitter_monitor.escape(word) + ' IN BOOLEAN MODE)')
                    )
                }
            }
        }
        if (queryOrArray.length > 0) {
            queryArray.push({ [Op.or]: queryOrArray })
        }

        let tweets = null
        if (!noRecord) {
            queryArray.push({ tweet_id: { [refresh || tweetId === 0 ? Op.gt : Op.lt]: tweetId } })
            queryArray.push({ hidden: 0 })
            try {
                tweets = await V2TwitterTweets.findAll({
                    attributes: [
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(origin_tweet_id AS text)') : 'origin_tweet_id', 'origin_tweet_id'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(conversation_id_str AS text)') : 'conversation_id_str', 'conversation_id_str'],
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                        'name',
                        'display_name',
                        'media',
                        'video',
                        'card',
                        'poll',
                        [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(quote_status AS text)') : 'quote_status', 'quote_status'],
                        'source',
                        'full_text',
                        'full_text_origin',
                        'retweet_from',
                        'retweet_from_name',
                        'dispute',
                        'time'
                    ],
                    where: queryArray,
                    order: [['time', 'DESC']],
                    limit: count,
                    raw: true
                })
            } catch (e) {
                //Log(false, 'log', e)
                res.json(apiTemplate(500, 'Unknown error #GetSearchTweets', {}, 'v3'))
                return
            }
            const tmpTweetData = await getDataFromTweets(tweets || [], count, '0', true, isRssMode, false, req)
            if (isRssMode) {
                res.append('content-type', 'application/xml;charset=UTF-8')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.send(tmpTweetData?.rss_message || '')
            } else {
                res.json(apiTemplate(200, 'OK', tmpTweetData, 'v3'))
            }
        } else {
            res.json(apiTemplate(403, 'Invalid Request', {}, 'v3'))
        }
    }
}

const ApiLocalChart = async (req, res) => {
    const { uid } = await GetUid(req.query)
    if (uid === '0' || !uid) {
        res.json(apiTemplate(404, 'No such account', {}, 'v3'))
        return
    }
    //dataset mode
    const datasetMode = VerifyQueryString(req.query.dataset, '0') !== '0'
    const refresh = VerifyQueryString(req.query.refresh, '0') !== '0'
    const endTimestamp = Number(VerifyQueryString(req.query.end, Math.floor(Date.now() / 1000)))
    const tmpLength = Number(VerifyQueryString(req.query.length, 720))
    const length = tmpLength > 2880 ? 2880 : tmpLength < 1 ? 1 : tmpLength

    const queryArray = [{ uid }]
    if (refresh) {
        queryArray.push({ timestamp: { [Op.gt]: endTimestamp } })
    } else {
        queryArray.push({ timestamp: { [Op.lt]: endTimestamp, [Op.gt]: endTimestamp - length * 60 } })
    }
    let tmpChartData = null
    try {
        tmpChartData = await TwitterData.findAll({
            attributes: ['timestamp', 'followers', 'following', 'statuses_count'],
            where: { [Op.and]: queryArray },
            limit: length,
            order: [['timestamp']],
            raw: true
        })
    } catch (e) {
        res.json(apiTemplate(500, 'Unknown error #GetChartData', [], 'v3'))
        return
    }
    if (tmpChartData === null) {
        res.json(apiTemplate(404, 'No Record Found', [], 'v3'))
        return
    }
    if (datasetMode) {
        tmpChartData = tmpChartData.map((tmpChartDataItem) => [tmpChartDataItem?.timestamp, tmpChartDataItem?.followers, tmpChartDataItem?.following, tmpChartDataItem?.statuses_count])
        tmpChartData.unshift(['timestamp', 'followers', 'following', 'statuses_count'])
    }
    res.json(apiTemplate(200, 'OK', tmpChartData, 'v3'))
}

const ApiLocalStats = async (req, res) => {
    const { data_origin } = await getConfigData()
    if (!data_origin.users || !Array.isArray(data_origin.users)) {
        res.json(apiTemplate(404, 'No config', [], 'v3'))
        return
    }
    let tmpStats = null
    try {
        tmpStats = await TmpTwitterData.findAll({
            attributes: [[dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'], 'name', 'followers', 'following', 'statuses_count'],
            where: { visible: 1 },
            raw: true
        })
    } catch (e) {
        res.json(apiTemplate(500, 'Unknown error #GetStats', [], 'v3'))
        return
    }
    if (tmpStats === null) {
        res.json(apiTemplate(404, 'No stats', [], 'v3'))
        return
    }
    const returnStats = tmpStats.map((tmpPersonStats) => {
        const tmpStatsDisplayNameAndProjects = findGroups(data_origin.users, tmpPersonStats.name)
        tmpPersonStats.display_name = tmpStatsDisplayNameAndProjects[0]
        tmpPersonStats.group = tmpStatsDisplayNameAndProjects[1]
        return tmpPersonStats
    })
    res.json(apiTemplate(200, 'OK', returnStats, 'v3'))
}

const ApiLocalStatus = async (req, res) => {
    const datasetMode = VerifyQueryString(req.query.dataset, '0') !== '0'
    let tmpStatus = null
    try {
        tmpStatus = await V2ServerInfo.findAll({
            attributes: ['time', 'total_users', 'total_tweets', 'total_req_tweets', 'total_throw_tweets', 'total_req_times', 'total_errors_count', 'total_media_count', 'total_time_cost'],
            order: [['time', 'DESC']],
            limit: 1440,
            raw: true
        })
    } catch (e) {
        res.json(apiTemplate(500, 'Unknown error #GetStatus', [], 'v3'))
        return
    }
    if (tmpStatus === null) {
        res.json(apiTemplate(404, 'No status', [], 'v3'))
        return
    }
    if (datasetMode) {
        tmpStatus = tmpStatus.map((statusItem) => Object.values(statusItem))
        tmpStatus.push(['time', 'total_users', 'total_tweets', 'total_req_tweets', 'total_throw_tweets', 'total_req_times', 'total_errors_count', 'total_media_count', 'total_time_cost'])
    }
    tmpStatus = tmpStatus.reverse()
    res.json(apiTemplate(200, 'OK', tmpStatus, 'v3'))
}

const ApiLocalTag = async (req, res) => {
    const tagType = req.params[0]

    const hash = VerifyQueryString(req.query.hash, '')

    if (hash === '') {
        res.json(apiTemplate(404, 'No tag', {}, 'v3'))
        return
    }

    const tweetId = VerifyQueryString(req.query.tweet_id, 0)
    const refresh = VerifyQueryString(req.query.refresh, '0') !== '0'
    let isRssMode = VerifyQueryString(req.query.format, 'json') === 'rss'
    //count
    const queryCount = Number(VerifyQueryString(req.query.count, isRssMode ? 40 : 20))
    let count = (queryCount > 200 ? 200 : queryCount < 1 ? 1 : queryCount) + 1

    let tweets = null
    try {
        tweets = await dbHandle.twitter_monitor.query(
            dbHandle.twitter_monitor.options.dialect === 'sqlite'
                ? 'SELECT CAST(tweet_id AS text) AS `tweet_id`, CAST(origin_tweet_id AS text) AS `origin_tweet_id`, CAST(conversation_id_str AS text) AS `conversation_id_str`, CAST(uid AS text) AS `uid`, `name`, `display_name`, `media`, `video`, `card`, `poll`, CAST(quote_status AS text) AS `quote_status`, `source`, `full_text`, `full_text_origin`, `retweet_from`, `retweet_from_name`, `dispute`, `time` FROM `v2_twitter_tweets` WHERE `tweet_id` IN (SELECT `tweet_id` FROM `v2_twitter_entities` WHERE `text` = :hash AND `tweet_id` ' +
                      (refresh || tweetId === 0 ? '>' : '<') +
                      " :tweet_id AND `type` = :tag_type AND `hidden` = '0' ORDER BY `tweet_id` DESC LIMIT :count) ORDER BY `tweet_id` DESC"
                : 'SELECT `tweet_id`, `origin_tweet_id`, `conversation_id_str`, `uid`, `name`, `display_name`, `media`, `video`, `card`, `poll`, `quote_status`, `source`,  `full_text`, `full_text_origin`, `retweet_from`, `retweet_from_name`, `dispute`, `time` FROM `v2_twitter_tweets` WHERE `tweet_id` = ANY(SELECT `tweet_id` FROM (SELECT `tweet_id` FROM `v2_twitter_entities` WHERE `text` = :hash AND `tweet_id` ' +
                      (refresh || tweetId === 0 ? '>' : '<') +
                      " :tweet_id AND `type` = :tag_type AND `hidden` = '0' ORDER BY `tweet_id` DESC LIMIT :count) AS t) ORDER BY `tweet_id` DESC",
            {
                replacements: {
                    hash,
                    tweet_id: tweetId,
                    tag_type: tagType,
                    count
                },
                type: QueryTypes.SELECT
            }
        )
    } catch (e) {
        res.json(apiTemplate(500, 'Unknown error #GetTag', [], 'v3'))
        return
    }
    if (tweets === null) {
        res.json(apiTemplate(404, 'No tag', [], 'v3'))
        return
    }
    const tmpTweetData = await getDataFromTweets(tweets, count, '0', true, isRssMode, false, req)
    if (isRssMode) {
        res.append('content-type', 'application/xml;charset=UTF-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.send(tmpTweetData?.rss_message || '')
    } else {
        res.json(apiTemplate(200, 'OK', tmpTweetData, 'v3'))
    }
}

const ApiLocalHashtagRank = async (req, res) => {
    const reqCount = Number(VerifyQueryString(req.query.count, 20))
    const count = reqCount > 200 ? 200 : reqCount < 1 ? 1 : reqCount

    const toTime = Math.floor(Date.now() / 1000)
    const startTime = toTime - 86400
    let hashtagRank = null
    try {
        hashtagRank = await V2TwitterEntities.findAll({
            attributes: [
                [dbHandle.twitter_monitor.fn('COUNT', dbHandle.twitter_monitor.col('text')), 'value'],
                ['text', 'name']
            ],
            where: {
                type: 'hashtag',
                hidden: 0,
                timestamp: {
                    [Op.gte]: startTime,
                    [Op.lt]: toTime
                }
            },
            limit: count,
            group: 'name',
            order: [['value', 'DESC']],
            raw: true
        })
    } catch (e) {
        res.json(
            apiTemplate(
                500,
                'Unknown error #GetHashtagRank',
                {
                    list: [],
                    start: startTime,
                    end: toTime
                },
                'v3'
            )
        )
        return
    }
    if (hashtagRank === null) {
        res.json(
            apiTemplate(
                404,
                'No hashtag rank list',
                {
                    list: [],
                    start: startTime,
                    end: toTime
                },
                'v3'
            )
        )
        return
    }
    res.json(
        apiTemplate(
            200,
            'OK',
            {
                list: hashtagRank,
                start: startTime,
                end: toTime
            },
            'v3'
        )
    )
}

const ApiLocalTrends = async (req, res) => {
    const now = Math.floor(Date.now() / 1000)
    const length = 24
    const count = 50
    //hashtag list
    let hashTagList = null
    try {
        hashTagList = await V2TwitterEntities.findAll({
            attributes: [[dbHandle.twitter_monitor.fn('COUNT', 'text'), 'total'], 'text'],
            where: {
                type: 'hashtag',
                hidden: 0,
                timestamp: {
                    [Op.gte]: now - length * 3600,
                    [Op.lte]: now
                }
            },
            group: ['text'],
            limit: count,
            order: [['total', 'DESC']],
            raw: true
        })
        if (hashTagList === null) {
            //TODO do nothing
            hashTagList = []
        }
        hashTagList = hashTagList.map((hashtag) => ({ text: hashtag.text, count: hashtag.total }))
    } catch (e) {
        hashTagList = []
    }

    //tweets count
    let tweetsTimeList = null
    try {
        tweetsTimeList = await V2TwitterTweets.findAll({
            attributes: ['time'],
            where: {
                hidden: 0,
                time: {
                    [Op.gte]: now - length * 3600,
                    [Op.lte]: now
                }
            },
            raw: true
        })
        if (tweetsTimeList === null) {
            //TODO do nothing
            tweetsTimeList = []
        }
    } catch (e) {
        tweetsTimeList = []
    }
    let tmpTimeList = new Array(24).fill(0)
    for (const item of tweetsTimeList) {
        tmpTimeList[new Date(item.time * 1000).getUTCHours()]++
    }
    //top data
    //start data
    let startData = []
    let endData = []
    try {
        startData = await dbHandle.twitter_monitor.query(
            dbHandle.twitter_monitor.options.dialect === 'sqlite'
                ? 'SELECT uid, MIN(timestamp) as time, followers, statuses_count FROM `twitter_data` WHERE `timestamp` >= :time GROUP BY uid'
                : 'SELECT uid, MIN(timestamp) as time, ANY_VALUE(followers) AS followers, ANY_VALUE(statuses_count) AS statuses_count FROM `twitter_data` WHERE `timestamp` >= :time GROUP BY uid',
            {
                replacements: {
                    time: now - length * 3600
                },
                type: QueryTypes.SELECT
            }
        )
    } catch (e) {
        //TODO do nothing
    }
    try {
        endData = await dbHandle.twitter_monitor.query(
            'SELECT ' + (dbHandle.twitter_monitor.options.dialect === 'sqlite' ? 'CAST(uid AS text) AS uid' : 'uid') + ', timestamp, followers, statuses_count FROM `tmp_twitter_data` WHERE `visible` = 1 AND `timestamp` >= :time',
            {
                replacements: {
                    time: now - 120
                },
                type: QueryTypes.SELECT
            }
        )
    } catch (e) {
        //TODO do nothing
    }

    let tmpFollowingData = []
    let followersData = [[], []]
    let statusesData = []
    if (endData.length > 0) {
        for (const index in endData) {
            for (const startAccontData of startData) {
                if (startAccontData.uid === endData[index].uid) {
                    endData[index].followers -= startAccontData.followers
                    endData[index].statuses_count -= startAccontData.statuses_count
                    break
                }
            }
        }
        //followers
        endData = endData.sort((a, b) => (b?.followers || 0) - (a?.followers || 0))
        tmpFollowingData = [...endData.slice(0, 5), ...endData.slice(-5)]
        for (const index in tmpFollowingData) {
            let tmpAccountInfo = null
            try {
                tmpAccountInfo = await V2AccountInfo.findOne({
                    attributes: ['name', 'display_name', 'header'],
                    where: {
                        uid: tmpFollowingData[index].uid
                    },
                    raw: true
                })
                if (tmpAccountInfo === null) {
                    continue
                }
                tmpAccountInfo.count = tmpFollowingData[index].followers
                tmpFollowingData[index] = tmpAccountInfo
            } catch (e) {
                continue
            }
        }
        followersData = [tmpFollowingData.slice(0, 5), tmpFollowingData.slice(-5)]

        //status
        endData = endData.sort((a, b) => (b?.statuses_count || 0) - (a?.statuses_count || 0))
        const tmpStatusesData = endData.slice(0, 5)
        for (const data of tmpStatusesData) {
            let tmpAccountInfo = null
            try {
                tmpAccountInfo = await V2AccountInfo.findOne({
                    attributes: ['name', 'display_name', 'header'],
                    where: {
                        uid: data.uid
                    },
                    raw: true
                })
                if (tmpAccountInfo === null) {
                    continue
                }
                tmpAccountInfo.count = data.statuses_count
                statusesData.push(tmpAccountInfo)
            } catch (e) {
                continue
            }
        }
        res.json(
            apiTemplate(
                200,
                SQL_CONFIG.type === 'mysql' ? 'OK' : `Not supported ${SQL_CONFIG.dbtype}`,
                {
                    hashtag_list: hashTagList,
                    tweet_time_list: tmpTimeList,
                    following: followersData,
                    statuses: statusesData
                },
                'v3'
            )
        )
    } else {
        res.json(
            apiTemplate(
                200,
                SQL_CONFIG.type === 'mysql' ? 'OK' : `Not supported ${SQL_CONFIG.dbtype}`,
                {
                    hashtag_list: hashTagList,
                    tweet_time_list: tmpTimeList,
                    following: followersData,
                    statuses: statusesData
                },
                'v3'
            )
        )
    }
}

const GetUid = async (query) => {
    let name = VerifyQueryString(query.name, '')
    let uid = String(VerifyQueryString(query.uid, 0))
    const { data_origin } = await getConfigData()
    if (!data_origin.users || !Array.isArray(data_origin.users) || (name === '' && uid === '0')) {
        return { name: '', uid: '0' }
    }
    //uid first
    const tmpUserList = data_origin.users.filter(
        (user) => user.name !== '' && !(user.uid === '' || user.uid === 'undefined') && ((name.toLowerCase() === (user.name || '').toLowerCase() && !isNaN(user.uid) && typeof user.uid !== 'object') || String(user.uid || '-1') === uid)
    )
    if (tmpUserList.length > 0) {
        name = tmpUserList[0].name
        uid = tmpUserList[0].uid
    } else {
        name = ''
        uid = '0'
    }
    return { name, uid }
}

const getConfigData = async () => {
    let tmpConfig = null
    try {
        tmpConfig = await V2Config.findOne({
            attributes: ['data_origin', 'data_output'],
            where: {
                id: CONFIG_ID
            }
        })
    } catch (e) {
        return { data_origin: {}, data_output: {} }
    }
    if (tmpConfig === null) {
        return { data_origin: {}, data_output: {} }
    } else {
        return { data_origin: JSON.parse(tmpConfig.data_origin), data_output: JSON.parse(tmpConfig.data_output) }
    }
}

const findGroups = (list = [], name = '') => {
    if (list.length === 0 || !name) {
        return ['', []]
    }
    for (const personInfo of list) {
        if ((personInfo?.name || '').toLowerCase() === name.toLowerCase()) {
            return [personInfo?.display_name, (personInfo?.projects || []).map((project) => project[0])]
        }
    }
    return ['', []]
}
const getDataFromTweets = async (tweets = [], count = 0, top = '0', historyMode = false, isRssMode = false, noUserName = false, req = null) => {
    tweets = tweets.filter((tweet) => tweet.tweet_id)
    let realCount = tweets.length
    //Log(false, 'log', realCount, count)
    const hasmore = realCount === count
    if (hasmore) {
        tweets.pop()
        realCount--
    }
    let checkNewTweetId = '0'
    let tweetId = '0'

    let tmpEntities = null
    let tmpPollObject = null
    let tmpCardObject = null
    let tmpCardApps = null
    let tmpQuoteObject = null
    let tmpMediaObject = null
    if (realCount > 0) {
        checkNewTweetId = tweets[top === tweets[0].tweet_id && tweets.length > 1 ? 1 : 0]?.tweet_id ?? '0'
        const tweetIdList = tweets.map((tweet) => tweet.tweet_id)
        const quoteTweetIdList = tweets.filter((tweet) => tweet.quote_status && !isNaN(tweet.quote_status)).map((tweet) => tweet.quote_status)

        try {
            tmpEntities = await V2TwitterEntities.findAll({
                attributes: [[dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'], 'type', 'text', 'expanded_url', 'indices_start', 'indices_end'],
                where: {
                    tweet_id: tweetIdList
                },
                raw: true
            })
            tmpPollObject = await V2TwitterPolls.findAll({
                attributes: [[dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'], 'choice_label', 'poll_order', 'end_datetime', 'count', 'checked'],
                where: {
                    tweet_id: tweetIdList
                },
                raw: true
            })
            tmpCardObject = await V2TwitterCards.findAll({
                attributes: [
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                    'title',
                    'description',
                    'vanity_url',
                    'type',
                    'secondly_type',
                    'url',
                    'media',
                    'unified_card_app'
                ],
                where: {
                    tweet_id: tweetIdList
                },
                raw: true
            })
            tmpCardApps = await V2TwitterCardApp.findAll({
                attributes: [[dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'], 'unified_card_type', 'type', 'appid', 'country_code', 'title', 'category'],
                where: {
                    tweet_id: tweetIdList
                },
                raw: true
            })
            tmpQuoteObject = await V2TwitterQuote.findAll({
                attributes: [[dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'], 'name', 'display_name', 'full_text', 'time', 'media', 'video'],
                where: {
                    tweet_id: quoteTweetIdList
                },
                raw: true
            })
            tmpMediaObject = await V2TwitterMedia.findAll({
                attributes: [
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                    [dbHandle.twitter_monitor.options.dialect === 'sqlite' ? dbHandle.twitter_monitor.literal('CAST(uid AS text)') : 'uid', 'uid'],
                    'cover',
                    'url',
                    'extension',
                    'filename',
                    'origin_type',
                    'source',
                    'content_type',
                    'origin_info_height',
                    'origin_info_width',
                    'title',
                    'description',
                    'blurhash'
                ],
                where: {
                    tweet_id: [...new Set(tweetIdList)],
                    source: { [Op.ne]: 'cover' }
                },
                raw: true
            })
        } catch (e) {
            return {
                tweets: [],
                bottom_tweet_id: '0',
                top_tweet_id: '0',
                hasmore: false,
                rss_mode: false
            }
        }
    }
    const rss = new Rss()
    for (let x = 0; x < realCount; x++) {
        tweets[x].type = 'tweet'
        tweets[x].entities = []
        if (tmpEntities && historyMode) {
            tweets[x].entities = tmpEntities
                .filter((entity) => entity.tweet_id === tweets[x].tweet_id)
                .map((entity) => {
                    delete entity.tweet_id
                    return entity
                })
        }
        //$tweets[$x]["full_text_origin"] = preg_replace('/ https:\/\/t.co\/[\w]+/', '', $tweets[$x]["full_text_origin"]);//TODO for history mode

        //for poll
        tweets[x].pollObject = []
        if (tmpPollObject && tweets[x].poll) {
            tweets[x].pollObject = tmpPollObject
                .filter((poll) => poll.tweet_id === tweets[x].tweet_id)
                .map((poll) => {
                    delete poll.tweet_id
                    poll.checked = poll.checked !== 0
                    return poll
                })
        }

        //for card
        tweets[x].cardObject = {}
        if (tmpCardObject && tweets[x].card) {
            const tmpCard = tmpCardObject.filter((card) => card.tweet_id === tweets[x].tweet_id)
            if (tmpCard.length > 0) {
                tweets[x].cardObject = tmpCard[0]
                if (tmpCardApps && tweets[x].cardObject.unified_card_app) {
                    tweets[x].cardObject.unified_card_app = true
                    tweets[x].cardObject.app = tmpCardApps
                        .filter((app) => app.tweet_id === tweets[x].tweet_id)
                        .map((app) => {
                            delete app.tweet_id
                            return app
                        })
                } else {
                    tweets[x].cardObject.unified_card_app = false
                }
                delete tweets[x].cardObject.tweet_id
            }
        }

        //for quote
        tweets[x].quoteObject = {}
        tweets[x].quote_status_str = '0'
        if (tmpQuoteObject && Number(tweets[x].quote_status) > 0) {
            const tmpQuote = tmpQuoteObject.filter((quote) => quote.tweet_id === tweets[x].quote_status)
            if (tmpQuote.length > 0) {
                tweets[x].quoteObject = tmpQuote[0]
                tweets[x].quoteObject.id_str = String(tweets[x].quoteObject.tweet_id)
                tweets[x].quote_status_str = String(tweets[x].quote_status)
                const originTextAndEntities = GetEntitiesFromText(tweets[x].quoteObject.full_text, 'quote')
                tweets[x].quoteObject.full_text = originTextAndEntities.originText
                tweets[x].quoteObject.entities = originTextAndEntities.entities
            }
        }

        //image
        let tmpImageText = ''
        tweets[x].mediaObject = []
        if (tmpMediaObject && (tweets[x].media || tweets[x].cardObject?.media || tweets[x].quoteObject?.media)) {
            //remove duplicate
            tweets[x].mediaObject = [
                ...new Set(
                    tmpMediaObject
                        .filter((media) => media.tweet_id === tweets[x].tweet_id)
                        .map((media) => {
                            media.cover = media.cover.replaceAll(/https:\/\/|http:\/\//gm, '')
                            media.url = media.url.replaceAll(/https:\/\/|http:\/\//gm, '')
                            media.id_str = String(media.tweet_id)
                            if (!media.title) {
                                delete media.title
                            }
                            if (!media.description) {
                                delete media.description
                            }
                            if (media.source === 'tweets' && media.tweet_id === tweets[x].tweet_id) {
                                tmpImageText += `<img src="https://${media.url}" alt="${(media?.title || '') + (media?.description || '') || 'media'}" />`
                            }
                            return media
                        })
                )
            ]
        }

        //just work for php version, we use <string> in nodejs versions
        //Number.MAX_SAFE_INTEGER => 9007199254740991 "9007199254740991".length => 16
        tweets[x].tweet_id_str = String(tweets[x].tweet_id)
        tweets[x].origin_tweet_id_str = String(tweets[x].origin_tweet_id)
        tweets[x].conversation_id_str = String(tweets[x].conversation_id_str)
        tweets[x].uid_str = String(tweets[x].uid)
        tweetId = tweets[x].tweet_id_str //bottom id

        if (isRssMode) {
            rss.item({
                title: { text: tweets[x].full_text_origin, cdata: true },
                description: {
                    text: tweets[x].full_text.replaceAll(/<a href="([^"]+)" id="([^"]+)"(| target="_blank")>([^<]+)<\/a>/gm, (...match) => (match[2] === 'url' ? match[1] : match[4])) + ' ' + tmpImageText,
                    cdata: true
                },
                pubDate: {
                    text: new Date(tweets[x].time * 1000)
                        .toString()
                        .replaceAll(/\(.*\)/gm, '')
                        .trim(),
                    cdata: false
                },
                guid: { text: `https://twitter.com/${tweets[x].name}/status/${tweets[x].tweet_id}`, cdata: false },
                link: { text: `https://twitter.com/${tweets[x].name}/status/${tweets[x].tweet_id}`, cdata: false },
                author: { text: `${tweets[x].retweet_from_name ? 'RT ' : ''}${tweets[x].retweet_from || tweets[x].display_name} (@${tweets[x].retweet_from_name || tweets[x].name})`, cdata: true }
            })
        }
    }

    if (isRssMode) {
        const buildRssCursor = (url, tweet_id, top = false) => {
            url.searchParams.set('tweet_id', String(tweet_id))
            url.searchParams.set('refresh', top ? '1' : '0')
            const tmpSearchParame = url.searchParams.toString()
            return '/api/v3' + url.pathname + (tmpSearchParame ? '?' + tmpSearchParame : '')
        }
        if (req?.url && typeof req?.url === 'string') {
            req.url = new URL('http://localhost' + req.url)
        }
        const tweetsExists = tweets.length > 0
        rss.channel({
            title: { text: noUserName || !tweetsExists ? 'Twitter Monitor Timeline' + (req.query.name ? ` @${req.query.name}` : '') : `${tweets[0].display_name} (@${tweets[0].name})`, cdata: true },
            link: { text: noUserName ? 'https://twitter.com' : `https://twitter.com/${tweets?.[0]?.name || req.query.name || ''}/`, cdata: false },
            description: { text: 'Feed', cdata: false }, //TODOs
            generator: { text: 'Twitter Monitor', cdata: false },
            webMaster: { text: 'NEST.MOE', cdata: false },
            language: { text: 'zh-cn', cdata: false },
            lastBuildDate: {
                text: new Date()
                    .toString()
                    .replaceAll(/\(.*\)/gm, '')
                    .trim(),
                cdata: false
            },
            ttl: { text: 60, cdata: false },
            ...(req?.url?.searchParams && tweetsExists
                ? {
                      topCursor: { text: buildRssCursor(req.url, tweets[0].tweet_id_str, true), cdata: true },
                      bottomCursor: { text: buildRssCursor(req.url, tweets.slice(-1)[0].tweet_id_str, false), cdata: true }
                  }
                : {})
        })
        return { rss_message: rss.value, rss_mode: true }
    } else {
        return {
            tweets,
            bottom_tweet_id: String(tweetId),
            top_tweet_id: String(checkNewTweetId),
            hasmore,
            rss_mode: false
        }
    }
}

export { ApiLocalAccount, ApiLocalUserInfo, ApiLocalTweets, ApiLocalSearch, ApiLocalChart, ApiLocalStats, ApiLocalStatus, ApiLocalTag, ApiLocalHashtagRank, ApiLocalTrends, GetUid }
