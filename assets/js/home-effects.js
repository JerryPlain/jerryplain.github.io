/* Home-page ambience: twinkling stardust + a light meteor shower over the hero,
   and a gentle scroll-reveal for the sections below.
   Loaded only by _layouts/about.liquid. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== Stardust: breathing stars, glints, and a light meteor shower ===== */
  var hero = document.querySelector(".home-hero");
  var canvas = document.querySelector(".home-hero__fx");
  if (hero && canvas && !reduced && canvas.getContext) initStardust();

  function initStardust() {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0;
    var H = 0;
    var stars = [];
    var meteors = [];
    var nextMeteorAt = 0;
    var raf = null;
    var heroVisible = true;
    var started = false;

    /* Soft glow sprite (bright core, feathered halo) — much finer than a hard
       filled circle, and drawImage is cheap enough for a few hundred per frame. */
    function makeSprite(r, g, b) {
      var s = document.createElement("canvas");
      s.width = s.height = 64;
      var c = s.getContext("2d");
      var grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",1)");
      grad.addColorStop(0.22, "rgba(" + r + "," + g + "," + b + ",0.32)");
      grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
      c.fillStyle = grad;
      c.fillRect(0, 0, 64, 64);
      return s;
    }
    var coolSprite = makeSprite(214, 226, 255);
    var warmSprite = makeSprite(233, 202, 143);

    /* Four-point glint, shown on the brightest stars at the top of their breath */
    function makeFlare() {
      var s = document.createElement("canvas");
      s.width = s.height = 64;
      var c = s.getContext("2d");
      var h = c.createLinearGradient(0, 0, 64, 0);
      var v = c.createLinearGradient(0, 0, 0, 64);
      [h, v].forEach(function (g) {
        g.addColorStop(0, "rgba(230,236,255,0)");
        g.addColorStop(0.5, "rgba(230,236,255,0.9)");
        g.addColorStop(1, "rgba(230,236,255,0)");
      });
      c.fillStyle = h;
      c.fillRect(0, 31.25, 64, 1.5);
      c.fillStyle = v;
      c.fillRect(31.25, 0, 1.5, 64);
      return s;
    }
    var flareSprite = makeFlare();

    function buildField() {
      stars = [];
      var n = Math.min(170, Math.round((W * H) / 9000));
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          /* keep stars in the sky: dense up top, thinning toward the horizon,
             never over the foreground rocks in the photo's bottom third */
          y: Math.pow(Math.random(), 1.4) * H * 0.72,
          /* pow-skewed: mostly faint pinpricks, a handful of bright beacons */
          r: 0.55 + Math.pow(Math.random(), 2.2) * 2.1,
          base: 0.1 + Math.random() * 0.24,
          amp: 0.16 + Math.random() * 0.42,
          speed: 0.15 + Math.random() * 0.7, // rad/s — slow, breathing
          phase: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.08,
        });
      }
    }

    /* Every meteor dives leftward at a similar shallow angle, as if from one
       radiant, so they read as a shower rather than random scratches. About a
       third are distant ones: thinner, shorter, dimmer and quicker to fade. */
    function spawnMeteor(now) {
      var faint = Math.random() < 0.3;
      var angle = ((16 + Math.random() * 14) * Math.PI) / 180;
      var speed = faint ? 300 + Math.random() * 140 : 420 + Math.random() * 260; // px/s
      meteors.push({
        x0: W * (0.28 + Math.random() * 0.68),
        y0: H * (0.03 + Math.random() * 0.22),
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        tail: faint ? 60 + Math.random() * 50 : 130 + Math.random() * 110,
        width: faint ? 0.65 : 1 + Math.random() * 0.35,
        peak: faint ? 0.55 : 1,
        born: now,
        dur: faint ? 0.8 + Math.random() * 0.4 : 1.1 + Math.random() * 0.6,
      });
    }

    function drawMeteor(m, now) {
      var t = (now - m.born) / m.dur;
      if (t >= 1) return false;
      /* fade-in fast, hold, fade-out long — no popping */
      var a = (t < 0.12 ? t / 0.12 : t > 0.55 ? (1 - t) / 0.45 : 1) * m.peak;
      var elapsed = now - m.born;
      var x = m.x0 + m.vx * elapsed;
      var y = m.y0 + m.vy * elapsed;
      var sp = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      var ux = m.vx / sp;
      var uy = m.vy / sp;
      var tail = m.tail * Math.min(1, t * 4); // tail streams out as it enters
      var tx = x - ux * tail;
      var ty = y - uy * tail;

      var grad = ctx.createLinearGradient(x, y, tx, ty);
      grad.addColorStop(0, "rgba(255,250,240," + 0.95 * a + ")");
      grad.addColorStop(0.35, "rgba(214,226,255," + 0.32 * a + ")");
      grad.addColorStop(1, "rgba(214,226,255,0)");

      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.4 * m.width; // halo pass
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.4 * m.width; // core pass
      ctx.stroke();

      ctx.globalAlpha = a;
      var head = 14 * m.width;
      ctx.drawImage(warmSprite, x - head / 2, y - head / 2, head, head); // glowing head
      ctx.globalAlpha = 1;
      return true;
    }

    function frame(nowMs) {
      var now = nowMs / 1000;
      if (!started) {
        started = true;
        nextMeteorAt = now + 0.8; // let the layer fade in before the first streak
        canvas.classList.add("is-on"); // CSS fades the whole layer in
      }
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = s.base + s.amp * (0.5 + 0.5 * Math.sin(s.phase + s.speed * now));
        var size = s.r * 8;
        ctx.globalAlpha = alpha;
        ctx.drawImage(s.warm ? warmSprite : coolSprite, s.x - size / 2, s.y - size / 2, size, size);
        if (s.r > 2.2) {
          /* 0 → 1 across the top 30% of this star's breath */
          var glint = (alpha - s.base - s.amp * 0.7) / (s.amp * 0.3);
          if (glint > 0) {
            var fs = s.r * 11;
            ctx.globalAlpha = glint * 0.8;
            ctx.drawImage(flareSprite, s.x - fs / 2, s.y - fs / 2, fs, fs);
          }
        }
      }
      ctx.globalAlpha = 1;

      if (now >= nextMeteorAt && meteors.length < 3) {
        spawnMeteor(now);
        /* every 2–5 s, and now and then a second streak close behind */
        nextMeteorAt = now + (Math.random() < 0.18 ? 0.25 + Math.random() * 0.5 : 1.8 + Math.random() * 3.2);
      }
      for (var j = meteors.length - 1; j >= 0; j--) {
        if (!drawMeteor(meteors[j], now)) meteors.splice(j, 1);
      }

      raf = requestAnimationFrame(frame);
    }

    function running() {
      return raf !== null;
    }
    function sync() {
      var should = heroVisible && !document.hidden;
      if (should && !running()) raf = requestAnimationFrame(frame);
      if (!should && running()) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    function resize() {
      W = hero.clientWidth;
      H = hero.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildField();
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    document.addEventListener("visibilitychange", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        sync();
      }).observe(hero);
    }

    resize();
    sync();
  }

  /* ===== Scroll reveal for the content below the hero ===== */
  if (!reduced && "IntersectionObserver" in window) initReveal();

  function initReveal() {
    var article = document.querySelector("#about-content article");
    if (!article) return;

    var targets = [];
    function add(el, delayMs, fadeOnly) {
      el.classList.add("sr");
      if (fadeOnly) el.classList.add("sr--fade");
      if (delayMs) el.style.setProperty("--sr-delay", delayMs / 1000 + "s");
      targets.push(el);
    }

    var intro = article.querySelector(":scope > .clearfix");
    if (intro) add(intro, 0);
    article.querySelectorAll(":scope > h2").forEach(function (h2) {
      add(h2, 0);
    });
    article.querySelectorAll(".news .news-entry").forEach(function (li, i) {
      add(li, Math.min(i * 60, 300), true);
    });
    article.querySelectorAll("ol.bibliography > li").forEach(function (li, i) {
      add(li, Math.min(i * 90, 360));
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("sr-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
  }
})();
