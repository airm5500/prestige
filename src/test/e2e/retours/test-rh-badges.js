/* RH : ONGLET « BADGES » (retours du 13/10, point 3). Par l'ecran « Ressources humaines », admin.
 *  - creer un badge pour un employe (numero attribue PRE-AA-NNNNN-C si vide) ; formulaire a droite de la liste, aucune fenetre ;
 *  - le numero du badge actif est celui que la pointeuse reconnait (fiche employe) ;
 *  - modifier (numero, expiration) ; numero deja porte : refus motive, affiche sous le formulaire ;
 *  - un nouveau badge pour le meme employe remplace l'ancien (ancien desactive, motif « Remplacé par… ») ;
 *  - desactiver : confirmation dans le bouton, motif ; le badge n'est plus reconnu (fiche employe sans badge) ;
 *  - imprimer les badges coches : PDF (cartes), impressions comptees ; un badge desactive ne s'imprime pas ;
 *  - la fiche employe garde l'historique a jour quand on y change le numero.
 * Employes et badges d'essai retires.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const E1 = 'E2E-BDG-E1', E2 = 'E2E-BDG-E2';
function retirer() {
  exec(`DELETE FROM t_rh_badge WHERE employe_id IN ('${E1}', '${E2}'); DELETE FROM t_employe WHERE id IN ('${E1}', '${E2}');`);
}
const fiche = (id) => q(`SELECT IFNULL(badge, 'AUCUN') FROM t_employe WHERE id = '${id}'`);

(async () => {
  retirer();
  exec(`INSERT INTO t_employe (id, matricule, nom, prenoms, poste, statut, created_at) VALUES ('${E1}', 'E2E-BDG-1', 'ZZBADGE', 'Awa Marie', 'Caissière', 'ACTIF', NOW()),`
    + ` ('${E2}', 'E2E-BDG-2', 'ZZBADGE', 'Koffi', 'Préparateur', 'ACTIF', NOW());`);
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const err = [], dialogues = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('rhmanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; r.setActiveTab(r.down('#ongletBadges')); });
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('rhmanager #badgeEmploye')[0]; return s && s.getStore().getCount() > 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(800);

    const onglet = await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; return { titres: r.items.getRange().map((t) => t.title), fiche: r.down('#ficheBadge').isVisible(), grille: r.down('#grilleBadges').isVisible() }; });
    ok('Onglet « Badges » : liste et formulaire côte à côte (pas de fenêtre)', onglet.titres.includes('Badges') && onglet.fiche && onglet.grille, JSON.stringify(onglet));

    const message = () => p.evaluate(() => Ext.ComponentQuery.query('rhmanager #badgeMessage')[0].getEl().dom.innerText.trim());
    const cliquer = (sel) => p.evaluate((s) => Ext.ComponentQuery.query('rhmanager ' + s)[0].btnEl.dom.click(), sel);
    const attendreMessage = async (motif) => { await p.waitForFunction((m) => new RegExp(m).test(Ext.ComponentQuery.query('rhmanager #badgeMessage')[0].getEl().dom.innerText), motif, { timeout: 15000 }).catch(() => {}); return message(); };
    const remplir = (v) => p.evaluate((v) => { const f = Ext.ComponentQuery.query('rhmanager #ficheBadge')[0];
      if (v.employe !== undefined) { f.down('#badgeEmploye').setValue(v.employe); }
      if (v.numero !== undefined) { f.down('#badgeNumero').setValue(v.numero); }
      if (v.expiration !== undefined) { f.down('#badgeExpiration').setValue(v.expiration ? Ext.Date.parse(v.expiration, 'Y-m-d') : null); } }, v);
    const choisir = (id) => p.evaluate((id) => { const g = Ext.ComponentQuery.query('rhmanager #grilleBadges')[0]; const r = g.getStore().findRecord('id', id, 0, false, false, true); g.getSelectionModel().select(r); }, id);
    const recharger = async () => { await p.evaluate(() => new Promise((ok) => Ext.ComponentQuery.query('rhmanager #grilleBadges')[0].getStore().load({ callback: () => ok(true) }))); };

    /* 1. creation, numero attribue */
    await cliquer('#btnNouveauBadge');
    await remplir({ employe: E1, numero: '' });
    await cliquer('#btnEnregistrerBadge');
    let m = await attendreMessage('créé|Refus|déjà');
    const b1 = q(`SELECT CONCAT_WS('|', id, numero, statut) FROM t_rh_badge WHERE employe_id = '${E1}' AND statut = 'ACTIF'`).split('|');
    ok('Création : numéro attribué (PRE-AA-NNNNN-C, demande du 16/10), badge actif, message sous le formulaire', /^[A-Z]{3}-\d{2}-\d{5}-[A-Z]$/.test(b1[1]) && b1[2] === 'ACTIF' && /créé/.test(m), b1.join('|') + ' / ' + m);
    ok('Le numéro est celui que la pointeuse reconnaît (fiche employé)', fiche(E1) === b1[1], fiche(E1));

    /* 2. modification : numero et expiration ; numero deja porte refuse */
    await recharger(); await choisir(b1[0]); await p.waitForTimeout(400);
    await remplir({ numero: 'E2E-BDG-A1', expiration: '2030-12-31' });
    await cliquer('#btnEnregistrerBadge');
    m = await attendreMessage('enregistré|Refus|déjà');
    ok('Modification : numéro et expiration enregistrés, fiche employé suivie', q(`SELECT CONCAT_WS('|', numero, dt_expiration) FROM t_rh_badge WHERE id = '${b1[0]}'`) === 'E2E-BDG-A1|2030-12-31' && fiche(E1) === 'E2E-BDG-A1', m);
    await cliquer('#btnNouveauBadge');
    await remplir({ employe: E2, numero: 'E2E-BDG-A1' });
    await cliquer('#btnEnregistrerBadge');
    m = await attendreMessage('déjà porté');
    ok('Numéro déjà porté : refus motivé sous le formulaire, rien n\'est créé', /déjà porté par ZZBADGE Awa Marie/.test(m) && q(`SELECT COUNT(*) FROM t_rh_badge WHERE employe_id = '${E2}'`) === '0', m);
    await remplir({ numero: 'E2E-BDG-B1' });
    await cliquer('#btnEnregistrerBadge');
    await attendreMessage('créé');
    const b2 = q(`SELECT id FROM t_rh_badge WHERE employe_id = '${E2}' AND statut = 'ACTIF'`);

    /* 3. nouveau badge pour E1 : remplace l'ancien */
    await cliquer('#btnNouveauBadge');
    await remplir({ employe: E1, numero: 'E2E-BDG-A2' });
    await cliquer('#btnEnregistrerBadge');
    m = await attendreMessage('remplace|Refus');
    const histo = q(`SELECT GROUP_CONCAT(CONCAT(numero, ':', statut, ':', IFNULL(motif, '')) ORDER BY created_at, numero SEPARATOR ' / ') FROM t_rh_badge WHERE employe_id = '${E1}'`);
    ok('Nouveau badge pour le même employé : il remplace l\'ancien (désactivé, motif)', /E2E-BDG-A1:DESACTIVE:Remplacé par le badge E2E-BDG-A2/.test(histo) && /E2E-BDG-A2:ACTIF/.test(histo) && fiche(E1) === 'E2E-BDG-A2' && /remplace/.test(m), histo);

    /* 4. desactivation : confirmation dans le bouton, motif */
    await recharger();
    const b3 = q(`SELECT id FROM t_rh_badge WHERE employe_id = '${E1}' AND statut = 'ACTIF'`);
    await choisir(b3); await p.waitForTimeout(400);
    await cliquer('#btnDesactiverBadge');
    const arme = await p.evaluate(() => { const r = Ext.ComponentQuery.query('rhmanager')[0]; return { texte: r.down('#btnDesactiverBadge').getText(), motif: r.down('#badgeMotif').isVisible(), boite: Ext.ComponentQuery.query('messagebox').some((x) => x.isVisible()) }; });
    ok('Désactiver : confirmation dans le bouton, motif proposé, aucune fenêtre', /Confirmer/.test(arme.texte) && arme.motif && !arme.boite, JSON.stringify(arme));
    ok('Rien n\'est désactivé au premier clic', q(`SELECT statut FROM t_rh_badge WHERE id = '${b3}'`) === 'ACTIF');
    await p.evaluate(() => { Ext.ComponentQuery.query('rhmanager #badgeMotif')[0].setValue('Badge perdu'); });
    await cliquer('#btnDesactiverBadge');
    m = await attendreMessage('désactivé|Refus');
    ok('Badge désactivé (motif), plus reconnu au pointage (fiche employé sans badge)', q(`SELECT CONCAT_WS('|', statut, motif) FROM t_rh_badge WHERE id = '${b3}'`) === 'DESACTIVE|Badge perdu' && fiche(E1) === 'AUCUN' && /n'est plus reconnu/.test(m), m);

    /* 5. impression des badges coches */
    await p.evaluate(() => { Ext.ComponentQuery.query('rhmanager #badgesInactifs')[0].setValue(true); });
    await p.waitForTimeout(1500);
    await recharger();
    await p.evaluate(([a, d]) => { const g = Ext.ComponentQuery.query('rhmanager #grilleBadges')[0], s = g.getStore();
      g.getSelectionModel().select([s.findRecord('id', a, 0, false, false, true), s.findRecord('id', d, 0, false, false, true)]); }, [b2, b3]);
    const pageCartes = ctx.waitForEvent('page', { timeout: 15000 });
    await cliquer('#btnImprimerBadges');
    const pdf = await pageCartes;
    const url = pdf.url();
    const reponse = await p.evaluate(async (u) => { const r = await fetch(u.replace(/^.*\/api\//, '../api/').replace(/ids=[^&]*/, (x) => x)); const b = await r.arrayBuffer(); return { type: r.headers.get('content-type'), debut: String.fromCharCode(...new Uint8Array(b).slice(0, 5)), taille: b.byteLength }; }, url);
    ok('Imprimer : PDF des cartes ouvert dans un onglet', /application\/pdf/.test(reponse.type) && reponse.debut === '%PDF-' && reponse.taille > 1000 && /ids=/.test(url), JSON.stringify(reponse) + ' ' + url.slice(-80));
    ok('Seuls les badges actifs s\'impriment ; impressions comptées', !url.includes(b3) && Number(q(`SELECT nb_impressions FROM t_rh_badge WHERE id = '${b2}'`)) >= 1
      && q(`SELECT nb_impressions FROM t_rh_badge WHERE id = '${b3}'`) === '0', url.slice(-90));
    await pdf.close();

    /* 6. fiche employe : changer le numero garde l'historique */
    const sauve = await p.evaluate(async (e) => JSON.parse(await (await fetch('../api/v1/rh/employes', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e, matricule: 'E2E-BDG-2', nom: 'ZZBADGE', prenoms: 'Koffi', poste: 'Préparateur', badge: 'E2E-BDG-B2', statut: 'ACTIF' }) })).text()), E2);
    const h2 = q(`SELECT GROUP_CONCAT(CONCAT(numero, ':', statut) ORDER BY created_at, numero SEPARATOR ' / ') FROM t_rh_badge WHERE employe_id = '${E2}'`);
    ok('Fiche employé : nouveau numéro -> l\'ancien badge est désactivé, le nouveau actif', sauve.success && /E2E-BDG-B1:DESACTIVE/.test(h2) && /E2E-BDG-B2:ACTIF/.test(h2) && fiche(E2) === 'E2E-BDG-B2', h2);
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    retirer();
    ok('Employés et badges d\'essai retirés', q(`SELECT COUNT(*) FROM t_rh_badge WHERE employe_id IN ('${E1}', '${E2}')`) === '0' && q(`SELECT COUNT(*) FROM t_employe WHERE id IN ('${E1}', '${E2}')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
