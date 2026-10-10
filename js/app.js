/*
 * BlocWeb — l'application : espace de blocs, aperçu, code, fichiers, images.
 */
(function () {
  'use strict';
  var BW = window.BW;

  var STORE_KEY = 'blocweb:projet';
  var BACKUP_KEY = 'blocweb:precedent';
  var PREF_KEY = 'blocweb:preferences';

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var state = {
    mode: 'blocks',         // 'blocks' ou 'code'
    images: {},             // nom -> data URL
    code: '',               // code écrit en mode code
    codeFromBlocks: null,   // code au moment de passer en mode code
    selectedId: null,
    lastGen: null,
    brokenImages: {},
    lastPreview: null
  };
  BW.state = state;

  var ws, codeView, editor;
  var prefs = loadPrefs();

  /* ================================================================== */
  /* Petits outils                                                       */
  /* ================================================================== */

  function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function loadPrefs() {
    try { return JSON.parse(storageGet(PREF_KEY)) || {}; } catch (e) { return {}; }
  }
  function savePrefs() { storageSet(PREF_KEY, JSON.stringify(prefs)); }

  function debounce(fn, ms) {
    var t = null;
    var d = function () { clearTimeout(t); t = setTimeout(fn, ms); };
    d.now = function () { clearTimeout(t); fn(); };
    return d;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function slug(s, fallback) {
    var r = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return r || fallback || 'ma-page';
  }

  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 3500);
  }
  BW.toast = toast;

  // Ouvre le sélecteur de fichiers. (Un champ créé à la volée, car ceux de la
  // page sont inactifs quand une boîte de dialogue est ouverte.)
  function pickFiles(accept, multiple, done) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = !!multiple;
    input.hidden = true;
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      input.remove();
      if (files.length) done(files);
    });
    ($('#dlg').open ? $('#dlg') : document.body).appendChild(input);
    input.click();
  }

  function download(name, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ---------- Boîte de dialogue ---------- */
  // dialog({ title, html, buttons: [{ label, value, primary, danger }], wide, onOpen })
  // -> Promise(valeur du bouton, ou null si fermée)
  var dlgResolve = null;
  function dialog(o) {
    var dlg = $('#dlg');
    if (dlg.open) closeDialog(null);
    $('#dlg-title').textContent = o.title || '';
    var body = $('#dlg-body');
    body.innerHTML = o.html || '';
    var btns = $('#dlg-buttons');
    btns.innerHTML = '';
    (o.buttons || [{ label: 'Fermer', value: null }]).forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.textContent = b.label;
      el.className = 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '');
      el.addEventListener('click', function () { closeDialog(b.value); });
      btns.appendChild(el);
    });
    dlg.classList.toggle('wide', !!o.wide);
    return new Promise(function (resolve) {
      dlgResolve = resolve;
      dlg.showModal();
      if (o.onOpen) o.onOpen(body);
      var primary = btns.querySelector('.primary');
      if (primary) primary.focus();
    });
  }
  function closeDialog(value) {
    var dlg = $('#dlg');
    var r = dlgResolve;
    dlgResolve = null;
    if (dlg.open) dlg.close();
    if (r) r(value);
  }
  BW.dialog = dialog;
  BW.closeDialog = closeDialog;

  function confirmReplace(what) {
    return dialog({
      title: what,
      html: '<p>Ton projet actuel va être remplacé.</p>' +
        '<p class="muted">Pas de panique : tu pourras le récupérer avec <b>📂 Ouvrir → Récupérer mon projet précédent</b>.</p>',
      buttons: [{ label: 'Annuler', value: false }, { label: 'Continuer', value: true, primary: true }]
    });
  }

  /* ================================================================== */
  /* Blockly                                                             */
  /* ================================================================== */

  function initBlockly() {
    BW.labelMode = prefs.labelMode || 'both';
    ws = Blockly.inject('blockly', {
      toolbox: BW.buildToolbox(),
      theme: BW.theme,
      renderer: 'zelos',
      media: 'vendor/blockly/media/',
      grid: { spacing: 24, length: 2, colour: '#d9dfea', snap: false },
      zoom: { controls: true, wheel: false, startScale: 0.8, maxScale: 2, minScale: 0.35, scaleSpeed: 1.15, pinch: true },
      move: { scrollbars: true, drag: true, wheel: true },
      trashcan: true,
      sounds: false, // chargés plus bas depuis js/sounds.js (fonctionne aussi hors serveur)
      comments: false,
      maxInstances: { bw_page: 1 },
      plugins: { connectionChecker: 'bw_checker' }
    });
    BW.ws = ws;
    if (BW.SOUNDS) {
      var audio = ws.getAudioManager();
      Object.keys(BW.SOUNDS).forEach(function (k) {
        try { audio.load([BW.SOUNDS[k]], k); } catch (e) { /* pas de son */ }
      });
    }

    ws.registerButtonCallback('bwAddImages', function () { openImages(); });
    ws.addChangeListener(Blockly.Events.disableOrphans);
    ws.addChangeListener(onWorkspaceEvent);
  }

  function onWorkspaceEvent(e) {
    if (BW.loading) return;
    if (e.type === Blockly.Events.SELECTED) {
      onSelect(e.newElementId || null);
      return;
    }
    // Un clic sur un bloc replié le déplie.
    if (e.type === Blockly.Events.CLICK && e.targetType === 'block') {
      var cb = ws.getBlockById(e.blockId);
      if (cb && cb.isCollapsed()) cb.setCollapsed(false);
      return;
    }
    if (e.isUiEvent) return;
    scheduleUpdate();
  }

  // Charge un état de blocs (sans vérifier l'emboîtement : les conseils
  // signaleront les blocs mal rangés).
  function loadWorkspace(json) {
    BW.loading = true;
    BW.lenient = true;
    Blockly.Events.disable();
    try {
      ws.clear();
      if (json) Blockly.serialization.workspaces.load(json, ws);
      ws.getTopBlocks(false).forEach(function (b) {
        if (b.previousConnection && !b.hasDisabledReason('ORPHANED_BLOCK')) b.setDisabledReason(true, 'ORPHANED_BLOCK');
      });
    } finally {
      Blockly.Events.enable();
      BW.lenient = false;
      BW.loading = false;
    }
    ws.clearUndo();
    state.selectedId = null;
    state.lastPreview = null;
    state.brokenImages = {};
    adviceCache = {};
  }

  function selectBlock(id, scroll) {
    var b = ws.getBlockById(id);
    if (!b) return;
    try { Blockly.getFocusManager().focusNode(b); } catch (e) { b.select(); }
    if (Blockly.common.getSelected() !== b) {
      try { Blockly.common.setSelected(b); } catch (e2) { /* rien */ }
    }
    if (scroll !== false) {
      try { ws.scrollBoundsIntoView(b.getBoundingRectangle(), 40); } catch (e3) { ws.centerOnBlock(id); }
    }
    onSelect(id);
  }
  BW.selectBlock = selectBlock;

  /* ---------- Étiquettes : français / les deux / balises ---------- */

  function setLabelMode(m) {
    if (BW.labelMode === m) return;
    BW.labelMode = m;
    prefs.labelMode = m;
    savePrefs();
    $$('#labels-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-checked', b.dataset.mode === m); });
    if (!ws) return;
    Blockly.hideChaff();
    var json = Blockly.serialization.workspaces.save(ws);
    var sel = state.selectedId;
    var sx = ws.scrollX, sy = ws.scrollY;
    loadWorkspace(json);
    ws.updateToolbox(BW.buildToolbox());
    ws.scroll(sx, sy);
    update.now();
    if (sel && ws.getBlockById(sel)) selectBlock(sel, false);
  }

  /* ================================================================== */
  /* Mise à jour : code, aperçu, conseils                                */
  /* ================================================================== */

  var scheduleUpdate = debounce(function () { update(); }, 120);
  var update = debounce(function () {
    if (state.mode !== 'blocks') return;
    var gen = BW.generate(ws);
    state.lastGen = gen;
    setCodeView(gen.code);
    var prev = BW.generate(ws, { ids: true, mapAttr: mapImageSrc });
    setPreview(prev.empty ? emptyPreview() : prev.code);
    applyAdvice();
    highlightCode(state.selectedId);
    autosave();
  }, 0);

  function mapImageSrc(tag, name, value) {
    if (tag === 'img' && name === 'src') return imageUrl(value);
    return value;
  }
  function imageUrl(src) {
    var key = String(src || '').replace(/^\.\//, '');
    return state.images[key] || src;
  }

  function emptyPreview() {
    return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>body{font-family:sans-serif;color:#667;' +
      'display:grid;place-items:center;height:90vh;text-align:center}</style></head><body><p>Ta page est vide.<br>' +
      'Glisse le bloc <b>📄 page web</b> (catégorie Structure) dans l’espace de travail.</p></body></html>';
  }

  /* ---------- Vue du code (lecture seule) ---------- */

  var codeMark = null;
  function setCodeView(code) {
    if (codeView.getValue() === code) return;
    var info = codeView.getScrollInfo();
    codeView.setValue(code);
    codeView.scrollTo(info.left, info.top);
  }

  function highlightCode(id) {
    if (codeMark) { codeMark.clear(); codeMark = null; }
    codeView.getAllMarks().forEach(function (m) { m.clear(); });
    var gen = state.lastGen;
    if (!id || !gen || !gen.map[id]) return;
    var b = ws.getBlockById(id);
    if (b && b.type === 'bw_page') return;
    var r = gen.map[id];
    codeMark = codeView.markText(r.from, r.to, { className: 'cm-bw-hl' });
    if (r.to.line > r.from.line) {
      // Bloc sur plusieurs lignes : on fait ressortir la balise ouvrante et la balise fermante.
      codeView.markText(r.from, { line: r.from.line, ch: codeView.getLine(r.from.line).length }, { className: 'cm-bw-hl-tag' });
      codeView.markText({ line: r.to.line, ch: codeView.getLine(r.to.line).search(/\S/) }, r.to, { className: 'cm-bw-hl-tag' });
    }
    codeView.scrollIntoView({ from: r.from, to: r.to.line - r.from.line > 12 ? r.from : r.to }, 30);
  }

  /* ---------- Aperçu ---------- */

  var PREVIEW_CSS = '[data-bw-sel]{outline:3px solid #e8308c !important;outline-offset:2px !important;' +
    'box-shadow:0 0 0 7px rgba(232,48,140,.18) !important;}';

  function setPreview(html) {
    if (html === state.lastPreview) return;
    state.lastPreview = html;
    var f = $('#preview');
    try {
      var w = f.contentWindow;
      if (w && w.document && w.document.body) state.previewScroll = { x: w.scrollX, y: w.scrollY };
    } catch (e) { /* rien */ }
    f.srcdoc = html;
  }

  function previewDoc() {
    try { return $('#preview').contentDocument; } catch (e) { return null; }
  }

  function onPreviewLoad() {
    var f = $('#preview');
    var doc = previewDoc();
    if (!doc || !doc.documentElement) return;
    var s = doc.createElement('style');
    s.setAttribute('data-bw-ui', '');
    s.textContent = PREVIEW_CSS;
    (doc.head || doc.documentElement).appendChild(s);
    if (state.previewScroll) {
      try { f.contentWindow.scrollTo(state.previewScroll.x, state.previewScroll.y); } catch (e) { /* rien */ }
    }
    doc.addEventListener('click', onPreviewClick, true);
    doc.addEventListener('submit', function (e) { e.preventDefault(); }, true);
    checkImages(doc);
    if (state.mode === 'blocks') highlightPreview(state.selectedId, false);
  }

  function onPreviewClick(e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var a = target.closest('a[href]');
    if (a) {
      e.preventDefault();
      var href = a.getAttribute('href');
      if (/^https?:\/\//i.test(href) && (e.ctrlKey || e.metaKey)) window.open(href, '_blank', 'noopener');
      else if (/^https?:\/\//i.test(href)) toast('Ce lien mène à ' + href + ' — Ctrl + clic pour l’ouvrir dans un nouvel onglet.');
      else if (href.charAt(0) === '#') {
        var t = previewDoc().getElementById(href.slice(1));
        if (t) t.scrollIntoView({ behavior: 'smooth' });
      } else toast('Ce lien mène à la page « ' + href + ' » de ton site.');
    }
    if (state.mode !== 'blocks') return;
    var el = target.closest('[data-bw]');
    if (el) selectBlock(el.getAttribute('data-bw'));
  }

  // Repère les images qui ne s'affichent pas (adresse fausse, image absente…).
  var imgCheckToken = 0;
  function checkImages(doc) {
    if (state.mode !== 'blocks') return;
    var token = ++imgCheckToken;
    var imgs = Array.prototype.slice.call(doc.querySelectorAll('img[data-bw]')).filter(function (img) {
      return img.getAttribute('src');
    });
    Promise.all(imgs.map(function (img) {
      return img.decode().then(function () { return null; }, function () { return img.getAttribute('data-bw'); });
    })).then(function (ids) {
      if (token !== imgCheckToken) return;
      var broken = {};
      ids.forEach(function (id) { if (id) broken[id] = true; });
      state.brokenImages = broken;
      applyAdvice();
    });
  }

  function highlightPreview(id, scroll) {
    var doc = previewDoc();
    if (!doc || !doc.querySelectorAll) return;
    doc.querySelectorAll('[data-bw-sel]').forEach(function (e) { e.removeAttribute('data-bw-sel'); });
    if (!id) return;
    var b = ws.getBlockById(id);
    var els = [];
    while (b) {
      var d = BW.DEFS[b.type];
      if (!d || d.shape === 'page') break;
      if (d.shape === 'cssrule' || d.shape === 'cssrulefree') {
        var sel = String(b.getFieldValue('SEL') || '').replace(/[<>{}]/g, '');
        try { els = Array.prototype.slice.call(doc.body.querySelectorAll(sel)); } catch (e) { els = []; }
        if (/^\s*(body|html)\s*$/.test(sel)) els = [doc.body];
        break;
      }
      var found = doc.querySelectorAll('[data-bw="' + CSS.escape(b.id) + '"]');
      if (found.length) { els = Array.prototype.slice.call(found); break; }
      b = b.getSurroundParent();
    }
    els.forEach(function (e) { e.setAttribute('data-bw-sel', ''); });
    if (els[0] && scroll !== false && els[0] !== doc.body) {
      try { els[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* rien */ }
    }
  }

  function onSelect(id) {
    state.selectedId = id;
    highlightCode(id);
    highlightPreview(id);
  }

  /* ---------- Conseils ---------- */

  var adviceCache = {};
  function applyAdvice() {
    if (state.mode !== 'blocks') return;
    var res = BW.advise(ws, { brokenImages: state.brokenImages });
    var next = {};
    ws.getAllBlocks(false).forEach(function (b) {
      if (b.isInsertionMarker()) return;
      var msgs = res.byBlock[b.id];
      var text = msgs ? msgs.join('\n\n') : null;
      next[b.id] = text;
      if ((adviceCache[b.id] || null) !== text) b.setWarningText(text);
    });
    adviceCache = next;
    renderAdviceList(res);
  }

  function blockName(b) {
    var d = BW.DEFS[b.type];
    if (!d) return b.type;
    if (d.shape === 'heading') return 'titre niveau ' + b.getFieldValue('LEVEL');
    var tag = d.shape === 'cssprop' || d.shape === 'csspropfree' ? '' : d.tag && d.shape !== 'textnode' && d.shape !== 'comment' ? ' <' + (d.shape === 'generic' ? b.getFieldValue('TAG') : d.tag) + '>' : '';
    return d.fr + tag;
  }

  function renderAdviceList(res) {
    var list = $('#advice-list');
    var count = 0;
    var html = '';
    (res.general || []).forEach(function (msg) {
      count++;
      html += '<li><div class="adv-general">' + escHtml(msg) + '</div></li>';
    });
    res.order.forEach(function (id) {
      var b = ws.getBlockById(id);
      if (!b) return;
      res.byBlock[id].forEach(function (msg) {
        count++;
        html += '<li><button type="button" data-id="' + escHtml(id) + '"><span class="adv-block">' + escHtml(blockName(b)) +
          '</span> ' + escHtml(msg) + '</button></li>';
      });
    });
    setAdviceList(html, count);
  }

  function setAdviceList(html, count) {
    $('#advice-list').innerHTML = html || '<li class="adv-ok">👍 Bravo, aucun conseil pour le moment !</li>';
    var badge = $('#advice-count');
    badge.textContent = count;
    badge.classList.toggle('zero', count === 0);
  }

  /* ---------- Vérification du code (mode code) ---------- */

  var errLines = [];
  function checkCode() {
    errLines.forEach(function (h) { editor.removeLineClass(h, 'wrap', 'cm-bw-err'); });
    errLines = [];
    var issues = BW.checkCode(editor.getValue());
    var html = '';
    issues.forEach(function (it) {
      errLines.push(editor.addLineClass(it.line, 'wrap', 'cm-bw-err'));
      html += '<li><button type="button" data-line="' + it.line + '"><span class="adv-block">ligne ' + (it.line + 1) +
        '</span> ' + escHtml(it.msg) + '</button></li>';
    });
    setAdviceList(html, issues.length);
  }

  /* ================================================================== */
  /* Mode code                                                           */
  /* ================================================================== */

  var codePreview = debounce(function () {
    if (state.mode !== 'code') return;
    state.code = editor.getValue();
    setPreview(resolveImagesInCode(state.code));
    checkCode();
    autosave();
  }, 350);

  function resolveImagesInCode(code) {
    return code.replace(/(<img\b[^>]*?\ssrc\s*=\s*)("([^"]*)"|'([^']*)')/gi, function (all, pre, q, d1, d2) {
      var src = d1 != null ? d1 : d2;
      var url = imageUrl(src);
      return url === src ? all : pre + '"' + url.replace(/"/g, '%22') + '"';
    });
  }

  async function enterCodeMode(code, silent) {
    if (state.mode === 'code') return;
    if (!silent && !prefs.codeIntroSeen) {
      var ok = await dialog({
        title: '⌨️ Passer au code',
        html: '<p>Tu vas maintenant <b>écrire le HTML toi-même</b>, comme les développeurs web. Le code de tes blocs est déjà là pour t’aider à démarrer.</p>' +
          '<ul><li>Tape <code>&lt;</code> pour voir la liste des balises.</li>' +
          '<li>Quand tu ouvres une balise, sa balise fermante s’ajoute toute seule.</li>' +
          '<li>L’aperçu se met à jour pendant que tu écris.</li></ul>' +
          '<p>Tu peux revenir aux blocs à tout moment : ton code sera transformé en blocs.</p>',
        buttons: [{ label: 'Annuler', value: false }, { label: 'C’est parti !', value: true, primary: true }]
      });
      if (!ok) return;
      prefs.codeIntroSeen = true;
      savePrefs();
    }
    update.now();
    Blockly.hideChaff();
    // Les blocs ne changent pas en mode code : on garde leur code pour savoir,
    // au retour, si l'élève a modifié quelque chose.
    var fromBlocks = state.lastGen ? state.lastGen.code : '';
    state.codeFromBlocks = fromBlocks;
    var rules = ws.getAllBlocks(false).filter(function (b) { return /^bw_css_rule/.test(b.type); });
    state.cssCollapsed = rules.length > 0 && rules.every(function (b) { return b.isCollapsed(); });
    state.code = code != null ? code : fromBlocks;
    state.mode = 'code';
    applyModeUI();
    editor.setValue(state.code);
    editor.clearHistory();
    editor.refresh();
    editor.focus();
    state.lastPreview = null;
    codePreview.now();
  }

  async function exitCodeMode() {
    if (state.mode !== 'code') return;
    var code = editor.getValue();
    if (code !== state.codeFromBlocks) {
      var r = BW.importHTML(code, { collapseCss: state.cssCollapsed });
      var errors = BW.checkCode(code).length;
      if (r.warnings.length || errors) {
        var go = await dialog({
          title: '🧩 Revenir aux blocs',
          html: (errors ? '<p>⚠️ Ton code contient <b>' + errors + ' erreur' + (errors > 1 ? 's' : '') + '</b> (voir les Conseils). ' +
            'Les blocs montreront ta page telle que le navigateur la comprend, ce qui n\u2019est peut-être pas ce que tu voulais.</p>' : '') +
            (r.warnings.length ? '<p>Une partie de ton code ne peut pas devenir des blocs :</p><ul>' +
            r.warnings.map(function (w) { return '<li>' + escHtml(w) + '</li>'; }).join('') + '</ul>' +
            '<p>Si tu reviens aux blocs, cette partie sera perdue.</p>' : ''),
          buttons: [{ label: 'Rester dans le code', value: false }, { label: 'Revenir aux blocs quand même', value: true, primary: true }]
        });
        if (!go) return;
      }
      loadWorkspace(r.state);
      state.mode = 'blocks';
      applyModeUI();
      var generic = ws.getAllBlocks(false).some(function (b) { return b.type === 'bw_generic'; });
      toast('Ton code a été transformé en blocs.' + (generic ? ' Les blocs gris « balise » sont des balises qui n\u2019ont pas de bloc à elles.' : ''), 5000);
    } else {
      state.mode = 'blocks';
      applyModeUI();
    }
    state.code = '';
    state.codeFromBlocks = null;
    state.lastPreview = null;
    Blockly.svgResize(ws);
    update.now();
  }

  function applyModeUI() {
    var code = state.mode === 'code';
    document.body.classList.toggle('mode-code', code);
    $('#mode-blocks').classList.toggle('on', !code);
    $('#mode-code').classList.toggle('on', code);
    $('#mode-blocks').setAttribute('aria-pressed', !code);
    $('#mode-code').setAttribute('aria-pressed', code);
    $('#blockly').hidden = code;
    $('#editor').hidden = !code;
    $('#blocks-head').hidden = code;
    $('#code-head').hidden = !code;
    $('#code-panel').hidden = code;
    $('#gutter-h').hidden = code;
    $('#preview-hint').textContent = code ? 'L’aperçu suit ton code.' : 'Clique sur un élément pour retrouver son bloc.';
    if (!code) setTimeout(function () { Blockly.svgResize(ws); codeView.refresh(); }, 0);
  }

  // Liste des balises proposées par l'autocomplétion du mode code.
  function hintSchema() {
    var g = { class: null, id: null, title: null };
    function t(attrs) { return { attrs: Object.assign({}, g, attrs || {}) }; }
    var s = { '!top': ['html'], '!attrs': g };
    ['head', 'body', 'title', 'style', 'header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'mark', 'small', 'span', 'br', 'hr', 'blockquote',
      'ul', 'ol', 'li', 'figure', 'figcaption', 'table', 'caption', 'tr', 'th', 'td'].forEach(function (k) { s[k] = t(); });
    s.html = t({ lang: ['fr'] });
    s.meta = t({ charset: ['utf-8'] });
    s.a = t({ href: null });
    s.img = t({ src: Object.keys(state.images), alt: null });
    return s;
  }

  function initEditors() {
    codeView = CodeMirror($('#code-view'), {
      value: '', mode: 'htmlmixed', readOnly: true, lineNumbers: true, lineWrapping: true,
      cursorBlinkRate: -1, tabSize: 2, viewportMargin: 50
    });
    codeView.on('mousedown', function () {
      setTimeout(function () {
        if (!state.lastGen) return;
        var id = BW.blockAtPos(state.lastGen.map, codeView.getCursor());
        if (id) selectBlock(id);
      }, 0);
    });

    function completeAfter(cm, pred) {
      if (!pred || pred()) {
        setTimeout(function () {
          if (!cm.state.completionActive) cm.showHint({ completeSingle: false, schemaInfo: hintSchema() });
        }, 100);
      }
      return CodeMirror.Pass;
    }
    function completeIfAfterLt(cm) {
      return completeAfter(cm, function () {
        var cur = cm.getCursor();
        return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) === '<';
      });
    }
    function completeIfInTag(cm) {
      return completeAfter(cm, function () {
        var tok = cm.getTokenAt(cm.getCursor());
        if (tok.type === 'string' && (!/['"]/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length === 1)) return false;
        var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
        return inner.tagName;
      });
    }
    editor = CodeMirror($('#editor'), {
      value: '', mode: 'htmlmixed', lineNumbers: true, lineWrapping: true, tabSize: 2, indentUnit: 2,
      // Les balises « boîtes » s'ouvrent sur plusieurs lignes, les autres restent sur une ligne.
      autoCloseTags: {
        whenOpening: true, whenClosing: true,
        indentTags: ['html', 'head', 'body', 'style', 'header', 'nav', 'main', 'section', 'article', 'aside',
          'footer', 'div', 'ul', 'ol', 'table', 'tr', 'figure', 'blockquote']
      },
      matchTags: { bothTags: true }, styleActiveLine: true,
      extraKeys: {
        "'<'": completeAfter, "'/'": completeIfAfterLt, "' '": completeIfInTag, "'='": completeIfInTag,
        'Ctrl-Space': function (cm) { cm.showHint({ completeSingle: false, schemaInfo: hintSchema() }); },
        Tab: function (cm) {
          if (cm.somethingSelected()) cm.indentSelection('add');
          else cm.replaceSelection('  ');
        },
        'Shift-Tab': function (cm) { cm.indentSelection('subtract'); }
      }
    });
    editor.on('change', function () { codePreview(); });
  }

  /* ================================================================== */
  /* Projet : sauvegarde, ouverture, export                              */
  /* ================================================================== */

  function projectData() {
    return {
      app: 'BlocWeb',
      version: 2,
      savedAt: new Date().toISOString(),
      mode: state.mode,
      workspace: Blockly.serialization.workspaces.save(ws),
      code: state.mode === 'code' ? editor.getValue() : '',
      images: state.images
    };
  }

  var storageWarned = false;
  var autosave = debounce(function () {
    var ok = storageSet(STORE_KEY, JSON.stringify(projectData()));
    if (!ok && !storageWarned) {
      storageWarned = true;
      dialog({
        title: '⚠️ Mémoire du navigateur pleine',
        html: '<p>Ton projet est trop gros pour être sauvegardé automatiquement dans le navigateur (souvent à cause des images).</p>' +
          '<p><b>Enregistre-le dans un fichier</b> avec le bouton 💾 Enregistrer pour ne pas perdre ton travail.</p>',
        buttons: [{ label: 'Compris', value: true, primary: true }]
      });
    }
  }, 600);

  function backupCurrent() {
    if (!ws) return;
    var data = projectData();
    storageSet(BACKUP_KEY, JSON.stringify(data));
  }

  async function loadProject(p) {
    if (!p || typeof p !== 'object' || !p.workspace) throw new Error('format');
    if (state.mode === 'code') { state.mode = 'blocks'; applyModeUI(); }
    state.images = cleanImages(p.images);
    loadWorkspace(BW.migrateState(p.workspace));
    update.now();
    if (p.mode === 'code') await enterCodeMode(p.code || '', true);
    setTimeout(showPageTop, 0);
  }

  // Ne garde que des images valides, aux noms de fichiers simples.
  function cleanImages(images) {
    var out = {};
    if (!images || typeof images !== 'object') return out;
    Object.keys(images).forEach(function (k) {
      var v = images[k];
      if (/^[a-z0-9][a-z0-9._-]*$/i.test(k) && typeof v === 'string' && /^data:image\//.test(v)) out[k] = v;
    });
    return out;
  }

  // Fait défiler l'espace de travail pour voir le haut de la page.
  function showPageTop() {
    var page = BW.findPage(ws) || ws.getTopBlocks(true)[0];
    if (!page) return;
    var xy = page.getRelativeToSurfaceXY();
    var s = ws.scale;
    ws.scroll(24 - xy.x * s, 24 - xy.y * s);
  }

  async function loadTemplate(t) {
    var r = BW.importHTML(t.html, { collapseCss: true });
    await loadProject({ workspace: r.state, images: Object.assign({}, t.images || {}), mode: 'blocks' });
  }

  function pageTitle() {
    if (state.mode === 'code') {
      var m = /<title>([^<]*)<\/title>/i.exec(editor.getValue());
      return m ? m[1] : 'ma-page';
    }
    return BW.pageTitle(ws) || 'ma-page';
  }

  function currentCode() {
    if (state.mode === 'code') return editor.getValue();
    update.now();
    return state.lastGen.code;
  }

  function usedImages(code) {
    var used = [];
    var re = /<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, m;
    while ((m = re.exec(code))) {
      var src = (m[1] != null ? m[1] : m[2]).replace(/^\.\//, '');
      if (state.images[src] && used.indexOf(src) < 0) used.push(src);
    }
    return used;
  }

  function exportPage() {
    var code = currentCode();
    var name = slug(pageTitle());
    var imgs = usedImages(code);
    if (!imgs.length) {
      download(name + '.html', new Blob([code], { type: 'text/html;charset=utf-8' }));
      toast('Ta page « ' + name + '.html » est téléchargée. Ouvre-la avec ton navigateur !');
      return;
    }
    var files = [{ name: 'index.html', data: new TextEncoder().encode(code) }];
    imgs.forEach(function (n) { files.push({ name: n, data: BW.dataUrlToBytes(state.images[n]) }); });
    download(name + '.zip', BW.makeZip(files));
    dialog({
      title: '🌐 Page téléchargée',
      html: '<p>Ta page utilise des images : elle est téléchargée dans un dossier compressé <b>' + escHtml(name) + '.zip</b>.</p>' +
        '<ol><li>Décompresse ce dossier (clic droit → <i>Extraire tout</i>).</li>' +
        '<li>Ouvre <b>index.html</b> avec ton navigateur.</li></ol>' +
        '<p class="muted">Les images doivent rester à côté du fichier index.html : c’est grâce à leur nom (src="' + escHtml(imgs[0]) + '") que la page les retrouve.</p>',
      buttons: [{ label: 'Compris', value: true, primary: true }]
    });
  }

  function saveProjectFile() {
    var data = JSON.stringify(projectData());
    var name = slug(pageTitle()) + '.blocweb';
    download(name, new Blob([data], { type: 'application/json' }));
    toast('Ton projet « ' + name + ' » est téléchargé. Tu pourras le rouvrir avec 📂 Ouvrir.');
  }

  function openSaveDialog() {
    dialog({
      title: '💾 Enregistrer',
      html: '<p>Ton travail est <b>sauvegardé automatiquement</b> dans ce navigateur, sur cet ordinateur.</p>' +
        '<p>Pour le garder ailleurs (clé USB, ENT, envoi au professeur), télécharge-le :</p>' +
        '<div class="choice-list">' +
        '<button type="button" class="choice" data-act="project"><span class="big">🧩</span><span><b>Le projet BlocWeb</b> (.blocweb)<br><small>Pour continuer à travailler plus tard avec les blocs.</small></span></button>' +
        '<button type="button" class="choice" data-act="page"><span class="big">🌐</span><span><b>La page web</b> (.html)<br><small>Pour l’ouvrir dans un navigateur ou la publier.</small></span></button>' +
        '</div>',
      buttons: [{ label: 'Fermer', value: null }],
      onOpen: function (body) {
        body.querySelector('[data-act=project]').addEventListener('click', function () { closeDialog(null); saveProjectFile(); });
        body.querySelector('[data-act=page]').addEventListener('click', function () { closeDialog(null); exportPage(); });
      }
    });
  }

  function openOpenDialog() {
    var backup = null;
    try { backup = JSON.parse(storageGet(BACKUP_KEY)); } catch (e) { backup = null; }
    var when = backup && backup.savedAt ? new Date(backup.savedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    dialog({
      title: '📂 Ouvrir',
      html: '<div class="choice-list">' +
        '<button type="button" class="choice" data-act="file"><span class="big">💻</span><span><b>Un fichier de l’ordinateur</b><br><small>Un projet BlocWeb (.blocweb) ou une page web (.html), qui sera transformée en blocs.</small></span></button>' +
        (backup ? '<button type="button" class="choice" data-act="backup"><span class="big">↩️</span><span><b>Récupérer mon projet précédent</b><br><small>Le projet remplacé le ' + escHtml(when) + '.</small></span></button>' : '') +
        '</div>',
      buttons: [{ label: 'Fermer', value: null }],
      onOpen: function (body) {
        body.querySelector('[data-act=file]').addEventListener('click', function () {
          pickFiles('.blocweb,.json,.html,.htm', false, function (files) { onFileChosen(files[0]); });
          closeDialog(null);
        });
        var b = body.querySelector('[data-act=backup]');
        if (b) b.addEventListener('click', async function () {
          closeDialog(null);
          var current = JSON.stringify(projectData());
          await loadProject(backup);
          storageSet(BACKUP_KEY, current);
          toast('Ton projet précédent est revenu ! (Le projet que tu viens de quitter peut être récupéré de la même façon.)', 5000);
        });
      }
    });
  }

  function onFileChosen(file) {
    var reader = new FileReader();
    reader.onload = async function () {
      var text = String(reader.result);
      var isHtml = /\.html?$/i.test(file.name) || /^\s*</.test(text);
      try {
        backupCurrent();
        if (isHtml) {
          var r = BW.importHTML(text);
          await loadProject({ workspace: r.state, images: state.images, mode: 'blocks' });
          var msg = 'La page « ' + file.name + ' » a été transformée en blocs.';
          if (r.warnings.length) {
            dialog({ title: '📂 Page ouverte', html: '<p>' + escHtml(msg) + '</p><p>Attention :</p><ul>' +
              r.warnings.map(function (w) { return '<li>' + escHtml(w) + '</li>'; }).join('') + '</ul>' });
          } else toast(msg);
        } else {
          await loadProject(JSON.parse(text));
          toast('Le projet « ' + file.name + ' » est ouvert.');
        }
      } catch (e) {
        console.error(e);
        dialog({ title: '😕 Impossible d’ouvrir ce fichier', html: '<p>Ce fichier n’est pas un projet BlocWeb ou une page web valide.</p>' });
      }
    };
    reader.readAsText(file);
  }

  async function newProject() {
    if (!(await confirmReplace('📄 Nouveau projet'))) return;
    backupCurrent();
    await loadTemplate(BW.TEMPLATES[0]);
    autosave.now();
  }

  function openTemplates() {
    var html = '<p>Choisis un modèle pour démarrer. Tu pourras tout modifier ensuite.</p><div class="cards">' +
      BW.TEMPLATES.map(function (t, i) {
        return '<button type="button" class="card" data-i="' + i + '"><span class="big">' + t.emoji + '</span><b>' +
          escHtml(t.name) + '</b><small>' + escHtml(t.desc) + '</small></button>';
      }).join('') + '</div>';
    dialog({
      title: '✨ Modèles de pages', html: html, wide: true,
      onOpen: function (body) {
        body.querySelectorAll('.card').forEach(function (c) {
          c.addEventListener('click', async function () {
            var t = BW.TEMPLATES[+c.dataset.i];
            closeDialog(null);
            if (!(await confirmReplace(t.emoji + ' ' + t.name))) return;
            backupCurrent();
            await loadTemplate(t);
            autosave.now();
            toast('Modèle « ' + t.name + ' » chargé. À toi de jouer !');
          });
        });
      }
    });
  }

  /* ================================================================== */
  /* Mes images                                                          */
  /* ================================================================== */

  function cleanImageName(name, ext) {
    var base = name.replace(/\.[^.]+$/, '');
    var e = (ext || (/\.([^.]+)$/.exec(name) || [, 'png'])[1]).toLowerCase();
    if (e === 'jpeg') e = 'jpg';
    var n = slug(base, 'image') + '.' + e;
    var i = 2;
    while (state.images[n]) { n = slug(base, 'image') + '-' + i + '.' + e; i++; }
    return n;
  }

  function readImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var url = String(reader.result);
        var type = file.type || '';
        if (type === 'image/svg+xml' || type === 'image/gif' || /\.(svg|gif)$/i.test(file.name)) {
          resolve({ name: cleanImageName(file.name), url: url });
          return;
        }
        var img = new Image();
        img.onload = function () {
          var MAX = 1200;
          var big = img.width > MAX || img.height > MAX || file.size > 500000;
          if (!big) { resolve({ name: cleanImageName(file.name), url: url }); return; }
          var k = Math.min(1, MAX / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          var ctx = c.getContext('2d');
          var png = type === 'image/png';
          if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var out = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
          if (png && out.length > 900000) { // PNG trop lourd : on passe en JPEG
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            out = c.toDataURL('image/jpeg', 0.85);
            resolve({ name: cleanImageName(file.name, 'jpg'), url: out });
            return;
          }
          resolve({ name: cleanImageName(file.name, png ? 'png' : 'jpg'), url: out });
        };
        img.onerror = function () { reject(new Error('image')); };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
  }

  var imagePickTarget = null; // bloc image à remplir
  var IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i;

  async function addImageFiles(files) {
    var added = [];
    for (var i = 0; i < files.length; i++) {
      if (!/^image\//.test(files[i].type) && !IMAGE_EXT.test(files[i].name)) continue;
      try {
        var r = await readImage(files[i]);
        state.images[r.name] = r.url;
        added.push(r.name);
      } catch (e) { toast('L’image « ' + files[i].name + ' » n’a pas pu être lue.'); }
    }
    if (added.length) {
      state.lastPreview = null;
      if (state.mode === 'blocks') update.now(); else codePreview.now();
      autosave.now();
    }
    return added;
  }

  function imageSize(url) {
    var kb = Math.round(url.length * 0.75 / 1024);
    return kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' Mo' : kb + ' ko';
  }

  function openImages(target) {
    imagePickTarget = target || null;
    var names = Object.keys(state.images);
    var html = (target ? '<p>Clique sur l’image à afficher dans ton bloc.</p>' :
      '<p>Ajoute ici les images de ta page. Pour en afficher une, écris son nom dans un bloc image (src), ou clique sur 📁 dans le bloc.</p>') +
      '<div class="img-grid">' +
      names.map(function (n) {
        return '<div class="img-card"><button type="button" class="img-thumb" data-name="' + escHtml(n) + '" title="' +
          (target ? 'Utiliser cette image' : 'Copier le nom') + '"><img src="' + escHtml(state.images[n]) + '" alt=""></button>' +
          '<code>' + escHtml(n) + '</code><small>' + imageSize(state.images[n]) + '</small>' +
          '<button type="button" class="img-del" data-name="' + escHtml(n) + '" title="Supprimer cette image">🗑️</button></div>';
      }).join('') +
      '<button type="button" class="img-card img-add" id="img-add"><span class="big">➕</span>Ajouter des images<br><small>depuis l’ordinateur</small></button>' +
      '</div><p class="muted">Astuce : tu peux aussi utiliser l’adresse d’une image trouvée sur Internet (elle commence par https://). Pense à vérifier que tu as le droit de l’utiliser !</p>';
    dialog({
      title: target ? '📁 Choisir une image' : '🖼️ Mes images', html: html, wide: true,
      onOpen: function (body) {
        body.querySelector('#img-add').addEventListener('click', function () {
          pickFiles('image/*', true, async function (files) {
            var added = await addImageFiles(files);
            if (!added.length) return;
            toast(added.length === 1 ? 'Image ajoutée : ' + added[0] : added.length + ' images ajoutées.');
            if ($('#dlg').open) openImages(imagePickTarget);
          });
        });
        body.querySelectorAll('.img-thumb').forEach(function (b) {
          b.addEventListener('click', function () {
            var n = b.dataset.name;
            if (imagePickTarget) {
              var blk = imagePickTarget;
              closeDialog(null);
              Blockly.Events.setGroup(true);
              blk.setFieldValue(n, 'SRC');
              if (!String(blk.getFieldValue('ALT') || '').trim()) blk.setFieldValue('', 'ALT');
              Blockly.Events.setGroup(false);
              selectBlock(blk.id, false);
              toast('Image « ' + n + ' » choisie. Pense à écrire sa description (alt) !');
            } else {
              if (navigator.clipboard) navigator.clipboard.writeText(n).catch(function () {});
              toast('Nom de l’image : ' + n + ' (copié)');
            }
          });
        });
        body.querySelectorAll('.img-del').forEach(function (b) {
          b.addEventListener('click', async function () {
            var n = b.dataset.name;
            var t = imagePickTarget;
            var ok = await dialog({ title: '🗑️ Supprimer l’image', html: '<p>Supprimer « ' + escHtml(n) + ' » de tes images ?</p>',
              buttons: [{ label: 'Annuler', value: false }, { label: 'Supprimer', value: true, danger: true }] });
            if (ok) {
              delete state.images[n];
              state.lastPreview = null;
              if (state.mode === 'blocks') update.now(); else codePreview.now();
              autosave.now();
            }
            openImages(t);
          });
        });
      }
    });
  }
  BW.pickImageFor = function (block) { openImages(block); };

  /* ================================================================== */
  /* Aide et mémo                                                        */
  /* ================================================================== */

  function memoHtml() {
    var rows = '';
    var seen = {};
    BW.CATEGORIES.forEach(function (c) {
      var defs = BW.DEF_LIST.filter(function (d) { return d.cat === c.id && d.shape !== 'cssprop'; });
      if (c.id === 'style') {
        rows += '<tr class="cat"><th colspan="3">' + c.emoji + ' ' + escHtml(c.name) + '</th></tr>';
        rows += '<tr><td>style pour</td><td><code>sélecteur { }</code></td><td>' + escHtml(BW.DEFS.bw_css_rule.memo) + '</td></tr>';
        BW.DEF_LIST.filter(function (d) { return d.shape === 'cssprop'; }).forEach(function (d) {
          rows += '<tr><td>' + escHtml(d.fr) + '</td><td><code>' + escHtml(d.prop) + '</code></td><td>' + escHtml(d.tip) + '</td></tr>';
        });
        return;
      }
      if (!defs.length) return;
      rows += '<tr class="cat"><th colspan="3">' + c.emoji + ' ' + escHtml(c.name) + '</th></tr>';
      defs.forEach(function (d) {
        var key = d.tag + d.shape;
        if (d.shape === 'cssrulefree' || seen[key]) return;
        seen[key] = true;
        var code = d.shape === 'heading' ? '<h1> … <h6>' : d.shape === 'comment' ? '<!-- … -->' : d.shape === 'textnode' ? '(sans balise)' :
          d.shape === 'csspropfree' ? 'propriété: valeur;' : d.shape === 'generic' ? '<…>' : '<' + d.tag + '>';
        rows += '<tr><td>' + escHtml(d.fr) + '</td><td><code>' + escHtml(code) + '</code></td><td>' + escHtml(d.memo || d.tip) + '</td></tr>';
      });
    });
    return '<table class="memo"><thead><tr><th>Bloc</th><th>Code</th><th>À quoi ça sert ?</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function helpHtml() {
    return '<ol class="steps">' +
      '<li><b>Choisis une catégorie</b> à gauche (Structure, Texte, Listes…) puis <b>glisse un bloc</b> à l’intérieur du bloc « page web ».</li>' +
      '<li><b>Les blocs s’emboîtent comme les balises HTML</b> : un bloc rangé dans un autre, c’est une balise à l’intérieur d’une autre. Si un bloc ne veut pas s’accrocher, c’est qu’il n’a pas le droit d’aller à cet endroit !</li>' +
      '<li><b>Clique sur un bloc</b> : son code s’éclaire dans le « Code HTML » et il est entouré dans l’aperçu. Ça marche aussi dans l’autre sens : clique dans l’aperçu ou dans le code pour retrouver le bloc.</li>' +
      '<li><b>Étiquettes</b> : choisis ce qui est écrit sur les blocs. <i>Français</i> pour débuter, <i>Les deux</i> pour apprendre les balises, <i>Balises</i> pour voir les blocs comme du vrai code.</li>' +
      '<li><b>⚠️ Conseils</b> : ils t’aident à construire une page bien organisée. Clique sur un conseil pour trouver le bloc concerné.</li>' +
      '<li>Quand tu te sens prêt·e, clique sur <b>⌨️ Code</b> pour écrire le HTML toi-même. Les conseils te signalent alors les balises mal fermées ou mal rangées. Tu peux revenir aux blocs quand tu veux.</li>' +
      '</ol>' +
      '<p class="muted">Raccourcis : <kbd>Ctrl</kbd>+<kbd>Z</kbd> annuler, <kbd>Ctrl</kbd>+<kbd>Y</kbd> rétablir, <kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>Ctrl</kbd>+<kbd>V</kbd> copier-coller un bloc, <kbd>Suppr</kbd> supprimer le bloc choisi, <kbd>Ctrl</kbd>+<kbd>S</kbd> enregistrer.</p>';
  }

  function openHelp(tab) {
    dialog({
      title: 'Aide',
      wide: true,
      html: '<div class="tabs" role="tablist"><button type="button" data-tab="how">🧭 Comment ça marche ?</button>' +
        '<button type="button" data-tab="memo">📖 Mémo des balises</button><button type="button" data-tab="about">ℹ️ À propos</button></div>' +
        '<div class="tab" data-tab="how">' + helpHtml() + '</div>' +
        '<div class="tab" data-tab="memo" hidden>' + memoHtml() + '</div>' +
        '<div class="tab" data-tab="about" hidden><p><b>BlocWeb</b> aide les collégiennes et collégiens à créer des pages web avec des blocs, ' +
        'puis à passer en douceur à l’écriture du code HTML et CSS.</p><p>Il fonctionne dans le navigateur, même sans connexion à Internet. ' +
        'Les projets restent sur ton ordinateur : rien n’est envoyé sur Internet.</p>' +
        '<p class="muted">Construit avec Blockly (Apache 2.0) et CodeMirror (MIT).</p></div>',
      buttons: [{ label: 'Fermer', value: null, primary: true }],
      onOpen: function (body) {
        function show(t) {
          body.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
          body.querySelectorAll('.tab').forEach(function (d) { d.hidden = d.dataset.tab !== t; });
        }
        body.querySelectorAll('.tabs button').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });
        show(tab || 'how');
      }
    });
  }

  /* ================================================================== */
  /* Séparateurs redimensionnables                                       */
  /* ================================================================== */

  function initSplitters() {
    var layout = $('#layout');
    if (prefs.leftWidth) layout.style.setProperty('--left', prefs.leftWidth + '%');
    if (prefs.previewHeight) $('#right').style.setProperty('--preview', prefs.previewHeight + '%');

    function drag(gutter, onMove) {
      gutter.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        gutter.setPointerCapture(e.pointerId);
        document.body.classList.add('dragging');
        var move = function (ev) { onMove(ev); };
        var up = function () {
          gutter.removeEventListener('pointermove', move);
          gutter.removeEventListener('pointerup', up);
          document.body.classList.remove('dragging');
          savePrefs();
          Blockly.svgResize(ws);
          codeView.refresh();
          if (editor) editor.refresh();
        };
        gutter.addEventListener('pointermove', move);
        gutter.addEventListener('pointerup', up);
      });
    }
    drag($('#gutter-v'), function (e) {
      var r = layout.getBoundingClientRect();
      var pct = Math.max(30, Math.min(78, (e.clientX - r.left) / r.width * 100));
      layout.style.setProperty('--left', pct + '%');
      prefs.leftWidth = Math.round(pct * 10) / 10;
      Blockly.svgResize(ws);
    });
    drag($('#gutter-h'), function (e) {
      var right = $('#right');
      var r = right.getBoundingClientRect();
      var pct = Math.max(15, Math.min(85, (e.clientY - r.top) / r.height * 100));
      right.style.setProperty('--preview', pct + '%');
      prefs.previewHeight = Math.round(pct * 10) / 10;
    });
    window.addEventListener('resize', function () { Blockly.svgResize(ws); });
  }

  /* ================================================================== */
  /* Démarrage                                                           */
  /* ================================================================== */

  function bindUI() {
    $('#btn-new').addEventListener('click', newProject);
    $('#btn-models').addEventListener('click', openTemplates);
    $('#btn-open').addEventListener('click', openOpenDialog);
    $('#btn-save').addEventListener('click', openSaveDialog);
    $('#btn-export').addEventListener('click', exportPage);
    $('#btn-images').addEventListener('click', function () { openImages(); });
    $('#btn-help').addEventListener('click', function () { openHelp(); });
    $('#btn-undo').addEventListener('click', function () { ws.undo(false); });
    $('#btn-redo').addEventListener('click', function () { ws.undo(true); });
    $('#btn-tidy').addEventListener('click', function () { ws.cleanUp(); showPageTop(); });
    $('#mode-blocks').addEventListener('click', exitCodeMode);
    $('#mode-code').addEventListener('click', function () { enterCodeMode(); });
    $('#btn-back-blocks').addEventListener('click', exitCodeMode);
    $('#btn-fullview').addEventListener('click', function () {
      var code = state.mode === 'code' ? resolveImagesInCode(editor.getValue()) :
        BW.generate(ws, { mapAttr: mapImageSrc }).code;
      // La page est affichée dans un cadre sans scripts, comme l'aperçu.
      var wrapper = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>' + escHtml(pageTitle()) +
        '</title><style>html,body,iframe{margin:0;padding:0;border:0;width:100%;height:100%;display:block}</style></head>' +
        '<body><iframe sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc="' + escHtml(code) + '"></iframe></body></html>';
      var url = URL.createObjectURL(new Blob([wrapper], { type: 'text/html;charset=utf-8' }));
      window.open(url, '_blank');
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    });
    $('#btn-copy').addEventListener('click', function () {
      var code = currentCode();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () { toast('Le code est copié !'); }, function () { toast('Copie impossible : sélectionne le code et fais Ctrl+C.'); });
      }
    });
    $$('#labels-seg button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.mode === BW.labelMode);
      b.setAttribute('aria-checked', b.dataset.mode === BW.labelMode);
      b.addEventListener('click', function () { setLabelMode(b.dataset.mode); });
    });
    $('#advice-toggle').addEventListener('click', function () {
      var open = !$('#advice').classList.contains('open');
      $('#advice').classList.toggle('open', open);
      $('#advice-toggle').setAttribute('aria-expanded', open);
      prefs.adviceOpen = open;
      savePrefs();
    });
    if (prefs.adviceOpen) { $('#advice').classList.add('open'); $('#advice-toggle').setAttribute('aria-expanded', true); }
    $('#advice-list').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-id]');
      if (btn) selectBlock(btn.dataset.id);
      var lb = e.target.closest('button[data-line]');
      if (lb) {
        var pos = { line: +lb.dataset.line, ch: 0 };
        editor.focus();
        editor.setCursor(pos);
        editor.scrollIntoView(pos, 80);
      }
    });
    $('#preview').addEventListener('load', onPreviewLoad);
    $('#dlg').addEventListener('cancel', function (e) {
      if (e.target !== e.currentTarget) return; // ex. sélecteur de fichiers annulé
      e.preventDefault();
      closeDialog(null);
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        openSaveDialog();
      }
    });
    // Glisser-déposer des images sur la page.
    document.addEventListener('dragover', function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) e.preventDefault();
    });
    document.addEventListener('drop', async function (e) {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      var files = Array.prototype.slice.call(e.dataTransfer.files);
      var first = files[0];
      if (/\.(blocweb|json|html?)$/i.test(first.name)) {
        if (await confirmReplace('📂 Ouvrir « ' + first.name + ' »')) onFileChosen(first);
        return;
      }
      var added = await addImageFiles(files);
      if (added.length) toast('Ajouté à « Mes images » : ' + added.join(', '));
    });
  }

  async function start() {
    initBlockly();
    initEditors();
    bindUI();
    initSplitters();
    applyModeUI();

    var saved = null;
    try { saved = JSON.parse(storageGet(STORE_KEY)); } catch (e) { saved = null; }
    var loaded = false;
    if (saved) {
      try { await loadProject(saved); loaded = true; } catch (e) { console.error(e); }
    }
    if (!loaded) await loadTemplate(BW.TEMPLATES[0]);
    update.now();

    if (!prefs.welcomed) {
      prefs.welcomed = true;
      savePrefs();
      openHelp('how');
    }
  }

  // Accès pour le débogage et les tests automatiques.
  BW.app = {
    loadTemplate: loadTemplate, loadProject: loadProject, projectData: projectData,
    enterCodeMode: enterCodeMode, exitCodeMode: exitCodeMode, setLabelMode: setLabelMode,
    update: function () { update.now(); }, editor: function () { return editor; }, codeView: function () { return codeView; }
  };

  window.addEventListener('DOMContentLoaded', start);
})();
