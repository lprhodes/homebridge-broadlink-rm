const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const delayForDuration = require('../helpers/delayForDuration')
const { getDevice } = require('../helpers/getDevice')

const { Light } = require('../accessories')

// TODO: Check cancellation of timeouts

describe('lightAccessory', () => {

  // Light Turn On
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
    const lightAccessory = new Light(null, config, 'FakeServiceManager')
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    
    expect(lightAccessory.state.switchState).to.equal(1);

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('ON');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
  });


  // Light Turn On then Off
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
    const lightAccessory = new Light(null, config, 'FakeServiceManager')

    // Turn On Light
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(lightAccessory.state.switchState).to.equal(1);
    
    // Turn Off Light
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(lightAccessory.state.switchState).to.equal(0);

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('OFF');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  });


  // Auto Off
  it('"enableAutoOff": true, "onDuration": 1', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      persistState: false,
      enableAutoOff: true,
      onDuration: 1
    }
    
    const lightAccessory = new Light(null, config, 'FakeServiceManager')


    // Turn On Light
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(lightAccessory.state.switchState).to.equal(1);

    await delayForDuration(0.4)
    // Expecting on after 0.4s total
    expect(lightAccessory.state.switchState).to.equal(1);
    
    await delayForDuration(0.7)
    // Expecting off after 1.1s total
    expect(lightAccessory.state.switchState).to.equal(0);
  }).timeout(4000);


  // Auto On
  it('"enableAutoOn": true, "offDuration": 1', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      persistState: false,
      enableAutoOn: true,
      offDuration: 1
    }
    
    const lightAccessory = new Light(null, config, 'FakeServiceManager')

    // Turn On Light
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(lightAccessory.state.switchState).to.equal(1);

    // Turn Off Light
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(lightAccessory.state.switchState).to.equal(0);

    await delayForDuration(0.4)
    // Expecting off after 0.4s total
    expect(lightAccessory.state.switchState).to.equal(0);
    
    await delayForDuration(0.7)
    // Expecting on after 1.1s total
    expect(lightAccessory.state.switchState).to.equal(1);
  }).timeout(4000);


  // Persist State 
  it('"persistState": true', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      name: 'Unit Test Light',
      persistState: true
    }
    
    let lightAccessory

    // Turn On Light
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(lightAccessory.state.switchState).to.equal(1);

    // Should still be on when loading within a new instance
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    expect(lightAccessory.state.switchState).to.equal(1);
    
    // Turn Off Light
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(lightAccessory.state.switchState).to.equal(0);

    // Should still be off when loading within a new instance
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    expect(lightAccessory.state.switchState).to.equal(0);
  });

  it('"persistState": false', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      name: 'Unit Test Light',
      persistState: false
    }
    
    let lightAccessory

    // Turn On Light
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(lightAccessory.state.switchState).to.equal(1);

    // Should be off again with a new instance
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    expect(lightAccessory.state.switchState).to.equal(undefined);
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

    let lightAccessory

    // Turn On Light
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(lightAccessory.state.switchState).to.equal(1);

    device.resetSentHexCodes()

    // Should be on still with a new instance
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    expect(lightAccessory.state.switchState).to.equal(1);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(lightAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

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
    
    let lightAccessory

    // Turn On Light
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    lightAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(lightAccessory.state.switchState).to.equal(1);

    // Should be on still with a new instance
    lightAccessory = new Light(null, config, 'FakeServiceManager')
    expect(lightAccessory.state.switchState).to.equal(1);

    device.resetSentHexCodes()

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(lightAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);

    // Check ON hex code was not sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(false);

    // Check that no code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
  });
})
