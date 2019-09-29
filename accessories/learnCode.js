const learnData = require('../helpers/learnData');
const learnRFData = require('../helpers/learnRFData');
const ServiceManager = require('../helpers/serviceManager');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');

const BroadlinkRMAccessory = require('./accessory');

class LearnIRAccessory extends BroadlinkRMAccessory {

  constructor (log, config = {}, serviceManagerType) {    

    // Set a default name for the accessory
    if (!config.name) config.name = 'Learn Code';
    config.persistState = false;


    super(log, config, serviceManagerType);
  }

  toggleLearning (props, on, callback) {
    const { config, serviceManager } = this;
    const { disableAutomaticOff, scanRF, scanFrequency } = config;

    const turnOffCallback = () => {
      serviceManager.setCharacteristic(Characteristic.On, false);
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

  setupServiceManager () {
    const { data, name, config, serviceManagerType } = this;
    const { on, off } = data || { };

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Switch, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.On,
      getMethod: this.getCharacteristicValue,
      setMethod: this.toggleLearning.bind(this),
      bind: this,
      props: {
      
      },
      bind: this
    })
  }
}

module.exports = LearnIRAccessory
