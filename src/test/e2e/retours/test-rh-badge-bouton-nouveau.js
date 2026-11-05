/* RETOUR DU 05/11 : ONGLET « BADGES » (RESSOURCES HUMAINES), BOUTON « NOUVEAU » ENTIEREMENT VISIBLE.
 *
 * Par l'ecran, avec de vrais clics, en 1366 × 768 et en 1600 × 950 :
 *  - chaque bouton de la fiche du badge (Nouveau, Désactiver, Régénérer le QR, Enregistrer) est entierement dans la
 *    fiche et dans l'ecran, son libelle n'est pas coupe ;
 *  - un clic souris sur « Nouveau » vide la fiche (titre « Nouveau badge ») ;
 *  - aucune erreur JavaScript.
 * Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BOUTONS = ['btnNouveauBadge', 'btnDesactiverBadge', 'btnRegenererBadge', 'btnEnregistrerBadge'];

async function verifier(b, largeur, hauteur) {
  const p = await (await b.newContext({ viewport: { width: largeur, height: hauteur } })).newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(e.message));
  await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 60000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rhmanager', {}));
  await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').length > 0, null, { timeout: 30000 });
  await p.waitForTimeout(2000);
  /* l'onglet s'ouvre par un clic sur son titre */
  const titre = await p.evaluate(() => { const t = Ext.ComponentQuery.query('rhmanager #ongletBadges')[0].tab.getEl().dom.getBoundingClientRect(); return { x: t.x + t.width / 2, y: t.y + t.height / 2 }; });
  await p.mouse.click(titre.x, titre.y);
  await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('rhmanager #ficheBadge')[0]; return f && f.isVisible(); }, null, { timeout: 20000 });
  await p.waitForTimeout(800);

  const mesures = await p.evaluate((ids) => {
    const fiche = Ext.ComponentQuery.query('rhmanager #ficheBadge')[0].getEl().dom.getBoundingClientRect();
    return ids.map((id) => {
      const btn = Ext.ComponentQuery.query('rhmanager #' + id)[0];
      const r = btn.getEl().dom.getBoundingClientRect();
      const t = btn.btnInnerEl ? btn.btnInnerEl.dom : btn.getEl().dom;
      return { id, g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.top), b: Math.round(r.bottom),
        ficheG: Math.round(fiche.left), ficheD: Math.round(fiche.right), ficheB: Math.round(fiche.bottom),
        coupe: t.scrollWidth > t.clientWidth + 1, texte: t.innerText.trim(), visible: btn.isVisible() };
    });
  }, BOUTONS);
  for (const m of mesures) {
    const dedans = m.visible && m.g >= m.ficheG && m.d <= m.ficheD && m.b <= m.ficheB && m.d <= largeur && m.b <= hauteur && m.g >= 0;
    ok(`${largeur} × ${hauteur} : « ${m.texte} » entièrement visible dans la fiche`, dedans && !m.coupe, JSON.stringify(m));
  }

  /* un vrai clic sur « Nouveau » */
  await p.evaluate(() => { const f = Ext.ComponentQuery.query('rhmanager #ficheBadge')[0]; f.down('#badgeNumero').setValue('ZZ-TEMP'); });
  const nb = await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager #btnNouveauBadge')[0].getEl().dom.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(nb.x, nb.y);
  await p.waitForTimeout(500);
  const apres = await p.evaluate(() => { const f = Ext.ComponentQuery.query('rhmanager #ficheBadge')[0]; return { titre: f.title, numero: f.down('#badgeNumero').getValue() }; });
  ok(`${largeur} × ${hauteur} : un clic sur « Nouveau » vide la fiche`, /Nouveau badge/.test(apres.titre) && !apres.numero, JSON.stringify(apres));
  ok(`${largeur} × ${hauteur} : aucune erreur JavaScript`, err.length === 0, err.join(' | '));
  await p.context().close();
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  try {
    await verifier(b, 1366, 768);
    await verifier(b, 1600, 950);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
