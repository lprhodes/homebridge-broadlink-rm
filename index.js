const HKTTGen = require('./HomeKitTVTypes');
const thermostatService = require('./ThermostatService');
const sender = require('./sender');
const learner = require('./learner');

let Service, Characteristic;
let HomeKitTVTypes;
let ThermostatService

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomeKitTVTypes = HKTTGen(homebridge);
  ThermostatService = thermostatService(homebridge)

  homebridge.registerAccessory('homebridge-broadlink-rm', 'Broadlink RM', BroadlinkRMAccessory);
  homebridge.registerAccessory('homebridge-broadlink-rm', 'Broadlink RM Learner', BroadlinkRMLearnerAccessory);
}

class BroadlinkRMAccessory {

  constructor (log, config) {
    this.log = log;
    this.config = config;

    const { host, name, data } = config;

    this.host = host;
    this.name = name;
    this.data = data;
  }

  setPowerState (powerOnHex, powerOffHex, powerOn, callback) {
    this.log(`setPowerState: ${powerOn}`);

    const hexData = powerOn ? powerOnHex : powerOffHex;
    sender(this.host, hexData, callback, this.log);
  }

  setChannel (payloadChannels, channel, callback) {
    this.log(`setChannel: ${channel}`);

    sender(this.host, payloadChannels[channel], callback, this.log);
  }

  identify (callback) {
    this.log('Identify requested!');

    callback();
  }

  getServices () {
    const services = [];

    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Broadlink')
      .setCharacteristic(Characteristic.Model, 'RM Mini 3 or Pro 3')
      .setCharacteristic(Characteristic.SerialNumber, this.host);
    services.push(informationService);

    for (var i = 0; i < this.data.length; i++) {
      const data = this.data[i];
      const { name, type } = data;

      if (type === 'on') {
        this.log('add switch service');

        const switchService = new Service.Switch(name || this.name);
        switchService
          .getCharacteristic(Characteristic.On)
          .on('set', this.setPowerState.bind(this, data.on, data.off));

        services.push(switchService);
      } else if (type === 'thermostat') {
        this.log('add thermostat service');

        const thermostatService = new ThermostatService(this.log, this.config, data).createService()

        services.push(thermostatService);
      } else if (type == 'channel') {
        this.log('add channel service');

        const channels = [ '' ];

        for (var i = 1; i <= 9; i++) {
          channels.push(data[`${i}`]);
        }

        const channelService = new HomeKitTVTypes.ChannelService(data.name || this.name);
        channelService
          .getCharacteristic(HomeKitTVTypes.ChannelState)
          .on('set', this.setChannel.bind(this, channels));

        services.push(channelService);
      }
    }

    return services;
  }
}

class BroadlinkRMLearnerAccessory {

  constructor (log, config) {
    this.log = log;
    this.config = config;

    const { host, name } = config;

    this.host = host;
    this.name = name;

    this.learnService = null;
  }

  toggleLearning (on, callback) {
    // this.log(`toggleLearning: ${on ? 'on' : 'off'}`);
    const turnOffCallback = () => {
      this.learnService.setCharacteristic(Characteristic.On, false)
    }

    if (on) {
      learner.start(this.host, callback, turnOffCallback, this.log);
    } else {
      learner.stop(this.log)

      callback();
    }
  }

  identify (callback) {
    this.log('Identify requested!');

    callback();
  }

  getServices () {
    const services = [];

    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Broadlink')
      .setCharacteristic(Characteristic.Model, 'RM Mini 3 or Pro 3 Learner')
      .setCharacteristic(Characteristic.SerialNumber, this.host);
    services.push(informationService);

    const switchService = new Service.Switch(this.name || 'Learn IR');
    switchService
      .getCharacteristic(Characteristic.On)
      .on('set', this.toggleLearning.bind(this));

    services.push(switchService);
    this.learnService = switchService

    return services;
  }
}
