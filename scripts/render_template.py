#!/usr/bin/env python3
import argparse
from pathlib import Path
import re


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render QuickCalcs template with fragments and bundled script.")
    parser.add_argument("--root", required=True, help="Repository root path")
    parser.add_argument("--template", required=True, help="Base template path (relative to root)")
    parser.add_argument("--head", default="", help="Variant head HTML path (relative to root)")
    parser.add_argument("--body", default="", help="Variant body HTML path (relative to root)")
    parser.add_argument("--script", required=True, help="Path to bundled JS (absolute)")
    parser.add_argument("--title", required=True, help="Document title")
    parser.add_argument("--output", required=True, help="Destination HTML file (absolute)")
    return parser.parse_args()


def build_renderer(root: Path):
    include_re = re.compile(r"\{\{\s*>\s*([^\s}]+)\s*\}\}")
    cache: dict[Path, str] = {}

    def load_fragment(rel_path: str) -> str:
        fragment_path = (root / rel_path).resolve()
        cached = cache.get(fragment_path)
        if cached is not None:
            return cached
        text = fragment_path.read_text(encoding="utf-8").strip()
        rendered = apply_fragments(text)
        cache[fragment_path] = rendered
        return rendered

    def apply_fragments(content: str) -> str:
        rendered = content
        while True:
            match = include_re.search(rendered)
            if not match:
                break
            fragment = load_fragment(match.group(1))
            rendered = rendered[: match.start()] + fragment + rendered[match.end() :]
        return rendered

    def render_relative(rel_path: str) -> str:
        if not rel_path:
            return ""
        return apply_fragments((root / rel_path).read_text(encoding="utf-8")).strip()

    return render_relative, apply_fragments


def main() -> None:
    args = parse_args()
    root = Path(args.root)
    template_path = root / args.template
    render_relative, _ = build_renderer(root)

    head_html = render_relative(args.head)
    body_html = render_relative(args.body)
    script_text = Path(args.script).read_text(encoding="utf-8").strip()

    template = template_path.read_text(encoding="utf-8")
    template = template.replace("<!--__TITLE__-->", args.title)
    template = template.replace("<!--__HEAD__-->", head_html + ("\n" if head_html else ""))
    template = template.replace("<!--__BODY__-->", body_html + ("\n" if body_html else ""))
    template = template.replace("/*__SCRIPT__*/", script_text)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(template, encoding="utf-8")


if __name__ == "__main__":
    main()
