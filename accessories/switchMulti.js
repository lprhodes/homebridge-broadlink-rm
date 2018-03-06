const { ServiceManagerTypes } = require('../helpers/serviceManager');
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

  reset () {
    super.reset();

    // Clear Timeouts
    if (this.intervalTimeoutPromise) {
      this.intervalTimeoutPromise.cancel();
      this.intervalTimeoutPromise = null;
    }
  }

  async setSwitchState (hexData) {
    this.reset();

    if (!hexData) {
      this.checkAutoOnOff();

      return;
    }

    const { config, host, log, name, state, debug } = this;
    let { interval } = config;

    // Defaults
    if (!interval) interval = 1
    
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
    const { data, name, config, serviceManagerType } = this;
    
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
