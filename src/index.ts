import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import http from "http";


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

let requestPool = 0;

http.createServer(async (req, res) => {
    if (requestPool > 20) {
        res.writeHead(503, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/error/503.html"));
        res.end();
        return;
    }
    requestPool++;
    let u = new URL(`https://${req.headers.host}${req.url}`);
    const file = u.pathname.substring(1);
    if (file == "signup") {
        await handleSignup(res, u.searchParams).catch(_ => { });
    } else if (file == "login") {
        await handleLogin(res, u.searchParams).catch(_ => { });
    } else if (file == "error/error.css") {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.write(fs.readFileSync("pages/error/error.css"));
    } else if (file === "login.html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/login.html"));
    } else if (file === "signup.html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/signup.html"));
    } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.write(fs.readFileSync("pages/error/404.html"));
    }
    res.end();
    requestPool--;
}).listen(process.argv[2])

type UserInfo = {
    error: boolean
    user: string
    pass: string
}
type StoredUserInfo = {
    user: string
    hash: string
}

function getUserAndPass(searchParams: URLSearchParams): UserInfo {
    if (!searchParams.has("user") || !searchParams.has("pass")) {
        return { error: true, user: "", pass: "" };
    }
    const user = searchParams.get("user");
    const pass = searchParams.get("pass");
    return { error: false, user, pass };
}

const validChars = "ABCDEFGHJIKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789";

function verifyUser(user: string): boolean {
    if (user.length < 3 || user.length > 32) {
        return false;
    }
    for (let i = 0; i < user.length; i++) {
        if (!validChars.includes(user.charAt(i))) {
            return false;
        }
    }
    return true;
}

const numbers = "0123456789";
const lowers = "abcdefghijklnopqrstuvwxyz";
const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function verifyPass(pass: string): boolean {
    if (pass.length < 8) {
        return false;
    }
    let number = false;
    let lower = false;
    let upper = false;
    let symbol = false;

    for (let i = 0; i < pass.length; i++) {
        let c = pass.charAt(i);
        if (numbers.includes(c)) {
            number = true;
        } else if (lowers.includes(c)) {
            lower = true;
        } else if (uppers.includes(c)) {
            upper = true;
        } else {
            symbol = true;
        }
        if (number && lower && upper && symbol) {
            return true;
        }
    }
    return false;
}

function getUsers(): StoredUserInfo[] {
    let users: StoredUserInfo[] = [];

    const text = fs.readFileSync("src/info.pwd");
    let nameStart = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.at(i) == 0) {
            const user = text.subarray(nameStart, i).toString();
            const hash = text.subarray(i + 1, i + 61).toString();
            users.push({ user, hash });
            nameStart += i + 62;
            i = nameStart - 1;
        }
    }

    return users;
}

async function handleSignup(res: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }, searchParams: URLSearchParams) {
    return new Promise<void>(async (resolve, reject) => {
        let timeout = setTimeout(() => {
            send_timeout(res);
            reject();
        }, 5000);

        const { error, user, pass } = getUserAndPass(searchParams);
        if (error) {
            if (!res.closed) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.write(fs.readFileSync("pages/error/400.html"));
            }
            clearTimeout(timeout);
            reject();
            return;
        }

        if (!verifyUser(user)) {
            if (!res.closed) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.write(fs.readFileSync("pages/error/baduser.html"));
            }
            clearTimeout(timeout);
            reject();
            return;
        }
        if (!verifyPass(pass)) {
            if (!res.closed) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.write(fs.readFileSync("pages/error/badpass.html"));
            }
            clearTimeout(timeout);
            reject();
            return;
        }

        const users = getUsers();
        for (let i = 0; i < users.length; i++) {
            if (users[i].user == user) {
                if (!res.closed) {
                    res.writeHead(409, { "Content-Type": "text/html" });
                    res.write(fs.readFileSync("pages/error/inuse.html"));
                }
                clearTimeout(timeout);
                reject();
                return;
            }
        }

        const hash = await bcrypt.hash(pass, 16).catch(_ => {
            if (!res.closed) {
                res.writeHead(500, { "Content-Type": "text/html" });
                res.write(fs.readFileSync("pages/error/server-error.html"));
            }
            clearTimeout(timeout);
            reject();
        });
        if (hash != undefined) {
            fs.appendFileSync("src/info.pwd", user + "\x00" + hash);
        } else {
            return;
        }

        if (!res.closed) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.write(fs.readFileSync("pages/success/signedup.html"));
        }
        clearTimeout(timeout);
        resolve();
    })
}

async function handleLogin(res: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }, searchParams: URLSearchParams) {
    return new Promise<void>(async (resolve, reject) => {
        let timeout = setTimeout(() => {
            send_timeout(res);
            reject();
        }, 5000);

        const { error, user, pass } = getUserAndPass(searchParams);
        if (error) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.write(fs.readFileSync("pages/error/400.html"));
            clearTimeout(timeout);
            reject();
            return;
        }

        const users = getUsers();
        for (let i = 0; i < users.length; i++) {
            if (users[i].user == user) {
                if (await bcrypt.compare(pass, users[i].hash)) {
                    if (!res.closed) {
                        res.writeHead(200, { "Content-Type": "text/html" });
                        res.write(fs.readFileSync("pages/success/loggedin.html"));
                    }
                    clearTimeout(timeout);
                    resolve();
                    return;
                } else {
                    if (!res.closed) {
                        res.writeHead(400, { "Content-Type": "text/html" });
                        res.write(fs.readFileSync("pages/error/failed-login.html"));
                    }
                    clearTimeout(timeout);
                    reject();
                    return;
                }
            }
        }

        if (!res.closed) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.write(fs.readFileSync("pages/error/failed-login.html"));
        }

        clearTimeout(timeout);
        reject();
    })
}
