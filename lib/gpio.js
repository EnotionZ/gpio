var fs = require('fs');
var util = require('util');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var exists = fs.existsSync || path.exists;

var GPIO = {}, UTIL = {};

// default check interval when watching for changes
var FILEWATCHER_INTERVAL = 100;

/******************************************************************************
 * GPIO Exports
 *****************************************************************************/

module.exports = GPIO;

GPIO.logging = false;

GPIO.PATH = '/sys/class/gpio/';

GPIO.HIGH = 1;
GPIO.LOW = 0;

GPIO.DIRECTION = {
  IN: 'in',
  OUT: 'out'
};

/**
 * Instantiate a GPIOPin
 * @param {object}   opts
 * @param {number}   opts.pin
 * @param {string}   opts.direction
 * @param {number}   opts.interval
 * @param {function(Error, GPIOPin):void} callback
 */
GPIO.open = function(opts, callback) {
  return new GPIOPin(opts, callback);
};

/**
 * Instantiate a GPIOPin
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
 * Asynchronously closes a GPIO pin
 * @param {number} pin
 * @param {function(Error):void} callback
 */
GPIO.close = function(pin, callback) {
  UTIL.writeValue(pin, GPIO.PATH + 'unexport', function(err) {
    if(typeof callback === 'function') {
      callback(err);
    }
  }, true);
};

/**
 * Asynchronously closes a GPIO pin
 * @deprecated use GPIO.close instead
 * @param {number} pin
 * @param {function(Error):void} callback
 */
GPIO.unexport = function(pin, callback) {
  console.warn('Calling deprecated method, use GPIO.close instead');
  return GPIO.close(pin, callback);
};


/******************************************************************************
 * Utils
 *****************************************************************************/

/**
 * log if error occurred
 * @param {object} err
 */
UTIL.logError = function(err) {
  if(GPIO.logging && err) {
    console.error(err);
  }
};

/**
 * log output of a call (if logging enabled)
 * @param {Object[]} arguments
 */
UTIL.logMessage = function() {
  if (exports.logging) {
    console.log.apply(console, arguments);
  }
};

/**
 * write value to file
 * @param {string} value
 * @param {string} filePath
 * @param {function} callback
 * @param {override} boolean
 */
UTIL.writeValue = function(value, filePath, callback, override) {
  if(typeof callback !== 'function') {
    callback = UTIL.logError;
  }

  fs.writeFile(filePath, value, function(err) {
    if(err && !override) {
      err.path = filePath;
      err.action = 'write';
      UTIL.logError(err);
    } else {
      callback(err);
    }
  });
};

/**
 * read value from file
 * @param {string} filePath
 * @param {function} callback
 */
UTIL.readValue = function(filePath, callback) {
  fs.readFile(filePath, 'utf-8', function(err, data) {
    if(err) {
      err.path = filePath;
      err.action = 'read';
      UTIL.logError(err);
    } else {
      if(typeof callback === 'function') {
        callback(data);
      } else {
        UTIL.logMessage('value: ', data);
      }
    }
  });
};

/**
 * asynchronous attempt to open a GPIO pin
 * @param {number} pin
 * @param {function} callback
 */
UTIL.openPin = function(pin, callback) {
  if(exists(GPIO.PATH + 'gpio'+pin)) {
    // already opened, close and open again
    UTIL.logMessage('Pin already exported');
    GPIO.close(pin, function() {
      UTIL.openPin(pin, callback);
    });
  } else {
    UTIL.logMessage('Exporting gpio' + pin);
    UTIL.writeValue(pin, GPIO.PATH + 'export', function(err) {
      // if there's an error when opening, close and repeat
      if(err) {
        GPIO.close(pin, function() {
          UTIL.openPin(pin, callback);
        });
      } else if(typeof callback === 'function') {
        callback();
      }
    }, true);
  }
};

/**
 * check if file is writable
 * @param {string} filePath
 * @param {function} callback
 */
UTIL.checkFileWritable = function(filePath, callback) {
  fs.open(filePath, 'w', function(err, fd) {
    if(err) {
      callback(err);
    } else {
      fs.close(fd, function(err) {
        callback(null);
      });
    }
  });
};


/******************************************************************************
 * FileWatcher - watches for changes to a file
 * This custom watcher exists because fs.watch doesn't get fired due to file
 * never getting "accessed" if pin is set via hardware
 * @param {string} path
 * @param {number} interval
 * @param {function} callback
 *****************************************************************************/
