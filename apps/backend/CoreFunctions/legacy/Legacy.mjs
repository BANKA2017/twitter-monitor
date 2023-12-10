import { readFileSync } from 'node:fs'
import { Op } from 'sequelize'
import { QueryTypes } from 'sequelize'
import { GoogleBrowserTranslate } from '@kdwnil/translator-utils'
import dbHandle from '../../../../libs/core/Core.db.mjs'
import { Log, VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import AccountInfo from '../../../../libs/model/tmv1/account_info.js'
import TwitterData from '../../../../libs/model/tmv1/twitter_data.js'
import TwitterTweets from '../../../../libs/model/tmv1/twitter_tweets.js'
import { apiTemplate } from '../../../../libs/share/Constant.mjs'
import { basePath } from '../../../../libs/share/NodeConstant.mjs'

const ApiLegacyInfo = async (req, res) => {
    const { uid } = getUid(req.query)
    if (uid === '0' || !uid) {
        res.json(apiTemplate(1, 'No record', {}, 'v1'))
        return
    }
    let baseInfo = null
    try {
        baseInfo = await AccountInfo.findOne({
            attributes: [
                [dbHandle.tmv1.options.dialect === 'sqlite' ? dbHandle.tmv1.literal('CAST(uid AS text)') : 'uid', 'uid'],
                'name',
                'display_name',
                'header',
                'banner',
                'following',
                'followers',
                'description',
                'lang',
                'statuses_count',
                [dbHandle.tmv1.options.dialect === 'sqlite' ? dbHandle.tmv1.literal('CAST(top AS text)') : 'top', 'top'],
                'locked',
                'deleted',
                'verified'
            ],
            where: {
                uid
            },
            raw: true
        })
    } catch (e) {
        res.json(apiTemplate(1, 'Unknown error #GetAccount', {}, 'v1'))
        return
    }
    if (baseInfo === null) {
        res.json(apiTemplate(1, 'No record', {}, 'v1'))
    } else {
        baseInfo.header = baseInfo.header.replace(/\/([^\.]+)\.(.*)$/, '/$1_400x400.$2')
        baseInfo.description = baseInfo.description.replace(/ #([^\s]+)/, ' <a href="#/tag/$1">#$1</a>')
        baseInfo.top = baseInfo.top ? String(baseInfo.top) : 0
        baseInfo.uid = String(baseInfo.uid)
        baseInfo.banner = String(baseInfo.banner)
        baseInfo.following = String(baseInfo.following)
        baseInfo.followers = String(baseInfo.followers)
        baseInfo.statuses_count = String(baseInfo.statuses_count)
        baseInfo.translate = ''
        baseInfo.translate_source = ''
        res.json(apiTemplate(0, 'OK', baseInfo, 'v1'))
    }
}

const ApiLegacyTweets = async (req, res) => {
    const { uid } = getUid(req.query)
    if (uid === '0' || !uid) {
        res.json(apiTemplate(1, 'No record', {}, 'v1'))
        return
    }
    const tweetId = String(VerifyQueryString(req.query.tweet_id, 0))
    const statusId = String(VerifyQueryString(req.query.status, 0))
    const queryDisplay = VerifyQueryString(req.query.display, 'all')
    const display = !['self', 'retweet', 'media', 'all'].includes(queryDisplay) ? 'all' : queryDisplay
    const refresh = String(VerifyQueryString(req.query.type, '')).toLocaleLowerCase() === 'refresh'
    const date = Number(VerifyQueryString(req.query.date, 0))
    let getTop = true
    let displayAll = false
    let queryArray = [{ uid }, { hidden: 0 }]
    if (tweetId !== '0') {
        if (display !== 'all') {
            getTop = false
            switch (display) {
                case 'self':
                    queryArray.push({ tweet_id: { [refresh ? Op.gt : Op.lt]: tweetId } }, { retweet_from: { [Op.or]: { [Op.eq]: null, [Op.eq]: '' } } })
                    break
                case 'retweet':
                    queryArray.push({ tweet_id: { [refresh ? Op.gt : Op.lt]: tweetId } }, { retweet_from: { [Op.ne]: null, [Op.ne]: '' } })
                    break
                case 'media':
                    queryArray.push({ tweet_id: { [refresh ? Op.gt : Op.lt]: tweetId } }, { media: { [Op.ne]: '[]' } })
                    break
            }
        } else {
            displayAll = true
            if (refresh) {
                getTop = false
            }
            queryArray.push({ tweet_id: { [refresh ? Op.gt : Op.lt]: tweetId } })
        }
    } else if (statusId !== '0') {
        getTop = false
        queryArray.push({ tweet_id: statusId })
    } else {
        if (display !== 'all') {
            switch (display) {
                case 'self':
                    queryArray.push({ retweet_from: { [Op.or]: { [Op.eq]: null, [Op.eq]: '' } } })
                    break
                case 'retweet':
                    queryArray.push({ retweet_from: { [Op.ne]: null, [Op.ne]: '' } })
                    break
                case 'media':
                    queryArray.push({ media: { [Op.ne]: '[]' } })
                    break
            }
        }
    }

    //date
    if (date > 0) {
        getTop = false
        queryArray.push({ time: { [Op.between]: [date, date + 86400] } })
    }
    let tweets = null
    try {
        tweets = await TwitterTweets.findAll({
            attributes: [
                [dbHandle.tmv1.options.dialect === 'sqlite' ? dbHandle.tmv1.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                'name',
                'display_name',
                'media',
                'full_text',
                'full_text_original',
                'retweet_from',
                'time',
                'translate'
            ],
            where: queryArray,
            limit: 11,
            order: [['tweet_id', 'DESC']],
            raw: true
        })
    } catch (e) {
        res.json(apiTemplate(0, 'Unknown error #Tweets', { data: [], tweet_id: 0, new: 0, hasmore: false }, 'v1'))
        return
    }
    if (tweets === null) {
        res.json(apiTemplate(0, 'No records #Tweets', { data: [], tweet_id: 0, new: 0, hasmore: false }, 'v1'))
        return
    }
    res.json(apiTemplate(0, 'OK', returnData(tweets, 11), 'v1'))
}

const ApiLegacyData = async (req, res) => {
    const { uid } = getUid(req.query)
    if (uid === '0' || !uid) {
        res.json(apiTemplate(0, 'No record', [], 'v1'))
        return
    }
    let chartData = null
    try {
        chartData = await TwitterData.findAll({
            attributes: ['timestamp', 'followers', 'following', 'statuses_count'],
            where: {
                uid
            },
            limit: 144,
            order: [['timestamp', 'DESC']],
            raw: true
        })
    } catch (e) {
        res.json(apiTemplate(1, 'Unknown error #GetData', [], 'v1'))
        return
    }
    if (chartData === null) {
        res.json(apiTemplate(0, 'No record', [], 'v1'))
    } else {
        res.json(
            apiTemplate(
                0,
                'OK',
                chartData.map((data) => {
                    const tmpDate = new Date(data.timestamp * 1000)
                    return {
                        timestamp: `${tmpDate.getFullYear()}-${String(tmpDate.getMonth() + 1).padStart(2, '0')}-${String(tmpDate.getDate()).padStart(2, '0')} ${String(tmpDate.getHours()).padStart(2, '0')}:${String(tmpDate.getMinutes()).padStart(
                            2,
                            '0'
                        )}`,
                        followers: String(data.followers),
                        following: String(data.following),
                        statuses_count: String(data.statuses_count)
                    }
                }),
                'v1'
            )
        )
    }
}

const ApiLegacyTag = async (req, res) => {
    const tweetId = String(VerifyQueryString(req.query.tweet_id, 0))
    const hash = VerifyQueryString(req.query.hash, '')
    if (hash === '') {
        res.json(apiTemplate(0, 'Empty request #GetTag', { data: [], tweet_id: 0, new: 0, hasmore: false }, 'v1'))
        return
    }
    let tweets = null
    try {
        tweets = await dbHandle.tmv1.query(
            dbHandle.tmv1.options.dialect === 'sqlite'
                ? 'SELECT CAST(tweet_id AS text) AS `tweet_id`, `name`, `display_name`, `media`, `full_text`, `full_text_original`, `retweet_from`, `time`, `translate` FROM `twitter_tweets` WHERE `tweet_id` IN (SELECT `tweet_id` FROM `twitter_tags` WHERE `tag` = :hash AND `tweet_id` ' +
                      (tweetId === '0' ? '>' : '<') +
                      " :tweet_id AND `hidden` = '0' ORDER BY `tweet_id` DESC LIMIT 11) ORDER BY `tweet_id` DESC"
                : 'SELECT `tweet_id`, `name`, `display_name`, `media`, `full_text`, `full_text_original`, `retweet_from`, `time`, `translate` FROM `twitter_tweets` WHERE `tweet_id` = ANY(SELECT `tweet_id` FROM (SELECT `tweet_id` FROM `twitter_tags` WHERE `tag` = :hash AND `tweet_id` ' +
                      (tweetId === '0' ? '>' : '<') +
                      " :tweet_id AND `hidden` = '0' ORDER BY `tweet_id` DESC LIMIT 11) AS t) ORDER BY `tweet_id` DESC",
            {
                replacements: {
                    hash,
                    tweet_id: tweetId
                },
                type: QueryTypes.SELECT
            }
        )
    } catch (e) {
        res.json(apiTemplate(0, 'Unknown error #GetTag', { data: [], tweet_id: 0, new: 0, hasmore: false }, 'v1'))
        return
    }
    if (tweets === null) {
        res.json(apiTemplate(0, 'No records #GetTag', { data: [], tweet_id: 0, new: 0, hasmore: false }, 'v1'))
        return
    }
    res.json(apiTemplate(0, 'OK', returnData(tweets, 11), 'v1'))
}

const ApiLegacySearch = async (req, res) => {
    const tweetId = String(VerifyQueryString(req.query.tweet_id, 0))
    const q = VerifyQueryString(req.query.q, '')
    const keyWords = q.split(' ').map((keyword) => ({
        full_text: {
            [Op.like]: `%${keyword}%`
        }
    }))
    let tweets = null
    try {
        tweets = await TwitterTweets.findAll({
            attributes: [
                [dbHandle.tmv1.options.dialect === 'sqlite' ? dbHandle.tmv1.literal('CAST(tweet_id AS text)') : 'tweet_id', 'tweet_id'],
                'name',
                'display_name',
                'media',
                'full_text',
                'full_text_original',
                'retweet_from',
                'time',
                'translate'
            ],
            where: {
                [Op.or]: keyWords,
                hidden: 0,
                tweet_id: { [tweetId !== '0' ? Op.lt : Op.gt]: tweetId }
            },
            limit: 11,
            order: [['tweet_id', 'DESC']],
            raw: true
        })
    } catch (e) {
        res.json(apiTemplate(0, 'Unknown error #Search', { data: [], tweet_id: 0, new: 0, hasmore: false }, 'v1'))
        return
    }
    if (tweets === null) {
        res.json(apiTemplate(0, 'No records #Search', { data: [], tweet_id: 0, new: 0, hasmore: false }, 'v1'))
        return
    }
    res.json(apiTemplate(0, 'OK', returnData(tweets, 11), 'v1'))
}

const ApiLegacyTranslate = async (req, res) => {
    //TODO remove cache
    const target = VerifyQueryString(req.query.to, 'en')
    const tweetId = String(VerifyQueryString(req.query.tweet_id, 0))
    const userId = String(VerifyQueryString(req.query.user_id, 0))
    const { uid } = getUid({ uid: userId })
    const translateType = VerifyQueryString(req.query.type, 'tweets') === 'profile' ? 'profile' : 'tweets'
    if ((tweetId !== 0 && translateType === 'tweets') || (uid !== '0' && translateType === 'profile')) {
        let trInfo = null
        switch (translateType) {
            case 'tweets':
                try {
                    trInfo = await TwitterTweets.findOne({
                        attributes: ['translate', 'full_text_original', 'translate_source'],
                        where: { tweet_id: tweetId },
                        raw: true
                    })
                } catch (e) {
                    res.json(apiTemplate(1, 'Unknown error #GetTweetTranslate', [], 'v1'))
                    return
                }
                break
            case 'profile':
                try {
                    trInfo = await AccountInfo.findOne({
                        attributes: ['description'],
                        where: { uid },
                        raw: true
                    })
                } catch (e) {
                    res.json(apiTemplate(1, 'Unknown error #GetProfileTranslate', [], 'v1'))
                    return
                }
                break
        }
        if (trInfo === null) {
            res.json(apiTemplate(1, 'No translate text', {}, 'v1'))
            return
        } else if (!trInfo.translate) {
            if (translateType === 'profile') {
                trInfo.full_text_original = trInfo.description.replaceAll(/<a[^>]+>([^<]+)<\/a>/gm, '$1')
                delete trInfo.description
            }
            trInfo.cache = false
            trInfo.target = target
            trInfo.translate_source = 'Google Translate'
            trInfo.translate = ''
            try {
                trInfo.translate = await GoogleBrowserTranslate(trInfo.full_text_original.replaceAll(/https:\/\/t.co\/[\w]+/gm, ''), 'auto', target, false)
            } catch (e) {
                Log(false, 'error', e)
                //TODO do nothing
                res.json(apiTemplate(1, 'No translate text', trInfo, 'v1'))
            }
            trInfo.translate_raw = trInfo.translate
            trInfo.translate = trInfo.translate.replaceAll('\n', '<br>')
            res.json(apiTemplate(0, 'OK', trInfo, 'v1'))
        } else if (trInfo.translate && translateType === 'tweets') {
            trInfo.cache = true
            trInfo.target = target
            trInfo.full_text_original = trInfo.full_text_original.replaceAll(/https:\/\/t.co\/[\w]+/gm, '')
            trInfo.translate_raw = trInfo.translate
            trInfo.translate = trInfo.translate.replaceAll('\n', '<br />\n')
            res.json(apiTemplate(0, 'OK', trInfo, 'v1'))
        } else {
            res.json(apiTemplate(1, 'No translate text', {}, 'v1'))
        }
    } else {
        res.json(apiTemplate(1, 'No translate text', {}, 'v1'))
    }
}
const getUid = (query) => {
    let name = VerifyQueryString(query.name, '').toLocaleLowerCase()
    let uid = String(VerifyQueryString(query.uid, 0))
    const data_original = JSON.parse(readFileSync(basePath + '/../libs/assets/tmv1/account_info_n.json'))
    if (name === '' && uid === '0') {
        return { name: '', uid: '0' }
    }
    if (data_original[uid]) {
        return { name: data_original[uid].name, uid }
    } else if (data_original[name]) {
        return { name, uid: data_original[name].uid }
    } else {
        return { name: '', uid: '0' }
    }
}

const returnData = (tweets = [], count = 0) => {
    if (!(tweets instanceof Array)) {
        return { data: [], tweet_id: '0', new: '0', hasmore: false }
    }
    let realCount = tweets.length
    let hasMore = realCount === count
    if (hasMore) {
        tweets.pop()
        realCount -= 1
    }
    let checkNewTweetId = 0
    let tweetId = 0
    if (realCount) {
        checkNewTweetId = tweets[0].tweet_id
    }
    tweets.map((tweet) => {
        tweet.tweet_id = String(tweet.tweet_id)
        tweet.time = String(tweet.time)
        tweet.translate = ''
        tweet.powerby = ''
        tweet.type = 'tweet'
        tweet.media = JSON.parse(tweet.media)
        //find out video
        tweet.hasgif = tweet.media.some((media) => media.original.original_type === 'animated_gif')
        tweet.hasvideo = tweet.media.some((media) => media.original.original_type !== 'photo')
        tweet.top = false
        tweetId = tweet.tweet_id
    })
    return {
        data: tweets,
        tweet_id: tweetId,
        new: checkNewTweetId,
        hasmore: hasMore
    }
}
export { ApiLegacyInfo, ApiLegacyTweets, ApiLegacyTag, ApiLegacySearch, ApiLegacyData, ApiLegacyTranslate }
