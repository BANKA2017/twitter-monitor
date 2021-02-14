<?php
/*
 * twitter monitor v2 api
 * @banka2017 && KDNETWORK
 */
//ini_set('display_errors',1);
//header("Access-Control-Allow-Origin: *");

ob_implicit_flush();
require(dirname(__FILE__) . '/init.php');

//json
$ReturnJson = [
    "code" => 403,
    "message" => "Forbidden request",
    "data" => [],
    "query" => $_SERVER["QUERY_STRING"],
    "version" => "v2",
];

//svg
$ReturnSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>';


//创建连接
$sssql = new ssql($servername,$username,$password,$dbname);

$config_data = $sssql->load("v2_config", ["data_origin", "data_output"], [["id", "=", $config_id]], [], 1);
if (count($config_data) === 0) {
    $ReturnJson["code"] = 404;
    $ReturnJson["message"] = "No Record Found";
    header("content-type: text/json");
    die(json_encode($ReturnJson, JSON_UNESCAPED_UNICODE));//request nothing
}
$config = json_decode($config_data[0]["data_origin"], true);

//formatted
//TODO 为rssMode解耦
function returnDataForTweets (array $tweets = [], int $count = 0, string $top = "0", bool $historyMode = false, bool $rssMode = false, bool $noUserName = false): array {
    $real_count = count($tweets);
    $hasmore = ($real_count == $count);
    if($hasmore){
        array_pop($tweets);//清除多余的内容
        $real_count -= 1;
    }
    $check_new_tweet_id = 0;
    $tweet_id = 0;
    if($real_count){
        $check_new_tweet_id = $tweets[(($top == $tweets[0]["tweet_id"]) && count($tweets) > 1) ? 1 : 0]["tweet_id"];
    }
    if ($rssMode) {
        //For rss mode
        $rss = new \Tmv2\Rss\Rss();
        $rss->channel([
            "title" => ["text" => ($noUserName ? "Twitter Monitor Timeline" : "{$tweets[0]["display_name"]} 的 Twitter"), "cdata" => true],
            "link" => ["text" => ($noUserName ? "https://twitter.com" : "https://twitter.com/{$tweets[0]["name"]}/"), "cdata" => false],
            "description" => ["text" => "todo", "cdata" => false],//TODO
            "generator" => ["text" => "Twitter Monitor", "cdata" => false],
            "webMaster" => ["text" => "KDNETWORK", "cdata" => false],
            "language" => ["text" => "zh-cn", "cdata" => false],//multi-user?
            "lastBuildDate" => ["text" => date("D, d M Y H:i:s O"), "cdata" => false],
            "ttl" => ["text" => 60, "cdata" => false],
        ]);
    }
    for ($x = 0; $x < $real_count; $x++) {
        //$tweets[$x]["translate"] = "";
        //$tweets[$x]["translate_source"] = "";
        $tweets[$x]["type"] = "tweet";
        if ($historyMode) {
            //处理history模式
            $tweets[$x]["entities"] = $GLOBALS['sssql']->load("v2_twitter_entities", ["type", "text", "expanded_url", "indices_start", "indices_end"], [["tweet_id", "=", $tweets[$x]["tweet_id"]]])??[];
        }
        //$tweets[$x]["full_text_origin"] = preg_replace('/ https:\/\/t.co\/[\w]+/', '', $tweets[$x]["full_text_origin"]);//TODO for history mode
        //处理投票
        if ($tweets[$x]["poll"]) {
            $tweets[$x]["pollObject"] = $GLOBALS['sssql']->load("v2_twitter_polls", ["choice_label", "poll_order", "end_datetime", "count", "checked"], [["tweet_id", "=", $tweets[$x]["tweet_id"]]])??[];
        }
        //处理卡片
        $tweets[$x]["cardObject"] = [];
        if ($tweets[$x]["card"]) {
            $tweets[$x]["cardObject"] = $GLOBALS['sssql']->load("v2_twitter_cards", ["title", "description", "vanity_url", "type", "secondly_type", "url", "media", "unified_card_app"], [["tweet_id", "=", $tweets[$x]["tweet_id"]]])[0]??[];
            $tweets[$x]["cardObject"]["unified_card_app"] = (bool)$tweets[$x]["cardObject"]["unified_card_app"];
            if ($tweets[$x]["cardObject"]["unified_card_app"]) {
                $tweets[$x]["cardObject"]["app"] = $GLOBALS['sssql']->load("v2_twitter_card_app", ["unified_card_type", "type", "appid", "country_code", "title", "category"], [["tweet_id", "=", $tweets[$x]["tweet_id"]]]);
            }
        }
        //处理引用
        $tweets[$x]["quoteObject"] = [];
        if ($tweets[$x]["quote_status"]) {
            $tweets[$x]["quoteObject"] = $GLOBALS['sssql']->load("v2_twitter_quote", ["tweet_id", "name", "display_name", "full_text", "time", "media", "video"], [["tweet_id", "=", $tweets[$x]["quote_status"]]])[0]??[];
        }
        $tmpImageText = "";
        //寻找媒体
        $tweets[$x]["mediaObject"] = ["tweetsMedia" => [], "quoteMedia" => [], "cardMedia" => []];
        if ($tweets[$x]["media"] || ($tweets[$x]["cardObject"]["media"]??0) || ($tweets[$x]["quoteObject"]["media"]??0)) {
            $queryMediaSql = $GLOBALS['sssql']->load("v2_twitter_media", ["tweet_id", "uid", "cover", "url", "extension", "filename", "origin_type", "source", "content_type", "origin_info_height", "origin_info_width"], isset($tweets[$x]["quoteObject"]["tweet_id"]) ? [["tweet_id", "=", $tweets[$x]["tweet_id"], "OR"], ["tweet_id", "=", $tweets[$x]["quoteObject"]["tweet_id"], "OR"], ["source", "!=", "cover"]] : [["tweet_id", "=", $tweets[$x]["tweet_id"]], ["source", "!=", "cover"]]);
            foreach ($queryMediaSql as $queryMedia_single) {
                $queryMedia_single["cover"] = str_replace(["http://", "https://"], "", $queryMedia_single["cover"]);
                $queryMedia_single["url"] = str_replace(["http://", "https://"], "", $queryMedia_single["url"]);
                switch ($queryMedia_single["source"]) {
                    case "tweets":
                        //不符合的直接丢弃
                        if ($queryMedia_single["tweet_id"] == $tweets[$x]["tweet_id"]) {
                            $tweets[$x]["mediaObject"]["tweetsMedia"][] = $queryMedia_single;
                            $tmpImageText .= '<img src="https://pbs.twimg.com/media/' . $queryMedia_single["filename"] . '?format=' . $queryMedia_single["extension"] . '&name=orig">';
                        }
                        break;
                    case "cards":
                        $tweets[$x]["mediaObject"]["cardMedia"][] = $queryMedia_single;
                        break;
                    case "quote_status":
                        $tweets[$x]["mediaObject"]["quoteMedia"][] = $queryMedia_single;
                        break;
                }
            }
        }
        //foreach($tweets[$x]["media"] as $single_media){
        //    if($single_media["origin"]["origin_type"] != "photo"){
        //        if($single_media["origin"]["origin_type"] == "animated_gif"){
        //            $tweets[$x]["hasgif"] = true;
        //        }
        //        $tweets[$x]["hasvideo"] = true;
        //        break;
        //    }
        //}
        //$tweets[$x]["time"] = date('Y-n-j G:i:s', $tweets[$x]["time"]);
        //$tweets[$x]["pinned"] = false;
        //$tweets[$x]["full_text_origin"] = preg_replace('/https:\/\/t.co\/[\w]+/', '', $tweets[$x]["full_text_origin"]);
        $tweet_id = $tweets[$x]["tweet_id"];//底部tweetid
        if ($rssMode) {
            $rss->item([
                "title" => ["text" => "{$tweets[$x]["full_text_origin"]}", "cdata" => true], //TODO mb_substr($tweets[$x]["full_text_origin"]),
                "description" => ["text" => htmlspecialchars_decode(str_replace("<br /> ", "<br>", preg_replace('/<a href="([^"]+)" id="([^"]+)"(| target="_blank")>([^<]+)<\/a>/', ("$2" === "url" ? "$1" : "$4"), $tweets[$x]["full_text"])) . $tmpImageText), "cdata" => true],
                "pubDate" => ["text" => date("D, d M Y H:i:s O", $tweets[$x]["time"]), "cdata" => false],
                "link" => ["text" => "https://twitter.com/{$tweets[$x]["name"]}/status/{$tweets[$x]["tweet_id"]}", "cdata" => false],
                "author" => ["text" => "{$tweets[$x]["display_name"]}", "cdata" => true],
            ]);
        }
    }
    if ($rssMode) {
        //生成即完成
        header("content-type: text/xml");
        die($rss->build());
    }
    return ["tweets" => $tweets, "bottom_tweet_id" => $tweet_id, "top_tweet_id" => $check_new_tweet_id, "hasmore" => $hasmore];
}

