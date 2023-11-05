import {Obj} from "@ghasemkiani/base";
import {cutil} from "@ghasemkiani/base";

class Api extends Obj {
	static {
		cutil.extend(this.prototype, {
			app: null,
		});
	}
	async toInit() {
		
	}
}

export {Api};
