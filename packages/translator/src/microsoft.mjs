import axiosFetch from "../axios.mjs"

const MicrosoftTranslator = async (text = '', target = 'en', type = 0) => {
    if (!text) {return await Promise.reject('Empty text #MicrosoftTranslator ')}

    if (type === 0) {
        //get IG, token, key
        let page = ''
        try {
            page = await axiosFetch.get('https://www.bing.com/translator')
        } catch (e) {
            return await Promise.reject('Unable to get translator page #MicrosoftTranslator ')
        }
        if (page) {

            let _G = null, params_RichTranslateHelper = null
            try {
                _G = (new Function('return ' + /_G=(\{.+?\});/.exec(page.data)[1]))()
                params_RichTranslateHelper = (new Function('return ' + /params_RichTranslateHelper = (\[.+?\]);/.exec(page.data)[1]))()
            } catch(e) {
                return await Promise.reject('Unable to get variables #MicrosoftTranslator ')
            }
            return await new Promise((resolve, reject) => {
                axiosFetch.post('https://www.bing.com/ttranslatev3?' + (new URLSearchParams({
                    isVertical: 1,
                    IG: _G.IG,
                    IID: 'translator.5024.1'
                })).toString(), (new URLSearchParams({
                    fromLang: 'auto-detect',
                    text,
                    to: target,
                    token: params_RichTranslateHelper[1],
                    key: params_RichTranslateHelper[0]
                })).toString()).then(response => {
                    if (!response.data.statusCode && response.data instanceof Array ) {
                        resolve(response.data)
                    }
                    reject(response.data)
                }).catch(e => {
                    reject(e)
                })
            })
        } else {
            return await Promise.reject('Empty page #MicrosoftTranslator ')
        }
    } else if (type === 1) {
        //get jwt
        let jwt = null
        try {
            jwt = (await axiosFetch.get('https://edge.microsoft.com/translate/auth')).data
        } catch (e) {
            return await Promise.reject('Unable to get jwt #MicrosoftTranslator ')
        }
        if (jwt) {
            return await new Promise((resolve, reject) => {
                axiosFetch.post(`https://api.cognitive.microsofttranslator.com/translate?from=&to=${target}&api-version=3.0&includeSentenceLength=true`, JSON.stringify(text instanceof Array ? text.map(tmpText => ({Text: tmpText})) : [{Text: text}]), {
                    headers: {
                        'content-type': 'application/json',
                        authorization: `Bearer ${jwt}`
                    }
                }).then(response => {
                    if (response.data && response.data instanceof Array) {
                        resolve(response.data)
                    }
                    reject(response.data)
                }).catch(e => {
                    reject(e)
                })
            })
        } else {
            return await Promise.reject('Invalid jwt #MicrosoftTranslator ')
        }
    } else {
        return await Promise.reject('Invalid type #MicrosoftTranslator ')
    }
    
}

export {MicrosoftTranslator}
