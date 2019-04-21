const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const ping = require('../helpers/ping');
const BroadlinkRMAccessory = require('./accessory');

class TVAccessory extends BroadlinkRMAccessory {
  constructor(log, config = {}, serviceManagerType) {
    super(log, config, serviceManagerType);

    if (!config.isUnitTest) this.checkPing(ping);
  }

  setDefaults() {
    const { config } = this;
    config.pingFrequency = config.pingFrequency || 1;

    config.offDuration = config.offDuration || 60;
    config.onDuration = config.onDuration || 60;

    if (
      config.enableAutoOn === undefined &&
      config.disableAutomaticOn === undefined
    ) {
      config.enableAutoOn = false;
    } else if (config.disableAutomaticOn !== undefined) {
      config.enableAutoOn = !config.disableAutomaticOn;
    }

    if (
      config.enableAutoOff === undefined &&
      config.disableAutomaticOff === undefined
    ) {
      config.enableAutoOff = false;
    } else if (config.disableAutomaticOff !== undefined) {
      config.enableAutoOff = !config.disableAutomaticOff;
    }
  }

  reset() {
    super.reset();

    // Clear Timeouts
    if (this.delayTimeoutPromise) {
      this.delayTimeoutPromise.cancel();
      this.delayTimeoutPromise = null;
    }

    if (this.autoOffTimeoutPromise) {
      this.autoOffTimeoutPromise.cancel();
      this.autoOffTimeoutPromise = null;
    }

    if (this.autoOnTimeoutPromise) {
      this.autoOnTimeoutPromise.cancel();
      this.autoOnTimeoutPromise = null;
    }
  }

  checkAutoOnOff() {
    this.reset();
    this.checkAutoOn();
    this.checkAutoOff();
  }

  checkPing(ping) {
    const { config } = this;
    let { pingIPAddress, pingFrequency } = config;

    if (!pingIPAddress) return;

    // Setup Ping-based State
    ping(pingIPAddress, pingFrequency, this.pingCallback.bind(this));
  }

  pingCallback(active) {
    const { config, state, serviceManager } = this;

    if (config.pingIPAddressStateOnly) {
      state.switchState = active ? true : false;
      serviceManager.refreshCharacteristicUI(Characteristic.Active);

      return;
    }

    const value = active ? true : false;
    serviceManager.setCharacteristic(Characteristic.Active, value);
  }

  async setSwitchState(hexData) {
    const { data, host, log, name, debug } = this;

    this.reset();

    if (hexData) await this.performSend(hexData);

    this.checkAutoOnOff();
  }

  async checkAutoOff() {
    await catchDelayCancelError(async () => {
      const { config, log, name, state, serviceManager } = this;
      let { disableAutomaticOff, enableAutoOff, onDuration } = config;

      if (state.switchState && enableAutoOff) {
        log(
          `${name} setSwitchState: (automatically turn off in ${onDuration} seconds)`
        );

        this.autoOffTimeoutPromise = delayForDuration(onDuration);
        await this.autoOffTimeoutPromise;

        serviceManager.setCharacteristic(Characteristic.Active, false);
      }
    });
  }

  async checkAutoOn() {
    await catchDelayCancelError(async () => {
      const { config, log, name, state, serviceManager } = this;
      let { disableAutomaticOn, enableAutoOn, offDuration } = config;

      if (!state.switchState && enableAutoOn) {
        log(
          `${name} setSwitchState: (automatically turn on in ${offDuration} seconds)`
        );

        this.autoOnTimeoutPromise = delayForDuration(offDuration);
        await this.autoOnTimeoutPromise;

        serviceManager.setCharacteristic(Characteristic.Active, true);
      }
    });
  }

  getServices() {
    const services = this.getInformationServices();

    services.push(this.serviceManager.service);
    services.push(...this.serviceManagers);

    return services;
  }

