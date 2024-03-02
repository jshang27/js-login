import http from "http";
import fs from "fs";

if (process.argv.length < 3) {
    console.error("expected a port to serve on in the second argument");
    process.exit(1);
}
if (Number.isNaN(+process.argv[2])) {
    console.error("expected an integer port number");
    process.exit(1);
}

http.createServer(function (req, res) {
    let u = new URL(`https://${req.headers.host}${req.url}`);
    const file = u.pathname.substring(1);
    if (file == "signup") {
        handleSignup(res, u.searchParams);
    } else if (file == "login") {
        handleLogin(res, u.searchParams);
    } else if (file == "error.css") {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.write(fs.readFileSync("src/error.css"));
    } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("src/404.html"))
    }
    res.end();
}).listen(process.argv[2])

function handleSignup(res: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }, searchParams: URLSearchParams) {
    res.writeHead(501, { "Content-Type": "text/html" });
    res.write(fs.readFileSync("src/server-error.html"));
}

function handleLogin(res: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }, searchParams: URLSearchParams) {
    res.writeHead(501, { "Content-Type": "text/html" });
    res.write(fs.readFileSync("src/server-error.html"));
}
