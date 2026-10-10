/*
 * BlocWeb — transforme les blocs en code HTML.
 *
 * 1. Les blocs sont convertis en un petit arbre (éléments, textes, commentaires).
 * 2. L'arbre est écrit en HTML bien indenté. On note, pour chaque bloc,
 *    l'endroit exact (ligne, colonne) où se trouve son code : c'est ce qui
 *    permet de surligner le code d'un bloc quand on clique dessus.
 * 3. Pour l'aperçu, le même HTML est produit avec un attribut data-bw sur
 *    chaque élément, pour retrouver le bloc quand on clique dans la page.
 */
(function () {
  'use strict';
  var BW = window.BW;

  /* ---------- Échappement ---------- */

  function escText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
  }
  function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function cleanCss(s) {
    return String(s).replace(/[<>{};]/g, '').trim();
  }
  function cleanSelector(s) {
    return String(s).replace(/[<>{}]/g, '').trim() || '*';
  }
  function cleanTag(s) {
    var t = String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    return /^[a-z]/.test(t) ? t : 'span';
  }
  BW.escText = escText;
  BW.escAttr = escAttr;

  // Lit des attributs écrits à la main : class="a" id='b' hidden
  function parseAttrs(str) {
    var out = [];
    var re = /([^\s="'<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    var m;
    while ((m = re.exec(String(str || '')))) {
      var name = m[1].toLowerCase();
      if (!/^[a-z_:][a-z0-9_:.-]*$/.test(name) || name === 'data-bw') continue;
      var val = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : null;
      out.push([name, val]);
    }
    return out;
  }
  BW.parseAttrs = parseAttrs;

  /* ---------- Des blocs vers l'arbre ---------- */

  function el(tag, attrs, kids, id) { return { t: 'el', tag: tag, attrs: attrs || [], kids: kids || [], id: id }; }
  function txt(text, id) { return { t: 'text', text: text, id: id }; }

  function fieldVal(b, name) {
    var v = b.getFieldValue(name);
    return v == null ? '' : String(v);
  }

  function kidsOf(b, input) {
    var out = [];
    var c = b.getInputTargetBlock(input);
    while (c) {
      var n = nodeFor(c);
      if (n) out.push(n);
      c = c.getNextBlock();
    }
    return out;
  }

  function nodeFor(b) {
    if (!b.isEnabled() || b.isInsertionMarker()) return null;
    var d = BW.DEFS[b.type];
    if (!d) return null;
    var id = b.id;
    switch (d.shape) {
      case 'container': return el(d.tag, [], kidsOf(b, 'CONTENT'), id);
      case 'text': return el(d.tag, [], [txt(fieldVal(b, 'TEXT'))], id);
      case 'textnode': return txt(fieldVal(b, 'TEXT'), id);
      case 'void': return el(d.tag, [], [], id);
      case 'heading': return el('h' + (fieldVal(b, 'LEVEL') || '1'), [], [txt(fieldVal(b, 'TEXT'))], id);
      case 'link': return el('a', [['href', fieldVal(b, 'HREF')]], [txt(fieldVal(b, 'TEXT'))], id);
      case 'linkbox': return el('a', [['href', fieldVal(b, 'HREF')]], kidsOf(b, 'CONTENT'), id);
      case 'image': return el('img', [['src', fieldVal(b, 'SRC')], ['alt', fieldVal(b, 'ALT')]], [], id);
      case 'comment': return { t: 'comment', text: fieldVal(b, 'TEXT'), id: id };
      case 'generic': return el(cleanTag(fieldVal(b, 'TAG')), parseAttrs(fieldVal(b, 'ATTRS')), kidsOf(b, 'CONTENT'), id);
    }
    return null;
  }

  function cssValue(b, d) {
    var s = '';
    d.args.forEach(function (a, i) {
      var v = fieldVal(b, a.name);
      if (a.kind === 'number') v = (Number(v) || 0) + (a.unit || '');
      s += (i > 0 && !a.glue ? ' ' : '') + v;
    });
    return s;
  }

  // Les règles CSS rangées dans un bloc « style ».
  function cssRulesOf(style) {
    var rules = [];
    var r = style.getInputTargetBlock('CONTENT');
    while (r) {
      var d = BW.DEFS[r.type];
      if (r.isEnabled() && d && (d.shape === 'cssrule' || d.shape === 'cssrulefree')) {
        var rule = { id: r.id, selector: cleanSelector(fieldVal(r, 'SEL')), props: [] };
        var c = r.getInputTargetBlock('CONTENT');
        while (c) {
          var cd = BW.DEFS[c.type];
          if (c.isEnabled() && cd) {
            if (cd.shape === 'cssprop') rule.props.push({ id: c.id, prop: cd.prop, value: cleanCss(cssValue(c, cd)) });
            else if (cd.shape === 'csspropfree') {
              var prop = cleanCss(fieldVal(c, 'PROP')).toLowerCase().replace(/[^a-z0-9-]/g, '');
              if (prop) rule.props.push({ id: c.id, prop: prop, value: cleanCss(fieldVal(c, 'VAL')) });
            }
          }
          c = c.getNextBlock();
        }
        rules.push(rule);
      }
      r = r.getNextBlock();
    }
    return rules;
  }

  // Le premier bloc « page web » (le plus haut) est la page.
  BW.findPage = function (ws) {
    var pages = ws.getTopBlocks(true).filter(function (b) { return b.type === 'bw_page' && !b.isInsertionMarker(); });
    return pages[0] || null;
  };

  // Les blocs rangés dans la partie invisible (<head>) de la page.
  function headBlocks(page) {
    var out = [];
    var b = page ? page.getInputTargetBlock('HEAD') : null;
    while (b) {
      if (b.isEnabled() && !b.isInsertionMarker()) out.push(b);
      b = b.getNextBlock();
    }
    return out;
  }
  BW.headBlocks = headBlocks;

  // Le titre de l'onglet (le texte du premier bloc « titre de l'onglet »).
  BW.pageTitle = function (ws) {
    var t = headBlocks(BW.findPage(ws)).filter(function (b) { return b.type === 'bw_title'; })[0];
    return t ? fieldVal(t, 'TEXT') : '';
  };

  /* ---------- Écriture du HTML ---------- */

  // Ces balises sont toujours écrites sur plusieurs lignes.
  var MULTILINE = { html: 1, head: 1, body: 1, header: 1, nav: 1, main: 1, section: 1, article: 1, aside: 1,
    footer: 1, div: 1, figure: 1, ul: 1, ol: 1, table: 1, thead: 1, tbody: 1, tfoot: 1, tr: 1, form: 1 };

  function isInline(n) {
    if (n.t === 'text') return true;
    if (n.t === 'comment') return false;
    return !!BW.INLINE_TAGS[n.tag];
  }

  function plain(n) {
    if (n.t === 'text') return n.text;
    if (n.t !== 'el') return '';
    return n.kids.map(plain).join(' ');
  }

  // Faut-il un espace entre deux morceaux de texte qui se suivent ?
  function needSpace(a, b) {
    if ((a.t === 'el' && a.tag === 'br') || (b.t === 'el' && b.tag === 'br')) return false;
    var pa = plain(a), pb = plain(b);
    var last = pa.slice(-1), first = pb.charAt(0);
    if (/\s/.test(last) || /\s/.test(first)) return false;
    if (first && ',.)]}…'.indexOf(first) >= 0) return false;
    if (last && '([{\'’-/'.indexOf(last) >= 0) return false;
    return true;
  }

  function Printer(opts) {
    this.lines = [];
    this.map = {};
    this.opts = opts || {};
  }
  Printer.prototype.rec = function (id, l1, c1, l2, c2) {
    if (id) this.map[id] = { from: { line: l1, ch: c1 }, to: { line: l2, ch: c2 } };
  };
  Printer.prototype.openTag = function (n) {
    var o = this.opts, s = '<' + n.tag;
    n.attrs.forEach(function (a) {
      var v = a[1];
      if (v != null && o.mapAttr) v = o.mapAttr(n.tag, a[0], v);
      s += ' ' + a[0] + (v == null ? '' : '="' + escAttr(v) + '"');
    });
    if (o.ids && n.id) s += ' data-bw="' + escAttr(n.id) + '"';
    return s + '>';
  };
  // Écrit un nœud « en ligne » ; col = colonne de départ sur la ligne.
  Printer.prototype.inline = function (n, line, col) {
    var s;
    if (n.t === 'text') s = escText(n.text);
    else if (n.t === 'comment') s = '<!-- ' + cleanComment(n.text) + ' -->';
    else {
      s = this.openTag(n);
      if (!BW.VOID_TAGS[n.tag]) {
        s += this.join(n.kids, line, col + s.length);
        s += '</' + n.tag + '>';
      }
    }
    this.rec(n.id, line, col, line, col + s.length);
    return s;
  };
  Printer.prototype.join = function (kids, line, col) {
    var out = '';
    for (var i = 0; i < kids.length; i++) {
      if (i > 0 && needSpace(kids[i - 1], kids[i])) out += ' ';
      out += this.inline(kids[i], line, col + out.length);
    }
    return out;
  };
  Printer.prototype.push = function (s) { this.lines.push(s); return this.lines.length - 1; };
  Printer.prototype.block = function (n, depth) {
    var ind = new Array(depth + 1).join('  ');
    var line = this.lines.length;
    if (n.t !== 'el' || BW.VOID_TAGS[n.tag]) {
      this.push(ind + this.inline(n, line, ind.length));
      return;
    }
    var close = '</' + n.tag + '>';
    var allInline = n.kids.every(isInline);
    if (allInline && !MULTILINE[n.tag]) {
      var open = this.openTag(n);
      var s = open + this.join(n.kids, line, ind.length + open.length) + close;
      this.push(ind + s);
      this.rec(n.id, line, ind.length, line, ind.length + s.length);
      return;
    }
    this.push(ind + this.openTag(n));
    var run = [], self = this, ind2 = ind + '  ';
    function flush() {
      if (!run.length) return;
      var l = self.lines.length;
      self.push(ind2 + self.join(run, l, ind2.length));
      run = [];
    }
    n.kids.forEach(function (k) {
      if (isInline(k)) run.push(k);
      else { flush(); self.block(k, depth + 1); }
    });
    flush();
    var end = this.push(ind + close);
    this.rec(n.id, line, ind.length, end, ind.length + close.length);
  };

  function cleanComment(s) { return String(s).replace(/--+/g, '-').replace(/^>|-$/g, '').trim(); }

  /*
   * Produit le document complet.
   * opts.ids     : ajouter data-bw (pour l'aperçu)
   * opts.mapAttr : fonction (tag, nom, valeur) -> valeur (pour les images du projet)
   * Renvoie { code, map, page, usedImages, empty }
   */
  BW.generate = function (ws, opts) {
    opts = opts || {};
    var page = BW.findPage(ws);
    var P = new Printer(opts);
    var used = {};
    var userMap = opts.mapAttr;
    P.opts = Object.assign({}, opts, {
      mapAttr: function (tag, name, value) {
        if (tag === 'img' && name === 'src') used[value] = true;
        return userMap ? userMap(tag, name, value) : value;
      }
    });

    var body = page ? kidsOf(page, 'BODY') : [];
    var rules = [];
    var ranges = {};

    P.push('<!DOCTYPE html>');
    P.push('<html lang="fr">');
    var headStart = P.push('  <head>');
    P.push('    <meta charset="utf-8">');
    // La partie invisible : titre de l'onglet, style, et éventuellement d'autres balises.
    headBlocks(page).forEach(function (hb) {
      if (hb.type !== 'bw_style') {
        var n = nodeFor(hb);
        if (n) P.block(n, 2);
        return;
      }
      var styleStart = P.push('    <style>');
      cssRulesOf(hb).forEach(function (r) {
        rules.push(r);
        var start = P.push('      ' + r.selector + ' {');
        r.props.forEach(function (pr) {
          var s = '        ' + pr.prop + ': ' + pr.value + ';';
          var l = P.push(s);
          P.rec(pr.id, l, 8, l, s.length);
        });
        var end = P.push('      }');
        P.rec(r.id, start, 6, end, 7);
      });
      var styleEnd = P.push('    </style>');
      P.rec(hb.id, styleStart, 4, styleEnd, 12);
    });
    var headEnd = P.push('  </head>');
    ranges.head = { from: { line: headStart, ch: 2 }, to: { line: headEnd, ch: 9 } };
    var bodyStart = P.push('  <body>');
    body.forEach(function (n) { P.block(n, 2); });
    var bodyEnd = P.push('  </body>');
    var htmlEnd = P.push('</html>');
    if (page) P.rec(page.id, 1, 0, htmlEnd, 7);
    ranges.body = { from: { line: bodyStart, ch: 2 }, to: { line: bodyEnd, ch: 9 } };

    return {
      code: P.lines.join('\n') + '\n',
      map: P.map,
      ranges: ranges,
      page: page,
      rules: rules,
      usedImages: Object.keys(used).filter(function (k) { return k; }),
      empty: !page
    };
  };

  // Retrouve le bloc dont le code contient la position (le plus petit).
  BW.blockAtPos = function (map, pos) {
    var best = null, bestSize = Infinity;
    function before(a, b) { return a.line < b.line || (a.line === b.line && a.ch <= b.ch); }
    Object.keys(map).forEach(function (id) {
      var r = map[id];
      if (before(r.from, pos) && before(pos, r.to)) {
        var size = (r.to.line - r.from.line) * 10000 + (r.to.ch - r.from.ch);
        if (size < bestSize) { best = id; bestSize = size; }
      }
    });
    return best;
  };
})();
