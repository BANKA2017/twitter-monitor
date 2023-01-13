import axiosFetch from "../axios.mjs"

const GoogleTranslate = async (text = '', target = 'en', type = 0) => {
    if (!text) {return await Promise.reject('Empty text #GoogleTransle ')}
    if (type === 0) {
        const query = new URLSearchParams({"client": "webapp", "sl": "auto", "tl": target, "hl": target, "dt": "t", "clearbtn": 1, "otf": 1, "pc": 1, "ssel": 0, "tsel": 0, "kc": 2, "tk": "", "q": text})
        return await new Promise((resolve, reject) => {
            axiosFetch.get('https://translate.google.com/translate_a/single?' + query.toString(), {
                headers: {
                    referer: 'https://translate.google.com/',
                    authority: 'translate.google.com'
                }
            }).then(response => {
                if (response.data && Array.isArray(response.data[0])) {
                    resolve(response.data)
                    //resolve(response.data[0].filter(translate => translate).map(translate => translate[0]).join(''))
                }
                reject(response.data)
            }).catch(e => {
                reject(e)
            })
        })
    } else if (type === 1) {
        //curl 'https://translate.googleapis.com/translate_a/t?anno=3&client=wt_lib&format=html&v=1.0&key&sl=auto&tl=zh&tc=1&sr=1&tk=164775.366094&mode=1' --data-raw 'q=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF' --compressed
        //https://vielhuber.de/zh-cn/blog-zh-cn/google-translation-api-hacking/
        let query = new URLSearchParams({anno: 4, client: 'te_lib', format: 'html', v: 1.0, key: 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw', sl: 'auto', tl: target, tc: 1, sr: 1, tk: GoogleTranslateTk(text), mode: 1})
        //let formData = new URLSearchParams({q: text})
        return await new Promise((resolve, reject) => {
            axiosFetch.post('https://translate.googleapis.com/translate_a/t?' + query.toString(), 'q=' + ((text instanceof Array) ? text.map(x => encodeURIComponent(x)).join('&q=') : encodeURIComponent(text))).then(response => {
                if (response.data && response.data instanceof Array) {
                    resolve(response.data)
                    //resolve(response.data[0].filter(translate => translate).map(translate => translate[0]).join(''))
                }
                reject(response.data)
            }).catch(e => {
                reject(e)
            })
        })
    } else {
        return await Promise.reject('Invalid type #GoogleTransle ')
    }
}

const hl = function (a, b) {
    let c = 0
    for (; c < b.length - 2; c += 3) {
        let d = b.charAt(c + 2)
        d = "a" <= d ? (d.charCodeAt(0) - 87) : Number(d)
        d = "+" == b.charAt(c + 1) ? (a >>> d) : (a << d)
        a = "+" == b.charAt(c) ? (a + d & 4294967295) : (a ^ d)
    }
    return a
}
const getCharCodeList = function (text) {
    let charCodeList = [], charCodeListIndex = 0
    for (let index = 0; index < text.length; index++) {
        let charCode = text.charCodeAt(index)
        if (128 > charCode) {
            charCodeList[charCodeListIndex++] = charCode
        } else {
            if (2048 > charCode) {
                charCodeList[charCodeListIndex++] = charCode >> 6 | 192
            } else  {
                if (55296 == (charCode & 64512) && index + 1 < text.length && 56320 == (text.charCodeAt(index + 1) & 64512)) {
                    charCode = 65536 + ((charCode & 1023) << 10) + (text.charCodeAt(++index) & 1023)
                    charCodeList[charCodeListIndex++] = charCode >> 18 | 240
                    charCodeList[charCodeListIndex++] = charCode >> 12 & 63 | 128
                } else {
                    charCodeList[charCodeListIndex++] = charCode >> 12 | 224
                }
                charCodeList[charCodeListIndex++] = charCode >> 6 & 63 | 128
            }
            charCodeList[charCodeListIndex++] = charCode & 63 | 128
        }
    }
    return charCodeList
}

//https://translate.google.com/translate_a/element.js?cb=gtElInit&hl=zh-CN&client=wt c._ctkk
const GoogleTranslateTk = (originalText = '', tkk = [464385, 3806605782]) => {
    //from https://translate.googleapis.com/_/translate_http/_/js/k=translate_http.tr.zh_CN.D7QeyoDkDhY.O/d=1/exm=el_conf/ed=1/rs=AN8SPfq20C5s1IToiD2r2PKoyh-SRQysPA/m=el_main
    let text
    if (originalText instanceof Array) {
        text = JSON.parse(JSON.stringify(originalText)).join('')
    } else {
        text = originalText
    }
    const charCodeList = getCharCodeList(text)
    let a = tkk[0]
    for (const charCode of charCodeList) {
        a += charCode
        a = hl(a, '+-a^+6')
    }
    a = hl(a, '+-3^+b+-f')
    a ^= tkk[1] ? tkk[1] + 0 : 0
    if (a < 0) {
        a = (a & 2147483647) + 2147483648
    }
    a %= 1E6
    return a.toString() + '.' + (a ^ tkk[0])
}

export {GoogleTranslate, GoogleTranslateTk}
