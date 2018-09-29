# gpio - talk to your Single Board Computer's GPIO pins

[![NPM](https://nodei.co/npm/gpio.png)](https://npmjs.org/package/gpio)


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


## Usage

Get node.js for your SBC.
If using Debian or deviates (Raspbian for RPi), you can simply run `sudo apt-get install nodejs`.

Define _gpio_ in your _package.json_ dependencies or run `npm install gpio` and
ensure you have proper privileges to access the GPIO pins.

### Open GPIO pin for output

Gain access to GPIO pin and set pin value

```js
var gpio = require("gpio");

// create GPIO pin instance
var gpio4 = gpio.open({
    pin: 4,

    // When you open a pin, the default direction is out. This allows you to set
    // the pin value to either LOW or HIGH (3.3V) from your program.
    direction: gpio.DIRECTION.OUT,

}, function(err, gpioPin) {
    // Due to the asynchronous nature of opening pin, place code in this callback
    // Check for error before proceeding
    if(err) return console.log(err);

    // `gpioPin` parameter is the GPIO pin instance (the same as `gpio4`)
    gpioPin.set();
});
```

### Open GPIO pin to read input

If you plan to set the pin value via hardware, use `gpio.DIRECTION.IN` and read value from your program.

```js
gpio.open({
    pin: 4,

    // set input direction
    direction: gpio.DIRECTION.IN,

    // set the time interval (ms) between each read when watching for value changes
    // this is only applicable in input mode and defaults to 100ms
    // warning: setting value too low will cause high CPU usage
    interval: 100

}, function(err, gpioPin) {
    if(err) return console.log(err);

    // read pin value
    console.log(gpioPin.value);
});
```


## API Variables and Methods

### Instance variables
```js
gpioPin.pin       // pin number
gpioPin.value     // either gpio.HIGH or gpio.LOW
gpioPin.direction // either gpio.DIRECTION.IN or gpio.DIRECTION.OUT
```

### Set pin value

Set pin HIGH
```js
gpioPin.set();
```

Set pin LOW
```js
gpioPin.set(gpio.LOW);
gpioPin.set(false);
gpioPin.set(0);
gpioPin.reset();
```

Since setting a value happens asynchronously, these methods take a callback
argument which will get fired after the value is set
```js
gpioPin.set(function() {
    console.log(gpioPin.value);    // should log 1
});

gpioPin.set(gpio.LOW, function() {
    console.log(gpioPin.value);    // should log 0
});

gpioPin.reset(function() {
    console.log(gpioPin.value);    // should log 0
});
```

### Set pin direction

While direction is typically set when you open the pin, it's possible to
manually change the direction after instantiation

```js
gpioPin.setDirection(gpio.DIRECTION.OUT);
gpioPin.setDirection(gpio.DIRECTION.IN);
```

### Close pin

Remember to close the pin when your program is done

```js
gpioPin.close();
```

### Listening to pin changes

This library uses node's [EventEmitter](http://nodejs.org/api/events.html)
which allows you to watch for changes and fire a callback.

Listening to value changes
```js
gpioPin.on("change", function(val) {
    // val is the same as gpioPin.value
    console.log(val);
});

// you can bind multiple events
var processPin4 = function(val) { console.log(val); };
gpioPin.on("change", processPin4);

// unbind a particular callback from the "change" event
gpioPin.removeListener("change", processPin4);

// unbind all callbacks from the "change" event
gpioPin.removeAllListeners("change");
```


## Basic Example

Cycle voltage every half a second

```js
var gpio = require("gpio");

// Flashing lights if LED connected to GPIO22
var gpio22 = gpio.open({
    pin: 22,
    direction: gpio.DIRECTION.OUT
}, function(err, pin) {
    if(err) return console.log(err);

    // blink at one second interval
    var intervalTimer = setInterval(function() {
        pin.set();
        setTimeout(function() { pin.reset(); }, 500);
    }, 1000);

    // stop voltage cycling after 10 seconds
    setTimeout(function() {
        clearInterval(intervalTimer);
    }, 10000);
});
```

Expanding on above code, assume a different LED is hooked up to GPIO4.
The following code will blink GPIO4 LED inversely with GPIO22 LED.

```js
var gpio4 = gpio.open({
    pin: 4,
    direction: gpio.DIRECTION.OUT
}, function(err, pin) {
    if(err) return console.log(err);

    // bind to gpio22's change event
    gpio22.on("change", function(val) {
        // set gpio4 to the opposite value
        pin.set(!val);
    });
});
```

Remember to close and cleanup your program when done

```js
setTimeout(function() {
    gpio22.removeAllListeners('change');   // unbinds change event
    gpio22.reset();                        // sets pin to low
    gpio4.reset();

    gpio22.close();                        // close the pin
    gpio4.close(function() {
        // this method takes a callback which fires as soon as closing is done
        process.exit();
    });
}, 10000)
```


## Other examples and references

Demos on Raspberry Pi:

* Demo using LED: http://www.youtube.com/watch?v=2Juo-CJ6eu4
* Demo using RC car: http://www.youtube.com/watch?v=klQdX8-YVaI
* Source code: https://github.com/EnotionZ/node-rc


## Contributing

Suggestions, bug reports, and pull requests are welcomed. Make sure all tests
passed before submitting a PR (`npm test`). Please adhere to the existing
code-style - we strictly use 2-space soft tabs and try to follow the
[Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html).
Maintainers will decide when to bump the version number and publish the package.


### Contributors

Please add yourself as appropriate.

* Dominick Pham (creator) - [@enotionz](https://github.com/enotionz)
* Philippe Coval (maintainer) - [@rzr](https://github.com/rzr)
