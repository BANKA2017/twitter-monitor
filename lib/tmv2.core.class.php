<?php
/*
 * twitter monitor v2 core class
 * @banka2017 && KDNETWORK
 */
namespace Tmv2\Core;

class Core {
    public array $tags, $media, $card, $polls, $in_sql_tweet, $errors, $quote, $cardMessage = [], $cursor = ["top" => "", "bottom" => ""];
    public bool $isGraphql, $isSelf, $isQuote, $online;
    private bool $isRetweet, $reCrawlMode, $hidden;
    private array $globalObjects;
    public mixed $contents, $tweet_id, $cardApp;
    public int $globalObjectsLength;
    public string $max_tweetid, $min_tweetid;

    public function __construct(
        array $globalObjects = [],
        bool $isGraphql = false,
        bool $reCrawlMode = false,
        bool $hidden = false,
        bool $online = false
    ) {
        //转移
        //$this->content = $content;
        //$this->account_info = $account_info;



        //全局信息
        $this->globalObjects = $globalObjects;
        $this->isGraphql = $isGraphql;
        $this->reCrawlMode = $reCrawlMode;
        $this->hidden = $hidden;
        $this->online = $online;

        //auto set values
        $this->max_tweetid = 0;
        $this->min_tweetid = 0;

        $this->resetAll();
        $this->setup();
    }


    //only for crawler
    public function addItemToTweetSql (array $items = []):self {
        foreach ($items as $key => $item) {
            $this->in_sql_tweet[$key] = $item;
        }
        return $this;
    }

