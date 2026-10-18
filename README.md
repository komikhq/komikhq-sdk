# @komikhq/sdk-generator

Pusat generator multi-language Client SDK untuk ekosistem **KomikHQ**. Repositori ini bertindak sebagai *hub* independen yang mengambil spek OpenAPI dari endpoint produksi dan menghasilkan SDK siap rilis untuk masing-masing bahasa target.

---

## 🎯 Target SDK

| Bahasa | Package Registry | Repositori Target | Generator |
|---|---|---|---|
| **TypeScript / JS** | npm: [`@komikhq/komikhq-typescript`](https://www.npmjs.com/package/@komikhq/komikhq-typescript) | [`komikhq/komikhq-typescript`](https://github.com/komikhq/komikhq-typescript) | `typescript-fetch` |
| **PHP** | Packagist: [`komikhq/komikhq-php`](https://packagist.org/packages/komikhq/komikhq-php) | [`komikhq/komikhq-php`](https://github.com/komikhq/komikhq-php) | `php` (PSR-18 / Guzzle) |

---

## 🚀 Penggunaan Lokal

### 1. Prasyarat
- Node.js 22+ / 24+
- pnpm 11+ / 12+
- Java JRE 11+ (dibutuhkan oleh OpenAPI Generator CLI)

### 2. Instalasi Dependensi
```bash
pnpm install
```

### 3. Perintah CLI Generator
```bash
# Generate seluruh target SDK sekaligus
pnpm generate:all

# Generate khusus TypeScript
pnpm generate:ts

# Generate khusus PHP
pnpm generate:php

# Generate dengan URL / path spek custom
pnpm generate typescript --spec https://api.komikhq.com/openapi.json

# Generate langsung ke direktori repo sebelah (polyrepo target)
pnpm generate typescript --out ../komikhq-typescript
pnpm generate php --out ../komikhq-php
```

---

## 📁 Struktur Modul (Modular Architecture)

```text
komikhq-sdk/
├── .github/workflows/
│   ├── generate-typescript.yml   # Workflow terpisah untuk TypeScript SDK
│   ├── generate-php.yml          # Workflow terpisah untuk PHP SDK
│   └── check-spec.yml            # Validasi kesehatan endpoint OpenAPI
├── src/
│   ├── index.ts                  # CLI entrypoint murni
│   ├── config/
│   │   ├── types.ts              # Antarmuka tipe data TargetKey & GeneratorTarget
│   │   ├── targets.ts            # Spesifikasi generator per bahasa & additionalProperties
│   │   └── index.ts              # Barrel exports
│   └── core/
│       ├── runner.ts             # Spawn execution openapi-generator CLI
│       └── hooks.ts              # Lifecycle hooks (beforeGenerate, afterGenerate, copy LICENSE)
├── templates/                    # Full templates Mustache bawaan generator
│   ├── typescript-fetch/         # Set lengkap .mustache TypeScript
│   └── php/                      # Set lengkap .mustache PHP
└── out/                          # Output lokal sementara (gitignored)
    ├── typescript/
    └── php/
```

---

## 🤖 CI/CD Workflow

Pipeline GitHub Actions di repositori ini bekerja secara terpisah:
- **`generate-typescript.yml`**: Mengunduh spek OpenAPI, mengompilasi SDK TypeScript, dan mem-push hasil ke repositori `komikhq/komikhq-typescript`.
- **`generate-php.yml`**: Mengunduh spek OpenAPI, mengompilasi SDK PHP, dan mem-push hasil ke repositori `komikhq/komikhq-php`.
- **`check-spec.yml`**: Memastikan endpoint `https://api.komikhq.com/openapi.json` selalu aktif dan valid.
