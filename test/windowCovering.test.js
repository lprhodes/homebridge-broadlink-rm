const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const FakeServiceManager = require('./helpers/fakeServiceManager')
const delayForDuration = require('../helpers/delayForDuration')
const { getDevice } = require('../helpers/getDevice')

const { WindowCovering } = require('../accessories')

const data = {
  open: 'OPEN',
  close: 'CLOSE',
  stop: 'STOP',
  openCompletely: 'OPEN_COMPLETELY',
  closeCompletely: 'CLOSE_COMPLETELY',
};

// TODO: resendData

describe('windowCoveringAccessory', () => {

  it ('default config', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 5,
      totalDurationClose: 5,
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager');
    
    expect(windowCoveringAccessory.config.initialDelay).to.equal(0.1);
  })

  it ('custom config', async () => {
    const { device } = setup();

    const config = {
      data,
      initialDelay: 0.5,
      totalDurationOpen: 5,
      totalDurationClose: 5,
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager');
    
    expect(windowCoveringAccessory.config.initialDelay).to.equal(0.5);
  })

  it ('determineOpenCloseDurationPerPercent', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 5,
      totalDurationClose: 5,
      persistState: false,
      host: device.host.address
    };
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager');

    const totalDurationOpen = 5;
    const totalDurationClose = 8;

    const openDurationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen,
      totalDurationClose
    });

    expect(openDurationPerPercent).to.equal(totalDurationOpen / 100);

    const closeDurationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: false,
      totalDurationOpen,
      totalDurationClose
    });

    expect(closeDurationPerPercent).to.equal(totalDurationClose / 100);
  })

  // Open blinds to 50%
  it('0% -> 50%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 2,
      totalDurationClose: 1,
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager')

    const durationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    // Set Blinds to 50%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 50)

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(0);

    // Check value at 50%
    await delayForDuration(50 * durationPerPercent);
    await delayForDuration(.1);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(50);

    // Check hex code was sent
    const hasSentCodes = device.hasSentCodes([ 'OPEN', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  }).timeout(6000);


  // Open blinds to 20% then 50%
  it('0% -> 20% -> 50%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 2, 
      totalDurationClose: 1,
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager')

    const durationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    // Set blinds to 20%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 20);

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(0);

    // Check value at 20%
    await delayForDuration(20 * durationPerPercent);
    await delayForDuration(.1);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(20);

    // Set blinds to 50%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 50);

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(20);

    // Check value at 50%
    await delayForDuration(50 * durationPerPercent);
    await delayForDuration(.1);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(50);

    // Check hex code was sent
    const hasSentCodes = device.hasSentCodes([ 'OPEN', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(4);
  }).timeout(6000);


  // Open blinds to 90% then close to 50%
  it('0% -> 90% -> 60%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 2, 
      totalDurationClose: 3, 
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager');

    const openDurationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    const closeDurationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: false,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    // Set blinds to 90%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 90);

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(0);

    // Check value at 90%
    await delayForDuration(90 * openDurationPerPercent);
    await delayForDuration(.1);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(90);

    // Set blinds to 60%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 60);

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(90);

    // Check value at 60%
    await delayForDuration(30 * closeDurationPerPercent);
    await delayForDuration(.1);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(60);

    // Check hex code was sent
    const hasSentCodes = device.hasSentCodes([ 'OPEN', 'CLOSE', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(4);
  }).timeout(6000);

  // Test initialDelay
  it('"initialDelay": 1', async () => {
    const { device } = setup();
  
    const config = {
      data,
      initialDelay: 1,
      totalDurationOpen: 2, 
      totalDurationClose: 1,
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager')
  
    const durationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });
  
    // Set Blinds to 10%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 10)
  
    // Wait for initialDelay. Subtract .1 to allow for minor timeout discrepancies.
    await delayForDuration(windowCoveringAccessory.config.initialDelay - .1);
  
    // Ensure `initialDelay` has been taken into account by checking that no hex codes have
    // been sent yet.
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(0);
    
  }).timeout(6000);

  
  // Open blinds to 100%
  it('0% -> 100%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 1,
      totalDurationClose: 1,
      sendStopAt100: true,
      sendStopAt0: true,
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager')

    const durationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose 
    });

    // Set Blinds to 100%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 100)

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(100);

    await delayForDuration(.1);

    // Check hex code was sent
    const hasSentCodes = device.hasSentCodes([ 'OPEN_COMPLETELY', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    const sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);
  }).timeout(6000);


  // Open blinds to 0%
  it('0% -> 100% -> 0%', async () => {
    const { device } = setup();

    const config = {
      data,
      totalDurationOpen: 1, 
      totalDurationClose: 1,
      sendStopAt100: true,
      sendStopAt0: true,
      persistState: false,
      host: device.host.address
    }
    
    const windowCoveringAccessory = new WindowCovering(null, config, 'FakeServiceManager')

    const durationPerPercent = windowCoveringAccessory.determineOpenCloseDurationPerPercent({
      opening: true,
      totalDurationOpen: config.totalDurationOpen,
      totalDurationClose: config.totalDurationClose
    });

    // Set Blinds to 100%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 100)

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(100);

    await delayForDuration(.1);

    // Check hex code was sent
    let hasSentCodes = device.hasSentCodes([ 'OPEN_COMPLETELY', 'STOP' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    let sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(2);

    // Set Blinds to 0%
    windowCoveringAccessory.serviceManager.setCharacteristic(Characteristic.TargetPosition, 0)

    // Wait for initialDelay
    await delayForDuration(windowCoveringAccessory.config.initialDelay);
    expect(windowCoveringAccessory.state.currentPosition).to.equal(0);

    await delayForDuration(.1);

    // Check hex code was sent
    hasSentCodes = device.hasSentCodes([ 'OPEN_COMPLETELY', 'STOP', 'CLOSE_COMPLETELY' ]);
    expect(hasSentCodes).to.equal(true);

    // Check the number of sent codes
    sentHexCodeCount = device.getSentHexCodeCount();
    expect(sentHexCodeCount).to.equal(4);

  }).timeout(6000);

})