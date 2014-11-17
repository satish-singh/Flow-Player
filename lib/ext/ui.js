var flowplayer = require('../flowplayer'),
    Sizzle = require('sizzle'),
    common = require('../common'),
    ClassList = require('class-list'),
    bean = require('bean'),
    slider = require('./slider');

function zeropad(val) {
   val = parseInt(val, 10);
   return val >= 10 ? val : "0" + val;
}

// display seconds in hh:mm:ss format
function format(sec) {

   sec = sec || 0;

   var h = Math.floor(sec / 3600),
       min = Math.floor(sec / 60);

   sec = sec - (min * 60);

   if (h >= 1) {
      min -= h * 60;
      return h + ":" + zeropad(min) + ":" + zeropad(sec);
   }

   return zeropad(min) + ":" + zeropad(sec);
}

flowplayer(function(api, root) {

   var conf = api.conf,
      support = flowplayer.support,
      hovertimer,
      rootClasses = ClassList(root);
   Sizzle('.fp-ratio,.fp-ui', root).forEach(common.removeNode);
   rootClasses.add('flowplayer');
   root.appendChild(common.createElement('div', {className: 'fp-ratio'}));
   root.appendChild(common.createElement('div', {className: 'fp-ui'}, '\
         <div class="waiting"><em></em><em></em><em></em></div>\
         <a class="fullscreen"></a>\
         <a class="unload"></a>\
         <p class="speed"></p>\
         <div class="controls">\
            <a class="play"></a>\
            <div class="timeline">\
               <div class="buffer"></div>\
               <div class="progress"></div>\
            </div>\
            <div class="volume">\
               <a class="mute"></a>\
               <div class="volumeslider">\
                  <div class="volumelevel"></div>\
               </div>\
            </div>\
         </div>\
         <div class="time">\
            <em class="elapsed">00:00</em>\
            <em class="remaining"></em>\
            <em class="duration">00:00</em>\
         </div>\
         <div class="message"><h2></h2><p></p></div>'.replace(/class="/g, 'class="fp-')));

   function find(klass) {
     return Sizzle(".fp-" + klass, root)[0];
   }

   // widgets
   var progress = find("progress"),
      buffer = find("buffer"),
      elapsed = find("elapsed"),
      remaining = find("remaining"),
      waiting = find("waiting"),
      ratio = find("ratio"),
      speed = find("speed"),
      durationEl = find("duration"),
      origRatio = common.css(ratio, 'padding-top'),

      // sliders
      timeline = find("timeline"),
      timelineApi = slider(timeline, api.rtl),

      volume = find("volume"),
      fullscreen = find("fullscreen"),
      volumeSlider = find("volumeslider"),
      volumeApi = slider(volumeSlider, api.rtl),
      noToggle = rootClasses.contains('fixed-controls') && rootClasses.contains('no-toggle');

   timelineApi.disableAnimation(rootClasses.contains('is-touch'));

   // aspect ratio
   function setRatio(val) {
      if ((common.css(root, 'width') === '0px' || common.css(root, 'height') === '0px') || val !== flowplayer.defaults.ratio) {
         if (!parseInt(origRatio, 10)) common.css(ratio, 'padding-top', val * 100 + "%");
      }
      if (!support.inlineBlock) $("object", root).height(root.height());
   }

   function hover(flag) {
     if (flag) {
       rootClasses.add('is-mouseover');
       rootClasses.remove('is-mouseout');
     } else {
       rootClasses.add('is-mouseout');
       rootClasses.remove('is-mouseover');
     }
   }

   // loading...
   if (!support.animation) waiting.html("<p>loading &hellip;</p>");

   setRatio(conf.ratio);

   // no fullscreen in IFRAME
   try {
      if (!conf.fullscreen) fullscreen.remove();

   } catch (e) {
      fullscreen.remove();
   }


   api.on("ready", function() {

      var duration = api.video.duration;

      timelineApi.disable(api.disabled || !duration);

      conf.adaptiveRatio && setRatio(api.video.height / api.video.width);

      // initial time & volume
      common.html([durationEl, remaining], format(duration));

      // do we need additional space for showing hour
      common.toggleClass(root, 'is-long', duration >= 3600);
      volumeApi.slide(api.volumeLevel);


   }).on("unload", function() {
      if (!origRatio) ratio.css("paddingTop", "");

   // buffer
   }).on("buffer", function() {
      var video = api.video,
         max = video.buffer / video.duration;

      if (!video.seekable && support.seekable) timelineApi.max(max);
      if (max < 1) common.css(buffer, "width", (max * 100) + "%");
      else common.css(buffer, 'width', '100%');

   }).on("speed", function(e, api, val) {
      speed.text(val + "x").addClass("fp-hilite");
      setTimeout(function() { speed.removeClass("fp-hilite") }, 1000);

   }).on("buffered", function() {
     common.css(buffer, 'width', '100%');
      timelineApi.max(1);

   // progress
   }).on("progress", function() {

      var time = api.video.time,
         duration = api.video.duration;

      if (!timelineApi.dragging) {
        timelineApi.slide(time / duration, api.seeking ? 0 : 250);
      }

      common.html(elapsed, format(time));
      common.html(remaining, '-' + format(duration - time));

   }).on("finish resume seek", function(e) {
      common.toggleClass(root, "is-finished", e.type == "finish");

   }).on("stop", function() {
      elapsed.html(format(0));
      timelineApi.slide(0, 100);

   }).on("finish", function() {
      common.html(elapsed, format(api.video.duration));
      timelineApi.slide(1, 100);
      rootClasses.remove('is-seeking');

   // misc
   }).on("beforeseek", function() {
      //TODO FIXME
      //progress.stop();

   }).on("volume", function() {
      volumeApi.slide(api.volumeLevel);


   }).on("disable", function() {
      var flag = api.disabled;
      timelineApi.disable(flag);
      volumeApi.disable(flag);
      root.toggleClass("is-disabled", api.disabled);

   }).on("mute", function(e, api, flag) {
      root.toggleClass("is-muted", flag);

   }).on("error", function(e, api, error) {
      root.removeClass("is-loading").addClass("is-error");

      if (error) {
         error.message = conf.errors[error.code];
         api.error = true;

         var el = $(".fp-message", root);
         $("h2", el).text((api.engine || 'html5') + ": " + error.message);
         $("p", el).text(error.url || api.video.url || api.video.src || conf.errorUrls[error.code]);
         api.off("mouseenter click");
         rootClasses.remove('is-mouseover');
      }


   // hover
   }).on("mouseenter mouseleave", function(e) {
     if (noToggle) return;

      var is_over = e.type == "mouseover",
         lastMove;

      // is-mouseover/out
      hover(is_over);

      if (is_over) {

         api.on("pause.x mousemove.x volume.x", function() {
            hover(true);
            lastMove = new Date;
         });

         hovertimer = setInterval(function() {
            if (new Date - lastMove > 5000) {
               hover(false)
               lastMove = new Date;
            }
         }, 100);

      } else {
         api.off("pause.x mousemove.x volume.x");
         clearInterval(hovertimer);
      }


   // allow dragging over the player edge
   }).on("mouseleave", function() {

     if (timelineApi.dragging || volumeApi.dragging) {
         root.addClass("is-mouseover").removeClass("is-mouseout");
     }

   // click
   }).on("click.player", function(e) {
      var kls = ClassList(e.target);
      if (kls.contains('fp-ui') || kls.contains('fp-engine') || e.flash) {
         e.preventDefault();
         return api.toggle();
      }
   }).on('contextmenu', function(ev) {
      ev.preventDefault();
      var o = common.offset(root),
          w = window,
          left = ev.clientX - o.left,
          t = ev.clientY - o.top + w.scrollY;
      var menu = Sizzle('.fp-context-menu', root)[0];
      if (!menu) return;
      common.css(menu,
      {left: left + 'px',
         top: t + 'px',
         display: 'block'
      });
      bean.on(menu, 'click', function(ev) {
         ev.stopPropagation();
      });
      bean.on(document, 'click.outsidemenu', function(ev) {
         common.css(menu, 'display', 'none');
         bean.off(document, 'click.outsidemenu');
      });
   }).on('flashdisabled', function() {
     root.addClass('is-flash-disabled').one('ready', function() {
       root.removeClass('is-flash-disabled').find('.fp-flash-disabled').remove();
     }).append('<div class="fp-flash-disabled">Adobe Flash is disabled for this page, click player area to enable.</div>');
   });

   // poster -> background image
   if (conf.poster) root.css("backgroundImage", "url(" + conf.poster + ")");

   var bc = common.css(root, 'background-color'),
      has_bg = common.css(root, 'background-image') != "none" || bc && bc != "rgba(0, 0, 0, 0)" && bc != "transparent";

   // is-poster class
   if (has_bg && !conf.splash && !conf.autoplay) {

      api.bind("ready stop", function() {
         root.addClass("is-poster").one("progress", function() {
            root.removeClass("is-poster");
         });
      });

   }

   // default background color if not present
   if (!has_bg && api.forcedSplash) {
      root.css("backgroundColor", "#555");
   }

   bean.on(root, 'click', '.fp-toggle, .fp-play', api.toggle);

   /* controlbar elements */
   bean.on(root, 'click', '.fp-mute', function() { api.mute(); });
   bean.on(root, 'click', '.fp-fullscreen', function() { api.fullscreen(); });
   bean.on(root, 'click', '.fp-unload', function() { api.unload(); });

   bean.on(timeline, 'slide', function(val) {
     api.seeking = true;
     api.seek(val * api.video.duration);
   });

   bean.on(volumeSlider, 'slide', function(e, val) {
      api.volume(val);
   });

   // times

   var time = find('time');
   bean.on(time, 'click', function() {
     ClassList(time).toggle('is-inverted');
   });

   hover(noToggle);

});

