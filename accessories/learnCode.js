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
    const { disableAutomaticOff, scanRF, scanFrequency } = config;

    const turnOffCallback = () => {
      this.learnService.setCharacteristic(Characteristic.On, false);
    }

    if (scanRF || scanFrequency) {
      if (on) {
        learnRFData.start(this.host, callback, turnOffCallback, this.log, disableAutomaticOff);
      } else {
        learnRFData.stop(this.log);

        callback();
      }

      return;
    }

    if (on) {
      learnData.start(this.host, callback, turnOffCallback, this.log, disableAutomaticOff);
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
