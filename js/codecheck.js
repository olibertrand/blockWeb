/*
 * BlocWeb — vérification du code HTML écrit à la main (mode code).
 *
 * Le navigateur « répare » silencieusement le HTML mal écrit ; ici, on
 * signale les erreurs les plus fréquentes chez les débutants, avec le
 * numéro de ligne : balises non fermées, mal imbriquées, inconnues,
 * guillemets oubliés, éléments rangés au mauvais endroit…
 */
(function () {
  'use strict';
  var BW = window.BW;

  var KNOWN = ('html head body title meta link style script noscript template base header nav main section article ' +
    'aside footer div span h1 h2 h3 h4 h5 h6 p br hr strong em b i u s mark small sub sup blockquote q cite code ' +
    'pre kbd samp var abbr time address del ins ul ol li dl dt dd a img figure figcaption picture source table ' +
    'caption thead tbody tfoot tr th td col colgroup form input button label select option optgroup textarea ' +
    'fieldset legend video audio track iframe embed object details summary dialog canvas svg data output ' +
    'progress meter wbr area map menu hgroup search').split(' ');
  var KNOWN_SET = {};
  KNOWN.forEach(function (t) { KNOWN_SET[t] = true; });

  // Éléments qui ne peuvent pas aller dans un paragraphe.
  var BLOCK = { address: 1, article: 1, aside: 1, blockquote: 1, div: 1, figure: 1, footer: 1, form: 1, h1: 1,
    h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, header: 1, hr: 1, main: 1, nav: 1, ol: 1, p: 1, pre: 1, section: 1,
    table: 1, ul: 1 };
  var RAW = { style: 1, script: 1, textarea: 1, title: 1 };

  BW.checkCode = function (code) {
    var issues = [];
    var starts = [0];
    for (var i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) starts.push(i + 1);
    function lineOf(idx) {
      var lo = 0, hi = starts.length - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
      return lo;
    }
    function add(idx, msg) { if (issues.length < 40) issues.push({ line: lineOf(idx), msg: msg }); }

    // On efface les commentaires (en gardant les retours à la ligne).
    var src = code.replace(/<!--[\s\S]*?-->/g, function (m) { return m.replace(/[^\n]/g, ' '); });
    var oc = src.indexOf('<!--');
    if (oc >= 0) {
      add(oc, 'Ce commentaire n’est jamais fermé : il manque --> à la fin.');
      src = src.slice(0, oc);
    }

    var stack = [];
    var dangling = []; // balises déjà signalées comme mal fermées
    var re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^<>]*)(>?)/g;
    var m;
    var h1 = 0;
    while ((m = re.exec(src))) {
      var closing = m[1] === '/';
      var tag = m[2].toLowerCase();
      var attrs = m[3];
      var at = m.index;
      if (!m[4]) add(at, 'Il manque le signe > à la fin de la balise <' + (closing ? '/' : '') + tag + '>.');
      if ((attrs.match(/"/g) || []).length % 2 === 1) add(at, 'Il manque un guillemet " dans la balise <' + tag + '>.');

      if (closing) {
        if (BW.VOID_TAGS[tag]) { add(at, 'La balise <' + tag + '> n’a pas de balise fermante : enlève </' + tag + '>.'); continue; }
        var idx = -1;
        for (var k = stack.length - 1; k >= 0; k--) if (stack[k].tag === tag) { idx = k; break; }
        if (idx < 0) {
          var d = dangling.indexOf(tag);
          if (d >= 0) dangling.splice(d, 1); // déjà signalée
          else add(at, 'La balise fermante </' + tag + '> ne correspond à aucune balise <' + tag + '> ouverte.');
          continue;
        }
        for (var j = stack.length - 1; j > idx; j--) {
          dangling.push(stack[j].tag);
          add(stack[j].at, 'La balise <' + stack[j].tag + '> doit être fermée (</' + stack[j].tag + '>) avant </' + tag + '> (ligne ' + (lineOf(at) + 1) + ').');
        }
        stack.length = idx;
        continue;
      }

      if (!KNOWN_SET[tag]) add(at, 'Balise inconnue : <' + tag + '>. Vérifie son orthographe.');
      var parent = stack.length ? stack[stack.length - 1].tag : null;
      if (tag === 'li' && parent !== 'ul' && parent !== 'ol' && parent !== 'menu') {
        add(at, 'Un élément <li> se range dans une liste <ul> ou <ol>.');
      }
      if ((tag === 'td' || tag === 'th') && parent !== 'tr') add(at, 'Une case <' + tag + '> se range dans une ligne <tr>.');
      if (tag === 'tr' && parent !== 'table' && parent !== 'thead' && parent !== 'tbody' && parent !== 'tfoot') {
        add(at, 'Une ligne <tr> se range dans un tableau <table>.');
      }
      if (BLOCK[tag] && parent === 'p') {
        add(at, 'Un paragraphe <p> ne peut pas contenir <' + tag + '> : ferme d’abord le paragraphe avec </p>.');
      }
      if (tag === 'img' && !/\balt\s*=/.test(attrs)) add(at, 'Ajoute une description à cette image : alt="...".');
      if (tag === 'img' && !/\bsrc\s*=/.test(attrs)) add(at, 'Indique le fichier de l’image : src="...".');
      if (tag === 'a' && !/\bhref\s*=/.test(attrs)) add(at, 'Indique l’adresse du lien : href="...".');
      if (tag === 'h1' && ++h1 === 2) add(at, 'Il y a déjà un titre <h1> : une page n’en a en général qu’un seul.');

      if (BW.VOID_TAGS[tag] || /\/\s*$/.test(attrs)) continue;
      // Le contenu de <style>, <script>… n'est pas du HTML : on saute jusqu'à la fermeture.
      if (RAW[tag]) {
        var end = src.toLowerCase().indexOf('</' + tag, re.lastIndex);
        if (end < 0) { add(at, 'La balise <' + tag + '> n’est jamais fermée (il manque </' + tag + '>).'); break; }
        re.lastIndex = end;
      }
      stack.push({ tag: tag, at: at });
    }
    for (var s = stack.length - 1; s >= 0; s--) {
      add(stack[s].at, 'La balise <' + stack[s].tag + '> n’est jamais fermée (il manque </' + stack[s].tag + '>).');
    }
    issues.sort(function (a, b) { return a.line - b.line; });
    return issues;
  };
})();
