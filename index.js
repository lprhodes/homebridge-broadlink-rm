const BroadlinkRMPlatform = require('./platform')
const { discoverDevices } = require('./helpers/getDevice');

module.exports = (homebridge) => {
  global.Service = homebridge.hap.Service;
  global.Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("homebridge-broadlink-rm", "BroadlinkRM", BroadlinkRMPlatform);

  discoverDevices();
}