const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')
const { getDevice } = require('../helpers/getDevice')

const delayForDuration = require('../helpers/delayForDuration')

const { Lock } = require('../accessories')

describe('lockAccessory', () => {

  // Locking -> Locked
  it('"lockDuration": 0.2, locking -> locked', async () => {
    const { device } = setup();

    const config = {
      persistState: false,
      host: device.host.address,
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
  it('"unlockDuration": 0.2, locking -> locked -> unlocking -> unlocked', async () => {
    const { device } = setup();

    const config = {
      persistState: false,
      host: device.host.address,
      lockDuration: 0.2,
      unlockDuration: 0.2,
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      }
    }
    
    const lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)

    
    let sentHexCodeCount

    // Check hex code was sent
    const hasSentLockCode = device.hasSentCode('LOCK_HEX')
    expect(hasSentLockCode).to.equal(true);

    // Check that only one code has been sent
    sentHexCodeCount = device.getSentHexCodeCount()
    expect(sentHexCodeCount).to.equal(1);
    
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
    
    // Check hex sent
    const hasSentUnlockCode = device.hasSentCode('UNLOCK_HEX')
    expect(hasSentUnlockCode).to.equal(true);

    // Check that only one code has been sent
    sentHexCodeCount = device.getSentHexCodeCount()
    expect(sentHexCodeCount).to.equal(2);
    
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    
    // Delay to allow for `unlockDuration`
    await delayForDuration(0.3)

    // Unlocked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
  });

  
  // Locking -> Locked -> Unlocking -> Unlocked -> Auto-locking -> Locked
  it('"autoLockDelay" : true, locking -> locked -> unlocking -> unlocked -> auto-locking -> locked', async () => {
    const { device } = setup();

    const config = {
      persistState: false,
      host: device.host.address,
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
    const { device } = setup();

    const config = {
      name: 'Unit Test Lock',
      host: device.host.address,
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

    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
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
    const { device } = setup();

    const config = {
      name: 'Unit Test Lock',
      host: device.host.address,
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
    const { device } = setup();

    const config = {
      persistState: true,
      host: device.host.address,
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

    device.resetSentHexCodes();
    
    // Should be locked with a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)    
    expect(lockAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);
    
    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCode('LOCK_HEX');
    expect(hasSentOnCode).to.equal(true);

    // Check that the code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
  });


  // Ensure the hex is not resent after reload
  it('"resendHexAfterReload": false, "persistState": true', async () => {
    const { device } = setup();

    const config = {
      persistState: true,
      host: device.host.address,
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

    device.resetSentHexCodes();
    
    // Should be locked with a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(lockAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);

    // Check ON hex code was not sent
    const hasSentOnCode = device.hasSentCode('LOCK_HEX');
    expect(hasSentOnCode).to.equal(false);

    // Check that no code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
  });


  // Ensure correctReloadedState is working correctly
  it('correctReloadedState for interupted unlock - "persistState": true', async () => {
    const { device } = setup();
  
    const config = {
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      },
      host: device.host.address,
      persistState: true,
      resendHexAfterReload: false,
      isUnitTest: true
    }
  
    
    
    let lockAccessory
  
    // Lock
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.SECURED)
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.UNSECURED)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    
    // Cancel all timers
    lockAccessory.reset();
  
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    
    // Should be locked with a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);

    // Cancel all timers
    lockAccessory.reset();
  });


  // Ensure correctReloadedState is working correctly
  it('correctReloadedState for interupted lock - "persistState": true', async () => {
    const { device } = setup();
  
    const config = {
      data: {
        lock: 'LOCK_HEX',
        unlock: 'UNLOCK_HEX'
      },
      host: device.host.address,
      persistState: true,
      resendHexAfterReload: false,
      isUnitTest: true
    }
  
    
    
    let lockAccessory
  
    // Lock
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED)
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    
    // Cancel all timers
    lockAccessory.reset();
  
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);
    
    // Should be locked with a new instance
    lockAccessory = new Lock(null, config, 'FakeServiceManager')
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);

    // Cancel all timers
    lockAccessory.reset();
  });
})
