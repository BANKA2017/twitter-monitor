<?php
/*
 * twitter monitor v2 api
 * @banka2017 && KDNETWORK
 */

//ini_set('display_errors',1);
//header("Access-Control-Allow-Origin: *");

ob_implicit_flush();
require(__DIR__ . '/init.php');

$parseReferrer = parse_url($_SERVER["HTTP_REFERER"]??"");
if ($referrerWhiteList !== "" && preg_match('/^(' . $referrerWhiteList . ')$/', $parseReferrer["host"]??"")) {
    header("Access-Control-Allow-Origin: " . $parseReferrer["scheme"] . '://' . $parseReferrer["host"] . (isset($parseReferrer["port"]) ? ':' . $parseReferrer["port"] : ""));
}

//json
$ReturnJson = [
    "code" => 403,
    "message" => "Forbidden request",
    "data" => [],
    "query" => ($_SERVER["QUERY_STRING"]??""),
    "version" => "v2",
];

//svg
$ReturnSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>';

$rssMode = ($_GET["format"]??"json") == "rss";
$defaultTweetsCount = $rssMode ? 20 : 10;//rss模式应该有更多内容

//创建连接
try {
    $sssql = new ssql($servername, $username, $password, $dbname);
} catch (Exception $e) {
    $returnJson["code"] = 500;
    $returnJson["message"] = "Unable to connect to database";
    die(json_encode($returnJson, JSON_UNESCAPED_UNICODE));
}

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
            if ($tweets[$x]["cardObject"] !== [] && $tweets[$x]["cardObject"]["unified_card_app"]) {
                $tweets[$x]["cardObject"]["unified_card_app"] = (bool)$tweets[$x]["cardObject"]["unified_card_app"];
                $tweets[$x]["cardObject"]["app"] = $GLOBALS['sssql']->load("v2_twitter_card_app", ["unified_card_type", "type", "appid", "country_code", "title", "category"], [["tweet_id", "=", $tweets[$x]["tweet_id"]]]);
            }
        }
        //处理引用
        $tweets[$x]["quoteObject"] = [];
        if ($tweets[$x]["quote_status"]) {
            $tweets[$x]["quoteObject"] = $GLOBALS['sssql']->load("v2_twitter_quote", ["tweet_id", "name", "display_name", "full_text", "time", "media", "video"], [["tweet_id", "=", $tweets[$x]["quote_status"]]])[0]??[];
            $tweets[$x]["quoteObject"]["full_text"] = strip_tags($tweets[$x]["quoteObject"]["full_text"]);
        }
        $tmpImageText = "";
        //寻找媒体
        $tweets[$x]["mediaObject"] = ["tweetsMedia" => [], "quoteMedia" => [], "cardMedia" => []];
        if ($tweets[$x]["media"] || ($tweets[$x]["cardObject"]["media"]??0) || ($tweets[$x]["quoteObject"]["media"]??0)) {
            $queryMediaSql = $GLOBALS['sssql']->load("v2_twitter_media", ["tweet_id", "uid", "cover", "url", "extension", "filename", "origin_type", "source", "content_type", "origin_info_height", "origin_info_width", "blurhash"], isset($tweets[$x]["quoteObject"]["tweet_id"]) ? [["tweet_id", "=", $tweets[$x]["tweet_id"], "OR"], ["tweet_id", "=", $tweets[$x]["quoteObject"]["tweet_id"], "OR"], ["source", "!=", "cover"]] : [["tweet_id", "=", $tweets[$x]["tweet_id"]], ["source", "!=", "cover"]]);
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
            //处理重复
            $tweets[$x]["mediaObject"]["tweetsMedia"] = mediaObject($tweets[$x]["mediaObject"]["tweetsMedia"]);
            $tweets[$x]["mediaObject"]["cardMedia"] = mediaObject($tweets[$x]["mediaObject"]["cardMedia"]);
            $tweets[$x]["mediaObject"]["quoteMedia"] = mediaObject($tweets[$x]["mediaObject"]["quoteMedia"]);
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
        $tweets[$x]["tweet_id_str"] = (string)$tweets[$x]["tweet_id"];//Number.MAX_SAFE_INTEGER => 9007199254740991 "9007199254740991".length => 16
        $tweets[$x]["uid_str"] = (string)$tweets[$x]["uid"];//同上
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
        return ["rss_message" => $rss->build(), "rss_mode" => true];
    }
    return ["tweets" => $tweets, "bottom_tweet_id" => (string)$tweet_id, "top_tweet_id" => (string)$check_new_tweet_id, "hasmore" => $hasmore, "rss_mode" => false];
}