function FileWatcher(path, interval, callback) {
  if(typeof callback === 'undefined') {
    callback = interval;
    interval = FILEWATCHER_INTERVAL;
  }

  if(typeof interval !== 'number' || typeof callback !== 'function') {
    throw Error('Error initializing FileWatcher, check init arguments');
  }

  this.path       = path;
  this.interval   = interval;
  this.callback   = callback;
  this.value      = null;
  this.readTimer_ = null;

  this.start();
}

/**
 * start watching file changes
 */
FileWatcher.prototype.start = function() {
  var self = this;
  self.readTimer_ = setInterval(function() {
    UTIL.readValue(self.path, function(val) {
      if(self.value !== val) {
        if(typeof self.value !== 'undefined') {
          self.callback(val);
        }
        self.value = val;
      }
    });
  }, self.interval);
};

/**
 * stop watching file changes
 */
FileWatcher.prototype.stop = function() {
  clearInterval(this.readTimer_);
};


/******************************************************************************
 * GPIO Pin
 * @param {object}   opts
 * @param {number}   opts.pin
 * @param {string}   opts.direction
 * @param {function(Error, GPIOPin):void} callback
 *****************************************************************************/
function GPIOPin(opts, callback) {
  opts = opts || {};

  var self = this;
  var pin = opts.pin;
  var direction = opts.direction;
  var interval = opts.interval;

  if(typeof interval !== 'number') {
    interval = FILEWATCHER_INTERVAL;
  }

  if(typeof callback !== 'function') {
    callback = function() {};
  }

  self.interval = interval;
  self.pin      = pin;
  self.value    = GPIO.LOW;

  self.PATH = {};
  self.PATH.PIN =       GPIO.PATH + 'gpio' + pin + '/';
  self.PATH.VALUE =     self.PATH.PIN + 'value';
  self.PATH.DIRECTION = self.PATH.PIN + 'direction';

  self.open(function() {

    var attempts = 0;
    var makeAttempt = function() {
      attempts += 1;

      UTIL.checkFileWritable(self.PATH.DIRECTION, function(err) {
        if(err) {
          // Unable to gain write access
          UTIL.logMessage('Could not write to pin: ' + err.code);
          if(attempts <= 5) {
            UTIL.logMessage('Trying again in 100ms');
            setTimeout(makeAttempt, 100);
          } else {
            UTIL.logMessage('Failed to access pin after 5 attempts. Giving up.');
            callback.call(self, 'Unable to open pin', self);
          }

        } else {
          // successful write access
          self.setDirection(direction, function () {
            if(direction === GPIO.DIRECTION.OUT) {
              callback.call(self, null, self);
            } else {
              self.value = undefined;
              self.get_(function(val) {
                self.value = val;
                callback.call(self, null, self);
              });
            }
          });
        }
      });

    };

    makeAttempt();
  });
}

/**
 * Enable observer with EventEmitter class
 */
util.inherits(GPIOPin, EventEmitter);

/**
 * asyncronously open GPIO pin
 * @param {function} callback
 */
GPIOPin.prototype.open = function(callback) {
  UTIL.openPin(this.pin, callback);
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
  if(typeof direction !== 'string' || direction !== GPIO.DIRECTION.IN) {
    direction = GPIO.DIRECTION.OUT;
  }
  self.direction = direction;

  UTIL.logMessage('Setting direction "' + direction + '" on gpio' + self.pin);

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
      }
    } else {
      // if direction is OUT, try to clear the valueWatcher
      if(self.valueWatcher) {
        self.valueWatcher.stop();
        self.valueWatcher = null;
      }
    }
  }

  UTIL.readValue(self.PATH.DIRECTION, function(currDir) {
    var changedDirection = false;
    if(currDir.indexOf(direction) !== -1) {
      UTIL.logMessage('Current direction is already ' + direction);
      UTIL.logMessage('Attempting to set direction anyway.');
    } else {
      changedDirection = true;
    }

    UTIL.writeValue(direction, self.PATH.DIRECTION, function() {
      watch();

      if(typeof callback === 'function') {
        callback();
      }
      if (changedDirection) {
        self.emit('directionChange', direction);
      }
    }, true);

  });
};

/**
 * asynchronous get pin value
 * @param {function(number):void} callback
 */
GPIOPin.prototype.get_ = function(callback) {
  var self = this, currentValue = self.value;

  if(self.direction === GPIO.DIRECTION.OUT) {
    return currentValue;
  }

  UTIL.readValue(self.PATH.VALUE, function(value) {
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
      UTIL.writeValue(value, self.PATH.VALUE, function() {
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
