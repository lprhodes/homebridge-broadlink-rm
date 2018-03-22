const uuid = require('uuid');

const { HomebridgeAccessory } = require('homebridge-platform-helper');

const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');

class BroadlinkRMAccessory extends HomebridgeAccessory {

  constructor (log, config = {}, serviceManagerType) {
    if (!config.name) config.name = "Unknown Accessory"

    config.resendDataAfterReload = config.resendHexAfterReload;

    super(log, config, serviceManagerType);
    if (config.debug) this.debug = true


    this.manufacturer = 'Broadlink';
    this.model = 'RM Mini or Pro';
    this.serialNumber = uuid.v4();
  }

  performSetValueAction ({ host, data, log, name, debug }) {
    sendData({ host, hexData: data, log, name, debug });
  }
  reset () {
    // Clear Multi-hex timeouts
    if (this.intervalTimeoutPromise) {
      this.intervalTimeoutPromise.cancel();
      this.intervalTimeoutPromise = null;
    }

    if (this.pauseTimeoutPromise) {
      this.pauseTimeoutPromise.cancel();
      this.pauseTimeoutPromise = null;
    }
  }

  async performSend (data, actionCallback) {
    const { debug, config, host, log, name } = this;

    if (typeof data === 'string') {
      sendData({ host, hexData: data, log, name, debug });

      return;
    }

    await catchDelayCancelError(async () => {
      // Itterate through each hex config in the array
      for (let index = 0; index < data.length; index++) {
        const { pause } = data[index];

        await this.performRepeatSend(data[index], actionCallback);

        if (pause) {
          this.pauseTimeoutPromise = delayForDuration(pause);
          await this.pauseTimeoutPromise;
        }
      }
    });
  }

  async performRepeatSend (parentData, actionCallback) {
    const { host, log, name, debug } = this;
    let { data, interval, sendCount } = parentData;

    sendCount = sendCount || 1
    if (sendCount > 1) interval = interval || 0.1;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {
      sendData({ host, hexData: data, log, name, debug });

      if (interval && index < sendCount - 1) {
        this.intervalTimeoutPromise = delayForDuration(interval);
        await this.intervalTimeoutPromise;
      }
    }
  }
}

module.exports = BroadlinkRMAccessory;