//media object
function mediaObject (array $mediaInfo): array {
    $tmpFilenameList = [];
    $tmpMedia = [];
    foreach ($mediaInfo as $media) {
        if (!in_array($media["filename"], $tmpFilenameList)) {
            $tmpMedia[] = $media;
            $tmpFilenameList[] = $media["filename"];
        }
    }
    return $tmpMedia;
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

                        //处理小图片
                        //if ($mediaLinkArray["size"] === 'small' && $run_options["twitter"]["save_raw_media"]) {
                        //    if (!file_exists(__DIR__ . '/savemedia/image/small/' . $mediaLinkArray["basename"])) {//TODO 未来应该能够自定义目录而不是硬编码
                        //        copy("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? ":{$mediaLinkArray["size"]}" : $mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : ""), __DIR__ . '/savemedia/image/small/' . $mediaLinkArray["basename"]);
                        //    }
                        //    
                        //} else {
                            //最后都用上了//处理拖动进度条的问题//仅mp4
                            //咕完了//咕咕咕
                            //获取长度
                            $tmpLength = (new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? '' : ($mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : ""))))->returnBody(2);
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
                                header("Content-Disposition:attachment;filename=." . $mediaLinkArray["basename"]);
                                echo (new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? '' : ($mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : ""))))->addMore([CURLOPT_TIMEOUT => 999])->addMore([CURLOPT_RETURNTRANSFER => false]);//mp4不会删//use CURLOPT_RETURNTRANSFER to stdout
                            }
                        //}
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
                    $ReturnJson["data"]["description"] = nl2br($ReturnJson["data"]["description"]);//nl2br(preg_replace("/ #([^\s]+)/", ' <a href="#/hashtag/$1" id="hashtag_profile">#$1</a>', $ReturnJson["data"]["description"]));//处理个人简介中的hashtag//TODO remove
                    $ReturnJson["data"]["top"] = (string)($ReturnJson["data"]["top"] ?: 0);
                    $ReturnJson["data"]["header"] = preg_replace("/http:\/\/|https:\/\//", "", $ReturnJson["data"]["header"]);
                    $ReturnJson["data"]["uid_str"] = (string)$ReturnJson["data"]["uid"];
                    //$ReturnJson["data"]["translate"] = "";// TODO Delete this key
                    //$ReturnJson["data"]["translate_source"] = "";// TODO Delete this key
                    
                    //description
                    $descriptionText = $ReturnJson["data"]["description"];
                    $textWithoutTags = strip_tags($descriptionText);
                    $ReturnJson["data"]["description_origin"] = $textWithoutTags;
                    preg_match_all('/<a href="([^"]+)" target="_blank">([^<]+)<\/a>|(?:\s|\p{P}|^)#([^\s\p{P}]+)/u', $descriptionText, $Match);
                    $List = [];
                    $lastEnd = 0;
                    foreach ($Match[2] as $order => $value) {
                        if ($value === "") {
                            $text = $Match[3][$order];
                            $beforeLength = mb_strlen(stristr(mb_substr($textWithoutTags, $lastEnd), "#{$text}", true)) + $lastEnd;
                            $lastEnd = $beforeLength + mb_strlen($text) + 1;
                            $List[] = [
                                "expanded_url" => "",
                                "indices_end" => $lastEnd,
                                "indices_start" => $beforeLength,
                                "text" => $text,
                                "type" => "hashtag",
                            ];
                        } else {
                            $beforeLength = mb_strlen(stristr(mb_substr($textWithoutTags, $lastEnd), $value, true)) + $lastEnd;
                            $lastEnd = $beforeLength + mb_strlen($value);
                            $List[] = [
                                "expanded_url" => $Match[1][$order],
                                "indices_end" => $lastEnd,
                                "indices_start" => $beforeLength,
                                "text" => $value,
                                "type" => "url",
                            ];
                        }
                    }
                    $ReturnJson["data"]["description_entities"] = $List;
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
                    if (!(bool)($_GET["hidden"]??0) && $uid === 0) {// 开放隐藏系统
                        $querySql[] = ["hidden", "=", 0];
                    }
                    $tmpTweets = [];
                    //置顶
                    $topStatusId = 0;
                    if ($queryForTop && !$rssMode) {
                        //查找是否有置顶
                        $topStatusId = ($sssql->load("v2_account_info", ["top"], [["uid", "=", $uid]]))[0]["top"]??0;
                        if ($topStatusId) {
                            $tmpTweets = array_merge($tmpTweets, $sssql->load("v2_twitter_tweets", ["tweet_id", "uid", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source",  "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"], [["tweet_id", "=", $topStatusId]], [], 1, true));
                        }
                    }
                    //query
                    $getCount = ($_GET["count"]??$defaultTweetsCount);
                    $queryCount = (is_numeric($getCount) ? (($getCount > 1000) ? 1000 : (($getCount < 1) ? 1 : $getCount)) : $defaultTweetsCount) + (int)($topStatusId == 0);
                    $tmpTweets = array_merge($tmpTweets, $sssql->load("v2_twitter_tweets", ["tweet_id", "uid", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source",  "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"], $querySql, [["tweet_id", true]], $queryCount, true));
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = returnDataForTweets($tmpTweets, $queryCount + (int)($topStatusId != 0), $topStatusId, true, $rssMode, $uid === 0);
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
                // /data/search/?[...]&advanced=1 //advanced search
                // /?mode=data&type=search&q={$q}
                $advancedSearchMode = ($_GET["advanced"]??0) == 1;
                $getCount = ($_GET["count"]??$defaultTweetsCount);
                $queryCount = (int)(is_numeric($getCount) ? (($getCount > 1000) ? 1000 : (($getCount < 1) ? 1 : $getCount)) : $defaultTweetsCount) + 1;
                $tweets = [];
                $noRecord = false;
                $firstSql = true;
                if ($advancedSearchMode) {
                    //keywords
                    $keyWord = ($_GET["q"]??"");
                    $text_or_mode = ($_GET["text_or_mode"]??0) != 0;
                    $text_not_mode = ($_GET["text_not_mode"]??0) != 0;
                    //users
                    $user = str_replace("@", "", ($_GET["user"]??""));
                    $user_and_mode = ($_GET["user_and_mode"]??0) != 0;
                    $user_not_mode = ($_GET["user_not_mode"]??0) != 0;
                    //tweet type
                    $tweet_type = (($_GET["tweet_type"]??0) && $_GET["tweet_type"] > -1 && $_GET["tweet_type"] < 3) ? $_GET["tweet_type"] : 0;
                    $tweet_media = ($_GET["tweet_media"]??0) != 0;
                    //time
                    $start = ($_GET["start"]??-1);
                    $end = ($_GET["end"]??-1);
                    $queryOrder = ($_GET["order"]??0) != 0;
                    $hidden = ($_GET["hidden"]??0) != 0;
    
                    $querySql = "";
                    if ($user != "") {
                        //keyword
                        $originUser = $user;
                        $user = strtok($user, " ");
                        $order = 0;
                        $queryKeyWords = "";
                        while($user){
                            $uidInfo = $sssql->multi("SELECT DISTINCT `uid` FROM `v2_account_info` WHERE `name` = '{$user}' LIMIT 1");
                            if (($uidInfo[0][0]??0) === 0) {
                                if ($user_and_mode) {
                                    $noRecord = true;
                                    $ReturnJson["code"] = 404;
                                    $ReturnJson["message"] = "No Record Found";
                                    break;
                                }
                            } else {
                                if ($order !== 0) {
                                    $queryKeyWords .= " " . ($user_and_mode ? "AND" : "OR") . " ";
                                }
                                $queryKeyWords .= ' `uid` ' . ($user_not_mode ? '!' : '') . '= "' . $sssql->conn->real_escape_string($uidInfo[0][0]) . '"';
                                $order++;
                            }
                            $user = strtok(" ");
                        }
                        if ($queryKeyWords != "") {
                            $querySql .= "WHERE ({$queryKeyWords})";
                            $firstSql = false;
                        } elseif ($originUser != "" && $queryKeyWords == "") {
                            $noRecord = true;
                            $ReturnJson["code"] = 404;
                            $ReturnJson["message"] = "No Record Found";
                        }
                    }

                    if (!$noRecord) {
                        if ($keyWord != "") {
                            //keyword
                            $keyWord = strtok($keyWord, " ");
                            $order = 0;
                            $queryKeyWords = "";
                            while($keyWord){
                                if ($order !== 0) {
                                    $queryKeyWords .= " " . ($text_or_mode ? "OR" : "AND") . " ";
                                }
                                $queryKeyWords .= ($text_not_mode ? ' NOT' : '') . ' MATCH(`full_text_origin`) AGAINST("' . $sssql->conn->real_escape_string($keyWord) . '")';
                                $keyWord = strtok(" ");
                                $order++;
                            }
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . "({$queryKeyWords})";
                            $firstSql = false;
                        }
                        if ($start >= 0) {
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . '`time` >= ' . $sssql->conn->real_escape_string($start);
                            $firstSql = false;
                        }
                        if ($end >= 0 && $end >= $start) {
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . '`time` <= ' . $sssql->conn->real_escape_string($end);
                            $firstSql = false;
                        }
                        if ($tweet_type == 1) {
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . '`retweet_from` = ""';
                            $firstSql = false;
                        } elseif ($tweet_type == 2) {
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . '`retweet_from` != ""';
                            $firstSql = false;
                        }
                        if ($tweet_media) {
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . '`media` = "1"';
                            $firstSql = false;
                        }
                        if (!$hidden) {
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . "`hidden` = 0";
                            $firstSql = false;
                        }
                        if (isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) {
                            $querySql .= ($firstSql ? "WHERE " : " AND ") . "`tweet_id` " . (((($_GET["refresh"]??0) == 1) === !$queryOrder) ? "> " : "< ") . $sssql->conn->real_escape_string($_GET["tweet_id"]);
                            $firstSql = false;
                        }
                        
                        $querySql = 'SELECT `tweet_id`, `uid`, `name`, `display_name`, `media`, `video`, `card`, `poll`, `quote_status`, `source`, `full_text`, `full_text_origin`, `retweet_from`, `retweet_from_name`, `dispute`, `time` FROM `v2_twitter_tweets` ' . $querySql . ' ORDER BY `tweet_id`' . ($queryOrder ? '' : ' DESC') . " LIMIT {$queryCount};";
                        
                        //$ReturnJson["sql"] = $querySql;
                        $ReturnJson["code"] = 200;
                        $ReturnJson["message"] = "OK";
                        $tweets = $sssql->multi($querySql, true);
                    }

                    $ReturnJson["data"] = returnDataForTweets($tweets, $queryCount, "0", true, $rssMode);
                } elseif (($_GET["q"]??"")) {
                    $keyWord = strtok($_GET["q"], " ");
                    $order = 0;
                    while($keyWord){
                        switch (substr($keyWord, 0, 1)) {
                            case "@":
                                $uidInfo = $sssql->multi("SELECT DISTINCT `uid` FROM `v2_account_info` WHERE `name` = '" . substr($keyWord, 1) . "' LIMIT 1");
                                if (($uidInfo[0]["uid"]??0) === 0) {
                                    $noRecord = true;
                                }
                                $querySql[] = ["uid", "=", ($uidInfo[0]["uid"]??0)];//replace name to uid
                                $keyWord = strtok(" ");
                                break;
                            default: 
                                if (strtolower($keyWord) === "or" && $querySql[$order - 1][0] === "uid") {//switch user
                                    $querySql[$order - 1][0][3] = "OR";
                                } else {
                                    $querySql[] = ["full_text_origin", "MATCH", $keyWord];
                                    $keyWord = strtok(" ");
                                }
                                break;
                        }
                        if ($noRecord) {
                            break;
                        }
                        $order++;
                    }
                    if (!$noRecord) {
                        $tweetIdSqlQuery = ["tweet_id", ">", 0];
                        if (isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) {
                            $tweetIdSqlQuery[1] = ($_GET["refresh"]??0) == 1 ? ">" : "<";
                            $tweetIdSqlQuery[2] = $_GET["tweet_id"];
                        }
                        $querySql[] = $tweetIdSqlQuery;
                        $querySql[] = ["hidden", "=", 0];
                        $tweets = $sssql -> load("v2_twitter_tweets", ["tweet_id", "uid", "name", "display_name", "media", "video", "card", "poll", "quote_status", "source",  "full_text", "full_text_origin", "retweet_from", "retweet_from_name", "dispute", "time"], $querySql, [["tweet_id", true]], $queryCount, true);
                    }
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = returnDataForTweets($tweets, $queryCount, "0", true, $rssMode);
                }
                break;
            case "hashtag":
            case "symbol":
                //TODO rewrite
                // /data/hashtag/?hash={$hashtag} etc.
                // /data/symbol/?hash={$hashtag} etc.//cashtag
                // /?mode=data&type=tag&hash=gg

                $getCount = ($_GET["count"]??$defaultTweetsCount);
                $queryCount = (is_numeric($getCount) ? (($getCount > 1000) ? 1000 : (($getCount < 1) ? 1 : $getCount)) : $defaultTweetsCount) + 1;


                $tweets = $sssql->multi("SELECT `tweet_id`, `uid`, `name`, `display_name`, `media`, `video`, `card`, `poll`, `quote_status`, `source`,  `full_text`, `full_text_origin`, `retweet_from`, `retweet_from_name`, `dispute`, `time` FROM `v2_twitter_tweets` WHERE `tweet_id` = ANY(SELECT `tweet_id` FROM (SELECT `tweet_id` FROM `v2_twitter_entities` WHERE `text` = '" . $sssql->conn->real_escape_string($_GET["hash"]) . "'" . ((isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) ? (" AND `tweet_id` " . (($_GET["refresh"]??0) == 1 ? ">" : "<") . $sssql->conn->real_escape_string($_GET["tweet_id"])) : '') . "  AND `type` = '" . $sssql->conn->real_escape_string($type) . "' AND `hidden` = '0' ORDER BY `tweet_id` DESC LIMIT {$queryCount}) AS t) ORDER BY `tweet_id` DESC", true);

                if (count($tweets)) {
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    
                } else {
                    $ReturnJson["code"] = 404;
                    $ReturnJson["message"] = "No Record Found";
                }
                $ReturnJson["data"] = returnDataForTweets($tweets, $queryCount, "0", true, $rssMode);
                break;
            case "translate":
                // /data/translate/?tweet_id={$tweet_id}&to={$language}&tr_type={$translate_type} etc.
                // /?mode=data&type=translate&tweet_id=0&to=zh_CN&tr_type=tweets //for tweets
                // /?mode=data&type=translate&uid=0&to=zh_CN&tr_type=profile //for user description
                //TODO diy translate_source
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
            case "trends":
                // /data/trends/ etc.
                // /?mode=data&type=trends
                //hashTagsRank24
                $now = time();
                $length = 24;//hours
                $count = 50;//count
                $tweetIdList = $sssql->multi("SELECT COUNT(text) as total, text FROM v2_twitter_entities WHERE type = 'hashtag' AND `hidden` = '0' AND `timestamp` >= \"" . ($now - $length * 3600) . "\" AND `timestamp` <= \"{$now}\" GROUP BY text ORDER BY `total` DESC LIMIT {$count}");
                $hashtagList = [];
                foreach ($tweetIdList as $hashtag) {
                    $hashtagList[] = ["text" => $hashtag[1], "count" => $hashtag[0]];
                };
                //tweetsCount
                $tweetsTimeList = $sssql->load('v2_twitter_tweets', ["time"], [["time", ">=", ($now - $length * 3600)], ["time", "<=", $now], ["hidden", "=", 0]]);
                $tmpTimeList = array_fill(0, 24, 0);
                foreach ($tweetsTimeList as $time) {
                    $tmpTimeList[date('G', $time["time"])]++;
                }
                //topData
                //startData
                $startData = $sssql->multi("SELECT uid, MIN(timestamp) as time, ANY_VALUE(followers) AS followers, ANY_VALUE(statuses_count) AS statuses_count FROM `twitter_data` WHERE `timestamp` >= " . ($now - $length * 3600) . " GROUP BY uid LIMIT 100");
                $endData = $sssql->multi("SELECT uid, timestamp, followers, statuses_count FROM `tmp_twitter_data` WHERE `visible` = 1");
                foreach ($endData as $order => $userData) {
                    foreach ($startData as $startUserData) {
                        if ($startUserData[0] === $userData[0]) {
                            $endData[$order][2] -= $startUserData[2];
                            $endData[$order][3] -= $startUserData[3];
                            break;
                        }
                    }
                }
                function following_sort ($a, $b): int {
                    if ($a[2] == $b[2]) {
                        return 0;
                    }
                    return ($a[2] < $b[2]) ? 1 : -1;
                }
                function statuses_sort ($a, $b): int {
                    if ($a[3] == $b[3]) {
                        return 0;
                    }
                    return ($a[3] < $b[3]) ? 1 : -1;
                }
                usort($endData,"following_sort");
                $tmpFollowingData = array_merge(array_slice($endData, 0, 5), array_slice($endData, -5));
                $followingData = [];
                foreach ($tmpFollowingData as $followingDataS) {
                    $followingData[] = array_merge($sssql->load('v2_account_info', ["name", "display_name", "header"], [["uid", "=", $followingDataS[0]]])[0], ["count" => $followingDataS[2]]);
                }
                $followingData = [array_slice($followingData, 0, 5), array_slice($followingData, -5)];
                usort($endData,"statuses_sort");
                $tmpStatusesData = array_slice($endData, 0, 5);
                $statusesData = [];
                foreach ($tmpStatusesData as $statusesDataS) {
                    $statusesData[] = array_merge($sssql->load('v2_account_info', ["name", "display_name", "header"], [["uid", "=", $statusesDataS[0]]])[0], ["count" => $statusesDataS[3]]);
                }
                
                $ReturnJson["data"] = ["hashtag_list" => $hashtagList, "tweet_time_list" => $tmpTimeList, "following" => $followingData, "statuses" => $statusesData, "timestamp" => $now];
                $ReturnJson["code"] = 200;
                $ReturnJson["message"] = "OK";
                break;
        }
        if ($ReturnJson["data"]["rss_mode"]??false) {
            header("content-type: text/xml");
            echo $ReturnJson["data"]["rss_message"];
        } else {
            header("content-type: text/json");
            echo json_encode($ReturnJson, JSON_UNESCAPED_UNICODE);//request nothing
        }
        break;
    case "online":
        switch($type) {
            case "info":
                // /online/info/?tweet_id={$tweet_id} etc.
                // /?mode=online&type=info&tweet_id={$tweet_id}
                $wholeInfo = tw_get_conversation($_GET["tweet_id"]??"");
                if (isset($wholeInfo["errors"])) {
                    $ReturnJson["code"] = $wholeInfo["errors"][0]["code"];
                    $ReturnJson["message"] = $wholeInfo["errors"][0]["message"];
                } else {
                    //extended_entities
                    
                    
                    
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = ["tweets" => $wholeInfo["globalObjects"]["tweets"], "users" => $wholeInfo["globalObjects"]["users"]];
                }
                break;
            case "media":
                // /online/media/?tweet_id={$tweet_id} etc.
                // /?mode=online&type=media&tweet_id={$tweet_id}
                $wholeInfo = tw_get_conversation($_GET["tweet_id"]??"");
                if (isset($wholeInfo["errors"]) || !isset($wholeInfo["globalObjects"]["tweets"][$_GET["tweet_id"]])) {
                    $ReturnJson["code"] = $wholeInfo["errors"][0]["code"]??404;
                    $ReturnJson["message"] = $wholeInfo["errors"][0]["message"]??"No such tweet";
                } else {
                    //extended_entities
                    $tweetMeta = isset($wholeInfo["globalObjects"]["tweets"][$_GET["tweet_id"]]["retweeted_status_id_str"]) ? $wholeInfo["globalObjects"]["tweets"][$wholeInfo["globalObjects"]["tweets"][$_GET["tweet_id"]]["retweeted_status_id_str"]]["entities"] : $wholeInfo["globalObjects"]["tweets"][$_GET["tweet_id"]];
                    $entities = $tweetMeta["extended_entities"] ?? "";
                    $isVideo = false;
                    $tmpVideoInfo = [];
                    $returnMedia = [];
                    foreach ($entities["media"]??[] as $mediaMeta) {
                        $tmpMedia = tw_media($mediaMeta, $wholeInfo["globalObjects"]["tweets"][$_GET["tweet_id"]]["user_id_str"], $_GET["tweet_id"], false);
                        if ($tmpMedia[0]["origin_type"] == "video" || $tmpMedia[0]["origin_type"] == "animated_gif") {
                            $isVideo = true;
                            $tmpVideoInfo = $mediaMeta["video_info"];
                        }
                        foreach ($tmpMedia as $tmpMediaMeta) {
                            if ($tmpMediaMeta["source"] != "cover") {
                                $tmpMediaMeta["cover"] = preg_replace("/(https:\/\/|http:\/\/)/", "", $tmpMediaMeta["cover"]);
                                $tmpMediaMeta["url"] = preg_replace("/(https:\/\/|http:\/\/)/", "", $tmpMediaMeta["url"]);
                                $returnMedia[] = $tmpMediaMeta;
                            }
                        }
                    }
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = ["video" => $isVideo, "media_info" => $returnMedia, "video_info" => $tmpVideoInfo];
                }
        }
        header("content-type: text/json");
        echo json_encode($ReturnJson, JSON_UNESCAPED_UNICODE);//request nothing
        break;
    default: 
        header("content-type: text/json");
        echo json_encode($ReturnJson, JSON_UNESCAPED_UNICODE);//request nothing
}
