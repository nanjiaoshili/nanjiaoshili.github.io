# -*- coding: utf-8 -*-
"""生成 images/albums/<id>/orig.json：相册编号 -> 原片文件名清单。

自动扫描 images/albums/ 下每个相册的 full/ 张数，再到 images/<相册ID>/ 找原片：
数量一致时直接沿用 build-album.py 的自然排序；
数量不一致（原片缺失）时用 16x16 灰度指纹做余弦相似度对齐，缺失位置记 null。
请在项目根目录运行：python tools/album-orig-list.py
"""
import json
import re
from pathlib import Path

from PIL import Image, ImageOps

EXTS = (".jpg", ".jpeg", ".png", ".webp")
ROOT = Path(__file__).resolve().parent.parent
ALBUMS_DIR = ROOT / "images" / "albums"


def natural_key(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def fingerprint(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im).convert("L").resize((16, 16), Image.LANCZOS)
    px = list(im.getdata())
    mean = sum(px) / len(px)
    vec = [p - mean for p in px]
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


def similarity(a, b):
    return sum(x * y for x, y in zip(a, b))


def build(album_id, count):
    src = ROOT / "images" / album_id
    if not src.is_dir():
        print("%s: 无原片目录，跳过" % album_id)
        return
    files = sorted((f.name for f in src.iterdir() if f.name.lower().endswith(EXTS)), key=natural_key)
    for f in files:
        if "/" in f or "\\" in f:
            raise SystemExit("文件名异常: " + f)

    missing = 0
    if len(files) == count:
        manifest = files
    else:
        if len(files) > count:
            raise SystemExit("%s: 原片(%d) 多于相册(%d)，请检查" % (album_id, len(files), count))
        missing = count - len(files)
        full_dir = ALBUMS_DIR / album_id / "full"
        album_fps = [fingerprint(full_dir / (("%02d.jpg") % i)) for i in range(1, count + 1)]
        orig_fps = [fingerprint(src / f) for f in files]
        pairs = sorted(
            ((similarity(album_fps[i], orig_fps[j]), i, j) for i in range(count) for j in range(len(files))),
            reverse=True,
        )
        used_i, used_j = set(), set()
        manifest = [None] * count
        for _, i, j in pairs:
            if i in used_i or j in used_j:
                continue
            used_i.add(i)
            used_j.add(j)
            manifest[i] = files[j]
        if manifest.count(None) != missing:
            raise SystemExit(album_id + ": 指纹对齐失败")

    out = ALBUMS_DIR / album_id / "orig.json"
    if not out.resolve().is_relative_to(ALBUMS_DIR.resolve()):
        raise SystemExit("输出路径越界，已阻止")
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=0), encoding="utf-8")
    note = ("（指纹对齐，缺失 %d 张记 null）" % missing) if missing else ""
    print("%s: %d 条%s -> orig.json" % (album_id, len(manifest), note))


if __name__ == "__main__":
    for album in sorted(p.name for p in ALBUMS_DIR.iterdir() if p.is_dir()):
        full_dir = ALBUMS_DIR / album / "full"
        if full_dir.is_dir():
            build(album, len([f for f in full_dir.iterdir() if f.name.lower().endswith(".jpg")]))
