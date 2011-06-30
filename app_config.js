(function($, window, undefined){
  var APP = window.APP = window.APP || {};

  APP._settings = {
    fbAppId: '117723258315631',
    lastFmApiKey: 'c371171f9f1798892c3d91c730872b45',
    lastFmSecret: 'e71ff44e6494f0187efa6b99d9cf2cfe'
  };

  APP.setting = function(key, val){
    if (arguments.length === 2){
      APP._settings[key] = val;
    } else {
      return APP._settings[key];
    }
  };
})(jQuery, window);
