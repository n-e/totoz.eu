import hescape = require('escape-html')

export const incChar = (s:string) => String.fromCharCode(s.charCodeAt(0)+1)

// Returns a string with the term in a span with the provided class
// str is unescaped and is escaped during the highlighting process
// className isn't sanitized
export const highlightTerm = (str: string, term:string, className: string) => {
    if(term.length == 0)
        return hescape(str)

    let pos = 0, next_pos = 0, out = ""
    while(pos != -1) {
        next_pos = str.indexOf(term,pos)

        if (next_pos == pos) {
            out += `<span class="${className}">${term}</span>`
            pos += term.length
        }
        else {
            out += hescape(str.substr(pos,(next_pos == -1) ? undefined : (next_pos-pos)))
            pos = next_pos
        }
    }

    return out
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}

// return all the 2grams for the string
// the ngrams are [a-z0-9]
// CAUTION : if this is change both the index and the search must be updated
export function ngrams(str: string) {
    const filtered_str = str.toLowerCase().replace(/[^a-z0-9]/g,'')
    const out: string[] = []
    for(let i = 0; i< filtered_str.length-1; i++)
        out.push(filtered_str.substr(i,2))
    return out
}