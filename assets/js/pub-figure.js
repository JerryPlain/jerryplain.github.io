// Publication figure lightbox.
// Clicking a publication teaser (.thumbnail-hover-wrapper img.preview, which
// carries the full figure in data-zoom-src) opens the figure centred in a
// white card over a blurred page. Click anywhere or press Escape to close.
(function () {
  var box = null;

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

  function open(src, alt) {
    close();
    box = document.createElement("div");
    box.className = "pub-lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", alt || "Figure");
    var card = document.createElement("figure");
    card.className = "pub-lightbox__card";
    var img = document.createElement("img");
    img.src = src;
    img.alt = alt || "";
    card.appendChild(img);
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
    var teaser = wrap.querySelector("img.preview");
    var src = teaser && (teaser.getAttribute("data-zoom-src") || teaser.getAttribute("src"));
    if (!src) return;
    e.preventDefault();
    open(src, teaser.getAttribute("alt"));
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
