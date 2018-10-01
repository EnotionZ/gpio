/*global describe, before, after, it*/
var fs = require('fs');
var assert = require('assert');
var sinon = require('sinon');
var gpio = require('../lib/gpio');

// connect this pin to 3V3 to test for HIGH input
var PIN_HIGH = 22;

var PIN_OUT = 4;
var PIN_IN = 17;

var pathA = '/sys/class/gpio/gpio' + PIN_OUT + '/';
var gpioA, gpioB;

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

  before(function(done) {
    gpioA = gpio.open({
      pin: PIN_OUT,
      direction: gpio.DIRECTION.OUT
    }, function(err, self) {
      done();
    });
  });

  after(function() {
    gpioA.close();
  });

  describe('Header Direction Out', function() {

    describe('initializing', function() {
      it('should open specified header', function(done) {
        read(pathA + 'direction', function(val) {
          assert.equal(rmws(val), gpio.DIRECTION.OUT);
          done();
        });
      });
    });

    describe('#set', function() {
      it('should set header value to high', function(done) {
        gpioA.set(function() {
          read(pathA + 'value', function(val) {
            assert.equal(rmws(val), '1');
            done();
          });
        });
      });
    });

    describe('#reset', function() {
      it('should set header value to low', function(done) {
        gpioA.reset(function() {
          read(pathA + 'value', function(val) {
            assert.equal(rmws(val), '0');
            done();
          });
        });
      });
    });

    describe('#on :change', function() {
      it('should fire callback when value changes', function(done) {
        var callback = sinon.spy();
        gpioA.on('change', callback);

        // set, then reset
        gpioA.set(function() { gpioA.reset(); });

        // set and reset is async, wait some time before running assertions
        setTimeout(function() {
          assert.ok(callback.calledTwice);
          done();
          gpioA.removeListener('change', callback);
        }, 10);
      });
    });
  });

  // For these tests, make sure pin A is connected to pin B
  // pin B is exported with direction OUT and pin A is used
  // to simulate a hardware interrupt
  describe('Header Direction In', function() {

    before(function(done) {
      gpioB = gpio.open({
        pin: PIN_IN,
        direction: gpio.DIRECTION.IN
      }, function(err, self) {
        done();
      });
    });

    after(function() {
      gpioB.close();
    });

    describe('Report correct initial pin value', function() {
      it('should report correct LOW pin', function(done) {
        gpio.open({
          pin: PIN_IN,
          direction: gpio.DIRECTION.IN
        }, function(err, pin) {
          assert.equal(pin.value, gpio.LOW);
          done();
        });
      });

      it('should report correct HIGH pin', function(done) {
        gpio.open({
          pin: PIN_HIGH,
          direction: gpio.DIRECTION.IN
        }, function(err, pin) {
          assert.equal(pin.value, gpio.HIGH);
          done();
        });
      });
    });


    describe('#on :change', function() {
      it('should respond to hardware set', function(done) {
        this.timeout(200);

        var callback = sinon.spy();
        gpioB.on('change', callback);

        gpioA.set();

        // filewatcher has default interval of 100ms
        setTimeout(function() {
          assert.equal(gpioA.value, gpio.HIGH);
          assert.equal(gpioB.value, gpio.HIGH);
          assert.ok(callback.calledOnce);
          gpioB.removeListener('change', callback);
          done();
        }, 100);
      });

      it('should respond to hardware reset', function(done) {
        this.timeout(200);

        var callback = sinon.spy();
        gpioB.on('change', callback);

        gpioA.reset();

        // filewatcher has default interval of 100ms
        setTimeout(function() {
          assert.equal(gpioB.value, gpio.LOW);
          assert.ok(callback.calledOnce);
          gpioB.removeListener('change', callback);
          done();
        }, 100);
      });
    });
  });

});
