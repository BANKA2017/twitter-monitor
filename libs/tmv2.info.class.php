<?php

namespace Tmv2\Info;

class Info{
    //php 8.0 needn't them
    //private array $account_data;
    //private int $isGraphql;
    public array $in_sql_info;
    public bool $update;
    public array $monitor_data_info;

    public function __construct(
        private array $account_data,
        //private bool|int $isGraphql = 0
    ) {
        //$this->account_data = $account_data;
        //$this->isGraphql = (int)$isGraphql;
        //输入模板
        //table account_info
        $this->in_sql_info = [
            "uid" => 0,
            "name" => "",
            "display_name" => "",
            "header" => "",
            "banner" => "",
            "following" => 0,
            "followers" => 0,
            "media_count" => 0,
            "created_at" => 0,
            "description" => "",
            "description_origin" => "",
            "verified" => "",
            "top" => "0",
            "statuses_count" => 0,//推文计数

            //来源 twitter
            //"source" => "twitter",
        ];

        //分析数据模板
        $this->monitor_data_info = [
            "uid" => 0,
            "name" => "",
            "display_name" => "",
            "following" => 0,
            "followers" => 0,
            "statuses_count" => 0,
            "timestamp" => time(),
        ];
        $this->update = false;
        $this->generateData();
    }

    public function importFromAccountInfo (array $account_info = []) :self {
        self::importInfo([
            "hidden" => (int)($account_info["hidden"] ?? 0),//隐藏//本站层面
            "locked" => (int)($account_info["locked"] ?? 0),//锁推//twitter层面
            "deleted" => (int)($account_info["deleted"] ?? 0),//删号人士
            "organization" => (int)($account_info["organization"]??false),//组织账号
        ]);
        return $this;
        //$this->userStatus = !strlen($this->account_info["name"]) || ($this->account_info["deleted"] ?? false) || ($this->account_info["locked"] ?? false);
    }

    public function importInfo (string|array $mainData, mixed $data = ""):self {
        if (is_array($mainData)) {
            foreach ($mainData as $key => $value) {
                $this->in_sql_info[$key] = $value;
            }
        } else {
            $this->in_sql_info[$mainData] = $data;
        }
        return $this;
    }

    public function generateData ():self {
        //legacy userinfo
        $account_data_id_str = intval(path_to_array("rest_id", $this->account_data));
        $this->account_data = path_to_array("user_info_legacy", $this->account_data);

        //banner
        if (isset($this->account_data["profile_banner_url"])) {
            preg_match('/\/([\d]+)$/', $this->account_data["profile_banner_url"], $banner);
            $this->in_sql_info["banner"] = intval($banner[1]);
            $this->update = true;
        } else {
            $this->in_sql_info["banner"] = 0;
        }

        //常规
        $this->in_sql_info["uid"] = $account_data_id_str;
        $this->in_sql_info["name"] = $this->account_data["screen_name"];
        $this->in_sql_info["display_name"] = $this->account_data["name"];
        $this->in_sql_info["header"] = preg_replace('/\/([0-9]+)\/([\w\-]+)_normal.([\w]+)$/', '/$1/$2.$3', $this->account_data["profile_image_url_https"]);
        $this->in_sql_info["following"] = $this->account_data["friends_count"];
        $this->in_sql_info["followers"] = $this->account_data["followers_count"];//TODO 检测突破万的倍数
        $this->in_sql_info["media_count"] = $this->account_data["media_count"];
        $this->in_sql_info["created_at"] = strtotime($this->account_data["created_at"]);
        $this->in_sql_info["verified"] = (int)$this->account_data["verified"];
        //$this->in_sql_info["lang"] = $this->account_data["lang"];
        $this->in_sql_info["statuses_count"] = $this->account_data["statuses_count"];
        //置顶推文，用了 Array 是打算做多个置顶？
        $this->in_sql_info["top"] = (string)($this->account_data["pinned_tweet_ids_str"][0]??(($this->account_data["pinned_tweet_ids"]??'0') ? number_format($this->account_data["pinned_tweet_ids"][0], 0, '', '') : "0"));

        //处理介绍
        $description = $this->account_data["description"];
        $this->in_sql_info["description_origin"] = $description;
        foreach ($this->account_data["entities"]["description"] as $entities => $entityValue) {
            // 其他部分参考 GitHub twitter/twitter-text
            if ($entities === "urls") {
                foreach ($entityValue as $single_entities) {
                    $description = str_replace($single_entities["url"], "<a href=\"{$single_entities["expanded_url"]}\" target=\"_blank\">{$single_entities["display_url"]}</a>", $description);
                }
            }
        }

        $this->in_sql_info["description"] = $description;
        return $this;
    }
    
    public function generateMonitorData (): self {
        //monitor data
        $this->monitor_data_info["uid"] = $this->in_sql_info["uid"];
        $this->monitor_data_info["name"] = $this->in_sql_info["name"];
        $this->monitor_data_info["display_name"] = $this->in_sql_info["display_name"];
        $this->monitor_data_info["following"] = $this->in_sql_info["following"];
        $this->monitor_data_info["followers"] = $this->in_sql_info["followers"];
        $this->monitor_data_info["statuses_count"] = $this->in_sql_info["statuses_count"];
        $this->monitor_data_info["media_count"] = $this->in_sql_info["media_count"];
        return $this;
    }

    //just for crawler
    public function verifyData (array $verifyArray): bool {
        return (bool)array_diff_assoc(
            $verifyArray,
            [
                "uid" => $this->in_sql_info["uid"],
                "name" => $this->in_sql_info["name"],
                "display_name" => $this->in_sql_info["display_name"],
                "header" => $this->in_sql_info["header"],
                "banner" => $this->in_sql_info["banner"],
                "description_origin" => $this->in_sql_info["description_origin"],
                "top" => $this->in_sql_info["top"],
                "statuses_count" => $this->in_sql_info["statuses_count"],
                "hidden" => $this->in_sql_info["hidden"],
                "locked" => $this->in_sql_info["locked"],
                "deleted" => $this->in_sql_info["deleted"]
            ]);
    }
}