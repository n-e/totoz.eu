import redis = require('redis')
import {ngrams, incChar} from '../utils'
import {promisify} from 'util'
interface TotozInfo {name: string, username: string, created: string, changed: string, nsfw: string}
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

function get_tags(totoz_id: string) {
    return client.smembersA(totoz_id)
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

export async function index_2gram(totoz_id:string) {
    const ngs = ngrams(totoz_id)
    const batch = client.batch()
    ngs.forEach(ng => batch.sadd('totozes:index:2gram:'+ng,totoz_id))
    await execA.call(batch)
}

// This does an index search then a filter
// Therefore, a totoz that can't be returned by the index (eg 1 letter) won't be returned
export async function totozes_2gram(query: string) {
    const ngs = ngrams(query)
    const reFilter = new RegExp(query,"i")

    if (ngs.length>0) {
        const ttz:string[] = await client.sinterA(...ngs.map(ng => 'totozes:index:2gram:'+ng))
        // filter the results : queries such as mmmmm will match mm
        return ttz.filter(t=>t.match(reFilter))
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