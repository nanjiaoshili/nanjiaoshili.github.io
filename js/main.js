/* ==========================================================================
   西安大秦军团 · 南郊势力战斗组 — 站点脚本
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 顶栏滚动态 ---------- */
  var header = document.querySelector(".site-header");
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- 移动端菜单 ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
      navToggle.setAttribute(
        "aria-expanded",
        document.body.classList.contains("nav-open") ? "true" : "false"
      );
    });
    document.querySelectorAll(".mobile-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- 当前页高亮 ---------- */
  var page = document.body.dataset.page || "";
  document.querySelectorAll(".main-nav a, .mobile-nav a").forEach(function (a) {
    if (a.dataset.nav === page) a.classList.add("active");
  });

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

  /* ---------- 数字滚动 ---------- */
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    if (reduceMotion) { el.textContent = target; return; }
    var dur = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        el.textContent = parseInt(el.dataset.count, 10) || 0;
      });
    } else {
      var cio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              cio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- 看台火种（粒子） ---------- */
  var canvas = document.getElementById("embers");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var parts = [];
    var COUNT = window.innerWidth < 640 ? 34 : 64;
    var COLORS = ["214,120,58", "230,180,90", "214,54,43", "240,205,130"];

    function resize() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(p) {
      p = p || {};
      p.x = Math.random() * W;
      p.y = H + Math.random() * H * 0.3;
      p.vy = -(0.35 + Math.random() * 0.85);
      p.vx = (Math.random() - 0.5) * 0.4;
      p.size = 0.8 + Math.random() * 1.9;
      p.life = 0;
      p.maxLife = 260 + Math.random() * 220;
      p.color = COLORS[(Math.random() * COLORS.length) | 0];
      p.flicker = Math.random() * Math.PI * 2;
      return p;
    }
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.life++;
        p.x += p.vx + Math.sin((p.life + p.flicker * 100) * 0.02) * 0.18;
        p.y += p.vy;
        var fade = 1 - p.life / p.maxLife;
        if (fade <= 0 || p.y < -12) { parts[i] = spawn(); continue; }
        var alpha = Math.max(0, fade) * (0.5 + 0.5 * Math.abs(Math.sin(p.life * 0.06 + p.flicker)));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + "," + alpha.toFixed(3) + ")";
        ctx.shadowColor = "rgba(" + p.color + ",0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener("resize", function () {
      resize();
    });
    for (var i = 0; i < COUNT; i++) {
      var p = spawn();
      p.y = Math.random() * H; // 首屏即有火种
      parts.push(p);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 首页背景轮播（看台图交叉淡入） ---------- */
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
      if (!reduceMotion) {
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

  /* ---------- 报名表单（纯静态：生成并复制报名信息） ---------- */
  var form = document.getElementById("join-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var lines = [
        "【南郊势力·入伙申请】",
        "称呼：" + (f.get("nickname") || "-"),
        "联系方式：" + (f.get("contact") || "-"),
        "常驻区域：" + (f.get("area") || "-"),
        "意向编制：" + (f.get("squad") || "-"),
        "想说的话：" + (f.get("msg") || "-")
      ];
      var text = lines.join("\n");
      var done = function () {
        window.showToast("报名信息已复制，粘贴到战斗组微信群即可");
        form.reset();
      };
      var fail = function () {
        window.showToast("复制失败，请截图本页后联系群管理员");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (err) { fail(); }
        document.body.removeChild(ta);
      }
    });
  }

  /* ---------- 赛程过期隐藏（比赛日次日 0 点起不再显示该场） ---------- */
  document.querySelectorAll(".fixture[data-date]").forEach(function (el) {
    var p = el.dataset.date.split("-").map(Number);
    var matchDay = new Date(p[0], p[1] - 1, p[2]);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (today > matchDay) el.remove();
  });
  var fixtureList = document.querySelector(".fixture-list");
  if (fixtureList && !fixtureList.children.length) {
    var fixturesSection = document.getElementById("fixtures");
    if (fixturesSection) fixturesSection.remove();
  }

  /* ---------- 球员照片墙（team.html 渲染） ---------- */
  var squadData = document.getElementById("squad-data");
  var playerWall = document.getElementById("player-wall");
  if (squadData && playerWall) {
    try {
      var players = JSON.parse(squadData.textContent);
      players.forEach(function (p) {
        var card = document.createElement("figure");
        card.className = "player-card";
        card.dataset.pos = p.pos || "";
        var img = document.createElement("img");
        img.src = p.img;
        img.alt = (p.name || "球员") + " " + p.num + " 号 " + (p.pos || "") + " 西安南郊势力足球俱乐部球员照片";
        img.loading = "lazy";
        img.onerror = function () { img.remove(); };
        img.onload = function () { card.classList.add("has-photo"); };
        card.appendChild(img);
        var ph = document.createElement("div");
        ph.className = "ph";
        ph.innerHTML = "<b>" + String(p.num).padStart(2, "0") + "</b><span>" + (p.pos || "") + "</span>";
        card.appendChild(ph);
        var posCode = { "门将": "GK", "后卫": "DF", "中场": "MF", "前锋": "FW" }[p.pos] || "";
        var tag = document.createElement("div");
        tag.className = "p-tag";
        tag.innerHTML = '<span class="p-num">' + p.num + "</span>" +
          (posCode ? '<span class="p-pos">' + posCode + "</span>" : "");
        card.appendChild(tag);

        var pb = document.createElement("figcaption");
        pb.className = "pb";
        pb.innerHTML =
          "<strong>" + (p.name || "南郊势力") + "</strong>" +
          '<span class="p-line">' + (p.pos || "") + (p.h ? " · " + p.h + "cm" : "") + "</span>" +
          (p.birth ? '<span class="p-birth">' + p.birth + "</span>" : "");
        card.appendChild(pb);

        /* 有存档原片的卡片，悬浮显示「原图」链接（新窗口打开未压缩原片） */
        if (p.img && p.img.indexOf("images/team/") === 0 &&
            p.img.toLowerCase().slice(-4) === ".jpg" && p.img.indexOf("陈涛_1") === -1) {
          var po = document.createElement("a");
          po.className = "p-orig";
          po.href = "images/originals/team/" + encodeURIComponent(p.img.split("/").pop());
          po.target = "_blank";
          po.rel = "noopener";
          po.textContent = "原图";
          po.setAttribute("aria-label", "在新窗口查看" + (p.name || "") + "的原图");
          card.appendChild(po);
        }
        playerWall.appendChild(card);
      });
    } catch (e) { /* 数据格式错误时静默保留空墙 */ }

    /* 位置筛选 */
    var posFilter = document.querySelector(".pos-filter");
    if (posFilter && playerWall) {
      posFilter.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        posFilter.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var v = btn.dataset.filter;
        playerWall.querySelectorAll(".player-card").forEach(function (c) {
          c.style.display = (v === "ALL" || c.dataset.pos === v) ? "" : "none";
        });
      });
    }
  }

  /* ---------- 管理团队（team.html 渲染） ---------- */
  var staffData = document.getElementById("staff-data");
  var staffWall = document.getElementById("staff-wall");
  if (staffData && staffWall) {
    try {
      JSON.parse(staffData.textContent).forEach(function (s) {
        var card = document.createElement("figure");
        card.className = "staff-card";

        var photo = document.createElement("div");
        photo.className = "staff-photo";
        var img = document.createElement("img");
        img.src = s.img;
        img.alt = (s.name || s.role) + " " + s.role + " 西安南郊势力足球俱乐部管理团队照片";
        img.loading = "lazy";
        img.onerror = function () { img.remove(); };
        img.onload = function () { card.classList.add("has-photo"); };
        photo.appendChild(img);
        var ph = document.createElement("div");
        ph.className = "ph";
        ph.innerHTML = '<span class="glyph">' + (s.glyph || s.role.charAt(0)) + "</span>";
        photo.appendChild(ph);
        var tag = document.createElement("span");
        tag.className = "role-tag";
        tag.textContent = s.role;
        photo.appendChild(tag);
        card.appendChild(photo);

        var body = document.createElement("figcaption");
        body.className = "staff-body";
        var duties = (s.duties || []).map(function (d) { return "<li>" + d + "</li>"; }).join("");
        body.innerHTML =
          "<strong>" + (s.name || "") + (s.note ? '<em class="role-note">' + s.note + "</em>" : "") + "</strong>" +
          "<small>" + (s.en || "") + "</small>" +
          (duties ? '<ul class="staff-duties">' + duties + "</ul>" : "");
        card.appendChild(body);
        staffWall.appendChild(card);
      });
    } catch (e) { /* 数据格式错误时静默 */ }
  }

  /* ---------- 战报滚动：复制一份实现无缝循环 ---------- */
  var resultsTrack = document.getElementById("results-track");
  if (resultsTrack) {
    Array.prototype.slice.call(resultsTrack.children).forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      resultsTrack.appendChild(clone);
    });
  }

  /* ---------- 现任班子（about.html 渲染） ---------- */
  var leaderData = document.getElementById("leader-data");
  var leaderWall = document.getElementById("leader-wall");
  if (leaderData && leaderWall) {
    try {
      JSON.parse(leaderData.textContent).forEach(function (l) {
        var card = document.createElement("figure");
        card.className = "leader-card" + (l.lead ? " is-lead" : "");

        var img = document.createElement("img");
        img.src = l.img;
        img.alt = l.role + " " + l.name + " 照片";
        img.loading = "lazy";
        img.onerror = function () { img.remove(); };
        img.onload = function () { card.classList.add("has-photo"); };
        card.appendChild(img);

        var ph = document.createElement("div");
        ph.className = "ph";
        ph.innerHTML = "<b>" + (l.glyph || "秦") + "</b><span>Photo · 待补</span>";
        card.appendChild(ph);

        var tag = document.createElement("span");
        tag.className = "leader-tag";
        tag.textContent = l.short || l.role;
        card.appendChild(tag);

        var body = document.createElement("figcaption");
        body.className = "leader-body";
        body.innerHTML =
          '<span class="l-role">' + (l.role || "") + "</span>" +
          '<strong class="l-name">' + (l.name || "") + "</strong>";
        card.appendChild(body);

        leaderWall.appendChild(card);
      });
    } catch (e) { /* 数据格式错误时静默 */ }
  }

  /* ---------- 页脚年份 ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 页脚社交二维码（触屏点击展开） ---------- */
  var socialItems = document.querySelectorAll(".social-item");
  if (socialItems.length) {
    var closeSocials = function () {
      socialItems.forEach(function (item) {
        item.classList.remove("open");
        var b = item.querySelector(".social-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    };
    socialItems.forEach(function (item) {
      var btn = item.querySelector(".social-btn");
      if (!btn) return;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var wasOpen = item.classList.contains("open");
        closeSocials();
        if (!wasOpen) {
          item.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
      var qr = item.querySelector(".social-qr");
      if (qr) qr.addEventListener("click", function (e) { e.stopPropagation(); });
    });
    document.addEventListener("click", closeSocials);
  }
})();
