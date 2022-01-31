<?php
/*
 * twitter monitor v2
 * @banka2017 && NEST.MOE
 */
require(dirname(__FILE__) . '/init.php');
//所有中文化的标准https://abs.twimg.com/responsive-web/web/i18n-rweb/zh.95401bf4.js

//关闭
if (!$run_options["twitter"]["userinfo"]) {
    die("Twitter Monitor: 未启动\n");
}
//创建连接
$sssql = new ssql($servername,$username,$password,$dbname);
$fetch = new Tmv2\Fetch\Fetch();
//rate-limit是靠csrf token判断的, 需要定期刷新csrf token
//获取csrf token
$get_token = $fetch->tw_get_token();
$tw_server_info["total_req_times"]++;
if(!$get_token[0]){
    kd_push("Twitter Monitor: 无法获取 token #noToken");//KDpush
    die("Twitter Monitor: 无法获取 token #noToken\n");
}
//$account_info = json_decode(file_get_contents(SYSTEM_ROOT . '/account_info.json'), true);

$config = json_decode(file_get_contents(SYSTEM_ROOT . '/config.json'), true);//原始配置文件
$configInMysql = $sssql->select("v2_config", ["id", "data_origin", "data_output", "md5", "timestamp"], [["id", "=", $config_id]], [], 1);

//需要更新的用户的信息
$name_count = [];

//是否需要用户数据
$update_names = false;

//用户统计
$userinfoReqCount = 0;

//出错推送内容
$userInfoErrorsForPush = "";

