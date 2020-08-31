const TuyaDevice = require('tuyapi');
const debug = require('debug')('TuyAPI:device');
const {MessageParser, CommandType} = require('./node_modules/tuyapi/lib/message-parser');

/**
 * Extends default TuyAPI-Class to add some more error handlers
 */
module.exports = class CustomTuyAPI extends TuyaDevice {
	get(options) {
		// Set empty object as default
		options = options || {};

		const payload = {
			gwId: this.device.gwID,
			devId: this.device.id
		};

		debug('GET Payload:');
		debug(payload);

		// Create byte buffer
		const buffer = this.device.parser.encode({
			data: payload,
			commandByte: CommandType.DP_QUERY,
      			sequenceN: ++this._currentSequenceN
		});
		  // Send request and parse response
		    return new Promise((resolve, reject) => {
		      try {
			// Send request
			this._send(buffer).then(data => {
			  if (typeof data !== 'object' || options.schema === true) {
			    // Return whole response
			    resolve(data);
			  } else if (options.dps) {
			    // Return specific property
			    resolve(data.dps[options.dps]);
			  } else {
			    // Return first property by default
			    resolve(data.dps['1']);
			  }
			});
		      } catch (error) {
			reject(error);
		      }
		    });
	}
};
