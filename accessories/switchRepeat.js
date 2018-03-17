const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const SwitchAccessory = require('./switch');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');

class SwitchRepeatAccessory extends SwitchAccessory {

  checkStateWithPing () { }

  setDefaults () {
    super.setDefaults();

    const { config } = this;

    config.interval = config.interval || 1;
    config.sendCount = config.sendCount || 1;
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
    await catchDelayCancelError(async () => { 
      this.reset();

      if (!hexData) {
        this.checkAutoOnOff();

        return;
      }

      const { config, host, log, name, state, debug } = this;
      let { interval, onSendCount, offSendCount, sendCount  } = config;

      if (state.switchState && onSendCount) sendCount = onSendCount;
      if (!state.switchState && offSendCount) sendCount = offSendCount;
    
      // Itterate through each hex config in the array
      for (let index = 0; index < sendCount; index++) {
        sendData({ host, hexData, log, name, debug });

        if (index < sendCount - 1) {
          this.intervalTimeoutPromise = delayForDuration(interval);
          await this.intervalTimeoutPromise;
        }
      }

      this.checkAutoOnOff();
    })
  }

  setupServiceManager () {
    const { data, log, name, config, serviceManagerType } = this;

    setTimeout(() => {
      log(`\x1b[33m[Warning] \x1b[0m${name}: The "switch-repeat" accessory is now deprecated and shall be removed in the future. Check out the updated "switch" documentation at http://github.com/lprhodes/homebridge-broadlink-rm`);
    }, 1600)

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Switch, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.On,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: (typeof data === 'object') ? data.on : data,
        offData: (typeof data === 'object') ? data.off : undefined,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });
  }
}

module.exports = SwitchRepeatAccessory;
