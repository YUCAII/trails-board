# Build and maintain Trails Board

## Editable files

- `app/data.zh.json`: original quest and achievement data. Keep IDs and quest logic unchanged when editing translations.
- `app/translation-items.json`: stable IDs for 1,560 distinct Chinese content strings.
- `app/translations/translated-*.json`: English and Japanese pairs, keyed by the stable translation ID.
- `app/i18n-ui.json` and `app/i18n-messages.json`: UI labels and complete dynamic sentences.
- `app/i18n.js`: offline language state, DOM translation and cross-language search.
- `app/main.js`: quest, choice and achievement renderer.
- `app/i18n.css`: layout adjustments for longer translated text.
- `app/original.html`: original HTML/CSS shell; its inline scripts are removed during the build.
- `android-template/`: original APK's compiled WebView shell, manifest, resources and launcher icons. The original Android Java/Kotlin sources are not available.

## Build the offline page

Use Python 3.10 or newer:

```sh
python tools/build_web.py
```

The generator rejects duplicate translation IDs, empty translation pairs and missing source strings. It writes the self-contained `app/index.html` and generated `app/catalogue.json` without contacting any service.

Preview it locally:

```sh
python -m http.server 8120 --bind 127.0.0.1 --directory app
```

Open `http://127.0.0.1:8120`. A browser preview uses its own local progress store, separate from the Android application.

## Run integration checks

Use Node.js 20 or newer and npm:

```sh
npm install
npm test
```

Tests exercise all translation strings, 87 quests × 4 tabs in all three languages, chapters, choices, both achievement lists, cross-language search, progress persistence, language changes and quest filters. The English DOM check also inspects accessibility labels, placeholders and tooltip titles for leftover Chinese text. Language menu option names deliberately remain in their native scripts.

Latest results are recorded in `qa/I18N_TEST_RESULTS.json`. Browser screenshots are in `docs/screenshots/`. Browser validation and signature checks do not substitute for Android device installation testing.

## Build and sign the APK

Install Python dependencies, a supported Java runtime and official Android SDK Build Tools (35.0.0 was used for this release):

```sh
python -m pip install -r requirements.txt
python tools/build_apk.py --java "/path/to/java" --apksigner "/path/to/android/build-tools/35.0.0/lib/apksigner.jar"
```

On Windows, pass absolute paths to `java.exe` and `apksigner.jar`. The bundled shell is repackaged with `com.trails.board.multilang`, version name `10.0`, version code `10`, and the fully qualified launcher class `com.trails.board.MainActivity`.

The first build generates a local RSA key and certificate in `.private-signing/`; later builds reuse them. **Keep this directory private and backed up.** Never commit or upload its files. Building from a fresh clone creates a different signing identity, so it cannot update an installation signed with the publisher's existing key. The publisher's original key stays on the publishing machine.

Outputs:

- `dist/trails_board_v10_multilang.apk`
- `dist/SHA256SUMS.txt`
- `dist/release-metadata.json`
- `dist/APK_VERIFICATION.txt`

The script runs official `apksigner verify` before reporting success. Use `aapt dump badging` to inspect the final package if desired. For a later version, update the version constants, manifest replacements and output filenames in `tools/build_apk.py` together.

中文：修改 `app/` 下的正文译文和界面代码，再生成页面、运行测试、打包签名；后续升级必须保留发布时使用的私钥。原 v9 的进度与新包名的数据相互独立。

日本語：`app/` 内の訳文と画面コードを編集し、ページ生成・テスト・APK署名を行ってください。継続的な更新には公開時の署名鍵が必要です。v9と新パッケージの進捗データは別々です。
