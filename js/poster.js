/* ==========================================================================
   2026 年会 · 群发介绍海报（poster.html）
   1080×1920 竖版长图：介绍年会时间/地点/会费/报名 + 场地实拍 + 手绘小地图
   风格与邀请函同源（玄黑 / 朱红 / 鎏金 / 骨白，看台照片压黑底），无二维码
   ========================================================================== */
(function () {
  "use strict";

  var CW = 1080, CH = 1920;

  var COLORS = {
    ink: "#0a0a0c", red: "#d6362b", gold: "#c9a254",
    paper: "#f2ecdf", ash: "#9b958a"
  };

  function loadImg(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = reject;
      im.src = src;
    });
  }
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 96px "Noto Serif SC"'),
      document.fonts.load('600 40px "Noto Serif SC"'),
      document.fonts.load('500 34px "Noto Sans SC"')
    ]).catch(function () {});
  }
  function setLS(ctx, px) {
    if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px";
  }
  function line(ctx, x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function diamond(ctx, x, y, r, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  /* 按目标框 cover 裁切绘制 */
  function drawCover(ctx, im, x, y, w, h) {
    var s = Math.max(w / im.width, h / im.height);
    var dw = im.width * s, dh = im.height * s;
    ctx.drawImage(im, x - (dw - w) / 2, y - (dh - h) / 2, dw, dh);
  }

  function drawPoster(canvas, A) {
    canvas.width = CW; canvas.height = CH;
    var ctx = canvas.getContext("2d");
    var cx = CW / 2;

    /* 底色：看台照片 + 压黑 */
    if (A.stand) {
      var im = A.stand;
      var sc = Math.max(CW / im.width, CH / im.height);
      var dw = im.width * sc, dh = im.height * sc;
      ctx.drawImage(im, (CW - dw) / 2, (CH - dh) / 2, dw, dh);
      var veil = ctx.createLinearGradient(0, 0, 0, CH);
      veil.addColorStop(0, "rgba(10,10,12,0.95)");
      veil.addColorStop(0.4, "rgba(10,10,12,0.85)");
      veil.addColorStop(1, "rgba(10,10,12,0.97)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, CW, CH);
    } else {
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(0, 0, CW, CH);
    }
    var glow = ctx.createRadialGradient(cx, 220, 40, cx, 220, 780);
    glow.addColorStop(0, "rgba(214,54,43,0.18)");
    glow.addColorStop(0.55, "rgba(214,54,43,0.05)");
    glow.addColorStop(1, "rgba(214,54,43,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CW, CH);

    /* 胶片颗粒 */
    var seed = 20261212;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    ctx.fillStyle = "rgba(242,236,223,0.05)";
    for (var g = 0; g < 1100; g++) {
      ctx.fillRect(rnd() * CW, rnd() * CH, 1.5, 1.5);
    }

    /* 双层鎏金边框 + 四角菱形 */
    ctx.strokeStyle = "rgba(201,162,84,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, CW - 68, CH - 68);
    ctx.strokeStyle = "rgba(201,162,84,0.38)";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, CW - 96, CH - 96);
    [[48, 48], [CW - 48, 48], [48, CH - 48], [CW - 48, CH - 48]].forEach(function (pt) {
      ctx.save(); ctx.translate(pt[0], pt[1]); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.gold; ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    });

    ctx.textAlign = "center";

    /* 顶部双徽 + 组织名 */
    var logoH = 88, y0 = 100;
    var dwl = logoH * (A.daqin.width / A.daqin.height);
    var nwl = logoH * (A.nanjiao.width / A.nanjiao.height);
    var sepGap = 32, totalW = dwl + sepGap + nwl;
    var lx = cx - totalW / 2;
    ctx.drawImage(A.daqin, lx, y0, dwl, logoH);
    ctx.strokeStyle = "rgba(38,38,45,1)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 1, y0 + 6); ctx.lineTo(cx - 1, y0 + logoH - 6); ctx.stroke();
    ctx.drawImage(A.nanjiao, lx + dwl + sepGap + 2, y0, nwl, logoH);
    ctx.fillStyle = COLORS.gold;
    ctx.font = '600 29px "Noto Serif SC", "Songti SC", "SimSun", serif';
    setLS(ctx, 10);
    ctx.fillText("大秦军团 · 南郊势力战斗组", cx, y0 + logoH + 54);
    setLS(ctx, 6);
    ctx.font = '500 18px Oswald, "Arial Narrow", sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("EST. 2018 · SOUTH SIDE FORCE · 8TH ANNIVERSARY", cx, y0 + logoH + 90);
    setLS(ctx, 0);

    /* 标题区 */
    ctx.font = '600 29px "Noto Serif SC", serif';
    setLS(ctx, 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillText("二〇二六年 · 八 周年", cx, 348);
    ctx.font = '700 92px "Noto Serif SC", serif';
    setLS(ctx, 12);
    ctx.fillStyle = COLORS.paper;
    ctx.fillText("南郊势力 2026 年会", cx, 452);
    setLS(ctx, 8);
    ctx.font = '500 20px Oswald, sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("2026 ANNUAL GALA", cx, 500);
    setLS(ctx, 0);

    line(ctx, cx - 250, 538, cx - 26, 538, COLORS.gold, 1);
    diamond(ctx, cx, 538, 6, COLORS.gold);
    line(ctx, cx + 26, 538, cx + 250, 538, COLORS.gold, 1);

    /* 年会主题两句 */
    ctx.font = '600 40px "Noto Serif SC", serif';
    setLS(ctx, 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillText("执守八载热血，聚力南郊锋芒", cx, 612);
    ctx.font = '500 30px "Noto Serif SC", serif';
    setLS(ctx, 5);
    ctx.fillStyle = "rgba(242,236,223,0.88)";
    ctx.fillText("八载同心守看台，一腔热血赴大秦", cx, 672);
    setLS(ctx, 0);

    /* 信息两行（会费与报名方式见年会页面/群内） */
    var rows = [
      ["时 间", "2026.12.12（周六）17:30"],
      ["地 点", "雅悦东方宴会酒店 · 三楼 9 号厅"]
    ];
    var ry = 760;
    rows.forEach(function (row) {
      ctx.font = '600 26px "Noto Serif SC", serif';
      var labelW = ctx.measureText(row[0]).width + 32;
      ctx.font = '500 31px "Noto Sans SC", sans-serif';
      var valW = ctx.measureText(row[1]).width;
      var total = labelW + 16 + valW;
      var sx = cx - total / 2;
      ctx.strokeStyle = "rgba(201,162,84,0.75)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, ry - 29, labelW, 42);
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = "center";
      ctx.font = '600 26px "Noto Serif SC", serif';
      ctx.fillText(row[0], sx + labelW / 2, ry);
      ctx.fillStyle = COLORS.paper;
      ctx.font = '500 31px "Noto Sans SC", sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(row[1], sx + labelW + 16, ry);
      ry += 68;
    });
    ctx.textAlign = "center";

    /* 场地实拍三图 */
    var phW = 320, phH = 240, gap = 16;
    var phY = 950;
    var stripW = phW * 3 + gap * 2;
    var px0 = cx - stripW / 2;
    var photos = [A.v1, A.v2, A.v3];
    for (var pi = 0; pi < photos.length; pi++) {
      var px = px0 + pi * (phW + gap);
      ctx.fillStyle = "#0d0d11";
      ctx.fillRect(px - 2, phY - 2, phW + 4, phH + 4);
      ctx.strokeStyle = "rgba(201,162,84,0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 2, phY - 2, phW + 4, phH + 4);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, phY, phW, phH);
      ctx.clip();
      drawCover(ctx, photos[pi], px, phY, phW, phH);
      ctx.restore();
    }
    ctx.font = '500 22px "Noto Sans SC", sans-serif';
    setLS(ctx, 4);
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("场地实拍 · 雅悦东方宴会酒店", cx, phY + phH + 44);
    setLS(ctx, 0);

    /* 手绘小地图 */
    var mW = 760, mH = 300, mX = cx - mW / 2, mY = 1284;
    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(mX, mY, mW, mH);
    ctx.strokeStyle = "rgba(201,162,84,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mX, mY, mW, mH);

    var mg = { x: mX + 30, y: mY + 20, w: mW - 60, h: mH - 40 }; /* 绘图区 */
    (function drawMap() {
      var x0 = mg.x, y0 = mg.y, w = mg.w, h = mg.h;
      /* 楼群 */
      ctx.fillStyle = "#15151c";
      ctx.strokeStyle = "#2b2b35";
      ctx.lineWidth = 1;
      var bs = [
        [0.00, 0.02, 0.22, 0.28], [0.30, 0.00, 0.18, 0.30], [0.72, 0.02, 0.26, 0.26],
        [0.00, 0.52, 0.20, 0.30], [0.30, 0.60, 0.22, 0.26], [0.76, 0.50, 0.24, 0.32]
      ];
      bs.forEach(function (b) {
        ctx.fillRect(x0 + b[0] * w, y0 + b[1] * h, b[2] * w, b[3] * h);
        ctx.strokeRect(x0 + b[0] * w, y0 + b[1] * h, b[2] * w, b[3] * h);
      });
      /* 道路：电子六路（上横） 电子西街（右纵） 丈八东路（下横） */
      function road(x, y, rw, rh, horiz) {
        ctx.fillStyle = "#1c1c24";
        ctx.fillRect(x, y, rw, rh);
        ctx.strokeStyle = "#45454f";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([12, 9]);
        ctx.beginPath();
        if (horiz) { ctx.moveTo(x, y + rh / 2); ctx.lineTo(x + rw, y + rh / 2); }
        else { ctx.moveTo(x + rw / 2, y); ctx.lineTo(x + rw / 2, y + rh); }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      var rH1 = y0 + 0.30 * h;          /* 电子六路 y */
      var rV = x0 + 0.66 * w;           /* 电子西街 x */
      var rH2 = y0 + 0.88 * h;          /* 丈八东路 y */
      var roadT = 20;
      road(x0, rH1 - roadT / 2, w, roadT, true);
      road(rV - roadT / 2, y0, roadT, h, false);
      road(x0, rH2 - roadT / 2, w, roadT, true);
      /* 路名 */
      ctx.fillStyle = "#a8a29a";
      ctx.font = '500 17px "Noto Sans SC", sans-serif';
      ctx.textAlign = "left";
      setLS(ctx, 2);
      ctx.fillText("电子六路", x0 + 0.24 * w, rH1 - 12);
      ctx.fillText("丈八东路", x0 + 0.24 * w, rH2 - 12);
      ctx.save();
      ctx.translate(rV + 26, y0 + 0.62 * h);
      ctx.rotate(Math.PI / 2);
      ctx.fillText("电子西街", 0, 0);
      ctx.restore();
      setLS(ctx, 0);
      ctx.textAlign = "center";
      /* 路口 + 距离标注 */
      var ix = rV, iy = rH1;
      ctx.strokeStyle = "#c9a254";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(ix, iy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(ix - 8, iy + 8); ctx.lineTo(x0 + 0.46 * w, y0 + 0.50 * h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#c9a254";
      ctx.font = '500 15px "Noto Sans SC", sans-serif';
      ctx.fillText("西南约100米", ix - 70, iy + 40);
      /* 酒店点位 */
      var hx = x0 + 0.46 * w, hy = y0 + 0.50 * h;
      ctx.strokeStyle = "rgba(214,54,43,0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 22, 0, Math.PI * 2); ctx.stroke();
      diamond(ctx, hx, hy, 10, COLORS.red);
      ctx.strokeStyle = "#f2ecdf";
      ctx.lineWidth = 1;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
      /* 点位标签 */
      var lbW = 250, lbH = 46;
      var lbX = hx - lbW / 2, lbY = hy + 34;
      ctx.fillStyle = "rgba(14,14,18,0.95)";
      ctx.fillRect(lbX, lbY, lbW, lbH);
      ctx.strokeStyle = "rgba(201,162,84,0.55)";
      ctx.strokeRect(lbX, lbY, lbW, lbH);
      ctx.fillStyle = "#f2ecdf";
      ctx.font = '600 19px "Noto Serif SC", serif';
      ctx.fillText("雅悦东方宴会酒店", hx, lbY + 20);
      ctx.fillStyle = "#c9a254";
      ctx.font = '500 13px "Noto Sans SC", sans-serif';
      ctx.fillText("三楼 9 号厅 · 年会阵地", hx, lbY + 38);
      /* 指北针 */
      var nx = x0 + w - 18, ny = y0 + 18;
      ctx.strokeStyle = "#45454f";
      ctx.beginPath(); ctx.arc(nx, ny, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.moveTo(nx, ny - 9); ctx.lineTo(nx + 4, ny + 6);
      ctx.lineTo(nx, ny + 3); ctx.lineTo(nx - 4, ny + 6);
      ctx.closePath(); ctx.fill();
      ctx.font = '600 12px Oswald, sans-serif';
      ctx.fillText("N", nx, ny - 20);
    })();

    /* 地图下地址 */
    ctx.font = '500 22px "Noto Sans SC", sans-serif';
    setLS(ctx, 2);
    ctx.fillStyle = COLORS.paper;
    ctx.fillText("丈八东路 103 号正北 110 米 · 电子六路与电子西街口西南", cx, mY + mH + 40);
    ctx.font = '500 19px "Noto Sans SC", sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("导航搜索「雅悦东方宴会酒店」直达 · 楼前可停车", cx, mY + mH + 70);
    setLS(ctx, 0);

    /* 底部落款 */
    line(ctx, cx - 190, 1712, cx - 22, 1712, "rgba(201,162,84,0.7)", 1);
    diamond(ctx, cx, 1712, 6, COLORS.gold);
    line(ctx, cx + 22, 1712, cx + 190, 1712, "rgba(201,162,84,0.7)", 1);
    ctx.font = '600 30px "Noto Serif SC", serif';
    setLS(ctx, 8);
    ctx.fillStyle = COLORS.paper;
    ctx.fillText("大秦军团南郊势力战斗组", cx, 1766);
    setLS(ctx, 4);
    ctx.font = '500 20px "Noto Sans SC", sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("二〇二六年十二月十二日 · 西安", cx, 1802);
    setLS(ctx, 0);
  }

  /* ---------- 页面交互 ---------- */
  var canvas = document.getElementById("poster-canvas");
  var preview = document.getElementById("poster-preview");
  var saveBtn = document.getElementById("poster-save");
  var state = { ready: false };

  function paint(A) {
    drawPoster(canvas, A);
    preview.src = canvas.toDataURL("image/jpeg", 0.92);
  }

  function save() {
    if (!state.ready) return;
    var filename = "南郊势力2026年会介绍.jpg";
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        window.showToast("已开始下载 " + filename);
      }, "image/jpeg", 0.92);
    } else {
      var a2 = document.createElement("a");
      a2.href = canvas.toDataURL("image/jpeg", 0.92);
      a2.download = filename;
      a2.click();
    }
  }

  if (canvas && preview) {
    Promise.all([
      loadFonts(),
      loadImg("images/logo/daqin.png"),
      loadImg("images/logo/nanjiaoshili.png"),
      loadImg("images/stand/2.jpg").catch(function () { return null; }),
      loadImg("images/2026yers/venue-1-s.jpg"),
      loadImg("images/2026yers/venue-2-s.jpg"),
      loadImg("images/2026yers/venue-3-s.jpg")
    ]).then(function (res) {
      var A = {
        daqin: res[1], nanjiao: res[2], stand: res[3],
        v1: res[4], v2: res[5], v3: res[6]
      };
      paint(A);
      state.ready = true;
      var actions = document.getElementById("poster-actions");
      if (actions) actions.classList.add("show");
    }).catch(function () {
      window.showToast("素材加载失败，请刷新重试");
    });
    if (saveBtn) saveBtn.addEventListener("click", save);
  }
})();
