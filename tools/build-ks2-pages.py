"""Refresh web pages for a verified publisher edition.

Pass a directory of PDFs named by their volume code (e.g. 8817.pdf), and
optionally the edition ID. The default is 2024 KS2 mathematics. This authoring
utility uses PyMuPDF and Pillow. The website needs no PDF engine.
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
ADDITIONAL_MANIFEST = ROOT / "src/practice/source-editions.json"


def page_data(page, masks, raster):
    for bounds in masks:
        page.add_redact_annot(bounds, fill=(1, 1, 1), cross_out=False)
    if masks:
        page.apply_redactions(images=0, graphics=2, text=0)
    if raster:
        # Preserve fonts, dashed patterns and overlays that SVG conversion can paint incorrectly.
        pixels = page.get_pixmap(dpi=240, alpha=False)
        visual = pixels.pil_tobytes(format="WEBP", lossless=True, method=4)
    else:
        svg = page.get_svg_image(text_as_path=True)
        if not svg.startswith("<svg ") or not svg.endswith("</svg>\n"):
            raise ValueError(f"Invalid SVG for page {page.number + 1}")
        visual = svg.encode()
    spans = []
    for block in page.get_text("dict", flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if span["text"].strip():
                    x, y, right, _ = span["bbox"]
                    spans.append([round(x, 3), round(y, 3), round(right - x, 3), round(span["size"], 3), span["text"]])
    return [base64.b64encode(visual).decode(), spans]


def main():
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: python tools/build-ks2-pages.py /path/to/publisher-pdfs [edition-id]")
    source = Path(sys.argv[1])
    maths = json.loads(MANIFEST.read_text())
    editions = [maths, *json.loads(ADDITIONAL_MANIFEST.read_text())]
    edition_id = sys.argv[2] if len(sys.argv) == 3 else maths["id"]
    manifest = next((edition for edition in editions if edition["id"] == edition_id), None)
    if manifest is None:
        raise ValueError(f"Unknown publisher edition: {edition_id}")
    output = ROOT / "assets" / manifest["assetDirectory"]
    output.mkdir(parents=True, exist_ok=True)
    for volume in manifest["volumes"]:
        path = source / (volume["code"] + ".pdf")
        if hashlib.sha256(path.read_bytes()).hexdigest() != volume["sha256"]:
            raise ValueError(f"Unexpected source revision: {path}")
        with pymupdf.open(path) as doc:
            if len(doc) != volume["pages"]:
                raise ValueError(f"Incomplete source: {path}")
            width, height = doc[0].rect.width, doc[0].rect.height
            raster_pages = set(volume.get("rasterPages", []))
            if not raster_pages.issubset(range(1, len(doc) + 1)):
                raise ValueError(f"Invalid raster page in {path}")
            pages = []
            for i, page in enumerate(doc):
                if page.rect.width != width or page.rect.height != height:
                    raise ValueError(f"Mixed paper sizes: {path}, page {i + 1}")
                masks = volume["logoMasks"].get(str(i + 1), [])
                pages.append(page_data(page, masks, i + 1 in raster_pages))
            payload = json.dumps({"width": width, "height": height, "pages": pages}, ensure_ascii=False, separators=(",", ":"))
            (output / (volume["id"] + ".b64")).write_text(base64.b64encode(zlib.compress(payload.encode(), 9)).decode() + "\n")
            print(volume["id"], len(pages), width, height)


if __name__ == "__main__":
    main()
