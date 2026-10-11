"""Generate the self-contained offline web asset included in the Android APK."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / 'app'

def load(path):
    return json.loads(path.read_text(encoding='utf-8'))

def build():
    source = load(APP/'translation-items.json')
    translations = {}
    for path in sorted((APP/'translations').glob('translated-*.json')):
        for key, value in load(path).items():
            if key in translations:
                raise ValueError(f'Duplicate translation ID: {key}')
            if len(value) != 2 or not all(isinstance(x, str) and x.strip() for x in value):
                raise ValueError(f'Invalid translation ID: {key}')
            translations[key] = value
    missing = [ident for ident, _ in source if str(ident) not in translations]
    if missing:
        raise ValueError(f'Missing translations: {missing}')
    catalogue = {zh: translations[str(ident)] for ident, zh in source}
    (APP/'catalogue.json').write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    original = (APP/'original.html').read_text(encoding='utf-8')
    html = re.sub(r'<script>.*?</script>', '', original, flags=re.S)
    html = html.replace('</style>', (APP/'i18n.css').read_text(encoding='utf-8')+'\n</style>', 1)
    values = {'DATA':load(APP/'data.zh.json'), 'TRANSLATIONS':catalogue,
              'UI_TRANSLATIONS':load(APP/'i18n-ui.json'), 'MESSAGE_TRANSLATIONS':load(APP/'i18n-messages.json')}
    scripts = ['<script>']
    for name, value in values.items():
        encoded = json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c')
        scripts.append(f'window.{name}={encoded};')
    scripts += ['</script>', '<script>', (APP/'i18n.js').read_text(encoding='utf-8'), '</script>',
                '<script>', (APP/'main.js').read_text(encoding='utf-8'), '\nwindow.I18N.init();', '</script>']
    html = html.replace('</body>','\n'.join(scripts)+'\n</body>')
    (APP/'index.html').write_text(html,encoding='utf-8')
    print(f'Offline HTML ready: {len(source)} translations, {len(html.encode("utf-8"))} bytes')
    return html

if __name__ == '__main__':
    build()
