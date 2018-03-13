const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const ping = require('./helpers/fakePing')
const FakeServiceManager = require('./helpers/fakeServiceManager')

const delayForDuration = require('../helpers/delayForDuration')
const { getDevice } = require('../helpers/getDevice')

const { SwitchMulti } = require('../accessories')

// TODO: Check cancellation of timeouts

describe('switchMultiAccessory', () => {

  // Switch Turn On
  it('turns on', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      persistState: false
    }
    
    
    const switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    
    expect(switchAccessory.state.switchState).to.equal(true);

    // Check that only one code has been sent
    let sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(1);
    
    // Wait for multiple codes to be sent
    await delayForDuration(0.3)

    // Check hex code was sent
    const hasSentCode = device.hasSentCodes([ 'ON1', 'ON2' ]);
    expect(hasSentCode).to.equal(true);

    // Check that only two codes have been sent
    sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  });


  // Switch Turn On then Off
  it('turns off', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      persistState: false
    }
    
    
    const switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')

    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(switchAccessory.state.switchState).to.equal(true);
    
    // Wait for multiple codes to be sent
    await delayForDuration(0.3)
    
    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, false)
    expect(switchAccessory.state.switchState).to.equal(false);

    // Check that only one code has been sent
    let sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(3);
    
    // Wait for multiple codes to be sent
    await delayForDuration(0.3)

    // Check hex code was sent
    const hasSentCode = device.hasSentCodes([ 'OFF1', 'OFF2' ]);
    expect(hasSentCode).to.equal(true);

    // Check that only one code has been sent
    sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(4);
  });


  // Auto Off
  it('"enableAutoOff": true, "onDuration": 1', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      persistState: false,
      enableAutoOff: true,
      onDuration: 1
    }
    
    const switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')


    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(switchAccessory.state.switchState).to.equal(true);

    // Wait for multiple codes to be sent
    await delayForDuration(0.3)

    // Expecting on after 0.4s total
    await delayForDuration(0.4)
    expect(switchAccessory.state.switchState).to.equal(true);
    
    // Expecting off after 1.1s total
    await delayForDuration(0.7)
    expect(switchAccessory.state.switchState).to.equal(false);
  }).timeout(4000);


  // Auto On
  it('"enableAutoOn": true, "offDuration": 1', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      persistState: false,
      enableAutoOn: true,
      offDuration: 1
    }
    
    const switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')

    // Turn On Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(switchAccessory.state.switchState).to.equal(true);

    await delayForDuration(0.3)

    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, false)
    expect(switchAccessory.state.switchState).to.equal(false);

    await delayForDuration(0.3)
    await delayForDuration(0.4)

    // Expecting off after 0.4s total
    expect(switchAccessory.state.switchState).to.equal(false);
    
    await delayForDuration(0.7)
    // Expecting on after 1.1s total
    expect(switchAccessory.state.switchState).to.equal(true);
  }).timeout(4000);


  // Persist State 
  it('"persistState": true', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      name: 'Unit Test Switch',
      persistState: true
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    
    expect(switchAccessory.state.switchState).to.equal(true);
    switchAccessory.reset();

    // Should still be on when loading within a new instance
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(true);
    
    // Turn Off Switch
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, false)
    expect(switchAccessory.state.switchState).to.equal(false);

    // Should still be off when loading within a new instance
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(false);
  });

  it('"persistState": false', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      name: 'Unit Test Switch',
      persistState: false
    }
    
    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(switchAccessory.state.switchState).to.equal(true);
    switchAccessory.reset();

    // Should be off again with a new instance
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
  });


  // IP Address used to for state
  it('"pingIPAddress": "192.168.1.1", host up', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      pingIPAddress: '192.168.1.1',
      persistState: false,
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(true);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddress": "192.168.1.1", host down', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      pingIPAddress: '192.168.1.1',
      persistState: false,
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: false }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(false);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": true, "pingIPAddress": "192.168.1.1", host up', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      pingIPAddress: '192.168.1.1',
      persistState: false,
      pingIPAddressStateOnly: true,      
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);
    expect(switchAccessory.state.switchState).to.equal(true);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });

  it('"pingIPAddressStateOnly": false, "pingIPAddress": "192.168.1.1", host up', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      pingIPAddress: '192.168.1.1',
      persistState: false,
      pingIPAddressStateOnly: false,      
      isUnitTest: true
    }
    
    let switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(undefined);
    
    const pingInterval = switchAccessory.checkPing(ping.bind({ isActive: true }))

    await delayForDuration(0.3)
    expect(switchAccessory.state.switchState).to.equal(true);
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    // Stop the ping setInterval
    clearInterval(pingInterval)
  });


  // Ensure the hex is resent after reload
  it('"resendHexAfterReload": true, "persistState": true', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      persistState: true,
      resendHexAfterReload: true,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }
    
    

    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)
    expect(switchAccessory.state.switchState).to.equal(true);
    
    // Wait for multiple codes to be sent
    await delayForDuration(0.3)

    device.resetSentHexCodes()

    // Should be on still with a new instance
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(true);

    // We should find that setCharacteristic has been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)
    
    // Wait for multiple codes to be sent
    await delayForDuration(0.3)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(true);

    // Check ON hex code was sent
    const hasSentOnCode = device.hasSentCodes([ 'ON1', 'ON2' ]);
    expect(hasSentOnCode).to.equal(true);

    // Check that only one code has been sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  });


  // Ensure the hex is not resent after reload
  it('"resendHexAfterReload": false, "persistState": true', async () => {
    const { device } = setup();

    const config = {
      data: {
        on: [ 'ON1', 'ON2' ],
        off: [ 'OFF1', 'OFF2' ]
      },
      host: device.host.address,
      interval: 0.1,
      persistState: true,
      resendHexAfterReload: false,
      resendDataAfterReloadDelay: 0.1,
      isUnitTest: true
    }

    let switchAccessory

    // Turn On Switch
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    switchAccessory.serviceManager.setCharacteristic(Characteristic.On, true)

    // Wait for multiple codes to be sent
    await delayForDuration(0.3)

    device.resetSentHexCodes()

    expect(switchAccessory.state.switchState).to.equal(true);

    // Should be on still with a new instance
    switchAccessory = new SwitchMulti(log, config, 'FakeServiceManager')
    expect(switchAccessory.state.switchState).to.equal(true);

    // We should find that setCharacteristic has not been called after a duration of resendHexAfterReloadDelay
    await delayForDuration(0.3)

    // Wait for multiple codes to be sent
    await delayForDuration(0.3)
    expect(switchAccessory.serviceManager.hasRecordedSetCharacteristic).to.equal(false);

    // Check ON hex code was not sent
    const hasSentOnCode = device.hasSentCodes([ 'ON1', 'ON2' ]);
    expect(hasSentOnCode).to.equal(false);

    // Check that no code was sent
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
  });
})
