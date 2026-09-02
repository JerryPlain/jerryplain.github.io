/* Home-page ambience: twinkling stardust + rare meteors over the hero,
   and a gentle scroll-reveal for the sections below.
   Loaded only by _layouts/about.liquid. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== Stardust: breathing stars + an occasional meteor ===== */
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

    function spawnMeteor(now) {
      var angle = ((18 + Math.random() * 14) * Math.PI) / 180; // shallow dive
      var speed = 380 + Math.random() * 220; // px/s
      meteors.push({
        x0: W * (0.3 + Math.random() * 0.65),
        y0: H * (0.04 + Math.random() * 0.2),
        vx: -Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        tail: 90 + Math.random() * 60,
        born: now,
        dur: 1.2 + Math.random() * 0.5,
      });
    }

    function drawMeteor(m, now) {
      var t = (now - m.born) / m.dur;
      if (t >= 1) return false;
      /* fade-in fast, hold, fade-out long — no popping */
      var a = t < 0.12 ? t / 0.12 : t > 0.55 ? (1 - t) / 0.45 : 1;
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
      ctx.lineWidth = 3.4; // halo pass
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.4; // core pass
      ctx.stroke();

      ctx.globalAlpha = a;
      ctx.drawImage(warmSprite, x - 7, y - 7, 14, 14); // glowing head
      ctx.globalAlpha = 1;
      return true;
    }

    function frame(nowMs) {
      var now = nowMs / 1000;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = s.base + s.amp * (0.5 + 0.5 * Math.sin(s.phase + s.speed * now));
        var size = s.r * 8;
        ctx.globalAlpha = alpha;
        ctx.drawImage(s.warm ? warmSprite : coolSprite, s.x - size / 2, s.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      if (now >= nextMeteorAt && meteors.length === 0) {
        spawnMeteor(now);
        nextMeteorAt = now + 5 + Math.random() * 6; // one at a time, rare on purpose
      }
      for (var j = meteors.length - 1; j >= 0; j--) {
        if (!drawMeteor(meteors[j], now)) meteors.splice(j, 1);
      }

      if (!started) {
        started = true;
        canvas.classList.add("is-on"); // CSS fades the whole layer in
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
    /* table rows: fade only — transforms on <tr> are unreliable across engines */
    article.querySelectorAll(".news table tr").forEach(function (tr, i) {
      add(tr, Math.min(i * 60, 300), true);
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
