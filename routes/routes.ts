// All the routes for the totoz.eu server

import express = require('express')
import hescape = require('escape-html')

import {incChar, notEmpty, highlightTerms} from '../utils'
import { RequestHandler, RequestHandlerParams } from 'express-serve-static-core';
import { pool } from '../db';
import { react } from 'babel-types';

const throwtonext = (f: RequestHandler) => (req: express.Request,res: express.Response,next: express.NextFunction) => {
    Promise.resolve(f(req,res,next)).catch(next)
}

const routes = express.Router()


// query: the query string as typed by the user
// If the query has a length of 0: return newest totozes
// If the query has keywords: return totozes that match all keywords exactly
async function search(query: string,limit:number|'ALL'): 
    Promise<{name:string,user_name:string,tags:string[]}[]>
{
    const keywords = query.split(' ')
        .map(e => e.replace(/\W/gu,'').trim())
        .filter(e => e != '')

    let sql,bind:any[]
    if (keywords.length == 0) {
        sql = `select name,nsfw,user_name,'{}'::text[] tags from totoz order by created desc`
        bind = []
    }
    else {
        // We don't use totozv because using it results in the query being executed in the wrong order (and being slow)
        sql = `with namesandtags as (
                select name from totoz where name ilike $1 union select totoz_name from tags where name ilike $1
            )
            select totoz.name,nsfw,user_name,array_agg(tags.name) tags from namesandtags
            left join tags on tags.totoz_name = namesandtags.name 
            left join totoz on totoz.name = namesandtags.name
            group by totoz.name`
        bind = ['%'+ keywords[0] +'%']
    }
    sql += ' limit ' + limit

    const totozes = await pool.query(sql,bind)

    // TODO: search tags

    return totozes.rows
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

    // QUERY PARAMETER 3: showall (optional)
    const showall = req.query.showall === '1'
    
    let info = await search(query,showall ? 'ALL':120)
    // TODO: add of XXX

    const info2 = info
        .map(i=> ({ 
            ...i, // TODO : clean this shit
            detailsUrl: '/totoz/' + i.name,
            hiName:highlightTerms(i.name,query.split(' '),'match'),
            hiTags:(i.tags != undefined && query != '') ?
                i.tags
                    .filter(t => t != null)
                    .map(t=>highlightTerms(t,query.split(' '),'match'))
                    .filter(t=>query.split(' ').some( kw => kw .length > 0 && t.toLowerCase().indexOf(kw.toLowerCase())>=0))
                : []
        }))

    const results_info = {
        shown: info2.length,
        count: 'count',
        showall_url: '/?q=' + hescape(query) + '&showall=1'
    }

    res.render(template, {totozes: info2, query, results_info, body_id:'index'})
}))

routes.get('/totoz/:totoz_id?', throwtonext(async (req, res, next) => {
    const totoz_id:string = req.params.totoz_id || ''
    const result = await pool.query(
        `select name,tags,nsfw,created,changed from totozv where name = $1;`,
        [totoz_id]
    )

    const totoz_info: {name:string,tags:string[]}|undefined = result.rows[0]

    if (!totoz_info || totoz_info.name === undefined)
        return next()
        
    res.render('totoz', {
        ...totoz_info,
        body_id:'totoz',
        page_title: '[:' + totoz_id + ']',
    })
}))

routes.get('/user/:user_id?', throwtonext(async (req, res, next) => {
    const showall = req.query.showall === '1'
    const user_id:string = req.params.user_id || ''
    const result = await pool.query(
        'select nsfw,name from totoz where user_name = $1',
        [user_id])
    // TODO: bail if user not found

    const tinfo: {name:string}[] = result.rows

    const tinfo2 = tinfo
        .map(t => ({
            ...t,
            hiTags: [],
            hiName: t.name,
            detailsUrl: '/totoz/' + t.name,
        }))
        .filter((t,i)=>i<120 || showall)
    const results_info = {
        shown: tinfo2.length,
        count: tinfo.length,
        count_txt: 0 ? 'more than ' + tinfo.length : '' + tinfo.length,
        showall_url: '/user/' + user_id + '?showall=1'
    }

    res.render('user', {user_id, results_info,totozes: tinfo2})
}))

routes.get('/:name(*).gif',throwtonext(async (req,res,next) => {
    const result = await pool.query(
        'select nsfw,image from totoz where name = $1',
        [req.params.name]
    )
    if (result.rowCount == 0)
        next()
    else if (result.rows[0].nsfw && res.locals.sfw)
        res.status(404).send('This totoz is NSFW and you are on the SFW site')
    else if (result.rows[0].image == null)
        res.status(404).send('This totoz has no image')
    else
        res.type('gif').send(result.rows[0].image)
}))

export default routes