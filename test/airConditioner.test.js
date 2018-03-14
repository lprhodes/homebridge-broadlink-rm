const { expect } = require('chai');

const { log, setup } = require('./helpers/setup')
const FakeServiceManager = require('./helpers/fakeServiceManager')
const hexCheck = require('./helpers/hexCheck')
const delayForDuration = require('../helpers/delayForDuration')
const { getDevice } = require('../helpers/getDevice')

const { AirCon, Switch } = require('../accessories')

const data = {
  on: 'ON',
  off: 'OFF',
  temperature16: {
    'pseudo-mode': 'cool',
    'data': 'TEMPERATURE_16'
  },
  temperature18: {
    'pseudo-mode': 'cool',
    'data': 'TEMPERATURE_18'
  },
  temperature23: {
    'pseudo-mode': 'heat',
    'data': 'TEMPERATURE_23'
  },
  temperature26: {
    'pseudo-mode': 'heat',
    'data': 'TEMPERATURE_26'
  },
  temperature30: {
    'pseudo-mode': 'heat',
    'data': 'TEMPERATURE_30'
  }
};

const defaultConfig = {
  data,
  isUnitTest: true,
  persistState: false
};

describe('airConAccessory', async () => {

  it ('default config', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address

    const config = {
      ...defaultConfig
    };
    
    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');
    
    expect(airConAccessory.config.turnOnWhenOff).to.equal(false);
    expect(airConAccessory.config.minimumAutoOnOffDuration).to.equal(120);
    expect(airConAccessory.config.minTemperature).to.equal(-15);
    expect(airConAccessory.config.maxTemperature).to.equal(50);
    expect(airConAccessory.config.units).to.equal('c');
    expect(airConAccessory.config.temperatureUpdateFrequency).to.equal(10);
    expect(airConAccessory.config.temperatureAdjustment).to.equal(0);
    expect(airConAccessory.config.defaultCoolTemperature).to.equal(16);
    expect(airConAccessory.config.defaultHeatTemperature).to.equal(30);
    expect(airConAccessory.config.heatTemperature).to.equal(22);
    expect(airConAccessory.config.replaceAutoMode).to.equal('cool');
  });

  it('custom config', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address

    const config = {
      ...defaultConfig,
      turnOnWhenOff: true,
      minimumAutoOnOffDuration: 60,
      minTemperature: 2,
      maxTemperature: 36,
      units: 'f',
      temperatureUpdateFrequency: 20,
      temperatureAdjustment: 1,
      defaultCoolTemperature: 17,
      defaultHeatTemperature: 32,
      heatTemperature: 20,
      replaceAutoMode: 'heat'
    };
    
    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');
    
    expect(airConAccessory.config.turnOnWhenOff).to.equal(true);
    expect(airConAccessory.config.minimumAutoOnOffDuration).to.equal(60);
    expect(airConAccessory.config.minTemperature).to.equal(2);
    expect(airConAccessory.config.maxTemperature).to.equal(36);
    expect(airConAccessory.config.units).to.equal('f');
    expect(airConAccessory.config.temperatureUpdateFrequency).to.equal(20);
    expect(airConAccessory.config.temperatureAdjustment).to.equal(1);
    expect(airConAccessory.config.defaultCoolTemperature).to.equal(17);
    expect(airConAccessory.config.defaultHeatTemperature).to.equal(32);
    expect(airConAccessory.config.heatTemperature).to.equal(20);
    expect(airConAccessory.config.replaceAutoMode).to.equal('heat');
  });


  it('tun on', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set air-con mode to "auto"
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.AUTO);

    await delayForDuration(0.6);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_16' ], count: 1 });

    // Check `replaceAutoMode` worked as expected
    expect(airConAccessory.state.targetHeatingCoolingState).to.equal(Characteristic.TargetHeatingCoolingState.COOL);
  });

  it('tun off', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set air-con mode to "auto"
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.AUTO);

    await delayForDuration(0.6);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_16' ], count: 1 });

    await delayForDuration(0.3);

    // Set air-con mode to "off"
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.OFF);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_16', 'OFF' ], count: 2 });
  });


  it('set heat', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set air-con mode to "auto"
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.HEAT);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_30' ], count: 1 });
  });

  it('set cool', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set air-con mode to "auto"
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.COOL);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_16' ], count: 1 });
  });


  it('set heat temperature', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 26);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_26' ], count: 1 });
  });

  it('set cool temperature', async () => {

    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 18);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_18' ], count: 1 });
  });


  it('set missing heat temperature', async () => {

    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 24);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_30' ], count: 1 });
  });

  it('set missing cool temperature', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 20);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_16' ], count: 1 });
  });

  it ('"turnOnWhenOff": true', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      turnOnWhenOff: true
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 26);

    await delayForDuration(1);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_26', 'ON' ], count: 2 });
  });

  it ('"allowResend": true', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      allowResend: true
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 26);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_26' ], count: 1 });

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 26);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_26' ], count: 2 });
  });

  it ('"allowResend": false', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      allowResend: false
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 26);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_26' ], count: 1 });

    // Set temperature to be above heatTemperature
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetTemperature, 26);

    await delayForDuration(0.3);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_26' ], count: 1 });
  });


  it('auto-heat & "minimumAutoOnOffDuration": 0.5', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      autoHeatTemperature: 18,
      autoCoolTemperature: 27,
      minimumAutoOnOffDuration: 1
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    device.sendFakeOnCallback('temperature', 17)

    await delayForDuration(0.3);
    
    // Check auto-on was performed by ensuring hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_30' ], count: 1 });

    // Test `minimumAutoOnOffDuration` by forcing auto-on/off check with a normal temperature
    // Use a temperature lower than `autoCoolTemperature` so that the air-con should automatically turn off
    await delayForDuration(0.3);

    airConAccessory.updateTemperatureUI();
    
    device.sendFakeOnCallback('temperature', 23)
    
    await delayForDuration(0.3);
    
    // No more hex codes should have been sent yet due to `minimumAutoOnOffDuration`
    hexCheck({ device, codes: [ 'TEMPERATURE_30' ], count: 1 });

    await delayForDuration(0.3);
    
    // Try forcing auto-on/off again with a normal temperature
    airConAccessory.updateTemperatureUI();

    device.sendFakeOnCallback('temperature', 23)

    await delayForDuration(0.3);
    
    // auto-off should have occurred by now as 1.2s has passed
    hexCheck({ device, codes: [ 'TEMPERATURE_30', 'OFF' ], count: 2 });
  }).timeout(3000);


  it('auto-cool & "minimumAutoOnOffDuration": 0.5', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      autoHeatTemperature: 18,
      autoCoolTemperature: 27,
      minimumAutoOnOffDuration: 1
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    device.sendFakeOnCallback('temperature', 28)

    await delayForDuration(0.3);
    
    // Check auto-on was performed by ensuring hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_16' ], count: 1 });

    // Test `minimumAutoOnOffDuration` by forcing auto-on/off check with a normal temperature
    // Use a temperature lower than `autoCoolTemperature` so that the air-con should automatically turn off
    await delayForDuration(0.3);

    airConAccessory.updateTemperatureUI();
    
    device.sendFakeOnCallback('temperature', 26)
    
    await delayForDuration(0.3);
    
    // No more hex codes should have been sent yet due to `minimumAutoOnOffDuration`
    hexCheck({ device, codes: [ 'TEMPERATURE_16' ], count: 1 });

    await delayForDuration(0.3);
    
    // Try forcing auto-on/off again with a normal temperature
    airConAccessory.updateTemperatureUI();

    device.sendFakeOnCallback('temperature', 26)

    await delayForDuration(0.3);
    
    // auto-off should have occurred by now as 1.2s has passed
    hexCheck({ device, codes: [ 'TEMPERATURE_16', 'OFF' ], count: 2 });
  }).timeout(3000);


  it ('"pseudoDeviceTemperature": 2', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      pseudoDeviceTemperature: 2
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    const getTemperaturePromise = airConAccessory.serviceManager.getCharacteristic(Characteristic.CurrentTemperature).getValue();

    await delayForDuration(0.3);

    device.sendFakeOnCallback('temperature', 20);

    const temperature = await getTemperaturePromise;

    expect(temperature).to.equal(2);
  });


  it ('"temperatureAdjustment": 10', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      temperatureAdjustment: 10
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    const getTemperaturePromise = airConAccessory.serviceManager.getCharacteristic(Characteristic.CurrentTemperature).getValue();

    await delayForDuration(0.3);

    device.sendFakeOnCallback('temperature', 20);

    const temperature = await getTemperaturePromise;

    expect(temperature).to.equal(30);
  });

  it ('"temperatureAdjustment": -10', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      temperatureAdjustment: -10
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    const getTemperaturePromise = airConAccessory.serviceManager.getCharacteristic(Characteristic.CurrentTemperature).getValue();

    await delayForDuration(0.3);

    device.sendFakeOnCallback('temperature', 20);

    const temperature = await getTemperaturePromise;

    expect(temperature).to.equal(10);
  });

  it ('"replaceAutoMode": "heat"', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      replaceAutoMode: 'heat'
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');

    // Set air-con mode to "auto"
    airConAccessory.serviceManager.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.AUTO);

    await delayForDuration(0.6);

    // Check hex codes were sent
    hexCheck({ device, codes: [ 'TEMPERATURE_30' ], count: 1 });

    // Check `replaceAutoMode` worked as expected
    expect(airConAccessory.state.targetHeatingCoolingState).to.equal(Characteristic.TargetHeatingCoolingState.HEAT);
  });

  it ('autoSwitch', async () => {
    const { device } = setup();
    defaultConfig.host = device.host.address
    
    const config = {
      ...defaultConfig,
      autoSwitch: 'Air-Con Auto'
    };
    
    const switchConfig = {
      ...defaultConfig,
      name: 'Air-Con Auto'
    };

    const airConAccessory = new AirCon(null, config, 'FakeServiceManager');
    const switchAccessory = new Switch(null, switchConfig, 'FakeServiceManager');

    airConAccessory.updateAccessories([ switchAccessory ]);

    expect(airConAccessory.autoSwitchAccessory).to.equal(switchAccessory)
  });
})