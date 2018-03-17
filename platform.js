const { HomebridgePlatform } = require('homebridge-platform-helper');

const npmPackage = require('./package.json');
const Accessory = require('./accessories');
const checkForUpdates = require('./helpers/checkForUpdates')

const classTypes = {
  'air-conditioner': Accessory.AirCon,
  'learn-ir': Accessory.LearnCode,
  'learn-code': Accessory.LearnCode,
  'switch': Accessory.Switch,
  'garage-door-opener': Accessory.GarageDoorOpener,
  'lock': Accessory.Lock,
  'switch-multi': Accessory.SwitchMulti,
  'switch-multi-repeat': Accessory.SwitchMultiRepeat,
  'switch-repeat': Accessory.SwitchRepeat,
  'fan': Accessory.Fan,
  'outlet': Accessory.Outlet,
  'light': Accessory.Light,
  'window-covering': Accessory.WindowCovering,
}

const BroadlinkRMPlatform = class extends HomebridgePlatform {

  showMessage () {
    const { config } = this;

    if (config && (config.hideWelcomeMessage || config.isUnitTest)) return;

    setTimeout(() => {
      console.log('')
      console.log(`**************************************************************************************************************`)
      console.log(`** Welcome to version ${npmPackage.version} of the Homebridge Broadlink RM Plugin!`)
      console.log(`** Find out what's in the latest release here: https://github.com/lprhodes/homebridge-broadlink-rm/releases`)
      console.log(`** `)
      console.log(`** Keep up to date with this plugin along with everything HomeKit and homebridge`)
      console.log(`** by signing up to our newsletter at http://workswith.io`)
      console.log(`** `)
      console.log(`** If you like this plugin then please star it on GitHub or better yet; [buy me a drink](https://paypal.me/lprhodes).`)
      console.log(`**`)
      console.log(`** You can disable this message by adding "hideWelcomeMessage": true to the config (see config-sample.json).`)
      console.log(`**`)
      console.log(`**************************************************************************************************************`)
      console.log('')
    }, 1500)
  }

  addAccessories (accessories) {
    const { config, log } = this;

    this.showMessage();

    checkForUpdates(log);

    if (!config.accessories) config.accessories = []

    // Add a Learn Code accessory if none exist in the config
    const learnIRAccessories = (config && config.accessories && Array.isArray(config.accessories)) ? config.accessories.filter((accessory) => (accessory.type === 'learn-ir' || accessory.type === 'learn-code')) : [];

    if (learnIRAccessories.length === 0) {

      if (!config.hideLearnButton) {
        const learnCodeAccessory = new Accessory.LearnCode(log, { name: 'Learn', scanFrequency: false });
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

      if (!classTypes[accessory.type]) throw new Error(`homebridge-broadlink-rm doesn't support accessories of type "${accessory.type}".`);

      const homeKitAccessory = new classTypes[accessory.type](log, accessory);

      accessories.push(homeKitAccessory);
    })
  }
}

module.exports = BroadlinkRMPlatform
