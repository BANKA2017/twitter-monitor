import axiosFetch from 'axios-helper'
import { Log, GuestToken } from '../../../libs/core/Core.function.mjs'
import { existsSync, readFileSync, writeFileSync } from 'fs'

const key = '<SECRET_TOKEN>'
const endpoint = 'https://example.prefix.workers.dev/upload/account'

const axios = axiosFetch()

let list = []
let count = 0

if (existsSync('./guest_accounts.json')) {
    list = JSON.parse(readFileSync('./guest_accounts.json').toString())
}
while (true) {
    const get_token = new GuestToken('android')
    await get_token.openAccountInit()
    count++
    Log(false, 'log', `count: ${count}`)
    if (get_token.open_account?.oauth_token && get_token.open_account?.oauth_token_secret) {
        const accountString = JSON.stringify(get_token.open_account)
        const res = (
            await axios(endpoint, {
                method: 'POST',
                data: new URLSearchParams({
                    key,
                    account: accountString
                }).toString()
            })
        ).data
        Log(false, 'log', res)
        if (res.code === 200) {
            Log(false, 'log', 'open_account: Upload success')
        } else {
            Log(false, 'log', 'open_account: Unable to upload, only save in local')
        }
        list.push(get_token.open_account)
        writeFileSync('./guest_accounts.json', JSON.stringify(list))
    } else {
        Log(false, 'log', 'open_account: Banned')
        break
    }
}
