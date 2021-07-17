<?php
/*
 * twitter monitor v2 functions
 * @banka2017 && KDNETWORK
 */
use kornrunner\Blurhash\Blurhash;
 //translate
function translate (string $source = "Google Translate", string $to, string $origin): string {
    $translate = "";
    switch ($source) {
        //有想法添加百度翻译的欢迎来pr
        //case "百度翻译":
        //    break;
        case "腾讯翻译君": 
            $txTranslate = new sscurl ("https://fanyi.qq.com");
            preg_match('/qtv = "([^"]+)"/', $txTranslate, $qtv);
            preg_match('/qtk = "([^"]+)"/', $txTranslate, $qtk);
            foreach(json_decode(new sscurl("https://fanyi.qq.com/api/translate", "POST", ['Referer: https://fanyi.qq.com/'], 3, http_build_query(["qtv" => $qtv[1], "qtk" => $qtk[1], "source" =>  "auto", "target" => $to, "sourceText" => $origin])), true)["translate"]["records"]??[] as $trs) {
                $translate .= $trs["targetText"];
            }
            break;
        case "Microsoft Translator":
            //bing translator
            $origin = str_replace("\n", "", $origin);
            $language = json_decode(new sscurl("https://www.translate.com/translator/ajax_lang_auto_detect", "post", ["Referer: https://www.translate.com/"], 3, ["text_to_translate" => $origin]), true)["language"];
            $translate = json_decode(new sscurl("https://www.translate.com/translator/ajax_translate", "post", ["Referer: https://www.translate.com/"], 3, ["text_to_translate" => $origin, "source_lang" => $language, "translated_lang" => $to, "use_cache_only" => false]), true)["translated_text"];
            break;
        default:
            //google translate
            //$origin = preg_replace('/[^\x{0000}-\x{FFFF}]|\x{200D}+/', '', $origin);//去除所有非bmp平面及\u200d
            $translate = "";
            $g_body = ["client" => "webapp", "sl" => "auto", "tl" => $to, "hl" => $to, "dt" => "at", "dt" => "bd", "dt" => "ex", "dt" => "ld", "dt" => "md", "dt" => "qca", "dt" => "rw", "dt" => "rm", "dt" => "ss", "dt" => "t", "clearbtn" => 1, "otf" => 1, "pc" => 1, "ssel" => 0, "tsel" => 0, "kc" => 2, "tk" => "", "q" => $origin];
            foreach (json_decode(new sscurl("https://translate.google.com/translate_a/single?" . html_entity_decode(http_build_query($g_body)), "get", ["referer: https://translate.google.com/", "authority: translate.google.com"]), true)[0]??[] as $trs) {
                $translate .= $trs[0];
            }
    }
    return $translate;
}

//get twitter csrf token
function tw_get_token (): array {
    preg_match('/gt=([0-9]+);/', (new sscurl('https://twitter.com/', 'GET', [], 1))->returnBody(0)->exec(), $csrfToken);
    //rate-limit是靠csrf token判断的，需要定期刷新csrf token
    //获取csrf token
    $GLOBALS["tw_server_info"]["total_req_times"]++;
    return ($csrfToken[1]??false) ? [true, $csrfToken[1]] : [false, "No Token"];
}

