import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'


const smili_page_url = (letter: string, offset: number) =>
    `https://forum.hardware.fr/wikismilies.php?config=hfr.inc\
&alpha=${letter}&withouttag=0&threecol=1&page=${offset}`
export const letters = 'abcdefghijklmnopqrstuvwxyz|'

const removeTotozBrackets = (tt: string) => tt.substr(2, tt.length - 3)


// returns a list of the totozes (with associated tags) on a wikismili page
export async function get_totoz_on_page(letter: string, offset: number) {
    const pg = await fetch(smili_page_url(letter, offset))
    if (pg.status != 200)
        throw new Error(`HTTP Error ${pg.status} fetching ${letter}/${offset}`)

    const dom = new JSDOM(await pg.text())
    const totoz_tds = dom.window.document.querySelectorAll('td.cBackTab1')
    const totoz_imgs = dom.window.document.querySelectorAll('th.cBackTab1 img')
    const totoz_urls = Array.from(totoz_imgs).map(i => i.getAttribute('src'))

    return Array.from(totoz_tds).map((td, i) => ({
        name: removeTotozBrackets(td.firstChild!.textContent!),
        tags: Array.from(td.getElementsByTagName('a')).map(e => e.textContent!),
        url: totoz_urls[i]!
    }))
}

export async function get_totoz_image(totoz_url: string) {
    const res = await fetch(encodeURI(totoz_url))
    if (res.status != 200) {
        return null
    }
    return res.buffer()
}
