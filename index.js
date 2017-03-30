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

      let homeKitAccessory;

      switch (accessory.type) {
        case 'air-conditioner': {
          homeKitAccessory = new Accessory.AirCon(log, accessory)
          break;
        }
        // case 'channel': {
        //   homeKitAccessory = new Accessory.Channel(log, accessory)
        //   break;
        // }
        case 'learn-ir': {
          homeKitAccessory = new Accessory.LearnIR(log, accessory)
          break;
        }
        case 'switch': {
          homeKitAccessory = new Accessory.Switch(log, accessory)
          break;
        }
        case 'switch-multi': {
          homeKitAccessory = new Accessory.SwitchMulti(log, accessory)
          break;
        }
        case 'switch-repeat': {
          homeKitAccessory = new Accessory.SwitchRepeat(log, accessory)
          break;
        }
        // case 'up-down': {
        //   homeKitAccessory = new Accessory.UpDown(log, accessory)
        //   break;
        // }
        default:
          throw new Error(`We don't support accessories of type "${accessory.type}".`);
      }

      if (!homeKitAccessory) return

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
