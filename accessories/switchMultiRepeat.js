const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');

const SwitchAccessory = require('./switch');

class SwitchMultiAccessory extends SwitchAccessory {

  serviceType () { return Service.Switch }

  constructor (log, config = {}) {   
    super(log, config);

    const { data } = this

    if (!Array.isArray(data)) return log('The "switch-multi-repeat" type requires the config value for "data" an array of objects.')

    const nonObjects = data.filter(obj => typeof obj !== 'object')
    if (nonObjects.length > 0) return log('The "switch-multi-repeat" type requires the config value for "data" an array of objects.')
  }

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

    if (this.pauseTimeoutPromise) {
      this.pauseTimeoutPromise.cancel();
      this.pauseTimeoutPromise = null;
    }
  }

  checkStateWithPing () { }

  async setSwitchState (hexData) {
    const { name, config, data, log, state } = this;
    let { interval, pause, sendCount } = config;

    if (!hexData) {
      this.checkAutoOnOff();

      return;
    }

    await catchDelayCancelError(async () => {
      // Itterate through each hex config in the array
      for (let index = 0; index < data.length; index++) {
        const { pause } = data[index]

        await this.performRepeatSend(data[index]);

        if (pause) {
          this.pauseTimeoutPromise = delayForDuration(pause);
          await this.pauseTimeoutPromise;
        } else if (index < data.length - 1) {
          this.intervalTimeoutPromise = delayForDuration(interval);
          await intervalTimeoutPromise;
        }
      }

      this.checkAutoOnOff();
    });
  }

  async performRepeatSend (hexConfig) {
    const { host, log, name, debug } = this;
    let { data, interval, sendCount } = hexConfig;

    interval = interval || 1;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {
      sendData({ host, hexData: data, log, name, debug });

      if (index < sendCount - 1) {
        this.intervalTimeoutPromise = delayForDuration(interval);
        await this.intervalTimeoutPromise;
      }
    }
  }

  configureServiceManager (serviceManager) {
    const { data, log, name } = this;

    setTimeout(() => {
      log(`\x1b[33m[Warning] \x1b[0m${name}: The "switch-multi-repeat" accessory is now deprecated and shall be removed in the future. Check out the updated "switch" documentation at http://github.com/lprhodes/homebridge-broadlink-rm`);
    }, 1600)

    serviceManager.addToggleCharacteristic({
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
