
/* 游击士委托台账 —— 交互
   数据来自 C 工具链解出的 t_quest.tbl：87 件委托 / 攻略次序 / 解锁说明
   进度存在 localStorage，关掉再开还在 */
(function () {
  const D = window.DATA;
  const msg = window.I18N.message;
  const $ = (s) => document.querySelector(s);
  const el = (t, c, txt) => {
    const e = document.createElement(t);
    if (c) e.className = c;
    if (txt != null) e.textContent = txt;
    return e;
  };

  /* 七耀石色相 ↔ 章节身份：孔的颜色就是章的颜色。
     浅暖底上的版本，比深色版压深了一档，保证对比度。 */
  const CH_COLOR = ['#37855C', '#2A6AA4', '#B0472F', '#9E7C12', '#74589C'];
  const CH_STONE = ['风', '水', '火', '地', '幻'];
  const TABS = ['委托内容', '环节', '选项', '手册原文'];

  /* 攻略全篇共 127 步，里面混着买书、办协会手续、BOSS、核对点这些不算委托的条目。
     所以序章第一件是第 5 步 —— 角标必须带上总数，否则看着像列表排错了。 */
  const ORD_TOTAL = 127;

  const KEY = 'trails_done_v1';
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { /* 首次运行 */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch (e) {} };

  let chapter = -1, kind = 0, query = '', tab = 0, selId = -1, onlyUndone = false;
  /* 两个查阅视图：委托台账（结晶盘 / 章节网格）与选项总览 */
  let view = 'board';
  const CM = D.choice_meta || { total: 0, linked: 0, scene: 0, system: 0, quests_with: 0 };
  /* 全成就（t_achievement.tbl 解出的 178 项），勾选状态独立存档 */
  const AV = D.achievements || [];
  const AM = D.achv_meta || { total: 0, cats: {} };
  let adone = new Set();
  try { adone = new Set(JSON.parse(localStorage.getItem('trails_achv_v1') || '[]')); } catch (e) { /* 首次运行 */ }
  const asave = () => { try { localStorage.setItem('trails_achv_v1', JSON.stringify([...adone])); } catch (e) {} };
  let achvOnly = false;
  /* Steam 版成就（appid 3375780），与手册成就分开存档；avMode 切换两套列表 */
  const SV = D.steam_achievements || [];
  const SM = D.steam_meta || { total: 0, groups: [] };
  let sdone = new Set();
  try { sdone = new Set(JSON.parse(localStorage.getItem('trails_steam_v1') || '[]')); } catch (e) { /* 首次运行 */ }
  const ssave = () => { try { localStorage.setItem('trails_steam_v1', JSON.stringify([...sdone])); } catch (e) {} };
  let avMode = 'game';

  /* 章表：「序章 · 父亲、起程」拆成编号与副题，侧栏和盘面都不再折行 */
  const seen = [];
  D.quests.forEach((q) => {
    const p = String(q.chapter_name || '').split(' · ');
    seen[q.chapter] = { id: q.chapter, name: q.chapter_name, no: p[0], ti: p[1] || '' };
  });
  const CHLIST = seen.filter(Boolean).sort((a, b) => a.id - b.id);
  const chColor = (id) => CH_COLOR[id] || '#9A8A71';
  const chOf = (id) => CHLIST.find((c) => c.id === id);

  const byOrder = (a, b) => {
    const ao = a.order > 0 ? a.order : 1e6;
    const bo = b.order > 0 ? b.order : 1e6;
    return ao - bo || a.id - b.id;
  };
  /* 上一件 / 下一件要跨章也能顺着走，所以先章后序 */
  const byGlobal = (a, b) => (a.chapter - b.chapter) || byOrder(a, b);
  const questsOf = (c) => D.quests.filter((q) => q.chapter === c).sort(byOrder);
  const doneIn = (list) => list.filter((q) => done.has(q.id)).length;

  /* 结晶环：进度环是这块界面唯一的"仪表"，只出现在章节上 */
  function dial(size, r, sw, pct, color) {
    const C = 2 * Math.PI * r, cx = size / 2;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="#DAC7A6" stroke-width="' + sw + '"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) +
      '" stroke-dashoffset="' + (C * (1 - pct)).toFixed(2) + '"/></svg>';
  }
  function dialBox(size, r, sw, pct, color) {
    const d = el('div', 'dial');
    d.innerHTML = dial(size, r, sw, pct, color);
    d.appendChild(el('span', 'pct', pct > 0 && pct < 1 ? Math.round(pct * 100) + '%' : (pct >= 1 ? '完' : '0%')));
    return d;
  }

  function visible() {
    const kw = query.trim().toLowerCase();
    return D.quests.filter((q) => {
      if (chapter >= 0 && q.chapter !== chapter) return false;
      if (kind === 1 && q.kind !== 'main') return false;
      if (kind === 2 && q.kind !== 'side') return false;
      if (onlyUndone && done.has(q.id)) return false;
      if (kw) {
        const hay = window.I18N.search([q.title, q.client, q.unlock,
          q.lines.map((l) => l.text),
          (q.choices || []).map((g) => g.items)]);
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
  }

  /* ================= 侧栏：结晶链 ================= */
  function renderRail() {
    const box = $('#chapters');
    box.innerHTML = '';

    const all = el('button', 'crystal' + (chapter === -1 ? ' on' : ''));
    all.style.setProperty('--c', '#A6740F');
    all.appendChild(el('span', 'node'));
    const an = el('span', 'nm');
    an.appendChild(el('span', 'no', '结晶盘'));
    an.appendChild(el('span', 'ti', '全部 ' + D.quests.length + ' 件'));
    all.appendChild(an);
    all.appendChild(el('span', 'cnum', done.size + '/' + D.quests.length));
    all.onclick = () => { chapter = -1; render(); };
    box.appendChild(all);

    CHLIST.forEach((c) => {
      const list = questsOf(c.id);
      const n = doneIn(list);
      const b = el('button', 'crystal' + (chapter === c.id ? ' on' : '') + (n === list.length ? ' done' : ''));
      b.style.setProperty('--c', chColor(c.id));
      b.appendChild(el('span', 'node'));
      const nm = el('span', 'nm');
      nm.appendChild(el('span', 'no', c.no));
      nm.appendChild(el('span', 'ti', CH_STONE[c.id] + ' · ' + c.ti));
      b.appendChild(nm);
      b.appendChild(el('span', 'cnum', n + '/' + list.length));
      b.onclick = () => { chapter = c.id; render(); };
      box.appendChild(b);
    });

    const kb = $('#kinds');
    kb.innerHTML = '';
    [{ v: 0, name: '全部委托', color: '#9A8A71' },
     { v: 1, name: '主线', color: '#A6740F' },
     { v: 2, name: '支线 · 委托', color: '#3C7A62' }].forEach((k) => {
      const b = el('button', kind === k.v ? 'on' : '');
      const dot = el('span', 'dot');
      dot.style.background = k.color;
      b.appendChild(dot);
      b.appendChild(el('span', null, k.name));
      b.onclick = () => { kind = k.v; render(); };
      kb.appendChild(b);
    });
    const t = el('button', onlyUndone ? 'on' : '');
    const d2 = el('span', 'dot');
    d2.style.background = '#AF3F26';
    t.appendChild(d2);
    t.appendChild(el('span', null, '只看未结清'));
    t.onclick = () => { onlyUndone = !onlyUndone; render(); };
    kb.appendChild(t);

    /* 查阅视图切换：委托台账 ↔ 选项总览 */
    const vb = $('#views');
    if (vb) {
      vb.innerHTML = '';
      [{ v: 'board', name: '委托台账', n: D.quests.length + ' 件', c: '#8A6410' },
       { v: 'choices', name: '选项总览', n: CM.total + ' 组', c: '#6B4E8C' },
       { v: 'achv', name: '全成就', n: AM.total + ' 项', c: '#3C7A62' }].forEach((o) => {
        const b = el('button', view === o.v ? 'on' : '');
        const dot = el('span', 'dot');
        dot.style.background = o.c;
        b.appendChild(dot);
        const nm = el('span', null, o.name);
        b.appendChild(nm);
        b.appendChild(el('span', 'vnum', o.n));
        b.onclick = () => { view = o.v; render(); };
        vb.appendChild(b);
      });
    }
  }

  /* ==========================================================================
     选项总览：脚本里还原出的所有选项菜单
     不管影不影响 BP 都列出来。能定位到委托的按委托排，定位不到的按章节落在
     「场景选项」里，不丢。
     ========================================================================== */
  /* BP 徽章：挂到委托的写明这件的满额 BP；脚本里解出了加值的把「完美 +n」也标上 */
  function bpBadge(bp, bpv, rbp) {
    if (!bp) return el('span', 'ch-bp', '不影响 BP');
    let t = bpv ? 'BP ' + bpv : '涉及 BP';
    if (rbp) t += ' · 最优 +' + rbp;
    return el('span', 'ch-bp on' + (rbp ? ' hot' : ''), t);
  }

  function choiceRow(title, sub, items, bp, bpv, onClick, muted, rec) {
    const r = el('div', 'ch-row' + (muted ? ' muted' : ''));
    const s = el('div', 'ch-src');
    if (onClick) {
      const b = el('button', 'ch-link', title);
      b.onclick = onClick;
      s.appendChild(b);
    } else {
      s.appendChild(el('span', 'ch-place', title));
    }
    if (sub) s.appendChild(el('span', 'ch-file', sub));
    r.appendChild(s);
    const box = el('div', 'ch-items');
    items.forEach((it, i) => {
      const c = el('span', 'chip' + (rec && i === rec.idx ? ' rec' : ''), it);
      if (rec && i === rec.idx) c.title = rec.why;
      box.appendChild(c);
    });
    r.appendChild(box);
    if (rec) r.appendChild(el('div', 'ch-why',
      '★ 推荐选「' + items[rec.idx] + '」· ' + rec.why));
    r.appendChild(bpBadge(bp, bpv, rec && rec.bp));
    return r;
  }

  function renderChoices() {
    const board = $('#board');
    board.innerHTML = '';
    const kw = query.trim().toLowerCase();

    const head = el('div', 'plate-head');
    head.appendChild(el('h2', null, '选项总览'));
    head.appendChild(el('p', null, msg('choicesIntro', {
      total: CM.total, linked: CM.linked, quests: CM.quests_with,
      scene: CM.scene, recommended: CM.recommended
    })));
    const st = el('div', 'ch-stat');
    st.appendChild(el('span', null, '委托选项'));
    st.appendChild(el('b', null, String(CM.linked)));
    st.appendChild(el('span', null, '组　　场景选项'));
    st.appendChild(el('b', null, String(CM.scene)));
    st.appendChild(el('span', null, msg('systemMenus', {n: CM.system})));
    head.appendChild(st);
    board.appendChild(head);

    const hit = (a) => !kw || window.I18N.search(a.concat([a.src || ''])).indexOf(kw) >= 0;

    CHLIST.forEach((c) => {
      if (chapter >= 0 && c.id !== chapter) return;   /* 侧栏选章时只看那一章 */
      const rows = [];
      questsOf(c.id).forEach((q) => {
        (q.choices || []).forEach((g) => {
          if (!hit(g.items.concat([q.title, g.place || '']))) return;
          rows.push(choiceRow(q.title, g.place, g.items, g.bp, q.bp,
            () => open(q.id), false, g.rec));
        });
      });
      (D.scene_choices || []).forEach((g) => {
        if (g.chapter !== c.id) return;
        if (!hit(g.items.concat([g.file, g.place || '']))) return;
        rows.push(choiceRow(g.place || g.file, g.file, g.items, g.bp, null,
          null, true));
      });
      if (!rows.length) return;

      const g = el('section', 'ch-group');
      g.style.setProperty('--c', chColor(c.id));
      const gh = el('div', 'group-head');
      const dot = el('span', 'orb');
      dot.style.background = chColor(c.id);
      gh.appendChild(dot);
      gh.appendChild(el('h2', null, c.name));
      gh.appendChild(el('span', 'gstat', rows.length + ' 组'));
      g.appendChild(gh);
      const list = el('div', 'ch-list');
      rows.forEach((r) => list.appendChild(r));
      g.appendChild(list);
      board.appendChild(g);
    });

    /* 章节不明的（mp8020 / mp9000 这类共用脚本）；选了具体章节就不显示 */
    const rest = (chapter >= 0) ? []
      : (D.scene_choices || []).filter((g) => g.chapter < 0 || g.chapter > 4);
    const restRows = rest.filter((g) => hit(g.items.concat([g.file, g.place || ''])))
      .map((g) => choiceRow(g.place || g.file, g.file, g.items, g.bp, null, null, true));
    if (restRows.length) {
      const g = el('section', 'ch-group');
      g.style.setProperty('--c', '#9A8A71');
      const gh = el('div', 'group-head');
      const dot = el('span', 'orb');
      dot.style.background = '#9A8A71';
      gh.appendChild(dot);
      gh.appendChild(el('h2', null, '共用脚本 · 章节不明'));
      gh.appendChild(el('span', 'gstat', restRows.length + ' 组'));
      g.appendChild(gh);
      const list = el('div', 'ch-list');
      restRows.forEach((r) => list.appendChild(r));
      g.appendChild(list);
      board.appendChild(g);
    }

    if (!board.querySelector('.ch-group')) {
      const e = el('div', 'empty');
      e.appendChild(el('p', null, '没有匹配的选项'));
      board.appendChild(e);
    }
  }

  /* ==========================================================================
     结晶盘：87 件委托摊在一屏里
     一格 = 一件。点格子直接翻到那一页，不用把 87 张卡从头滚到尾。
     ========================================================================== */
  function renderPlates() {
    const board = $('#board');
    board.innerHTML = '';

    const head = el('div', 'plate-head');
    head.appendChild(el('h2', null, '结晶盘'));
    head.appendChild(el('p', null, msg('boardIntro', {steps: ORD_TOTAL, choices: CM.total})));
    board.appendChild(head);

    const disc = el('div', 'crystal-disc');

    CHLIST.forEach((c) => {
      const list = questsOf(c.id);
      const n = doneIn(list);
      const col = chColor(c.id);
      const plate = el('section', 'plate');
      plate.style.setProperty('--c', col);

      const pid = el('div', 'plate-id');
      pid.appendChild(dialBox(46, 19, 3.5, n / list.length, col));
      const txt = el('div', 'txt');
      const h3 = el('h3', null, c.no);
      h3.onclick = () => { chapter = c.id; render(); };
      txt.appendChild(h3);
      txt.appendChild(el('div', 'sub', CH_STONE[c.id] + '之耀石　' + c.ti));
      pid.appendChild(txt);
      plate.appendChild(pid);

      const right = el('div');
      const slots = el('div', 'slots');
      const peek = el('div', 'peek');
      list.forEach((q) => {
        const s = el('button', 'slot' + (done.has(q.id) ? ' done' : ''));
        s.setAttribute('aria-label', q.title);
        s.title = q.title;
        s.onclick = () => open(q.id);
        s.onmouseenter = () => {
          peek.innerHTML = '';
          peek.appendChild(el('b', null, q.order > 0 ? q.order + ' / ' + ORD_TOTAL : '未列次序'));
          peek.appendChild(el('span', null, q.title));
          if (q.bp) peek.appendChild(el('i', null, 'BP ' + q.bp + (q.bonus_bp ? '+' + q.bonus_bp : '')));
          peek.classList.add('on');
        };
        s.onmouseleave = () => peek.classList.remove('on');
        slots.appendChild(s);
      });
      right.appendChild(slots);

      const foot = el('div', 'plate-foot');
      const stat = el('span', 'pstat');
      stat.appendChild(el('b', null, String(n)));
      stat.appendChild(el('span', null, ' / ' + list.length + ' 件已结清'));
      foot.appendChild(stat);
      foot.appendChild(peek);
      right.appendChild(foot);
      plate.appendChild(right);

      /* 这一章下一件该做的事，顺手把盘面右侧的空白变成信息 */
      const next = el('div', 'plate-next');
      const nx = list.find((q) => !done.has(q.id));
      if (nx) {
        next.appendChild(el('span', null, '下一件'));
        const nb = el('b', null, nx.title);
        nb.title = nx.title;
        nb.onclick = () => open(nx.id);
        next.appendChild(nb);
      } else {
        next.classList.add('clear');
        next.appendChild(el('span', null, '这一章已清完'));
      }
      plate.appendChild(next);

      disc.appendChild(plate);
    });

    board.appendChild(disc);

    const bpAll = D.quests.reduce((s, q) => s + (q.bp || 0), 0);
    const bpGot = D.quests.reduce((s, q) => s + (done.has(q.id) ? (q.bp || 0) : 0), 0);
    const sum = el('div', 'plate-sum');
    sum.appendChild(el('span', null, '已得 BP'));
    sum.appendChild(el('b', null, String(bpGot)));
    sum.appendChild(el('span', null, '/ ' + bpAll + '　（另有隐藏 BP +67，手册不记）'));
    board.appendChild(sum);
  }

  /* ================= 章节视图 ================= */
  function cardOf(q) {
    const isDone = done.has(q.id);
    const c = el('button', 'card ' + (q.kind === 'main' ? 'main' : 'side') + (isDone ? ' done' : ''));
    /* 顶边色条用章节色 —— 颜色语义只有一套：七耀石 = 章节 */
    c.style.setProperty('--strip', chColor(q.chapter));
    c.appendChild(el('span', 'pin'));

    const row = el('div', 'toprow');
    if (q.order > 0) row.appendChild(el('span', 'seq', q.order + ' / ' + ORD_TOTAL));
    row.appendChild(el('span', 'kind' + (q.kind === 'main' ? ' m' : ' s'),
      q.kind === 'main' ? '主线' : '支线'));
    c.appendChild(row);

    c.appendChild(el('h3', null, q.title));

    const meta = el('div', 'meta');
    if (q.bp) meta.appendChild(el('span', 'bp', 'BP ' + q.bp + (q.bonus_bp ? '+' + q.bonus_bp : '')));
    meta.appendChild(el('span', null, q.mira + ' 米拉'));
    if (q.choices && q.choices.length) {
      const ch = el('span', 'ch', '选项 ' + q.choices.length);
      if (q.choices.some((g) => g.bp)) ch.classList.add('bp');
      meta.appendChild(ch);
    }
    c.appendChild(meta);

    if (q.unlock && /期限|最晚|过了|无法|离城|之前|截止/.test(q.unlock)) {
      c.appendChild(el('span', 'flag-limit', '限时'));
    }
    if (q.client) c.appendChild(el('div', 'who', '委托人　' + q.client));
    if (isDone) c.appendChild(el('span', 'stamp', '结'));

    c.onclick = () => open(q.id);
    return c;
  }

  /* ==========================================================================
     全成就：t_achievement.tbl 解出的冒险者手册成就
     手册 / 活动 / 导力器 / 战斗 四组，勾选进度独立存 localStorage。
     ========================================================================== */
  const AV_CATS = ['手册', '活动', '导力器', '战斗'];
  const AV_COLOR = { '手册': '#8A6410', '活动': '#3C7A62', '导力器': '#6B4E8C', '战斗': '#AF3F26' };

  function renderAchv() {
    const board = $('#board');
    board.innerHTML = '';
    const kw = query.trim().toLowerCase();
    const steam = avMode === 'steam';

    const head = el('div', 'plate-head');
    head.appendChild(el('h2', null, '全成就'));

    /* 手册 / Steam 二级切换 */
    const modes = el('div', 'av-modes');
    [['game', '冒险者手册（游戏内）· ' + AM.total + ' 项'],
     ['steam', 'Steam 成就 · ' + SM.total + ' 项']].forEach(([m, label]) => {
      const b = el('button', 'av-mode' + (avMode === m ? ' on' : ''), label);
      b.onclick = () => { avMode = m; renderBoard(); };
      modes.appendChild(b);
    });
    head.appendChild(modes);

    if (steam) {
      head.appendChild(el('p', null, msg('steamIntro', {total: SM.total})));
    } else {
      head.appendChild(el('p', null, msg('gameIntro', {total: AM.total})));
    }

    const done = steam ? sdone : adone;
    const total = steam ? SM.total : AM.total;
    const st = el('div', 'ch-stat');
    st.appendChild(el('span', null, '已达成'));
    st.appendChild(el('b', null, done.size + ' / ' + total));

    /* 分组定义：手册 4 类，Steam 5 组 */
    const groups = steam
      ? SM.groups.map(([k, name, color]) => ({ k, name, color,
          list: SV.filter((a) => a.grp === k) }))
      : AV_CATS.map((c) => ({ k: c, name: c, color: AV_COLOR[c],
          list: AV.filter((a) => a.cat === c) }));

    groups.forEach((g0) => {
      const n = g0.list.filter((a) => done.has(a.id)).length;
      st.appendChild(el('span', null, '　' + g0.name));
      st.appendChild(el('b', null, n + '/' + g0.list.length));
    });
    const tog = el('button', 'av-toggle' + (achvOnly ? ' on' : ''),
      achvOnly ? '看全部' : '只看未达成');
    tog.onclick = () => { achvOnly = !achvOnly; renderBoard(); };
    st.appendChild(tog);
    head.appendChild(st);
    board.appendChild(head);

    groups.forEach((g0) => {
      let list = g0.list.slice();
      if (achvOnly) list = list.filter((a) => !done.has(a.id));
      if (kw) list = list.filter((a) =>
        window.I18N.search([a.name, a.desc, a.en, a.title]).indexOf(kw) >= 0);
      if (!list.length) return;
      const g = el('section', 'ch-group');
      g.style.setProperty('--c', g0.color);
      const gh = el('div', 'group-head');
      const dot = el('span', 'orb');
      dot.style.background = g0.color;
      gh.appendChild(dot);
      gh.appendChild(el('h2', null, g0.name));
      const okAll = g0.list.filter((a) => done.has(a.id)).length;
      gh.appendChild(el('span', 'gstat', okAll + '/' + g0.list.length + ' · ' + list.length + ' 项'));
      g.appendChild(gh);
      const wrap = el('div', 'av-list');
      list.forEach((a) => {
        const ok = done.has(a.id);
        const row = el('div', 'av-row' + (ok ? ' ok' : ''));
        const chk = el('button', 'av-chk', ok ? '✓' : '');
        chk.title = ok ? '取消标记' : '标记已达成';
        chk.onclick = () => {
          if (steam) {
            if (sdone.has(a.id)) sdone.delete(a.id); else sdone.add(a.id);
            ssave();
          } else {
            if (adone.has(a.id)) adone.delete(a.id); else adone.add(a.id);
            asave();
          }
          renderBoard();
        };
        row.appendChild(chk);
        const main = el('div', 'av-main');
        main.appendChild(el('div', 'av-name', a.name));
        if (a.desc && a.desc !== a.name)
          main.appendChild(el('div', 'av-desc', a.desc));
        if (a.en) main.appendChild(el('div', 'av-desc av-en', a.en));
        row.appendChild(main);
        if (steam && a.pct != null) {
          const rare = a.pct < 10 ? ' rare' : '';
          row.appendChild(el('span', 'av-pct' + rare, a.pct.toFixed(1) + '%'));
        }
        wrap.appendChild(row);
      });
      g.appendChild(wrap);
      board.appendChild(g);
    });
  }

  function renderBoard() {
    const board = $('#board');
    board.innerHTML = '';

    if (view === 'choices') { renderChoices(); return; }
    if (view === 'achv') { renderAchv(); return; }

    /* 没选章、没搜索 → 结晶盘，不铺卡片 */
    if (chapter < 0 && !query.trim() && kind === 0 && !onlyUndone) { renderPlates(); return; }

    /* 选中某一章 → 先给一条章节横幅，再铺这一章的委托书 */
    if (chapter >= 0) {
      const c = chOf(chapter);
      const list = questsOf(chapter);
      if (c) {
        const b = el('div', 'chapter-banner');
        b.style.setProperty('--c', chColor(c.id));
        b.appendChild(dialBox(44, 18, 3.5, doneIn(list) / list.length, chColor(c.id)));
        const t = el('div');
        t.appendChild(el('h2', null, c.name));
        t.appendChild(el('div', 'sub',
          '共 ' + list.length + ' 件　' + CH_STONE[c.id] + '之耀石　' +
          list.filter((q) => q.unlock).length + ' 件有接取条件'));
        b.appendChild(t);
        const back = el('button', 'back', '← 回结晶盘');
        back.onclick = () => { chapter = -1; render(); };
        b.appendChild(back);
        board.appendChild(b);
      }
    }

    const list = visible();
    if (!list.length) {
      const e = el('div', 'empty');
      e.appendChild(el('p', null, '这块布告栏上暂时没有委托'));
      const b = el('button', 'btn', '清掉筛选');
      b.onclick = () => {
        chapter = -1; kind = 0; query = ''; onlyUndone = false;
        $('#q').value = ''; render();
      };
      e.appendChild(b);
      board.appendChild(e);
      return;
    }

    const groups = [];
    list.forEach((q) => {
      let g = groups.find((x) => x.id === q.chapter);
      if (!g) { g = { id: q.chapter, name: q.chapter_name || '其它', items: [] }; groups.push(g); }
      g.items.push(q);
    });
    groups.sort((a, b) => a.id - b.id);

    groups.forEach((g) => {
      /* 单章视图已经有横幅了，不再重复一个组头 */
      if (groups.length > 1) {
        const head = el('div', 'group-head');
        const dot = el('span', 'orb');
        dot.style.background = chColor(g.id);
        head.appendChild(dot);
        head.appendChild(el('h2', null, g.name));
        head.appendChild(el('span', 'gstat',
          doneIn(g.items) + ' / ' + g.items.length + ' 已结清'));
        board.appendChild(head);
      } else if (g.items.length !== list.length) {
        const head = el('div', 'group-head');
        head.appendChild(el('h2', null, g.name));
        head.appendChild(el('span', 'gstat', doneIn(g.items) + ' / ' + g.items.length + ' 已结清'));
        board.appendChild(head);
      }

      const grid = el('div', 'grid');
      g.items.sort(byOrder).forEach((q) => grid.appendChild(cardOf(q)));
      board.appendChild(grid);
    });
  }

  /* ================= 顶栏进度 ================= */
  function renderProgress() {
    const n = done.size, total = D.quests.length;
    const C = 2 * Math.PI * 17;
    const arc = $('#arc');
    if (arc) {
      arc.setAttribute('stroke-dasharray', C.toFixed(2));
      arc.setAttribute('stroke-dashoffset', (C * (1 - n / total)).toFixed(2));
    }
    $('#pnum').textContent = n;
    $('#ptotal').textContent = '共 ' + total + ' 件';
    $('#psub').textContent = n === total ? '全部结清' : '还有 ' + (total - n) + ' 件未结清';
  }

  /* ================= 详情 ================= */
  function open(id) { selId = id; tab = 0; renderDrawer(); show(); }
  function show() {
    $('#drawer').classList.add('show');
    $('#scrim').classList.add('show');
  }
  function close() {
    $('#drawer').classList.remove('show');
    $('#scrim').classList.remove('show');
  }
  function step(delta) {
    const list = visible().slice().sort(byGlobal);
    if (list.length < 2) return;
    const i = list.findIndex((q) => q.id === selId);
    if (i < 0) return;
    selId = list[(i + delta + list.length) % list.length].id;
    tab = 0;
    renderDrawer();
  }

  function renderDrawer() {
    const q = D.quests.find((x) => x.id === selId);
    if (!q) return;
    const isDone = done.has(q.id);

    $('#drawer').style.setProperty('--c', chColor(q.chapter));
    $('#d-title').textContent = q.title;

    const sub = $('#d-sub');
    sub.innerHTML = '';
    sub.appendChild(el('span', 'tag ' + (q.kind === 'main' ? 'm' : 's'),
      q.kind === 'main' ? '主线' : '支线 · 委托'));
    if (q.bp) sub.appendChild(el('b', null, 'BP ' + q.bp + (q.bonus_bp ? '+' + q.bonus_bp : '')));
    sub.appendChild(el('span', null, q.mira + ' 米拉'));
    sub.appendChild(el('span', null, q.chapter_name));
    if (q.order > 0) sub.appendChild(el('span', null, '全篇第 ' + q.order + ' 步'));

    const tb = $('#d-tabs');
    tb.innerHTML = '';
    const nCh = (q.choices || []).length;
    TABS.forEach((t, i) => {
      /* 「选项」页带上组数，不用点进去就知道有没有 */
      const label = (i === 2) ? (nCh ? '选项 ' + nCh : '选项') : t;
      const btn = el('button', tab === i ? 'on' : '', label);
      if (i === 2 && !nCh) btn.classList.add('dim');
      btn.onclick = () => { tab = i; renderDrawer(); };
      tb.appendChild(btn);
    });

    const body = $('#d-body');
    body.innerHTML = '';

    if (tab === 0) {
      const f = el('dl', 'facts');
      const add = (k, v) => {
        const d = el('div');
        d.appendChild(el('dt', null, k));
        d.appendChild(el('dd', null, v));
        f.appendChild(d);
      };
      const sib = questsOf(q.chapter);
      const pos = sib.findIndex((x) => x.id === q.id) + 1;
      const cnm = chOf(q.chapter);
      add('委托人', q.client || '—');
      add('攻略次序', q.order > 0 ? q.order + ' / ' + ORD_TOTAL + ' 步' : '未列入攻略');
      add('章内位置', '本章第 ' + pos + ' / ' + sib.length + ' 件');
      add('基础报酬', (q.bp ? 'BP ' + q.bp + (q.bonus_bp ? '+' + q.bonus_bp : '') + '　' : '') + q.mira + ' 米拉');
      add('手册条目', q.lines.length + ' 条');
      add('脚本选项', (q.choices && q.choices.length)
        ? q.choices.length + ' 组' + (q.choices.some((g) => g.bp) ? '（含 BP ' + q.bp + ' 判定）' : '')
        : '未还原出');
      add('任务编号', '#' + q.id);
      body.appendChild(f);

      if (q.unlock) {
        const n = el('div', 'note');
        n.appendChild(el('h4', null, '什么时候能接'));
        n.appendChild(el('p', null, q.unlock));
        body.appendChild(n);
      }

      const first = q.lines.find((l) => l.step === 0) || q.lines[0];
      if (first) {
        body.appendChild(el('h4', 'section-title', '委托内容'));
        body.appendChild(el('div', 'raw', first.text));
      }
      if (q.lines.length > 1) {
        body.appendChild(el('p', 'hint', msg('moreEntries', {n: q.lines.length - 1})));
      }
    } else if (tab === 1) {
      const ul = el('ul', 'steps');
      let i = 0, k = 0;
      while (i < q.lines.length) {
        const sid = q.lines[i].step;
        let j = i;
        while (j < q.lines.length && q.lines[j].step === sid) j++;
        const seg = q.lines.slice(i, j);
        k++;
        const li = el('li', 'step' + (seg.length > 1 ? ' multi' : ''));
        li.appendChild(el('div', 'sid', (sid ? '环节 ' + sid : '委托说明') + '　第 ' + k + ' 段'));
        seg.forEach((l) => li.appendChild(el('p', null, l.text)));
        ul.appendChild(li);
        i = j;
      }
      body.appendChild(ul);
      if (q.lines.filter((l) => l.branch).length) {
        const n = el('div', 'note');
        n.appendChild(el('h4', null, '关于分歧'));
        n.appendChild(el('p', null, msg('branches', {
          hint: msg(q.choices && q.choices.length ? 'branchAvailable' : 'branchMissing')
        })));
        body.appendChild(n);
      }
    } else if (tab === 2) {
      const cs = q.choices || [];
      body.appendChild(el('h4', 'section-title', '游戏里会出现的选项'));
      if (!cs.length) {
        const n = el('div', 'note');
        n.appendChild(el('h4', null, '这一件没还原出选项'));
        n.appendChild(el('p', null, msg('noChoices')));
        body.appendChild(n);
      } else {
        const anyBp = cs.some((g) => g.bp);
        body.appendChild(el('p', 'hint', msg(q.bonus_bp ? 'choicesBonus' : anyBp ? 'choicesBp' : 'choicesNoBp', {
          n: cs.length, bp: q.bp, bonus: q.bonus_bp
        })));
        cs.forEach((g, i) => {
          const b = el('div', 'choice');
          const h = el('div', 'ch-h');
          h.appendChild(el('span', 'idx', String(i + 1)));
          h.appendChild(bpBadge(g.bp, q.bp, g.rec && g.rec.bp));
          if (g.place) h.appendChild(el('span', 'ch-loc', g.place));
          b.appendChild(h);
          const box = el('div', 'ch-items');
          g.items.forEach((t, j) => {
            const c = el('span', 'chip' + (g.rec && j === g.rec.idx ? ' rec' : ''), t);
            if (g.rec && j === g.rec.idx) c.title = g.rec.why;
            box.appendChild(c);
          });
          b.appendChild(box);
          if (g.rec) b.appendChild(el('div', 'ch-why',
            '★ 推荐选「' + g.items[g.rec.idx] + '」· ' + g.rec.why));
          b.appendChild(el('div', 'ch-from', '脚本 ' + g.src));
          body.appendChild(b);
        });
      }
    } else {
      body.appendChild(el('h4', 'section-title', '手册原文'));
      body.appendChild(el('div', 'raw', q.lines.map((l) => l.text).join('\n\n')));
    }

    const btn = $('#d-done');
    btn.textContent = isDone ? '撤下印章' : '盖章 · 已结清';
    btn.classList.toggle('on', isDone);
    btn.onclick = () => {
      if (done.has(q.id)) done.delete(q.id); else done.add(q.id);
      save();
      renderBoard(); renderRail(); renderProgress(); renderDrawer();
    };
    $('#d-prev').onclick = () => step(-1);
    $('#d-next').onclick = () => step(1);
  }

  function render() { renderRail(); renderBoard(); renderProgress(); }

  /* ================= 绑定 ================= */
  $('#q').addEventListener('input', (e) => { query = e.target.value; renderBoard(); });
  $('#close').onclick = close;
  $('#scrim').onclick = close;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (!$('#drawer').classList.contains('show')) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  document.addEventListener('trails:language', () => {
    render();
    if ($('#drawer').classList.contains('show')) renderDrawer();
  });
  render();
})();

