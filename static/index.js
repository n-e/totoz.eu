document.addEventListener("DOMContentLoaded", function(event) {

    const totozes = document.getElementsByClassName('totozes')[0]
    const sfw_link = document.getElementsByClassName('sfw_status')[0]
    const isNsfw = sfw_link.classList.contains('nsfw')

    let currentRequest = null

    const q = document.getElementById('query')
    const hfr = document.getElementById('hfr')
    if (q)
        q.oninput = hfr.oninput = e => {
            const query = encodeURIComponent(q.value)
                + (hfr.checked ? '&hfr=off' : '')

            const new_url = (query.length > 0) ? '/?q='+query : '/'

            // update the link to the nsfw site
            sfw_link.setAttribute(
                'href',
                (isNsfw ? 'https://totoz.eu' : 'https://nsfw.totoz.eu') + new_url)

            // set the new url
            window.history.replaceState(undefined,'',new_url)

            // launch search
            if (currentRequest)
                currentRequest.abort()

            currentRequest = new XMLHttpRequest()
            currentRequest.addEventListener('load', loadListener)
            currentRequest.open('GET','/?tlonly=1&q=' + query)
            currentRequest.send()
            function loadListener() {
                totozes.innerHTML = this.responseText
            }
        }
})