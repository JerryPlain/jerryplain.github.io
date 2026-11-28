// Theme by the clock (local addition). Loaded right after al-folio's
// theme.js and before initTheme(), it swaps in its own versions of the
// theme functions there. The site is light by day and dark by night on the
// visitor's own clock (night is 18:00–06:00), and an open page turns over by
// itself when the hour comes. The navbar toggle still works: a click flips
// the theme for the rest of the visit only (sessionStorage, which the
// photography site on this origin shares), and flipping back to what the
// clock says hands the theme back to the clock. Choices the old toggle saved
// for good (localStorage) are dropped so they no longer pin the theme.
(function () {
  var NIGHT_FROM = 18;
  var NIGHT_UNTIL = 6;

  function clockTheme() {
    var h = new Date().getHours();
    return h >= NIGHT_FROM || h < NIGHT_UNTIL ? "dark" : "light";
  }

  try {
    localStorage.removeItem("theme");
  } catch (e) {}

  // "auto" follows the clock; "light" or "dark" is this visit's override.
  determineThemeSetting = function () {
    var s = null;
    try {
      s = sessionStorage.getItem("theme");
    } catch (e) {}
    return s === "light" || s === "dark" ? s : "auto";
  };

  determineComputedTheme = function () {
    var s = determineThemeSetting();
    return s === "auto" ? clockTheme() : s;
  };

  setThemeSetting = function (s) {
    try {
      if (s === "light" || s === "dark") sessionStorage.setItem("theme", s);
      else sessionStorage.removeItem("theme");
    } catch (e) {}
    document.documentElement.setAttribute("data-theme-setting", determineThemeSetting());
    applyTheme();
  };

  toggleThemeSetting = function () {
    var next = determineComputedTheme() === "dark" ? "light" : "dark";
    setThemeSetting(next === clockTheme() ? "auto" : next);
  };

  function follow() {
    if (determineThemeSetting() === "auto" && document.documentElement.getAttribute("data-theme") !== clockTheme()) applyTheme();
  }
  setInterval(follow, 60000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) follow();
  });
})();
