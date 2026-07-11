---
layout: page
permalink: /music/
title: Music
description: Albums and singles worth sharing — and the lyrics I can't skip.
nav: true
nav_order: 4
---

<div class="music">
{% for g in site.data.music %}
  <section class="music-genre">
    <header class="music-genre-head">
      <h2 class="music-genre-name">{{ g.genre }}</h2>
      {% if g.desc %}<p class="music-genre-desc">{{ g.desc }}</p>{% endif %}
    </header>
    {% assign groups = "album,single" | split: "," %}
    {% for grp in groups %}
      {% if grp == "album" %}{% assign label = "Albums" %}{% else %}{% assign label = "Singles" %}{% endif %}
      {% assign list = g.items | where: "type", grp | sort: "release" | reverse %}
      {% if list.size > 0 %}
        <h3 class="music-subhead">{{ label }}<span class="music-count">{{ list.size }}</span></h3>
        <div class="music-list">
          {% for item in list %}
          <article class="music-card">
            <div class="music-cover-wrap">
              {% if item.cover %}
              <img class="music-cover" src="{{ item.cover | relative_url }}" alt="{{ item.title }} cover" loading="lazy" />
              {% else %}
              <div class="music-cover music-cover--placeholder"><span>{{ item.title | slice: 0, 1 | upcase }}</span></div>
              {% endif %}
            </div>
            <div class="music-body">
              <h4 class="music-title">{{ item.title }}</h4>
              <div class="music-artist">{{ item.artist }}</div>
              {% if item.release %}<div class="music-date">{{ item.release | append: "-01" | date: "%B %Y" }}</div>{% endif %}
              {% if item.note %}<p class="music-note">{{ item.note }}</p>{% endif %}
              {% if item.lyrics %}
              <div class="music-lyrics">
                {% for l in item.lyrics %}
                <figure class="music-lyric">
                  <blockquote>{{ l.lines | strip | newline_to_br }}</blockquote>
                  {% if l.song %}<figcaption>{{ l.song }}</figcaption>{% endif %}
                </figure>
                {% endfor %}
              </div>
              {% endif %}
            </div>
          </article>
          {% endfor %}
        </div>
      {% endif %}
    {% endfor %}
  </section>
{% endfor %}
</div>
