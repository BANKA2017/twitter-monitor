import { ALERT_TOKEN, ALERT_PUSH_TO } from '../../libs/assets/setting.mjs'
import axiosFetch from 'axios-helper'
import { Log } from './Core.function.mjs'

const TGPush = async (text = '') => {
    if (ALERT_TOKEN.length) {
        text = [...text]
        const partCount = Math.ceil(text.length / 3000)
        let tmpPartIndex = 0
        for (; tmpPartIndex < partCount; tmpPartIndex++) {
            await axiosFetch()
                .post(`https://api.telegram.org/bot${ALERT_TOKEN}/sendMessage`, {
                    chat_id: ALERT_PUSH_TO,
                    text: text.slice(tmpPartIndex * 3000, tmpPartIndex * 3000 + 3000).join('')
                })
                .then((response) => {
                    if (response.data?.ok) {
                        Log(false, 'log', `TGPush: Successful to push log #part${tmpPartIndex} to chat ->${ALERT_PUSH_TO}<-`)
                    } else {
                        Log(false, 'log', `TGPush: Error #part${response.data?.description}`)
                    }
                })
                .catch((e) => {
                    Log(false, 'log', e)
                })
        }
    }
}

export { TGPush }
