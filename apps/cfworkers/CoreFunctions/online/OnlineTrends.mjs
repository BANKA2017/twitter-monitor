import { getTrends } from "../../../../libs/core/Core.fetch.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { json } from "../../share.mjs"


const ApiTrends = async (req, env) => {
    let tmpTrends = []
    try {
        tmpTrends = (await getTrends('trends', 20, req.guest_token2.token)).data.timeline.instructions[1].addEntries.entries.filter(entity => entity.entryId === 'trends')[0].content.timelineModule.items.map(item => ({
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
