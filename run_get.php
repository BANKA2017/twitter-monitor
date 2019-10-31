<?php
/*
 * twitter monitor v1
*/
require(dirname(__FILE__) . '/scurl.php');
require(dirname(__FILE__) . '/mysql.php');
require(dirname(__FILE__) . '/config.php');

//创建连接
$sssql = new ssql($servername,$username,$password,$dbname);

preg_match('/gt=([0-9]*);/', new sscurl('https://mobile.twitter.com/', 'get', [], 1), $a);
//获取csrf token

$account_info = json_decode(file_get_contents(dirname(__FILE__) . '/account_info.json'), true);
$name_count = [];
$update_names = false;
foreach ($account_info["account_info"] as $project => $accounts) {
    foreach ($accounts as $tag => $accountss) {
        foreach ($accountss as $c => $account) {
            echo $account["display_name"];
            if ($account["name"] == "" || preg_match('/\//', $account["name"]) || ($account["deleted"] ?? false)) {
                //处理跨企划人士, 只会导向一个企划 && 跳过已删号账户
                echo "Auto break\n";
                continue;
            }
            //输入模板
            $in_sql_info = [
                "uid" => "",
                "name" => "",
                "display_name" => "",
                "header" => "",
                "banner" => "",
                "following" => "",
                "followers" => "",
                "created_at" => "",
                "description" => "",
                "description_origin" => "",
                "verified" => "",
                "top" => 0,
                "tag" => $tag,//企划内队伍/staff组织
                "statuses_count" => "",//推文计数 TODO 不能单纯靠这个判断//WDNMD官方都拿这个判断了我干嘛要自作聪明？()
                "project" => $project//企划名称//此处应称为一级目录
            ];

            //分析数据模板
            $monitor_data_info = [
                "uid" => "",
                "name" => "",
                "display_name" => "",
                "following" => "",
                "followers" => "",
                "statuses_count" => "",
                "timestamp" => time(),
            ];

            $user_info = json_decode(new sscurl("https://api.twitter.com/1.1/users/show.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&" . (!isset($account["uid"]) ? "screen_name={$account["name"]}" : "user_id={$account["uid"]}"), 'get', ["authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA", "content-type: application/json", "x-guest-token: " . $a[1]], 1), true);
            //此处亦可使用user_id={$uid}//已支持自动切换

            if (isset($user_info["errors"])) {
                echo "Auto break ({$account["name"]}) -- {$user_info["errors"][0]["message"]}\n";
                $update_names = true;
                $account_info[$project][$tag][$c]["deleted"] = true;
                //删号自动添加
                continue;
            }
            //banner
            if (isset($user_info["profile_banner_url"])) {
                preg_match('/https:\/\/pbs.twimg.com\/profile_banners\/[0-9]+\/([\w]+)/', $user_info["profile_banner_url"], $banner);
                $in_sql_info["banner"] = $banner[1];
            } else {
                $in_sql_info["banner"] = 0;
            }


            //常规
            $in_sql_info["uid"] = $user_info["id"];
            $in_sql_info["name"] = $user_info["screen_name"];
            $in_sql_info["display_name"] = $user_info["name"];
            $in_sql_info["header"] = preg_replace('/https:\/\/pbs\.twimg\.com\/profile_images\/([0-9]+)\/([\w\-]+)_normal.([\w]+)/', '$1/$2.$3', $user_info["profile_image_url_https"]);
            $in_sql_info["following"] = $user_info["friends_count"];
            $in_sql_info["followers"] = $user_info["followers_count"];
            $in_sql_info["created_at"] = strtotime($user_info["created_at"]);
            $in_sql_info["verified"] = $user_info["verified"];
            //$in_sql_info["lang"] = $user_info["lang"];
            $in_sql_info["statuses_count"] = $user_info["statuses_count"];
            $in_sql_info["top"] = $user_info["pinned_tweet_ids"] ? $user_info["pinned_tweet_ids"][0] : 0;

            //monitor data
            $monitor_data_info["uid"] = $user_info["id"];
            $monitor_data_info["name"] = $user_info["screen_name"];
            $monitor_data_info["display_name"] = $user_info["name"];
            $monitor_data_info["following"] = $user_info["friends_count"];
            $monitor_data_info["followers"] = $user_info["followers_count"];
            $monitor_data_info["statuses_count"] = $user_info["statuses_count"];

            //处理介绍
            $description = $user_info["description"];
            $in_sql_info["description_origin"] = $description;
            foreach ($user_info["entities"]["description"] as $entities => $entities_) {
                switch ($entities) {
                    //暂时不提供服务 -> 栗子: Riko_kohara//事实上twitter没提供, 暂时无解
                    case "hashtags":
                        $newText = '';
                        $last_end = 0;
                        foreach ($entities_ as $single_entities) {
                            $newText .= mb_substr($description, $last_end, ($single_entities["indices"][0] - $last_end), 'utf-8') . "<a href=\"./#/tag/{$single_entities["text"]}\">#{$single_entities["text"]}</a>";
                            $last_end = $single_entities["indices"][1];
                            $tags[] = ["tag" => $single_entities["text"], "tweet_id" => $tweet];
                        }
                        $description = $newText . mb_substr($description, $last_end, mb_strlen($description), 'utf-8');
                        break;
                    case "urls":
                        foreach ($entities_ as $single_entities) {
                            $description = str_replace($single_entities["url"], "<a href=\"{$single_entities["expanded_url"]}\">{$single_entities["display_url"]}</a>", $description);
                        }
                        break;
                }
            }

            $in_sql_info["description"] = $description;

            //处理uid
            if (!isset($account["uid"]) || $account["uid"] != $user_info["id"]) {
                $update_names = true;
                $account_info[$project][$tag][$c]["uid"] = $user_info["id"];
            }

            //处理id
            if ($user_info["screen_name"] && $account["name"] != $user_info["screen_name"]) {
                $update_names = true;
                $account_info[$project][$tag][$c]["name"] = $user_info["screen_name"];
            }

            $verify_info = $sssql -> load("account_info", ["statuses_count", "last_cursor", "uid", "display_name", "cursor"], [["name", "=", $in_sql_info["name"], "OR"], ["uid", "=", $in_sql_info["uid"], "OR"]]);
            //使用uid或名字检查
            //monitor
            $sssql -> inset("twitter_data", $monitor_data_info);
            if (!count($verify_info)) {
                //完全没记录
                echo " - 插入新记录\n";
                $name_count[] = [
                    "name" => $in_sql_info["name"],
                    "display_name" => $in_sql_info["display_name"],
                    "last_cursor" => 0,
                    "cursor" => null,
                    "uid" => $in_sql_info["uid"],
                    "project" => $project
                ];
                //肯定有你
                $sssql -> inset("account_info", $in_sql_info);
            } else {
                echo " - 刷新记录";
                if ($verify_info[0]["statuses_count"] != $in_sql_info["statuses_count"]) {
                    // || !$verify_info[0]["cursor"]
                    echo " - 需要更新";
                    $name_count[] = [
                        "name" => $in_sql_info["name"],
                        "display_name" => $in_sql_info["display_name"],
                        "last_cursor" => $verify_info[0]["last_cursor"],
                        "cursor" => $verify_info[0]["cursor"],//锁死token
                        "uid" => $verify_info[0]["uid"],
                        "project" => $project
                    ];
                    //就是你了
                }
                echo "\n";
                $sssql -> update("account_info", $in_sql_info, [["name", "=", $in_sql_info["name"]]]);
            }
        }
    }
}

