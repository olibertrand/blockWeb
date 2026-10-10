/*
 * Test de fumée de BlocWeb : ouvre l'application dans Chromium et vérifie
 * les fonctions principales.
 *
 *   npm install        (installe Playwright, une seule fois)
 *   npm test
 *
 * Variable facultative : CHROMIUM_PATH=/chemin/vers/chrome
 */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

async function run() {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.BW && BW.state && BW.state.lastGen);
  await page.keyboard.press('Escape'); // ferme l'aide affichée au premier lancement

  const step = async (name, fn) => {
    await fn();
    console.log('✔ ' + name);
  };

  await step('la page de départ produit du HTML', async () => {
    const code = await page.evaluate(() => BW.state.lastGen.code);
    assert.match(code, /<!DOCTYPE html>/);
    assert.match(code, /<h1>Mon titre<\/h1>/);
  });

  await step('les modèles se chargent sans conseil', async () => {
    for (const id of ['presentation', 'expose', 'recette']) {
      const res = await page.evaluate(async (tid) => {
        const t = BW.TEMPLATES.find((x) => x.id === tid);
        const warnings = BW.importHTML(t.html).warnings;
        await BW.app.loadTemplate(t);
        BW.app.update();
        return { warnings, advice: BW.advise(BW.ws).order.length };
      }, id);
      assert.deepEqual(res.warnings, [], id);
      assert.equal(res.advice, 0, id);
    }
  });

  await step('les blocs ne s’emboîtent qu’aux bons endroits', async () => {
    const r = await page.evaluate(() => {
      const ws = BW.ws;
      const mk = (t) => { const b = ws.newBlock(t); b.initSvg(); b.render(); return b; };
      const sec = mk('bw_section'), ul = mk('bw_ul'), li = mk('bw_li'), p = mk('bw_p'), box = mk('bw_p_box'), t = mk('bw_text');
      const can = (a, b) => ws.connectionChecker.canConnect(a, b, false);
      const out = {
        liInSection: can(sec.getInput('CONTENT').connection, li.previousConnection),
        pInSection: can(sec.getInput('CONTENT').connection, p.previousConnection),
        liInUl: can(ul.getInput('CONTENT').connection, li.previousConnection),
        textInParagraph: can(box.getInput('CONTENT').connection, t.previousConnection)
      };
      box.getInput('CONTENT').connection.connect(t.previousConnection);
      out.paragraphAfterTextInParagraph = can(t.nextConnection, p.previousConnection);
      [sec, ul, li, p, box].forEach((b) => b.dispose());
      return out;
    });
    assert.deepEqual(r, { liInSection: false, pInSection: true, liInUl: true, textInParagraph: true, paragraphAfterTextInParagraph: false });
  });

  await step('titre et style sont des blocs de la partie invisible', async () => {
    const r = await page.evaluate(() => {
      const ws = BW.ws;
      const mk = (t) => { const b = ws.newBlock(t); b.initSvg(); b.render(); return b; };
      const pg = BW.findPage(ws), title = mk('bw_title'), style = mk('bw_style'), rule = mk('bw_css_rule'), p = mk('bw_p');
      const can = (a, b) => ws.connectionChecker.canConnect(a, b, false);
      const out = {
        titleInHead: can(pg.getInput('HEAD').connection, title.previousConnection),
        styleInHead: can(pg.getInput('HEAD').connection, style.previousConnection),
        titleInBody: can(pg.getInput('BODY').connection, title.previousConnection),
        paragraphInHead: can(pg.getInput('HEAD').connection, p.previousConnection),
        ruleInStyle: can(style.getInput('CONTENT').connection, rule.previousConnection),
        ruleInHead: can(pg.getInput('HEAD').connection, rule.previousConnection)
      };
      [title, style, rule, p].forEach((b) => b.dispose());
      const head = BW.headBlocks(pg).map((b) => b.type);
      return { out, head, code: BW.generate(ws).code };
    });
    assert.deepEqual(r.out, { titleInHead: true, styleInHead: true, titleInBody: false, paragraphInHead: false, ruleInStyle: true, ruleInHead: false });
    assert.deepEqual(r.head, ['bw_title', 'bw_style']);
    assert.match(r.code, /<head>\n\s+<meta charset="utf-8">\n\s+<title>Recette des crêpes<\/title>\n\s+<style>\n/);
  });

  await step('le bloc page de la boîte à outils contient un titre et un style', async () => {
    const r = await page.evaluate(() => {
      const page = BW.buildToolbox().contents[0].contents.find((c) => c.type === 'bw_page');
      const first = page.inputs.HEAD.block;
      return [first.type, first.next.block.type];
    });
    assert.deepEqual(r, ['bw_title', 'bw_style']);
  });

  await step('un projet de l’ancienne version est mis à jour', async () => {
    const code = await page.evaluate(async () => {
      const old = { blocks: { languageVersion: 0, blocks: [{ type: 'bw_page', x: 0, y: 0, fields: { TITLE: 'Ancien' }, inputs: {
        STYLE: { block: { type: 'bw_css_rule', fields: { SEL: 'h1' }, inputs: { CONTENT: { block: { type: 'bw_css_color', fields: { V: 'red' } } } } } },
        BODY: { block: { type: 'bw_p', fields: { TEXT: 'Salut' } } } } }] } };
      await BW.app.loadProject({ workspace: old, images: {} });
      return BW.state.lastGen.code;
    });
    assert.match(code, /<title>Ancien<\/title>\n\s+<style>\n\s+h1 \{\n\s+color: red;/);
    assert.match(code, /<p>Salut<\/p>/);
    await page.evaluate(async () => { await BW.app.loadTemplate(BW.TEMPLATES.find((t) => t.id === 'recette')); });
    await page.waitForTimeout(600); // le temps de recharger l'aperçu
  });

  await step('un bloc choisi est surligné dans le code et l’aperçu', async () => {
    const r = await page.evaluate(() => {
      const b = BW.ws.getAllBlocks().find((x) => x.type === 'bw_strong');
      BW.selectBlock(b.id);
      const cv = BW.app.codeView();
      const marks = cv.getAllMarks().map((m) => { const f = m.find(); return cv.getRange(f.from, f.to); });
      const doc = document.querySelector('#preview').contentDocument;
      return { marks, outlined: [...doc.querySelectorAll('[data-bw-sel]')].map((e) => e.tagName) };
    });
    assert.deepEqual(r.marks, ['<strong>4 personnes</strong>']);
    assert.deepEqual(r.outlined, ['STRONG']);
  });

  await step('un clic dans l’aperçu choisit le bloc', async () => {
    await page.frameLocator('#preview').locator('figcaption').click();
    const type = await page.evaluate(() => Blockly.common.getSelected().type);
    assert.equal(type, 'bw_figcaption');
  });

  await step('aller-retour blocs → code → blocs', async () => {
    await page.evaluate(async () => {
      await BW.app.enterCodeMode(null, true);
      const ed = BW.app.editor();
      ed.setValue(ed.getValue().replace('<p>Bon appétit !</p>', '<p>Bon <em>appétit</em> !</p><aside><p>Astuce</p></aside>'));
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => BW.app.exitCodeMode());
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ mode: BW.state.mode, code: BW.state.lastGen.code }));
    assert.equal(r.mode, 'blocks');
    assert.match(r.code, /<p>Bon <em>appétit<\/em> !<\/p>/);
    assert.match(r.code, /<aside>\n\s+<p>Astuce<\/p>\n\s+<\/aside>/);
  });

  await step('le code écrit à la main est vérifié', async () => {
    const issues = await page.evaluate(() => BW.checkCode('<ul>\n<li>un\n</ul>\n<p><strong>x</p>\n<img src="a.png">').map((i) => i.line));
    assert.deepEqual(issues, [1, 3, 4]);
  });

  await step('les conseils repèrent les erreurs de structure', async () => {
    const msgs = await page.evaluate(async () => {
      const r = BW.importHTML('<h1>a</h1><h3>b</h3><img src=""><li>x</li>');
      await BW.app.loadProject({ workspace: r.state, images: {} });
      const res = BW.advise(BW.ws);
      return Object.values(res.byBlock).flat();
    });
    assert.ok(msgs.some((m) => /saute un niveau/.test(m)));
    assert.ok(msgs.some((m) => /description \(alt\)/.test(m)));
    assert.ok(msgs.some((m) => /liste à puces/.test(m)));
  });

  await step('les étiquettes changent sans perdre les blocs', async () => {
    const counts = [];
    for (const m of ['fr', 'tags', 'both']) {
      await page.click(`#labels-seg button[data-mode="${m}"]`);
      counts.push(await page.evaluate(() => BW.ws.getAllBlocks().length));
    }
    assert.equal(new Set(counts).size, 1);
  });

  await step('le zip contient la page et ses images', async () => {
    const size = await page.evaluate(() => BW.makeZip([
      { name: 'index.html', data: new TextEncoder().encode('<p>x</p>') },
      { name: 'a.svg', data: BW.dataUrlToBytes('data:image/svg+xml,%3Csvg%2F%3E') }
    ]).size);
    assert.ok(size > 100);
  });

  assert.deepEqual(errors, [], 'erreurs JavaScript');
  await browser.close();
  console.log('\nTous les tests sont passés.');
}

run().catch((e) => { console.error(e); process.exit(1); });
