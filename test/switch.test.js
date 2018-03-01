const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const delayForDuration = require('../helpers/delayForDuration')

const { Switch } = require('../accessories')

// TODO: Check actual sending of a hex code
// TODO: Check cancellation of timeouts

describe('switchAccessory', () => {

  // Switch Turn On
  it('turns on', async () => {
    setup()

    const config = {
        persistState: false
    }
    
    const switchAccessory = new Switch(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    
    expect(switchAccessory.state.switchState).to.equal(1);
  });


  // Switch Turn On then Off
  it('turns off', async () => {
    setup()

    const config = {
      persistState: false
    }
    
    const switchAccessory = new Switch(null, config, 'FakeServiceManager')

    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);
    
    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(switchAccessory.state.switchState).to.equal(0);
  });


  // Auto Off
  it('"enableAutoOff": true, "onDuration": 1', async () => {
    setup()

    const config = {
      persistState: false,
      enableAutoOff: true,
      onDuration: 1
    }
    
    const switchAccessory = new Switch(null, config, 'FakeServiceManager')


    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    await delayForDuration(0.4)
    // Expecting on after 0.4s total
    expect(switchAccessory.state.switchState).to.equal(1);
    
    await delayForDuration(0.7)
    // Expecting off after 1.1s total
    expect(switchAccessory.state.switchState).to.equal(0);
  }).timeout(4000);


  // Auto On
  it('"enableAutoOn": true, "offDuration": 1', async () => {
    setup()

    const config = {
      persistState: false,
      enableAutoOn: true,
      offDuration: 1
    }
    
    const switchAccessory = new Switch(null, config, 'FakeServiceManager')

    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(switchAccessory.state.switchState).to.equal(0);

    await delayForDuration(0.4)
    // Expecting off after 0.4s total
    expect(switchAccessory.state.switchState).to.equal(0);
    
    await delayForDuration(0.7)
    // Expecting on after 1.1s total
    expect(switchAccessory.state.switchState).to.equal(1);
  }).timeout(4000);


  // Persist State 
  it('"persistState": true', async () => {
    setup()

    const config = {
      name: 'Unit Test Switch',
      persistState: true
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Should still be on when loading within a new instance
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(1);
    
    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(switchAccessory.state.switchState).to.equal(0);

    // Should still be off when loading within a new instance
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(0);
  });

  it('"persistState": false', async () => {
    setup()

    const config = {
      name: 'Unit Test Switch',
      persistState: false
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Should be off again with a new instance
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
  });


  // IP Address used to for state
  it('"pingIPAddress": "192.168.1.1", host up', async () => {
    setup()

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      isUnitTest: true
    }
    
    let switchAccessory = new Switch(null, config, 'FakeServiceManager')
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(1);

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
    
    let switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: false }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(0);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": true, "pingIPAddress": "192.168.1.1", host up', async () => {
    setup()

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      pingIPAddressStateOnly: true,      
      isUnitTest: true
    }
    
    let switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);
    expect(switchAccessory.state.switchState).to.equal(1);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": false, "pingIPAddress": "192.168.1.1", host up', async () => {
    setup()

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      pingIPAddressStateOnly: false,      
      isUnitTest: true
    }
    
    let switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(1);
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });


  // Ensure the hex is resent after reload
  it('"resendHexAfterReload": true, "persistState": true', async () => {
    setup()

    const config = {
      persistState: true,
      resendHexAfterReload: true,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Should be on still with a new instance
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(1);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);
  });


  // Ensure the hex is not resent after reload
  it('"resendHexAfterReload": false, "persistState": true', async () => {
    setup()

    const config = {
      persistState: true,
      resendHexAfterReload: false,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(switchAccessory.state.switchState).to.equal(1);

    // Should be on still with a new instance
    switchAccessory = new Switch(null, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(1);

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);
  });
})
