import hescape = require('escape-html')
import { Request, Response, RequestHandler, NextFunction } from 'express'

export const incChar = (s: string) => String.fromCharCode(s.charCodeAt(0) + 1)


// Highlights the terms by surrounding them with a span of class className
// The returned string is correctly escaped (except for the inserted span of course)
// so it can be included in html.
export const highlightTerms = (str: string, terms: string[], className: string) => {
    // console.log(str,terms,className)
    terms = terms.filter(t => t.length > 0)
    if (terms.length == 0)
        return hescape(str)

    let pos = 0, out = ''
    while (pos < str.length) {
        const next_terms = terms.map(
            term => ({
                idx: str.toLowerCase().indexOf(term.toLowerCase(), pos),
                term
            }))

        const term_here = next_terms.find(t => t.idx == pos)
        // console.log(next_terms,term_here)
        if (term_here) {
            const term = term_here.term
            out +=
                `<span class="${hescape(className)}">` +
                `${hescape(str.substr(pos, term.length))}` +
                `</span>`
            pos += term.length
        }
        else {
            const next_pos = Math.min(
                ...next_terms.filter(t => t.idx != -1).map(t => t.idx))

            out += hescape(
                str.substr(
                    pos,
                    (next_pos == +Infinity) ? undefined : (next_pos - pos)
                )
            )
            pos = next_pos
        }
    }
    return out
}


export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined
}

export const throwtonext = (
    f: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(f(req, res, next)).catch(next)
}
