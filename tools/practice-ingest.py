#!/usr/bin/env python3
"""Local visual extraction adapter. Raw text and original pixels are never corrected here."""
import argparse
import csv
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys


def capabilities():
    return {"python": sys.executable, "pdfText": bool(importlib.util.find_spec("pdfplumber")), "pdfRender": bool(importlib.util.find_spec("pypdfium2")), "images": bool(importlib.util.find_spec("PIL")), "nativeOCR": platform.system() == "Darwin" and bool(shutil.which("swift")), "tesseractOCR": bool(shutil.which(os.getenv("TESSERACT", "tesseract")))}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def recognize(image, width, height, swift_script):
    if platform.system() == "Darwin" and shutil.which("swift") and Path(swift_script).exists():
        result = subprocess.run([shutil.which("swift"), str(swift_script), str(image)], capture_output=True, text=True, timeout=240)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            for line in data["lines"]:
                x, y, w, h = line["bounds"]
                line["bounds"] = [x * width, y * height, w * width, h * height]
            return data
        native_error = result.stderr.strip()[-1200:]
    else:
        native_error = "Apple Vision requires macOS and Swift."
    executable = shutil.which(os.getenv("TESSERACT", "tesseract"))
    if executable:
        result = subprocess.run([executable, str(image), "stdout", "-l", os.getenv("OCR_LANG", "chi_sim+eng"), "--psm", "3", "tsv"], capture_output=True, text=True, timeout=180)
        if result.returncode:
            raise RuntimeError(result.stderr.strip())
        from PIL import Image
        with Image.open(image) as bitmap:
            sx, sy = width / bitmap.width, height / bitmap.height
        rows = list(csv.DictReader(io.StringIO(result.stdout), delimiter="\t"))
        grouped = {}
        for row in rows:
            if not row.get("text", "").strip() or float(row.get("conf", "-1")) < 0:
                continue
            key = (row["block_num"], row["par_num"], row["line_num"])
            grouped.setdefault(key, []).append(row)
        lines = []
        for words in grouped.values():
            x, y = min(int(w["left"]) for w in words), min(int(w["top"]) for w in words)
            right, bottom = max(int(w["left"]) + int(w["width"]) for w in words), max(int(w["top"]) + int(w["height"]) for w in words)
            lines.append({"text": " ".join(w["text"] for w in words), "confidence": sum(float(w["conf"]) for w in words) / len(words) / 100, "bounds": [x * sx, y * sy, (right-x) * sx, (bottom-y) * sy]})
        return {"engine": "Tesseract local OCR", "lines": lines, "rawText": "\n".join(line["text"] for line in lines), "uncertain": [line["text"] for line in lines if line["confidence"] < .85]}
    raise RuntimeError("No local OCR engine available. " + native_error + " Install Tesseract + chi_sim/eng language data, or use the agent's image/OCR capability and import the corrected transcription separately.")


def image_page(path, out, page_number, width=None, height=None, frame_index=0):
    from PIL import Image, ImageOps
    with Image.open(path) as original:
        original.seek(frame_index)
        image = ImageOps.exif_transpose(original).convert("RGB")
        dpi = original.info.get("dpi")
        assumed = width is None and (not dpi or dpi[0] <= 0 or dpi[1] <= 0)
        if width is None:
            resolution = (300, 300) if assumed else dpi
            width, height = image.width / resolution[0] * 72, image.height / resolution[1] * 72
        target = out / f"page-{page_number:04}.png"
        image.save(target, format="PNG")
        return {"page": page_number, "widthPt": float(width), "heightPt": float(height), "rotation": 0, "pixelWidth": image.width, "pixelHeight": image.height, "physicalSizeAssumed": assumed, "imageFile": str(target), "imageSha256": sha(target), "rawText": "", "regions": [], "uncertain": [], "warnings": []}


