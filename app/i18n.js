/* Local, offline language switching. Source data stays unchanged for quest logic. */
(function () {
  'use strict';
  const catalogue = window.TRANSLATIONS;
  const labels = window.UI_TRANSLATIONS;
  const messages = window.MESSAGE_TRANSLATIONS;
  const messageCache = new Map();
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  const valid = ['zh', 'en', 'ja'];
  let language = 'zh';
  try {
    const stored = localStorage.getItem('trails_lang_v1');
    const system = (navigator.language || 'zh').split('-')[0];
    language = valid.includes(stored) ? stored : (valid.includes(system) ? system : 'zh');
  } catch (_) {}
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(Object.assign({}, catalogue, labels))
    .filter((s) => s.length > 1).sort((a, b) => b.length - a.length);
  const fragments = new RegExp(keys.map(escape).join('|'), 'g');
  const index = (lang) => lang === 'en' ? 0 : 1;
  const patterns = [
    [/^全部 (\d+) 件$/, (m, l) => l === 'en' ? `All ${m[1]} quests` : `全${m[1]}件`],
    [/^共 (\d+) 件$/, (m, l) => l === 'en' ? `${m[1]} quests total` : `全${m[1]}件`],
    [/^还有 (\d+) 件未结清$/, (m, l) => l === 'en' ? `${m[1]} quests remaining` : `未達成${m[1]}件`],
    [/^(\d+) (件|组|项|条|步)$/, (m, l) => l === 'en' ? `${m[1]} ${{'件':'quests','组':'groups','项':'items','条':'entries','步':'steps'}[m[2]]}` : `${m[1]}${{'件':'件','组':'組','项':'項目','条':'件','步':'手順'}[m[2]]}`],
    [/^(\d+) \/ (\d+) 步$/, (m, l) => l === 'en' ? `Step ${m[1]} / ${m[2]}` : `${m[1]} / ${m[2]} 手順`],
    [/^全篇第 (\d+) 步$/, (m, l) => l === 'en' ? `Guide step ${m[1]}` : `全体の攻略順 ${m[1]}`],
    [/^本章第 (\d+) \/ (\d+) 件$/, (m, l) => l === 'en' ? `Quest ${m[1]} / ${m[2]}` : `この章の${m[1]} / ${m[2]}件目`],
    [/^\/ (\d+) 件已结清$/, (m, l) => l === 'en' ? `/ ${m[1]} completed` : `/ ${m[1]}件 達成済み`],
    [/^(\d+) \/ (\d+) 已结清$/, (m, l) => l === 'en' ? `${m[1]} / ${m[2]} complete` : `${m[1]} / ${m[2]} 達成済み`],
    [/^(\d+)\/(\d+) · (\d+) 项$/, (m, l) => l === 'en' ? `${m[1]}/${m[2]} · ${m[3]} items` : `${m[1]}/${m[2]} · ${m[3]}項目`],
    [/^选项 (\d+)$/, (m, l) => l === 'en' ? `Choices ${m[1]}` : `選択肢 ${m[1]}`],
    [/^(\d+) 米拉$/, (m, l) => l === 'en' ? `${m[1]} mira` : `${m[1]}ミラ`],
    [/^委托人　(.+)$/, (m, l) => (l === 'en' ? 'Client: ' : '依頼人　') + translate(m[1], l)],
    [/^环节 (\d+)　第 (\d+) 段$/, (m, l) => l === 'en' ? `Step ${m[1]} · Entry ${m[2]}` : `手順 ${m[1]}・記録 ${m[2]}`],
    [/^委托说明　第 (\d+) 段$/, (m, l) => l === 'en' ? `Quest description · Entry ${m[1]}` : `依頼の説明・記録 ${m[1]}`],
    [/^(\d+) 组（含 BP (\d+) 判定）$/, (m, l) => l === 'en' ? `${m[1]} groups (BP ${m[2]} checks)` : `${m[1]}組（BP ${m[2]}の判定あり）`],
    [/^(.+) · 最优 \+(\d+)$/, (m, l) => translate(m[1], l) + (l === 'en' ? ` · Best +${m[2]}` : ` · 最良 +${m[2]}`)],
    [/^冒险者手册（游戏内）· (\d+) 项$/, (m, l) => l === 'en' ? `In-game notebook · ${m[1]}` : `冒険者手帳（ゲーム内）・${m[1]}項目`],
    [/^Steam 成就 · (\d+) 项$/, (m, l) => l === 'en' ? `Steam achievements · ${m[1]}` : `Steam実績・${m[1]}項目`],
    [/^([风水火地幻]) · (.+)$/, (m, l) => translate(m[1], l) + ' · ' + translate(m[2], l)],
    [/^([风水火地幻])之耀石　(.+)$/, (m, l) => translate(m[1], l) + (l === 'en' ? ' Septium · ' : 'の七耀石　') + translate(m[2], l)],
    [/^共 (\d+) 件　([风水火地幻])之耀石　(\d+) 件有接取条件$/, (m, l) => l === 'en' ? `${m[1]} quests · ${translate(m[2],l)} Septium · ${m[3]} with prerequisites` : `全${m[1]}件　${translate(m[2],l)}の七耀石　受注条件あり${m[3]}件`],
    [/^\/ (\d+)　（另有隐藏 BP \+67，手册不记）$/, (m, l) => l === 'en' ? `/ ${m[1]} (plus 67 hidden BP not listed in the notebook)` : `/ ${m[1]}（手帳に載らない隠しBP +67あり）`],
    [/^★ 推荐选「(.+)」· (.+)$/, (m, l) => l === 'en' ? `★ Recommended: “${translate(m[1],l)}” · ${translate(m[2],l)}` : `★ 推奨：「${translate(m[1],l)}」・${translate(m[2],l)}`],
    [/^脚本 (.+)$/, (m, l) => (l === 'en' ? 'Source: ' : '出典：') + m[1]]
  ];

  function translate(value, lang = language) {
    const source = String(value == null ? '' : value);
    if (lang === 'zh' || !source.trim()) return source;
    const complete = labels[source] || catalogue[source] || messageCache.get(source);
    if (complete) return complete[index(lang)];
    const trimmed = source.trim();
    let output;
    const pair = labels[trimmed] || catalogue[trimmed] || messageCache.get(trimmed);
    if (pair) output = pair[index(lang)];
    if (output == null) {
      for (const [pattern, format] of patterns) {
        const match = trimmed.match(pattern);
        if (match) { output = format(match, lang); break; }
      }
    }
    if (output == null) {
      return source.replace(fragments, (key) => (labels[key] || catalogue[key])[index(lang)]);
    }
    const prefix = source.match(/^\s*/)[0], suffix = source.match(/\s*$/)[0];
    return prefix + output + suffix;
  }

  function message(key, values = {}) {
    const templates = messages[key];
    if (!templates) throw new Error('Unknown language message: ' + key);
    const fill = (template, lang) => template.replace(/\{(\w+)\}/g, (_, k) => translate(values[k], lang));
    const zh = fill(templates[0], 'zh');
    messageCache.set(zh, [fill(templates[1], 'en'), fill(templates[2], 'ja')]);
    return zh;
  }

  function search(values) {
    return values.flat(Infinity).filter((v) => v != null)
      .map((v) => [String(v), translate(v, 'en'), translate(v, 'ja')].join(' '))
      .join(' ').toLocaleLowerCase();
  }

  function refresh() {
    if (!window.document || !document.body) return; // Ignore queued work after the view closes.
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
    document.title = translate('游击士委托台账 · 空之轨迹 the 1st');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest('script, style, [data-no-i18n]')) continue;
      let record = textSources.get(node);
      if (!record || node.nodeValue !== record.output) {
        record = { source: node.nodeValue, output: node.nodeValue };
        textSources.set(node, record);
      }
      const output = translate(record.source);
      record.output = output;
      if (node.nodeValue !== output) node.nodeValue = output;
    }
    for (const element of document.querySelectorAll('[title], [aria-label], [placeholder]')) {
      if (element.closest('[data-no-i18n]')) continue;
      let records = attributeSources.get(element);
      if (!records) { records = {}; attributeSources.set(element, records); }
      for (const name of ['title','aria-label','placeholder']) {
        if (!element.hasAttribute(name)) continue;
        let record = records[name];
        const value = element.getAttribute(name);
        if (!record || value !== record.output) record = records[name] = {source: value, output: value};
        const output = translate(record.source);
        record.output = output;
        if (value !== output) element.setAttribute(name, output);
      }
    }
    const control = document.getElementById('language');
    if (control) control.value = language;
  }

  function init() {
    const input = document.getElementById('q');
    input.setAttribute('aria-label', input.getAttribute('placeholder'));
    const picker = document.createElement('label');
    picker.className = 'language-picker';
    picker.innerHTML = '<span>语言</span><select id="language" aria-label="语言"><option value="zh" data-no-i18n>中文</option><option value="en" data-no-i18n>English</option><option value="ja" data-no-i18n>日本語</option></select>';
    document.querySelector('.topbar').insertBefore(picker, document.querySelector('.progress'));
    picker.querySelector('select').addEventListener('change', (event) => {
      if (!valid.includes(event.target.value)) return;
      language = event.target.value;
      try { localStorage.setItem('trails_lang_v1', language); } catch (_) {}
      document.dispatchEvent(new CustomEvent('trails:language'));
      refresh();
    });
    refresh();
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      Promise.resolve().then(() => { scheduled = false; refresh(); });
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['title','aria-label','placeholder']});
  }
  window.I18N = {translate, message, search, refresh, init, get language() {return language;}};
})();
