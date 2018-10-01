/*global describe, before, after, it*/
var fs = require('fs');
var assert = require('assert');
var sinon = require('sinon');
var gpio = require('../lib/gpio');

var PIN_OUT = 4;
var PIN_IN = 17;

var GPIO_PATH = '/sys/class/gpio/gpio';
var pathOut = GPIO_PATH + PIN_OUT + '/';
var gpioOut, gpioIn;

// remove whitespace
function rmws(str) {
  return str.replace(/\s+/g, '');
}

// read file contents
function read(file, fn) {
  fs.readFile(file, "utf-8", function(err, data) {
    if(!err && typeof fn === "function") fn(rmws(data));
  });
}

describe('GPIO', function() {

  before(function(done) {
    gpioOut = gpio.open({
      pin: PIN_OUT,
      direction: gpio.DIRECTION.OUT
    }, function(err, pin) {
      done();
    });
  });

  after(function() {
    gpioOut.close();
  });

  describe('Pin Direction Out', function() {

    describe('initializing direction out', function() {
      it('should open specified pin with direction out', function(done) {
        read(pathOut + 'direction', function(direction) {
          assert.equal(direction, gpio.DIRECTION.OUT);
          done();
        });
      });

      it('should have default value of 0', function(done) {
        assert.equal(gpioOut.value, 0);
        read(pathOut + 'value', function(value) {
          assert.equal(value, '0');
          done();
        });
      });
    });


    // sys API supports "high" direction which sets direction to "out"
    // but also sets initial value to "1"
    describe('initializing direction high', function() {
      var gpioHigh;
      var directionHighPin = 25;

      before(function(done) {
        gpioHigh = gpio.open({
          pin: directionHighPin,
          direction: gpio.DIRECTION.HIGH
        }, function(err, pin) {
          done();
        });
      });

      after(function() {
        gpioHigh.close();
      });

      it('should support convert direction to "out"', function(done) {
        read(GPIO_PATH + directionHighPin + '/direction', function(direction) {
          assert.equal(direction, 'out');
          done();
        });
      });

      it('should set initial pin value to high', function(done) {
        read(GPIO_PATH + directionHighPin + '/value', function(value) {
          assert.equal(value, '1');
          done();
        });
      });
    });


    describe('#set', function() {
      it('should set header value to high', function(done) {
        gpioOut.set(function() {
          read(pathOut + 'value', function(value) {
            assert.equal(value, '1');
            done();
          });
        });
      });
    });


    describe('#reset', function() {
      it('should set header value to low', function(done) {
        gpioOut.reset(function() {
          read(pathOut + 'value', function(value) {
            assert.equal(value, '0');
            done();
          });
        });
      });
    });


    describe('#on :change', function() {
      it('should fire callback when value changes', function(done) {
        var callback = sinon.spy();
        gpioOut.on('change', callback);

        // set, then reset
        gpioOut.set(function() { gpioOut.reset(); });

        // set and reset is async, wait some time before running assertions
        setTimeout(function() {
          assert.ok(callback.calledTwice);
          done();
          gpioOut.removeListener('change', callback);
        }, 10);
      });
    });
  });


  // For these tests, make sure pin A is connected to pin B
  // pin B is exported with direction OUT and pin A is used
  // to simulate a hardware interrupt
  describe('Pin Direction In', function() {

    before(function(done) {
      gpioIn = gpio.open({
        pin: PIN_IN,
        direction: gpio.DIRECTION.IN
      }, function(err, pin) {
        done();
      });
    });

    after(function() {
      gpioIn.close();
    });

    describe('#on :change', function() {
      it('should respond to hardware set', function(done) {
        this.timeout(200);

        var callback = sinon.spy();
        gpioIn.on('change', callback);

        gpioOut.set();

        // filewatcher has default interval of 100ms
        setTimeout(function() {
          assert.equal(gpioOut.value, gpio.HIGH);
          assert.equal(gpioIn.value, gpio.HIGH);
          assert.ok(callback.calledOnce);
          gpioIn.removeListener('change', callback);
          done();
        }, 100);
      });

      it('should respond to hardware reset', function(done) {
        this.timeout(200);

        var callback = sinon.spy();
        gpioIn.on('change', callback);

        gpioOut.reset();

        // filewatcher has default interval of 100ms
        setTimeout(function() {
          assert.equal(gpioIn.value, gpio.LOW);
          assert.ok(callback.calledOnce);
          gpioIn.removeListener('change', callback);
          done();
        }, 100);
      });
    });
  });

});
