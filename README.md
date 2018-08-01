# gpio - talk to your Single Board Computer's gpio headers


## Introduction

This plain JavaScript module is generic and only rely on system's *sysfs*.

Please consider other (more mature) gpio libraries out there which support better your hardware,

For instance, of you're looking for a reliable way to communicate with the Raspberry Pi using JavaScript,
check out the [wiring-pi JavaScript library](https://www.npmjs.com/package/wiring-pi).
It provides direct bindings to the fully-featured [Wiring Pi C library](http://wiringpi.com/).

But if you want/need a generic lightweight module, this one can be used as fallback.

## Support

Following hardware was reported to work (with some limitations or workarounds)

* ARTIK10 (inputs' pull down resistors are enabled by default)
* Raspberry Pi (use wiringpi's /usr/bin/gpio to change mode: gpio -g mode 11 up)


## Installation

Get node.js for your SBC,
If using Debian or deviates (Raspbian for RPi), you can simply run:
    sudo apt-get install nodejs

otherwise, install from node or [compile it](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

## Usage

This library is an npm package, just define "gpio" in your package.json dependencies or
```js
npm install gpio
```

Note: you must be have proper privileges to access the GPIO headers (or run node as root).

### Standard setup

```js
var gpio = require("gpio");

// Calling export with a pin number will export that header and return a gpio header instance
var gpio4 = gpio.export(4, {
   // When you export a pin, the default direction is out. This allows you to set
   // the pin value to either LOW or HIGH (3.3V) from your program.
   direction: gpio.DIRECTION.OUT,

   // set the time interval (ms) between each read when watching for value changes
   // note: this is default to 100, setting value too low will cause high CPU usage
   interval: 200,

   // Due to the asynchronous nature of exporting a header, you may not be able to
   // read or write to the header right away. Place your logic in this ready
   // function to guarantee everything will get fired properly
   ready: function() {
   }
});
```

### Header direction IN

If you plan to set the header voltage externally, use direction `in` and read value from your program.
```js
var gpio = require("gpio");
var gpio4 = gpio.export(4, {
   direction: gpio.DIRECTION.IN,
   ready: function() {
   }
});
```

## API Methods

```js
// sets pin to high
gpio4.set();
```
```js
// sets pin to low (can also call gpio4.reset())
gpio4.set(0);
```
```js
// Since setting a value happens asynchronously, this method also takes a
// callback argument which will get fired after the value is set
gpio4.set(function() {
   console.log(gpio4.value);    // should log 1
});
gpio4.set(0, function() {
   console.log(gpio4.value);    // should log 0
});
```
```js
// unexport program when done
gpio4.unexport();
```

### EventEmitter

This library uses node's [EventEmitter](http://nodejs.org/api/events.html) which allows you to watch
for value changes and fire a callback.
```js
// bind to the "change" event
gpio4.on("change", function(val) {
   // value will report either 1 or 0 (number) when the value changes
   console.log(val)
});
      
// you can bind multiple events
var processPin4 = function(val) { console.log(val); };
gpio4.on("change", processPin4);
            
// unbind a particular callback from the "change" event
gpio4.removeListener("change", processPin4);
      
// unbind all callbacks from the "change" event
gpio4.removeAllListeners("change");
      
// you can also manually change the direction anytime after instantiation            
gpio4.setDirection(gpio.DIRECTION.OUT);
gpio4.setDirection(gpio.DIRECTION.IN);
```

## Example

### Cycle voltage every half a second

```js
var gpio = require("gpio");
var gpio22, gpio4, intervalTimer;

// Flashing lights if LED connected to GPIO22
gpio22 = gpio.export(22, {
   ready: function() {
      intervalTimer = setInterval(function() {
         gpio22.set();
         setTimeout(function() { gpio22.reset(); }, 500);
      }, 1000);
   }
});

// Lets assume a different LED is hooked up to pin 4, the following code 
// will make that LED blink inversely with LED from pin 22 
gpio4 = gpio.export(4, {
   ready: function() {
      // bind to gpio22's change event
      gpio22.on("change", function(val) {
         gpio4.set(1 - val); // set gpio4 to the opposite value
      });
   }
});

// reset the headers and unexport after 10 seconds
setTimeout(function() {
   clearInterval(intervalTimer);          // stops the voltage cycling
   gpio22.removeAllListeners('change');   // unbinds change event
   gpio22.reset();                        // sets header to low
   gpio22.unexport();                     // unexport the header
   
   gpio4.reset();
   gpio4.unexport(function() {
      // unexport takes a callback which gets fired as soon as unexporting is done
      process.exit(); // exits your node program
   });
}, 10000)
```

## References

Demos on Raspberry Pi:

* Demo using LED: http://www.youtube.com/watch?v=2Juo-CJ6eu4
* Demo using RC car: http://www.youtube.com/watch?v=klQdX8-YVaI
* Source code here: https://github.com/EnotionZ/node-rc