    public function generateTweetObject ($content = []):self {
        if ($this->isGraphql) {
            $content = path_to_array("tweet_content", $content);
        }
        $this->in_sql_tweet["tweet_id"] = path_to_array("tweet_id", $content);
        $this->in_sql_tweet["uid"] = path_to_array("tweet_uid", $content);
        $this->in_sql_tweet["conversation_id_str"] = path_to_array("tweet_conversation_id_str", $content) ?: $this->in_sql_tweet["tweet_id"];
        $this->in_sql_tweet["time"] = strtotime(path_to_array("tweet_created_at", $content));//提前处理时间

        //max_tweet_id
        //min_tweet_id
        if ($this->min_tweetid === "0") {
            $this->min_tweetid = $this->in_sql_tweet["tweet_id"];
        }
        if ($this->in_sql_tweet["tweet_id"] > $this->max_tweetid) {
            $this->max_tweetid = $this->in_sql_tweet["tweet_id"];
        } elseif ($this->in_sql_tweet["tweet_id"] < $this->min_tweetid) {
            $this->min_tweetid = $this->in_sql_tweet["tweet_id"];
        }
        //处理来源
        $this->in_sql_tweet["source"] = preg_replace('/<a[^>]+>(.*)<\/a>/', "$1", path_to_array("tweet_source", $content));

        //个人信息
        //此处涉及较多处理暂不使用 apiPath
        $this->in_sql_tweet["name"] = $this->findUserInGlobalObjects($this->in_sql_tweet["uid"])["screen_name"]??$content["content"]["itemContent"]["tweet"]["core"]["user"]["legacy"]["screen_name"]??$content["content"]["itemContent"]["tweet_results"]["result"]["core"]["user"]["legacy"]["screen_name"]??"";
        $this->in_sql_tweet["display_name"] = $this->findUserInGlobalObjects($this->in_sql_tweet["uid"])["name"]??$content["content"]["itemContent"]["tweet"]["core"]["user"]["legacy"]["name"]??$content["content"]["itemContent"]["tweet_results"]["result"]["core"]["user"]["legacy"]["name"]??"";

        //判断是否转推
        //TODO 处理local模式下的 recrawl
        if (path_to_array("retweet_rest_id", $content)) {
            $this->isRetweet = true;
            if ($this->isGraphql) {
                $content = path_to_array("retweet_graphql_path", $content);
                //quoted_status_result.result.core.user_results.result.legacy.screen_name
                $this->in_sql_tweet["retweet_from"] = path_to_array("graphql_user_legacy", $content["core"])["name"];
                $this->in_sql_tweet["retweet_from_name"] = path_to_array("graphql_user_legacy", $content["core"])["screen_name"];
            } else {
                $content = $this->globalObjects["globalObjects"]["tweets"][$content["retweeted_status_id_str"]];
                $this->in_sql_tweet["retweet_from"] = $this->globalObjects["globalObjects"]["users"][$content["user_id_str"]]["name"];
                $this->in_sql_tweet["retweet_from_name"] = $this->globalObjects["globalObjects"]["users"][$content["user_id_str"]]["screen_name"];
            }
        }

        //给卡片找源链接
        $cardUrl = (isset($content["card"]) && (!str_starts_with((path_to_array("tweet_card_url", $content["card"]) ?: ""), "card://"))) ? path_to_array("tweet_card_url", $content["card"]) : "";

        //真的有quote嘛
        //如果没用twitter会显示 "这条推文不可用。"
        //推文不可用不等于原推被删, 虽然真正的原因是什么我只能说我也不知道
        //群友说可能是被屏蔽了, 仅供参考
        $this->isQuote = (
            ((($content["is_quote_status"]??false) && isset($this->globalObjects["globalObjects"]["tweets"][$content["quoted_status_id_str"]??0]))) ||
            ((($content["legacy"]["is_quote_status"]??false) && isset($content["quoted_status"])))
        );
        $quoteUrl = $this->isQuote ? path_to_array("tweet_quote_url", $content) : "";

        //full_text
        $this->in_sql_tweet["full_text_origin"] = path_to_array("tweet_full_text", $content);//原始全文
        $tmpEntities = path_to_array("tweet_entities", $content);
        if ($tmpEntities) {
            $this->tags = $this->generateEntities($tmpEntities, $this->in_sql_tweet["uid"], $this->in_sql_tweet["tweet_id"]);
        }
        //full text with html tags
        $tmpTextObjects = $this->generateFullTextWithHtml($this->in_sql_tweet["full_text_origin"], $cardUrl, $quoteUrl, $this->tags);
        $this->in_sql_tweet["full_text"] = $tmpTextObjects["text"];
        $cardUrl = $tmpTextObjects["card_url"];

        //media
        $this->media = $this->getMedia($content, $this->in_sql_tweet["uid"], $this->in_sql_tweet["tweet_id"], $this->hidden);

        //quote
        if ($this->isQuote) {
            $this->in_sql_tweet["quote_status"] = path_to_array("quote_tweet_id", $content);
            $quoteObject = $this->getQuote(($this->isGraphql ?
                path_to_array("quote_graphql_path", $content) :
                $this->globalObjects["globalObjects"]["tweets"][$this->in_sql_tweet["quote_status"]]), $this->in_sql_tweet["uid"], $this->in_sql_tweet["tweet_id"], $this->hidden
            );
            $this->quote = $quoteObject["in_sql_quote"];
            $this->media = array_merge($this->media, $quoteObject["media"]);
        }

        //card
        $tmpCard = path_to_array("tweet_card_path", $content);
        if ($tmpCard) {
            $cardObjects = $this->getCard($tmpCard, $this->in_sql_tweet["uid"], $this->in_sql_tweet["tweet_id"], $this->hidden, $cardUrl, $this->isGraphql);
            $this->in_sql_tweet["card"] = $cardObjects["card_type"];
            $this->in_sql_tweet["poll"] = $cardObjects["poll"];
            $this->card = $cardObjects["data"];
            if (isset($this->card["polls"])) {
                $this->polls = $this->card["polls"];
                $this->card = array_diff_key($this->card, ["polls" => []]);
            }
            $this->cardApp = $cardObjects["app_data"];
            $this->media = array_merge($this->media, $cardObjects["media"]);
            $this->cardMessage = [
                "card_name" => $cardObjects["card_name"],
                "supported" => $cardObjects["supported"],
                "message" => $cardObjects["message"],
            ];

        }

        //media
        if ($this->media) {
            $this->in_sql_tweet["media"] = 1;
        }


        return $this;
    }

