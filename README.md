gpio
====
Talk to your Raspberry Pi's GPIO

* demo using LED: http://www.youtube.com/watch?v=2Juo-CJ6eu4
* demo using RC car: http://www.youtube.com/watch?v=klQdX8-YVaI

## Usage

This library is an npm package, just define "gpio" in your package.json dependencies or
```js
npm install gpio
```

##### Pin direction "out"
When you export a pin, the default direction is out. This allows you to set the pin 
value to either LOW or HIGH (3.3V) from your program.
```js
var gpio = require("gpio");
var gpio4 = gpio.export(4);  // returns a gpio pin instance and exports that pin

gpio4.set();                 // sets pin to high
console.log(gpio4.value);    // should log 1

gpio4.set(0);                // sets pin to low (can also call gpio4.reset()
console.log(gpio4.value);    // should log 0

gpio4.unexport();            // all done
```

##### Pin direction "in" and event binding
You can set the pin direction so that the pin value can be set externally, then 
read pin value from your program. This library comes with an observer pattern which
allows you to watch for value changes and fire a callback.
```js
var gpio = require("gpio");
var gpio4 = gpio.export(4, "in");  // creates pin instance with direction "in"

// bind to the "valueChange" event
gpio4.on("valueChange", function(value) {
   // value will report either 1 or 0 (number) when the value changes
});

// bind multiple events
var processPin4 = function(val) { console.log(val); };
gpio4.on("valueChange", processPin4);

// unbind a particular callback from the "valueChange" event
gpio4.off("valueChange", processPin4);

// unbind all callbacks from the "valueChange" event
gpio4.off("valueChange");

// you can also manually change the direction anytime after instantiation
var gpio17 = gpio.export(17);
gpio17.setDirection("in");
gpio17.setDirection("out");
```

## Example
##### Flashing Lights (with LED connected to GPIO22)
```js
var gpio = require("gpio");
var gpio22 = gpio.export(22);
setInterval(function() {
   gpio22.set();
   setTimeout(function() { gpio22.reset(); }, 500);
}, 1000);

// Lets assume a different LED is hooked up to pin 4, the following code 
// will make that LED blink inversely with LED from pin 22 
var gpio4 = gpio.export(4);
gpio22.on("valueChange", function(val) {
  gpio4.set(1 - val); // when gpio22 changes value, set gpio4 to the opposite value
});
```

##### Controlling an RC car
Source code here: https://github.com/EnotionZ/node-rc


##Installation (Get node.js on your Raspberry Pi)
1. Install packages:
```bash
sudo apt-get install git-core build-essential libssl-dev
```

2. Grab node source
```bash
git clone https://github.com/joyent/node.git
git checkout v0.6.18-release (or current stable)
```

3. Use armv6 architecture to compile
```bash
export CCFLAGS='-march=armv6'
export CXXFLAGS='-march=armv6'
```

4. Edit deps/v8/SConstruct, line 82
```bash
all': {
   'CCFLAGS':      ['$DIALECTFLAGS', '$WARNINGFLAGS', '-march=armv6'],
   'CXXFLAGS':     ['-fno-rtti', '-fno-exceptions', '-march=armv6'],
 },
```

5. Edit same file, line 157, remove *'vfp3:on'* and *'simulator:none'

6. configure the build
```bash
./configure  --openssl-libpath=/usr/lib/ssl
```

7. Install!!
```bash
make
sudo make install
```
