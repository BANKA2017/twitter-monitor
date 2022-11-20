import path2array from "./Core.apiPath.mjs"

const GenerateAccountInfo = (accountData, extAccountData = {}) => {
    let GeneralAccountData = {
        uid: 0,
        name: "",
        display_name: "",
        header: "",
        banner: "",
        following: 0,
        followers: 0,
        media_count: 0,
        created_at: 0,
        description: "",
        description_origin: "",
        verified: "",
        top: "0",
        statuses_count: 0,//推文计数
    }
    let monitorDataInfo = {
        uid: 0,
        name: "",
        display_name: "",
        following: 0,
        followers: 0,
        statuses_count: 0,
        timestamp: Math.floor((new Date()) / 1000),
        //"description: "",
    }
    let update = false
    const accountDataIdStr = path2array("rest_id", accountData)??0
    accountData = path2array("user_info_legacy", accountData)
    //banner
    if (accountData.profile_banner_url) {
        GeneralAccountData.banner = accountData.profile_banner_url.replaceAll(/.*\/([\d]+)$/gm, "$1")
        update = true
    } else {
        GeneralAccountData.banner = 0
    }
    
    GeneralAccountData.uid = monitorDataInfo.uid = accountDataIdStr
    GeneralAccountData.name = monitorDataInfo.name = accountData.screen_name
    GeneralAccountData.display_name = monitorDataInfo.display_name = accountData.name

    if (accountData.profile_image_url_https) {
        GeneralAccountData.header = accountData.profile_image_url_https.replaceAll(/\/([0-9]+|default_profile_images)\/([\w\-]+)_normal.([\w]+)$/gm, "/$1/$2.$3")
    }
    

    GeneralAccountData.following = monitorDataInfo.following = accountData.friends_count
    GeneralAccountData.followers = monitorDataInfo.followers = accountData.followers_count
    GeneralAccountData.media_count = monitorDataInfo.media_count = accountData.media_count
    GeneralAccountData.statuses_count = monitorDataInfo.statuses_count = accountData.statuses_count
    GeneralAccountData.created_at = Math.floor(Date.parse(accountData.created_at) / 1000)
    GeneralAccountData.verified = Number(!!accountData.verified)
    //GeneralAccountData.lang = accountData.lang
    

    //from php version and i forge why i did it
    //$this->GeneralAccountData["top"] = (string)($this->account_data["pinned_tweet_ids_str"][0]??(($this->account_data["pinned_tweet_ids"]??'0') ? number_format($this->account_data["pinned_tweet_ids"][0], 0, '', '') : "0"));
    GeneralAccountData.top = accountData.pinned_tweet_ids_str?.length ? accountData.pinned_tweet_ids_str[0] : '0'

    let description = accountData.description
    GeneralAccountData.description_origin = description
    if (accountData.entities?.description.urls) {
        for (const entity of accountData.entities.description.urls) {
            description = description.replaceAll(entity.url, '<a href="' + entity.expanded_url + '" target="_blank">' + entity.display_url + '</a>')
        }
    }
    GeneralAccountData.description = description
    GeneralAccountData = Object.assign(GeneralAccountData, extAccountData)
    return {GeneralAccountData, ...GeneralAccountData, monitorDataInfo, update}
}

export {GenerateAccountInfo}