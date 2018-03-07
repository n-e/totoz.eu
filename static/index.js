document.addEventListener("DOMContentLoaded", function(event) {

    const totozes = document.getElementsByClassName('totozes')[0]
    let currentRequest = null

    document.getElementById('query').oninput = e => {
        const query = encodeURIComponent(e.target.value)

        window.history.replaceState(undefined,'',(query.length > 0) ? '/?q='+query : '/')
        
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