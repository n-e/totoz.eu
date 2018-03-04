import redis = require('redis')
import {ngrams, incChar} from '../utils'

interface TotozInfo {name: string, username: string, created: string, changed: string, nsfw: string}
type C = redis.RedisClient
type Cb<T> = redis.Callback<T>

/* MISC GETTERS */

function get_tags(client: C, totoz_id: string, cb:Cb<string[]>) {
    client.smembers(totoz_id, cb)
}

export function totozes_info(client: C, totozes: string[], cb: Cb<(TotozInfo|null)[]>) { // TODO : test + TODO check results are the right format
    const b = client.batch()
    totozes.forEach(t => b.hgetall('totoz:meta:'+t.toLowerCase()))
    b.exec(cb)
}

export function all_totozes_slow(client: C, cb : Cb<string[]>) {
    client.keys('totoz:meta:*',(err,res) => cb(err,res.map(r => r.replace(/^totoz:meta:/,''))))
}

/* 2GRAM INDEXING AND SEARCH */

export function index_2gram(client: C, totoz_id:string, cb: Cb<undefined[]>) {
    const ngs = ngrams(totoz_id)
    const batch = client.batch()
    ngs.forEach(ng => batch.sadd('totozes:index:2gram:'+ng,totoz_id))
    batch.exec(cb)
}

// This does an index search then a filter
// Therefore, a totoz that can't be returned by the index (eg 1 letter) won't be returned
export function totozes_2gram(client: C, query: string, cb: Cb<string[]>) {
    const ngs = ngrams(query)
    const reFilter = new RegExp(query,"i")

    if (ngs.length>0)
        client.sinter(...ngs.map(ng => 'totozes:index:2gram:'+ng),(err,ttz)=> {
            // filter the results : queries such as mmmmm will match mm
            cb(err,ttz.filter(t=>t.match(reFilter)))
        })
    else
        cb(null,[])
}

/* ALPHA SEARCH */

export function totozes_startswith(client: C, start: string, cb: Cb<string[]>) { // TODO : test
    start = start.toLowerCase()
    const rangestart = '['+start
    const rangeend = start.length == 0 ? '+' : '('+start.replace(/.$/, incChar)

    client.zrangebylex('totozes:alpha', rangestart, rangeend,"LIMIT",0,100,cb)
}