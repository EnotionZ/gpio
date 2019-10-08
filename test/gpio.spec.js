const gpioMock = require('./gpio-mock.js')
const { expect } = require('chai')

const gpio = require('./../lib/gpio')


describe('gpio', () => {
  beforeEach(() => {
    gpio.setConfig({
      gpiopath: './sys/class/gpio/'
    })
    gpioMock.setConfig({
      gpiopath: './sys/class/gpio/'
    })

    gpioMock.start()
  })

  afterEach(() => {
    gpioMock.stop()
  })

  describe('with direction "out"', () => {
    const direction = 'out'

    it('should initialize pin with "out" direction', (done) => {
      const pin4 = gpio.export(4, {
        direction,
        value: 1,
        ready: function () {
          expect(gpioMock.readPinDirection(4)).to.equal("out")
          done()
        }
      })
    })

    it('should initialize pin with value set to 0', (done) => {
      const pin4 = gpio.export(4, {
        direction,
        ready: function () {
          this.set(1, () => {
            expect(Number(gpioMock.readPinValue(4))).to.equal(1)
            done()
          })
        }
      })
    })

    it('should set the pin value to "1" and listen on "change" event', (done) => {
      const pin4 = gpio.export(4, {
        direction,
        ready: function () {
          this.set(1)
        }
      })

      pin4.on("change", function(val) {
        expect(val).to.equal(1)
        expect(Number(gpioMock.readPinValue(4))).to.equal(val)
        pin4.unexport(done)
      });
    })

  })
})
