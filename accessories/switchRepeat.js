const { ServiceManagerTypes } = require('../helpers/serviceManager');
const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const SwitchAccessory = require('./switch');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');

class SwitchRepeatAccessory extends SwitchAccessory {

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

      // Set defaults
      interval = interval || 1;
      sendCount = sendCount || 1;
    
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
    const { data, name, config, serviceManagerType } = this;
    
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