    public function generateEntities (array $entities = [], int|float|string $uid = 0, int|float|string $tweet_id = 0):array {
        //处理entities//包括图片//https://developer.twitter.com/en/docs/tweets/data-dictionary/overview/entities-object
        $tags = [];
        foreach ($entities as $type => $entities_) {
            foreach ($entities_ as $single_entities) {
                switch ($type) {
                    //以下四类使用同种方式
                    case "symbols"://虚拟货币也适用 $BTC $ETH //这个貌似是根据上市代码搜索相关公司的推文//官方管这玩意作cashtag, 个人感觉除了把#换成$以外并没有什么区别
                    case "hashtags":
                    case "urls":
                    case "user_mentions":
                        $single_entity_data = tw_entities($type, $single_entities, $uid, $tweet_id);
                        $tags[$single_entity_data["indices_start"]] = $single_entity_data;
                        break;
                    //media另外处理
                    //case "media":
                    //    $this->in_sql_tweet["media"] = 1;//便于下面判断
                    //    break;
                }
            }
        }

        //TODO 以下部分未来将丢弃

        ksort($tags);//重新排序
        return $tags;
    }
    private function hasMedia (array $entities = []): bool {
        return in_array("media", array_keys($entities));
    }
    public function generateFullTextWithHtml (string $full_text = "", string $cardUrl = "", string $quoteUrl = "", array $entities = []):array {

        //full_text with html
        //预处理是必要的
        $newText = '';//叠加文字
        $last_end = 0;
        $entitiesLength = count($entities);
        foreach ($entities as $entitiesOrder => $single_tag) {
            $addText = "";
            switch ($single_tag["type"]) {
                case "hashtag":
                    $addText = "<a href=\"#/hashtag/{$single_tag["text"]}\" id=\"hashtag\">#{$single_tag["text"]}</a>";
                    break;
                case "symbol":
                    $addText = "<a href=\"#/cashtag/{$single_tag["text"]}\" id=\"symbol\">\${$single_tag["text"]}</a>";
                    break;
                case "user_mention":
                    $addText = "<a href=\"{$single_tag["expanded_url"]}\" id=\"user_mention\" target=\"_blank\">{$single_tag["text"]}</a>";
                    break;
                case "url":
                    if (($cardUrl??"") == $single_tag["url"] && $entitiesOrder == ($entitiesLength - 1)) {
                        //处理卡片的url
                        $cardUrl = $single_tag["expanded_url"];
                    } elseif ($single_tag["url"] != $quoteUrl) {
                        //处理非卡片非引用
                        $addText = "<a href=\"{$single_tag["expanded_url"]}\" id=\"url\" target=\"_blank\">{$single_tag["text"]}</a>";
                    }
                    break;
            }
            $newText .= mb_substr($full_text, $last_end, $single_tag["indices_start"] - $last_end, 'utf-8') . $addText;
            $last_end = $single_tag["indices_end"];
        }
        //处理最后的一段
        $newText .= mb_substr($full_text, $last_end, mb_strlen($full_text), 'utf-8');

        //如果有媒体最后就会有一段类似于 https://t.co/114514 的短链接//有卡片同理
        return [
            "text" => nl2br(preg_replace('/ https:\/\/t.co\/[\w]+/', '', $newText)),
            "card_url" => $cardUrl,
        ];

    }


