const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const delayForDuration = require('../helpers/delayForDuration')
const { getDevice } = require('../helpers/getDevice')

const { SwitchRepeat } = require('../accessories')

// TODO: Check cancellation of timeouts

describe('switchRepeatAccessory', () => {

  // Switch Turn On
  it('turns on', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      persistState: false
    }
    
    const device = getDevice({ host: 'TestDevice', log })
    const switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for 3 codes to be sent
    await delayForDuration(0.4)

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('ON');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(3);

    switchAccessory.reset();
  });


  // Switch Turn On then Off
  it('turns off', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      persistState: false
    }
    
    const device = getDevice({ host: 'TestDevice', log })
    const switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')

    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for 3 codes to be sent
    await delayForDuration(0.4)
    
    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(switchAccessory.state.switchState).to.equal(0);

    // Wait for 2 codes to be sent
    await delayForDuration(0.3)

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('OFF');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(5);

    switchAccessory.reset();
  });


  // Auto Off
  it('"enableAutoOff": true, "onDuration": 1', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      persistState: false,
      enableAutoOff: true,
      onDuration: 1
    }
    
    const switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')


    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    await delayForDuration(0.4)
    // Expecting on after 0.4s total
    expect(switchAccessory.state.switchState).to.equal(1);
    
    await delayForDuration(0.7)
    // Expecting off after 1.1s total
    expect(switchAccessory.state.switchState).to.equal(0);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    switchAccessory.reset();
  }).timeout(4000);


  // Auto On
  it('"enableAutoOn": true, "offDuration": 1', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      persistState: false,
      enableAutoOn: true,
      offDuration: 1
    }
    
    const switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')

    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(switchAccessory.state.switchState).to.equal(0);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    await delayForDuration(0.4)
    // Expecting off after 0.4s total
    expect(switchAccessory.state.switchState).to.equal(0);
    
    await delayForDuration(0.7)
    // Expecting on after 1.1s total
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    switchAccessory.reset();
  }).timeout(4000);


  // Persist State 
  it('"persistState": true', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      name: 'Unit Test Switch',
      persistState: true
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for multiple codes to be sent
    await delayForDuration(0.3)

    switchAccessory.reset();

    // Should still be on when loading within a new instance
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    switchAccessory.reset();
    
    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(switchAccessory.state.switchState).to.equal(0);

    // Should still be off when loading within a new instance
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(0);
    switchAccessory.reset();
  });

  it('"persistState": false', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      name: 'Unit Test Switch',
      persistState: false
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    switchAccessory.reset();

    // Should be off again with a new instance
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);

    switchAccessory.reset();
  });


  // IP Address used to for state
  it('"pingIPAddress": "192.168.1.1", host up', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      pingIPAddress: '192.168.1.1',
      persistState: false,
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    switchAccessory.reset();

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddress": "192.168.1.1", host down', async () => {
    setup()

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: false }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(0);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    switchAccessory.reset();

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": true, "pingIPAddress": "192.168.1.1", host up', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      pingIPAddress: '192.168.1.1',
      persistState: false,
      pingIPAddressStateOnly: true,      
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);
    expect(switchAccessory.state.switchState).to.equal(1);

    switchAccessory.reset();

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": false, "pingIPAddress": "192.168.1.1", host up', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      pingIPAddress: '192.168.1.1',
      persistState: false,
      pingIPAddressStateOnly: false,      
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(1);
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    switchAccessory.reset();

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });


  // Ensure the hex is resent after reload
  it('"resendHexAfterReload": true, "persistState": true', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      persistState: true,
      resendHexAfterReload: true,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }
    
    const device = getDevice({ host: 'TestDevice', log })

    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for multiple codes to be sent
    await delayForDuration(0.3)
    
    switchAccessory.reset();

    device.resetSentHexCodes()

    // Should be on still with a new instance
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(1);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(true);

    // Check that only three codes have been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(3);

    switchAccessory.reset();
  });


  // Ensure the hex is not resent after reload
  it('"resendHexAfterReload": false, "persistState": true', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      onSendCount: 3,
      offSendCount: 2,
      interval: 0.1,
      persistState: true,
      resendHexAfterReload: false,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }

    const device = getDevice({ host: 'TestDevice', log })
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)

    switchAccessory.reset();

    // Should be on still with a new instance
    switchAccessory = new SwitchRepeat(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(1);

    device.resetSentHexCodes()

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)

    // Wait for multiple codes to be sent
    await delayForDuration(0.4)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);

    // Check ON hex code was not sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(false);

    // Check that no code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
  
    switchAccessory.reset();
  });
})
