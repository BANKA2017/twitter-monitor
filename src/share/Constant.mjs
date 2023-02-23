import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

//for cards
const SupportedCardNameList = [
    "summary",
    "summary_large_image",
    "promo_website",
    "audio",
    "player",
    "periscope_broadcast",
    "broadcast",
    "promo_video_website",
    "promo_image_convo",
    "promo_video_convo",
    "direct_store_link_app",
    "promo_image_app",
    "app",
    "live_event",
    "moment",
    "poll2choice_text_only",
    "poll3choice_text_only",
    "poll4choice_text_only",
    "poll2choice_image",
    "poll3choice_image",
    "poll4choice_image",
    "unified_card",
    "appplayer",
    "audiospace",
]

//for unified_card
const SupportedUnifiedCardNameList = [
    "image_website",
    "video_website",
    "image_carousel_website",
    "video_carousel_website",
    "image_app",
    "video_app",
    "image_carousel_app",
    "video_carousel_app",
    "image_multi_dest_carousel_website",
    "video_multi_dest_carousel_website",
    "mixed_media_multi_dest_carousel_website",
    "mixed_media_single_dest_carousel_website",
    "mixed_media_single_dest_carousel_app",
    "image_collection_website",
    "twitter_list_details",
    "media_with_details_horizontal",
    "twitter_article",
]

const verifiedTypeList = [
    "business",
    'government'
]

const apiTemplate = (code = 403, message = 'Invalid Request', data = {}, version = 'online') => {
    if (version === 'v1') {
        return {error: code, message, data, version}
    } else {
        return {code, message, data, version}
    }
}

const VerifiedInt = (verified = false, blue_verified = false, verified_type = undefined) => {
    let tmpVerifiedStatus = 0 //0000 0000
    if (verified) {
        tmpVerifiedStatus |= 128
    }
    if (blue_verified) {
        tmpVerifiedStatus |= 64
    }
    if (verified_type) {
        tmpVerifiedStatus |= (verifiedTypeList.indexOf(String(verified_type).toLocaleLowerCase())) + 1
    }
    return ((tmpVerifiedStatus > 255 || tmpVerifiedStatus < 0) ? 0 : tmpVerifiedStatus)
}

const basePath = __dirname + '/..'

export {SupportedCardNameList, SupportedUnifiedCardNameList, apiTemplate, VerifiedInt, basePath}