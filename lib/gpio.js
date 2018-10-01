var fs = require('fs');
var exists = fs.existsSync || path.exists;
var path = require('path');
var EventEmitter = require('events').EventEmitter;

var util = require('./util');
var FileWatcher = require('./filewatcher');


/******************************************************************************
 * GPIO Exports
 *****************************************************************************/

var GPIO = module.exports = {};

GPIO.logging = false;

GPIO.PATH = '/sys/class/gpio/';

GPIO.HIGH = 1;
GPIO.LOW = 0;

var DIRECTIONS = ['in', 'out', 'high'];
GPIO.DIRECTION = {
  IN:   DIRECTIONS[0],
  OUT:  DIRECTIONS[1],
  HIGH: DIRECTIONS[2]  // out with initial high
};

/**
 * open a GPIO pin
 * @param {object}   opts
 * @param {number}   opts.pin
 * @param {string}   opts.direction
 * @param {number}   opts.interval
 * @param {function(Error, GPIOPin):void} callback
 */
GPIO.open = function(opts, callback) {
  opts = opts || {};

  if(typeof opts.pin !== 'number') {
    var error = new Error('no pin specified')
    if(typeof callback !== 'function') {
      throw error;
    } else {
      callback(error);
    }
  }

  return new GPIOPin(opts, callback);
};

/**
 * export a GPIO pin
 * @deprecated use GPIO.open instead
 * @param {number}   pin
 * @param {object}   opts
 * @param {string}   opts.direction
 * @param {number}   opts.interval
 * @param {function} opts.ready
 */
GPIO.export = function(pin, opts) {
  console.warn('Calling deprecated method, use GPIO.open instead');
  if(!opts || typeof opts !== 'object') {
    opts = {};
  }
  opts.pin = pin;
  var callback = opts.ready;
  delete opts.ready;
  return GPIO.open(opts, callback);
};

/**
 * close a GPIO pin
 * @param {number} pin
 * @param {function(Error):void} callback
 */
GPIO.close = function(pin, callback) {
  util.writeValue(pin, GPIO.PATH + 'unexport', function(err) {
    if(typeof callback === 'function') {
      callback(err);
    }
  }, true);
};

/**
 * unexport a GPIO pin
 * @deprecated use GPIO.close instead
 * @param {number} pin
 * @param {function(Error):void} callback
 */
GPIO.unexport = function(pin, callback) {
  console.warn('Calling deprecated method, use GPIO.close instead');
  return GPIO.close(pin, callback);
};


/******************************************************************************
 * GPIO Pin
 * @param {object}   opts
 * @param {number}   opts.pin
 * @param {string}   opts.direction
 * @param {function(Error, GPIOPin):void} callback
 *****************************************************************************/
function GPIOPin(opts, callback) {
  var self = this;

  self.pin       = opts.pin;
  self.direction = opts.direction;
  self.interval  = opts.interval;
  self.value     = GPIO.LOW;

  self.PATH = {};
  self.PATH.PIN =       GPIO.PATH + 'gpio' + self.pin + '/';
  self.PATH.VALUE =     self.PATH.PIN + 'value';
  self.PATH.DIRECTION = self.PATH.PIN + 'direction';

  if(typeof callback !== 'function') {
    callback = function() {};
  }
  self.open(callback);
}

/**
 * Enable observer with EventEmitter class
 */
require('util').inherits(GPIOPin, EventEmitter);

/**
 * open GPIO pin
 * @param {function(Error, GPIOPin):void} callback
 */
GPIOPin.prototype.open = function(callback) {
  var self = this;

  // already opened, close and open again
  if(exists(GPIO.PATH + 'gpio'+self.pin)) {
    util.logMessage('Pin already exported');
    GPIO.close(self.pin, function() {
      self.open(callback);
    });
    return;
  }

  // export pin
  util.logMessage('Exporting gpio' + self.pin);
  util.writeValue(self.pin, GPIO.PATH + 'export', function(err) {
    var attempts = 0;
    var makeAttempt = function() {
      attempts += 1;

      // export done, now try setting direction
      util.checkFileWritable(self.PATH.DIRECTION, function(err) {
        if(err) {
          // Unable to gain write access
          util.logMessage('Could not write to pin: ' + err.code);
          if(attempts <= 5) {
            util.logMessage('Trying again in 100ms');
            setTimeout(makeAttempt, 100);
          } else {
            util.logMessage('Failed to access pin after 5 attempts. Giving up.');
            callback.call(self, new Error('Unable to open pin'), self);
          }
          return;
        }

        // successful write access
        self.setDirection(self.direction, function () {
          if(self.direction === GPIO.DIRECTION.IN) {
            self.value = undefined;
            self.get_(function(val) {
              self.value = val;
              callback.call(self, null, self);
            });
          } else {
            callback.call(self, null, self);
          }
        });
      });
    };

    makeAttempt();
  }, true);

};

