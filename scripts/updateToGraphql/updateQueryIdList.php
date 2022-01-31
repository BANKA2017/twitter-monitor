<?php
/*
 * twitter monitor v2 graphql
 * @banka2017 && NEST.MOE
 */
//更新graphql时使用，理论上这些queryId应该如 authorization 那样能长时间不更换
require(__DIR__ . "/../../init.php");

preg_match('/https:\/\/abs\.twimg\.com\/responsive-web\/client-web([^\/]+|)\/main\.[^.]+\.js/', new sscurl("https://twitter.com/"), $link);

//get js
$jsString = ($link[0]??"");

if ($jsString != "") {
    preg_match_all('/{queryId:"([^"]+)",operationName:"([^"]+)",operationType:"([^"]+)"/', new sscurl($jsString), $queryIdList);
    $list = [];
    for ($x = 0; $x < count($queryIdList[0]); $x++) {
        $list[$queryIdList[2][$x]] = [
            "queryId" => $queryIdList[1][$x],
            "operationName" => $queryIdList[2][$x],
            "operationType" => $queryIdList[3][$x],
        ];
    }

    file_put_contents(SYSTEM_ROOT . '/graphqlQueryIdList.json', json_encode($list));
}