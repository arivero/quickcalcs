SHELL := /bin/bash

# Resolve esbuild binary; override with `ESBUILD=/path/to/esbuild make`
ESBUILD ?= $(shell if command -v esbuild >/dev/null 2>&1; then command -v esbuild; elif [ -x "$(CURDIR)/node_modules/.bin/esbuild" ]; then echo "$(CURDIR)/node_modules/.bin/esbuild"; else echo esbuild; fi)

ROOT := $(CURDIR)
TMP := $(ROOT)/.tmp

VARIANTS := circular keypad-dual keypad-single columnar-dual round clock
DIST := $(addprefix dist/,$(addsuffix .html,$(VARIANTS)))

TEMPLATE_vertical := variants/shared/templates/base-vertical.html
TEMPLATE_landscape := variants/shared/templates/base-landscape.html

COMMON_TEMPLATES := $(wildcard variants/shared/templates/*.html)
COMMON_FRAGMENTS := $(wildcard variants/shared/fragments/*.html)

# Toggle test harness with `WITH_TESTS=1 make`
WITH_TESTS ?=
INCLUDE_TESTS := $(if $(WITH_TESTS),true,false)
NODE_ENV := $(if $(WITH_TESTS),development,production)

# Variant metadata
ENTRY_circular := src/variants/circular/index.js
TITLE_circular := Swipe Calculator — Canvas
BASE_circular := vertical
HEAD_circular := variants/circular/head.html
BODY_circular := variants/circular/body.html

ENTRY_keypad-dual := src/variants/keypad-dual/index.js
TITLE_keypad-dual := Dual Keypad Calculator
BASE_keypad-dual := landscape
HEAD_keypad-dual := variants/keypad-dual/head.html
BODY_keypad-dual := variants/keypad-dual/body.html

ENTRY_keypad-single := src/variants/keypad-single/index.js
TITLE_keypad-single := Classic Keypad Calculator
BASE_keypad-single := vertical
HEAD_keypad-single := variants/keypad-single/head.html
BODY_keypad-single := variants/keypad-single/body.html

ENTRY_columnar-dual := src/variants/columnar-dual/index.js
TITLE_columnar-dual := Columnar Dual Calculator
BASE_columnar-dual := vertical
HEAD_columnar-dual := variants/columnar-dual/head.html
BODY_columnar-dual := variants/columnar-dual/body.html

ENTRY_round := src/variants/round/index.js
TITLE_round := Fast Calculator — DOM (Round Dial + Swipe)
BASE_round := vertical
HEAD_round := variants/round/head.html
BODY_round := variants/round/body.html

ENTRY_clock := src/variants/clock/index.js
TITLE_clock := Clock Calculator — Inline Dial
BASE_clock := vertical
HEAD_clock := variants/clock/head.html
BODY_clock := variants/clock/body.html

.PHONY: all clean

all: $(DIST)
	@echo "All variants built into dist/"

# Macro to generate build rules per variant
define BUILD_RULE
dist/$(1).html: $$(ENTRY_$(1)) $$(HEAD_$(1)) $$(BODY_$(1)) $$(COMMON_TEMPLATES) $$(COMMON_FRAGMENTS) Makefile
	@set -e; \
	mkdir -p dist "$(TMP)"; \
	SCRIPT_TMP="$(TMP)/bundle-$(1).$$.js"; \
	trap 'rm -f "$$SCRIPT_TMP"' EXIT; \
	"$(ESBUILD)" "$(ROOT)/$$(ENTRY_$(1))" \
	  --bundle \
	  --minify=false \
	  --format=esm \
	  --platform=browser \
	  --target=es2020 \
	  --legal-comments=none \
	  --log-level=warning \
	  --define:__INCLUDE_TESTS__=$(INCLUDE_TESTS) \
	  --define:process.env.NODE_ENV=\"$(NODE_ENV)\" \
	  --outfile="$$SCRIPT_TMP" >/dev/null; \
	python3 scripts/render_template.py \
	  --root "$(ROOT)" \
	  --template "$$(TEMPLATE_$$(BASE_$(1)))" \
	  --head "$$(HEAD_$(1))" \
	  --body "$$(BODY_$(1))" \
	  --script "$$SCRIPT_TMP" \
	  --title "$$(TITLE_$(1))" \
	  --output "$(ROOT)/$$@"
	@echo "Built $(1) → $$@"
endef

$(foreach V,$(VARIANTS),$(eval $(call BUILD_RULE,$(V))))

clean:
	rm -rf dist

.PHONY: publish-docs
publish-docs: all
	@echo "Copying dist/*.html to docs/ (ensure docs assets like icons manifest exist)"
	cp dist/*.html docs/