if ($update_names) {
    file_put_contents(dirname(__FILE__) . '/account_info.json', json_encode($account_info, JSON_UNESCAPED_UNICODE));
    //前后端分离专属//请确保具有目标目录读写权限
    if ($front_end_path) {
        file_put_contents($front_end_path . '/account_info.json', json_encode($account_info, JSON_UNESCAPED_UNICODE));
    }
}

//现在开始
if (count($name_count)) {
    echo "开始抓取推文\n";
    //各api独立计算, 无需cd sleep(60);//强制cd已启动
} else {
    echo "没有更新\n";
}
$last_project = "";
$timesss = 1;
$starttime = time();
$x = 0;
foreach ($name_count as $account_info) {
    //自动暂停

    //x-rate-limit-limit: 180
    //x-rate-limit-remaining: 179
    //x-rate-limit-reset: 1567401449
    //请求限制改成了180

    //你以为真的是180？骗你的, 只要暂停请求又是新一轮180//但还是开着吧,谁知道会有什么影响呢//要取消限制只需要将 196 行的 99 改成大的数字即可

    if (($timesss % 99 == 0) && time() <= $starttime+60) {
        $sleeptime = ($starttime+60-time());
        echo "system:单分钟请求超限, 暂停{$sleeptime}s\n";
        sleep($sleeptime);
        $starttime = time();
    }
    if ($last_project && $account_info["project"] != $last_project) {
        echo "{$last_project} 已结束, 正在开始 {$account_info["project"]}\n";
        $last_project = $account_info["project"];
    } elseif (!$last_project) {
        echo "正在开始 {$account_info["project"]}\n";
        $last_project = $account_info["project"];
    }
    //do{
    echo "正在处理{$account_info["display_name"]}\n";
    if (!$account_info["last_cursor"]) {
        echo "全新抓取{$account_info["display_name"]}\n";
        $max_tweetid = 0;
        $url = 'https://api.twitter.com/2/timeline/profile/' . $account_info["uid"] . '.json?tweet_mode=extended&count=93000';
        $count = 93000;
        $timesss++;
        $x++;
    } elseif (!$account_info["cursor"]) {
        $get_update = json_decode(new sscurl('https://twitter.com/i/profiles/show/' . $account_info["name"] . '/timeline/tweets?composed_count=0&include_available_features=0&include_entities=0&include_new_items_bar=true&interval=30000&latent_count=0&min_position=' . $account_info["last_cursor"]), true);
        $timesss++;
        if (!$get_update["new_latent_count"]) {
            echo "{$account_info["display_name"]}无更新\n";
            continue;
        }
        //你猜我在干啥
        echo "{$account_info["display_name"]}已更新{$get_update["new_latent_count"]}条\n";
        $max_tweetid = $get_update["max_position"];
        $url = "https://api.twitter.com/2/timeline/profile/{$account_info["uid"]}.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&include_tweet_replies=false&count={$get_update["new_latent_count"]}";
        $count = $get_update["new_latent_count"];
        //include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&include_tweet_replies=false
        $timesss++;
    } else {
        $max_tweetid = 0;
        $url = "https://api.twitter.com/2/timeline/profile/{$account_info["uid"]}.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&include_tweet_replies=false&count=40&cursor=" . urlencode($account_info["cursor"]);
        $timesss++;
    }
    //echo $url . "\n";
    $tweets = json_decode(new sscurl($url, 'get', ["authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA", "x-guest-token: " . $a[1]], 1), true);
    $sql = "";
    $x = 0;

    //检查是否带pinned
    $pinned_id = 0;
    $cursor = "";
    foreach ($tweets["timeline"]["instructions"] as $first_instructions) {
        foreach ($first_instructions as $second_instructions => $second_instructions_value) {
            switch ($second_instructions) {
                case "pinEntry":
                    $pinned_id = $second_instructions_value["entry"]["content"]["item"]["content"]["tweet"]["id"];
                    break;
                case "addEntries":
                    foreach ($second_instructions_value["entries"] as $third_entries_value) {
                        if (substr($third_entries_value["entryId"], 0, 10) == "cursor-top") {
                            $cursor = $third_entries_value["content"]["operation"]["cursor"]["value"];
                        }
                    }
                    break;
            }
        }
        if ($pinned_id && !$account_info["cursor"]) {
            //全新抓取不需要处理
            //使用新版抓取亦不需要处理
            if ($account_info["last_cursor"]) {
                echo "检测到含有置顶推文, 正在重新抓取\n";
                $url = 'https://api.twitter.com/2/timeline/profile/' . $account_info["uid"] . '.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&include_tweet_replies=false&count=' . ($count + 1);
                $tweets = json_decode(new sscurl($url, 'get', ["authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA", "x-guest-token: " . $a[1]], 1), true);
                $timesss++;
            }
            break;
        }
    }

    foreach ($tweets["globalObjects"]["tweets"] as $tweet => $content) {
        $in_sql = ["retweet_from" => "", "tweet_id" => null, "name" => "", "display_name" => "", "full_text" => "", "full_text_origin" => "", "time" => 0, "media" => []];
        $tags = [];
        //判断是否本人发推
        if ($content["user_id_str"] == $account_info["uid"]) {

            //记录原始json
            //$in_sql["origin_json"] = json_encode($content, JSON_UNESCAPED_UNICODE);

            //判断是否转推
            if (isset($content["retweeted_status_id_str"])) {
                $in_sql["time"] = strtotime($content["created_at"]);
                //提前处理时间
                $content = $tweets["globalObjects"]["tweets"][$content["retweeted_status_id_str"]];
                $in_sql["retweet_from"] = $tweets["globalObjects"]["users"][$content["user_id_str"]]["name"];
            } else {
                $in_sql["time"] = strtotime($content["created_at"]);
            }

            //处理最终tweet_id
            if ($tweet > $max_tweetid && $account_info["last_cursor"] == "") {
                $max_tweetid = $tweet;
            }

            //处理full_text
            $full_text = $content["full_text"];
            $in_sql["full_text_origin"] = $full_text;
            foreach ($content["entities"] as $entities => $entities_) {
                switch ($entities) {
                    case "hashtags":
                        $newText = '';
                        $last_end = 0;
                        foreach ($entities_ as $single_entities) {
                            $newText .= mb_substr($full_text, $last_end, ($single_entities["indices"][0] - $last_end), 'utf-8') . "<a href=\"./#/tag/{$single_entities["text"]}\">#{$single_entities["text"]}</a>";
                            $last_end = $single_entities["indices"][1];
                            $tags[] = ["tag" => $single_entities["text"], "tweet_id" => $tweet, "account" => $account_info["uid"]];
                        }
                        $full_text = $newText . mb_substr($full_text, $last_end, mb_strlen($full_text), 'utf-8');
                        break;
                    case "urls":
                        foreach ($entities_ as $single_entities) {
                            $full_text = str_replace($single_entities["url"], "<a href=\"{$single_entities["expanded_url"]}\">{$single_entities["display_url"]}</a>", $full_text);
                        }
                        break;
                }
            }
            $in_sql["full_text"] = nl2br(preg_replace('/ https:\/\/t.co\/[\w]+/', '', $full_text));

            //处理media
            //来啊, 互相伤害啊
            if (isset($content["extended_entities"]["media"])) {
                foreach ($content["extended_entities"]["media"] as $single_entities) {
                    switch ($single_entities["type"]) {
                        case "video":
                        case "animated_gif":
                            $media_origin = [];
                            foreach ($single_entities["video_info"]["variants"] as $media_single) {
                                if (preg_match('/video/', $media_single["content_type"])) {
                                    if (!isset($media_origin["bitrate"])) {
                                        $media_origin["url"] = preg_replace('/\?.*/', "", $media_single["url"]);
                                        $media_origin["content_type"] = $media_single["content_type"];
                                        $media_origin["bitrate"] = $media_single["bitrate"];
                                    } elseif ($media_origin["bitrate"] < $media_single["bitrate"]) {
                                        $media_origin["url"] = preg_replace('/\?.*/', "", $media_single["url"]);
                                        $media_origin["content_type"] = $media_single["content_type"];
                                        $media_origin["bitrate"] = $media_single["bitrate"];
                                    }
                                }
                            }
                            $media_origin["origin_type"] = $single_entities["type"];
                            $media_origin["origin_info"] = ["width" => $single_entities["original_info"]["width"], "height" => $single_entities["original_info"]["height"]];
                            $in_sql["media"][] = [
                                "cover" =>
                                [
                                    "thumb_img_url" => $single_entities["media_url_https"]
                                ],
                                "origin" => $media_origin
                            ];
                            break;
                        case "photo":
                            $in_sql["media"][] = [
                                "cover" =>
                                [
                                    "thumb_img_url" => $single_entities["media_url_https"]
                                ],
                                "origin" => [
                                    "url" => $single_entities["media_url_https"],
                                    "content_type" => "image/jpeg",
                                    "bitrate" => null,
                                    "origin_type" => "photo",
                                    "origin_info" => [
                                        "width" => $single_entities["original_info"]["width"],
                                        "height" => $single_entities["original_info"]["height"]
                                    ]
                                ]
                            ];
                            break;
                    }
                }
            }

            $in_sql["media"] = json_encode($in_sql["media"]);

            //处理其他
            $in_sql["tweet_id"] = $tweet;
            $in_sql["name"] = $account_info["name"];
            $in_sql["display_name"] = $account_info["display_name"];

            //翻译
            $in_sql["translate_source"] = '';
            //sssql
            //来人, 把这个置顶给老子干掉
            //丢弃策略必须重写19-6-18

            //丢弃策略重写, 非置顶均放行, 请自行处理重复问题, 内容锁运行正常

            //再次重写, 全部都检查, 只要重复就丢弃
            if ($account_info["last_cursor"] && count($sssql -> load("twitter_tweets", ["id"], [["tweet_id", "=", $tweet]]))) {
                echo "已丢弃第" . ($x + 1) . "条 -> {$tweet} (置顶推文)\n";
                $x++;
            } else {
                $sssql -> inset("twitter_tweets", $in_sql);
                foreach ($tags as $tag) {
                    $sssql -> inset("twitter_tags", $tag);
                }
                echo "已处理第" . ($x + 1) . "条 -> {$tweet}\n";
                $x++;
            }
        }
    }
    //一个号解决
    //差点整死我
    //echo $cursor . "\n";
    if ($max_tweetid && $cursor) {
        $sssql -> update("account_info", ["last_cursor" => $max_tweetid, "cursor" => $cursor], [["name", "=", $account_info["name"]]]);
    } elseif ($cursor) {
        $sssql -> update("account_info", ["cursor" => $cursor], [["name", "=", $account_info["name"]]]);
    }
}