// Publication figure lightbox.
// Clicking a publication teaser (.thumbnail-hover-wrapper .preview, which
// carries the full figure in data-zoom-src) opens the figure centred in a
// white card over a blurred page. Click anywhere or press Escape to close.
// Video teasers (real-robot clips) open as a looping video instead, play
// only while on screen, and stay paused for readers who prefer reduced
// motion; the hover card picks up the clip where the plate is.
(function () {
  var box = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function close() {
    if (!box) return;
    var el = box;
    box = null;
    el.classList.remove("is-open");
    document.documentElement.classList.remove("pub-lightbox-open");
    setTimeout(function () {
      el.remove();
    }, 220);
  }

  function open(src, alt, isVideo, startAt) {
    close();
    box = document.createElement("div");
    box.className = "pub-lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", alt || "Figure");
    var card = document.createElement("figure");
    card.className = "pub-lightbox__card";
    var media;
    if (isVideo) {
      media = document.createElement("video");
      media.src = src;
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.autoplay = true;
      media.setAttribute("aria-label", alt || "");
      if (startAt) {
        media.addEventListener("loadedmetadata", function () {
          media.currentTime = startAt;
        });
      }
    } else {
      media = document.createElement("img");
      media.src = src;
      media.alt = alt || "";
    }
    card.appendChild(media);
    box.appendChild(card);
    document.body.appendChild(box);
    document.documentElement.classList.add("pub-lightbox-open");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (box) box.classList.add("is-open");
      });
    });
  }

  document.addEventListener("click", function (e) {
    if (box && box.contains(e.target)) {
      close();
      return;
    }
    var wrap = e.target.closest && e.target.closest(".thumbnail-hover-wrapper");
    if (!wrap) return;
    var teaser = wrap.querySelector(".preview");
    var src = teaser && (teaser.getAttribute("data-zoom-src") || teaser.getAttribute("src"));
    if (!src) return;
    e.preventDefault();
    var isVideo = teaser.tagName === "VIDEO";
    open(src, teaser.getAttribute("alt") || teaser.getAttribute("aria-label"), isVideo, isVideo ? teaser.currentTime : 0);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  function setupVideos() {
    var teasers = document.querySelectorAll("ol.bibliography video.preview");
    if (!teasers.length) return;

    function play(v) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }

    teasers.forEach(function (v) {
      if (reduceMotion) {
        v.removeAttribute("autoplay");
        v.pause();
      }
      var wrap = v.closest(".thumbnail-hover-wrapper");
      var hover = wrap && wrap.querySelector(".thumbnail-hover-overlay video");
      if (!hover) return;
      wrap.addEventListener("mouseenter", function () {
        if (hover.preload === "none") hover.preload = "auto";
        try {
          hover.currentTime = v.currentTime;
        } catch (err) {}
        if (!reduceMotion) play(hover);
      });
      wrap.addEventListener("mouseleave", function () {
        hover.pause();
      });
    });

    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) play(en.target);
          else en.target.pause();
        });
      },
      { threshold: 0.15 }
    );
    teasers.forEach(function (v) {
      io.observe(v);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupVideos);
  else setupVideos();
})();
