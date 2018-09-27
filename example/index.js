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

function main()
{
  console.log("log: make sure to have access to /sys/class/gpio/");
  var input = require('./input');
  var output = require('./output');
  var inconfig = process.argv[2] ? { 'pin': Number(process.argv[2]) } : null;
  var outconfig = process.argv[3] ? { 'pin' : Number(process.argv[3]) } : null;
  new input(inconfig);
  new output(outconfig);
}

module.exports = main;

if (require.main === module) {
  main();
}
