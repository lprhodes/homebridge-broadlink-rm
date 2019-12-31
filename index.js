const BroadlinkRMPlatform = require('./platform')

module.exports = (homebridge) => {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  BroadlinkRMPlatform.setHomebridge(homebridge);

  homebridge.registerPlatform("homebridge-broadlink-rm", "BroadlinkRM", BroadlinkRMPlatform, false);
}