//get userinfo
//TODO full mode
function tw_get_userinfo (string $user, string $csrfToken = "", bool $full = false, bool $graphqlMode = true): array {
    if (!$csrfToken) {
        $csrfToken = tw_get_token()[1];
    }
    $GLOBALS["tw_server_info"]["total_req_times"]++;
    if ($graphqlMode) {
        if (is_numeric($user)) {
            return json_decode(new sscurl("https://mobile.twitter.com/i/api/graphql/{$GLOBALS["queryhqlQueryIdList"]["UserByRestIdWithoutResults"]["queryId"]}/UserByRestIdWithoutResults?variables=" . urlencode(json_encode(["userId" => $user, "withHighlightedLabel" => true])), 'get', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: " . $csrfToken], 1), true);
        } else {
            return json_decode(new sscurl("https://mobile.twitter.com/i/api/graphql/{$GLOBALS["queryhqlQueryIdList"]["UserByScreenNameWithoutResults"]["queryId"]}/UserByScreenNameWithoutResults?variables=" . urlencode(json_encode(["screen_name" => $user, "withHighlightedLabel" => true])), 'get', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: " . $csrfToken], 1), true);
        }
    } else {
        return json_decode(new sscurl("https://api.twitter.com/1.1/users/show.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&" . (is_numeric($user) ? "user_id=" : "screen_name=") . $user, 'get', ["authorization: " . TW_AUTHORIZATION, "content-type: application/json", "x-guest-token: " . $csrfToken], 1), true);
    }
}

//get tweets
function tw_get_tweets (string $queryString, string $cursor = "", string $csrfToken = "", bool $full = false, bool $online = false, bool $graphqlMode = true, bool $searchMode = false): array {
    if (!$csrfToken) {
        $csrfToken = tw_get_token()[1];
    }
    $GLOBALS["tw_server_info"]["total_req_times"]++;
    //实际上即使写了9999网页api返回800-900条记录, 客户端返回约400-450条记录
    //网页版使用的
    //https://api.twitter.com/2/timeline/conversation/:uid.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=20&ext=mediaStats%2CcameraMoment
    //card类型需要启用full//建议启用full
    if ($graphqlMode) {
        $graphqlObject = [
            "userId" => $queryString,
            "count" => ($online ? 20 : 40),
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
        } else {
            $graphqlObject["count"] = ($online ? 20 : 9999);
        }
        return json_decode(new sscurl("https://mobile.twitter.com/i/api/graphql/{$GLOBALS["queryhqlQueryIdList"]["UserTweets"]["queryId"]}/UserTweets?variables=" . urlencode(json_encode($graphqlObject)), 'get', ["authorization: " . TW_AUTHORIZATION, "x-guest-token: " . $csrfToken], 1), true);
    } elseif ($searchMode) {
        return json_decode(new sscurl("https://twitter.com/i/api/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweet=true&q=" . urlencode($queryString) . "&tweet_search_mode=live&count=999&query_source=typed_query&pc=1&spelling_corrections=1&ext=mediaStats%2ChighlightedLabel" . ($cursor ? '&cursor=' . $cursor : ''), 'get', ["authorization: " . TW_AUTHORIZATION, "x-guest-token: " . $csrfToken, 'cookie: gt=' . $csrfToken], 1), true);
    } else {
        if ($full) {
            return json_decode(new sscurl("https://api.twitter.com/2/timeline/profile/{$queryString}.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&ext=mediaStats%2CcameraMoment&count=" . ($cursor ? ($online ? 20 : 40)  . "&cursor=" . urlencode($cursor) : ($online ? 20 : 9999)), 'get', ["authorization: " . TW_AUTHORIZATION, "x-guest-token: " . $csrfToken], 1), true);
        } else {
            return json_decode(new sscurl("https://api.twitter.com/2/timeline/profile/{$queryString}.json?tweet_mode=extended&count=" . ($cursor ? ($online ? 20 : 40) . "&cursor=" . urlencode($cursor) : ($online ? 20 : 9999)), 'get', ["authorization: " . TW_AUTHORIZATION, "x-guest-token: " . $csrfToken], 1), true);
        }
    }
}

//get conversation
function tw_get_conversation (string $tweet_id, string $csrfToken = ""): array {
    if (!$csrfToken) {
        $csrfToken = tw_get_token()[1];
    }
    //时隔多月又要更新这玩意了, 这次是因为卡片的图片时间久远了会失效......确实有点让人绝望
    return json_decode(new sscurl("https://api.twitter.com/2/timeline/conversation/{$tweet_id}.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=1&ext=mediaStats%2CcameraMoment", 'get', ["authorization: " . TW_AUTHORIZATION, "x-guest-token: " . $csrfToken], 1), true);
}

//get poll result
function tw_get_poll_result (string $tweet_id, int $count = 2, string $csrfToken = ""): array {
    if (!$csrfToken) {
        $csrfToken = tw_get_token()[1];
    }
    $tweets = json_decode(new sscurl("https://api.twitter.com/2/timeline/conversation/{$tweet_id}.json?cards_platform=Web-12&include_cards=1&count=1", 'get', ["authorization: " . TW_AUTHORIZATION, "x-guest-token: " . $csrfToken], 1), true);
    if (isset($tweets["globalObjects"]["tweets"][$tweet_id])) {
        $data = [];
        for ($x = 1; $x <= $count; $x++) {
            $data[] = $tweets["globalObjects"]["tweets"][$tweet_id]["card"]["binding_values"]["choice{$x}_count"]["string_value"];
        }
        return ["code" => 0, "message" => "ok", "data" => $data];
    } elseif (isset($tweets["errors"])) {
        return $tweets["errors"][0];
    } else {
        return ["code" => -9999, "message" => "Error"];
    }
}

//处理entities
//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
function tw_entities (string $type, array $entitie, string $uid, string $tweetid, bool $hidden = false): array {
    $entitie_data = [
        "text" => "",//最终显示的文本
        "expanded_url"  => "",//转换为t.co前的原链//仅用于链接
        "url" => "",//t.co短链接, 直接可被替换//仅用于链接
        "hidden" => $hidden,//是否隐藏
    ];
    $entitie_data["uid"] = $uid;//用户id
    $entitie_data["tweet_id"] = $tweetid;//tweet id
    $entitie_data["indices_start"] = $entitie["indices"][0];//起始位置
    $entitie_data["indices_end"] = $entitie["indices"][1];//终止位置
    $entitie_data["length"] = $entitie["indices"][1] - $entitie["indices"][0];//长度
    $entitie_data["type"] = substr($type, 0, -1);
    switch ($type) {
        case "symbols"://这个貌似是根据上市代码搜索相关公司的推文
        case "hashtags":
            $entitie_data["text"] = $entitie["text"];//最终显示的文本
            break;
        case "urls":
            $entitie_data["text"] = $entitie["display_url"];//最终显示的文本
            $entitie_data["expanded_url"]  = $entitie["expanded_url"];//转换为t.co前的原链//仅用于链接
            $entitie_data["url"] = $entitie["url"];//t.co短链接, 直接可被替换//仅用于链接
            break;
        case "user_mentions":
            $entitie_data["text"] = "@{$entitie["screen_name"]}";//最终显示的文本
            $entitie_data["expanded_url"]  = "https://twitter.com/{$entitie["screen_name"]}";//转换为t.co前的原链//仅用于链接
            break;
    }
    return $entitie_data;
}

//处理媒体(media)//包括entities中的
//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/extended-entities-object
function tw_media (array $media, string $uid, string $tweetid, bool $hidden = false, string $source = "tweets", string $card_type = "", string $savePath = ""): array {
    $mediaInfoToReturn = [];
    $single_media = [
        "cover" => "",//类型
        "url" => "",
        "filename" => "",
        "extension" => "",
        "basename" => "",
        "bitrate" => 0,//仅用于视频类
        "hidden" => $hidden,//是否隐藏
        "source" => $source,//来源tweets cards
        "blurhash" => "",
    ];
    $single_media["uid"] = $uid;//用户id
    $single_media["tweet_id"] = $tweetid;//tweet id
    $single_media["origin_type"] = $card_type ?: $media["type"];//类型
    $single_media["origin_info_width"] = $media["original_info"]["width"];
    $single_media["origin_info_height"] = $media["original_info"]["height"];
    $single_media["media_key"] = $media["media_key"]??"";//你问我这个media_key是啥我只能说我也不知道
    switch ($media["type"]) {
        case "video":
        case "animated_gif":
            //$single_media["cover"] = $media["media_url_https"];
            //处理视频
            foreach ($media["video_info"]["variants"] as $variant) {
                if ($single_media["bitrate"] <= ($variant["bitrate"]??0)) {
                    $single_media["url"] = preg_replace('/\?.*/', "", $variant["url"]);
                    $single_media["content_type"] = $variant["content_type"];
                    $single_media["bitrate"] = ($variant["bitrate"]??0);
                }
            }
            
            //处理文件名以及类型
            $single_media["cover"] = $media["media_url_https"];
            $pathinfo = tw_pathinfo($single_media["url"]);
            $single_media["filename"] = $pathinfo["filename"];
            $single_media["basename"] = $pathinfo["basename"];
            $single_media["extension"] = $pathinfo["extension"]??"";

            if ($savePath !== "") {
                file_put_contents($savePath . '/' . $single_media["basename"], new sscurl($single_media["url"]));
            }
            //开始为封面构造一条记录
            $mediaInfoToReturn = [
                $single_media,
                [
                    "tweet_id" => $tweetid, 
                    "uid" => $uid,
                    "cover" => $media["media_url_https"],
                    "url" => $media["media_url_https"],
                    "bitrate" => 0,
                    "origin_type" => "photo",
                    "hidden" => $hidden,
                    "media_key" => $media["media_key"]??"",
                    "source" => "cover",
                ]
            ];

            //处理封面
            $mediaInfoToReturn[1]["origin_info_width"] = $media["original_info"]["width"];
            $mediaInfoToReturn[1]["origin_info_height"] = $media["original_info"]["height"];
            $pathinfo = tw_pathinfo($media["media_url_https"]);
            $mediaInfoToReturn[1]["filename"] = $pathinfo["filename"];
            $mediaInfoToReturn[1]["basename"] = $pathinfo["basename"];
            //$mediaInfoToReturn[0]["cover"] = $pathinfo["basename"];
            $mediaInfoToReturn[1]["extension"] = $pathinfo["extension"]??"";
            $mediaInfoToReturn[1]["content_type"] = get_mime($mediaInfoToReturn[1]["extension"]);//获取文件类型
            break;
        case "photo":
            $single_media["cover"] = $media["media_url_https"];//封面，虽然我不知都有什么用
            $single_media["url"] = $media["media_url_https"];//本体，嗯...
            //处理文件名以及类型
            $pathinfo = tw_pathinfo($single_media["url"]);
            $single_media["filename"] = $pathinfo["filename"];
            $single_media["basename"] = $pathinfo["basename"];
            //$single_media["cover"] = $pathinfo["basename"];
            $single_media["extension"] = $pathinfo["extension"]??"";
            $single_media["content_type"] = get_mime($single_media["extension"]);//类型

            if ($savePath !== "") {
                file_put_contents($savePath . '/' . $single_media["basename"], new sscurl($single_media["url"] . ":orig"));
            }

            if ($single_media["source"] == "tweets") {
                $getBlurHash = function(string $fileUrl): string {
                    $file = new sscurl($fileUrl);
                    if ($file) {
                        $image = imagecreatefromstring($file);
                        $width = imagesx($image);
                        $height = imagesy($image);
                        
                        $pixels = [];
                        for ($y = 0; $y < $height; $y = $y += 5) {
                            $row = [];
                            for ($x = 0; $x < $width; $x = $x += 5) {
                                $index = imagecolorat($image, $x, $y);
                                $colors = imagecolorsforindex($image, $index);
                                $row[] = [$colors['red'], $colors['green'], $colors['blue']];
                            }
                            $pixels[] = $row;
                        }
                        $components_x = 4;
                        $components_y = 3;
                        return Blurhash::encode($pixels, $components_x, $components_y);
                    } else {
                        kd_push("blurhash: 文件 {$fileUrl} 获取失败, tweet_id: {$tweetid} #blurhash", $token, $push_to);//KDpush
                        return "deleted";
                    }
                    
                };
                $single_media["blurhash"] = $getBlurHash(($savePath !== "" ? $savePath . '/' . $single_media["basename"] : $single_media["cover"]));
            }
            break;
    }
    return $mediaInfoToReturn ?: ($single_media["url"] ? [$single_media] : []);//多个优先，再到单个，再到空白
}

//处理文件类型
//https://pbs.twimg.com/media/DOhM30VVwAEpIHq.jpg//size一般不会写出 :large
//https://pbs.twimg.com/media/DOhM30VVwAEpIHq?format=jpg&name=large
function tw_pathinfo(string $path): array {
    $pathinfo = pathinfo($path);
    $pathinfo["pathtype"] = 0;
    if ($pathinfo["basename"]) {
        if ($pathinfo["basename"] === $pathinfo["filename"]) {
            $tmp_pathinfo_url = parse_url($path);
            parse_str($tmp_pathinfo_url["query"]??"", $tmp_pathinfo_url_query);
            $tmp_pathinfo_url_filename = pathinfo($tmp_pathinfo_url["path"])["filename"];
            $pathinfo["filename"] = $tmp_pathinfo_url_filename;
            $pathinfo["basename"] = $tmp_pathinfo_url_filename . ($tmp_pathinfo_url_query["format"]??"" ? "." . $tmp_pathinfo_url_query["format"] : "");
            $pathinfo["extension"] = $tmp_pathinfo_url_query["format"]??"";
            $pathinfo["size"] = $tmp_pathinfo_url_query["name"]??":medium";
            $pathinfo["pathtype"] = 1;
        } elseif (preg_match('/(.*):(.*)/', $pathinfo["extension"]??"", $newextension)) {
            $pathinfo["basename"] = $pathinfo["filename"] . '.' . $newextension[1];
            $pathinfo["extension"] = $newextension[1];
            $pathinfo["size"] = $newextension[2];
            $pathinfo["pathtype"] = 2;
        }
    }
    return $pathinfo;
}

//用户可发出的card未知
//卡片名称及寻找方式请参考下面
//https://github.com/igorbrigadir/twitter-advanced-search/blob/master/README.md
//使用Twitter for Advertisers创建的card请参考下面
//https://business.twitter.com/zh-cn/help/campaign-setup/advertiser-card-specifications.html
//下行是twitter现有及保留的所有卡片(card)类型
//{"responsive_web_unified_cards_all_cards_enabled":{"value":false},"responsive_web_unified_cards_amplify_enabled":{"value":true},"responsive_web_unified_cards_app_enabled":{"value":true},"responsive_web_unified_cards_appplayer_enabled":{"value":true},"responsive_web_unified_cards_audio_enabled":{"value":true},"responsive_web_unified_cards_broadcast_enabled":{"value":true},"responsive_web_unified_cards_direct_store_link_app_enabled":{"value":true},"responsive_web_unified_cards_image_direct_message_enabled":{"value":true},"responsive_web_unified_cards_live_event_enabled":{"value":false},"responsive_web_unified_cards_message_me_enabled":{"value":true},"responsive_web_unified_cards_moment_enabled":{"value":true},"responsive_web_unified_cards_periscope_broadcast_enabled":{"value":true},"responsive_web_unified_cards_player_enabled":{"value":true},"responsive_web_unified_cards_poll2choice_image_enabled":{"value":false},"responsive_web_unified_cards_poll2choice_text_only_enabled":{"value":true},"responsive_web_unified_cards_poll2choice_video_enabled":{"value":false},"responsive_web_unified_cards_poll3choice_image_enabled":{"value":false},"responsive_web_unified_cards_poll3choice_text_only_enabled":{"value":true},"responsive_web_unified_cards_poll3choice_video_enabled":{"value":false},"responsive_web_unified_cards_poll4choice_image_enabled":{"value":false},"responsive_web_unified_cards_poll4choice_text_only_enabled":{"value":true},"responsive_web_unified_cards_poll4choice_video_enabled":{"value":false},"responsive_web_unified_cards_promo_image_app_enabled":{"value":true},"responsive_web_unified_cards_promo_image_convo_enabled":{"value":true},"responsive_web_unified_cards_promo_video_convo_enabled":{"value":true},"responsive_web_unified_cards_promo_video_website_enabled":{"value":true},"responsive_web_unified_cards_promo_website_enabled":{"value":true},"responsive_web_unified_cards_promoted_cards_enabled":{"value":true},"responsive_web_unified_cards_summary_enabled":{"value":true},"responsive_web_unified_cards_summary_large_image_enabled":{"value":true},"responsive_web_unified_cards_unified_card_enabled":{"value":true},"responsive_web_unified_cards_video_direct_message_enabled":{"value":true},"responsive_web_unified_cards_vine_enabled":{"value":true}}
//此处描述的类型为3691233323:audiospace//有人说iPhone能发"audio", 不过我找了半天都没找到例子
function tw_card (array $cardInfo, string $uid, string $tweetid, bool $hidden = false, string $url = "", string $cardType = "", bool $graphqlMode = true): array {
    $card = [
        "data" => [
            "type" => $cardType,//类型
            "title" => "",//标题
            "description" => "",//简介
            "vanity_url" => "",//用于展示的域名
            "url" => $url,//实际域名
            "media" => 0,//是否有媒体
            "secondly_type" => null,
            "unified_card_app" => 0,
            //"poll" => 0,//是否有投票
        ],
        "media" => [],
        "app_data" => [],//app类的数据
        //"more" => [],//用以处理额外的信息, 存储在表 v2_twitter_card_ext
    ];

    //提前处理
    $card["data"]["uid"] = $uid;//TODO 从后面的users获得用户
    $card["data"]["tweet_id"] = $tweetid;
    $card["data"]["hidden"] = $hidden;
    //$card["data"]["type"] = preg_replace("/[0-9]+:(.*)/", "$1", $cardInfo["name"]);//类型

    if ($graphqlMode) {
        //重新将 Array 改回 Object
        $tmpBindingValueList = [];
        foreach ($cardInfo["binding_values"] as $bindingValue) {
            $tmpBindingValueList[$bindingValue["key"]] = $bindingValue["value"];
        }
        $cardInfo["binding_values"] = $tmpBindingValueList;
    }

    //这就是改成 graphql 的代码
    //$tmpList = [];
    //foreach ($cardInfo["binding_values"] as $key => $value) {
    //    $tmpList[] = ["key" => $key, "value" => $value];
    //}
    //$cardInfo["binding_values"] = $tmpList;

    //处理投票
    if (substr($card["data"]["type"], 0, 4) == "poll") {
        //投票...你问我为啥在card...请参阅
        //https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object 中关于poll object部分
        //获取长度
        $card["data"]["poll"] = 1;//投票
        $pollCount = substr($cardInfo["name"], 4 ,1);//2, 3, 4
        $card_end_datetime = strtotime($cardInfo["binding_values"]["end_datetime_utc"]["string_value"]);//结束时刻
        $card["data"]["polls"] = [];
        for ($pollCountTmp = 1; $pollCountTmp <= $pollCount; $pollCountTmp++) {
            $card["data"]["polls"][] = [
                "uid" => $uid,
                "tweet_id" => $tweetid,
                "hidden" => $hidden,
                "choice_label" => $cardInfo["binding_values"]["choice{$pollCountTmp}_label"]["string_value"],//选项标签名称
                "poll_order" => $pollCountTmp,//顺序
                "end_datetime" => $card_end_datetime,//结束时刻
            ];
        }

        //处理image
        if (substr($card["data"]["type"], -5) == "image") {
            $card["data"]["media"] = 1;//媒体
            $card["media"]["media_key"] = "";//卡片(card)没有media_key
            $card["media"]["uid"] = $uid;//TODO 从后面的users获得用户
            $card["media"]["tweet_id"] = $tweetid;
            $card["media"]["hidden"] = $hidden;
            $card["media"]["origin_type"] = "{$card["data"]["type"]}_card_photo";
            $card["media"]["bitrate"] = 0;
            $card["media"]["cover"] = $cardInfo["binding_values"]["image_large"]["image_value"]["url"];//由于封面只是size不同，所以无需额外创建记录
            $card["media"]["url"] = $cardInfo["binding_values"]["image_original"]["image_value"]["url"];//原始文件
            $card["media"]["origin_info_width"] = $cardInfo["binding_values"]["image_original"]["image_value"]["width"];
            $card["media"]["origin_info_height"] = $cardInfo["binding_values"]["image_original"]["image_value"]["height"];
            //处理媒体名称
            $pathinfo = tw_pathinfo($card["media"]["url"]);
            $card["media"]["filename"] = $pathinfo["filename"];
            $card["media"]["basename"] = $pathinfo["basename"];
            $card["media"]["extension"] = $pathinfo["extension"];
            $card["media"]["content_type"] = get_mime($pathinfo["extension"]);//获取文件类型//一般都是jpg或者png
            
            //来源
            $card["media"]["source"] = "cards";
        }
    } elseif ($card["data"]["type"] === "unified_card") {
        //这玩意对于内容的处理需要 components 的处理，有必要有更详细的处理方式
        //这东西远比我现象要复杂，涉及到全部核心部件的重写，下行的说法是不准确的，那样子只适用于单个卡片，多个卡片会涉及到走马灯
        //没见过的类型，奇怪的类型，扭曲的类型，小屏幕下是类似summary，大屏幕就像large_card
        //这是前所未有的类型，貌似是最近才出现的 (Twitter Monitor 监控首次报警是 2020-10-16 https://twitter.com/i/status/1316889033583149057)
        //子组件数据
        $childCardInfo = json_decode($cardInfo["binding_values"]["unified_card"]["string_value"], true);
        //组件类型
        //$tmpComponents = $cardInfo["components"];
        //看不懂啊，这都是啥啊
        $card["data"]["media"] = 1;//是否有媒体
        $card["data"]["secondly_type"] = $childCardInfo["type"];//子类型
        //处理子组件类型
        switch ($childCardInfo["type"]) {
            //上面是 图/视频 加链接, 虽然也没看明白
            case "image_website":
            case "video_website":
            case "image_carousel_website":
            case "video_carousel_website"://https://twitter.com/ABEMA/status/1356905272749551616
                //$card["data"]["title"] = '';//没有标题
                $card["data"]["description"] = $childCardInfo["component_objects"]["details_1"]["data"]["title"]["content"];//内容
                $card["data"]["vanity_url"] = $childCardInfo["component_objects"]["details_1"]["data"]["subtitle"]["content"];//显示的连接
                $card["data"]["url"] = $childCardInfo["destination_objects"][$childCardInfo["component_objects"]["details_1"]["data"]["destination"]]["data"]["url_data"]["url"];//真实链接
                break;
            //iphone跟iPad不都差不多嘛?//下面是app安装链接...我觉得都差不多, 但它有我就要支援, 真麻烦
            case "image_app":
            case "video_app":
            case "image_carousel_app"://https://twitter.com/stc_ksa/status/1359170192706703360
            case "video_carousel_app"://没找到实例, 但我觉得存在
                $card["data"]["unified_card_app"] = 1;
                $card["data"]["title"] = $childCardInfo["app_store_data"]["app_1"][0]["title"]["content"];//标题
                $card["data"]["description"] = $childCardInfo["app_store_data"]["app_1"][0]["category"]["content"];//内容
                $card["data"]["vanity_url"] = "App Store";//显示的连接
                //$card["data"]["url"] = "https://apps.apple.com/{$childCardInfo["app_store_data"]["app_1"][0]["country_code"]}/app/id{$childCardInfo["app_store_data"]["app_1"][0]["id"]}";//真实链接
                
                //处理 app 数据
                foreach ($childCardInfo["app_store_data"]["app_1"] as $childCardAppInfo) {
                    $card["app_data"][] = [
                        "tweet_id" => $tweetid,
                        "uid" => $uid,
                        "unified_card_type" => $childCardInfo["type"],//子类型
                        "type" => $childCardAppInfo["type"],//android_app iphone_app ipad_app
                        "appid" => $childCardAppInfo["id"],
                        "country_code" => $childCardAppInfo["country_code"],
                        "title" => $childCardAppInfo["title"]["content"],//名称
                        "category" => $childCardAppInfo["category"]["content"],//类型
                    ];
                }
                break;
            //不知道还有什么，现在只找到这些
            //不知道说什么，报个警吧
            default: 
                kd_push("快来研究新的子卡片\n #new_child_card #{$childCardInfo["type"]} \nid: {$tweetid}\nhttps://twitter.com/i/status/{$tweetid}\n" . $cardInfo["binding_values"]["unified_card"]["string_value"], $GLOBALS["token"], $GLOBALS["push_to"]);//喵喵喵
        }
        if (isset($childCardInfo["media_entities"])) {
            //媒体
            foreach ($childCardInfo["component_objects"]["swipeable_media_1"]["data"]["media_list"]??[$childCardInfo["component_objects"]["media_1"]["data"]] as $childCardMediaInfoKeyInfo) {
                $card["media"] = array_merge($card["media"], tw_media ($childCardInfo["media_entities"][$childCardMediaInfoKeyInfo["id"]], $uid, $tweetid, $hidden, "cards", "{$card["data"]["type"]}_{$childCardInfo["type"]}_card_{$childCardInfo["media_entities"][$childCardMediaInfoKeyInfo["id"]]["type"]}"));
            }
        }
        return $card;
    } 
    //elseif ($card["data"]["type"] === "appplayer" || $card["data"]["type"] === "promo_video_website" || $card["data"]["type"] === "promo_video_convo") {} 
    else {
        $tmp_whereIsInfoFrom = [
            //data
            "title" => "title",
            "description" => "description",
            "vanity_url" => "vanity_url",
            //media
            "cover" => "thumbnail_image_large",
            "origin" => "thumbnail_image_original",
        ];
        //选择类型
        switch ($card["data"]["type"]) {
            //这好像是最常见的一种?//默认的不用改了
            //case "summary":
            //    break;
            //这是twitter收购的播客网站
            //提供直播和回放
            //注: 此网站被墙
            case "periscope_broadcast":
                $card["data"]["url"] = $cardInfo["binding_values"]["url"]["string_value"];
            //如题, 带大图
            case "summary_large_image":
                $tmp_whereIsInfoFrom["cover"] = "summary_photo_image_large";
                $tmp_whereIsInfoFrom["origin"] = "summary_photo_image_original";
                break;
            //播放器, 其实我是没看懂//音频播放器跟player相似
            case "audio":
                $tmp_whereIsInfoFrom["vanity_url"] = "partner";
            //这...带视频的card..跟player差不多
            case "promo_video_website":
            case "player":
            //与 promo_video_website, promo_video_convo 差不多, 未来有计划支援视频
            case "appplayer":
                $tmp_whereIsInfoFrom["cover"] = "player_image_large";
                $tmp_whereIsInfoFrom["origin"] = "player_image_original";
                break;
            //播客, 类似上面的periscope_broadcast, 但还是有点不同
            case "broadcast":
                $tmp_whereIsInfoFrom["cover"] = "broadcast_thumbnail_large";
                $tmp_whereIsInfoFrom["origin"] = "broadcast_thumbnail_original";
                $card["data"]["url"] = $cardInfo["binding_values"]["broadcast_url"]["string_value"];
                break;
            case "promo_website":
                $tmp_whereIsInfoFrom["cover"] = "promo_image_large";
                $tmp_whereIsInfoFrom["origin"] = "promo_image_original";
                $card["data"]["url"] = $cardInfo["binding_values"]["website_url"]["string_value"];//这种类型的卡片自带源链接
                break;
            //类似 promo_website, 但有着发推后可见的内容//tmv2只记录发推完成后的内容
            case "promo_image_convo":
                $tmp_whereIsInfoFrom["title"] = "thank_you_text";
                $tmp_whereIsInfoFrom["vanity_url"] = "thank_you_vanity_url";
                $tmp_whereIsInfoFrom["cover"] = "promo_image_large";
                $tmp_whereIsInfoFrom["origin"] = "promo_image_original";
                $card["data"]["url"] = $cardInfo["binding_values"]["thank_you_url"]["string_value"];//这种类型的卡片自带源链接
                break;
            //个人感觉是 promo_website 和 player 的混合体
            case "promo_video_convo":
                $tmp_whereIsInfoFrom["title"] = "thank_you_text";
                $tmp_whereIsInfoFrom["vanity_url"] = "thank_you_vanity_url";
                $tmp_whereIsInfoFrom["cover"] = "player_image_large";
                $tmp_whereIsInfoFrom["origin"] = "player_image_original";
                $card["data"]["url"] = $cardInfo["binding_values"]["thank_you_url"]["string_value"]??"";//这种类型的卡片自带源链接
                break;
            
            //以下三项都是应用相关
            //无法找到出链接(第三种除外, 下同)
            //暂时无法支持
            //查证后确认只能登录后使用链接, 否则回跳回主页(即 https://twitter.com)
            //例子 https://twitter.com/ArknightsStaff/status/1230706209797197824
            case "promo_image_app":
                //$tmp_whereIsInfoFrom["vanity_url"] = "thank_you_vanity_url";
                $tmp_whereIsInfoFrom["cover"] = "promo_image_large";
                $tmp_whereIsInfoFrom["origin"] = "promo_image_original";
                //$card["data"]["url"] = $cardInfo["binding_values"]["thank_you_url"]["string_value"];//这种类型的卡片自带源链接
                break;
            
            //你问我跟下面有啥区别, 我一时也说不出来
            case "direct_store_link_app":
                $tmp_whereIsInfoFrom["vanity_url"] = "card_url";
            //app类可以查链接
            case "app":
                //$tmp_whereIsInfoFrom["vanity_url"] = "thank_you_vanity_url";
                $tmp_whereIsInfoFrom["cover"] = "thumbnail_large";
                $tmp_whereIsInfoFrom["origin"] = "thumbnail_original";
                break;


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
            case "live_event":
                $tmp_whereIsInfoFrom["title"] = "event_title";
                $tmp_whereIsInfoFrom["description"] = "event_subtitle";
                $tmp_whereIsInfoFrom["cover"] = "event_thumbnail_large";
                $tmp_whereIsInfoFrom["origin"] = "event_thumbnail_original";
                break;
            case "moment":
                $tmp_whereIsInfoFrom["cover"] = "photo_image";
                $tmp_whereIsInfoFrom["origin"] = "photo_image";
                $card["data"]["url"] = $cardInfo["binding_values"]["url"]["string_value"];
                break;
            //类似clubhouse的玩意, 仅限600fo以上的iOS用户发起
            //https://help.twitter.com/en/using-twitter/spaces
            //https://twitter.com/twitterspaces
            case "audiospace":
                $card["data"]["url"] = $cardInfo["binding_values"]["id"]["string_value"];
                break;
        }

        //写入
        //处理基本信息
        $card["data"]["title"] = $cardInfo["binding_values"][$tmp_whereIsInfoFrom["title"]]["string_value"]??"";//TODO 如果不是STRING怎么办呢
        $card["data"]["description"] = ($cardInfo["binding_values"][$tmp_whereIsInfoFrom["description"]]["string_value"]??"") . ((($card["data"]["type"] == "app" || $card["data"]["type"] == "appplayer") && isset($cardInfo["binding_values"]["app_star_rating"]["string_value"]) && isset($cardInfo["binding_values"]["app_num_ratings"]["string_value"])) ? "\n{$cardInfo["binding_values"]["app_star_rating"]["string_value"]}/5.0 stars - {$cardInfo["binding_values"]["app_num_ratings"]["string_value"]} ratings" : "");//同上
        $card["data"]["vanity_url"] = ($cardInfo["binding_values"][$tmp_whereIsInfoFrom["vanity_url"]]["string_value"]??"") . ((($card["data"]["type"] == "promo_image_app" || $card["data"]["type"] == "appplayer") && isset($cardInfo["binding_values"]["site"]["user_value"]["id_str"]) && ($graphqlMode ? isset($cardInfo["user_refs"]) : isset($cardInfo["users"][$cardInfo["binding_values"]["site"]["user_value"]["id_str"]]))) ? ($graphqlMode ? $cardInfo["user_refs"][0]["legacy"]["name"] : $cardInfo["users"][$cardInfo["binding_values"]["site"]["user_value"]["id_str"]]["name"]) : "");//再同上
        //处理媒体
        if (isset($cardInfo["binding_values"][$tmp_whereIsInfoFrom["origin"]])) {
            $card["data"]["media"] = 1;//媒体
            $card["media"]["media_key"] = "";//卡片(card)没有media_key
            $card["media"]["uid"] = $uid;//TODO 从后面的users获得用户
            $card["media"]["tweet_id"] = $tweetid;
            $card["media"]["hidden"] = $hidden;
            $card["media"]["origin_type"] = "{$card["data"]["type"]}_card_photo";
            $card["media"]["bitrate"] = 0;
            $card["media"]["cover"] = $cardInfo["binding_values"][$tmp_whereIsInfoFrom["cover"]]["image_value"]["url"];//由于封面只是size不同，所以无需额外创建记录
            $card["media"]["url"] = $cardInfo["binding_values"][$tmp_whereIsInfoFrom["origin"]]["image_value"]["url"];//原始文件
            $card["media"]["origin_info_width"] = $cardInfo["binding_values"][$tmp_whereIsInfoFrom["origin"]]["image_value"]["width"];
            $card["media"]["origin_info_height"] = $cardInfo["binding_values"][$tmp_whereIsInfoFrom["origin"]]["image_value"]["height"];
            //处理媒体名称
            $pathinfo = tw_pathinfo($card["media"]["url"]);
            $card["media"]["filename"] = $pathinfo["filename"];
            $card["media"]["basename"] = $pathinfo["basename"];
            $card["media"]["extension"] = $pathinfo["extension"];
            $card["media"]["content_type"] = get_mime($pathinfo["extension"]);//获取文件类型//一般都是jpg或者png
            
            //来源
            $card["media"]["source"] = "cards";
        }
    }
    return $card;
}

//loooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong
//https://github.com/MoeNetwork/Tieba-Cloud-Sign/blob/c4ab393045bcabde97c1a70fbe8e8d56be8f7f1e/lib/sfc.functions.php#L790
function get_mime($ext): string {
	static $mime_types = [
        'apk'     => 'application/vnd.android.package-archive',
        '3gp'     => 'video/3gpp',
        'ai'      => 'application/postscript',
        'aif'     => 'audio/x-aiff',
        'aifc'    => 'audio/x-aiff',
        'aiff'    => 'audio/x-aiff',
        'asc'     => 'text/plain',
        'atom'    => 'application/atom+xml',
        'au'      => 'audio/basic',
        'avi'     => 'video/x-msvideo',
        'bcpio'   => 'application/x-bcpio',
        'bin'     => 'application/octet-stream',
        'bmp'     => 'image/bmp',
        'cdf'     => 'application/x-netcdf',
        'cgm'     => 'image/cgm',
        'class'   => 'application/octet-stream',
        'cpio'    => 'application/x-cpio',
        'cpt'     => 'application/mac-compactpro',
        'csh'     => 'application/x-csh',
        'css'     => 'text/css',
        'dcr'     => 'application/x-director',
        'dif'     => 'video/x-dv',
        'dir'     => 'application/x-director',
        'djv'     => 'image/vnd.djvu',
        'djvu'    => 'image/vnd.djvu',
        'dll'     => 'application/octet-stream',
        'dmg'     => 'application/octet-stream',
        'dms'     => 'application/octet-stream',
        'doc'     => 'application/msword',
        'dtd'     => 'application/xml-dtd',
        'dv'      => 'video/x-dv',
        'dvi'     => 'application/x-dvi',
        'dxr'     => 'application/x-director',
        'eps'     => 'application/postscript',
        'etx'     => 'text/x-setext',
        'exe'     => 'application/octet-stream',
        'ez'      => 'application/andrew-inset',
        'flv'     => 'video/x-flv',
        'gif'     => 'image/gif',
        'gram'    => 'application/srgs',
        'grxml'   => 'application/srgs+xml',
        'gtar'    => 'application/x-gtar',
        'gz'      => 'application/x-gzip',
        'hdf'     => 'application/x-hdf',
        'hqx'     => 'application/mac-binhex40',
        'htm'     => 'text/html',
        'html'    => 'text/html',
        'ice'     => 'x-conference/x-cooltalk',
        'ico'     => 'image/x-icon',
        'ics'     => 'text/calendar',
        'ief'     => 'image/ief',
        'ifb'     => 'text/calendar',
        'iges'    => 'model/iges',
        'igs'     => 'model/iges',
        'jnlp'    => 'application/x-java-jnlp-file',
        'jp2'     => 'image/jp2',
        'jpe'     => 'image/jpeg',
        'jpeg'    => 'image/jpeg',
        'jpg'     => 'image/jpeg',
        'js'      => 'application/x-javascript',
        'kar'     => 'audio/midi',
        'latex'   => 'application/x-latex',
        'lha'     => 'application/octet-stream',
        'lzh'     => 'application/octet-stream',
        'm3u'     => 'audio/x-mpegurl',
        'm4a'     => 'audio/mp4a-latm',
        'm4p'     => 'audio/mp4a-latm',
        'm4u'     => 'video/vnd.mpegurl',
        'm4v'     => 'video/x-m4v',
        'mac'     => 'image/x-macpaint',
        'man'     => 'application/x-troff-man',
        'mathml'  => 'application/mathml+xml',
        'me'      => 'application/x-troff-me',
        'mesh'    => 'model/mesh',
        'mid'     => 'audio/midi',
        'midi'    => 'audio/midi',
        'mif'     => 'application/vnd.mif',
        'mov'     => 'video/quicktime',
        'movie'   => 'video/x-sgi-movie',
        'mp2'     => 'audio/mpeg',
        'mp3'     => 'audio/mpeg',
        'mp4'     => 'video/mp4',
        'mpe'     => 'video/mpeg',
        'mpeg'    => 'video/mpeg',
        'mpg'     => 'video/mpeg',
        'mpga'    => 'audio/mpeg',
        'ms'      => 'application/x-troff-ms',
        'msh'     => 'model/mesh',
        'mxu'     => 'video/vnd.mpegurl',
        'nc'      => 'application/x-netcdf',
        'oda'     => 'application/oda',
        'ogg'     => 'application/ogg',
        'ogv'     => 'video/ogv',
        'pbm'     => 'image/x-portable-bitmap',
        'pct'     => 'image/pict',
        'pdb'     => 'chemical/x-pdb',
        'pdf'     => 'application/pdf',
        'pgm'     => 'image/x-portable-graymap',
        'pgn'     => 'application/x-chess-pgn',
        'pic'     => 'image/pict',
        'pict'    => 'image/pict',
        'png'     => 'image/png',
        'pnm'     => 'image/x-portable-anymap',
        'pnt'     => 'image/x-macpaint',
        'pntg'    => 'image/x-macpaint',
        'ppm'     => 'image/x-portable-pixmap',
        'ppt'     => 'application/vnd.ms-powerpoint',
        'ps'      => 'application/postscript',
        'qt'      => 'video/quicktime',
        'qti'     => 'image/x-quicktime',
        'qtif'    => 'image/x-quicktime',
        'ra'      => 'audio/x-pn-realaudio',
        'ram'     => 'audio/x-pn-realaudio',
        'ras'     => 'image/x-cmu-raster',
        'rdf'     => 'application/rdf+xml',
        'rgb'     => 'image/x-rgb',
        'rm'      => 'application/vnd.rn-realmedia',
        'roff'    => 'application/x-troff',
        'rtf'     => 'text/rtf',
        'rtx'     => 'text/richtext',
        'sgm'     => 'text/sgml',
        'sgml'    => 'text/sgml',
        'sh'      => 'application/x-sh',
        'shar'    => 'application/x-shar',
        'silo'    => 'model/mesh',
        'sit'     => 'application/x-stuffit',
        'skd'     => 'application/x-koan',
        'skm'     => 'application/x-koan',
        'skp'     => 'application/x-koan',
        'skt'     => 'application/x-koan',
        'smi'     => 'application/smil',
        'smil'    => 'application/smil',
        'snd'     => 'audio/basic',
        'so'      => 'application/octet-stream',
        'spl'     => 'application/x-futuresplash',
        'src'     => 'application/x-wais-source',
        'sv4cpio' => 'application/x-sv4cpio',
        'sv4crc'  => 'application/x-sv4crc',
        'svg'     => 'image/svg+xml',
        'swf'     => 'application/x-shockwave-flash',
        't'       => 'application/x-troff',
        'tar'     => 'application/x-tar',
        'tcl'     => 'application/x-tcl',
        'tex'     => 'application/x-tex',
        'texi'    => 'application/x-texinfo',
        'texinfo' => 'application/x-texinfo',
        'tif'     => 'image/tiff',
        'tiff'    => 'image/tiff',
        'tr'      => 'application/x-troff',
        'tsv'     => 'text/tab-separated-values',
        'txt'     => 'text/plain',
        'ustar'   => 'application/x-ustar',
        'vcd'     => 'application/x-cdlink',
        'vrml'    => 'model/vrml',
        'vxml'    => 'application/voicexml+xml',
        'wav'     => 'audio/x-wav',
        'wbmp'    => 'image/vnd.wap.wbmp',
        'wbxml'   => 'application/vnd.wap.wbxml',
        'webm'    => 'video/webm',
        'wml'     => 'text/vnd.wap.wml',
        'wmlc'    => 'application/vnd.wap.wmlc',
        'wmls'    => 'text/vnd.wap.wmlscript',
        'wmlsc'   => 'application/vnd.wap.wmlscriptc',
        'wmv'     => 'video/x-ms-wmv',
        'wrl'     => 'model/vrml',
        'xbm'     => 'image/x-xbitmap',
        'xht'     => 'application/xhtml+xml',
        'xhtml'   => 'application/xhtml+xml',
        'xls'     => 'application/vnd.ms-excel',
        'xml'     => 'application/xml',
        'xpm'     => 'image/x-xpixmap',
        'xsl'     => 'application/xml',
        'xslt'    => 'application/xslt+xml',
        'xul'     => 'application/vnd.mozilla.xul+xml',
        'xwd'     => 'image/x-xwindowdump',
        'xyz'     => 'chemical/x-xyz',
        'zip'     => 'application/zip'
    ];
    return isset($mime_types[$ext]) ? $mime_types[$ext] : 'application/octet-stream';
}

//push server
function kd_push(string $text = "", string $token = "", string $to = ""){
    if ($token) {
        if (preg_match('/[0-9]+:[\w]+/', $token)) {
            //切割文字防止无法发送
            $textLength = strlen($text);
            $partCount = ceil($textLength / 3000);
            for ($x = 1; $x <= $partCount; $x++) {
                $r = json_decode(new sscurl("https://api.telegram.org/bot{$token}/sendMessage", "post", [], "KDboT", ["chat_id" => $to, "text" => mb_substr($text, ($x - 1) * 3000, 3000)]), true);
                if($r["ok"] ?? false){
                    echo "KDboT: Successful to push log #part{$x} to master channel\n";
                }else{
                    echo "KDboT: Error #{$r["description"]}\n";
                }
            }
        //} elseif ($to == 'qqbot') {
        //    //这是腾讯QQ测试中的hookbot, 可用性不保证, 仅供尝鲜
        //    //已暂时失效
        //    $r = new sscurl("https://app.qun.qq.com/cgi-bin/api/hookrobot_send?key={$token}", "post", [], 3, '{"content": [ {"type":0,"data":"' . $text . '"}]}');
        //    //if (!$r["errno"]) {
        //    echo "HOO!K: Successful to push error log to QQ group\n";
        //    //} else {
        //    //    echo "HOO!K: Error #{$r["errmsg"]}";
        //    //}
        } else {
            $r = json_decode(new sscurl("https://sc.ftqq.com/{$token}.send", "post", [], "KDboT", ["text" => $text]), true);
            if (!$r["errno"]) {
                echo "ServerChan: Successful to push log to wechat\n";
            } else {
                echo "ServerChan: Error #{$r["errmsg"]}";
            }
        }
    }
}

