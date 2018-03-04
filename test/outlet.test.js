const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')

const delayForDuration = require('../helpers/delayForDuration')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const { getDevice } = require('../helpers/getDevice')

const { Outlet } = require('../accessories')

// TODO: Check actual sending of a hex code

describe('outletAccessory', () => {

  // Outlet Turn On
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
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    
    expect(outletAccessory.state.switchState).to.equal(1);

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('ON');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
  });


  // Outlet Turn On then Off
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
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    
    // Turn On Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(outletAccessory.state.switchState).to.equal(1);
    
    // Turn Off Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(outletAccessory.state.switchState).to.equal(0);

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
        off: 'OFF',
      },
      persistState: false,
      enableAutoOff: true,
      onDuration: 1
    }
    
    const device = getDevice({ host: 'TestDevice', log })
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')

    // Turn On Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(outletAccessory.state.switchState).to.equal(1);

    await delayForDuration(0.4)
    // Expecting on after 0.4s total
    expect(outletAccessory.state.switchState).to.equal(1);
    
    await delayForDuration(0.7)
    // Expecting off after 1.1s total
    expect(outletAccessory.state.switchState).to.equal(0);

    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(true);

    // Check OFF hex code was sent
    const hasSentOffCode = device.hasSentCode('OFF');
    expect(hasSentOffCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  }).timeout(4000);


  // Auto On
  it('"enableAutoOn": true, "offDuration": 1', async () => {
    setup()

    const config = {
      data: {
        on: 'ON',
        off: 'OFF',
      },
      persistState: false,
      enableAutoOn: true,
      offDuration: 1
    }
    
    const device = getDevice({ host: 'TestDevice', log })
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')

    // Turn On Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(outletAccessory.state.switchState).to.equal(1);

    // Turn Off Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(outletAccessory.state.switchState).to.equal(0);

    await delayForDuration(0.4)
    // Expecting off after 0.4s total
    expect(outletAccessory.state.switchState).to.equal(0);
    
    await delayForDuration(0.7)
    // Expecting on after 1.1s total
    expect(outletAccessory.state.switchState).to.equal(1);

    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(true);

    // Check OFF hex code was sent
    const hasSentOffCode = device.hasSentCode('OFF');
    expect(hasSentOffCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(3);
  }).timeout(4000);


  // Persist State 
  it('"persistState": true', async () => {
    setup()

    const config = {
      name: 'Unit Test Outlet',
      persistState: true
    }
    
    let outletAccessory

    // Turn On Outlet
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(outletAccessory.state.switchState).to.equal(1);

    // Should still be on when loading within a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(1);
    
    // Turn Off Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 0)
    expect(outletAccessory.state.switchState).to.equal(0);

    // Should still be off when loading within a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(0);
  });

  it('"persistState": false', async () => {
    setup()

    const config = {
      name: 'Unit Test Outlet',
      persistState: false
    }
    
    let outletAccessory

    // Turn On Outlet
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(outletAccessory.state.switchState).to.equal(1);

    // Should be off again with a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(undefined);
  });


  // IP Address used to for state
  it('"pingIPAddress": "192.168.1.1", host up', async () => {
    setup()

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      isUnitTest: true
    }
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(outletAccessory.state.outletInUse).to.equal(1);

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
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.outletInUse).to.equal(undefined);
    
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: false }))

    await delayForDuration(0.3)
    expect(outletAccessory.state.outletInUse).to.equal(0);

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
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.outletInUse).to.equal(undefined);
    
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(outletAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);
    expect(outletAccessory.state.outletInUse).to.equal(1);

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
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.outletInUse).to.equal(undefined);
    
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(outletAccessory.state.outletInUse).to.equal(1);
    expect(outletAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

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
      persistState: true,
      resendHexAfterReload: true,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }

    const device = getDevice({ host: 'TestDevice', log })
    
    let outletAccessory

    // Turn On Outlet
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, 1)
    expect(outletAccessory.state.switchState).to.equal(1);

    device.resetSentHexCodes();

    // Should be on still with a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(1);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    expect(outletAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCode('ON');
    expect(hasSentOnCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
  });
})
