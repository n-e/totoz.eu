document.addEventListener("DOMContentLoaded", function(event) {

    const totozes = document.getElementsByClassName('totozes')[0]

    document.getElementById('query').oninput = e => {
        const query = encodeURIComponent(e.target.value)

        window.history.replaceState(undefined,'',(query.length > 0) ? '/?q='+query : '/')
        
        window.fetch('/?tlonly=1&q=' + query)
            .then(r => r.text())
            .then(txt => {
                totozes.innerHTML = txt
            })
    }
})