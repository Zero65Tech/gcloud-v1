try {

  module.exports = require("@zero65/config");

} catch (e) {

  exports.artifacts = {}

  exports.artifacts.npm = {

    "default": {
      "project"    : "zero65",
      "region"     : "asia-southeast1",
      "repository" : "npm"
    },

    "@zero65": {}

  }

  exports.artifacts.docker = {

    "default": {
      "project"    : "zero65",
      "region"     : "asia-southeast1",
      "repository" : "docker"
    },

    "hello-nodejs": {
      "region" : "us-central1"
    },

    "gcloud": {}

  }

  exports.run = {

    "default": {

      "project" : "zero65",

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
      "region"        : "us-central1",
      "max-instances" : 1
    },

    "gcloud": {}

  }

  exports.build = {

    "default": {
      "project" : "zero65",
      "ssh": "projects/zero65/secrets/SSH_KEY/versions/latest",
      "git": { "host": "github.com", "owner": "Zero65Tech", "name": null, "branch": "master" },
      "iam": null,
      "npm": {
        "builder": "node:18-slim",
        "scopes": [ "@zero65" ],
        "cmds": [ "install --omit=dev" ]
      },
      "docker": { "file": "node-18-slim", "name": null, "tag": null },
      "deploy": [
        { "type": "run", "name": null, "auto": true }
      ]
    },


    "config": {
      "npm": { "cmds": [ "publish --tag latest" ] },
      "docker": null, "deploy": null
    },

    "utils-nodejs": {
      "npm": { "cmds": [ "publish --tag latest" ] },
      "docker": null, "deploy": null
    },


    "hello-nodejs": {},

    "hello-vuejs": {
      "npm": {
        "builder": "node:16-slim",
        "scopes": null,
        "cmds": [ "install", "run build" ]
      },
      "docker": { "file": "nginx-stable" }
    },


    "gcloud": {}

  }

}
