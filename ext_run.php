<?php
/*
 * twitter monitor v2 ext
 * @banka2017 && KDNETWORK
 */
require(__DIR__ . '/init.php');

//处理用户投票
//get time
$now = time() - 300;
//创建连接
$sssql = new ssql($servername,$username,$password,$dbname);
//取出已结束但未处理的
//只取当前时刻5分钟前结束的以防统计出错
$polls = $sssql->load("v2_twitter_polls", ["origin_tweet_id", "poll_order"], [["end_datetime", "<", $now], ["count", "=", 0], ["checked", "=", 0], ["origin_tweet_id", "!=", 0]], ["origin_tweet_id"])??[];
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
foreach ($tweetIdList as $tweetid => $count) {
    $getdata = tw_get_poll_result($tweetid, $count);
    if ($getdata["code"]) {
        echo "ext_getPoll: {$getdata["message"]}\n";
        kd_push("获取{$tweetid}投票结果失败 #errorpoll ", $token, $push_to);
        $tmp_sql .= $sssql->update("v2_twitter_polls", ["count" => 0, "checked" => 1], [["origin_tweet_id", "=", $tweetid]], true);
    } else {
        foreach ($getdata["data"] as $pollDataOrder => $polldata) {
            $tmp_sql .= $sssql->update("v2_twitter_polls", ["count" => $polldata, "checked" => 1], [["origin_tweet_id", "=", $tweetid], ["poll_order", "=", ($pollDataOrder + 1)]], true);
        }
    }
}
$sssql->multi($tmp_sql . "COMMIT;");