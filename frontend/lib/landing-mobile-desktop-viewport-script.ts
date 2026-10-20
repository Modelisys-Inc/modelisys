/**
 * Sur la page d'accueil, un téléphone affiche la composition ordinateur
 * (largeur de mise en page fixe) réduite à la largeur de l'écran.
 * Les autres pages gardent leur mise en page mobile.
 */
export const LANDING_MOBILE_DESKTOP_VIEWPORT_SCRIPT = `
(function () {
  var DESIGN = "width=1440";
  var DEFAULT_VP = "width=device-width, initial-scale=1";
  var MOBILE_MAX = 767;

  function meta() {
    return document.querySelector('meta[name="viewport"]');
  }

  function isHome() {
    var path = location.pathname;
    if (path.length > 1 && path.charAt(path.length - 1) === "/") path = path.slice(0, -1);
    return path === "/";
  }

  function screenMin() {
    var sw = window.screen && window.screen.width ? window.screen.width : 0;
    var sh = window.screen && window.screen.height ? window.screen.height : 0;
    if (!sw || !sh) return 0;
    return Math.min(sw, sh);
  }

  function isPhone() {
    var minSide = screenMin();
    if (minSide > 0 && minSide <= MOBILE_MAX) return true;
    var scaled = document.documentElement.getAttribute("data-landing-scaled") === "1";
    if (scaled) {
      var outer = window.outerWidth || 0;
      if (minSide > MOBILE_MAX && outer > 900) return false;
      return true;
    }
    return window.matchMedia("(max-width: " + MOBILE_MAX + "px)").matches;
  }

  function apply() {
    if (window.__modelisysLandingViewportPaused) return;
    if (!isHome()) return;
    var node = meta();
    if (!node || !isPhone()) {
      if (node && document.documentElement.getAttribute("data-landing-scaled") === "1" && !isPhone()) {
        node.setAttribute("content", DEFAULT_VP);
        document.documentElement.removeAttribute("data-landing-scaled");
      }
      return;
    }
    if (node.getAttribute("content") !== DESIGN) node.setAttribute("content", DESIGN);
    document.documentElement.setAttribute("data-landing-scaled", "1");
  }

  function restore() {
    window.__modelisysLandingViewportPaused = true;
    var node = meta();
    if (node && document.documentElement.getAttribute("data-landing-scaled") === "1") {
      node.setAttribute("content", DEFAULT_VP);
    }
    document.documentElement.removeAttribute("data-landing-scaled");
  }

  window.__modelisysLandingViewport = { apply: apply, restore: restore };
  apply();

  if (!window.__modelisysLandingViewportBound) {
    window.__modelisysLandingViewportBound = true;
    var observer = new MutationObserver(function () { apply(); });
    observer.observe(document.head, { subtree: true, attributes: true, childList: true });
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
  }
})();
`
