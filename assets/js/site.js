/* ISCOCA Power Systems: site runtime
   - Intro: first-visit logo sequence (once per session)
   - Router: same-origin page loads swap #app behind the branded blue veil (real .html routes,
     real history entries, full-page fallback on any failure)
   - Page modules: initialised on every page load, torn down before every swap */
(function () {
  "use strict";

  var doc = document, root = doc.documentElement;
  var RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var PREVIEW = root.dataset.mode === "preview";
  var EASE = "cubic-bezier(.22,.9,.24,1)", EASE_IO = "cubic-bezier(.76,0,.24,1)";

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function raf2() { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* Web Animations helper. Resolves when finished, or after a timer, so a throttled
     background tab can never leave an overlay stuck on screen. */
  function play(el, frames, opt) {
    if (!el || !el.animate) return Promise.resolve(null);
    opt = Object.assign({ duration: 400, easing: EASE, fill: "forwards" }, opt);
    var a = el.animate(frames, opt);
    var limit = (opt.duration || 0) + (opt.delay || 0) + 160;
    return Promise.race([a.finished.catch(function () {}), wait(limit)]).then(function () { return a; });
  }

  /* ------------------------------------------------------------------ page modules */
  var cleanups = [];
  function onCleanup(fn) { cleanups.push(fn); }
  function teardown() { while (cleanups.length) { try { cleanups.pop()(); } catch (e) {} } }
  function listen(t, ev, fn, o) { t.addEventListener(ev, fn, o); onCleanup(function () { t.removeEventListener(ev, fn, o); }); }

  function initPage() {
    var app = $("#app");
    if (!app) return;
    doc.body.className = app.dataset.body || "";
    setActiveNav(app.dataset.page);
    initHeader();
    initReveal();
    initServices();
    initDiagram();
    initMarquee();
    initProjects();
    initTabs();
    initEnquiry();
    initForm();
    initCopy();
    initMap();
    $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  function setActiveNav(page) {
    $$("[data-nav]").forEach(function (a) {
      if (a.dataset.nav === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* header: scroll states, dropdown, mobile menu */
  function initHeader() {
    var hdr = $("[data-hdr]");
    if (!hdr) return;
    var photo = doc.body.classList.contains("has-photo-hero");
    function onScroll() {
      var y = window.scrollY || 0;
      hdr.classList.toggle("is-solid", !photo || y > 40);
      hdr.classList.toggle("is-compact", y > 160);
    }
    onScroll();
    listen(window, "scroll", onScroll, { passive: true });

    var dd = $(".nav__dd", hdr), btn = dd && $(".nav__dd-btn", dd), t;
    if (dd) {
      var setOpen = function (v) { dd.classList.toggle("is-open", v); btn.setAttribute("aria-expanded", v ? "true" : "false"); };
      var hoverable = window.matchMedia && matchMedia("(hover: hover)").matches;
      if (hoverable) {
        listen(dd, "mouseenter", function () { clearTimeout(t); setOpen(true); });
        listen(dd, "mouseleave", function () { t = setTimeout(function () { setOpen(false); }, 160); });
      }
      listen(btn, "click", function () { setOpen(!dd.classList.contains("is-open")); });
      listen(dd, "focusout", function (e) { if (!dd.contains(e.relatedTarget)) setOpen(false); });
      listen(doc, "keydown", function (e) { if (e.key === "Escape" && dd.classList.contains("is-open")) { setOpen(false); btn.focus(); } });
      onCleanup(function () { clearTimeout(t); });
    }

    var burger = $(".burger", hdr), menu = $("#mnav");
    if (burger && menu) {
      var openMenu = function (v) {
        burger.setAttribute("aria-expanded", v ? "true" : "false");
        $(".burger__label", burger).textContent = v ? "Close" : "Menu";
        root.classList.toggle("has-mnav", v);
        if (v) { menu.hidden = false; raf2().then(function () { menu.classList.add("is-open"); }); var f = $("a", menu); f && f.focus({ preventScroll: true }); }
        else { menu.classList.remove("is-open"); setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 560); }
      };
      listen(burger, "click", function () { openMenu(burger.getAttribute("aria-expanded") !== "true"); });
      listen(menu, "click", function (e) { if (e.target.closest("a")) openMenu(false); });
      listen(doc, "keydown", function (e) { if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") { openMenu(false); burger.focus(); } });
      var mq = matchMedia("(min-width: 1181px)");
      var mqf = function () { if (mq.matches) openMenu(false); };
      mq.addEventListener ? mq.addEventListener("change", mqf) : mq.addListener(mqf);
      onCleanup(function () { root.classList.remove("has-mnav"); mq.removeEventListener ? mq.removeEventListener("change", mqf) : mq.removeListener(mqf); });
    }
  }

  /* scroll reveals: only elements below the first screen are armed, so the page is
     always complete at rest */
  function initReveal() {
    var els = $$("[data-rv]");
    els.forEach(function (el) {
      $$(".ln", el).forEach(function (l, i) { l.style.setProperty("--i", i); });
      if (el.dataset.rv === "draw") $$("path,line,polyline", el).forEach(function (p) { p.setAttribute("pathLength", "1"); });
    });
    if (RM.matches || !("IntersectionObserver" in window)) return;
    var vh = window.innerHeight;
    // A clip-path on the element hides it from IntersectionObserver, so masked
    // elements are watched through their parent.
    var map = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        (map.get(en.target) || []).forEach(function (el) { el.classList.add("is-in"); });
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > vh * 0.9) {
        el.classList.add("is-armed");
        var t = el.dataset.rv === "mask" ? el.parentElement : el;
        if (!map.has(t)) { map.set(t, []); io.observe(t); }
        map.get(t).push(el);
      }
    });
    onCleanup(function () { io.disconnect(); });
  }

  /* home: expanding service panels */
  function initServices() {
    var wrap = $("[data-svc]");
    if (!wrap) return;
    var ps = $$(".svc__p", wrap);
    function act(p) { ps.forEach(function (x) { x.classList.toggle("is-active", x === p); }); }
    ps.forEach(function (p) {
      listen(p, "mouseenter", function () { act(p); });
      listen(p, "focus", function () { act(p); });
    });
  }

  /* home: interactive single-line diagram */
  function initDiagram() {
    var box = $("[data-sld]");
    if (!box) return;
    var hots = $$(".sld__hot", box), tabs = $$(".sld__tab", box), detail = $(".sld__detail", box);
    function show(k, focusTab) {
      var tpl = $('template[data-k="' + k + '"]', box);
      if (!tpl) return;
      detail.innerHTML = "";
      detail.appendChild(tpl.content.cloneNode(true));
      detail.classList.remove("is-swap"); void detail.offsetWidth; detail.classList.add("is-swap");
      hots.forEach(function (h) { var on = h.dataset.k === k; h.classList.toggle("is-on", on); h.setAttribute("aria-pressed", on ? "true" : "false"); });
      tabs.forEach(function (t) { var on = t.dataset.k === k; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; if (on && focusTab) t.focus(); });
    }
    hots.forEach(function (h) {
      listen(h, "click", function () { show(h.dataset.k); });
      listen(h, "keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(h.dataset.k); } });
    });
    tabs.forEach(function (t, i) {
      listen(t, "click", function () { show(t.dataset.k); });
      listen(t, "keydown", function (e) {
        var n = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (n) { e.preventDefault(); show(tabs[(i + n + tabs.length) % tabs.length].dataset.k, true); }
      });
    });
    show(tabs[0].dataset.k);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { box.classList.toggle("is-visible", en[0].isIntersecting); });
      io.observe(box);
      onCleanup(function () { io.disconnect(); });
    }
  }

  function initMarquee() {
    $$("[data-marquee]").forEach(function (m) {
      var b = $(".marquee__pause", m.parentNode);
      if (!b) return;
      listen(b, "click", function () {
        var p = m.classList.toggle("is-paused");
        b.setAttribute("aria-pressed", p ? "true" : "false");
        b.textContent = p ? "Play logo scroll" : "Pause logo scroll";
      });
    });
  }

  /* projects: filters + detail dialog */
  function initProjects() {
    var fl = $("[data-filters]");
    if (fl) {
      var items = $$("[data-cat]"), count = $("[data-count]");
      var btns = $$("button", fl);
      var apply = function (cat) {
        var n = 0;
        items.forEach(function (it) { var on = cat === "all" || it.dataset.cat.split(" ").indexOf(cat) > -1; it.hidden = !on; if (on) n++; });
        btns.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.f === cat ? "true" : "false"); });
        if (count) count.textContent = n + (n === 1 ? " project shown" : " projects shown");
      };
      btns.forEach(function (b) { listen(b, "click", function () { apply(b.dataset.f); }); });
      apply("all");
    }
    var dlg = $("#pjd");
    if (!dlg) return;
    var slot = $(".pjd__slot", dlg), last;
    $$("[data-open]").forEach(function (b) {
      listen(b, "click", function (e) {
        e.preventDefault();
        var tpl = $("#" + b.dataset.open);
        if (!tpl) return;
        last = b;
        slot.innerHTML = ""; slot.appendChild(tpl.content.cloneNode(true));
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
        var c = $(".pjd__close", dlg); c && c.focus();
      });
    });
    var close = function () { if (dlg.open) dlg.close ? dlg.close() : dlg.removeAttribute("open"); };
    listen(dlg, "click", function (e) { if (e.target === dlg || e.target.closest(".pjd__close") || e.target.closest("[data-dlg-nav]")) close(); });
    listen(dlg, "close", function () { last && last.focus && last.focus({ preventScroll: true }); });
    onCleanup(close);
  }

  /* generic tabs (equipment catalogue) */
  function initTabs() {
    $$("[data-tabs]").forEach(function (tl) {
      var tabs = $$('[role="tab"]', tl);
      var sel = function (t, f) {
        tabs.forEach(function (x) {
          var on = x === t; x.setAttribute("aria-selected", on ? "true" : "false"); x.tabIndex = on ? 0 : -1;
          var p = doc.getElementById(x.getAttribute("aria-controls")); if (p) p.hidden = !on;
        });
        if (f) t.focus();
      };
      tabs.forEach(function (t, i) {
        listen(t, "click", function () { sel(t); });
        listen(t, "keydown", function (e) {
          var n = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
          if (n) { e.preventDefault(); sel(tabs[(i + n + tabs.length) % tabs.length], true); }
        });
      });
    });
  }

  /* contact.html?enquiry=Transformers pre-fills the message */
  function initEnquiry() {
    var msg = doc.getElementById("00NOG000003D3Xp");
    if (!msg) return;
    var q = new URLSearchParams(location.search).get("enquiry");
    if (q && !msg.value) {
      q = q.replace(/[^\w &/,.-]/g, "").slice(0, 80);
      msg.value = "Equipment enquiry: " + q + "\n\nSite / project:\nRequired by:\nRent or purchase:\n";
    }
  }

  /* contact form: validation, spam protection, honest states */
  function initForm() {
    var form = $("[data-form]");
    if (!form) return;
    var btn = $('[type="submit"]', form), ok = $("#form-ok"), err = $("#form-err"), info = $("#form-info");
    var sending = false;
    var rules = {
      first_name: function (v) { return v ? "" : "Enter your first name."; },
      last_name: function (v) { return v ? "" : "Enter your last name."; },
      email: function (v) { return !v ? "Enter your email address." : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter an email address like name@company.com."); },
      phone: function (v) { var d = v.replace(/\D/g, ""); return !v ? "Enter a phone number so the team can call you back." : (d.length >= 10 && d.length <= 15 ? "" : "Enter a 10-digit phone number, for example 905 238 8700."); },
      company: function (v) { return v ? "" : "Enter your company or business name."; },
      "00NOG000003D3Xp": function (v) { return v.length > 4000 ? "Keep the message under 4,000 characters." : ""; }
    };
    function check(input) {
      var fn = rules[input.name]; if (!fn) return true;
      var m = fn(input.value.trim()), f = input.closest(".field"), e = $(".field__err", f);
      f.classList.toggle("is-invalid", !!m);
      input.setAttribute("aria-invalid", m ? "true" : "false");
      e.textContent = m;
      return !m;
    }
    $$("input, textarea", form).forEach(function (i) {
      if (!rules[i.name]) return;
      listen(i, "blur", function () { if (i.value) check(i); });
      listen(i, "input", function () { if (i.closest(".field").classList.contains("is-invalid")) check(i); });
    });
    function state(which) { [ok, err, info].forEach(function (n) { if (n) n.hidden = n !== which; }); }
    function busy(v) { sending = v; btn.classList.toggle("is-loading", v); btn.setAttribute("aria-disabled", v ? "true" : "false"); $("span", btn).textContent = v ? "Sending" : "Send message"; }
    listen(form, "submit", function (e) {
      e.preventDefault();
      if (sending) return;
      state(null);
      var bad = $$("input, textarea", form).filter(function (i) { return rules[i.name] && !check(i); });
      if (bad.length) { bad[0].focus(); return; }
      if ($(".hp input", form).value) { state(info); info.querySelector("span").textContent = "Your message could not be sent. Please call (905) 238-8700."; return; }
      if (PREVIEW || !form.action || form.dataset.mode === "preview") {
        state(info);
        info.querySelector("span").textContent = "This is the design preview, so nothing was sent. On iscoca.ca this form delivers to the ISCOCA team. For anything urgent call (905) 238-8700.";
        return;
      }
      var token = $('[name="cf-turnstile-response"]', form);
      if (!token || !token.value) {
        state(err);
        err.querySelector("span").textContent = window.turnstile ? "Complete the verification check above the button, then send again." : "The verification check did not load. Refresh the page, or call (905) 238-8700.";
        return;
      }
      busy(true);
      var ctl = window.AbortController ? new AbortController() : null;
      var to = setTimeout(function () { ctl && ctl.abort(); }, 15000);
      fetch(form.action, { method: "POST", body: new FormData(form), signal: ctl && ctl.signal })
        .then(function (res) {
          clearTimeout(to);
          if (!res.ok) throw new Error("status " + res.status);
          form.reset();
          $$(".field", form).forEach(function (f) { f.classList.remove("is-invalid"); });
          state(ok); ok.focus();
          if (window.turnstile) try { turnstile.reset(); } catch (x) {}
        })
        .catch(function () {
          state(err);
          err.querySelector("span").textContent = "Your message was not sent. Check your connection and try again, or call (905) 238-8700.";
          err.focus();
          if (window.turnstile) try { turnstile.reset(); } catch (x) {}
        })
        .then(function () { busy(false); });
    });
    // Load Cloudflare Turnstile only where the form can actually submit.
    if (!PREVIEW && $(".cf-turnstile", form) && !window.turnstile) {
      var s = doc.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"; s.async = true; s.defer = true;
      doc.head.appendChild(s);
    } else if (window.turnstile) { try { turnstile.render($(".cf-turnstile", form)); } catch (x) {} }
  }

  function initCopy() {
    $$("[data-copy]").forEach(function (b) {
      listen(b, "click", function () {
        var t = b.dataset.copy, lab = $("span", b), prev = lab.textContent;
        var done = function (m) { lab.textContent = m; setTimeout(function () { lab.textContent = prev; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done("Copied"); }, function () { done("Select to copy"); });
        else done("Select to copy");
      });
    });
  }

  function initMap() {
    var b = $("[data-map-load]");
    if (!b) return;
    listen(b, "click", function () {
      var f = doc.createElement("iframe");
      f.src = b.dataset.mapLoad; f.title = "Map of the ISCOCA office, 5004 Timberlea Blvd, Mississauga"; f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade";
      b.closest(".map").appendChild(f);
    });
  }

  /* ------------------------------------------------------------------ route veil */
  var veil = $("#veil");
  var V = veil && {
    lead: $(".veil__lead", veil), panel: $(".veil__panel", veil),
    trace: $(".mk__trace", veil), ring: $(".mk__ring", veil), bolt: $(".mk__bolt", veil), mark: $(".veil__mark", veil)
  };
  var C0 = "polygon(0% 100%, 100% 115%, 100% 115%, 0% 115%)";
  var C1 = "polygon(0% -15%, 100% 0%, 100% 115%, 0% 115%)";
  var C2 = "polygon(0% -15%, 100% 0%, 100% 0%, 0% -15%)";
  var veilAnims = [];
  function track(p) { return p.then(function (a) { if (a) veilAnims.push(a); return a; }); }
  function cover() {
    veil.classList.add("is-on");
    root.classList.add("is-routing");
    var a = [
      track(play(V.lead, [{ clipPath: C0 }, { clipPath: C1 }], { duration: 340, easing: EASE_IO })),
      track(play(V.panel, [{ clipPath: C0 }, { clipPath: C1 }], { duration: 340, delay: 60, easing: EASE_IO }))
    ];
    var m = [
      track(play(V.mark, [{ opacity: 1, transform: "none" }, { opacity: 1, transform: "none" }], { duration: 1 })),
      track(play(V.trace, [{ strokeDashoffset: 100, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 260, delay: 180, easing: "ease-out" })),
      track(play(V.ring, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 320, delay: 220, easing: EASE })),
      track(play(V.bolt, [{ opacity: 0, transform: "scale(.86)" }, { opacity: 1, transform: "scale(1)" }], { duration: 170, delay: 430, easing: EASE })),
      track(play(V.trace, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: 470 }))
    ];
    return { covered: Promise.all(a), drawn: Promise.all(a.concat(m)) };
  }
  function uncover() {
    var p = Promise.all([
      track(play(V.mark, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-18px) scale(.94)" }], { duration: 220, easing: EASE })),
      track(play(V.panel, [{ clipPath: C1 }, { clipPath: C2 }], { duration: 380, delay: 40, easing: EASE_IO })),
      track(play(V.lead, [{ clipPath: C1 }, { clipPath: C2 }], { duration: 380, delay: 100, easing: EASE_IO }))
    ]);
    return p.then(resetVeil);
  }
  function resetVeil() {
    veilAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    veilAnims = [];
    if (veil) veil.classList.remove("is-on");
    root.classList.remove("is-routing");
  }

  /* ------------------------------------------------------------------ router */
  var busyNav = false, queued = null, failsafe;
  function isPageURL(u) { return u.origin === location.origin && /(\.html|\/)$/.test(u.pathname); }

  function fetchDoc(href) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { ctl && ctl.abort(); }, 8000);
    return fetch(href, { credentials: "same-origin", signal: ctl && ctl.signal, headers: { "X-Requested-With": "iscoca-router" } })
      .then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (html) {
        var d = new DOMParser().parseFromString(html, "text/html");
        if (!d.getElementById("app")) throw new Error("not a site page");
        return d;
      });
  }

  function swap(d, href, push, y) {
    teardown();
    root.classList.remove("is-ready");
    var cur = $("#app"), next = doc.importNode(d.getElementById("app"), true);
    cur.parentNode.replaceChild(next, cur);
    doc.title = d.title;
    [["meta[name=description]", "content"], ["link[rel=canonical]", "href"], ['meta[property="og:title"]', "content"], ['meta[property="og:description"]', "content"], ['meta[property="og:url"]', "content"]].forEach(function (p) {
      var a = $(p[0], d), b = $(p[0]);
      if (a && b) b.setAttribute(p[1], a.getAttribute(p[1]));
    });
    if (push) history.pushState({ y: 0 }, "", href);
    initPage();
    var hash = new URL(href, location.href).hash;
    var target = hash && doc.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView(); else window.scrollTo(0, y || 0);
    var main = $("#main");
    if (main) main.focus({ preventScroll: true });
    var an = $("#route-announcer");
    if (an) an.textContent = d.title;
  }

  function go(href, push, y) {
    if (busyNav) { queued = [href, push, y]; return; }
    busyNav = true;
    try { history.replaceState(Object.assign({}, history.state, { y: window.scrollY }), ""); } catch (e) {}
    clearTimeout(failsafe);
    failsafe = setTimeout(function () { resetVeil(); busyNav = false; }, 12000);
    var docP = fetchDoc(href);
    var fallback = function () { clearTimeout(failsafe); location.href = href; };

    if (RM.matches || !veil || !doc.body.animate) {
      docP.then(function (d) { swap(d, href, push, y); ready(); done(); }, fallback);
      return;
    }
    var c = cover();
    Promise.all([docP, c.drawn]).then(function (r) {
      swap(r[0], href, push, y);
      return raf2().then(function () { return uncover(); }).then(function () { ready(); done(); });
    }, function () { fallback(); });
  }
  function done() {
    clearTimeout(failsafe);
    busyNav = false;
    if (queued) { var q = queued; queued = null; if (q[0] !== location.href) go(q[0], q[1], q[2]); }
  }

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.dataset.noRoute !== undefined) return;
    var u = new URL(a.getAttribute("href"), location.href);
    if (!isPageURL(u)) return;
    if (u.pathname === location.pathname && u.search === location.search) {
      if (u.hash) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: RM.matches ? "auto" : "smooth" });
      return;
    }
    e.preventDefault();
    go(u.href, true, 0);
  }

  function initRouter() {
    if (!window.fetch || !window.DOMParser || !history.pushState) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    try { history.replaceState(Object.assign({ y: window.scrollY }, history.state), ""); } catch (e) {}
    doc.addEventListener("click", onClick);
    window.addEventListener("popstate", function (e) { go(location.href, false, (e.state && e.state.y) || 0); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) resetVeil(); });
    doc.addEventListener("visibilitychange", function () { if (!doc.hidden && !busyNav) resetVeil(); });
  }

  /* ------------------------------------------------------------------ intro */
  function ready() { raf2().then(function () { root.classList.add("is-ready"); }); }

  function runIntro() {
    var intro = $("#intro");
    if (!root.classList.contains("intro-on") || !intro || !doc.body.animate) {
      root.classList.remove("intro-on");
      ready();
      return;
    }
    var finished = false, timers = [];
    var lock = $(".lockup", intro), o = $(".lockup__o", lock);
    var trace = $(".mk__trace", o), ring = $(".mk__ring", o), bolt = $(".mk__bolt", o);
    var letters = $$(".lockup__l", lock), subs = $$(".lockup__s", lock), tags = $$(".intro__tag span", intro);
    var paths = $$(".intro__circuit path", intro), nodes = $$(".intro__nodes circle", intro), pulse = $(".intro__pulse", intro);

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      store("isc-intro", "1");
      var fly = $(".fly");
      if (fly) fly.remove();
      intro.getAnimations && intro.getAnimations().forEach(function (a) { a.cancel(); });
      root.classList.remove("intro-on");
      root.classList.add("intro-done");
      intro.remove();
      ready();
    }
    $(".intro__skip", intro).addEventListener("click", finish);
    doc.addEventListener("keydown", function k(e) { if (e.key === "Escape") { doc.removeEventListener("keydown", k); finish(); } });
    timers.push(setTimeout(finish, 6000));

    // centre the mark and enlarge it before it draws
    var r = o.getBoundingClientRect();
    var dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
    var S = Math.max(1.4, Math.min(2.6, (Math.min(innerWidth, innerHeight) * 0.36) / r.width));
    var start = "translate(" + dx + "px," + dy + "px) scale(" + S + ")";
    o.animate([{ transform: start }, { transform: start }], { duration: 1, fill: "forwards" });

    paths.forEach(function (p, i) {
      p.setAttribute("pathLength", "1");
      play(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1500, delay: 60 + i * 70, easing: EASE_IO });
    });
    nodes.forEach(function (n, i) { play(n, [{ opacity: 0 }, { opacity: .9 }, { opacity: .35 }], { duration: 900, delay: 700 + i * 60 }); });
    play(trace, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 640, delay: 140, easing: "cubic-bezier(.5,0,.3,1)" });
    play(bolt, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 700 });
    play(trace, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 860 });
    play(ring, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 660, delay: 620, easing: EASE });
    play(pulse, [{ opacity: 0, transform: "scale(.35)" }, { opacity: .9, transform: "scale(.9)", offset: .35 }, { opacity: 0, transform: "scale(1.25)" }], { duration: 900, delay: 1180, easing: "ease-out" });
    play(o, [{ transform: start }, { transform: "translate(0,0) scale(1)" }], { duration: 640, delay: 1400, easing: EASE_IO });
    letters.forEach(function (l, i) {
      var side = i < 3 ? 1 : -1;
      play(l, [{ opacity: 0, transform: "translateX(" + (side * 0.25) + "em)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: 1640 + (i < 3 ? (2 - i) : (i - 3)) * 70, easing: EASE });
    });
    subs.forEach(function (s, i) { play(s, [{ opacity: 0, transform: "translateY(.6em)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 1880 + i * 18, easing: EASE }); });
    tags.forEach(function (t, i) { play(t, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 460, delay: 2000 + i * 110, easing: EASE }); });

    timers.push(setTimeout(function () {
      if (finished) return;
      // fly the lockup into the header, wipe the blue away
      var target = $(".hdr .brand .lockup");
      var lr = lock.getBoundingClientRect();
      var cs = getComputedStyle(lock);
      lock.style.fontSize = cs.fontSize;
      lock.style.color = cs.color;
      lock.classList.add("fly");
      lock.style.transform = "translate(" + lr.left + "px," + lr.top + "px)";
      doc.body.appendChild(lock);
      var tr = target ? target.getBoundingClientRect() : { left: 24, top: 40, width: 160 };
      var s = tr.width / lr.width;
      var toColor = target ? getComputedStyle(target).color : "#fff";
      play(lock, [{ transform: "translate(" + lr.left + "px," + lr.top + "px) scale(1)", color: cs.color }, { transform: "translate(" + tr.left + "px," + tr.top + "px) scale(" + s + ")", color: toColor }], { duration: 760, easing: EASE_IO });
      play(intro, [{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 118%)" }, { clipPath: "polygon(0% 0%, 100% 0%, 100% -18%, 0% 0%)" }], { duration: 760, delay: 80, easing: EASE_IO })
        .then(function () { finish(); });
      timers.push(setTimeout(function () { root.classList.add("intro-done"); ready(); }, 380));
    }, 2620));
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    initPage();
    initRouter();
    runIntro();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
