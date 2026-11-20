/* ==========================================================================
   2026 年会 · 专属邀请函生成（invite.html）
   自包含二维码编码器（QR Version 3 / ECC M / 字节模式，无需外部库）
   + Canvas 邀请函绘制（玄黑 / 朱红 / 鎏金 / 骨白 视觉体系）
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 配置 ---------- */
  var QR_TEXT = "https://www.nanjiaoshili.com/2026.html"; // 邀请函二维码指向年会主页
  var CW = 1080, CH = 1560; // 邀请函画布尺寸（约 9:13 竖版）

  /* =====================================================================
     一、二维码编码器（Version 3 · 29×29 · ECC M · 单块 44 数据 + 26 纠错）
     ===================================================================== */
  var QR = (function () {
    var VER = 3, SIZE = 29, DATA_CW = 44, EC_CW = 26, ALIGN = 22;

    /* GF(256)，本原多项式 0x11D */
    var EXP = new Array(512), LOG = new Array(256);
    (function () {
      var x = 1;
      for (var i = 0; i < 255; i++) {
        EXP[i] = x; LOG[x] = i;
        x <<= 1; if (x & 0x100) x ^= 0x11d;
      }
      for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
    })();
    function gmul(a, b) {
      if (a === 0 || b === 0) return 0;
      return EXP[LOG[a] + LOG[b]];
    }

    /* RS 生成多项式（最高次系数在前） */
    function genPoly(n) {
      var poly = [1];
      for (var i = 0; i < n; i++) {
        var a = EXP[i], np = new Array(poly.length + 1);
        for (var k = 0; k < np.length; k++) np[k] = 0;
        for (var j = 0; j < poly.length; j++) {
          np[j] ^= poly[j];
          np[j + 1] ^= gmul(poly[j], a);
        }
        poly = np;
      }
      return poly;
    }
    function rsEncode(data, ecLen) {
      var gen = genPoly(ecLen);
      var res = data.slice();
      for (var p = 0; p < ecLen; p++) res.push(0);
      for (var i = 0; i < data.length; i++) {
        var f = res[i];
        if (f !== 0) {
          for (var j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], f);
        }
      }
      return res.slice(data.length);
    }

    /* 数据码字：字节模式 */
    function dataCodewords(text) {
      var bytes = [];
      for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if (c > 0xff) throw new Error("QR_TEXT 仅支持单字节字符");
        bytes.push(c);
      }
      if (bytes.length > DATA_CW - 2) throw new Error("内容超长");
      var bits = [];
      function push(val, len) {
        for (var k = len - 1; k >= 0; k--) bits.push((val >>> k) & 1);
      }
      push(4, 4);                 /* 模式：字节 */
      push(bytes.length, 8);      /* 字符数（v1-9 为 8 位） */
      bytes.forEach(function (b) { push(b, 8); });
      var cap = DATA_CW * 8;
      push(0, Math.min(4, cap - bits.length));        /* 终止符 */
      while (bits.length % 8 !== 0) bits.push(0);     /* 补齐字节 */
      var cw = [];
      for (var b = 0; b < bits.length; b += 8) {
        var v = 0;
        for (var t = 0; t < 8; t++) v = (v << 1) | bits[b + t];
        cw.push(v);
      }
      var pad = [0xec, 0x11], pi = 0;
      while (cw.length < DATA_CW) cw.push(pad[pi++ % 2]);
      return cw;
    }

    /* 掩码函数 */
    var MASKS = [
      function (r, c) { return (r + c) % 2 === 0; },
      function (r, c) { return r % 2 === 0; },
      function (r, c) { return c % 3 === 0; },
      function (r, c) { return (r + c) % 3 === 0; },
      function (r, c) { return ((r >> 1) + Math.floor(c / 3)) % 2 === 0; },
      function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
      function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
      function (r, c) { return ((r * c) % 3 + (r + c) % 2) % 2 === 0; }
    ];

    /* 格式信息（ECC M = 00，5 位数据 + BCH(15,5)，异或 0x5412） */
    function formatBits(maskId) {
      var data = (0 << 3) | maskId; /* M: 00 */
      var v = data << 10;
      for (var i = 14; i >= 10; i--) {
        if ((v >> i) & 1) v ^= 0x537 << (i - 10);
      }
      return ((data << 10) | v) ^ 0x5412;
    }

    function build(text) {
      var data = dataCodewords(text);
      var ec = rsEncode(data, EC_CW);
      var all = data.concat(ec);
      var bits = [];
      all.forEach(function (b) {
        for (var k = 7; k >= 0; k--) bits.push((b >> k) & 1);
      });

      var best = null;
      for (var m = 0; m < 8; m++) {
        var mx = [], res = [];
        for (var r = 0; r < SIZE; r++) {
          mx.push(new Array(SIZE).fill(null));
          res.push(new Array(SIZE).fill(false));
        }
        function set(r, c, v) { mx[r][c] = v; res[r][c] = true; }

        /* 三个定位图形 + 分隔带 */
        function finder(r0, c0) {
          for (var r = -1; r <= 7; r++) {
            for (var c = -1; c <= 7; c++) {
              var rr = r0 + r, cc = c0 + c;
              if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue;
              var dark = (r >= 0 && r <= 6 && c >= 0 && c <= 6) &&
                         (r === 0 || r === 6 || c === 0 || c === 6 ||
                          (r >= 2 && r <= 4 && c >= 2 && c <= 4));
              set(rr, cc, dark ? 1 : 0);
            }
          }
        }
        finder(0, 0); finder(0, SIZE - 7); finder(SIZE - 7, 0);

        /* 校正图形（v3 中心 22,22） */
        for (var ar = -2; ar <= 2; ar++) {
          for (var ac = -2; ac <= 2; ac++) {
            var ring = Math.max(Math.abs(ar), Math.abs(ac));
            set(ALIGN + ar, ALIGN + ac, ring !== 1 ? 1 : 0);
          }
        }

        /* 时序图形 */
        for (var t = 8; t < SIZE - 8; t++) {
          if (!res[6][t]) set(6, t, t % 2 === 0 ? 1 : 0);
          if (!res[t][6]) set(t, 6, t % 2 === 0 ? 1 : 0);
        }

        /* 暗模块 */
        set(SIZE - 8, 8, 1);

        /* 预留格式信息区（先占位） */
        for (var f1 = 0; f1 <= 8; f1++) {
          if (f1 !== 6) { if (!res[8][f1]) set(8, f1, 0); if (!res[f1][8]) set(f1, 8, 0); }
        }
        for (var f2 = SIZE - 8; f2 < SIZE; f2++) {
          set(8, f2, 0); set(f2, 8, 0);
        }

        /* 数据按两列折返填入 */
        var bitIdx = 0, up = true;
        for (var col = SIZE - 1; col > 0; col -= 2) {
          if (col === 6) col--;
          for (var i2 = 0; i2 < SIZE; i2++) {
            var row = up ? SIZE - 1 - i2 : i2;
            for (var j2 = 0; j2 < 2; j2++) {
              var cc2 = col - j2;
              if (res[row][cc2]) continue;
              var bit = bitIdx < bits.length ? bits[bitIdx++] : 0;
              mx[row][cc2] = MASKS[m](row, cc2) ? (bit ^ 1) : bit;
            }
          }
          up = !up;
        }

        /* 写入格式信息 */
        var fmt = formatBits(m);
        var fb = [];
        for (var q = 14; q >= 0; q--) fb.push((fmt >> q) & 1); /* fb[0]=最高位 */
        /* fb[0..14] 依序放入：左上副本 */
        var pos1 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
                    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
        for (var p1 = 0; p1 < 15; p1++) mx[pos1[p1][0]][pos1[p1][1]] = fb[p1];
        /* 右上 + 左下副本 */
        var pos2 = [[SIZE - 1, 8], [SIZE - 2, 8], [SIZE - 3, 8], [SIZE - 4, 8],
                    [SIZE - 5, 8], [SIZE - 6, 8], [SIZE - 7, 8],
                    [8, SIZE - 8], [8, SIZE - 7], [8, SIZE - 6], [8, SIZE - 5],
                    [8, SIZE - 4], [8, SIZE - 3], [8, SIZE - 2], [8, SIZE - 1]];
        for (var p2 = 0; p2 < 15; p2++) mx[pos2[p2][0]][pos2[p2][1]] = fb[p2];

        var score = penalty(mx);
        if (!best || score < best.score) best = { score: score, matrix: mx };
      }
      return { size: SIZE, matrix: best.matrix };
    }

    /* 失分规则 N1-N4 */
    function penalty(mx) {
      var s = 0, r, c;
      /* N1 行列连色 */
      for (r = 0; r < SIZE; r++) {
        var run = 1;
        for (c = 1; c < SIZE; c++) {
          if (mx[r][c] === mx[r][c - 1]) { run++; }
          else { if (run >= 5) s += 3 + run - 5; run = 1; }
        }
        if (run >= 5) s += 3 + run - 5;
      }
      for (c = 0; c < SIZE; c++) {
        var run2 = 1;
        for (r = 1; r < SIZE; r++) {
          if (mx[r][c] === mx[r - 1][c]) { run2++; }
          else { if (run2 >= 5) s += 3 + run2 - 5; run2 = 1; }
        }
        if (run2 >= 5) s += 3 + run2 - 5;
      }
      /* N2 同色 2×2 */
      for (r = 0; r < SIZE - 1; r++) {
        for (c = 0; c < SIZE - 1; c++) {
          var v = mx[r][c];
          if (mx[r][c + 1] === v && mx[r + 1][c] === v && mx[r + 1][c + 1] === v) s += 3;
        }
      }
      /* N3 类定位图形序列（两种方向 × 行列） */
      var pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
      var pat2 = pat1.slice().reverse();
      function matchAt(get, i, pat) {
        for (var k = 0; k < 11; k++) {
          if (get(i + k) !== pat[k]) return false;
        }
        return true;
      }
      for (r = 0; r < SIZE; r++) {
        for (c = 0; c <= SIZE - 11; c++) {
          if (matchAt(function (x) { return mx[r][x]; }, c, pat1)) s += 40;
          if (matchAt(function (x) { return mx[r][x]; }, c, pat2)) s += 40;
        }
      }
      for (c = 0; c < SIZE; c++) {
        for (r = 0; r <= SIZE - 11; r++) {
          if (matchAt(function (x) { return mx[x][c]; }, r, pat1)) s += 40;
          if (matchAt(function (x) { return mx[x][c]; }, r, pat2)) s += 40;
        }
      }
      /* N4 明暗比例 */
      var dark = 0;
      for (r = 0; r < SIZE; r++) for (c = 0; c < SIZE; c++) dark += mx[r][c];
      s += Math.floor(Math.abs((dark * 100) / (SIZE * SIZE) - 50) / 5) * 10;
      return s;
    }

    return { build: build };
  })();

  /* =====================================================================
     二、邀请函绘制
     ===================================================================== */
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
      document.fonts.load('500 20px Oswald'),
      document.fonts.load('600 52px Oswald')
    ]).catch(function () {});
  }

  function setLS(ctx, px) {
    if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px";
  }

  /* 绘制主函数：name 为空时用占位样式 */
  function drawInvite(canvas, assets, qr, name, isPlaceholder) {
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
    var glow2 = ctx.createRadialGradient(cx, CH - 200, 60, cx, CH - 200, 700);
    glow2.addColorStop(0, "rgba(201,162,84,0.10)");
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

    /* 双层鎏金边框 + 切角 */
    ctx.strokeStyle = "rgba(201,162,84,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, CW - 68, CH - 68);
    ctx.strokeStyle = "rgba(201,162,84,0.38)";
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, CW - 96, CH - 96);
    /* 四角菱形装饰 */
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
    var dw = logoH * (dq.width / dq.height), nw = logoH * (nj.width / nj.height);
    var sepGap = 34, totalW = dw + sepGap + nw;
    var lx = cx - totalW / 2;
    ctx.drawImage(dq, lx, y0, dw, logoH);
    ctx.strokeStyle = "rgba(38,38,45,1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 1, y0 + 6); ctx.lineTo(cx - 1, y0 + logoH - 6);
    ctx.stroke();
    ctx.drawImage(nj, lx + dw + sepGap + 2, y0, nw, logoH);

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

    /* 兹邀请 + 名字 */
    ctx.font = '500 34px "Noto Serif SC", serif';
    setLS(ctx, 14);
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("兹 邀 请", cx, 730);
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
    /* 名字下的金线 */
    line(ctx, cx - Math.max(nameW, 240) / 2 - 14, 876,
              cx + Math.max(nameW, 240) / 2 + 14, 876, "rgba(201,162,84,0.65)", 1);

    ctx.font = '500 34px "Noto Serif SC", serif';
    setLS(ctx, 14);
    ctx.fillStyle = COLORS.ash;
    ctx.fillText("战 友 莅 临", cx, 932);
    setLS(ctx, 0);

    /* 信息两行（会费等详情扫码进入年会页查看） */
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
      /* 标签小框 */
      ctx.strokeStyle = "rgba(201,162,84,0.75)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, ry - 30, labelW, 44);
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = "center";
      ctx.font = '600 27px "Noto Serif SC", serif';
      ctx.fillText(row[0], sx + labelW / 2, ry);
      /* 值 */
      ctx.fillStyle = COLORS.paper;
      ctx.font = '500 33px "Noto Sans SC", sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(row[1], sx + labelW + 18, ry);
      ry += 70;
    });
    ctx.textAlign = "center";

    /* 二维码（含白底与金框，整体收在底边框之内） */
    var boxS = 224, boxX = cx - boxS / 2, boxY = 1166;
    ctx.fillStyle = "#fbf7ec";
    ctx.fillRect(boxX - 12, boxY - 12, boxS + 24, boxS + 24);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX - 12, boxY - 12, boxS + 24, boxS + 24);
    var quiet = 4, mods = qr.size + quiet * 2;
    var cell = boxS / mods;
    ctx.fillStyle = "#0a0a0c";
    for (var qr2 = 0; qr2 < qr.size; qr2++) {
      for (var qc = 0; qc < qr.size; qc++) {
        if (qr.matrix[qr2][qc]) {
          ctx.fillRect(boxX + (qc + quiet) * cell, boxY + (qr2 + quiet) * cell,
                       Math.ceil(cell), Math.ceil(cell));
        }
      }
    }

    /* 二维码下方说明 */
    ctx.font = '600 26px "Noto Serif SC", serif';
    setLS(ctx, 8);
    ctx.fillStyle = COLORS.gold;
    ctx.fillText("扫 码 查 看 年 会 详 情", cx, boxY + boxS + 44);
    setLS(ctx, 4);
    ctx.font = '500 20px Oswald, sans-serif';
    ctx.fillStyle = COLORS.ash;
    ctx.fillText(QR_TEXT.replace("https://", ""), cx, boxY + boxS + 78);
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

  /* =====================================================================
     三、页面交互
     ===================================================================== */
  var canvas = document.getElementById("invite-canvas");
  var preview = document.getElementById("invite-preview");
  var form = document.getElementById("invite-form");
  var nameInput = document.getElementById("invite-name");
  var saveBtn = document.getElementById("invite-save");
  var actions = document.getElementById("invite-actions");

  var state = { qr: null, assets: null, ready: false, name: "" };

  function paint(name, isPlaceholder) {
    drawInvite(canvas, state.assets, state.qr, name, isPlaceholder);
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
      state.qr = QR.build(QR_TEXT);
      state.ready = true;
      if (!state.name) paint("你的名字", true); /* 初始占位预览（不覆盖已生成的名字） */
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
