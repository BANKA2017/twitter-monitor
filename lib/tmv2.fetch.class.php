<?php
/*
 * twitter monitor v2 fetch class
 * @banka2017 && KDNETWORK
 */
namespace Tmv2\Fetch;
use sscurl;
class Fetch{

    private function tw_fetch (string $url, string $csrfToken): array {
        $csrfToken = $csrfToken ?: self::tw_get_token()[1];
        try {
            return json_decode(new sscurl($url, 'get', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: $csrfToken"], 1), true);
        } catch (\Exception $e) {
            return ["code" => -1000, "message" => $e];
        }
    }
    private function tw_fetch_multi (array $urls, string $csrfToken): array {
        $csrfToken = $csrfToken ?: self::tw_get_token()[1];
        try {
            return (new sscurl($urls, 'get', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: $csrfToken"], 1))->returnMultiCurlContent(true);
        } catch (\Exception $e) {
            return ["code" => -1000, "message" => $e];
        }
    }
    //get twitter csrf token
    public static function tw_get_token (): array {
        try {
            $csrfToken = json_decode(new sscurl("https://api.twitter.com/1.1/guest/activate.json", "POST", ["authorization: " . TW_AUTHORIZATION]), true);
            //preg_match('/gt=([\d]+);/', (new sscurl('https://twitter.com/', 'GET', [], 1))->returnBody(0)->exec(), $csrfToken);
        } catch (\Exception $e) {
            return [false, $e, -1000];
        }
        //rate-limit是靠csrf token判断的，需要定期刷新csrf token
        //获取csrf token
        //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
        return ($csrfToken["guest_token"]??false) ? [true, $csrfToken["guest_token"], 200] : [false, "No Token", -1000];
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
    public static function tw_get_userinfo (int|float|string|array $user, string $csrfToken = "", bool $graphqlMode = true): array {
        $csrfToken = $csrfToken ?: self::tw_get_token()[1];
        if (is_array($user)) {
            $tmpUrl = [];
            foreach ($user as $userId) {
                $tmpUrl[] = self::generate_url($userId, $graphqlMode);
            }
            return (new Fetch)->tw_fetch_multi($tmpUrl, $csrfToken);
        } else {
            //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
            return (new Fetch)->tw_fetch(self::generate_url($user, $graphqlMode), $csrfToken);
        }
    }

    //get tweets
    public static function tw_get_tweets (int|float|string $queryString, string $cursor = "", string $csrfToken = "", int|bool $count = false, bool $online = false, bool $graphqlMode = false, bool $searchMode = false): array {
        $csrfToken = $csrfToken ?: self::tw_get_token()[1];
        $count = $count ?: ($cursor ? 20 : ($online ? 20 : 999));
        //TODO move server info to global scripts//$GLOBALS["tw_server_info"]["total_req_times"]++;
        //实际上即使写了999网页api返回800-900条记录, 客户端返回约400-450条记录
        //网页版使用的
        //https://api.twitter.com/2/timeline/conversation/:uid.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=20&ext=mediaStats%2CcameraMoment
        //card类型需要启用full//建议启用full
        if ($graphqlMode) {
            $graphqlObject = [
                "userId" => $queryString,
                "count" => $count,
                "withHighlightedLabel" => true,
                "withTweetQuoteCount" => true,
                "includePromotedContent" => true,
                "withTweetResult" => false,
                "withReactions" => false,
                "withUserResults" => false,
                "withVoice" => false,
                "withNonLegacyCard" => true,
                "withBirdwatchPivots" => false
            ];
            if ($cursor) {
                $graphqlObject["cursor"] = $cursor;
            }
            return (new Fetch)->tw_fetch("https://mobile.twitter.com/i/api/graphql/" . queryhqlQueryIdList["UserTweets"]["queryId"] . "/UserTweets?variables=" . urlencode(json_encode($graphqlObject)), $csrfToken);
        } elseif ($searchMode) {
            //TODO Graphql for search
            //https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=from%3Abang_dream_info%20since%3A2000-01-01&tweet_search_mode=live&count=20&query_source=typed_query&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel%2CsignalsReactionMetadata%2CsignalsReactionPerspective%2CvoiceInfo

            return (new Fetch)->tw_fetch("https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=" . urlencode($queryString) . "&tweet_search_mode=live&count=$count&query_source=typed_query&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel" . ($cursor ? '&cursor=' . urlencode($cursor) : ''), $csrfToken);
        } else {
            return (new Fetch)->tw_fetch("https://api.twitter.com/2/timeline/profile/$queryString.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&ext=mediaStats%2CcameraMoment&count=$count" . ($cursor ? "&cursor=" . urlencode($cursor) : ''), $csrfToken);
        }
    }

    //get conversation
    public static function tw_get_conversation (string $tweet_id, string $csrfToken = "", int $count = 20): array {
        $csrfToken = $csrfToken ?: self::tw_get_token()[1];
        //时隔多月又要更新这玩意了, 这次是因为卡片的图片时间久远了会失效......确实有点让人绝望
        //TODO Graphql for conversation
        return (new Fetch)->tw_fetch("https://api.twitter.com/2/timeline/conversation/$tweet_id.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=1&ext=mediaStats%2CcameraMoment", $csrfToken);
    }

    //get poll result
    public static function tw_get_poll_result (string $tweet_id, int $count = 2, string $csrfToken = ""): array {
        $csrfToken = $csrfToken ?: self::tw_get_token()[1];
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