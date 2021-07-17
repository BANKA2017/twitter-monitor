<?php
/*
 * twitter monitor v2 ext
 * @banka2017 && KDNETWORK
 */
require(dirname(__FILE__) . '/../../init.php');
use kornrunner\Blurhash\Blurhash;
$sssql = new ssql($servername,$username,$password,$dbname);
$data = [];
do {
    $sqlText = "";
    try {
        //SELECT cover, ANY_VALUE(tweet_id) as tweet_id FROM v2_twitter_media WHERE extension != 'mp4' AND blurhash IS NULL GROUP BY cover
        //SELECT cover FROM v2_twitter_media WHERE extension != 'mp4' AND source = 'tweets' AND blurhash IS NULL GROUP BY cover
        $data = $sssql->multi("SELECT cover, ANY_VALUE(tweet_id), ANY_VALUE(source) as tweet_id FROM v2_twitter_media WHERE extension != 'mp4' AND blurhash IS NULL GROUP BY cover LIMIT 1000;");
    } catch (Exception $e) {
        $data = [];
    }
    $getBlurHash = function(string $file): string {
        $fileBin = '';
        try {
            $fileBin = new sscurl($file);
        } catch (Exception $e) {
            echo $e . "\n";
        }
        if ($fileBin != '') {
            $image = imagecreatefromstring($fileBin);
            $width = imagesx($image);
            $height = imagesy($image);
            
            $pixels = [];
            for ($y = 0; $y < $height; $y = $y += 5) {
                $row = [];
                for ($x = 0; $x < $width; $x = $x += 5) {
                    $index = imagecolorat($image, $x, $y);
                    $colors = imagecolorsforindex($image, $index);
                    $row[] = [$colors['red'], $colors['green'], $colors['blue']];
                }
                $pixels[] = $row;
            }
            $components_x = 4;
            $components_y = 3;
            return Blurhash::encode($pixels, $components_x, $components_y);
        } else {
            return '';
        }
        
    };
    
    foreach ($data as $ord => $cover) {
        $blurhash = $getBlurHash($cover[0] . (($cover[2] == 'tweets' || $cover[2] == 'quote_status') ? ":tiny" : '')) ?: 'deleted';
        echo "$ord: {$blurhash}\n";
        $sqlText .= $sssql->update("v2_twitter_media", ["blurhash" => $blurhash], [["tweet_id", "=", $cover[1]], ["cover", "=", $cover[0]]], true);
    }
    $sssql->multi($sqlText);
} while ($data != []);
