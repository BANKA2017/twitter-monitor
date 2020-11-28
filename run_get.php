<?php
/*
 * twitter monitor v2
 * @banka2017 && KDNETWORK
 */
require(dirname(__FILE__) . '/init.php');

//所有中文化的标准https://abs.twimg.com/responsive-web/web/i18n-rweb/zh.95401bf4.js

//关闭
if (!$run_options["twitter"]["userinfo"]) {
    die("Twitter Monitor: 未启动\n");
}
//创建连接
$sssql = new ssql($servername,$username,$password,$dbname);

//rate-limit是靠csrf token判断的, 需要定期刷新csrf token
//获取csrf token
$get_csrf_token = tw_get_token ();
if(!count($get_csrf_token)){
    kd_push("Twitter Monitor: 无法获取csrf token #nocsrfToken", $token, $push_to);//KDpush
    die("Twitter Monitor: 无法获取csrf token #nocsrfToken\n");
}
$csrfToken = $get_csrf_token[1];
//$account_info = json_decode(file_get_contents(SYSTEM_ROOT . '/account_info.json'), true);
$config = json_decode(file_get_contents(SYSTEM_ROOT . '/config.json'), true);//原始配置文件
$configInMysql = $sssql->load("v2_config", ["id", "data_origin", "data_output", "md5", "timestamp"], [["id", "=", $config_id]], [], 1);

//需要更新的用户的信息
$name_count = [];

//是否需要用户数据
$update_names = false;

//用户统计
$userinfoReqCount = 0;

