import { basePath } from "../src/share/Constant.mjs"

/*
.service
  twitter_monitor: the latest version of twitter monitor
  tmv1: legacy version written by PHP from 2019-05 to 2020-03
  analytics: some test table for research
** if needn't one of those service, you just need to **delete** the config object or keep the password **empty**
*/
const SQL_CONFIG = [{
    servername: "127.0.0.1",
    username: "root",
    password: "",//password
    dbname: "tmv3",
    dbtype: "mysql",// mariadb
    service: "twitter_monitor"
}, {
    servername: "127.0.0.1",
    username: "root",
    password: "",//password
    dbname: "tmv1",
    dbtype: "mysql",// mariadb
    service: "tmv1"
}, {
    servername: "127.0.0.1",
    username: "root",
    password: "",//password
    dbname: "twitter_analytics",
    dbtype: "mysql",// mariadb
    service: "analytics"
}]

const ACTIVE_SERVICE = SQL_CONFIG.filter(x => x.password && ["twitter_monitor", "tmv1", "analytics"].includes(x.service)).map(x => x.service)

const CONFIG_ID = 1//just for multiple config

const GRAPHQL_MODE = true

const CYCLE_SECONDS = 60//seconds

const TRANSLATE_TARGET = 'zh-CN'//zh-CN, zh-TW, en-US, etc.//注: 使用微软翻译时简中应填写 zh-Hans/zh-Hant //注2: 此处用于无目标语言时翻译使用的默认目标语言
const TRANSLATOR_PLATFORM = 'google'//google, microsoft

const PROXY_CONFIG = '' //http://127.0.0.1:1081

const ALERT_TOKEN = ''//for telegram bot, keep empty if needn't
const ALERT_PUSH_TO = ''//for telegram bot, keep empty if needn't

const EXPRESS_PORT = 3000
const EXPRESS_ALLOW_ORIGIN = '*'

const STATIC_PATH = ''//basePath + '/../static'
const TWEETS_SAVE_PATH = ''//basePath + '/../savetweets/'

export {SQL_CONFIG, ACTIVE_SERVICE, CONFIG_ID, GRAPHQL_MODE, TRANSLATE_TARGET, TRANSLATOR_PLATFORM, PROXY_CONFIG, ALERT_TOKEN, ALERT_PUSH_TO, EXPRESS_ALLOW_ORIGIN, TWEETS_SAVE_PATH, EXPRESS_PORT, STATIC_PATH, CYCLE_SECONDS}