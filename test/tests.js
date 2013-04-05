var fs = require('fs');
var assert = require('assert');
var gpio = require('../lib/gpio');

function read(file, fn) {
	fs.readFile(file, "utf-8", function(err, data) {
		if(!err && typeof fn === "function") fn(data);
	});
}

// remove whitespace
function rmws(str) {
	return str.replace(/\s+/g, '');
}

describe('GPIO', function() {

	describe('Header Direction Out', function() {
		var gpio4;

		before(function(done) {
			gpio4 = gpio.export(4, {
				direction: 'out',
				ready: done
			});
		});

		after(function() {
			gpio4.unexport();
		});

		describe('initializing', function() {
			it('should open specified header', function(done) {
				read('/sys/class/gpio/gpio4/direction', function(val) {
					assert.equal(rmws(val), 'out');
					done();
				});
			});
		});

		describe('#set', function() {
			it('should set header value to high', function(done) {
				gpio4.set(function() {
					read('/sys/class/gpio/gpio4/value', function(val) {
						assert.equal(rmws(val), '1');
						done();
					});
				});
			});
		});

		describe('#reset', function() {
			it('should set header value to low', function(done) {
				gpio4.reset(function() {
					read('/sys/class/gpio/gpio4/value', function(val) {
						assert.equal(rmws(val), '0');
						done();
					});
				});
			});
		});
	});

});
