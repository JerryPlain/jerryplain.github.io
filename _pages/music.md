---
layout: page
permalink: /music/
title: Music
description: A place to share some of my favorite music of all time — for music has always had the power to leave a mark on the soul.
nav: true
nav_order: 4
---

<div class="music">
{% for g in site.data.music %}
  <section class="mg">
    <h2 class="mg__name">{{ g.genre }}</h2>
    {% if g.desc %}<p class="mg__desc">{{ g.desc }}</p>{% endif %}
    {% assign groups = "album,single" | split: "," %}
    {% for grp in groups %}
      {% if grp == "album" %}{% assign label = "Albums" %}{% else %}{% assign label = "Singles" %}{% endif %}
      {% assign list = g.items | where: "type", grp | sort: "release" | reverse %}
      {% if list.size > 0 %}
        <div class="mg__label"><span>{{ label }}</span><i>{{ list.size }}</i></div>
        <div class="rel-list">
          {% for item in list %}
          <article class="rel">
            <div class="rel__grid">
              {% if item.cover %}
              <img class="rel__cover" src="{{ item.cover | relative_url }}" alt="{{ item.title }} cover" loading="lazy" />
              {% else %}
              <div class="rel__cover rel__cover--ph"><span>{{ item.title | slice: 0, 1 | upcase }}</span></div>
              {% endif %}
              <div class="rel__body">
                <h3 class="rel__title">{{ item.title }}</h3>
                <div class="rel__meta">
                  <span>{{ item.artist }}</span>
                  {% if item.release %}<span class="dot">·</span><span class="date">{{ item.release | append: "-01" | date: "%B %Y" }}</span>{% endif %}
                </div>
                {% if item.note %}<p class="rel__note">{{ item.note }}</p>{% endif %}
                {% if item.lyrics %}
                <div class="rel__lyrics">
                  {% for l in item.lyrics %}
                  <figure class="lyric">
                    <blockquote>{{ l.lines | strip | newline_to_br }}</blockquote>
                    {% if l.song %}<figcaption>{{ l.song }}</figcaption>{% endif %}
                  </figure>
                  {% endfor %}
                </div>
                {% endif %}
              </div>
            </div>
          </article>
          {% endfor %}
        </div>
      {% endif %}
    {% endfor %}
  </section>
{% endfor %}
</div>
