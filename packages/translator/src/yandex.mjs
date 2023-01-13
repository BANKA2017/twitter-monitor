import axiosFetch from "../axios.mjs"

const getYandexSession = async () => {
    try {
        const page = await axiosFetch('https://translate.yandex.com')

    } catch (e) {
        return '_'
    }
}

const YandexDetect = async (text = '') => {

}


const YandexTranslator = async (text = '', target = 'en', type = 0) => {
    if (!text) {return await Promise.reject('Empty text #YandexTranslator ')}

    //from yandex browser
    const generateSid = () => {
        var t, e, n = Date.now().toString(16)
        for (t = 0, e = 16 - n.length; t < e; t++) {
            n += Math.floor(16 * Math.random()).toString(16)
        }
        return n
    }

    const supportedLanguageList = ["af","sq","am","ar","hy","az","ba","eu","be","bn","bs","bg","my","ca","ceb","zh","cv","hr","cs","da","nl","sjn","emj","en","eo","et","fi","fr","gl","ka","de","el","gu","ht","he","mrj","hi","hu","is","id","ga","it","ja","jv","kn","kk","kazlat","km","ko","ky","lo","la","lv","lt","lb","mk","mg","ms","ml","mt","mi","mr","mhr","mn","ne","no","pap","fa","pl","pt","pt-BR","pa","ro","ru","gd","sr","si","sk","sl","es","su","sw","sv","tl","tg","ta","tt","te","th","tr","udm","uk","ur","uz","uzbcyr","vi","cy","xh","sah","yi","zu"]

    if (!global.LanguageIdentification) {
        const { LanguageIdentification } = await import("../../fasttext/language.mjs")
        if (!LanguageIdentification) {
            return await Promise.reject('Not predict module #YandexTranslator ')
        }
        global.LanguageIdentification = new LanguageIdentification
    }
    const tmpLangList = global.LanguageIdentification.GetLanguage((text instanceof Array) ? text.join("\n") : text)
    let lang = ''
    for (const tmpLangItem of tmpLangList) {
        if (supportedLanguageList.includes(tmpLangItem[1])) {
            lang = tmpLangItem[1]
            break
        }
    }

    if (!lang) {
        return await Promise.reject('Not supported language #YandexTranslator ')
    }

    let query = new URLSearchParams({
        translateMode: 'context',
        context_title: 'Twitter Monitor Translator',
        id: `${generateSid()}-0-0`,
        srv: 'yabrowser',
        lang: `${lang}-${target}`,
        format: 'html',
        options: 2
    })
    return await new Promise((resolve, reject) => {
        axiosFetch.get('https://browser.translate.yandex.net/api/v1/tr.json/translate?' + query.toString() + '&text=' + ((text instanceof Array) ? text.map(x => encodeURIComponent(x)).join('&text=') : encodeURIComponent(text))).then(response => {
            if (response?.data?.text && response?.data?.text instanceof Array) {
                resolve(response.data)
            }
            reject(response.data)
        }).catch(e => {
            reject(e)
        })
    })
}

export {YandexTranslator}
