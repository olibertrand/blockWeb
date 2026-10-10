# BlocWeb 🧱

**Construis ta page web avec des blocs… puis passe au vrai code.**

BlocWeb est une application web **en français** pour initier les collégiennes et collégiens à la création
de pages web en HTML et CSS. On commence avec des blocs à emboîter, comme dans Scratch. Pendant ce temps, on voit
le code HTML qu’ils produisent. Quand on se sent prêt, on passe à l’écriture du code.

Comme EduBlocks, BlocWeb propose les **blocs de structure sémantique** (`header`, `nav`, `main`, `section`,
`article`, `aside`, `footer`…), dont on a besoin ensuite dans un éditeur de texte. Il cherche surtout à
rendre le **passage des blocs au code** le plus progressif possible.

## Utiliser BlocWeb

- **Rien à installer.** Ouvrez `index.html` dans un navigateur récent (Firefox, Chrome, Edge ou Safari).
  BlocWeb fonctionne aussi **hors connexion**, depuis une clé USB ou un poste sans Internet.
- Vous pouvez aussi déposer le dossier sur n’importe quel hébergement web : GitHub Pages, ENT, serveur de
  l’établissement…
- Le travail est **enregistré automatiquement** dans le navigateur. On peut aussi :
  - télécharger le projet (fichier `.blocweb`) pour le reprendre ailleurs ou le rendre au professeur ;
  - télécharger la page web (`.html`, ou `.zip` si elle contient des images) pour l’ouvrir dans un navigateur.
- **Aucune donnée n’est envoyée sur Internet.**

## Ce que BlocWeb apporte

| | |
|---|---|
| 🇫🇷 **Tout en français** | Les blocs, les explications au survol, les conseils et les messages sont en français, avec des mots simples. |
| 🧩 **Un bloc = une balise** | Les blocs s’emboîtent comme les balises HTML. Ils **refusent de s’accrocher au mauvais endroit** : un élément de liste ne va que dans une liste, une case de tableau que dans une ligne… |
| 🏷️ **Trois façons d’afficher les blocs** | Le bouton **Étiquettes** propose trois affichages. *Français* : `paragraphe [Bonjour]`. *Les deux* : `paragraphe <p> [Bonjour] </p>`. *Balises* : `<p> [Bonjour] </p>`, c’est-à-dire le vrai code. On passe ainsi des mots aux balises à son rythme. |
| 👀 **Aperçu et code en direct, synchronisés** | Quand on clique sur un bloc, son code s’éclaire et l’élément est entouré dans l’aperçu. Dans l’autre sens, un clic dans l’aperçu ou dans le code retrouve le bloc. |
| ⌨️ **Mode Code réversible** | On écrit le HTML soi-même. L’éditeur propose les balises quand on tape `<` et ferme les balises tout seul. Les erreurs (balise non fermée, mal imbriquée, `li` hors d’une liste…) sont signalées avec leur numéro de ligne. On peut **revenir aux blocs** à tout moment : le code est retransformé en blocs. |
| 💡 **Conseils** | Ils aident à bien structurer la page : un seul `h1`, pas de niveau de titre sauté, une description (`alt`) pour chaque image, un titre au début des sections, un seul `main`… |
| 🎨 **CSS guidé** | Les blocs « style pour … » se remplissent de propriétés en français (couleur du texte, couleur de fond, alignement, police, bordure…). Les couleurs sont choisies dans une palette nommée. |
| ✨ **Modèles** | Page vide, Ma présentation, Exposé (les volcans), Recette (les crêpes). |
| 🖼️ **Mes images** | On ajoute ses images depuis l’ordinateur. Elles sont réduites automatiquement et renommées proprement (`Mon Chat.JPG` devient `mon-chat.jpg`). Elles sont ensuite incluses dans le `.zip` exporté. |

## Une progression possible en classe

1. **Étiquettes « Français »** : construire la structure d’une page (en-tête, sections, titres, paragraphes,
   listes) et observer l’aperçu.
2. **Étiquettes « Les deux »** : associer chaque bloc à sa balise. Cliquer sur les blocs pour repérer leur code.
3. **Étiquettes « Balises »** : les blocs ressemblent au code. On ajoute du style avec les blocs CSS.
4. **Mode « Code »** : modifier le code produit par les blocs, puis écrire ses propres pages. Les conseils
   aident à corriger les erreurs.

## Les blocs

| Catégorie | Blocs |
|---|---|
| 🏗️ Structure | page web (`html`, `head`, `title`, `style`, `body`), en-tête `header`, menu `nav`, contenu principal `main`, `section`, `article`, encadré `aside`, pied de page `footer`, boîte `div` |
| ✏️ Texte | titres `h1` à `h6`, paragraphe `p` (simple ou à composer), texte, important `strong`, accentué `em`, surligné `mark`, retour à la ligne `br`, citation `blockquote`, séparation `hr` |
| 📋 Listes | liste à puces `ul`, liste numérotée `ol`, élément `li` (simple ou à composer) |
| 🔗 Liens et images | lien `a`, lien sur une image, image `img` (`src`, `alt`), illustration `figure` et légende `figcaption` |
| 📊 Tableaux | tableau `table`, titre `caption`, ligne `tr`, case de titre `th`, case `td` |
| 🎨 Style (CSS) | règle « style pour … », couleur du texte, couleur de fond, alignement, taille, police, gras, italique, soulignement, bordure, coins arrondis, marges, largeur |
| 🧰 Plus | n’importe quelle balise avec ses attributs, commentaire `<!-- -->`, sélecteur et propriété CSS écrits à la main |

Le **mémo des balises** (bouton ❓ Aide) récapitule tous les blocs avec leur code et leur rôle.

## Pour les développeurs

L’application est faite de fichiers statiques. Il n’y a pas d’étape de compilation. Les scripts sont
classiques (pas de modules) pour fonctionner aussi en ouvrant `index.html` directement depuis le disque.

```
index.html          la page de l’application
css/app.css         les styles
js/catalog.js       le catalogue des blocs : balise, nom français, explication, où chaque bloc peut aller
js/blocks.js        les blocs Blockly, les trois modes d’étiquettes, la boîte à outils, la règle d’emboîtement
js/generator.js     blocs → HTML indenté, avec la position de chaque bloc dans le code
js/importer.js      HTML → blocs (mode code, ouverture de fichiers .html, modèles)
js/advice.js        les conseils sur les blocs
js/codecheck.js     la vérification du code écrit à la main
js/templates.js     les modèles de pages (écrits en HTML) et leurs illustrations SVG
js/zip.js           création du .zip téléchargé
js/sounds.js        les sons de Blockly, intégrés pour fonctionner hors serveur
js/app.js           l’interface : aperçu, code, fichiers, images, aide
vendor/             Blockly 13.3.0 et CodeMirror 5.65.21
tests/              test automatique dans Chromium (Playwright)
```

**Ajouter un bloc** : décrivez-le dans `js/catalog.js` (forme, balise, nom, contextes), ajoutez-le à la boîte
à outils dans `js/blocks.js`, puis traitez sa conversion dans `js/importer.js`.

**Tests** :

```sh
npm install
npm test
```

Pour servir l’application en local : `npm start`, puis ouvrez http://localhost:8000.

## Licences des bibliothèques

- [Blockly](https://github.com/RaspberryPiFoundation/blockly) : Apache 2.0 (`vendor/blockly/LICENSE`)
- [CodeMirror 5](https://codemirror.net/5/) : MIT (`vendor/codemirror/LICENSE`)

Les illustrations des modèles ont été dessinées pour BlocWeb.
