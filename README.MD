Twitter Monitor v3 monorepo (DEV)
---

## ⚠ WARNING / 警告

This is an early release version, everything are subject to change, please **DO NOT** used for production!!!

这是一个提前释出的版本，所有内容都可能会改变，请**不要**用于生产环境

---

This repository included `core/crawler/api/scripts`, frontend repository is [here](https://github.com/BANKA2017/twitter-monitor-frontend/).

这个仓库包含 `核心/爬虫/api/脚本`，前端仓库位于[这里](https://github.com/BANKA2017/twitter-monitor-frontend/)

## Environment

* x86_64/arm64
* Node.js 16+
* Nginx
* MySQL 8.0 / MariaDB (some function is not supported MariaDB, like function `ANY_VALUE()`, parser `ngram`)

## Download

We use GitHub Actions to build some scripts, you can find them in [BANKA2017/twitter-monitor/-/Actions/build_rollup](https://github.com/BANKA2017/twitter-monitor/actions/workflows/build_rollup.yml) **(Login required)**

## How to

### Settings

* leave it as is if not necessary
* service **tmv1** and **analytics** in `SQL_CONFIG` are not necessary, execpt you used twitter monitor before 2020-03

### Core

* **NO TYPESCRIPT**, core code are not yet supported typescript
* copy and rename the setting file from `libs/assets/settings_sample.mjs` to `libs/assets/settings.mjs`, and edit it
* enjoy it!

### Graphql

**IF POSSIBLE, DO NOT EXECUTE THOSE SCRIPTS**
* execute `node apps/scripts/updateQueryIdList.mjs` to update `queryId`
* execute `node apps/scripts/checkGraphqlFeaturesStatus.mjs` for check after updating `queryId`

### Crawler

* edit `SQL_CONFIG` to enable service **twitter_monitor**
* execute `yarn run init` or `npm run init`
* open `config.html` by browser to edit and save config file `config.json` as `libs/assets/config.json`

  [Online editor](https://banka2017.github.io/twitter-monitor/apps/config_page/)

* [PM2](https://pm2.keymetrics.io/) is a good choice for you, you also can use screen or nohup

  ```shell
  pm2 start apps/crawler/get_tweets.mjs
  ```

* set crontab，e.g.

  ```shell
  #those are example path, use your path
  * * * * * node apps/crawler/blurhash.mjs #PHP version is better, node version is slow
  */10 * * * * node apps/crawler/updatePollsAndAudioSpace.mjs
  ```

* you can set `TWEETS_SAVE_PATH` to save tweet content as json in that path
* we use another **bearer authorization token** to crawl more tweets, but this token is not supported some new feature like mix media, you can replace it by the latest token (then not support **nsfw** content)

### Api

* execute `yarn run dbapi` to enable the api only used databases (tmv1, twitter monitor)
* execute `yarn run api` to enable full version api (dbapi and album api, online api, media proxy)
* *you can create a better api than mine

### Watch dog

* a script in `apps/scripts` named `watchDog.mjs` can be added to crontab to check whether some data being added in latest 30 minites

### Archiver

* archive userinfo, most tweets(included **reply**) and nearly **ALL MEDIA**(included avatar and banner) by search api / timeline api, `Following` and `Followers`
* spaces, boradcast (ffmpeg command)
* **PLEASE PRECHECK THE ACCOUNT HAVEN BEEN SEARCHBAN**
* Read more in [archiver/README.md](https://github.com/BANKA2017/twitter-monitor/tree/node/apps/archiver)

### CloudFlare Workers

* supported album api, online api, media proxy and translator api
* to deploy it is easy
  - *read https://developers.cloudflare.com/workers/wrangler/workers-kv/#create-a-kv-namespace-with-wrangler 
  - create kv space named 'twitter-monitor-workers-kv' in <https://dash.cloudflare.com/> or executed `npx wrangler kv:namespace create kv`
  - copy the value of 'id' into 'kv_namespaces[0].id'
  - execute `npx wrangler publish`

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
        * image_collection_website
        * twitter_list_details
        * media_with_details_horizontal (for topic ?)
        * twitter_article
        * community_details

## Sub packages

- `FastText` for language identity, [Read more](https://github.com/BANKA2017/twitter-monitor/tree/node/packages/fasttext)
- `AxiosHelper` used to fix the issue that CloudFlare Workers unable to use axios, [Read more](https://github.com/BANKA2017/twitter-monitor/tree/node/packages/axios-helper)

## Thanks

* `GoogleTokenGenerator.php` from [google-translate-php](https://github.com/Stichoza/google-translate-php), I remove some unnecessary code //now we need't use tk in Google translate
* function `get_mime` is rewrited from [Tieba-Cloud-Sign](https://github.com/MoeNetwork/Tieba-Cloud-Sign/blob/c4ab393045bcabde97c1a70fbe8e8d56be8f7f1e/lib/sfc.functions.php#L790)
* you may notice a package named `sequelize-automate-gm` in `package.json`, this is a tiny tool to help me create model from exist tables

## How it works

Those are Chinese articles

[怎么爬twitter](https://blog.nest.moe/how-to-crawl-twitter/)

[怎么爬twitter Graphql](https://blog.nest.moe/how-to-crawl-twitter-with-graphql/)

## 环境要求

* x86_64/arm64 (理论上是全平台支持的)
* Node.js 16+
* Nginx
* MySQL 8.0 (使用MariaDB等基于 MySQL 5.x 的发行版可能不能支持函数 `ANY_VALUE()`, 解析器 `ngram`，会导致部分api不可用，若不使用api可忽略此处)

## 使用方法

### 设定

* 如无必要，保持原样
* `SQL_CONFIG` 中的 **tmv1** 以及 **analytics** 的服务都不是必须的，除非您在 2022-03 重写前就使用了 twitter monitor

### Core

* **没有 Typescript**，其实是不知怎么入手
* 拷贝编辑 `libs/assets/settings_sample.mjs` 并另存为 `libs/assets/settings.mjs`
* 开始使用吧！

### Graphql

**如无必要，请不要跑这些脚本**
* 运行 `node apps/scripts/updateQueryIdList.mjs` 以更新 `queryId`
* 更新 `queryId` 后运行 `node apps/scripts/checkGraphqlFeaturesStatus.mjs` 进行检查（不通过怎么办？可以来提issue）

### 爬虫

* 编辑 `SQL_CONFIG` 以启用本服务
* 运行 `yarn run init` 或 `npm run init` 以导入数据表以及在路径 `libs/assets/config.json` 创建配置文件

  [在线编辑器](https://banka2017.github.io/twitter-monitor/apps/config_page/)

* 我推荐使用 [PM2](https://pm2.keymetrics.io/)，但 nohup 和 screen 也不是不行

  ```shell
  pm2 start apps/crawler/get_tweets.mjs
  ```

* 编辑crontab

  ```shell
  #这些都是示例，用你自己的路径
  * * * * * node apps/crawler/blurhash.mjs #PHP版更好
  */10 * * * * node apps/crawler/updatePollsAndAudioSpace.mjs
  ```

* 设定 `TWEETS_SAVE_PATH` 可以将推文内容保存为json文件
* 我们使用旧版**bearer authorization token**以获得更多的推文，但这个token并不支持一些新版的特性，比如混合媒体，你可以用新的token替换之（然后不支持 **NSFW** 内容）

### Api

* 运行 `yarn run dbapi` 启用仅使用数据库的api （tmv1，twitter monitor）
* 运行 `yarn run api` 启用全部 api （上一项的全部以及 album api，online api，media proxy）
* *欢迎自行开发一个更好的api

### 看门狗

* `apps/scripts` 里面有一个叫 `watchDog.mjs` 的脚本，可以添加到 crontab 中用以检查半小时内是否有数据增加

### Archiver

* 通过**搜索API**或**时间线API**备份帐号的用户信息，大多数推文（包括回复）和媒体文件（包括当前头像和banner），`Following` 和 `Followers`
* 备份Spaces、播客（生成 ffmpeg 命令）
* **使用前请检查待备份帐号是否被搜索封禁**
* 使用方式请阅读 [archiver/README.md](https://github.com/BANKA2017/twitter-monitor/tree/node/apps/archiver)

### CloudFlare Workers

* 支持 album api, online api, media proxy 以及 翻译 api
* 部署只需要简单的几步
  - *（可跳过）阅读 https://developers.cloudflare.com/workers/wrangler/workers-kv/#create-a-kv-namespace-with-wrangler 
  - 在 <https://dash.cloudflare.com/> 创建一个叫 'twitter-monitor-workers-kv' 的 kv 命名空间，或者直接执行 `npx wrangler kv:namespace create kv`
  - 将返回的 'id' 的值拷贝到 'kv_namespaces[0].id'
  - 执行 `npx wrangler publish`


## 支持的卡片类型

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
        * image_collection_website
        * twitter_list_details
        * media_with_details_horizontal (for topic ?)
        * twitter_article
        * community_details

## 子包

- `FastText` 用于识别语言, [阅读更多](https://github.com/BANKA2017/twitter-monitor/tree/node/packages/fasttext)
- `AxiosHelper` 用于处理解决 Workers 无法使用 axios 的问题, [阅读更多](https://github.com/BANKA2017/twitter-monitor/tree/node/packages/axios-helper)

## 出处 & 感谢

* `GoogleTokenGenerator.php` 这个文件出自 [google-translate-php](https://github.com/Stichoza/google-translate-php) 并经过本人小幅修改; 现在使用 Google translate 不再需要生成 TKK，故已移除本文件
* 函数 `get_mime` 重写自 [Tieba-Cloud-Sign](https://github.com/MoeNetwork/Tieba-Cloud-Sign/blob/c4ab393045bcabde97c1a70fbe8e8d56be8f7f1e/lib/sfc.functions.php#L790)
* 在 `package.json` 里面有一个叫 `sequelize-automate-gm` 的包，这是我用来从现有的数据库中导出 model 用的小工具（虽然有一些奇奇怪怪的 bug）

## 资料

[怎么爬twitter](https://blog.nest.moe/how-to-crawl-twitter/)

[怎么爬twitter Graphql](https://blog.nest.moe/how-to-crawl-twitter-with-graphql/)

## About v2

The PHP version will be updated soon... maybe?
