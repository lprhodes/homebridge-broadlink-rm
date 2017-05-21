const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class WindowCoveringAccessory extends BroadlinkRMAccessory {

  constructor (log, config) {
    super(log, config);

    // Override any user defaults
    // config.resendHexAfterReload = true;
  }

  async setTargetPosition (hexData, previousValue) {
    const { config, data, log, name, state } = this;
    const { stop } = data;
    let { initialDelay } = config;

    if (!initialDelay) initialDelay = 1;

    if (state.targetPosition === previousValue) return;

    if (stop && state.operationID ) {
      log(`${name} setTargetPosition: cancel last operation`);
      this.stop(true);
    }

    if (this.initialDelayTimeout) clearTimeout(this.initialDelayTimeout);

    this.initialDelayTimeout = setTimeout(() => {
      this.performSetTargetPosition(hexData, previousValue);
    }, initialDelay * 1000);
  }

  async performSetTargetPosition (hexData, previousValue) {
    const { config, data, log, name, state } = this;
    const { open, close, stop } = data;

    if (stop && state.operationID ) {
      log(`${name} setTargetPosition: cancel last operation`);
      this.stop(true);
    }

    state.operationID = Date.now();
    const currentOperationID = state.operationID;

    if (!state.currentPosition) state.currentPosition = 0;

    let { percentageChangePerSend } = config;
    if (!percentageChangePerSend) percentageChangePerSend = 1;

    let difference = state.targetPosition - state.currentPosition;

    state.opening = (difference > 0);
    if (!state.opening) difference = -1 * difference;

    // If the target position is not a multiple of the percentageChangePerSend
    // value then make it so
    if (state.targetPosition % percentageChangePerSend !== 0) {
      let roundedTargetPosition;

      if (state.opening) roundedTargetPosition = Math.ceil(state.targetPosition / percentageChangePerSend) * percentageChangePerSend;
      if (!state.opening) roundedTargetPosition = Math.floor(state.targetPosition / percentageChangePerSend) * percentageChangePerSend;

      state.targetPosition = roundedTargetPosition;

      log(`${name} setTargetPosition: (rounding to multiple of percentageChangePerSend; ${roundedTargetPosition}) ${currentOperationID}`);

      setTimeout(() => {
        if (currentOperationID !== state.operationID) return;

        this.windowCoveringService.setCharacteristic(Characteristic.TargetPosition, roundedTargetPosition);
      }, 200);
    }

    const increments = Math.ceil(difference / percentageChangePerSend);

    hexData = state.opening ? open : close

    this.openOrClose({ hexData, increments, previousValue, currentOperationID }) // Perform this asynchronously i.e. without await
  }

  async openOrClose ({ hexData, increments, previousValue, currentOperationID }) {
    let { config, data, host, name, log, state } = this;
    let { totalDurationOpen, totalDurationClose } = config;
    const { stop } = data;

    if (state.opening) {
      setTimeout(() => {
        this.windowCoveringService.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.INCREASING);
      }, 200);
    } else {
      setTimeout(() => {
        this.windowCoveringService.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.DECREASING);
      }, 200);
    }

    log(`${name} setTargetPosition: currently ${state.currentPosition}%, moving to ${state.targetPosition}%`);

    let difference = state.targetPosition - state.currentPosition
    if (!state.opening) difference = -1 * difference;

    const fullOpenCloseTime = state.opening ? totalDurationOpen : totalDurationClose;
    const durationPerPercentage = fullOpenCloseTime / 100;
    const totalTime = durationPerPercentage * difference;

    log(`${name} setTargetPosition: ${totalTime}s (${fullOpenCloseTime} / 100 * ${difference}) until auto-stop ${currentOperationID}`);

    sendData({ host, hexData, log, name });

    this.updateCurrentPositionAtIntervals(currentOperationID)

    this.autoStopTimeout = setTimeout(() => {
      const sendStopHex = (state.targetPosition !== 100 && state.targetPosition !== 0);
      this.stop(sendStopHex);

      this.windowCoveringService.setCharacteristic(Characteristic.CurrentPosition, state.targetPosition);
    }, totalTime * 1000)
  }

  stop (sendHex) {
    const { data, host, log, name, state } = this;
    const { stop } = data;

    if (this.autoStopTimeout) clearTimeout(this.autoStopTimeout)
    if (this.updateCurrentPositionTimeout) clearTimeout(this.updateCurrentPositionTimeout)

    state.operationID = undefined;
    state.opening = undefined;

    this.windowCoveringService.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);

    log(`${name} setTargetPosition: stop`);
    if (sendHex && stop) sendData({ host, hexData: stop, log, name });
  }

  updateCurrentPositionAtIntervals (currentOperationID) {
    const { config, state } = this;
    let { totalDurationOpen, totalDurationClose } = config;

    let fullOpenCloseTime = state.opening ? totalDurationOpen : totalDurationClose;
    let durationPerPercentage = fullOpenCloseTime / 100;

    this.updateCurrentPositionTimeout = setTimeout(() => {
      if (currentOperationID !== state.operationID) return;

      let currentValue = state.currentPosition || 0;
      if (state.opening) currentValue++;
      if (!state.opening) currentValue--;

      this.windowCoveringService.setCharacteristic(Characteristic.CurrentPosition, currentValue);
      this.updateCurrentPositionAtIntervals(currentOperationID);
    }, durationPerPercentage * 1000)

  }

  getServices () {
    const services = super.getServices();

    const { data, name } = this;

    const service = new Service.WindowCovering(name);
    this.addNameService(service);

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.CurrentPosition,
      propertyName: 'currentPosition',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.PositionState,
      propertyName: 'positionState',
      defaultValue: Characteristic.PositionState.STOPPED
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetPosition,
      propertyName: 'targetPosition',
      setValuePromise: this.setTargetPosition.bind(this)
    });

    // this.createToggleCharacteristic({
    //   service,
    //   characteristicType: Characteristic.CurrentHorizontalTiltAngle,
    //   propertyName: 'currentHorizontalTiltAngle',
    // });
    //
    // this.createToggleCharacteristic({
    //   service,
    //   characteristicType: Characteristic.CurrentVerticalTiltAngle,
    //   propertyName: 'currentVerticalTiltAngle',
    // });
    //
    // this.createToggleCharacteristic({
    //   service,
    //   characteristicType: Characteristic.TargetHorizontalTiltAngle,
    //   propertyName: 'targetHorizontalTiltAngle',
    // });
    //
    // this.createToggleCharacteristic({
    //   service,
    //   characteristicType: Characteristic.TargetVerticalTiltAngle,
    //   propertyName: 'targetVerticalTiltAngle',
    // });
    //
    // this.createToggleCharacteristic({
    //   service,
    //   characteristicType: Characteristic.HoldPosition,
    //   propertyName: 'holdPosition',
    // });
    //
    // this.createToggleCharacteristic({
    //   service,
    //   characteristicType: Characteristic.ObstructionDetected,
    //   propertyName: 'obstructionDetected',
    //   defaultValue: false
    // });

    this.windowCoveringService = service;

    services.push(service);

    return services;
  }
}

module.exports = WindowCoveringAccessory;