//处理能够刷新列表
$refreshList = [];
$refreshIdList = [];
foreach ($config["users"] as $account_s => $account) {
    //呐呐呐[ (Auto break| Auto break (@nenene) -- User is not exist|)]
    if (!strlen($account["name"]) || ($account["deleted"] ?? false) || ($account["locked"] ?? false)) {
        //跳过已删号或不存在账户或已锁定
        echo $account["display_name"] . " Auto break\n";
        continue;
    }
    $refreshList[$account_s] = $account;
    $refreshIdList[$account_s] = $account['uid']??$account['name']??0;
}
$allInfoForAccount = $fetch->tw_get_userinfo($refreshIdList, $get_token, false);//TODO $run_options["twitter"]["graphql_mode"]);
$realAccountOrder = 0;
foreach ($refreshList as $account_s => $account) {
    echo $account["display_name"];

    //一般不需要使用
    //此处限制是 1000req/15min //此处亦可使用user_id={$uid}//已支持自动切换
    //if ($userinfoReqCount > 999) {
    //    $get_token = $fetch->tw_get_token();
    //    $tw_server_info["total_req_times"]++;
    //    if(!count($get_token)){
    //        kd_push("Twitter Monitor: 无法获取 token #noToken");//KDpush
    //        die("Twitter Monitor: 无法获取 token #noToken\n");
    //    }
    //    $userinfoReqCount = 0;
    //}
    $user_info = $allInfoForAccount[$realAccountOrder];
    $realAccountOrder++;
    $tw_server_info["total_req_times"]++;
    //$userinfoReqCount++;

    //处理特殊警告
    //"profile_interstitial_type": "sensitive_media",//这是其一, 另外几个用空再找


    //处理删号
    if (isset($user_info["errors"]) || path_to_array("user_info_legacy", $user_info)["protected"]) {
        echo "Auto break ({$account["name"]}) -- {$user_info["errors"][0]["message"]}\n";
        $update_names = true;
        if (path_to_array("user_info_legacy", $user_info)["protected"]??false) {
            //protect 用于本地隐藏
            $config["users"][$account_s]["locked"] = true;
            $sssql->update("v2_account_info", ["locked" => 1], [["name", "=", $account["name"]]]);
            kd_push($account["name"] . "已保护账户 #locked");//KDpush
        } elseif ($user_info["errors"][0]["code"] === 50 || $user_info["errors"][0]["code"] === 63) {
            //deleted 用于在twitter删除帐户的用户 #50
            //suspended 用于被封禁帐户的用户 #63
            $config["users"][$account_s]["deleted"] = true;
            $sssql->update("v2_account_info", ["deleted" => 1], [["name", "=", $account["name"]]]);
            kd_push($account["name"] . "已删除账户 #deleted");//KDpush
        } else {
            $accountErrorCount = isset($config["users"][$account_s]["error_count"]) ? $config["users"][$account_s]["error_count"]++ : 1;
            $tw_server_info["total_errors_count"]++;
            $userInfoErrorsForPush .= $account["name"] . "查询出错 {$user_info["errors"][0]["message"]} %{$accountErrorCount} #error {$user_info["errors"][0]["code"]}\n";
            $sssql->insert("v2_error_log", ["uid" => ($account["uid"]??0), "name" => $account["name"], "code" => $user_info["errors"][0]["code"], "message" => $user_info["errors"][0]["message"], "timestamp" => time()]);
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

    $generateData = (new Tmv2\Info\Info($user_info))->importFromAccountInfo($account)->generateMonitorData();

    //legacy userinfo
    //$user_info_id_str = $generateData->account_data_id_str;
    $user_info = $generateData->in_sql_info;

    if (!$user_info["uid"]) {
        $userInfoErrorsForPush .= $account["name"] . "出现数据错误 #account_info";//KDpush
        continue;
    }

    if ($generateData->update) {
        $update_names = true;
    }
    //处理uid
    if (($account["uid"]??0) != $user_info["uid"]) {
        $update_names = true;
        $config["users"][$account_s]["uid"] = (string)$user_info["uid"];
    }

    //处理id
    //一般人都不会改名, 但是谁知道会不会真遇上呢
    if ($user_info["name"] && $account["name"] != $user_info["name"]) {
        $update_names = true;
        $config["users"][$account_s]["name"] = $user_info["name"];
    }

    //处理display_name
    //警告: 若取消注释则会强制同步display_name为该账户的twitter名称且无法使用自定义display_name
    //if ($user_info["name"] && $account["display_name"] != $user_info["name"]) {
    //    $update_names = true;
    //    $config["users"][$account_s]["display_name"] = $user_info["name"];
    //}

    //使用uid或名字检查
    $verify_info = $sssql->load("v2_account_info", ["uid", "name", "display_name", "header", "banner", "description_origin", "top", "statuses_count", "hidden", "locked", "deleted", "new", "cursor", "last_cursor"], [["uid", "=", $user_info["uid"]]]);
    //由于早期设计失误, new字段0时为新帐号, 为1时是完成首次爬取的帐号

    //TODO 一万倍数检测
    //monitor data
    //同时满足时才会插入监控项目
    if($run_options["twitter"]["count_data_user"] && !($account["not_analytics"]??false)){
        //处理数据
        $monitor_data_info = $generateData->monitor_data_info;
        $sssql->insert("twitter_data", $monitor_data_info);
        //临时表, 用于stats
        $monitor_data_info["visible"] = (int)!($user_info["hidden"] || $user_info["locked"] || $user_info["deleted"] || $user_info["organization"]);
        $sssql->insert("tmp_twitter_data", $monitor_data_info, false, $monitor_data_info);
    }elseif (($account["not_analytics"]??false)) {
        echo " - 不统计";
    } else {
        kd_push($account["name"] . "出现数据错误 #twitter_data");//KDpush
    }

    //处理用户
    if (!count($verify_info)) {
        //完全没记录
        echo " - 插入新记录\n";
        $name_count[] = [
            "name" => $user_info["name"],
            "display_name" => $user_info["display_name"],
            "last_cursor" => 0,
            "cursor" => "",
            "uid" => $user_info["uid"],
            "pinned" => $user_info["top"],
            "hidden" => $user_info["hidden"]
        ];
        //肯定有你
        $sssql->insert("v2_account_info", $user_info);
    } else {
        echo " - 刷新记录";

        $verify_info[0]["top"] = (string)$verify_info[0]["top"];
        if ($verify_info[0]["new"] == '1' && $generateData->verifyData(array_slice($verify_info[0], 0, 11))) {

            echo " - 需要更新";
            $name_count[] = [
                "name" => $user_info["name"],
                "display_name" => $user_info["display_name"],
                "last_cursor" => $verify_info[0]["last_cursor"],
                "cursor" => $verify_info[0]["cursor"],//锁死token
                "uid" => $verify_info[0]["uid"],
                "pinned" => $user_info["top"],
                "hidden" => $user_info["hidden"],
            ];
            //就是你了
        } else {
            echo " - 锁定中";
        }
        echo "\n";
        $sssql->update("v2_account_info", $user_info, [["uid", "=", $user_info["uid"]]]);
    }
}

if ($userInfoErrorsForPush !== "") {
    kd_push($userInfoErrorsForPush);//KDpush
}


//处理本地配置文件
if ($update_names) {
    $config_json_encode = json_encode($config, JSON_UNESCAPED_UNICODE);
    file_put_contents(SYSTEM_ROOT . '/config.json', $config_json_encode);
    //转换文件
    $config_sql_md5 = count($configInMysql) === 1 ? $configInMysql[0]["md5"] : "0";//is_file(SYSTEM_ROOT . '/account_info_t.json') ? json_decode(file_get_contents(SYSTEM_ROOT . '/account_info_t.json'), true) : ["hash" => 0];//运行文件
    $config_md5 = md5($config_json_encode);
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
        //TODO reUse NSFW list
        //nsfwList
        $newAccountInfo["nsfwList"] = $config["nsfwList"];
        //links
        $newAccountInfo["links"] = $config["links"];
        //hash
        $newAccountInfo["hash"] = $config_md5;
        $config_data = ["id" => $config_id, "data_origin" => $config_json_encode, "data_output" => json_encode($newAccountInfo, JSON_UNESCAPED_UNICODE), "md5" => $config_md5, "timestamp" => time()];
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
$start_time = time();
foreach ($name_count as $account_info) {
    //每人一份
    $insert = [
        "v2_twitter_media" => [],
        "v2_twitter_entities" => [],
        "v2_twitter_polls" => [],
        "v2_twitter_cards" => [],
        "v2_twitter_card_app" => [],
        "v2_twitter_quote" => [],
        "v2_twitter_tweets" => [],
    ];
    //自动暂停

    //x-rate-limit-limit: 180
    //x-rate-limit-remaining: 179
    //x-rate-limit-reset: 1567401449
    //请求限制改成了180

    //这个rate-limit是靠csrf token判断的, 后面那堆吐槽不用看了//你以为真的是180？骗你的, 只要暂停请求又是新一轮180//但还是开着吧,谁知道会有什么影响呢//要取消限制只需要将下行的 99 改成大的数字即可

    //更多关于请求限制的信息请参阅 https://developer.twitter.com/en/docs/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
    //太长不看: 180req/15min
    if (($tw_server_info["total_req_tweets"] && $tw_server_info["total_req_tweets"] % 180 == 0) && time() <= $start_time+900) {
        //15分钟
        $sleep_time = ($start_time+900-time());
        $get_token = $fetch->tw_get_token();
        $tw_server_info["total_req_times"]++;
        if(!$get_token[0]){
            kd_push("Twitter Monitor: 无法获取 token #noToken");//KDpush
            die("Twitter Monitor: 无法获取 token #noToken\n");
        }
        echo "system: 请求超限, 刷新token->{$get_token[1]}\n";
        $start_time = time();
    }

    echo "正在处理{$account_info["display_name"]}\n";
    if (!$account_info["last_cursor"]) {
        echo "全新抓取{$account_info["display_name"]}\n";
    }
    $tw_server_info["total_req_tweets"]++;
    $tweets = $fetch->tw_get_tweets($account_info["uid"], $account_info["cursor"], $get_token, false, false, $run_options["twitter"]["graphql_mode"]);
    $generateTweetData = new Tmv2\Core\Core($tweets, $run_options["twitter"]["graphql_mode"], [], $account_info["hidden"]);


    if ($generateTweetData->errors[0] !== 0) {
        echo "error: #{$generateTweetData->errors[0]} {$generateTweetData->errors[1]}\n";
        continue;
    }

    $tw_server_info["total_req_tweets"] = $generateTweetData->globalObjectsLength - ($generateTweetData->isGraphql ? 2 : 0);
    $singleAccountTweetsCount = 0;
    $cursor = $generateTweetData->cursor["top"];
    echo "cursor: --> $cursor <-- (" . count($generateTweetData->contents) . ")\n";
    foreach ($generateTweetData->contents as $order => $content) {
        //判断非推文//graphql only
        if ($generateTweetData->isGraphql && $content["content"]["entryType"] != "TimelineTimelineItem") {
            continue;
        }

        //记录原始json
        if ($run_options["twitter"]["save_tweets_rawjson"]) {
            //$in_sql["origin_json"] = json_encode($content, JSON_UNESCAPED_UNICODE);
            //上面太麻烦了, 直接写到文件系统
            //检查文件夹是否存在
            //if (!file_exists(SYSTEM_ROOT . "/savetweets/{$month}")) {
            //    mkdir(SYSTEM_ROOT . "/savetweets/{$month}");
            //}
            saveTo(SYSTEM_ROOT . "/savetweets/" . path_to_array("tweet_id", $content) . ".json", $content);
        }



        //判断是否本人发推
        if (path_to_array("tweet_uid", ($generateTweetData->isGraphql ? path_to_array("tweet_content", $content) : $content)) == $account_info["uid"]) {
            //generateData
            $generateTweetData->generateTweetObject($content);
            //in_sql_tweets
            $in_sql = $generateTweetData->in_sql_tweet;
            //card
            if ($in_sql["card"] && !$generateTweetData->cardMessage["supported"]) {
                //主动发现卡片
                //新增加卡片的研究，不然最后麻烦的只有自己
                echo "未适配的卡片 {$generateTweetData->cardMessage["card_name"]}\n";
                kd_push($generateTweetData->cardMessage["message"]);//kdpush
            }
            //翻译
            //暂时用不上了
            //$in_sql["translate_source"] = '';
            //sssql
            //来人, 把这个置顶给老子干掉
            //丢弃策略必须重写19-6-18

            //丢弃策略重写, 非置顶均放行, 请自行处理重复问题, 内容锁运行正常

            //再次重写, 全部都检查, 只要重复就丢弃
            if ($account_info["last_cursor"] && count($sssql->load("v2_twitter_tweets", ["id"], [["tweet_id", "=", $in_sql["tweet_id"]]]))) {
                echo "已丢弃第" . ($singleAccountTweetsCount + 1) . "条->{$in_sql["tweet_id"]} (重复推文)\n";
                $singleAccountTweetsCount++;
                $tw_server_info["total_throw_tweets"]++;
            } else {
                $tw_server_info["total_tweets"]++;
                //v2_twitter_media
                if (count($generateTweetData->media)) {
                    foreach ($generateTweetData->media as $single_media) {
                        //由于前面是无脑合并所以此处需要验证
                        if ($single_media["url"]??false) {
                            if (!str_ends_with($single_media["origin_type"], "photo")) {
                                if ($single_media["source"] == "quote_status") {
                                    $generateTweetData->quote["video"] = 1;
                                } else {
                                    $in_sql["video"] = 1;
                                }
                            }
                            $tw_server_info["total_media_count"]++;
                        }
                    }
                    $insert["v2_twitter_media"] = array_merge($insert["v2_twitter_media"], $generateTweetData->media);
                }
                //v2_twitter_entities
                foreach ($generateTweetData->tags as $tag) {
                    $insert["v2_twitter_entities"][] = array_merge($tag, ["hidden" => $in_sql["hidden"], "timestamp" => $in_sql["time"]]);
                }
                //v2_twitter_polls
                if ($in_sql["poll"]) {
                    foreach ($generateTweetData->polls as $in_sql_poll) {
                        $insert["v2_twitter_polls"][] = array_merge($in_sql_poll, ["origin_tweet_id" => $in_sql["origin_tweet_id"]]);
                    }
                }
                //v2_twitter_cards
                if ($in_sql["card"] && !$in_sql["poll"]) {
                    $insert["v2_twitter_cards"][] = $generateTweetData->card;
                    if ($generateTweetData->cardApp) {
                        $insert["v2_twitter_card_app"] = array_merge($insert["v2_twitter_card_app"], $generateTweetData->cardApp);
                    }
                }
                //v2_twitter_quote
                if ($generateTweetData->isQuote) {
                    $insert["v2_twitter_quote"][] = $generateTweetData->quote;
                }
                //v2_twitter_tweets
                $insert["v2_twitter_tweets"][] = $in_sql;
                $generateTweetData->resetAll();
                echo "已处理第" . ($singleAccountTweetsCount + 1) . "条->{$in_sql["tweet_id"]}\n";
                $singleAccountTweetsCount++;
            }
        } else {
            $tw_server_info["total_throw_tweets"]++;
            echo "已丢弃->" . path_to_array("tweet_id", $content) . " (非对应账号)\n";
        }

        //resetAll
        $generateTweetData->resetAll();
        $generateTweetData->setup();
    }
    $tmp_sql = "START TRANSACTION;";
    foreach ($insert as $tableName => $insertItem) {
        $tmp_sql .= $sssql->insert($tableName, array_map(function($n) {ksort($n);return $n;}, $insertItem), true, [], true);
    }
    $sssql->multi($tmp_sql . "COMMIT;");
    //一个号解决
    //差点整死我
    //echo $cursor . "\n";
    if ($generateTweetData->max_tweetid != "0" && $cursor) {
        $sssql->update("v2_account_info", ["last_cursor" => $generateTweetData->max_tweetid, "cursor" => $cursor, "new" => 1], [["uid", "=", $account_info["uid"]]]);
    } elseif ($cursor) {
        $sssql->update("v2_account_info", ["cursor" => $cursor, "new" => 1], [["uid", "=", $account_info["uid"]]]);
    }
}
$tw_server_info["total_time_cost"] = microtime(true) - $tw_server_info["microtime"];
echo "system: cost {$tw_server_info["total_time_cost"]}s\n";
//v2_server_info
if ($run_options["twitter"]["local_data"]) {
    $sssql->insert("v2_server_info", $tw_server_info);
}