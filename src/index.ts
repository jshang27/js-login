// Copyright 2024 Jason Shang

import bcrypt from "bcrypt";
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

    let code: number
    let header: Record<string, string>
    let content: Buffer

    if (file == "signup") {
        ({ code, header, content } = await handleSignup(u.searchParams));
    } else if (file == "login") {
        ({ code, header, content } = await handleLogin(u.searchParams));
    } else if (file == "style.css") {
        code = 200;
        header = { "Content-Type": "text/css" };
        content = fs.readFileSync("pages/style.css");
    } else if (file === "login.html") {
        code = 200;
        header = { "Content-Type": "text/html" };
        content = fs.readFileSync("pages/login.html");
    } else if (file === "signup.html") {
        code = 200;
        header = { "Content-Type": "text/html" };
        content = fs.readFileSync("pages/signup.html");
    } else if (file === "") {
        code = 200;
        header = { "Content-Type": "text/html" };
        content = fs.readFileSync("pages/index.html");
    } else {
        code = 404;
        header = { "Content-Type": "text/html" };
        content = fs.readFileSync("pages/error/404.html");
    }

    res.writeHead(code, header);
    res.write(content);

    res.end();
    requestPool--;
}).listen(process.argv[2])

type ParamsUserInfo = {
    error: boolean
    user: string
    pass: string
}

type StoredUserInfo = {
    user: string
    hash: string
}

type ServerResponse = {
    code: number
    header: Record<string, string>
    content: Buffer
}

function getParamsUserInfo(searchParams: URLSearchParams): ParamsUserInfo {
    if (!searchParams.has("user") || !searchParams.has("pass")) {
        return { error: true, user: "", pass: "" };
    }
    const user = searchParams.get("user");
    const pass = searchParams.get("pass");
    return { error: false, user, pass };
}

const validUserChars = "ABCDEFGHJIKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_0123456789";

function verifyUser(user: string): boolean {
    if (user.length < 3 || user.length > 32) {
        return false;
    }
    for (let i = 0; i < user.length; i++) {
        if (!validUserChars.includes(user.charAt(i))) {
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
        if (text.at(i) == 36) {
            const user = text.subarray(nameStart, i).toString();
            const hash = text.subarray(i, i + 60).toString();
            users.push({ user, hash });
            nameStart += i + 60;
            i = nameStart;
        }
    }

    return users;
}

async function handleSignup(searchParams: URLSearchParams) {
    return new Promise<ServerResponse>(async (resolve, reject) => {
        let timeout = setTimeout(() => {
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/timeout.html") })
        }, 5000);

        const { error, user, pass } = getParamsUserInfo(searchParams);
        if (error) {
            clearTimeout(timeout);
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/400.html") })
            return;
        }

        if (!verifyUser(user)) {
            clearTimeout(timeout);
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/baduser.html") })
            return;
        }
        if (!verifyPass(pass)) {
            clearTimeout(timeout);
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/badpass.html") })
            return;
        }

        const users = getUsers();
        for (let i = 0; i < users.length; i++) {
            if (users[i].user == user) {
                clearTimeout(timeout);
                resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/inuse.html") })
                return;
            }
        }

        const hash = await bcrypt.hash(pass, 16).catch(_ => {
            clearTimeout(timeout);
            resolve({ code: 500, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/server-error.html") });
            return;
        });

        if (hash == undefined) {
            return;
        }

        fs.appendFileSync("src/info.pwd", user + hash);
        clearTimeout(timeout);
        resolve({ code: 200, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/success/signedup.html") })
    })
}

async function handleLogin(searchParams: URLSearchParams) {
    return new Promise<ServerResponse>(async (resolve, reject) => {
        let timeout = setTimeout(() => {
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/timeout.html") })
        }, 5000);

        const { error, user, pass } = getParamsUserInfo(searchParams);
        if (error) {
            clearTimeout(timeout);
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/400.html") })
            return;
        }

        if (!verifyUser(user)) {
            clearTimeout(timeout);
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/failed-login.html") })
            return;
        }
        if (!verifyPass(pass)) {
            clearTimeout(timeout);
            resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/failed-login.html") })
            return;
        }

        const users = getUsers();
        for (let i = 0; i < users.length; i++) {
            if (users[i].user == user) {
                if (await bcrypt.compare(pass, users[i].hash)) {
                    clearTimeout(timeout);
                    resolve({ code: 200, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/success/loggedin.html") })
                    return;
                } else {
                    clearTimeout(timeout);
                    resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/failed-login.html") })
                    return;
                }
            }
        }

        clearTimeout(timeout);
        resolve({ code: 400, header: { "Content-Type": "text/html" }, content: fs.readFileSync("pages/error/failed-login.html") })
    })
}
