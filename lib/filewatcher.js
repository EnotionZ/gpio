var util = require('./util');

// default check interval when watching for changes
var FILEWATCHER_INTERVAL = 100;

/******************************************************************************
 * FileWatcher - watches for changes to a file
 * This custom watcher exists because fs.watch doesn't get fired due to file
 * never getting "accessed" if pin is set via hardware
 * @param {string} path
 * @param {number} interval
 * @param {function} callback
 *****************************************************************************/
function FileWatcher(path, interval, callback) {
  if(typeof callback !== 'function' && typeof interval === 'function') {
    callback = interval;
  }

  if(typeof interval !== 'number') {
    interval = FILEWATCHER_INTERVAL;
  }

  if(typeof callback !== 'function') {
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
    util.readValue(self.path, function(val) {
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

module.exports = FileWatcher;
