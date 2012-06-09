var fs = require("fs");
var util = require("util");
var exec = require("child_process").exec;
var gpiopath = '/sys/class/gpio/';

var puts = function(err) { if(err) util.puts("error: ", err); };

var _write = function(str, file, fn) {
	if(typeof fn !== "function") fn = puts;
	fs.writeFile(file, str, fn);
};
var _read = function(file, fn) {
	fs.readFile(file, "utf-8", function(err, data) {
		if(err) throw err;
		if(typeof fn === "function") fn(data);
		else util.puts("value: ", data);
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
	this.setDirection(dir);

	// Sets initial value
	this._get();

	// Watch changes to value
	fs.watchFile(this.PATH.VALUE, function(curr, prev) { self._get(); });
};


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
GPIO.prototype._get = function() {
	var self = this;
	_read(this.PATH.VALUE, function(val) { self.value = parseInt(val, 10); });
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

