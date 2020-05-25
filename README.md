# Homebridge Broadlink RM [TV+AC File Fork]

# About this fork

This fork adds support for the TV type indroduced in iOS 12.2. I'm only give support for this specific accessory type!

This fork also contains updates the to Air Conditioner accessory, as detailed in the documenation below.

If you want to use this fork, use this command: 

`npm i -g homebridge-broadlink-rm-tv`

There's been a lot of work done on the main fork to support some newer Broadlink devices. I (kiwi-cam) have had trouble getting this fork updated to include this support. As a temporary resolution I've created a new fork homebridge-broadlink-rm-pro which adds new Broadlink device support (Thanks to @Defensor7). The new fork can be installed using: 

`npm i -g homebridge-broadlink-rm-pro`

# Homebridge Broadlink RM [[Original](https://github.com/lprhodes/homebridge-broadlink-rm)]

## Introduction
Welcome to the Broadlink RM Mini and Broadlink RM Pro plugin for [Homebridge](https://github.com/nfarina/homebridge).

This plugin allows you to control your RM Mini and RM Pro with HomeKit using the Home app and Siri.

## Documentation

Full documentation can be found [here](https://lprhodes.github.io/slate/). With the following additional configuration options available:

### Switch Accessory

key | description | example | default
--- | ----------- | ------- | -------
pingGrace (optional) | Pauses ping status changes for the specified period (seconds) to allow device to start-up/shutdown after the change | 15 | 10

### Aircon Accessory

key | description | example | default
--- | ----------- | ------- | -------
w1DeviceID (optional) | Updates device current temperature from a Raspberry Pi Wire-1 thermometers (i.e. ds18b20). Value is the Device ID | 28-0321544e531ff | 

#### "data" key-value object
The device can be setup to manage modes in one of two ways. If your AC unit accepts a hexcade to change mode only (without temperature details) you can set the mode keys (heat/cool) and then the temperatureX values to change the teperature. If your AC unit sends hexcodes that contain the mode AND temperature you can use the modeX codes alone.

When the mode is changed the mode hexcodes are sent first - if set. Then the modeX code is sent to set the temperature, if it is set. If a matching modeX code can't be found, the temperatureX code is sent.  If neither of these temperature codes are found either defaultHeatTemperature or defaultCoolTemperature codes will be used depending on if the target Temperature is higher or lower than the current temperature.

key | description
--- | -----------
off | A hex code string to be sent when the air conditioner is asked to be turned off.
temperatureX | A hex code string where X is any temperature you wish to support e.g. "temperature30".
modeX | A hex code string where X is any temperture, and mode is one of "heat","cool", or "auto". Hex code used to set unit to the specified mode and temperature

#### "temperatureX" and "modeX" key-value object

key | description
--- | -----------
data | Hex data stored as string.
pseudo-mode (optional) | The mode we set when this hex is sent. i.e. "heat" or "cool". For graphical purposes only (hence use of the term "pseudo"). Not recommended for ModeX key-values.

### TV Accessory

key | description | example | default
--- | ----------- | ------- | -------
enableAutoOff | Turn the TV off automatically when onDuration has been reached. |	true | false
onDuration | The amount of time before the TV automatically turns itself off (used in conjunction with enableAutoOff). | 5 | 60
enableAutoOn | Turn the TV on automatically when offDuration has been reached | false | true
offDuration | The amount of time before the TV automatically turns itself on (used in conjunction with enableAutoOn). | 5 | 60
pingIPAddress | When an IP address is provided, it is pinged every second. If a response is received then the TV turns on, otherwise it turns off. | "192.167.1.77" |
pingIPAddressStateOnly | Using this option will prevent the hex code from being sent when the state changes | true | false
pingFrequency | The frequency in seconds that the IP address should be pinged | 5 | 1
pingGrace (optional) | Pauses ping status changes for the specified period (seconds) to allow device to start-up/shutdown after the change | 15 | 10
data | see below

#### "data" key-value object

key | description
--- | -----------
on | A hex code string to be sent when the tv is powered on.
off | A hex code string to be sent when the tv is powered off.
volume | see below
inputs | see below
remote | see below

#### "volume" key-value object
Configuration for volume changes via the Control Centre remote

key | description
--- | -----------
up | A hex code string to be sent to turn the TV volume up.
down | A hex code string to be sent to turn the TV volume down.

#### "inputs" key-value object
Inputs contain an array of the below settings, one for each input

key | description
--- | -----------
name | The name used for the mode, shown in the GUI.
type | One of the follow to represent the mode: 'other','home_screen','tuner','hdmi','composite_video','s_video','component_video','dvi','airplay','usb','application'
data | A hex code string to be sent to switch the TV to the selected input.

#### "remote" key-value object
Configuration of button options in the Control Centre remote

key | description
--- | -----------
rewind | The hex code for this button function
fastForward | The hex code for this button function
nextTrack | The hex code for this button function
previousTrack | The hex code for this button function
arrowUp | The hex code for this button function
arrowDown | The hex code for this button function
arrowLeft | The hex code for this button function
arrowRight | The hex code for this button function
select | The hex code for this button function
back | The hex code for this button function
exit | The hex code for this button function
playPause | The hex code for this button function
info | The hex code for this button function

## Thanks
Original: Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.

In this fork: Thanks to @kiwi-cam (https://github.com/kiwi-cam) and @Cloudore (https://github.com/Cloudore) for your work!
