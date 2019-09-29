# Homebridge Broadlink RM [TV+AC File Fork]

# About this fork

This fork adds support for the TV type indroduced in iOS 12.2. I'm only give support for this specific accessory type!

This fork also addresses an issue updating the temperature from file. Devices appear as "Not Repsonding" on read errors. This fork will use a temperature of 0 instead of hanging. Now updated to replciate the airconditioner-pro accessory:

  1. Added configuration to read hex codes for {mode}{temp} e.g.
```  
	"data":{
  	"off":"2600500000012...",
    "heat30":{
    	"data":"2600500000012..."
    },
    "cool16":{
    	"data":"2600500000012..."
    }
  }
```
2. Added support for Raspberry Pi Wire-1 thermometers (i.e. ds18b20). You can find your devices ID using the command `ls /sys/bus/w1/devices`. Then update your air-conditioner config to include (using the device ID):
```
"w1DeviceID":"28-0321544e531ff",
```

If you want to use this fork, use this command: 

`npm i -g homebridge-broadlink-rm-tv`


# Homebridge Broadlink RM [[Original](https://github.com/lprhodes/homebridge-broadlink-rm)]

## Introduction
Welcome to the Broadlink RM Mini and Broadlink RM Pro plugin for [Homebridge](https://github.com/nfarina/homebridge).

This plugin allows you to control your RM Mini and RM Pro with HomeKit using the Home app and Siri.

## Documentation

Full documentation can be found [here](https://lprhodes.github.io/slate/).

## Thanks
Original: Thanks to @tattn (https://github.com/tattn/homebridge-rm-mini3), @PJCzx (https://github.com/PJCzx/homebridge-thermostat) @momodalo (https://github.com/momodalo/broadlinkjs) whose time and effort got me started.

In this fork: Thanks to @kiwi-cam (https://github.com/kiwi-cam) and @Cloudore (https://github.com/Cloudore) for your work!
