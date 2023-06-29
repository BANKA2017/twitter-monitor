import { postLogout } from '../../../../libs/core/Core.fetch.mjs'
import { Login, VerifyQueryString } from '../../../../libs/core/Core.function.mjs'
import { apiTemplate } from '../../../../libs/share/Constant.mjs'
import { GenerateAccountInfo } from '../../../../libs/core/Core.info.mjs'

const ApiLoginFlow = async (req, env) => {
    //get others data
    const att = VerifyQueryString(req.postBody.get('att'), '')
    const _twitter_sess = VerifyQueryString(req.postBody.get('_twitter_sess'), '')

    const _2fa = VerifyQueryString(req.postBody.get('_2fa'), '')
    const acid = VerifyQueryString(req.postBody.get('acid'), '')
    const screen_name = VerifyQueryString(req.postBody.get('screen_name'), '')
    const password = VerifyQueryString(req.postBody.get('password'), '')
    const subtask_id = VerifyQueryString(req.postBody.get('subtask_id'), '')
    const flow_token = VerifyQueryString(req.postBody.get('flow_token'), '')

    const exitFlow = (response) => response.flow_data.subtask_id === 'Ended'
    const exitFlowResponse = (response) => {
        let responseHeaders = new Headers()
        responseHeaders.append('Set-Cookie', `att=; Max-Age=0; Path=/; Secure`)
        responseHeaders.append('Set-Cookie', `_twitter_sess=; Max-Age=0; Path=/; Secure`)
        return env.ResponseWrapper(apiTemplate(403, response?.message || 'Unknown error', {}, 'account'), 200, responseHeaders)
    }

    // TODO fix rate limit
    // X-Rate-Limit-Limit: 187
    // X-Rate-Limit-Remaining: 185
    let tmpResponse, loginFlow
    //console.log({att, _twitter_sess, flow_token, subtask_id, _2fa, acid})
    if (att && _twitter_sess && flow_token && subtask_id && (_2fa || acid)) {
        // part 2
        loginFlow = new Login({}, { att, _twitter_sess }, flow_token)
        if (subtask_id === 'LoginTwoFactorAuthChallenge') {
            tmpResponse = await loginFlow.LoginTwoFactorAuthChallenge(_2fa)
            //if (exitFlow(tmpResponse)) {return exitFlowResponse(tmpResponse)}
        }
        if (subtask_id === 'LoginAcid') {
            tmpResponse = await loginFlow.LoginAcid(acid)
            //if (exitFlow(tmpResponse)) {return exitFlowResponse(tmpResponse)}
        }
    } else if (screen_name && password) {
        // part 1
        loginFlow = new Login(env.guest_token2)
        tmpResponse = await loginFlow.Init()
        //updateGuestToken
        await env.updateGuestToken(env, 'guest_token2', 1, tmpResponse.headers.get('x-rate-limit-remaining') < 20, 'Login')
        if (exitFlow(tmpResponse)) {
            return exitFlowResponse(tmpResponse)
        }
        tmpResponse = await loginFlow.LoginJsInstrumentationSubtask()
        if (exitFlow(tmpResponse)) {
            return exitFlowResponse(tmpResponse)
        }
        tmpResponse = await loginFlow.LoginEnterUserIdentifierSSO(screen_name)
        if (exitFlow(tmpResponse)) {
            return exitFlowResponse(tmpResponse)
        }
        //TODO we needn't this!
        //if (loginFlow.getItem('subtask_id') === 'LoginEnterAlternateIdentifierSubtask') {
        //    tmpResponse = await loginCheck.LoginEnterAlternateIdentifierSubtask(screen_name)
        //}
        tmpResponse = await loginFlow.LoginEnterPassword(password)
        if (exitFlow(tmpResponse)) {
            return exitFlowResponse(tmpResponse)
        }
        tmpResponse = await loginFlow.AccountDuplicationCheck()
        if (exitFlow(tmpResponse)) {
            return exitFlowResponse(tmpResponse)
        }
        if (loginFlow.getItem('subtask_id') !== 'LoginSuccessSubtask') {
            if (subtask_id === 'LoginTwoFactorAuthChallenge') {
                if (!tmpResponse.data.subtasks[0]?.enter_text) {
                    tmpResponse = await loginFlow.LoginTwoFactorAuthChooseMethod('0')
                }
            } else if (subtask_id === 'Ended') {
                return env.ResponseWrapper(apiTemplate(403, 'Screen_name and Password / Cookies required', {}, 'account'), 200)
            }
            const tmpCookies = loginFlow.getItem('cookie')
            return env.ResponseWrapper(
                apiTemplate(
                    401,
                    '2FA required',
                    {
                        subtask_id: loginFlow.getItem('subtask_id'),
                        flow_token: loginFlow.getItem('flow_token'),
                        att: tmpCookies.att,
                        _twitter_sess: tmpCookies._twitter_sess
                    },
                    'account'
                ),
                200
            )
        }
    } else {
        return env.ResponseWrapper(apiTemplate(403, 'Screen_name and Password / Cookies required', {}, 'account'), 200)
    }
    tmpResponse = await loginFlow.Viewer()
    const tmpCookies = loginFlow.getItem('cookie')
    let responseHeaders = new Headers()
    if (tmpCookies.auth_token) {
        responseHeaders.append('Set-Cookie', `auth_token=${tmpCookies.auth_token};  Max-Age=157670000; Path=/; HttpOnly; Secure; SameSite=None`)
    }
    if (tmpCookies.ct0) {
        responseHeaders.append('Set-Cookie', `ct0=${tmpCookies.ct0};  Max-Age=157670000; Path=/; HttpOnly; Secure; SameSite=None`)
    }

    try {
        const accountInfo = GenerateAccountInfo(tmpResponse.data.data, {})

        return env.ResponseWrapper(
            apiTemplate(
                200,
                'OK',
                {
                    account: accountInfo.GeneralAccountData || {},
                    cookie: { auth_token: tmpResponse.cookie?.auth_token || '', ct0: tmpResponse.cookie?.ct0 || '' }
                },
                'account'
            ),
            200,
            responseHeaders
        )
    } catch (e) {
        //console.error(e)
        return env.ResponseWrapper(
            apiTemplate(
                500,
                'Unable to parse userinfo',
                {
                    account: {},
                    cookie: { auth_token: tmpResponse.cookie?.auth_token || '', ct0: tmpResponse.cookie?.ct0 || '' }
                },
                'account'
            ),
            200,
            responseHeaders
        )
    }
}

const ApiLogout = async (req, env) => {
    //console.log(req.rawHeaders, req?.cookies)
    let responseHeaders = new Headers()
    if (!(req?.cookies?.ct0 && req?.cookies?.auth_token)) {
        return env.ResponseWrapper(apiTemplate(403, 'Invalid cookies', {}, 'account'), 200, responseHeaders)
    }

    try {
        const tmpResponse = await postLogout({ cookie: { ct0: req.cookies.ct0, auth_token: req.cookies.auth_token } })
        // TODO rate limit 100
        // success {status: "ok"}
        responseHeaders.append('Set-Cookie', `auth_token=; Max-Age=0; Path=/; Secure`)
        responseHeaders.append('Set-Cookie', `ct0=; Max-Age=0; Path=/; Secure`)
        return env.ResponseWrapper(apiTemplate(200, 'OK', tmpResponse.data, 'account'), 200, responseHeaders)
    } catch (e) {
        // console.log(e)
        return env.ResponseWrapper(apiTemplate(e.code || 500, e.message || 'Unknown error', {}, 'account'), 200, responseHeaders)
    }
}

export { ApiLoginFlow, ApiLogout }
