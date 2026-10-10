/*
 * BlocWeb — transforme du code HTML en blocs.
 *
 * Utilisé pour « revenir aux blocs » après avoir écrit du code, pour ouvrir
 * un fichier .html et pour fabriquer les modèles de pages.
 * Ce qui n'a pas de bloc dédié devient un bloc « balise » (rien n'est perdu),
 * sauf les scripts, qui sont signalés.
 */
(function () {
  'use strict';
  var BW = window.BW;

  function norm(s) { return String(s).replace(/[ \t\n\r\f]+/g, ' '); }

  function attrList(el) {
    var out = [];
    for (var i = 0; i < el.attributes.length; i++) out.push([el.attributes[i].name, el.attributes[i].value]);
    return out;
  }
  function attrString(el) {
    return attrList(el).map(function (a) { return a[1] === '' && !/^(alt|href|src|value)$/.test(a[0]) ? a[0] : a[0] + '="' + a[1].replace(/"/g, '&quot;') + '"'; }).join(' ');
  }
  // Vrai si l'élément n'a que les attributs autorisés.
  function onlyAttrs(el, allowed) {
    for (var i = 0; i < el.attributes.length; i++) {
      if (allowed.indexOf(el.attributes[i].name) < 0) return false;
    }
    return true;
  }
  // Vrai si l'élément ne contient que du texte.
  function onlyText(el) {
    for (var i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].nodeType !== 3) return false;
    return true;
  }
  function textOf(el) { return norm(el.textContent).trim(); }

  function chain(list) {
    list = list.filter(Boolean);
    for (var i = list.length - 2; i >= 0; i--) list[i].next = { block: list[i + 1] };
    return list.length ? { block: list[0] } : undefined;
  }
  function B(type, fields, content) {
    var o = { type: type };
    if (fields) o.fields = fields;
    if (content && content.length) o.inputs = { CONTENT: chain(content) };
    return o;
  }

  var SIMPLE_CONTAINERS = { header: 'bw_header', nav: 'bw_nav', main: 'bw_main', section: 'bw_section',
    article: 'bw_article', aside: 'bw_aside', footer: 'bw_footer', div: 'bw_div', figure: 'bw_figure',
    ul: 'bw_ul', ol: 'bw_ol' };
  var SIMPLE_TEXT = { strong: 'bw_strong', em: 'bw_em', mark: 'bw_mark', blockquote: 'bw_blockquote',
    figcaption: 'bw_figcaption', caption: 'bw_caption', th: 'bw_th', td: 'bw_td' };

  function Importer() { this.warnings = []; this.css = ''; }

  Importer.prototype.warn = function (msg) {
    if (this.warnings.indexOf(msg) < 0) this.warnings.push(msg);
  };

  Importer.prototype.kids = function (el) {
    var out = [];
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) {
        var t = norm(n.nodeValue).trim();
        if (t) out.push(B('bw_text', { TEXT: t }));
      } else if (n.nodeType === 8) {
        out.push(B('bw_comment', { TEXT: n.nodeValue.trim() }));
      } else if (n.nodeType === 1) {
        var b = this.element(n);
        if (Array.isArray(b)) out = out.concat(b);
        else if (b) out.push(b);
      }
    }
    return out;
  };

  Importer.prototype.generic = function (el) {
    var tag = el.tagName.toLowerCase();
    var b = B('bw_generic', { TAG: tag, ATTRS: attrString(el) }, BW.VOID_TAGS[tag] ? [] : this.kids(el));
    return b;
  };

  Importer.prototype.element = function (el) {
    var tag = el.tagName.toLowerCase();
    var plainEl = el.attributes.length === 0;

    if (tag === 'script' || tag === 'noscript' || tag === 'template') {
      this.warn('Le code <' + tag + '> n’est pas pris en charge par les blocs : il a été retiré.');
      return null;
    }
    if (tag === 'style') { this.css += '\n' + el.textContent; return null; }
    if (tag === 'link' || tag === 'meta' || tag === 'base' || tag === 'title') {
      if (tag === 'link') this.warn('Les feuilles de style externes (<link>) ne sont pas prises en charge par les blocs.');
      return null;
    }

    if (SIMPLE_CONTAINERS[tag] && plainEl) return B(SIMPLE_CONTAINERS[tag], null, this.kids(el));

    if (/^h[1-6]$/.test(tag) && plainEl && onlyText(el)) {
      return B('bw_heading', { LEVEL: tag.charAt(1), TEXT: textOf(el) });
    }
    if (tag === 'p' && plainEl) {
      return onlyText(el) ? B('bw_p', { TEXT: textOf(el) }) : B('bw_p_box', null, this.kids(el));
    }
    if (tag === 'li' && plainEl) {
      return onlyText(el) ? B('bw_li', { TEXT: textOf(el) }) : B('bw_li_box', null, this.kids(el));
    }
    if (SIMPLE_TEXT[tag] && plainEl && onlyText(el)) return B(SIMPLE_TEXT[tag], { TEXT: textOf(el) });
    if ((tag === 'br' || tag === 'hr') && plainEl) return B('bw_' + tag);
    if (tag === 'a' && onlyAttrs(el, ['href'])) {
      var href = el.getAttribute('href') || '';
      return onlyText(el) ? B('bw_a', { TEXT: textOf(el), HREF: href }) : B('bw_a_box', { HREF: href }, this.kids(el));
    }
    if (tag === 'img' && onlyAttrs(el, ['src', 'alt'])) {
      return B('bw_img', { SRC: el.getAttribute('src') || '', ALT: el.getAttribute('alt') || '' });
    }
    if (tag === 'table' && plainEl) {
      var rows = [];
      for (var i = 0; i < el.childNodes.length; i++) {
        var c = el.childNodes[i];
        var ct = c.nodeType === 1 ? c.tagName.toLowerCase() : '';
        // Les parties thead/tbody/tfoot sans attribut sont « aplaties ».
        if ((ct === 'tbody' || ct === 'thead' || ct === 'tfoot') && c.attributes.length === 0) {
          rows = rows.concat(this.kids(c));
        } else if (c.nodeType === 1 || c.nodeType === 8) {
          var single = { childNodes: [c] };
          rows = rows.concat(this.kids(single));
        }
      }
      return B('bw_table', null, rows);
    }
    if (tag === 'tr' && plainEl) return B('bw_tr', null, this.kids(el));

    return this.generic(el);
  };

  /* ---------- CSS ---------- */

  var COLOR_NAMES = {};
  BW.COLORS.forEach(function (c) { COLOR_NAMES[c[1]] = true; });
  var SELECTOR_VALUES = {};
  BW.SELECTORS.forEach(function (s) { SELECTOR_VALUES[s[1]] = true; });

  function cssPropBlock(prop, value) {
    var v = value.trim(), lv = v.toLowerCase(), m;
    function guided(type, fields) { return B(type, fields); }
    function choice(type) {
      var d = BW.DEFS[type], a = d.args[0];
      for (var i = 0; i < a.options.length; i++) {
        if (a.options[i][1].replace(/\s+/g, '').toLowerCase() === lv.replace(/\s+/g, '').replace(/'/g, '"')) {
          var f = {}; f[a.name] = a.options[i][1]; return guided(type, f);
        }
      }
      return null;
    }
    var b = null;
    switch (prop) {
      case 'color': if (COLOR_NAMES[lv]) b = guided('bw_css_color', { V: lv }); break;
      case 'background-color': if (COLOR_NAMES[lv]) b = guided('bw_css_bg', { V: lv }); break;
      case 'text-align': b = choice('bw_css_align'); break;
      case 'font-family': b = choice('bw_css_font'); break;
      case 'font-weight': b = choice('bw_css_weight'); break;
      case 'font-style': b = choice('bw_css_italic'); break;
      case 'text-decoration': b = choice('bw_css_deco'); break;
      case 'font-size': if ((m = /^(\d+)px$/.exec(lv))) b = guided('bw_css_size', { N: +m[1] }); break;
      case 'border-radius': if ((m = /^(\d+)px$/.exec(lv))) b = guided('bw_css_radius', { N: +m[1] }); break;
      case 'padding': if ((m = /^(\d+)px$/.exec(lv))) b = guided('bw_css_padding', { N: +m[1] }); break;
      case 'margin': if ((m = /^(\d+)px$/.exec(lv))) b = guided('bw_css_margin', { N: +m[1] }); break;
      case 'width': if ((m = /^(\d+)(px|%)$/.exec(lv))) b = guided('bw_css_width', { N: +m[1], U: m[2] }); break;
      case 'border':
        if ((m = /^(\d+)px\s+(solid|dashed|dotted|double)\s+([a-z]+)$/.exec(lv)) && COLOR_NAMES[m[3]]) {
          b = guided('bw_css_border', { N: +m[1], S: m[2], C: m[3] });
        }
        break;
    }
    return b || B('bw_css_free', { PROP: prop, VAL: v });
  }

  // Découpe une feuille de style en règles { sélecteur: déclarations }.
  Importer.prototype.cssBlocks = function (css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    var blocks = [], i = 0, n = css.length;
    while (i < n) {
      var open = css.indexOf('{', i);
      if (open < 0) {
        if (css.slice(i).trim()) this.warn('Une partie du style (CSS) n’a pas pu être lue.');
        break;
      }
      var selector = norm(css.slice(i, open)).trim();
      // Cherche l'accolade fermante correspondante.
      var depth = 1, j = open + 1;
      while (j < n && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
      var body = css.slice(open + 1, j - 1);
      i = j;
      var semi = selector.lastIndexOf(';');
      if (semi >= 0) { // ex. « @import url(x); h1 »
        if (selector.slice(0, semi).indexOf('@') >= 0) this.warn('Les règles @import ne sont pas prises en charge par les blocs : elles ont été retirées.');
        selector = selector.slice(semi + 1).trim();
      }
      if (selector.charAt(0) === '@') {
        this.warn('Les règles ' + /@[a-z-]+/.exec(selector)[0] + ' ne sont pas prises en charge par les blocs : elles ont été retirées.');
        continue;
      }
      if (body.indexOf('{') >= 0) { this.warn('Une règle de style imbriquée a été retirée.'); continue; }
      var props = [];
      body.split(';').forEach(function (decl) {
        var k = decl.indexOf(':');
        if (k < 0) return;
        var prop = decl.slice(0, k).trim().toLowerCase();
        var val = norm(decl.slice(k + 1)).trim();
        if (prop && val) props.push(cssPropBlock(prop, val));
      });
      var type = SELECTOR_VALUES[selector] ? 'bw_css_rule' : 'bw_css_rule_free';
      blocks.push(B(type, { SEL: selector }, props));
    }
    return blocks;
  };

  /*
   * Code HTML -> état Blockly (format de sérialisation JSON).
   * opts.collapseCss : replier les règles de style.
   * Renvoie { state, warnings }.
   */
  BW.importHTML = function (code, opts) {
    opts = opts || {};
    var imp = new Importer();
    var doc = new DOMParser().parseFromString(String(code || ''), 'text/html');
    var titleEl = doc.querySelector('title');
    var title = titleEl ? norm(titleEl.textContent).trim() : '';
    doc.querySelectorAll('head style').forEach(function (s) { imp.css += '\n' + s.textContent; });
    if (doc.querySelector('head script')) imp.warn('Le code <script> n’est pas pris en charge par les blocs : il a été retiré.');
    if (doc.querySelector('head link[rel~="stylesheet"]')) imp.warn('Les feuilles de style externes (<link>) ne sont pas prises en charge par les blocs.');
    var body = imp.kids(doc.body);
    var rules = imp.cssBlocks(imp.css);
    // Dans les modèles, les règles de style sont repliées pour laisser voir le contenu.
    if (opts.collapseCss) rules.forEach(function (r) { r.collapsed = true; });
    var page = { type: 'bw_page', x: 40, y: 30, fields: { TITLE: title || 'Ma page' }, inputs: {} };
    if (rules.length) page.inputs.STYLE = chain(rules);
    if (body.length) page.inputs.BODY = chain(body);
    return { state: { blocks: { languageVersion: 0, blocks: [page] } }, warnings: imp.warnings };
  };
})();
