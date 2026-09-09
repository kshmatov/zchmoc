.PHONY: help install dev app-dev build check test rust-test verify release clean

help:
	@echo "zchemer — базовые сценарии:"
	@echo "  make install    установить зависимости (npm install)"
	@echo "  make dev        dev-сервер фронтенда (vite)"
	@echo "  make app-dev    приложение целиком в dev-режиме (tauri dev)"
	@echo "  make build      production-сборка фронтенда"
	@echo "  make check      типы и стиль (svelte-check)"
	@echo "  make test       vitest + cargo test"
	@echo "  make rust-test  только cargo test"
	@echo "  make verify     check + все тесты"
	@echo "  make release    релизный бандл (exe + MSI + NSIS)"
	@echo "  make clean      удалить артефакты сборки"

install:
	npm install

dev:
	npm run dev

app-dev:
	npm run tauri dev

build:
	npm run build

check:
	npm run check

test:
	npm test
	cargo test --manifest-path src-tauri/Cargo.toml

rust-test:
	cargo test --manifest-path src-tauri/Cargo.toml

verify:
	npm run check
	npm test
	cargo test --manifest-path src-tauri/Cargo.toml

release:
	npm run tauri build

clean:
	rm -rf .svelte-kit build
	rm -rf src-tauri/target