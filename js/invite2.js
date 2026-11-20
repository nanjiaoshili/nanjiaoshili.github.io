/* ==========================================================================
   2026 年会 · 邀请函生成（新版 invite2.html：无二维码，措辞调整）
   Canvas 邀请函绘制（玄黑 / 朱红 / 鎏金 / 骨白 视觉体系，看台照片压黑底）
   ========================================================================== */
(function () {
  "use strict";

  var CW = 1080, CH = 1560; // 邀请函画布尺寸

  var COLORS = {
    ink: "#0a0a0c", ink2: "#101014", red: "#d6362b", redDeep: "#8e1f1a",
    gold: "#c9a254", paper: "#f2ecdf", ash: "#9b958a"
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
      document.fonts.load('700 116px "Noto Serif SC"'),
      document.fonts.load('600 40px "Noto Serif SC"'),
      document.fonts.load('500 34px "Noto Sans SC"'),
      document.fonts.load('500 20px Oswald')
    ]).catch(function () {});
  }

  function setLS(ctx, px) {
    if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px";
  }

  function drawInvite(canvas, assets, name, isPlaceholder) {
    canvas.width = CW; canvas.height = CH;
    var ctx = canvas.getContext("2d");
    var cx = CW / 2;

    /* 底色：看台照片 + 压黑（无照片时回退纯黑） */
    if (assets.stand) {
      var im = assets.stand;
      var sc = Math.max(CW / im.width, CH / im.height);
      var dw = im.width * sc, dh = im.height * sc;
      ctx.drawImage(im, (CW - dw) / 2, (CH - dh) / 2, dw, dh);
      var veil = ctx.createLinearGradient(0, 0, 0, CH);
      veil.addColorStop(0, "rgba(10,10,12,0.95)");
      veil.addColorStop(0.38, "rgba(10,10,12,0.84)");
      veil.addColorStop(1, "rgba(10,10,12,0.96)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, CW, CH);
    } else {
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(0, 0, CW, CH);
    }
    var glow = ctx.createRadialGradient(cx, 180, 40, cx, 180, 760);
    glow.addColorStop(0, "rgba(214,54,43,0.20)");
    glow.addColorStop(0.55, "rgba(214,54,43,0.05)");
    glow.addColorStop(1, "rgba(214,54,43,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CW, CH);
    var glow2 = ctx.createRadialGradient(cx, CH - 260, 60, cx, CH - 260, 700);
    glow2.addColorStop(0, "rgba(201,162,84,0.12)");
    glow2.addColorStop(1, "rgba(201,162,84,0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, CW, CH);

    /* 胶片颗粒（伪随机固定种子） */
    var seed = 20261212;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    ctx.fillStyle = "rgba(242,236,223,0.05)";
    for (var g = 0; g < 900; g++) {
      ctx.fillRect(rnd() * CW, rnd() * CH, 1.5, 1.5);
    }

    /* 双层鎏金边框 + 四角菱形 */
    ctx.strokeStyle = "rgba(201,162,84,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, CW - 68, CH - 68);
    ctx.strokeStyle = "rgba(201,162,84,0.38)";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, CW - 96, CH - 96);
    var corners = [[48, 48], [CW - 48, 48], [48, CH - 48], [CW - 48, CH - 48]];
    corners.forEach(function (pt) {
      ctx.save();
      ctx.translate(pt[0], pt[1]);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    });

    /* 顶部双徽 */
    var logoH = 92, y0 = 108;
    var dq = assets.daqin, nj = assets.nanjiao;
    var dwl = logoH * (dq.width / dq.height), nwl = logoH * (nj.width / nj.height);
    var sepGap = 34, totalW = dwl + sepGap + nwl;
    var lx = cx - totalW / 2;
    ctx.drawImage(dq, lx, y0, dwl, logoH);
    ctx.strokeStyle = "rgba(38,38,45,1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 1, y0 + 6); ctx.lineTo(cx - 1, y0 + logoH - 6);
    ctx.stroke();
    ctx.drawImage(nj, lx + dwl + sepGap + 2, y0, nwl, logoH);

    /* 组织名 */
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.gold;
    ctx.font = '600 30px "Noto Serif SC", "Songti SC", "SimSun", serif';
    setLS(ctx, 10);
    ctx.fillText("大秦军团 · 南郊势力战斗组", cx, y0 + logoH + 58);
    setLS(ctx, 6);
    ctx.font = '500 19px Oswald, "Arial Narrow", sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("EST. 2018 · SOUTH SIDE FORCE · 8TH ANNIVERSARY", cx, y0 + logoH + 96);
    setLS(ctx, 0);

    /* 标题区 */
    ctx.font = '600 30px "Noto Serif SC", serif';
    setLS(ctx, 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillText("二〇二六年 · 八 周年", cx, 356);
    ctx.font = '700 116px "Noto Serif SC", serif';
    setLS(ctx, 14);
    ctx.fillStyle = COLORS.paper;
    ctx.fillText("年会邀请函", cx, 478);
    setLS(ctx, 8);
    ctx.font = '500 21px Oswald, sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("2026 ANNUAL GALA INVITATION", cx, 528);
    setLS(ctx, 0);

    /* 金色分隔线 */
    line(ctx, cx - 250, 566, cx - 26, 566, COLORS.gold, 1);
    diamond(ctx, cx, 566, 6, COLORS.gold);
    line(ctx, cx + 26, 566, cx + 250, 566, COLORS.gold, 1);

    /* 年会主题（仅一句） */
    ctx.font = '600 40px "Noto Serif SC", serif';
    setLS(ctx, 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillText("执守八载热血 · 聚力南郊锋芒", cx, 642);
    setLS(ctx, 0);

    /* 诚邀 + 名字 */
    ctx.font = '500 34px "Noto Serif SC", serif';
    setLS(ctx, 14);
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("诚 邀", cx, 730);
    setLS(ctx, 0);

    var nameFont = 100;
    ctx.font = '700 ' + nameFont + 'px "Noto Serif SC", serif';
    while (ctx.measureText(name).width > 640 && nameFont > 44) {
      nameFont -= 4;
      ctx.font = '700 ' + nameFont + 'px "Noto Serif SC", serif';
    }
    ctx.fillStyle = isPlaceholder ? "rgba(155,149,138,0.7)" : "#ef5a4d";
    if (!isPlaceholder) {
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 3;
    }
    setLS(ctx, 8);
    ctx.fillText(name, cx, 846);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    var nameW = ctx.measureText(name).width;
    setLS(ctx, 0);
    line(ctx, cx - Math.max(nameW, 240) / 2 - 14, 876,
              cx + Math.max(nameW, 240) / 2 + 14, 876, "rgba(201,162,84,0.65)", 1);

    ctx.font = '500 34px "Noto Serif SC", serif';
    setLS(ctx, 14);
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("共 赴 年 会", cx, 932);
    setLS(ctx, 0);

    /* 信息两行 */
    var rows = [
      ["时 间", "2026.12.12（周六）17:30"],
      ["地 点", "雅悦东方宴会酒店 · 三楼 9 号厅"]
    ];
    var ry = 1006;
    rows.forEach(function (row) {
      ctx.font = '600 27px "Noto Serif SC", serif';
      var labelW = ctx.measureText(row[0]).width + 34;
      ctx.font = '500 33px "Noto Sans SC", sans-serif';
      var valW = ctx.measureText(row[1]).width;
      var total = labelW + 18 + valW;
      var sx = cx - total / 2;
      ctx.strokeStyle = "rgba(201,162,84,0.75)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, ry - 30, labelW, 44);
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = "center";
      ctx.font = '600 27px "Noto Serif SC", serif';
      ctx.fillText(row[0], sx + labelW / 2, ry);
      ctx.fillStyle = COLORS.paper;
      ctx.font = '500 33px "Noto Sans SC", sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(row[1], sx + labelW + 18, ry);
      ry += 70;
    });
    ctx.textAlign = "center";

    /* 底部落款（补位二维码移除后的下部空间） */
    line(ctx, cx - 190, 1244, cx - 22, 1244, "rgba(201,162,84,0.7)", 1);
    diamond(ctx, cx, 1244, 6, COLORS.gold);
    line(ctx, cx + 22, 1244, cx + 190, 1244, "rgba(201,162,84,0.7)", 1);

    ctx.font = '600 30px "Noto Serif SC", serif';
    setLS(ctx, 8);
    ctx.fillStyle = COLORS.paper;
    ctx.fillText("大秦军团南郊势力战斗组", cx, 1316);
    setLS(ctx, 4);
    ctx.font = '500 21px "Noto Sans SC", sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("二〇二六年十二月十二日 · 西安", cx, 1362);
    setLS(ctx, 0);
  }

  function line(ctx, x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function diamond(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  /* 暴露绘制能力给批量生成页（batch.html）复用 */
  window.NJSL_INVITE_DRAW = {
    drawInvite: drawInvite,
    loadFonts: loadFonts,
    loadImg: loadImg,
    CW: CW,
    CH: CH
  };

  /* ---------- 页面交互 ---------- */
  var canvas = document.getElementById("invite-canvas");
  var preview = document.getElementById("invite-preview");
  var form = document.getElementById("invite-form");
  var nameInput = document.getElementById("invite-name");
  var saveBtn = document.getElementById("invite-save");
  var actions = document.getElementById("invite-actions");

  var state = { assets: null, ready: false, name: "" };

  function paint(name, isPlaceholder) {
    drawInvite(canvas, state.assets, name, isPlaceholder);
    preview.src = canvas.toDataURL("image/jpeg", 0.92);
    preview.alt = name + " 的南郊势力2026年会邀请函";
  }

  function generate() {
    var name = (nameInput.value || "").replace(/\s+/g, "");
    if (!name) {
      window.showToast("先写上你的名字，再生成邀请函");
      nameInput.focus();
      return;
    }
    if (name.length > 12) name = name.slice(0, 12);
    state.name = name;
    paint(name, false);
    actions.classList.add("show");
    window.showToast("邀请函已生成，长按或点击保存");
    if (actions.scrollIntoView) actions.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function save() {
    if (!state.name) return;
    var filename = "南郊势力年会邀请函-" + state.name + ".jpg";
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
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

  if (canvas && form) {
    var standP = loadImg("images/stand/2.jpg").catch(function () { return null; });
    Promise.all([
      loadFonts(),
      loadImg("images/logo/daqin.png"),
      loadImg("images/logo/nanjiaoshili.png"),
      standP
    ]).then(function (res) {
      state.assets = { daqin: res[1], nanjiao: res[2], stand: res[3] };
      state.ready = true;
      if (!state.name) paint("你的名字", true);
    }).catch(function () {
      window.showToast("素材加载失败，请刷新重试");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!state.ready) {
        window.showToast("素材加载中，请稍候 1-2 秒再点生成");
        return;
      }
      generate();
    });
    if (saveBtn) saveBtn.addEventListener("click", save);
    var redoBtn = document.getElementById("invite-redo");
    if (redoBtn) {
      redoBtn.addEventListener("click", function () {
        nameInput.focus();
        nameInput.select();
      });
    }
  }
})();
