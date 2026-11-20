/* ==========================================================================
   2026 年会 · 邀请函批量生成（batch.html）
   上传 txt（每行一个名字，也兼容逗号/顿号分隔）→ 逐个渲染新版邀请函
   → 优先写入用户选择的文件夹（File System Access API），否则打包 ZIP 下载
   ========================================================================== */
(function () {
  "use strict";

  var fileInput = document.getElementById("batch-file");
  var textInput = document.getElementById("batch-text");
  var parseBtn = document.getElementById("batch-parse");
  var listBox = document.getElementById("batch-list");
  var countEl = document.getElementById("batch-count");
  var runBtn = document.getElementById("batch-run");
  var zipBtn = document.getElementById("batch-zip");
  var bar = document.getElementById("batch-bar");
  var barFill = document.getElementById("batch-bar-fill");
  var barText = document.getElementById("batch-bar-text");
  var modeSel = document.getElementById("batch-mode");

  var names = [];
  var assets = null;
  var ready = false;
  var rendering = false;
  var canvas = document.createElement("canvas");

  var MAX = 300;

  /* ---------- 名单解析（换行 / 逗号 / 顿号 / 空格 均可作分隔） ---------- */
  function parseText(txt) {
    var out = [];
    var seen = {};
    String(txt || "").split(/[\s，,、;；]+/).forEach(function (one) {
      if (!one) return;
      if (one.length > 12) one = one.slice(0, 12);
      if (!seen[one]) { seen[one] = true; out.push(one); }
    });
    return out;
  }

  function refreshList() {
    countEl.textContent = names.length ? "共 " + names.length + " 人" : "";
    listBox.innerHTML = "";
    names.forEach(function (n) {
      var s = document.createElement("span");
      s.className = "name-chip";
      s.textContent = n;
      listBox.appendChild(s);
    });
    runBtn.disabled = !names.length || rendering;
    zipBtn.disabled = !names.length || rendering;
  }

  function takeFromInputs() {
    var txt = textInput.value || "";
    if (names.length > MAX) { names = names.slice(0, MAX); }
    names = parseText(txt);
    if (names.length > MAX) {
      window.showToast("名单过长，已截取前 " + MAX + " 人");
      names = names.slice(0, MAX);
    }
    refreshList();
    if (!names.length) window.showToast("没有识别到名字，请检查名单");
  }

  if (parseBtn) parseBtn.addEventListener("click", takeFromInputs);
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        textInput.value = String(fr.result || "");
        takeFromInputs();
      };
      fr.onerror = function () { window.showToast("文件读取失败"); };
      fr.readAsText(f, "utf-8");
    });
  }

  /* ---------- 素材加载（复用新版邀请函绘制） ---------- */
  function boot() {
    var D = window.NJSL_INVITE_DRAW;
    if (!D) { window.showToast("绘制模块加载失败，请刷新"); return; }
    Promise.all([
      D.loadFonts(),
      D.loadImg("images/logo/daqin.png"),
      D.loadImg("images/logo/nanjiaoshili.png"),
      D.loadImg("images/stand/2.jpg").catch(function () { return null; })
    ]).then(function (res) {
      assets = { daqin: res[1], nanjiao: res[2], stand: res[3] };
      ready = true;
    }).catch(function () {
      window.showToast("素材加载失败，请刷新重试");
    });
  }

  function renderOne(name) {
    window.NJSL_INVITE_DRAW.drawInvite(canvas, assets, name, false);
    return new Promise(function (resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) { resolve({ name: name, blob: blob }); }, "image/jpeg", 0.92);
      } else {
        var parts = canvas.toDataURL("image/jpeg", 0.92).split(",");
        var bin = atob(parts[1]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve({ name: name, blob: new Blob([arr], { type: "image/jpeg" }) });
      }
    });
  }

  function safeName(n) {
    return n.replace(/[\\/:*?"<>|]/g, "");
  }

  function setProgress(done, total, label) {
    bar.style.display = "";
    barFill.style.width = (total ? Math.round((done / total) * 100) : 0) + "%";
    barText.textContent = label || (done + " / " + total);
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* ---------- 模式一：写入指定文件夹 ---------- */
  async function runToDirectory() {
    if (!ready || !names.length || rendering) return;
    if (!window.showDirectoryPicker) {
      window.showToast("此浏览器不支持选文件夹，已改用 ZIP 打包");
      return runZip();
    }
    var dir = null;
    try {
      dir = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (e) { return; /* 用户取消 */ }
    rendering = true;
    refreshList();
    var ok = 0, fail = 0;
    for (var i = 0; i < names.length; i++) {
      try {
        var item = await renderOne(names[i]);
        var fh = await dir.getFileHandle("南郊势力年会邀请函-" + safeName(names[i]) + ".jpg", { create: true });
        var w = await fh.createWritable();
        await w.write(item.blob);
        await w.close();
        ok++;
      } catch (e) { fail++; }
      setProgress(i + 1, names.length, "已生成 " + ok + " 张" + (fail ? "（失败 " + fail + "）" : ""));
      await sleep(30);
    }
    rendering = false;
    refreshList();
    window.showToast("完成：成功 " + ok + " 张" + (fail ? "，失败 " + fail + " 张" : "") + "，已写入所选文件夹");
  }

  /* ---------- 模式二：ZIP 打包下载 ---------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function dosTime(d) {
    var time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
    var date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    return { time: time, date: date };
  }
  function buildZip(entries) {
    /* entries: [{name: string(Utf8 文件名), data: Uint8Array}]，store 模式 */
    var enc = new TextEncoder();
    var parts = [];
    var central = [];
    var offset = 0;
    var now = dosTime(new Date());
    entries.forEach(function (e) {
      var nameB = enc.encode(e.name);
      var crc = crc32(e.data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);          /* version needed */
      lh.setUint16(6, 0x0800, true);      /* UTF-8 文件名标志 */
      lh.setUint16(8, 0, true);           /* store */
      lh.setUint16(10, now.time, true);
      lh.setUint16(12, now.date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, e.data.length, true);
      lh.setUint32(22, e.data.length, true);
      lh.setUint16(26, nameB.length, true);
      lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nameB, e.data);

      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, now.time, true);
      ch.setUint16(14, now.date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, e.data.length, true);
      ch.setUint32(24, e.data.length, true);
      ch.setUint16(28, nameB.length, true);
      ch.setUint16(30, 0, true);
      ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true);
      ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameB);

      offset += 30 + nameB.length + e.data.length;
    });
    var centralSize = 0;
    central.forEach(function (p) { centralSize += p.length; });
    var eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, entries.length, true);
    eocd.setUint16(10, entries.length, true);
    eocd.setUint32(12, centralSize, true);
    eocd.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(eocd.buffer)]), { type: "application/zip" });
  }

  async function runZip() {
    if (!ready || !names.length || rendering) return;
    rendering = true;
    refreshList();
    var entries = [];
    for (var i = 0; i < names.length; i++) {
      var item = await renderOne(names[i]);
      var buf = new Uint8Array(await item.blob.arrayBuffer());
      entries.push({ name: "南郊势力年会邀请函-" + safeName(names[i]) + ".jpg", data: buf });
      setProgress(i + 1, names.length);
      await sleep(30);
    }
    var zip = buildZip(entries);
    var a = document.createElement("a");
    a.href = URL.createObjectURL(zip);
    a.download = "南郊势力2026年会邀请函-" + names.length + "人.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 8000);
    rendering = false;
    refreshList();
    window.showToast("已打包 " + names.length + " 张，正在下载 ZIP");
  }

  /* ---------- 事件 ---------- */
  if (runBtn) runBtn.addEventListener("click", function () {
    if (modeSel && modeSel.value === "zip") runZip(); else runToDirectory();
  });
  if (zipBtn) zipBtn.addEventListener("click", runZip);

  /* 测试探针（自动化验证用） */
  window.__BATCH_TEST = {
    parse: parseText,
    render: function (name) { return renderOne(name); },
    zip: buildZip,
    setNames: function (arr) { names = arr.slice(); refreshList(); },
    isReady: function () { return ready; }
  };

  boot();
})();
