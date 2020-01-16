const WindowCoveringAccessory = require('./windowCovering');

class WindowAccessory extends WindowCoveringAccessory {
  serviceType () { return Service.Window }
}
module.exports = WindowAccessory;
