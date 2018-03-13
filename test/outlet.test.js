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
    const { device } = setup();

    const config = {
        data: {
          on: 'ON',
          off: 'OFF'
        },
        host: device.host.address,
        persistState: false
    }
    
    
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    
    expect(outletAccessory.state.switchState).to.equal(true);

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('ON');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
  });


  // Outlet Turn On then Off
  it('turns off', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      host: device.host.address,
      persistState: false
    }
    
    
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    
    // Turn On Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(outletAccessory.state.switchState).to.equal(true);
    
    // Turn Off Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, false)
    expect(outletAccessory.state.switchState).to.equal(false);

    // Check hex code was sent
    const hasSentCode = device.hasSentCode('OFF');
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  });


  // Auto Off
  it('"enableAutoOff": true, "onDuration": 1', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: 'ON',
        off: 'OFF',
      },
      host: device.host.address,
      persistState: false,
      enableAutoOff: true,
      onDuration: 1
    }
    
    
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')

    // Turn On Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(outletAccessory.state.switchState).to.equal(true);

    await delayForDuration(0.4)
    // Expecting on after 0.4s total
    expect(outletAccessory.state.switchState).to.equal(true);
    
    await delayForDuration(0.7)
    // Expecting off after 1.1s total
    expect(outletAccessory.state.switchState).to.equal(false);

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
    const { device } = setup();

    const config = {
      data: {
        on: 'ON',
        off: 'OFF',
      },
      host: device.host.address,
      persistState: false,
      enableAutoOn: true,
      offDuration: 1
    }
    
    
    const outletAccessory = new Outlet(null, config, 'FakeServiceManager')

    // Turn On Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(outletAccessory.state.switchState).to.equal(true);

    // Turn Off Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, false)
    expect(outletAccessory.state.switchState).to.equal(false);

    await delayForDuration(0.4)
    // Expecting off after 0.4s total
    expect(outletAccessory.state.switchState).to.equal(false);
    
    await delayForDuration(0.7)
    // Expecting on after 1.1s total
    expect(outletAccessory.state.switchState).to.equal(true);

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
    const { device } = setup();

    const config = {
      name: 'Unit Test Outlet',
      host: device.host.address,
      persistState: true
    }
    
    let outletAccessory

    // Turn On Outlet
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(outletAccessory.state.switchState).to.equal(true);

    // Should still be on when loading within a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(true);
    
    // Turn Off Outlet
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, false)
    expect(outletAccessory.state.switchState).to.equal(false);

    // Should still be off when loading within a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(false);
  });

  it('"persistState": false', async () => {
    const { device } = setup();

    const config = {
      name: 'Unit Test Outlet',
      persistState: false
    }
    
    let outletAccessory

    // Turn On Outlet
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(outletAccessory.state.switchState).to.equal(true);

    // Should be off again with a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(undefined);
  });


  // IP Address used to for state
  it('"pingIPAddress": "192.168.1.1", host up', async () => {
    const { device } = setup();

    const config = {
      pingIPAddress: '192.168.1.1',
      host: device.host.address,
      persistState: false,
      isUnitTest: true
    }
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(outletAccessory.state.outletInUse).to.equal(true);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddress": "192.168.1.1", host down', async () => {
    const { device } = setup();

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      isUnitTest: true
    }
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.outletInUse).to.equal(undefined);
    
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: false }))

    await delayForDuration(0.3)
    expect(outletAccessory.state.outletInUse).to.equal(false);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": true, "pingIPAddress": "192.168.1.1", host up', async () => {
    const { device } = setup();

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      host: device.host.address,
      pingIPAddressStateOnly: true,      
      isUnitTest: true
    }
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.outletInUse).to.equal(undefined);
    
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(outletAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);
    expect(outletAccessory.state.outletInUse).to.equal(true);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": false, "pingIPAddress": "192.168.1.1", host up', async () => {
    const { device } = setup();

    const config = {
      pingIPAddress: '192.168.1.1',
      persistState: false,
      host: device.host.address,
      pingIPAddressStateOnly: false,      
      isUnitTest: true
    }
    
    let outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.outletInUse).to.equal(undefined);
    
    const pingInterval = outletAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(outletAccessory.state.outletInUse).to.equal(true);
    expect(outletAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });


  // Ensure the hex is resent after reload
  it('"resendHexAfterReload": true, "persistState": true', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: 'ON',
        off: 'OFF'
      },
      persistState: true,
      resendHexAfterReload: true,
      host: device.host.address,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }

    
    
    let outletAccessory

    // Turn On Outlet
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    outletAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(outletAccessory.state.switchState).to.equal(true);

    device.resetSentHexCodes();

    // Should be on still with a new instance
    outletAccessory = new Outlet(null, config, 'FakeServiceManager')
    expect(outletAccessory.state.switchState).to.equal(true);

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
