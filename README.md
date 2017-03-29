# Homebridge Broadlink RM

Broadlink RM Mini and Pro plugin for [Homebridge](https://github.com/nfarina/homebridge)

This allows you to control your RM Mini and Pro with HomeKit and Siri.

## Installation

1. Install homebridge using: `sudo npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-broadlink-rm`
3. Update your configuration file. (See config-sample.json)

## Broadlink RM Device Discovery

As of version 1.0.0 your Broadlink RM Device is automatically discovered so you no longer need to specify a "host" value.

## Learning Hex IR codes

A "Learn IR"" accessory will automatically be added to the Home app and is dedicated to learning IR codes. Simply toggle the switch on, perform the IR command in front of your Broadlink RM device and copy the HEX output from the hombridge console log to wherever you want the code in the config.

The switch will toggle off automatically once the IR code has been received or 10 seconds has passed.

You can optionally stop attempting to learn IR by toggling the switch off yourself.

## Accessory Type Configuration

### "learn-ir"

You shouldn't need to use this accessory type as we add one automatically but if you have multiple Broadlink RM devices then it may be useful to specify multiple devices with the "learn-ir" type along with a host so that you can learn from each of them.

key | description | example | default
--- | ----------- | ------- | -------
name (required) | A descriptor for the accessory that will show in HomeKit apps. | "TV" | -
type (required) | The type of accessory. i.e. "learn-ir" | "learn-ir" | -
data (required) | Hex data stored as a key-value JSON object. | See below. | -
host (optional) | The IP or MAC address of the Broadlink RM device. | 192.168.1.32 | (auto-discovered)

#### "data" key-value object
key | description
--- | -----------
on | A hex code string to be sent when the switch is changed to the on position.
off | A hex code string to be sent when the switch is changed to the off position.

### "switch"

Turn the switch on and the "on" hex code is sent, turn it off and the "off" hex code is sent.

key | description | example | default
--- | ----------- | ------- | -------
name (required) | A descriptor for the accessory that will show in HomeKit apps. | "TV" | -
type (required) | The type of accessory. i.e. "switch" | "switch" | -
data (required) | Hex data stored as a key-value JSON object. | See below. | -
host (optional) | The IP or MAC address of the Broadlink RM device. | 192.168.1.32 | (auto-discovered)

#### "data" key-value object
key | description
--- | -----------
on | A hex code string to be sent when the switch is changed to the on position.
off | A hex code string to be sent when the switch is changed to the off position.


### "switch-repeat"

Turn the switch on and the switch will repeatedly send the hex code until it reaches the defined send count. It then turns itself off automatically. You can also set the interval between each send.

key | description | example | default
--- | ----------- | ------- | -------
name (required) | A descriptor for the accessory that will show in HomeKit apps. | "TV Volume Up" | -
type (required) | The type of accessory. i.e. "switch-repeat" | "switch-repeat" | -
data (required) | Hex data stored as string. | 26005800000... | -
sendCount (optional) | The number of times the hex code should be sent. | 5 | 1
interval (optional) | The amount of time between each send of a hex code in seconds. | 0.3 | 1
host (optional) | The IP or MAC address of the Broadlink RM device. | 192.168.1.32 | (auto-discovered)

### "air-conditioner"

This allows you to send a hex code for any temperature that you've defined a hex code for. If you simply want to heat up or cool down a room (and not learn every single temperature code) you can just set hex codes for the lowest and highest temperatures and those will be used whatever temperature you request.

key | description | example | default
--- | ----------- | ------- | -------
name (required) | A descriptor for the accessory that will show in HomeKit apps. | "TV Volume Up" | -
type (required) | The type of accessory. i.e. "air-conditioner" | "air-conditioner" | -
data (required) | Hex data stored as a key-value JSON object. | See below. | -
minTemperature (optional) | The number of times the hex code should be sent. | 14 | 0
maxTemperature (optional) | The amount of time between each send of a hex code in seconds. | 28 | 30
temperatureDisplayUnits (optional) | Specify celsius or fahrenheit. | F | C
defaultCoolTemperature (optional) | The temperature that will be requested when no hex code exists for the specified temperature. | 14 | 16
defaultHeatTemperature (optional) | The temperature that will be requested when no hex code exists for the specified temperature. | 28 | 30
heatTemperature (optional) | The temperature at which we change the UI to show that we're heating. Also used to determine whether "defaultCoolTemperature" or "defaultHeatTemperature" is used. | 20 | 22
replaceAutoMode (optional) | When we turn on the thermostat with Siri it sets the mode as "auto" which isn't  supported at this time so we set the mode to "cool" or "heat" instead depending on the value of this key. | "heat" | "cool"
host (optional) | The IP or MAC address of the Broadlink RM device. | 192.168.1.32 | (auto-discovered)

#### "data" key-value object
key | description
--- | -----------
off | A hex code string to be sent when the air conditioner is asked to be turned off.
temperatureX | A key-value JSON object where X is any required temperature e.g. "temperature30".

#### "temperatureX" key-value object
key | description
--- | -----------
data | Hex data stored as string.
pseudo-mode | The mode we set when this hex is sent. i.e. "heat" or "cool". For graphical purposes only (hence use of the term "pseudo").


## Air Conditioner Notes

There looks to be a glitch in the Apple Home app in that nothing happens when setting the mode to Off when you've turned the thermostat on by setting a specific temperature. Siri and other HomeKit apps don't have the same glitch. As a work-around you can just select a different mode and then press Off. This only happens the first time after launching homebridge.


## Multiple Broadlink RM Devices

If you have multiple devices (e.g. one in the bedroom, one in the lounge) then you  can additionally specify a `"host"` value with the Broadlink RM's IP or MAC address.

If you wish to have multiple Learn IR accessories (e.g. for each device) then you can add accessories with a type of `"learn-ir"` and then specify the `"host"` and `"name"` values.


## Thanks
Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.
