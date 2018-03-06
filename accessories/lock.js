const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');
const { ServiceManagerTypes } = require('../helpers/serviceManager');
const catchDelayCancelError = require('../helpers/catchDelayCancelError')

class LockAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.lockTargetState = state.lockCurrentState;
  }

  reset () {
    // Clear existing timeouts
    if (this.lockingTimeoutPromise) {
      this.lockingTimeoutPromise.cancel();
      this.lockingTimeoutPromise = null;
    }

    if (this.unlockingTimeoutPromise) {
      this.unlockingTimeoutPromise.cancel();
      this.unlockingTimeoutPromise = null;
    }

    if (this.autoLockTimeoutPromise) {
      this.autoLockTimeoutPromise.cancel();
      this.autoLockTimeoutPromise = null
    }
  }

  async setLockTargetState (hexData, currentState) {
    const { host, log, name, debug } = this;

    this.reset()
    
    // Send pre-determined hex data
    sendData({ host, hexData, log, name, debug });

    catchDelayCancelError(async () => {
      if (currentState === Characteristic.LockTargetState.SECURED) {
        await this.unlock()
      } else {
        await this.lock()
      }
    })
  }

  async lock () {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { lockDuration } = config;

    // Defaults
    if (!lockDuration) lockDuration = 1;

    log(`${name} setLockCurrentState: locking`);

    this.lockingTimeoutPromise = delayForDuration(lockDuration);
    await this.lockingTimeoutPromise

    log(`${name} setLockCurrentState: locked`);
    serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
  }

  async unlock (hexData) {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { autoLockDelay, unlockDuration } = config;

    // Defaults
    if (!unlockDuration) unlockDuration = 1;

    log(`${name} setLockCurrentState: unlocking`);
    this.unlockingTimeoutPromise = delayForDuration(unlockDuration);
    await this.unlockingTimeoutPromise;

    log(`${name} setLockCurrentState: unlocked`);
    serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);

    if (!autoLockDelay) return;

    log(`${name} automatically locking in ${autoLockDelay}s`);
    this.autoLockTimeoutPromise = delayForDuration(autoLockDelay);
    await this.autoLockTimeoutPromise;

    serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED);
    this.lock()
  }

  setupServiceManager () {
    const { data, name, serviceManagerType } = this;
    const { lock, unlock } = data || {};

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.LockMechanism, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'lockCurrentState',
      type: Characteristic.LockCurrentState,
      bind: this,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      props: {

      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'lockTargetState',
      type: Characteristic.LockTargetState,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: lock,
        offData: unlock,
        setValuePromise: this.setLockTargetState.bind(this)
      }
    });
  }
}

module.exports = LockAccessory;
