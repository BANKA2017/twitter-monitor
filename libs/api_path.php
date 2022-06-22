<?php

//path between restapi and graphql
//see also ~ scripts/apiPathGenerator/run.php
function path_to_array (string $handle = "", array | bool | null $source = []): mixed {
    if ($source === null || $source === false) {
        return false;
    }
    return match ($handle) {
        "rest_id" => $source["id_str"]??$source["data"]["user"]["result"]["rest_id"]??false,
        "user_info_legacy" => $source["data"]["user"]["result"]["legacy"]??$source??false,
        "tweets_instructions" => $source["globalObjects"]["tweets"]??$source["data"]["user"]["result"]["timeline_v2"]["timeline"]["instructions"]??$source["data"]["user"]["result"]["timeline"]["timeline"]["instructions"]??$source["data"]["threaded_conversation_with_injections"]["instructions"]??false,
        "tweets_contents" => $source["globalObjects"]["tweets"]??$source["data"]["user"]["result"]["timeline_v2"]["timeline"]["instructions"][0]["entries"]??$source["data"]["user"]["result"]["timeline_v2"]["timeline"]["instructions"][1]["entries"]??$source["data"]["user"]["result"]["timeline"]["timeline"]["instructions"][0]["entries"]??$source["data"]["user"]["result"]["timeline"]["timeline"]["instructions"][1]["entries"]??$source["data"]["threaded_conversation_with_injections"]["instructions"][0]["entries"]??$source["data"]["threaded_conversation_with_injections"]["instructions"][1]["entries"]??false,
        "tweets_top_content" => $source["data"]["user"]["result"]["timeline_v2"]["timeline"]["instructions"][2]["entry"]??$source["data"]["user"]["result"]["timeline"]["timeline"]["instructions"][2]["entry"]??false,
        "tweet_content" => $source["content"]["itemContent"]["tweet_results"]["result"]??$source["content"]["itemContent"]["tweet"]??$source["item"]["itemContent"]["tweet_results"]["result"]??$source["item"]["itemContent"]["tweet"]??false,
        "tweet_id" => $source["id_str"]??$source["rest_id"]??$source["content"]["itemContent"]["tweet"]["rest_id"]??$source["content"]["itemContent"]["tweet_results"]["result"]["rest_id"]??$source["item"]["itemContent"]["tweet"]["rest_id"]??$source["item"]["itemContent"]["tweet_results"]["result"]["rest_id"]??false,
        "tweet_uid" => $source["user_id_str"]??$source["legacy"]["user_id_str"]??false,
        "tweet_conversation_id_str" => $source["conversation_id_str"]??$source["legacy"]["conversation_id_str"]??false,
        "tweet_created_at" => $source["created_at"]??$source["legacy"]["created_at"]??false,
        "tweet_source" => $source["source"]??$source["legacy"]["source"]??false,
        "tweet_full_text" => $source["full_text"]??$source["legacy"]["full_text"]??false,
        "tweet_entities" => $source["entities"]??$source["legacy"]["entities"]??false,
        "tweet_card_url" => $source["url"]??$source["rest_id"]??false,
        "tweet_quote_url" => $source["quoted_status_permalink"]["url"]??$source["legacy"]["quoted_status_permalink"]["url"]??false,
        "tweet_media_path" => $source["legacy"]["extended_entities"]["media"]??$source["extended_entities"]["media"]??false,
        "tweet_card_name" => $source["name"]??$source["legacy"]["name"]??false,
        "tweet_card_path" => $source["card"]["legacy"]??$source["card"]??false,
        "retweet_rest_id" => $source["retweeted_status_id_str"]??$source["legacy"]["retweeted_status"]["rest_id"]??$source["legacy"]["retweeted_status_result"]["result"]["rest_id"]??false,
        "retweet_graphql_path" => $source["legacy"]["retweeted_status"]??$source["legacy"]["retweeted_status_result"]["result"]??false,
        "quote_tweet_id" => $source["quoted_status_id_str"]??$source["legacy"]["quoted_status_id_str"]??false,
        "quote_graphql_path" => $source["quoted_status_result"]["result"]??$source["quoted_status"]??false,
        "graphql_user_legacy" => $source["core"]["user_results"]["result"]["legacy"]??$source["core"]["user"]["legacy"]??false,
        default => false
    };
}
