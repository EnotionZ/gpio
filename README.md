gpio
====
Talk to your Raspberry Pi's GPIO

* demo using LED: http://www.youtube.com/watch?v=2Juo-CJ6eu4
* demo using RC car: http://www.youtube.com/watch?v=klQdX8-YVaI

##Installation
Get node.js on your Raspberry Pi - https://github.com/gflarity/node_pi

## Usage

This library is an npm package, just define "gpio" in your package.json dependencies or
```js
npm install gpio
```

##### Standard usage

```js
var gpio = require("gpio");

// Calling export with a pin number will export that header and return a gpio header instance
var gpio4 = gpio.export(4, {
   // When you export a pin, the default direction is out. This allows you to set
   // the pin value to either LOW or HIGH (3.3V) from your program.
   direction: 'out',
   
   // Due to the asynchronous nature of exporting a header, you may not be able to
   // read or write to the header right away. Place your logic in this ready
   // function to guarantee everything will get fired properly
   ready: function() {
      gpio4.set();                 // sets pin to high
      console.log(gpio4.value);    // should log 1
      
      gpio4.set(0);                // sets pin to low (can also call gpio4.reset()
      console.log(gpio4.value);    // should log 0
      
      gpio4.unexport();            // all done
   }
});
```

##### Header direction "in" and event binding
If you plan to set the header voltage externally, use direction 'in' and read value from your program.
This library uses node's EventEmitter (http://nodejs.org/api/events.html) which allows you to watch
for value changes and fire a callback. Event bindings also work when direction is 'out'.
```js
var gpio = require("gpio");

// creates pin instance with direction "in"
var gpio4 = gpio.export(4, {
   direction: "in",
   ready: function() {
            
      // bind to the "change" event
      // see nodejs's EventEmitter 
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
      gpio4.setDirection("out");
      gpio4.setDirection("in");
   }
});
```

## Example
##### Cycle voltage every half a second
```js
var gpio = require("gpio");
var gpio22, gpio4, intervalTimer;

// Flashing lights if LED connected to GPIO22
gpio22 = gpio.export(22, {
   ready: function() {
      inervalTimer = setInterval(function() {
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


##### Controlling an RC car
Source code here: https://github.com/EnotionZ/node-rc

