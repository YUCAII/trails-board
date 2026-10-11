/* DOM integration tests; no browser or network is required. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let JSDOM, VirtualConsole;
try { ({JSDOM, VirtualConsole} = require('jsdom')); }
catch (_) { ({JSDOM, VirtualConsole} = require('../.test-runtime/node_modules/jsdom')); }
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
const failures = [], checks = [];
const tick = () => new Promise(resolve => setImmediate(resolve));
let errors = [];
function create(storage = {}) {
  const console = new VirtualConsole();
  console.on('jsdomError', e => errors.push(e.message));
  return new JSDOM(html, {url:'http://localhost:8120/',runScripts:'dangerously',virtualConsole:console,
    beforeParse(w) {
      Object.defineProperty(w.navigator,'language',{value:'zh-CN'});
      for (const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
    }});
}
function residualChinese(w) {
  const list = [], walker=w.document.createTreeWalker(w.document.body,w.NodeFilter.SHOW_TEXT);
  let node;
  while ((node=walker.nextNode())) {
    if (node.parentElement?.closest('script,style,[data-no-i18n]')) continue;
    if (/[\u3400-\u9fff]/.test(node.nodeValue)) list.push(node.nodeValue.trim());
  }
  for (const el of w.document.querySelectorAll('[title],[aria-label],[placeholder]')) {
    if (el.closest('[data-no-i18n]'))continue;
    for (const attr of ['title','aria-label','placeholder']) {
      const v=el.getAttribute(attr);
      if (v && /[\u3400-\u9fff]/.test(v))list.push(`${attr}: ${v}`);
    }
  }
  return [...new Set(list)];
}
function choose(w,lang) {
  const select=w.document.getElementById('language');
  select.value=lang;
  select.dispatchEvent(new w.Event('change',{bubbles:true}));
  w.I18N.refresh();
}
function findButton(w,selector,label) {
  return [...w.document.querySelectorAll(selector)].find(b=>b.textContent.trim().includes(label));
}
function query(w,text) {
  const input=w.document.getElementById('q');
  input.value=text;
  input.dispatchEvent(new w.Event('input',{bubbles:true}));
  w.I18N.refresh();
}
async function run() {
  const dom=create(),w=dom.window,d=w.document;
  await tick();
  const originalData=JSON.stringify(w.DATA);
  assert.equal(d.querySelectorAll('.slot').length,87);
  const source=JSON.parse(fs.readFileSync(path.join(root,'app/translation-items.json'),'utf8'));
  const mismatches=[];
  for (const [id,zh] of source) for (const [i,lang] of ['en','ja'].entries()) {
    const actual=w.I18N.translate(zh,lang),expected=w.TRANSLATIONS[zh][i];
    // UI overrides are intentional for shared labels, e.g. the sidebar's plural Orbments.
    const override=w.UI_TRANSLATIONS[zh]?.[i];
    if (actual !== (override ?? expected))mismatches.push({id,lang,actual,expected:override??expected});
  }
  assert.deepEqual(mismatches,[],'Every content string has a complete exact translation');
  checks.push(`Catalogue: ${source.length} × 2 exact translations`);
  for (const lang of ['en','ja','zh']) {
    choose(w,lang);
    assert.equal(d.documentElement.lang,lang==='zh'?'zh-CN':lang);
    const buttons=[...d.querySelectorAll('.slot')];
    assert.equal(buttons.length,87);
    if(lang==='en')failures.push(...residualChinese(w).map(text=>({view:'board',text})));
    for (const [questIndex,button] of buttons.entries()) {
      button.click();
      for (let tab=0;tab<4;tab++) {
        d.querySelectorAll('#d-tabs button')[tab].click();
        w.I18N.refresh();
        assert.ok(d.getElementById('d-body').textContent.trim());
        if(lang==='en')failures.push(...residualChinese(w).map(text=>({view:`quest ${questIndex} / tab ${tab}`,text})));
      }
    }
    d.getElementById('close').click();
    findButton(w,'#views button',w.I18N.translate('选项总览')).click();
    w.I18N.refresh();
    assert.ok(d.querySelectorAll('.ch-row').length>100);
    if(lang==='en')failures.push(...residualChinese(w).map(text=>({view:'choices',text})));
    const firstChoice=w.DATA.quests.find(q=>q.choices.length).choices[0].items[0];
    query(w,w.I18N.translate(firstChoice,lang));
    assert.ok(d.querySelectorAll('.ch-row').length>0,'Search choices in each language');
    query(w,'');
    findButton(w,'#views button',w.I18N.translate('全成就')).click();
    w.I18N.refresh();
    assert.equal(d.querySelectorAll('.av-row').length,178);
    if(lang==='en')failures.push(...residualChinese(w).map(text=>({view:'game achievements',text})));
    query(w,w.I18N.translate(w.DATA.achievements[0].name,lang));
    assert.ok(d.querySelectorAll('.av-row').length>0,'Search in-game achievements in each language');
    query(w,'');
    d.querySelectorAll('.av-mode')[1].click();
    w.I18N.refresh();
    assert.equal(d.querySelectorAll('.av-row').length,43);
    if(lang==='en')failures.push(...residualChinese(w).map(text=>({view:'Steam achievements',text})));
    query(w,w.I18N.translate(w.DATA.steam_achievements[0].name,lang));
    assert.ok(d.querySelectorAll('.av-row').length>0,'Search Steam achievements in each language');
    query(w,'');
    d.querySelectorAll('.av-mode')[0].click();
    findButton(w,'#views button',w.I18N.translate('委托台账')).click();
    w.I18N.refresh();
    for(const chapterButton of [...d.querySelectorAll('#chapters button')].slice(1)) {
      chapterButton.click();w.I18N.refresh();
      assert.ok(d.querySelectorAll('.card').length>0);
      if(lang==='en')failures.push(...residualChinese(w).map(text=>({view:'chapter',text})));
    }
    d.querySelector('#chapters button').click();w.I18N.refresh();
    query(w,w.I18N.translate(w.DATA.quests[0].title,lang));
    assert.ok(d.querySelectorAll('.card').length>0,'Search quests in each language');
    query(w,'');
    checks.push(`${lang}: all 87 quests × 4 tabs, 5 chapters, choices, 178 + 43 achievements, searches`);
  }
  assert.deepEqual(failures,[],'No Chinese UI or content leaks into English');
  // All three languages remain searchable regardless of the current display language.
  choose(w,'en');
  for(const lang of ['zh','en','ja']) {
    query(w,w.I18N.translate(w.DATA.quests[0].title,lang));
    assert.ok(d.querySelectorAll('.card').length>0);
  }
  query(w,'');
  findButton(w,'#kinds button','Main story').click();w.I18N.refresh();
  assert.equal(d.querySelectorAll('.card').length,w.DATA.quests.filter(q=>q.kind==='main').length);
  assert.equal(d.querySelectorAll('.card.side').length,0);
  findButton(w,'#kinds button','Side quest').click();w.I18N.refresh();
  assert.equal(d.querySelectorAll('.card').length,w.DATA.quests.filter(q=>q.kind==='side').length);
  assert.equal(d.querySelectorAll('.card.main').length,0);
  findButton(w,'#kinds button','All quests').click();w.I18N.refresh();
  d.querySelector('.slot').click();
  d.querySelectorAll('#d-tabs button')[1].click();
  d.getElementById('d-done').click();w.I18N.refresh();
  const questProgress=w.localStorage.getItem('trails_done_v1');
  const activeTitle=d.getElementById('d-title').textContent;
  choose(w,'ja');choose(w,'en');
  assert.equal(d.getElementById('d-title').textContent,activeTitle);
  assert.ok(d.getElementById('drawer').classList.contains('show'));
  assert.ok(d.querySelectorAll('#d-tabs button')[1].classList.contains('on'));
  assert.equal(w.localStorage.getItem('trails_done_v1'),questProgress);
  d.getElementById('close').click();
  findButton(w,'#kinds button','Incomplete only').click();w.I18N.refresh();
  assert.equal(d.querySelectorAll('.card').length,86,'Incomplete filter applies on the all-chapters board');
  assert.equal(d.querySelectorAll('.card.done').length,0);
  findButton(w,'#kinds button','Incomplete only').click();w.I18N.refresh();
  checks.push('Main/side/incomplete filters apply on the all-chapters board');
  findButton(w,'#views button','Achievements').click();w.I18N.refresh();
  d.querySelector('.av-chk').click();w.I18N.refresh();
  const gameProgress=w.localStorage.getItem('trails_achv_v1');
  d.querySelectorAll('.av-mode')[1].click();w.I18N.refresh();
  d.querySelector('.av-chk').click();w.I18N.refresh();
  const steamProgress=w.localStorage.getItem('trails_steam_v1');
  choose(w,'zh');choose(w,'ja');
  assert.equal(w.localStorage.getItem('trails_achv_v1'),gameProgress);
  assert.equal(w.localStorage.getItem('trails_steam_v1'),steamProgress);
  assert.equal(JSON.stringify(w.DATA),originalData,'Localization does not mutate game data or IDs');
  const storage=Object.fromEntries([...Array(w.localStorage.length)].map((_,i)=>{const k=w.localStorage.key(i);return[k,w.localStorage.getItem(k)];}));
  const reloaded=create(storage);
  await tick();
  assert.equal(reloaded.window.document.documentElement.lang,'ja');
  for(const key of ['trails_done_v1','trails_achv_v1','trails_steam_v1'])assert.equal(reloaded.window.localStorage.getItem(key),storage[key]);
  reloaded.window.close();
  checks.push('Cross-language search, language persistence, independent progress stores, active drawer/tab preservation, unchanged source data');
  assert.deepEqual(errors,[],'No runtime exceptions');
  await tick(); // Flush pending localization mutations before destroying the DOM.
  dom.window.close();
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});
  fs.writeFileSync(path.join(root,'qa/I18N_TEST_RESULTS.json'),JSON.stringify({passed:true,checks},null,2)+'\n');
  console.log(checks.join('\n'));
}
run().catch(e=>{
  fs.mkdirSync(path.join(root,'qa'),{recursive:true});
  fs.writeFileSync(path.join(root,'qa/I18N_TEST_FAILURES.json'),JSON.stringify({error:e.message,failures,errors},null,2)+'\n');
  console.error(e);process.exitCode=1;
});
