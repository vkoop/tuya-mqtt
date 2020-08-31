const debug = require('debug')('TuyAPI:mqtt');
const debugColor = require('debug')('TuyAPI:mqtt:color');
const debugTuya = require('debug')('TuyAPI:mqtt:device');
const debugError = require('debug')('TuyAPI:mqtt:error');
const mqtt = require('mqtt');

const {DEVICE_MANAGER} = require('./tuya-device-manager');

const {
	bmap,
	getActionFromTopic,
	getDeviceFromTopic,
	getCommandFromTopic
} = require('./util-functions');

class MqttClientManager {
	constructor(configuration) {
		/**
		 *
		 * @type {boolean}
		 * @private
		 */
		this._connected = false;

		/**
		 *
		 * @type {MqttClient}
		 */
		this.mqttClient = null;

		this.interval = null;
		this.configuration = configuration;
	}

	init() {
		const self = this;

		this.mqttClient = mqtt.connect({
			host: this.configuration.host,
			port: this.configuration.port,
			username: this.configuration.mqtt_user,
			password: this.configuration.mqtt_pass
		});

		this.mqttClient.on('connect', this.handleConnect.bind(this));
		this.mqttClient.on('reconnect', this.handleReconnect.bind(this));
		this.mqttClient.on('error', this.handleClientError.bind(this));
		this.mqttClient.on('message', this.handleClientMessage.bind(this));

		this.connect();

		/**
		 * Event fires if TuyaDevice sends data
		 * @see TuyAPI (https://github.com/codetheweb/tuyapi)
		 */
		DEVICE_MANAGER.onAll('data', function(data) {
			try {
				if (typeof data.dps !== 'undefined') {
					debugTuya('Data from device ' + this.type + ' :', data);
					const status = data.dps['1'];
					if (typeof status !== 'undefined') {
						self.publishStatus(this, bmap(status));
					}

					self.publishDPS(this, data.dps);
				}
			} catch (error) {
				debugError(error);
			}
		});
	}

	handleConnect() {
		debug('Verbindung mit MQTT-Server hergestellt');
		this._connected = true;
		const topic = this.configuration.topic + '#';
		this.mqttClient.subscribe(topic, {
			retain: this.configuration.retain,
			qos: this.configuration.qos
		});
	}

	handleClientMessage(topic, message) {
		try {
			message = message.toString();
			const action = getActionFromTopic(topic);
			const options = getDeviceFromTopic(topic);

			debug(
				'receive settings',
				JSON.stringify({
					topic,
					action,
					message,
					options
				})
			);

			DEVICE_MANAGER.getOrCreateDevice(options)
				.then(params => {
					const {device} = params;

					switch (action) {
						case 'command': {
							const command = getCommandFromTopic(topic, message);
							debug('receive command', command);
								device.set(command).then(data => {
									debug('set device status completed', data);
								});
							break;
						}
					}
				})
				.catch(error => {
					debugError(error);
				});
		} catch (error) {
			debugError(error);
		}
	}

	handleReconnect(error) {
		if (this.connected) {
			debug(
				'Connected to MQTT server!'
			);
		} else {
			debug('Not Connected to MQTT server!');
		}
	}

	handleClientError(error) {
		debug(
			'client error with  MQTT-Server',
			error
		);
		this._connected = false;
	}

	get connected() {
		return this._connected;
	}

	/**
	 * Publish current TuyaDevice state to MQTT-Topic
	 * @param {TuyaDevice} device
	 * @param {boolean} status
	 */
	publishStatus(device, status) {
		if (this.connected) {
			try {
				const {type} = device;
				const tuyaID = device.options.id;
				const tuyaKey = device.options.key;
				const tuyaIP = device.options.ip;

				if (
					typeof tuyaID !== 'undefined' &&
					typeof tuyaKey !== 'undefined' &&
					typeof tuyaIP !== 'undefined'
				) {
					let {topic} = this.configuration;
					if (typeof type !== 'undefined') {
						topic += type + '/';
					}

					topic += `${tuyaID}/${tuyaKey}/${tuyaIP}/state`;

					this.mqttClient.publish(topic, status, {
						retain: this.configuration.retain,
						qos: this.configuration.qos
					});
					debugTuya('mqtt status updated to:' + topic + ' -> ' + status);
				} else {
					debugTuya('mqtt status not updated');
				}
			} catch (error) {
				debugError(error);
			}
		}
	}

	/**
	 * Publish all dps-values to topic
	 * @param  {TuyaDevice} device
	 * @param  {Object} dps
	 */
	publishDPS(device, dps) {
		if (this.connected) {
			try {
				const {type} = device;
				const tuyaID = device.options.id;
				const tuyaKey = device.options.key;
				const tuyaIP = device.options.ip;

				if (
					typeof tuyaID !== 'undefined' &&
					typeof tuyaKey !== 'undefined' &&
					typeof tuyaIP !== 'undefined'
				) {
					let baseTopic = this.configuration.topic;
					if (typeof type !== 'undefined') {
						baseTopic += type + '/';
					}

					baseTopic += `${tuyaID}/${tuyaKey}/${tuyaIP}/dps`;

					const topic = baseTopic;
					const data = JSON.stringify(dps);
					debugTuya(`mqtt dps updated to:${topic} -> `, data);
					this.mqttClient.publish(topic, data, {
						retain: this.configuration.retain,
						qos: this.configuration.qos
					});

					Object.keys(dps).forEach(key => {
						const topic = `${baseTopic}/${key}`;
						const data = JSON.stringify(dps[key]);
						debugTuya(`mqtt dps updated to:${topic} -> dps[${key}]`, data);
						this.mqttClient.publish(topic, data, {
							retain: this.configuration.retain,
							qos: this.configuration.qos
						});
					});
				} else {
					debugTuya('mqtt dps not updated');
				}
			} catch (error) {
				debugError(error);
			}
		}
	}

	mqttConnectionTest() {
		if (this.mqttClient.connected !== this.connected) {
			this._connected = this.mqttClient.connected;
			if (this._connected) {
				debug('MQTT-Server verbunden.');
			} else {
				debug('MQTT-Server nicht verbunden.');
			}
		}
	}

	destroy() {
		clearInterval(this.interval);
		this.interval = undefined;
	}

	connect() {
		this.interval = setInterval(this.mqttConnectionTest.bind(this), 1500);
		this.mqttConnectionTest();
	}
}

module.exports = {MqttClientManager};
