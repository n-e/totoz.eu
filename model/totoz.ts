import redis = require('redis')
import {incChar} from '../utils'
import {promisify} from 'util'
export interface TotozInfo {name: string, username: string, created: string, changed: string, nsfw: string}
type C = redis.RedisClient
type Cb<T> = redis.Callback<T>

// ugly global but good enough for a not-so-reusable app
export const client = promisifyRedisClient(redis.createClient())

function promisifyRedisClient(client: redis.RedisClient): (redis.RedisClient & {[index:string]:any}) {
    const c: (redis.RedisClient & {[index:string]:any}) = client
    c.smembersA= promisify(c.smembers)
    c.sinterA= promisify(c.sinter)
    c.zrangebylexA= promisify(c.zrangebylex)
    c.keysA = promisify(c.keys)
    c.saddA = promisify(c.sadd)
    c.hgetallA = promisify(c.hgetall)
    return c
}

const execA = promisify(client.batch().exec)

/* MISC GETTERS */

export function totoz_tags(totoz_id: string): Promise<string[]> {
    return client.smembersA('totoz:tags:'+totoz_id)
}

export function totozes_info(totoz_ids: string[]):Promise<TotozInfo[]> { // TODO : test + TODO check results are the right format
    const b = client.batch()
    totoz_ids.forEach(t => b.hgetall('totoz:meta:'+t))
    return execA.call(b) // TODO : Crap, we lose typings
}

export async function all_totozes_slow(): Promise<string[]> {
    return (await client.keysA('totoz:meta:*')).map((r:string) => r.replace(/^totoz:meta:/,''))
}

/* 2GRAM INDEXING AND SEARCH */

// returns all the 3grams for the totoz name or tag
// the 3grams are [a-z0-9], the other characters are ignored
// If the totoz name or tag, with other characters ignored is one or two letters,
// it has the 3gram '12'
// If its is empty, we don't return any ngrams
export function ngrams(str: string) {
    const filtered_str = str.toLowerCase().replace(/[^a-z0-9]/g,'')
    const out: string[] = []
    for(let i = 0; i< filtered_str.length-2; i++)
        out.push(filtered_str.substr(i,3))
    
    if (filtered_str.length == 1 || filtered_str.length == 2)
        out.push('12')
    return out
}


// match : the value to index (e.g. tag name, other metadata)
// totoz_id : the totoz to point to
export async function index_ngram(match:string,totoz_id:string) {
    const ngs = ngrams(match)
    const batch = client.batch()
    ngs.forEach(ng => batch.sadd('totozes:index:3gram:'+ng,totoz_id))
    await execA.call(batch)
}

// This does an index search
// keywords : A list of keywords to match
// Note: there will be false positives (e.g. mmmm will match mm)
// Keywords of 1 or 2 letters or less will only match 2-letter totozes
// To match 3-letter or more totozes you must pad the keyword yourself
export async function totozes_ngram(keywords: string[]) {
    let ngs:string[] = []
    
    for (let k of keywords)
        ngs = ngs.concat(ngrams(k))

    if (ngs.length>0) {
        const ttz:string[] = await client.sinterA(...ngs.map(ng => 'totozes:index:3gram:'+ng))
        return ttz
    }
    else
        return []
}

/* ALPHA SEARCH */

export function totozes_startswith(start: string) { // TODO : test
    start = start.toLowerCase()
    const rangestart = '['+start
    const rangeend = start.length == 0 ? '+' : '('+start.replace(/.$/, incChar)

    return client.zrangebylexA.call(client,'totozes:alpha', rangestart, rangeend,"LIMIT",0,100)
}

/* BY USER SEARCH */

export async function index_byuser(totoz_id:string) {
    const [info] = await totozes_info([totoz_id])

    if(!info || info.username === undefined)
        throw new Error('Invalid totoz: ' + totoz_id)

    await client.saddA('totozes:index:byuser:'+info.username.toLowerCase(),totoz_id)
}

export function totozes_byuser(user_id: string): string[] {
    return client.smembersA('totozes:index:byuser:' + user_id)
}