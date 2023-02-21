//Translator

import { GoogleTranslate } from "../../packages/translator/src/google.mjs"
import { MicrosoftTranslator } from "../../packages/translator/src/microsoft.mjs"
import { SogouTranslator } from "../../packages/translator/src/sogou.mjs"
import { YandexTranslator } from "../../packages/translator/src/yandex.mjs"
import { TRANSLATE_TARGET, TRANSLATOR_PLATFORM } from "../../assets/setting.mjs"
import { GetEntitiesFromText } from "./Core.function.mjs"
import { BaiduTranslator } from "../../packages/translator/src/baidu.mjs"

const translatorPlatform = {
    google: 'Google Translate',
    microsoft: 'Microsoft Translator',
    yandex: 'Yandex Translate',
    sogou: '搜狗翻译',
    baidu: '百度翻译',
}

const notSupportedEntities = ['baidu']

const isChs = (lang = 'zh') => /^zh(?:_|\-)(?:cn|sg|my|chs)|zh|chs|zho$/.test(lang.toLowerCase())
const isCht = (lang = 'zh_tw') => /^zh(?:_|\-)(?:tw|hk|mo|cht)|cht$/.test(lang.toLowerCase())

const targetLanguagePrefix = (target = 'en', platform = 'google') => {
    switch (platform) {
        //google is not necessary
        //case 'google':
        //    break
        case 'microsoft':
            if (isChs(target)) {
                target = 'zh-Hans'
            } else if (isCht(target)) {
                target = 'zh-Hant'
            }
            break
        case 'yandex':
            //for Chinese
            if (/^zh(_|\-|$)/.test(target.toLowerCase())) {
                target = 'zh'
            }
            break
        case 'sogou':
            //for Chinese //NOT SUPPORTED CHT 
            if (/^zh(_|\-|$)/.test(target.toLowerCase())) {
                target = 'zh-CHS'
            }
            break
        case 'baidu':
            if (isChs(target)) {
                target = 'zh'
            } else if (isCht(target)) {
                target = 'cht'
            } else if (target.toLowerCase() === 'ja') {
                target = 'jp'
            } else if (target.toLowerCase() === 'ko') {
                target === 'kor'
            }
            break

    }
    return target
}

const Translate = async (trInfo = null, target = TRANSLATE_TARGET, platform = TRANSLATOR_PLATFORM) => {
    if (!trInfo) {
        trInfo = { full_text: "", cache: false, target, translate_source: "Twitter Monitor Translator", translate: "", entities: []}
    }
    platform = platform.toLowerCase()
    if (!translatorPlatform[platform]) {
        return {message: 'Not supported Platform', content: trInfo}
    }


    let entitiesList = GetEntitiesFromText(trInfo.full_text, 'tweets')
    let text = entitiesList.originText
    if (!notSupportedEntities.includes(platform)) {
        entitiesList.entities.forEach((entity, index) => {
            text = text.replace(RegExp(`(^|\\s|\\p{P}|\\p{S})${['hashtag', 'symbol'].includes(entity.type) ? (entity.type === 'hashtag' ? '#' : '$') + entity.text : entity.text}($|\\s|\\p{P}|\\p{S})`, 'gmu'), ((platform, index) => {
                switch (platform) {
                    case 'yandex':
                        //same as google//<a><i><span>
                    case 'google':
                        return `$1<a id=${index}><></a>$2`
                    case 'microsoft':
                        return `$1<b${index}></b${index}>$2`
                    case 'sogou':
                        return `$1#${index}#$2`
                }
            })(platform, index) )
        })
    }
    
    trInfo.cache = false
    trInfo.target = target
    trInfo.translate_source = translatorPlatform[platform]
    trInfo.translate = ''
    try {
        let tmpTranslate = ''
        switch (platform) {
            case 'google':
                tmpTranslate = (await GoogleTranslate(text.split("\n"), targetLanguagePrefix(target, platform), 1)).map(x => x[0]).join("\n")
                break
            case 'microsoft':
                tmpTranslate = (await MicrosoftTranslator(text.split("\n"), targetLanguagePrefix(target, platform), 1)).map(x => x.translations[0].text).join("\n")
                break
            case 'sogou':
                tmpTranslate = (await SogouTranslator(text.split("\n"), targetLanguagePrefix(target, platform), 1)).data.trans_result.map(x => x.trans_text).join("\n") || ''
                break
            case 'yandex':
                tmpTranslate = (await YandexTranslator(text.split("\n"), targetLanguagePrefix(target, platform), 1)).text.join("\n")
                break
            case 'baidu':
                tmpTranslate = (await BaiduTranslator(text, targetLanguagePrefix(target, platform), 1)).trans_result.data.map(x => x.dst).join("\n")
        }
        
        //TODO fix link
        if (!notSupportedEntities.includes(platform)) {
            for (const index in entitiesList.entities) {
                tmpTranslate = tmpTranslate.replace(RegExp(((platform, index) => {
                    switch (platform) {
                        case 'google':
                            return `<a id=${index}>(?:&lt;&gt;|<>)<\/a>`
                        case 'microsoft':
                            return `<b${index}><\/b${index}>`
                        case 'sogou':
                            return `#(?:\s|)${index}(?:\s|)#`
                        case 'yandex':
                            return `<a id="${index}">(?:&lt;&gt;|<>)<\/a>`
                    }
                })(platform, index), 'gmu'), `<a href="${entitiesList.entities[index].expanded_url ? entitiesList.entities[index].expanded_url : '.'}" id="url">${['hashtag', 'symbol'].includes(entitiesList.entities[index].type) ? (entitiesList.entities[index].type === 'hashtag' ? '#' : '$') + entitiesList.entities[index].text : entitiesList.entities[index].text}</a>`)
            }
            entitiesList = GetEntitiesFromText(tmpTranslate, 'tweets')
            trInfo.translate = entitiesList.originText
            trInfo.entities = entitiesList.entities
        } else {
            trInfo.translate = tmpTranslate
            trInfo.entities = []
        }
        
        return {message: null, content: trInfo}
    } catch (e) {
        console.error(e)
        return {message: 'Unable to get translate content', content: trInfo}
    }
}

export { Translate }
