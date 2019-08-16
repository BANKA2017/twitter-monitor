<?php

//ini_set('display_errors',1);

ob_implicit_flush();

date_default_timezone_set('Asia/Shanghai');
require(dirname(__FILE__) . '/mysql.php');
require(dirname(__FILE__) . '/scurl.php');
require(dirname(__FILE__) . '/config.php');
require(dirname(__FILE__) . '/translate.php');

//创建连接
$sssql = new ssql($servername,$username,$password,$dbname);

//合并媒体镜像
if (str_replace(dirname(__FILE__) . '/api.php', '', str_replace($_SERVER["SCRIPT_NAME"], '', $_SERVER["SCRIPT_FILENAME"]) . preg_replace('/https:[\/]{1,}(.*?)\.(mp4|(jpg|png)(:large|:medium|:(240|360)|)).*/', '', $_SERVER["REQUEST_URI"])) == dirname(__FILE__) . "/media/") {
    $real_query = str_replace(dirname(__FILE__) . '/api.php', '', str_replace($_SERVER["SCRIPT_NAME"], '', $_SERVER["SCRIPT_FILENAME"]) . $_SERVER["REQUEST_URI"]);
    preg_match('/https:[\/]{1,}(.*?)\.(mp4|banner|jpg|png)(:large|:medium|:(240|360)|)/', $real_query, $url_);
    if(!preg_replace('/.*\/https:[\/]{1,}(.*?)\.(mp4|(jpg|png)(:large|:medium|:(240|360)|))/', '', $real_query)){
        //先判断类型
        $url = $url_[1];
        $type = $url_[2];
        $large = !$url_[3] ?: !isset($url_[4]) ? $url_[3] : "?name={$url_[4]}x{$url_[4]}";
        if($url && $type){
            $token_ = [];
            $token__ = strtok($url, "/");
            while($token__!==false){
    			$token_[]=$token__;
    			$token__=strtok("/");
    		}
            switch($type){
                //mp4救不了救不了
                case "mp4":
                    if(count($sssql -> load("twitter_tweets", ["id"], [["media", "LIKE%%", $token_[count($token_) - 1]]]))){
                        
                        //default
                        if(!$cloudflare_workers_link){
                            header("content-type: video/mp4");
                            echo new sscurl("https://{$url}.mp4");
                        }else{
                            header("Location: " . str_replace("video.twimg.com", $cloudflare_workers_link, $url . ".mp4"));
                        }
                    }
                    break;
                case "jpg":
                    if(count($sssql -> load("account_info", ["id"], [["header", "=", preg_replace('/pbs\.twimg\.com\/profile_images\/([\w\/\-]+)_400x400/', '$1', $url) . ".jpg"]])) || count($sssql -> load("twitter_tweets", ["id"], [["media", "LIKE%%", $token_[count($token_) - 1]]]))){
                        header("content-type: image/jpeg");
                        echo new sscurl("https://{$url}.jpg{$large}");
                    }else{
                        header("HTTP/1.0 404 Not Found");
                    }
                    break;
                case "banner":
                    if(count($sssql -> load("account_info", ["id"], [["uid", "=", $token_[count($token_) - 2]], ["banner", "=", $token_[count($token_) - 1]]]))){
                        header("content-type: image/jpeg");
                        echo new sscurl("https://{$url}");
                    }else{
                        header("HTTP/1.0 404 Not Found");
                    }
                    break;
                case "png":
                    if(count($sssql -> load("account_info", ["id"], [["header", "=", preg_replace('/pbs\.twimg\.com\/profile_images\/([\w\/\-]+)_400x400/', '$1', $url) . ".png"]])) || count($sssql -> load("twitter_tweets", ["id"], [["media", "LIKE%%", $token_[count($token_) - 1]]]))){
                        header("content-type: image/png");
                        echo new sscurl("https://{$url}.png{$large}");
                    }else{
                        header("HTTP/1.0 404 Not Found");
                    }
                    break;
                default:
                    header("HTTP/1.0 404 Not Found");
            }
        }else{
            header("HTTP/1.0 404 Not Found");
        }
    }else{
        header("HTTP/1.0 404 Not Found");
    }
} else {
    //判断账户
    $name = ($_GET["name"] ?? false) && count($sssql -> load("account_info", ["id"], [["name", "=", $_GET["name"]]])) ? $name = $_GET["name"] : "bang_dream_info";
    header("content-type: text/json");
    /*
    errno 一览
    0 - OK
    1 - No record
    403 - Forbidden
    404 - Unknow request
    */
    $arr = ["error" => 404, "message" => "Unknow request", "data" => null];
    if($_GET["m"] ?? false){
        switch($_GET["m"]){
            //获取个人信息页
            case "info":
                $info = $sssql -> load("account_info", ["uid", "name", "display_name", "header", "banner", "following", "followers", "description", "lang", "statuses_count", "top"], [["name", "=", $name]]);
                if(!count($info)){
                    $arr["error"] = 1;
                    $arr["message"] = "No record";
                }else{
                    $arr["error"] = 0;
                    $arr["message"] = "OK";
                    $arr["data"] = $info[0];
                    $arr["data"]["header"] = preg_replace('/([\w\/\-]+)\.([\w]+)/', '$1_400x400.$2', $arr["data"]["header"]);
                    $arr["data"]["top"] = $arr["data"]["top"] ? $arr["data"]["top"] : 0;
                }
                break;
                
            //获取11条推文
            case "tweets":
                //默认配置
                $get_arr = [[
                                "name",
                                "=",
                                $name
                            ],[
                                "retweet_from",
                                "=",
                                null
                            ],[
                                "tweet_id",
                                ">",
                                0
                            ]];
                $get_top = true;
                $display_all = false;
                if (isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) {
                    if (isset($_GET["display"]) && $_GET["display"] != "all") {
                        $get_top = false;
                        switch ($_GET["display"]) {
                            case "self":
                                $get_arr[2][1] = (isset($_GET["type"]) && strtolower($_GET["type"]) == 'refresh') ? ">" : "<";
                                $get_arr[2][2] = $_GET["tweet_id"];
                                break;
                            case "retweet":
                                $get_arr[2][1] = (isset($_GET["type"]) && strtolower($_GET["type"]) == 'refresh') ? ">" : "<";
                                $get_arr[2][2] = $_GET["tweet_id"];
                                $get_arr[1][1] = "!=";
                                break;
                            case "media":
                                $get_arr[2][1] = (isset($_GET["type"]) && strtolower($_GET["type"]) == 'refresh') ? ">" : "<";
                                $get_arr[2][2] = $_GET["tweet_id"];
                                array_splice($get_arr, 1, 1);
                                $get_arr[] = ["media", "!=", "[]"];
                                break;
                        }
                    } else {
                        $display_all = true;
                        $get_arr[2][1] = (isset($_GET["type"]) && strtolower($_GET["type"]) == 'refresh') ? ">" : "<";
                        $get_arr[2][2] = $_GET["tweet_id"];
                        array_splice($get_arr, 1, 1);
                    }
                }elseif(isset($_GET["status"]) && is_numeric($_GET["status"])){
                    $get_top = false;
                    array_splice($get_arr, 1);
                    $get_arr[] = ["tweet_id", "=", $_GET["status"]];
                }else{
                    if (isset($_GET["display"]) && $_GET["display"] != "all") {
                        $get_top = false;
                        switch ($_GET["display"]) {
                            case "self":
                                array_pop($get_arr);
                                break;
                            case "retweet":
                                array_pop($get_arr);
                                $get_arr[1][1] = "!=";
                                break;
                            case "media":
                                array_splice($get_arr, 1);
                                $get_arr[] = ["media", "!=", "[]"];
                                break;
                        }
                    } else {
                        array_splice($get_arr, 1);
                    }
                }
                if(isset($_GET["date"]) && $_GET["date"] > 0){
                    $get_top = false;
                    $get_arr[] = ["time", ">=", $_GET["date"]];
                    $get_arr[] = ["time", "<", $_GET["date"] + 86400];
                }
                $tweets = $sssql -> load("twitter_tweets", ["tweet_id", "name", "display_name", "media", "full_text", "full_text_origin", "retweet_from", "time", "translate"], $get_arr, ["tweet_id"], 11);
                $arr["error"] = 0;
                $arr["message"] = "OK";
                $arr["data"] = returnData($tweets, 11);
                if($get_top){
                    $info = $sssql -> load("account_info", ["top"], [["name", "=", $name]]);
                    if(count($info)){
                        //去除置顶
                        foreach($arr["data"]["data"] as $key => $data){
                            if($data["tweet_id"] == $info[0]["top"]){
                                $arr["data"]["data"][$key] = ["full_text" => "此处推文已置顶", "type" => "msg"];
                            }
                        }
                        if(!$display_all){
                            $top_tweet = ($sssql -> load("twitter_tweets", ["tweet_id", "name", "display_name", "media", "full_text", "full_text_origin", "retweet_from", "time", "translate"], [["tweet_id", "=", $info[0]["top"]]], ["tweet_id"], 1));
                            if(count($top_tweet)){
                                $top_tweet = $top_tweet[0];
                                $top_tweet["translate"] = "";
                                $top_tweet["powerby"] = "";
                                $top_tweet["type"] = "tweet";
                                $top_tweet["media"] = json_decode($top_tweet["media"], true);
                                //寻找视频
                                $top_tweet["hasvideo"] = false;
                                foreach($top_tweet["media"] as $single_media){
                                    if($single_media["origin"]["origin_type"] != "photo"){
                                        if($single_media["origin"]["origin_type"] == "animated_gif"){
                                            $tweets[$x]["hasgif"] = true;
                                        }
                                        $top_tweet["hasvideo"] = true;
                                        break;
                                    }
                                }
                                $top_tweet["time"] = date('Y-n-j G:i:s', $top_tweet["time"]);
                                $top_tweet["full_text_origin"] = preg_replace('/https:\/\/t.co\/[\w]+/', '', $top_tweet["full_text_origin"]);
                                $arr["data"]["data"] = array_merge([$top_tweet], $arr["data"]["data"]);
                            }
                        }
                        
                    }
                }
                break;
            case "tag":
                if (isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) {
                    $get_tweet_id = $sssql -> load("twitter_tags", ["tweet_id"], [["tag", "=", $_GET["hash"]], ["tweet_id", "<", $_GET["tweet_id"]]], ["tweet_id"], 11);
                } else {
                    $get_tweet_id = $sssql -> load("twitter_tags", ["tweet_id"], [["tag", "=", $_GET["hash"]]], ["tweet_id"], 11);
                }
                $tweet_ids = [];
                foreach($get_tweet_id as $get_tweet_ids){
                    $tweet_ids[] = ["tweet_id", "=", $get_tweet_ids["tweet_id"], "OR"];
                }
                if($tweet_ids){
                    $tweets = $sssql -> load("twitter_tweets", ["tweet_id", "name", "display_name", "media", "full_text", "full_text_origin", "retweet_from", "time", "translate"], $tweet_ids, ["tweet_id"], count($tweet_ids));
                }else{
                    $tweets = [];//如果没有tag一定要留空，否则内存爆炸
                }
                $arr["error"] = 0;
                $arr["message"] = "OK";
                $arr["data"] = returnData($tweets, 11);
                break;
            case "search":
                $get_arr = [[
                                "full_text_origin",
                                "LIKE%%",
                                $_GET["q"]
                            ],[
                                "retweet_from",
                                "=",
                                null
                            ],[
                                "tweet_id",
                                ">",
                                0
                            ]];
                if (isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0) {
                    $get_arr[2][1] = "<";
                    $get_arr[2][2] = $_GET["tweet_id"];
                    array_splice($get_arr, 1, 1);
                } else {
                    array_splice($get_arr, 1);
                }
                $tweets = $sssql -> load("twitter_tweets", ["tweet_id", "name", "display_name", "media", "full_text", "full_text_origin", "retweet_from", "time", "translate"], $get_arr, ["tweet_id"], 11);
                $arr["error"] = 0;
                $arr["message"] = "OK";
                $arr["data"] = returnData($tweets, 11);
                break;
            case "translate":
                if(isset($_GET["tweet_id"]) && is_numeric($_GET["tweet_id"]) && $_GET["tweet_id"] > 0){
                    $info = $sssql -> load("twitter_tweets", ["translate", "full_text_origin"], [["tweet_id", "=", $_GET["tweet_id"]]]);
                    if (count($info) && $info[0]["translate"] == "") {
                        $info = $info[0];
                        //google translate
                        $info["full_text_origin"] = preg_replace('/[\xf0-\xf7].{3}/', '', preg_replace('/https:\/\/t.co\/[\w]+/', '', $info["full_text_origin"]));
                        $info["translate"] = "";
                        $g_body = [
                            "client" => "webapp",
                            "sl" => "auto",
                            "tl" => $target_language,
                            "hl" => $target_language,
                            "dt" => "at",
                            "dt" => "bd",
                            "dt" => "ex",
                            "dt" => "ld",
                            "dt" => "md",
                            "dt" => "qca",
                            "dt" => "rw",
                            "dt" => "rm",
                            "dt" => "ss",
                            "dt" => "t",
                            "clearbtn" => 1,
                            "otf" => 1,
                            "pc" => 1,
                            "ssel" => 0,
                            "tsel" => 0,
                            "kc" => 2,
                            "tk" => GoogleTokenGenerator::generateToken($info["full_text_origin"]),
                            "q" => $info["full_text_origin"]
                            ];
                        foreach (json_decode(new sscurl("https://translate.google.com/translate_a/single?" . html_entity_decode(http_build_query($g_body)), "get", ["referer: https://translate.google.com/", "authority: translate.google.com"]), true)[0] as $trs) {
                            $info["translate"] .= $trs[0];
                        }
                        if($info["translate"]){
                            $sssql -> update("twitter_tweets", ["translate" => $info["translate"]], [["tweet_id", "=", $_GET["tweet_id"]]]);
                        }
                        
                        //bing translator
                        //$info["full_text_origin"] = str_replace("\n", "", preg_replace('/https:\/\/t.co\/[\w]+/', '', $info["full_text_origin"]));
                        //$language = json_decode(new sscurl("https://www.translate.com/translator/ajax_lang_auto_detect", "post", ["Referer: https://www.translate.com/"], 3, ["text_to_translate" => $info["full_text_origin"]]), true)["language"];
                        //$info["translate"] = json_decode(new sscurl("https://www.translate.com/translator/ajax_translate", "post", ["Referer: https://www.translate.com/"], 3, ["text_to_translate" => $info["full_text_origin"], "source_lang" => $language, "translated_lang" => "zh", "use_cache_only" => false]), true)["translated_text"];
                        //if ($info["translate"]) {
                        //    $sssql -> update("twitter_tweets", ["translate" => $info["translate"]], [["tweet_id", "=", $_GET["tweet_id"]]]);
                        //}
                        $info["cache"] = false;
                    }elseif(count($info)){
                        $info = $info[0];
                        $info["cache"] = true;
                    }
                    $info["translate"] = nl2br($info["translate"]);
                    $info["powerby"] = $powerby;
                    $arr["error"] = 0;
                    $arr["message"] = "OK";
                    $arr["data"] = $info;
                }
                break;
        }
        echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    }
}

