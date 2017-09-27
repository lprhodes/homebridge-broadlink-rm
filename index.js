const { HomebridgePlatform } = require('homebridge-platform-helper');
const Accessory = require('./accessories');

module.exports = (homebridge) => {
  global.Service = homebridge.hap.Service;
  global.Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("homebridge-broadlink-rm", "BroadlinkRM", BroadlinkRMPlatform);
}

class BroadlinkRMPlatform extends HomebridgePlatform {

  addAccessories (accessories) {
    const { config, log } = this;

    // Add a Learn Code accessory if none exist in the config
    const learnIRAccessories = config.accessories ? config.accessories.filter((accessory) => (accessory.type === 'learn-ir' || accessory.type === 'learn-code')) : [];

    if (learnIRAccessories.length === 0) {

      if (!config.hideLearnButton) {
        const learnCodeAccessory = new Accessory.LearnCode(log, { name: 'Learn' });
        accessories.push(learnCodeAccessory);
      }

      if (!config.hideScanFrequencyButton) {
        const scanFrequencyAccessory = new Accessory.LearnCode(log, { name: 'Scan Frequency', scanFrequency: true });
        accessories.push(scanFrequencyAccessory);
      }
    }

    // Itterate through the config accessories
    config.accessories.forEach((accessory) => {
      if (!accessory.type) throw new Error(`Each accessory must be configured with a "type". e.g. "switch"`);

      const classTypes = {
        'air-conditioner': Accessory.AirCon,
        'air-conditioner-pro': Accessory.AirConPro,
        'learn-ir': Accessory.LearnCode,
        'learn-code': Accessory.LearnCode,
        'switch': Accessory.Switch,
        'projector': Accessory.Projector,
        'garage-door-opener': Accessory.GarageDoorOpener,
        'switch-multi': Accessory.SwitchMulti,
        'switch-multi-repeat': Accessory.SwitchMultiRepeat,
        'switch-repeat': Accessory.SwitchRepeat,
        'fan': Accessory.Fan,
        'light': Accessory.Light,
        'window-covering': Accessory.WindowCovering,
      }

      if (!classTypes[accessory.type]) throw new Error(`homebridge-broadlink-rm doesn't support accessories of type "${accessory.type}".`);

      const homeKitAccessory = new classTypes[accessory.type](log, accessory);

      accessories.push(homeKitAccessory);
    })
  }
}
