"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = __importDefault(require("http"));
var fs_1 = __importDefault(require("fs"));
if (process.argv.length < 3) {
    console.error("expected a port to serve on in the second argument");
    process.exit(1);
}
if (Number.isNaN(+process.argv[2])) {
    console.error("expected an integer port number");
    process.exit(1);
}
http_1.default.createServer(function (req, res) {
    var u = new URL("https://".concat(req.headers.host).concat(req.url));
    var file = u.pathname.substring(1);
    if (file == "signup") {
        handleSignup(res, u.searchParams);
    }
    else if (file == "login") {
        handleLogin(res, u.searchParams);
    }
    else if (file == "error.css") {
        res.writeHead(200, { "Content-Type": "text/css" });
        res.write(fs_1.default.readFileSync("src/error.css"));
    }
    else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.write(fs_1.default.readFileSync("src/404.html"));
    }
    res.end();
}).listen(process.argv[2]);
function handleSignup(res, searchParams) {
    res.writeHead(501, { "Content-Type": "text/html" });
    res.write(fs_1.default.readFileSync("src/server-error.html"));
}
function handleLogin(res, searchParams) {
    res.writeHead(501, { "Content-Type": "text/html" });
    res.write(fs_1.default.readFileSync("src/server-error.html"));
}
