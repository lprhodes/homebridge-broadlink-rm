const learnData = require('../helpers/learnData');
const learnRFData = require('../helpers/learnRFData');
const BroadlinkRMAccessory = require('./accessory');

class LearnIRAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}) {
    // Set a default name for the accessory
    if (!config.name) config.name = 'Learn Code';
    config.persistState = false;

    super(log, config);
  }

  toggleLearning (on, callback) {
    const { config } = this;
    const { scanRF } = config;

    const turnOffCallback = () => {
      this.learnService.setCharacteristic(Characteristic.On, false);
    }

    const scanRFCallback = (success) => {
      if (!success) return turnOffCallback();

      learnData.start(this.host, null, turnOffCallback, this.log);
    }

    if (scanRF) {
      if (on) {
        learnRFData.start(this.host, callback, scanRFCallback, this.log);
      } else {
        learnRFData.stop(this.log);

        callback();
      }

      return;
    }

    if (on) {
      learnData.start(this.host, callback, turnOffCallback, this.log);
    } else {
      learnData.stop(this.log);

      callback();
    }
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);
    service.getCharacteristic(Characteristic.On).on('set', this.toggleLearning.bind(this));

    this.learnService = service
    services.push(service);

    return services;
  }
}

module.exports = LearnIRAccessory
