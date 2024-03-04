for (let i = 0; i < 200; i++) {
    fetch("http://localhost:8080/login").then(
        (res) => console.log("received status code: %d %s", res.status, res.statusText)
    )
}