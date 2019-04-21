const BroadlinkRMPlatform = require('./platform');
const compareVersions = require('compare-versions');

module.exports = (homebridge) => {
  if (compareVersions("0.4.47", homebridge.serverVersion) > 0) {
    console.log(`[Broadlink RM] The plugin homebridge-broadlink-rm requires HomeBridge v0.4.47 or higher! You have: ${homebridge.serverVersion}.`);
    process.exit(1);
  }
  global.Service = homebridge.hap.Service;
  global.Characteristic = homebridge.hap.Characteristic;

  BroadlinkRMPlatform.setHomebridge(homebridge);

  homebridge.registerPlatform("homebridge-broadlink-rm", "BroadlinkRM", BroadlinkRMPlatform);
}