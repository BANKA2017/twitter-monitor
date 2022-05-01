<?php
//path between restapi and graphql
const apiPath = [
    "rest_id" => [
        'id_str',
        'data.user.result.rest_id',
    ],
    "user_info_legacy" => [
        'data.user.result.legacy',
        '',
    ],
    "tweets_instructions" => [
        "globalObjects.tweets",
        "data.user.result.timeline_v2.timeline.instructions",
        "data.user.result.timeline.timeline.instructions",
        "data.threaded_conversation_with_injections.instructions",
    ],
    "tweets_contents" => [
        "globalObjects.tweets",
        "data.user.result.timeline_v2.timeline.instructions.0.entries",
        "data.user.result.timeline_v2.timeline.instructions.1.entries",
        "data.user.result.timeline.timeline.instructions.0.entries",
        "data.user.result.timeline.timeline.instructions.1.entries",
        "data.threaded_conversation_with_injections.instructions.0.entries",
        "data.threaded_conversation_with_injections.instructions.1.entries",
    ],
    "tweets_top_content" => [
        "data.user.result.timeline_v2.timeline.instructions.2.entry",
        "data.user.result.timeline.timeline.instructions.2.entry",
    ],
    "tweet_content" => [
        "content.itemContent.tweet_results.result",
        "content.itemContent.tweet",
    ],
    "tweet_id" => [
        "id_str",
        "rest_id",
        "content.itemContent.tweet.rest_id",
        "content.itemContent.tweet_results.result.rest_id"
    ],
    "tweet_uid" => [
        "user_id_str",
        "legacy.user_id_str",
    ],
    "tweet_conversation_id_str" => [
        "conversation_id_str",
        "legacy.conversation_id_str"
    ],
    "tweet_created_at" => [
        "created_at",
        "legacy.created_at",
    ],
    "tweet_source" => [
        "source",
        "legacy.source",
    ],
    "tweet_full_text" => [
        "full_text",
        "legacy.full_text",
    ],
    "tweet_entities" => [
        "entities",
        "legacy.entities"
    ],
    "tweet_card_url" => [
        "url",
        "rest_id"
    ],
    "tweet_quote_url" => [
        "quoted_status_permalink.url",
        "legacy.quoted_status_permalink.url"
    ],
    "tweet_media_path" => [
        "legacy.extended_entities.media",
        "extended_entities.media",
    ],
    "tweet_card_name" => [
        "name",
        "legacy.name",
    ],
    "tweet_card_path" => [
        "card.legacy",
        "card"
    ],
    "retweet_rest_id" => [
        'retweeted_status_id_str',//rest
        'legacy.retweeted_status.rest_id',//graphql1
        'legacy.retweeted_status_result.result.rest_id'//graphql2
    ],
    "retweet_graphql_path" => [
        "legacy.retweeted_status",
        "legacy.retweeted_status_result.result",
    ],
    "quote_tweet_id" => [
        "quoted_status_id_str",
        "legacy.quoted_status_id_str"
    ],
    "quote_graphql_path" => [
        "quoted_status_result.result",
        "quoted_status"
    ],
    "graphql_user_legacy" => [
        "core.user_results.result.legacy",
        "core.user.legacy"
    ]
];
$text = "return match (\$handle) {\n";
foreach (apiPath as $name => $path) {
    $text .= '        "' . $name . '" => ';
    foreach ($path as $item) {
        $text .= "\$source";
        foreach(explode(".", $item) as $value) {
            if ($value == "") {
                $text .= "";
            } else {
                $text .= is_numeric($value) ? "[$value]" : "[\"$value\"]";
            }
        }
        $text .= '??';
    }
    $text .= "false,\n";
    //"rest_id" => $source["id_str"]??$source["data"]["user"]["rest_id"],
}
$text .= "        default => false\n    };";
file_put_contents(__DIR__ . '/../../libs/api_path.php', "<?php\n\n//path between restapi and graphql\n//see also ~ scripts/apiPathGenerator/run.php\nfunction path_to_array (string \$handle = \"\", array | null \$source = []): mixed {\n    if (\$source === null) {\n        return false;\n    }\n    $text\n}\n");
echo "<?php\n\n//path between restapi and graphql\n//see also ~ scripts/apiPathGenerator/run.php\nfunction path_to_array (string \$handle = \"\", array | bool | null \$source = []): mixed {\n    if (\$source === null || \$source === false) {\n        return false;\n    }\n    $text\n}\n";