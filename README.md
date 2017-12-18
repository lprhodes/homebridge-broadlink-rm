# Homebridge Broadlink RM

Broadlink RM Mini and Pro plugin for [Homebridge](https://github.com/nfarina/homebridge)

This allows you to control your RM Mini and Pro with HomeKit and Siri.

### Requirements

- Requires Node.js >= 7.6.0
- If you're seeing something like `ERROR LOADING PLUGIN"..."async setCharacteristicValue (props, value, callback) {` 
  then please check your node version before creating a new issue: `node -v`.

### Installation

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
      "hideScanFrequencyButton": false,
      "hideLearnButton": false,
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

### Broadlink RM Device Discovery

As of version 1.0.0 your Broadlink RM Device is automatically discovered 
so you no longer need to specify a "host" value.

### Learning Hex IR and RF codes

"Learn" and "Scan Frequency" accessories are automatically added to the Home app 
(so long as you've not added either manually in the config).

![Home App](https://user-images.githubusercontent.com/3083780/33922435-d6ce64f8-df98-11e7-8da3-16113eb726e0.png)

Simply toggle the switch on, perform the IR or RF command in front of your Broadlink RM device 
and copy the HEX output from the homebridge console log to wherever you want the code in the config.

```
homebridge[16748]: [Broadlink RM] Learn Code (ready)
homebridge[16748]: [Broadlink RM] Learn Code (learned hex code: 2600500000012...)
homebridge[16748]: [Broadlink RM] Learn Code (complete)
homebridge[16748]: [Broadlink RM] Learn Code (stopped)
```

The switch will toggle off automatically once the code has been received. 
You can optionally stop attempting to learn a code by toggling the switch off yourself.

More details on possible accessory types [below](#accessory-types)

### Multiple Broadlink RM Devices

If you have multiple devices (e.g. one in the bedroom, one in the lounge) 
then you can additionally specify a `host` value with the Broadlink RM's IP or MAC address.

If you wish to have multiple Learn Code accessories (e.g. for each device) then you can add
accessories with a type of `learn-code` and then specify the `host` and `name` values.

# Accessories

### Common Accessory Configuration Keys

The following configuration keys are common between each accessory.

key | description | example | default
--- | ----------- | ------- | -------
`name`* | A descriptor for the accessory that will show in HomeKit apps. | `"TV"` | -
`type`* | The type of accessory. | `"switch"` | -
`persistState` | Determines whether the state of accessory persists after homebridge has been restarted. | `false` | `true`
`resendHexAfterReload` | When persistState is true (it is by default) this will resend the hex code for the last known state if homebridge is restarted. | `true` | `false`
`disableLogs` | Disables the log output for this accessory. | `true` | `false`
\* required key | | | 


### Accessory Types

- [learn-code](#learn-code)
- [switch](#switch)
- [switch-multi](#switch-multi)
- [switch-repeat](#switch-repeat)
- [fan](#fan)
- [light](#light)
- [garage-door-opener](#garage-door-opener)
- [window-covering](#window-covering)
- [air-conditioner](#air-conditioner)

## learn-code

You do not need to add this accessory type yourself as we add one automatically.
However if you have multiple Broadlink RM devices then it may be useful to specify multiple
devices with the `learn-code` type along with a host so that you can learn from each of them.

key | description | example | default
--- | ----------- | ------- | -------
`disableAutomaticOff` | Prevent the learn-code accessory from turning off automatically after a given amount of time or when a hex code has been received. | `false` | `true`
`scanFrequency` | This changes the type of learning to be the same as the default "Scan Frequency" | `true` | `false`

## switch

Turn the switch on and the `on` hex code is sent, turn it off and the `off` hex code is sent.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as a key-value JSON object. | See below | -
`disableAutomaticOff` | Prevent the switch from turning off automatically after a given amount of time. | `false` | `true`
`onDuration` | The amount of time before the switch automatically turns itself off (used in conjunction with disableAutomaticOff). | `5` | `2`
\* required key | | | 

### "data" values
key | description
--- | -----------
`on` | A hex code string to be sent when the switch is changed to the on position.
`off` | A hex code string to be sent when the switch is changed to the off position.

### Example

```json
{
  "name":"Auto-off Switch",
  "type":"switch",
  "disableAutomaticOff": false,
  "onDuration": 5,
  "data":{
    "on":"2600500000012...",
    "off":"2600500000012..."
  }
}
```

## switch-multi

Turn the switch on and the switch will send each hex code in the provided array until. It then turns itself off automatically. You can also set the interval between each send.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as an array of strings. You can also set separate `on` and `off` arrays of codes similar to the `switch` accessory. | `["26005800000..."]` | -
`interval` | The amount of time between each send of a hex code in seconds. | `0.3` | `1`
`disableAutomaticOff` | Prevent the switch from turning off automatically when complete. | `true` | `false`
\* required key | | | 

### Example

```json
{
  "name":"Entertainment",
  "type":"switch-multi",
  "interval":0.5,
  "data": [
    "2600500000012...",
    "2600500000012...",
    "2600500000012..."
  ]
}
```

### Advanced Example

```json
{
  "name":"Entertainment",
  "type":"switch-multi",
  "interval":0.5,
  "data": {
    "on":"2600500000012...",
    "off":"2600500000012..."
  }
}
```

## switch-repeat

Turn the switch on and the switch will repeatedly send the hex code until it reaches the defined send count. It then turns itself off automatically. You can also set the interval between each send.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as string. You can also set separate `on` and `off` codes similar to the `switch` accessory. | `"26005800000..."` | -
`sendCount` | The number of times the hex code should be sent. | `5` | `1`
`onSendCount` | If you set separate "on" and "off" codes you can use this to override the "sendCount" when the switch is turned on. | `5` | `1`
`offSendCount` | If you set separate "on" and "off" codes you can use this to override the "sendCount" when the switch is turned off. | `5` | `1`
`interval` | The amount of time between each send of a hex code in seconds. | `0.3` | `1`
`disableAutomaticOff` | Prevent the switch from turning off automatically when complete. | `true` | `false`
\* required key | | | 

### Example

```json
{
  "name":"Volume Up",
  "type":"switch-repeat",
  "sendCount":5,
  "interval":0.3,
  "data":"2600500000012..."
}
```

### Advanced Example

```json
{
  "name":"Volume Up",
  "type":"switch-repeat",
  "sendCount":5,
  "interval":0.3,
  "data": {
    "on":"2600500000012...",
    "off":"2600500000012..."
  }
}
```

## fan

Turn the fan on and the "on" hex code is sent, turn it off and the "off" hex code is sent.

Additionally, Siri supports the toggling of the swing mode and setting of the fan speed as a %.

If you don't specify every fan speed then the accessory will choose the hex code of the fan
speed closest to the one requested. e.g. If you only specify fan speeds of 10%, 50% and 100%
then ask "Set Fan to 40%" then the hex code for 50% will be used.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as a key-value JSON object. | See below. | -
`hideSwingMode` | Determines whether we should hide the swing mode UI or not | `true` | `false`
`hideV1Fan` | Determines whether we should hide the V1 fan or not | `true` | `false`
`hideV2Fan` | Determines whether we should hide the V2 fan or not | `true` | `false`
\* required key | | | 

### "data" values

key | description
--- | -----------
`on` | A hex code string to be sent when the switch is changed to the on position.
`off` | A hex code string to be sent when the switch is changed to the off position.
`swingToggle` | A hex code string used to toggle the swing mode on/off.
`fanSpeedX` | A hex code string where X is any fan speed you wish to support e.g. `"fanSpeed100"`.

### Example

```json
{
  "name": "Fan",
  "type": "fan",
  "data": {
    "on":"2600500000012...",
    "off":"2600500000012...",
    "swingToggle": "2600500000012...",
    "fanSpeed10": "2600500000012...",
    "fanSpeed20": "2600500000012...",
    "fanSpeed30": "2600500000012...",
    "fanSpeed40": "2600500000012...",
    "fanSpeed50": "2600500000012...",
    "fanSpeed60": "2600500000012...",
    "fanSpeed70": "2600500000012...",
    "fanSpeed80": "2600500000012...",
    "fanSpeed90": "2600500000012...",
    "fanSpeed100": "2600500000012..."
  }
}
```

## light

Turn the light on and the `defaultBrightness` is set unless `useLastKnownBrightness` is
set to `true` in which case the last brightness that was set will be used.
Turn the light off and the `off` hex code is sent.

If you don't specify every brightness then the accessory will choose the hex code of
the brightness closest to the one requested. e.g. If you only specify brightness values
of 10%, 50% and 100% then ask "Set light to 40%" then the hex code for 50% will be used.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as a key-value JSON object. | See below. | -
`defaultBrightness` | The default brightness to be set when you turn the light on. | `70` | `100`
`useLastKnownBrightness` | The last known brightness will be used instead of the defaultBrightness when turning a light back on. | `false` | `true`
`disableAutomaticOff` | Prevent the light from turning off automatically after a given amount of time. | `false` | `true`
`onDuration` | The amount of time before the switch automatically turns itself off (used in conjunction with disableAutomaticOff). | `5` | `2`
`onDelay` | The time in seconds between when the on code and the requested brightness code are sent. (default: 0.1s)
\* required key | | | 

### "data" values

key | description
--- | -----------
`off` | A hex code string to be sent when the switch is changed to the off position.
`brightnessX` | A hex code string where X is any brightness you wish to support e.g. `brightness100`.
`on` | You only need to add this if you need to send an `on` code before the `brightnessX` code is sent

### Example

```json
{
  "name":"Light",
  "type":"light",
  "defaultBrightness": 70,
  "useLastKnownBrightness": true,
  "disableAutomaticOff": false,
  "onDuration": 5,
  "data":{
    "off":"2600500000012...",
    "brightness10": "2600500000012...",
    "brightness20": "2600500000012...",
    "brightness30": "2600500000012...",
    "brightness40": "2600500000012...",
    "brightness50": "2600500000012...",
    "brightness60": "2600500000012...",
    "brightness70": "2600500000012...",
    "brightness80": "2600500000012...",
    "brightness90": "2600500000012...",
    "brightness100": "2600500000012..."
  }
}
```

## garage-door-opener

Set the switch to open and the "open" hex code is sent, set it to close and the "close" hex code is sent.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as a key-value JSON object. | See below. | -
`openCloseDuration` | The amount of time in seconds that the accessory will show as "Opening" or "Closing" | `10` | `8`
`autoCloseDelay` | The amount of time in seconds that the accessory will wait before automatically initiating the "Closing" state. | `10` | `30`
`host` | The IP or MAC address of the Broadlink RM device. | `"192.168.1.32"` | (auto-discovered)
\* required key | | |  

### "data" values
key | description
--- | -----------
`open` | A hex code string to be sent when the switch is changed to the open position.
`close` | A hex code string to be sent when the switch is changed to the close position.

### Example

```json
{
  "name":"Garage Door",
  "type":"garage-door-opener",
  "openCloseDuration":8,
  "data":{
    "open":"2600500000012...",
    "close":"2600500000012...",
    "lock":"2600500000012...",
    "unlock":"2600500000012..."
  }
}
```

## window-covering

The window-covering accessory designed to be used by IR/RF controlled blinds/shades/shutters.

The accessory will calculate how many times the open and close hex code needs to be sent
based on the existing % and requested %. In order to do this a `percentageChangePerSend`
needs to be set. e.g. If it takes 10 sends of the code to open the covering then the value
of `percentageChangePerSend` should be `10`. If it takes `20` then it should be `5`.

If you simply want to open or close the blinds with a single hex code then you could set
`percentageChangePerSend` to `100` which will just sent the command once.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as a key-value JSON object. | See below. | -
`totalDurationOpen`* | The amount of time in seconds it takes to open the window-covering completely. | `45` | -
`totalDurationClose`* | The amount of time in seconds it takes to close the window-covering completely. It will work these values out based on the total. | `45` | -
\* required key | | | 

### "data" values

key | description
--- | -----------
`open` | A hex code string to be sent when the window-covering is requested to open.
`close` | A hex code string to be sent when the window-covering is requested to close.
`stop` | A hex code string to be sent when the window-covering is stopped automatically.

### Example

```json
{
  "name":"Blind",
  "type":"window-covering",
  "totalDurationOpen": 45,
  "totalDurationClose": 40,
  "data":{
    "open":"2600500000012...",
    "close":"2600500000012...",
    "stop":"2600500000012..."
  }
}
```

## air-conditioner

This allows you to send a hex code for any temperature that you've defined a hex code for.
If you simply want to heat up or cool down a room (and not learn every single temperature code)
you can just set hex codes for the lowest and highest temperatures and those will be used for
whatever temperature you request.

key | description | example | default
--- | ----------- | ------- | -------
`data`* | Hex data stored as a key-value JSON object. | See below. | -
`minTemperature` | The number of times the hex code should be sent. | `14` | `0`
`maxTemperature` | The amount of time between each send of a hex code in seconds. | `28` | `30`
`temperatureDisplayUnits` | Specify celsius or fahrenheit. | `"F"` | `"C"`
`defaultCoolTemperature` | The temperature that will be requested when no hex code exists for the specified temperature. | `14` | `16`
`defaultHeatTemperature` | The temperature that will be requested when no hex code exists for the specified temperature. | `28` | `30`
`heatTemperature` | The temperature at which we change the UI to show that we're heating. Also used to determine whether "defaultCoolTemperature" or "defaultHeatTemperature" is used. | `20` | `22`
`replaceAutoMode` | When we turn on the thermostat with Siri it sets the mode as "auto" which isn't  supported at this time so we set the mode to "cool" or "heat" instead depending on the value of this key. | `"heat"` | `"cool"`
`pseudoDeviceTemperature` | Some RM devices don't have a built in thermometer, when set this prevents the device thermometer from being accessed and shows the provided value instead. | `0` | `0`
`autoHeatTemperature` | When the temperature is below this value, the heat mode will be enabled. | `18` | -
`autoCoolTemperature` | When the temperature is above this value, the cool mode will enabled. | `27` | -
`autoMinimumDuration` | The minimum amount of time in seconds that an auto mode should be turned on (or after being automatically turned off) for to prevent it from turning on/off too frequently. | `300` | `120`
`temperatureAdjustment` | The number of degrees that the reported temperature should be offset by. | `3` | `0`
\* required key | | | 

### "data" values

key | description
--- | -----------
`off` | A hex code string to be sent when the air conditioner is asked to be turned off.
`temperatureX` | A hex code string where `X` is any temperature you wish to support e.g. `temperature30`.

### "temperatureX" key-value object

key | description
--- | -----------
`data` | Hex data stored as string.
`pseudo-mode` | The mode we set when this hex is sent. i.e. `"heat"` or `"cool"`. For graphical purposes only (hence use of the term "pseudo").

### Example

```json
{
  "name":"Air Conditioner",
  "type":"air-conditioner",
  "data":{
    "off":"2600500000012...",
    "temperature30":{
      "pseudo-mode":"heat",
      "data":"2600500000012..."
    },
    "temperature16":{
      "pseudo-mode":"cool",
      "data":"2600500000012..."
    }
  }
}
```

### Advanced Example

```json
{
  "name":"Air Conditioner Advanced",
  "type":"air-conditioner",
  "autoSchedule": [
    { "days": [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" ], "startTime": 6, "endTime": 8 },
    { "days": [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" ], "startTime": 16, "endTime": 22 },
    { "days": [ "Saturday", "Sunday" ], "startTime": 6, "endTime": 22 }
  ],
  "autoSwitch": "A/C Auto Switch",
  "data":{
    "off":"2600500000012...",
    "temperature30":{
      "pseudo-mode":"heat",
      "data":"2600500000012..."
    },
    "temperature16":{
      "pseudo-mode":"cool",
      "data":"2600500000012..."
    }
  }
}
```

### Air Conditioner Notes

There looks to be a glitch in the Apple Home app in that nothing happens when setting the mode to Off 
when you've turned the thermostat on by setting a specific temperature. Siri and other HomeKit apps
don't have the same glitch. As a work-around you can just select a different mode and then press Off. 
This only happens the first time after launching homebridge.

Adding `autoHeatTemperature` and `autoCoolTemperature` can help automatically maintain a temperature.
When the temperature falls below and hits above the `autoHeatTemperature` and `autoCoolTemperature` 
temperatures the accessory will automatically set the temperature to whatever the `defaultHeatTemperature`
and `defaultCoolTemperature` is. The accessory will then keep checking (every `autoMinimumDuration` seconds)
and if the temperature changes to be between the `autoHeatTemperature` and `autoCoolTemperature`
temperatures then it will turn itself off. Something to note however is that if you decide to set
a new temperature when the accessory has automatically turned itself on then it will still attempt
to turn itself back off. To stop this automatic turn-off you can turn off the accessory manually and
then turn it back on manually. Bare in mind that while the Home app may say 22C, the temperature may
actually be 22.4C and if the Home app says 23C then it may actually be 22.5C.

# Thanks

- @tattn (https://github.com/tattn/homebridge-rm-mini3)
- @PJCzx (https://github.com/PJCzx/homebridge-thermostat)
- @momodalo (https://github.com/momodalo/broadlinkjs) 

Whose time and effort got me started.
