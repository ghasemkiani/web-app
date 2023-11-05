import url from "node:url";
import path from "node:path";
import {parseArgs} from "node:util";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";

import debug from "debug";
import Express from "express";
import serveIndex from "serve-index";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";

import {cutil} from "@ghasemkiani/base";
import {App as AppBase} from "@ghasemkiani/base-app";
import {xutil} from "@ghasemkiani/wdom";

import {Api} from "./api.js";

class App extends AppBase {
	static {
		cutil.extend(this.prototype, {
			name: "Untitled",
			Api,
			defaultPrefs: {
				port: null,
				secure: false,
				nosec: false,
				cert: null,
				key: null,
			},
			defaultPort: 3000,
			_port: null,
			_secure: null,
			_cert: null,
			_key: null,
			_nosec: null,
			_express: null,
			_api: null,
			httpServer: null,
			httpsServer: null,
			urlBase: null,
		});
	}
	get port() {
		if (cutil.na(this._port)) {
			this._port = this.prefs.port || process.env.PORT || this.defaultPort;
		}
		return this.normalizePort(this._port);
	}
	set port(port) {
		this._port = port;
	}
	get secure() {
		if (cutil.na(this._secure)) {
			this._secure = this.prefs.secure || false;
		}
		return this._secure;
	}
	set secure(secure) {
		this._secure = secure;
	}
	get nosec() {
		if (cutil.na(this._nosec)) {
			this._nosec = this.prefs.nosec || false;
		}
		return this.normalizePort(this._nosec);
	}
	set nosec(nosec) {
		this._nosec = nosec;
	}
	get cert() {
		if (cutil.na(this._cert)) {
			this._cert = this.prefs.cert || null;
		}
		return this._cert;
	}
	set cert(cert) {
		this._cert = cert;
	}
	get key() {
		if (cutil.na(this._key)) {
			this._key = this.prefs.key || null;
		}
		return this._key;
	}
	set key(key) {
		this._key = key;
	}
	get express() {
		if (cutil.na(this._express)) {
			this._express = Express();
		}
		return this._express;
	}
	set express(express) {
		this._express = express;
	}
	get api() {
		if (cutil.na(this._api)) {
			let {Api} = this;
			this._api = new Api({app});
		}
		return this._api;
	}
	set api(api) {
		this._api = api;
	}
	async toSetup() {
		let app = this;
		let {express} = app;
		let {urlBase} = app;
		let {api} = app;
		await api.toInit();
		express.set("api", api);

		express.use(logger("dev"));
		express.use(Express.json());
		express.use(Express.urlencoded({extended: false}));
		express.use(cookieParser());

		express.get("/", (req, res, next) => {
			res.set("Content-Type", "text/html");
			res.send(Buffer.from(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><script type="text/javascript" src="/scripts/client.js"></script></head><body></body></html>`));
		});
		router.get("/api/:method", asyncHandler(async(req, rsp) => {
				let {method} = req.params;
				method = cutil.toCamelCase("to-do-" + method);
				let arg = {...req.query};
				let api = req.app.get("api");
				rsp.set("Content-Type", "application/json");
				let res;
				try {
					let result = await api[method](arg);
					res = {success: true, result};
				} catch (e) {
					res = {success: false, error: e.message};
				}
				rsp.send(res);
			}));
		
		let pubpath = path.join(path.dirname(url.fileURLToPath(urlBase)), "public");
		express.use(Express.static(pubpath));
		express.use(serveIndex(pubpath));

		express.use((req, res, next) => {
			next(createError(404));
		});

		express.use((err, req, res, next) => {
			res.status(err.status || 500);
			let text = `<h1>${xutil.escape(err.message)}</h1>`;
			if (express.get("env") === "development") {
				text += `<p>${xutil.escape(err.status)}</p>`;
				text += `<pre>${xutil.escape(err.stack)}</pre>`;
			}
			res.send(text);
		});
	}
	normalizePort(val) {
		let port = parseInt(val, 10);
		return isNaN(port) ? val : port >= 0 ? port : false;
	}
	async toListen() {
		let app = this;
		let {express} = app;
		let {port, secure, cert, key, nosec} = app;
		let {name} = app;
		
		debug(`${name}:server`);
		
		express.set("port", port);

		if (!secure) {
			start(app.httpServer = http.createServer(express), port);
		} else {
			start(app.httpsServer = https.createServer({key, cert}, express), port);
			if (cutil.a(nosec)) {
				start(app.httpServer = http.createServer(express), nosec);
			}
		}

		const start = (server, port) => {
			server.on("error", (error) => {
				if (error.syscall !== "listen") {
					throw error;
				}

				let bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

				switch (error.code) {
				case "EACCES":
					console.error(bind + " requires elevated privileges");
					process.exit(1);
					break;
				case "EADDRINUSE":
					console.error(bind + " is already in use");
					process.exit(1);
					break;
				default:
					throw error;
				}
			});
			
			server.on("listening", () => {
				let addr = server.address();
				let bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
				debug("Listening on " + bind);
			});
			
			server.listen(port);
		};
	}
	async toRun() {
		let app = this;
		await app.toSetup();
		await app.toListen();
	}
}

export {App};
