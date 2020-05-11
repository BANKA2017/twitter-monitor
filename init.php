<?php
/*
 * twitter monitor v2
*/
define('SYSTEM_ROOT', dirname(__FILE__));
//twitter authorization
//此值固定, 出现在https://abs.twimg.com/responsive-web/web/main.22e26814.js
define('TW_AUTHORIZATION', "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA");
//核心文件
require(SYSTEM_ROOT . '/mysql.php');
require(SYSTEM_ROOT . '/scurl.php');
require(SYSTEM_ROOT . '/rss.php');
require(SYSTEM_ROOT . '/config.php');
require(SYSTEM_ROOT . '/GoogleTokenGenerator.php');
require(SYSTEM_ROOT . '/functions.php');

//for cards
$tw_supportCardNameList = [
    "summary",
    "summary_large_image",
    "promo_image_convo",
    "promo_video_convo",
    "promo_website",
    "audio",
    "player",
    "periscope_broadcast",
    "broadcast",
    "promo_video_website",
    "promo_image_convo",
    "promo_video_convo",
    "promo_image_app",
    "app",
    "live_event",
    "moment",
    "poll2choice_text_only",
    "poll3choice_text_only",
    "poll4choice_text_only",
    "poll2choice_image",
    "poll3choice_image",
    "poll4choice_image",
];

//templates
//媒体数据
$tw_media_data_info_template = [
    "tweet_id" => 0, 
    "uid" => 0,
    "cover" => "",
    "url" => "",
    "filename" => "",
    "extension" => "",
    "content_type" => "",
    "bitrate" => 0,
    "origin_type" => "photo",
    "origin_info_width" => 0,
    "origin_info_height" => 0,
];

//本机数据
$tw_server_info = [
    "time" => time(),
    "microtime" => microtime(true),
    "total_users" => 0,
    "total_tweets" => 0,
    "total_req_tweets" => 0,
    "total_throw_tweets" => 0,
    "total_req_times" => 0,
    "total_media_count" => 0,
    "total_time_cost" => 0,
];

$month = date('Ym');
