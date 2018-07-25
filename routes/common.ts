import express = require('express')

const router = express.Router()

// Common route whose values is used in layout.pug

router.use('/', (req, res, next) => {
    const force_nsfw = req.query.force_nsfw === '1' // for debugging on localhost

    if (force_nsfw)
        res.locals.sfw = false
    else
        res.locals.sfw = ! (req.headers.host || '').match(/nsfw.*\.totoz\.eu$/)

    if ((req.headers.host || '').match(/totoz.eu$/)) {
        res.locals.sfw_url = 'https://totoz.eu' +  req.url
        res.locals.nsfw_url = 'https://nsfw.totoz.eu' + req.url
    } else {
        // Crude but good enough for debugging
        const chr = req.url.match(/\?/) ? '&' : '?'
        res.locals.sfw_url = req.url.replace(/.force_nsfw=1/, '')
        res.locals.nsfw_url = req.url + chr + 'force_nsfw=1'
    }

    next()
})

export default router
