import http from "http";
import fs from "fs";

/* SERVER START UP */
if (process.argv.length < 3) {
    console.error("expected a port to serve on in the second argument");
    process.exit(1);
}
if (Number.isNaN(+process.argv[2])) {
    console.error("expected an integer port number");
    process.exit(1);
}

/* SERVER */
function send_timeout(res: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }): void {
    res.writeHead(408, { "Content-Type": "text/html" });
    res.write(fs.readFileSync("pages/error/timeout.html"));
}

let currentRequestPool = 0;

http.createServer(async (req, res) => {
    if (currentRequestPool > 20) {
        res.writeHead(503, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/error/503.html"));
        res.end();
        return;
    }
    currentRequestPool++;
    let u = new URL(`https://${req.headers.host}${req.url}`);
    const file = u.pathname.substring(1);
    if (file == "signup") {
        await handleSignup(res, u.searchParams);
    } else if (file == "login") {
        await handleLogin(res, u.searchParams);
    } else if (file == "error/error.css") {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.write(fs.readFileSync("pages/error/error.css"));
    } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/error/404.html"));
    }
    res.end();
    currentRequestPool--;
}).listen(process.argv[2])

async function handleSignup(res: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }, searchParams: URLSearchParams) {

    return new Promise<void>((resolve, reject) => {
        let timerID = setTimeout(() => {
            send_timeout(res);
            reject()
        }, 500);
        res.writeHead(501, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/error/server-error.html"));
        clearTimeout(timerID);
        resolve();
    })
}

async function handleLogin(res: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }, searchParams: URLSearchParams) {
    return new Promise<void>((resolve, reject) => {
        let timerID = setTimeout(() => {
            send_timeout(res);
            reject();
        }, 500);
        res.writeHead(501, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/error/server-error.html"));
        clearTimeout(timerID);
        resolve();
    })
}
