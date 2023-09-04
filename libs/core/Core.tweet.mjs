import { SupportedCardNameList } from '../share/Constant.mjs'
import { Log, GetEntitiesFromText, PathInfo } from './Core.function.mjs'
import { GetMime } from '../share/Mime.mjs'
import { GenerateAccountInfo, GenerateCommunityInfo } from './Core.info.mjs'
import path2array from './Core.apiPath.mjs'

const TweetsInfo = (globalObjects = {}, graphqlMode = true) => {
    let objectForReturn = {
        errors: { code: 0, message: 'Success' },
        contents: [],
        contentLength: 0,
        users: {}, //only for restful mode
        cursor: {
            top: '',
            bottom: ''
        },
        tweetRange: {
            max: '0',
            min: '0'
        }
    }

    const isTweetDeckSearch = globalObjects.modules && Array.isArray(globalObjects.modules)
    const isV1_1Timeline = globalObjects?.twitter_objects?.tweets && globalObjects?.twitter_objects?.users
    const isSingleGraphqlTweet = globalObjects?.data?.tweetResult

    if (globalObjects.errors && !graphqlMode) {
        objectForReturn.errors.code = globalObjects[0].code
        objectForReturn.errors.message = globalObjects[0].message
    } else if ((!path2array('tweets_instructions', globalObjects) && graphqlMode && !isSingleGraphqlTweet) || (isSingleGraphqlTweet && !isSingleGraphqlTweet.result)) {
        objectForReturn.errors.code = 1002
        objectForReturn.errors.message = globalObjects?.data?.user?.result?.__typename ?? 'Nothing here'
    }
    if (objectForReturn.errors.code === 0) {
        const tmpTweets = path2array('tweets_instructions', globalObjects)
        let cursorList = []
        if (isSingleGraphqlTweet) {
            const tmpTweet = path2array('tweet_content', globalObjects)
            objectForReturn.contents.push(tmpTweet)
            objectForReturn.contentLength = 1
            objectForReturn.tweetRange.max = tmpTweet?.rest_id || '0'
            objectForReturn.tweetRange.min = tmpTweet?.rest_id || '0'
            const tmpContent = path2array('graphql_user_result', tmpTweet)
            const tmpEntities = []
            // users
            if (tmpContent) {
                tmpEntities.push([tmpContent.rest_id, tmpContent])
                const tmpRetweetContent = path2array('graphql_user_result', path2array('retweet_graphql_path', tmpTweet))
                const tmpQuoteContent = path2array('graphql_user_result', path2array('quote_graphql_path', tmpTweet))

                if (tmpRetweetContent) {
                    tmpEntities.push([tmpRetweetContent.rest_id, tmpRetweetContent])
                }
                if (tmpQuoteContent) {
                    tmpEntities.push([tmpQuoteContent.rest_id, tmpQuoteContent])
                }
            }
            objectForReturn.users = Object.fromEntries(tmpEntities)
        } else if (graphqlMode) {
            for (const tmpTweet of tmpTweets) {
                if (tmpTweet.type === 'TimelineAddEntries' || tmpTweet.__typename === 'TimelineAddEntries') {
                    cursorList = tmpTweet.entries.filter((content) => content.entryId.startsWith('cursor-'))
                    objectForReturn.contents = objectForReturn.contents
                        .concat(tmpTweet.entries)
                        .filter((content) => content.entryId.startsWith('tweet-') || content.entryId.startsWith('conversationthread-') || content.entryId.startsWith('profile-conversation'))
                    objectForReturn.tweetRange.max = (objectForReturn.contents?.[0]?.entryId || '0').replace(/.*\-(\d+)/, '$1') //path2array('tweet_id', objectForReturn.contents[0]) || 0
                    objectForReturn.tweetRange.min = (objectForReturn.contents.slice(-1)?.[0]?.entryId || '0').replace(/.*\-(\d+)/, '$1') //path2array('tweet_id', objectForReturn.contents.slice(-1)[0]) || 0
                    //users from tweets
                    objectForReturn.users = Object.fromEntries(
                        tmpTweet.entries
                            .filter((content) => content.entryId.startsWith('tweet-') || content.entryId.startsWith('conversationthread-') || content.entryId.startsWith('profile-conversation'))
                            .map((content) => {
                                const tmpContent = path2array('graphql_user_result', path2array('tweet_content', content))
                                if (!tmpContent) {
                                    return [[null, { id_str: null }]]
                                }
                                const tmpEntities = [[tmpContent.rest_id, tmpContent]]
                                const tmpRetweetContent = path2array('graphql_user_result', path2array('retweet_graphql_path', path2array('tweet_content', content)))
                                const tmpQuoteContent = path2array('graphql_user_result', path2array('quote_graphql_path', path2array('tweet_content', content)))

                                if (tmpRetweetContent) {
                                    tmpEntities.push([tmpRetweetContent.rest_id, tmpRetweetContent])
                                }
                                if (tmpQuoteContent) {
                                    tmpEntities.push([tmpQuoteContent.rest_id, tmpQuoteContent])
                                }
                                return tmpEntities
                            })
                            .flat()
                            .filter((content) => content[0])
                    )
                    //userList
                    for (const tmpUser of tmpTweet.entries.filter((content) => content.entryId.startsWith('user-'))) {
                        objectForReturn.users[tmpUser.content.itemContent.user_results.result.rest_id] = tmpUser.content.itemContent.user_results.result
                    }
                } else if (tmpTweet.type === 'TimelinePinEntry' || tmpTweet.__typename === 'TimelinePinEntry') {
                    objectForReturn.contents.push(tmpTweet.entry)
                } else if (tmpTweet.type === 'TimelineReplaceEntry' || tmpTweet.__typename === 'TimelineReplaceEntry') {
                    if (tmpTweet.entry_id_to_replace?.startsWith('cursor-')) {
                        cursorList.push(tmpTweet.entry)
                    } else if ((tmpTweet.entries || []).some((content) => content.entryId.startsWith('cursor-'))) {
                        cursorList = tmpTweet.entries.filter((content) => content.entryId.startsWith('cursor-'))
                    }
                }
            }
            objectForReturn.contentLength = objectForReturn.contents.length
            for (let tmpCursor of cursorList) {
                if (tmpCursor?.entry?.content) {
                    tmpCursor = tmpCursor.entry
                } else if (tmpCursor?.content?.itemContent?.value) {
                    tmpCursor = {
                        content: {
                            entryType: tmpCursor.content.itemContent.itemType,
                            cursorType: tmpCursor.content.itemContent.cursorType,
                            value: tmpCursor.content.itemContent.value
                        }
                    }
                } else if (tmpCursor?.content?.content) {
                    tmpCursor = tmpCursor.content
                }
                if (tmpCursor.content.entryType !== 'TimelineTimelineCursor' && tmpCursor.content.__typename !== 'TimelineTimelineCursor') {
                    continue
                }
                if (tmpCursor.content.cursorType === 'Top') {
                    objectForReturn.cursor.top = tmpCursor.content.value
                } else if (tmpCursor.content.cursorType === 'Bottom') {
                    objectForReturn.cursor.bottom = tmpCursor.content.value
                }
            }
        } else {
            if (isV1_1Timeline) {
                objectForReturn.users = globalObjects?.twitter_objects?.users || []
            } else {
                objectForReturn.users =
                    globalObjects?.globalObjects?.users || isTweetDeckSearch
                        ? Object.fromEntries(
                              tmpTweets
                                  .map((tweet) => tweet?.status?.data?.user)
                                  .filter((tweet) => tweet)
                                  .map((user) => [user.id_str, user])
                          )
                        : []
            }

            objectForReturn.contents = isTweetDeckSearch ? tmpTweets.map((tweet) => tweet?.status?.data).filter((tweet) => tweet) : Object.values(tmpTweets)
            if (isV1_1Timeline) {
                objectForReturn.contents = objectForReturn.contents.sort((a, b) => b.id_str - a.id_str)
            }
            objectForReturn.contentLength = objectForReturn.contents.length
            const tmpContentKeys = isTweetDeckSearch ? tmpTweets.map((tweet) => tweet?.status?.data?.id_str).filter((tweet_id) => tweet_id) : Object.keys(tmpTweets).sort((a, b) => b - a)
            objectForReturn.tweetRange.max = tmpContentKeys[0]
            objectForReturn.tweetRange.min = tmpContentKeys.slice(-1)[0]

            if (isV1_1Timeline && globalObjects?.response?.cursor) {
                objectForReturn.cursor.top = globalObjects.response.cursor.top
                objectForReturn.cursor.bottom = globalObjects.response.cursor.bottom
            } else {
                for (const first_instructions of globalObjects?.timeline?.instructions || []) {
                    for (const second_instructions_value of Object.values(first_instructions)) {
                        if (second_instructions_value.entry) {
                            if (second_instructions_value.entryIdToReplace.endsWith('cursor-top')) {
                                objectForReturn.cursor.top = second_instructions_value.entry.content.operation.cursor.value
                            } else if (second_instructions_value.entryIdToReplace.endsWith('cursor-bottom')) {
                                objectForReturn.cursor.bottom = second_instructions_value.entry.content.operation.cursor.value
                            }
                        } else {
                            for (const third_entries_value of second_instructions_value.entries) {
                                if (third_entries_value.entryId.endsWith('cursor-top') || third_entries_value?.content?.operation?.cursor?.cursorType === 'Top') {
                                    objectForReturn.cursor.top = third_entries_value.content.operation.cursor.value
                                } else if (third_entries_value.entryId.endsWith('cursor-bottom') || third_entries_value?.content?.operation?.cursor?.cursorType === 'Bottom') {
                                    objectForReturn.cursor.bottom = third_entries_value.content.operation.cursor.value
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return objectForReturn
}

const Tweet = (content = {}, users = {}, contentList = [], recrawlerObject = {}, graphqlMode = true, hidden = false, online = false) => {
    const recrawlMode = !!Object.keys(recrawlerObject).length
    let tmpInfo = {}

    let quoteUrl = ''
    let cardUrl = ''

    let GeneralTweetData = {
        retweet_from: '', //display_name
        retweet_from_name: '', //name
        origin_tweet_id: '0',
        tweet_id: '0',
        uid: '0',
        conversation_id_str: 0,
        name: '',
        display_name: '',
        full_text: '',
        full_text_origin: '',
        time: 0,
        media: 0, //v2中切为int类型(sql中tinyint)
        video: 0, //是否有视频
        card: '', //卡片类型, 留空则表示没有
        poll: 0, //是否有投票, 有投票必有卡片, 有卡片未必有投票

        //引用推文相关
        quote_status: 0, //是否引用其他推文

        //place: o,//是否有地理坐标
        source: '', //来源
        hidden

        //translate
        //translate: "",
        //translate_source: "",
    }
    let userInfo = {}
    let retweetUserInfo = {}
    let tags = []
    let richtext = {}
    let quote = {}
    let media = []
    let quoteMedia = []
    let cardMedia = []
    let video = []
    let card = {}
    let cardApp = {}
    let cardMessage = {
        card_name: '',
        supported: false,
        message: ''
    }
    let place = {}
    let polls = []
    let interactiveData = { favorite_count: 0, retweet_count: 0, quote_count: 0, view_count: 0, reply_count: 0 }
    let isQuote = false
    let isRetweet = false
    let isRtl = false
    let displayTextRange = [0, 0]
    let vibe = {
        text: '',
        imgDescription: '',
        discoveryQueryText: ''
    }
    let community = {}
    let socialContext = {}
    let birdwatch = {}

    let originTextAndEntities
    if (graphqlMode) {
        if (content?.content?.itemContent?.socialContext) {
            socialContext = content.content.itemContent.socialContext
        }
        content = path2array('tweet_content', content) || content
    }
    GeneralTweetData.tweet_id = path2array('tweet_id', content)
    GeneralTweetData.origin_tweet_id = GeneralTweetData.tweet_id
    GeneralTweetData.uid = path2array('tweet_uid', content)
    GeneralTweetData.conversation_id_str = path2array('tweet_conversation_id_str', content) || GeneralTweetData.tweet_id
    GeneralTweetData.time = Math.floor(Date.parse(path2array('tweet_created_at', content)) / 1000)
    //source
    GeneralTweetData.source = (path2array('tweet_source', content) || '').replaceAll(/<a[^>]+>(.*)<\/a>/gm, '$1')
    if (recrawlMode) {
        GeneralTweetData.name = recrawlerObject.name
        GeneralTweetData.display_name = recrawlMode.display_name
    } else {
        tmpInfo = graphqlMode ? path2array('graphql_user_result', content) ?? {} : users[GeneralTweetData.uid] ?? {}
        if (Object.keys(tmpInfo).length && (tmpInfo?.legacy?.screen_name || tmpInfo?.screen_name)) {
            const tmpInfoHandle = GenerateAccountInfo(tmpInfo)
            userInfo = tmpInfoHandle.GeneralAccountData
            userInfo.uid_str = GeneralTweetData.uid
            userInfo.uid = GeneralTweetData.uid
            userInfo.description = userInfo.description.replaceAll('\n', '<br />')
            userInfo.header = userInfo.header.replaceAll(/http:\/\/|https:\/\//gm, '')
            originTextAndEntities = GetEntitiesFromText(userInfo.description)
            userInfo.description_origin = originTextAndEntities.originText
            userInfo.description_entities = originTextAndEntities.entities
            GeneralTweetData.name = userInfo.name ?? ''
            GeneralTweetData.display_name = userInfo.display_name ?? ''
        }
    }

    //判断是否转推
    //TODO 处理local模式下的 recrawl
    if (path2array('retweet_rest_id', content)) {
        isRetweet = true
        GeneralTweetData.origin_tweet_id = path2array('retweet_rest_id', content)
        if (graphqlMode) {
            content = path2array('retweet_graphql_path', content)
            //quoted_status_result.result.core.user_results.result.legacy.screen_name
            tmpInfo = path2array('graphql_user_result', content)
            if (tmpInfo && (tmpInfo?.legacy?.screen_name || tmpInfo?.screen_name)) {
                const tmpRetweetInfoHandle = GenerateAccountInfo(tmpInfo)
                retweetUserInfo = tmpRetweetInfoHandle.GeneralAccountData
                retweetUserInfo.description = retweetUserInfo.description.replaceAll('\n', '<br />')
                retweetUserInfo.header = retweetUserInfo.header.replaceAll(/http:\/\/|https:\/\//gm, '')
                retweetUserInfo.uid_str = path2array('tweet_uid', content)
                retweetUserInfo.uid = retweetUserInfo.uid_str
                originTextAndEntities = GetEntitiesFromText(retweetUserInfo.description)
                retweetUserInfo.description_origin = originTextAndEntities.originText
                retweetUserInfo.description_entities = originTextAndEntities.entities
                GeneralTweetData.retweet_from = retweetUserInfo.display_name ?? ''
                GeneralTweetData.retweet_from_name = retweetUserInfo.name ?? ''
            }
        } else {
            //TODO recrawl
            if (recrawlMode) {
            } else {
                //find tweet content from contentList
                content = contentList.find((contentItem) => contentItem.id_str === path2array('retweet_rest_id', content))
                if (!content) {
                    Log(false, 'log', 'tmv3: no retweet content')
                    return { error: { code: 1003, message: 'No retweet content' } }
                }
                tmpInfo = users[content.user_id_str || content?.user?.id_str]
                if (tmpInfo && tmpInfo.screen_name) {
                    const tmpRetweetInfoHandle = GenerateAccountInfo(tmpInfo)
                    retweetUserInfo = tmpRetweetInfoHandle.GeneralAccountData
                    retweetUserInfo.description = retweetUserInfo.description.replaceAll('\n', '<br />')
                    retweetUserInfo.header = retweetUserInfo.header.replaceAll(/http:\/\/|https:\/\//gm, '')
                    retweetUserInfo.uid_str = content.user_id_str
                    retweetUserInfo.uid = content.user_id_str
                    originTextAndEntities = GetEntitiesFromText(retweetUserInfo.description)
                    retweetUserInfo.description_origin = originTextAndEntities.originText
                    retweetUserInfo.description_entities = originTextAndEntities.entities
                    GeneralTweetData.retweet_from = retweetUserInfo.display_name ?? ''
                    GeneralTweetData.retweet_from_name = retweetUserInfo.name ?? ''
                }
            }
        }
    }

    //community
    //TODO broken in v2 timeline
    if (graphqlMode && content?.community_results) {
        community = GenerateCommunityInfo(content.community_results.result)
    }

    //给卡片找源链接
    cardUrl = content.card && !(path2array('tweet_card_url', content.card) || '').startsWith('card://') ? path2array('tweet_card_url', content.card) : ''

    //真的有quote嘛
    //如果没用twitter会显示 "这条推文不可用。"
    //推文不可用不等于原推被删, 虽然真正的原因是什么我只能说我也不知道
    //群友说可能是被屏蔽了, 仅供参考

    isQuote = !!(
        (!graphqlMode && content.is_quote_status && contentList.some((contentItem) => contentItem.id_str === content.quoted_status_id_str)) ||
        (graphqlMode && content?.legacy?.is_quote_status && (content.quoted_status || content.quoted_status_result))
    )
    quoteUrl = isQuote ? path2array('tweet_quote_url', content) : ''

    //full_text
    GeneralTweetData.full_text_origin = path2array('tweet_full_text', content) //原始全文
    const tmpEntities = path2array('tweet_entities', content)
    if (Object.keys(tmpEntities).some((key) => tmpEntities[key].length > 0)) {
        tags = GenerateEntities(tmpEntities, GeneralTweetData.uid, GeneralTweetData.tweet_id, hidden)
    }
    //richtext
    //TODO broken in v2 timeline
    if (content?.note_tweet?.note_tweet_results?.result?.richtext) {
        richtext = { richtext: content.note_tweet.note_tweet_results.result.richtext, text: GeneralTweetData.full_text_origin, entities: tags }
    }
    //full text with html tags
    const tmpTextObjects = GenerateFullTextWithHtml(GeneralTweetData.full_text_origin, cardUrl, quoteUrl, tags)
    GeneralTweetData.full_text = tmpTextObjects.text
    cardUrl = tmpTextObjects.cardUrl

    //media
    media = GetMedia(content, GeneralTweetData.uid, GeneralTweetData.tweet_id, hidden, online)

    //video
    if (media.length && media.some((x) => ['video', 'animated_gif'].includes(x.origin_type))) {
        video = (path2array('tweet_media_path', content) || []).filter((x) => x.video_info).map((x) => x.video_info)
        GeneralTweetData.video = 1
    }

    //quote
    if (isQuote) {
        GeneralTweetData.quote_status = path2array('quote_tweet_id', content)
        //TODO recrawl mode
        const quoteContent = graphqlMode ? path2array('quote_graphql_path', content) : contentList.find((contentItem) => contentItem.id_str === GeneralTweetData.quote_status)
        if (quoteContent && !quoteContent.tombstone) {
            const quoteObject = GetQuote(quoteContent, users, GeneralTweetData.uid, GeneralTweetData.tweet_id, graphqlMode, hidden, online)
            quote = quoteObject.inSqlQuote
            quoteMedia = quoteObject.quoteMedia
            media = media.concat(quoteMedia)
        } else if (quoteContent.tombstone) {
            Log(false, 'log', `tmv3: Quote deleted (from #${GeneralTweetData.tweet_id})`)
        }
    }

    //card
    const tmpCard = path2array('tweet_card_path', content)

    if (tmpCard || content.voice_info) {
        let cardObject
        if (tmpCard) {
            cardObject = GetCard(tmpCard, GeneralTweetData.uid, GeneralTweetData.tweet_id, cardUrl, graphqlMode, hidden, online)
        } else if (content.voice_info) {
            //audio space for V2 response
            cardObject = {
                supported: true,
                card_name: 'audiospace',
                message: 'Success',
                card_type: 'audiospace',
                data: {
                    type: 'audiospace', //类型
                    secondly_type: '', //子类型
                    title: content.voice_info.audio_space_title, //标题
                    description: '', //简介
                    vanity_url: '', //用于展示的域名
                    url: content.voice_info.audio_space_id, //实际域名
                    media: 0, //是否有媒体
                    unified_card_app: 0,
                    poll: 0, //是否有投票
                    uid: GeneralTweetData.uid,
                    tweet_id: GeneralTweetData.tweet_id,
                    hidden,
                    polls: []
                },
                poll: 0,
                media: [],
                app_data: []
            }
        }

        GeneralTweetData.card = cardObject.card_type
        GeneralTweetData.poll = cardObject.poll
        card = cardObject.data
        if (card.polls) {
            polls = card.polls
            delete card.polls
            delete card.poll
        }
        cardApp = cardObject.app_data
        cardMedia = cardObject.media
        media = media.concat(cardMedia)
        cardMessage.card_name = cardObject.card_name
        cardMessage.supported = cardObject.supported
        cardMessage.message = cardObject.message
    }

    //media
    if (media.length) {
        GeneralTweetData.media = 1
    }

    //interactive data
    interactiveData.favorite_count = content?.legacy?.favorite_count ?? content?.favorite_count ?? 0
    interactiveData.retweet_count = content?.legacy?.retweet_count ?? content?.retweet_count ?? 0
    interactiveData.quote_count = content?.legacy?.quote_count ?? content?.quote_count ?? 0
    interactiveData.reply_count = content?.legacy?.reply_count ?? content?.reply_count ?? 0

    interactiveData.view_count = content?.views?.count ?? content?.views_count ?? 0

    //rtl
    isRtl = (content?.legacy?.lang ?? content?.lang ?? '').includes(['ar', 'fa', 'iw', 'ur'])

    //display text range
    displayTextRange = content?.legacy?.display_text_range ?? content?.display_text_range ?? [0, 0]

    //vibe, like status?
    if (graphqlMode && (content?.vibe?.text || content?.vibe?.imgDescription)) {
        vibe = {
            text: content?.vibe?.text ?? '',
            imgDescription: content?.vibe?.imgDescription ?? '',
            discoveryQueryText: content?.vibe?.discoveryQueryText ?? ''
        }
    }

    //place
    if (content?.legacy?.place || content?.place) {
        place = content?.legacy?.place || content?.place || {}
    }

    //birdwatch
    if (graphqlMode && content?.birdwatch_pivot) {
        //TODO add entities
        birdwatch = {
            id: content.birdwatch_pivot?.note?.rest_id || '0',
            text: content.birdwatch_pivot?.subtitle?.text || '',
            title: content.birdwatch_pivot?.footer?.text || ''
        }
    }

    return {
        GeneralTweetData,
        userInfo,
        retweetUserInfo,
        tags,
        richtext,
        quote,
        media,
        quoteMedia,
        cardMedia,
        video,
        card,
        cardApp,
        cardMessage,
        place,
        polls,
        interactiveData,
        isQuote,
        isRetweet,
        isRtl,
        displayTextRange,
        vibe,
        community,
        socialContext,
        birdwatch
    }
}

const GenerateEntities = (entities = [], uid = '0', tweetId = '0', hidden = false) => {
    //处理entities//包括图片//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
    let tags = []

    for (const type in entities) {
        if (['symbols', 'hashtags', 'urls', 'user_mentions'].includes(type)) {
            for (const entity of entities[type]) {
                tags.push(Entity(type, entity, uid, tweetId, hidden))
            }
        }
    }
    return tags.sort((a, b) => a.indices_start - b.indices_start)
}

const GenerateFullTextWithHtml = (fullText = '', cardUrl = '', quoteUrl = '', entities = []) => {
    let newText = ''
    let lastEnd = 0
    fullText = typeof fullText === 'string' ? [...fullText] : []
    const entitiesLength = entities.length
    for (const entityIndex in entities) {
        const singleTag = entities[entityIndex]
        let addText = ''
        switch (singleTag.type) {
            case 'hashtag':
                addText += `<a href=\"#/hashtag/${singleTag.text}\" id=\"hashtag\">#${singleTag.text}</a>`
                break
            case 'symbol':
                addText += `<a href=\"#/hashtag/${singleTag.text}\" id=\"symbol\">#${singleTag.text}</a>`
                break
            case 'user_mention':
                addText += `<a href=\"${singleTag.expanded_url}\" id=\"user_mention\" target=\"_blank\">${singleTag.text}</a>`
                break
            case 'url':
                if (cardUrl === singleTag.url && entityIndex === entitiesLength - 1) {
                    cardUrl = singleTag.expanded_url
                } else if (singleTag.url !== quoteUrl) {
                    addText += `<a href=\"${singleTag.expanded_url}\" id=\"url\" target=\"_blank\">${singleTag.text}</a>`
                }

                break
        }

        newText += fullText.slice(lastEnd, singleTag.indices_start).join('') + addText
        lastEnd = singleTag.indices_end
    }

    //处理最后的一段
    newText += fullText.slice(lastEnd).join('')
    //如果有媒体最后就会有一段类似于 https://t.co/114514 的短链接//有卡片同理
    return {
        text: newText.replaceAll(/ https:\/\/t.co\/[\w]+/g, '').replaceAll('\n', '<br />'),
        cardUrl
    }
}

const GetMedia = (content = {}, uid = '0', tweetId = '0', hidden = false, online = false, source = 'tweets', cardType = '') => {
    if (!content) {
        return []
    }
    let tmpMedia = []
    const tmpMediaContent = path2array('tweet_media_path', content) || []
    for (const index in tmpMediaContent) {
        tmpMedia = tmpMedia.concat(Media(tmpMediaContent[index], uid, tweetId, hidden, source, cardType, online))
    }
    return tmpMedia
}

const GetQuote = (content = {}, users = {}, uid = '0', tweetId = '0', graphqlMode = true, hidden = false, online = false) => {
    //处理quote
    //事实上"is_quote_status"为false的时候根本不会显示出来
    //需要处理上面full_text的一段//所以可能需要移到上面处理
    //quote不会显示card
    //若推文不存在不需要处理此处
    //从返回的数据里面重新抽出该条推文
    //content = $tweets["globalObjects"]["tweets"][content["quoted_status_id_str"]];//来吧
    //$in_sql["quote_status"] = content["quoted_status_id_str"];//TODO get quote tweet_id in main
    if (graphqlMode && content.tweet) {
        content = content.tweet
    }
    // tombstone means deleted
    if (content.tombstone) {
        Log(false, 'log', `tmv3: Quote deleted`)
        return {
            inSqlQuote: {
                tweet_id: '',
                uid: '',

                name: '',
                display_name: '',

                full_text: '',
                full_text_origin: '',
                time: 0,
                media: 0, //v2中切为int类型(sql中tinyint)
                video: 0, //是否有视频
                //hidden//本人认为此库数据不需要hidden
                deleted: true
            },
            quoteMedia: []
        }
    }
    let inSqlQuote = {
        tweet_id: path2array('tweet_id', content),
        uid: path2array('tweet_uid', content),

        name: '',
        display_name: '',

        full_text: path2array('tweet_full_text', content),
        full_text_origin: path2array('tweet_full_text', content),
        time: Math.floor(Date.parse(path2array('tweet_created_at', content)) / 1000),
        media: 0, //v2中切为int类型(sql中tinyint)
        video: 0 //是否有视频
        //hidden//本人认为此库数据不需要hidden
    }

    //TODO recrawl mode
    //name and display_name
    if (graphqlMode) {
        //quoted_status_result.result.core.user_results.result.legacy
        inSqlQuote.display_name = path2array('graphql_user_result', content)?.legacy?.name ?? ''
        inSqlQuote.name = path2array('graphql_user_result', content)?.legacy?.screen_name ?? ''
        if (!inSqlQuote.name && !inSqlQuote.display_name) {
            Log(false, 'log', `tmv2: warning, no display name [${inSqlQuote.tweet_id}]`)
        }
    } else {
        inSqlQuote.display_name = content?.user?.name ?? users[content.user_id_str || content?.user?.id_str]?.name ?? ''
        inSqlQuote.name = content?.user?.screen_name ?? users[content.user_id_str || content?.user?.id_str]?.screen_name ?? ''
    }

    //full_text
    const tmpEntities = path2array('tweet_entities', content) || []
    for (const quoteEntity of tmpEntities.urls ?? []) {
        inSqlQuote.full_text = inSqlQuote.full_text.replaceAll(quoteEntity.url, `<a href=\"${quoteEntity.expanded_url}\" id=\"quote_url\" target=\"_blank\" style=\"color: black\">${quoteEntity.display_url}</a>`)
    }
    inSqlQuote.full_text = inSqlQuote.full_text.replaceAll(/ https:\/\/t.co\/[\w]+/g, '').replaceAll('\n', '\n<br />')

    //media
    let quoteMedia = []
    if (tmpEntities.media) {
        inSqlQuote.media = 1
        quoteMedia = GetMedia(content, uid, tweetId, hidden, online, 'quote_status')
        if (quoteMedia.some((mediaItem) => !mediaItem.origin_type.endsWith('photo'))) {
            inSqlQuote.video = 1
        }
    }

    return {
        inSqlQuote,
        quoteMedia
    }
}

const GetCard = (cardContent = {}, uid = '0', tweetId = '0', cardUrl = '', graphqlMode = true, hidden = false, online = false) => {
    //rest & graphql are same
    //$content = path_to_array("tweet_card_path", $content);
    let returnDataCard = {
        data: {},
        media: [],
        supported: false,
        card_name: '', //not very important
        card_type: '',
        message: 'Success',

        poll: 0,
        app_data: []
    }

    returnDataCard.card_name = path2array('tweet_card_name', cardContent)
    returnDataCard.card_type = returnDataCard.card_name.replaceAll(/[\d]+:(.*)/g, '$1')
    if (SupportedCardNameList.includes(returnDataCard.card_type)) {
        const cardInfo = Card(cardContent, uid, tweetId, hidden, cardUrl, returnDataCard.card_type, graphqlMode, online)

        //TODO fix array in data
        returnDataCard.data = cardInfo.data
        returnDataCard.app_data = cardInfo.app_data ?? []
        returnDataCard.supported = true
        if ((cardInfo.data.poll ?? 0) && (cardInfo.data.polls ?? [])) {
            returnDataCard.poll = 1
        }
        //media
        if (cardInfo.media.length) {
            //风水轮流转, 这次到奇妙的 unified_card 了//promo_image_convo 也会有的, 晚点
            returnDataCard.media = returnDataCard.media.concat(cardInfo.media)
        }
    } else {
        returnDataCard.message = `快来研究新的卡片\n #new_card #${returnDataCard.card_name} \nid: $tweet_id\nhttps://twitter.com/i/status/$tweet_id\n${JSON.stringify(cardContent)}`
    }

    return returnDataCard
}

//处理entity
//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
const Entity = (type, entity = {}, uid = 0, tweetId = 0, hidden = false) => {
    let entityData = {
        text: '', //最终显示的文本
        expanded_url: '', //转换为t.co前的原链//仅用于链接
        url: '', //t.co短链接, 直接可被替换//仅用于链接
        hidden,
        uid,
        tweet_id: tweetId,
        indices_start: entity.indices[0],
        indices_end: entity.indices[1],
        length: entity.indices[1] - entity.indices[0],
        type: type.slice(0, -1)
    }
    switch (type) {
        case 'symbols': // 上市公司代码 || 虚拟货币
        case 'hashtags':
            entityData.text = entity.text //最终显示的文本
            break
        case 'urls':
            entityData.text = entity.display_url //最终显示的文本
            entityData.expanded_url = entity.expanded_url //转换为t.co前的原链//仅用于链接
            entityData.url = entity.url //t.co短链接, 直接可被替换//仅用于链接
            break
        case 'user_mentions':
            entityData.text = `@${entity.screen_name}`
            entityData.expanded_url = `https://twitter.com/${entity.screen_name}`
            break
    }
    return entityData
}

//处理媒体(media)//包括entities中的
//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/extended-entities-object
const Media = (media = {}, uid = '0', tweetId = '0', hidden = false, source = 'tweets', cardType = '', online = false) => {
    let pathInfo
    const mediaInfoToReturn = []
    let singleMedia = {
        cover: media.media_url_https,
        url: '',
        filename: '',
        extension: '',
        basename: '',
        bitrate: 0,
        hidden,
        source,
        //blurhash: '',
        title: media?.additional_media_info?.title ?? '',
        description: media?.additional_media_info?.description ?? media?.ext_alt_text ?? '',
        uid, //account uid
        tweet_id: tweetId, //tweet id
        origin_type: cardType ? cardType : media?.type ?? '',
        origin_info_width: media.original_info.width,
        origin_info_height: media.original_info.height,
        media_key: media.media_key ?? '' //你问我这个media_key是啥我只能说我也不知道
    }
    if (singleMedia.description !== '' && singleMedia.title === '' && media?.ext_alt_text) {
        singleMedia.title = 'ALT'
    }
    if (online && media?.sensitive_media_warning) {
        singleMedia.sensitive_media_warning = media.sensitive_media_warning
    }
    switch (media.type) {
        case 'video':
        case 'animated_gif':
            const tmpVideoInfo = media.video_info.variants.filter((x) => x.bitrate !== undefined).sort((a, b) => b.bitrate - a.bitrate)[0]
            singleMedia.bitrate = tmpVideoInfo.bitrate
            singleMedia.url = tmpVideoInfo.url.replaceAll(/\?.*/gm, '')
            singleMedia.content_type = tmpVideoInfo.content_type
            pathInfo = PathInfo(singleMedia.url)
            singleMedia.filename = pathInfo.filename
            singleMedia.basename = pathInfo.basename
            singleMedia.extension = pathInfo.extension

            mediaInfoToReturn.push(singleMedia)

            //new data for cover
            let coverInfo = {
                tweet_id: tweetId,
                uid,
                cover: media.media_url_https,
                url: media.media_url_https,
                bitrate: 0,
                origin_type: 'photo',
                hidden,
                media_key: media.media_key ?? '',
                source: 'cover',
                //blurhash: '',
                title: '',
                description: '',
                origin_info_width: media.original_info.width,
                origin_info_height: media.original_info.height
            }
            pathInfo = PathInfo(media.media_url_https)
            coverInfo.filename = pathInfo.filename
            coverInfo.basename = pathInfo.basename
            coverInfo.extension = pathInfo.extension
            coverInfo.content_type = GetMime(coverInfo.extension)

            mediaInfoToReturn.push(coverInfo)
            break
        case 'photo':
            singleMedia.url = media.media_url_https
            pathInfo = PathInfo(media.media_url_https)
            singleMedia.filename = pathInfo.filename
            singleMedia.basename = pathInfo.basename
            singleMedia.extension = pathInfo.extension
            singleMedia.content_type = GetMime(pathInfo.extension)

            mediaInfoToReturn.push(singleMedia)
            break
    }
    return mediaInfoToReturn
}

//用户可发出的card未知
//卡片名称及寻找方式请参考下面
//https://github.com/igorbrigadir/twitter-advanced-search/blob/master/README.md
//使用Twitter for Advertisers创建的card请参考下面
//https://business.twitter.com/zh-cn/help/campaign-setup/advertiser-card-specifications.html
//下行是twitter现有及保留的所有卡片(card)类型
//{"responsive_web_unified_cards_all_cards_enabled":{"value":false},"responsive_web_unified_cards_amplify_enabled":{"value":true},"responsive_web_unified_cards_app_enabled":{"value":true},"responsive_web_unified_cards_appplayer_enabled":{"value":true},"responsive_web_unified_cards_audio_enabled":{"value":true},"responsive_web_unified_cards_broadcast_enabled":{"value":true},"responsive_web_unified_cards_direct_store_link_app_enabled":{"value":true},"responsive_web_unified_cards_image_direct_message_enabled":{"value":true},"responsive_web_unified_cards_live_event_enabled":{"value":false},"responsive_web_unified_cards_message_me_enabled":{"value":true},"responsive_web_unified_cards_moment_enabled":{"value":true},"responsive_web_unified_cards_periscope_broadcast_enabled":{"value":true},"responsive_web_unified_cards_player_enabled":{"value":true},"responsive_web_unified_cards_poll2choice_image_enabled":{"value":false},"responsive_web_unified_cards_poll2choice_text_only_enabled":{"value":true},"responsive_web_unified_cards_poll2choice_video_enabled":{"value":false},"responsive_web_unified_cards_poll3choice_image_enabled":{"value":false},"responsive_web_unified_cards_poll3choice_text_only_enabled":{"value":true},"responsive_web_unified_cards_poll3choice_video_enabled":{"value":false},"responsive_web_unified_cards_poll4choice_image_enabled":{"value":false},"responsive_web_unified_cards_poll4choice_text_only_enabled":{"value":true},"responsive_web_unified_cards_poll4choice_video_enabled":{"value":false},"responsive_web_unified_cards_promo_image_app_enabled":{"value":true},"responsive_web_unified_cards_promo_image_convo_enabled":{"value":true},"responsive_web_unified_cards_promo_video_convo_enabled":{"value":true},"responsive_web_unified_cards_promo_video_website_enabled":{"value":true},"responsive_web_unified_cards_promo_website_enabled":{"value":true},"responsive_web_unified_cards_promoted_cards_enabled":{"value":true},"responsive_web_unified_cards_summary_enabled":{"value":true},"responsive_web_unified_cards_summary_large_image_enabled":{"value":true},"responsive_web_unified_cards_unified_card_enabled":{"value":true},"responsive_web_unified_cards_video_direct_message_enabled":{"value":true},"responsive_web_unified_cards_vine_enabled":{"value":true}}
//此处描述的类型为3691233323:audiospace//有人说iPhone能发"audio", 不过我找了半天都没找到例子
const Card = (cardInfo = {}, uid = '0', tweetId = '0', hidden = false, url = '', cardType = '', graphqlMode = true, online = false) => {
    let tmpCardInfo = {
        data: {
            type: cardType, //类型
            secondly_type: '', //子类型
            title: '', //标题
            description: '', //简介
            vanity_url: '', //用于展示的域名
            url, //实际域名
            media: 0, //是否有媒体
            unified_card_app: 0,
            poll: 0, //是否有投票
            uid,
            tweet_id: tweetId,
            hidden,
            polls: []
        },
        media: [],
        app_data: [] //data for app
        //more: {}//for more data and save in table v2_twitter_card_ext
    }

    let tmpWhereIsInfoFrom = {
        //data
        title: 'title',
        description: 'description',
        vanity_url: 'vanity_url',
        //media
        cover: 'thumbnail_image_large',
        origin: 'thumbnail_image_original'
    }

    if (graphqlMode) {
        cardInfo.binding_values = Object.fromEntries(cardInfo.binding_values.map((bindingValue) => [bindingValue.key, bindingValue.value]))
    }

    //这就是改成 graphql 的代码 php
    //$tmpList = [];
    //foreach ($cardInfo["binding_values"] as $key => $value) {
    //    $tmpList[] = ["key: $key, "value: $value];
    //}
    //$cardInfo["binding_values"] = $tmpList;

    if (cardType.startsWith('poll')) {
        tmpCardInfo.data.poll = 1
        const card_end_time = Math.floor(Date.parse(cardInfo.binding_values.end_datetime_utc.string_value) / 1000)
        for (let pollCount = 1; pollCount <= 4; pollCount++) {
            if (!cardInfo.binding_values[`choice${pollCount}_label`]) {
                break
            }
            tmpCardInfo.data.polls.push({
                uid,
                tweet_id: tweetId,
                hidden,
                choice_label: cardInfo.binding_values[`choice${pollCount}_label`].string_value,
                count: Number(cardInfo.binding_values[`choice${pollCount}_count`].string_value),
                poll_order: pollCount,
                end_datetime: card_end_time
            })
        }

        if (cardType.endsWith('image')) {
            tmpCardInfo.data.media = 1
            tmpCardInfo.media = {
                media_key: '', //卡片(card)没有media_key
                uid, //TODO 从后面的users获得用户
                tweet_id: tweetId,
                hidden,
                origin_type: `${cardType}_card_photo`,
                bitrate: 0,
                title: '',
                description: '',
                cover: cardInfo.binding_values.image_large.image_value.url, //由于封面只是size不同，所以无需额外创建记录
                url: cardInfo.binding_values.image_original.image_value.url, //原始文件
                origin_info_width: cardInfo.binding_values.image_original.image_value.width,
                origin_info_height: cardInfo.binding_values.image_original.image_value.height,
                source: 'cards'
            }
            const pathInfo = PathInfo(tmpCardInfo.media.url)
            tmpCardInfo.filename = pathInfo.filename
            tmpCardInfo.basename = pathInfo.basename
            tmpCardInfo.extension = pathInfo.extension
            tmpCardInfo.content_type = GetMime(pathInfo.extension)
        }
    } else if (cardType === 'unified_card') {
        //这玩意对于内容的处理需要 components 的处理，有必要有更详细的处理方式
        //这东西远比我现象要复杂，涉及到全部核心部件的重写，下行的说法是不准确的，那样子只适用于单个卡片，多个卡片会涉及到走马灯
        //没见过的类型，奇怪的类型，扭曲的类型，小屏幕下是类似summary，大屏幕就像large_card
        //这是前所未有的类型，貌似是最近才出现的 (Twitter Monitor 监控首次报警是 2020-10-16 https://twitter.com/i/status/1316889033583149057)
        //子组件数据
        const childCardInfo = JSON.parse(cardInfo.binding_values.unified_card.string_value)
        //组件类型
        //$tmpComponents = $cardInfo["components"];
        //看不懂啊，这都是啥啊
        tmpCardInfo.data.media = 1
        // sub type
        tmpCardInfo.data.secondly_type = childCardInfo.type ?? childCardInfo?.component_objects?.details_1?.type ?? childCardInfo?.component_objects?.media_with_details_horizontal_1?.type ?? ''

        switch (tmpCardInfo.data.secondly_type) {
            //上面是 图/视频 加链接, 虽然也没看明白
            case 'image_website':
            case 'video_website':
            case 'image_carousel_website':
            case 'video_carousel_website': //https://twitter.com/ABEMA/status/1356905272749551616
                //tmpCardInfo["data"]["title"] = '';//没有标题
                tmpCardInfo.data.description = childCardInfo.component_objects.details_1.data.title.content
                tmpCardInfo.data.vanity_url = childCardInfo.component_objects.details_1.data.subtitle.content
                tmpCardInfo.data.url = childCardInfo.destination_objects[childCardInfo.component_objects.details_1.data.destination].data.url_data.url
                break
            //iphone跟iPad不都差不多嘛?//下面是app安装链接...我觉得都差不多, 但它有我就要支援, 真麻烦
            case 'image_app':
            case 'video_app':
            case 'image_carousel_app': //https://twitter.com/stc_ksa/status/1359170192706703360
            case 'video_carousel_app': //没找到实例, 但我觉得存在
            case 'mixed_media_single_dest_carousel_app':
                tmpCardInfo.data.unified_card_app = 1
                tmpCardInfo.data.title = childCardInfo.app_store_data.app_1[0].title.content
                tmpCardInfo.data.description = childCardInfo.app_store_data.app_1[0].category.content
                tmpCardInfo.data.vanity_url = 'App Store' //显示的连接
                //$card["data"]["url"] = "https://apps.apple.com/{$childCardInfo["app_store_data"]["app_1"][0]["country_code"]}/app/id{$childCardInfo["app_store_data"]["app_1"][0]["id"]}";//真实链接

                //处理 app 数据
                tmpCardInfo.app_data = childCardInfo.app_store_data.app_1.map((childCardAppInfo) => ({
                    tweet_id: tweetId,
                    uid,
                    unified_card_type: tmpCardInfo.data.secondly_type,
                    type: childCardAppInfo.type, //android_app iphone_app ipad_app
                    appid: childCardAppInfo.id,
                    country_code: childCardAppInfo.country_code,
                    title: childCardAppInfo.title.content,
                    category: childCardAppInfo.category.content
                }))
                break
            case 'mixed_media_single_dest_carousel_website':
                tmpCardInfo.data.description = childCardInfo.component_objects.details_1.data.title.content
                tmpCardInfo.data.vanity_url = childCardInfo.component_objects.details_1.data.subtitle.content
                tmpCardInfo.data.url = childCardInfo.destination_objects.browser_1.data.url_data.url
                break
            case 'image_multi_dest_carousel_website':
            case 'video_multi_dest_carousel_website':
            case 'mixed_media_multi_dest_carousel_website':
            //https://twitter.com/tomori_kusunoki/status/1459102612502953989
            case 'image_collection_website':
                //case "video_collection_website":
                //https://twitter.com/BSA_animeA/status/1617356578260140039
                //TODO dest were not same, but i have to join them in the same string
                let index = 0
                for (const slide of childCardInfo.layout.data.slides) {
                    const tmpSlideItem = slide.find((x) => x.startsWith('details_')) || ''
                    if (!tmpSlideItem) {
                        continue
                    }
                    tmpCardInfo.data.description += (index ? '\t' : '') + childCardInfo.component_objects[tmpSlideItem].data.title.content
                    tmpCardInfo.data.vanity_url += (index ? '\t' : '') + childCardInfo.component_objects[tmpSlideItem].data.subtitle.content
                    tmpCardInfo.data.url +=
                        (index ? '\t' : '') +
                        (childCardInfo.destination_objects[childCardInfo.component_objects[tmpSlideItem].data.destination].data?.title?.content ??
                            childCardInfo.destination_objects[childCardInfo.component_objects[tmpSlideItem].data.destination].data?.url_data?.url)
                    index++
                }
                break
            //twitter_list_details 看起来是一个账号列表，连类型都不给了，我不是很能接受
            case 'twitter_list_details':
                //TODO rtl [...is_rtl]
                //item count \t content
                tmpCardInfo.data.description = childCardInfo.component_objects.details_1.data.member_count + '\t' + childCardInfo.component_objects.details_1.data.name.content
                //display_name \t name
                tmpCardInfo.data.vanity_url =
                    childCardInfo.users[childCardInfo.component_objects.details_1.data.user_id].name +
                    '\t' +
                    childCardInfo.users[childCardInfo.component_objects.details_1.data.user_id.screen_name] +
                    '\t' +
                    Number(childCardInfo.users[childCardInfo.component_objects.details_1.data.user_id.verified])
                tmpCardInfo.data.url = childCardInfo.destination_objects[childCardInfo.component_objects.details_1.data.destination].data.url_data.url
                break
            case 'media_with_details_horizontal':
                tmpCardInfo.data.description = childCardInfo.component_objects.media_with_details_horizontal_1.data.topic_detail.title.content
                tmpCardInfo.data.vanity_url = childCardInfo.destination_objects.browser_1.data.url_data.vanity
                tmpCardInfo.data.url = childCardInfo.destination_objects.browser_1.data.url_data.url
                break
            //TODO note
            case 'twitter_article':
                tmpCardInfo.data.description = childCardInfo.component_objects.text.data.title.content
                tmpCardInfo.data.vanity_url = childCardInfo.component_objects.text.data.subtitle.content
                tmpCardInfo.data.url = childCardInfo.destination_objects.article.data.url_data.url
                break
            case 'community_details':
                tmpCardInfo.data.title = childCardInfo.component_objects.details_1.data.name.content
                tmpCardInfo.data.description = childCardInfo.component_objects.details_1.data.member_count
                tmpCardInfo.data.vanity_url = childCardInfo.destination_objects.destination_1.data.url_data.vanity
                tmpCardInfo.data.url = childCardInfo.destination_objects.destination_1.data.url_data.url
            default:
            //https://developer.twitter.com/en/docs/twitter-ads-api/creatives/api-reference/cards
            //不知道还有什么，现在只找到这些
            //不知道说什么，报个警吧
            //TODO push
            //kd_push("快来研究新的子卡片\n #new_child_card #{$card["data"]["secondly_type"]} \nid: {$tweetid}\nhttps://twitter.com/i/status/{$tweetid}\n" . $cardInfo["binding_values"]["unified_card"]["string_value"]);//喵喵喵
        }
        if (childCardInfo.media_entities) {
            //TODO fix unified_card media status
            tmpCardInfo.data.media = 1
            let tmpChildMediaList = []
            if (tmpCardInfo.data.secondly_type === 'twitter_article') {
                tmpCardInfo.media.push({
                    media_key: '', //卡片(card)没有media_key
                    uid, //TODO 从后面的users获得用户
                    tweet_id: tweetId,
                    hidden,
                    origin_type: `${cardType}_${tmpCardInfo.data.secondly_type}_card_${childCardInfo.media_entities.cover_image.type}`,
                    bitrate: 0,
                    title: '',
                    description: '',
                    cover: childCardInfo.media_entities.cover_image.media_url_https, //由于封面只是size不同，所以无需额外创建记录
                    url: childCardInfo.media_entities.cover_image.media_url_https, //原始文件
                    origin_info_width: childCardInfo.media_entities.cover_image.original_info.width,
                    origin_info_height: childCardInfo.media_entities.cover_image.original_info.height,
                    source: 'cards'
                    //empty blurhash
                    //blurhash: '',
                })
                let pathInfo = PathInfo(tmpCardInfo.media[0].url)
                tmpCardInfo.media[0].filename = pathInfo.filename
                tmpCardInfo.media[0].basename = pathInfo.basename
                tmpCardInfo.media[0].extension = pathInfo.extension
                tmpCardInfo.media[0].content_type = GetMime(pathInfo.extension)
            } else {
                if (childCardInfo?.layout?.data?.slides) {
                    tmpChildMediaList = childCardInfo.layout.data.slides
                        .map((slide) => {
                            const tmpSlideItem = slide.filter((x) => x.startsWith('media_'))[0] || ''
                            if (!tmpSlideItem) {
                                return null
                            }
                            return childCardInfo.component_objects[tmpSlideItem].data
                        })
                        .filter((x) => x)
                } else {
                    tmpChildMediaList = childCardInfo?.component_objects?.swipeable_media_1?.data?.media_list ?? [childCardInfo?.component_objects?.media_1?.data ?? { id: 'media_1' }]
                }
                tmpCardInfo.media = tmpChildMediaList
                    .map((tmpChildMedia) => Media(childCardInfo.media_entities[tmpChildMedia.id], uid, tweetId, hidden, 'cards', `${cardType}_${tmpCardInfo.data.secondly_type}_card_${childCardInfo.media_entities[tmpChildMedia.id].type}`, online))
                    .flat()
            }
        }
        return tmpCardInfo
    }
    //elseif ($card["data"]["type"] === "appplayer" || $card["data"]["type"] === "promo_video_website" || $card["data"]["type"] === "promo_video_convo") {}
    else {
        switch (cardType) {
            //这好像是最常见的一种?//默认的不用改了
            //case "summary":
            //    break;
            //这是twitter收购的播客网站
            //提供直播和回放
            //注: 此网站被墙
            case 'periscope_broadcast':
                tmpCardInfo.data.url = cardInfo.binding_values.url.string_value
            case 'summary_large_image':
                tmpWhereIsInfoFrom.cover = 'summary_photo_image_large'
                tmpWhereIsInfoFrom.origin = 'summary_photo_image_original'
                break
            //播放器, 其实我是没看懂//音频播放器跟player相似
            case 'audio':
                tmpWhereIsInfoFrom.vanity_url = 'partner'
            //这...带视频的card..跟player差不多
            case 'promo_video_website': //feat vmap
            case 'player':
            //与 promo_video_website, promo_video_convo 差不多, 未来有计划支援视频
            case 'appplayer': //feat vmap
                tmpWhereIsInfoFrom.cover = 'player_image_large'
                tmpWhereIsInfoFrom.origin = 'player_image_original'
                break
            //播客, 类似上面的periscope_broadcast, 但还是有点不同
            case 'broadcast':
                tmpWhereIsInfoFrom.cover = 'broadcast_thumbnail_large'
                tmpWhereIsInfoFrom.origin = 'broadcast_thumbnail_original'
                tmpWhereIsInfoFrom.title = 'broadcast_title'
                tmpCardInfo.data.url = cardInfo.binding_values.broadcast_url.string_value
                break
            case 'promo_website':
                tmpWhereIsInfoFrom.cover = 'promo_image_large'
                tmpWhereIsInfoFrom.origin = 'promo_image_original'
                tmpCardInfo.data.url = cardInfo?.binding_values?.website_url?.string_value //这种类型的卡片自带源链接
                break
            //类似 promo_website, 但有着发推后可见的内容//tmv2只记录发推完成后的内容
            case 'promo_image_convo':
                tmpWhereIsInfoFrom.title = 'thank_you_text'
                tmpWhereIsInfoFrom.vanity_url = 'thank_you_vanity_url'
                tmpWhereIsInfoFrom.cover = 'promo_image_large'
                tmpWhereIsInfoFrom.origin = 'promo_image_original'
                tmpCardInfo.data.url = cardInfo?.binding_values?.thank_you_url?.string_value ?? '' //这种类型的卡片自带源链接
                break
            //个人感觉是 promo_website 和 player 的混合体
            case 'promo_video_convo': //feat vmap
                tmpWhereIsInfoFrom.title = 'thank_you_text'
                tmpWhereIsInfoFrom.vanity_url = 'thank_you_vanity_url'
                tmpWhereIsInfoFrom.cover = 'player_image_large'
                tmpWhereIsInfoFrom.origin = 'player_image_large'
                tmpCardInfo.data.url = cardInfo?.binding_values?.thank_you_url?.string_value ?? '' //这种类型的卡片自带源链接
                break

            //以下三项都是应用相关
            //无法找到出链接(第三种除外, 下同)
            //暂时无法支持
            //查证后确认只能登录后使用链接, 否则回跳回主页(即 https://twitter.com)
            //例子 https://twitter.com/ArknightsStaff/status/1230706209797197824
            case 'promo_image_app':
                //$tmp_whereIsInfoFrom["vanity_url"] = "thank_you_vanity_url";
                tmpWhereIsInfoFrom.cover = 'promo_image_large'
                tmpWhereIsInfoFrom.origin = 'promo_image_original'
                //$card["data"]["url"] = $cardInfo["binding_values"]["thank_you_url"]["string_value"];//这种类型的卡片自带源链接
                break

            //你问我跟下面有啥区别, 我一时也说不出来
            case 'direct_store_link_app':
                tmpWhereIsInfoFrom.vanity_url = 'card_url'
            //app类可以查链接
            case 'app':
                //$tmp_whereIsInfoFrom["vanity_url"] = "thank_you_vanity_url";
                tmpWhereIsInfoFrom.cover = 'thumbnail_large'
                tmpWhereIsInfoFrom.origin = 'thumbnail_original'
                break

            //以下两种都有发送者的信息//但都没记录

            //这个有所魔改, 原来差不多是这样的
            // ///////////////////////////////////////////////////////////////////////
            // ///////////////////////////////////////////////////////////////////////
            // ///////////////////////////////////////////////////////////////////////
            // ///////////////////////////////////////////////////////////////////////
            // ///////////////////////////////////////////////////////////////////////
            // ///////////////////////////////////////////////////////////////////////
            // // :Name @:scren_name                                                //
            // // :event_title                                                      //
            // ///////////////////////////////////////////////////////////////////////
            case 'live_event':
                tmpWhereIsInfoFrom.title = 'event_title'
                tmpWhereIsInfoFrom.description = 'event_subtitle'
                tmpWhereIsInfoFrom.cover = 'event_thumbnail_large'
                tmpWhereIsInfoFrom.origin = 'event_thumbnail_original'
                break
            case 'moment':
                tmpWhereIsInfoFrom.cover = 'photo_image'
                tmpWhereIsInfoFrom.origin = 'photo_image'
                tmpCardInfo.data.url = cardInfo.binding_values.url.string_value
                break
            //类似clubhouse的玩意
            //https://help.twitter.com/en/using-twitter/spaces
            //https://twitter.com/twitterspaces
            case 'audiospace':
                tmpCardInfo.data.url = cardInfo.binding_values.id.string_value
                break
        }

        //写入
        //处理基本信息
        tmpCardInfo.data.title = cardInfo.binding_values[tmpWhereIsInfoFrom.title]?.string_value ?? '' //TODO 如果不是STRING怎么办呢
        tmpCardInfo.data.description =
            (cardInfo.binding_values[tmpWhereIsInfoFrom.description]?.string_value ?? '') +
            ((cardType === 'app' || cardType === 'appplayer') && cardInfo?.binding_values?.app_star_rating?.string_value && cardInfo?.binding_values?.app_num_ratings?.string_value
                ? `\n${cardInfo.binding_values.app_star_rating.string_value}/5.0 stars - ${cardInfo.binding_values.app_num_ratings.string_value} ratings`
                : '') //同上
        tmpCardInfo.data.vanity_url =
            (cardInfo.binding_values[tmpWhereIsInfoFrom.vanity_url]?.string_value ?? '') +
            ((cardType === 'promo_image_app' || cardType === 'appplayer') &&
            cardInfo.binding_values.site?.user_value?.id_str &&
            ((graphqlMode && cardInfo.user_refs) || (!graphqlMode && cardInfo?.users[cardInfo.binding_values.site.user_value.id_str]))
                ? graphqlMode
                    ? cardInfo.user_refs[0].legacy.name
                    : cardInfo.users[cardInfo.binding_values.site.user_value.id_str].name
                : '') //同上
    }
    //media
    if (cardInfo.binding_values[tmpWhereIsInfoFrom.origin]) {
        tmpCardInfo.data.media = 1
        tmpCardInfo.media.push({
            media_key: '', //卡片(card)没有media_key
            uid, //TODO 从后面的users获得用户
            tweet_id: tweetId,
            hidden,
            origin_type: `${cardType}_card_photo`,
            bitrate: 0,
            title: '',
            description: '',
            cover: cardInfo.binding_values[tmpWhereIsInfoFrom.cover].image_value.url, //由于封面只是size不同，所以无需额外创建记录
            url: cardInfo.binding_values[tmpWhereIsInfoFrom.origin].image_value.url, //原始文件
            origin_info_width: cardInfo.binding_values[tmpWhereIsInfoFrom.origin].image_value.width,
            origin_info_height: cardInfo.binding_values[tmpWhereIsInfoFrom.origin].image_value.height,
            source: 'cards'
            //empty blurhash
            //blurhash: '',
        })
        let pathInfo = PathInfo(tmpCardInfo.media[0].url)
        tmpCardInfo.media[0].filename = pathInfo.filename
        tmpCardInfo.media[0].basename = pathInfo.basename
        tmpCardInfo.media[0].extension = pathInfo.extension
        tmpCardInfo.media[0].content_type = GetMime(pathInfo.extension)
    }

    return tmpCardInfo
}

//TODO feature
const AudioSpace = (audioSpaceObject = {}) => {
    let tmpAudioSpaceData = {
        id: '',
        avatar: '',
        name: '',
        display_name: '',
        state: 'Invalid',
        start: '0',
        end: '0',
        media_key: '',
        title: '',
        total: 0,
        verified: false,
        admins: [],
        listeners: [],
        speakers: [],
        is_available_for_replay: false
    }
    const tmpUserInfo = () => ({
        uid: 0,
        uid_str: '0',
        name: '',
        display_name: '',
        avatar: '',
        start: '0'
    })
    if (!audioSpaceObject.data || !audioSpaceObject.data.audioSpace.metadata) {
        return tmpAudioSpaceData
    }

    tmpAudioSpaceData.id = audioSpaceObject.data.audioSpace.metadata.rest_id
    tmpAudioSpaceData.avatar = audioSpaceObject.data.audioSpace.metadata.creator_results.result.legacy.profile_image_url_https
    tmpAudioSpaceData.display_name = audioSpaceObject.data.audioSpace.metadata.creator_results.result.legacy.name
    tmpAudioSpaceData.name = audioSpaceObject.data.audioSpace.metadata.creator_results.result.legacy.screen_name
    tmpAudioSpaceData.verified = audioSpaceObject.data.audioSpace.metadata.creator_results.result.legacy?.verified ?? false
    tmpAudioSpaceData.state = audioSpaceObject.data.audioSpace.metadata.state
    tmpAudioSpaceData.start = String(audioSpaceObject.data.audioSpace.metadata?.started_at ?? audioSpaceObject.data.audioSpace.metadata?.scheduled_start ?? 0)
    tmpAudioSpaceData.end = String(audioSpaceObject.data.audioSpace.metadata?.ended_at ?? 0)
    tmpAudioSpaceData.media_key = audioSpaceObject.data.audioSpace.metadata.media_key ?? ''
    tmpAudioSpaceData.is_available_for_replay = audioSpaceObject.data.audioSpace.metadata.is_available_for_replay ?? audioSpaceObject.data.audioSpace.metadata.is_space_available_for_replay ?? false
    tmpAudioSpaceData.title = audioSpaceObject.data.audioSpace.metadata?.title ?? ''
    tmpAudioSpaceData.total = (audioSpaceObject.data.audioSpace.metadata?.total_live_listeners ?? 0) + (audioSpaceObject.data.audioSpace.metadata?.total_replay_watched ?? 0)

    const getAudioSpaceRoleInfo = (userInfo) => {
        let tmpUser = tmpUserInfo()
        tmpUser.uid = userInfo.user_results.rest_id
        tmpUser.uid_str = userInfo.user_results.rest_id
        tmpUser.name = userInfo.twitter_screen_name
        tmpUser.display_name = userInfo.display_name
        tmpUser.avatar = userInfo.avatar_url
        tmpUser.start = String(userInfo.start)
        return tmpUser
    }

    tmpAudioSpaceData.admins = (audioSpaceObject.data.audioSpace?.participants?.admins ?? []).map((admin) => getAudioSpaceRoleInfo(admin))
    tmpAudioSpaceData.speakers = (audioSpaceObject.data.audioSpace?.participants?.speakers ?? []).map((speaker) => getAudioSpaceRoleInfo(speaker))
    tmpAudioSpaceData.listeners = (audioSpaceObject.data.audioSpace?.participants?.listeners ?? []).map((listener) => getAudioSpaceRoleInfo(listener))

    return tmpAudioSpaceData
}

const Broadcast = (broadcastObject = {}) => {
    let tmpBroadcastData = {
        id: '',
        avatar: '',
        name: '',
        display_name: '',
        state: 'invalid',
        start: '0',
        end: '0',
        media_key: '',
        title: '',
        total: 0,
        is_available_for_replay: false
    }
    if (!broadcastObject.broadcasts || Object.keys(broadcastObject.broadcasts).length === 0) {
        return tmpBroadcastData
    } else {
        broadcastObject = broadcastObject.broadcasts[Object.keys(broadcastObject.broadcasts)[0]]
    }

    tmpBroadcastData.id = broadcastObject.id
    tmpBroadcastData.avatar = broadcastObject.profile_image_url
    tmpBroadcastData.display_name = broadcastObject.user_display_name
    tmpBroadcastData.name = broadcastObject.username
    tmpBroadcastData.state = (broadcastObject.state || '').toLocaleLowerCase()
    tmpBroadcastData.start = String(broadcastObject.start_ms ?? broadcastObject.scheduled_start_ms ?? 0)
    tmpBroadcastData.end = String(broadcastObject.end_ms ?? broadcastObject.scheduled_end_ms ?? 0)
    tmpBroadcastData.media_key = broadcastObject.media_key ?? ''
    tmpBroadcastData.is_available_for_replay = broadcastObject.available_for_replay ?? false
    tmpBroadcastData.title = broadcastObject.status ?? ''
    tmpBroadcastData.total = Number(broadcastObject.total_watched ?? 0) + Number(broadcastObject.total_watching ?? 0)

    return tmpBroadcastData
}

const Time2SnowFlake = (date = new Date(), datacenter_id = 0, server_id = 0, sequence_id = 0) => {
    let tmpSnowflake = BigInt((typeof date === 'number' || typeof date === 'bigint' ? date : Date.parse(date)) - 1288834974657) << BigInt(5)
    if (tmpSnowflake < BigInt(0)) {
        return BigInt(0)
    }
    tmpSnowflake |= BigInt(datacenter_id)
    tmpSnowflake <<= BigInt(5)
    tmpSnowflake |= BigInt(server_id)
    tmpSnowflake <<= BigInt(12)
    tmpSnowflake |= BigInt(sequence_id)
    return tmpSnowflake
}
const SnowFlake2Time = (snowflake) => {
    let tmpData = { creation_time_milli: 1288834974657, sequence_id: 0, machine_id: 0, server_id: 0, datacenter_id: 0 }
    if (isNaN(snowflake)) {
        return tmpData
    }
    if (typeof snowflake === 'string') {
        snowflake = BigInt(snowflake)
        // 0
        if (!snowflake) {
            return tmpData
        }
    }
    // Sequence number
    tmpData.sequence_id = Number(snowflake & BigInt(4095))
    snowflake >>= BigInt(12)

    // Machine id
    tmpData.machine_id = Number(snowflake & BigInt(1023))
    tmpData.server_id = tmpData.machine_id & 31
    tmpData.datacenter_id = (tmpData.machine_id >> 5) & 31
    snowflake >>= BigInt(10)

    // Time
    tmpData.creation_time_milli += Number(snowflake & BigInt(2199023255551))
    return tmpData
}

export { TweetsInfo, Tweet, Entity, Media, Card, AudioSpace, Broadcast, Time2SnowFlake, SnowFlake2Time }
