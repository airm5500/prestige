#!/usr/bin/env python3
"""Generate a dependency-free PDF from the Prestige/Phénix comparison Markdown."""
from pathlib import Path
import argparse
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "comparatif-prestige-phenix.md"
TARGET = ROOT / "docs" / "comparatif-prestige-phenix.pdf"
PAGE_W, PAGE_H = 595, 842  # A4 points
LEFT, RIGHT, TOP, BOTTOM = 48, 48, 56, 52
BLUE = (0.08, 0.25, 0.43)
CYAN = (0.05, 0.55, 0.65)
DARK = (0.12, 0.15, 0.18)
GREY = (0.38, 0.42, 0.46)


def pdf_text(value: str) -> str:
    value = value.replace("**", "").replace("`", "")
    value = re.sub(r"\[([^]]+)]\(([^)]+)\)", r"\1 (\2)", value)
    raw = value.encode("cp1252", "replace")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)").decode("latin1")


def wrapped(value: str, size: float, indent: int = 0):
    width = PAGE_W - LEFT - RIGHT - indent
    chars = max(18, int(width / (size * 0.52)))
    return textwrap.wrap(value, width=chars, break_long_words=True, break_on_hyphens=False,
                         replace_whitespace=False, drop_whitespace=True) or [""]


class Document:
    def __init__(self):
        self.pages = []
        self.commands = []
        self.y = PAGE_H - TOP
        self.page_no = 0
        self.new_page()

    def new_page(self):
        if self.commands:
            self.pages.append("\n".join(self.commands))
        self.page_no += 1
        self.commands = []
        self.y = PAGE_H - TOP
        # Header rule and footer are repeated on every page.
        self.commands.append(f"{BLUE[0]} {BLUE[1]} {BLUE[2]} RG 48 {PAGE_H-38} m {PAGE_W-48} {PAGE_H-38} l S")
        self.commands.append("BT /F2 8 Tf 0.38 0.42 0.46 rg 48 24 Td (PRESTIGE - RAPPORT STRATEGIQUE) Tj ET")
        self.commands.append(f"BT /F1 8 Tf 0.38 0.42 0.46 rg {PAGE_W-82} 24 Td ({self.page_no}) Tj ET")

    def ensure(self, height):
        if self.y - height < BOTTOM:
            self.new_page()

    def rule(self, color=CYAN, thickness=1):
        self.ensure(10)
        self.commands.append(f"{color[0]} {color[1]} {color[2]} RG {thickness} w {LEFT} {self.y} m {PAGE_W-RIGHT} {self.y} l S")
        self.y -= 9

    def paragraph(self, value, size=9.4, leading=12.2, font="F1", color=DARK, indent=0,
                  before=2, after=5):
        lines = wrapped(value, size, indent)
        self.ensure(before + after + leading * len(lines))
        self.y -= before
        x = LEFT + indent
        for line in lines:
            self.commands.append(
                f"BT /{font} {size:.1f} Tf {color[0]} {color[1]} {color[2]} rg {x} {self.y:.1f} Td ({pdf_text(line)}) Tj ET"
            )
            self.y -= leading
        self.y -= after

    def heading(self, value, level):
        if level == 1:
            self.ensure(86)
            self.commands.append(f"{BLUE[0]} {BLUE[1]} {BLUE[2]} rg 0 {self.y-58} {PAGE_W} 76 re f")
            lines = wrapped(value, 21, 12)
            yy = self.y - 10
            for line in lines:
                self.commands.append(f"BT /F2 21 Tf 1 1 1 rg {LEFT} {yy} Td ({pdf_text(line)}) Tj ET")
                yy -= 25
            self.y -= 84
            return
        size = {2: 15, 3: 11.5}.get(level, 10)
        leading = size + 3
        lines = wrapped(value, size)
        required = 14 + leading * len(lines)
        self.ensure(required)
        self.y -= 8
        color = BLUE if level == 2 else CYAN
        for line in lines:
            self.commands.append(
                f"BT /F2 {size} Tf {color[0]} {color[1]} {color[2]} rg {LEFT} {self.y} Td ({pdf_text(line)}) Tj ET"
            )
            self.y -= leading
        if level == 2:
            self.rule(color, 0.8)
        else:
            self.y -= 3

    def bullet(self, value, numbered=None):
        marker = f"{numbered}." if numbered else "•"
        lines = wrapped(value, 9.2, 18)
        self.ensure(12 * len(lines) + 3)
        self.commands.append(f"BT /F2 9.2 Tf {CYAN[0]} {CYAN[1]} {CYAN[2]} rg {LEFT+2} {self.y} Td ({pdf_text(marker)}) Tj ET")
        for line in lines:
            self.commands.append(f"BT /F1 9.2 Tf {DARK[0]} {DARK[1]} {DARK[2]} rg {LEFT+18} {self.y} Td ({pdf_text(line)}) Tj ET")
            self.y -= 11.8
        self.y -= 2

    def code(self, lines):
        output = []
        for line in lines:
            output.extend(wrapped(line, 8.2, 22))
        height = len(output) * 10.5 + 16
        self.ensure(height)
        self.commands.append(f"0.95 0.97 0.98 rg {LEFT} {self.y-height+4} {PAGE_W-LEFT-RIGHT} {height} re f")
        yy = self.y - 8
        for line in output:
            self.commands.append(f"BT /F3 8.2 Tf 0.17 0.22 0.27 rg {LEFT+10} {yy} Td ({pdf_text(line)}) Tj ET")
            yy -= 10.5
        self.y -= height + 4

    def table(self, rows):
        if not rows:
            return
        # Preserve every cell while favoring legibility over rigid narrow columns.
        headers = rows[0]
        self.ensure(28)
        self.commands.append(f"{BLUE[0]} {BLUE[1]} {BLUE[2]} rg {LEFT} {self.y-18} {PAGE_W-LEFT-RIGHT} 22 re f")
        self.paragraph("  |  ".join(headers), size=8.2, leading=10, font="F2", color=(1, 1, 1), before=4, after=6)
        for index, row in enumerate(rows[1:]):
            text = " — ".join(f"{headers[i] if i < len(headers) else 'Colonne'} : {cell}" for i, cell in enumerate(row))
            self.paragraph(text, size=8.2, leading=10.4, color=DARK if index % 2 == 0 else GREY, before=1, after=3)
        self.y -= 3

    def finish(self):
        if self.commands:
            self.pages.append("\n".join(self.commands))
        return self.pages


