const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');
const { ServiceManagerTypes } = require('../helpers/serviceManager');

class LockAccessory extends BroadlinkRMAccessory {

  correctReloadedState (state) {
    state.targetLockState = state.lockCurrentState;
  }

  async setLockTargetState (hexData, currentState) {
    const { host, log, name, debug } = this;
    
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
    
    // Send pre-determined hex data
    sendData({ host, hexData, log, name, debug });

    if (currentState === Characteristic.LockTargetState.SECURED) {
      this.unlock()
    } else {
      this.lock()
    }
  }

  async unlock (hexData) {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { autoLockDelay, unlockDuration } = config;

    // Defaults
    if (!unlockDuration) unlockDuration = 1;

    log(`${name} setLockCurrentState: unlocking`);
    this.unlockingTimeoutPromise = await delayForDuration(unlockDuration);

    log(`${name} setLockCurrentState: unlocked`);
    serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED);

    if (!autoLockDelay) return;

    log(`${name} automatically locking in ${autoLockDelay}s`);
    this.autoLockTimeoutPromise = await delayForDuration(autoLockDelay);

    //
    serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED);
    this.lock()
  }

  async lock () {
    const { config, data, host, log, name, state, debug, serviceManager } = this;
    let { lockDuration } = config;

    // Defaults
    if (!lockDuration) lockDuration = 1;

    log(`${name} setLockCurrentState: locking`);
    this.lockingTimeoutPromise = await delayForDuration(lockDuration) ;
    
    log(`${name} setLockCurrentState: locked`);
    serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED);
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
