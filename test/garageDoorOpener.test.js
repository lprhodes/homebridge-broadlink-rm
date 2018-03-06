const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')
const { getDevice } = require('../helpers/getDevice')

const delayForDuration = require('../helpers/delayForDuration')

const { GarageDoorOpener } = require('../accessories')

const data = {
  open: 'OPEN_HEX',
  close: 'CLOSE_HEX',
  lock: 'LOCK_HEX',
  unlock: 'UNLOCK_HEX'
}

describe('doorAccessory', () => {

  // Closing -> Closed
  it('"closeDuration": 0.2, closing -> closed', async () => {
    setup()

    const config = {
      persistState: false,
      closeDuration: 0.2,
      data
    }
    
    const doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)

    // Closing
    expect(doorAccessory.state.doorCurrentState).to.equal(undefined);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    await delayForDuration(0.3)

    // Closed
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
  });

  
  // Closing -> Closed -> Opening -> Opened
  it('"openDuration": 0.2, closing -> closed -> opening -> opened', async () => {
    setup()

    const config = {
      persistState: false,
      closeDuration: 0.2,
      openDuration: 0.2,
      data
    }
    
    const doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)

    const device = getDevice({ host: 'TestDevice', log })
    let sentHexCodeCount

    // Check hex code was sent
    const hasSentCloseCode = device.hasSentCode('CLOSE_HEX')
    expect(hasSentCloseCode).to.equal(true);

    // Check that only one code has been sent
    sentHexCodeCount = device.getSentHexCodeCount()
    expect(sentHexCodeCount).to.equal(1);
    
    // Closing
    expect(doorAccessory.state.doorCurrentState).to.equal(undefined);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Delay to allow for `closeDuration`
    await delayForDuration(0.3)

    // Closed
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Arbitrary Delay
    await delayForDuration(0.3)

    // Opening
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.OPEN)
    
    // Check hex sent
    const hasSentOpenCode = getDevice({ host: 'TestDevice', log }).hasSentCode('OPEN_HEX')
    expect(hasSentOpenCode).to.equal(true);

    // Check that only one code has been sent
    sentHexCodeCount = device.getSentHexCodeCount()
    expect(sentHexCodeCount).to.equal(2);
    
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.OPEN);
    
    // Delay to allow for `openDuration`
    await delayForDuration(0.3)

    // Opened
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.OPEN);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.OPEN);
  });

  
  // Closing -> Closed -> Opening -> Opened -> Auto-closing -> Closed
  it('"autoCloseDelay" : true, closing -> closed -> opening -> opened -> auto-closing -> closed', async () => {
    setup()

    const config = {
      persistState: false,
      closeDuration: 0.2,
      openDuration: 0.2,
      autoCloseDelay: 0.2,
      data
    }
    
    const doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)

    // Closing
    expect(doorAccessory.state.doorCurrentState).to.equal(undefined);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Delay to allow for `closeDuration`
    await delayForDuration(0.3)

    // Closed
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Arbitrary Delay
    await delayForDuration(0.3)

    // Opening
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.OPEN)
    
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.OPEN);
    
    // Delay to allow for `openDuration`
    await delayForDuration(0.3)

    // Opened
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.OPEN);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.OPEN);
    
    // Delay to allow for `autoCloseDelay`
    await delayForDuration(0.3)
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Delay to allow for `closeDuration`
    await delayForDuration(0.3)

    // Closed
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
  });


  // Persist State 
  it('"persistState": true', async () => {
    setup()

    const config = {
      name: 'Unit Test Door',
      persistState: true,
      closeDuration: 0.2,
      openDuration: 0.2,
      data
    }
    
    let doorAccessory

    // Close
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Delay to allow for `closeDuration`
    await delayForDuration(0.2)
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);

    // Should still be closed when loading within a new instance
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);
    
    // Open
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.OPEN)
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.OPEN);

    // Delay to allow for `openDuration`
    await delayForDuration(0.3)
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.OPEN);

    // Should still be opened when loading within a new instance
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.OPEN);
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.OPEN);
  });


  it('"persistState": false', async () => {
    setup()

    const config = {
      name: 'Unit Test Door',
      persistState: false,
      closeDuration: 0.2,
      openDuration: 0.2,
      data
    }
    
    let doorAccessory

    // Close
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Delay to allow for `closeDuration`
    await delayForDuration(0.3)

    // Should be opened again with a new instance
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    expect(doorAccessory.state.doorTargetState).to.equal(undefined);
  });


  // Ensure the hex is resent after reload
  it('"resendHexAfterReload": true, "persistState": true', async () => {
    setup()

    const config = {
      persistState: true,
      resendHexAfterReload: true,
      resendDataAfterReloadDelay: 0.1,
      closeDuration: 0.2,
      openDuration: 0.2,
      data,
      isUnitTest: true
    }

    const device = getDevice({ host: 'TestDevice', log })
    
    let doorAccessory

    // Close
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Delay to allow for `closeDuration`
    await delayForDuration(0.3)
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);

    device.resetSentHexCodes();
    
    // Should be closed with a new instance
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)    
    expect(doorAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);
    
    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCode('CLOSE_HEX');
    expect(hasSentOnCode).to.equal(true);

    // Check that the code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();

    expect(sentHexCodeCount).to.equal(2); // One for the door state and one for the lock state
  });


  // Ensure the hex is not resent after reload
  it('"resendHexAfterReload": false, "persistState": true', async () => {
    setup()

    const config = {
      persistState: true,
      resendHexAfterReload: false,
      resendDataAfterReloadDelay: 0.1,
      closeDuration: 0.2,
      openDuration: 0.2,
      data,
      isUnitTest: true
    }

    const device = getDevice({ host: 'TestDevice', log })
    
    let doorAccessory

    // Close
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);

    // Delay to allow for `closeDuration`
    await delayForDuration(0.3)
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);

    device.resetSentHexCodes();
    
    // Should be closed with a new instance
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.CLOSED);

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(doorAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);

    // Check ON hex code was not sent
    const hasSentOnCode = device.hasSentCode('CLOSE_HEX');
    expect(hasSentOnCode).to.equal(false);

    // Check that no code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
  });


  // Ensure correctReloadedState is working correctly
  it('correctReloadedState for interupted open - "persistState": true', async () => {
    setup()
  
    const config = {
      data,
      persistState: true,
      resendHexAfterReload: false,
      isUnitTest: true
    }
  
    const device = getDevice({ host: 'TestDevice', log })
    
    let doorAccessory
  
    // Close
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    doorAccessory.serviceManager.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)
    doorAccessory.serviceManager.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN)
    doorAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)
    doorAccessory.serviceManager.setCharacteristic(Characteristic.LockCurrentState, Characteristic.LockCurrentState.UNSECURED)
    
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
    expect(doorAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    
    // Cancel all timers
    doorAccessory.reset();
  
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.CLOSED);
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.OPEN);
    expect(doorAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);
    expect(doorAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);
    
    // Should be closed with a new instance
    doorAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    expect(doorAccessory.state.doorTargetState).to.equal(Characteristic.TargetDoorState.OPEN);
    expect(doorAccessory.state.doorCurrentState).to.equal(Characteristic.CurrentDoorState.OPEN);
    expect(doorAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
    expect(doorAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);

    // Cancel all timers
    doorAccessory.reset();
  });


  // Lock
  it('lock', async () => {
    setup()

    const config = {
      data,
      persistState: false
    }

    const device = getDevice({ host: 'TestDevice', log })
    
    const lockAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)

    // Locked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Check hex code was sent
    const hasSentLockCode = device.hasSentCode('LOCK_HEX')
    expect(hasSentLockCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount()
    expect(sentHexCodeCount).to.equal(1);
  });

  
  // Unlock
  it('unlock', async () => {
    setup()

    const config = {
      data,
      persistState: false
    }

    const device = getDevice({ host: 'TestDevice', log })
    
    const lockAccessory = new GarageDoorOpener(null, config, 'FakeServiceManager')

    // Lock
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.SECURED)

    let sentHexCodeCount

    // Check hex code was sent
    const hasSentLockCode = device.hasSentCode('LOCK_HEX')
    expect(hasSentLockCode).to.equal(true);

    // Check that only one code has been sent
    sentHexCodeCount = device.getSentHexCodeCount()
    expect(sentHexCodeCount).to.equal(1);

    // Locked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.SECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.SECURED);

    // Arbitrary Delay
    await delayForDuration(0.3)

    // Unlock
    lockAccessory.serviceManager.setCharacteristic(Characteristic.LockTargetState, Characteristic.LockTargetState.UNSECURED)
    
    // Check hex sent
    const hasSentUnlockCode = getDevice({ host: 'TestDevice', log }).hasSentCode('UNLOCK_HEX')
    expect(hasSentUnlockCode).to.equal(true);

    // Check that only one code has been sent
    sentHexCodeCount = device.getSentHexCodeCount()
    expect(sentHexCodeCount).to.equal(2);

    // Unlocked
    expect(lockAccessory.state.lockCurrentState).to.equal(Characteristic.LockCurrentState.UNSECURED);
    expect(lockAccessory.state.lockTargetState).to.equal(Characteristic.LockTargetState.UNSECURED);
  })
})
