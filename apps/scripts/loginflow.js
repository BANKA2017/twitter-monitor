import { Log, GuestToken, Login } from '../../libs/core/Core.function.mjs'
import { authenticator } from 'otplib'

/*
- Using automated login scripts may result in account bans
- The script is for reference only
*/

const now = Date.now()
const guest_token = new GuestToken()
await guest_token.updateGuestToken(1)

//part 1
//const id = ''
const screen_name = ''
const password = ''
const _2fa_secret = ''

const loginFlow = new Login(guest_token)
Log(false, 'log', await loginFlow.Init())
Log(false, 'log', Date.now() - now)
Log(false, 'log', await loginFlow.LoginJsInstrumentationSubtask())
Log(false, 'log', Date.now() - now)
Log(false, 'log', await loginFlow.LoginEnterUserIdentifierSSO(screen_name))
Log(false, 'log', Date.now() - now)
if (loginFlow.getItem('subtask_id') === 'LoginEnterAlternateIdentifierSubtask') {
    Log(false, 'log', await loginCheck.LoginEnterAlternateIdentifierSubtask(screen_name))
    Log(false, 'log', Date.now() - now)
}
Log(false, 'log', await loginFlow.LoginEnterPassword(password))
Log(false, 'log', Date.now() - now)
const AccountDuplicationCheck = await loginFlow.AccountDuplicationCheck()
//provide att, _twitter_sess flow_token nextFlowName
Log(false, 'log', AccountDuplicationCheck)

//part 2
const acid = '' // Email verification code for accounts without TOTP 2fa
// or
let _2fa = '' // TOTP 2fa
if (_2fa_secret !== '') {
    _2fa = authenticator.generate(_2fa_secret)
}
Log(false, 'log', loginFlow.getItem('subtask_id'))
if (loginFlow.getItem('subtask_id') === 'LoginTwoFactorAuthChallenge') {
    if (!AccountDuplicationCheck.data.subtasks[0]?.enter_text) {
        Log(false, 'log', await loginFlow.LoginTwoFactorAuthChooseMethod('0'))
        Log(false, 'log', Date.now() - now)
    }
    Log(false, 'log', await loginFlow.LoginTwoFactorAuthChallenge(_2fa))
    Log(false, 'log', Date.now() - now)
}
if (loginFlow.getItem('subtask_id') === 'LoginAcid') {
    await loginFlow.LoginAcid(acid)
    Log(false, 'log', Date.now() - now)
}
Log(false, 'log', await loginFlow.Viewer())
Log(false, 'log', Date.now() - now)
