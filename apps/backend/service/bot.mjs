import express from 'express'

const bot = express()

bot.use((req, res, next) => {
    const isValid = VerifyQueryString(req.query.token, '') === ALERT_TOKEN
    if (!isValid) {
        res.json(apiTemplate(403, 'Valid Request'))
        return
    }
    next()
})
//telegram bot
// add set status notifition forceRecrawl

export default bot