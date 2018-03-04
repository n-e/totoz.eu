// All the routes for the totoz.eu server

import express = require('express')
import redis = require('redis')
import {incChar,highlightTerm, notEmpty} from './utils'
import {totozes_startswith, totozes_info, totozes_2gram} from './model/totoz'

const routes = express.Router()

const client = redis.createClient()


routes.get('/',(req, res, next) => {
    const query:string = req.query.q || ''
    let queryForIndexSearch: string
    if (query.length == 0)
        queryForIndexSearch = 'aa'
    else if (query.length == 1)
        queryForIndexSearch = query+'a'
    else
        queryForIndexSearch = query

    const totozlist_only = req.query.tlonly === "1"
    const template = totozlist_only ? 'fragments/totoz_list' : 'index'

    totozes_2gram(client, queryForIndexSearch, (err, totozes) => {
        totozes_info(client, totozes, (err,info) => {
            const info2 = info
                .filter(notEmpty)
                .map(i=> ({ // TODO : complain if there are empty values because it shoudl'nt happen
                    ...i,
                    lcName:i.name.toLowerCase(),
                    hiName:highlightTerm(i.name.toLowerCase(),query,'match')
                }))
                .sort((a,b)=>a.lcName<b.lcName ? 1:-1)
                .filter((e,i)=>i<120)

            res.render(template, {totozes: info2, query})
        })
    })
})

export default routes