<?php
/*
 * twitter monitor v2 fetch class
 * @banka2017 && NEST.MOE
 */
namespace Tmv2\Fetch;
use sscurl;
class Fetch{

    private function generateCsrfToken (): string {
        return md5(microtime(true));
    }
    private function tw_fetch (string $url, array | string $guestToken = []): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        $ct0 = $this->generateCsrfToken();
        //new sscurl($url, 'options', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: " . $guestToken[1], "x-csrf-token: $ct0", "cookie: ct0=$ct0; gt=" . $guestToken[1] . '; ' . implode("; ", $guestToken[3])], 1);
        try {
            $tmpData = json_decode(new sscurl($url, 'get', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: " . $guestToken[1], "x-csrf-token: $ct0", "cookie: ct0=$ct0; gt=" . $guestToken[1] . '; ' . implode("; ", $guestToken[3])], 1), true);
            return $tmpData ?: ["code" => -1000, "message" => "empty data"];
        } catch (\Exception $e) {
            return ["code" => -1000, "message" => $e];
        }
    }
    private function tw_fetch_multi (array $urls, array | string $guestToken = []): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        try {
            $ct0 = $this->generateCsrfToken();
            return (new sscurl($urls, 'get', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: " . $guestToken[1], "x-csrf-token: $ct0", "cookie: ct0=$ct0; gt=" . $guestToken[1] . '; ' . implode("; ", $guestToken[3])], 1))->returnMultiCurlContent(true);
        } catch (\Exception $e) {
            return ["code" => -1000, "message" => $e];
        }
    }
    //get twitter csrf token
    public static function tw_get_token (): array {
        try {
            $ct0 = (new Fetch)->generateCsrfToken();
            //get gt
            $getGt = (new sscurl("https://api.twitter.com/1.1/guest/activate.json", "POST", ["authorization: " . TW_AUTHORIZATION, "x-csrf-token: $ct0", "cookie: ct0=$ct0"]))->returnBody(0)->header_body();
            $guestToken = json_decode($getGt[1], true);
            //get cookies
            preg_match_all('/set-cookie: ([^;]+);/', $getGt[0], $cookies);
        } catch (\Exception $e) {
            return [false, $e, -1000, []];
        }
        //rate-limit是靠csrf token判断的，需要定期刷新csrf token
        //获取csrf token
        //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
        return ($guestToken["guest_token"]??false) ? [true, $guestToken["guest_token"], 200, $cookies[1]??[]] : [false, "No Token", -1000, $cookies[1]??[]];
    }

    //generate url
    private static function generate_url (string|int $user, bool $isGraphql = false): string {
        if ($isGraphql) {
            $graphqlVariables = ["withSuperFollowsUserFields" => true];
            if (is_numeric($user)) {
                $graphqlVariables["userId"] = $user;
                return "https://twitter.com/i/api/graphql/" . queryhqlQueryIdList["UserByRestId"]["queryId"] . "/UserByRestId?variables=" . urlencode(json_encode($graphqlVariables));
            } else {
                $graphqlVariables["screen_name"] = $user;
                return "https://twitter.com/i/api/graphql/" . queryhqlQueryIdList["UserByScreenName"]["queryId"] . "/UserByScreenName?variables=" . urlencode(json_encode($graphqlVariables));
            }
        } else {
            return "https://api.twitter.com/1.1/users/show.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&" . (is_numeric($user) ? "user_id=" : "screen_name=") . $user;
        }
    }

    //get userinfo
    //TODO full mode
    public static function tw_get_userinfo (int|float|string|array $user, array | string $guestToken = [], bool $graphqlMode = true): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        if (is_array($user)) {
            $tmpUrl = [];
            foreach ($user as $userId) {
                $tmpUrl[] = self::generate_url($userId, $graphqlMode);
            }
            return (new Fetch)->tw_fetch_multi($tmpUrl, $guestToken);
        } else {
            //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
            return (new Fetch)->tw_fetch(self::generate_url($user, $graphqlMode), $guestToken);
        }
    }

    //get followers && following
    //MUST ADD COOKIE
    public static function tw_get_following_and_followers (int|string $uid, string $cursor = "", array $guestToken = [], int|bool $count = false, string $type = "Followers") {
        $guestToken = $guestToken ?: self::tw_get_token();
        $count = $count ?: 20;
        $graphqlVariables = [
            "userId" => $uid,
            "count" => $count,
            "includePromotedContent" => false,
            "withSuperFollowsUserFields" => true,
            "withDownvotePerspective" => false,
            "withReactionsMetadata" => false,
            "withReactionsPerspective" => false,
            "withSuperFollowsTweetFields" => true,
            "__fs_interactive_text" => false,
            "__fs_responsive_web_uc_gql_enabled" => false,
            "__fs_dont_mention_me_view_api_enabled" => false
        ];
        return (new Fetch)->tw_fetch("https://twitter.com/i/api/graphql/" . queryhqlQueryIdList[$type]["queryId"] . "/$type?variables=" . urlencode(json_encode($graphqlVariables)), $guestToken);
    }

    //get tweets
    public static function tw_get_tweets (int|float|string $queryString, string $cursor = "", array | string $guestToken = [], int|bool $count = false, bool $online = false, bool $graphqlMode = false, bool $searchMode = false): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        $count = $count ?: ($cursor ? 40 : ($online ? 40 : ($graphqlMode ? 499 : 999)));
        //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
        //实际上即使写了999网页api返回800-900条记录, 客户端返回约400-450条记录
        //网页版使用的
        //https://api.twitter.com/2/timeline/conversation/:uid.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=20&ext=mediaStats%2CcameraMoment
        //card类型需要启用full//建议启用full
        if ($graphqlMode) {
            //{"includePromotedContent":true,,,"withBirdwatchPivots":false,,,,"withSuperFollowsTweetFields":true,"withVoice":true,,"__fs_interactive_text":false,"__fs_dont_mention_me_view_api_enabled":false}

            $graphqlFeatures = [
                "dont_mention_me_view_api_enabled" => true,
                "interactive_text_enabled" => true,
                "responsive_web_uc_gql_enabled" => false,
                "vibe_tweet_context_enabled" => false,
                "responsive_web_edit_tweet_api_enabled" => false,
                "standardized_nudges_misinfo" => false,
                "responsive_web_enhance_cards_enabled" => false
            ];

            $graphqlVariables = [
                "userId" => $queryString,
                "count" => $count,
                "withTweetQuoteCount" => true,
                "withQuickPromoteEligibilityTweetFields" => true,
                "withSuperFollowsUserFields" => true,
                "withSuperFollowsTweetFields" => true,
                "withDownvotePerspective" => false,
                "withReactionsMetadata" => false,
                "includePromotedContent" => true,
                "withReactionsPerspective" => false,
                "withUserResults" => false,
                "withVoice" => true,
                "withNonLegacyCard" => true,
                "withV2Timeline" => true,
            ];

            if ($cursor) {
                $graphqlVariables["cursor"] = $cursor;
            }
            return (new Fetch)->tw_fetch("https://twitter.com/i/api/graphql/" . queryhqlQueryIdList["UserTweets"]["queryId"] . "/UserTweets?" . http_build_query(["variables" => json_encode($graphqlVariables), "features" => json_encode($graphqlFeatures)]), $guestToken);
        } elseif ($searchMode) {
            //TODO Graphql for search
            //https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&q=from%3Abang_dream_info%20since%3A2000-01-01&tweet_search_mode=live&count=20&query_source=typed_query&pc=1&spelling_corrections=1&include_ext_edit_control=false&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CreplyvotingDownvotePerspective%2CvoiceInfo%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2Ccollab_control%2Cvibe
            return (new Fetch)->tw_fetch("https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&q=" . urlencode($queryString) . "&tweet_search_mode=live&count=$count&query_source=typed_query&pc=1&spelling_corrections=1&include_ext_edit_control=false&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CreplyvotingDownvotePerspective%2CvoiceInfo%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2Ccollab_control%2Cvibe" . ($cursor ? '&cursor=' . urlencode($cursor) : ''), $guestToken);
        } else {
            return (new Fetch)->tw_fetch("https://api.twitter.com/2/timeline/profile/$queryString.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&ext=mediaStats%2CcameraMoment&count=$count" . ($cursor ? "&cursor=" . urlencode($cursor) : ''), $guestToken);
        }
    }

