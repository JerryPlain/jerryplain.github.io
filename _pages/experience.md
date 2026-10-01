---
layout: page
title: Experience
permalink: /experience/
description: Where I have studied, researched and worked.
nav: true
nav_order: 2
---

{% comment %}
One section per group in _data/experience.yml. A group with no entries is
skipped, heading and all.
{% endcomment %}

{% assign groups = "education|Education|fa-graduation-cap,research|Research Experience|fa-flask,work|Work Experience|fa-briefcase" | split: "," %}

<div class="experience-page">
  {% for g in groups %}
    {% assign parts = g | split: "|" %}
    {% assign key = parts[0] %}
    {% assign entries = site.data.experience[key] %}
    {% if entries and entries.size > 0 %}
      <section class="exp-group" id="{{ key }}">
        <h2 class="exp-section">
          <i class="fa-solid {{ parts[2] }}" aria-hidden="true"></i>
          {{ parts[1] }}
        </h2>
        {% include experience.liquid group=key %}
      </section>
    {% endif %}
  {% endfor %}
</div>
