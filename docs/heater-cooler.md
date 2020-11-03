# Heater Cooler

## Configuration keys and usage
| key | description | example | default |
| -- | -- | -- | -- |
| *name* | Name that you would like to give the device | LG AC | - |
| *type* | Recognizes device as a heater-cooler and parses it accordingly | heater-cooler | heater-cooler |
| temperatureUnits | Temperature units to parse the config file | F | C |
| coolingThresholdTemperature | Temperature to set the cooler to | 70 | 35 C |
| heatingThresholdTemperature | Temperature to set the heater to | 67 | 10 C |
| minTemperature | Minimum temperature that can be set on device | 65 | - |
| maxTemperature | Maximum temperature that can be set on device | 80 | - |
| defaultRotationSpeed | Default fan speed to set when turning on device | 50 | 100 |
| fanStepSize | Increments of fan speed | 25 | 1 |
| *data* | Object with hex codes for device operation | - | - |

### data
| key | description |
| -- | -- |
| heat | Options and data values to support heat mode operation |
| cool | Options and data values to support cool mode operation |

### heat / cool
| key | description |
| -- | -- |
| *on* | Hex data to turn on corresponding mode |
| *off* | Hex data to turn off corresponding mode |
| temperatureCodes | Options and data values to support temperature control in corresponding mode |
| 67 | Hex code to set the device to 67 degree |
| rotationSpeedX | Hex code to set rotation speed of device to X at the corresponding temperature e.g. rotationSpeed50 |
| swingOn | Hex code to turn on swing |
| swingOff | Hex code to turn off swing |
| swingDnd | Hex code to set without changing the current swing mode of device |
| swingToggle | Hex code to toggle swing mode |

## FAQ
1. All *italicized* keys are required.
2. At least one of heat or cool object should be present else the device will not be configured and cause an error.
3. 'minTemperature' and 'maxTemperature' are required if device has temperatureCodes
4. This accessory supports combined hex codes for temperature, fan speed and rotation. Please check the config-sample.json file for more details and examples.
5. Swing operation can be supported by providing 'swingOn' and 'swingOff' OR 'swingToggle' and 'swingDnd'.

## How to set-up config.json
This plugin support accessories with different types and combination of available modes. Below is an example of building your config.json based on your device

1. Device supports heat operation
```
{
	"name": "My heater",
	"type": "heater-cooler",
	"data": {
		"heat": {
			"on": "20443...",
			"off": "20443...",
		}
	}
}
```
2. Device supports temperature control
```
{
	"name": "My heater",
	"type": "heater-cooler",
	"minTemperature": 67,
	"maxTemperature": 80,
	"heatingThresholdTemperature": 68,
	"data": {
		"heat": {
			"on": "20443...",
			"off": "20443...",
			"temperatureCodes": {
				"67": "200675...",
				"68": "2006bc..."
			}
		}
	}
}
```

3. Device supports fan speed with state i.e. device has a unique hex code for each combination of rotation speed and temperature
```
{
	"name": "My heater",
	"type": "heater-cooler",
	"minTemperature": 67,
	"maxTemperature": 80,
	"heatingThresholdTemperature": 68,
	"defaultRotationSpeed": 50,
	"fanStepSize": 50,
	"data": {
		"heat": {
			"on": "20443...",
			"off": "20443...",
			"temperatureCodes": {
				"67": {
					"rotationSpeedX": "200675...",
					"rotationSpeedY": ""200678..."
					},
				"68": {
					"rotationSpeedX": "200685...",
					"rotationSpeedY": ""200688..."
					}
			}
		}
	}
}
```


4. Device does not support fan speed but supports swing mode
```
{
	"name": "My heater",
	"type": "heater-cooler",
	"minTemperature": 67,
	"maxTemperature": 80,
	"heatingThresholdTemperature": 68,
	"data": {
		"heat": {
			"on": "20443...",
			"off": "20443...",
			"temperatureCodes": {
				"67": {
					"swingOn": "200675...",
					"swingOff": ""200678..."
					},
				"68": {
					"swingOn": "200685...",
					"swingOff": ""200688..."
					}
			}
		}
	}
}
```

5. Device supports stateful swing mode - device has a unique hex code for each combination of swing mode, rotation speed and temperature
```
{
	"name": "My heater",
	"type": "heater-cooler",
	"minTemperature": 67,
	"maxTemperature": 80,
	"heatingThresholdTemperature": 68,
	"data": {
		"heat": {
			"on": "20443...",
			"off": "20443...",
			"temperatureCodes": {
				"67": {
					"rotationSpeedX": {
						"swingOn": "200675...",
						"swingOff": ""200678..."
					},
					"rotationSpeedY": {
						"swingOn": "200675...",
						"swingOff": ""200678..."
					}
				},
				"68": {
					"rotationSpeedX": {
						"swingOn": "200675...",
						"swingOff": ""200678..."
					},
					"rotationSpeedY": {
						"swingOn": "200675...",
						"swingOff": ""200678..."
					}
				}
			}
		}
	}
}
```

6. Device supports stateful temperaure and fan speed but stateless swing modes i.e. there is a unique hex code to set your device to a defined temperature at a specified speed without changing the current swing mode of the device
```
{
	"name": "My heater",
	"type": "heater-cooler",
	"minTemperature": 67,
	"maxTemperature": 80,
	"heatingThresholdTemperature": 68,
	"data": {
		"heat": {
			"on": "20443...",
			"off": "20443...",
			"temperatureCodes": {
				"67": {
					"rotationSpeedX": {
						"swingDnd": "200675...",
						"swingToggle": ""200678..."
					},
					"rotationSpeedY": {
						"swingDnd": "200675...",
						"swingToggle": ""200678..."
					}
				},
				"68": {
					"rotationSpeedX": {
						"swingDnd": "200675...",
						"swingToggle": ""200678..."
					},
					"rotationSpeedY": {
						"swingDnd": "200675...",
						"swingToggle": ""200678..."
					}
				}
			}
		}
	}
}
```