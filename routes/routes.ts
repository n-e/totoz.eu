// All the routes for the totoz.eu server

import express = require('express')
import hescape = require('escape-html')
import multer from 'multer'
import sizeOf from 'image-size'
import { js2xml } from 'xml-js'

import { highlightTerms, throwtonext} from '../utils'
import { pool } from '../db'


const routes = express.Router()

const querytokws = (q: string) => q
    .split(' ')
    .map(e => e.trim())
    .filter(e => e != '')

const escapeforlike = (s: string) => s.replace(/[_%\\]/g, '\$&')

// query: the query string as typed by the user
// If the query has a length of 0: return newest totozes
// If the query has keywords: return totozes that match all keywords exactly
async function search(query: string, limit: number | 'ALL', exclude_hfr: boolean):
    Promise<{name: string, nsfw: boolean, user_name: string, tags: string[]}[]>
{
    const keywords = querytokws(query)

    const extra_where = exclude_hfr ? "AND user_name <> 'hfr'" : ''

    let sql, bind: any[]
    if (keywords.length == 0) {
        sql = `
            select name,nsfw,user_name,'{}'::text[] tags,
                count(*) over() as count
            from totoz
            where true ${extra_where}
            order by created desc
            limit ${limit}`
        bind = []
    }
    else {
        // We don't use totozv because using it results in the query being
        // executed in the wrong order (and being slow)
        sql = `with namesandtags as (
                select name, count(*) over() as count
                from totozmeta where
                    -- we have both conds because indices are not supported
                    -- in pg for op ALL(array)
                    meta ilike '%' || $2 || '%'
                    and meta ilike all($1)
                    ${extra_where}
                order by name <-> $2 asc
                limit ${limit}
            )
            select totoz.name,nsfw,totoz.user_name,array_agg(tags.name) tags,
            count
            from namesandtags
            left join tags on tags.totoz_name = namesandtags.name
            left join totoz on totoz.name = namesandtags.name
            group by totoz.name,count
            order by totoz.name <-> $2 asc
            `
        bind = [keywords.map(k => '%' + escapeforlike(k) + '%'), keywords[0]]
    }

    const totozes = await pool.query(sql, bind)

    // TODO: search tags

    return totozes.rows
}

// returns the data that is used by the totoz_list fragment
function data_for_totoz_list(query_result: any[], path: string, query?: string): {
    totozes: {
        name: string,
        user_name: string,
        tags: string[],
        nsfw: boolean,
        detailsUrl: string,
        hiName: string,
        hiTags: string
    }[],
    results_info: {
        shown: number,
        count: number,
        showall_url: string
    }
} {
    // TODO: rewrite this properly
    if (process.env.NODE_ENV != 'production' && query_result.length > 0) {
        const r = query_result[0]
        if (r.name == undefined || r.user_name == undefined || !r.tags.map || r.nsfw === undefined)
            throw new Error('It appears the query doesnt return the required fields ' + JSON.stringify(r))
    }

    const kws = querytokws(query || '')

    const totozes = query_result
        .map(i => ({
            ...i, // TODO : clean this shit
            detailsUrl: '/totoz/' + i.name,
            hiName: query ? highlightTerms(i.name, kws, 'match') : i.name,
            hiUserName:
                query ? highlightTerms(i.user_name, kws, 'match') : i.user_name,
            hiTags: (i.tags != undefined && query && query != '') ?
                i.tags
                    .filter((t: any) => t != null)
                    .map((t: any) => highlightTerms(t, kws, 'match'))
                    .filter((t: any) => kws.some(
                        kw => kw .length > 0 &&
                        t.toLowerCase().indexOf(kw.toLowerCase()) >= 0))
                : []
        }))
    const results_info = {
        shown: totozes.length,
        count: totozes.length > 0 ? totozes[0].count : 0,
        showall_url:
            path + (query ? '?q=' + hescape(query) + '&' : '?') + 'showall=1'
    }
    return {totozes, results_info}
}

