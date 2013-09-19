var fs = require('fs');
var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var exists = fs.exists || path.exists;

var gpiopath = '/sys/class/gpio/';

var logError = function(e) { if(e) console.log(e.code, e.action, e.path); };
var logMessage = function() { if (exports.logging) console.log.apply(console, arguments) };

var _write = function(str, file, fn, override) {
	if(typeof fn !== "function") fn = logError;
	fs.writeFile(file, str, function(err) {
		if(err && !override) {
			err.path = file;
			err.action = 'write';
			logError(err);
		} else {
			if(typeof fn === "function") fn();
		}
	});
};
var _read = function(file, fn) {
	fs.readFile(file, "utf-8", function(err, data) {
		if(err) {
			err.path = file;
			err.action = 'read';
			logError(err);
		} else {
			if(typeof fn === "function") fn(data);
			else logMessage("value: ", data);
		}
	});
}; 

var _unexport = function(number, fn) {
	_write(number, gpiopath + 'unexport', function(err) {
		if(err) return logError(err);
		if(typeof fn === 'function') fn();
	}, 1);
};
var _export = function(n, fn) {
	if(exists(gpiopath + 'gpio'+n)) {
		// already exported, unexport and export again
		logMessage('Header already exported');
		_unexport(n, function() { _export(n, fn); });
	} else {
		logMessage('Exporting gpio' + n);
		_write(n, gpiopath + 'export', function(err) {
			// if there's an error when exporting, unexport and repeat
			if(err) _unexport(n, function() { _export(n, fn); });
			else if(typeof fn === 'function') fn();
		}, 1);
	}
};

// fs.watch doesn't get fired because the file never
// gets 'accessed' when setting header via hardware
// manually watching value changes
var FileWatcher = function(path, interval, fn) {
	if(typeof fn === 'undefined') {
		fn = interval;
		interval = 100;
	}
	if(typeof interval !== 'number') return false;
	if(typeof fn !== 'function') return false;

	var value;
	var readTimer = setInterval(function() {
		_read(path, function(val) {
			if(value !== val) {
				if(typeof value !== 'undefined') fn(val);
				value = val;
			}
		});
	}, interval);

	this.stop = function() { clearInterval(readTimer); };
};


var GPIO = function(headerNum, opts) {
	opts = opts || {};

	var self = this;
	var dir = opts.direction;
	var interval = opts.interval;
	if(typeof interval !== 'number') interval = 100;
	this.interval = interval;

	this.headerNum = headerNum;
	this.value = 0;

	this.PATH = {};
	this.PATH.PIN =       gpiopath + 'gpio' + headerNum + '/';
	this.PATH.VALUE =     this.PATH.PIN + 'value';
	this.PATH.DIRECTION = this.PATH.PIN + 'direction';

	this.export(function() {
		self.setDirection(dir);
		if(typeof opts.ready === 'function') opts.ready.call(self);
	});
};

util.inherits(GPIO, EventEmitter);


/**
 * Export and unexport gpio#, takes callback which fires when operation is completed
 */
GPIO.prototype.export = function(fn) { _export(this.headerNum, fn); };
GPIO.prototype.unexport = function(fn) {
	if(this.valueWatcher) this.valueWatcher.stop();
	_unexport(this.headerNum, fn);
};


/**
 * Sets direction, default is "out"
 */
GPIO.prototype.setDirection = function(dir) {
	var self = this, path = this.PATH.DIRECTION;
	if(typeof dir !== "string" || dir !== "in") dir = "out";
	this.direction = dir;

	logMessage('Setting direction "' + dir + '" on gpio' + this.headerNum);
	_read(path, function(currDir) {
		if(dir === currDir) {
			logMessage('Current direction is already ' + dir);
		} else {
			_write(dir, path, function() {

				if(dir === 'in') {
					// watch for value changes only for direction "in"
					// since we manually trigger event for "out" direction when setting value
					self.valueWatcher = new FileWatcher(self.PATH.VALUE, self.interval, function(val) {
						val = parseInt(val, 10);
						self.value = val;
						self.emit("valueChange", val);
						self.emit("change", val);
					});
				} else {
					// if direction is "out", try to clear the valueWatcher
					if(self.valueWatcher) {
						self.valueWatcher.stop();
						self.valueWatcher = null;
					}
				}

				self.emit('directionChange', dir);
			}, 1);
		}
	});
};

/**
 * Internal getter, stores value
 */
GPIO.prototype._get = function(fn) {
	var self = this, currVal = this.value;

	if(this.direction === 'out') return currVal;

	_read(this.PATH.VALUE, function(val) {
		val = parseInt(val, 10);
		if(val !== currVal) {
			self.value = val;
			if(typeof fn === "function") fn.call(this, self.value);
		}
	});
};

/**
 * Sets the value. If v is specified as 0 or '0', reset will be called
 */
GPIO.prototype.set = function(v, fn) {
	var self = this;
	var callback = typeof v === 'function' ? v : fn;
	if(typeof v !== "number" || v !== 0) v = 1;

	// if direction is out, just emit change event since we can reliably predict
	// if the value has changed; we don't have to rely on watching a file
	if(this.direction === 'out') {
		if(this.value !== v) {
			_write(v, this.PATH.VALUE, function() {
				self.value = v;
				self.emit('valueChange', v);
				self.emit('change', v);
				if(typeof callback === 'function') callback();
			});
		}
	}
};
GPIO.prototype.reset = function(fn) { this.set(0, fn); };

exports.logging = false;
exports.export = function(headerNum, direction) { return new GPIO(headerNum, direction); };
exports.unexport = _unexport;

