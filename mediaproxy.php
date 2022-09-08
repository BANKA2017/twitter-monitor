<?php
/*
 * twitter monitor v2 api
 * @banka2017 && NEST.MOE
 */
//use this script you must create a folder name `cache`
header("Access-Control-Allow-Origin: *");

ob_implicit_flush();
require(dirname(__FILE__) . '/init.php');
//svg
$ReturnSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>';

// from $_GET
$link = $_GET["link"]??"";
$format = $_GET["format"]??"";
$name = $_GET["name"]??"";

$ext = $_GET["ext"]??"";

$mediaLinkArray = tw_pathinfo($link);//处理链接
if ($format && $name) {
    $mediaLinkArray["size"] = $name;
    $mediaLinkArray["extension"] = $format;
    $mediaLinkArray["basename"] .= "." . $format;
}
//$mediaSize = $mediaLinkArray["size"]??":medium";
//鉴权
if(!$mediaLinkArray["filename"] || (!preg_match('/^(pbs|video)\.twimg\.com\//', $mediaLinkArray["dirname"]) && $ext !== 'ext_tw_video')){
    header("content-type: image/svg+xml");
    echo $ReturnSvg;
} elseif ($mediaLinkArray["basename"] === "banner.jpg") {
    header("content-type: image/jpeg");
    header("Content-Disposition:attachment;filename=banner.jpg");
    echo (new sscurl("https://{$mediaLinkArray["dirname"]}"))->addMore([CURLOPT_TIMEOUT => 999])->addMore([CURLOPT_RETURNTRANSFER => false]);
} else {
    switch ($mediaLinkArray["extension"]) {
        case "banner": 
            header("content-type: image/jpeg");
            header("Content-Disposition:attachment;filename=banner.jpg");
            echo (new sscurl("https://{$mediaLinkArray["dirname"]}/{$mediaLinkArray["filename"]}"))->addMore([CURLOPT_TIMEOUT => 999])->addMore([CURLOPT_RETURNTRANSFER => false]);
            break;
        case "jpg": 
        case "png":
        case "mp4":
        case "m3u8":
        case "m4s":
        case "ts":
            //本地缓存
            $hit = file_exists(__DIR__ . "/cache/" . $mediaLinkArray["basename"]);
            header("tmv2-cache: " . (int)$hit);
            if (!in_array($mediaLinkArray["extension"], ["mp4", "m4s", "ts", "m3u8"]) && $hit && $mediaLinkArray["size"] == "small") {
                //mp4不能缓存
                header("Location: /cache/{$mediaLinkArray["basename"]}");
            } else {

                $realLink = match ($mediaLinkArray["pathtype"]) {
                    2 => "https://" . $link,
                    1 => "https://" . $link . "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}",
                    0 => ($ext === 'ext_tw_video' ? 'https://video.twimg.com/ext_tw_video/' : 'https://') . $link
                };
                //最后都用上了//处理拖动进度条的问题//仅mp4
                //咕完了//咕咕咕
                //获取长度
                $tmpLength = (new sscurl($realLink))->addMore([CURLOPT_TIMEOUT => 999])->returnBody(2);
                preg_match("/Content-Length: ([0-9]+)/i", $tmpLength, $tmpLength);
                header("Content-Length: {$tmpLength[1]}");
                header("Accept-Ranges: bytes");
                if ($tmpLength[1] == 0) {
                    header("content-type: image/svg+xml");
                    echo $ReturnSvg;
                } else {
                    //video or gif or image
                    //在twitter中gif会被转换为mp4
                    header("content-type: " . get_mime($mediaLinkArray["extension"]));
                    header("Content-Disposition:attachment;filename=." . $mediaLinkArray["basename"]);
                    echo (new sscurl($realLink))->addMore([CURLOPT_RETURNTRANSFER => false]);//mp4不会删//use CURLOPT_RETURNTRANSFER to stdout
                    //save to cache
                    if ($mediaLinkArray["extension"] !== "mp4" && !$hit && $mediaLinkArray["size"] == "small") {
                        file_put_contents(__DIR__ . "/cache/" . $mediaLinkArray["basename"], new sscurl($realLink));
                    }
                }
            }
            break;
        default: 
            header("content-type: image/svg+xml");
            echo $ReturnSvg;
    }
}