/**
 * @deprecated use GPIOPin.prototype.open instead
 * @param {function} callback
 */
GPIOPin.prototype.export = function(callback) {
  console.warn('Calling deprecated method "export", use "open" instead');
  return GPIOPin.prototype.open(callback);
};

/**
 * asynchronously closes GPIO pin
 * @param {function(Error):void} callback
 */
GPIOPin.prototype.close = function(callback) {
  if(this.valueWatcher) {
    this.valueWatcher.stop();
  }

  this.removeAllListeners('change');
  this.removeAllListeners('valueChange');
  this.removeAllListeners('directionChange');

  GPIO.close(this.pin, callback);
};

/**
 * @deprecated use GPIOPin.prototype.close instead
 * @param {function(Error):void} callback
 */
GPIOPin.prototype.unexport = function(callback) {
  console.warn('Calling deprecated method "unexport", use "close" instead');
  return GPIOPin.prototype.close(callback);
};

/**
 * Sets IO direction
 * @param {string=GPIO.DIRECTION.OUT} direction
 * @param {function} callback
 */
GPIOPin.prototype.setDirection = function(direction, callback) {
  var self = this;

  // in case number value high (1) or low (0) is used, convert to string
  if(typeof direction === 'number') {
    direction = direction + '';
  }

  if(typeof direction !== 'string' || DIRECTIONS.indexOf(direction) === -1) {
    direction = GPIO.DIRECTION.OUT;
  }
  self.direction = direction;

  util.logMessage('Setting direction "' + direction + '" on gpio' + self.pin);

  function watch () {
    if(direction === GPIO.DIRECTION.IN) {
      if (!self.valueWatcher) {
        // watch for value changes only for direction IN
        // since we manually trigger event for OUT direction when setting value
        self.valueWatcher = new FileWatcher(self.PATH.VALUE, self.interval, function(val) {
          val = parseInt(val, 10);
          self.value = val;
          self.emit('valueChange', val);
          self.emit('change', val);
        });
        self.interval = self.valueWatcher.interval;
      }
    } else {
      // if direction is OUT, try to clear the valueWatcher
      if(self.valueWatcher) {
        self.valueWatcher.stop();
        self.valueWatcher = null;
      }
    }
  }

  util.readValue(self.PATH.DIRECTION, function(currDirection) {
    var changedDirection = false;

    if(currDirection.indexOf(direction) !== -1) {
      util.logMessage('Current direction is already ' + direction);
      util.logMessage('Attempting to set direction anyway.');
    } else {
      changedDirection = true;
    }

    util.writeValue(direction, self.PATH.DIRECTION, function() {
      watch();

      if(typeof callback === 'function') {
        callback();
      }
      if(changedDirection) {
        self.emit('directionChange', direction);
      }
    }, true);

  });
};

/**
 * get pin value
 * @param {function(number):void} callback
 */
GPIOPin.prototype.get_ = function(callback) {
  var self = this, currentValue = self.value;

  if(self.direction === GPIO.DIRECTION.OUT) {
    return currentValue;
  }

  util.readValue(self.PATH.VALUE, function(value) {
    value = parseInt(value, 10);
    if(value !== currentValue) {
      self.value = value;
      if(typeof callback === 'function') {
        callback.call(self, self.value);
      }
    }
  });
};

/**
 * Set pin value
 * @param {number=GPIO.HIGH} value
 * @param {function(number, boolean):void} callback
 */
GPIOPin.prototype.set = function(value, callback) {
  var self = this;

  // allows invoking set(callback) to set pin high
  if(typeof value === 'function') {
    callback = value;
  }

  // boolean support
  if (typeof value === 'boolean') {
    value = value ? GPIO.HIGH : GPIO.LOW;
  }

  // default value to high if invalid or not low
  if (typeof value !== 'number' || value !== GPIO.LOW) {
    value = GPIO.HIGH;
  }

  // if direction is out, just emit change event since we can reliably predict
  // if the value has changed; we don't have to rely on watching a file
  if(self.direction === GPIO.DIRECTION.OUT) {
    if(self.value !== value) {
      util.writeValue(value, self.PATH.VALUE, function() {
        self.value = value;
        self.emit('valueChange', value);
        self.emit('change', value);

        if(typeof callback === 'function') {
          callback(self.value, true);
        }
      });

    } else {
      // value hasn't changed
      if(typeof callback === 'function') {
        callback(self.value, false);
      }
    }
  }
};

/**
 * Set pin value LOW
 * @param {function} callback
 */
GPIOPin.prototype.reset = function(callback) {
  this.set(GPIO.LOW, callback);
};
