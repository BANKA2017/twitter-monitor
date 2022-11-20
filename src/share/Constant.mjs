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
    "twitter_list_details",
    "media_with_details_horizontal",
]

const apiTemplate = (code = 403, message = 'Invalid Request', data = {}, version = 'online') => {
    if (version === 'v1') {
        return {error: code, message, data, version}
    } else {
        return {code, message, data, version}
    }
}

const basePath = __dirname + '/..'

export {SupportedCardNameList, SupportedUnifiedCardNameList, apiTemplate, basePath}