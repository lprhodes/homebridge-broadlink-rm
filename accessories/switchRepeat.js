const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const SwitchAccessory = require('./switch');

class SwitchRepeatAccessory extends SwitchAccessory {

  checkStateWithPing () { }

  async setSwitchState (hexData) {
    if (hexData) this.performSend(hexData);
  }

  async performSend (data) {
    const { config, host, log, name, state, debug } = this;
    let { interval, onSendCount, offSendCount, sendCount  } = config;

    if (state.switchState && onSendCount) sendCount = onSendCount;
    if (!state.switchState && offSendCount) sendCount = offSendCount;

    // Set defaults
    interval = interval || 1;

    // Itterate through each hex config in the array
    for (let index = 0; index < sendCount; index++) {
      sendData({ host, hexData: data, log, name, debug });

      if (index < sendCount - 1) await delayForDuration(interval);
    }

    this.checkAutoOff();
    this.checkAutoOn();
  }

  getServices () {
    const services = super.getInformationServices();
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
