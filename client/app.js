import {cutil} from "@ghasemkiani/base";
import {Obj} from "@ghasemkiani/base";
import {pubsub} from "@ghasemkiani/base-utils";
import {X} from "@ghasemkiani/xdom";
import {host} from "@ghasemkiani/html-maker";
import {XHtml} from "@ghasemkiani/html-maker";

class App extends cutil.mixin(Obj, pubsub, host) {
	static {
		cutil.extend(this.prototype, {
			name: "Untitled",
			defaultPrefs: {},
		});
	}
	get url() {
		return this.window.location.href;
	}
	set url(url) {
		this.window.location.href = url;
	}
	get prefs() {
		return this.window.localStorage.prefs || (this.window.localStorage.prefs = this.defaultPrefs);
	}
	set prefs(prefs) {
		this.window.localStorage.prefs = prefs;
	}
	async toCallApi(method, arg) {
		let app = this;
		let url = new URL(`/api/${method}`, app.url);
		url.search = new URLSearchParams(cutil.asObject(arg)).toString();
		let rsp = await fetch(url);
		let {success, result, error: message}  = await rsp.json();
		if (!success) {
			throw new Error(message);
		}
		return result;
	}
	uriToMethodAndParams(uri) {
		let app = this;
		let {pathname: path, search: searchParams, hash} = new URL(uri, app.url);
		// let [match, path, searchParams, hash] = /^\/([^?]*)(\?.*)?(\#.*)?$/.exec(uri);
		
		let method = X.toCamelCase("to-go-" + (path.split("/").filter(a => !!a).join("-") || "home"));
		let params;
		if (searchParams) {
			params = Object.fromEntries(new URLSearchParams(searchParams).entries());
		}
		return {method, params};
	}
	methodAndParamsToUri(method, params, hash = null) {
		let app = this;
		let uri = "/" + X.toDashed(method).replace(/-/g, "/").replace(/^to\/go\//, "").replace(/^home$/, "");
		if (cutil.a(params)) {
			uri += `?`;
			let usp = new URLSearchParams(cutil.asObject(params));
			if (usp.size > 0) {
				uri += `${usp.toString()}`;
			}
		}
		if (!cutil.isNil(hash)) {
			uri += hash.startsWith("#") ? hash : "#" + hash;
		}
		return uri;
	}
	async toNav(uri) {
		let app = this;
		await app.toGo(uri);
		app.window.history.pushState({uri}, "", uri);
	}
	async toGo(uri) {
		let app = this;
		let {method, params} = app.uriToMethodAndParams(uri);
		try {
			await app.toDoGo(method, params);
		} catch (e) {
			await app.toDoGo("toShowError", {method, params, e});
		}
	}
	async toShowError({method, params, e}) {
		let app = this;
		let {x} = app;
		let xhtml = new XHtml({host: app});
		let {nbody} = xhtml.makeDoc({title: `${app.name} | Error`});
		x.chain(nbody, node => {
			x.cl(node);
			x.ch(node, "h1", node => {
				x.t(node, "Error");
			});
			x.ch(node, "h2", node => {
				x.t(node, "method: ");
				x.t(node, method);
				x.ch(node, "br");
				x.t(node, "params:");
				x.ch(node, "br");
				x.t(node, JSON.stringify(params, null, 2));
			});
			x.ch(node, "pre$message: ", node => {
				x.t(node, e.message);
			});
		});
	}
	async toDoGo(method, params) {
		let app = this;
		await app[method](...(params ? [params] : []));
	}
	async toCreate() {
		let app = this;
	}
	async toGoHome() {
		let app = this;
	}
	async toRun() {
		let app = this;
		let {window} = app;
		window.addEventListener("load", async (event) => {
			await app.toCreate();
			await app.toGo(window.location.pathname + window.location.search + window.location.hash);
		});
		window.addEventListener("popstate", async (event) => {
			await app.toGo(window.location.pathname + window.location.search + window.location.hash);
		});
	}
	async toStart() {
		let app = this;
		await app.toRun();
	}
}

export {App};
