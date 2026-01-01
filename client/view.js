import { cutil } from "@ghasemkiani/base";
import { pubsub } from "@ghasemkiani/base-utils";
import { Maker as MakerBase } from "@ghasemkiani/html-maker";
import { iwxhtml } from "@ghasemkiani/html-maker";
import { iwxbootstrap } from "@ghasemkiani/html-maker";

class View extends cutil.mixin(MakerBase, pubsub, iwxhtml, iwxbootstrap) {
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

export { View };
