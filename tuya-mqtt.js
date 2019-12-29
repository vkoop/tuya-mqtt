const {MqttClientManager} = require('./mqtt-client-manager');
require('./cleanup')(onExit);
const {DEVICE_MANAGER} = require('./tuya-device-manager');
const configuration = require('./configuration');

const mqttClientManager = new MqttClientManager(configuration);
mqttClientManager.init();

/**
 * Function call on script exit
 */
function onExit() {
	DEVICE_MANAGER.disconnectAll();
	if (mqttClientManager) {
		mqttClientManager.destroy();
	}
}
