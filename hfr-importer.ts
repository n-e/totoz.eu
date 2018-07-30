import { get_totoz_on_page, get_totoz_image, letters } from './hfr-spider'
import { pool } from './db'
import { throwtonext } from './utils'
import { ClientBase } from 'pg'
// tslint:disable:no-console

const toPgBytea = (b: Buffer | null) => b ? '\\x' + b.toString('hex') : null

// Add to the database the totoz (image + metadata) that don't
//  already exist in the database.
interface CandidateType {
    name: string
    tags: string[]
    url: string
}
async function add_new_totoz(candidates: CandidateType[], c: ClientBase) {
    await c.query('begin')

    const {rows} = await c.query(`
        insert into totoz(name,created,changed,nsfw,user_name)
        select unnest, now(), now(), false, 'hfr'
        from  unnest($1::varchar[])
        on conflict do nothing
        returning name`,
        [candidates.map(t => t.name)]
    )

    // we don't use map since it works with sync functions
    // and we fetch the images asynchronously
    const images: {name: string, image: string | null}[] = []
    for (const r of rows)
        images.push({
            name: r.name,
            image: toPgBytea(
                await get_totoz_image(candidates.find(t => t.name == r.name)!.url))
        })


    await c.query(`
        update totoz
        set image = s.image
        from jsonb_to_recordset($1) as s(name text, image bytea)
        where s.name = totoz.name`,
        [JSON.stringify(images.filter(i => i.image !== null))]
    )

    await c.query(`
        delete from totoz
        where totoz.name = any($1) and totoz.image is null`,
        [images.filter(i => i.image == null).map(e => e.name)]
    )

    await c.query('commit')

    const added = images.filter(i => i.image !== null)
    if (added.length > 0)
        console.log(added.map(r => 'Added: ' + r.name).join('\n'))
}

// Update the tags for all of the totoz
// The tags are updated if :
//      - the totoz is owned by hfr
//      - if the tag doesn't exist in the db it is created
//      - if the tag exists and has no owner the owner is set to hfr
//      - if the tags exist and is owned by someone else it is untouched
//      - the tags that don't exist anymore on hfr are NOT removed in th db
async function update_tags(totoz: CandidateType[], c: ClientBase) {
    const to_insert = totoz
    .map(tot => tot.tags
        .map(tag => ({
            name: tag,
            totoz_name: tot.name,
            user_name: 'hfr'
        })))
    .reduce((val, acc) => [...acc, ...val], []) // flatten array

    const {rows} = await c.query(`
        insert into tags(name,totoz_name,user_name)
        select distinct b.* from jsonb_populate_recordset(null::tags,$1) b
        inner join totoz on totoz.name = b.totoz_name and totoz.user_name = 'hfr'
        on conflict(name,totoz_name)
        do update set user_name='hfr' where tags.user_name is null
        returning name,totoz_name`,
        [JSON.stringify(to_insert)]
    )

    if (rows.length > 0)
        console.log(rows.map(
            (r: any) => 'Added: ' + r.totoz_name + ':' + r.name).join('\n'))
}

// returns the number of totozes on the page
// if it is 0 it means the offset is past the end.
async function updatedb_p(letter: string, offset: number) {
    const ttz = await get_totoz_on_page(letter, offset)

    const c = await pool.connect()
    try {
        await add_new_totoz(ttz, c)
        await update_tags(ttz, c)
    } catch (error) {
        throw error
    } finally {
        c.release()
    }
    return ttz.length
}

async function updatedb() {
    for (const l of letters)
        for (let i = 0;; i++) {
            console.log('Updating ' + l + i)
            const n = await updatedb_p(l, i)
            if (n == 0) break
        }
}

updatedb().catch(e => console.error(e))
