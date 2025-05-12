
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "cordova-plugin-firebasex.FirebasePlugin",
          "file": "plugins/cordova-plugin-firebasex/www/firebase.js",
          "pluginId": "cordova-plugin-firebasex",
        "clobbers": [
          "FirebasePlugin"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "cordova-plugin-firebasex": "18.0.7"
    };
    // BOTTOM OF METADATA
    });
    