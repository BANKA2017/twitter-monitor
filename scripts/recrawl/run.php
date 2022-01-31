<?php
/*
 * twitter monitor v2 recrawler
 * @banka2017 && NEST.MOE
 */

use Tmv2\Core\Core;
use Tmv2\Fetch\Fetch;

$startTime = microtime(true);
require(__DIR__ . '/../../init.php');

$reCrawlMode = 'mix';//true;//TODO remote mode
$sssql = new ssql($servername,$username,$password,"tmv2_recrawl");

$id = file_exists(__DIR__ . '/lock.txt') ? file_get_contents(__DIR__ .'/lock.txt') : 0;
$limit = 100;
//select 1000

$globalUserInfo = file_exists(__DIR__ . '/userInfoList.json') ? json_decode(file_get_contents(__DIR__ . '/userInfoList.json'), true) : [];
if ($globalUserInfo === []) {
    foreach($sssql->multi("SELECT uid, name, display_name FROM v2_account_info LIMIT 999;", true) as $userData) {
        $globalUserInfo[$userData["uid"]] = ["name" => $userData["name"], "display_name" => $userData["display_name"]];
    }
}
$countData = ["count" => 0, "cached" => 0];
//SELECT v2_twitter_tweets_origin.id, v2_twitter_tweets_origin.tweet_id, v2_twitter_tweets_origin.uid, v2_twitter_tweets_origin.name, v2_twitter_tweets_origin.display_name, v2_twitter_tweets_origin.retweet_from, v2_twitter_tweets_origin.retweet_from_name, v2_twitter_tweets_origin.hidden, v2_twitter_quote_origin.name as quote_name, v2_twitter_quote_origin.display_name as quote_display_name, v2_twitter_tweets.tweet_id as recrawl_tweet_id FROM `v2_twitter_tweets_origin` LEFT JOIN v2_twitter_quote_origin ON v2_twitter_tweets_origin.quote_status = v2_twitter_quote_origin.tweet_id LEFT JOIN v2_twitter_tweets ON v2_twitter_tweets_origin.tweet_id = v2_twitter_tweets.tweet_id WHERE v2_twitter_tweets.tweet_id IS NULL ORDER BY v2_twitter_tweets_origin.id ASC LIMIT 10;
//$tmpData = json_decode(file_get_contents(__DIR__ . '/recrawl_list.json'), true);
//$id = file_exists(__DIR__ . '/lock_offset.txt') ? file_get_contents(__DIR__ .'/lock_offset.txt') : 0;
while ($tmpData = $sssql->multi("SELECT v2_twitter_tweets_origin.id, v2_twitter_tweets_origin.tweet_id, v2_twitter_tweets_origin.uid, v2_twitter_tweets_origin.name, v2_twitter_tweets_origin.display_name, v2_twitter_tweets_origin.retweet_from, v2_twitter_tweets_origin.retweet_from_name, v2_twitter_tweets_origin.hidden, v2_twitter_quote_origin.name as quote_name, v2_twitter_quote_origin.display_name as quote_display_name FROM `v2_twitter_tweets_origin` LEFT JOIN v2_twitter_quote_origin ON v2_twitter_tweets_origin.quote_status = v2_twitter_quote_origin.tweet_id WHERE v2_twitter_tweets_origin.id > $id ORDER BY v2_twitter_tweets_origin.id ASC LIMIT $limit;", TRUE)) {

    $insert = [
        "v2_twitter_media" => [],
        "v2_twitter_entities" => [],
        "v2_twitter_polls" => [],
        "v2_twitter_cards" => [],
        "v2_twitter_card_app" => [],
        "v2_twitter_quote" => [],
        "v2_twitter_tweets" => [],
    ];

    foreach ($tmpData as $offset => $data) {
        //remove it
        //if ($offset >= $id) {
        //    continue;
        //}
        //var_dump($data);
        //die();
        //$insert = [
        //    "v2_twitter_media" => [],
        //    "v2_twitter_entities" => [],
        //    "v2_twitter_polls" => [],
        //    "v2_twitter_cards" => [],
        //    "v2_twitter_card_app" => [],
        //    "v2_twitter_quote" => [],
        //    "v2_twitter_tweets" => [],
        //];
        //var_dump($data);
        //get real data
        if (file_exists(__DIR__ . "/../../savetweets/{$data["tweet_id"]}.json")) {
            $originData = json_decode(file_get_contents(__DIR__ . "/../../savetweets/{$data["tweet_id"]}.json"), true);
        } else {
            $data["onlineTweets"] = Fetch::tw_get_conversation($data["tweet_id"])["globalObjects"]["tweets"]??[];
            $originData = $data["onlineTweets"][$data["tweet_id"]]??[];
            if ($originData === []) {
                kd_push("recrawler: empty tweet info {$data["id"]} - {$data["tweet_id"]} - {$data["display_name"]} (@{$data["name"]}) #empty_recrawl ");
                continue;
            } else {
                $data["online"] = true;
                file_put_contents(__DIR__ . "/../../savetweets/{$data["tweet_id"]}.json", json_encode($originData, JSON_UNESCAPED_UNICODE));
            }

        }
        $data["globalUserInfo"] = $globalUserInfo;
        //var_dump([[], isset($originData["content"]["itemContent"]["tweet"]["rest_id"]), '', $data["hidden"], false]);
        //die();
        $core = new Core([], isset($originData["content"]["itemContent"]["tweet"]["rest_id"]), $data, $data["hidden"], false);
        $core->generateTweetObject($originData);
        //in_sql_tweets
        $in_sql = $core->in_sql_tweet;
        //card
        if ($in_sql["card"] && !$core->cardMessage["supported"]) {
            //主动发现卡片
            //新增加卡片的研究，不然最后麻烦的只有自己
            echo "未适配的卡片 {$core->cardMessage["card_name"]}\n";
            kd_push($core->cardMessage["message"]);//kdpush
        }
        //v2_twitter_media
        if (count($core->media)) {
            foreach ($core->media as $single_media) {
                //由于前面是无脑合并所以此处需要验证
                if ($single_media["url"]??false) {
                    if (!str_ends_with($single_media["origin_type"], "photo")) {
                        if ($single_media["source"] == "quote_status") {
                            $core->quote["video"] = 1;
                        } else {
                            $in_sql["video"] = 1;
                        }
                    }
                    $tw_server_info["total_media_count"]++;
                }
            }
            $insert["v2_twitter_media"] = array_merge($insert["v2_twitter_media"], $core->media);
        }
        //v2_twitter_entities
        foreach ($core->tags as $tag) {
            $insert["v2_twitter_entities"][] = array_merge($tag, ["hidden" => $in_sql["hidden"], "timestamp" => $in_sql["time"]]);
        }
        //v2_twitter_polls
        if ($in_sql["poll"]) {
            foreach ($core->polls as $in_sql_poll) {
                $insert["v2_twitter_polls"][] = array_merge($in_sql_poll, ["origin_tweet_id" => $in_sql["origin_tweet_id"]]);
            }
        }
        //v2_twitter_cards
        if ($in_sql["card"] && !$in_sql["poll"]) {
            $insert["v2_twitter_cards"][] = $core->card;
            if ($core->cardApp) {
                $insert["v2_twitter_card_app"] = array_merge($insert["v2_twitter_card_app"], $core->cardApp);
            }
        }
        //v2_twitter_quote
        if ($core->isQuote) {
            $countData["count"]++;
            if (!isset($globalUserInfo[$core->quote["uid"]]) && $core->quote["name"]) {
                $globalUserInfo[$core->quote["uid"]] = ["name" => $core->quote["name"], "display_name" => $core->quote["display_name"]];
                file_put_contents(__DIR__ .'/userInfoList.json', json_encode($globalUserInfo, JSON_UNESCAPED_UNICODE));
            } else {
                $countData["cached"]++;
            }
            $insert["v2_twitter_quote"][] = $core->quote;
        }
        //v2_twitter_tweets
        $insert["v2_twitter_tweets"][] = $in_sql;
        //var_dump($insert);
        //die();
        echo "tmv2_recrawler: {$data["id"]} - {$data["tweet_id"]} - {$data["display_name"]} (@{$data["name"]})\n";
        $id = $data["id"];


        //$tmp_sql = "START TRANSACTION;";
        //foreach ($insert as $tableName => $insertItem) {
        //    $tmp_sql .= $sssql->insert($tableName, array_map(function($n) {ksort($n);return $n;}, $insertItem), true, [], true);
        //}
        //$sssql->multi($tmp_sql . "COMMIT;");
        //file_put_contents(__DIR__ . '/lock_offset.txt', $id);
    }
    $tmp_sql = "START TRANSACTION;";
    foreach ($insert as $tableName => $insertItem) {
        $tmp_sql .= $sssql->insert($tableName, array_map(function($n) {ksort($n);return $n;}, $insertItem), true, [], true);
    }
    $sssql->multi($tmp_sql . "COMMIT;");
    //file_put_contents(__DIR__ . '/lock_offset.txt', $id);
    file_put_contents(__DIR__ . '/lock.txt', $id);
    //die();
}
echo "count data count {$countData["cached"]} / {$countData["count"]}\nglobalUserInfo length " . count($globalUserInfo) . "\ncost " . microtime(true) - $startTime . "\n";
