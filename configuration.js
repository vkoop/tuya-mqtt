const debugError = require('debug')('TuyAPI:mqtt:error');

let CONFIG = {
	qos: 2,
	retain: false,
	mqtt_user: '',
	mqtt_pass: ''
};

try {
	CONFIG = Object.assign(CONFIG, require('./config'));
} catch (error) {
	console.error('Configuration file not found');
	debugError(error);
	process.exit(1);
}

module.exports = CONFIG;
