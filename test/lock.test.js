const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const delayForDuration = require('../helpers/delayForDuration')

const { Lock } = require('../accessories')

// TODO: Check actual sending of a hex code

describe('lockAccessory', () => {

  // Locking -> Locked
  it('locking -> locked', async () => {
    setup()

    const config = {
      persistState: false,
      lockDuration: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      }
    }
    
    const lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)

    // Locking
    expect(lockAccessory.state.lockCurrentState).to.equal(undefined);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    await delayForDuration(0.3)

    // Locked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
  });

  
  // Locking -> Locked -> Unlocking -> Unlocked
  it('locking -> locked -> unlocking -> unlocked', async () => {
    setup()

    const config = {
      persistState: false,
      lockDuration: 0.2,
      unlockDuration: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      }
    }
    
    const lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)

    // Locking
    expect(lockAccessory.state.lockCurrentState).to.equal(undefined);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Delay to allow for `lockDuration`
    await delayForDuration(0.3)

    // Locked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Arbitrary Delay
    await delayForDuration(0.3)

    // Unlocking
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.UNSECURED)
    
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    
    // Delay to allow for `unlockDuration`
    await delayForDuration(0.3)

    // Unlocked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
  });



  
  // Locking -> Locked -> Unlocking -> Unlocked -> Auto-locking -> Loccked
  it('locking -> locked -> unlocking -> unlocked -> auto-locking -> locked', async () => {
    setup()

    const config = {
      persistState: false,
      lockDuration: 0.2,
      unlockDuration: 0.2,
      autoLockDelay: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      }
    }
    
    const lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)

    // Locking
    expect(lockAccessory.state.lockCurrentState).to.equal(undefined);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Delay to allow for `lockDuration`
    await delayForDuration(0.3)

    // Locked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Arbitrary Delay
    await delayForDuration(0.3)

    // Unlocking
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.UNSECURED)
    
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    
    // Delay to allow for `unlockDuration`
    await delayForDuration(0.3)

    // Unlocked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    
    // Delay to allow for `autoLockDelay`
    await delayForDuration(0.3)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Delay to allow for `lockDuration`
    await delayForDuration(0.3)

    // Locked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
  });


  // Persist State 
  it('"persistState": true', async () => {
    setup()

    const config = {
      name: 'Unit Test Lock',
      persistState: true,
      lockDuration: 0.2,
      unlockDuration: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      }
    }
    
    let lockAccessory

    // Lock
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Delay to allow for `lockDuration`
    await delayForDuration(0.3)
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);

    // Should still be locked when loading within a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    
    // Unlock
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.UNSECURED)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);

    // Delay to allow for `unlockDuration`
    await delayForDuration(0.3)
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);

    // Should still be unlocked when loading within a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);
  });

  it('"persistState": false', async () => {
    setup()

    const config = {
      name: 'Unit Test Lock',
      persistState: false,
      lockDuration: 0.2,
      unlockDuration: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      }
    }
    
    let lockAccessory

    // Lock
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Delay to allow for `lockDuration`
    await delayForDuration(0.3)

    // Should be unlocked again with a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(undefined);
  });


  // Ensure the hex is resent after reload
  it('"resendHexAfterReload": true, "persistState": true', async () => {
    setup()

    const config = {
      persistState: true,
      resendHexAfterReload: true,
      resendDataAfterReloadDelay: 0.1,
      lockDuration: 0.2,
      unlockDuration: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      },
      isUnitTest: true
    }
    
    let lockAccessory

    // Lock
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Delay to allow for `lockDuration`
    await delayForDuration(0.3)
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    
    // Should be locked with a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)    
    expect(lockAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);
  });


  // Ensure the hex is not resent after reload
  it('"resendHexAfterReload": false, "persistState": true', async () => {
    setup()

    const config = {
      persistState: true,
      resendHexAfterReload: false,
      resendDataAfterReloadDelay: 0.1,
      lockDuration: 0.2,
      unlockDuration: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      },
      isUnitTest: true
    }
    
    let lockAccessory

    // Lock
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Delay to allow for `lockDuration`
    await delayForDuration(0.3)
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    
    // Should be locked with a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(lockAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);
  });
})
