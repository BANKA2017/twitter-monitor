<?php
/*
 * twitter monitor v2 ext blurhash
 * @banka2017 && KDNETWORK
 */
require(dirname(__FILE__) . '/../../init.php');
use kornrunner\Blurhash\Blurhash;
$sssql = new ssql($servername,$username,$password,$dbname);
$data = [];
$count = 0;
do {
    $startTime = microtime(true);
    $sqlText = "START TRANSACTION;";
    try {
        //SELECT cover, ANY_VALUE(tweet_id) as tweet_id FROM v2_twitter_media WHERE extension != 'mp4' AND blurhash IS NULL GROUP BY cover
        //SELECT cover FROM v2_twitter_media WHERE extension != 'mp4' AND source = 'tweets' AND blurhash IS NULL GROUP BY cover
        $data = $sssql->multi("SELECT cover, ANY_VALUE(tweet_id), ANY_VALUE(source) as tweet_id FROM v2_twitter_media WHERE extension != 'mp4' AND blurhash IS NULL GROUP BY cover LIMIT 100;");
    } catch (Exception $e) {
        $data = [];
    }

    $count += count($data);
    foreach ($data as $ord => $cover) {
        $blurhash = getBlurHash($cover[0]) ?: 'deleted';
        echo "$ord: {$blurhash}\n";
        $sqlText .= $sssql->update("v2_twitter_media", ["blurhash" => $blurhash], [["tweet_id", "=", $cover[1]], ["cover", "=", $cover[0]]], true);
    }
    $sssql->multi($sqlText . "COMMIT;");
    echo "blurhash: cost " . microtime(true) - $startTime . " ($count)\n";
} while ($data != []);
