/* ECRAN DE VENTE : ligne type / nature / vendeur en boutons segmentes (maquette validee le 30/09).
 *
 * Les combos d'origine restent la reference (memes itemId, meme evenement 'select') : le test verifie que les boutons
 * les pilotent, que le controleur de la caisse reagit comme a un choix dans la liste, et qu'un setValue venu du code
 * est repris a l'ecran. Aucune ecriture en base.
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
    await p.waitForFunction(() => document.querySelectorAll('.seg-groupe .seg-actif').length === 2, null, { timeout: 30000 });
    const etat = () => p.evaluate(() => { const v = Ext.ComponentQuery.query('doventemanager')[0];
      const t = v.down('#typeVente'), n = v.down('#nature');
      return { type: t.getValue(), nature: n.getValue(), titre: v.title, assure: v.down('#assureContainer').isVisible(),
        segType: (t.bodyEl.dom.querySelector('.seg-actif') || {}).textContent, segNature: (n.bodyEl.dom.querySelector('.seg-actif') || {}).textContent,
        boutonsType: [...t.bodyEl.dom.querySelectorAll('.seg-bouton')].map((x) => x.textContent), boutonsNature: [...n.bodyEl.dom.querySelectorAll('.seg-bouton')].map((x) => x.textContent),
        listeCachee: !t.triggerWrap.isVisible(), vendeur: v.down('#user').isVisible() && v.down('#user').triggerWrap.isVisible(), point: !!t.bodyEl.dom.querySelector('.seg-actif .seg-point') }; });
    const e0 = await etat();
    ok('Type et nature en boutons segmentés, la liste déroulante n\'est plus affichée ; vendeur en combo', e0.boutonsType.join('|') === 'Au comptant|Assurance|Carnet'
      && e0.boutonsNature.indexOf('Prescription') >= 0 && e0.listeCachee && e0.vendeur, JSON.stringify(e0));
    ok('Au départ : Au comptant et Prescription actifs, comme les valeurs des combos', e0.type === '1' && e0.segType === 'Au comptant' && e0.nature === '1' && e0.segNature === 'Prescription', JSON.stringify(e0));
    const dessin = await p.evaluate(() => { const v = Ext.ComponentQuery.query('doventemanager')[0]; const ligne = v.down('#ligneTypeVente');
      const centre = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      const libs = [...ligne.getEl().dom.querySelectorAll('.seg-lib')];
      const ctrl = [v.down('#typeVente').bodyEl.dom.querySelector('.seg-groupe'), v.down('#nature').bodyEl.dom.querySelector('.seg-groupe'), v.down('#user').inputEl.dom];
      const actif = v.down('#typeVente').bodyEl.dom.querySelector('.seg-actif');
      return { libs: libs.map((l) => l.textContent), ecarts: libs.map((l, i) => Math.round(Math.abs(centre(l) - centre(ctrl[i])))),
        pastilleType: !!actif.querySelector('.seg-point'), pastilleAilleurs: document.querySelectorAll('.seg-point').length, fondActif: getComputedStyle(actif).backgroundColor,
        vendeur: v.down('#user').getWidth(), espace: Math.round(libs[1].getBoundingClientRect().left - ctrl[0].getBoundingClientRect().right) }; });
    ok('Libellés Type / Nature / Vendeur centrés sur leurs choix, espacés ; vendeur à largeur fixe', dessin.libs.join('|') === 'Type|Nature|Vendeur' && dessin.ecarts.every((x) => x <= 2)
      && dessin.espace >= 24 && dessin.vendeur === 300, JSON.stringify(dessin));
    ok('Type actif : pastille clignotante (seulement sur le type), fond foncé', dessin.pastilleType && dessin.pastilleAilleurs === 1 && dessin.fondActif === 'rgb(30, 58, 95)', JSON.stringify(dessin));
    /* Survol : le libelle reste lisible, sur le choix actif comme sur les autres. */
    const survol = async (sel) => { await p.hover(sel); await p.waitForTimeout(250); return p.evaluate((s) => { const b = document.querySelector(s); const c = getComputedStyle(b); return c.color + ' / ' + c.backgroundColor; }, sel); };
    const sActif = await survol('.seg-bouton.seg-actif[data-valeur="1"]'), sAutre = await survol('.seg-bouton[data-valeur="2"]');
    ok('Survol : texte blanc sur le choix actif, bleu sur fond clair pour les autres (toujours lisible)', sActif.startsWith('rgb(255, 255, 255)') && sAutre.startsWith('rgb(30, 58, 95)') && !/rgb\(30, 58, 95\)$/.test(sAutre), sActif + ' | ' + sAutre);
    await p.mouse.move(5, 5);
    await p.click('.seg-bouton[data-valeur="2"]'); await p.waitForTimeout(1200);
    const e1 = await etat();
    const actif = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #clientSearchTextField')[0]; return c && document.activeElement === c.inputEl.dom; });
    ok('« Assurance » : le combo passe à 2 et la caisse réagit (titre, zone assuré, curseur dans la recherche client)', e1.type === '2' && e1.segType === 'Assurance'
      && e1.titre === 'VENTE ASSURANCE' && e1.assure && actif, JSON.stringify(e1));
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #typeVente')[0].bodyEl.dom.querySelector('.seg-bouton[data-valeur="1"]').id = 'seg-comptant'));
    await p.waitForTimeout(1200);
    const e2 = await etat();
    ok('Retour « Au comptant » : zone assuré masquée, titre vente au comptant', e2.type === '1' && !e2.assure && /COMPTANT/.test(e2.titre), JSON.stringify(e2));
    await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #nature')[0].bodyEl.dom.querySelector('.seg-bouton[data-valeur="2"]').id = 'seg-conseil');
    await p.click('#seg-conseil'); await p.waitForTimeout(400);
    const e3 = await etat();
    ok('« Conseil » : la nature du combo suit', e3.nature === '2' && e3.segNature === 'Conseil', JSON.stringify(e3));
    await p.evaluate(() => { Ext.ComponentQuery.query('doventemanager #typeVente')[0].setValue('3'); Ext.ComponentQuery.query('doventemanager #nature')[0].setValue('1'); });
    await p.waitForTimeout(300);
    const e4 = await etat();
    ok('Une valeur posée par le code (reprise d\'une vente) est reprise par les boutons, pastille comprise', e4.point && e4.segType === 'Carnet' && e4.segNature === 'Prescription', JSON.stringify(e4));
    await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #typeVente')[0].setReadOnly(true));
    await p.waitForTimeout(200);
    const lecture = await p.evaluate(() => { return [...Ext.ComponentQuery.query('doventemanager #typeVente')[0].bodyEl.dom.querySelectorAll('.seg-bouton')].every((x) => x.disabled); });
    ok('Combo en lecture seule : boutons inactifs', lecture);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
