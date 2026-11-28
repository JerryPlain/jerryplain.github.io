/* Home page behaviour (loaded only by _layouts/about.liquid):
     1. scroll reveal: sections rise 32px and fade in as they enter
     2. the news card: exactly five rows tall, scrolls for the rest
     3. the Background timeline: tabs, and from 768px a scrubber, a
        draggable playhead over one lane per entry that lights the cards
     4. the research deck on phones: dots that follow the swipe
   Everything here is an enhancement; without it the page reads top to
   bottom as plain cards. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.getElementById("about-content");
  if (!root) return;

  /* ===== 1. Scroll reveal =====
     After wenlixiao.com: opacity 0 → 1 and translateY(32px) → 0 over 0.7s
     on cubic-bezier(0.16, 1, 0.3, 1); cards in a list stagger by 80ms in
     threes, so a long list never waits on its tail. */
  if (!reduced && "IntersectionObserver" in window) {
    var targets = [];
    var add = function (el, delayMs) {
      el.classList.add("sr");
      if (delayMs) el.style.setProperty("--sr-delay", delayMs / 1000 + "s");
      targets.push(el);
    };
    root.querySelectorAll("[data-reveal]").forEach(function (el) {
      /* a card right under its heading follows it by a beat */
      var prev = el.previousElementSibling;
      add(el, prev && prev.classList.contains("pg-section__title") ? 100 : 0);
    });
    root.querySelectorAll(".research ol.bibliography > li").forEach(function (li, i) {
      add(li, (i % 3) * 80);
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add("sr-in");
          io.unobserve(en.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ===== 2. News card: five rows tall ===== */
  var newsBox = root.querySelector(".news--scroll");
  if (newsBox) {
    (function () {
      var VISIBLE = 5;
      var scroller = newsBox.querySelector(".news__scroller");
      var rows = scroller ? scroller.querySelectorAll(".news-entry") : [];
      if (rows.length <= VISIBLE) {
        if (scroller) scroller.style.maxHeight = "none";
        return;
      }
      scroller.tabIndex = 0; /* keyboard users can arrow through the box */
      /* Height = the bottom of the fifth row, measured live so wrapped rows
         on narrow screens still land on a row boundary */
      var fit = function () {
        var first = rows[0];
        var last = rows[VISIBLE - 1];
        scroller.style.maxHeight = Math.ceil(last.offsetTop + last.offsetHeight - first.offsetTop) + "px";
        update();
      };
      var update = function () {
        var top = scroller.scrollTop;
        var rest = scroller.scrollHeight - scroller.clientHeight - top;
        newsBox.classList.toggle("news--more-above", top > 2);
        newsBox.classList.toggle("news--more-below", rest > 2);
      };
      var t;
      scroller.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", function () {
        clearTimeout(t);
        t = setTimeout(fit, 120);
      });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      window.addEventListener("load", fit);
      fit();
    })();
  }

  /* ===== 3. Background timeline =====
     With JS the panel becomes a scrubber: a ruler with one lane per entry
     under a playhead that can be dragged, clicked or tapped to, flicked (it
     coasts), or stepped with the arrow keys, and the cards beside it — in a
     row under the cards on wide screens, above a column of them on phones.
     The playhead is one number, --p (0–1, on the panel); the lanes and the
     cards' progress lines fill up to it in CSS, and the cards it covers
     light up. It sweeps from the first start to today the first time each
     tab comes into view; ▶ replays it. Without JS the cards stay a
     vertical rail, newest first. */
  var tl = root.querySelector("[data-timeline]");
  if (tl) initTimeline(tl);

  function initTimeline(tl) {
    var tabs = Array.prototype.slice.call(tl.querySelectorAll(".tl__tab"));
    var panels = Array.prototype.slice.call(tl.querySelectorAll(".tl__panel"));
    /* One hue per entry, in start order: Experience walks blue → indigo →
       violet → cyan, Education emerald → lime. */
    var PALETTES = {
      experience: ["#3b82f6", "#6366f1", "#8b5cf6", "#06b6d4"],
      education: ["#10b981", "#14b8a6", "#22c55e", "#84cc16"],
    };
    var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
    var MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var today = new Date();
    var NOW = today.getFullYear() + (today.getMonth() + today.getDate() / 31) / 12;
    var SWEEP_MS = 3200; /* the whole range, start to today */
    var SNAP = 0.35 / 12; /* the playhead clicks onto a start or end this close (years) */
    var ICONS =
      '<svg class="tl__i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/></svg>' +
      '<svg class="tl__i-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>' +
      '<svg class="tl__i-replay" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 9.2A7 7 0 1 1 5 13.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4.6 4.8v4.8h4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    /* "Oct 2025 - Present" → { start: 2025.75, end: NOW, present: true }.
       A start month counts from its first day, an end month to its last. */
    function parsePoint(s, isEnd) {
      s = s.trim().toLowerCase();
      if (/present|now|current|today/.test(s)) return { t: NOW, present: true };
      var m = s.match(/([a-z]{3})[a-z]*\.?\s*(\d{4})/);
      if (m && MONTHS[m[1]] !== undefined) return { t: +m[2] + (MONTHS[m[1]] + (isEnd ? 1 : 0)) / 12 };
      m = s.match(/(\d{4})/);
      if (m) return { t: +m[1] + (isEnd ? 1 : 0) };
      return null;
    }
    function parseRange(str) {
      var parts = (str || "").split(/\s*[-–—]\s*|\s+to\s+/);
      var a = parsePoint(parts[0] || "", false);
      var b = parts[1] ? parsePoint(parts[1], true) : null;
      if (!a) return null;
      if (!b) b = { t: a.t + 1 / 12 };
      return { start: a.t, end: Math.max(b.t, a.t + 1 / 24), present: !!b.present };
    }
    function hexRgb(h) {
      var n = parseInt(h.slice(1), 16);
      return (n >> 16) + " " + ((n >> 8) & 255) + " " + (n & 255);
    }
    function make(tag, cls, parent) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (parent) parent.appendChild(n);
      return n;
    }
    function pct(f) {
      return (f * 100).toFixed(3) + "%";
    }
    function monthOf(t) {
      return Math.floor(t * 12 + 1e-6);
    }
    function monthText(m) {
      return MONTH_LABEL[((m % 12) + 12) % 12] + " " + Math.floor(m / 12);
    }
    var easeInOut = function (k) {
      return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    };
    var easeOut = function (k) {
      return 1 - Math.pow(1 - k, 3);
    };

    /* Entries oldest first, each with its colour; the colour goes on every
       layout, so the phone rail's dots match too */
    panels.forEach(function (panel) {
      var pal = PALETTES[panel.getAttribute("data-panel")] || PALETTES.experience;
      var data = Array.prototype.slice
        .call(panel.querySelectorAll(".tl__item"))
        .map(function (li) {
          return { li: li, r: parseRange(li.getAttribute("data-dates")) };
        })
        .filter(function (d) {
          return d.r;
        })
        .sort(function (a, b) {
          return a.r.start - b.r.start || a.r.end - b.r.end;
        });
      var n = data.length;
      data.forEach(function (d, i) {
        /* fewer entries than hues: spread them across the palette */
        var idx = n > 1 && n <= pal.length ? Math.round((i * (pal.length - 1)) / (n - 1)) : i % pal.length;
        d.color = pal[idx];
        d.li.style.setProperty("--tl-color", d.color);
        d.li.style.setProperty("--c-rgb", hexRgb(d.color));
      });
      panel._tl = data;
    });

    function build(panel) {
      var data = panel._tl;
      var s0 = Math.min.apply(
        null,
        data.map(function (d) {
          return d.r.start;
        })
      );
      /* the track runs from a little before the first start to today */
      var t1 = NOW;
      var t0 = s0 - Math.max(1 / 12, (t1 - s0) * 0.04);
      var span = t1 - t0;
      var frac = function (t) {
        return (t - t0) / span;
      };
      var S = { panel: panel, data: data, t0: t0, t1: t1, span: span, p: 1, month: null, raf: 0 };
      /* the cards go oldest first, like the lanes */
      var list = panel.querySelector(".tl__list");
      data.forEach(function (d) {
        list.appendChild(d.li);
      });
      panel.classList.add("tl--scrub");

      var wrap = make("div", "tl__scrub");
      var play = make("button", "tl__play", wrap);
      play.type = "button";
      play.innerHTML = ICONS;
      var rail = make("div", "tl__rail", wrap);
      rail.style.setProperty("--lanes", data.length);

      /* Ruler: a tick every month, longer each quarter and year; years
         labelled, and on a short range the quarters too */
      var ruler = make("div", "tl__ruler", rail);
      make("span", "tl__base", ruler);
      make("span", "tl__base-fill", ruler);
      var short = span < 3;
      var labelled = 0;
      S.labels = [];
      for (var m = Math.ceil(t0 * 12 - 1e-6); m <= monthOf(t1); m++) {
        var mo = ((m % 12) + 12) % 12;
        var f = frac(m / 12);
        var tick = make("span", mo === 0 ? "tl__tick tl__tick--year" : mo % 3 === 0 ? "tl__tick tl__tick--quarter" : "tl__tick", ruler);
        tick.style.left = pct(f);
        if (mo !== 0 && !(short && mo % 3 === 0)) continue;
        var lab = make("span", mo === 0 ? "tl__label tl__label--year" : "tl__label", ruler);
        /* a month label before the first year label carries its year */
        lab.textContent = mo === 0 ? String(m / 12) : MONTH_LABEL[mo] + (labelled === 0 ? " " + Math.floor(m / 12) : "");
        lab.style.left = pct(f);
        S.labels.push({ el: lab, f: f, year: mo === 0 });
        labelled++;
      }
      make("span", "tl__tick tl__tick--year tl__tick--now", ruler).style.left = "100%";
      S.nowLabel = make("span", "tl__now", ruler);
      S.nowLabel.textContent = "Now";

      /* Lanes: one per entry, oldest on top, the logo at its start */
      var lanes = make("div", "tl__lanes", rail);
      S.marks = [t1];
      data.forEach(function (d) {
        d.live = d.r.present || d.r.end >= t1; /* still running today */
        d.s = Math.max(0, frac(d.r.start));
        d.e = d.live ? 1 : Math.min(1, frac(d.r.end));
        var w = Math.max(0.001, d.e - d.s).toFixed(5);
        S.marks.push(d.r.start);
        if (!d.live) S.marks.push(d.r.end);

        var lane = make("div", d.live ? "tl__lane tl__lane--live" : "tl__lane", lanes);
        lane.style.setProperty("--c-rgb", hexRgb(d.color));
        lane.style.setProperty("--s", d.s.toFixed(5));
        lane.style.setProperty("--w", w);
        var bar = make("span", "tl__lane-bar", lane);
        bar.style.left = pct(d.s);
        bar.style.width = pct(d.e - d.s);
        make("span", "tl__lane-fill", bar);
        var node = make("span", "tl__node", lane);
        node.style.left = pct(d.s);
        var logo = d.li.querySelector(".tl__logo img");
        if (logo) {
          var img = make("img", "", node);
          img.src = logo.getAttribute("src");
          img.alt = "";
        }
        d.lane = lane;
        lane.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "mouse" && !S.dragging) focus(panel, d);
        });
        lane.addEventListener("pointerleave", function () {
          focus(panel, null);
        });

        /* the card's own progress line, along its bottom edge */
        d.li.style.setProperty("--s", d.s.toFixed(5));
        d.li.style.setProperty("--w", w);
        d.prog = make("span", "tl__prog", d.li.querySelector(".tl__card"));
      });

      /* The playhead: a line through the lanes under a dark date pill */
      var head = make("div", "tl__head", rail);
      make("span", "tl__head-line", head);
      var knob = make("div", "tl__knob", head);
      knob.tabIndex = 0;
      knob.setAttribute("role", "slider");
      knob.setAttribute("aria-label", "Point in time");
      knob.setAttribute("aria-valuemin", Math.ceil(t0 * 12 - 1e-6));
      knob.setAttribute("aria-valuemax", monthOf(t1));
      var knobText = make("span", "tl__knob-text", knob);
      /* the ghost follows the mouse over the track and shows its date */
      var ghost = make("div", "tl__ghost", rail);
      var ghostText = make("span", "", ghost);

      panel.appendChild(wrap);
      S.wrap = wrap;
      S.play = play;
      S.rail = rail;
      S.knob = knob;
      S.knobText = knobText;
      S.ghost = ghost;
      S.ghostText = ghostText;
      S.W = rail.clientWidth;
      S.KW = knob.offsetWidth;

      /* ---- input ---- */
      var pAt = function (clientX, rect) {
        return (clientX - rect.left) / rect.width;
      };
      var snap = function (p) {
        var t = t0 + p * span;
        for (var i = 0; i < S.marks.length; i++) {
          if (Math.abs(t - S.marks[i]) < SNAP) return frac(S.marks[i]);
        }
        return p;
      };
      var grab = function (e) {
        stop(S);
        S.dragging = true;
        S.samples = [];
        try {
          rail.setPointerCapture(e.pointerId);
        } catch (err) {}
        panel.classList.add("tl--dragging");
        tl.classList.add("tl--scrubbed");
        ghost.classList.remove("is-on");
        focus(panel, null);
      };
      /* A mouse scrubs from the press. A finger might be scrolling the
         page (the rail leaves vertical pans to the browser), so it scrubs
         only once it moves sideways, and a tap glides the playhead over. */
      rail.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        S.rect = rail.getBoundingClientRect();
        if (e.pointerType !== "mouse") {
          S.down = { x: e.clientX };
          return;
        }
        grab(e);
        knob.focus({ preventScroll: true });
        setP(S, snap(pAt(e.clientX, S.rect)));
        e.preventDefault();
      });
      rail.addEventListener("pointermove", function (e) {
        if (!S.dragging) {
          if (e.pointerType === "mouse") hover(S, e.clientX);
          else if (S.down && Math.abs(e.clientX - S.down.x) > 6) {
            S.down = null;
            grab(e);
          }
          if (!S.dragging) return;
        }
        var p = pAt(e.clientX, S.rect);
        S.samples.push({ p: p, t: e.timeStamp });
        while (S.samples.length > 2 && e.timeStamp - S.samples[0].t > 90) S.samples.shift();
        setP(S, snap(p));
      });
      var release = function (e) {
        if (!S.dragging) {
          if (S.down && e.type === "pointerup") {
            tl.classList.add("tl--scrubbed");
            glide(S, snap(Math.max(0, Math.min(1, pAt(e.clientX, S.rect)))), 420, easeOut);
          }
          S.down = null;
          return;
        }
        S.dragging = false;
        panel.classList.remove("tl--dragging");
        /* a flick keeps the playhead coasting, slowing as it goes */
        var sm = S.samples;
        if (e.type === "pointerup" && sm.length > 1 && e.timeStamp - sm[sm.length - 1].t < 70) {
          var dt = sm[sm.length - 1].t - sm[0].t;
          var v = dt > 0 ? (sm[sm.length - 1].p - sm[0].p) / dt : 0;
          if (Math.abs(v) > 0.0004) coast(S, v);
        }
      };
      rail.addEventListener("pointerup", release);
      rail.addEventListener("pointercancel", release);
      rail.addEventListener("pointerleave", function () {
        ghost.classList.remove("is-on");
      });
      knob.addEventListener("keydown", function (e) {
        var month = 1 / 12 / span;
        var from = S.raf && S.goal != null ? S.goal : S.p;
        var to = null;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") to = from + month;
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = from - month;
        else if (e.key === "PageUp") to = from + 12 * month;
        else if (e.key === "PageDown") to = from - 12 * month;
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = 1;
        if (to === null) return;
        e.preventDefault();
        tl.classList.add("tl--scrubbed");
        glide(S, Math.max(0, Math.min(1, to)), 260, easeOut);
      });
      play.addEventListener("click", function () {
        tl.classList.add("tl--scrubbed");
        if (S.playing) stop(S);
        else sweep(S);
      });

      /* Start at the far left and sweep in once the track is on screen;
         with reduced motion, or after a first sweep, sit at today */
      if (reduced || panel._swept) setP(S, 1);
      else {
        setP(S, 0);
        if ("IntersectionObserver" in window) {
          S.io = new IntersectionObserver(
            function (entries) {
              if (
                !entries.some(function (en) {
                  return en.isIntersecting;
                })
              )
                return;
              S.io.disconnect();
              S.io = null;
              panel._swept = true;
              S.wait = setTimeout(function () {
                if (!S.dragging && S.p === 0) sweep(S);
              }, 250);
            },
            { threshold: 0.6 }
          );
          S.io.observe(wrap);
        } else {
          panel._swept = true;
          setP(S, 1);
        }
      }
      return S;
    }

    /* Move the playhead: --p drives the fills; the cards and lanes take a
       state class only when it changes */
    function setP(S, p) {
      p = Math.max(0, Math.min(1, p));
      S.p = p;
      S.panel.style.setProperty("--p", p.toFixed(5));
      var atNow = p > 0.9995;
      var month = monthOf(S.t0 + p * S.span);
      if (month !== S.month || atNow !== S.atNow) {
        S.month = month;
        S.atNow = atNow;
        S.panel.classList.toggle("tl--now", atNow);
        S.knobText.textContent = atNow ? "Now" : monthText(month);
        S.knob.setAttribute("aria-valuenow", month);
        S.knob.setAttribute("aria-valuetext", atNow ? "Now, " + monthText(month) : monthText(month));
      }
      /* the pill keeps inside the track; its notch stays on the line */
      var x = p * S.W;
      var left = Math.max(-16, Math.min(S.W + 16 - S.KW, x - S.KW / 2));
      S.knob.style.translate = (left - x).toFixed(1) + "px 0";
      S.knob.style.setProperty("--notch", (x - left).toFixed(1) + "px");
      S.data.forEach(function (d) {
        var st = p < d.s - 1e-6 ? "future" : !d.live && p >= d.e - 1e-6 ? "past" : "active";
        if (st === d.state) return;
        d.state = st;
        [d.li, d.lane].forEach(function (n) {
          n.classList.toggle("is-active", st === "active");
          n.classList.toggle("is-past", st === "past");
          n.classList.toggle("is-future", st === "future");
        });
      });
      syncPlay(S);
    }
    function syncPlay(S) {
      S.play.classList.toggle("is-playing", !!S.playing);
      S.play.classList.toggle("is-ended", S.p > 0.9995);
      var label = S.playing ? "Pause the timeline" : S.p > 0.9995 ? "Replay the timeline" : "Play the timeline to today";
      if (S.play.getAttribute("aria-label") !== label) S.play.setAttribute("aria-label", label);
    }
    function stop(S) {
      if (S.raf) cancelAnimationFrame(S.raf);
      clearTimeout(S.wait);
      S.raf = 0;
      S.goal = null;
      if (S.playing) {
        S.playing = false;
        syncPlay(S);
      }
    }
    function glide(S, to, ms, ease, playing) {
      stop(S);
      if (reduced) {
        setP(S, to);
        return;
      }
      var from = S.p;
      var start = null;
      S.goal = to;
      S.playing = !!playing;
      var step = function (ts) {
        if (start === null) start = ts;
        var k = Math.min(1, (ts - start) / ms);
        setP(S, from + (to - from) * ease(k));
        if (k < 1) S.raf = requestAnimationFrame(step);
        else {
          S.raf = 0;
          S.goal = null;
          S.playing = false;
          syncPlay(S);
        }
      };
      S.raf = requestAnimationFrame(step);
      syncPlay(S);
    }
    /* Play: from the start when at today, else on from where it stands */
    function sweep(S) {
      var from = S.p > 0.9995 ? 0 : S.p;
      setP(S, from);
      glide(S, 1, Math.max(500, (1 - from) * SWEEP_MS), from === 0 ? easeInOut : easeOut, true);
    }
    function coast(S, v) {
      stop(S);
      if (reduced) return;
      var last = null;
      var step = function (ts) {
        if (last !== null) {
          var dt = Math.min(40, ts - last);
          setP(S, S.p + v * dt);
          v *= Math.pow(0.93, dt / 16.7);
          if (S.p <= 0 || S.p >= 1 || Math.abs(v) < 0.00003) {
            S.raf = 0;
            return;
          }
        }
        last = ts;
        S.raf = requestAnimationFrame(step);
      };
      S.raf = requestAnimationFrame(step);
    }
    function hover(S, clientX) {
      var r = S.rail.getBoundingClientRect();
      var p = (clientX - r.left) / r.width;
      /* nothing to show past the ends, or right under the playhead */
      if (p < 0 || p > 1 || Math.abs(p - S.p) * r.width < 52) {
        S.ghost.classList.remove("is-on");
        return;
      }
      S.ghost.style.left = pct(p);
      S.ghostText.textContent = p > 0.9995 ? "Now" : monthText(monthOf(S.t0 + p * S.span));
      S.ghost.classList.add("is-on");
    }

    function layout(panel) {
      if (!panel._tl.length || panel.hidden) return;
      var S = panel._s || (panel._s = build(panel));
      S.W = S.rail.clientWidth;
      S.KW = S.knob.offsetWidth;
      fitLabels(S);
      setP(S, S.p);
    }

    /* Ruler labels that would touch a neighbour or "Now" step aside, years
       before months, so a narrow track keeps just what fits */
    function fitLabels(S) {
      var W = S.W;
      var taken = [[W - 7 - S.nowLabel.offsetWidth - 8, Infinity]];
      S.labels.forEach(function (l) {
        l.el.classList.remove("is-hidden");
      });
      S.labels
        .filter(function (l) {
          return l.year;
        })
        .concat(
          S.labels.filter(function (l) {
            return !l.year;
          })
        )
        .forEach(function (l) {
          var half = l.el.offsetWidth / 2 + 6;
          var a = l.f * W - half;
          var b = l.f * W + half;
          var clash = taken.some(function (t) {
            return a < t[1] && b > t[0];
          });
          if (clash) l.el.classList.add("is-hidden");
          else taken.push([a, b]);
        });
    }

    /* Hovering a card or a lane lights that pair and dims the rest; a
       click on a card (not its link) takes the playhead to its start */
    function focus(panel, d) {
      panel.classList.toggle("tl--focus", !!d);
      panel._tl.forEach(function (e) {
        var on = e === d;
        e.li.classList.toggle("is-hot", on);
        if (e.lane) e.lane.classList.toggle("is-hot", on);
      });
    }
    panels.forEach(function (panel) {
      panel._tl.forEach(function (d) {
        /* a mouse only: a tap on a phone shouldn't leave the others dimmed */
        d.li.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "mouse" && panel._s && !panel._s.dragging) focus(panel, d);
        });
        d.li.addEventListener("pointerleave", function () {
          focus(panel, null);
        });
        d.li.addEventListener("click", function (e) {
          var S = panel._s;
          if (!S || e.target.closest("a")) return;
          tl.classList.add("tl--scrubbed");
          glide(S, Math.min(1, d.s + 0.5 / 12 / S.span), 700, easeInOut);
        });
      });
    });

    /* Tabs: click, or arrow keys between them (WAI-ARIA tabs pattern) */
    function select(tab, moveFocus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        var on = p.getAttribute("data-panel") === tab.getAttribute("data-tab");
        if (!on && p._s) stop(p._s);
        p.hidden = !on;
        p.classList.toggle("is-active", on);
        if (on) layout(p);
      });
      if (moveFocus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(tab, false);
      });
      tab.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") n = tabs[0];
        else if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) {
          e.preventDefault();
          select(n, true);
        }
      });
    });

    /* a hint beside the tabs, until the first drag */
    var hint = make("span", "tl__hint", tl.querySelector(".tl__tabs"));
    hint.setAttribute("aria-hidden", "true");
    hint.textContent = "Drag the timeline";

    var relayout = function () {
      panels.forEach(layout);
    };
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(relayout, 120);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    window.addEventListener("load", relayout);
    relayout();
  }

  /* ===== 4. Research deck on phones: dots follow the swipe ===== */
  var deck = root.querySelector(".research ol.bibliography");
  if (deck && deck.children.length > 1) {
    var cards = Array.prototype.slice.call(deck.children);
    var bar = document.createElement("div");
    bar.className = "rc-deck";
    var dots = document.createElement("div");
    dots.className = "rc-deck__dots";
    var hint = document.createElement("div");
    hint.className = "rc-deck__hint";
    hint.textContent = "swipe to browse";
    cards.forEach(function (card, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rc-deck__dot" + (i === 0 ? " is-active" : "");
      b.setAttribute("aria-label", "Show paper " + (i + 1) + " of " + cards.length);
      b.addEventListener("click", function () {
        deck.scrollTo({ left: card.offsetLeft - (deck.clientWidth - card.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
      });
      dots.appendChild(b);
    });
    bar.appendChild(dots);
    bar.appendChild(hint);
    deck.parentNode.insertBefore(bar, deck.nextSibling);
    var current = 0;
    var onScroll = function () {
      var mid = deck.scrollLeft + deck.clientWidth / 2;
      var best = 0;
      var bestD = Infinity;
      cards.forEach(function (c, i) {
        var dd = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      });
      if (best === current) return;
      current = best;
      Array.prototype.forEach.call(dots.children, function (dot, i) {
        dot.classList.toggle("is-active", i === best);
      });
      hint.style.opacity = "0";
    };
    deck.addEventListener("scroll", onScroll, { passive: true });
  }
})();
