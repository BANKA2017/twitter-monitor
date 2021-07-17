<?php
/*
 * twitter monitor v2 api
 * @banka2017 && KDNETWORK
 */
//use this script you must create a folder name `cache`
header("Access-Control-Allow-Origin: *");

ob_implicit_flush();
require(dirname(__FILE__) . '/init.php');
//svg
$ReturnSvg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img" aria-label="Placeholder: Deleted"><title>Placeholder</title><rect width="100%" height="100%" fill="#868e96"></rect></svg>';

$mediaLinkArray = tw_pathinfo($_GET["link"]??"");//处理链接
if (isset($_GET["format"]) && isset($_GET["name"])) {
    $mediaLinkArray["size"] = $_GET["name"];
    $mediaLinkArray["extension"] = $_GET["format"];
    $mediaLinkArray["basename"] .= "." . $_GET["format"];
}
//$mediaSize = $mediaLinkArray["size"]??":medium";
//鉴权
if(!$mediaLinkArray["filename"] || !preg_match('/^(pbs|video)\.twimg\.com\//', $mediaLinkArray["dirname"])){
    header("content-type: image/svg+xml");
    echo $ReturnSvg;
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
            //本地缓存
            $hit = file_exists(__DIR__ . "/cache/" . $mediaLinkArray["basename"]);
            header("tmv2-cache: " . (int)$hit);
            if ($mediaLinkArray["extension"] !== "mp4" && $hit && $mediaLinkArray["size"] == "small") {
                //mp4不能缓存
                header("Location: /cache/{$mediaLinkArray["basename"]}");
            } else {
                //最后都用上了//处理拖动进度条的问题//仅mp4
                //咕完了//咕咕咕
                //获取长度
                $tmpLength = (new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? '' : ($mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : ""))))->addMore([CURLOPT_TIMEOUT => 999])->returnBody(2);
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
                    echo (new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? '' : ($mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : ""))))->addMore([CURLOPT_RETURNTRANSFER => false]);//mp4不会删//use CURLOPT_RETURNTRANSFER to stdout
                    //save to cache
                    if ($mediaLinkArray["extension"] !== "mp4" && !$hit && $mediaLinkArray["size"] == "small") {
                        file_put_contents(__DIR__ . "/cache/" . $mediaLinkArray["basename"], new sscurl("https://" . $_GET["link"] . ($mediaLinkArray["pathtype"] == 2 ? '' : ($mediaLinkArray["pathtype"] == 1 ? "?format={$mediaLinkArray["extension"]}&name={$mediaLinkArray["size"]}" : ""))));
                    }
                }
            }
            
            break;
        default: 
            header("content-type: image/svg+xml");
            echo $ReturnSvg;
    }
}