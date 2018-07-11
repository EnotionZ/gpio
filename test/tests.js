var fs = require('fs-extra');
var assert = require('assert');
var sinon = require('sinon');

var path = require('path');

var gpio = require('../lib/gpio');

function read(file, fn) {
    fs.readFile(file, "utf-8", function (err, data) {
        if (!err && typeof fn === "function") fn(data);
    });
}

// remove whitespace
function rmws(str) {
    return str.replace(/\s+/g, '');
}

const GPIO_BASE_PATH = path.join(__dirname, 'data');
const GPIO4_BASE_PATH = path.join(GPIO_BASE_PATH, 'gpio4');

describe('GPIO', function () {
    
    var gpio4;
    
    before(function (done) {
        gpio4 = gpio.export(4, {
            direction: 'out',
            ready: done,
            gpioBasePath: GPIO_BASE_PATH
        });
        fs.ensureFileSync(path.join(GPIO4_BASE_PATH, 'value'));
        fs.ensureFileSync(path.join(GPIO4_BASE_PATH, 'direction'));
    });
    
    after(function () {
        gpio4.unexport();
        fs.removeSync(GPIO_BASE_PATH);
    });
    
    describe('Header Direction Out', function () {
        
        describe('initializing', function () {
            it('should open specified header', function (done) {
                read(path.join(GPIO4_BASE_PATH, 'direction'), function (val) {
                    assert.equal(rmws(val), 'out');
                    done();
                });
            });
        });
        
        describe('#set', function () {
            it('should set header value to high', function (done) {
                gpio4.set(function () {
                    read(path.join(GPIO4_BASE_PATH, 'value'), function (val) {
                        assert.equal(rmws(val), '1');
                        done();
                    });
                });
            });
        });
        
        describe('#reset', function () {
            it('should set header value to low', function (done) {
                gpio4.reset(function () {
                    read(path.join(GPIO4_BASE_PATH, 'value'), function (val) {
                        assert.equal(rmws(val), '0');
                        done();
                    });
                });
            });
        });
        
        describe('#on :change', function () {
            it('should fire callback when value changes', function (done) {
                var callback = sinon.spy();
                gpio4.on('change', callback);
                
                // set, then reset
                gpio4.set(function () {
                    gpio4.reset();
                });
                
                // set and reset is async, wait some time before running assertions
                setTimeout(function () {
                    assert.ok(callback.calledTwice);
                    done();
                    gpio4.removeListener('change', callback);
                }, 10);
            });
        });
    });
    
    // For these tests, make sure header 4 is connected to header 25
    // header 25 is exported with direction "out" and header 4 is used
    // to simulate a hardware interrupt
    describe('Header Direction In', function () {
        
        var gpio25;
        
        before(function (done) {
            gpio25 = gpio.export(25, {
                direction: 'in',
                ready: done
            });
        });
        after(function () {
            gpio25.unexport();
        });
        
        describe('#on :change', function () {
            it('should respond to hardware set', function (done) {
                var callback = sinon.spy();
                gpio25.on('change', callback);
                
                // wait a little before setting
                setTimeout(function () {
                    gpio4.set();
                }, 500);
                
                // filewatcher has default interval of 100ms
                setTimeout(function () {
                    assert.equal(gpio25.value, 1);
                    assert.ok(callback.calledOnce);
                    gpio25.removeListener('change', callback);
                    done();
                }, 600);
            });
            
            it('should respond to hardware reset', function (done) {
                var callback = sinon.spy();
                gpio25.on('change', callback);
                
                // wait a little before setting
                setTimeout(function () {
                    gpio4.reset();
                }, 500);
                
                // filewatcher has default interval of 100ms
                setTimeout(function () {
                    assert.equal(gpio25.value, 0);
                    assert.ok(callback.calledOnce);
                    gpio25.removeListener('change', callback);
                    done();
                }, 600);
            });
        });
    });
    
});
