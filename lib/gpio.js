var fs = require('fs');
var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var exists = fs.exists || path.exists;

var gpiopath = '/sys/class/gpio/';

// remap any cubieboard pins (here array from 0 to 26 with pin names and correct path)
var mapping = [
  { path:'gpio32_pd0', name:'PD0', pin:32 },
  { path:'gpio31_pd1', name:'PD1', pin:31 },
  { path:'gpio30_pd2', name:'PD2', pin:30 },
  { path:'gpio29_pd3', name:'PD3', pin:29 },
  { path:'gpio28_pd4', name:'PD4', pin:28 },
  { path:'gpio43_pd5', name:'PD5', pin:43 },
  { path:'gpio42_pd6', name:'PD6', pin:42 },
  { path:'gpio41_pd7', name:'PD7', pin:41 },
  { path:'gpio40_pd8', name:'PD8', pin:40 },
  { path:'gpio39_pd9', name:'PD9', pin:39 },
  { path:'gpio38_pd10', name:'PD10', pin:38 },
  { path:'gpio37_pd11', name:'PD11', pin:37 },
  { path:'gpio36_pd12', name:'PD12', pin:36 },
  { path:'gpio51_pd13', name:'PD13', pin:51 },
  { path:'gpio50_pd14', name:'PD14', pin:50 },
  { path:'gpio49_pd15', name:'PD15', pin:49 },
  { path:'gpio48_pd16', name:'PD16', pin:48 },
  { path:'gpio47_pd17', name:'PD17', pin:47 },
  { path:'gpio46_pd18', name:'PD18', pin:46 },
  { path:'gpio45_pd19', name:'PD19', pin:45 },
  { path:'gpio44_pd20', name:'PD20', pin:44 },
  { path:'gpio59_pd21', name:'PD21', pin:59 },
  { path:'gpio58_pd22', name:'PD22', pin:58 },
  { path:'gpio57_pd23', name:'PD23', pin:57 },
  { path:'gpio54_pd24', name:'PD24', pin:54 },
  { path:'gpio53_pd25', name:'PD25', pin:53 },
  { path:'gpio55_pd26', name:'PD26', pin:55 }
];

var logError = function(e) { if(e) console.log(e.code, e.action, e.path); };
var logMessage = function() { if (exports.logging) console.log.apply(console, arguments); };

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
        rn = mapping[number].pin;
        _write(rn, gpiopath + 'unexport', function(err) {
                if(err) return logError(err);
                if(typeof fn === 'function') fn();
        }, 1);
};
var _export = function(n, fn) {
        rp = mapping[n].path;
        rn = mapping[n].pin;
        if(exists(gpiopath + rp)) {
                // already exported, unexport and export again
                logMessage('Header already exported');
                _unexport(rn, function() { _export(rn, fn); });
        } else {
                logMessage('Exporting gpio' + n + '(' + rn + ')');
                _write(rn, gpiopath + 'export', function(err) {
                        // if there's an error when exporting, unexport and repeat
                        if(err) _unexport(rn, function() { _export(rn, fn); });
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
	
	rp = mapping[headerNum].path;
        rn = mapping[headerNum].pin;

	this.PATH = {};
	this.PATH.PIN =       gpiopath + rp + '/';
	this.PATH.VALUE =     this.PATH.PIN + 'value';
	this.PATH.DIRECTION = this.PATH.PIN + 'direction';

	this.export(function() {
		self.setDirection(dir, function () {
			if(typeof opts.ready === 'function') opts.ready.call(self);
		});
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
GPIO.prototype.setDirection = function(dir, fn) {
	var self = this, path = this.PATH.DIRECTION;
	if(typeof dir !== "string" || dir !== "in") dir = "out";
	this.direction = dir;

	logMessage('Setting direction "' + dir + '" on gpio' + this.headerNum);

	function watch () {
		if(dir === 'in') {
			if (!self.valueWatcher) {
				// watch for value changes only for direction "in"
				// since we manually trigger event for "out" direction when setting value
				self.valueWatcher = new FileWatcher(self.PATH.VALUE, self.interval, function(val) {
					val = parseInt(val, 10);
					self.value = val;
					self.emit("valueChange", val);
					self.emit("change", val);
				});
			}
		} else {
			// if direction is "out", try to clear the valueWatcher
			if(self.valueWatcher) {
				self.valueWatcher.stop();
				self.valueWatcher = null;
			}
		}
	}
	_read(path, function(currDir) {
		if(currDir.indexOf(dir) !== -1) {
			logMessage('Current direction is already ' + dir);
			watch();
			if(typeof fn === 'function') fn();
		} else {
			_write(dir, path, function() {
				watch();

				if(typeof fn === 'function') fn();
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
				if(typeof callback === 'function') callback(self.value, true);
			});
		} else {
			if(typeof callback === 'function') callback(this.value, false);
		}
	}
};
GPIO.prototype.reset = function(fn) { this.set(0, fn); };

exports.logging = false;
exports.export = function(headerNum, direction) { return new GPIO(headerNum, direction); };
exports.unexport = _unexport;

