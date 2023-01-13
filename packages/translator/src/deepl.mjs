import axiosFetch from "../axios.mjs"
import {webcrypto} from 'node:crypto'

const getId = () => webcrypto.getRandomValues(new Uint32Array(1))[0]


//TODO 429 loop, won't fix
const DeepL = async (text = '', target = 'en', type = 0) => {
    if (!text) {return await Promise.reject('Empty text #GoogleTransle ')}

    if (/^zh(_|\-|$)/.test(target.toLowerCase())) {
        target = 'zh'
    }
    //{"jsonrpc":"2.0","method": "LMT_handle_texts","params":{"texts":[{"text":"[Schoolgirl Strikers: Animation Channel]"}],"splitting":"newlines","lang":{"target_lang":"ZH","source_lang_user_selected":"auto","preference":{"weight":{}}},"timestamp":0},"id":0}
    return await new Promise((resolve, reject) => {
        axiosFetch.post('https://www2.deepl.com/jsonrpc?client=chrome-extension,0.30.0', {
            jsonrpc: "2.0",
            method: "LMT_handle_texts",
            params: {
                texts: (text instanceof Array) ? text.map(x => ({text: x})) : [{text}],
                splitting: "newlines",
                lang: {
                    target_lang: target.toUpperCase(),
                    source_lang_user_selected: "auto",
                    preference: { weight: {}},
                },
                timestamp: Number(new Date()),
                id: webcrypto.getRandomValues(new Uint32Array(1))[0]
            }
        }, ).then(response => {
            //console.log(response.data)
            resolve(response.data)
        }).catch(e => {
            //console.log(e)
            reject(e)
        })
    })
}

export {DeepL}
