import { VerifyQueryString } from "../../../../libs/core/Core.function.mjs"
import { Translate } from "../../../../libs/core/Core.translate.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { json } from "../../share.mjs"

const ApiTranslate = async (req, res) => {
    const target = VerifyQueryString(req.query.to, 'en')
    //const cacheText = target.toLowerCase() === TRANSLATE_TARGET.toLowerCase()//TODO remove
    const platform = VerifyQueryString(req.query.platform, 'google').toLowerCase()
    const text = VerifyQueryString(req.postBody.get('text'), '')
    if (text) {
        let trInfo = { full_text: text, cache: false, target, translate_source: "Twitter Monitor Translator", translate: "", entities: []}

        const {message, content} = await Translate(trInfo, target, platform)
        if (!message) {
            return json(apiTemplate(200, 'OK', content, 'translate'))
        } else {
            return json(apiTemplate(500, 'Unable to get translate content', content, 'translate'))
        }
    } else {
        return json(apiTemplate(404, 'No translate text', {}, 'translate'))
    }
}

export {ApiTranslate}