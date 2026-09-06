---
layout: page
permalink: /photography/
title: Photography
description: A few frames I liked enough to keep.
nav: true
nav_order: 3
---

<!-- Drop .jpg or .png files into assets/img/photography/ and they appear here,
     newest filename first — no list to maintain, the page reads the folder at
     build time. Name them so they sort, e.g. 2026-01-reykjavik.jpg. Click any
     photo to view it full size.

     The .webp exclusion below matters: the responsive-image plugin writes a
     -480/-800/-1400.webp variant of every source image back into this same
     folder, and those show up in site.static_files too. Without the filter each
     photo would appear four times. -->

{% assign photos = site.static_files | where_exp: "f", "f.path contains '/assets/img/photography/' and f.extname != '.webp'" | sort: "name" | reverse %}

{% if photos.size > 0 %}

<div class="photo-grid">
  {% for photo in photos %}
    <figure class="photo-grid__item">
      {% include figure.liquid loading="lazy" path=photo.path class="img-fluid rounded" zoomable=true alt=photo.basename %}
    </figure>
  {% endfor %}
</div>

{% else %}

<p class="photo-grid__empty">Photographs are on their way — check back soon.</p>

{% endif %}
