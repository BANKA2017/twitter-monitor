const path2array = (pathName = '', source = {}) => {
    const tmpPath = {
        "rest_id": () => source?.id_str ?? source?.rest_id ?? source?.data?.user?.result?.rest_id ?? source?.core?.user_results?.result?.rest_id ?? source?.viewer?.user_results?.result?.rest_id ?? false,
        "user_is_blue_verified": () => source?.ext_is_blue_verified ?? source?.is_blue_verified ?? source?.data?.user?.result?.is_blue_verified ?? source?.data?.viewer?.user_results?.result?.is_blue_verified ?? false,
        "user_info_legacy": () => source?.data?.user?.result?.legacy ?? source?.viewer?.user_results?.result?.legacy ?? source?.legacy ?? source ?? false,
        "tweets_instructions": () => source?.globalObjects?.tweets ?? source?.twitter_objects?.tweets ?? source?.data?.user?.result?.timeline_v2?.timeline?.instructions ?? source?.data?.user?.result?.timeline?.timeline?.instructions ?? source?.data?.threaded_conversation_with_injections_v2?.instructions ?? source?.data?.threaded_conversation_with_injections?.instructions ?? source?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? source?.data?.search?.timeline_response?.timeline?.instructions ?? source?.data?.timeline_response?.instructions ?? source?.data?.user_result?.result?.timeline_response?.timeline?.instructions ?? source?.data?.home?.home_timeline_urt?.instructions ?? source?.data?.bookmark_timeline_v2?.timeline?.instructions ?? source?.data?.list?.tweets_timeline?.timeline?.instructions ?? source?.data?.list?.members_timeline?.timeline?.instructions ?? source?.data?.communityResults?.result?.community_timeline?.timeline?.instructions ?? source?.modules ?? false,
        "tweets_contents": () => source?.globalObjects?.tweets ?? source?.twitter_objects?.tweets ?? source?.data?.user?.result?.timeline_v2?.timeline?.instructions[1]?.entries ?? source?.data?.user?.result?.timeline_v2?.timeline?.instructions[0]?.entries ?? source?.data?.user?.result?.timeline?.timeline?.instructions[1]?.entries ?? source?.data?.user?.result?.timeline?.timeline?.instructions[0]?.entries ?? source?.data?.threaded_conversation_with_injections_v2?.instructions[1]?.entries ?? source?.data?.threaded_conversation_with_injections_v2?.instructions[0]?.entries ?? source?.data?.threaded_conversation_with_injections?.instructions[1]?.entries ?? source?.data?.threaded_conversation_with_injections?.instructions[0]?.entries ?? source?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions[1]?.entries ?? source?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions[0]?.entries ?? source?.data?.search?.timeline_response?.timeline?.instructions[1]?.entries ?? source?.data?.search?.timeline_response?.timeline?.instructions[0]?.entries ?? source?.data?.timeline_response?.instructions[1]?.entries ?? source?.data?.timeline_response?.instructions[0]?.entries ?? source?.data?.user_result?.result?.timeline_response?.timeline?.instructions[1]?.entries ?? source?.data?.user_result?.result?.timeline_response?.timeline?.instructions[0]?.entries ?? source?.data?.home?.home_timeline_urt?.instructions[0]?.entries ?? source?.data?.bookmark_timeline_v2?.timeline?.instructions[0]?.entries ?? source?.data?.list?.tweets_timeline?.timeline?.instructions[1]?.entries ?? source?.data?.list?.tweets_timeline?.timeline?.instructions[0]?.entries ?? source?.data?.communityResults?.result?.community_timeline?.timeline?.instructions[1]?.entries ?? source?.data?.communityResults?.result?.community_timeline?.timeline?.instructions[0]?.entries ?? false,
        "tweets_top_content": () => source?.data?.user?.result?.timeline_v2?.timeline?.instructions[2]?.entry ?? source?.data?.user?.result?.timeline?.timeline?.instructions[2]?.entry ?? false,
        "tweet_content": () => source?.content?.itemContent?.tweet_results?.result ?? source?.content?.content?.tweetResult?.result?.tweet ?? source?.content?.content?.tweetResult?.result ?? source?.content?.itemContent?.tweet ?? source?.item?.itemContent?.tweet_results?.result ?? source?.item?.itemContent?.tweet ?? source?.content?.items[0]?.item?.content?.tweetResult?.result ?? source?.data?.tweetResult?.result ?? false,
        "tweet_id": () => source?.id_str ?? source?.rest_id ?? source?.content?.content?.itemContent?.tweet?.rest_id ?? source?.content?.content?.tweetResult?.result?.rest_id ?? source?.content?.tweetResult?.result?.rest_id ?? source?.content?.itemContent?.tweet_results?.result?.rest_id ?? source?.item?.itemContent?.tweet?.rest_id ?? source?.item?.itemContent?.tweet_results?.result?.rest_id ?? false,
        "tweet_uid": () => source?.user_id_str ?? source?.legacy?.user_id_str ?? source?.user?.id_str ?? false,
        "tweet_conversation_id_str": () => source?.conversation_id_str ?? source?.legacy?.conversation_id_str ?? false,
        "tweet_created_at": () => source?.created_at ?? source?.legacy?.created_at ?? false,
        "tweet_source": () => source?.source ?? source?.legacy?.source ?? false,
        "tweet_full_text": () => source?.note_tweet?.note_tweet_results?.result?.text ?? source?.full_text ?? source?.legacy?.full_text ?? source?.text ?? false,
        "tweet_entities": () => source?.note_tweet?.note_tweet_results?.result?.entity_set ?? source?.entities ?? source?.legacy?.entities ?? false,
        "tweet_card_url": () => source?.url ?? source?.rest_id ?? false,
        "tweet_quote_url": () => source?.quoted_status_permalink?.url ?? source?.legacy?.quoted_status_permalink?.url ?? false,
        "tweet_media_path": () => source?.legacy?.extended_entities?.media ?? source?.extended_entities?.media ?? false,
        "tweet_card_name": () => source?.name ?? source?.legacy?.name ?? false,
        "tweet_card_path": () => source?.tweet_card?.legacy ?? source?.card?.legacy ?? source?.card ?? false,
        "retweet_rest_id": () => source?.retweeted_status_id_str ?? source?.retweeted_status?.id_str ?? source?.legacy?.retweeted_status?.rest_id ?? source?.legacy?.retweeted_status_result?.result?.rest_id ?? false,
        "retweet_graphql_path": () => source?.legacy?.retweeted_status ?? source?.legacy?.retweeted_status_result?.result ?? false,
        "quote_tweet_id": () => source?.quoted_status_id_str ?? source?.legacy?.quoted_status_id_str ?? false,
        "quote_graphql_path": () => source?.quoted_status_result?.result ?? source?.quoted_status ?? false,
        "graphql_user_result": () => source?.core?.user_results?.result ?? source?.core?.user_result?.result ?? source?.core?.user ?? false
    }

    if (source === undefined || source === null || source === false || !tmpPath[pathName]) {
        return false
    }
    return tmpPath[pathName]()
}

export default path2array