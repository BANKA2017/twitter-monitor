import TwitterData from "../../libs/model/twitter_monitor/twitter_data.js"
import TmpTwitterData from "../../libs/model/twitter_monitor/tmp_twitter_data.js"
import V2AccountInfo from "../../libs/model/twitter_monitor/v2_account_info.js"
import V2Config from "../../libs/model/twitter_monitor/v2_config.js"
import V2ErrorLog from "../../libs/model/twitter_monitor/v2_error_log.js"
import V2ServerInfo from "../../libs/model/twitter_monitor/v2_server_info.js"
import V2TwitterCardApp from "../../libs/model/twitter_monitor/v2_twitter_card_app.js"
import V2TwitterCards from "../../libs/model/twitter_monitor/v2_twitter_cards.js"
import V2TwitterEntities from "../../libs/model/twitter_monitor/v2_twitter_entities.js"
import V2TwitterMedia from "../../libs/model/twitter_monitor/v2_twitter_media.js"
import V2TwitterPolls from "../../libs/model/twitter_monitor/v2_twitter_polls.js"
import V2TwitterQuote from "../../libs/model/twitter_monitor/v2_twitter_quote.js"
import V2TwitterTweets from "../../libs/model/twitter_monitor/v2_twitter_tweets.js"
import { ACTIVE_SERVICE, SQL_CONFIG } from "../../libs/assets/setting.mjs"
import dbHandle from "../../libs/core/Core.db.mjs"

import { writeFileSync, existsSync } from 'node:fs'
import { basePath } from "../../libs/share/NodeConstant.mjs"

if (!ACTIVE_SERVICE.includes('twitter_monitor')) {
    console.error('tmv3_init: init failed, twitter_monitor is not enable')
    process.exit()
}

const twitterMonitorSettings = SQL_CONFIG.filter(x => x.service === 'twitter_monitor')[0]

//import tables
await TmpTwitterData.sync()
await TwitterData.sync()
await V2AccountInfo.sync()
await V2Config.sync()
await V2ErrorLog.sync()
await V2ServerInfo.sync()
await V2TwitterCardApp.sync()
await V2TwitterCards.sync()
await V2TwitterEntities.sync()
await V2TwitterMedia.sync()
await V2TwitterPolls.sync()
await V2TwitterQuote.sync()
await V2TwitterTweets.sync()
console.log('tmv3_init: sync database table')

if (twitterMonitorSettings.dbtype === 'mysql') {
    await dbHandle.twitter_monitor.query(`ALTER TABLE \`${twitterMonitorSettings.dbname}\`.\`v2_twitter_tweets\` DROP INDEX \`full_text_origin\`;`)
    await dbHandle.twitter_monitor.query(`ALTER TABLE \`${twitterMonitorSettings.dbname}\`.\`v2_twitter_tweets\` ADD FULLTEXT(\`full_text_origin\`) WITH parser ngram;`)
    console.log('tmv3_init: sync database table for mysql')
}

//write config
if (!existsSync(basePath + '/../libs/assets/config.json')) {
    writeFileSync(basePath + '/../libs/assets/config.json', JSON.stringify({
        users: [],
        links: []
    }))
    console.log('tmv3_init: created config.json')
}
process.exit()