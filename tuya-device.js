const debug = require('debug')('TuyAPI:device');
const debugError = require('debug')('TuyAPI:device:error');
const debugColor = require('debug')('TuyAPI:device:color');
const CustomTuyAPI = require('./custom-tuy-api');
const TuyColor = require('./tuya-color');

const {DEVICE_MANAGER} = require('./tuya-device-manager');

class TuyaDevice {
	constructor(options) {
		options.type = options.type || undefined;

		this.type = options.type;
		this.options = options;

		this.device = new CustomTuyAPI(this.options);

		this.device.on('data', data => {
			if (typeof data === 'string') {
				debugError(
					'Data from device not encrypted:',
					data.replace(/[^a-zA-Z0-9 ]/g, '')
				);
			} else {
				debug('Data from device:', data);
				this.triggerAll('data', data);
			}
		});

		DEVICE_MANAGER.devices.push(this);

		// Find device on network
		debug('Search device in network');
		this.find().then(() => {
			debug('Device found in network');
			// Connect to device
			this.device.connect();
		});
	}

	/**
	 *
	 * @returns {Promise<unknown>}
	 */
	init() {
		/**
		 * @return promis to wait for connection
		 */
		return new Promise((resolve, reject) => {
			this.device.on('connected', () => {
				this.triggerAll('connected');
				this.connected = true;
				debug('Connected to device.', this.toString());
				resolve({
					status: 'connected',
					device: this
				});
			});
			this.device.on('disconnected', () => {
				this.triggerAll('disconnected');
				this.connected = false;
				debug('Disconnected from device.', this.toString());
				DEVICE_MANAGER.deleteDevice(this.options.id);
				return reject({
					status: 'disconnect',
					device: null
				});
			});

			this.device.on('error', err => {
				debugError(err);
				this.triggerAll('error', err);
				return reject({
					error: err,
					device: this
				});
			});
		});
	}

	/**
	 *
	 * @returns {string}
	 */
	toString() {
		return `${this.type} (${this.options.ip}, ${this.options.id}, ${this.options.key})`;
	}

	triggerAll(name, argument) {
		const device = this;
		const e = DEVICE_MANAGER.events[name] || [];
		e.forEach(event => {
			event.call(device, argument);
		});
	}

	on(name, callback) {
		if (!this.connected) {
			return;
		}

		const device = this;
		this.device.on(name, function() {
			callback.apply(device, arguments);
		});
	}

	find() {
		return this.device.find();
	}

	get() {
		return this.device.get();
	}

	set(options) {
		debug('set:', options);
		return new Promise(resolve => {
			this.device.set(options).then(result => {
				this.get().then(() => {
					debug('set completed ');
					resolve(result);
				});
			});
		});
	}

	switch(newStatus, callback) {
		if (!this.connected) {
			return;
		}

		newStatus = newStatus.toLowerCase();
		switch (newStatus) {
			case 'on':
				return this.switchOn(callback);
			case 'off':
				return this.switchOff(callback);
			case 'toggle':
				return this.toggle(callback);
		}
	}

	switchOn() {
		if (!this.connected) {
			return;
		}

		debug('switch -> ON');

		return this.set({
			set: true
		});
	}

	switchOff() {
		if (!this.connected) {
			return;
		}

		debug('switch -> OFF');

		return this.set({
			set: false
		});
	}

	toggle() {
		if (!this.connected) {
			return;
		}

		return new Promise(() => {
			this.get().then(status => {
				debug('toogle state', status);
				this.set({
					set: !status
				});
			});
		});
	}

	setColor(hexColor) {
		if (!this.connected) {
			return;
		}

		debugColor('Set color to: ', hexColor);
		const tuya = this.device;
		const color = new TuyColor(tuya);
		const dps = color.setColor(hexColor);
		debugColor('dps values:', dps);

		return this.set({
			multiple: true,
			data: dps
		});
	}

	connect(callback) {
		debug('Connect to TuyAPI Device');
		return this.device.connect(callback);
	}

	disconnect(callback) {
		debug('Disconnect from TuyAPI Device');
		return this.device.disconnect(callback);
	}
}

module.exports = {
	TuyaDevice
};
