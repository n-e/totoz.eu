// All the routes for the totoz.eu server

import express = require('express')
import {incChar,highlightTerm, notEmpty} from './utils'
import {totozes_startswith, totozes_info, totozes_2gram, TotozInfo, totoz_tags} from './model/totoz'
import { RequestHandler, RequestHandlerParams } from 'express-serve-static-core';

const throwtonext = (f: RequestHandler) => (req: express.Request,res: express.Response,next: express.NextFunction) => {
    Promise.resolve(f(req,res,next)).catch(next)
}

const routes = express.Router()

routes.get('/', throwtonext(async (req, res, next) => {
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

    const totozes = await totozes_2gram(queryForIndexSearch)
    let info:(TotozInfo & {tags?:string[]})[] = await totozes_info(totozes)
    info = info
        .filter(notEmpty) // TODO : complain if there are empty values because it shoudl'nt happen
        .filter((e,i)=>i<1000) // TODO : doesn't work properly if there are many false positives
    for (let i of info)
        i.tags = await totoz_tags(i.name.toLowerCase())
    const info2 = info
        .map(i=> ({ 
            ...i, // TODO : clean this shit
            lcName:i.name.toLowerCase(),
            hiName:highlightTerm(i.name.toLowerCase(),query,'match'),
            hiTags:(i.tags != undefined && query != '') ?
                i.tags.map(t=>highlightTerm(t,query,'match')).filter(t=>t.indexOf(query)>=0) : []
        }))
        .sort((a,b)=>a.lcName<b.lcName ? -1:1)
        .filter(i => i.hiTags.length>0 || i.lcName.indexOf(query)>=0)
        .filter((e,i)=>i<120)
        

    res.render(template, {totozes: info2, query})

}))

export default routes