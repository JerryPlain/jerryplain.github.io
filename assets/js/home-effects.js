/* Home page behaviour (loaded only by _layouts/about.liquid):
     1. scroll reveal: sections rise 32px and fade in as they enter
     2. the news card: exactly five rows tall, scrolls for the rest
     3. the Background timeline: tabs, and on wide screens a horizontal
        axis with one coloured bar per entry and the cards pinned to it
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

  /* ===== 3. Background timeline ===== */
  var tl = root.querySelector("[data-timeline]");
  if (tl) initTimeline(tl);

  function initTimeline(tl) {
    var SVGNS = "http://www.w3.org/2000/svg";
    var wide = window.matchMedia("(min-width: 1024px)"); /* the chart needs room for ~4 cards */
    var tabs = Array.prototype.slice.call(tl.querySelectorAll(".tl__tab"));
    var panels = Array.prototype.slice.call(tl.querySelectorAll(".tl__panel"));
    /* One hue per entry, in start order, as on the reference: Experience
       walks blue → indigo → violet → cyan, Education emerald → lime. */
    var PALETTES = {
      experience: ["#3b82f6", "#6366f1", "#8b5cf6", "#06b6d4"],
      education: ["#10b981", "#14b8a6", "#22c55e", "#84cc16"],
    };
    var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
    var MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var today = new Date();
    var NOW = today.getFullYear() + (today.getMonth() + today.getDate() / 31) / 12;
    var drawn = {}; /* panels whose bars have already drawn in once */

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

    function el(name, attrs, parent) {
      var n = document.createElementNS(SVGNS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }

    /* Colours go on every layout, so the phone rail's dots match too */
    panels.forEach(function (panel) {
      var key = panel.getAttribute("data-panel");
      var pal = PALETTES[key] || PALETTES.experience;
      var items = Array.prototype.slice.call(panel.querySelectorAll(".tl__item"));
      var data = items
        .map(function (li) {
          return { li: li, r: parseRange(li.getAttribute("data-dates")) };
        })
        .filter(function (d) {
          return d.r;
        });
      data
        .slice()
        .sort(function (a, b) {
          return a.r.start - b.r.start || a.r.end - b.r.end;
        })
        .forEach(function (d, i, all) {
          /* fewer entries than hues: spread them across the palette */
          var n = all.length;
          var idx = n > 1 && n <= pal.length ? Math.round((i * (pal.length - 1)) / (n - 1)) : i % pal.length;
          d.color = pal[idx];
          d.li.style.setProperty("--tl-color", d.color);
        });
      /* The rail reads newest first */
      data
        .slice()
        .sort(function (a, b) {
          return b.r.start - a.r.start || b.r.end - a.r.end;
        })
        .forEach(function (d) {
          d.li.parentNode.appendChild(d.li);
        });
      panel._tl = data;
    });

    function teardown(panel) {
      panel.classList.remove("tl--chart", "tl--focus", "tl--animate", "tl--drawn");
      var svg = panel.querySelector(".tl__svg");
      if (svg) svg.remove();
      var list = panel.querySelector(".tl__list");
      list.style.removeProperty("--tl-height");
      panel._tl.forEach(function (d) {
        d.li.style.left = d.li.style.top = d.li.style.width = "";
        d.li.classList.remove("is-hot");
      });
    }

    function layout(panel) {
      if (panel.hidden) return;
      var data = panel._tl;
      if (!wide.matches || !data.length) {
        teardown(panel);
        return;
      }
      var list = panel.querySelector(".tl__list");
      panel.classList.add("tl--chart");
      var old = panel.querySelector(".tl__svg");
      if (old) old.remove();

      var W = list.clientWidth;
      var CW = Math.min(240, Math.max(196, (W - 48) / 4)); /* card width */
      var GAP = 16; /* between cards in a row */
      var PADX = 10;
      var sorted = data.slice().sort(function (a, b) {
        return a.r.start - b.r.start || a.r.end - b.r.end;
      });

      /* Time range with a little air either side */
      var t0 = Math.min.apply(
        null,
        sorted.map(function (d) {
          return d.r.start;
        })
      );
      var t1 = Math.max.apply(
        null,
        sorted.map(function (d) {
          return d.r.end;
        })
      );
      var span = t1 - t0;
      if (span > 3) {
        /* a long range starts and ends on whole years, as on the reference */
        t0 = Math.floor(t0);
        t1 = Math.ceil(Math.min(t1, NOW + 0.05) + 0.08);
      } else {
        var pad = Math.max(0.12, span * 0.05);
        t0 -= pad;
        t1 += pad;
      }
      var x = function (t) {
        return PADX + ((t - t0) / (t1 - t0)) * (W - 2 * PADX);
      };

      /* Greedy lanes: each stint takes the first lane free at its start */
      var assignLanes = function (items) {
        var ends = [];
        items.forEach(function (d) {
          for (var k = 0; k < ends.length; k++) {
            if (ends[k] <= d.r.start + 1e-6) break;
          }
          ends[k] = d.r.end;
          d.lane = k;
        });
        return ends.length;
      };
      var LANE = 8; /* overlapping stints run as parallel bars 8px apart */

      /* Card anchors and rows: each card sits over the middle of its bar,
         alternating above and below; a card that would collide with its
         neighbour in a row takes the other row if that one is free there. */
      sorted.forEach(function (d) {
        d.li.style.width = CW + "px";
        d.anchor = x((d.r.start + Math.min(d.r.end, t1)) / 2);
        d.xe = d.r.present ? x(t1) : x(Math.min(d.r.end, t1));
        d.h = d.li.offsetHeight;
      });
      var rowsEnd = [-Infinity, -Infinity];
      sorted
        .slice()
        .sort(function (a, b) {
          return a.anchor - b.anchor;
        })
        .forEach(function (d, i) {
          var want = d.anchor - CW / 2;
          var pref = i % 2; /* 0 above, 1 below */
          var fitsPref = rowsEnd[pref] + GAP <= want;
          var fitsOther = rowsEnd[1 - pref] + GAP <= want;
          d.row = fitsPref || !fitsOther ? pref : 1 - pref;
          rowsEnd[d.row] = Math.max(want, rowsEnd[d.row] + GAP) + CW;
        });
      /* Pack each row: forward pass pushes right, backward pass pulls the
         tail back inside the width */
      [0, 1].forEach(function (row) {
        var r = sorted
          .filter(function (d) {
            return d.row === row;
          })
          .sort(function (a, b) {
            return a.anchor - b.anchor;
          });
        var prevRight = -Infinity;
        r.forEach(function (d) {
          d.left = Math.max(d.anchor - CW / 2, prevRight + GAP, 0);
          prevRight = d.left + CW;
        });
        for (var i = r.length - 1; i >= 0; i--) {
          var limit = i === r.length - 1 ? W - CW : r[i + 1].left - GAP - CW;
          r[i].left = Math.max(0, Math.min(r[i].left, limit));
        }
      });

      /* Bars: when nothing overlaps, every bar rides the one axis line, as on
         the reference. When stints overlap, the cards above get their bars
         stacked just above the axis and the cards below just under it, so
         no connector ever has to cross another entry's bar. */
      var rowItems = function (row) {
        return sorted.filter(function (d) {
          return d.row === row;
        });
      };
      var split = assignLanes(sorted) > 1;
      var nA = 0;
      var nB = 0;
      if (split) {
        nA = assignLanes(rowItems(0));
        nB = assignLanes(rowItems(1));
      } else {
        sorted.forEach(function (d) {
          d.lane = 0;
        });
      }
      var HALF = LANE / 2;
      var upReach = split && nA ? HALF + (nA - 1) * LANE : 0;
      var downReach = split && nB ? HALF + (nB - 1) * LANE : 0;

      var aboveH = Math.max.apply(
        null,
        [0].concat(
          rowItems(0).map(function (d) {
            return d.h;
          })
        )
      );
      var belowH = Math.max.apply(
        null,
        [0].concat(
          rowItems(1).map(function (d) {
            return d.h;
          })
        )
      );
      var G = 46; /* card edge to the nearest bar */
      var bandTop = aboveH + G;
      var bandMid = bandTop + upReach; /* the axis line */
      var bandBottom = bandMid + downReach;
      var total = bandBottom + G + belowH;
      list.style.setProperty("--tl-height", total + "px");

      sorted.forEach(function (d) {
        d.y = !split ? bandMid : d.row === 0 ? bandMid - HALF - d.lane * LANE : bandMid + HALF + d.lane * LANE;
        d.li.style.left = d.left + "px";
        d.li.style.top = (d.row === 0 ? aboveH - d.h : bandBottom + G) + "px";
      });

      /* ---- the SVG behind the cards ---- */
      var svg = el("svg", { class: "tl__svg", width: W, height: total, viewBox: "0 0 " + W + " " + total, "aria-hidden": "true" });
      list.insertBefore(svg, list.firstChild);
      var gAxis = el("g", {}, svg);
      el("line", { class: "tl__axis", x1: x(t0), x2: x(t1), y1: bandMid, y2: bandMid }, gAxis);
      /* Ticks: every year; on a short range, every quarter too */
      var labelY = bandTop - 13;
      var quarterly = t1 - t0 < 3.2;
      for (var yr = Math.floor(t0); yr <= Math.ceil(t1); yr++) {
        for (var q = 0; q < (quarterly ? 4 : 1); q++) {
          var t = yr + q / 4;
          if (t < t0 || t > t1) continue;
          var tx = x(t);
          var major = q === 0;
          el("line", { class: "tl__tick", x1: tx, x2: tx, y1: bandMid - (major ? 5 : 3), y2: bandMid + (major ? 5 : 3) }, gAxis);
          var lab = el("text", { class: "tl__label" + (major ? "" : " tl__label--minor"), x: tx, y: labelY }, gAxis);
          lab.textContent = major ? String(yr) : MONTH_LABEL[q * 3];
        }
      }

      var animate = !reduced && !drawn[panel.id];
      panel.classList.toggle("tl--animate", animate);
      panel.classList.remove("tl--drawn");

      sorted.forEach(function (d, i) {
        var g = el("g", { class: "tl-g" }, svg);
        d.g = g;
        var xs = x(d.r.start);
        var xe = d.xe;
        var len = Math.max(1, xe - xs);
        g.style.setProperty("--len", len.toFixed(1));
        g.style.setProperty("--d", (i * 0.12).toFixed(2) + "s");
        /* connector: from the card's edge to the bar, straight down when the
           anchor sits under the card, slanting when the card was pushed */
        var cardEdgeY = d.row === 0 ? aboveH : bandBottom + G;
        var attachX = Math.max(d.left + 22, Math.min(d.anchor, d.left + CW - 22));
        el(
          "path",
          {
            class: "tl-link",
            d: "M" + attachX + " " + cardEdgeY + " L" + d.anchor + " " + (d.row === 0 ? d.y - 4 : d.y + 4),
            stroke: d.color,
          },
          g
        );
        var seg = el("line", { class: "tl-seg", x1: xs, x2: xe, y1: d.y, y2: d.y, stroke: d.color }, g);
        if (d.r.present) {
          /* an open-ended bar runs on to the edge and fades out there */
          var gid = panel.id + "-fade-" + i;
          var defs = el("defs", {}, g);
          var lg = el("linearGradient", { id: gid, gradientUnits: "userSpaceOnUse", x1: xs, x2: xe, y1: 0, y2: 0 }, defs);
          var fadeFrom = Math.max(0, Math.min(0.85, (x(NOW) - xs) / Math.max(1, xe - xs)));
          el("stop", { offset: "0", "stop-color": d.color }, lg);
          el("stop", { offset: fadeFrom.toFixed(3), "stop-color": d.color }, lg);
          el("stop", { offset: "1", "stop-color": d.color, "stop-opacity": "0" }, lg);
          seg.setAttribute("stroke", "url(#" + gid + ")");
        }
        /* start: a solid dot in a soft halo; end: a smaller, paler dot */
        el("circle", { class: "tl-halo", cx: xs, cy: d.y, r: 9, fill: d.color }, g);
        el("circle", { class: "tl-dot", cx: xs, cy: d.y, r: 5.5, fill: d.color }, g);
        if (!d.r.present) el("circle", { class: "tl-dot tl-dot--end", cx: xe, cy: d.y, r: 4, fill: d.color }, g);
        var hit = el("line", { class: "tl-hit", x1: xs, x2: xe, y1: d.y, y2: d.y }, g);
        hit.addEventListener("mouseenter", function () {
          focus(panel, d);
        });
        hit.addEventListener("mouseleave", function () {
          focus(panel, null);
        });
      });

      if (animate) {
        /* draw once the timeline is actually on screen */
        var go = function () {
          drawn[panel.id] = true;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              panel.classList.add("tl--drawn");
            });
          });
        };
        if ("IntersectionObserver" in window) {
          var io2 = new IntersectionObserver(
            function (entries) {
              if (
                entries.some(function (e) {
                  return e.isIntersecting;
                })
              ) {
                io2.disconnect();
                go();
              }
            },
            { threshold: 0.25 }
          );
          io2.observe(list);
        } else go();
      }
    }

    /* Hovering a card or a bar lights that pair and dims the rest */
    function focus(panel, d) {
      panel.classList.toggle("tl--focus", !!d);
      panel._tl.forEach(function (e) {
        var on = e === d;
        e.li.classList.toggle("is-hot", on);
        if (e.g) e.g.classList.toggle("is-hot", on);
      });
    }
    panels.forEach(function (panel) {
      panel._tl.forEach(function (d) {
        d.li.addEventListener("mouseenter", function () {
          if (panel.classList.contains("tl--chart")) focus(panel, d);
        });
        d.li.addEventListener("mouseleave", function () {
          focus(panel, null);
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

    var relayout = function () {
      panels.forEach(layout);
    };
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(relayout, 120);
    });
    if (wide.addEventListener) wide.addEventListener("change", relayout);
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
