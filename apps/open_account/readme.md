# Open Accounts

---

## What is open account

Open Account is the account used for OAuth requests, which can come from Twitter official clients or third-party clients.

The most important keys is `oauth_token` and `oauth_token_secret`.

Some accounts do not need to log in, we call them **guest accounts**.

## Scripts

- `get_guest_token.js` is used to obtain and print the guest account on the console, for `Node.js/Deno...`. Deno supports the use of system proxies.
- `get_and_upload_guest_account.mjs` is used to obtain guest accounts and upload them to the guest account pool.
- `get_open_account_info.mjs` is used to obtain the information of the account.

## Backend (Cloudflare Workers)

The backend is suitable for Cloudflare workers, before deployment, some settings are required.

```toml
# part of backend/wrangler.toml

# read https://developers.cloudflare.com/workers/wrangler/workers-kv/#create-a-kv-namespace-with-wrangler 
# and create kv space named 'twitter-monitor-workers-kv' in https://dash.cloudflare.com/
# or executed `npx wrangler kv:namespace create kv`
# then copy the 'id' into 'kv_namespaces[0].id' to replace '<YOUR_ID>'
kv_namespaces = [
    { binding = "kv", preview_id = "NOT_NECESSARY_TO_CHANGE_THIS_VALUE_KV", id = "<YOUR_ID>" }
]
```

```yaml
# backend/.dev.vars
# also in `get_and_upload_guest_account.mjs`
SECRET_WORKERS_KEY="<SECRET_TOKEN>" # <- any untraversable string
```

Then you need to modify the variables `key` and `endpoint` of the script `get_and_upload_guest_account.mjs`

```javascript
// scripts/get_and_upload_guest_account.mjs
const key = '<SECRET_TOKEN>' // <- same with SECRET_WORKERS_KEY
const endpoint = 'https://example.prefix.workers.dev/upload/account' // <- you can find it from cloudflare dashboard
```

## Proxy

Building a guest account pool requires a large number of proxy servers.

Create a file named `proxy.txt` in the path `scripts/` and fill in the http proxy (We don't support socks proxy yet) information:

```
# if one line is not starts with `http`, script will ignore it
# use `\n`, don not `\r\n` or `\r`
# <- ignore
# https://192.168.1.100:7890 <- ignore
http://127.0.0.1:7890
http://user1:password@192.168.1.101:7890
```

\* Only script `get_and_upload_guest_account.mjs` supports proxy pools.

## Tools

- [OAuth signature builder](https://banka2017.github.io/twitter-monitor/apps/online_tools/oauth_signature_builder.html)

## Compatible with Nitter

The account pool created by the script `get_and_upload_guest_account.mjs` is compatible with [nitter](https://github.com/zedeus/nitter/wiki/Guest-Account-Branch-Deployment), you need to export all the values, then put them in an array, and then name it `guest_accounts.json` and save it to the project root directory

\* You can even get the `oauth_token` and `oauth_token_secret` of the real account by capturing packets or [some scripts](https://github.com/zedeus/nitter/issues/983#issuecomment-169002582)

```json
// for twitter monitor
// guest_accounts.json
[
    {
        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F",
        "user": {
            "id": 0,
            "id_str": "0",
            "name": "Open App User",
            "screen_name": "_LO_0830",
            "user_type": "Soft"
        },
        "next_link": {
            "link_type": "subtask",
            "link_id": "next_link",
            "subtask_id": "OpenAppFlowStartAccountSetupOpenLink"
        },
        "oauth_token": "0-",
        "oauth_token_secret": "",
        "attribution_event": "signup"
    },
    {
        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F",
        "oauth_token": "0-",
        "oauth_token_secret": "",
        "user": {
            "id": 0,
            "id_str": "0",
            "name": "Open App User",
            "screen_name": "_LO_0825",
            "user_type": "Soft"
        }
    }
]

// for nitter
// guest_accounts.jsonl
{"user":{"id":0,"id_str":"0","name":"Open App User","screen_name":"_LO_0830","user_type":"Soft"},"next_link":{"link_type":"subtask","link_id":"next_link","subtask_id":"OpenAppFlowStartAccountSetupOpenLink"},"oauth_token":"0-","oauth_token_secret":"","attribution_event":"signup"}
{"oauth_token":"0-","oauth_token_secret":"","user":{"id":0,"id_str":"0","name":"Open App User","screen_name":"_LO_0825","user_type":"Soft"}}

```

Bearer token for Twitter Android client needs to be added manually when using `guest_accounts.json` from nitter

```javascript
let guest_accounts = []// <- use content from guest_accounts.json to replace this empty array
guest_accounts.forEach(account => {
    account.authorization = "Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F"
})
console.log(JSON.stringify(guest_accounts))
// then save the string
```

## TODO

- [x] Will be compatible with the format of the guest account pool used by nitter
- [ ] Building a pool of guest accounts also requires a large number of proxy servers
- [ ] Native backend
- [x] Scripts for real account
- [x] Proxy pool
