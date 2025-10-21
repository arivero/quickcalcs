#!/usr/bin/env bash
set -euo pipefail

# Build QuickCalcs variants using esbuild CLI and simple template expansion.
# Usage:
#   ESBUILD=/path/to/esbuild scripts/build.sh [--with-tests] [--only <slug>]
# or via Makefile: `make` or `WITH_TESTS=1 make`

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WITH_TESTS=0
ONLY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-tests)
      WITH_TESTS=1; shift ;;
    --only)
      ONLY="${2:-}"; shift 2 ;;
    *)
      echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Resolve esbuild CLI
if [[ -n "${ESBUILD:-}" ]]; then
  if ! command -v "$ESBUILD" >/dev/null 2>&1 && [[ ! -x "$ESBUILD" ]]; then
    ESBUILD=""
  fi
fi
if [[ -z "${ESBUILD:-}" ]]; then
  for cand in esbuild esbuild-darwin-64 esbuild-linux-64 ./esbuild ./bin/esbuild "$ROOT/esbuild" "$ROOT/bin/esbuild" "$ROOT/node_modules/.bin/esbuild"; do
    if command -v "$cand" >/dev/null 2>&1; then ESBUILD="$(command -v "$cand")"; break; fi
    if [[ -x "$cand" ]]; then ESBUILD="$cand"; break; fi
  done
fi
if [[ -z "${ESBUILD:-}" ]]; then
  cat >&2 <<'EOF'
esbuild CLI not found.
 - Install a standalone esbuild binary and ensure it's on PATH, or
 - Pass ESBUILD=/path/to/esbuild when invoking this script.
Homebrew example (macOS):
  brew install esbuild
EOF
  exit 1
fi

apply_fragments() {
  local path="$1"
  ROOT="$ROOT" perl -0777 -e '
    use strict; use warnings;
    my $root = $ENV{ROOT};
    my $in = $ARGV[0];
    sub slurp {
      my ($p) = @_;
      open my $fh, "<", $p or die "Cannot open $p: $!";
      local $/ = undef; my $c = <$fh>; close $fh; return $c;
    }
    my $out = slurp($in);
    while ($out =~ /\{\{\s*>\s*([^\s}]+)\s*\}\}/) {
      my $inc = $1;
      my $incPath = ($inc =~ m{^/}) ? $inc : "$root/$inc";
      my $frag = slurp($incPath);
      $out =~ s/\{\{\s*>\s*\Q$inc\E\s*\}\}/$frag/;
    }
    print $out;
  ' "$path"
}

compose_html() {
  local template="$1" title="$2" head="$3" body="$4" script="$5" out="$6"
  perl -0777 -e '
    use strict; use warnings;
    my ($templatePath, $title, $head, $body, $script, $outPath) = @ARGV;
    local $/ = undef;
    open my $fh, "<", $templatePath or die $!;
    my $t = <$fh>; close $fh;
    $t =~ s/<!--__TITLE__-->/$title/g;
    $t =~ s/<!--__HEAD__-->/$head\n/g;
    $t =~ s/<!--__BODY__-->/$body\n/g;
    $t =~ s/\/\*__SCRIPT__\*\//$script/g;
    open my $out, ">", $outPath or die $!;
    print $out $t; close $out;
  ' "$template" "$title" "$head" "$body" "$script" "$out"
}

bundle_js() {
  local entry="$1" include_tests="$2" node_env="$3"
  local tmpdir="$ROOT/.tmp"; mkdir -p "$tmpdir"
  local outfile="$tmpdir/bundle-$$-$RANDOM.js"
  "$ESBUILD" "$entry" \
    --bundle \
    --minify=false \
    --format=esm \
    --platform=browser \
    --target=es2019 \
    --legal-comments=none \
    --define:__INCLUDE_TESTS__="$include_tests" \
    --define:process.env.NODE_ENV=\"$node_env\" \
    --outfile="$outfile" >/dev/null
  cat "$outfile"
  rm -f "$outfile"
}

build_variant() {
  local slug="$1" entry="$2" title="$3" base="$4" head="$5" body="$6" out="$7"
  local template
  case "$base" in
    vertical) template="$ROOT/variants/shared/templates/base-vertical.html" ;;
    landscape) template="$ROOT/variants/shared/templates/base-landscape.html" ;;
    *) echo "Unknown template base: $base" >&2; return 1 ;;
  esac
  local head_html="" body_html=""
  [[ -n "$head" ]] && head_html="$(apply_fragments "$ROOT/$head")"
  [[ -n "$body" ]] && body_html="$(apply_fragments "$ROOT/$body")"

  local include_tests="false" node_env="production"
  if [[ "$WITH_TESTS" -eq 1 ]]; then include_tests="true"; node_env="development"; fi

  local script_js
  script_js="$(bundle_js "$ROOT/$entry" "$include_tests" "$node_env")"

  mkdir -p "$(dirname "$ROOT/$out")"
  compose_html "$template" "$title" "$head_html" "$body_html" "$script_js" "$ROOT/$out"
  echo "Built $slug → $out"
}

variants_build() {
  # slug|entry|title|base|head|body|out
  local defs=(
    "circular|src/variants/circular/index.js|Swipe Calculator — Canvas|vertical|variants/circular/head.html|variants/circular/body.html|dist/circular.html"
    "keypad-dual|src/variants/keypad-dual/index.js|Dual Keypad Calculator|landscape|variants/keypad-dual/head.html|variants/keypad-dual/body.html|dist/keypad-dual.html"
    "keypad-single|src/variants/keypad-single/index.js|Classic Keypad Calculator|vertical|variants/keypad-single/head.html|variants/keypad-single/body.html|dist/keypad-single.html"
    "columnar-dual|src/variants/columnar-dual/index.js|Columnar Dual Calculator|vertical|variants/columnar-dual/head.html|variants/columnar-dual/body.html|dist/columnar-dual.html"
  )
  for def in "${defs[@]}"; do
    IFS='|' read -r slug entry title base head body out <<<"$def"
    if [[ -n "$ONLY" && "$ONLY" != "$slug" ]]; then continue; fi
    build_variant "$slug" "$entry" "$title" "$base" "$head" "$body" "$out"
  done
}

variants_build