  setupServiceManager() {
    const { data, name, config, serviceManagerType, log } = this;
    const { on, off } = data || {};

    this.serviceManagers = [];
    this.serviceManager = new ServiceManagerTypes[serviceManagerType](
      name,
      Service.Television,
      log
    );

    this.serviceManager.setCharacteristic(Characteristic.ConfiguredName, name);

    this.serviceManager.setCharacteristic(
      Characteristic.SleepDiscoveryMode,
      Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
    );

    this.serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.Active,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: on || data,
        offData: off || undefined,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });

    this.serviceManager.setCharacteristic(Characteristic.ActiveIdentifier, 1);

    this.serviceManager
      .getCharacteristic(Characteristic.ActiveIdentifier)
      .on('get', (callback) => callback(null, this.state.input || 0))
      .on('set', (newValue, callback) => {
        if (
          !data ||
          !data.inputs ||
          !data.inputs[newValue] ||
          !data.inputs[newValue].data
        ) {
          log(`${name} Input: No input data found. Ignoring request.`);
          callback(null);
          return;
        }

        this.state.input = newValue;
        this.performSend(data.inputs[newValue].data);

        callback(null);
      });

    this.serviceManager
      .getCharacteristic(Characteristic.RemoteKey)
      .on('set', (newValue, callback) => {
        if (!data || !data.remote) {
          log(`${name} RemoteKey: No remote keys found. Ignoring request.`);
          callback(null);
          return;
        }

        let hexData = null;
        switch (newValue) {
          case Characteristic.RemoteKey.REWIND:
            hexData = data.remote.rewind; // not found yet
            break;
          case Characteristic.RemoteKey.FAST_FORWARD:
            hexData = data.remote.fastForward; // not found yet
            break;
          case Characteristic.RemoteKey.NEXT_TRACK:
            hexData = data.remote.nextTrack; // not found yet
            break;
          case Characteristic.RemoteKey.PREVIOUS_TRACK:
            hexData = data.remote.previousTrack; // not found yet
            break;
          case Characteristic.RemoteKey.ARROW_UP:
            hexData = data.remote.arrowUp;
            break;
          case Characteristic.RemoteKey.ARROW_DOWN:
            hexData = data.remote.arrowDown;
            break;
          case Characteristic.RemoteKey.ARROW_LEFT:
            hexData = data.remote.arrowLeft;
            break;
          case Characteristic.RemoteKey.ARROW_RIGHT:
            hexData = data.remote.arrowRight;
            break;
          case Characteristic.RemoteKey.SELECT:
            hexData = data.remote.select;
            break;
          case Characteristic.RemoteKey.BACK:
            hexData = data.remote.back;
            break;
          case Characteristic.RemoteKey.EXIT:
            hexData = data.remote.exit;
            break;
          case Characteristic.RemoteKey.PLAY_PAUSE:
            hexData = data.remote.playPause;
            break;
          case Characteristic.RemoteKey.INFORMATION:
            hexData = data.remote.info;
            break;
        }

        if (!hexData) {
          log(`${name} RemoteKey: No IR code found for received remote input!`);
          callback(null);
          return;
        }

        this.performSend(hexData);
        callback(null);
      });

    this.serviceManager
      .getCharacteristic(Characteristic.PictureMode)
      .on('set', function(newValue, callback) {
        // Not found yet
        console.log('set PictureMode => setNewValue: ' + newValue);
        callback(null);
      });

    this.serviceManager
      .getCharacteristic(Characteristic.PowerModeSelection)
      .on('set', (newValue, callback) => {
        if (!data || !data.powerMode) {
          log(
            `${name} PowerModeSelection: No settings data found. Ignoring request.`
          );
          callback(null);
          return;
        }

        let hexData = null;
        switch (newValue) {
          case Characteristic.PowerModeSelection.SHOW: // TV settings
            hexData = data.powerMode.show;
            break;
          case Characteristic.PowerModeSelection.HIDE: // not found yet
            hexData = data.powerMode.hide;
            break;
        }

        if (!hexData) {
          log(
            `${name} PowerModeSelection: No IR code found for received remote input!`
          );
          callback(null);
          return;
        }

        this.performSend(hexData);
        callback(null);
      });

    const speakerService = new Service.TelevisionSpeaker('Speaker', 'Speaker');

    speakerService.setCharacteristic(
      Characteristic.Active,
      Characteristic.Active.ACTIVE
    );
    speakerService.setCharacteristic(
      Characteristic.VolumeControlType,
      Characteristic.VolumeControlType.ABSOLUTE
    );

    speakerService
      .getCharacteristic(Characteristic.VolumeSelector)
      .on('set', (newValue, callback) => {
        if (!data || !data.volume) {
          log(
            `${name} VolumeSelector: No settings data found. Ignoring request.`
          );
          callback(null);
          return;
        }

        let hexData = null;
        switch (newValue) {
          case Characteristic.VolumeSelector.INCREMENT:
            hexData = data.volume.up;
            break;
          case Characteristic.VolumeSelector.DECREMENT:
            hexData = data.volume.down;
            break;
        }

        if (!hexData) {
          log(
            `${name} VolumeSelector: No IR code found for received remote input!`
          );
          callback(null);
          return;
        }

        this.performSend(hexData);
        callback(null);
      });

    this.serviceManagers.push(speakerService);

    if (data.inputs && data.inputs instanceof Array) {
      for (let i = 0; i < data.inputs.length; i++) {
        const input = data.inputs[i];
        const inputService = new Service.InputSource(`input${i}`, `input${i}`);

        inputService
          .setCharacteristic(Characteristic.Identifier, i)
          .setCharacteristic(Characteristic.ConfiguredName, input.name)
          .setCharacteristic(
            Characteristic.IsConfigured,
            Characteristic.IsConfigured.CONFIGURED
          )
          .setCharacteristic(
            Characteristic.InputSourceType,
            getInputType(input.type)
          );

        this.serviceManagers.push(inputService);
        this.serviceManager.service.addLinkedService(inputService);
      }
    }
  }
}

function getInputType(type) {
  if (!type) {
    return 0;
  }

  switch (type.toLowerCase()) {
    case 'other':
      return 0;
    case 'home_screen':
      return 1;
    case 'tuner':
      return 2;
    case 'hdmi':
      return 3;
    case 'composite_video':
      return 4;
    case 's_video':
      return 5;
    case 'component_video':
      return 6;
    case 'dvi':
      return 7;
    case 'airplay':
      return 8;
    case 'usb':
      return 9;
    case 'application':
      return 10;
  }
}

module.exports = TVAccessory;