def extract(input_path, output_path, ocr, dpi, swift_script):
    source, out = Path(input_path), Path(output_path)
    out.mkdir(parents=True, exist_ok=True)
    pages, warnings = [], []
    if source.suffix.lower() == ".pdf":
        import pypdfium2 as pdfium
        import pdfplumber
        with pdfplumber.open(source) as text_pdf:
            visual_pdf = pdfium.PdfDocument(str(source))
            try:
                for i, page in enumerate(text_pdf.pages):
                    visual_page = visual_pdf[i]
                    image = visual_page.render(scale=dpi/72).to_pil().convert("RGB")
                    image_path = out / f"page-{i+1:04}.png"
                    image.save(image_path, format="PNG")
                    width, height = visual_page.get_size()
                    entry = {"page": i+1, "widthPt": float(width), "heightPt": float(height), "rotation": int(page.rotation or 0), "pixelWidth": image.width, "pixelHeight": image.height, "physicalSizeAssumed": False, "imageFile": str(image_path), "imageSha256": sha(image_path), "rawText": page.extract_text(x_tolerance=2, y_tolerance=3) or "", "regions": [], "uncertain": [], "warnings": [], "method": "PDF text layer"}
                    # Keep individual word boxes and font measurements; no fabricated line positions.
                    for j, word in enumerate(page.extract_words(extra_attrs=["fontname", "size"])):
                        entry["regions"].append({"id": f"p{i+1}-text-{j+1}", "type": "text", "bounds": [word["x0"], word["top"], word["x1"]-word["x0"], word["bottom"]-word["top"]], "text": word["text"], "font": word.get("fontname"), "fontSize": word.get("size"), "confidence": 1})
                    for j, item in enumerate(page.images):
                        entry["regions"].append({"id": f"p{i+1}-image-{j+1}", "type": "image", "bounds": [item["x0"], item["top"], item["x1"]-item["x0"], item["bottom"]-item["top"]]})
                    for j, line in enumerate(page.lines + page.rects):
                        entry["regions"].append({"id": f"p{i+1}-line-{j+1}", "type": "line", "bounds": [line["x0"], line["top"], line["x1"]-line["x0"], line["bottom"]-line["top"]], "lineWidth": line.get("linewidth", 1)})
                    use_ocr = ocr == "always" or (ocr == "auto" and len(entry["rawText"].strip()) < 20)
                    if use_ocr:
                        entry["textLayerText"] = entry["rawText"]
                        try:
                            result = recognize(image_path, width, height, swift_script)
                            entry["rawText"], entry["method"], entry["uncertain"] = result["rawText"], result["engine"], result["uncertain"]
                            entry["regions"] = [region for region in entry["regions"] if region["type"] != "text"] + [{"id": f"p{i+1}-ocr-{j+1}", "type": "text", **line} for j, line in enumerate(result["lines"])]
                            entry["ocrReviewRequired"] = True
                        except Exception as error:
                            entry["method"] = "needs-ocr"
                            entry["warnings"].append(str(error))
                    elif not entry["rawText"].strip():
                        entry["method"] = "needs-ocr"
                    entry["status"] = "needs-ocr" if not entry["rawText"].strip() else "needs-review" if entry.get("ocrReviewRequired") else "ready"
                    pages.append(entry)
                    visual_page.close()
            finally:
                visual_pdf.close()
    else:
        from PIL import Image
        with Image.open(source) as original:
            frame_count = getattr(original, "n_frames", 1) if source.suffix.lower() in (".tif", ".tiff") else 1
        for frame_index in range(frame_count):
            entry = image_page(source, out, frame_index + 1, frame_index=frame_index)
            entry["method"] = "needs-ocr"
            if entry["physicalSizeAssumed"]:
                entry["warnings"].append("Image has no reliable DPI metadata; physical page size uses 300 dpi. Set measured width/height before claiming physical 1:1.")
            if ocr != "never":
                try:
                    result = recognize(entry["imageFile"], entry["widthPt"], entry["heightPt"], swift_script)
                    entry["rawText"], entry["method"], entry["uncertain"] = result["rawText"], result["engine"], result["uncertain"]
                    entry["regions"] = [{"id": f"p{frame_index+1}-ocr-{j+1}", "type": "text", **line} for j, line in enumerate(result["lines"])]
                    entry["ocrReviewRequired"] = True
                except Exception as error:
                    entry["warnings"].append(str(error))
            entry["status"] = "needs-review" if entry["rawText"].strip() else "needs-ocr"
            pages.append(entry)
    for page in pages:
        for region in page["regions"]:
            # OCR glyphs outside the crop are reported, not silently moved.
            if any(not isinstance(n, (int, float)) or not math.isfinite(n) for n in region["bounds"]):
                raise ValueError("Non-finite layout coordinate")
        if page.get("ocrReviewRequired"):
            page["warnings"].append("OCR transcription requires visual review of formulas, symbols, negation, units, option letters and reading order. rawText is unchanged; use corrections separately.")
    return {"pages": pages, "warnings": warnings, "capabilities": capabilities()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", nargs="?")
    parser.add_argument("--out")
    parser.add_argument("--ocr", choices=["auto", "always", "never"], default="auto")
    parser.add_argument("--dpi", type=int, default=200)
    parser.add_argument("--swift", default=str(Path(__file__).with_name("practice-ocr.swift")))
    parser.add_argument("--capabilities", action="store_true")
    args = parser.parse_args()
    try:
        if args.capabilities:
            print(json.dumps(capabilities()))
        else:
            if not args.input or not args.out:
                parser.error("input and --out required")
            print(json.dumps(extract(args.input, args.out, args.ocr, args.dpi, args.swift), ensure_ascii=False))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