//出错推送内容
$userInfoErrorsForPush = "";
foreach ($config["users"] as $account_s => $account) {

    //呐呐呐[ (Auto break| Auto break (@nenene) -- User is not exist|)]
    echo $account["display_name"];
    if (!strlen($account["name"]) || ($account["deleted"] ?? false) || ($account["locked"] ?? false)) {
        //跳过已删号或不存在账户或已锁定
        echo " Auto break\n";
        continue;
    }
    //输入模板
    //table account_info
    $in_sql_info = [
        "uid" => 0,
        "name" => "",
        "display_name" => "",
        "header" => "",
        "banner" => "",
        "following" => "",
        "followers" => "",
        "media_count" => 0,
        "created_at" => "",
        "description" => "",
        "description_origin" => "",
        "verified" => "",
        "organization" => 0,
        "top" => 0,
        "statuses_count" => "",//推文计数
        
        //账号状态
        "hidden" => $account["hidden"] ?? 0 ? 1 : 0,//隐藏//本站层面
        "locked" => $account["locked"] ?? 0 ? 1 : 0,//锁推//twitter层面
        "deleted" => $account["deleted"] ?? 0 ? 1 : 0,//删号人士
        "organization" => (int)($account["organization"]??false),//组织帐号
        
        //来源 twitter
        //"source" => "twitter",

        //已删除//以下两项即将删除
        //"tag" => $tag,//企划内队伍/staff组织//Out of date
        //"project" => $project//企划名称//此处应称为一级目录//Out of date
    ];

    //分析数据模板
    $monitor_data_info = [
        "uid" => 0,
        "name" => "",
        "display_name" => "",
        "following" => 0,
        "followers" => 0,
        "statuses_count" => 0,
        "timestamp" => time(),
    ];
    
    //此处限制是 1000req/15min //此处亦可使用user_id={$uid}//已支持自动切换
    if ($userinfoReqCount > 999) {
        $get_csrf_token = tw_get_token ();
        if(!count($get_csrf_token)){
            kd_push("Twitter Monitor: 无法获取csrf token #nocsrfToken", $token, $push_to);//KDpush
            die("Twitter Monitor: 无法获取csrf token #nocsrfToken\n");
        }
        $csrfToken = $get_csrf_token[1];
        $userinfoReqCount = 0;
    }
    $user_info = tw_get_userinfo(($account["uid"]??0) ?: $account["name"], $csrfToken);
    $userinfoReqCount++;
    
    //处理特殊警告
    //"profile_interstitial_type": "sensitive_media",//这是其一, 另外几个用空再找


    //处理删号
    if (isset($user_info["errors"]) || $user_info["protected"]) {
        echo "Auto break ({$account["name"]}) -- {$user_info["errors"][0]["message"]}\n";
        $update_names = true;
        if ($user_info["protected"]??false) {
            //protect 用于本地隐藏
            $config["users"][$account_s]["locked"] = true;
            $sssql->update("v2_account_info", ["locked" => 1], [["name", "=", $account["name"]]]);
            kd_push($account["name"] . "已保护账户 #locked", $token, $push_to);//KDpush
        } elseif ($user_info["errors"][0]["code"] === 50) {
            //deleted 用于在twitter删除帐户的用户
            $config["users"][$account_s]["deleted"] = true;
            $sssql->update("v2_account_info", ["deleted" => 1], [["name", "=", $account["name"]]]);
            kd_push($account["name"] . "已删除账户 #deleted", $token, $push_to);//KDpush
        } else {
            $accountErrorCount = isset($config["users"][$account_s]["error_count"]) ? $config["users"][$account_s]["error_count"]++ : 1;
            $tw_server_info["total_errors_count"]++;
            $userInfoErrorsForPush .= $account["name"] . "查询出错 {$user_info["errors"][0]["message"]} %{$accountErrorCount} #error {$user_info["errors"][0]["code"]}\n";
            //$sssql->insert("v2_error_log", ["uid" => ($account["uid"]??0), "name" => $account["name"], "info" => json_encode($user_info, JSON_UNESCAPED_UNICODE)]);
            //事不过三系统
            if ($accountErrorCount >= 3 ) {
                $config["users"][$account_s]["deleted"] = true;
                echo $account["name"] . "已跳过\n";
            } else {
                $config["users"][$account_s]["error_count"] = $accountErrorCount;
            }
        }
        
        //删号自动添加
        continue;
    } else {
        $config["users"][$account_s]["error_count"] = 0;
    }
    //banner
    if (isset($user_info["profile_banner_url"])) {
        preg_match('/\/([0-9]+)$/', $user_info["profile_banner_url"], $banner);
        $in_sql_info["banner"] = $banner[1];
        $update_names = true;
    } else {
        $in_sql_info["banner"] = 0;
    }

    //常规
    $in_sql_info["uid"] = $user_info["id_str"];
    $in_sql_info["name"] = $user_info["screen_name"];
    $in_sql_info["display_name"] = $user_info["name"];
    $in_sql_info["header"] = preg_replace('/\/([0-9]+)\/([\w\-]+)_normal.([\w]+)$/', '/$1/$2.$3', $user_info["profile_image_url_https"]);
    $in_sql_info["following"] = $user_info["friends_count"];
    $in_sql_info["followers"] = $user_info["followers_count"];
    $in_sql_info["media_count"] = $user_info["media_count"];
    $in_sql_info["created_at"] = strtotime($user_info["created_at"]);
    $in_sql_info["verified"] = (int)$user_info["verified"];
    //$in_sql_info["lang"] = $user_info["lang"];
    $in_sql_info["statuses_count"] = $user_info["statuses_count"];
    $in_sql_info["top"] = $user_info["pinned_tweet_ids"] ? $user_info["pinned_tweet_ids"][0] : 0;
    
    //处理介绍
    $description = $user_info["description"];
    $in_sql_info["description_origin"] = $description;
    foreach ($user_info["entities"]["description"] as $entities => $entities_) {
        switch ($entities) {
            //TODO //此处问题由api暴力解决//暂时不提供服务->栗子: Riko_kohara//事实上twitter没提供, 暂时无解
            //case "hashtags":
            //    $newText = '';
            //    $last_end = 0;
            //    foreach ($entities_ as $single_entities) {
            //        $newText .= mb_substr($description, $last_end, ($single_entities["indices"][0] - $last_end), 'utf-8') . "<a href=\"#/tag/{$single_entities["text"]}\">#{$single_entities["text"]}</a>";
            //        $last_end = $single_entities["indices"][1];
            //        $tags[] = ["tag" => $single_entities["text"], "tweet_id" => $tweet];
            //    }
            //    $description = $newText . mb_substr($description, $last_end, mb_strlen($description), 'utf-8');
            //    break;
            case "urls":
                foreach ($entities_ as $single_entities) {
                    $description = str_replace($single_entities["url"], "<a href=\"{$single_entities["expanded_url"]}\" target=\"_blank\">{$single_entities["display_url"]}</a>", $description);
                }
                break;
        }
    }

    $in_sql_info["description"] = $description;

    //处理uid
    if (($account["uid"]??0) != $user_info["id_str"]) {
        $update_names = true;
        $config["users"][$account_s]["uid"] = $user_info["id_str"];
    }

    //处理id
    //一般人都不会改名, 但是谁知道会不会真遇上呢
    if ($user_info["screen_name"] && $account["name"] != $user_info["screen_name"]) {
        $update_names = true;
        $config["users"][$account_s]["name"] = $user_info["screen_name"];
    }
    
    //处理display_name
    //警告: 若取消注释则会强制同步display_name为该账户的twitter名称且无法使用自定义display_name
    //if ($user_info["name"] && $account["display_name"] != $user_info["name"]) {
    //    $update_names = true;
    //    $config["users"][$account_s]["display_name"] = $user_info["name"];
    //}
    
    //使用uid或名字检查
    $verify_info = $sssql->load("v2_account_info", ["uid", "name", "display_name", "header", "banner", "description_origin", "top", "statuses_count", "hidden", "locked", "deleted", "new", "cursor", "last_cursor"], [["uid", "=", $in_sql_info["uid"]]]);
    //由于早期设计失误, new字段0时为新帐号, 为1时是完成首次爬取的帐号

    //monitor data
    //同时满足时才会插入监控项目
    if($user_info["id_str"] && $run_options["twitter"]["count_data_user"] && !($account["not_analytics"]??false)){
        //处理数据
        $monitor_data_info["uid"] = $user_info["id_str"];
        $monitor_data_info["name"] = $user_info["screen_name"];
        $monitor_data_info["display_name"] = $user_info["name"];
        $monitor_data_info["following"] = $user_info["friends_count"];
        $monitor_data_info["followers"] = $user_info["followers_count"];
        $monitor_data_info["statuses_count"] = $user_info["statuses_count"];
        $monitor_data_info["media_count"] = $user_info["media_count"];
        $sssql->insert("twitter_data", $monitor_data_info);
        //临时表, 用于stats
        $monitor_data_info["visible"] = (int)!($in_sql_info["hidden"] || $in_sql_info["locked"] || $in_sql_info["deleted"] || $in_sql_info["organization"]);
        $sssql->insert("tmp_twitter_data", $monitor_data_info, false, $monitor_data_info);
    }elseif (($account["not_analytics"]??false)) {
        echo " - 不统计";
    } else {
        kd_push($account["name"] . "出现数据错误 #twitter_data", $token, $push_to);//KDpush
    }

    //处理用户
    if (!count($verify_info)) {
        //完全没记录
        if($user_info["id_str"]){
            echo " - 插入新记录\n";
            $name_count[] = [
                "name" => $in_sql_info["name"],
                "display_name" => $in_sql_info["display_name"],
                "last_cursor" => 0,
                "cursor" => "",
                "uid" => $in_sql_info["uid"],
                "pinned" => $in_sql_info["top"],
                "hidden" => (int)($account["hidden"] ?? 0)
            ];
            //肯定有你
            $sssql->insert("v2_account_info", $in_sql_info);
        }else{
            kd_push($account["name"] . "出现数据错误 #account_info", $token, $push_to);//KDpush
        }
    } else {
        echo " - 刷新记录";

        if ($verify_info[0]["new"] == '1' && array_diff_assoc(array_slice($verify_info[0], 0, 11), ["uid" => $in_sql_info["uid"], "name" => $in_sql_info["name"], "display_name" => $in_sql_info["display_name"], "header" => $in_sql_info["header"], "banner" => $in_sql_info["banner"], "description_origin" => $in_sql_info["description_origin"], "top" => $in_sql_info["top"], "statuses_count" => $in_sql_info["statuses_count"], "hidden" => $in_sql_info["hidden"], "locked" => $in_sql_info["locked"], "deleted" => $in_sql_info["deleted"]])) {

            echo " - 需要更新";
            $name_count[] = [
                "name" => $in_sql_info["name"],
                "display_name" => $in_sql_info["display_name"],
                "last_cursor" => $verify_info[0]["last_cursor"],
                "cursor" => $verify_info[0]["cursor"],//锁死token
                "uid" => $verify_info[0]["uid"],
                "pinned" => $in_sql_info["top"],
                "hidden" => (int)($account["hidden"] ?? 0)
            ];
            //就是你了
        } else {
            echo " - 锁定中";
        }
        echo "\n";
        $sssql->update("v2_account_info", $in_sql_info, [["uid", "=", $in_sql_info["uid"]]]);
    }
}

