import axiosFetch from '../axios.mjs'
import {GoogleTranslateTk} from './google.mjs'

//const gtk =[320305, 131321201]

const baiduPrefix = (text) => {
    let textArray = [...text]
    if (textArray.length > 30) {
        return textArray.slice(0, 10).join("") + textArray.slice(Math.floor(textArray.length / 2) - 5, Math.floor(textArray.length / 2) + 5).join("") + textArray.slice(-10).join("")
    }
    return text
}

const getBaiduTranslatorToken = async (cookie = '', loop = 0) => {
    if (loop > 5) { return {message: 'Unable to get translator page (Loop > 5) #BaiduTranslator ', page: null, cookie: null} }
    let page = ''
    try {
        page = await axiosFetch.get('https://fanyi.baidu.com/', {headers: { cookie }})
        if (page.headers['set-cookie']) {
            //get cookie again
            return getBaiduTranslatorToken(page.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join(';'), ++loop)
        } else {
            return {message: null, page: page.data, cookie}
        }
    } catch (e) {
        return {message: 'Unable to get translator page #BaiduTranslator ', page: null, cookie: null}
    }
}

const BaiduLanguagePredict = async (text = '', cookie = '') => {
    if (!text) {return '_'}
    try {
        const languageResult = await axiosFetch.post('https://fanyi.baidu.com/langdetect', (new URLSearchParams({query: text})).toString(), { cookie })
        if (languageResult.data?.error === 0 && languageResult.data?.lan) {
            return languageResult.data?.lan
        } else {
            return '_'
        }
    } catch (e) {
        return '_'
    }
    
}

const BaiduTranslator = async (text = '', target = 'en', type = 1) => {
    if (!text) {return await Promise.reject('Empty text #BaiduTranslator ')}

    //get baidu translator page
    const {message, page, cookie} = await getBaiduTranslatorToken()
    if (message) {
        return await Promise.reject('Unable to get translator page #BaiduTranslator ')
    }
    if (page && cookie) {
        let common = null, gtk = null
        try {
            common = (new Function('let localStorage={getItem:function(n){return 1}};return ' + /window\['common'\](?:\s|)=(?:\s|)([^;]+);/.exec(page)[1]))()
            gtk = String((new Function('return ' + /window\.gtk(?:\s|)=(?:\s|)"([^;]+)";/.exec(page)[1]))()).split('.').map(x => Number(x))
        } catch(e) {
            return await Promise.reject('Unable to get variables #BaiduTranslator ')
        }

        const fromLaguage = await BaiduLanguagePredict(text, cookie)
        
        return await new Promise((resolve, reject) => {
            axiosFetch.post('https://fanyi.baidu.com/v2transapi?' + (new URLSearchParams({
                from: fromLaguage,
                to: target
            })).toString(), (new URLSearchParams({
                from: fromLaguage,
                to: target,
                query: text,
                transtype: 'translang',
                simple_means_flag: 3,
                sign: GoogleTranslateTk(baiduPrefix(text), gtk),
                token: common.token,
                domain: 'common'
            })).toString(), {
                headers: { cookie }
            }).then(response => {
                if (response?.data?.trans_result?.data && response?.data?.trans_result?.data instanceof Array ) {
                    resolve(response.data)
                }
                reject(response.data)
            }).catch(e => {
                reject(e)
            })
        })
    } else {
        return await Promise.reject('Empty text #BaiduTranslator ')
    }
}

export {BaiduTranslator, BaiduLanguagePredict}
