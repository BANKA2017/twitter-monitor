<?php
/*
 * twitter monitor v2 lovelive trends
 * @banka2017 && KDNETWORK
 */
//only Aqours, Nijigasaki High School Idol Club and Liella, no μ's
//official account > persional account
//GMT+9 Asia/Tokyo, Sunday is the first day
//Thanks https://space.bilibili.com/210961054/article
require(dirname(__FILE__) . '/../../init.php');

//to 
$to = "./";
$pushText = "";
date_default_timezone_set('Asia/Tokyo');
$sssql = new ssql($servername,$username,$password,$dbname);
$range = ["start" => strtotime("last Sunday"), "end" => strtotime("Today") - 1];
if ($range["end"] - $range["start"] < 604799) {
    die("lovelive_trends: Not now\n");
    //kd_push()
}

$dataTemplate = [
    "name" => "",//id
    "name_cn" => "",//中文名称标记
    "display_name" => [],//用过的名字
    "project" => "LoveLive!",
    "team" => "Aqours",
    "color" => "",
    "uid" => 0,//uid
    "tweets" => [
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
    ],
    "followers" => [
        ["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
        ["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
        ["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
        ["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
        ["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
        ["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
        ["start" => 0,"end" => 0,"highest" => 0,"lowest" => 0,],
    ],
];

$menberList = json_decode(file_get_contents(__DIR__ . "/userlist.json"), true);
$generateData = ["data" => [], "range" => $range ];
$guestLatestTwitterDataId = $sssql->multi("SELECT id FROM `twitter_data` ORDER BY id DESC LIMIT 1;", true)[0]["id"] - 1500000;
foreach ($menberList as $menber) {
    $startTime = microtime(true);
    echo $menber["name_cn"] . "\n";
    $userData = $dataTemplate;
    //自带数据
    $userData["name_cn"] = $menber["name_cn"];
    $userData["name"] = $menber["name"];
    $userData["uid"] = $menber["uid"];
    $userData["team"] = $menber["team"];
    $userData["color"] = $menber["color"];
    //followers && display_name
    $sqlFollowersData = $sssql->load("twitter_data", ["display_name", "followers", "statuses_count", "timestamp"], [["id", ">", $guestLatestTwitterDataId], ["uid", "=", $userData["uid"]], ["timestamp", ">=", $range["start"]], ["timestamp", "<=", $range["end"]]]);
    foreach ($sqlFollowersData as $sqlFollowersDataP) {
        //display_name
        if (!in_array($sqlFollowersDataP["display_name"], $userData["display_name"])) {
            $userData["display_name"][] = $sqlFollowersDataP["display_name"];
        }
        //followers
        //dayRange
        $dayRange = date("w", $sqlFollowersDataP["timestamp"]);

        if ($userData["followers"][$dayRange]["start"] === 0) {
            $userData["followers"][$dayRange]["start"] = $sqlFollowersDataP["followers"];
            $userData["followers"][$dayRange]["highest"] =  $sqlFollowersDataP["followers"];
            $userData["followers"][$dayRange]["lowest"] =  $sqlFollowersDataP["followers"];
        }
        $userData["followers"][$dayRange]["end"] = $sqlFollowersDataP["followers"];
        if ($sqlFollowersDataP["followers"] > $userData["followers"][$dayRange]["highest"]) {
            $userData["followers"][$dayRange]["highest"] =  $sqlFollowersDataP["followers"];
        }
        if ($sqlFollowersDataP["followers"] < $userData["followers"][$dayRange]["lowest"]) {
            $userData["followers"][$dayRange]["lowest"] =  $sqlFollowersDataP["followers"];
        }
    }
    //tweets && tweetsCount
    $sqlTweetsData = $sssql->load("v2_twitter_tweets", ["tweet_id", "card", "quote_status", "media", "video", "retweet_from", "time"], [["time", ">=", $range["start"]], ["time", "<=", $range["end"]], ["uid", "=", $userData["uid"]]]);
    foreach ($sqlTweetsData as $sqlTweetsDataP) {
        $userData["tweets"]["count"] += 1;
        $userData["tweets"]["hour_count"][date('G', $sqlTweetsDataP["time"])] += 1;
        if ($sqlTweetsDataP["retweet_from"] != "") {
            $userData["tweets"]["retweet"] += 1;
        } else {
            $userData["tweets"]["origin"] += 1;
        }
        if ($sqlTweetsDataP["card"] != "") {
            if (isset($userData["tweets"]["card"][$sqlTweetsDataP["card"]])) {
                $userData["tweets"]["card"][$sqlTweetsDataP["card"]] += 1;
            } else {
                $userData["tweets"]["card"][$sqlTweetsDataP["card"]] = 1;
            }
        }
        if ($sqlTweetsDataP["quote_status"] != 0) {
            $userData["tweets"]["quote_status_count"] += 1;
        }
        if ($sqlTweetsDataP["media"] != 0 && $sqlTweetsDataP["retweet_from"] != "") {
            //$userData["tweets"]["media"][$sssql->multi("SELECT COUNT(id) as count from `v2_twitter_media` WHERE tweet_id = '{$sqlTweetsDataP["tweet_id"]}' AND uid = '{$userData["uid"]}';")[0][0]] += 1;
            $userData["tweets"]["media"] += 1;
            if ($sqlTweetsDataP["video"] == 1) {
                $userData["tweets"]["video_count"] += 1;
            }
        }
    }

    //entities
    $sqlEntitiesData = $sssql->multi("SELECT `type`, `text`, `expanded_url` FROM `v2_twitter_entities` WHERE `timestamp` >= '{$range["start"]}' AND `timestamp` <= '{$range["end"]}' AND `uid` = '{$userData["uid"]}' AND `type` IN ('hashtag', 'url')" , true);

    $tmpTag = [];
    $tmpLink = [];

    foreach ($sqlEntitiesData as $singleEntitiesData) {
        switch ($singleEntitiesData["type"]) {
            //hashtag and no cashtag// && cashtag
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
    arsort($tmpTag);
    arsort($tmpLink);
    $userData["tweets"]["tag"] = $tmpTag;
    $userData["tweets"]["link"] = $tmpLink;

    $generateData["data"][] = $userData;
    file_put_contents($to . '/' . date("Y-m-d", $range["start"]) . '.json', json_encode($generateData, JSON_UNESCAPED_UNICODE));//data
    $pushText .= "LoveLive! Trends: {$menber["name_cn"]} cost: " . microtime(true) - $startTime . "\n";
    //kd_push("LoveLive! Trends: {$menber["name_cn"]} cost: " . microtime(true) - $startTime . "\n", $token, $push_to);
    echo "cost: " . microtime(true) - $startTime . "\n";
}
$dateInfo = file_exists($to . '/date.json') ? json_decode(file_get_contents($to . '/date.json'), true) : [];
file_put_contents($to . '/date.json', json_encode(in_array(date("Y-m-d", $range["start"]), $dateInfo) ? $dateInfo : array_merge([date("Y-m-d", $range["start"])], $dateInfo), JSON_UNESCAPED_UNICODE));//data
kd_push($pushText . "#lovelive_trends", $token, $push_to);
