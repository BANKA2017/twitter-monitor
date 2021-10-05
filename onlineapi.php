<?php
/*
 * twitter monitor online api
 * @banka2017 && KDNETWORK
 */

ini_set('display_errors',1);
header("Access-Control-Allow-Origin: *");

ob_implicit_flush();
require(__DIR__ . '/init.php');
$fetch = new Tmv2\Fetch\Fetch();
//$parseReferrer = parse_url($_SERVER["HTTP_REFERER"]??"");
//if ($referrerWhiteList !== "" && preg_match('/^(' . $referrerWhiteList . ')$/', $parseReferrer["host"]??"")) {
//    header("Access-Control-Allow-Origin: " . $parseReferrer["scheme"] . '://' . $parseReferrer["host"] . (isset($parseReferrer["port"]) ? ':' . $parseReferrer["port"] : ""));
//}

//json
$ReturnJson = [
    "code" => 403,
    "message" => "Forbidden request",
    "data" => [],
    "query" => ($_SERVER["QUERY_STRING"]??""),
    "version" => "online v2",
];

//svg
$ReturnSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>';

$rssMode = ($_GET["format"]??"json") == "rss";
$defaultTweetsCount = $rssMode ? 20 : 10;//rss模式应该有更多内容

//formatted
function returnDataForTweets (
    array $tweet = [],
    bool $historyMode = false,
    array $tweetEntities = [],
    array $tweetPolls = [],
    array $tweetCard = [],
    array $tweetCardApp = [],
    array $tweetQuote = [],
    array $tweetMedia = [],
): array {
    $tweet["type"] = "tweet";
    if ($historyMode) {
        //处理history模式
        $tweet["entities"] = $tweetEntities;
    }
    //$tweet["full_text_origin"] = preg_replace('/ https:\/\/t.co\/[\w]+/', '', $tweet["full_text_origin"]);//TODO for history mode
    //处理投票
    if ($tweet["poll"]) {
        $tweet["pollObject"] = $tweetPolls;
    }
    //处理卡片
    $tweet["cardObject"] = [];
    if ($tweet["card"]) {
        $tweet["cardObject"] = $tweetCard;
        if ($tweet["cardObject"] !== [] && $tweet["cardObject"]["unified_card_app"]) {
            $tweet["cardObject"]["unified_card_app"] = (bool)$tweet["cardObject"]["unified_card_app"];
            $tweet["cardObject"]["app"] = $tweetCardApp;
        }
    }
    //处理引用
    $tweet["quoteObject"] = [];
    if ($tweet["quote_status"]) {
        $tweet["quoteObject"] = $tweetQuote;
        //$tweet["quoteObject"]["full_text"] = strip_tags($tweet["quoteObject"]["full_text"]);
    }
    $tmpImageText = "";
    //寻找媒体
    $tweet["mediaObject"] = ["tweetsMedia" => [], "quoteMedia" => [], "cardMedia" => []];
    if ($tweet["media"] || ($tweet["cardObject"]["media"]??0) || ($tweet["quoteObject"]["media"]??0)) {
        foreach ($tweetMedia as $queryMedia_single) {
            $queryMedia_single["cover"] = str_replace(["http://", "https://"], "", $queryMedia_single["cover"]);
            $queryMedia_single["url"] = str_replace(["http://", "https://"], "", $queryMedia_single["url"]);
            switch ($queryMedia_single["source"]) {
                case "tweets":
                    //不符合的直接丢弃
                    if ($queryMedia_single["tweet_id"] == $tweet["tweet_id"]) {
                        $tweet["mediaObject"]["tweetsMedia"][] = $queryMedia_single;
                        $tmpImageText .= '<img src="https://pbs.twimg.com/media/' . $queryMedia_single["filename"] . '?format=' . $queryMedia_single["extension"] . '&name=orig">';
                    }
                    break;
                case "cards":
                    $tweet["mediaObject"]["cardMedia"][] = $queryMedia_single;
                    break;
                case "quote_status":
                    $tweet["mediaObject"]["quoteMedia"][] = $queryMedia_single;
                    break;
            }
        }
        //处理重复
        $tweet["mediaObject"]["tweetsMedia"] = mediaObject($tweet["mediaObject"]["tweetsMedia"]);
        $tweet["mediaObject"]["cardMedia"] = mediaObject($tweet["mediaObject"]["cardMedia"]);
        $tweet["mediaObject"]["quoteMedia"] = mediaObject($tweet["mediaObject"]["quoteMedia"]);
    }
    $tweet["tweet_id_str"] = (string)$tweet["tweet_id"];//Number.MAX_SAFE_INTEGER => 9007199254740991 "9007199254740991".length => 16
    $tweet["uid_str"] = (string)$tweet["uid"];//同上

    return $tweet;
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

        switch ($type) {
            case "userinfo":
                // /data/userinfo/?name={$username} etc.
                // /?mode=data&type=userinfo&name=bang_dream_info
                // /?mode=data&type=userinfo&uid=3009772568

                //TODO errors

                $user_info = $fetch->tw_get_userinfo($name?:$uid?:'', '', true);

                $generateData = (new Tmv2\Info\Info($user_info, false))->generateMonitorData();

                $ReturnJson["code"] = 200;
                $ReturnJson["message"] = "OK";
                $ReturnJson["data"] = $generateData->in_sql_info;
                $ReturnJson["data"]["description"] = nl2br($ReturnJson["data"]["description"]);//nl2br(preg_replace("/ #([^\s]+)/", ' <a href="#/hashtag/$1" id="hashtag_profile">#$1</a>', $ReturnJson["data"]["description"]));//处理个人简介中的hashtag//TODO remove
                $ReturnJson["data"]["top"] = (string)($ReturnJson["data"]["top"] ?: 0);
                $ReturnJson["data"]["header"] = preg_replace("/http:\/\/|https:\/\//", "", $ReturnJson["data"]["header"]);
                $ReturnJson["data"]["uid_str"] = (string)$ReturnJson["data"]["uid"];

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

                break;
            case "tweets":
                // /data/tweets/?name={$username}[&tweet_id={$tweet_id}[&is_status]] etc.
                // /?mode=data&type=tweets&name=bang_dream_info

                //嘿嘿//这个最麻烦，以后再弄
                $cursor = intval($_GET["tweet_id"]??0);

                //use $tweet_id to replace $cursor
                //TODO reuse cursor as name
                //TODO online mode in fetch
                //TODO $_GET["is_status"] means conversation
                //TODO $_GET["refresh"] means top cursor
                //TODO $_GET["display"] means type
                //TODO $_GET["date"] no use
                //TODO $_GET["count"] means count
                //TODO merge search mode
                //TODO fix refresh bug '1 new'
                $getCount = ($_GET["count"]??$defaultTweetsCount);
                $queryCount = (is_numeric($getCount) ? (($getCount > 1000) ? 1000 : (($getCount < 1) ? 1 : $getCount)) : $defaultTweetsCount);
                //filter:media
                $queryString = "from:$name since:2000-01-01 include:nativeretweets";//$name 2000-01-01 include retweets
                if ($cursor) {
                    $queryString .= ((int)($_GET["refresh"]??false) != 0) ? (" since_id:" . $cursor) : (" max_id:" . $cursor);
                }
                $tweets = $fetch->tw_get_tweets($queryString, "", "", $queryCount, true, false, true);

                $generateTweetData = new Tmv2\Core\Core($tweets, false, false, false, true);

                if ($generateTweetData->errors[0] !== 0) {
                    $ReturnJson["code"] = $generateTweetData->errors[0];
                    $ReturnJson["message"] = $generateTweetData->errors[1];
                } else {
                    $cursor = $generateTweetData->cursor;
                    $tweetData = [];
                    foreach ($generateTweetData->contents as $order => $content) {
                        //判断非推文//graphql only
                        if ($generateTweetData->isGraphql && $content["content"]["entryType"] != "TimelineTimelineItem") {
                            continue;
                        }
                        //判断是否本人发推
                        if (true) {
                            //generateData
                            $generateTweetData->generateTweetObject($content);
                            //in_sql_tweets
                            $in_sql = $generateTweetData->in_sql_tweet;
                            //v2_twitter_media
                            foreach ($generateTweetData->media as $single_media) {
                                //由于前面是无脑合并所以此处需要验证
                                if ($single_media["url"] ?? false) {
                                    if (!str_ends_with($single_media["origin_type"], "photo")) {
                                        if ($single_media["source"] == "quote_status") {
                                            $generateTweetData->quote["video"] = 1;
                                        } else {
                                            $in_sql["video"] = 1;
                                        }
                                    }
                                }
                            }
                            $tweetData[$generateTweetData->in_sql_tweet["tweet_id"]] = returnDataForTweets(
                                $in_sql,
                                true,
                                $generateTweetData->tags ? array_values($generateTweetData->tags) : [],
                                $generateTweetData->card["polls"]??[],
                                ($in_sql["card"] && !$in_sql["poll"]) ? $generateTweetData->card : [],
                                ($in_sql["card"] && !$in_sql["poll"] && $generateTweetData->cardApp) ? $generateTweetData->cardApp : [],
                                $generateTweetData->isQuote ? $generateTweetData->quote : [],
                                $generateTweetData->media??[]
                            );
                        }

                        krsort($tweetData);


                    }
                    //data
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = [
                        "tweets" => array_values($tweetData),
                        "hasmore" => (bool)count($tweetData),
                        "top_tweet_id" => $generateTweetData->max_tweetid,
                        "bottom_tweet_id" => $generateTweetData->min_tweetid,
                    ];
                }

                break;
            case "chart":
                $ReturnJson["code"] = 404;
                $ReturnJson["message"] = "No Record Found";
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

        }
        if ($ReturnJson["data"]["rss_mode"]??false) {
            header("content-type: text/xml");
            echo $ReturnJson["data"]["rss_message"];
        } else {
            header("content-type: text/json");
            echo json_encode($ReturnJson, JSON_UNESCAPED_UNICODE);//request nothing
        }
        break;
    default:
        header("content-type: text/json");
        echo json_encode($ReturnJson, JSON_UNESCAPED_UNICODE);//request nothing
}
