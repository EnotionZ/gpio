GpiO
====
Talk to your Raspberry Pi's GPIO


###Installation (Get node.js on your Raspberry Pi)
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
sudo su
make
make install
```

### Usage
```js
var gpio = require("./GpiO");
var gpio4 = gpio.export(4);
gpio4.set();      // sets pin to high
gpio4.reset();    // sets pin to low
gpio4.unexport(); // all done
```

### Example
Flashing Lights (with LED connected to GPIO22)
```js
// errrrr, this is only to show it could be done easily, don't do this foreal
var gpio22 = require("./GpiO").export(22);
setInterval(function() {
   gpio22.set();
   setTimeout(function() { gpio22.reset(); }, 500);
}, 1000);
```