var fs = require("fs");
var util = require("util");
var EventEmitter = require('events').EventEmitter;
var gpiopath = '/sys/class/gpio/';

var puts = function(err) { if(err) util.puts("error: ", err); };

var _write = function(str, file, fn) {
	if(typeof fn !== "function") fn = puts;
	fs.writeFile(file, str, fn);
};
var _read = function(file, fn) {
	fs.readFile(file, "utf-8", function(err, data) {
		if(err) {
			puts(err);
		} else {
			if(typeof fn === "function") fn(data);
			else util.puts("value: ", data);
		}
	});
}; 

var _unexport = function(number) { _write(number, gpiopath + 'unexport'); };
var _export = function(n) {
	_write(n, gpiopath + 'export', function(err) {
		if(err) util.puts("error: ", err, "port possibly already exported");
	});
};


var GPIO = function(number, dir) {
	var self = this;

	this.number = number;
	this.value = 0;

	this.PATH = {};
	this.PATH.PIN =       gpiopath + 'gpio' + number + '/';
	this.PATH.VALUE =     this.PATH.PIN + 'value';
	this.PATH.DIRECTION = this.PATH.PIN + 'direction';

	this.export();

	setTimeout(function() { self.setDirection(dir || "out"); }, 10);

	// Needs to stall some time after exporting before we can
	// grab value or else we get an error
	setTimeout(function() { self._get(); }, 12);

	// Watch changes to value
	fs.watchFile(this.PATH.VALUE, function(curr, prev) {
		// gets value and triggers "valueChange" event
		self._get(function(val){ self.emit("valueChange", val); });
	});
};

util.inherits(GPIO, EventEmitter);


/**
 * Export and unexport gpio#
 */
GPIO.prototype.export = function() { _export(this.number); };
GPIO.prototype.unexport = function() { fs.unwatchFile(this.PATH.VALUE); _unexport(this.number); };


/**
 * Sets direction, default is "out"
 */
GPIO.prototype.setDirection = function(dir) {
	if(typeof dir!== "string" || dir !== "in") dir = "out";
	_write(dir, this.PATH.DIRECTION);
	this.direction = dir;
};

/**
 * Internal getter, stores value
 */
GPIO.prototype._get = function(fn) {
	var self = this;
	_read(this.PATH.VALUE, function(val) {
		self.value = parseInt(val, 10);
		if(typeof fn === "function") fn.call(this, self.value);
	});
};

/**
 * Sets the value. If v is specified as 0 or '0', reset will be called
 */
GPIO.prototype.set = function(v) {
	if(typeof v !== "number" || v !== 0) v = 1;
	_write(v, this.PATH.VALUE);
};
GPIO.prototype.reset = function() { this.set(0); };


exports.export = function(number, direction) { return new GPIO(number, direction); };
exports.unexport = _unexport;

