Twitter Monitor v2
---

## 环境要求

* php7.x (未来可能只支持 php7.4 及以上)
* php-mbstring php-xml php-mysqli
* Nginx / Apache (使用 Apache 请自行生成 .htaccess)
* MySQL 8.0 (使用MariaDB等基于 MySQL 5.x 的可能会有奇怪的支持问题, MySQL密码类型请使用Legacy)
* Linux (使用Windows可能会遇上奇奇怪怪的问题)

## 使用方法

* ```git clone https://github.com/BANKA2017/twitter-monitor```
* 导入 ```mysql.sql```
* 将 ```config_sample.php``` 复制一份副本并重命名为 ```config.php``` ，打开并根据实际情况编辑
* 使用浏览器打开 ```config.html``` 编辑并保存配置文件
* *在网站 Nginx 配置文件中添加 ```nginx.conf``` 的内容，这是可选的步骤，仅爬取数据不使用api功能可忽略此步
* 根据个人喜好设定crontab，下面是例子

    ```shell
    #这里的路径只是示例, 请在配置中使用实际文件路径
    * * * * * php /tmv2/run_get.php
    0 * * * * php /tmv2/ext_run.php
    ```

    如果不在乎投票的结果数据可不添加 ```ext_run.php``` 行

## 支持

* ~~数据删除~~

* 支持的卡片类型 (```*``` 表示使用小图, ```**``` 表示使用小图且图片在卡片右侧)

    * summary*
    * summary_large_image
    * promo_image_convo
    * promo_video_convo
    * promo_website
    * audio*
    * player
    * periscope_broadcast
    * broadcast
    * promo_video_website
    * promo_image_app
    * app
    * direct_store_link_app
    * live_event
    * moment**
    * poll2choice_text_only
    * poll3choice_text_only
    * poll4choice_text_only
    * poll2choice_image
    * poll3choice_image
    * poll4choice_image

    这些卡片示例都可以在 ```docs/cards.json``` 找到

## 出处

* ```GoogleTokenGenerator.php``` 这个文件出自 [google-translate-php](https://github.com/Stichoza/google-translate-php) 并经过本人小幅修改
* 函数 ```get_mime``` 出自 [Tieba-Cloud-Sign](https://github.com/MoeNetwork/Tieba-Cloud-Sign/blob/c4ab393045bcabde97c1a70fbe8e8d56be8f7f1e/lib/sfc.functions.php#L790)
