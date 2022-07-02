<?php
/*
 * twitter monitor online api
 * @banka2017 && NEST.MOE
 */

ini_set('display_errors',1);
//header("Access-Control-Allow-Origin: *");

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
    "message" => "Invalid Request",
    "data" => [],
    "query" => ($_SERVER["QUERY_STRING"]??""),
    "version" => "online",
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
    $tweet["pollObject"] = [];
    if ($tweet["poll"]) {
        foreach ($tweetPolls as $pollObject) {
            if ($pollObject["tweet_id"] === $tweet["tweet_id"]) {
                unset($pollObject["tweet_id"]);
                $pollObject["checked"] = (bool)($pollObject["checked"]??true);
                $tweet["pollObject"][] = $pollObject;
            }
        }
    }
    //处理卡片
    $tweet["cardObject"] = new ArrayObject();
    if ($tweet["card"]) {
        $tweet["cardObject"] = $tweetCard;
        if ($tweet["cardObject"] && $tweet["cardObject"]["unified_card_app"]) {
            $tweet["cardObject"]["unified_card_app"] = (bool)$tweet["cardObject"]["unified_card_app"];
            $tweet["cardObject"]["app"] = $tweetCardApp;
            $tweet["cardObject"]["secondly_type"] = $tweet["cardObject"]["secondly_type"] ? $tweet["cardObject"]["secondly_type"] : '';
        }
    }
    //处理引用
    $tweet["quoteObject"] = new ArrayObject();
    if ($tweet["quote_status"]) {
        $tweet["quoteObject"] = $tweetQuote;
        $tweet["quoteObject"]["id_str"] = (string)$tweet["quoteObject"]["tweet_id"];
        $tweet["quote_status_str"] = $tweet["quoteObject"]["id_str"];

        $tmpFullText = str_replace('<br />', '', $tweet["quoteObject"]["full_text"]);
        $tweet["quoteObject"]["full_text"] = strip_tags($tweet["quoteObject"]["full_text"]);
        preg_match_all('/<a href="([^"]+)"[^>]+>([^<]+)<\/a>|(?:\s|\p{P}|^)#([_^\s\p{P}]+)/u', $tmpFullText, $Match);
        $List = [];
        $lastEnd = 0;
        foreach ($Match[2] as $order => $value) {
            if ($value === "") {
                $text = $Match[3][$order];
                $beforeLength = mb_strlen(stristr(mb_substr($tweet["quoteObject"]["full_text"], $lastEnd), "#{$text}", true)) + $lastEnd;
                $lastEnd = $beforeLength + mb_strlen($text) + 1;
                $List[] = [
                    "expanded_url" => "",
                    "indices_end" => $lastEnd,
                    "indices_start" => $beforeLength,
                    "text" => $text,
                    "type" => "hashtag",
                ];
            } else {
                $beforeLength = mb_strlen(stristr(mb_substr($tweet["quoteObject"]["full_text"], $lastEnd), $value, true)) + $lastEnd;
                $lastEnd = $beforeLength + mb_strlen($value);
                $List[] = [
                    "expanded_url" => str_replace("//http", "http", $Match[1][$order]),
                    "indices_end" => $lastEnd,
                    "indices_start" => $beforeLength,
                    "text" => $value,
                    "type" => "url",
                ];
            }
        }
        $tweet["quoteObject"]["entities"] = $List;
    }
    $tmpImageText = "";
    //寻找媒体
    $tweet["mediaObject"] = [];
    if ($tweet["media"] || ($tweet["cardObject"]["media"]??0) || ($tweet["quoteObject"]["media"]??0)) {
        foreach ($tweetMedia as $queryMedia_single) {
            if ($queryMedia_single["tweet_id"] === $tweet["tweet_id"] || $queryMedia_single["tweet_id"] === $tweet["quote_status"]) {
                $queryMedia_single["cover"] = str_replace(["http://", "https://"], "", $queryMedia_single["cover"]);
                $queryMedia_single["url"] = str_replace(["http://", "https://"], "", $queryMedia_single["url"]);
                //remove it if not exist
                if (!($queryMedia_single["title"]??false)) {
                    unset($queryMedia_single["title"]);
                }
                if (!($queryMedia_single["description"]??false)) {
                    unset($queryMedia_single["description"]);
                }
                if ($queryMedia_single["source"] === "tweets" && $queryMedia_single["tweet_id"] == $tweet["tweet_id"]) {
                    $tmpImageText .= '<img src="https://pbs.twimg.com/media/' . $queryMedia_single["filename"] . '?format=' . $queryMedia_single["extension"] . '&name=orig">';
                    $tweet["mediaObject"][] = $queryMedia_single;
                } elseif ($queryMedia_single["source"] === "cards" || $queryMedia_single["source"] === "quote_status") {
                    $tweet["mediaObject"][] = $queryMedia_single;
                }
            }
        }
        //处理重复
        $tweet["mediaObject"] = mediaObject($tweet["mediaObject"]);
    }

    $tweet["tweet_id_str"] = (string)$tweet["tweet_id"];//Number.MAX_SAFE_INTEGER => 9007199254740991 "9007199254740991".length => 16
    $tweet["uid_str"] = (string)$tweet["uid"];//同上

    return $tweet;
}

