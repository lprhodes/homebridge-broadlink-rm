const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration')
const SwitchAccessory = require('./switch');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');

class SwitchMultiAccessory extends SwitchAccessory {

  constructor (log, config = {}, serviceManagerType) {    
    super(log, config, serviceManagerType);

    const { data } = this

    if (!Array.isArray(data)) return log('The "switch-multi" type requires the config value for "data" to be an array of hex codes.')
  }

  checkStateWithPing () { }

  setDefaults () {
    super.setDefaults();

    const { config } = this;

    config.interval = config.interval || 1;
  }

  reset () {
    super.reset();

    // Clear Timeouts
    if (this.intervalTimeoutPromise) {
      this.intervalTimeoutPromise.cancel();
      this.intervalTimeoutPromise = null;
    }
  }

  async setSwitchState (hexData) {
    const { config, host, log, name, state, debug } = this;
    let { interval } = config;

    if (!hexData) {
      this.checkAutoOnOff();

      return;
    }
    
    await catchDelayCancelError(async () => { 
      // Itterate through each hex config in the array
      for (let index = 0; index < hexData.length; index++) {
        const currentHexData = hexData[index]

        sendData({ host, hexData: currentHexData, log, name, debug });

        if (index < currentHexData.length - 1) {
          this.intervalTimeoutPromise = delayForDuration(interval);
          await this.intervalTimeoutPromise;
        }
      }
    })

    this.checkAutoOnOff();
  }

  setupServiceManager () {
    const { data, log, name, config, serviceManagerType } = this;

    setTimeout(() => {
      log(`\x1b[33m[Warning] \x1b[0m${name}: The "switch-multi" accessory is now deprecated and shall be removed in the future. Check out the updated "switch" documentation at http://github.com/lprhodes/homebridge-broadlink-rm`);
    }, 1600)
    
    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Switch, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.On,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: Array.isArray(data) ? data : data.on,
        offData: Array.isArray(data) ? undefined : data.off,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });
  }
}

module.exports = SwitchMultiAccessory;
