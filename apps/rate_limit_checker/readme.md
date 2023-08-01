# Rate limit checker

---

Rate limit checker is a tool to check rate limit of twitter api.

View data: <https://github.com/BANKA2017/twitter-rate-limit-status>

## Type

### Global

| Name          | Type              | Description  |
| :------------ | :---------------- | :----------- |
| authorization | String            | Bearer token |
| list          | Array\<ListItem\> |              |
| label         | String            |              |

### ListItem

| Name             | Type              | Description                                                  |
| :--------------- | :---------------- | :----------------------------------------------------------- |
| code             | number            | Only `200` means success                                     |
| message          | String            | Error reason                                                 |
| rate_limit       | "_"\|Number       | `_` means no data in response header, others will be numbers |
| rate_limit_reset | "_"\|Number       | `_` means no data in response header, others will be numbers |
| status           | "❌"\|"✅"          | ✅ when code is `200`                                         |
| url              | String            |                                                              |
| method           | "GET"\|"POST"     |                                                              |
| data             | String\|undefined | When method is `POST`                                        |
| label            | String            | prefix with `graphql:` and `restful:`                        |

## Build a request

```javascript
// Get url, method, data and authorization from the `rate_limit_status.json`
// Get guest_token from https://api.twitter.com/1.1/guest/activate.json via POST method
// Not easy to get Android Guest Account, you can comment it in the script

fetch(url, {
    method,
    headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        'x-guest-token': guest_token,
        cookie: `gt=${guest_token};`
    },
    body: data
})
```

## Others

The official script will execute daily.
