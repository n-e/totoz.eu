import hescape = require('escape-html')

export const incChar = (s:string) => String.fromCharCode(s.charCodeAt(0)+1)

// Returns a string with the term in a span with the provided class
// None of the input variables are sanitized
export const highlightTerm = (str: string, term:string, className: string) => {
    if(term.length == 0)
        return str

    let pos = 0, next_pos = 0, out = ""
    while(pos != -1) {
        next_pos = str.indexOf(term,pos)

        if (next_pos == pos) {
            out += `<span class="${className}">${term}</span>`
            pos += term.length
        }
        else {
            out += (str.substr(pos,(next_pos == -1) ? undefined : (next_pos-pos)))
            pos = next_pos
        }
    }

    return out
}

export const highlightTerms = (str: string, terms:string[], className: string) => {
    const unique_terms = Array.from(new Set(terms))
    let out = str
    let i = 0
    for (let t of terms)
        out = highlightTerm(out,t,className + ' ' + className + ++i)
    return out
}

// highlight terms, escaping appropriately the input
export const highlightTermsSafe = (str: string, terms:string[], className: string) => {
    return highlightTerms(
        hescape(str),
        terms.map(t => hescape(t)),
        hescape(className)
    )
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}
