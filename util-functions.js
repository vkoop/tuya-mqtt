const debug = require('debug')('TuyAPI:mqtt');

function bmap(istate) {
	return istate ? 'ON' : 'OFF';
}

/**
 * Check mqtt-topic string for old notation with included device type
 * @param {String} _topic
 */
function checkTopicForOldNotation(_topic) {
	const topic = _topic.split('/');
	const type = topic[1];
	return type === 'socket' || type === 'lightbulb';
}

/**
 * Get action from mqtt-topic string
 * @param {String} _topic
 * @returns {String} action type
 */
function getActionFromTopic(_topic) {
	const topic = _topic.split('/');

	if (checkTopicForOldNotation(_topic)) {
		return topic[5];
	}

	return topic[4];
}

/**
 * Get device informations from mqtt-topic string
 *
 * @param {String} _topic
 * @return {{ip: (string), id: (string), [type]: (string), key: (string)}}
 */
function getDeviceFromTopic(_topic) {
	const topic = _topic.split('/');

	if (checkTopicForOldNotation(_topic)) {
		return {
			id: topic[2],
			key: topic[3],
			ip: topic[4],
			type: topic[1]
		};
	}

	return {
		id: topic[1],
		key: topic[2],
		ip: topic[3]
	};
}

/**
 * Get command from mqtt - topic string
 * converts simple commands to TuyAPI JSON commands
 * @param {String} _topic
 * @param _message
 * @returns {Object|String}
 */
function getCommandFromTopic(_topic, _message) {
	const topic = _topic.split('/');
	let command;

	if (checkTopicForOldNotation(_topic)) {
		command = topic[6];
	} else {
		command = topic[5];
	}

	command = command || _message;

	if (command !== '1' && command !== '0' && isJsonString(command)) {
		debug('command is JSON');
		command = JSON.parse(command);
	} else if (command.toLowerCase() !== 'toggle') {
		// Convert simple commands (on, off, 1, 0) to TuyAPI-Commands
		const convertString = Boolean(
			command.toLowerCase() === 'on' || command === '1' || command === 1
		);
		command = {
			set: convertString
		};
	} else {
		command = command.toLowerCase();
	}

	return command;
}

/**
 *
 * @param {string} text
 * @return {boolean}
 */
function isJsonString(text) {
	if (typeof text !== 'string') return false;

	try {
		JSON.parse(text);
		return true;
	} catch (error) {
		return false;
	}
}

module.exports = {
	bmap,
	checkTopicForOldNotation,
	getActionFromTopic,
	getDeviceFromTopic,
	getCommandFromTopic,
	isJsonString
};
