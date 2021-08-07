const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

let GPIO_PATH = './sys/class/gpio'
const FILE_TO_WATCH = {
  export: `${GPIO_PATH}/export`,
  unexport: `${GPIO_PATH}/unexport`
}
let watcher
const pins = new Set()

module.exports = {
  start: function () {
    watcher = fs.watch(path.resolve(GPIO_PATH), function (eventType, filename) {
      if (eventType === 'change' && Object.keys(FILE_TO_WATCH).includes(filename)) {
        const pinNumber = fs.readFileSync(FILE_TO_WATCH[filename])

        if (filename === 'export') {
          createGPIOStructure(pinNumber)
          pins.add(pinNumber)
        }

        if (filename === 'unexport') {
          removeGPIODir(pinNumber)
          pins.delete(pinNumber)
        }
      }
    })
  },

  stop: function (cb) {
    watcher.close()
    pins.forEach(pinNumber => {
      removeGPIODir(pinNumber.toString())
    })
  },

  setConfig: function ({ gpiopath }) {
    GPIO_PATH = gpiopath || GPIO_PATH
  },

  readPinDirection: function (pinNumber) {
    return fs.readFileSync(`${getPinPath(pinNumber)}/direction`).toString()
  },

  readPinValue: function (pinNumber) {
    return fs.readFileSync(`${getPinPath(pinNumber)}/value`).toString()
  }
}


function createGPIOStructure (pinNumber) {
  mkdirp.sync(getPinPath(pinNumber))
  fs.writeFileSync(`${getPinPath(pinNumber)}/value`, '')
  fs.writeFileSync(`${getPinPath(pinNumber)}/direction`, '')
}

function removeGPIODir (pinNumber) {
  rimraf.sync(getPinPath(pinNumber))
}

function getPinPath (pinNumber) {
  return `${GPIO_PATH}/gpio${pinNumber}`
}
