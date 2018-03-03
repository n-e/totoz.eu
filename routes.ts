// All the routes for the totoz.eu server

import express = require('express')
import redis = require('redis')
import {promisify} from 'util'

const routes = express.Router()

const client = redis.createClient()

const incChar = (s:string) => String.fromCharCode(s.charCodeAt(0)+1)

function totozes_startswith(start: string, cb: redis.Callback<string[]>) {
    const rangestart = '['+start
    const rangeend = start.length == 0 ? '+' : '('+start.replace(/.$/, incChar)

    client.zrangebylex('totozes', rangestart, rangeend,"LIMIT",0,100,cb)
}

routes.get('/',(req, res, next) => {
    const query:string = req.query.q || ''

    const totozlist_only = req.query.tlonly === "1"
    const template = totozlist_only ? 'fragments/totoz_list' : 'index'

    totozes_startswith(query, (err, totozes) => {
        res.render(template, {totozes, query})
    })
})

export default routes