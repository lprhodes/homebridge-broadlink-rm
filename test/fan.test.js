const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const delayForDuration = require('../helpers/delayForDuration')
const { getDevice } = require('../helpers/getDevice')

const { Fan } = require('../accessories')

// TODO: Check the closest hex is chosen for fan speed

describe('fanAccessory', () => {

  // Fan Turn On
  it('turns on', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      persistState: false
    }
    
    const device = getDevice({ host: 'TestDevice', log })
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    
    expect(fanAccessory.state.switchState).to.equal(1);

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('ON');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
  });


  // Fan Turn On then Off
  it('turns off', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      persistState: false
    }
    
    const device = getDevice({ host: 'TestDevice', log })
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')

    // Turn On Fan
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(fanAccessory.state.switchState).to.equal(1);
    
    // Turn Off Fan
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(fanAccessory.state.switchState).to.equal(0);

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('OFF');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  });


  // Fan Speed
  it('fan seeed set to 20', async () => {
    setup()

    const config = {
      persistState: false
    }
    
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.RotationSpeed, 20)
    
    expect(fanAccessory.state.fanSpeed).to.equal(20);
  });


  // Fan Turn Swing Mode On
  it('swing mode on', async () => {
    setup()

    const config = {
      persistState: false
    }
    
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.SwingMode, 1)
    
    expect(fanAccessory.state.swingMode).to.equal(1);
  });


  // Fan Turn Swing Mode On then Off
  it('swing mode off', async () => {
    setup()

    const config = {
      persistState: false
    }
    
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')

    // Turn On Swing Mode
    fanAccessory.serviceManager.setCharacteristic(Characteristic.SwingMode, 1)
    expect(fanAccessory.state.swingMode).to.equal(1);
    
    // Turn Off Swing Mode
    fanAccessory.serviceManager.setCharacteristic(Characteristic.SwingMode, 0)
    expect(fanAccessory.state.swingMode).to.equal(0);
  });


  // Hide Swing Mode
  it('"showSwingMode": false', async () => {
    setup()

    const config = {
      persistState: false,
      showSwingMode: false,
    }
    
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')

    // Attempt To Turn On Swing Mode
    fanAccessory.serviceManager.setCharacteristic(Characteristic.SwingMode, 1)
    expect(fanAccessory.state.swingMode).to.equal(undefined);
  });

  // Fan Turn Swing Mode On
  it('rotation direction clockwise', async () => {
    setup()

    const config = {
        persistState: false
    }
    
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.RotationDirection, 1)
    
    expect(fanAccessory.state.rotationDirection).to.equal(1);
  });


  // Set Rotation Direction To Clockwise Then Anti-clockwise
  it('rotation direction anti-clockwise', async () => {
    setup()

    const config = {
      persistState: false
    }
    
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')

    // Turn On Swing Mode
    fanAccessory.serviceManager.setCharacteristic(Characteristic.RotationDirection, 1)
    expect(fanAccessory.state.rotationDirection).to.equal(1);
    
    // Turn Off Swing Mode
    fanAccessory.serviceManager.setCharacteristic(Characteristic.RotationDirection, 0)
    expect(fanAccessory.state.rotationDirection).to.equal(0);
  });


  // Hide Rotation Direction
  it('"showRotationDirection": false', async () => {
    setup()

    const config = {
      persistState: false,
      showRotationDirection: false,
    }
    
    const fanAccessory = new Fan(null, config, 'FakeServiceManager')

    // Attempt To Set Rotation Direction To Clockwise
    fanAccessory.serviceManager.setCharacteristic(Characteristic.RotationDirection, 1)
    expect(fanAccessory.state.rotationDirection).to.equal(undefined);
  });


  // Persist State 
  it('"persistState": true', async () => {
    setup()

    const config = {
      name: 'Unit Test Fan',
      persistState: true
    }
    
    let fanAccessory

    // Turn On Fan
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(fanAccessory.state.switchState).to.equal(1);

    // Should still be on when loading within a new instance
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    expect(fanAccessory.state.switchState).to.equal(1);
    
    // Turn Off Fan
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(fanAccessory.state.switchState).to.equal(0);

    // Should still be off when loading within a new instance
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    expect(fanAccessory.state.switchState).to.equal(0);
  });

  it('"persistState": false', async () => {
    setup()

    const config = {
      name: 'Unit Test Fan',
      persistState: false
    }
    
    let fanAccessory

    // Turn On Fan
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(fanAccessory.state.switchState).to.equal(1);

    // Should be off again with a new instance
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    expect(fanAccessory.state.switchState).to.equal(undefined);
  });


  // Ensure the hex is resent after reload
  it('"resendHexAfterReload": true, "persistState": true', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      persistState: true,
      resendHexAfterReload: true,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }
    
    const device = getDevice({ host: 'TestDevice', log })
    
    let fanAccessory

    // Turn On Fan
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(fanAccessory.state.switchState).to.equal(1);

    device.resetSentHexCodes()

    // Should be on still with a new instance
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    expect(fanAccessory.state.switchState).to.equal(1);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(fanAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
  });


  // Ensure the hex is not resent after reload
  it('"resendHexAfterReload": false, "persistState": true', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      persistState: true,
      resendHexAfterReload: false,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }

    const device = getDevice({ host: 'TestDevice', log })
    
    let fanAccessory

    // Turn On Fan
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    fanAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(fanAccessory.state.switchState).to.equal(1);

    device.resetSentHexCodes()

    // Should be on still with a new instance
    fanAccessory = new Fan(null, config, 'FakeServiceManager')
    expect(fanAccessory.state.switchState).to.equal(1);

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(fanAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);

    // Check ON hex code was not sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(false);

    // Check that no code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
  });
})
