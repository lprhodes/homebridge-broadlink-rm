const sendData = require('../helpers/sendData');
const delayForDuration = require('../helpers/delayForDuration');
const BroadlinkRMAccessory = require('./accessory');

class WindowCoveringAccessory extends BroadlinkRMAccessory {

  async setTargetPosition (hexData, previousValue) {
    if (this.targetPosition === previousValue) return;

    const { config, data, log, name } = this;
    const { initialDelay } = config;
    const { stop } = data;

    if (stop && this.operationID ) {
      log(`${name} setTargetPosition: cancel last operation`);
      this.stop();
    }

    if (this.initialDelayTimeout) clearTimeout(this.initialDelayTimeout);

    this.initialDelayTimeout = setTimeout(() => {
      this.performSetTargetPosition(hexData, previousValue);
    }, 1000);
  }

  async performSetTargetPosition (hexData, previousValue) {
    const { config, data, log, name } = this;
    const { open, close, stop } = data;

    if (stop && this.operationID ) {
      log(`${name} setTargetPosition: cancel last operation`);
      this.stop();
    }

    this.operationID = Date.now();
    const currentOperationID = this.operationID;

    if (!this.currentPosition) this.currentPosition = 0;

    let { percentageChangePerSend } = config;
    if (!percentageChangePerSend) percentageChangePerSend = 1;

    let difference = this.targetPosition - this.currentPosition;

    this.opening = (difference > 0);
    if (!this.opening) difference = -1 * difference;

    // If the target position is not a multiple of the percentageChangePerSend
    // value then make it so
    if (this.targetPosition % percentageChangePerSend !== 0) {
      let roundedTargetPosition;

      if (this.opening) roundedTargetPosition = Math.ceil(this.targetPosition / percentageChangePerSend) * percentageChangePerSend;
      if (!this.opening) roundedTargetPosition = Math.floor(this.targetPosition / percentageChangePerSend) * percentageChangePerSend;

      this.targetPosition = roundedTargetPosition;

      log(`${name} setTargetPosition: (rounding to multiple of percentageChangePerSend; ${roundedTargetPosition}) ${currentOperationID}`);

      setTimeout(() => {
        if (currentOperationID !== this.operationID) return;

        this.windowCoveringService.setCharacteristic(Characteristic.TargetPosition, roundedTargetPosition);
      }, 200);
    }

    const increments = Math.ceil(difference / percentageChangePerSend);

    hexData = this.opening ? open : close

    this.openOrClose({ hexData, increments, previousValue, currentOperationID }) // Perform this asynchronously i.e. without await
  }

