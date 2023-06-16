//Translator
import Translator, { IsChs, IsCht } from '@kdwnil/translator-utils'
import { GetEntitiesFromText } from './Core.function.mjs'

const translatorPlatform = {
    google: 'Google Translate',
    microsoft: 'Microsoft Translator',
    yandex: 'Yandex Translate',
    sogou: '搜狗翻译',
    baidu: '百度翻译',
    deepl: 'DeepL'
}

const realTranslatePlatform = {
    google: 'google_browser',
    microsoft: 'microsoft_browser',
    yandex: 'yandex_browser',
    sogou: 'sogou_browser',
    baidu: 'baidu',
    deepl: 'deepl'
}

const notSupportedEntities = ['baidu', 'deepl']

const targetLanguagePreprocessing = (target = 'en', platform = 'google') => {
    switch (platform) {
        //google is unnecessary
        //case 'google':
        //    break
        case 'microsoft':
            if (IsChs(target)) {
                target = 'zh-Hans'
            } else if (IsCht(target)) {
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
            if (IsChs(target)) {
                target = 'zh'
            } else if (IsCht(target)) {
                target = 'cht'
            } else if (target.toLowerCase() === 'ja') {
                target = 'jp'
            } else if (target.toLowerCase() === 'ko') {
                target === 'kor'
            }
            break
        case 'deepl':
            //for Chinese //NOT SUPPORTED CHT
            if (/^zh(_|\-|$)/.test(target.toLowerCase())) {
                target = 'zh'
            }
            break
    }
    return target
}

const Translate = async (trInfo = null, target = 'en', platform = 'google') => {
    if (!trInfo) {
        trInfo = { full_text: '', cache: false, target, translate_source: 'Twitter Monitor Translator', translate: '', entities: [] }
    }
    platform = platform.toLowerCase()
    if (!translatorPlatform[platform]) {
        return { message: 'Not supported Platform', content: trInfo }
    }

    let entitiesList = GetEntitiesFromText(trInfo.full_text, 'tweets')
    let text = entitiesList.originText
    if (!notSupportedEntities.includes(platform)) {
        entitiesList.entities.forEach((entity, index) => {
            text = text.replace(
                RegExp(`(^|\\s|\\p{P}|\\p{S})${['hashtag', 'symbol'].includes(entity.type) ? (entity.type === 'hashtag' ? '#' : '$') + entity.text : entity.text}($|\\s|\\p{P}|\\p{S})`, 'gmu'),
                ((platform, index) => {
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
                })(platform, index)
            )
        })
    }

    trInfo.cache = false
    trInfo.target = target
    trInfo.translate_source = translatorPlatform[platform]
    trInfo.translate = ''
    try {
        let { content: tmpTranslate, message } = await Translator(notSupportedEntities.includes(platform) ? text : text.split('\n'), realTranslatePlatform[platform], 'auto', targetLanguagePreprocessing(target, platform), false)
        if (message) {
            throw message
        }
        //TODO fix link
        if (!notSupportedEntities.includes(platform)) {
            for (const index in entitiesList.entities) {
                tmpTranslate = tmpTranslate.replace(
                    RegExp(
                        ((platform, index) => {
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
                        })(platform, index),
                        'gmu'
                    ),
                    `<a href="${entitiesList.entities[index].expanded_url ? entitiesList.entities[index].expanded_url : '.'}" id="url">${
                        ['hashtag', 'symbol'].includes(entitiesList.entities[index].type) ? (entitiesList.entities[index].type === 'hashtag' ? '#' : '$') + entitiesList.entities[index].text : entitiesList.entities[index].text
                    }</a>`
                )
            }
            entitiesList = GetEntitiesFromText(tmpTranslate, 'tweets')
            trInfo.translate = entitiesList.originText
            trInfo.entities = entitiesList.entities
        } else {
            trInfo.translate = tmpTranslate
            trInfo.entities = []
        }

        return { message: null, content: trInfo }
    } catch (e) {
        console.error(e)
        return { message: 'Unable to get translate content', content: trInfo }
    }
}

export { Translate }
