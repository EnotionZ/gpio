var fs = require("fs");
var util = require("util");
var exec = require("child_process").exec;
var gpiopath = '/sys/class/gpio/';

var puts = function(err) { if(err) util.puts("error: ", err); };



var GPIO = function(number, dir) {
	this.number = number;
	this._n = 'gpio'+number;

	this.export();
	this.setDirection(dir);
}

GPIO.prototype._write = function(str, file, fn) {
	if(typeof fn !== "function") fn = puts;
	fs.writeFile(gpiopath + file, str, fn);
};

GPIO.prototype._read = function(file, fn) {
	fs.readFile(gpiopath + file, "utf-8", fn || function(err, data) {
		if(err) throw err;
		if(typeof fn === "function") fn(data);
		else util.puts("value: ", data);
	});
}; 

/**
 * Export and unexport gpio#
 */
GPIO.prototype.unexport = function() { this._write(this.number, 'unexport'); };
GPIO.prototype.export = function() {
	this._write(this.number, 'export', function(err) {
		if(err) util.puts("error: ", err, "port possibly already exported");
	});
};

/**
 * Sets direction, default is "out"
 */
GPIO.prototype.setDirection = function(dir) {
	if(typeof dir!== "string" || dir !== "in") dir = "out";
	this._write(dir, this._n + '/direction');
	this.direction = dir;
};

GPIO.prototype.get = function(fn) { this._read(this._n + '/value', fn); };
GPIO.prototype.set = function() { this._write('1', this._n + '/value'); };
GPIO.prototype.reset = function() { this._write('0', this._n + '/value'); };


exports.export = function(number, direction) { return new GPIO(number, direction); };
exports.unexport = function(number) { exec('echo "' + number + '" > ' + gpiopath + 'unexport', puts); };