    //rest only
    private function findUserInGlobalObjects (int|float|string $uid):array {
        return $this->globalObjects["globalObjects"]["users"][$uid]??[];
    }
    public function setup (): self {
        //reCrawlMode needn't it
        if ($this->reCrawlMode) {
            return $this;
        }

        //errors
        $this->errors = [0, "Success"];
        //rest
        if (isset($this->globalObjects["globalObjects"])) {
            $this->errors = [0, "Success"];
        } elseif (isset($this->globalObjects["errors"]) && !$this->isGraphql) {
            $this->errors = [$this->globalObjects["errors"][0]["code"], $this->globalObjects["errors"][0]["message"]];
        } elseif (!isset($this->globalObjects["data"]["user"]["result"]["timeline"])) {
            $this->errors = [1002, $this->globalObjects["data"]["user"]["result"]["__typename"]??"Nothing here"];
        }

        if ($this->errors[0] === 0) {
            $this->contents = path_to_array("tweets_contents", $this->globalObjects);
            $this->globalObjectsLength = count($this->contents);

            if ($this->isGraphql) {
                $this->cursor["top"] = $this->contents[$this->globalObjectsLength - 2]["content"]["value"]??"";
                $this->cursor["bottom"] = $this->contents[$this->globalObjectsLength - 1]["content"]["value"]??"";
            } else {
                foreach ($this->globalObjects["timeline"]["instructions"] as $first_instructions) {
                    foreach ($first_instructions as $second_instructions => $second_instructions_value) {
                        switch ($second_instructions) {
                            case "addEntries":
                                foreach ($second_instructions_value["entries"] as $third_entries_value) {
                                    if (str_starts_with($third_entries_value["entryId"], "cursor-top")) {
                                        $this->cursor["top"] = $third_entries_value["content"]["operation"]["cursor"]["value"];
                                    } elseif (str_starts_with($third_entries_value["entryId"], "cursor-bottom")) {
                                        $this->cursor["bottom"] = $third_entries_value["content"]["operation"]["cursor"]["value"];
                                    }
                                }
                                break;
                        }
                    }
                }
            }
        }

        return $this;
    }
    public function isSelf (string $uidFromTweet, string $uidFromAccountInfo):self  {
        $this->isSelf = $uidFromAccountInfo === $uidFromTweet;
        return $this;
    }

