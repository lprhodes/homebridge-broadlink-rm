const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class LockAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.targetLockState = state.lockCurrentState;
  }

  async setLockTargetState (hexData, currentState) {
    const { config, data, host, log, name, state, debug } = this;
    let { autoLockDelay } = config;

    const lockUnlockDuration = 1;

    sendData({ host, hexData, log, name, debug });

    console.log('state.currentState', currentState)

    if (currentState === Characteristic.LockTargetState.SECURED) {
      if (this.finishedLockingTimeout) clearTimeout(this.finishedLockingTimeout);

      log(`${name} setLockCurrentState: unlocking`);

      setTimeout(() => {
        log(`${name} setLockCurrentState: unlocked`);

        this.lockService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);

        if (autoLockDelay) {
          log(`${name} automatically locking in ${autoLockDelay}s`);

          this.autoLockTimeout = setTimeout(() => {
            log(`${name} setLockCurrentState: locked`);

            this.lockService.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED);

            setTimeout(() => {
              this.lockService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
            }, lockUnlockDuration * 1000);
          }, autoLockDelay * 1000);
        }
      }, lockUnlockDuration * 1000);
    } else {
      if (this.lockService) clearTimeout(this.lockService);
      if (this.autoLockTimeout) clearTimeout(this.autoLockTimeout);

      this.finishedLockingTimeout = setTimeout(() => {
        log(`${name} setLockCurrentState: locked`);

        this.lockService.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED);
        this.lockService.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
      }, lockUnlockDuration * 1000)
    }
  }

  getServices () {
    const services = super.getServices();

    const { data, name } = this;
    const { lock, unlock } = data;

    const service = new Service.LockMechanism(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.LockCurrentState,
      propertyName: 'lockCurrentState',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.LockTargetState,
      propertyName: 'lockTargetState',
      onData: lock,
      offData: unlock,
      setValuePromise: this.setLockTargetState.bind(this)
    });

    this.lockService = service;

    services.push(service);

    return services;
  }
}

module.exports = LockAccessory;
