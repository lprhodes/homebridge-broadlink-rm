const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class GarageDoorOpenerAccessory extends BroadlinkRMAccessory {

  async setTargetDoorState (hexData) {
    const { config, data, host, log } = this;
    let { openCloseDuration } = config;

    if (!openCloseDuration) openCloseDuration = 8;

    sendData({ host, hexData, log });

    if (!this.targetDoorState) {
      if (this.finishedClosingTimeout) clearTimeout(this.finishedClosingTimeout);

      this.finishedOpeningTimeout = setTimeout(() => {
        log('setCurrentDoorState: open')

        this.garageDoorOpenerService.setCharacteristic(Characteristic.CurrentDoorState, 0);
      }, openCloseDuration * 1000)
    } else {
      if (this.garageDoorOpenerService) clearTimeout(this.garageDoorOpenerService);

      this.finishedClosingTimeout = setTimeout(() => {
        log('setCurrentDoorState: closed')

        this.garageDoorOpenerService.setCharacteristic(Characteristic.CurrentDoorState, 1);
      }, openCloseDuration * 1000)
    }
  }

  async setLockTargetState (hexData) {
    const { config, data, host, log } = this;

    sendData({ host, hexData, log });

    if (!this.lockTargetState) {
      log('setCurrentDoorState: unlocked')
      this.garageDoorOpenerService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
    } else {
      log('setCurrentDoorState: locked')
      this.garageDoorOpenerService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
    }
  }

  getServices () {
    const services = super.getServices();

    const { data, name } = this;
    const { open, close, lock, unlock } = data;

    const service = new Service.GarageDoorOpener(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetDoorState,
      propertyName: 'targetDoorState',
      onHex: open,
      offHex: close,
      setValuePromise: this.setTargetDoorState.bind(this)
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.LockTargetState,
      propertyName: 'lockTargetState',
      onHex: lock,
      offHex: unlock,
      setValuePromise: this.setLockTargetState.bind(this)
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.LockCurrentState,
      propertyName: 'lockCurrentState',
    });

    this.garageDoorOpenerService = service;

    services.push(service);

    return services;
  }
}

module.exports = GarageDoorOpenerAccessory;
