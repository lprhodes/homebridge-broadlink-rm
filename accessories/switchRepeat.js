const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class SwitchRepeatAccessory extends BroadlinkRMAccessory {

  async setSwitchState (hexData) {
    if (hexData) this.performSend(hexData);
  }

  async performSend (data) {
    const { config, host, log, name, state, debug } = this;
    let { disableAutomaticOff, onDuration, interval, onSendCount, offSendCount, sendCount  } = config;

    if (state.switchState && onSendCount) sendCount = onSendCount;
    if (!state.switchState && offSendCount) sendCount = offSendCount;

    // Set defaults
    if (disableAutomaticOff === undefined) disableAutomaticOff = true;
    if (!onDuration) onDuration = 60;
    interval = interval || 1;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {
      sendData({ host, hexData: data, log, name, debug });

      if (index < sendCount - 1) await delayForDuration(interval);
    }

    if (this.autoOffTimeout) clearTimeout(this.autoOffTimeout);

    if (state.switchState && !disableAutomaticOff) {
      log(`${name} setSwitchState: (automatically turn off in ${onDuration} seconds)`);

      this.autoOffTimeout = setTimeout(() => {
        this.switchService.setCharacteristic(Characteristic.On, 0);
      }, onDuration * 1000);
    }    
  }

  getServices () {
    const services = super.getServices();
    const { data, name } = this;

    const service = new Service.Switch(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.On,
      propertyName: 'switchState',
      onData: (typeof data === 'object') ? data.on : data,
      offData: (typeof data === 'object') ? data.off : undefined,
      setValuePromise: this.setSwitchState.bind(this)
    });

    services.push(service);

    this.switchService = service;

    return services;
  }
}

module.exports = SwitchRepeatAccessory;
