# Homebridge Broadlink RM

Broadlink RM Mini and Pro plugin for [Homebridge](https://github.com/nfarina/homebridge)

This allows you to control your RM Mini and Pro with HomeKit and Siri.

If you like this plugin then please star this Github repo, or better yet; [buy me a drink](https://paypal.me/lprhodes).

You can also go one step further by subscribing to the [Works with Newsletter](http://workswith.io) which will keep you informed about HomeKit, homebridge and homebridge plugins.

## Requirements

- Requires Node.js >= 7.6.0
- If you're seeing something like `ERROR LOADING PLUGIN"..."async setCharacteristicValue (props, value, callback) {` then please check your node version before creating a new issue: `node -v`.
- There's a lot of people here who have never seen config files like these before, so here's a quick tip; when you have the option of putting true or false as a value, do not put quotation marks around it. e.g. { example: false } not { example: "false" }.

## Installation

1. Install homebridge using the [directions on the project page](https://github.com/nfarina/homebridge)
2. Install this plugin using: `npm install -g homebridge-broadlink-rm`
3. Update your homebridge `config.json` file. See [config-sample.json](config-sample.json) for examples.

Example BroadlinkRM platform in the homebridge configuration:
```json
  ...
  "platforms": [
    {
      "platform":"BroadlinkRM",
      "name":"Broadlink RM",
      "accessories":[
        {
          "name":"TV On/Off",
          "type":"switch",
          "data":{
            "on":"2600500000012...",
            "off":"2600500000012..."
          }
        }
      ]
    }
  ] 
  ...
```

## Overriding the homebridge directory (AKA where the consig.json file lives)
Generally the plugin can find where your `config.json` lives as it commonly sits in the `.homebridge` directory of your user account. If you're doing something out of the ordinary however you may need to override this. You can do so by adding a `"homebridgeDirectory”` key/value pair to the platform config.

## Broadlink RM Device Discovery
As of version 1.0.0, your Broadlink RM Device is automatically discovered so you no longer need to specify a  value.

## Learning Hex IR and RF codes
"Learn" and "Scan Frequency" accessories are automatically added to the Home app (so long as you've not added either manually in the config).

Home App

Simply toggle the switch on, perform the IR or RF command in front of your Broadlink RM device and copy the HEX output from the homebridge console log to wherever you want the code in the config.

```
homebridge[16748]: [Broadlink RM] Learn Code (ready)
homebridge[16748]: [Broadlink RM] Learn Code (learned hex code: 2600500000012...)
homebridge[16748]: [Broadlink RM] Learn Code (complete)
homebridge[16748]: [Broadlink RM] Learn Code (stopped)
```

The switch will toggle off automatically once the code has been received. You can optionally stop attempting to learn a code by toggling the switch off yourself.

## Multiple Broadlink RM Devices
If you have multiple devices (e.g. one in the bedroom, one in the lounge) then you  can additionally specify the Broadlink RM's IP or MAC address in a `"host"` key/value pair on each accessory.

If you wish to have multiple Learn Code accessories (e.g. for each device) then you can add accessories with a type of `learn-code` and then specify  `"host"` and `"name"`  key/value pairs.

## Pronto IR Codes
We support the use of Pronto codes; you can put them wherever you would normally put a Broadlink IR code. Pronto codes are automatically detected by their first 4 characters being 0 i.e. `0000`.

# Accessories

## Common Accessory Configuration Keys
The following configuration keys are common between each accessory:

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`name` | A descriptor for the accessory that will show in HomeKit apps. | "TV" | - | Yes | No
`type` | The type of accessory. | "switch" | - | Yes | No
`persistState` | Determines whether the state of accessory persists after homebridge has been restarted. | false | true | No | Yes
`resendHexAfterReload` | When persistState is true (it is by default) this will resend the hex code for the last known state if homebridge is restarted. | true | false | No | Yes
`disableLogs` | Disables the log output for this accessory. | true | false | No | Yes
`debug` | Outputs some additional logs, useful for figuring out issues. | true | false | No | Yes
`host` | The IP or MAC address of the Broadlink RM device. | 192.168.1.32 | (auto-discovered) | No | No

## Hex Object Structure
Any hex value in the config can be either a hex string or a hex object that can be configured to send multiple codes.

### Hex String
When a simple hex string is used, the hex code will be sent when an accessory is turned on, but not when it is turned off.

```
{
  ...
  "data": "ON_HEX_CODE"
  ...
}
```

Sometimes, specific keys may be required such as `open`, `lock`, or `swingToggle`.
```
{
  ...
  "data": {
    "open": "OPEN_HEX_CODE"
  }
  ...
}
```


### On/Off
In switches you may want to also send an `off` hex code:

```
{
  ...
  "data": {
    on: "ON_HEX_CODE",
    off: "OFF_HEX_CODE"
  }
  ...
}
```

### Repeat
You may wish for a hex code to be sent multiple times. A delay can be added between each send of the hex code by adding an `"interval"`.

The following will perform the following sequence when turning the accessory on:

- Send "ON_HEX_CODE"
- Wait 0.3s
- Send "ON_HEX_CODE"
- Wait 0.3s
- Send "ON_HEX_CODE"

```
{
  ...
  "data": [
    {
      "data": "ON_HEX_CODE",
      "sendCount": 3,
      "interval": 0.3
    }
  ]
  ...
}
```

### Repeat On/Off
You can also separate the hex object to have separate "on" and "off" outcomes:

The following will perform the following sequence when turning the accessory off:

- Send "OFF_HEX_CODE"
- Wait 0.3s
- Send "OFF_HEX_CODE"
- Wait 0.3s
- Send "OFF_HEX_CODE"

```
{
  ...
  "data": {
    "on": "ON_HEX_CODE",
    "off": [
      {
        "data": "OFF_HEX_CODE",
        "sendCount": 3,
        "interval": 0.3
      }
    ]
  }
  ...
}
```

### Multiple Hex Codes
You may wish for different hex codes to be sent at once. A delay can be added between each hex code by adding an `"pause"` value.

The following will perform the following sequence when turning the accessory on:

- Send "ON_HEX_CODE_1"
- Wait 0.3s
- Send "ON_HEX_CODE_2"
- Wait 0.3s
- Send "ON_HEX_CODE_3"

```
{
  ...
  "data": {
    "on": [
      {
        "data": "ON_HEX_CODE_1",
        "pause": 0.3
      },
      {
        "data": "ON_HEX_CODE_2",
        "pause": 0.3
      },
      {
        "data": "ON_HEX_CODE_3",
      }
    ],
    "off": "OFF_HEX"
  }
  ...
}
```

### Multiple Hex Codes With Repeats
You may wish for different hex codes to be sent at once, with some repeating. A delay can be added between each hex code by adding an `"pause"` value. A delay can be added between each repeats of the same hex code by adding an `"interval"`.

The following will perform the following sequence when turning the accessory on:

- Send "ON_HEX_CODE_1"
- Wait 0.1s
- Send "ON_HEX_CODE_1"
- Wait 0.1s
- Send "ON_HEX_CODE_1"
- Wait 0.3s
- Send "ON_HEX_CODE_2"
- Wait 0.3s
- Send "ON_HEX_CODE_3"

```
{
  ...
  "data": {
    "on": [
      {
        "data": "ON_HEX_CODE_1",
        "sendCount": 3,
        "interval": 0.1,
        "pause": 0.3
      },
      {
        "data": "ON_HEX_CODE_2",
        "pause": 0.3
      },
      {
        "data": "ON_HEX_CODE_3",
      }
    ],
    "off": "OFF_HEX"
  }
  ...
}
```


## Accessory Types

- [switch](#switch)
- [fan](#fan)
- [light](#light)
- [garage-door-opener](#garage-door-opener)
- [window-covering](#window-covering)
- [air-conditioner](#air-conditioner)
- [learn-code](#learn-code)

### switch
Turn the switch on and the `on` hex code is sent, turn it off and the `off` hex code is sent.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`enableAutoOff` | Turn the switch off automatically when `onDuration` has been reached. | true | false | No | Yes
`onDuration` | The amount of time before the switch automatically turns itself off (used in conjunction with `enableAutoOff`). | 5 | 60 | No | Yes
`enableAutoOn` | Turn the switch on automatically when `offDuration` has been reached | false | true | No | Yes
`offDuration` | The amount of time before the switch automatically turns itself on (used in conjunction with `enableAutoOn`). | 5 | 60 | No | Yes
`pingIPAddress` | When an IP address is provided, it is pinged every second. If a response is received then the switch turns on, otherwise it turns off. | "192.167.1.77" | - | No | Yes
`pingIPAddressStateOnly` | Using this option will prevent the hex code from being sent when the state changes | true | false | No | Yes
`pingFrequency` | The frequency in seconds that the IP address should be pinged | 5 | 1 | No | Yes

#### "data" key-value object
key | description
--- | -----------
`on` | A hex code string or [object](#hex-object-structure) to be sent when the switch is changed to the on position.
`off` | A hex code string or [object](#hex-object-structure) to be sent when the switch is changed to the off position.


### outlet
Turn the outlet on and the `on` hex code is sent, turn it off and the `off` hex code is sent.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`enableAutoOff` | Turn the outlet off automatically when `onDuration` has been reached. | true | false | No | Yes
`onDuration` | The amount of time before the outlet automatically turns itself off (used in conjunction with `enableAutoOff`). | 5 | 60 | No | Yes
`enableAutoOn` | Turn the outlet on automatically when `offDuration` has been reached | false | true | No | Yes
`offDuration` | The amount of time before the outlet automatically turns itself on (used in conjunction with `enableAutoOn`). | 5 | 60 | No | Yes
`pingIPAddress` | When an IP address is provided, it is pinged every second. If a response is received then the outlet's "Outlet In Use" shows as "Yes", otherwise it shows as "No". | "192.167.1.77" | - | No | Yes
`pingIPAddressStateOnly` | Using this option will prevent the hex code from being sent when the state changes | true | false | No | Yes
`pingFrequency` | The frequency in seconds that the IP address should be pinged | 5 | 1 | No | Yes

#### "data" key-value object
key | description
--- | -----------
`on` | A hex code string or [object](#hex-object-structure) to be sent when the plug is changed to the on position.
`off` | A hex code string or [object](#hex-object-structure) to be sent when the plug is changed to the off position.

### fan
Turn the fan on and the `on` hex code is sent, turn it off and the `off` hex code is sent.

Additionally, Siri supports the toggling of the swing mode and setting of the fan speed as a %.

If you don't specify every fan speed then the accessory will choose the hex code of the fan speed closest to the one requested. e.g. If you only specify fan speeds of 10%, 50% and 100% then ask "Set Fan to 40%" then the hex code for 50% will be used.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`hideSwingMode` | Determines whether we should hide the swing mode UI or not. | true | false | No | Yes
`hideRotationDirection` | Determines whether we should hide the rotation direction UI or not. | true | false | No | Yes

#### "data" key-value object
key | description
--- | -----------
`on` | A hex code string or [object](#hex-object-structure) to be sent when the switch is changed to the on position.
`off` | A hex code string or [object](#hex-object-structure) to be sent when the switch is changed to the off position.
`clockwise` | A hex code string or [object](#hex-object-structure) to be sent to make the fan go clockwise.
`counterClockwise` | A hex code string or [object](#hex-object-structure) to be sent to make the fan go counter clockwise.
`swingToggle` | A hex code string or [object](#hex-object-structure) used to toggle the swing mode on/off.
`fanSpeedX` | A hex code string or [object](#hex-object-structure) where X is any fan speed you wish to support e.g. "fanSpeed100".

### light
Turn the light on and the `defaultBrightness` is set unless `useLastKnownBrightness` is set to true in which case the last brightness that was set will be used.

Turn the light off and the `off` hex code is sent.

If you don't specify every brightness then the accessory will choose the hex code of the brightness closest to the one requested. e.g. If you only specify brightness values of 10%, 50% and 100% then ask "Set light to 40%" then the hex code for 50% will be used.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`defaultBrightness` | The default brightness to be set when you turn the light on. | 70 | 100 | Yes | Yes
`useLastKnownBrightness` | The last known brightness will be used instead of the defaultBrightness when turning a light back on. | false | true | No | Yes
`onDelay` | If the `on` hex data is specified in the `data` value, this will determine the seconds between when the on code and the requested brightness code are sent. | 1 | 0.1 | No | Yes
`enableAutoOff` | Turn the light off automatically when `onDuration` has been reached. | true | false | No | Yes
`onDuration` | The amount of time before the switch automatically turns itself off (used in conjunction with `enableAutoOff`). | 5 | 60 | No | Yes
`enableAutoOn` | Turn the light on automatically when `offDuration` has been reached | false | true | No | Yes
`offDuration` | The amount of time before the switch automatically turns itself on (used in conjunction with `enableAutoOn`). | 5 | 60 | No | Yes

#### "data" key-value object
key | description
--- | -----------
`off` | A hex code string or [object](#hex-object-structure) to be sent when the switch is changed to the off position.
`brightnessX` | A hex code string or [object](#hex-object-structure) where X is any brightness you wish to support e.g. "brightness100".
`hueX` | A hex code string or [object](#hex-object-structure) where X is any hue you wish to support between 0 and 359 e.g. "hue42".
`on` | If set, this hex code shall be sent before brightness or hue is set using `onDelay` to create a delay between sends.

### garage-door-opener
Set the switch to open and the `open` hex code is sent, set it to close and the `close` hex code is sent.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`openCloseDuration` | The amount of time in seconds that the accessory will show as "Opening" and "Closing" | 10 | 8 | No | Yes
`openDuration` | The amount of time in seconds that the accessory will show as "Opening" | 10 | 8 | No | Yes
`closeDuration` | The amount of time in seconds that the accessory will show as "Closing" | 10 | 8 | No | Yes
`autoCloseDelay` | The amount of time in seconds that the accessory will wait before automatically initiating the "Closing" state. | 10 | 30 | Yes | Yes

#### "data" key-value object
key | description
--- | -----------
`open` | A hex code string or [object](#hex-object-structure) to be sent when the switch is changed to the open position.
`close` | A hex code string or [object](#hex-object-structure) to be sent when the switch is changed to the close position.
`unlock` | A hex code string or [object](#hex-object-structure) to be sent when the switch is set to unlock.
`lock` | A hex code string or [object](#hex-object-structure) to be sent when the switch is set to lock.

### lock
Set the switch to unlock and the `unlock` hex code is sent, set it to lock and the `lock` hex code is sent.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`autoLockDelay` | The amount of time in seconds that the accessory will wait before automatically initiating the "Lock" state. | 10 | 30 | No | Yes
`lockDuration` | The amount of time in seconds that the accessory will show a status of "Locking" for. | 2 | 1 | No | Yes
`unlockDuration` | The amount of time in seconds that the accessory will show a status of "Unlocking" for. | 2 | 1 | No | Yes

#### "data" key-value object
key | description
--- | -----------
`unlock` | A hex code string or [object](#hex-object-structure) to be sent when the switch is set to unlock.
`lock` | A hex code string or [object](#hex-object-structure) to be sent when the switch is set to lock.

### window-covering
The window-covering accessory designed to be used by IR/RF controlled blinds/shades/shutters.

The accessory will determine how long the window-covering should continue opening/closing for based on the previous position and target position along with the `totalDurationOpen` and `totalDurationClose` values.

The `window-covering` will first send the `open`/`close` hex code, wait for the calculated amount of time as explained above, then send the `stop` hex code. Concurrently, the % shown in the Home app will be updated at intervals.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`totalDurationOpen` | The amount of time in seconds it takes to open the window-covering completely. | 30 | - | Yes | Yes
`totalDurationClose` | The amount of time in seconds it takes to close the window-covering completely. The value shall be used to determine what percentage to show in the Home app as well as when to send the `stop` code. | 30 | - | Yes | Yes
`initialDelay` | This allows multiple `window-covering` accessories to be updated at the same time without RF/IR interference from one-another by adding an offset to each `window-covering` accessory | 1 | 0.1 | No | Yes
`sendStopAt0` | Determines where the stop command is sent when the blind position reaches 0% | true | false | No | No
`sendStopAt100` | Determines where the stop command is sent when the blind position reaches 100% | true | false | No | No

#### "data" key-value object
key | description
--- | -----------
`open` | A hex code string or [object](#hex-object-structure) to be sent when the window-covering is requested to open.
`close` | A hex code string or [object](#hex-object-structure) to be sent when the window-covering is requested to close.
`stop` | A hex code string or [object](#hex-object-structure) to be sent when the window-covering is stopped automatically.
`openCompletely` | When set, this hex code will be sent when a value of 100% is requested.
`closeCompletely` | When set, this hex code will be sent when a value of 0% is requested.

### air-conditioner
This allows you to send a hex code for any temperature that you've defined a hex code for. If you simply want to heat up or cool down a room (and not learn every single temperature code) you can just set hex codes for the lowest and highest temperatures and those will be used whatever temperature you request.

key | description | example | default | required | unit tested
--- | ----------- | ------- | ------- | -------- | -----------
`data` | Hex data stored as a key-value JSON object. | See below. | - | Yes | Yes
`minTemperature` | The minimum temperature you can set. | 14 | -15 | No
`maxTemperature` | The maximum temperature you can set. | 28 | 50 | No
`temperatureDisplayUnits` | Specify Celsius or Fahrenheit. | F | C | No
`defaultCoolTemperature` | The temperature that will be requested when no hex code exists for the specified temperature. | 14 | 16 | No | Yes
`defaultHeatTemperature` | The temperature that will be requested when no hex code exists for the specified temperature. | 28 | 30 | No | Yes
`heatTemperature` | The temperature at which we change the UI to show that we're heating. Also used to determine whether `defaultCoolTemperature` or `defaultHeatTemperature` is used when hex data for a particular temperature is missing. | 20 | 22 | No | Yes
`replaceAutoMode` | When we turn on the thermostat with Siri it sets the mode as `auto`, so we set the mode to `cool` or `heat` instead depending on the value of this key. | "heat" | "cool" | No | Yes
`pseudoDeviceTemperature` | Some RM devices don't have a built in thermometer, when set this prevents the device thermometer from being accessed and shows the provided value instead. | 0 | 0 | No | Yes
`autoHeatTemperature` | When the temperature is below this value, the heat mode will be enabled. | 18 | - | No | Yes
`autoCoolTemperature` | When the temperature is above this value, the cool mode will enabled. | 27 | - | No | Yes
`minimumAutoOnOffDuration` | The minimum amount of time that the air-conditioner must remain on or off after having been automatically turned on or off. | 300 | 120 | No | Yes
`temperatureFilePath` | A path to a file containing a number that represents the current temperature reported to the accessory.  | "/Users/username/HomeKit/temperature/" | - | No | No
`temperatureAdjustment` | The number of degrees that the reported temperature should be offset by. | 3 | 0 | No | Yes
`turnOnWhenOff` | If the air-con unit state is off then an `on` code shall be sent before sending the temperature code. | true | false | No | Yes
`preventResendHex` | Determines whether the temperature hex code should be resent when requesting the same temperature as the last requested temperature. | true | false | No | Yes
`autoSwitchName`| The name of an switch accessory that can be used to enable/disable the auto on/off functionality. To be used in conjunction with `autoHeatTemperature` and `autoCoolTemperature`. | "Air-Con Auto" | - | No | Yes
`temperatureUpdateFrequency` | The frequency in seconds for which the temperature shall be requested. | 20 | 10 | No | No

#### "data" key-value object
key | description
--- | -----------
`on` | An optional hex code to be used in conjunction with the `turnOnWhenOff` configuration.
`off` | A hex code string or [object](#hex-object-structure) to be sent when the air conditioner is asked to be turned off.
`temperatureX` | Where X is any temperature you wish to support e.g. `temperature30`. See below.

#### "temperatureX" key-value object
key | description
--- | -----------
`data` | Hex data stored as string.
`pseudo-mode` (Optional) | The mode we set when this hex is sent. i.e. `heat` or `cool`. For graphical purposes only (hence use of the term "pseudo"). By default this will use the `heatTemperature` value to determine whether to set the mode as `heat` or `cool`.

### learn-code
You do not need to add this accessory type yourself as we add one automatically. However if you have multiple Broadlink RM devices then it may be useful to specify multiple devices with the `learn-code` type along with a `"host"` value so that you can learn from each of them.

key | description | example | default | required
--- | ----------- | ------- | ------- | -------
`enableAutoOff` | Allows the learn-code accessory to turn off automatically after a given amount of time or when a hex code has been received. | false | true | No
`onDuration` | The amount of time before the switch automatically turns itself off (used in conjunction with `enableAutoOff`). | 5 | 60 | No
`scanFrequency` | This changes the type of learning to be the same as the default "Scan Frequency" | true | false | No

## Air Conditioner Notes
There looks to be a glitch in the Apple Home app in that nothing happens when setting the mode to Off when you've turned the thermostat on by setting a specific temperature. Siri and other HomeKit apps don't have the same glitch. As a work-around you can just select a different mode and then press Off. This only happens the first time after launching homebridge.

Adding `autoHeatTemperature` and `autoCoolTemperature` can help automatically maintain a temperature. When the temperature falls below and hits above the `autoHeatTemperature` and `autoCoolTemperature` temperatures the accessory will automatically set the temperature to whatever the `defaultHeatTemperature` and `defaultCoolTemperature` is. The accessory will then keep checking (every `autoMinimumDuration` seconds) and if the temperature changes to be between the `autoHeatTemperature` and `autoCoolTemperature` temperatures then it will turn itself off. Something to note however is that if you decide to set a new temperature when the accessory has automatically turned itself on then it will still attempt to turn itself back off. To stop this automatic turn-off you can turn off the accessory manually and then turn it back on manually. Bare in mind that while the Home app may say 22C, the temperature may actually be 22.4C and if the Home app says 23C then it may actually be 22.5C.

## Thanks
Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.