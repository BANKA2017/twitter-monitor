import { VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { Translate } from '../../../../libs/core/Core.translate.mjs'
import { apiTemplate } from '../../../../libs/share/Constant.mjs'

const ApiPredict = async (req, res) => {
    const text = VerifyQueryString(req.query.text, '')
    if (!text) {
        res.json(apiTemplate(403, 'Empty content', {}, 'translate'))
    } else {
        if (!global.LanguageIdentification) {
            res.json(apiTemplate(500, 'Unable to load the cld3 model', {}, 'translate'))
        } else {
            const identifier = global.LanguageIdentification.create(0, 1000)
            const tmpLang = identifier.findLanguage(text)
            identifier.dispose()
            res.json(apiTemplate(200, 'OK', tmpLang, 'translate'))
        }
    }
}

export { ApiPredict }
