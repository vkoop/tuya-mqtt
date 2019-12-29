// Object to capture process exits and call app specific cleanup function
const debug = require('debug')('Cleanup');

function noOp() {}

module.exports = function(callback) {
	// Attach user callback to the process event emitter
	// if no callback, it will still exit gracefully on Ctrl-C
	callback = callback || noOp;
	process.on('cleanup', callback);

	// Do app specific cleaning before exiting
	process.on('exit', () => {
		process.emit('cleanup');
	});

	// Catch ctrl+c event and exit normally
	process.on('SIGINT', () => {
		debug('Ctrl-C...');
		process.exit(2);
	});

	// Catch uncaught exceptions, trace, then exit normally
	process.on('uncaughtException', e => {
		debug('Uncaught Exception...', e.stack);
		process.exit(99);
	});
};