function generateData (&$content, &$generateTweetData, string $precheckName = ""): array {
    //generateData
    $generateTweetData->generateTweetObject($content);
    //in_sql_tweets
    $in_sql = $generateTweetData->in_sql_tweet;
    //interactive data
    $in_sql["favorite_count"] = $generateTweetData->interactiveData["favorite_count"];
    $in_sql["retweet_count"] = $generateTweetData->interactiveData["retweet_count"];
    $in_sql["quote_count"] = $generateTweetData->interactiveData["quote_count"];
    //rtl
    $in_sql["rtl"] = $generateTweetData->isRtl;
    //判断是否本人发推
    if ($precheckName === "" || strtolower($in_sql["name"]) === strtolower($precheckName)) {
        //v2_twitter_media
        foreach ($generateTweetData->media as $single_media) {
            //由于前面是无脑合并所以此处需要验证
            if (($single_media["url"] ?? false) && (!str_ends_with($single_media["origin_type"], "photo"))) {
                if ($single_media["source"] == "quote_status") {
                    $generateTweetData->quote["video"] = 1;
                } else {
                    $in_sql["video"] = 1;
                }
            }
        }
        return returnDataForTweets(
            $in_sql,
            true,
            $generateTweetData->tags ? array_values($generateTweetData->tags) : [],
            $generateTweetData->polls??[],
            ($in_sql["card"] && !$in_sql["poll"]) ? $generateTweetData->card : [],
            ($in_sql["card"] && !$in_sql["poll"] && $generateTweetData->cardApp) ? $generateTweetData->cardApp : [],
            $generateTweetData->isQuote ? $generateTweetData->quote : [],
            $generateTweetData->media??[],
        );
    }
    return [];
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
    case "data":
        //v2api for twitter monitor
        $name = $_GET["name"]??'';
        $uid = is_numeric($_GET["uid"]??false)? $_GET["uid"] :0;

        switch ($type) {
            case "accounts":
                $ReturnJson["code"] = 200;
                $ReturnJson["message"] = "OK";
                $ReturnJson["data"] = [];
                break;
            case "userinfo":
                // /data/userinfo/?name={$username} etc.
                // /?mode=data&type=userinfo&name=bang_dream_info
                // /?mode=data&type=userinfo&uid=3009772568

                //TODO errors

                $user_info = $fetch->tw_get_userinfo($name?:$uid?:'', '', true);

                $generateData = (new Tmv2\Info\Info($user_info))->generateMonitorData();

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
                preg_match_all('/<a href="([^"]+)" target="_blank">([^<]+)<\/a>|(?:\s|\p{P}|^)#([_^\s\p{P}]+)/u', $descriptionText, $Match);
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
                $queryArray = [];
                //use $tweet_id to replace $cursor
                //TODO reuse cursor as name
                //TODO online mode in fetch
                //TODO $_GET["refresh"] means top cursor
                //TODO $_GET["display"] means type
                //TODO $_GET["date"] no use
                //TODO $_GET["count"] means count

                //conversation
                $is_conversation = ($_GET["is_status"]??false) && ($_GET["tweet_id"]??false) && is_numeric($_GET["tweet_id"]);
                if ($is_conversation) {
                    $tweets = $fetch->tw_get_conversation($_GET["tweet_id"], [], true);
                } else {
                    $getCount = ($_GET["count"]??$defaultTweetsCount);
                    $queryCount = (is_numeric($getCount) ? (($getCount > 100) ? 100 : (($getCount < 1) ? 1 : $getCount)) : $defaultTweetsCount);
                    //filter:media
                    if ($name) {
                        $queryArray[] = 'from:' . $name;
                        $queryArray = array_merge($queryArray, ['include:nativeretweets', 'include:retweets', 'include:quote', '-filter:replies']);
                    }
                    //$queryString = "from:$name since:2000-01-01 include:nativeretweets include:retweets include:quote";//$name 2000-01-01 include retweets
                    if ($cursor) {
                        $queryArray[] = ((int)($_GET["refresh"]??false) != 0) ? ("since_id:" . $cursor + 1) : ("max_id:" . $cursor - 1);
                    }

                    $tweets = $fetch->tw_get_tweets(join(' ', $queryArray), "", "", $queryCount, true, false, true);
                }

                $generateTweetData = new Tmv2\Core\Core($tweets, $is_conversation, [], false, true);

                if ($generateTweetData->errors[0] !== 0) {
                    $ReturnJson["code"] = $generateTweetData->errors[0];
                    $ReturnJson["message"] = $generateTweetData->errors[1];
                } else {
                    $cursor = $generateTweetData->cursor;
                    $tweetData = [];
                    foreach ($generateTweetData->contents as $order => $content) {
                        //判断非推文//graphql only
                        if ($generateTweetData->isGraphql && str_starts_with($content["entryId"], "cursor")) {
                            continue;
                        } elseif($generateTweetData->isGraphql && $is_conversation && $content["content"]["entryType"] === "TimelineTimelineModule") {
                            foreach ($content["content"]["items"] as $contentItem) {
                                $tmpData = generateData($contentItem, $generateTweetData, $name);
                                if ($tmpData !== [] && $tmpData["tweet_id"]) {
                                    $tweetData[$generateTweetData->in_sql_tweet["tweet_id"]] = $tmpData;
                                }
                            }
                        } else {
                            $tmpData = generateData($content, $generateTweetData, $name);
                            if ($tmpData !== []) {
                                $tweetData[$generateTweetData->in_sql_tweet["tweet_id"]] = $tmpData;
                            }
                        }

                        krsort($tweetData);

                        //resetAll
                        $generateTweetData->resetAll();
                        $generateTweetData->setup();
                    }
                    //data
                    $ReturnJson["code"] = 200;
                    $ReturnJson["message"] = "OK";
                    $ReturnJson["data"] = [
                        "tweets" => $is_conversation ? array_reverse(array_values($tweetData)) : array_values($tweetData),
                        "hasmore" => !$is_conversation && (bool)count($tweetData),
                        "top_tweet_id" => $generateTweetData->max_tweetid,
                        "bottom_tweet_id" => $generateTweetData->min_tweetid,
                    ];
                }

                break;
            case "chart":
                $ReturnJson["code"] = 404;
                $ReturnJson["message"] = "No Record Found";
                break;
            case "hashtag":
            case "cashtag":
            case "search":
                // /data/search/?q={$q}[&tweet_id={$tweet_id}]
                // /data/search/?[...]&advanced=1 //advanced search
                // /?mode=data&type=search&q={$q}
                $advancedSearchMode = ($_GET["advanced"]??0) == 1;
                $cursor = intval($_GET["tweet_id"]??0);
                $getCount = ($_GET["count"]??$defaultTweetsCount);
                $queryCount = (int)(is_numeric($getCount) ? (($getCount > 100) ? 100 : (($getCount < 1) ? 1 : $getCount)) : $defaultTweetsCount) + 1;
                $tweets = [];
                $queryArray = [];
                if ($type === "hashtag") {
                    $queryArray[] = "#" . $_GET["hash"];
                } elseif ($type === "cashtag") {
                    $queryArray[] = "$" . $_GET["hash"];
                } elseif ($advancedSearchMode) {
                    //keywords
                    $keyWord = strtok($_GET["q"]??"", " ");
                    $text_or_mode = ($_GET["text_or_mode"]??0) != 0;
                    $text_not_mode = ($_GET["text_not_mode"]??0) != 0;
                    $order = 0;
                    while($keyWord){
                        if ($order !== 0 && $text_or_mode) {
                            $queryArray[] = 'OR';
                        }
                        $queryArray[] = ($text_not_mode ? '-' : '') . $keyWord . ' ';
                        $order++;
                        $keyWord = strtok(" ");
                    }
                    //users
                    $user = strtok(str_replace("@", "", ($_GET["user"]??"")), " ");
                    $user_and_mode = ($_GET["user_and_mode"]??0) != 0;
                    $user_not_mode = ($_GET["user_not_mode"]??0) != 0;
                    $order = 0;
                    while($user){
                        if ($order !== 0 && $user_and_mode) {
                            $queryArray[] = 'OR';
                        }
                        $queryArray[] = ($text_not_mode ? '-' : '') . 'from:' .$user . ' ';
                        $order++;
                        $user = strtok(" ");
                    }
                    //tweet type
                    $queryArray[] = ($_GET["tweet_type"] === '2') ? 'filter:nativeretweets' : 'include:nativeretweets';
                    $tweet_type = (($_GET["tweet_type"]??0) && $_GET["tweet_type"] > -1 && $_GET["tweet_type"] < 3) ? $_GET["tweet_type"] : 0;
                    if ($_GET["tweet_media"]??0) {
                        $queryArray[] = "filter:media";
                    }
                    //time
                    $queryArray[] = 'since_id:' . (($cursor && (int)($_GET["refresh"]??false) !== 0) ? ($cursor + 1) : (($_GET["start"] && is_numeric($_GET["start"]) && $_GET["start"] > -1) ? (((int)($_GET["start"] * 1000) - 1288834974657) << 22) : '0'));
                    $queryArray[] = (($cursor && (int)($_GET["refresh"]??false) === 0) ? ('max_id:' . $cursor - 1) : (($_GET["end"] && is_numeric($_GET["end"]) && $_GET["end"] > -1) ? ('max_id:' . (((int)($_GET["end"] * 1000) - 1288834974657) << 22)) : ''));
                } elseif (($_GET["q"]??"")) {
                    $queryArray[] = $_GET["q"];
                }

                //$queryString = "from:$name since:2000-01-01 include:nativeretweets include:retweets include:quote";//$name 2000-01-01 include retweets
                $queryArray[] = ($cursor && (int)($_GET["refresh"]??false) !== 0) ? ("since_id:" . $cursor + 1) : ("max_id:" . $cursor - 1);
                $tweets = $fetch->tw_get_tweets(join(' ', $queryArray), "", "", $queryCount, true, false, true);
                $generateTweetData = new Tmv2\Core\Core($tweets, false, [], false, true);

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
                        $tmpData = generateData($content, $generateTweetData, "");
                        if ($tmpData !== []) {
                            $tweetData[$generateTweetData->in_sql_tweet["tweet_id"]] = $tmpData;
                        }

                        krsort($tweetData);

                        //resetAll
                        $generateTweetData->resetAll();
                        $generateTweetData->setup();
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
                            $tr_info = $sssql->select("v2_twitter_tweets", ["translate", "full_text_origin", "translate_source"], [["tweet_id", "=", $tweet_id]]);
                            $tr_info = count($tr_info) ? $tr_info[0] : [];
                            break;
                        case 'profile':
                            $tr_info = $sssql->select("v2_account_info", ["description"], [["uid", "=", $uid]]);//读取个人资料
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