import {cutil} from "@ghasemkiani/base";
import {Obj} from "@ghasemkiani/base";
import {pubsub} from "@ghasemkiani/base-utils";
import {WDocument} from "@ghasemkiani/wdom";
import {xutil} from "@ghasemkiani/wdom";

class App extends cutil.mixin(Obj, pubsub) {
	static {
		cutil.extend(this.prototype, {
			_wdocument: null,
			defaultPrefs: {},
		});
	}
	get wdocument() {
		if (!this._wdocument) {
			this._wdocument = new WDocument();
		}
		return this._wdocument;
	}
	set wdocument(wdocument) {
		this._wdocument = wdocument;
	}
	get url() {
		return this.wdocument.window.location.href;
	}
	set url(url) {
		this.wdocument.window.location.href = url;
	}
	get prefs() {
		return this.wdocument.window.localStorage.prefs || (this.wdocument.window.localStorage.prefs = this.defaultPrefs);
	}
	set prefs(prefs) {
		this.wdocument.window.localStorage.prefs = prefs;
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
		let [match, path, searchParams, hash] = /^\/([^?]*)(\?.*)?(\#.*)?$/.exec(uri);
		
		let method = xutil.toCamelCase("to-go-" + (path.split("/").filter(a => !!a).join("-") || "home"));
		let params;
		try {
			if (searchParams) {
				params = Object.fromEntries(new URLSearchParams(searchParams).entries());
			}
		} catch(e) {
			console.log(e.message);
		}
		return {method, params};
	}
	methodAndParamsToUri(method, params, hash = null) {
		let app = this;
		let uri = "/" + xutil.toDashed(method).replace(/-/g, "/").replace(/^to\/go\//, "").replace(/^home$/, "");
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
		app.wdocument.window.history.pushState({uri}, "", uri);
	}
	async toGo(uri) {
		let app = this;
		let {method, params} = app.uriToMethodAndParams(uri);
		await app.toDoGo(method, params);
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
		let {wdocument} = app;
		let {window} = wdocument;
		window.addEventListener("load", async (event) => {
			await app.toCreate();
		});
		window.addEventListener("popstate", async (event) => {
			await app.toGo(window.location.pathname);
		});
	}
	async toStart() {
		let app = this;
		await app.toRun();
	}
}

export {App};
