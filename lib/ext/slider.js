// skip IE policies
// document.ondragstart = function () { return false; };
//
var ClassList = require('class-list'),
    bean = require('bean'),
    common = require('../common'),
    Velocity = require('velocity-animate');


// execute function every <delay> ms
var throttle = function(fn, delay) {
   var locked;

   return function () {
      if (!locked) {
         fn.apply(this, arguments);
         locked = 1;
         setTimeout(function () { locked = 0; }, delay);
      }
   };
};


var slider = function(root, rtl) {
  var IS_IPAD = /iPad/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);

  var progress = common.lastChild(root),
      rootClasses = ClassList(root),
      disabled,
      offset,
      width,
      height,
      vertical,
      size,
      maxValue,
      max,
      skipAnimation = false,

      /* private */
      calc = function() {
         offset = common.offset(root);
         width = common.width(root);
         height = common.height(root);

         /* exit from fullscreen can mess this up.*/
         // vertical = height > width;

         size = vertical ? height : width;
         max = toDelta(maxValue);
      },

      fire = function(value) {
         if (!disabled && value != api.value && (!maxValue || value < maxValue)) {
            bean.fire(root, 'slide', [ value ]);
            api.value = value;
         }
      },

      mousemove = function(e) {
         var pageX = e.pageX;
         if (!pageX && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length) {
            pageX = e.originalEvent.touches[0].pageX;
         }
         var delta = vertical ? e.pageY - offset.top : pageX - offset.left;
         delta = Math.max(0, Math.min(max || size, delta));

         var value = delta / size;
         if (vertical) value = 1 - value;
         if (rtl) value = 1 - value;
         return move(value, 0, true);
      },

      move = function(value, speed) {
         if (speed === undefined) { speed = 0; }
         if (value > 1) value = 1;

         var to = (Math.round(value * 1000) / 10) + "%";

         if (!maxValue || value <= maxValue) {
           //TODO FIXME
           //if (!IS_IPAD) progress.stop(); // stop() broken on iPad
            if (skipAnimation) {
               progress.css('width', to);
            } else {
               Velocity(progress, vertical ? { height: to } : { width: to }, {duration: speed});
            }
         }

         return value;
      },

      toDelta = function(value) {
         return Math.max(0, Math.min(size, vertical ? (1 - value) * height : value * width));
      },

      /* public */
      api = {

         max: function(value) {
            maxValue = value;
         },

         disable: function(flag) {
            disabled = flag;
         },

         slide: function(value, speed, fireEvent) {
            calc();
            if (fireEvent) fire(value);
            move(value, speed);
         },

         // Should animation be handled via css
         disableAnimation: function(value) {
            skipAnimation = value !== false;
         }

      };

  calc();

  // bound dragging into document
  bean.on(root, 'mousedown.sld touchstart', function(e) {
    e.preventDefault();

    if (!disabled) {
      // begin --> recalculate. allows dynamic resizing of the slider
      var delayedFire = throttle(fire, 100);
      calc();
      api.dragging = true;
      rootClasses.add('is-dragging');
      fire(mousemove(e));

      bean.on(document, 'mousemove.sld touchmove.sld', function(e) {
        e.preventDefault();
        delayedFire(mousemove(e));

      });
      bean.one(document, 'mouseup touchend', function() {
         api.dragging = false;
         rootClasses.remove('is-dragging');
         bean.off(document, 'mousemove.sld touchmove.sld')
      });

     }

  });
  return api;
};

module.exports = slider;