    public function getMedia(array $content = [], int|float|string $uid = 0, int|float|string $tweet_id = 0, bool $hidden = false, string $source = "tweets", string $card_type = ""): array {//, bool $returnSql
        $tmpMedia = [];
        $autoMergeArray = false;
        foreach (path_to_array("tweet_media_path", $content) as $order => $single_entities) {
            if ($order === 0) {
                $tmpMediaItem = tw_media($single_entities, $uid, $tweet_id, $hidden, $source, $card_type, "", $this->online);
                if (isset($tmpMediaItem[0])) {
                    $tmpMedia = array_merge($tmpMedia, $tmpMediaItem);
                    $autoMergeArray = true;
                } else {
                    $tmpMedia[] = $tmpMediaItem;
                }
            } elseif($autoMergeArray) {
                $tmpMedia = array_merge($tmpMedia, tw_media($single_entities, $uid, $tweet_id, $hidden, $source, $card_type, "", $this->online));
            } else {
                $tmpMedia[] = tw_media($single_entities, $uid, $tweet_id, $hidden, $source, $card_type, "", $this->online);
            }
        }
        return $tmpMedia;
    }
    public function getQuote (array $content = [], int|string $uid = 0, int|string $tweet_id = 0, bool $hidden = false): array {
        //处理quote
        //事实上"is_quote_status"为false的时候根本不会显示出来
        //需要处理上面full_text的一段//所以可能需要移到上面处理
        //quote不会显示card
        //若推文不存在不需要处理此处
        //从返回的数据里面重新抽出该条推文
        //$content = $tweets["globalObjects"]["tweets"][$content["quoted_status_id_str"]];//来吧
        //$in_sql["quote_status"] = $content["quoted_status_id_str"];//TODO get quote tweet_id in main
        $in_sql_quote = [
            "tweet_id" => path_to_array("tweet_id", $content),
            "uid" => path_to_array("tweet_uid", $content),

            "name" => "",
            "display_name" => "",

            "full_text" => path_to_array("tweet_full_text", $content),
            "full_text_origin" => path_to_array("tweet_full_text", $content),
            "time" => strtotime(path_to_array("tweet_created_at", $content)),
            "media" => 0,//v2中切为int类型(sql中tinyint)
            "video" => 0,//是否有视频
            //"hidden" => $account_info["hidden"]//本人认为此库数据不需要hidden

        ];

        //name and display_name
        if ($this->isGraphql) {
            //quoted_status_result.result.core.user_results.result.legacy
            $in_sql_quote["display_name"] = path_to_array("graphql_user_legacy", $content["core"])["name"];
            $in_sql_quote["name"] = path_to_array("graphql_user_legacy", $content["core"])["screen_name"];
        } else {
            $in_sql_quote["display_name"] = $this->globalObjects["globalObjects"]["users"][$content["user_id_str"]]["name"];
            $in_sql_quote["name"] = $this->globalObjects["globalObjects"]["users"][$content["user_id_str"]]["screen_name"];
        }

        //full_text
        $tmpEntities = path_to_array("tweet_entities", $content);

        foreach (($tmpEntities["urls"]??[]) as $quote_entity) {
            $in_sql_quote["full_text"] = str_replace($quote_entity["url"], "<a href=\"//{$quote_entity["expanded_url"]}\" id=\"quote_url\" target=\"_blank\" style=\"color: black\">{$quote_entity["display_url"]}</a>", $in_sql_quote["full_text"]);
        }
        $in_sql_quote["full_text"] = nl2br(preg_replace('/ https:\/\/t.co\/[\w]+/', '', $in_sql_quote["full_text"]));

        //media
        $quote_media = [];
        if ($this->hasMedia($tmpEntities)) {
            $in_sql_quote["media"] = 1;
            $quote_media = $this->getMedia($content, $uid, $tweet_id, $hidden, "quote_status");
        }

        return [
            "in_sql_quote" => $in_sql_quote,
            "media" => $quote_media
        ];
    }
    public function getCard(array $content = [], int|string $uid = 0, int|string $tweet_id = 0, bool $hidden = false, string $cardUrl = "", bool $isGraphql = false): array {
        //rest & graphql are same
        //$content = path_to_array("tweet_card_path", $content);

        $returnDataCard = [
            "data" => [],
            "media" => [],
            "supported" => false,
            "card_name" => "",//not very important
            "card_type" => "",
            "message" =>"Success",

            "poll" => 0,
            "app_data" => [],
        ];
        //处理card
        $returnDataCard["card_name"] = path_to_array("tweet_card_name", $content);
        $returnDataCard["card_type"] = preg_replace("/[\d]+:(.*)/", "$1", $returnDataCard["card_name"]);//任何时候都应该留下卡片类型, 不然等着头疼吧
        if (in_array($returnDataCard["card_type"], tw_supportCardNameList)) {
            //$in_sql["card"] = 1;
            $cardInfo = tw_card($content, $uid, $tweet_id, $hidden, $cardUrl, $returnDataCard["card_type"], $isGraphql);

            //TODO fix array in data
            $returnDataCard["data"] = $cardInfo["data"];
            $returnDataCard["app_data"] = $cardInfo["app_data"]??[];
            $returnDataCard["supported"] = true;
            if (($cardInfo["data"]["poll"]??0) && ($cardInfo["data"]["polls"] ?? [])) {
                $returnDataCard["poll"] = 1;
            }
            //media
            if ($cardInfo["media"]) {
                //风水轮流转, 这次到奇妙的 unified_card 了//promo_image_convo 也会有的, 晚点
                if ($cardInfo["data"]["type"] == "unified_card") {
                    $returnDataCard["media"] = $cardInfo["media"];
                } else {
                    $returnDataCard["media"][] = $cardInfo["media"];
                }
            }
        } else {
            $returnDataCard["message"] = "快来研究新的卡片\n #new_card #{$returnDataCard["card_name"]} \nid: $tweet_id\nhttps://twitter.com/i/status/$tweet_id\n" . json_encode($content);
        }
        return $returnDataCard;
    }
    public function resetAll () {
        $this->in_sql_tweet = [
            "retweet_from" => "",//display_name
            "retweet_from_name" => "",//name
            "tweet_id" => "0",
            "uid" => "0",
            "conversation_id_str" => 0,
            "name" => "",
            "display_name" => "",
            "full_text" => "",
            "full_text_origin" => "",
            "time" => 0,
            "media" => 0,//v2中切为int类型(sql中tinyint)
            "video" => 0,//是否有视频
            "card" => "",//卡片类型, 留空则表示没有
            "poll" => 0,//是否有投票, 有投票必有卡片, 有卡片未必有投票

            //引用推文相关
            "quote_status" => 0,//是否引用其他推文

            //"geo" => o,//是否有地理坐标
            "source" => "",//来源
            "hidden" => $this->hidden,

            //translate
            //"translate" => "",
            //"translate_source" => "",
        ];
        $this->tags = [];//不止tag, 还有cashtag urls
        $this->quote = [];//引用
        $this->media = [];//媒体
        $this->card = [];//卡片
        $this->cardApp = [];
        //$this->geo = [];//地理坐标
        $this->polls = [];
    }
}