<?php
/*
 * twitter monitor v2 ext
 * @banka2017 && NEST.MOE
 */

use Tmv2\Fetch\Fetch;

require(__DIR__ . '/init.php');

//处理用户投票
//get time
$now = time() - 300;
//创建连接
$sssql = new ssql($servername,$username,$password,$dbname);
$fetch = new Tmv2\Fetch\Fetch();
/* 投票 */
//取出已结束但未处理的
//只取当前时刻5分钟前结束的以防统计出错
$polls = $sssql->select("v2_twitter_polls", ["origin_tweet_id", "poll_order", "uid"], [["end_datetime", "<", $now], ["count", "=", 0], ["checked", "=", 0], ["origin_tweet_id", "!=", 0]], ["origin_tweet_id"])??[];
//select tweetid
$tweetIdList = [];
foreach ($polls as $poll) {
    if (!isset($tweetIdList[$poll["origin_tweet_id"]])) {
        $tweetIdList[$poll["origin_tweet_id"]] = 1;
    } else {
        $tweetIdList[$poll["origin_tweet_id"]]++;
    }
}

//request
$tmp_sql = "START TRANSACTION;";
$token = $fetch->tw_get_token();
$tokenCount = 0;
foreach ($tweetIdList as $tweetid => $count) {
    if ($tokenCount > 950) {
        $token = $fetch->tw_get_token();
        $tokenCount = 0;
    }
    echo "-> {$tweetid} <-\n";
    $getdata = $fetch->tw_get_poll_result($tweetid, $token);
    $tokenCount++;
    if ($getdata["code"] !== 200) {
        echo "ext_getPoll: {$getdata["message"]}\n";
        kd_push("获取{$tweetid}投票结果失败 #errorpoll ");
        $tmp_sql .= $sssql->update("v2_twitter_polls", ["count" => 0, "checked" => 1], [["origin_tweet_id", "=", $tweetid]], true);
    } else {
        foreach ($getdata["data"] as $pollDataOrder => $polldata) {
            $tmp_sql .= $sssql->update("v2_twitter_polls", ["count" => $polldata, "checked" => 1], [["origin_tweet_id", "=", $tweetid], ["poll_order", "=", ($pollDataOrder + 1)]], true);
        }
    }
}
$sssql->multi($tmp_sql . "COMMIT;");

/* 空间 */
//其实只是去取回简介，不取回也没关系
$audioSpace = $sssql->select("v2_twitter_cards", ["url"], [["tweet_id", ">", time2snowflake(microtime(true) * 1000 - 1800000)], ["type", "=", "audiospace"], ["description", "=", '']]);
if (count($audioSpace) > 0) {
    function getUrl (array $arrayWithUrl): string {return $arrayWithUrl["url"];}
    $tmpAudioSpaceLinkList = array_map('getUrl', $audioSpace);
    $tmpAudioSpace = $fetch->tw_get_audio_space_result($tmpAudioSpaceLinkList, $token);
    $tmp_sql = "START TRANSACTION;";
    foreach ($tmpAudioSpace as $index => $audioSpaceItem) {
        $tmp_sql .= $sssql->update("v2_twitter_cards", ["description" => $audioSpaceItem["data"]["audioSpace"]["metadata"]["title"]??NULL], [["url", "=", $tmpAudioSpaceLinkList[$index]]], true);
    }
    $sssql->multi($tmp_sql . "COMMIT;");
}