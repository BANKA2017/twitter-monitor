//-->
//TODO use native lib instead of otplib
import { authenticator } from 'otplib'
import { base64_to_base64url, buffer_to_base64 } from './utils.mjs'
//<--

export const fireFoxUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
const bearer_token = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

export const VAPID = 'BF5oEo0xDUpgylKDTlsd8pZmxQA1leYINiY-rSscWYK_3tWAkz4VMbtf1MLE_Yyd6iII6o-e3Q9TCN5vZMzVMEs'

class Twitter {
    cookies = {}
    constructor(cookies = {}) {
        this.cookies = cookies
    }
    async login(account = '', password = '', authentication_secret = '') {
        let cookies = {}
        let headers = {}
        let flow_token = ''

        const guest_token = (
            await (
                await fetch('https://api.twitter.com/1.1/guest/activate.json', {
                    headers: {
                        'User-Agent': fireFoxUserAgent,
                        authorization: bearer_token
                    },
                    method: 'POST'
                })
            ).json()
        ).guest_token

        //console.log(guest_token)

        const _login = await sendLoginRequest(
            bearer_token,
            guest_token,
            cookies,
            headers,
            new URLSearchParams({
                flow_name: 'login'
            }),
            {
                input_flow_data: { flow_context: { debug_overrides: {}, start_location: { location: 'unknown' } } },
                subtask_versions: {
                    action_list: 2,
                    alert_dialog: 1,
                    app_download_cta: 1,
                    check_logged_in_account: 1,
                    choice_selection: 3,
                    contacts_live_sync_permission_prompt: 0,
                    cta: 7,
                    email_verification: 2,
                    end_flow: 1,
                    enter_date: 1,
                    enter_email: 2,
                    enter_password: 5,
                    enter_phone: 2,
                    enter_recaptcha: 1,
                    enter_text: 5,
                    enter_username: 2,
                    generic_urt: 3,
                    in_app_notification: 1,
                    interest_picker: 3,
                    js_instrumentation: 1,
                    menu_dialog: 1,
                    notifications_permission_prompt: 2,
                    open_account: 2,
                    open_home_timeline: 1,
                    open_link: 1,
                    phone_verification: 4,
                    privacy_options: 1,
                    security_key: 3,
                    select_avatar: 4,
                    select_banner: 2,
                    settings_list: 7,
                    show_code: 1,
                    sign_up: 2,
                    sign_up_review: 4,
                    tweet_selection_urt: 1,
                    update_users: 1,
                    upload_media: 1,
                    user_recommendations_list: 4,
                    user_recommendations_urt: 1,
                    wait_spinner: 3,
                    web_modal: 1
                }
            }
        )

        cookies = { ...cookies, ..._login.cookies }
        flow_token = _login.content.flow_token
        //console.log(JSON.stringify(_login, null, 4))

        const LoginJsInstrumentationSubtask = await sendLoginRequest(bearer_token, guest_token, cookies, headers, new URLSearchParams({}), {
            flow_token,
            subtask_inputs: [
                {
                    js_instrumentation: {
                        link: 'next_link',
                        response: '{}'
                    },
                    subtask_id: 'LoginJsInstrumentationSubtask'
                }
            ]
        })
        cookies = { ...cookies, ...LoginJsInstrumentationSubtask.cookies }
        flow_token = LoginJsInstrumentationSubtask.content.flow_token
        //console.log(LoginJsInstrumentationSubtask)

        // LoginEnterUserIdentifierSSO
        const LoginEnterUserIdentifierSSO = await sendLoginRequest(bearer_token, guest_token, cookies, headers, new URLSearchParams({}), {
            flow_token,
            subtask_inputs: [
                {
                    settings_list: {
                        link: 'next_link',
                        setting_responses: [
                            {
                                key: 'user_identifier',
                                response_data: {
                                    text_data: {
                                        result: account
                                    }
                                }
                            }
                        ]
                    },
                    subtask_id: 'LoginEnterUserIdentifierSSO'
                }
            ]
        })

        cookies = { ...cookies, ...LoginEnterUserIdentifierSSO.cookies }
        flow_token = LoginEnterUserIdentifierSSO.content.flow_token
        //console.log(LoginEnterUserIdentifierSSO)

        // LoginEnterAlternateIdentifierSubtask
        if (LoginEnterUserIdentifierSSO.content.subtasks[0]?.subtask_id === 'LoginEnterAlternateIdentifierSubtask') {
            const LoginEnterAlternateIdentifierSubtask = await sendLoginRequest(bearer_token, guest_token, cookies, headers, new URLSearchParams({}), {
                flow_token,
                subtask_inputs: [
                    {
                        enter_text: {
                            link: 'next_link',
                            text: screen_name // or phone number
                        },
                        subtask_id: 'LoginEnterAlternateIdentifierSubtask'
                    }
                ]
            })

            cookies = { ...cookies, ...LoginEnterAlternateIdentifierSubtask.cookies }
            flow_token = LoginEnterAlternateIdentifierSubtask.content.flow_token
            //console.log(LoginEnterAlternateIdentifierSubtask)
        }

        // LoginEnterPassword

        const LoginEnterPassword = await sendLoginRequest(bearer_token, guest_token, cookies, headers, new URLSearchParams({}), {
            flow_token,
            subtask_inputs: [
                {
                    enter_password: {
                        link: 'next_link',
                        password
                    },
                    subtask_id: 'LoginEnterPassword'
                }
            ]
        })

        cookies = { ...cookies, ...LoginEnterPassword.cookies }
        flow_token = LoginEnterPassword.content.flow_token
        //console.log(LoginEnterPassword)

        // AccountDuplicationCheck
        const AccountDuplicationCheck = await sendLoginRequest(bearer_token, guest_token, cookies, headers, new URLSearchParams({}), {
            flow_token,
            subtask_inputs: [
                {
                    check_logged_in_account: {
                        link: 'AccountDuplicationCheck_false'
                    },
                    subtask_id: 'AccountDuplicationCheck'
                }
            ]
        })

        cookies = { ...cookies, ...AccountDuplicationCheck.cookies }
        flow_token = AccountDuplicationCheck.content.flow_token
        //console.log(AccountDuplicationCheck)

        if (AccountDuplicationCheck.content.subtasks[0]?.subtask_id === 'LoginTwoFactorAuthChallenge') {
            // LoginTwoFactorAuthChooseMethod
            if (!AccountDuplicationCheck.content.subtasks[0]?.enter_text) {
                const LoginTwoFactorAuthChooseMethod = await sendLoginRequest(bearer_token, guest_token, cookies, headers, new URLSearchParams({}), {
                    flow_token,
                    subtask_inputs: [
                        {
                            choice_selection: {
                                link: 'next_link',
                                selected_choices: ['0']
                            },
                            subtask_id: 'LoginTwoFactorAuthChooseMethod'
                        }
                    ]
                })

                cookies = { ...cookies, ...LoginTwoFactorAuthChooseMethod.cookies }
                flow_token = LoginTwoFactorAuthChooseMethod.content.flow_token
                //console.log(LoginTwoFactorAuthChooseMethod)
            }

            let _2fa = '' // TOTP 2fa
            if (authentication_secret !== '') {
                _2fa = authenticator.generate(authentication_secret)
            }

            // LoginTwoFactorAuthChallenge
            const LoginTwoFactorAuthChallenge = await sendLoginRequest(bearer_token, guest_token, cookies, headers, new URLSearchParams({}), {
                flow_token,
                subtask_inputs: [
                    {
                        enter_text: {
                            link: 'next_link',
                            text: _2fa
                        },
                        subtask_id: 'LoginTwoFactorAuthChallenge'
                    }
                ]
            })

            cookies = { ...cookies, ...LoginTwoFactorAuthChallenge.cookies }
            flow_token = LoginTwoFactorAuthChallenge.content.flow_token
            //console.log(LoginTwoFactorAuthChallenge)
        }

        const viewer = await getViewer(bearer_token, cookies, 'qevmDaYaF66EOtboiNoQbQ', {
            responsive_web_graphql_exclude_directive_enabled: true,
            verified_phone_label_enabled: false,
            creator_subscriptions_tweet_preview_api_enabled: true,
            responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
            responsive_web_graphql_timeline_navigation_enabled: true
        })
        cookies = { ...cookies, ...viewer.cookies }

        // console.log(JSON.stringify(viewer, null, 4))// <- user info
        // console.log(JSON.stringify(cookies, null, 4))// <- cookies
        this.cookies = cookies
    }
    // post status
    postNotificationsAction(link = '', cookies = {}, payload = {}) {
        return fetch(link, {
            method: 'POST',
            headers: {
                'User-Agent': fireFoxUserAgent,
                'Content-Type': 'application/json',
                'x-twitter-auth-type': 'OAuth2Session',
                cookie: 'auth_token=' + cookies.auth_token + ';ct0=' + cookies.ct0 + ';',
                'x-csrf-token': cookies.ct0,
                'x-twitter-client-language': 'en', //zh-tw
                'x-twitter-active-user': 'yes',
                authorization: bearer_token,
                referrer: 'https://twitter.com/settings/push_notifications'
            },
            body: JSON.stringify(payload)
        })
    }

