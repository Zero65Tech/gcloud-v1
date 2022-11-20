try {

  module.exports = require('@zero65/config');

} catch (e) {

  exports.run = {

    "default": {

      "region"   : "asia-southeast1",
      "platform" : "managed",
      "port"     : 8080,
      "memory"   : "128Mi",
      "cpu"      : 1,

      "timeout"       :  5,
      "concurrency"   : 10,
      "min-instances" :  0,
      "max-instances" :  3,

      "service-account" : "cloud-run@zero65.iam.gserviceaccount.com"

    },

    "hello-nodejs": {
      "max-instances": 1
    }

  }

}