//switch media or json
$mode = $_GET["mode"]??"error";
$type = $_GET["type"]??"error";

switch ($mode) {
    case "media":
        //picture or video=>gif or real video
        //avatar or banner or tweets
        // /media/(userinfo|tweets)/{$url}[:(large|medium|small|thumb|tiny|orig)] =>
        // /?mode=media&type=userinfo&size=[large|medium|small|thumb|tiny|orig]&link=pbs.twimg.com/media/EOK6I2FUYAE3ACx.jpg
        // 包括下面mp4都有类似的操作
        //关于图片的问题清参阅https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
        
        //Legacy format
        //<base_url>.<format>:<name>
        //For example:
        //https://pbs.twimg.com/media/DOhM30VVwAEpIHq.jpg:large

        //Modern format	
        //The modern format for loading photos was established at Twitter in 2015 and has been defacto since 2017.  All photo media loads should move to this format.
        //<base_url>?format=<format>&name=<name>
        //For example:
        //https://pbs.twimg.com/media/DOhM30VVwAEpIHq?format=jpg&name=large

        $mediaLinkArray = tw_pathinfo($_GET["link"]??"");//处理链接
        if (isset($_GET["format"]) && isset($_GET["name"])) {
            $mediaLinkArray["size"] = $_GET["name"];
            $mediaLinkArray["extension"] = $_GET["format"];
            $mediaLinkArray["basename"] .= "." . $_GET["format"];
        }
        //$mediaSize = $mediaLinkArray["size"]??":medium";
        if(!$mediaLinkArray["filename"]){
            header("content-type: image/svg+xml");
            echo $ReturnSvg;
        }else{
            switch ($mediaLinkArray["extension"]) {
                case "banner": 
                    if(count($sssql->load("v2_account_info", ["id"], [["banner", "=", $mediaLinkArray["filename"]]]))) {
                        header("content-type: image/jpeg");
                        header("Content-Disposition:attachment;filename=banner.jpg");
                        echo (new sscurl("https://{$mediaLinkArray["dirname"]}/{$mediaLinkArray["filename"]}"))->addMore([CURLOPT_TIMEOUT => 999])->addMore([CURLOPT_RETURNTRANSFER => false]);
                    } else {
                        header("content-type: image/svg+xml");
                        echo $ReturnSvg;
                    }
                    break;
                case "jpg": 
                case "png":
                case "mp4":
                    //TODO 此处可能需要修改
                    if(($type == "userinfo" && count($sssql->load("v2_account_info", ["id"], [["header", "=", "https://" . str_replace('_bigger', '', $_GET["link"])]]))) || count($sssql->load("v2_twitter_media", ["id"], [["basename", "=", $mediaLinkArray["basename"]]], [], 1))) {

                        //TODO 下面是一些暂时无法解决的想法, 可能需要到v3解决
                        ////获取长度
                        ////die("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? ":{$mediaLinkArray["size"]}" : $mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : ""));
                        //$tmpLength = (new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? ":{$mediaLinkArray["size"]}" : $mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : "")))->returnBody(2);
                        ////如果喜提空白//一般为卡片
                        //preg_match("/Content-Length: ([0-9]+)/i", $tmpLength, $tmpLength);
                        //if (!$tmpLength[1]) {
                        //    $tmpAutoUpdateCardImageData = tw_card(tw_get_conversation($sssql->load("v2_twitter_media", ["tweet_id"], [["basename", "=", $mediaLinkArray["basename"]]], [], 1)[0]["tweet_id"])["card"], 0, 0)["media"];
                        //    //回写
                        //    echo $sssql->update("v2_twitter_media", ["cover"=> $tmpAutoUpdateCardImageData["cover"], "url"=> $tmpAutoUpdateCardImageData["url"], "origin_info_width"=> $tmpAutoUpdateCardImageData["origin_info_width"], "origin_info_height"=> $tmpAutoUpdateCardImageData["origin_info_height"], "filename"=> $tmpAutoUpdateCardImageData["filename"], "basename"=> $tmpAutoUpdateCardImageData["basename"], "extension"=> $tmpAutoUpdateCardImageData["extension"], "content_type"=> $tmpAutoUpdateCardImageData["content_type"],], [["basename", "=", $mediaLinkArray["basename"]]]);
                        //    die();
                        //}
                        //die();
                        //header("content-type: " . get_mime($mediaLinkArray["extension"]));
                        //header("Content-Disposition:attachment;filename=file." . $mediaLinkArray["extension"]);
                        //header("Content-Length: {$tmpLength[1]}");
                        //header("Accept-Ranges: bytes");

                        //最后都用上了//处理拖动进度条的问题//仅mp4
                        //咕完了//咕咕咕
                        //获取长度
                        $tmpLength = (new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? ":{$mediaLinkArray["size"]}" : $mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : "")))->returnBody(2);
                        preg_match("/Content-Length: ([0-9]+)/i", $tmpLength, $tmpLength);
                        header("Content-Length: {$tmpLength[1]}");
                        header("Accept-Ranges: bytes");
                        if ($tmpLength[1] == 0) {
                            header("content-type: image/svg+xml");
                            echo $ReturnSvg;
                        } else {
                            //video or gif or image
                            //在twitter中gif会被转换为mp4
                            header("content-type: " . get_mime($mediaLinkArray["extension"]));
                            header("Content-Disposition:attachment;filename=file." . $mediaLinkArray["extension"]);
                            echo (new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? ":{$mediaLinkArray["size"]}" : $mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : "")))->addMore([CURLOPT_TIMEOUT => 999])->addMore([CURLOPT_RETURNTRANSFER => false]);//mp4不会删//use CURLOPT_RETURNTRANSFER to stdout
                        }
                    } else {
                        header("content-type: image/svg+xml");
                        echo $ReturnSvg;
                    }
                    break;
                default: 
                    header("content-type: image/svg+xml");
                    echo $ReturnSvg;
            }
        }
        break;
    case "data":
        //v2api for twitter monitor
        $name = $_GET["name"]??'';
        $uid = is_numeric($_GET["uid"]??false)? $_GET["uid"] :0;
        $rssMode = ($_GET["format"]??"json") == "rss";
        if (!$uid) {// 若uid不存在查找用户
            foreach ($config["users"] as $userInfo) {
                if (strtolower($userInfo["name"]??"") === strtolower($name)) {
                    $uid = $userInfo["uid"]??0;
                }
            }
        } else {// 若uid存在确认用户是否存在
            $tmp_uid = $uid;
            $uid = 0;
            foreach ($config["users"] as $userInfo) {
                if ($userInfo["uid"]??0 == $tmp_uid) {
                    $uid = $tmp_uid;
                }
            }
        }
        
        switch ($type) {
            case "userinfo":
                // /data/userinfo/?name={$username} etc.
                // /?mode=data&type=userinfo&name=bang_dream_info
                // /?mode=data&type=userinfo&uid=3009772568
                
                $baseInfo = $sssql->load("v2_account_info", ["uid", "name", "display_name", "header", "banner", "following", "followers", "description", "statuses_count", "top", "locked", "deleted", "verified"], [["uid", "=", $uid]], [], 1);
                if(!count($baseInfo)){
                    $ReturnJson["code"] = 404;
                    $ReturnJson["message"] = "No Record Found";
                }else{
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = $baseInfo[0];
                    $ReturnJson["data"]["description"] = nl2br($ReturnJson["data"]["description"]);//nl2br(preg_replace("/ #([^\s]+)/", ' <a href="#/hashtag/$1" id="hashtag_profile">#$1</a>', $ReturnJson["data"]["description"]));//处理个人简介中的hashtag
                    $ReturnJson["data"]["top"] = $ReturnJson["data"]["top"] ?: 0;
                    $ReturnJson["data"]["deleted"] = (int)$ReturnJson["data"]["deleted"];
                    $ReturnJson["data"]["locked"] = (int)$ReturnJson["data"]["locked"];
                    $ReturnJson["data"]["verified"] = (int)$ReturnJson["data"]["verified"];
                    $ReturnJson["data"]["header"] = preg_replace("/http:\/\/|https:\/\//", "", $ReturnJson["data"]["header"]);
                }
                break;
            case "tweets":
                // /data/tweets/?name={$username}[&tweet_id={$tweet_id}[&is_status]] etc.
                // /?mode=data&type=tweets&name=bang_dream_info

                //嘿嘿//这个最麻烦，以后再弄
                $tweet_id = $_GET["tweet_id"]??0;
                if (is_numeric($tweet_id) && $tweet_id >= 0) {
                    $queryForStatus = (bool)($_GET["is_status"]??false);
                    $queryForTop = false;
                    $querySql = [["tweet_id", $queryForStatus ? '=' : (!isset($_GET["tweet_id"]) ? '>' : ($_GET["refresh"]??0 ? '>' : '<')), $tweet_id]];
                    if ($uid) {
                        $querySql[] = ["uid", "=", $uid];
                    }
                    //查询类型
                    switch ($_GET["display"] ?? "all") {
                        case "self":
                            $querySql[] = ["retweet_from", "=", null];
                            break;
                        case "retweet":
                            $querySql[] = ["retweet_from", "!=", null];
                            break;
                        case "media":
                            $querySql[] = ["media", "=", "1"];
                            break;
                        default:
                            $queryForTop = ($queryForStatus || $tweet_id) ? false : true;
                    }
                    //查询时间
                    $queryDate = $_GET["date"]??0;
                    if ($queryDate && is_numeric($queryDate)) {
                        $queryForTop = false;
                        $querySql[] = ["time", ">=", $queryDate];
                        $querySql[] = ["time", "<", $queryDate + 86400];
                    }
                    //是否隐藏
                    if (!(bool)($_GET["hidden"]??0)) {
                        $querySql[] = ["hidden", "=", 0];
                    }
                    $tmpTweets = [];
                    //置顶
                    $topStatusId = 0;
                    if ($queryForTop && !$rssMode) {
                        //查找是否有置顶
                        $topStatusId = ($sssql->load("v2_account_info", ["top"], [["uid", "=", $uid]]))[0]["top"]??0;
                        if ($topStatusId) {
                            $tmpTweets = array_merge($tmpTweets, $sssql->load("v2_twitter_tweets", ["tweet_id", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source",  "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"], [["tweet_id", "=", $topStatusId]], [], 1, true));
                        }
                    }
                    //query
                    $queryCount = $topStatusId == 0 ? 11 : 10;
                    $tmpTweets = array_merge($tmpTweets, $sssql->load("v2_twitter_tweets", ["tweet_id", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source",  "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"], $querySql, [["tweet_id", true]], $queryCount, true));
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = returnDataForTweets($tmpTweets, 11, $topStatusId, true, $rssMode, $uid === 0);
                } else {
                    $ReturnJson["code"] = 404;
                    $ReturnJson["message"] = "No Record Found";
                }
                break;
            case "chart":
                // /data/chart/?name={$username}[&end={$endTimestamp}[&refresh=1[&length={$length}]]] etc.
                // /?mode=data&type=chart&name=bang_dream_info
                // /?mode=data&type=chart&uid=3009772568

                //TODO 自定义精度

                $endTimestamp = is_numeric($_GET["end"]??false) ? $_GET["end"] : time();//最后时间
                $length = is_numeric($_GET["length"]??false) ? ($_GET["length"] > 2880 ? 2880 : ($_GET["length"] < 1 ? 1 : $_GET["length"])) : 720;
                $querySql = [["uid", "=", $uid]];
                if ($_GET["refresh"]??0) {
                    $querySql[] = ["timestamp", ">", $endTimestamp];
                } else {
                    $querySql = array_merge($querySql, [["timestamp", "<", $endTimestamp], ["timestamp", ">", $endTimestamp - (60 * $length)]]);
                }

                $chartData = $sssql->load("twitter_data", ["timestamp", "followers", "following", "statuses_count"], $querySql, [["timestamp", true]], $length, true);//最近三小时//一天144个记录点
                if (count($chartData)) {
                    //foreach($chartData as $s => $sData){
                    //    $chartData[$s]["timestamp"] = date('Y-n-j G:i', $sData["timestamp"]);
                    //}
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = array_reverse($chartData);
                } else {
                    $ReturnJson["code"] = 404;
                    $ReturnJson["message"] = "No Record Found";
                }
                break;
            case "search":
                // /data/search/?q={$q}[&tweet_id={$tweet_id}]
                // /?mode=data&type=search&q={$q}

                if ($_GET["q"]??"") {
                    $keyWord = strtok($_GET["q"], " ");
                    $keyWords = [];
                    while($keyWord){
                        $keyWords[] = ["full_text", "LIKE%%", $keyWord];
                        $keyWord = strtok(" ");
                    }
                    $querySql = array_merge($keyWords, [["tweet_id", ">", 0]]);
                    if (isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) {
                        $querySql[1][1] = "<";
                        $querySql[1][2] = $_GET["tweet_id"];
                    }
                    $querySql[] = ["hidden", "=", 0];
                    $tweets = $sssql -> load("v2_twitter_tweets", ["tweet_id", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source",  "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"], $querySql, [["tweet_id", true]], 11, true);
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = returnDataForTweets($tweets, 11, "0", true, $rssMode);
                }
                break;
            case "hashtag":
            case "symbol":
                //TODO rewrite
                // /data/hashtag/?hash={$hashtag} etc.
                // /data/symbol/?hash={$hashtag} etc.//cashtag
                // /?mode=data&type=tag&hash=gg

                if (isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) {
                    $get_tweet_id = $sssql->load("v2_twitter_entities", ["tweet_id"], [["text", "=", $_GET["hash"]], ["tweet_id", "<", $_GET["tweet_id"]], ["hidden", "=", 0], ["type", "=", $type]], [["tweet_id", true]], 11, true);
                } else {
                    $get_tweet_id = $sssql->load("v2_twitter_entities", ["tweet_id"], [["text", "=", $_GET["hash"]], ["hidden", "=", 0], ["type", "=", $type]], [["tweet_id", true]], 11, true);
                }
                $tweet_ids = [];
                foreach($get_tweet_id as $get_tweet_ids){
                    $tweet_ids[] = ["tweet_id", "=", $get_tweet_ids["tweet_id"], "OR"];
                }
                if($tweet_ids){
                    $tweets = $sssql->load("v2_twitter_tweets", ["tweet_id", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source",  "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"], $tweet_ids, [["tweet_id", true]], count($tweet_ids), true);
                }else{
                    $tweets = [];//如果没有tag一定要留空，否则内存爆炸
                }
                if (count($tweets)) {
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = returnDataForTweets($tweets, 11, "0", true, $rssMode);
                } else {
                    $ReturnJson["code"] = 404;
                    $ReturnJson["message"] = "No Record Found";
                }
                break;
            case "translate":
                // /data/translate/?tweet_id={$tweet_id}&to={$language}&tr_type={$translate_type} etc.
                // /?mode=data&type=translate&tweet_id=0&to=zh_CN&tr_type=tweets //for tweets
                // /?mode=data&type=translate&uid=0&to=zh_CN&tr_type=profile //for user description

                $language = $_GET["to"]??$target_language;
                $is_save = strtolower($language) == strtolower($target_language);
                $tweet_id = is_numeric($_GET["tweet_id"]??false)? $_GET["tweet_id"] :0;
                $translate_type = (($_GET["tr_type"]??"tweets") == "profile") ? "profile" : "tweets";
                if (($translate_type == "tweets" && $tweet_id > 0) || ($translate_type == "profile" && $uid > 0)) {
                    switch($translate_type){
                        case 'tweets':
                            $tr_info = $sssql->load("v2_twitter_tweets", ["translate", "full_text_origin", "translate_source"], [["tweet_id", "=", $tweet_id]]);
                            $tr_info = count($tr_info) ? $tr_info[0] : [];
                            break;
                        case 'profile':
                            $tr_info = $sssql->load("v2_account_info", ["description"], [["uid", "=", $uid]]);//读取个人资料
                            $tr_info = count($tr_info) ? ["translate" => "", "full_text_origin" => strip_tags($tr_info[0]["description"]), "translate_source" => ""] : [];//兼容上层
                            break;
                    }
                    if (($tr_info && !$tr_info["translate"]) || !$is_save) {
                        $tr_info["cache"] = false;
                        $tr_info["target"] = $language;
                        $tr_info["translate"] = translate($translate_source, $language, preg_replace('/https:\/\/t.co\/[\w]+/', '', $tr_info["full_text_origin"]));
                        $tr_info["translate_source"] = $translate_source;
                        if ($tr_info["translate"] && $translate_type == "tweets" && $is_save) {
                            //回写
                            $sssql->update("v2_twitter_tweets", ["translate" => $tr_info["translate"], "translate_source" => $translate_source], [["tweet_id", "=", $tweet_id]]);
                        }
                    } elseif ($tr_info && $tr_info["translate"]) {
                        $tr_info["cache"] = true;
                        $tr_info["target"] = $language;
                    }
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = $tr_info;
                }
                break;

            //analytics
            case "stats":
                // /data/stats/ etc.
                // /?mode=data&type=stats

                //select all data
                $tmpStats = $sssql->load("tmp_twitter_data", ["uid", "name", "followers", "following", "statuses_count"], [["visible", "=", "1"]]);
                $findOutGroups = function ($list, $name) {
                    $tmpData = [];
                    $tmpDisplayName = "";
                    foreach ($list as $personInfo) {

                        if ($personInfo["name"] == $name) {
                            $tmpDisplayName = $personInfo["display_name"];
                            foreach ($personInfo["projects"] as $personalProject) {
                                $tmpData[] = $personalProject[0];
                            }
                            break;
                        }
                    }
                    return [$tmpDisplayName, $tmpData];
                };
                foreach ($tmpStats as $order => $tmpPersonStats) {
                    $tmpStats[$order]["followers"] = (int)$tmpStats[$order]["followers"];
                    $tmpStats[$order]["following"] = (int)$tmpStats[$order]["following"];
                    $tmpStats[$order]["statuses_count"] = (int)$tmpStats[$order]["statuses_count"];
                    $tmpConfigData = $findOutGroups($config["users"], $tmpPersonStats["name"]);
                    $tmpStats[$order]["display_name"] = $tmpConfigData[0];
                    $tmpStats[$order]["group"] = $tmpConfigData[1];
                }
                $ReturnJson["code"] = 200;
                $ReturnJson["message"] = "OK";
                $ReturnJson["data"] = $tmpStats;
                break;
            case "status":
                // /data/status/ etc.
                // /?mode=data&type=status
                
                $Status = $sssql->load('v2_server_info', ["time", "total_users", "total_tweets", "total_req_tweets", "total_throw_tweets", "total_req_times", "total_errors_count", "total_media_count", "total_time_cost"], [], [["time", true]], 1440, true);
                //foreach ($Status as $order => $tmpStatus) {
                //    $Status[$order]["time"] = date('Y-n-j G:i', $tmpStatus["time"]);
                //}
                $ReturnJson["code"] = 200;
                $ReturnJson["message"] = "OK";
                $ReturnJson["data"] = array_reverse($Status);
                break;
            case "accounts": 
                // /data/accounts/ etc.
                // /?mode=data&type=accounts
                $ReturnJson["code"] = 200;
                $ReturnJson["message"] = "OK";
                $ReturnJson["data"] = json_decode($config_data[0]["data_output"]);
                break;
        }
        header("content-type: text/json");
        echo json_encode($ReturnJson, JSON_UNESCAPED_UNICODE);//request nothing
        break;
    default: 
        header("content-type: text/json");
        echo json_encode($ReturnJson, JSON_UNESCAPED_UNICODE);//request nothing
}
