---
layout: page
permalink: /music/
title: Music
description: 我想分享的单曲和专辑，还有那些一直循环、舍不得跳过的歌词。
nav: true
nav_order: 4
---

<div class="music">
{% assign entries = site.data.music | sort: "release" | reverse %}
{% assign current_year = "" %}
{% for item in entries %}
  {% assign year = item.release | slice: 0, 4 %}
  {% assign month = item.release | append: "-01" | date: "%B" %}
  {% if year != current_year %}
    {% unless forloop.first %}</div>{% endunless %}
    <h2 class="music-year">{{ year }}</h2>
    <div class="music-list">
    {% assign current_year = year %}
  {% endif %}
    <article class="music-card">
      <div class="music-cover-wrap">
        {% if item.cover %}
        <img class="music-cover" src="{{ item.cover | relative_url }}" alt="{{ item.title }} cover" loading="lazy" />
        {% else %}
        <div class="music-cover music-cover--placeholder"><span>{{ item.title | slice: 0, 1 | upcase }}</span></div>
        {% endif %}
      </div>
      <div class="music-body">
        <div class="music-head">
          <span class="music-type">{% if item.type == "single" %}单曲{% else %}专辑{% endif %}</span>
          <h3 class="music-title">{{ item.title }}</h3>
          <div class="music-sub">{{ item.artist }} · {{ month }} {{ year }}</div>
          {% if item.note %}<p class="music-note">{{ item.note }}</p>{% endif %}
        </div>
        {% if item.lyrics %}
        <div class="music-lyrics">
          {% for l in item.lyrics %}
          <figure class="music-lyric">
            <blockquote>{{ l.lines | strip | newline_to_br }}</blockquote>
            {% if l.song %}<figcaption>— <em>{{ l.song }}</em></figcaption>{% endif %}
          </figure>
          {% endfor %}
        </div>
        {% endif %}
      </div>
    </article>
  {% if forloop.last %}</div>{% endif %}
{% endfor %}
</div>
