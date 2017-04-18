const Accessory = require('./accessories');

module.exports = (homebridge) => {
  global.Service = homebridge.hap.Service;
  global.Characteristic = homebridge.hap.Characteristic;

  require('./services/TVChannels');
  require('./services/UpDown');

  homebridge.registerPlatform("homebridge-broadlink-rm", "BroadlinkRM", BroadlinkRMPlatform);
}

class BroadlinkRMPlatform {

  constructor (log, config = {}) {
    this.log = log;
    this.config = config;
  }

  accessories (callback) {
    const { config, log } = this;

    const accessories = [];

    // Add a Learn IR accessory if none exist in the config
    const learnIRAccessories = config.accessories ? config.accessories.filter((accessory) => accessory.type === 'learn-ir') : [];

    if (learnIRAccessories.length === 0) {
      const learnIRAccessory = new Accessory.LearnIR(log);
      accessories.push(learnIRAccessory);
    }

    // Check for no accessories
    if (!config.accessories || config.accessories.length === 0) {
      log('No accessories have been added to the Broadlink RM config. Only the Learn IR accessory will be accessible on HomeKit.');
      return callback(accessories);
    }

    // Itterate through the config accessories
    config.accessories.forEach((accessory) => {
      if (!accessory.type) throw new Error(`Each accessory must be configured with a "type". e.g. "switch"`);

      const classTypes = {
        'air-conditioner': Accessory.AirCon,
        'learn-ir': Accessory.LearnIR,
        'switch': Accessory.Switch,
        'garage-door-opener': Accessory.GarageDoorOpener,
        'switch-multi': Accessory.SwitchMulti,
        'switch-multi-repeat': Accessory.SwitchMultiRepeat,
        'switch-repeat': Accessory.SwitchRepeat,
        'fan': Accessory.Fan,
        'light': Accessory.Light,
        'window-covering': Accessory.WindowCovering,
      }

      if (!classTypes[accessory.type]) throw new Error(`We don't support accessories of type "${accessory.type}".`);

      const homeKitAccessory = new classTypes[accessory.type](log, accessory)

      accessories.push(homeKitAccessory);
    })

    callback(accessories);
  }
}

    //
    // for (var i = 0; i < this.data.length; i++) {
    //   const data = this.data[i];
    //   const { name, type } = data;
    //
    //   if (type === 'thermostat') {
    //     this.log('add thermostat service');
    //
    //     const thermostatService = new ThermostatService(this.log, this.config, data).createService()
    //
    //     services.push(thermostatService);
    //   }