    postNotificationsLogin(loginPayload = {}) {
        return this.postNotificationsAction('https://twitter.com/i/api/1.1/notifications/settings/login.json', this.cookies, loginPayload)
    }
    postNotificationsLogout(logoutPayload = {}) {
        return this.postNotificationsAction('https://twitter.com/i/api/1.1/notifications/settings/logout.json', this.cookies, logoutPayload)
    }
    postNotificationsCheckin(loginPayload = {}) {
        return this.postNotificationsAction('https://twitter.com/i/api/1.1/notifications/settings/checkin.json', this.cookies, loginPayload)
    }
    getNotificationsBadgeCount() {
        return fetch('https://twitter.com/i/api/2/badge_count/badge_count.json?supports_ntab_urt=1', {
            headers: {
                'User-Agent': fireFoxUserAgent,
                'Content-Type': 'application/json',
                'x-twitter-auth-type': 'OAuth2Session',
                cookie: 'auth_token=' + this.cookies.auth_token + ';ct0=' + this.cookies.ct0 + ';',
                'x-csrf-token': this.cookies.ct0,
                'x-twitter-client-language': 'en', //zh-tw
                'x-twitter-active-user': 'yes',
                authorization: bearer_token,
                referrer: 'https://twitter.com/settings/push_notifications'
            }
        })
    }

