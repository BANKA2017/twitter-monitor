# ↑~ Web*Push X!↓

## ⚠️ Warning

Please note that using this program may result in the suspension of your twitter account.

## What?

We use [Mozilla Autopush](https://mozilla-services.github.io/autopush-rs/) to receive latest tweets.

To explain how it works, I posted 3 Chinese posts in my blog.

- [解密来自 Web Push 的 AES-GCM 消息](https://blog.nest.moe/posts/decrypt-aesgcm-messages-from-web-push)
- [通过 Web Push 接收最新的推文](https://blog.nest.moe/posts/receive-latest-tweets-by-web-push)
- [细说 Twitter 的登录流程](https://blog.nest.moe/posts/how-to-login-to-twitter#login)

### TL;DR

The script will check the login status of twitter every hour, automatically log in and enable webpush settings, and then receive content from Autopush via WebSocket.

## How?

### Follow someone

- Follow someone
- Click the bell icon beside the `Following` button in website
- Or click the bell icon then select **All Tweets & Replies/All Posts & Replies** in client.

### NPM

Node.js only, no other javascript runtimes are supported yet.

```shell
# npm
npm i ws otplib
# yarn
yarn add ws otplib
```

### Config

Most of the settings will be filled in by the script. Before using the script, you only need to enter `screen_name`, `password` and `authentication_secret`

#### path

Modify the variable `path` in `web_push.mjs` to set the path to save `config.json` and `tweets.json`.

#### authentication_secret

`authentication_secret` is an optional setting, but we recommend that you turn it on to avoid receiving email verification codes.

To obtain `authentication_secret`, open <https://twitter.com/settings/account/login_verification> and click **Authentication app**

There is a sentence below the QR code(*Can’t scan the QR code?*), click to get `authentication_secret`

```text
->THIS IS JUST A SAMPLE<-
Can’t scan the QR code?
If you can’t scan the QR code with your camera, enter the following code into the authentication app to link it to your X account.

Hint: Spaces don’t matter.
AGQ3IKIOSZ67HQFA          <-- ** `AGQ3IKIOSZ67HQFA` is the authentication_secret**
Try to scan the QR code again
```

#### config.json

Copy the configuration file from `config_example.json` and rename it to `config.json`.

When `twitter.retry` is 0, the script will stop running. You need to check whether the account password is correct and manually change the value of `twitter.retry` to 5

Multiple failed logins will cause the account to enter a protected state. Please try again after 24 hours.

```json
{
    "twitter": {
        "screen_name": "SCREEN_NAME",
        "password": "PASSWORD",
        "authentication_secret": "AUTHENTICATION_SECRET",
        "retry": 5,
        "cookies": { "auth_token": "", "ct0": "" }
    },
    "auth": "",
    "jwk": {},
    "autopush": {
        "uaid": "",
        "channel_id": "",
        "remote_settings__monitor_changes": "",
        "endpoint": ""
    }
}
```

### Execute

```shell
node web_push.mjs
```

### Callback

The default action is save tweets to `tweets.json`.

You can modify the function `callback()` in `callback.mjs` to do anything you want.

```javascript
const callback = async (dataObject, ...otherArgs) => {
    globalThis._config.tweets.push(dataObject)
    globalThis._config.saveTweets()
}
```

### Decrypted content

```json
{
  "registration_ids" : ["https://updates.push.services.mozilla.com/wpush/v2/gxxxxABlgEsJR6Wexxxxxxxbf1GNO1IuKSRyorxxxtnpJqLeLmHOLrxxxx6ToQha8_xxxxxxxxx-Af9YDFxxxxxeVzPe2aqaqwV0WR34M5xxxxxVukAbC2aM8qriscH8bbxxxvj6Q_glpLyn1lumQQGKuNCgXcKO2-ZPxxxxxR4FRavfL7jqJA0s"],
  "title": "BBC News (UK)",
  "body": "Llanberis mountain rescuers face burnout after busiest year bbc.in/4756iUr",
  "icon": "https://pbs.twimg.com/profile_images/1529107486271225859/03qcVNIk_reasonably_small.jpg",
  "timestamp": "1702975287450",
  "tag": "tweet-1737030363371716721",
  "data": {
    "lang": "en",
    "bundle_text": "{num_total, number} new {num_total, plural, one {interaction} other {interactions}}",
    "type": "tweet",
    "uri": "/BBCNews/status/1737030363371716721",
    "impression_id": "<SUBSCRIBER_TWITTER_UID>-<UNKNOWN_NUMBER>",
    "title": "BBC News (UK)",
    "body": "Llanberis mountain rescuers face burnout after busiest year bbc.in/4756iUr",
    "tag": "tweet-1737030363371716721",
    "scribe_target": "tweet"
  }
}
```

## TODO

- [ ] Deno support
- [ ] Bun support
- [ ] Check whether push is enabled
- [ ] Complete the readme

## Known issues

- Pushing is delayed and optimization is impossible
- Retweets of already tweeted tweets will not be pushed
- Some replies will not be pushed
- The content pushed is only text and does not contain any media information
- If it is not running for a long time *(I don't know how long it is)*, the push will be automatically turned off.
- You may not be able to subscribe to an account that has been shadow banned.

## Previous version

- <https://gist.github.com/BANKA2017/2ce2f0ad297b5ee5df4338363bcf719d>

## Thanks

- [github:DIYgod/RSSHub/issues ~ Twitter routes no longer work](https://github.com/DIYgod/RSSHub/issues/13049#issuecomment-1712518289)