    //get conversation
    public static function tw_get_conversation (string|array $tweet_id, array | string $guestToken = [], bool | int $graphqlMode = true): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        //时隔多月又要更新这玩意了, 这次是因为卡片的图片时间久远了会失效......确实有点让人绝望

        if ($graphqlMode) {
            $graphqlFeatures = [
                "dont_mention_me_view_api_enabled" => true,
                "interactive_text_enabled" => true,
                "responsive_web_uc_gql_enabled" => false,
                "vibe_api_enabled" => true,
                "vibe_tweet_context_enabled" => false,
                "responsive_web_edit_tweet_api_enabled" => false,
                "standardized_nudges_misinfo" => false,
                "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled" => false,
                "responsive_web_enhance_cards_enabled" => false
            ];

            if (is_array($tweet_id)) {
                $tmpUrl = [];
                foreach ($tweet_id as $tweet) {
                    $graphqlVariables = [
                        "focalTweetId" => $tweet,
                        "with_rux_injections" => false,
                        "includePromotedContent" => true,
                        "withCommunity" => true,
                        "withQuickPromoteEligibilityTweetFields" => true,
                        "withBirdwatchNotes" => false,
                        "withSuperFollowsUserFields" => true,
                        "withDownvotePerspective" => false,
                        "withReactionsMetadata" => false,
                        "withReactionsPerspective" => false,
                        "withSuperFollowsTweetFields" => true,
                        "withVoice" => true,
                        "withV2Timeline" => true,
                    ];
                    $tmpUrl[] = "https://twitter.com/i/api/graphql/" . queryhqlQueryIdList["TweetDetail"]["queryId"] . "/TweetDetail?" . http_build_query(["variables" => json_encode($graphqlVariables), "features" => json_encode($graphqlFeatures)]);
                }
                return (new Fetch)->tw_fetch_multi($tmpUrl, $guestToken);
            } else {
                $graphqlVariables = [
                    "focalTweetId" => $tweet_id,
                    "with_rux_injections" => false,
                    "includePromotedContent" => true,
                    "withCommunity" => true,
                    "withQuickPromoteEligibilityTweetFields" => true,
                    "withBirdwatchNotes" => false,
                    "withSuperFollowsUserFields" => true,
                    "withDownvotePerspective" => false,
                    "withReactionsMetadata" => false,
                    "withReactionsPerspective" => false,
                    "withSuperFollowsTweetFields" => true,
                    "withVoice" => true,
                    "withV2Timeline" => true,
                ];
                return (new Fetch)->tw_fetch("https://twitter.com/i/api/graphql/" . queryhqlQueryIdList["TweetDetail"]["queryId"] . "/TweetDetail?" . http_build_query(["variables" => json_encode($graphqlVariables), "features" => json_encode($graphqlFeatures)]), $guestToken);
            }

        } else {
            return (new Fetch)->tw_fetch("https://api.twitter.com/2/timeline/conversation/$tweet_id.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=1&ext=mediaStats%2CcameraMoment", $guestToken);
        }
    }

    //get poll result
    public static function tw_get_poll_result (string $tweet_id, array | string $guestToken = []): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        $tweet = self::tw_get_conversation($tweet_id, $guestToken);
        if (isset($tweet["errors"])) {
            return ["code" => 403, "message" => $tweet["errors"][0]["message"], "data" => []];
        }
        $tweet = path_to_array("tweets_contents", $tweet);
        $tweetItem = [];
        foreach ($tweet as $tmpTweetItem) {
            if ($tmpTweetItem["entryId"] === "tweet-$tweet_id") {
                $tweetItem = path_to_array("tweet_content", $tmpTweetItem);
                break;
            }
        }
        if (path_to_array("tweet_card_path", $tweetItem)) {
            $cardInfo = path_to_array("tweet_card_path", $tweetItem);
            $data = [];
            if ($cardInfo && str_starts_with(path_to_array("tweet_card_name", $cardInfo), "poll")) {
                $tmpBindingValueList = [];
                foreach ($cardInfo["binding_values"] as $bindingValue) {
                    $tmpBindingValueList[$bindingValue["key"]] = $bindingValue["value"];
                }
                $cardInfo["binding_values"] = $tmpBindingValueList;

                for ($x = 1; $x <= 4; $x++) {
                    if (!isset($cardInfo["binding_values"]["choice{$x}_count"])) {
                        break;
                    }
                    $data[] = $cardInfo["binding_values"]["choice{$x}_count"]["string_value"];
                }
                return ["code" => 200, "message" => "Success", "data" => $data];
            } else {
                return ["code" => 403, "message" => "Invalid card type", "data" => []];
            }
        } else {
            return ["code" => 404, "message" => "Nothing here", "data" => []];
        }
    }
    // get audio space
    public static function tw_get_audio_space_result (string | array $id, array | string $guestToken = []): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        $graphqlFeatures = [
            "spaces_2022_h2_clipping" => true,
            "spaces_2022_h2_spaces_communities" => false,
            "dont_mention_me_view_api_enabled" => true,
            "interactive_text_enabled" => true,
            "responsive_web_uc_gql_enabled" => true,
            "vibe_api_enabled" => true,
            "vibe_tweet_context_enabled" => true,
            "responsive_web_edit_tweet_api_enabled" => true,
            "standardized_nudges_misinfo" => true,
            "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled" => false,
            "responsive_web_enhance_cards_enabled" => false
        ];
        if (is_array($id)) {
            $tmpUrl = [];
            foreach ($id as $idString) {
                $graphqlVariables = [
                    "id" => $idString,
                    "isMetatagsQuery" => true,
                    "withSuperFollowsUserFields" => true,
                    "withDownvotePerspective" => false,
                    "withReactionsMetadata" => false,
                    "withReactionsPerspective" => false,
                    "withSuperFollowsTweetFields" => true,
                    "withReplays" => true
                ];
                $tmpUrl[] = "https://twitter.com/i/api/graphql/" . queryhqlQueryIdList["AudioSpaceById"]["queryId"] . "/AudioSpaceById?" . http_build_query(["variables" => json_encode($graphqlVariables), "features" => json_encode($graphqlFeatures)]);
            }
            return (new Fetch)->tw_fetch_multi($tmpUrl, $guestToken);
        } else {
            $graphqlVariables = [
                "id" => $id,
                "isMetatagsQuery" => true,
                "withSuperFollowsUserFields" => true,
                "withDownvotePerspective" => false,
                "withReactionsMetadata" => false,
                "withReactionsPerspective" => false,
                "withSuperFollowsTweetFields" => true,
                "withReplays" => true
            ];

            return (new Fetch)->tw_fetch("https://twitter.com/i/api/graphql/" . queryhqlQueryIdList["AudioSpaceById"]["queryId"] . "/AudioSpaceById?" . http_build_query(["variables" => json_encode($graphqlVariables), "features" => json_encode($graphqlFeatures)]), $guestToken);
        }
    }
}