  async openOrClose ({ hexData, increments, previousValue, currentOperationID }) {
    let { config, data, host, name, log } = this;
    let { hold, percentageChangePerSend, interval, disableAutomaticStop, onDuration, onDurationOpen, onDurationClose, totalDurationOpen, totalDurationClose } = config;
    const { stop } = data;

    if (interval === undefined) interval = 0.5;
    if (hold === undefined) hold = true;
    if (!percentageChangePerSend) percentageChangePerSend = 10;
    if (disableAutomaticStop === undefined) disableAutomaticStop = true;
    if (!onDuration) onDuration = this.opening ? onDurationOpen : onDurationClose;
    if (!onDuration) onDuration = 2;

    if (this.opening) {
      this.windowCoveringService.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.INCREASING);
    } else {
      this.windowCoveringService.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.DECREASING);
    }

    if (hold) {
      log(`${name} setTargetPosition: currently ${this.currentPosition}%, moving to ${this.targetPosition}%`);

      let difference = this.targetPosition - this.currentPosition
      if (!this.opening) difference = -1 * difference;

      let fullOpenCloseTime = this.opening ? totalDurationOpen : totalDurationClose;
      let totalTime;

      if (fullOpenCloseTime) {
        const durationPerPercentage = fullOpenCloseTime / 100;
        totalTime = durationPerPercentage * difference;

        log(`${name} setTargetPosition: ${totalTime}s (${fullOpenCloseTime} / 100 * ${difference}) until auto-stop ${currentOperationID}`);

      } else {
        const durationPerPercentage = onDuration / percentageChangePerSend;
        totalTime = durationPerPercentage * difference;

        log(`${name} setTargetPosition: ${totalTime}s (${onDuration} / ${percentageChangePerSend} * ${difference}) until auto-stop ${currentOperationID}`);
      }


      sendData({ host, hexData, log });

      this.updateCurrentPositionAtIntervals(currentOperationID)

      this.autoStopTimeout = setTimeout(() => {
        this.stop();

        this.windowCoveringService.setCharacteristic(Characteristic.CurrentPosition, this.targetPosition);
      }, totalTime * 1000)
    } else {
      let currentValue = this.currentPosition || 0;
      // Itterate through each hex config in the array
      for (let index = 0; index < increments; index++) {
        if (currentOperationID !== this.operationID) return;

        if (this.opening) currentValue += percentageChangePerSend;
        if (!this.opening) currentValue -= percentageChangePerSend;

        sendData({ host, hexData, log });
        this.windowCoveringService.setCharacteristic(Characteristic.CurrentPosition, currentValue);

        if (!disableAutomaticStop) {
          log(`${name} setTargetPosition: waiting ${onDuration}s until auto-stop ${currentOperationID}`);
          await delayForDuration(onDuration);
          if (currentOperationID !== this.operationID) return;

          if (!stop) throw new Error('An "stop" hex code must be set if "disableAutomaticStop" is set to false.')
          this.windowCoveringService.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);

          log(`${name} setTargetPosition: auto-stop`);
          sendData({ host, hexData: stop, log });
        }

        log(`${name} setTargetPosition: waiting ${interval}s for next send ${currentOperationID}`);

        if (index < sendCount) await delayForDuration(interval);
        if (currentOperationID !== this.operationID) return;
      }
    }
  }

  stop () {
    const { data, host, log, name } = this;
    const { stop } = data;

    if (this.autoStopTimeout) clearTimeout(this.autoStopTimeout)
    if (this.updateCurrentPositionTimeout) clearTimeout(this.updateCurrentPositionTimeout)

    this.operationID = undefined;
    this.opening = undefined;

    this.windowCoveringService.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);

    log(`${name} setTargetPosition: stop`);
    if (stop) sendData({ host, hexData: stop, log });
  }

  updateCurrentPositionAtIntervals (currentOperationID) {
    const { config } = this;
    let { onDuration, onDurationOpen, onDurationClose, percentageChangePerSend, totalDurationOpen, totalDurationClose } = config;

    if (!onDuration) onDuration = this.opening ? onDurationOpen : onDurationClose;
    if (!onDuration) onDuration = 2;


    let fullOpenCloseTime = this.opening ? totalDurationOpen : totalDurationClose;
    let durationPerPercentage;

    if (fullOpenCloseTime) {
      durationPerPercentage = fullOpenCloseTime / 100;
    } else {
      durationPerPercentage = onDuration / percentageChangePerSend;
    }

    this.updateCurrentPositionTimeout = setTimeout(() => {
      if (currentOperationID !== this.operationID) return;

      let currentValue = this.currentPosition || 0;
      if (this.opening) currentValue++;
      if (!this.opening) currentValue--;

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
      characteristicType: Characteristic.TargetPosition,
      propertyName: 'targetPosition',
      setValuePromise: this.setTargetPosition.bind(this)
    });

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
      characteristicType: Characteristic.CurrentHorizontalTiltAngle,
      propertyName: 'currentHorizontalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.CurrentVerticalTiltAngle,
      propertyName: 'currentVerticalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetHorizontalTiltAngle,
      propertyName: 'targetHorizontalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.TargetVerticalTiltAngle,
      propertyName: 'targetVerticalTiltAngle',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.HoldPosition,
      propertyName: 'holdPosition',
    });

    this.createToggleCharacteristic({
      service,
      characteristicType: Characteristic.ObstructionDetected,
      propertyName: 'obstructionDetected',
      defaultValue: false
    });

    this.windowCoveringService = service;

    services.push(service);

    return services;
  }
}

module.exports = WindowCoveringAccessory;
