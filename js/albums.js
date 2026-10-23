/* ==========================================================================
   比赛相册数据 + 浏览逻辑
   新增相册：把照片压缩后放进 images/albums/<相册ID>/{full,thumb}，
   然后在 ALBUMS 里追加一条 { id, title, date, venue, count } 即可。
   ========================================================================== */
(function () {
  "use strict";

  window.ALBUMS = [
    {
      id: "20261018",
      title: "陕西联合 VS 广东广州豹",
      date: "2026.10.18",
      venue: "西安国际足球中心",
      score: "4 : 0",
      cover: 1,
      count: 91
    },
    {
      id: "20261011",
      title: "陕西联合 VS 佛山南狮",
      date: "2026.10.11",
      venue: "西安国际足球中心",
      score: "5 : 1",
      cover: 1,
      count: 152
    },
    {
      id: "20260927",
      title: "陕西联合 VS 大连鲲城",
      date: "2026.09.27",
      venue: "西安国际足球中心",
      score: "3 : 0",
      cover: 1,
      count: 162
    },
    {
      id: "20260919",
      title: "陕西联合 VS 苏州东吴",
      date: "2026.09.19",
      venue: "西安国际足球中心",
      score: "2 : 2",
      cover: 1,
      count: 141
    },
    {
      id: "20260905",
      title: "陕西联合 VS 定南赣联",
      date: "2026.09.05",
      venue: "西安国际足球中心",
      score: "2 : 1",
      cover: 1,
      count: 135
    }
  ];

  var albumGrid = document.getElementById("album-grid");
  var modal = document.getElementById("album-modal");
  if (!albumGrid || !modal) return;

  var albums = window.ALBUMS || [];
  var imgEl = modal.querySelector(".am-img");
  var counterEl = modal.querySelector(".am-counter");
  var mainEl = modal.querySelector(".am-main");
  var subEl = modal.querySelector(".am-sub");
  var thumbsEl = modal.querySelector(".am-thumbs");
  var cur = { album: null, index: 0 };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function src(a, i, kind) { return a.dir + "/" + kind + "/" + pad(i) + ".jpg"; }
  function caption(a, i) {
    return a.title + " " + a.date + (a.venue ? " " + a.venue : "") +
      " 现场照片 第 " + i + " 张，共 " + a.count + " 张";
  }

  albums.forEach(function (a) {
    a.dir = "images/albums/" + a.id;
    var card = document.createElement("button");
    card.type = "button";
    card.className = "album-card";
    card.setAttribute("aria-label", "打开相册：" + a.title);
    card.innerHTML =
      '<span class="album-cover"><img src="' + src(a, a.cover || 1, "full") + '" alt="' +
      (a.title + " " + a.date + (a.venue ? " " + a.venue : "") + " 比赛相册封面，南郊势力看台现场照片") + '" loading="lazy"></span>' +
      '<span class="album-info"><span><b>' + a.title + "</b><small>" + a.date +
      (a.venue ? " · " + a.venue : "") + (a.score ? " · " + a.score : "") + "</small></span>" +
      '<span class="album-count">' + a.count + " 张</span></span>";
    card.addEventListener("click", function () { openAlbum(a, 0); });
    albumGrid.appendChild(card);
  });

  function openAlbum(a, index) {
    cur.album = a;
    mainEl.textContent = a.title;
    subEl.textContent = a.date + (a.venue ? " · " + a.venue : "") + (a.score ? " · " + a.score : "");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    show(index);
    setTimeout(function () {
      buildThumbs(a);
      show(cur.index);
    }, 220);
  }

  function closeAlbum() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function show(index) {
    var a = cur.album;
    if (!a) return;
    cur.index = (index + a.count) % a.count;
    imgEl.decoding = "async";
    imgEl.src = src(a, cur.index + 1, "full");
    imgEl.alt = caption(a, cur.index + 1);
    counterEl.textContent = (cur.index + 1) + " / " + a.count;

    var thumbs = thumbsEl.querySelectorAll("img");
    for (var i = 0; i < thumbs.length; i++) {
      thumbs[i].classList.toggle("active", i === cur.index);
    }
    var active = thumbs[cur.index];
    if (active) {
      var left = active.offsetLeft - thumbsEl.clientWidth / 2 + active.clientWidth / 2;
      thumbsEl.scrollLeft = Math.max(0, left);
    }
  }

  function buildThumbs(a) {
    if (thumbsEl.dataset.album === a.id) return;
    thumbsEl.dataset.album = a.id;
    thumbsEl.innerHTML = "";
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= a.count; i++) {
      var t = document.createElement("img");
      t.src = src(a, i, "thumb");
      t.alt = caption(a, i);
      t.loading = "lazy";
      t.decoding = "async";
      (function (idx) {
        t.addEventListener("click", function () { show(idx); });
      })(i - 1);
      frag.appendChild(t);
    }
    thumbsEl.appendChild(frag);
  }

  modal.querySelector(".am-close").addEventListener("click", closeAlbum);
  modal.querySelector(".am-prev").addEventListener("click", function () { show(cur.index - 1); });
  modal.querySelector(".am-next").addEventListener("click", function () { show(cur.index + 1); });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeAlbum();
  });

  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") closeAlbum();
    else if (e.key === "ArrowLeft") show(cur.index - 1);
    else if (e.key === "ArrowRight") show(cur.index + 1);
  });

  var startX = 0;
  imgEl.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
  }, { passive: true });
  imgEl.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(cur.index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- SEO：相册结构化数据（不在页面显示） ---------- */
  function injectGallerySchema() {
    var images = [];
    albums.forEach(function (a) {
      for (var i = 1; i <= a.count; i++) {
        images.push({
          "@type": "ImageObject",
          contentUrl: new URL(src(a, i, "full"), location.href).href,
          thumbnailUrl: new URL(src(a, i, "thumb"), location.href).href,
          name: a.title + " 现场照片 第 " + i + " 张",
          description: caption(a, i) + "，大秦军团南郊势力战斗组看台影像。",
          copyrightNotice: "© 大秦军团南郊势力战斗组",
          creator: { "@type": "Organization", name: "大秦军团南郊势力战斗组" }
        });
      }
    });
    var schema = {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name: "南郊势力比赛相册",
      description: "陕西联合主场比赛的看台与现场照片，按比赛归档。",
      about: "陕西联合足球俱乐部主场比赛、南郊势力看台助威",
      creator: { "@type": "Organization", name: "大秦军团南郊势力战斗组" },
      image: images
    };
    var el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(schema);
    document.head.appendChild(el);
  }
  injectGallerySchema();
})();
