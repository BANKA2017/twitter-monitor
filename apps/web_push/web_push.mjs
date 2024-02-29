import Config from './config.mjs'
import Decrypt from './decrypt.mjs'
import Twitter, { VAPID, loginToTwitter, setupTwitterPushConfig } from './twitter.mjs'
import { base64_to_base64url, buffer_to_base64 } from './utils.mjs'
import WS from './websocket.mjs'

// set your data path
const path = '.'

globalThis._config = new Config(path)
globalThis._config.initData()

// init decrypt
globalThis._decrypt = new Decrypt()
await globalThis._decrypt.init(globalThis._config.config.jwk, globalThis._config.config.auth)
if (!globalThis._config.config.jwk.d || !(globalThis._config.config.jwk.x && globalThis._config.config.jwk.y)) {
    const exportedKey = await globalThis._decrypt.exportKey()
    globalThis._config.config.jwk = exportedKey.jwk
    globalThis._config.config.auth = exportedKey.auth
    globalThis._config.saveConfig()
}

// init twitter
globalThis._twitter = new Twitter(globalThis._config.config.twitter.cookies)
if (!globalThis._twitter.cookies?.auth_token || !globalThis._twitter.cookies?.ct0) {
    try {
        await loginToTwitter()
    } catch (e) {
        throw new Error('login failed', e)
    }
}

// init web push
globalThis._web_push = new WS(globalThis._config.config.autopush.uaid, globalThis._config.config.autopush.remote_settings__monitor_changes, globalThis._config.config.autopush.endpoint, globalThis._config.config.autopush.channel_id)
globalThis._web_push.initWebsocket()

// waiting for the first config
let alreadyRegistered = false
let loopCount = 0
for (;;) {
    if (globalThis._web_push.isClosed) {
        loopCount++
        console.log('*|', new Date(), 'waiting for connecting to the webpush server', loopCount, loopCount > 1 ? 'seconds' : 'second')
    } else {
        // we have to wait for the uaid
        if (!globalThis._config.config.autopush.uaid) {
            if (globalThis._web_push.uaid) {
                globalThis._config.config.autopush.uaid = globalThis._web_push.uaid
                // globalThis._config.config.autopush.remote_settings__monitor_changes = globalThis._web_push.remote_settings__monitor_changes
                globalThis._config.saveConfig()
            }
        }

        if (!globalThis._config.config.autopush.endpoint) {
            if (!alreadyRegistered) {
                await globalThis._web_push.register(VAPID)
                alreadyRegistered = true
            }

            globalThis._config.config.autopush.channel_id = globalThis._web_push.channelID
            globalThis._config.config.autopush.endpoint = globalThis._web_push.endpoint
            // once we have the endpoint, we can setup twitter push config
            if (globalThis._config.config.autopush.endpoint) {
                try {
                    await setupTwitterPushConfig()
                    globalThis._config.saveConfig()
                } catch (e) {
                    throw new Error('setupTwitterPushConfig failed', e)
                }
            }
        }
    }
    if (globalThis._config.config.autopush.uaid && globalThis._config.config.autopush.endpoint) {
        break
    }
    await new Promise((resolve) => {
        setTimeout(resolve, 1000)
    })
}

// checkin
const twitterCheckIn = async () => {
    console.log('*|', new Date(), 'checkin')
    try {
        const twitterWebPushCheckIn = await globalThis._twitter.postNotificationsCheckin(
            globalThis._twitter.twitterSettingsPayloadBuilder(globalThis._web_push.endpoint, base64_to_base64url(buffer_to_base64(globalThis._decrypt.publicKey)), base64_to_base64url(buffer_to_base64(globalThis._decrypt.auth)), 'login')
        )
        //const data = await twitterWebPushCheckIn.json()
        if (twitterWebPushCheckIn.status !== 200) {
            // re-login
            await loginToTwitter()
            await setupTwitterPushConfig()
        }
        //TODO How to determine whether push is enabled?
    } catch (e) {
        console.error('X|', new Date(), e)
    }
}
setInterval(twitterCheckIn, 1000 * 60 * 60 * 2)
