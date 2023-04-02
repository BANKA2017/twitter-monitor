import { getTrends } from "../../../../libs/core/Core.fetch.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"


const ApiTrends = async (req, res) => {
    let tmpTrends = []
    try {
        const tmpTrendsRequest = await getTrends('trends', 20, global.guest_token2.token)
        tmpTrends = tmpTrendsRequest.data.timeline.instructions[1].addEntries.entries.filter(entity => entity.entryId === 'trends')[0].content.timelineModule.items.map(item => ({
            name: item?.item?.content?.trend?.name ?? '',
            domainContext: item?.item?.content?.trend?.trendMetadata?.domainContext ?? '',
            metaDescription: item?.item?.content?.trend?.trendMetadata?.metaDescription ?? undefined,
            displayedRelatedVariants: item?.item?.clientEventInfo?.details?.guideDetails?.transparentGuideDetails?.trendMetadata?.displayedRelatedVariants ?? undefined
        }))
        global.guest_token.updateRateLimit('Trending')
    } catch (e) {
        res.json(apiTemplate(500, 'Ok', [], 'online'))
        return
    }

    res.json(apiTemplate(200, 'OK', tmpTrends, 'online'))
}

export {ApiTrends}
