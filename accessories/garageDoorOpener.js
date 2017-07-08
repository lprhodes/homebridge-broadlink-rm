const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class GarageDoorOpenerAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.targetDoorState = state.currentDoorState;
  }

  async setTargetDoorState (hexData) {
    const { config, data, host, log, name, state } = this;
    let { autoCloseDelay, openCloseDuration } = config;

    if (!openCloseDuration) openCloseDuration = 8;

    sendData({ host, hexData, log, name });

    if (!state.targetDoorState) {
      if (this.finishedClosingTimeout) clearTimeout(this.finishedClosingTimeout);

      this.finishedOpeningTimeout = setTimeout(() => {
        log(`${name} setCurrentDoorState: open`);

        this.garageDoorOpenerService.setCharacteristic(Characteristic.CurrentDoorState, 0);

        if (autoCloseDelay) {
          log(`${name} automatically closing in ${autoCloseDelay}s`);

          this.autoCloseTimeout = setTimeout(() => {
            log(`${name} setCurrentDoorState: closed`);

            this.garageDoorOpenerService.setCharacteristic(Characteristic.TargetDoorState, 1);
          }, autoCloseDelay * 1000);
        }
      }, openCloseDuration * 1000);
    } else {
      if (this.garageDoorOpenerService) clearTimeout(this.garageDoorOpenerService);
      if (this.autoCloseTimeout) clearTimeout(this.autoCloseTimeout);

      this.finishedClosingTimeout = setTimeout(() => {
        log(`${name} setCurrentDoorState: closed`);

        this.garageDoorOpenerService.setCharacteristic(Characteristic.CurrentDoorState, 1);
      }, openCloseDuration * 1000)
    }
  }

  async setLockTargetState (hexData) {
    const { config, data, host, log, name, state } = this;

    sendData({ host, hexData, log, name });

    if (!state.lockTargetState) {
      log(`${name} setCurrentDoorState: unlocked`)
      this.garageDoorOpenerService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);
    } else {
      log(`${name} setCurrentDoorState: locked`)
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
      characteristicType: Characteristic.CurrentDoorState,
      propertyName: 'currentDoorState',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetDoorState,
      propertyName: 'targetDoorState',
      onData: open,
      offData: close,
      setValuePromise: this.setTargetDoorState.bind(this)
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.LockTargetState,
      propertyName: 'lockTargetState',
      onData: lock,
      offData: unlock,
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
