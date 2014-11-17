var flowplayer = require('../flowplayer'),
    bean = require('bean'),
    ClassList = require('class-list'),
    extend = require('extend-object'),
   VENDOR = flowplayer.support.browser.mozilla ? "moz": "webkit",
   FS_ENTER = "fullscreen",
   FS_EXIT = "fullscreen-exit",
   FULL_PLAYER,
   FS_SUPPORT = flowplayer.support.fullscreen,
   FS_NATIVE_SUPPORT = typeof document.exitFullscreen == 'function',
   ua = navigator.userAgent.toLowerCase(),
   IS_SAFARI = /(safari)[ \/]([\w.]+)/.exec(ua) && !/(chrome)[ \/]([\w.]+)/.exec(ua);




flowplayer(function(player, root) {
  // esc button
  bean.on(document, "fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange", function(e) {
     var el = document.webkitCurrentFullScreenElement || document.mozFullScreenElement || document.fullscreenElement || document.msFullscreenElement || e.target;
      if (el && !FULL_PLAYER) {
         FULL_PLAYER = player.trigger(FS_ENTER, [el]);
      } else {
         FULL_PLAYER.trigger(FS_EXIT, [FULL_PLAYER]);
         FULL_PLAYER = null;
      }
   });

   if (!player.conf.fullscreen) return;

   var win = window,
      fsResume = {apply: false, pos: 0, play: false},
      scrollTop,
      rootClasses = ClassList(root);

   player.isFullscreen = false;

   player.fullscreen = function(flag) {

      if (player.disabled) return;

      if (flag === undefined) flag = !player.isFullscreen;

      if (flag) scrollTop = win.scrollY;

      if ((VENDOR == "webkit" || IS_SAFARI) && player.engine == "flash")
         fsResume = {apply: true, pos: player.video.time, play: player.playing};

      if (FS_SUPPORT) {

         if (flag) {
            ['requestFullScreen', 'webkitRequestFullScreen', 'mozRequestFullScreen', 'msRequestFullscreen'].forEach(function(fName) {
               if (typeof root[fName] === 'function') {
                  root[fName](Element.ALLOW_KEYBOARD_INPUT);
                  if (IS_SAFARI && !document.webkitCurrentFullScreenElement && !document.mozFullScreenElement) { // Element.ALLOW_KEYBOARD_INPUT not allowed
                     root[fName]();
                  }
                  return false;
               }
            });

         } else {
            ['exitFullscreen', 'webkitCancelFullScreen', 'mozCancelFullScreen', 'msExitFullscreen'].forEach(function(fName) {
              if (typeof document[fName] === 'function') {
                document[fName]();
                return false;
              }
            });
         }

      } else {
         player.trigger(flag ? FS_ENTER : FS_EXIT, [player]);
      }

      return player;
   };

   var lastClick;

   player.on("mousedown.fs", function() {
      if (+new Date - lastClick < 150 && player.ready) player.fullscreen();
      lastClick = +new Date;
   });

   player.on(FS_ENTER, function(e) {
      rootClasses.add("is-fullscreen");
      player.isFullscreen = true;

   }).on(FS_EXIT, function(e) {
      var oldOpacity;
      if (!FS_SUPPORT && player.engine === "html5") {
        oldOpacity = root.css('opacity') || '';
        root.css('opacity', 0);
      }
      rootClasses.remove("is-fullscreen");
      if (!FS_SUPPORT && player.engine === "html5") setTimeout(function() { root.css('opacity', oldOpacity); });
      player.isFullscreen = false;
      win.scrollY = scrollTop;

   }).on("ready", function () {
      if (fsResume.apply) {
         var fsreset = function () {
            if (!fsResume.play && !player.live)
               player.pause();
            extend(fsResume, {pos: 0, play: false});
         };

         if (player.live) {
            player.resume();
            fsreset();
         } else if (player.conf.rtmp && fsResume.pos && !isNaN(fsResume.pos)) {
            player.seek(fsResume.pos, fsreset);
         } else {
            fsreset();
         }
      }
   });

});
