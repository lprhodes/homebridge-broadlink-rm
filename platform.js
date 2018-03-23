const { HomebridgePlatform } = require('homebridge-platform-helper');
const { assert } = require('chai');

const npmPackage = require('./package.json');
const Accessory = require('./accessories');
const checkForUpdates = require('./helpers/checkForUpdates');
const broadlink = require('./helpers/broadlink');
const { discoverDevices } = require('./helpers/getDevice');

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

let homebridgeRef

const BroadlinkRMPlatform = class extends HomebridgePlatform {

  constructor (log, config = {}) {
    super(log, config, homebridgeRef);
  }

  addAccessories (accessories) {
    const { config, log } = this;

    this.discoverBroadlinkDevices();
    this.showMessage();
    setTimeout(checkForUpdates, 1800);

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

  discoverBroadlinkDevices () {
    const { config, log } = this;
    const { debug, hosts } = config;

    if (!hosts) {
      log(`\x1b[35m[INFO]\x1b[0m Automatically discovering Broadlink RM devices.`)
      discoverDevices(true, log, debug, config.deviceDiscoveryTimeout);

      return;
    }
    
    discoverDevices(false, log, debug);

    log(`\x1b[35m[INFO]\x1b[0m Automatic Broadlink RM device discovery has been disabled as the "hosts" option has been set.`)

    assert.isArray(hosts, `\x1b[31m[CONFIG ERROR] \x1b[33mhosts\x1b[0m should be an array of objects.`)
      
    hosts.forEach((host) => {
      assert.isObject(host, `\x1b[31m[CONFIG ERROR] \x1b[0m Each item in the \x1b[33mhosts\x1b[0m array should be an object.`)
      
      const { address, isRFSupported, mac } = host;
      assert(address, `\x1b[31m[CONFIG ERROR] \x1b[0m Each object in the \x1b[33mhosts\x1b[0m option should contain a value for \x1b[33maddress\x1b[0m (e.g. "192.168.1.23").`)
      assert(mac, `\x1b[31m[CONFIG ERROR] \x1b[0m Each object in the \x1b[33mhosts\x1b[0m option should contain a unique value for \x1b[33mmac\x1b[0m (e.g. "34:ea:34:e7:d7:28").`)

      const deviceType = isRFSupported ? 0x279d : 0x2712;

      broadlink.addDevice({ address, port: 80 }, mac, deviceType);
    })
  }

  showMessage () {
    const { config, log } = this;

    if (config && (config.hideWelcomeMessage || config.isUnitTest)) {
      log(`\x1b[35m[INFO]\x1b[0m Running Homebridge Broadlink RM Plugin version \x1b[32m${npmPackage.version}\x1b[0m`)

      return
    }

    setTimeout(() => {
      log('')
      log(`**************************************************************************************************************`)
      log(`** Welcome to version \x1b[32m${npmPackage.version}\x1b[0m of the \x1b[34mHomebridge Broadlink RM Plugin\x1b[0m!`)
      log('** ')
      log(`** Find out what's in the latest release here: \x1b[4mhttps://github.com/lprhodes/homebridge-broadlink-rm/releases\x1b[0m`)
      log(`** `)
      log(`** If you like this plugin then please star it on GitHub or better yet`)
      log(`** buy me a drink using Paypal \x1b[4mhttps://paypal.me/lprhodes\x1b[0m or crypto \x1b[4mhttps://goo.gl/bEn1RW\x1b[0m.`)
      log(`** `)
      log(`** Keep up to date with this plugin along with everything HomeKit and homebridge`)
      log(`** by signing up to my newsletter at \x1b[4mhttp://workswith.io\x1b[0m`)
      log(`**`)
      log(`** You can disable this message by adding "hideWelcomeMessage": true to the config (see config-sample.json).`)
      log(`**`)
      log(`**************************************************************************************************************`)
      log('')
    }, 1500)
  }
}

BroadlinkRMPlatform.setHomebridge = (homebridge) => {
  homebridgeRef = homebridge
}

module.exports = BroadlinkRMPlatform
