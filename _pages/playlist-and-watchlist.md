---
layout: page
title: Playlist & Watchlist
permalink: /playlist-and-watchlist/
description: What I kept on repeat and what I stayed up for, year by year.
nav: false
---

{% comment %}
Not in the navbar: reached from the homepage's hobby line ("my playlist & watchlist").
The lists live in _data/favorites.yml; the markup in _includes/songs_shows.liquid.
{% endcomment %}

{% include songs_shows.liquid %}
