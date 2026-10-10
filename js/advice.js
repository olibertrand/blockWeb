/*
 * BlocWeb — les conseils.
 *
 * Ils aident à construire une page bien structurée (un seul titre de
 * niveau 1, des images décrites, des blocs bien rangés…). Ils s'affichent
 * avec un ⚠ sur les blocs et dans la liste « Conseils ».
 */
(function () {
  'use strict';
  var BW = window.BW;

  var WHERE = {
    li: 'Un élément de liste se range dans une liste à puces ou une liste numérotée.',
    inline: 'Range ce texte dans un paragraphe à composer (<p>).',
    td: 'Une case se range dans une ligne de tableau (<tr>).',
    tr: 'Une ligne se range dans un tableau (<table>).',
    caption: 'Le titre d’un tableau se range au début du tableau.',
    figcaption: 'Une légende se range dans une illustration (<figure>).',
    css: 'Une règle de style se range dans le bloc « style » (<style>).',
    cssprop: 'Une propriété se range dans une règle « style pour ».',
    head: 'Ce bloc se range dans la partie invisible de la page (<head>).',
    flow: 'Ce bloc se range dans la partie visible de la page (<body>) ou dans une de ses parties.'
  };

  var EMPTY_TEXT_OK = { bw_td: 1, bw_th: 1 };

  function statementChildren(b) {
    var out = [];
    b.inputList.forEach(function (inp) {
      if (inp.type !== Blockly.inputs.inputTypes.STATEMENT || !inp.connection) return;
      var c = inp.connection.targetBlock();
      while (c) { out.push({ block: c, input: inp }); c = c.getNextBlock(); }
    });
    return out;
  }

  BW.advise = function (ws, extra) {
    extra = extra || {};
    var out = {};   // id -> [messages]
    var order = []; // ids dans l'ordre du document
    function add(b, msg) {
      if (!out[b.id]) { out[b.id] = []; order.push(b.id); }
      if (out[b.id].indexOf(msg) < 0) out[b.id].push(msg);
    }

    var page = BW.findPage(ws);
    var headings = 0, h1 = 0, lastLevel = 0, mains = 0;

    function visit(b, parent, input) {
      if (!b.isEnabled()) return;
      var d = BW.DEFS[b.type];
      if (!d) return;

      // Le bloc est-il bien rangé ?
      if (parent && input) {
        var accepts = (BW.DEFS[parent.type].inputs || {})[input.name] || [];
        if (!BW.fits(b, accepts)) {
          var hint = WHERE[d.kinds[0]] || 'Ce bloc n’est pas à sa place ici.';
          add(b, 'Ce bloc n’est pas à sa place ici. ' + hint);
        }
      }

      var f = function (n) { var v = b.getFieldValue(n); return v == null ? '' : String(v).trim(); };
      var kids = statementChildren(b);

      switch (d.shape) {
        case 'heading':
          var level = +f('LEVEL') || 1;
          headings++;
          if (level === 1) {
            h1++;
            if (h1 > 1) add(b, 'Il y a déjà un titre de niveau 1 : une page n’en a en général qu’un seul. Utilise plutôt un titre de niveau 2 (<h2>).');
          }
          if (lastLevel === 0 && level > 1) add(b, 'Le premier titre de la page est en général un titre de niveau 1 (<h1>).');
          else if (lastLevel && level > lastLevel + 1) add(b, 'Ce titre saute un niveau : après un titre de niveau ' + lastLevel + ', utilise un titre de niveau ' + (lastLevel + 1) + '.');
          lastLevel = level;
          if (!f('TEXT')) add(b, 'Ce titre est vide : écris quelque chose dedans.');
          break;
        case 'text':
        case 'textnode':
          if (b.type === 'bw_title' && !f('TEXT')) add(b, 'Donne un titre à ta page : il s’affiche dans l’onglet du navigateur.');
          else if (!f('TEXT') && !EMPTY_TEXT_OK[b.type]) add(b, 'Ce bloc est vide : écris du texte dedans.');
          break;
        case 'link':
        case 'linkbox':
          var href = f('HREF');
          if (!href || href === '#') add(b, 'Indique l’adresse du lien (href), par exemple https://fr.vikidia.org');
          else if (/^www\./i.test(href)) add(b, 'Une adresse de site commence par https:// (par exemple https://' + href + ').');
          else if (/\s/.test(href)) add(b, 'Une adresse ne contient pas d’espace.');
          if (d.shape === 'link' && !f('TEXT')) add(b, 'Écris le texte du lien : c’est sur lui qu’on clique.');
          break;
        case 'image':
          if (!f('SRC')) add(b, 'Indique l’adresse de l’image (src), ou clique sur le dossier 📁 pour choisir une de tes images.');
          else if (extra.brokenImages && extra.brokenImages[b.id]) add(b, 'Cette image ne s’affiche pas : vérifie son adresse (src). Si c’est une de tes images, ajoute-la d’abord dans « Mes images ».');
          if (!f('ALT')) add(b, 'Ajoute une description (alt) : elle est lue aux personnes aveugles et s’affiche si l’image ne se charge pas.');
          break;
        case 'generic':
          var raw = String(b.getFieldValue('TAG') || '');
          if (!/^[a-z][a-z0-9-]*$/.test(raw)) add(b, 'Ce nom de balise n’est pas valide : utilise seulement des lettres minuscules et des chiffres (par exemple span).');
          break;
        case 'cssrule':
        case 'cssrulefree':
          if (!kids.length) add(b, 'Cette règle de style est vide : range des propriétés dedans (couleur, taille…).');
          break;
        case 'csspropfree':
          if (!f('PROP') || !f('VAL')) add(b, 'Écris le nom de la propriété et sa valeur.');
          break;
      }

      // (Le bloc « style » arrive vide avec la page : ce n'est pas une erreur.)
      if ((d.shape === 'container' || d.shape === 'linkbox') && b.type !== 'bw_style') {
        if (!kids.length) add(b, 'Ce bloc est vide : glisse d’autres blocs à l’intérieur.');
      }
      if (b.type === 'bw_main' && ++mains > 1) add(b, 'Il ne doit y avoir qu’un seul contenu principal (<main>) par page.');
      if ((b.type === 'bw_section' || b.type === 'bw_article') && kids.length) {
        var hasTitle = kids.some(function (k) {
          if (k.block.type === 'bw_heading') return true;
          if (k.block.type === 'bw_header') return statementChildren(k.block).some(function (x) { return x.block.type === 'bw_heading'; });
          return false;
        });
        if (!hasTitle) add(b, (b.type === 'bw_section' ? 'Une section' : 'Un article') + ' commence en général par un titre (par exemple un titre de niveau 2).');
      }
      if (b.type === 'bw_figure' && kids.length && !kids.some(function (k) { return k.block.type === 'bw_img' || k.block.type === 'bw_a_box'; })) {
        add(b, 'Une illustration contient en général une image.');
      }
      if (b.type === 'bw_table') {
        var counts = kids.filter(function (k) { return k.block.type === 'bw_tr' && k.block.isEnabled(); })
          .map(function (k) { return statementChildren(k.block).length; });
        if (counts.some(function (c) { return c !== counts[0]; })) add(b, 'Les lignes de ce tableau n’ont pas toutes le même nombre de cases.');
      }

      kids.forEach(function (k) { visit(k.block, b, k.input); });
    }

    if (page) {
      var titles = BW.headBlocks(page).filter(function (b) { return b.type === 'bw_title'; });
      if (!titles.length) add(page, 'Ajoute le bloc « titre de l’onglet » (<title>) dans la partie invisible de la page : il s’affiche dans l’onglet du navigateur.');
      titles.slice(1).forEach(function (t) { add(t, 'Il y a déjà un titre de l’onglet : une page n’en a qu’un seul.'); });
      if (!page.getInputTargetBlock('BODY')) add(page, 'Ta page est vide : glisse des blocs dans la partie visible.');
      visit(page, null, null);
      if (page.getInputTargetBlock('BODY') && headings === 0) add(page, 'Ta page n’a pas encore de titre : ajoute un « titre de niveau 1 » (<h1>).');
    }

    var general = [];
    if (!page) general.push('Ta page est vide : glisse le bloc « page web » (catégorie Structure) dans l\u2019espace de travail.');

    // Les blocs qui traînent en dehors de la page.
    ws.getTopBlocks(true).forEach(function (t) {
      if (t === page || t.isInsertionMarker()) return;
      if (t.type === 'bw_page') add(t, 'Il y a déjà une page : seul le bloc « page web » le plus haut est utilisé.');
      else add(t, 'Ce bloc n’est pas rangé dans la page, il ne s’affiche pas. Accroche-le dans le bloc « page web ».');
    });

    return { byBlock: out, order: order, general: general };
  };
})();
