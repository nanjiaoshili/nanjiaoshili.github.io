/* ==========================================================================
   大秦军团 · 南郊势力 2026 年会（独立页脚本，不依赖官网 main.js）
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 顶栏滚动态 ---------- */
  var header = document.querySelector(".gala-header");
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- 滚动显现 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  window.showToast = function (msg) {
    var el = document.querySelector(".toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 3200);
  };

  /* ---------- 看台火种（粒子，常驻自愈版） ---------- */
  var canvas = document.getElementById("embers");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var parts = [];
    var COUNT = window.innerWidth < 640 ? 34 : 64;
    var COLORS = ["214,120,58", "230,180,90", "214,54,43", "240,205,130"];
    var dbg = { frames: 0, errors: 0 };
    window.__embers = dbg; /* 调试探针：帧数 / 异常数 */

    function resize() {
      var cw = canvas.clientWidth || canvas.parentElement.clientWidth;
      var ch = canvas.clientHeight || canvas.parentElement.clientHeight;
      if (!cw || !ch) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cw; H = ch;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* 尺寸变化后按新视野补齐粒子数 */
      while (parts.length < COUNT) parts.push(spawn(true));
    }
    function spawn(inView) {
      var p = {};
      p.x = Math.random() * (W || 300);
      /* 常驻关键：只在画布下沿浅层生成，慢粒子也能活着飘进视野 */
      p.y = inView ? Math.random() * (H || 300) : (H || 300) + 10 + Math.random() * 70;
      p.vy = -(0.55 + Math.random() * 1.15);
      p.vx = (Math.random() - 0.5) * 0.4;
      p.size = 0.8 + Math.random() * 1.9;
      p.life = 0;
      p.maxLife = 480 + Math.random() * 320;
      p.color = COLORS[(Math.random() * COLORS.length) | 0];
      p.flicker = Math.random() * Math.PI * 2;
      return p;
    }
    function tick() {
      try {
        if (parts.length < COUNT) while (parts.length < COUNT) parts.push(spawn(false));
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.life++;
          p.x += p.vx + Math.sin((p.life + p.flicker * 100) * 0.02) * 0.18;
          p.y += p.vy;
          var fade = 1 - p.life / p.maxLife;
          if (!(fade > 0) || p.y < -12 || !(p.y > -1e6)) { parts[i] = spawn(false); continue; }
          var alpha = Math.max(0, fade) * (0.5 + 0.5 * Math.abs(Math.sin(p.life * 0.06 + p.flicker)));
          if (!(alpha > 0.02)) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + p.color + "," + alpha.toFixed(3) + ")";
          ctx.shadowColor = "rgba(" + p.color + ",0.8)";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        dbg.frames++;
      } catch (e) {
        dbg.errors++;
        /* 单帧异常不终止动画，自愈继续 */
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener("resize", function () { resize(); });
    for (var i0 = 0; i0 < COUNT; i0++) parts.push(spawn(true));
    requestAnimationFrame(tick);
  }

  /* ---------- 英雄区背景轮播 ---------- */
  var heroPhoto = document.querySelector(".hero-photo[data-cycle]");
  if (heroPhoto) {
    var layers = heroPhoto.querySelectorAll(".bg-layer");
    var bgList = null;
    try { bgList = JSON.parse(heroPhoto.dataset.cycle); } catch (e) { bgList = null; }
    if (bgList && bgList.length && layers.length >= 2) {
      bgList.forEach(function (src) { var im = new Image(); im.src = src; });
      var bgIdx = 0;
      var activeLayer = 0;
      layers[0].style.backgroundImage = 'url("' + bgList[0] + '")';
      layers[0].classList.add("active");
      if (!reduceMotion && bgList.length > 1) {
        setInterval(function () {
          bgIdx = (bgIdx + 1) % bgList.length;
          var next = layers[(activeLayer + 1) % layers.length];
          next.style.backgroundImage = 'url("' + bgList[bgIdx] + '")';
          next.classList.add("active");
          layers[activeLayer].classList.remove("active");
          activeLayer = (activeLayer + 1) % layers.length;
        }, 6000);
      }
    }
  }

  /* ---------- 年会倒计时 ---------- */
  var cdBox = document.getElementById("countdown");
  if (cdBox) {
    var target = new Date(2026, 11, 12, 17, 30, 0).getTime();
    var cells = {
      d: document.querySelector("[data-cd='d']"),
      h: document.querySelector("[data-cd='h']"),
      m: document.querySelector("[data-cd='m']"),
      s: document.querySelector("[data-cd='s']")
    };
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function tickCd() {
      var diff = target - Date.now();
      if (diff <= 0) {
        if (!cdBox.classList.contains("cd--done")) {
          cdBox.classList.add("cd--done");
          cdBox.innerHTML = '<p class="cd-live">今晚 17:30 · <em>开席</em></p>';
        }
        clearInterval(timer);
        return;
      }
      if (cells.d) cells.d.textContent = pad(Math.floor(diff / 86400000));
      if (cells.h) cells.h.textContent = pad(Math.floor(diff / 3600000) % 24);
      if (cells.m) cells.m.textContent = pad(Math.floor(diff / 60000) % 60);
      if (cells.s) cells.s.textContent = pad(Math.floor(diff / 1000) % 60);
    }
    tickCd();
    var timer = setInterval(tickCd, 1000);
  }

  /* ---------- 复制地址 ---------- */
  var copyBtn = document.querySelector(".v-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var addr = copyBtn.dataset.addr || "";
      var done = function () { window.showToast("地址已复制"); };
      var fail = function () { window.showToast("复制失败，请手动选择地址复制"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(done, fail);
      } else {
        var ta = document.createElement("textarea");
        ta.value = addr;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { fail(); }
        document.body.removeChild(ta);
      }
    });
  }
})();
