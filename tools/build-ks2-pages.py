"""Refresh the OGL 2024 KS2 web pages from the four verified publisher PDFs.

Pass a directory containing the original PDFs named by their STA code, e.g.
8817.pdf. This authoring utility uses PyMuPDF. The website needs no PDF engine.
"""
import base64
import hashlib
import json
from pathlib import Path
import sys
import zlib

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "src/practice/ks2-2024.json"
OUTPUT = ROOT / "assets/ks2-2024"


def page_data(page, masks):
    for bounds in masks:
        page.add_redact_annot(bounds, fill=(1, 1, 1), cross_out=False)
    if masks:
        page.apply_redactions(images=0, graphics=2, text=0)
    svg = page.get_svg_image(text_as_path=True)
    if "<svg" not in svg or not svg.endswith("</svg>\n"):
        raise ValueError(f"Invalid SVG for page {page.number + 1}")
    spans = []
    for block in page.get_text("dict", flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if span["text"].strip():
                    x, y, right, _ = span["bbox"]
                    spans.append([round(x, 3), round(y, 3), round(right - x, 3), round(span["size"], 3), span["text"]])
    return [base64.b64encode(svg.encode()).decode(), spans]


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/build-ks2-pages.py /path/to/publisher-pdfs")
    source = Path(sys.argv[1])
    manifest = json.loads(MANIFEST.read_text())
    for volume in manifest["volumes"]:
        path = source / (volume["code"] + ".pdf")
        if hashlib.sha256(path.read_bytes()).hexdigest() != volume["sha256"]:
            raise ValueError(f"Unexpected source revision: {path}")
        with pymupdf.open(path) as doc:
            if len(doc) != volume["pages"]:
                raise ValueError(f"Incomplete source: {path}")
            width, height = doc[0].rect.width, doc[0].rect.height
            pages = []
            for i, page in enumerate(doc):
                if page.rect.width != width or page.rect.height != height:
                    raise ValueError(f"Mixed paper sizes: {path}, page {i + 1}")
                masks = volume["logoMasks"].get(str(i + 1), [])
                pages.append(page_data(page, masks))
            payload = json.dumps({"width": width, "height": height, "pages": pages}, ensure_ascii=False, separators=(",", ":"))
            (OUTPUT / (volume["id"] + ".b64")).write_text(base64.b64encode(zlib.compress(payload.encode(), 9)).decode() + "\n")
            print(volume["id"], len(pages), width, height)


if __name__ == "__main__":
    main()
