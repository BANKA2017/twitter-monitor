Twitter Monitor v2
---

This is the crawler and api, frontend repository is [here](https://github.com/BANKA2017/twitter-monitor-frontend/).

这是爬虫以及api，前端仓库位于[这里](https://github.com/BANKA2017/twitter-monitor-frontend/)

## Environment

* php8.0
* php-mbstring php-xml php-mysqli php-gd
* Composer
* Nginx / Apache (we are not provide apache config file .htaccess)
* MySQL 8.0 (it will have some issues while using MySql 5.x based database system)
* Linux (No Windows, I am not own any Windows servers; And 64-bit system)

## How to

* ```git clone https://github.com/BANKA2017/twitter-monitor```
* import ```mysql.sql``` to database
* copy and rename ```config_sample.php``` to ```config.php``` , open and edit it
* open ```config.html``` edit and save config file `config.json` in root path [Online](https://banka2017.github.io/twitter-monitor/config.html)
* *include ```nginx.conf``` in your nginx config, only crawl data is needn't
* then run

    ```shell
    composer install
    ```

* setting crontab，e.g.

    ```shell
    #those are example path, use your path
    * * * * * php /tmv2/run_get_legacy.php
    #0 * * * * php /tmv2/ext_run.php #for poll data
    #*/10 * * * * php /tmv2/scripts/blurhash/add.php #for blurhash
    #10 23 * * 0 php /tmv2/scripts/lovelive_trends/run.php #only for lovelive_trends
    ```


## Supported Cards

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
    * appplayer
    * audiospace
    * unified_card
        * image_website
        * video_website
        * image_carousel_website
        * video_carousel_website
        * image_app
        * video_app
        * image_carousel_app
        * video_carousel_app
        * image_multi_dest_carousel_website
        * video_multi_dest_carousel_website
        * mixed_media_multi_dest_carousel_website
        * mixed_media_single_dest_carousel_website
        * mixed_media_single_dest_carousel_app
        * twitter_list_details
        * media_with_details_horizontal (for topic ?)

## Thanks

* ```GoogleTokenGenerator.php``` from [google-translate-php](https://github.com/Stichoza/google-translate-php), I remove some unnecessary code //now we need't use tk in Google translate
* function ```get_mime``` from [Tieba-Cloud-Sign](https://github.com/MoeNetwork/Tieba-Cloud-Sign/blob/c4ab393045bcabde97c1a70fbe8e8d56be8f7f1e/lib/sfc.functions.php#L790)

## How it works

Those are Chinese articles

[怎么爬twitter](https://blog.nest.moe/2020/02/27/how-to-crawl-twitter/)

[怎么爬twitter Graphql](https://blog.nest.moe/2021/05/12/how-to-crawl-twitter-with-graphql/)

## 环境要求

* php8.0
* php-mbstring php-xml php-mysqli
* Composer
* Nginx / Apache (使用 Apache 请自行生成 .htaccess)
* MySQL 8.0 (使用MariaDB等基于 MySQL 5.x 的可能会有奇怪的支持问题)
* Linux (使用Windows可能会遇上奇奇怪怪的问题, 以及64位系统)

## 使用方法

* ```git clone https://github.com/BANKA2017/twitter-monitor```
* 导入 ```mysql.sql```
* 将 ```config_sample.php``` 复制一份副本并重命名为 ```config.php``` ，打开并根据实际情况编辑
* 使用浏览器打开 ```config.html``` 编辑并保存配置文件 [在线](https://banka2017.github.io/twitter-monitor/config.html)
* *在网站 Nginx 配置文件中添加 ```nginx.conf``` 的内容，这是可选的步骤，仅爬取数据不使用api功能可忽略此步
* 运行

    ```shell
    composer install
    ```

* 根据个人喜好设定crontab，下面是例子

    ```shell
    #这里的路径只是示例, 请在配置中使用实际文件路径
    * * * * * php /tmv2/run_get_legacy.php
    #0 * * * * php /tmv2/ext_run.php #for poll data
    #*/10 * * * * php /tmv2/scripts/blurhash/add.php #for blurhash
    #10 23 * * 0 php /tmv2/scripts/lovelive_trends/run.php #only for lovelive_trends
    ```

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
    * appplayer
    * audiospace
    * unified_card
        * image_website
        * video_website
        * image_carousel_website
        * video_carousel_website
        * image_app
        * video_app
        * image_carousel_app
        * video_carousel_app
        * image_multi_dest_carousel_website
        * video_multi_dest_carousel_website
        * mixed_media_multi_dest_carousel_website
        * mixed_media_single_dest_carousel_website
        * mixed_media_single_dest_carousel_app
        * twitter_list_details
        * media_with_details_horizontal (for topic ?)

  这些卡片示例都可以在 ```docs/cards.json``` 找到

  *其中 `unified_card` 的示例不齐，将在未来补齐

## 出处 & 感谢

* ```GoogleTokenGenerator.php``` 这个文件出自 [google-translate-php](https://github.com/Stichoza/google-translate-php) 并经过本人小幅修改; 现在使用 Google translate 不再需要生成 TKK，故已移除本文件
* 函数 ```get_mime``` 出自 [Tieba-Cloud-Sign](https://github.com/MoeNetwork/Tieba-Cloud-Sign/blob/c4ab393045bcabde97c1a70fbe8e8d56be8f7f1e/lib/sfc.functions.php#L790)

## 资料

[怎么爬twitter](https://blog.nest.moe/2020/02/27/how-to-crawl-twitter/)

[怎么爬twitter Graphql](https://blog.nest.moe/2021/05/12/how-to-crawl-twitter-with-graphql/)

## JetBrains Open Source development license

本项目重度依赖于JetBrains™ 全家桶，感谢JetBrains s.r.o为本项目提供 [开源许可证](https://jb.gg/OpenSourceSupport) ，如果你同样对开发充满热情并且经常使用JetBrains s.r.o的产品，你也可以尝试通过JetBrains官方渠道 [申请](https://www.jetbrains.com/shop/eform/opensource) 开源许可证以供核心开发者使用

![JetBrains Logo (Main) logo](https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.svg)

Copyright © 2022 JetBrains s.r.o.
