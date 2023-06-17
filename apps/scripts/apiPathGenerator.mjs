import { writeFileSync } from 'node:fs'
import { basePath } from '../../libs/share/NodeConstant.mjs'

const apiPathList = {
    rest_id: ['id_str', 'data.user.result.rest_id', 'core.user_results.result.rest_id', 'rest_id'],
    user_is_blue_verified: ['data.user.result.is_blue_verified', 'ext_is_blue_verified', 'is_blue_verified'],
    user_info_legacy: ['data.user.result.legacy', 'legacy', ''],
    tweets_instructions: [
        'globalObjects.tweets',
        'data.user.result.timeline_v2.timeline.instructions',
        'data.user.result.timeline.timeline.instructions',
        'data.threaded_conversation_with_injections_v2.instructions',
        'data.threaded_conversation_with_injections.instructions',
        'data.search_by_raw_query.search_timeline.timeline.instructions',
        'data.home.home_timeline_urt.instructions',
        'data.bookmark_timeline_v2.timeline.instructions',
        'data.list.tweets_timeline.timeline.instructions',
        'data.list.members_timeline.timeline.instructions',
        'data.communityResults.result.community_timeline.timeline.instructions'
    ],
    tweets_contents: [
        'globalObjects.tweets',
        'data.user.result.timeline_v2.timeline.instructions[1].entries',
        'data.user.result.timeline_v2.timeline.instructions[0].entries',
        'data.user.result.timeline.timeline.instructions[1].entries',
        'data.user.result.timeline.timeline.instructions[0].entries',
        'data.threaded_conversation_with_injections_v2.instructions[1].entries',
        'data.threaded_conversation_with_injections_v2.instructions[0].entries',
        'data.threaded_conversation_with_injections.instructions[1].entries',
        'data.threaded_conversation_with_injections.instructions[0].entries',
        'data.search_by_raw_query.search_timeline.timeline.instructions[1].entries',
        'data.search_by_raw_query.search_timeline.timeline.instructions[0].entries',
        'data.home.home_timeline_urt.instructions[0].entries',
        'data.bookmark_timeline_v2.timeline.instructions[0].entries',
        'data.list.tweets_timeline.timeline.instructions[1].entries',
        'data.list.tweets_timeline.timeline.instructions[0].entries',
        'data.communityResults.result.community_timeline.timeline.instructions[1].entries',
        'data.communityResults.result.community_timeline.timeline.instructions[0].entries'
    ],
    tweets_top_content: ['data.user.result.timeline_v2.timeline.instructions[2].entry', 'data.user.result.timeline.timeline.instructions[2].entry'],
    tweet_content: ['content.itemContent.tweet_results.result', 'content.itemContent.tweet', 'item.itemContent.tweet_results.result', 'item.itemContent.tweet'],
    tweet_id: ['id_str', 'rest_id', 'content.itemContent.tweet.rest_id', 'content.itemContent.tweet_results.result.rest_id', 'item.itemContent.tweet.rest_id', 'item.itemContent.tweet_results.result.rest_id'],
    tweet_uid: ['user_id_str', 'legacy.user_id_str'],
    tweet_conversation_id_str: ['conversation_id_str', 'legacy.conversation_id_str'],
    tweet_created_at: ['created_at', 'legacy.created_at'],
    tweet_source: ['source', 'legacy.source'],
    tweet_full_text: ['note_tweet.note_tweet_results.result.text', 'full_text', 'legacy.full_text'],
    tweet_entities: ['note_tweet.note_tweet_results.result.entity_set', 'entities', 'legacy.entities'],
    tweet_card_url: ['url', 'rest_id'],
    tweet_quote_url: ['quoted_status_permalink.url', 'legacy.quoted_status_permalink.url'],
    tweet_media_path: ['legacy.extended_entities.media', 'extended_entities.media'],
    tweet_card_name: ['name', 'legacy.name'],
    tweet_card_path: ['card.legacy', 'card'],
    retweet_rest_id: ['retweeted_status_id_str', 'legacy.retweeted_status.rest_id', 'legacy.retweeted_status_result.result.rest_id'],
    retweet_graphql_path: ['legacy.retweeted_status', 'legacy.retweeted_status_result.result'],
    quote_tweet_id: ['quoted_status_id_str', 'legacy.quoted_status_id_str'],
    quote_graphql_path: ['quoted_status_result.result', 'quoted_status'],
    graphql_user_result: ['core.user_results.result', 'core.user']
}

const codeText = Object.keys(apiPathList)
    .map((typeName) => `"${typeName}": () => ` + apiPathList[typeName].map((source) => `source` + (source ? '?.' : '') + source.replaceAll('.', '?.')).join(' ?? ') + ' ?? false')
    .join(',\n        ')

const wholeCode = `const path2array = (pathName = '', source = {}) => {
    const tmpPath = {
        ${codeText}
    }

    if (source === undefined || source === null || source === false || !tmpPath[pathName]) {
        return false
    }
    return tmpPath[pathName]()
}

export default path2array`

writeFileSync(basePath + '/core/Core.apiPath.mjs', wholeCode)
