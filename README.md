# DevDoc AI

Akıllı kod dokümantasyon motoru — yerel projeleri tarar, sembolleri çıkarır ve Obsidian uyumlu bir bilgi bankası (vault) üretir.

## Özellikler

| Modül | Açıklama |
|--------|----------|
| **Code Analyzer** | Proje klasörünü özyinelemeli tarar; fonksiyon, sınıf ve import'ları sezgisel (regex) ayrıştırır |
| **Obsidian Generator** | Her kaynak dosya için `.md` notu ve `[[wiki-link]]` ilişkileri oluşturur |
| **Frontend** | 3 sütunlu arayüz: dosya ağacı, analiz paneli, vault önizleme |
| **Claude (stub)** | `ANTHROPIC_API_KEY` ile gelecekte gerçek mimari analiz entegrasyonu |

## Kurulum

```bash
npm install
cp .env.example .env
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Kullanım

1. Üst çubukta yerel proje yolunu girin (ör. `C:\Users\...\my-project`)
2. **Tara** — dosya ağacı ve semboller yüklenir
3. Soldan bir dosya seçin — orta panelde semboller ve yer tutucu analiz görünür
4. **Vault Oluştur** — `vault-output/` altında Obsidian notları üretilir
5. Sağ panelde markdown önizleme ve bağlantı grafiği

## API

| Endpoint | Metot | Gövde | Açıklama |
|----------|-------|-------|----------|
| `/api/scan` | POST | `{ "projectPath": "..." }` | Tarama + ayrıştırma |
| `/api/generate-vault` | POST | `{ "scanResult": {...} }` veya `{ "projectPath": "..." }` | Vault üretimi |
| `/api/vault` | GET | — | Oluşturulan `.md` dosyalarını listeler |

## Klasör yapısı

```
src/
  app/                 # Sayfalar ve API route'ları
  components/          # FileTree, AnalysisPanel, ObsidianPreview
  lib/
    analyzer/          # scanner.ts, parser.ts
    obsidian/          # generator.ts
    claude/            # API stub
  types/
```

## Sınırlamalar (v1)

- Ayrıştırıcı tam AST değil; karmaşık sözdizimini kaçırabilir
- Claude API henüz bağlı değil — analiz metinleri yer tutucu
- Tarama yalnızca sunucu tarafında çalışır; yol doğrulaması (var mı, dizin mi) yapılır
- Desteklenen uzantılar: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.vue`, `.svelte`

## Sonraki adımlar

1. `src/lib/claude/client.ts` içinde Anthropic Messages API çağrısı
2. Dosya seçildiğinde sunucu action ile gerçek mimari analiz
3. Daha sağlam ayrıştırma (tree-sitter / typescript compiler API)
4. Vault için grafik görselleştirme (D3 / vis-network)

## Betikler

- `npm run dev` — geliştirme sunucusu
- `npm run build` — üretim derlemesi
- `npm run lint` — ESLint

## Lisans

Özel proje — AL Engineer.
