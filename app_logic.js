(function($, window, undefined){
  var APP = window.APP = window.APP || {};

  APP.MAX_BAND_COUNT = 50;

  APP._friends = undefined;
  APP._bands   = {};
  APP._tags    = {};

  APP.init = function(){
    $("#doit").click(APP._loadFriends);

    $(document).bind('updateStatus', APP._updateStatus);
    // $(document).bind('friendsLoaded', APP._displayFriends);
    $(document).bind('friendsLoaded', APP._loadFriendsDetails);
    $(document).bind('friendsDetailsLoaded', APP._compileBandList);
    $(document).bind('bandsCompiled', APP._loadBands);
    $(document).bind('bandsLoaded', APP._compileTagCloud);
    $(document).bind('tagsCompiled', APP._renderTagCloud);

    $(document).trigger('updateStatus', ['Waiting to start']);
  }

  APP._updateStatus = function(e, msg){
    $('#status').html(msg);
  }

  APP._loadFriends = function(e){
    e.preventDefault();
    $(document).trigger('updateStatus', ['Loading friends']);
    FB.api('/me/friends', function(resp){
      APP._friends = _.sortBy((resp.data), function(friend){
        return friend.name.toLowerCase();
      });
      $(document).trigger('updateStatus', ['Friends loaded']);
      $(document).trigger('friendsLoaded');
    });
  };

  APP._loadFriendsDetails = function(e){
    $(document).trigger('updateStatus', ['Loading friend details']);

    var friends = localStorage.friends;

    if ( friends === undefined ) {
      $(document).bind('loadFriendBatch', function(e, startIndex, totalFriends){
        FB.api("/likes", "GET", { ids:_.pluck( APP._friends.slice(startIndex, startIndex + 5), 'id' ).join(',') }, function(resp){
          _.each( resp, function( userData, userId ){
            APP._addLikesToFriend( userData.data, userId );
          });
          if ( startIndex <= totalFriends ) {
            $(document).trigger('loadFriendBatch', [startIndex + 5, totalFriends]);
          } else {
            localStorage.friends = JSON.stringify( APP._friends );
            $(document).unbind('loadFriendBatch');
            $(document).trigger('updateStatus', ['Friend details loaded']);
            $(document).trigger('friendsDetailsLoaded');
          }
        });
      });

      $(document).trigger('loadFriendBatch', [0, APP._friends.length]);
    } else {
      APP._friends = JSON.parse( friends );
      $(document).trigger('friendsDetailsLoaded');
    }
  };

  APP._addLikesToFriend = function( likes, userId ) {
    _.each( APP._friends, function( friend ) {
      if ( friend.id == userId ) {
        friend.likes = likes;
        return false;
      }
    });
  };

  APP._compileBandList = function(e){
    _.each(APP._friends, function(friend){
      var friendBands = _.select(friend.likes, function(like){
          return like.category === 'Musician/band';
        });
      _.each(friendBands, function(band){
        // keep track of how many people like each band
        if (APP._bands[band.name] === undefined){
          band.likeCount = 1;
          APP._bands[band.name] = band;
        } else {
          APP._bands[band.name].likeCount += 1;
        }
      });
    });

    var sortedBands = _.sortBy(APP._bands, function(band){
      return band.likeCount * -1;
    });

    // prune to only care about the most popular bands
    APP._bands = sortedBands.slice(0, APP.MAX_BAND_COUNT);
    $(document).trigger('bandsCompiled');
  };

  APP._loadBands = function(e){
    $(document).trigger('updateStatus', ['Loading bands']);

    var existingBands = localStorage.bands;

    if ( existingBands === undefined ) {
      $(document).bind('loadBand', function(e, bandKeys, bandIndex, totalBands){
        var band = APP._bands[ bandKeys[bandIndex] ];
        lastfm.artist.getTopTags({artist: band.name}, {
          success: function(resp){
            band.topTags = resp.toptags.tag;
            $(document).trigger('updateStatus', ['Loaded band details for ' + band.name]);
            if (bandIndex+1 === totalBands){
              localStorage.bands = JSON.stringify( APP._bands );
              $(document).unbind('loadNextBand');
              $(document).trigger('updateStatus', ['Bands loaded']);
              $(document).trigger('bandsLoaded');
            } else {
              $(document).trigger('loadBand', [bandKeys, ++bandIndex, totalBands]);
            }
          },
          error: function(resp){
            $(document).trigger('loadBand', [bandKeys, ++bandIndex, totalBands]);
          }
        });
      });

      $(document).trigger('loadBand', [_.keys(APP._bands), 0, _.size(APP._bands), 0]);
    } else {
      APP._bands = JSON.parse( existingBands );
      $(document).trigger('bandsLoaded');
    }
  };

  APP._compileTagCloud = function(e){
    var tags = APP._tags;
    _.each(APP._bands, function(band, bandName){
      var bandFriends = APP._getFriendsThatLikeBand( band.name );
      _.each(band.topTags, function(tag, i){
        var tagScore = 100 - i;
        if ( tags[tag.name] === undefined ) {
          tags[tag.name] = {
            name: tag.name,
            score: tagScore,
            friends: bandFriends
          };
        } else {
          tags[tag.name].score += tagScore;
          tags[tag.name].friends = _.uniq( $.merge( tags[tag.name].friends, bandFriends ) );
        }
      });
    });

    APP._tags = _.sortBy(tags, function(object){ return object.score * -1 });
    $(document).trigger('tagsCompiled');
  };

  APP._renderTagCloud = function(e){
    var tpl  = $('#tagCloudTpl').html();
        html = Mustache.to_html( tpl, {
        tags: APP._tags
      });
    $('#tags').html( html );

    $('#tagCloud li a').live('click', function(e){
      e.stopPropagation();
      var text = $(this).text(),
          tag = _.select(APP._tags, function(tag){
        return tag.name == text; 
        })[0];

      var tpl  = $('#friendsTpl').html(),
          html = Mustache.to_html( tpl, {
          count: tag.friends.length,
          friends: tag.friends
        });
      $('#friends').html( html );
    });
  };

  APP._getFriendsThatLikeBand = function( bandName ) {
    var users = _.map(APP._friends, function(friend){
      if ( friend.likes.length > 0 ) {
        var likeFound = false;
        _.each(friend.likes, function(like){
          if ( like.name == bandName ) {
            likeFound = true;
            return false;
          }
        });

        if ( likeFound ) {
          return friend;
        } else {
          return false;
        }
      } else {
        return false;
      } 
    });

    users = _.select( users, function(friend){
      return friend !== false;
    });

    return users;
  };

  $(APP.init);
})(jQuery, window);