routes.get('/', throwtonext(async (req, res, next) => {
    // QUERY PARAMETER 1: query string (optional)
    const query = '' + (req.query.q || '')

    // QUERY PARAMETER 2: tlonly (optional)
    // if set to 1, only send the html fragment that contains the totoz list.
    // Otherwise send the full page.
    // This is used for refreshing the search results during find as you type
    const totozlist_only = req.query.tlonly === '1'
    const template = totozlist_only ? 'fragments/totoz_list' : 'index'

    // QUERY PARAMETER 3: showall (optional)
    const showall = req.query.showall === '1'

    const exclude_hfr = req.query.hfr == 'off'

    const info = await search(query, showall ? 'ALL' : 120, exclude_hfr)

    res.render(
        template,
        {
            query,
            ...data_for_totoz_list(info, '/', query),
            body_id: 'index',
            exclude_hfr
        })
}))

routes.get('/search.xml', throwtonext(async (req, res, next) => {
    const query = '' + (req.query.terms || '')
    const offset = + (req.query.offset || 0) // not used for now
    const exclude_hfr = req.query.hfr == 'off'

    // The 1000 results limit is enough to return every totoz
    // for queries such as 'chien' or 'frog' but doesn't overflow
    // clients for 0 or 1-letter queries
    // That's kind of ugly but a better solution such as using count/offset
    // would require the clients to be modified
    const totoz = await search(query, 1000, exclude_hfr)

    const totozForXml = totoz.map(t => ({
        name: t.name,
        username: t.user_name,
        tag: t.tags,
        nsfw: t.nsfw ? 1 : 0
    }))

    const xml = js2xml({totozes: {totoz: totozForXml}}, {compact: true, spaces: 2})
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.type('xml').send(xml)
}))

routes.get('/totoz/:totoz_id?', throwtonext(async (req, res, next) => {
    const totoz_id: string = req.params.totoz_id || ''
    const {rows} = await pool.query(`
        select
            t.name totoz_name,
            ta.name tag_name,
            t.user_name as totoz_user_name,
            (ta.user_name = $2 or t.user_name = $2) as can_delete_tag,
            t.user_name = $2 as can_delete_totoz,
            nsfw,
            created,
            changed
        from totoz t
        left join tags ta on ta.totoz_name = t.name
        where t.name = $1;`,
        [totoz_id, req.user ? req.user.name : null]
    )

    if (rows.length == 0)
        return next()

    res.render('totoz', {
        data: rows,
        body_id: 'totoz',
        page_title: '[:' + totoz_id + ']',
    })
}))

routes.get('/user/:user_id?', throwtonext(async (req, res, next) => {
    const showall = req.query.showall === '1'
    const user_id: string = req.params.user_id || ''

    const result = await pool.query(
        'select name,created from users where name = $1', [user_id])

    if (result.rowCount == 0) {next(); return }

    const page_user = result.rows[0]

    const limit = showall ? 'ALL' : 120
    const result2 = await pool.query(`
        select nsfw,name,user_name,tags, count(*) over() as count
        from totozv where user_name = $1 limit ${limit}`,
        [user_id])
    // TODO: bail if user not found

    res.render('user', {
        page_user,
        ...data_for_totoz_list(result2.rows, '/user/' + user_id)
    })
}))


routes.get('/create_totoz', throwtonext(async (req, res, next) => {
    res.render('create_edit_totoz', {prevValues: {nsfw: 'false'}, errors: []})
}))


const multipart = multer()

