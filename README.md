# Homebridge Broadlink RM Enhanced

## Introduction
Welcome to the Broadlink RM Mini and Broadlink RM Pro plugin for [Homebridge](https://github.com/nfarina/homebridge).

This is a fork of the [original plugin by Luke Rhodes] (https://github.com/lprhodes/homebridge-broadlink-rm) that allows you to control your RM Mini and RM Pro with HomeKit using the Home app and Siri.

### About this fork
I am working on upgrades to the accessory specifications in this repository. For starters I am focused on fan, air-conditioners and heater accessories to help improve the user experience of the devices like portable ACs, Lasko tower fans and tower heaters, etc.

I eventually would like to add multiple contibuters who can review and integrate PRs so more people can collectively extend the accessories.

If you want to use this fork, use this command:

`npm i -g homebridge-broadlink-rm-enhanced`

This plugin can be used in conjunction with other forks of Broadlink RM plugin. This enables one to use this plugin for some accessories while other plugin for other accessories with the same Broadlink IR Blaster.

## What's new
For updates to the plugin please review the [changelog](https://github.com/newt10/homebridge-broadlink-rm-enhanced/blob/master/Changelog.md)

## Like this plugin?

Please consider testing it and providing feedback. This project is built on top of the labor of many folks so please feel free to show your support to them as well.

Thank you!

## Documentation

### Orignial
Full documentation can be found [here](https://lprhodes.github.io/slate/).

Use [config-sample.json](https://github.com/newt10/homebridge-broadlink-rm-enhanced/blob/master/config-sample.json) file for plugin specific config changes.

### Enhancements

The platform has been renamed compared to the original so that you can install this plugin alongside the original plugin or other forks.
```
{
	"platform": "BroadlinkRM-Enhanced"
}
```

#### Fan Accessory
##### Fan speed step size property
Improves user experience of changing fan speeds to pre-defined steps in the Home app.

<img src="https://j.gifs.com/L7oJQX.gif" alt="Home app fan speed UI in action" width="150"/>


Add under the data section of the fan accessory in config.json as shown in the config-sample.json
| key | description | example | default |
|--|--|--|--|
| stepSize | Increments of fan speed. This will update Home app UI so that fan speed increases in steps. If your fan support 4 speeds and the step size should be 100/4 = 25. | 25 | 1 |

##### Combined fan speed and swing modes
Some fans (e.g. Lasko tower fan) with remotes that have a display, generate unique hex codes for a combination of each speed and swing mode. If you have such a device, you can record each hex code in the config.json as shown below.

config.json
```
{
	"name": "fan", // choose name of your choice
	"type": "fan",
	"swingOn": "on", // this has to be "on"
	"swingOff": "off", // this has to be "off"
	"data": {
		"fanSpeed50": {
			"swingOn": "26008a002828123f282a...", // replace with hex codes to turn on swing at the corresponding speed
			"swingOff": "26008a002828123f282a..." // replace with hex codes to turn off swing at the corresponding speed
		}
	}
}
```
## Thanks
Thanks to @lprhodes (https://github.com/lprhodes/homebridge-broadlink-rm), @kiwi-cam (https://github.com/kiwi-cam/homebridge-broadlink-rm), @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.
