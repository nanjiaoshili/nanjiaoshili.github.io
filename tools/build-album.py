# -*- coding: utf-8 -*-
"""
比赛相册批量处理脚本
用法：
    python tools/build-album.py <原始照片目录> <相册ID> [最大边长]

示例：
    python tools/build-album.py images/20261018 20261018

输出：
    images/albums/<相册ID>/full/NN.jpg   最长边 1600，q82
    images/albums/<相册ID>/thumb/NN.jpg  最长边 300，q76
并在终端打印可直接粘贴到 js/albums.js 的相册配置。
"""
import os
import re
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_REAL = os.path.realpath(ROOT)
EXTS = (".jpg", ".jpeg", ".png", ".webp")


def inside_root(path):
    path = os.path.realpath(path)
    return path == ROOT_REAL or path.startswith(ROOT_REAL + os.sep)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    src_dir = sys.argv[1] if os.path.isabs(sys.argv[1]) else os.path.join(ROOT, sys.argv[1])
    album_id = sys.argv[2]
    max_side = int(sys.argv[3]) if len(sys.argv) > 3 else 1600

    if not re.match(r"^[A-Za-z0-9_-]+$", album_id):
        print("相册 ID 只能包含字母、数字、下划线或短横线")
        sys.exit(1)

    if not inside_root(src_dir):
        print("源目录必须位于项目目录内:", ROOT)
        sys.exit(1)

    if not os.path.isdir(src_dir):
        print("找不到目录:", src_dir)
        sys.exit(1)

    out_dir = os.path.join(ROOT, "images", "albums", album_id)
    full_dir = os.path.join(out_dir, "full")
    thumb_dir = os.path.join(out_dir, "thumb")
    os.makedirs(full_dir, exist_ok=True)
    os.makedirs(thumb_dir, exist_ok=True)

    # 先清空旧图，避免照片增减后残留编号、出现断号
    for d in (full_dir, thumb_dir):
        for old in os.listdir(d):
            if old.lower().endswith((".jpg", ".jpeg", ".png")):
                os.remove(os.path.join(d, old))

    def natural_key(name):
        return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]

    files = sorted((f for f in os.listdir(src_dir) if f.lower().endswith(EXTS)), key=natural_key)
    if not files:
        print("目录里没有图片:", src_dir)
        sys.exit(1)

    total_full = total_thumb = 0
    for i, name in enumerate(files, 1):
        with Image.open(os.path.join(src_dir, name)) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")

            full = im.copy()
            full.thumbnail((max_side, max_side), Image.LANCZOS)
            fp = os.path.join(full_dir, "%02d.jpg" % i)
            full.save(fp, "JPEG", quality=82, optimize=True, progressive=True)
            total_full += os.path.getsize(fp)

            thumb = im.copy()
            thumb.thumbnail((300, 300), Image.LANCZOS)
            tp = os.path.join(thumb_dir, "%02d.jpg" % i)
            thumb.save(tp, "JPEG", quality=76, optimize=True, progressive=True)
            total_thumb += os.path.getsize(tp)

    print("已处理 %d 张照片" % len(files))
    print("高清 %.1f MB / 缩略图 %.1f MB" % (total_full / 1024 / 1024, total_thumb / 1024 / 1024))

    # 编号连续性自检：01..N 必须齐全（重建前已清空旧图，照片增减不会断号）
    def num_key(name):
        try:
            return int(os.path.splitext(name)[0])
        except ValueError:
            return 0

    expected = ["%02d.jpg" % i for i in range(1, len(files) + 1)]
    actual_full = sorted((f for f in os.listdir(full_dir) if f.lower().endswith(".jpg")), key=num_key)
    actual_thumb = sorted((f for f in os.listdir(thumb_dir) if f.lower().endswith(".jpg")), key=num_key)
    if actual_full != expected or actual_thumb != expected:
        print("⚠ 编号不连续，请检查输出目录！")
    else:
        print("编号连续：01 – %02d（共 %d 张）" % (len(files), len(files)))

    print()
    print("请把 js/albums.js 中该相册的 count 更新为 %d；若还没有该相册，添加：" % len(files))
    print(
        '  { id: "%s", title: "对阵双方", date: "YYYY.MM.DD", venue: "场地", score: "0 : 0", cover: 1, count: %d }'
        % (album_id, len(files))
    )


if __name__ == "__main__":
    main()