routes.post(
    '/create_totoz',
    multipart.single('image'),
    throwtonext(async (req, res, next) => {
    if (!req.user) {
        next(); return
    }

    const errors: string[] = []

    const nsfw = req.body.nsfw == 'true' ? true : false
    const tags = ('' + req.body.tags).split(/[ ,]/).filter(t => t.length > 0)
    for (const t of tags)
        if (!t.match(/^[A-Za-z0-9-_]+$/))
            errors.push(`Tag '${t}' is invalid`)

    const name = '' + req.body.name
    if (!name.match(/^[A-Za-z0-9-_ ]+$/))
        errors.push(`Totoz name '${name}' is invalid`)

    const image = req.file ? req.file.buffer : undefined
    if (image == undefined)
        errors.push('You need to provide an image for the totoz')

    if (image) {
        if (image.length > 1024 * 500)
            errors.push(`Image is too big (${Math.round(image.length / 1024)}kB)`)

        try {
        const data = sizeOf(image)
        if (data.type != 'gif' && data.type != 'jpg' && data.type != 'png')
            errors.push(
                `Wrong image format (${data.type}), gif, jpeg and png are allowed.`)
        if (data.height > 200 || data.width > 200)
            errors.push(`Image is too big (${data.width},${data.height})`)
        }
        catch (e) {
            errors.push(`Unknown image format`)
        }
    }

    if (errors.length == 0) {
        const client = await pool.connect()
        try {
            await client.query('begin')
            await client.query(`
                insert into totoz(name,created,changed,nsfw,user_name,image)
                values($1,now(),now(),$2,$3,$4)`,
                [name, nsfw, req.user.name, image]
            )
            await client.query(`
                insert into tags(name,totoz_name)
                select unnest as name,$1 as totoz_name
                from  unnest($2::varchar[]);`,
                [name, tags])
            await client.query('commit')
            res.redirect('/totoz/' + name)
            return

        } catch (e) {
            await client.query('rollback')
            if (
                e.constraint == 'totoz_name_uniqueci_idx' ||
                e.constraint == 'totoz_pkey'
            )
                errors.push(`Totoz '${name}' already exists`)
            else
                throw e
        } finally {
            client.release()
        }
    }

    if (errors.length > 0)
        res.render('create_edit_totoz', {errors, prevValues: req.body})

}))

// returns the totoz name if it exists, null otherwise
async function validate_totoz_name(name: string) {
    const results = await pool.query(
        'select name from totoz where name = $1',
        [name])
    return results.rowCount ? '' + results.rows[0].name : null
}

routes.post('/add_tags', throwtonext(async (req, res, next) => {
    const tags = ('' + req.body.tags).split(/[ ,]/)
        .map(t => t.replace(/[^A-Za-z0-9-_]/g, ''))
        .filter(t => t.length > 0)

    const totoz_name = await validate_totoz_name(req.body.totoz_name)
    if (totoz_name && req.user) {

        await pool.query(`
            insert into tags(name,totoz_name,user_name)
            select unnest as name,$1,$2 as totoz_name
            from  unnest($3::varchar[])
            on conflict do nothing`,
            [totoz_name, req.user.name, tags])
        res.redirect('/totoz/' + totoz_name)
    }
}))

routes.post('/delete_tag', throwtonext(async (req, res, next) => {
    const {tag_name, totoz_name} = req.body
    if (req.user && await validate_totoz_name(totoz_name)) {
        await pool.query(`
            delete from tags
            where name = $1 and totoz_name = $2 and (
                user_name = $3
                or exists (select * from totoz where name = $2 and user_name = $3)
            )`,
            [tag_name, totoz_name, req.user.name])
        res.redirect('/totoz/' + totoz_name)
    }
    else
        next()
}))

routes.post('/delete_totoz', throwtonext(async (req, res, next) => {
    const {totoz_name} = req.body
    if (req.user && await validate_totoz_name(totoz_name)) {
        await pool.query(`
            delete from tags
            where totoz_name = $1 
	    and exists(select 1 from totoz where totoz_name=$1 and user_name=$2)
            `,
            [totoz_name, req.user.name])
        await pool.query(`
            delete from totoz
            where name = $1 and user_name=$2
            `,
            [totoz_name, req.user.name])
        res.redirect('/')
    }
    else
        next()
}))

routes.get('/img/:name(*)', throwtonext(async (req, res, next) => {
    const {rows} = await pool.query(
        'select name,nsfw,image from totoz where lower(name) = lower($1)',
        [req.params.name]
    )
    if (rows.length == 0)
        next()
    else if (rows[0].nsfw && res.locals.sfw) {
        res.statusMessage = 'Not Safe For Work'
        res.status(403).send('This totoz is NSFW and you are on the SFW site')
    }
    else if (rows[0].image == null)
        res.status(404).send('This totoz has no image')
    else if (rows[0].name != req.params.name)
        res.redirect(301, '/img/' + rows[0].name)
    else {
        let image_type = 'gif'
        try {
            const {type} = sizeOf(rows[0].image)
            if (type) image_type = type
        }
        catch (e) {}
        res.setHeader('Cache-Control', ['public', 'max-age=' + 3600 * 24 * 7])
        res.type(image_type).send(rows[0].image)
    }
}))

export default routes
