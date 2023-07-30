import { getRecommendations } from '../../libs/core/Core.fetch.mjs'
import { Log, GuestToken, Sleep } from '../../libs/core/Core.function.mjs'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import dbHandle from '../../libs/core/Core.db.mjs'
import AnalyticsAccountList from '../../libs/model/analytics/analytics_account_list.js'
import { basePath } from '../../libs/share/NodeConstant.mjs'

const onceCount = 27
const entryUid = '3009772568'

let AccountList
let CheckedList
if (existsSync(basePath + '/../libs/assets/analytics/account.json')) {
    const tmpList = JSON.parse(readFileSync(basePath + '/../libs/assets/analytics/account.json'))
    AccountList = new Set(tmpList.accountList)
    CheckedList = new Set(tmpList.checkedList)
} else {
    AccountList = new Set([entryUid])
    CheckedList = new Set()
}

global.guest_token = new GuestToken()
await global.guest_token.updateGuestToken(1)
let guestTokenCount = 1
let count = 0
let throwCount = 0
Log(false, 'log', AccountList.size, CheckedList.size, count, throwCount)
while (AccountList.size) {
    if (guestTokenCount % 1500 === 0) {
        Log(false, 'log', `tmv3_analytics: guest token refresh count is upto ${guestTokenCount}, sleep for 30 mins`)
        await Sleep(1000 * 60 * 30)
    }
    let tmpCount = AccountList.size > onceCount ? onceCount : AccountList.size
    const tmpSetIter = AccountList.values()
    const tmpAccount = []
    while (tmpCount--) {
        tmpAccount.push(tmpSetIter.next().value)
    }
    if (!global.guest_token.preCheck('Recommendation', onceCount)) {
        await global.guest_token.updateGuestToken(1)
        guestTokenCount++
    }
    Log(false, 'log', tmpAccount)
    const tmpList = await getRecommendations({ user: tmpAccount, guest_token: global.guest_token.token, count: 999 })
    //Log(false, 'log', tmpList)
    const t = await dbHandle.analytics.transaction()
    for (const listIndex in tmpList) {
        if (tmpList[listIndex].status === 'fulfilled') {
            //Log(false, 'log', tmpList[listIndex].value.data)
            await AnalyticsAccountList.bulkCreate(
                tmpList[listIndex].value.data.map((account) => ({
                    uid: account.user.id_str,
                    name: account.user.screen_name,
                    display_name: account.user.name,
                    previous: tmpAccount[listIndex],
                    raw: AccountList.has(account.user.id_str) || CheckedList.has(account.user.id_str) ? '' : JSON.stringify(account.user)
                })),
                { transaction: t }
            )
            tmpList[listIndex].value.data
                .filter((x) => !AccountList.has(x.user_id) && !CheckedList.has(x.user_id))
                .map((x) => x.user_id)
                .forEach((x) => {
                    AccountList.add(x)
                })
            AccountList.delete(tmpAccount[listIndex])
            CheckedList.add(tmpAccount[listIndex])
        } else {
            Log(false, 'log', tmpList[listIndex])
            throwCount++
        }
        count++
        global.guest_token.updateRateLimit('Recommendation', 1)
    }
    try {
        await t.commit()
    } catch (e) {
        Log(false, 'error', e)
    }
    writeFileSync(
        basePath + '/../libs/assets/analytics/account.json',
        JSON.stringify({
            accountList: [...AccountList], //accountList
            checkedList: [...CheckedList] //checkedList
        })
    )
    //process.exit()
    Log(false, 'log', AccountList.size, CheckedList.size, count, throwCount)
}
process.exit()
