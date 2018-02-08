const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class LockAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.targetLockState = state.LockCurrentState;
  }

  async setTargetLockState (hexData) {
    const { config, data, host, log, name, state, debug } = this;
    let { autoLockDelay } = config;

    const openCloseDuration = openCloseDuration = 2;

    sendData({ host, hexData, log, name, debug });

    if (!state.targetLockState) {
      if (this.finishedClosingTimeout) clearTimeout(this.finishedClosingTimeout);

      this.finishedOpeningTimeout = setTimeout(() => {
        log(`${name} setLockCurrentState: unlocked`);

        this.lockService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);

        if (autoLockDelay) {
          log(`${name} automatically locking in ${autoLockDelay}s`);

          this.autoLockTimeout = setTimeout(() => {
            log(`${name} setLockCurrentState: locked`);

            this.lockService.setCharacteristic(Characteristic.TargetLockState, Characteristic.LockCurrentState.SECURED);
          }, autoLockDelay * 1000);
        }
      }, openCloseDuration * 1000);
    } else {
      if (this.lockService) clearTimeout(this.lockService);
      if (this.autoLockTimeout) clearTimeout(this.autoLockTimeout);

      this.finishedClosingTimeout = setTimeout(() => {
        log(`${name} setLockCurrentState: locked`);

        this.lockService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
      }, openCloseDuration * 1000)
    }
  }

  getServices () {
    const services = super.getServices();

    const { data, name } = this;
    const { open, close, lock, unlock } = data;

    const service = new Service.LockControlPoint(name);
    this.addNameService(service);

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

    this.lockService = service;

    services.push(service);

    return services;
  }
}

module.exports = LockAccessory;
