import { getTrends } from "../../../../libs/core/Core.fetch.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { json, updateGuestToken } from "../../share.mjs"


const ApiTrends = async (req, env) => {
    let tmpTrends = []
    try {
        const tmpTrendsRequest = await getTrends('trends', 20, req.guest_token2.token)

        //updateGuestToken
        await updateGuestToken(env, 'guest_token2', 1, tmpTrendsRequest.headers.get('x-rate-limit-remaining') < 20)

        tmpTrends = tmpTrendsRequest.data.timeline.instructions[1].addEntries.entries.filter(entity => entity.entryId === 'trends')[0].content.timelineModule.items.map(item => ({
            name: item?.item?.content?.trend?.name ?? '',
            domainContext: item?.item?.content?.trend?.trendMetadata?.domainContext ?? '',
            metaDescription: item?.item?.content?.trend?.trendMetadata?.metaDescription ?? undefined,
            displayedRelatedVariants: item?.item?.clientEventInfo?.details?.guideDetails?.transparentGuideDetails?.trendMetadata?.displayedRelatedVariants ?? undefined
        }))
    } catch (e) {
        console.log(e)
        return json(apiTemplate(500, 'Ok', [], 'online'))
    }

    return json(apiTemplate(200, 'OK', tmpTrends, 'online'))
}

export {ApiTrends}
