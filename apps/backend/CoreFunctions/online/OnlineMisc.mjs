import { GenerateAccountInfo, GenerateCommunityInfo } from '../../../../libs/core/Core.info.mjs'
import { getCommunityInfo, getCommunitySearch, getListInfo, getListMember, getTypeahead } from '../../../../libs/core/Core.fetch.mjs'
import { Log, GetEntitiesFromText, VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { TweetsInfo } from '../../../../libs/core/Core.tweet.mjs'
import { apiTemplate } from '../../../../libs/share/Constant.mjs'

const ApiTypeahead = async (req, env) => {
    const text = VerifyQueryString(req.query.text, '')
    let tmpTypeahead = {
        users: [],
        topics: []
    }
    try {
        const tmpTypeaheadResponse = await getTypeahead({ text, guest_token: env.guest_token3 })
        //TODO update guest_account status
        //no rate limit
        tmpTypeahead.topics = tmpTypeaheadResponse.data.topics
        tmpTypeahead.users = tmpTypeaheadResponse.data.users.map((user) => GenerateAccountInfo(user).GeneralAccountData)
    } catch (e) {
        Log(false, 'log', e)
        Log(false, 'error', `[${new Date()}]: #OnlineTypeahead #${text} #${e.code} ${e.message}`)
        return env.json(apiTemplate(500, 'Something wrong', { users: [], topics: [] }, 'online'))
    }

    return env.json(apiTemplate(200, 'OK', tmpTypeahead, 'online'))
}

const ApiListInfo = async (req, env) => {
    const listId = VerifyQueryString(req.query.list_id, 0)
    const screenName = VerifyQueryString(req.query.name, '').toLocaleLowerCase()
    const listSlug = VerifyQueryString(req.query.slug, '').toLocaleLowerCase()

    //all empty
    if (!(listId || (screenName && listSlug))) {
        return env.json(apiTemplate(403, 'Invalid Request', {}, 'online'))
    }

    try {
        let listInfoResponse = await getListInfo({ id: listId ? listId : '', screenName, listSlug, guest_token: env.guest_token3, authorization: 1, cookie: req.cookies })
        //TODO update guest_account status
        //updateGuestToken
        //await env.updateGuestToken(env, 'guest_token2', 4, listInfoResponse.headers.get('x-rate-limit-remaining') < 1, 'ListInfo')

        if (!listInfoResponse.data) {
            return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
        }
        if (listId) {
            listInfoResponse = listInfoResponse.data.data.list
        } else {
            listInfoResponse = listInfoResponse.data.data.user_by_screen_name.list
        }

        //get user
        let { GeneralAccountData } = GenerateAccountInfo(listInfoResponse.user_results.result)
        if (GeneralAccountData.description) {
            GeneralAccountData.description = GeneralAccountData.description.replaceAll('\n', '\n<br>')
        }

        GeneralAccountData.top = String(GeneralAccountData.top)
        GeneralAccountData.header = GeneralAccountData.header.replaceAll(/http(|s):\/\//gm, '')
        GeneralAccountData.uid_str = String(GeneralAccountData.uid)
        //GeneralAccountData.uid = Number(GeneralAccountData.uid)

        let originalTextAndEntities = GetEntitiesFromText(GeneralAccountData.description)
        GeneralAccountData.description_original = originalTextAndEntities.originalText
        GeneralAccountData.description_entities = originalTextAndEntities.entities
        let responseData = {
            user_info: GeneralAccountData,
            name: listInfoResponse.name ?? '',
            description: listInfoResponse.description ?? '',
            id: listInfoResponse.id_str ?? '',
            member_count: listInfoResponse.member_count ?? 0,
            subscriber_count: listInfoResponse.subscriber_count ?? 0,
            created_at: Math.ceil((listInfoResponse.created_at ?? 0) / 1000),
            banner: {
                url: listInfoResponse?.custom_banner_media_results?.result?.media_info?.original_img_url ?? listInfoResponse?.default_banner_media_results?.result?.media_info?.original_img_url ?? '',
                original_height: listInfoResponse?.custom_banner_media_results?.result?.media_info?.original_img_height ?? listInfoResponse?.default_banner_media_results?.result?.media_info?.original_img_height ?? 0,
                original_width: listInfoResponse?.custom_banner_media_results?.result?.media_info?.original_img_width ?? listInfoResponse?.default_banner_media_results?.result?.media_info?.original_img_width ?? 0,
                media_key: listInfoResponse?.custom_banner_media_results?.result?.media_key ?? listInfoResponse?.default_banner_media_results?.result?.media_key ?? ''
            }
        }

        return env.json(apiTemplate(200, 'OK', responseData, 'online'))
    } catch (e) {
        Log(false, 'log', e)
        Log(false, 'error', `[${new Date()}]: #OnlineListInfo ${listId ? '#' + listId : '[@' + screenName + '](' + listSlug + ')'} #${e.code} ${e.message}`)
        return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
    }
}

const ApiListMemberList = async (req, env) => {
    const listId = VerifyQueryString(req.query.list_id, 0)
    const cursor = VerifyQueryString(req.query.cursor, '')
    const count = VerifyQueryString(req.query.count, 20)

    if (!listId) {
        return env.json(apiTemplate(403, 'Invalid Request', {}, 'online'))
    }

    try {
        let listMemberResponse = await getListMember({ id: listId, cursor, count, guest_token: env.guest_token3, authorization: 1, cookie: req.cookies })
        //TODO update guest_account status
        //updateGuestToken
        //await env.updateGuestToken(env, 'guest_token2', 4, listMemberResponse.headers.get('x-rate-limit-remaining') < 1, 'ListMember')

        if (!listMemberResponse.data) {
            return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
        }

        const ParseList = TweetsInfo(listMemberResponse.data, true)

        return env.json(
            apiTemplate(
                200,
                'OK',
                {
                    users: Object.entries(ParseList.users).map((user) => {
                        let { GeneralAccountData } = GenerateAccountInfo(user[1])
                        if (GeneralAccountData.description) {
                            GeneralAccountData.description = GeneralAccountData.description.replaceAll('\n', '\n<br>')
                        }

                        GeneralAccountData.top = String(GeneralAccountData.top)
                        GeneralAccountData.header = GeneralAccountData.header.replaceAll(/http(|s):\/\//gm, '')
                        GeneralAccountData.uid_str = String(GeneralAccountData.uid)
                        //GeneralAccountData.uid = Number(GeneralAccountData.uid)

                        let originalTextAndEntities = GetEntitiesFromText(GeneralAccountData.description)
                        GeneralAccountData.description_original = originalTextAndEntities.originalText
                        GeneralAccountData.description_entities = originalTextAndEntities.entities
                        return GeneralAccountData
                    }),
                    cursor: ParseList.cursor
                },
                'online'
            )
        )
    } catch (e) {
        Log(false, 'log', e)
        Log(false, 'error', `[${new Date()}]: #OnlineListMemberList #${listId} #${e.code} ${e.message}`)
        return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
    }
}

const ApiCommunityInfo = async (req, env) => {
    const communityId = VerifyQueryString(req.query.community_id, 0)

    //all empty
    if (!communityId) {
        return env.json(apiTemplate(403, 'Invalid Request', {}, 'online'))
    }

    try {
        let communityInfoResponse = await getCommunityInfo({ id: communityId, guest_token: env.guest_token3, authorization: 1 })
        //TODO update guest_account status
        //updateGuestToken
        //await env.updateGuestToken(env, 'guest_token2', 4, communityInfoResponse.headers.get('x-rate-limit-remaining') < 1, 'CommunityInfo')

        if (!communityInfoResponse.data) {
            return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
        }
        const tmpCommunityInfoResponse = communityInfoResponse.data?.data?.communityResults?.result
        if (!tmpCommunityInfoResponse) {
            return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
        }
        let responseData = GenerateCommunityInfo(tmpCommunityInfoResponse)

        return env.json(apiTemplate(200, 'OK', responseData, 'online'))
    } catch (e) {
        Log(false, 'log', e)
        Log(false, 'error', `[${new Date()}]: #OnlineCommunityInfo ${'#' + communityId} #${e.code} ${e.message}`)
        return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
    }
}

const ApiCommunitySearch = async (req, env) => {
    const queryString = VerifyQueryString(req.query.q, '')
    const cursor = VerifyQueryString(req.query.cursor, '')
    // Note: now 'count' is unused, it might useful in future
    const count = VerifyQueryString(req.query.count, 0)

    if (!queryString) {
        return env.json(apiTemplate(403, 'Invalid Request', {}, 'online'))
    }
    try {
        const tmpCommunitySearchResponse = await getCommunitySearch({ queryString, cursor, count, guest_token: env.guest_token3, authorization: 1 })
        //TODO update guest_account status

        const communitiesList = []
        // community
        if (Array.isArray(tmpCommunitySearchResponse.data.data?.communities_search_slice?.items_results)) {
            for (const tmpCommunityInfo of tmpCommunitySearchResponse.data.data?.communities_search_slice?.items_results) {
                const tmpCommunityResult = tmpCommunityInfo.result
                communitiesList.push({
                    name: tmpCommunityResult.name ?? '',
                    id: tmpCommunityResult.rest_id ?? '',
                    member_count: tmpCommunityResult.member_count ?? 0,
                    default_theme: tmpCommunityResult.default_theme ?? tmpCommunityResult.custom_theme ?? '_',
                    banner: {
                        url: tmpCommunityResult?.custom_banner_media?.media_info?.original_img_url ?? tmpCommunityResult?.default_banner_media?.media_info?.original_img_url ?? '',
                        original_height: tmpCommunityResult?.custom_banner_media?.media_info?.original_img_height ?? tmpCommunityResult?.default_banner_media?.media_info?.original_img_height ?? 0,
                        original_width: tmpCommunityResult?.custom_banner_media?.media_info?.original_img_width ?? tmpCommunityResult?.default_banner_media?.media_info?.original_img_width ?? 0,
                        media_key: tmpCommunityResult?.custom_banner_media?.id ?? tmpCommunityResult?.default_banner_media?.id ?? ''
                    }
                })
            }
        }

        // cursor
        const nextCursor = tmpCommunitySearchResponse.data.data?.communities_search_slice?.slice_info?.next_cursor || ''

        return env.json(
            apiTemplate(
                200,
                'OK',
                {
                    communities_list: communitiesList,
                    cursor: nextCursor,
                    hasmore: !!nextCursor
                },
                'online'
            )
        )
    } catch (e) {
        Log(false, 'error', e)
        Log(false, 'error', `[${new Date()}]: #OnlineCommunitySearch ${queryString} #${e.code} ${e.message}`)
        return env.json(apiTemplate(500, 'Songthing wrong', {}, 'online'))
    }
}

export { ApiTypeahead, ApiListInfo, ApiListMemberList, ApiCommunityInfo, ApiCommunitySearch }
