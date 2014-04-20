var gpio = require("gpio");
var intervalTimer;

var items = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ];
var gpios = [];
var current = 0;

function async(i, callback) {
  console.log('prepare : ' + i);
  callback(gpio.export(i, {
   ready: function() {
      console.log('ready : ' + i);
   }
  }));
}
function final() {
  console.log('Done', '');

  setInterval(function() {
         current = (current + 1) % 16;
         gpio = gpios[current]
         gpio.set(gpio.value - 1);
         console.log('switching : ' + current + ' to ' + gpio.value);
  }, 100);
}

items.forEach(function(item) {
  async(item, function(result) {
    gpios.push(result);
    if(gpios.length == items.length) {
      final();
    }
  })
});
