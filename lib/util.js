/******************************************************************************
 * Utils
 *****************************************************************************/
var util = {};
var fs = require('fs');
var exists = fs.existsSync || path.exists;

/**
 * log if error occurred
 * @param {object} err
 */
util.logError = function(err) {
  if(GPIO.logging && err) {
    console.error(err);
  }
};

/**
 * log output of a call (if logging enabled)
 * @param {Object[]} arguments
 */
util.logMessage = function() {
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
util.writeValue = function(value, filePath, callback, override) {
  if(typeof callback !== 'function') {
    callback = util.logError;
  }

  fs.writeFile(filePath, value, function(err) {
    if(err && !override) {
      err.path = filePath;
      err.action = 'write';
      util.logError(err);
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
util.readValue = function(filePath, callback) {
  fs.readFile(filePath, 'utf-8', function(err, data) {
    if(err) {
      err.path = filePath;
      err.action = 'read';
      util.logError(err);
    } else {
      if(typeof callback === 'function') {
        callback(data);
      } else {
        util.logMessage('value: ', data);
      }
    }
  });
};


/**
 * check if file is writable
 * @param {string} filePath
 * @param {function} callback
 */
util.checkFileWritable = function(filePath, callback) {
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

module.exports = util;
