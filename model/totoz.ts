import redis = require('redis')
import {ngrams, incChar} from '../utils'
import {promisify} from 'util'
export interface TotozInfo {name: string, username: string, created: string, changed: string, nsfw: string}
type C = redis.RedisClient
type Cb<T> = redis.Callback<T>

// ugly global but good enough for a not-so-reusable app
const client = promisifyRedisClient(redis.createClient())

function promisifyRedisClient(client: redis.RedisClient): (redis.RedisClient & {[index:string]:any}) {
    const c: (redis.RedisClient & {[index:string]:any}) = client
    c.smembersA= promisify(c.smembers)
    c.sinterA= promisify(c.sinter)
    c.zrangebylexA= promisify(c.zrangebylex)
    c.keysA = promisify(c.keys)
    return c
}

const execA = promisify(client.batch().exec)

/* MISC GETTERS */

export function totoz_tags(totoz_id: string): Promise<string[]> {
    return client.smembersA('totoz:tags:'+totoz_id)
}

export function totozes_info(totozes: string[]):Promise<TotozInfo[]> { // TODO : test + TODO check results are the right format
    const b = client.batch()
    totozes.forEach(t => b.hgetall('totoz:meta:'+t.toLowerCase()))
    return execA.call(b) // TODO : Crap, we lose typings
}

export async function all_totozes_slow(): Promise<string[]> {
    return (await client.keysA('totoz:meta:*')).map((r:string) => r.replace(/^totoz:meta:/,''))
}

/* 2GRAM INDEXING AND SEARCH */

// match : the value to index (e.g. tag name, other metadata)
// totoz_id : the totoz to point to
export async function index_ngram(match:string,totoz_id:string) {
    const ngs = ngrams(match)
    const batch = client.batch()
    ngs.forEach(ng => batch.sadd('totozes:index:2gram:'+ng,totoz_id))
    await execA.call(batch)
}

// This does an index search
// Therefore, a totoz that can't be returned by the index (eg 1 letter) won't be returned
// Also, there may be false positives (e.g. mmmm will match mm)
export async function totozes_ngram(query: string) {
    const ngs = ngrams(query)

    if (ngs.length>0) {
        const ttz:string[] = await client.sinterA(...ngs.map(ng => 'totozes:index:2gram:'+ng))
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