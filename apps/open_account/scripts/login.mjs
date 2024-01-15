// thanks https://github.com/zedeus/nitter/issues/983#issuecomment-169002582

import { writeFileSync } from 'fs'
import { GuestToken } from '../../../libs/core/Core.function.mjs'
import { AxiosFetch } from '../../../libs/core/Core.fetch.mjs'
import { getBearerToken } from '../../../libs/core/Core.android.mjs'

const username = ''
const password = ''
const android_id = '' // Android id is a 64-bit number (as a hex string), everyone can get one from fcm
const _2fa_code = ''

let authentication = null

const axios = AxiosFetch

const Authorization = getBearerToken()
const getToken = new GuestToken()
await getToken.updateGuestToken(Authorization)

const headers = {
    'User-Agent': 'TwitterAndroid/10.21.0-release.0 (310210000-r-0) ONEPLUS+A3010/9 (OnePlus;ONEPLUS+A3010;OnePlus;OnePlus3;0;;1;2016)',
    'X-Twitter-API-Version': 5,
    'X-Twitter-Client': 'TwitterAndroid',
    'X-Twitter-Client-Version': '10.21.0-release.0',
    'OS-Version': '28',
    'System-User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9; ONEPLUS A3010 Build/PKQ1.181203.001)',
    'X-Twitter-Active-User': 'yes',
    'Content-Type': 'application/json',
    'X-Twitter-Client-DeviceID': android_id,
    'x-guest-token': getToken.token.token,
    Authorization
}

const task1 = await axios.post(
    'https://api.twitter.com/1.1/onboarding/task.json?' +
        new URLSearchParams({
            flow_name: 'login',
            api_version: '1',
            known_device_token: '',
            sim_country_code: 'us'
        }).toString(),
    JSON.stringify({
        flow_token: null,
        input_flow_data: {
            country_code: null,
            flow_context: {
                referrer_context: {
                    referral_details: 'utm_source=google-play&utm_medium=organic',
                    referrer_url: ''
                },
                start_location: {
                    location: 'deeplink'
                }
            },
            requested_variant: null,
            target_user_id: 0
        }
    }),
    {
        headers
    }
)

const att = task1.headers.get('att')
headers.att = att

const task2 = await axios.post(
    'https://api.twitter.com/1.1/onboarding/task.json',
    JSON.stringify({
        flow_token: task1.data.flow_token,
        subtask_inputs: [
            {
                enter_text: {
                    suggestion_id: null,
                    text: username,
                    link: 'next_link'
                },
                subtask_id: 'LoginEnterUserIdentifier'
            }
        ]
    }),
    {
        headers
    }
)

const task3 = await axios.post(
    'https://api.twitter.com/1.1/onboarding/task.json',
    JSON.stringify({
        flow_token: task2.data.flow_token,
        subtask_inputs: [
            {
                enter_password: {
                    password: password,
                    link: 'next_link'
                },
                subtask_id: 'LoginEnterPassword'
            }
        ]
    }),
    {
        headers
    }
)

const task4 = await axios.post(
    'https://api.twitter.com/1.1/onboarding/task.json',
    JSON.stringify({
        flow_token: task3.data.flow_token,
        subtask_inputs: [
            {
                check_logged_in_account: {
                    link: 'AccountDuplicationCheck_false'
                },
                subtask_id: 'AccountDuplicationCheck'
            }
        ]
    }),
    {
        headers
    }
)

let response_text = ''

//TODO TOTP 2fa
for (const subtask of task4.data?.subtasks || []) {
    if (subtask.open_account) {
        authentication = subtask.open_account
        break
    } else if (subtask.enter_text) {
        response_text = subtask.enter_text.hint_text
        console.log(response_text)
        const task5 = axios.post(
            'https://api.twitter.com/1.1/onboarding/task.json',
            JSON.stringify({
                flow_token: task4.data.flow_token,
                subtask_inputs: [
                    {
                        enter_text: {
                            suggestion_id: null,
                            text: _2fa_code,
                            link: 'next_link'
                        },
                        subtask_id: 'LoginAcid'
                    }
                ]
            }),
            {
                headers
            }
        )

        for (const subtask of task5.data?.subtasks || []) {
            if (subtask.open_account) {
                authentication = subtask.open_account
                break
            }
        }
        break
    }
}

//writeFileSync("real_account.json", JSON.stringify(task5.data, null, 4))
console.log(authentication)

//{
//    'attribution_event': 'login',
//    'known_device_token': 'XXXXXXXXXXXXXXXXXXXXXX',
//    'next_link': {
//        'link_id': 'next_link',
//        'link_type': 'subtask',
//        'subtask_id': 'SuccessExit'
//    },
//    'oauth_token': 'XXXXXXXXXXXXXXXXXXXXXX',
//    'oauth_token_secret': 'XXXXXXXXXXXXXXXXXXXXXX',
//    'user': {
//        'id': 'XXXXXXXXXXXXXXXXXXXXXX',
//        'id_str': 'XXXXXXXXXXXXXXXXXXXXXX',
//        'name': 'XXXXXXXXXXXXXXXXXXXXXX',
//        'screen_name': 'XXXXXXXXXXXXXXXXXXXXXX'
//    }
//}
