import { get_totoz_on_page, get_totoz_image, letters } from './hfr-spider'
import { pool } from './db'
import { throwtonext } from './utils'
// tslint:disable:no-console

const toPgBytea = (b: Buffer | null) => b ? '\\x' + b.toString('hex') : null

// returns the number of totozes on the page
// if it is 0 it means the offset is past the end.
async function updatedb_p(letter: string, offset: number) {
    const ttz = await get_totoz_on_page(letter, offset)

    const c = await pool.connect()
    try {
        await c.query('begin')
        const {rows} = await c.query(`
            insert into totoz(name,created,changed,nsfw,user_name)
            select unnest, now(), now(), false, 'hfr'
            from  unnest($1::varchar[])
            on conflict do nothing
            returning name`,
            [ttz.map(t => t.name)]
        )

        // we don't use map since it works with sync functions
        // and we fetch the images asynchronously
        const images: {name: string, image: string | null}[] = []
        for (const r of rows)
            images.push({
                name: r.name,
                image: toPgBytea(
                    await get_totoz_image(ttz.find(t => t.name == r.name)!.url))
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
        console.log(rows.map(r => r.name).join('\n'))
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