def parse_markdown(text):
    doc = Document()
    lines = text.splitlines()
    i = 0
    paragraph = []

    def flush():
        nonlocal paragraph
        if paragraph:
            doc.paragraph(" ".join(x.strip() for x in paragraph))
            paragraph = []

    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            flush()
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            doc.code(code)
        elif re.match(r"^#{1,4} ", line):
            flush()
            match = re.match(r"^(#{1,4}) (.*)", line)
            doc.heading(match.group(2), len(match.group(1)))
        elif line.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", c or "") for c in cells):
                    rows.append(cells)
                i += 1
            doc.table(rows)
            continue
        elif re.match(r"^\d+\. ", line):
            flush()
            match = re.match(r"^(\d+)\. (.*)", line)
            doc.bullet(match.group(2), match.group(1))
        elif line.startswith("- "):
            flush()
            doc.bullet(line[2:])
        elif line.startswith("> "):
            flush()
            doc.paragraph(line[2:], size=10.5, leading=14, font="F2", color=BLUE, indent=12, before=6, after=8)
        elif line.startswith(":codex-annotation{"):
            # Directive required in the Markdown review source, not reader-facing report content.
            flush()
        elif line.strip() == "---":
            flush()
            doc.rule()
        elif not line.strip():
            flush()
        else:
            paragraph.append(line)
        i += 1
    flush()
    return doc.finish()


def make_pdf(page_streams, target, title="Rapport Prestige"):
    objects = [None]
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(None)  # pages tree
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")
    page_ids = []
    for stream in page_streams:
        data = stream.encode("latin1", "replace")
        content_id = len(objects)
        objects.append(f"<< /Length {len(data)} >>\nstream\n".encode() + data + b"\nendstream")
        page_id = len(objects)
        page_ids.append(page_id)
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents {content_id} 0 R >>".encode()
        )
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

    payload = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, obj in enumerate(objects[1:], 1):
        offsets.append(len(payload))
        payload.extend(f"{number} 0 obj\n".encode())
        payload.extend(obj)
        payload.extend(b"\nendobj\n")
    xref = len(payload)
    payload.extend(f"xref\n0 {len(objects)}\n".encode())
    payload.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        payload.extend(f"{offset:010d} 00000 n \n".encode())
    payload.extend(
        f"trailer\n<< /Size {len(objects)} /Root 1 0 R /Info << /Title ({pdf_text(title)}) "
        f"/Author (Equipe Prestige) >> >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    target.write_bytes(payload)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=SOURCE, help="Markdown source")
    parser.add_argument("target", nargs="?", type=Path, default=TARGET, help="PDF destination")
    parser.add_argument("--title", default="Rapport Prestige", help="PDF metadata title")
    args = parser.parse_args()
    source = args.source if args.source.is_absolute() else ROOT / args.source
    target = args.target if args.target.is_absolute() else ROOT / args.target
    target.parent.mkdir(parents=True, exist_ok=True)
    pages = parse_markdown(source.read_text(encoding="utf-8"))
    make_pdf(pages, target, args.title)
    print(f"Generated {target.relative_to(ROOT)} ({len(pages)} pages, {target.stat().st_size} bytes)")
