/*
 * BlocWeb — catalogue des blocs.
 *
 * C'est la « source de vérité » partagée par tout le reste de l'application :
 * définition des blocs Blockly, génération du HTML, import du code,
 * conseils et mémo des balises.
 *
 * Chaque bloc a :
 *  - shape  : sa forme (conteneur, texte sur une ligne, image, lien…)
 *  - tag    : la balise HTML produite
 *  - fr     : son nom en français (affiché sur le bloc)
 *  - kinds  : les « endroits » où il peut se ranger (flow = dans la page,
 *             inline = dans un paragraphe, li = dans une liste…)
 *  - accepts: pour un conteneur, les sortes de blocs qu'il accepte
 *  - tip    : l'explication affichée au survol et dans le mémo
 */
(function () {
  'use strict';
  var BW = (window.BW = window.BW || {});

  // Tous les contextes HTML (utilisé par les blocs « joker »).
  var ANY_HTML = ['flow', 'inline', 'li', 'tr', 'td', 'caption', 'figcaption'];
  BW.ANY_HTML = ANY_HTML;

  BW.CATEGORIES = [
    { id: 'structure', name: 'Structure', emoji: '🏗️', colour: '#7a4cc2' },
    { id: 'texte', name: 'Texte', emoji: '✏️', colour: '#1f6fb8' },
    { id: 'listes', name: 'Listes', emoji: '📋', colour: '#18825a' },
    { id: 'medias', name: 'Liens et images', emoji: '🔗', colour: '#b55a10' },
    { id: 'tableaux', name: 'Tableaux', emoji: '📊', colour: '#ad3767' },
    { id: 'style', name: 'Style (CSS)', emoji: '🎨', colour: '#0d7680' },
    { id: 'plus', name: 'Plus', emoji: '🧰', colour: '#5f6973' }
  ];
  // Couleurs secondaires (blocs « page », « partie invisible » et « mise en valeur »).
  BW.EXTRA_COLOURS = { page: '#33415c', head: '#8a6a00', inline: '#2a7fa8' };

  var D = [];
  function def(o) { D.push(o); return o; }

  /* ---------- La page ---------- */
  def({
    type: 'bw_page', cat: 'structure', style: 'page', shape: 'page', tag: 'html',
    fr: 'page web', kinds: [],
    inputs: { HEAD: ['head'], BODY: ['flow'] },
    tip: 'La page entière. La partie invisible (<head>) donne des informations sur la page ; ' +
      'tout ce qui est rangé dans la partie visible (<body>) s’affiche dans le navigateur.',
    memo: 'La page entière : <html> contient <head> (la partie invisible : titre de l’onglet, style) et <body> (la partie visible).'
  });

  /* ---------- La partie invisible (<head>) ---------- */
  def({ type: 'bw_title', cat: 'structure', style: 'head', shape: 'text', tag: 'title', fr: 'titre de l’onglet',
    kinds: ['head'], text: 'Ma page',
    tip: 'Le titre de la page : il s’affiche dans l’onglet du navigateur et dans les favoris. Il se range dans la partie invisible (<head>).' });
  def({ type: 'bw_style', cat: 'structure', style: 'head', shape: 'container', tag: 'style', fr: 'style (CSS)',
    kinds: ['head'], inputs: { CONTENT: ['css'] },
    tip: 'Le style de la page (CSS) : on y range des règles « style pour … » qui décorent la page. Il se range dans la partie invisible (<head>).' });

  /* ---------- Structure (balises sémantiques) ---------- */
  var structure = [
    ['bw_header', 'header', 'en-tête', 'Le haut de la page (ou d’un article) : on y met souvent le titre principal, un logo, le menu.'],
    ['bw_nav', 'nav', 'menu de navigation', 'Un menu : un groupe de liens pour se déplacer dans le site.'],
    ['bw_main', 'main', 'contenu principal', 'Le contenu principal de la page. Il n’y en a qu’un par page.'],
    ['bw_section', 'section', 'section', 'Une partie de la page qui parle d’un même thème. Elle commence en général par un titre.'],
    ['bw_article', 'article', 'article', 'Un contenu complet qui a du sens tout seul : un article de blog, une fiche, une actualité…'],
    ['bw_aside', 'aside', 'encadré', 'Un contenu à côté du sujet principal : une anecdote, un « le savais-tu ? », des liens utiles…'],
    ['bw_footer', 'footer', 'pied de page', 'Le bas de la page : auteur, date, contact…'],
    ['bw_div', 'div', 'boîte', 'Une boîte sans signification particulière, pour regrouper des éléments (souvent pour la mise en forme).']
  ];
  structure.forEach(function (s) {
    def({ type: s[0], cat: 'structure', shape: 'container', tag: s[1], fr: s[2],
      kinds: ['flow'], inputs: { CONTENT: ['flow'] }, tip: s[3] });
  });

  /* ---------- Texte ---------- */
  def({ type: 'bw_heading', cat: 'texte', shape: 'heading', tag: 'h1', fr: 'titre',
    kinds: ['flow'], text: 'Mon titre',
    tip: 'Un titre. Niveau 1 (<h1>) = le plus important, un seul par page. Niveau 2 (<h2>) pour les parties, niveau 3 (<h3>) pour les sous-parties…',
    memo: 'Les titres, du plus important (<h1>) au moins important (<h6>).' });
  def({ type: 'bw_p', cat: 'texte', shape: 'text', tag: 'p', fr: 'paragraphe',
    kinds: ['flow'], text: 'Écris ton texte ici.',
    tip: 'Un paragraphe de texte.' });
  def({ type: 'bw_p_box', cat: 'texte', shape: 'container', tag: 'p', fr: 'paragraphe',
    kinds: ['flow'], inputs: { CONTENT: ['inline'] },
    tip: 'Un paragraphe dans lequel tu peux mélanger du texte, du gras, de l’italique, des liens…',
    memo: 'Un paragraphe à composer avec du texte et des mots mis en valeur.' });
  def({ type: 'bw_text', cat: 'texte', style: 'inline', shape: 'textnode', tag: '', fr: 'texte',
    kinds: ['inline'], text: 'du texte',
    tip: 'Du texte simple, sans balise.' });
  def({ type: 'bw_strong', cat: 'texte', style: 'inline', shape: 'text', tag: 'strong', fr: 'important',
    kinds: ['inline'], text: 'important',
    tip: 'Un passage important. Le navigateur l’affiche en gras.' });
  def({ type: 'bw_em', cat: 'texte', style: 'inline', shape: 'text', tag: 'em', fr: 'accentué',
    kinds: ['inline'], text: 'accentué',
    tip: 'Un mot sur lequel on insiste. Le navigateur l’affiche en italique.' });
  def({ type: 'bw_mark', cat: 'texte', style: 'inline', shape: 'text', tag: 'mark', fr: 'surligné',
    kinds: ['inline'], text: 'surligné',
    tip: 'Un passage surligné, comme avec un surligneur.' });
  def({ type: 'bw_br', cat: 'texte', style: 'inline', shape: 'void', tag: 'br', fr: 'retour à la ligne',
    kinds: ['inline'],
    tip: 'Passe à la ligne suivante, sans commencer un nouveau paragraphe.' });
  def({ type: 'bw_blockquote', cat: 'texte', shape: 'text', tag: 'blockquote', fr: 'citation',
    kinds: ['flow'], text: 'Une citation célèbre.',
    tip: 'Une citation : des paroles ou un texte écrits par quelqu’un d’autre.' });
  def({ type: 'bw_hr', cat: 'texte', shape: 'void', tag: 'hr', fr: 'séparation',
    kinds: ['flow'],
    tip: 'Une séparation entre deux parties (souvent affichée comme un trait).' });

  /* ---------- Listes ---------- */
  def({ type: 'bw_ul', cat: 'listes', shape: 'container', tag: 'ul', fr: 'liste à puces',
    kinds: ['flow'], inputs: { CONTENT: ['li'] },
    tip: 'Une liste dont l’ordre n’a pas d’importance (chaque élément a une puce).' });
  def({ type: 'bw_ol', cat: 'listes', shape: 'container', tag: 'ol', fr: 'liste numérotée',
    kinds: ['flow'], inputs: { CONTENT: ['li'] },
    tip: 'Une liste dont l’ordre compte (les éléments sont numérotés : étapes, classement…).' });
  def({ type: 'bw_li', cat: 'listes', shape: 'text', tag: 'li', fr: 'élément',
    kinds: ['li'], text: 'un élément',
    tip: 'Un élément de liste. Il se range dans une liste à puces ou une liste numérotée.' });
  def({ type: 'bw_li_box', cat: 'listes', shape: 'container', tag: 'li', fr: 'élément',
    kinds: ['li'], inputs: { CONTENT: ['inline', 'flow'] },
    tip: 'Un élément de liste qui peut contenir un lien, du texte mis en valeur ou même une autre liste.',
    memo: 'Un élément de liste à composer (avec un lien, une sous-liste…).' });

  /* ---------- Liens et images ---------- */
  def({ type: 'bw_a', cat: 'medias', shape: 'link', tag: 'a', fr: 'lien',
    kinds: ['inline', 'flow'], text: 'Vikidia', href: 'https://fr.vikidia.org',
    tip: 'Un lien : on clique sur le texte pour aller à l’adresse indiquée (href).' });
  def({ type: 'bw_a_box', cat: 'medias', shape: 'linkbox', tag: 'a', fr: 'lien',
    kinds: ['inline', 'flow'], inputs: { CONTENT: ['inline', 'flow'] }, href: 'https://fr.vikidia.org',
    tip: 'Un lien qui peut contenir une image ou du texte mis en valeur.',
    memo: 'Un lien à composer (par exemple une image sur laquelle on peut cliquer).' });
  def({ type: 'bw_img', cat: 'medias', shape: 'image', tag: 'img', fr: 'image',
    kinds: ['inline', 'flow'],
    tip: 'Une image. « src » est l’adresse (ou le nom) du fichier image, « alt » est sa description.' });
  def({ type: 'bw_figure', cat: 'medias', shape: 'container', tag: 'figure', fr: 'illustration',
    kinds: ['flow'], inputs: { CONTENT: ['flow', 'figcaption'] },
    tip: 'Une illustration avec sa légende : on y range une image et un bloc « légende ».' });
  def({ type: 'bw_figcaption', cat: 'medias', shape: 'text', tag: 'figcaption', fr: 'légende',
    kinds: ['figcaption'], text: 'La légende de l’image.',
    tip: 'La légende d’une illustration. Elle se range dans un bloc « illustration ».' });

  /* ---------- Tableaux ---------- */
  def({ type: 'bw_table', cat: 'tableaux', shape: 'container', tag: 'table', fr: 'tableau',
    kinds: ['flow'], inputs: { CONTENT: ['caption', 'tr'] },
    tip: 'Un tableau. Il contient des lignes, qui contiennent des cases.' });
  def({ type: 'bw_caption', cat: 'tableaux', shape: 'text', tag: 'caption', fr: 'titre du tableau',
    kinds: ['caption'], text: 'Mon tableau',
    tip: 'Le titre d’un tableau (à mettre au tout début du tableau).' });
  def({ type: 'bw_tr', cat: 'tableaux', shape: 'container', tag: 'tr', fr: 'ligne',
    kinds: ['tr'], inputs: { CONTENT: ['td'] },
    tip: 'Une ligne du tableau (tr = table row). Elle contient des cases.' });
  def({ type: 'bw_th', cat: 'tableaux', shape: 'text', tag: 'th', fr: 'case de titre',
    kinds: ['td'], text: 'Titre',
    tip: 'Une case de titre (th = table header), pour nommer une colonne ou une ligne.' });
  def({ type: 'bw_td', cat: 'tableaux', shape: 'text', tag: 'td', fr: 'case',
    kinds: ['td'], text: 'case',
    tip: 'Une case du tableau (td = table data).' });

  /* ---------- Style (CSS) ---------- */
  def({ type: 'bw_css_rule', cat: 'style', shape: 'cssrule', tag: 'style', fr: 'style pour',
    kinds: ['css'], inputs: { CONTENT: ['cssprop'] },
    tip: 'Une règle de style : choisis les éléments à décorer, puis range dedans des propriétés (couleur, taille…).',
    memo: 'Une règle CSS : un sélecteur (ex. h1) puis des propriétés entre accolades { }.' });

  // Propriétés CSS « guidées ».
  // args: liste des champs. kind: color | number | choice ; unit: unité ajoutée.
  var CSS_PROPS = [
    { type: 'bw_css_color', prop: 'color', fr: 'couleur du texte', args: [{ name: 'V', kind: 'color', value: 'darkblue' }],
      tip: 'La couleur du texte.' },
    { type: 'bw_css_bg', prop: 'background-color', fr: 'couleur de fond', args: [{ name: 'V', kind: 'color', value: 'lightyellow' }],
      tip: 'La couleur du fond.' },
    { type: 'bw_css_align', prop: 'text-align', fr: 'alignement du texte', args: [{ name: 'V', kind: 'choice', value: 'center',
      options: [['à gauche', 'left'], ['centré', 'center'], ['à droite', 'right'], ['justifié', 'justify']] }],
      tip: 'L’alignement du texte : à gauche, centré, à droite ou justifié.' },
    { type: 'bw_css_size', prop: 'font-size', fr: 'taille du texte', args: [{ name: 'N', kind: 'number', value: 20, min: 1, max: 300, unit: 'px' }],
      tip: 'La taille des lettres, en pixels (px). Le texte normal mesure 16 pixels.' },
    { type: 'bw_css_font', prop: 'font-family', fr: 'police', args: [{ name: 'V', kind: 'choice', value: 'Verdana, sans-serif',
      options: [['Arial', 'Arial, sans-serif'], ['Verdana', 'Verdana, sans-serif'], ['Trebuchet', '"Trebuchet MS", sans-serif'],
        ['Georgia', 'Georgia, serif'], ['Times', '"Times New Roman", serif'], ['Courier', '"Courier New", monospace'],
        ['Comic Sans', '"Comic Sans MS", cursive'], ['Impact', 'Impact, sans-serif']] }],
      tip: 'La police de caractères (la forme des lettres).' },
    { type: 'bw_css_weight', prop: 'font-weight', fr: 'épaisseur du texte', args: [{ name: 'V', kind: 'choice', value: 'bold',
      options: [['gras', 'bold'], ['normal', 'normal']] }],
      tip: 'Met le texte en gras, ou l’enlève.' },
    { type: 'bw_css_italic', prop: 'font-style', fr: 'style du texte', args: [{ name: 'V', kind: 'choice', value: 'italic',
      options: [['italique', 'italic'], ['normal', 'normal']] }],
      tip: 'Met le texte en italique, ou l’enlève.' },
    { type: 'bw_css_deco', prop: 'text-decoration', fr: 'trait sur le texte', args: [{ name: 'V', kind: 'choice', value: 'underline',
      options: [['souligné', 'underline'], ['barré', 'line-through'], ['aucun', 'none']] }],
      tip: 'Souligne ou barre le texte. « aucun » enlève le soulignement des liens.' },
    { type: 'bw_css_border', prop: 'border', fr: 'bordure', args: [
        { name: 'N', kind: 'number', value: 2, min: 0, max: 50, unit: 'px' },
        { name: 'S', kind: 'choice', value: 'solid', options: [['pleine', 'solid'], ['en tirets', 'dashed'], ['en pointillés', 'dotted'], ['double', 'double']] },
        { name: 'C', kind: 'color', value: 'black' }],
      tip: 'Une bordure autour de l’élément : épaisseur, forme du trait et couleur.' },
    { type: 'bw_css_radius', prop: 'border-radius', fr: 'coins arrondis', args: [{ name: 'N', kind: 'number', value: 10, min: 0, max: 500, unit: 'px' }],
      tip: 'Arrondit les coins de l’élément.' },
    { type: 'bw_css_padding', prop: 'padding', fr: 'marge intérieure', args: [{ name: 'N', kind: 'number', value: 10, min: 0, max: 500, unit: 'px' }],
      tip: 'L’espace entre le bord de l’élément et son contenu.' },
    { type: 'bw_css_margin', prop: 'margin', fr: 'marge extérieure', args: [{ name: 'N', kind: 'number', value: 10, min: 0, max: 500, unit: 'px' }],
      tip: 'L’espace autour de l’élément, qui l’éloigne de ses voisins.' },
    { type: 'bw_css_width', prop: 'width', fr: 'largeur', args: [
        { name: 'N', kind: 'number', value: 300, min: 0, max: 5000 },
        { name: 'U', kind: 'choice', glue: true, value: 'px', options: [['pixels', 'px'], ['%', '%']] }],
      tip: 'La largeur de l’élément, en pixels ou en pourcentage (%) de la place disponible.' }
  ];
  CSS_PROPS.forEach(function (p) {
    def({ type: p.type, cat: 'style', shape: 'cssprop', tag: '', prop: p.prop, fr: p.fr, args: p.args,
      kinds: ['cssprop'], tip: p.tip });
  });

  /* ---------- Plus ---------- */
  def({ type: 'bw_generic', cat: 'plus', shape: 'generic', tag: 'span', fr: 'balise',
    kinds: ANY_HTML.concat('head'), inputs: { CONTENT: ANY_HTML },
    tip: 'N’importe quelle balise HTML : écris son nom et, si tu veux, ses attributs (par exemple class="important").',
    memo: 'Pour utiliser une balise qui n’a pas de bloc, avec des attributs si besoin.' });
  def({ type: 'bw_comment', cat: 'plus', shape: 'comment', tag: '!--', fr: 'note invisible',
    kinds: ANY_HTML.concat('head'), text: 'Une note pour moi',
    tip: 'Un commentaire : une note dans le code, qui ne s’affiche pas dans la page.',
    memo: 'Un commentaire <!-- ... --> : une note pour toi, invisible dans la page.' });
  def({ type: 'bw_css_rule_free', cat: 'plus', shape: 'cssrulefree', tag: 'style', fr: 'style pour',
    kinds: ['css'], inputs: { CONTENT: ['cssprop'] },
    tip: 'Une règle de style avec un sélecteur écrit à la main (par exemple nav a, ou .important).' });
  def({ type: 'bw_css_free', cat: 'plus', shape: 'csspropfree', tag: '', fr: 'propriété',
    kinds: ['cssprop'],
    tip: 'N’importe quelle propriété CSS, écrite à la main (par exemple line-height : 1.5).' });

  BW.DEFS = {};
  D.forEach(function (d) { BW.DEFS[d.type] = d; });
  BW.DEF_LIST = D;

  /* ---------- Listes de valeurs ---------- */

  // Couleurs : nom français, nom CSS.
  BW.COLORS = [
    ['noir', 'black'], ['gris foncé', 'dimgray'], ['gris', 'gray'], ['gris clair', 'lightgray'], ['blanc', 'white'],
    ['rouge', 'red'], ['rouge foncé', 'darkred'], ['corail', 'coral'], ['saumon', 'salmon'], ['rose', 'pink'],
    ['rose vif', 'hotpink'], ['orange', 'orange'], ['or', 'gold'], ['jaune', 'yellow'], ['jaune pâle', 'lightyellow'],
    ['beige', 'beige'], ['ivoire', 'ivory'], ['marron', 'brown'], ['chocolat', 'chocolate'], ['vert', 'green'],
    ['vert foncé', 'darkgreen'], ['vert clair', 'lightgreen'], ['vert citron', 'lime'], ['olive', 'olive'],
    ['turquoise', 'turquoise'], ['bleu ciel', 'skyblue'], ['bleu clair', 'lightblue'], ['bleu', 'blue'],
    ['bleu acier', 'steelblue'], ['bleu foncé', 'darkblue'], ['bleu marine', 'navy'], ['violet', 'purple'],
    ['mauve', 'violet'], ['lavande', 'lavender'], ['transparent', 'transparent']
  ];

  // Sélecteurs proposés dans le bloc « style pour ».
  BW.SELECTORS = [
    ['toute la page', 'body'],
    ['les titres de niveau 1', 'h1'], ['les titres de niveau 2', 'h2'], ['les titres de niveau 3', 'h3'],
    ['les paragraphes', 'p'], ['les liens', 'a'], ['les images', 'img'],
    ['l’en-tête', 'header'], ['le menu', 'nav'], ['le contenu principal', 'main'],
    ['les sections', 'section'], ['les articles', 'article'], ['les encadrés', 'aside'], ['le pied de page', 'footer'],
    ['les boîtes', 'div'],
    ['les listes à puces', 'ul'], ['les listes numérotées', 'ol'], ['les éléments de liste', 'li'],
    ['les tableaux', 'table'], ['les cases de titre', 'th'], ['les cases', 'td'],
    ['les mots importants', 'strong'], ['les mots accentués', 'em'], ['les mots surlignés', 'mark'],
    ['les citations', 'blockquote'], ['les illustrations', 'figure'], ['les légendes', 'figcaption']
  ];

  // Éléments qui n'ont pas de balise fermante.
  BW.VOID_TAGS = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  // Éléments « en ligne » (ils restent sur la même ligne dans le code).
  BW.INLINE_TAGS = { a: 1, abbr: 1, b: 1, br: 1, cite: 1, code: 1, del: 1, em: 1, i: 1, img: 1, ins: 1, kbd: 1,
    mark: 1, q: 1, s: 1, small: 1, span: 1, strong: 1, sub: 1, sup: 1, time: 1, u: 1, wbr: 1 };
})();
