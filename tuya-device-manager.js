const debug = require('debug')('TuyAPI:device');

class TuyaDeviceManager {
	constructor() {
		this.devices = [];
		this.events = {};
	}

	getOrCreateDevice(options) {
		const existing = this.checkExisiting(options.id);
		if (existing) {
			return new Promise(resolve => {
				resolve({
					status: 'connected',
					device: existing
				});
			});
		}

		const {TuyaDevice} = require('./tuya-device');
		return new TuyaDevice(options).init();
	}

	checkExisiting(id) {
		let existing = false;
		// Check for existing instance
		this.devices.forEach(device => {
			if (device.hasOwnProperty('options')) {
				if (id === device.options.id) {
					existing = device;
				}
			}
		});
		return existing;
	}

	deleteDevice(id) {
		this.devices.forEach((device, key) => {
			if (device.hasOwnProperty('options')) {
				if (id === device.options.id) {
					debug('delete Device', this.devices[key].toString());
					delete this.devices[key];
				}
			}
		});
	}

	connectAll() {
		this.devices.forEach(device => {
			device.connect();
		});
	}

	disconnectAll() {
		this.devices.forEach(device => {
			device.disconnect();
		});
	}

	onAll(name, callback) {
		this.events[name] = this.events[name] || [];

		this.events[name].push(callback);
		this.devices.forEach(device => {
			device.triggerAll(name);
		});
	}
}

const DEVICE_MANAGER = new TuyaDeviceManager();

module.exports = {
	DEVICE_MANAGER
};
