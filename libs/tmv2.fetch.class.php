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
            preg_match_all('/set-cookie: ([^;]+);/', (new sscurl('https://mobile.twitter.com/', 'GET', [], 1))->returnBody(0)->exec(), $cookies);
        } catch (\Exception $e) {
            return [false, $e, -1000, []];
        }
        //rate-limit是靠csrf token判断的，需要定期刷新csrf token
        //获取csrf token
        //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
        return ($guestToken["guest_token"]??false) ? [true, $guestToken["guest_token"], 200, $cookies[1]??[]] : [false, "No Token", -1000, $cookies[1]??[]];
    }

    //generate url
    private static function generate_url (string|int $user, bool $isGraphql): string {
        if ($isGraphql) {
            return "https://mobile.twitter.com/i/api/graphql/" .(is_numeric($user) ? (queryhqlQueryIdList["UserByRestIdWithoutResults"]["queryId"] . "/UserByRestIdWithoutResults?variables=" . urlencode(json_encode(["userId" => $user, "withHighlightedLabel" => true]))) : (queryhqlQueryIdList["UserByScreenNameWithoutResults"]["queryId"] . "/UserByScreenNameWithoutResults?variables=" . urlencode(json_encode(["screen_name" => $user, "withHighlightedLabel" => true]))));
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

    //get tweets
    public static function tw_get_tweets (int|float|string $queryString, string $cursor = "", array | string $guestToken = [], int|bool $count = false, bool $online = false, bool $graphqlMode = false, bool $searchMode = false): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        $count = $count ?: ($cursor ? 20 : ($online ? 20 : ($graphqlMode ? 499 : 999)));
        //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
        //实际上即使写了999网页api返回800-900条记录, 客户端返回约400-450条记录
        //网页版使用的
        //https://api.twitter.com/2/timeline/conversation/:uid.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=20&ext=mediaStats%2CcameraMoment
        //card类型需要启用full//建议启用full
        if ($graphqlMode) {
            //{"includePromotedContent":true,,,"withBirdwatchPivots":false,,,,"withSuperFollowsTweetFields":true,"withVoice":true,,"__fs_interactive_text":false,"__fs_dont_mention_me_view_api_enabled":false}
            $graphqlObject = [
                "userId" => $queryString,
                "count" => $count,
                "withHighlightedLabel" => true,
                "withTweetQuoteCount" => true,
                "withQuickPromoteEligibilityTweetFields" => true,
                "withSuperFollowsUserFields" => true,
                "withSuperFollowsTweetFields" => true,
                "withDownvotePerspective" => false,
                "withReactionsMetadata" => false,
                "includePromotedContent" => true,
                "withReactionsPerspective" => false,
                "withTweetResult" => false,
                "withReactions" => false,
                "withUserResults" => false,
                "withVoice" => true,
                "withNonLegacyCard" => true,
                "withBirdwatchPivots" => false,
                "withV2Timeline" => false
            ];
            if ($cursor) {
                $graphqlObject["cursor"] = $cursor;
            }
            return (new Fetch)->tw_fetch("https://mobile.twitter.com/i/api/graphql/" . queryhqlQueryIdList["UserTweets"]["queryId"] . "/UserTweets?variables=" . urlencode(json_encode($graphqlObject)), $guestToken);
        } elseif ($searchMode) {
            //TODO Graphql for search
            //https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=from%3Abang_dream_info%20since%3A2000-01-01&tweet_search_mode=live&count=20&query_source=typed_query&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel%2CsignalsReactionMetadata%2CsignalsReactionPerspective%2CvoiceInfo
            return (new Fetch)->tw_fetch("https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=" . urlencode($queryString) . "&tweet_search_mode=live&count=$count&query_source=typed_query&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel" . ($cursor ? '&cursor=' . urlencode($cursor) : ''), $guestToken);
        } else {
            return (new Fetch)->tw_fetch("https://api.twitter.com/2/timeline/profile/$queryString.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&ext=mediaStats%2CcameraMoment&count=$count" . ($cursor ? "&cursor=" . urlencode($cursor) : ''), $guestToken);
        }
    }

    //get conversation
    public static function tw_get_conversation (string $tweet_id, array | string $guestToken = [], int $count = 20): array {
        $guestToken = $guestToken ?: self::tw_get_token();
        //时隔多月又要更新这玩意了, 这次是因为卡片的图片时间久远了会失效......确实有点让人绝望
        //TODO Graphql for conversation
        return (new Fetch)->tw_fetch("https://api.twitter.com/2/timeline/conversation/$tweet_id.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=1&ext=mediaStats%2CcameraMoment", $guestToken);
    }

    //get poll result
    public static function tw_get_poll_result (string $tweet_id, int $count = 2, array | string $guestToken = []): array {
        //$guestToken = $guestToken ?: self::tw_get_token();
        $tweets = self::tw_get_conversation($tweet_id);
        if (isset($tweets["globalObjects"]["tweets"][$tweet_id])) {
            $data = [];
            for ($x = 1; $x <= $count; $x++) {
                $data[] = $tweets["globalObjects"]["tweets"][$tweet_id]["card"]["binding_values"]["choice{$x}_count"]["string_value"];
            }
            return ["code" => 200, "message" => "Success", "data" => $data];
        } elseif (isset($tweets["errors"])) {
            return $tweets["errors"][0];
        } else {
            return $tweets;
        }
    }
}
