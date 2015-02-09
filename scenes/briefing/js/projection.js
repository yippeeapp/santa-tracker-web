goog.provide('app.Projection');

goog.require('app.Constants');
goog.require('app.shared.utils');

/**
 * Briefing Projection class. Takes care of sliding the container to show a
 * projector image.
 *
 * @param {!Element} context An DOM element which wraps the scene.
 * @constructor
 */
app.Projection = function(context) {
  this.$context_ = $(context);
  this.context_ = this.$context_[0];

  this.currentSlide_ = 0;
  this.previousSlide_ = null;
  this.slidingTimer_ = -1;
  this.slideshowTimer_ = -1;
  this.movingWaterTimer = -1;

  this.CLASS_TOGGLED = 'is-toggled';
  this.CLASS_SLIDE_UP = 'run-slide-up';
  this.CLASS_SHOWERING = 'is-showering';

  this.isToggled = false;
  this.isAnimating = false;

  this.$handle = this.$context_.find('.js-projector-handle');
  this.$projectionGroup_ = this.$context_.find('.js-screen-group');
  this.$projectorBeamSquare = this.$context_.find('.js-projector-beam-square');
  this.$arrowLeft = this.$context_.find('.js-arrow-left');
  this.$arrowRight = this.$context_.find('.js-arrow-right');
  this.$projection = this.$context_.find('.js-projection');
  this.$clickHandler = this.$context_.find('.js-screen-click-handler');
  this.$waterDashes = this.$context_.find('.js-shower-water');

  this.prevSlide_ = this.prevSlide_.bind(this);
  this.nextSlide_ = this.nextSlide_.bind(this);
  this.onContextClick_ = this.onContextClick_.bind(this);
};

/**
 * Initializes the slideshow by binding events and starting the interval timer.
 */
app.Projection.prototype.init = function() {
  this.addEventListeners_();
  this.startCycle_();
};

/**
 * Prepares to destroy this instance by removing any event listeners and doing
 * additional cleanup work.
 */
app.Projection.prototype.destroy = function() {
  this.removeEventListeners_();
  this.stopCycle_();
  this.stopAnimatingWater_();
};

/**
 * Binds event listeners to some elements.
 *
 * @private
 */
app.Projection.prototype.addEventListeners_ = function() {
  this.$arrowLeft.on('click', this.prevSlide_);
  this.$arrowRight.on('click', this.nextSlide_);
  this.$clickHandler.on('click', this.onContextClick_);
};

/**
 * Un-binds event listeners to some elements.
 *
 * @private
 */
app.Projection.prototype.removeEventListeners_ = function() {
  this.$arrowLeft.off('click', this.prevSlide_);
  this.$arrowRight.off('click', this.nextSlide_);
  this.$clickHandler.off('click', this.onContextClick_);
};

/**
 * Callback for clicking the projector screen. This handles sliding up or down
 * of the screen to show the reindeer easter egg.
 *
 * @private
 */
app.Projection.prototype.onContextClick_ = function() {
  if (this.isAnimating) return;
  this.isAnimating = true;

  window.clearTimeout(this.slidingTimer_);

  if (this.isToggled) {
    this.isToggled = false;
    this.slideScreenDown_();
    this.startCycle_();

    this.slidingTimer_ = window.setTimeout(function() {
      this.stopAnimatingWater_();
      this.$context_.removeClass(this.CLASS_SHOWERING);
    }.bind(this), app.Constants.SCREEN_SLIDE_DURATION_MS);
  } else {
    this.isToggled = true;
    this.slideScreenUp_();
    this.startAnimatingWater_();
    this.stopCycle_();

    this.slidingTimer_ = window.setTimeout(function() {
      this.$context_.addClass(this.CLASS_SHOWERING);
    }.bind(this), app.Constants.SCREEN_SLIDE_DURATION_MS / 2.5);
  }
};

/**
 * Starts tweening the water in the easter egg.
 *
 * @private
 */
app.Projection.prototype.startAnimatingWater_ = function() {
  TweenMax.to(this.$waterDashes, 1,
    {
      strokeDashoffset: '-=100',
      force3D: true,
      repeat: -1,
      ease: Linear.easeNone
    }
  );

};

/**
 * Stops tweening the water in the easter egg.
 *
 * @private
 */
app.Projection.prototype.stopAnimatingWater_ = function() {
  TweenMax.killTweensOf(this.$waterDashes);
};

/**
 * Slides the projector screen all the way up, revealing what is behind it.
 *
 * @private
 */
app.Projection.prototype.slideScreenUp_ = function() {
  TweenMax.to(this.$projectionGroup_, 1,
    {
      y: -273,
      ease: Back.easeIn.config(1),
      onComplete: function() {
        this.isAnimating = false;
      }.bind(this)
    }
  );
  window.santaApp.fire('sound-trigger', 'briefing_screen_up');
};

/**
 * Slides the projector screen back to its place, covering what is behind it.
 *
 * @private
 */
app.Projection.prototype.slideScreenDown_ = function() {
  TweenMax.to(this.$projectionGroup_, 1,
    {
      y: 0,
      ease: Power4.easeOut,
      onComplete: function() {
        this.isAnimating = false;
      }.bind(this)
    }
  );
  window.santaApp.fire('sound-trigger', 'briefing_screen_down');
};

/**
 * Changes the visible slide by translating a number of pixels on the x-axis.
 *
 * @private
 */
app.Projection.prototype.changeSlide_ = function() {
  var value = this.currentSlide_ * app.Constants.SLIDE_SIZE * -1;

  window.santaApp.fire('sound-trigger', 'briefing_change_slide');

  this.$projection.css({
    '-webkit-transform': 'translateX(' + value + 'px)',
    '-ms-transform': 'translateX(' + value + 'px)',
    'transform': 'translateX(' + value + 'px)'
  });
};

/**
 * Moves the projection to the previous slide.
 *
 * @private
 */
app.Projection.prototype.prevSlide_ = function() {
  if (this.isToggled) return;

  window.clearInterval(this.slideshowTimer_);

  this.currentSlide_ = Math.max(this.currentSlide_ - 1, 0);

  if (this.previousSlide_ !== this.currentSlide_) {
    this.previousSlide_ = this.currentSlide_;
    this.changeSlide_();
  }
  this.startCycle_();
};

/**
 * Moves the projection to the next slide.
 *
 * @private
 */
app.Projection.prototype.nextSlide_ = function() {
  if (this.isToggled) return;

  window.clearInterval(this.slideshowTimer_);

  this.currentSlide_++;
  if (this.currentSlide_ > app.Constants.LAST_SLIDE_INDEX) {
    this.currentSlide_ = 0;
  }

  if (this.previousSlide_ !== this.currentSlide_) {
    this.previousSlide_ = this.currentSlide_;
    this.changeSlide_();
  }
  this.startCycle_();
};

/**
 * Stops the interval timer.
 *
 * @private
 */
app.Projection.prototype.stopCycle_ = function() {
  window.clearInterval(this.slideshowTimer_);
};

/**
 * Starts the interval timer to cycle the slides.
 *
 * @private
 */
app.Projection.prototype.startCycle_ = function() {
  window.clearInterval(this.slideshowTimer_);
  this.slideshowTimer_ = window.setInterval(
      this.nextSlide_.bind(this), app.Constants.SCREEN_SLIDE_CYCLE_MS);
};
