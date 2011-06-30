(function(window, undefined){
  window.lastfm = new LastFM({
    apiKey: APP.setting('lastFmApiKey'),
    apiSecret: APP.setting('lastFmSecret'),
    cache: false
  });
})(window);
