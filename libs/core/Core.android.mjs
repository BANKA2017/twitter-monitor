import axiosFetch from 'axios-helper'
import { coreFetch, preCheckCtx } from './Core.fetch.mjs'
import { HmacSHA1 } from 'crypto-es/lib/sha1.js'
import { Base64 } from 'crypto-es/lib/enc-base64.js'

// The official app installed from Google Play Store (9.95.0-release.0)
// TW_ANDROID_BASIC_TOKEN = `Basic ${base64_encode(TW_CONSUMER_KEY+':'+TW_CONSUMER_SECRET)}`
const TW_ANDROID_BASIC_TOKEN = 'Basic M25WdVNvQlpueDZVNHZ6VXhmNXc6QmNzNTlFRmJic2RGNlNsOU5nNzFzbWdTdFdFR3dYWEtTall2UFZ0N3F5cw=='
const TW_CONSUMER_KEY = '3nVuSoBZnx6U4vzUxf5w'
const TW_CONSUMER_SECRET = 'Bcs59EFbbsdF6Sl9Ng71smgStWEGwXXKSjYvPVt7qys'
const TW_ANDROID_BEARER_TOKEN = "Bearer AAAAAAAAAAAAAAAAAAAAAFXzAwAAAAAAMHCxpeSDG1gLNLghVe8d74hl6k4%3DRUMF4xAQLsbeBhTSRrCiQpJtxoGWeyHrDb5te2jpGskWDFW82F"

const TW_ANDROID_PREFIX = 'https://na.albtls.t.co'
const TW_WEBAPI_PREFIX = 'https://api.twitter.com'

const axios = axiosFetch()

const getBearerToken = () => {
    //const tmpTokenResponse = await axios(TW_WEBAPI_PREFIX + '/oauth2/token', {
    //    headers: {
    //        Authorization: TW_ANDROID_BASIC_TOKEN,
    //        'Content-Type': 'application/x-www-form-urlencoded'
    //    },
    //    method: 'post',
    //    data: 'grant_type=client_credentials'
    //})
    return TW_ANDROID_BEARER_TOKEN//tmpTokenResponse
}

const postOpenAccountInit = async (ctx = { guest_token: {}, authorization: '' }, env = {}) => {
    let { guest_token, authorization } = preCheckCtx(ctx, { guest_token: {}, authorization: '' })

    if (!authorization) {
        return Promise.reject({ data: {}, code: 403, message: 'Empty authorization' })
    }

    //if (!guest_token.success) {
    //    guest_token = getToken(authorization)
    //}

    return await coreFetch(
        TW_WEBAPI_PREFIX + '/1.1/onboarding/task.json?flow_name=welcome&api_version=1&known_device_token=&sim_country_code=us',
        guest_token,
        {},
        authorization,
        {},
        {
            flow_token: null,
            input_flow_data: {
                country_code: null,
                flow_context: { referrer_context: { referral_details: 'utm_source=google-play&utm_medium=organic', referrer_url: '' }, start_location: { location: 'splash_screen' } },
                requested_variant: null,
                target_user_id: 0
            },
            subtask_versions: {
                generic_urt: 3,
                standard: 1,
                open_home_timeline: 1,
                app_locale_update: 1,
                enter_date: 1,
                email_verification: 3,
                enter_password: 5,
                enter_text: 5,
                one_tap: 2,
                cta: 7,
                single_sign_on: 1,
                fetch_persisted_data: 1,
                enter_username: 3,
                web_modal: 2,
                fetch_temporary_password: 1,
                menu_dialog: 1,
                sign_up_review: 5,
                interest_picker: 4,
                user_recommendations_urt: 3,
                in_app_notification: 1,
                sign_up: 2,
                typeahead_search: 1,
                user_recommendations_list: 4,
                cta_inline: 1,
                contacts_live_sync_permission_prompt: 3,
                choice_selection: 5,
                js_instrumentation: 1,
                alert_dialog_suppress_client_events: 1,
                privacy_options: 1,
                topics_selector: 1,
                wait_spinner: 3,
                tweet_selection_urt: 1,
                end_flow: 1,
                settings_list: 7,
                open_external_link: 1,
                phone_verification: 5,
                security_key: 3,
                select_banner: 2,
                upload_media: 1,
                web: 2,
                alert_dialog: 1,
                open_account: 2,
                action_list: 2,
                enter_phone: 2,
                open_link: 1,
                show_code: 1,
                update_users: 1,
                check_logged_in_account: 1,
                enter_email: 2,
                select_avatar: 4,
                location_permission_prompt: 2,
                notifications_permission_prompt: 4
            }
        }
    )
}

