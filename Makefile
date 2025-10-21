SHELL := /bin/bash

# Configure esbuild binary: override with `ESBUILD=/path/to/esbuild make`
ESBUILD ?= $(shell command -v esbuild 2>/dev/null || echo esbuild)

VARIANTS := circular keypad-dual keypad-single columnar-dual
DIST := $(addprefix dist/,$(addsuffix .html,$(VARIANTS)))

COMMON_TEMPLATES := $(wildcard variants/shared/templates/*.html)
COMMON_FRAGMENTS := $(wildcard variants/shared/fragments/*.html)

.PHONY: all clean

all: $(DIST)
	@echo "All variants built into dist/"

dist/circular.html: src/variants/circular/index.js variants/circular/head.html variants/circular/body.html $(COMMON_TEMPLATES) $(COMMON_FRAGMENTS) scripts/build.sh
	ESBUILD="$(ESBUILD)" WITH_TESTS=$(WITH_TESTS) scripts/build.sh --only circular

dist/keypad-dual.html: src/variants/keypad-dual/index.js variants/keypad-dual/head.html variants/keypad-dual/body.html $(COMMON_TEMPLATES) $(COMMON_FRAGMENTS) scripts/build.sh
	ESBUILD="$(ESBUILD)" WITH_TESTS=$(WITH_TESTS) scripts/build.sh --only keypad-dual

dist/keypad-single.html: src/variants/keypad-single/index.js variants/keypad-single/head.html variants/keypad-single/body.html $(COMMON_TEMPLATES) $(COMMON_FRAGMENTS) scripts/build.sh
	ESBUILD="$(ESBUILD)" WITH_TESTS=$(WITH_TESTS) scripts/build.sh --only keypad-single

dist/columnar-dual.html: src/variants/columnar-dual/index.js variants/columnar-dual/head.html variants/columnar-dual/body.html $(COMMON_TEMPLATES) $(COMMON_FRAGMENTS) scripts/build.sh
	ESBUILD="$(ESBUILD)" WITH_TESTS=$(WITH_TESTS) scripts/build.sh --only columnar-dual

clean:
	rm -rf dist

