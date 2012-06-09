var fs = require("fs");
var util = require("util");
var exec = require("child_process").exec;
var gpiopath = '/sys/class/gpio/';

var puts = function(err) { if(err) util.puts("error: ", err); };



var GPIO = function(number) {
	this.number = number;
	this._n = 'gpio'+number;

	this.export();
}

GPIO.prototype._write = function(str, cmd, fn) {
	if(typeof fn === "undefined") fn = puts;
	fs.writeFile(gpiopath + cmd, str, fn);
};

GPIO.prototype.export = function() { this._write(this.number, 'export'); };
GPIO.prototype.unexport = function() { this._write(this.number, 'unexport'); };
GPIO.prototype.setDirection = function(dir) { this._write(dir, this._n + '/direction'); };
GPIO.prototype.set = function() { this._write('1', this._n + '/value'); };
GPIO.prototype.reset = function() { this._write('0', this._n + '/value'); };


exports.export = function(number) { return new GPIO(number); };
exports.unexport = function(number) { exec('echo "' + number + '" > ' + gpiopath + 'unexport', puts); };


