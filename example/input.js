// -*- mode: js; js-indent-level:2; -*-
// Copyright: 2018-present Samsung Electronics France and other contributors
//{
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//}

var gpio = require("gpio");

/// SW403 on ARTIK710 interposer board
var DEFAULT_INPUT_PIN = 30;

var main = function(config)
{
  var self = this;
  self.config = config || {
    pin: DEFAULT_INPUT_PIN
  }
  self.config.direction || (self.config.direction = gpio.DIRECTION.IN);
  console.log("log: pin" + self.config.pin + ": opening: direction: " + self.config.direction);
  self.port = gpio.export(self.config.pin, {
    direction: self.config.direction,
    ready: function() {
      console.log("log: pin" + self.config.pin + ": ready:");
      this.on("change", function(val) {
        console.log("log: pin" + self.config.pin + ": change: " + val);
      });
    }
  });
}

module.exports = main;

if (!module.parent) {
  var pin = process.argv[2] ? Number(process.argv[2]) : DEFAULT_INPUT_PIN;
  main({pin: pin});
}