if ($userInfoErrorsForPush !== "") {
    kd_push($userInfoErrorsForPush, $token, $push_to);//KDpush
}


//处理本地配置文件
if ($update_names) {
    $config_jsonencode = json_encode($config, JSON_UNESCAPED_UNICODE);
    file_put_contents(SYSTEM_ROOT . '/config.json', $config_jsonencode);
    //转换文件
    $config_sql_md5 = count($configInMysql) === 1 ? $configInMysql[0]["md5"] : "0";//is_file(SYSTEM_ROOT . '/account_info_t.json') ? json_decode(file_get_contents(SYSTEM_ROOT . '/account_info_t.json'), true) : ["hash" => 0];//运行文件
    $config_md5 = md5($config_jsonencode);
    if($config_md5 !== $config_sql_md5){
        //需要执行更新
        $newAccountInfo = ["account_info" => [], "projects" => [], "nsfwList" => [], "links" => [], "hash" => ""];//Template
        //处理
        //处理用户
        foreach($config["users"] as $user){
            if(!($user["hidden"] ?? false)){
                foreach($user["projects"] as $project){
                    //项目
                    if(isset($newAccountInfo["account_info"][$project[0]][$project[1]])){
                        $newAccountInfo["account_info"][$project[0]][$project[1]][] = ["name" => $user["name"], "display_name" => $user["display_name"], "projects" => $user["projects"]];
                    }elseif(isset($newAccountInfo["account_info"][$project[0]])){
                        $newAccountInfo["account_info"][$project[0]][$project[1]] = [["name" => $user["name"], "display_name" => $user["display_name"], "projects" => $user["projects"]]];
                    }else{
                        $newAccountInfo["account_info"][$project[0]] = [$project[1] => [["name" => $user["name"], "display_name" => $user["display_name"], "projects" => $user["projects"]]]];
                    }
                    if(!in_array($project[0], $newAccountInfo["projects"])){
                        $newAccountInfo["projects"][] = $project[0];
                    }
                }
            }
        }
        //nsfwList
        $newAccountInfo["nsfwList"] = $config["nsfwList"];
        //links
        $newAccountInfo["links"] = $config["links"];
        //hash
        $newAccountInfo["hash"] = $config_md5;
        $config_data = ["id" => $config_id, "data_origin" => $config_jsonencode, "data_output" => json_encode($newAccountInfo, JSON_UNESCAPED_UNICODE), "md5" => $config_md5, "timestamp" => time()];
        $sssql->insert("v2_config", $config_data, false, $config_data);
        //file_put_contents(SYSTEM_ROOT . '/account_info_t.json', json_encode($newAccountInfo, JSON_UNESCAPED_UNICODE));
        //前后端分离专属//请确保具有目标目录读写权限
        //if ($front_end_path) {
        //    file_put_contents($front_end_path . '/account_info_t.json', json_encode($newAccountInfo, JSON_UNESCAPED_UNICODE));
        //}
    }
}

