import axiosFetch from "../axios.mjs"

const SogouTranslator = async (text = '', target = 'en', type = 0) => {
    if (!text) {return await Promise.reject('Empty text #SogouTranslator ')}

    let body = JSON.stringify({
        from_lang: "auto",
        to_lang: target,
        trans_frag: text instanceof Array ? text.map(x => ({text: x})) : [{text}]
    })
    return await new Promise((resolve, reject) => {
        axiosFetch.post('https://go.ie.sogou.com/qbpc/translate', `S-Param=${body}`).then(response => {
            if (response?.data?.data?.trans_result && response?.data?.data?.trans_result instanceof Array) {
                resolve(response.data)
            }
            reject(response.data)
        }).catch(e => {
            reject(e)
        })
    })
}

export {SogouTranslator}