    twitterSettingsPayloadBuilder(endpoint, publicKey, auth, type = 'login') {
        let logoutPayload = {
            os_version: 'Windows/Firefox',
            udid: 'Windows/Firefox',
            env: 3,
            locale: 'en', //zh-tw
            protocol_version: 1,
            token: endpoint,
            encryption_key1: publicKey,
            encryption_key2: typeof auth !== 'string' ? auth.toString('base64url') : auth
        }
        if (type === 'login') {
            return {
                push_device_info: logoutPayload
            }
        } else {
            return logoutPayload
        }
    }
}

// login

const sendLoginRequest = async (bearer_token, guest_token, cookies = {}, headers = {}, query = new URLSearchParams({}), body = {}) =>
    fetch(`https://api.twitter.com/1.1/onboarding/task.json${query.size > 0 ? `?${query.toString()}` : ''}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: bearer_token,
            'x-guest-token': guest_token,
            cookie: Object.entries(cookies)
                .map(([key, value]) => `${key}=${value}`)
                .join('; '),
            ...headers
        },
        body: JSON.stringify(body)
    })
        .then(async (response) => ({
            message: '',
            cookies: Object.fromEntries(
                [...response.headers.entries()]
                    .filter((header) => header[0] === 'set-cookie')
                    .map((header) => {
                        const tmpCookies = header[1].split(';')[0]
                        const firstEqual = tmpCookies.indexOf('=')
                        return [tmpCookies.slice(0, firstEqual), tmpCookies.slice(firstEqual + 1)]
                    })
            ),
            content: await response.json()
        }))
        .then((res) => {
            //console.log(res)
            return res
        })
        .catch((error) => {
            //console.error(error)
            return {
                message: error.message,
                cookies: {},
                content: {}
            }
        })

const getViewer = async (bearer_token, cookies, viewerQueryID, viewerFeatures) =>
    fetch(
        `https://api.twitter.com/graphql/${viewerQueryID}/Viewer?` +
            new URLSearchParams({
                variables: JSON.stringify({ withCommunitiesMemberships: true, withSubscribedTab: true, withCommunitiesCreation: true }),
                features: JSON.stringify(viewerFeatures)
            }).toString(),
        {
            headers: {
                authorization: bearer_token,
                'x-csrf-token': cookies.ct0,
                cookie: Object.entries(cookies)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('; ')
            }
        }
    )
        .then(async (response) => ({
            message: '',
            cookies: Object.fromEntries(
                [...response.headers.entries()]
                    .filter((header) => header[0] === 'set-cookie')
                    .map((header) => {
                        const tmpCookies = header[1].split(';')[0]
                        const firstEqual = tmpCookies.indexOf('=')
                        return [tmpCookies.slice(0, firstEqual), tmpCookies.slice(firstEqual + 1)]
                    })
            ),
            content: await response.json()
        }))
        .then((res) => {
            //console.log(res)
            return res
        })
        .catch((error) => {
            //console.error(error)
            return {
                message: error.message,
                cookies: {},
                content: {}
            }
        })

export const loginToTwitter = async () => {
    if (!globalThis._config.config.twitter.screen_name || !globalThis._config.config.twitter.password) {
        throw new Error('Please set your twitter screen_name and password in config.json')
    }
    if (globalThis._config.config.twitter.retry <= 0) {
        throw new Error('Failed to login to twitter after 5 retries. Please check your credentials and try again.')
    }
    try {
        console.log('*|', new Date(), 'logging in to twitter...')
        await globalThis._twitter.login(globalThis._config.config.twitter.screen_name, globalThis._config.config.twitter.password, globalThis._config.config.twitter.authentication_secret)
        console.log('*|', new Date(), 'logged in to twitter!')
        if (globalThis._twitter.cookies?.auth_token && globalThis._twitter.cookies?.ct0) {
            globalThis._config.config.twitter.retry = 5
            globalThis._config.config.twitter.cookies.auth_token = globalThis._twitter.cookies.auth_token
            globalThis._config.config.twitter.cookies.ct0 = globalThis._twitter.cookies.ct0
        } else {
            globalThis._config.config.twitter.retry--
        }
    } catch (e) {
        console.error('X|', new Date(), e)
        globalThis._config.config.twitter.retry--
    }
    globalThis._config.saveConfig()
}

export const setupTwitterPushConfig = async () => {
    console.log('*|', new Date(), 'setting up twitter push config...')
    await globalThis._twitter.postNotificationsLogin(
        globalThis._twitter.twitterSettingsPayloadBuilder(globalThis._web_push.endpoint, base64_to_base64url(buffer_to_base64(globalThis._decrypt.publicKey)), base64_to_base64url(buffer_to_base64(globalThis._decrypt.auth)), 'login')
    )
}

export default Twitter
