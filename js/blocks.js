/*
 * BlocWeb — définition des blocs Blockly, du thème, de la boîte à outils
 * et de la règle d'emboîtement (quel bloc peut aller dans quel bloc).
 *
 * Les étiquettes affichées sur les blocs dépendent de BW.labelMode :
 *   'fr'   : mots français seulement      (paragraphe [Bonjour])
 *   'both' : mots français + balises       (paragraphe <p> [Bonjour] </p>)
 *   'tags' : balises seulement, comme le code (<p> [Bonjour] </p>)
 */
(function () {
  'use strict';
  var BW = window.BW;
  BW.labelMode = BW.labelMode || 'both';

  function mode() { return BW.labelMode; }

  /* ------------------------------------------------------------------ */
  /* Petits outils pour fabriquer les champs                             */
  /* ------------------------------------------------------------------ */

  function label(text, cls) { return new Blockly.FieldLabel(text, cls || 'bw-name'); }
  // Une balise : discrète en mode « les deux », normale en mode « balises ».
  function tag(text) { return new Blockly.FieldLabel(text, mode() === 'tags' ? 'bw-code' : 'bw-tag'); }
  // Champ de texte : un champ vide reste assez large pour qu'on le voie.
  class BWTextInput extends Blockly.FieldTextInput {
    getDisplayText_() {
      var t = super.getDisplayText_();
      return t === '' ? '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0' : t;
    }
  }
  function textInput(value) {
    var f = new BWTextInput(value == null ? '' : value);
    f.maxDisplayLength = 42;
    return f;
  }
  function open(t) { return '<' + t + '>'; }
  function close(t) { return '</' + t + '>'; }

  // Liste déroulante de couleurs avec une pastille colorée.
  function colorField(value) {
    var gen = function () {
      var m = mode();
      return BW.COLORS.map(function (c) {
        var el = document.createElement('span');
        el.className = 'bw-colopt';
        var sw = document.createElement('span');
        sw.className = 'bw-sw' + (c[1] === 'transparent' ? ' bw-sw-none' : '');
        sw.style.background = c[1] === 'transparent' ? '' : c[1];
        var txt = m === 'tags' ? c[1] : c[0];
        el.appendChild(sw);
        el.appendChild(document.createTextNode(txt));
        el.title = txt;
        return [el, c[1]];
      });
    };
    var f = new Blockly.FieldDropdown(gen);
    if (value) f.setValue(value);
    return f;
  }

  function choiceField(arg) {
    var m = mode();
    var opts = arg.options.map(function (o) { return [m === 'tags' ? o[1] : o[0], o[1]]; });
    var f = new Blockly.FieldDropdown(opts);
    f.setValue(arg.value);
    return f;
  }

  var FOLDER_ICON = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path fill="#ffd36b" stroke="#6b4a00" stroke-width="1.3" stroke-linejoin="round" d="M2.5 5.5h7l2 2.2h10v11.8h-19z"/>' +
    '<path fill="#ffe7a3" stroke="#6b4a00" stroke-width="1.3" stroke-linejoin="round" d="M2.5 9.5h19v10h-19z"/></svg>');

  function folderButton() {
    return new Blockly.FieldImage(FOLDER_ICON, 22, 22, 'Choisir une de mes images', function (field) {
      var b = field.getSourceBlock();
      if (b && !b.isInFlyout && BW.pickImageFor) BW.pickImageFor(b);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Les formes de blocs                                                 */
  /* ------------------------------------------------------------------ */

  var SHAPES = {};

  // La page : une partie invisible (<head>) et une partie visible (<body>).
  // Le titre de l'onglet et le style sont des blocs à part, rangés dans <head>.
  SHAPES.page = function (b, d) {
    var m = mode();
    var top = b.appendDummyInput('TOP');
    if (m !== 'tags') top.appendField(label('📄 page web'));
    if (m !== 'fr') top.appendField(tag('<html>'));
    var head = b.appendStatementInput('HEAD');
    if (m !== 'tags') head.appendField(label('partie invisible'));
    if (m !== 'fr') head.appendField(tag('<head>'));
    if (m !== 'fr') b.appendDummyInput('HEAD_END').appendField(tag('</head>'));
    var body = b.appendStatementInput('BODY');
    if (m !== 'tags') body.appendField(label('partie visible'));
    if (m !== 'fr') body.appendField(tag('<body>'));
    if (m !== 'fr') b.appendDummyInput('END').appendField(tag('</body>')).appendField(tag('</html>'));
  };

  SHAPES.container = function (b, d) {
    var m = mode();
    var top = b.appendDummyInput('TOP');
    if (m !== 'tags') top.appendField(label(d.fr));
    if (m !== 'fr') top.appendField(tag(open(d.tag)));
    b.appendStatementInput('CONTENT');
    if (m !== 'fr') b.appendDummyInput('BOTTOM').appendField(tag(close(d.tag)));
  };

  SHAPES.text = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m !== 'tags') r.appendField(label(d.fr));
    if (m !== 'fr') r.appendField(tag(open(d.tag)));
    r.appendField(textInput(d.text), 'TEXT');
    if (m !== 'fr') r.appendField(tag(close(d.tag)));
  };

  SHAPES.textnode = function (b, d) {
    var r = b.appendDummyInput('ROW');
    if (mode() !== 'tags') r.appendField(label(d.fr));
    r.appendField(textInput(d.text), 'TEXT');
  };

  SHAPES.void = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m !== 'tags') r.appendField(label(d.fr));
    if (m !== 'fr') r.appendField(tag(open(d.tag)));
  };

  SHAPES.heading = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m !== 'tags') r.appendField(label('titre'));
    var opts = [1, 2, 3, 4, 5, 6].map(function (n) {
      return [m === 'fr' ? 'niveau ' + n : '<h' + n + '>', String(n)];
    });
    var dd = new Blockly.FieldDropdown(opts, function (v) {
      var blk = this.getSourceBlock();
      var c = blk && blk.getField('CLOSE');
      if (c) c.setValue('</h' + v + '>');
      return v;
    });
    r.appendField(dd, 'LEVEL');
    r.appendField(textInput(d.text), 'TEXT');
    if (m !== 'fr') r.appendField(tag('</h1>'), 'CLOSE');
  };

  SHAPES.link = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m === 'tags') {
      r.appendField(tag('<a href="')).appendField(textInput(d.href), 'HREF').appendField(tag('">'))
        .appendField(textInput(d.text), 'TEXT').appendField(tag('</a>'));
    } else if (m === 'both') {
      r.appendField(label('lien')).appendField(tag('<a>')).appendField(textInput(d.text), 'TEXT')
        .appendField(tag('</a>')).appendField(label('adresse')).appendField(tag('href'))
        .appendField(textInput(d.href), 'HREF');
    } else {
      r.appendField(label('lien')).appendField(textInput(d.text), 'TEXT')
        .appendField(label('vers l’adresse')).appendField(textInput(d.href), 'HREF');
    }
  };

  SHAPES.linkbox = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('TOP');
    if (m === 'tags') {
      r.appendField(tag('<a href="')).appendField(textInput(d.href), 'HREF').appendField(tag('">'));
    } else {
      r.appendField(label('lien vers l’adresse'));
      if (m === 'both') r.appendField(tag('href'));
      r.appendField(textInput(d.href), 'HREF');
    }
    b.appendStatementInput('CONTENT');
    if (m !== 'fr') b.appendDummyInput('BOTTOM').appendField(tag('</a>'));
  };

  SHAPES.image = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m === 'tags') {
      r.appendField(tag('<img src="')).appendField(textInput(''), 'SRC').appendField(tag('" alt="'))
        .appendField(textInput(''), 'ALT').appendField(tag('">')).appendField(folderButton(), 'PICK');
    } else {
      r.appendField(label('image'));
      if (m === 'both') r.appendField(tag('<img>')).appendField(tag('src'));
      r.appendField(textInput(''), 'SRC').appendField(folderButton(), 'PICK').appendField(label('description'));
      if (m === 'both') r.appendField(tag('alt'));
      r.appendField(textInput(''), 'ALT');
    }
  };

  SHAPES.comment = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m !== 'tags') r.appendField(label(d.fr));
    if (m !== 'fr') r.appendField(tag('<!--'));
    r.appendField(textInput(d.text), 'TEXT');
    if (m !== 'fr') r.appendField(tag('-->'));
  };

  SHAPES.generic = function (b, d) {
    var m = mode();
    var tagField = new BWTextInput('span', function (v) {
      var clean = String(v).toLowerCase().replace(/[^a-z0-9-]/g, '');
      var blk = this.getSourceBlock();
      var c = blk && blk.getField('CLOSE');
      if (c) c.setValue(close(clean || '?'));
      return clean;
    });
    var r = b.appendDummyInput('TOP');
    if (m !== 'tags') r.appendField(label('balise'));
    if (m !== 'fr') r.appendField(tag('<'));
    r.appendField(tagField, 'TAG');
    if (m === 'fr') r.appendField(label('attributs'));
    r.appendField(textInput(''), 'ATTRS');
    if (m !== 'fr') r.appendField(tag('>'));
    b.appendStatementInput('CONTENT');
    if (m !== 'fr') b.appendDummyInput('BOTTOM').appendField(tag(close('span')), 'CLOSE');
  };

  function selectorField() {
    var m = mode();
    var opts = BW.SELECTORS.map(function (s) {
      return [m === 'tags' ? s[1] : (m === 'both' ? s[0] + '  (' + s[1] + ')' : s[0]), s[1]];
    });
    return new Blockly.FieldDropdown(opts);
  }

  SHAPES.cssrule = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('TOP');
    if (m !== 'tags') r.appendField(label('style pour'));
    r.appendField(selectorField(), 'SEL');
    if (m !== 'fr') r.appendField(tag('{'));
    b.appendStatementInput('CONTENT');
    if (m !== 'fr') b.appendDummyInput('BOTTOM').appendField(tag('}'));
  };

  SHAPES.cssrulefree = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('TOP');
    if (m !== 'tags') r.appendField(label('style pour le sélecteur'));
    r.appendField(textInput('nav a'), 'SEL');
    if (m !== 'fr') r.appendField(tag('{'));
    b.appendStatementInput('CONTENT');
    if (m !== 'fr') b.appendDummyInput('BOTTOM').appendField(tag('}'));
  };

  SHAPES.cssprop = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m !== 'tags') r.appendField(label(d.fr));
    if (m === 'both') r.appendField(tag(d.prop));
    if (m === 'tags') r.appendField(tag(d.prop + ':'));
    d.args.forEach(function (a) {
      if (a.kind === 'color') r.appendField(colorField(a.value), a.name);
      else if (a.kind === 'choice') r.appendField(choiceField(a), a.name);
      else {
        r.appendField(new Blockly.FieldNumber(a.value, a.min, a.max, 1), a.name);
        if (a.unit) r.appendField(m === 'tags' ? tag(a.unit) : label(a.unit === 'px' ? 'pixels' : a.unit));
      }
    });
    if (m === 'tags') r.appendField(tag(';'));
  };

  SHAPES.csspropfree = function (b, d) {
    var m = mode();
    var r = b.appendDummyInput('ROW');
    if (m !== 'tags') r.appendField(label('propriété'));
    r.appendField(textInput('line-height'), 'PROP');
    r.appendField(m === 'fr' ? label('valeur') : tag(':'));
    r.appendField(textInput('1.5'), 'VAL');
    if (m !== 'fr') r.appendField(tag(';'));
  };

  /* ------------------------------------------------------------------ */
  /* Enregistrement des blocs                                            */
  /* ------------------------------------------------------------------ */

  BW.DEF_LIST.forEach(function (d) {
    Blockly.Blocks[d.type] = {
      init: function () {
        SHAPES[d.shape](this, d);
        if (d.shape !== 'page') {
          this.setPreviousStatement(true);
          this.setNextStatement(true);
        }
        this.setStyle((d.style || d.cat) + '_blocks');
        this.setTooltip(tooltipFor(d));
      },
      // Texte affiché quand le bloc est replié.
      toString: function (max) {
        return collapsedText(this, d) || Blockly.Block.prototype.toString.call(this, max);
      }
    };
  });

  function collapsedText(b, d) {
    var m = mode();
    if (d.shape === 'cssrule' || d.shape === 'cssrulefree') {
      var sel = String(b.getFieldValue('SEL') || '');
      return (m === 'tags' ? '' : 'style pour ') + sel + ' { \u2026 }';
    }
    if (d.shape === 'container' || d.shape === 'generic') {
      var t = d.shape === 'generic' ? String(b.getFieldValue('TAG') || '') : d.tag;
      if (m === 'tags') return '<' + t + '> \u2026 </' + t + '>';
      return (d.shape === 'generic' ? 'balise <' + t + '>' : d.fr) + ' \u2026';
    }
    return null;
  }

  function tooltipFor(d) {
    if (!d.tag || d.shape === 'cssprop' || d.shape === 'textnode') {
      return d.tip + (d.prop ? '\nEn CSS : ' + d.prop : '');
    }
    var t = d.shape === 'comment' ? '<!-- ... -->' : d.shape === 'cssrule' || d.shape === 'cssrulefree' ? 'sélecteur { ... }' : open(d.tag);
    return d.tip + '\nEn HTML : ' + t;
  }
  BW.tooltipFor = tooltipFor;

  /* ------------------------------------------------------------------ */
  /* Thème                                                               */
  /* ------------------------------------------------------------------ */

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, bl = n & 255;
    function m(c) { return Math.max(0, Math.min(255, Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f))); }
    return '#' + ((1 << 24) + (m(r) << 16) + (m(g) << 8) + m(bl)).toString(16).slice(1);
  }

  var blockStyles = {}, categoryStyles = {};
  function addStyle(id, colour) {
    blockStyles[id + '_blocks'] = { colourPrimary: colour, colourSecondary: shade(colour, 0.35), colourTertiary: shade(colour, -0.25) };
    categoryStyles[id + '_category'] = { colour: colour };
  }
  BW.CATEGORIES.forEach(function (c) { addStyle(c.id, c.colour); });
  Object.keys(BW.EXTRA_COLOURS).forEach(function (k) { addStyle(k, BW.EXTRA_COLOURS[k]); });

  BW.FONT = '"Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif';
  BW.theme = Blockly.Theme.defineTheme('blocweb', {
    base: Blockly.Themes.Classic,
    blockStyles: blockStyles,
    categoryStyles: categoryStyles,
    componentStyles: {
      workspaceBackgroundColour: '#f4f6fb',
      toolboxBackgroundColour: '#ffffff',
      toolboxForegroundColour: '#1d2433',
      flyoutBackgroundColour: '#e9edf5',
      flyoutForegroundColour: '#1d2433',
      flyoutOpacity: 1,
      scrollbarColour: '#b9c1d0',
      scrollbarOpacity: 0.8,
      insertionMarkerColour: '#000000',
      insertionMarkerOpacity: 0.2,
      selectedGlowColour: '#ffb000',
      selectedGlowOpacity: 0.6
    },
    fontStyle: { family: BW.FONT, weight: '600', size: 12 },
    startHats: false
  });

  /* ------------------------------------------------------------------ */
  /* Règle d'emboîtement selon le contexte                               */
  /* ------------------------------------------------------------------ */
  // Un bloc peut aller à un endroit si une de ses « sortes » (kinds) est
  // acceptée par le conteneur qui l'entoure. Pour un bloc accroché sous un
  // autre, on remonte la pile jusqu'au conteneur.
  // BW.lenient (pendant un chargement) accepte tout : les conseils
  // signaleront ensuite les blocs mal rangés.

  var C = Blockly.ConnectionType;

  function kindsOf(block) {
    var d = BW.DEFS[block.type];
    return d ? d.kinds : [];
  }
  function inputAccepts(block, conn) {
    var d = BW.DEFS[block.type];
    for (var i = 0; i < block.inputList.length; i++) {
      var inp = block.inputList[i];
      if (inp.connection === conn) return (d && d.inputs && d.inputs[inp.name]) || [];
    }
    return [];
  }
  // Ce qu'accepte l'endroit où se trouve la connexion « parent ».
  function contextAccepts(conn) {
    var blk = conn.getSourceBlock();
    if (conn !== blk.nextConnection) return inputAccepts(blk, conn);
    var cur = blk;
    while (cur.previousConnection && cur.previousConnection.targetConnection) {
      var target = cur.previousConnection.targetConnection;
      var src = target.getSourceBlock();
      if (target === src.nextConnection) { cur = src; continue; }
      return inputAccepts(src, target);
    }
    return kindsOf(cur); // pile posée librement : on garde la même sorte
  }
  function fits(block, accepts) {
    var kinds = kindsOf(block);
    for (var i = 0; i < kinds.length; i++) if (accepts.indexOf(kinds[i]) >= 0) return true;
    return false;
  }
  BW.fits = fits;
  BW.contextAccepts = contextAccepts;

  class BWChecker extends Blockly.ConnectionChecker {
    doTypeChecks(a, b) {
      if (BW.lenient) return true;
      var child, parent;
      if (a.type === C.PREVIOUS_STATEMENT) { child = a; parent = b; }
      else if (b.type === C.PREVIOUS_STATEMENT) { child = b; parent = a; }
      else return super.doTypeChecks(a, b);
      var accepts = contextAccepts(parent);
      var blk = child.getSourceBlock();
      while (blk) {
        if (!fits(blk, accepts)) return false;
        blk = blk.getNextBlock();
      }
      return true;
    }
  }
  Blockly.registry.register(Blockly.registry.Type.CONNECTION_CHECKER, 'bw_checker', BWChecker, true);

  /* ------------------------------------------------------------------ */
  /* Boîte à outils                                                      */
  /* ------------------------------------------------------------------ */

  function blk(type, fields, inputs, next) {
    var o = { kind: 'block', type: type };
    if (fields) o.fields = fields;
    if (inputs) o.inputs = inputs;
    if (next) o.next = next;
    return o;
  }
  // Une pile de blocs (pour remplir un conteneur dans la boîte à outils).
  function stack(list) {
    var first = null, prev = null;
    list.forEach(function (b) {
      var s = { type: b.type };
      if (b.fields) s.fields = b.fields;
      if (b.inputs) s.inputs = b.inputs;
      if (prev) prev.next = { block: s }; else first = s;
      prev = s;
    });
    return first ? { block: first } : undefined;
  }
  function inside(list) { return { CONTENT: stack(list) }; }
  function lbl(text) { return { kind: 'label', text: text, 'web-class': 'bw-flyout-label' }; }
  function h(level, text) { return blk('bw_heading', { LEVEL: String(level), TEXT: text }); }
  function p(text) { return blk('bw_p', { TEXT: text }); }
  function li(text) { return blk('bw_li', { TEXT: text }); }
  function liLink(text, href) { return blk('bw_li_box', null, inside([blk('bw_a', { TEXT: text, HREF: href })])); }

  BW.buildToolbox = function () {
    var cat = {};
    BW.CATEGORIES.forEach(function (c) { cat[c.id] = c; });
    function category(id, contents) {
      var c = cat[id];
      return { kind: 'category', name: c.emoji + '  ' + c.name, categorystyle: id + '_category', contents: contents };
    }
    var cssProps = BW.DEF_LIST.filter(function (d) { return d.shape === 'cssprop'; }).map(function (d) { return blk(d.type); });

    return {
      kind: 'categoryToolbox',
      contents: [
        category('structure', [
          lbl('La page entière (une seule) :'),
          blk('bw_page', null, { HEAD: stack([blk('bw_title', { TEXT: 'Ma page' }), blk('bw_style')]) }),
          lbl('Dans la partie invisible de la page :'),
          blk('bw_title', { TEXT: 'Ma page' }),
          blk('bw_style'),
          lbl('Les grandes parties de la page :'),
          blk('bw_header', null, inside([h(1, 'Mon site')])),
          blk('bw_nav', null, inside([blk('bw_ul', null, inside([liLink('Accueil', 'index.html'), liLink('Vikidia', 'https://fr.vikidia.org')]))])),
          blk('bw_main'),
          blk('bw_section', null, inside([h(2, 'Une partie'), p('Le texte de cette partie.')])),
          blk('bw_article', null, inside([h(2, 'Titre de l’article'), p('Le texte de l’article.')])),
          blk('bw_aside', null, inside([p('Le savais-tu ? ...')])),
          blk('bw_footer', null, inside([p('Page réalisée par ...')])),
          blk('bw_div')
        ]),
        category('texte', [
          h(1, 'Titre principal'), h(2, 'Titre d’une partie'), h(3, 'Sous-titre'),
          p('Écris ton texte ici.'),
          lbl('Un paragraphe à composer, pour mettre des mots en valeur :'),
          blk('bw_p_box', null, inside([
            blk('bw_text', { TEXT: 'Voici un mot' }), blk('bw_strong', { TEXT: 'important' }),
            blk('bw_text', { TEXT: 'et un mot' }), blk('bw_em', { TEXT: 'accentué' })
          ])),
          lbl('À ranger dans un paragraphe à composer :'),
          blk('bw_text'), blk('bw_strong'), blk('bw_em'), blk('bw_mark'), blk('bw_br'),
          lbl('Autres :'),
          blk('bw_blockquote'), blk('bw_hr')
        ]),
        category('listes', [
          blk('bw_ul', null, inside([li('premier élément'), li('deuxième élément'), li('troisième élément')])),
          blk('bw_ol', null, inside([li('première étape'), li('deuxième étape'), li('troisième étape')])),
          lbl('À ranger dans une liste :'),
          li('un élément'),
          lbl('Un élément à composer (pour un lien, une sous-liste…) :'),
          liLink('Accueil', 'index.html'),
          blk('bw_li_box')
        ]),
        category('medias', [
          { kind: 'button', text: '🖼️  Ajouter mes images…', callbackKey: 'bwAddImages' },
          blk('bw_img', { SRC: '', ALT: '' }),
          blk('bw_a'),
          lbl('Une illustration avec sa légende :'),
          blk('bw_figure', null, inside([blk('bw_img', { SRC: '', ALT: '' }), blk('bw_figcaption')])),
          blk('bw_figcaption'),
          lbl('Un lien sur une image :'),
          blk('bw_a_box', null, inside([blk('bw_img', { SRC: '', ALT: '' })]))
        ]),
        category('tableaux', [
          blk('bw_table', null, inside([
            blk('bw_caption'),
            blk('bw_tr', null, inside([blk('bw_th', { TEXT: 'Prénom' }), blk('bw_th', { TEXT: 'Âge' })])),
            blk('bw_tr', null, inside([blk('bw_td', { TEXT: 'Léa' }), blk('bw_td', { TEXT: '12' })])),
            blk('bw_tr', null, inside([blk('bw_td', { TEXT: 'Hugo' }), blk('bw_td', { TEXT: '13' })]))
          ])),
          blk('bw_caption'),
          blk('bw_tr', null, inside([blk('bw_td'), blk('bw_td')])),
          blk('bw_th'), blk('bw_td')
        ]),
        category('style', [
          lbl('Le bloc « style » (déjà rangé dans la partie invisible de la page) :'),
          blk('bw_style'),
          lbl('1. Une règle de style se range dans le bloc « style » :'),
          blk('bw_css_rule', { SEL: 'h1' }, inside([blk('bw_css_color', { V: 'darkblue' })])),
          blk('bw_css_rule', { SEL: 'body' }),
          lbl('2. Range des propriétés dans la règle :')
        ].concat(cssProps)),
        category('plus', [
          lbl('Une balise qui n’a pas de bloc :'),
          blk('bw_generic', { TAG: 'span', ATTRS: 'class="important"' }, inside([blk('bw_text', { TEXT: 'du texte' })])),
          blk('bw_generic', { TAG: 'small', ATTRS: '' }, inside([blk('bw_text', { TEXT: 'petit texte' })])),
          lbl('Une note dans le code (invisible dans la page) :'),
          blk('bw_comment'),
          lbl('Du CSS écrit à la main :'),
          blk('bw_css_rule_free', { SEL: 'nav a' }, inside([blk('bw_css_free', { PROP: 'margin-right', VAL: '20px' })])),
          blk('bw_css_free')
        ])
      ]
    };
  };
})();
