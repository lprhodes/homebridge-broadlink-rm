//Credit: https://github.com/nfarina/homebridge/blob/master/lib/server.js#L425
function createAccessory(
  accessoryInstance,
  displayName,
  accessoryType,
  { hap: { Service, Accessory, Characteristic, uuid }, platformAccessory }
) {
  const services = accessoryInstance.getServices();
  // The returned "services" for this accessory are simply an array of new-API-style
  // Service instances which we can add to a created HAP-NodeJS Accessory directly.

  const accessoryUUID = uuid.generate(accessoryType + ':' + displayName);

  const accessory = new platformAccessory(displayName, accessoryUUID);

  // listen for the identify event if the accessory instance has defined an identify() method
  if (accessoryInstance.identify)
    accessory.on('identify', function(paired, callback) {
      accessoryInstance.identify(callback);
    });

  services.forEach(function(service) {
    // if you returned an AccessoryInformation service, merge its values with ours
    if (service instanceof Service.AccessoryInformation) {
      const existingService = accessory.getService(
        Service.AccessoryInformation
      );

      // pull out any values you may have defined
      const manufacturer = service.getCharacteristic(
        Characteristic.Manufacturer
      ).value;
      const model = service.getCharacteristic(Characteristic.Model).value;
      const serialNumber = service.getCharacteristic(
        Characteristic.SerialNumber
      ).value;
      const firmwareRevision = service.getCharacteristic(
        Characteristic.FirmwareRevision
      ).value;
      const hardwareRevision = service.getCharacteristic(
        Characteristic.HardwareRevision
      ).value;

      if (manufacturer)
        existingService.setCharacteristic(
          Characteristic.Manufacturer,
          manufacturer
        );
      if (model) existingService.setCharacteristic(Characteristic.Model, model);
      if (serialNumber)
        existingService.setCharacteristic(
          Characteristic.SerialNumber,
          serialNumber
        );
      if (firmwareRevision)
        existingService.setCharacteristic(
          Characteristic.FirmwareRevision,
          firmwareRevision
        );
      if (hardwareRevision)
        existingService.setCharacteristic(
          Characteristic.HardwareRevision,
          hardwareRevision
        );
    } else {
      accessory.addService(service);
    }
  });

  return accessory;
}

module.exports = {
  createAccessory
};
