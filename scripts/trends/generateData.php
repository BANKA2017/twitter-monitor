<?php
/*
 * twitter monitor v2 lovelive trends
 * @banka2017 && NEST.MOE
 */

//GMT+9 Asia/Tokyo, Sunday is the first day
require(dirname(__FILE__) . '/../../init.php');

//to
$to = "./trends/";
$pushText = "";
date_default_timezone_set('Asia/Tokyo');
$sssql = new ssql($servername,$username,$password,$dbname);
//if ($range["end"] - $range["start"] < 604799) {
//    die("lovelive_trends: Not now\n");
//    //kd_push()
//}

$dataTemplate = [
    "name" => "",//id
    "display_name" => "",//中文名称标记
    "display_name_list" => [],//用过的名字
    "project" => "LoveLive!",
    "uid" => 0,//uid
    "tweets_daily" => [],
    "followers" => [],//["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
];

$memberList = json_decode(file_get_contents(__DIR__ . "/account_list.json"), true);
//$generateData = ["data" => [], "range" => $range ];
//$guestLatestTwitterDataId = $sssql->multi("SELECT id FROM `twitter_data` ORDER BY id DESC LIMIT 1;", true)[0]["id"] - 1500000;
foreach ($memberList as $member) {
    $startTime = microtime(true);

    $saveData = file_exists($to . '/' . $member["name"] . '.json') ? json_decode(file_get_contents($to . '/' . $member["name"] . '.json'), true) : ["data" => $dataTemplate, "range" => ["start" => 0, "end" => 0]];
    $range = ["start" => $saveData["range"]["end"], "end" => time()];
    echo $member["display_name"] . "\n";
    $userData = $saveData["data"];
    //自带数据
    $userData["display_name"] = $member["display_name"];
    $userData["name"] = $member["name"];
    $userData["uid"] = $member["uid"];
    $userData["project"] = $member["project"];
    //followers && display_name_list
    $sqlFollowersData = $sssql->select("twitter_data", ["display_name", "followers", "statuses_count", "timestamp"], [["id", ">", 0], ["uid", "=", $userData["uid"]], ["timestamp", ">=", $range["start"]], ["timestamp", "<=", $range["end"]]]);
    foreach ($sqlFollowersData as $sqlFollowersDataP) {
        //display_name_list
        if (!in_array($sqlFollowersDataP["display_name"], $userData["display_name_list"])) {
            $userData["display_name_list"][] = $sqlFollowersDataP["display_name"];
        }
        //followers
        //dayRange
        $dayRange = date("Ymd", $sqlFollowersDataP["timestamp"]);

        if (!isset($userData["followers"][$dayRange])) {
            $userData["followers"][$dayRange] = [];
        }
        if (($userData["followers"][$dayRange]["start"]??0) === 0) {
            $userData["followers"][$dayRange]["start"] = $sqlFollowersDataP["followers"];
            $userData["followers"][$dayRange]["highest"] =  $sqlFollowersDataP["followers"];
            $userData["followers"][$dayRange]["lowest"] =  $sqlFollowersDataP["followers"];
        }
        $userData["followers"][$dayRange]["end"] = $sqlFollowersDataP["followers"];
        if ($sqlFollowersDataP["followers"] > $userData["followers"][$dayRange]["highest"]) {
            $userData["followers"][$dayRange]["highest"] =  $sqlFollowersDataP["followers"];
        }
        if ($sqlFollowersDataP["followers"] < ($userData["followers"][$dayRange]["lowest"]??0)) {
            $userData["followers"][$dayRange]["lowest"] =  $sqlFollowersDataP["followers"];
        }
    }
    //tweets && tweetsCount
    $tweetsDataTemplate = [
        "hour_count" => array_fill(0, 24, 0),
        "media" => 0,//[0, 0, 0, 0],
        "video_count" => 0,
        "count" => 0,
        "origin" => 0,
        "retweet" => 0,
        "quote_status_count" => 0,
        "card" => [],
        "link" => [],
        "tag" => [],
    ];
    $sqlTweetsData = $sssql->select("v2_twitter_tweets", ["tweet_id", "card", "quote_status", "media", "video", "retweet_from", "time"], [["time", ">=", $range["start"]], ["time", "<=", $range["end"]], ["uid", "=", $userData["uid"]]]);
    foreach ($sqlTweetsData as $sqlTweetsDataP) {

        $dayRange = date("Ymd", $sqlTweetsDataP["time"]);

        if (!isset($userData["tweets_daily"][$dayRange])) {
            $userData["tweets_daily"][$dayRange] = $tweetsDataTemplate;
        }

        $userData["tweets_daily"][$dayRange]["count"] += 1;
        $userData["tweets_daily"][$dayRange]["hour_count"][date('G', $sqlTweetsDataP["time"])] += 1;
        if ($sqlTweetsDataP["retweet_from"] != "") {
            $userData["tweets_daily"][$dayRange]["retweet"] += 1;
        } else {
            $userData["tweets_daily"][$dayRange]["origin"] += 1;
        }
        if ($sqlTweetsDataP["card"] != "") {
            if (isset($userData["tweets_daily"][$dayRange]["card"][$sqlTweetsDataP["card"]])) {
                $userData["tweets_daily"][$dayRange]["card"][$sqlTweetsDataP["card"]] += 1;
            } else {
                $userData["tweets_daily"][$dayRange]["card"][$sqlTweetsDataP["card"]] = 1;
            }
        }
        if ($sqlTweetsDataP["quote_status"] != 0) {
            $userData["tweets_daily"][$dayRange]["quote_status_count"] += 1;
        }
        if ($sqlTweetsDataP["media"] != 0 && $sqlTweetsDataP["retweet_from"] != "") {
            //$userData["tweets_daily"][$dayRange]["media"][$sssql->multi("SELECT COUNT(id) as count from `v2_twitter_media` WHERE tweet_id = '{$sqlTweetsDataP["tweet_id"]}' AND uid = '{$userData["uid"]}';")[0][0]] += 1;
            $userData["tweets_daily"][$dayRange]["media"] += 1;
            if ($sqlTweetsDataP["video"] == 1) {
                $userData["tweets_daily"][$dayRange]["video_count"] += 1;
            }
        }
    }

    //entities
    $sqlEntitiesData = $sssql->multi("SELECT `type`, `text`, `expanded_url`, `timestamp` FROM `v2_twitter_entities` WHERE `timestamp` >= '{$range["start"]}' AND `timestamp` <= '{$range["end"]}' AND `uid` = '{$userData["uid"]}' AND `type` IN ('hashtag', 'symbol', 'url')" , true);

    $tmpTag = [];
    $tmpLink = [];
    $cursorDate = 0;

    foreach ($sqlEntitiesData as $singleEntitiesData) {

        $dayRange = date("Ymd", $singleEntitiesData["timestamp"]);

        if ($dayRange > $cursorDate) {
            arsort($tmpTag);
            arsort($tmpLink);
            $userData["tweets_daily"][$dayRange]["tag"] = $tmpTag;
            $userData["tweets_daily"][$dayRange]["link"] = $tmpLink;
            $tmpTag = [];
            $tmpLink = [];
            $cursorDate = $dayRange;
        }

        switch ($singleEntitiesData["type"]) {
            //hashtag && cashtag
            case "hashtag":
            case "symbol":
                if (isset($tmpTag[$singleEntitiesData["text"]])) {
                    $tmpTag[$singleEntitiesData["text"]] += 1;
                } else {
                    $tmpTag[$singleEntitiesData["text"]] = 1;
                }
                break;
            //links
            case "url":
                $tmpExpandedUrl = preg_replace("/(http|https):\/\/([^\/]+).*/", "$2", $singleEntitiesData["expanded_url"]);
                if (isset($tmpLink[$tmpExpandedUrl])) {
                    $tmpLink[$tmpExpandedUrl] += 1;
                } else {
                    $tmpLink[$tmpExpandedUrl] = 1;
                }
                break;
        }

    }

    if ($sqlEntitiesData) {
        //last day
        arsort($tmpTag);
        arsort($tmpLink);
        $userData["tweets_daily"][$dayRange]["tag"] = array_merge($userData["tweets_daily"][$dayRange]["tag"], $tmpTag);
        $userData["tweets_daily"][$dayRange]["link"] = array_merge($userData["tweets_daily"][$dayRange]["link"], $tmpLink);
    }


    $saveData["data"] = $userData;
    $saveData["range"] = ["start" => $range["start"], "end" => $range["end"]];
    file_put_contents($to . '/' . $userData["name"] . '.json', json_encode($saveData, JSON_UNESCAPED_UNICODE));//data
    $pushText .= "TM Trends: {$member["display_name"]} cost: " . microtime(true) - $startTime . "\n";
    //kd_push("LoveLive! Trends: {$member["display_name"]} cost: " . microtime(true) - $startTime . "\n", $token, $push_to);
    echo "cost: " . microtime(true) - $startTime . "\n";
}
//kd_push($pushText . "#tm_trends", $token, $push_to);