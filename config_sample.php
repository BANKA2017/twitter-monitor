<?php

$servername = "127.0.0.1";
$username = "root";
$password = "password";
$dbname = "twittermonitor";
$translate_source = "Google Translate";

//for Translate
$target_language = "zh-CN";//zh-CN, zh-TW, en-US, etc.//注: 使用微软翻译时简中应填写 zh 而不是 zh-CN//注2: 此处用于无目标语言时翻译使用的默认目标语言

//TODO DELETE //前后端分离
//$front_end_path = dirname(__FILE__) . '/../../twitter';

//default config id
$config_id = 1;

//设置系统语言
//TODO 未来将会自动设置
$default_timezone = "Asia/Shanghai";//默认 Asia/Shanghai

//proxy
//$curl_proxy = "";//"127.0.0.1";
//$curl_proxy_port = 1080;

//for alert push
$token = "";
$push_to = "";//仅用于telegram

//开启的项目
$run_options = [
    "twitter" => [
        "userinfo" => true,//用户基础数据，必须开启
        "count_data_user" => true,//统计信息(用户)
        "local_data" => true,//本机信息
        "tweets" => true,//获取推文，同时会更新cursor
        "tweets_full" => true,//最大限度获取所有信息//使用card等功能的时候需要开启
        "save_tweets_rawjson" => false,//将原始json数据保存到额外文件夹
        "save_raw_media" => false,//TODO 保存媒体文件到本地，包括large和thumb，若为视频则保存视频文件及封面
    ],
];