//现在开始
if (count($name_count) && $run_options["twitter"]["tweets"]) {
    echo "开始抓取推文\n";
    $tw_server_info["total_users"] = count($name_count);
    //各api独立计算, 无需cd sleep(60);//强制cd已启动
}
//elseif ($run_options["twitter"]["local_data"]) {
//    $sssql->insert("v2_server_info", $tw_server_info);
//    echo "没有更新\n";
//} 
else {
    echo "没有更新\n";
}
//$tw_server_info["total_req_tweets"] = 1;//次数
$starttime = time();
foreach ($name_count as $account_info) {
    //自动暂停

    //x-rate-limit-limit: 180
    //x-rate-limit-remaining: 179
    //x-rate-limit-reset: 1567401449
    //请求限制改成了180

    //这个rate-limit是靠csrf token判断的, 后面那堆吐槽不用看了//你以为真的是180？骗你的, 只要暂停请求又是新一轮180//但还是开着吧,谁知道会有什么影响呢//要取消限制只需要将下行的 99 改成大的数字即可

    //更多关于请求限制的信息请参阅 https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
    //太长不看: 180req/15min
    if (($tw_server_info["total_req_tweets"] && $tw_server_info["total_req_tweets"] % 180 == 0) && time() <= $starttime+900) {
        //15分钟
        $sleeptime = ($starttime+900-time());
        $get_csrf_token = tw_get_token ();
        if(!count($get_csrf_token)){
            kd_push("Twitter Monitor: 无法获取csrf token #nocsrfToken", $token, $push_to);//KDpush
            die("Twitter Monitor: 无法获取csrf token #nocsrfToken\n");
        }
        $csrfToken = $get_csrf_token[1];
        echo "system: 请求超限, 刷新token->{$csrfToken}\n";
        $starttime = time();
    }

    echo "正在处理{$account_info["display_name"]}\n";
    if (!$account_info["last_cursor"]) {
        echo "全新抓取{$account_info["display_name"]}\n";
        $max_tweetid = "0";
        //$url = 'https://api.twitter.com/2/timeline/profile/' . $account_info["uid"] . '.json?tweet_mode=extended&count=93000';
        $tw_server_info["total_req_tweets"]++;
    } else {
        $max_tweetid = "0";
        //$url = "https://api.twitter.com/2/timeline/profile/{$account_info["uid"]}.json?tweet_mode=extended&count=40&cursor=" . urlencode($account_info["cursor"]);
        //https://api.twitter.com/2/timeline/profile/775280864674525184.json?tweet_mode=extended&count=20//已经够用了
        $tw_server_info["total_req_tweets"]++;
    }
    //echo $url . "\n";
    $tweets = tw_get_tweets($account_info["uid"], $account_info["cursor"], $csrfToken, $run_options["twitter"]["tweets_full"]);

    if (isset($tweets["errors"])) {
        echo "error: #{$tweets["errors"][0]["code"]} {$tweets["errors"][0]["message"]}\n";
        continue;
    }
    $tw_server_info["total_req_tweets"] = count($tweets["globalObjects"]["tweets"]);
    $singleAccountTweetsCount = 0;

    $cursor = "";
    foreach ($tweets["timeline"]["instructions"] as $first_instructions) {
        foreach ($first_instructions as $second_instructions => $second_instructions_value) {
            switch ($second_instructions) {
                //case "pinEntry":
                //    $pinned_id = $second_instructions_value["entry"]["content"]["item"]["content"]["tweet"]["id"];
                //    break;
                case "addEntries":
                    foreach ($second_instructions_value["entries"] as $third_entries_value) {
                        if (substr($third_entries_value["entryId"], 0, 10) == "cursor-top") {
                            $cursor = $third_entries_value["content"]["operation"]["cursor"]["value"];
                        }
                    }
                    break;
            }
        }
    }
    foreach ($tweets["globalObjects"]["tweets"] as $tweet => $content) {
        $in_sql = [
            "retweet_from" => "",//display_name
            "retweet_from_name" => "",//name
            "tweet_id" => 0,
            "uid" => 0,
            "name" => "",
            "display_name" => "",
            //即将删除
            "full_text" => "",

            "full_text_origin" => "",
            "time" => 0,
            "media" => 0,//v2中切为int类型(sql中tinyint)
            "video" => 0,//是否有视频
            "card" => "",//卡片类型, 留空则表示没有
            "poll" => 0,//是否有投票, 有投票必有卡片, 有卡片未必有投票

            //引用推文相关
            "quote_status" => 0,//是否引用其他推文

            //"geo" => o,//是否有地理坐标
            "source" => "",//来源
            "hidden" => $account_info["hidden"],

            //translate
            "translate" => "",
            "translate_source" => "",
        ];
        $tags = [];//不止tag, 还有cashtag urls 
        $media = [];//媒体
        $card = [];//卡片
        //$geo = [];//地理坐标
        
        //记录原始json
        if ($run_options["twitter"]["save_tweets_rawjson"]) {
            //$in_sql["origin_json"] = json_encode($content, JSON_UNESCAPED_UNICODE);
            //上面太麻烦了, 直接写到文件系统
            //检查文件夹是否存在
            //if (!file_exists(SYSTEM_ROOT . "/savetweets/{$month}")) {
            //    mkdir(SYSTEM_ROOT . "/savetweets/{$month}");
            //}
            file_put_contents(SYSTEM_ROOT . "/savetweets/{$content["id_str"]}.json", json_encode($content, JSON_UNESCAPED_UNICODE));
        }
        
        //判断是否本人发推
        if ($content["user_id_str"] == $account_info["uid"]) {
            //提前处理
            $in_sql["uid"] = $content["user_id_str"];
            $in_sql["tweet_id"] = $content["id_str"];
            $in_sql["time"] = strtotime($content["created_at"]);//提前处理时间
            //处理最终tweet_id
            if ($content["id_str"] > $max_tweetid && $account_info["last_cursor"] == "") {
                $max_tweetid = $content["id_str"];
            }
            //处理来源
            $in_sql["source"] = preg_replace('/<a[^>]+>(.*)<\/a>/', "$1", $content["source"]);
            
            //判断是否转推
            if (isset($content["retweeted_status_id_str"])) {
                $content = $tweets["globalObjects"]["tweets"][$content["retweeted_status_id_str"]];
                $in_sql["retweet_from"] = $tweets["globalObjects"]["users"][$content["user_id_str"]]["name"];
                $in_sql["retweet_from_name"] = $tweets["globalObjects"]["users"][$content["user_id_str"]]["screen_name"];
            }

            //真的有quote嘛
            //如果没用twitter会显示 "这条推文不可用。"
            //推文不可用不等于原推被删, 虽然真正的原因是什么我只能说我也不知道
            //群友说可能是被屏蔽了, 仅供参考
            $isReallyQuote =  (($content["is_quote_status"]??false) && isset($tweets["globalObjects"]["tweets"][$content["quoted_status_id_str"]]));

            //这逻辑是啥我看不懂了//重写//处理full_text
            $in_sql["full_text_origin"] = $content["full_text"];//原始全文

            //处理entities//包括图片//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
            foreach ($content["entities"] as $entities => $entities_) {
                foreach ($entities_ as $single_entities) {
                    $single_entitie_data = [];
                    switch ($entities) {
                        //以下四类使用同种方式
                        case "symbols"://这个貌似是根据上市代码搜索相关公司的推文//官方管这玩意作cashtag, 个人感觉除了把#换成$以外并没有什么区别
                        case "hashtags":
                        case "urls":
                        case "user_mentions":
                            $single_entitie_data = tw_entities($entities, $single_entities, $account_info["uid"], $in_sql["tweet_id"]);
                            $tags[$single_entitie_data["indices_start"]] = $single_entitie_data;
                            break;
                        case "media":
                            $in_sql["media"] = 1;//便于下面判断
                            break;
                    }
                }
            }

            //TODO 以下部分未来将丢弃

            ksort($tags);//重新排序
            
            //预处理是必要的
            $newText = '';//叠加文字
            $last_end = 0;

            //给卡片找源链接
            $cardUrl = (isset($content["card"]) && ($content["card"]["name"] == "app" || substr($content["card"]["name"] ?? "", 0, 7) == "summary")) ? $content["card"]["url"] : "";
            $quoteUrl = $isReallyQuote ? $content["quoted_status_permalink"]["url"] : "";
            $entitiesLength = count($tags);
            foreach ($tags as $entitiesOrder => $single_tag) {
                $addText = "";
                switch ($single_tag["type"]) {
                    case "hashtag":
                        $addText = "<a href=\"#/hashtag/{$single_tag["text"]}\" id=\"hashtag\">#{$single_tag["text"]}</a>";
                        break;
                    case "symbol":
                        $addText = "<a href=\"#/cashtag/{$single_tag["text"]}\" id=\"symbol\">\${$single_tag["text"]}</a>";
                        break;
                    case "user_mention":
                        $addText = "<a href=\"{$single_tag["expanded_url"]}\" id=\"user_mention\" target=\"_blank\">{$single_tag["text"]}</a>";
                        break;
                    case "url":
                        if ($cardUrl && $cardUrl == $single_tag["url"] && $entitiesOrder == ($entitiesLength - 1)) {
                            //处理卡片的url
                            $cardUrl = $single_tag["expanded_url"];
                        } elseif ($single_tag["url"] != $quoteUrl) {
                            //处理非卡片非引用
                            $addText = "<a href=\"{$single_tag["expanded_url"]}\" id=\"url\" target=\"_blank\">{$single_tag["text"]}</a>";
                        }
                        break;
                }
                $newText .= mb_substr($in_sql["full_text_origin"], $last_end, $single_tag["indices_start"] - $last_end, 'utf-8') . $addText;
                $last_end = $single_tag["indices_end"];
            }
            //处理最后的一段
            $newText .= mb_substr($in_sql["full_text_origin"], $last_end, mb_strlen($in_sql["full_text_origin"]), 'utf-8');

            //如果有媒体最后就会有一段类似于 https://t.co/123456 的短链接//有卡片同理
            $in_sql["full_text"] = nl2br(preg_replace('/ https:\/\/t.co\/[\w]+/', '', $newText));

            //处理media
            //来啊, 互相伤害啊
            if ($in_sql["media"]) {
                foreach ($content["extended_entities"]["media"] as $single_entities) {
                    $media = array_merge($media, tw_media($single_entities, $in_sql["uid"], $in_sql["tweet_id"], $in_sql["hidden"]));
                }
            }
            //处理quote
            //事实上"is_quote_status"为false的时候根本不会显示出来
            //需要处理上面full_text的一段//所以可能需要移到上面处理
            //quote不会显示card
            //若推文不存在不需要处理此处
            if ($isReallyQuote) {
                //从返回的数据里面重新抽出该条推文
                $quote_content = $tweets["globalObjects"]["tweets"][$content["quoted_status_id_str"]];//来吧
                $in_sql["quote_status"] = $content["quoted_status_id_str"];
                $in_sql_for_quote = [
                    "tweet_id" => $quote_content["id_str"],
                    "uid" => $quote_content["user_id_str"],
                    "name" => $tweets["globalObjects"]["users"][$quote_content["user_id_str"]]["screen_name"],
                    "display_name" => $tweets["globalObjects"]["users"][$quote_content["user_id_str"]]["name"],
                    "full_text" => $quote_content["full_text"],
                    "full_text_origin" => $quote_content["full_text"],
                    "time" => strtotime($quote_content["created_at"]),
                    "media" => 0,//v2中切为int类型(sql中tinyint)
                    "video" => 0,//是否有视频
                    //"hidden" => $account_info["hidden"]//本人认为此库数据不需要hidden
                ];

                //处理full_text的url
                if (isset($quote_content["entities"]["urls"]))
                foreach ($quote_content["entities"]["urls"] as $quote_entitie) {
                    $in_sql_for_quote["full_text"] = str_replace($quote_entitie["url"], "<a href=\"//{$quote_entitie["display_url"]}\" id=\"quote_url\" target=\"_blank\" style=\"color: black\">{$quote_entitie["display_url"]}</a>", $in_sql_for_quote["full_text"]);
                }
                $in_sql_for_quote["full_text"] = nl2br(preg_replace('/ https:\/\/t.co\/[\w]+/', '', $in_sql_for_quote["full_text"]));

                //处理媒体
                if (isset($quote_content["extended_entities"]["media"])) {
                    $in_sql_for_quote["media"] = 1;
                    foreach ($quote_content["extended_entities"]["media"] as $single_entities) {
                        $media = array_merge($media, tw_media($single_entities, $quote_content["user_id_str"], $quote_content["id_str"], false, "quote_status"));
                    }
                }
            }

            //处理card
            if ($run_options["twitter"]["tweets_full"] && isset($content["card"])) {
                $tmp_cardType = preg_replace("/[0-9]+:(.*)/", "$1", $content["card"]["name"]);
                $in_sql["card"] = $tmp_cardType;//任何时候都应该留下卡片类型, 不然等着头疼吧
                if (in_array($tmp_cardType, $tw_supportCardNameList)) {
                    //$in_sql["card"] = 1;
                    $cardInfo = tw_card($content["card"], $in_sql["uid"], $in_sql["tweet_id"], $in_sql["hidden"], $cardUrl, $tmp_cardType);
                    if (($cardInfo["data"]["poll"]??0) && ($cardInfo["data"]["polls"] ?? [])) {
                        $in_sql["poll"] = 1;
                    }
                    if ($cardInfo["media"]) {
                        //暂时不会处理//promo_image_convo比较麻烦
                        //if ($cardInfo["data"]["type"] == "promo_image_convo") {
                        //    $media = array_merge($media, $cardInfo["media"]);
                        //} else {
                            $media[] = $cardInfo["media"];
                        //}
                    }
                } else {
                    echo "未适配的卡片 {$content["card"]["name"]}\n";
                    //主动发现卡片
                    //新增加卡片的研究，不然最后麻烦的只有自己
                    kd_push("快来研究新的卡片\n #new_card #{$content["card"]["name"]} \nid: {$in_sql["tweet_id"]}\nhttps://twitter.com/i/status/{$in_sql["tweet_id"]}\n" . json_encode($content["card"]), $token, $push_to);//kdpush
                }
            }

            //处理其他
            $in_sql["name"] = $account_info["name"];
            $in_sql["display_name"] = $account_info["display_name"];

            //翻译
            //暂时用不上了
            //$in_sql["translate_source"] = '';
            //sssql
            //来人, 把这个置顶给老子干掉
            //丢弃策略必须重写19-6-18

            //丢弃策略重写, 非置顶均放行, 请自行处理重复问题, 内容锁运行正常

            //再次重写, 全部都检查, 只要重复就丢弃
            if ($account_info["last_cursor"] && count($sssql->load("v2_twitter_tweets", ["id"], [["tweet_id", "=", $in_sql["tweet_id"]]]))) {
                echo "已丢弃第" . ($singleAccountTweetsCount + 1) . "条->{$in_sql["tweet_id"]} (置顶推文)\n";
                $singleAccountTweetsCount++;
                $tw_server_info["total_throw_tweets"]++;
            } else {
                $tw_server_info["total_tweets"]++;
                $tmp_sql = "START TRANSACTION;";
                //v2_twitter_media
                foreach ($media as $single_media) {
                    //由于前面是无脑合并所以此处需要验证
                    if ($single_media["url"]??false) {
                        if (substr($single_media["origin_type"], -5) != "photo") {
                            if ($single_media["source"] == "quote_status") {
                                $in_sql_for_quote["video"] = 1;
                            } else {
                                $in_sql["video"] = 1;
                            }
                        }
                        $tw_server_info["total_media_count"]++;
                        $tmp_sql .= $sssql->insert("v2_twitter_media", $single_media, true);
                    }
                }
                //v2_twitter_entities
                foreach ($tags as $tag) {
                    $tmp_sql .= $sssql->insert("v2_twitter_entities", array_merge($tag, ["hidden" => $in_sql["hidden"]]), true);
                }
                //v2_twitter_polls
                if ($in_sql["poll"]) {
                    foreach ($cardInfo["data"]["polls"] as $in_sql_poll) {
                        $tmp_sql .= $sssql->insert("v2_twitter_polls", array_merge($in_sql_poll, ["origin_tweet_id" => $content["id_str"]]), true);
                    }
                }
                //v2_twitter_cards
                if ($in_sql["card"] && !$in_sql["poll"]) {
                    $tmp_sql .= $sssql->insert("v2_twitter_cards", $cardInfo["data"], true);
                }
                //v2_twitter_quote
                if ($isReallyQuote) {
                    $tmp_sql .= $sssql->insert("v2_twitter_quote", $in_sql_for_quote, true);
                }
                //v2_twitter_tweets
                $tmp_sql .= $sssql->insert("v2_twitter_tweets", $in_sql, true);
                $sssql->multi($tmp_sql . "COMMIT;");
                echo "已处理第" . ($singleAccountTweetsCount + 1) . "条->{$in_sql["tweet_id"]}\n";
                $singleAccountTweetsCount++;
            }
        } else {
            $tw_server_info["total_throw_tweets"]++;
            echo "已丢弃->{$content["id_str"]} (非对应账号)\n";
        }
    }
    //一个号解决
    //差点整死我
    //echo $cursor . "\n";
    if ($max_tweetid !== 0 && $cursor) {
        $sssql->update("v2_account_info", ["last_cursor" => $max_tweetid, "cursor" => $cursor, "new" => 1], [["uid", "=", $account_info["uid"]]]);
    } elseif ($cursor) {
        $sssql->update("v2_account_info", ["cursor" => $cursor, "new" => 1], [["uid", "=", $account_info["uid"]]]);
    }
}
$tw_server_info["total_time_cost"] = microtime(true) - $tw_server_info["microtime"];
//v2_server_info
if ($run_options["twitter"]["local_data"]) {
    $sssql->insert("v2_server_info", $tw_server_info);
}