function returnData($tweets = [], $count = 0){
    $real_count = count($tweets);
    $hasmore = ($real_count == $count);
    if($hasmore){
        array_pop($tweets);//清除多余的内容
        $real_count -= 1;
    }
    $check_new_tweet_id = 0;
    $tweet_id = 0;
    if($real_count){
        $check_new_tweet_id = $tweets[0]["tweet_id"];
    }
    for ($x = 0; $x < $real_count; $x++) {
        $tweets[$x]["translate"] = "";
        $tweets[$x]["powerby"] = "";
        $tweets[$x]["type"] = "tweet";
        $tweets[$x]["media"] = json_decode($tweets[$x]["media"], true);
        //寻找视频
        $tweets[$x]["hasvideo"] = false;
        foreach($tweets[$x]["media"] as $single_media){
            if($single_media["origin"]["origin_type"] != "photo"){
                if($single_media["origin"]["origin_type"] == "animated_gif"){
                    $tweets[$x]["hasgif"] = true;
                }
                $tweets[$x]["hasvideo"] = true;
                break;
            }
        }
        $tweets[$x]["time"] = date('Y-n-j G:i:s', $tweets[$x]["time"]);
        $tweets[$x]["full_text_origin"] = preg_replace('/https:\/\/t.co\/[\w]+/', '', $tweets[$x]["full_text_origin"]);
        $tweet_id = $tweets[$x]["tweet_id"];
    }
    return ["data" => $tweets, "tweet_id" => $tweet_id, "new" => $check_new_tweet_id, "hasmore" => $hasmore];
}