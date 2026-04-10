# ─────────────────────────────────────────────────────────────────
# resume_parser.py — Reads PDF resume and cleans duplicate text
# ─────────────────────────────────────────────────────────────────

import os
from pypdf import PdfReader

RESUME_PDF = "resume.pdf"
RESUME_TXT = "resume.txt"


def clean_text(text):
    """
    Removes duplicate lines that appear because PDF headers/footers
    repeat on every page (very common with designed resume templates).

    Strategy:
      1. Split into lines
      2. Keep track of lines already seen
      3. Only add a line if we haven't seen it before
    """
    lines = text.split("\n")
    seen       = set()    # stores lines we've already added
    clean      = []       # final list of unique lines
    seen_count = {}       # count how many times each line appears
    

    # First pass — count occurrences of each line
    for line in lines:
        stripped = line.strip()
        
        if stripped:
            seen_count[stripped] = seen_count.get(stripped, 0) + 1

    # Second pass — keep lines that appear only once OR
    # are important content (longer lines are usually real content)
    for line in lines:
        stripped = line.strip()
        if not stripped:
            # Keep blank lines for readability but limit consecutive ones
            if clean and clean[-1] != "":
                clean.append("")
            continue

        # Skip if seen before AND it appeared many times (header/footer)
        if stripped in seen and seen_count[stripped] > 2:
            continue

        seen.add(stripped)
        clean.append(stripped)

    return "\n".join(clean).strip()


def extract_resume_text(pdf_path=RESUME_PDF):
    """Reads PDF and returns cleaned text."""
    if not os.path.exists(pdf_path):
        print(f"  ERROR: '{pdf_path}' not found.")
        print(f"  Rename your resume to 'resume.pdf' in job-bot folder.")
        return None

    print(f"  Reading: {pdf_path}")
    reader   = PdfReader(pdf_path)
    all_text = []

    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text()
        if text:
            all_text.append(text)
        print(f"  Page {page_num}: {len(text or '')} chars")

    raw_text   = "\n".join(all_text).strip()
    clean      = clean_text(raw_text)

    print(f"  Raw: {len(raw_text)} chars → Cleaned: {len(clean)} chars")
    return clean


def save_resume_text(text, path=RESUME_TXT):
    """Saves cleaned text to resume.txt."""
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"  Saved to {path}")


def load_resume_text(path=RESUME_TXT):
    """
    Loads from resume.txt if exists (fast).
    Falls back to reading PDF if not (slow, only once).
    """
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
        if text:
            print(f"  Loaded resume.txt ({len(text)} chars)")
            return text

    print("  No cache — reading PDF...")
    text = extract_resume_text()
    if text:
        save_resume_text(text)
    return text


# ── Quick test ──────────────────────────────────────────────────
if __name__ == "__main__":
    # Delete old resume.txt so we re-parse with new cleaner
    if os.path.exists(RESUME_TXT):
        os.remove(RESUME_TXT)
        print("  Deleted old resume.txt — re-parsing...")

    print("Resume Parser")
    print("-" * 40)
    text = load_resume_text()

    if text:
        print("\nCleaned resume (first 600 chars):")
        print("-" * 40)
        print(text[:600])
        print("-" * 40)
        print(f"\nTotal length: {len(text)} characters")
        print("Resume parsed successfully!")
    else:
        print("Failed — check error above.")