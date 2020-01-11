const fs = require('fs');
const http = require('http');
const unzip = require('unzip');

const ServiceManager = require('../helpers/serviceManager');
const ServiceManagerTypes = require('../helpers/serviceManagerTypes');

const BroadlinkRMAccessory = require('./accessory');

class ImportAccessory extends BroadlinkRMAccessory {

    constructor(log, config = {}, serviceManagerType) {
        // Set a default name for the accessory
        if (!config.name) config.name = 'Import Code';
        config.persistState = false;


        super(log, config, serviceManagerType);

        this.tmpPath = "/tmp/BLImport";
    }

    toggleImport(props, on, callback) {
        if (on) {
            let bonjour = require('bonjour')();

            bonjour.find({type: 'http'}, this.serviceDiscovered.bind(this));

            console.log("Import listener started, go to the app and click on 'Share to other phones in WLAN'");
        } else {
            callback();
        }
    }

    serviceDiscovered(service) {
        if (service.port === 48815) {
            this
                .initiateDownload("http://" + service.host + ":" + service.port)
                .then(this.extractArchive.bind(this))
                .then(this.extractCodes.bind(this))
                .then(this.printCodes.bind(this))
                .catch((error) => {
                    console.log("Import failed: ", error);
                });
        }
    }

    initiateDownload(server) {
        console.log("Download from:", server);

        return new Promise((resolve, reject) => {
            let path = this.tmpPath + "/shared.zip";

            if (!fs.existsSync(this.tmpPath)) {
                fs.mkdirSync(this.tmpPath);
            }

            let file = fs.createWriteStream(path);

            http.get(server, function (response) {
                response.pipe(file);

                file.on('finish', function () {
                    file.close();  // close() is async, call cb after close completes.

                    resolve(path);
                });
            }).on('error', function (err) { // Handle errors
                fs.unlink(path, () => {}); // Delete the file async. (But we don't check the result)

                reject(err.message);
            });
        })
    }

    extractArchive(path) {
        console.log("Extract archive:", path);
        let destinationPath = this.tmpPath;

        return new Promise((resolve, reject) => {
            fs.createReadStream(path)
                .pipe(unzip.Extract({path: destinationPath}))
                .on('close', function () {
                    resolve(destinationPath);
                })
                .on('error', function () {
                    reject('Extracting archive failed');
                });

        })
    }

    extractCodes(path) {
        console.log("Extract codes from:", path);

        return new Promise((resolve, reject) => {
            let rawButtons = fs.readFileSync(path + '/SharedData/jsonButton');
            let buttons = JSON.parse(rawButtons);

            let rawCodes = fs.readFileSync(path + '/SharedData/jsonIrCode');
            let codes = JSON.parse(rawCodes);

            let hexCodes = [];
            codes.forEach((code) => {
                let button = buttons.filter((button) => { return button.id === code.buttonId; }).pop();

                if (button !== undefined) {
                    hexCodes.push({
                        name: button.name,
                        hex: this.convertToHex(code.code)
                    });
                }
            });

            resolve(hexCodes);
        })
    }

    printCodes(codes) {
        console.log("Codes:", codes);
    }

    convertToHex(code) {
        let hex = "";

        code.forEach((decimal) => {
            let hexValue = Number(decimal>>>0).toString(16);

            hex += hexValue.substring(hexValue.length-2);
        });

        return hex;
    }

    setupServiceManager() {
        const {data, name, config, serviceManagerType} = this;
        const {on, off} = data || {};

        this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Switch, this.log);

        this.serviceManager.addToggleCharacteristic({
            name: 'switchState',
            type: Characteristic.On,
            getMethod: this.getCharacteristicValue,
            setMethod: this.toggleImport.bind(this),
            bind: this,
            props: {}
        })
    }
}

module.exports = ImportAccessory;
