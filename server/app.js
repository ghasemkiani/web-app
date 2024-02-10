import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import http from "node:http";
import https from "node:https";

import {build} from "esbuild";
import {polyfillNode} from "esbuild-plugin-polyfill-node";
import JavaScriptObfuscator from "javascript-obfuscator";
import debug from "debug";
import Express from "express";
import asyncHandler from "express-async-handler";
import serveIndex from "serve-index";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";

import {cutil} from "@ghasemkiani/base";
import {Textual} from "@ghasemkiani/base";
import {App as AppBase} from "@ghasemkiani/base-app";
import {dumper} from "@ghasemkiani/base-app";
import {X} from "@ghasemkiani/xdom";

import {Api} from "./api.js";

class App extends cutil.mixin(AppBase, dumper) {
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
			useStatic: true,
			useStaticIndex: true,
			_port: null,
			_secure: null,
			_cert: null,
			_key: null,
			_nosec: null,
			_express: null,
			_api: null,
			httpServer: null,
			httpsServer: null,
			uriClientScript: "/scripts/client.js",
			uriClientRun: "./client/run.js",
			urlBase: null,
			_dirBase: null,
		});
	}
	get dirBase() {
		if (cutil.na(this._dirBase)) {
			this._dirBase = path.dirname(url.fileURLToPath(this.urlBase));
		}
		return this._dirBase;
	}
	set dirBase(dirBase) {
		this._dirBase = dirBase;
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
			this._api = new Api({app: this});
		}
		return this._api;
	}
	set api(api) {
		this._api = api;
	}
	async toBuild({obfuscate = false, verbose = false}) {
		let app = this;
		let {dirBase} = app;
		let {uriClientRun} = app;
		let {uriClientScript} = app;

		let fnClientRun = path.join(dirBase, uriClientRun);
		let fnClientScript = path.join(dirBase, "public", uriClientScript);
		if (verbose) {
			console.log("Building...");
		}
		await build({
			entryPoints: [fnClientRun],
			bundle: true,
			outfile: fnClientScript,
			plugins: [
				polyfillNode({}),
			],
		});
		if (obfuscate) {
			if (verbose) {
				console.log("Obfuscating...");
			}
			let textual = new Textual({fn: fnClientScript});
			textual.read();
			let result = JavaScriptObfuscator.obfuscate(textual.string, {
				compact: true,
			});
			textual.string = result.getObfuscatedCode();
			textual.write();
		}
	}
	async toSetupRoutes() {
		
	}
	async toSetup() {
		let app = this;
		let {express} = app;
		let {dirBase} = app;
		let {api} = app;
		await api.toInit();
		express.set("api", api);

		express.use(logger("dev"));
		express.use(Express.json());
		express.use(Express.urlencoded({extended: false}));
		express.use(cookieParser());
		
		express.get("/", (req, res, next) => {
			res.set("Content-Type", "text/html");
			res.send(Buffer.from(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><script type="text/javascript" src="${app.uriClientScript}"></script></head><body></body></html>`));
		});
		
		express.get("/api/:method", asyncHandler(async(req, rsp) => {
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
		
		if (app.useStatic) {
			let pubpath = path.join(dirBase, "public");
			express.use(Express.static(pubpath));
			if (app.useStaticIndex) {
				express.use(serveIndex(pubpath));
			}
		}
		
		await app.toSetupRoutes();

		express.get("*", (req, res, next) => {
			res.set("Content-Type", "text/html");
			res.send(Buffer.from(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><script type="text/javascript" src="${app.uriClientScript}"></script></head><body></body></html>`));
		});
		
		express.use((req, res, next) => {
			next(createError(404));
		});

		express.use((err, req, res, next) => {
			app.handleError(err, req, res);
		});
	}
	handleError(err, req, res) {
		res.status(err.status || 500);
		
		let text = `<h1>${X.escape(err.message)}</h1>`;
		if (express.get("env") === "development") {
			text += `<p>${X.escape(err.status)}</p>`;
			text += `<pre>${X.escape(err.stack)}</pre>`;
		}
		res.send(text);
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
		
		if (!secure) {
			start(app.httpServer = http.createServer(express), port);
		} else {
			start(app.httpsServer = https.createServer({key, cert}, express), port);
			if (cutil.a(nosec)) {
				start(app.httpServer = http.createServer(express), nosec);
			}
		}
	}
	async toDefineInitOptions() {
		await super.toDefineInitOptions();
		let app = this;
		await app.toDefineInitOptionsDumper();
		app.commander.option("-p, --port <port>", "Set the port");
		app.commander.option("--set-port <port>", "Set the port persistently");
		app.commander.option("-s, --secure", "Use HTTPS protocol");
		app.commander.option("--set-secure", "Use HTTPS protocol persistently");
		app.commander.option("-c, --cert <cert>", "Set cert file");
		app.commander.option("--set-cert <cert>", "Set cert file persistently");
		app.commander.option("-k, --key <key>", "Set key file");
		app.commander.option("--set-key <key>", "Set key file persistently");
		app.commander.option("-n, --nosec <nosec>", "Set nosec port");
		app.commander.option("--set-nosec <nosec>", "Set nosec port persistently");
		app.commander.command("build")
			.description("Build the client script")
			.option("-o, --obfuscate", "Obfuscate the client script")
			.option("-v, --verbose", "Show verbose info")
			.action(async ({obfuscate, verbose}) => {
				app.sub("run", async () => {
					await app.toBuild({obfuscate, verbose});
				})
			});
		app.commander.command("operate")
			.description("Start the server")
			.action(async () => {
				app.sub("run", async () => {
					await app.toOperate();
				})
			});
	}
	async toApplyInitOptions() {
		await super.toApplyInitOptions();
		let app = this;
		await app.toApplyInitOptionsDumper();
		let {port, setPort, secure, setSecure, cert, setCert, key, setKey, nosec, setNosec} = app.commander.opts();
		if (cutil.a(port)) {
			app.port = port;
		}
		if (cutil.a(setPort)) {
			app.prefs.port = setPort;
		}
        if (cutil.a(secure)) {
            app.secure = secure;
        }
        if (cutil.a(setSecure)) {
            app.prefs.secure = setSecure;
        }
        if (cutil.a(cert)) {
            app.cert = cert;
        }
        if (cutil.a(setCert)) {
            app.prefs.cert = setCert;
        }
        if (cutil.a(key)) {
            app.key = key;
        }
        if (cutil.a(setKey)) {
            app.prefs.key = setKey;
        }
        if (cutil.a(nosec)) {
            app.nosec = nosec;
        }
        if (cutil.a(setNosec)) {
            app.prefs.nosec = setNosec;
        }
	}
	async toOperate() {
		let app = this;
		await app.toSetup();
		await app.toListen();
	}
}

export {App};
