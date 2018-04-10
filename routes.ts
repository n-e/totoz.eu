// All the routes for the totoz.eu server

import express = require('express')
import hescape = require('escape-html')

import {incChar,highlightTerm, notEmpty, highlightTerms} from './utils'
import {totozes_startswith, totozes_info, totozes_ngram, TotozInfo, totoz_tags} from './model/totoz'
import { RequestHandler, RequestHandlerParams } from 'express-serve-static-core';

const throwtonext = (f: RequestHandler) => (req: express.Request,res: express.Response,next: express.NextFunction) => {
    Promise.resolve(f(req,res,next)).catch(next)
}

const routes = express.Router()

// query: the query string as typed by the user
// If the query has a length of 0: TODO
// If the query has keywords: return totozes that match all keywords exactly
async function search(query: string) {
    const keywords = query.split(' ')

    // TODO : show a better default page
    if (query.length == 0)
        keywords.push('a') // return 1 and 2 letter totozes

    // Do the index search
    const totozes = await totozes_ngram(keywords)

    // Filter the false positives
    let info:(TotozInfo & {tags?:string[]})[] = await totozes_info(totozes)

    for (let i of info)
        i.tags = await totoz_tags(i.name.toLowerCase()) // TODO use BULK op

    // if query length is zero don't refilter the default page
    if (query.length == 0)
        return info
    else
        return info.filter(i => keywords.every(
            k=>i.name.indexOf(k)>=0 ||
            i.tags!.some(t => t.indexOf(k)>=0)))

}

routes.get('/', throwtonext(async (req, res, next) => {
    // QUERY PARAMETER 1: query string (optional)
    const query:string = req.query.q || ''

    // QUERY PARAMETER 2: tlonly (optional)
    // if set to 1, only send the html fragment that contains the totoz list.
    // Otherwise send the full page.
    // This is used for refreshing the search results during find as you type
    const totozlist_only = req.query.tlonly === "1"
    const template = totozlist_only ? 'fragments/totoz_list' : 'index'

    // QUERY PARAMETER 2: showall (optional)
    const showall = req.query.showall === '1'
    
    let info = await search(query)

    const info2 = info
        .map(i=> ({ 
            ...i, // TODO : clean this shit
            lcName:i.name.toLowerCase(),
            detailsUrl: '/totoz/' + i.name.toLowerCase(),
            hiName:highlightTerms(i.name.toLowerCase(),query.split(' '),'match'),
            hiTags:(i.tags != undefined && query != '') ?
                i.tags
                    .map(t=>highlightTerms(t,query.split(' '),'match'))
                    .filter(t=>query.split(' ').some( kw => kw .length > 0 && t.indexOf(kw)>=0))
                : []
        }))
        .sort((a,b)=>a.lcName<b.lcName ? -1:1)
        .filter((e,i)=> i<120 || showall)
    
    const truncated_results = query.split(' ').some(kw => kw.length < 3) // TODO move near the search function
    const results_info = {
        shown: info2.length,
        count: info.length,
        count_txt: truncated_results ? 'more than ' + info.length : '' + info.length,
        showall_url: '/?q=' + hescape(query) + '&showall=1'
    }

    res.render(template, {totozes: info2, query, results_info, body_id:'index'})
}))

routes.get('/totoz/:totoz?', throwtonext(async (req, res, next) => {
    const totoz_name:string = req.params.totoz || ''
    const [totoz_info] = await totozes_info([totoz_name.toLowerCase()])

    if (!totoz_info || totoz_info.name === undefined)
        return next()
    
    const tags = await totoz_tags(totoz_name.toLocaleLowerCase())
    
    res.render('totoz', {
        ...totoz_info,
        tags,
        body_id:'totoz',
        page_title: '[:' + totoz_name + ']',
    })
}))

export default routes