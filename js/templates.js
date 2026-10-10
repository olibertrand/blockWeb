/*
 * BlocWeb — les modèles de pages.
 *
 * Chaque modèle est écrit en HTML (comme le ferait un élève en mode code),
 * puis transformé en blocs par l'importateur. Les images sont des dessins
 * SVG faits pour BlocWeb (libres de droits).
 */
(function () {
  'use strict';
  var BW = window.BW;

  function svg(s) { return 'data:image/svg+xml,' + encodeURIComponent(s); }

  var VOLCAN = svg('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">' +
    '<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb46b"/><stop offset="1" stop-color="#ffe3b8"/></linearGradient></defs>' +
    '<rect width="300" height="200" fill="url(#c)"/>' +
    '<circle cx="250" cy="45" r="22" fill="#ffd84d"/>' +
    '<g fill="#8d8d8d" opacity=".85"><circle cx="140" cy="38" r="16"/><circle cx="160" cy="28" r="20"/><circle cx="182" cy="40" r="15"/><circle cx="125" cy="20" r="11"/></g>' +
    '<path d="M20 200 L118 72 Q150 62 182 72 L280 200 Z" fill="#6b4a3a"/>' +
    '<path d="M118 72 Q150 86 182 72 Q150 62 118 72 Z" fill="#e8401c"/>' +
    '<path d="M140 76 C134 110 150 130 128 165 C124 175 138 178 142 168 C160 136 150 110 156 78 Z" fill="#f26b1d"/>' +
    '<path d="M168 76 C172 100 196 120 190 150 C188 160 200 160 201 150 C206 120 186 100 178 76 Z" fill="#f59a23"/>' +
    '<g fill="#f2541b"><circle cx="150" cy="58" r="6"/><circle cx="136" cy="48" r="4"/><circle cx="166" cy="46" r="5"/><circle cx="152" cy="40" r="3"/></g>' +
    '<rect y="188" width="300" height="12" fill="#4f7a3a"/></svg>');

  var CREPES = svg('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">' +
    '<rect width="300" height="200" fill="#fdf3e1"/>' +
    '<ellipse cx="150" cy="150" rx="125" ry="32" fill="#ffffff" stroke="#c9b8a0" stroke-width="3"/>' +
    '<ellipse cx="150" cy="148" rx="90" ry="20" fill="#efe7da"/>' +
    '<g stroke="#b5762c" stroke-width="2">' +
    '<ellipse cx="150" cy="140" rx="95" ry="18" fill="#e9a94f"/>' +
    '<ellipse cx="150" cy="128" rx="95" ry="18" fill="#f0b862"/>' +
    '<ellipse cx="150" cy="116" rx="95" ry="18" fill="#e9a94f"/>' +
    '<ellipse cx="150" cy="104" rx="95" ry="18" fill="#f3c373"/></g>' +
    '<g fill="#d98a35" opacity=".7"><circle cx="120" cy="100" r="4"/><circle cx="170" cy="108" r="5"/><circle cx="190" cy="98" r="3"/><circle cx="140" cy="110" r="3"/></g>' +
    '<rect x="135" y="84" width="30" height="16" rx="3" fill="#fff3a6" stroke="#d8c25a" stroke-width="2"/>' +
    '<path d="M215 70 q10 -14 22 -2 q-4 18 -11 22 q-9 -6 -11 -20 z" fill="#e3263a"/>' +
    '<path d="M222 62 l4 -8 l4 8 z" fill="#2f8f3a"/></svg>');

  var AVATAR = svg('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
    '<circle cx="100" cy="100" r="96" fill="#9fd3f2"/>' +
    '<path d="M30 190 Q100 120 170 190 Z" fill="#3a7bd5"/>' +
    '<circle cx="100" cy="88" r="46" fill="#f2c79b"/>' +
    '<path d="M54 84 Q58 34 100 36 Q144 34 148 84 Q136 60 100 58 Q70 58 54 84 Z" fill="#5b3a29"/>' +
    '<circle cx="84" cy="90" r="6" fill="#2b2b2b"/><circle cx="116" cy="90" r="6" fill="#2b2b2b"/>' +
    '<path d="M80 108 Q100 126 120 108" stroke="#a0422a" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="74" cy="106" r="7" fill="#f2a28b" opacity=".6"/><circle cx="126" cy="106" r="7" fill="#f2a28b" opacity=".6"/></svg>');

  BW.TEMPLATES = [
    {
      id: 'vide', name: 'Page vide', emoji: '📄',
      desc: 'Une page avec juste un titre et un paragraphe.',
      html: '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Ma page</title></head><body>' +
        '<h1>Mon titre</h1><p>Écris ton texte ici.</p></body></html>'
    },
    {
      id: 'presentation', name: 'Ma présentation', emoji: '🙂',
      desc: 'Se présenter : qui je suis, mes passions, mon livre préféré.',
      images: { 'avatar.svg': AVATAR },
      html: '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Ma présentation</title>' +
        '<style>body { font-family: Verdana, sans-serif; background-color: ivory; }' +
        'h1 { color: darkblue; text-align: center; }' +
        'h2 { color: steelblue; }' +
        'img { width: 150px; }</style></head><body>' +
        '<header><h1>Bonjour, je m’appelle Camille !</h1></header>' +
        '<main>' +
        '<section><h2>Qui suis-je ?</h2><img src="avatar.svg" alt="Mon avatar : un visage souriant">' +
        '<p>J’ai <strong>12 ans</strong> et je suis en 5e. J’habite à Lyon.</p></section>' +
        '<section><h2>Mes passions</h2><ul><li>le basket</li><li>la musique</li><li>les mangas</li></ul></section>' +
        '<section><h2>Mon livre préféré</h2><p>En ce moment, je lis <em>Le Petit Prince</em> d’Antoine de Saint-Exupéry.</p></section>' +
        '</main>' +
        '<footer><p>Page réalisée par Camille.</p></footer></body></html>'
    },
    {
      id: 'expose', name: 'Exposé : les volcans', emoji: '🌋',
      desc: 'Un exposé avec un menu de liens, des articles, une illustration, un tableau et un encadré.',
      images: { 'volcan.svg': VOLCAN },
      html: '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Les volcans</title>' +
        '<style>body { font-family: Arial, sans-serif; background-color: beige; }' +
        'header { background-color: darkred; color: white; text-align: center; padding: 10px; }' +
        'h2 { color: darkred; }' +
        'img { width: 300px; }' +
        'th { background-color: darkred; color: white; padding: 5px; }' +
        'td { border: 1px solid lightgray; padding: 5px; }' +
        'aside { background-color: lightyellow; border: 2px dashed orange; padding: 10px; }' +
        'footer { font-style: italic; }</style></head><body>' +
        '<header><h1>Les volcans</h1><p>Un exposé de Léa et Hugo</p></header>' +
        '<nav><ul><li><a href="https://fr.vikidia.org/wiki/Volcan">Vikidia : les volcans</a></li>' +
        '<li><a href="https://fr.wikipedia.org/wiki/Volcan">Wikipédia : les volcans</a></li></ul></nav>' +
        '<main>' +
        '<article><h2>Qu’est-ce qu’un volcan ?</h2>' +
        '<p>Un volcan est une montagne d’où sort de la <strong>lave</strong> : de la roche fondue, très chaude, qui vient des profondeurs de la Terre.</p>' +
        '<figure><img src="volcan.svg" alt="Dessin d’un volcan en éruption"><figcaption>Un volcan en éruption.</figcaption></figure></article>' +
        '<article><h2>Quelques volcans célèbres</h2>' +
        '<table><caption>Trois volcans</caption>' +
        '<tr><th>Nom</th><th>Où ?</th><th>Altitude</th></tr>' +
        '<tr><td>Kilimandjaro</td><td>Tanzanie</td><td>5 895 m</td></tr>' +
        '<tr><td>Etna</td><td>Italie</td><td>environ 3 300 m</td></tr>' +
        '<tr><td>Piton de la Fournaise</td><td>La Réunion</td><td>2 632 m</td></tr></table></article>' +
        '<aside><h2>Le savais-tu ?</h2><p>Il y a des volcans en France : le Piton de la Fournaise, à La Réunion, est l’un des volcans les plus actifs du monde.</p></aside>' +
        '</main>' +
        '<footer><p>Sources : Vikidia, l’encyclopédie des 8-13 ans.</p></footer></body></html>'
    },
    {
      id: 'recette', name: 'Recette : les crêpes', emoji: '🥞',
      desc: 'Une recette avec une liste d’ingrédients et des étapes numérotées.',
      images: { 'crepes.svg': CREPES },
      html: '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Recette des crêpes</title>' +
        '<style>body { font-family: Georgia, serif; }' +
        'h1 { color: chocolate; text-align: center; }' +
        'h2 { color: white; background-color: chocolate; padding: 5px; border-radius: 10px; }' +
        'img { width: 250px; }</style></head><body>' +
        '<h1>Les crêpes de mamie</h1>' +
        '<figure><img src="crepes.svg" alt="Une pile de crêpes dans une assiette"><figcaption>Miam !</figcaption></figure>' +
        '<p>Pour <strong>4 personnes</strong>. Préparation : 10 minutes. Repos de la pâte : 1 heure.</p>' +
        '<h2>Ingrédients</h2><ul><li>250 g de farine</li><li>4 œufs</li><li>50 cl de lait</li>' +
        '<li>1 pincée de sel</li><li>2 cuillères à soupe de sucre</li><li>50 g de beurre fondu</li></ul>' +
        '<h2>Préparation</h2><ol><li>Verse la farine dans un saladier et creuse un puits au milieu.</li>' +
        '<li>Ajoute les œufs, le sucre et le sel, puis mélange.</li>' +
        '<li>Verse le lait petit à petit en mélangeant, pour éviter les grumeaux.</li>' +
        '<li>Ajoute le beurre fondu et laisse reposer la pâte 1 heure.</li>' +
        '<li>Fais cuire les crêpes dans une poêle chaude, avec l’aide d’un adulte.</li></ol>' +
        '<p>Bon appétit !</p></body></html>'
    }
  ];
})();
