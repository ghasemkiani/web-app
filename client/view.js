import {cutil} from "@ghasemkiani/base";
import {Maker as MakerBase} from "@ghasemkiani/html-maker";
import {iwxhtml} from "@ghasemkiani/html-maker";
import {iwxbootstrap} from "@ghasemkiani/html-maker";

class View extends cutil.mixin(MakerBase, iwxhtml, iwxbootstrap) {
	static {
		cutil.extend(this.prototype, {
			app: null,
			uri: null,
		});
	}
	render() {
		//
	}
}

export {View};