const postOpenAccount = async (ctx = { guest_token: {}, authorization: '', flow_token: '' }, env = {}) => {
    const { guest_token, authorization, flow_token } = preCheckCtx(ctx, { guest_token: {}, authorization: '', flow_token: '' })

    if (!authorization) {
        return Promise.reject({ data: {}, code: 403, message: 'Empty authorization' })
    }
    if (!flow_token) {
        return Promise.reject({ data: {}, code: 403, message: 'Empty flow_token' })
    }
    //if (!guest_token.success) {
    //    guest_token = getToken(authorization)
    //}

    return await coreFetch(
        TW_WEBAPI_PREFIX + '/1.1/onboarding/task.json',
        guest_token,
        {},
        authorization,
        {},
        {
            flow_token: flow_token,
            subtask_inputs: [{ open_link: { link: 'next_link' }, subtask_id: 'NextTaskOpenLink' }],
            subtask_versions: {
                generic_urt: 3,
                standard: 1,
                open_home_timeline: 1,
                app_locale_update: 1,
                enter_date: 1,
                email_verification: 3,
                enter_password: 5,
                enter_text: 5,
                one_tap: 2,
                cta: 7,
                single_sign_on: 1,
                fetch_persisted_data: 1,
                enter_username: 3,
                web_modal: 2,
                fetch_temporary_password: 1,
                menu_dialog: 1,
                sign_up_review: 5,
                interest_picker: 4,
                user_recommendations_urt: 3,
                in_app_notification: 1,
                sign_up: 2,
                typeahead_search: 1,
                user_recommendations_list: 4,
                cta_inline: 1,
                contacts_live_sync_permission_prompt: 3,
                choice_selection: 5,
                js_instrumentation: 1,
                alert_dialog_suppress_client_events: 1,
                privacy_options: 1,
                topics_selector: 1,
                wait_spinner: 3,
                tweet_selection_urt: 1,
                end_flow: 1,
                settings_list: 7,
                open_external_link: 1,
                phone_verification: 5,
                security_key: 3,
                select_banner: 2,
                upload_media: 1,
                web: 2,
                alert_dialog: 1,
                open_account: 2,
                action_list: 2,
                enter_phone: 2,
                open_link: 1,
                show_code: 1,
                update_users: 1,
                check_logged_in_account: 1,
                enter_email: 2,
                select_avatar: 4,
                location_permission_prompt: 2,
                notifications_permission_prompt: 4
            }
        }
    )
}

const getOauthAuthorization = (oauth_token, oauth_token_secret, method = 'GET', url = '', body = '', timestamp = Math.floor(Date.now() / 1000), oauth_nonce = new Array(3).fill(String(Date.now())).join('')) => {
    if (!url) {
        return ''
    }
    method = method.toUpperCase()
    const parseUrl = new URL(url)
    const link = parseUrl.origin + parseUrl.pathname
    const payload = [...parseUrl.searchParams.entries()]
    if (body) {
        payload.push(...new URLSearchParams(body).entries())
    }
    payload.push(['oauth_version', '1.0'])
    payload.push(['oauth_signature_method', 'HMAC-SHA1'])
    payload.push(['oauth_consumer_key', TW_CONSUMER_KEY])
    payload.push(['oauth_token', oauth_token])
    payload.push(['oauth_nonce', oauth_nonce])
    payload.push(['oauth_timestamp', String(timestamp)])

    const forSign =
        method + '&' + encodeURIComponent(link) + '&' + new URLSearchParams(payload.sort((a, b) => (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0))).toString().replaceAll('+', '%20').replaceAll('%', '%25').replaceAll('=', '%3D').replaceAll('&', '%26')
    //    const forSign = method + '&' + encodeURIComponent(link) + '&' + payload.sort((a, b) => (a[0]>b[0]) ? 1 : (a[0]<b[0] ? -1 : 0)).map(x => {x[1]=encodeURIComponent(x[1]);return x.join('%3D')}).join('%26')
    return {
        method,
        url,
        parse_url: parseUrl,
        timestamp,
        oauth_nonce,
        oauth_token,
        oauth_token_secret,
        oauth_consumer_key: TW_CONSUMER_KEY,
        oauth_consumer_secret: TW_CONSUMER_SECRET,
        payload,
        sign: HmacSHA1(forSign, TW_CONSUMER_SECRET + '&' + (oauth_token_secret ? oauth_token_secret : '')).toString(Base64)
    }
}

export { getBearerToken, postOpenAccountInit, postOpenAccount, getOauthAuthorization }
