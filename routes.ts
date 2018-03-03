// All the routes for the totoz.eu server

import express = require('express')
import redis = require('redis')
import {incChar,highlightTerm, notEmpty} from './utils'

const routes = express.Router()

const client = redis.createClient()

interface TotozInfo {name: string, username: string, created: string, changed: string, nsfw: string}
function totozes_info(totozes: string[],cb: redis.Callback<(TotozInfo|null)[]>) { // TODO : test + TODO check results are the right format
    const b = client.batch()
    totozes.forEach(t => b.hgetall('totoz:meta:'+t.toLowerCase()))
    b.exec(cb)
}

function totozes_startswith(start: string, cb: redis.Callback<string[]>) { // TODO : test
    start = start.toLowerCase()
    const rangestart = '['+start
    const rangeend = start.length == 0 ? '+' : '('+start.replace(/.$/, incChar)

    client.zrangebylex('totozes:alpha', rangestart, rangeend,"LIMIT",0,100,cb)
}

routes.get('/',(req, res, next) => {
    const query:string = req.query.q || ''

    const totozlist_only = req.query.tlonly === "1"
    const template = totozlist_only ? 'fragments/totoz_list' : 'index'

    totozes_startswith(query, (err, totozes) => {
        totozes_info(totozes, (err,info) => {
            const info2 = info.filter(notEmpty).map(i=> ({ // TODO : complain if there are empty values because it shoudl'nt happen
                ...i,
                lcName:i.name.toLowerCase(),
                hiName:highlightTerm(i.name.toLowerCase(),query,'match')
            }))

            res.render(template, {totozes: info2, query})
        })
    })
})

export default routes