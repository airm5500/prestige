/* DEUX CAISSES VENDENT LES MEMES ARTICLES AU MEME INSTANT (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, § 4.3).
 *
 * Pendant l'essai de charge, une vente sur 150 a 300 etait refusee (« Erreur du serveur 500 » ou « Echec de validation
 * de la vente ») quand une autre caisse venait de vendre le meme article : conflit de version (@Version) sur le produit
 * et son stock. Ce test le rejoue par le vrai chemin de l'ecran : deux postes (comptes e2e-c01 et e2e-c02) ouvrent
 * chacun une vente, tapent les memes articles (dans l'ordre inverse l'un de l'autre), le montant recu, puis cliquent
 * « Terminer la vente » au meme instant. A chaque tour : les deux ventes doivent passer et le stock de chaque article
 * doit baisser de la somme des deux ventes.
 *
 * ECRIT DANS LA BASE (ventes, caisses) : uniquement sur une copie de mesure (nom en _perf), rechargee depuis l'original
 * apres l'essai. Comptes : ceux de charge-officine.js (le lancer une fois avant, ou PREPARER=1 ici).
 * L'impression du ticket est bloquee (appels vente/ticket/* annules).
 *
 * Variables : BASE, DB_TEST + E2E_BASE_LIBRE=1, MARIADB_OPTIONS, TOURS (5), ARTICLES_PAR_VENTE (3).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const DB = ENV_E2E.BASE;
if (!/_perf$/.test(DB)) { throw new Error('Concurrence de stock : copie de mesure (nom en _perf) obligatoire, pas ' + DB); }
const TOURS = Number(process.env.TOURS || 5);
const NB_ARTICLES = Number(process.env.ARTICLES_PAR_VENTE || 3);
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN'], { input: s, encoding: 'utf8' })
  .replace(/\r/g, '').trim();
const login = (i) => 'e2e-c' + String(i + 1).padStart(2, '0');
if (q(`SELECT COUNT(*) FROM t_user WHERE str_LOGIN IN ('${login(0)}', '${login(1)}')`) !== '2') {
  throw new Error('comptes e2e-c01 et e2e-c02 absents : lancer d\'abord charge-officine.js (preparation des comptes)');
}
/* articles simples (ni detail ni boite deconditionnable), CIP unique, stock large */
const ARTICLES = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 100"
  + " AND f.bool_DECONDITIONNE = 0 AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID) ORDER BY RAND(11) LIMIT " + (NB_ARTICLES * TOURS))
  .split('\n').filter(Boolean).map((l) => l.split('|'));
const stock = (ids) => q(`SELECT CONCAT_WS('|', lg_FAMILLE_ID, int_NUMBER_AVAILABLE) FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND str_STATUT = 'enable'`
  + ` AND lg_FAMILLE_ID IN (${ids.map((x) => `'${x}'`).join(',')})`).split('\n').filter(Boolean)
  .reduce((m, l) => { const [id, n] = l.split('|'); m[id] = Number(n); return m; }, {});
const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';

async function ouvrirPoste(b, i) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  await vues.connexion(p, login(i), 'e2etest');
  await p.evaluate(() => { try { prestigeShowMetro(); } catch (e) { /* ancien en-tete */ } }).catch(() => {});
  const lib = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
    .cascadeBy((n) => { if (!r && n.get('id') === 'cloturerventemanager' && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; });
  await vues.ouvrirMenu(p, lib[0], lib[1]);
  await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
  await vues.cliquer(p, 'cloturerventemanager #addBtn');
  await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
  await p.waitForTimeout(1500);
  return p;
}

/* « Votre caisse est fermée, voulez-vous l'ouvrir ? » : Oui, fond saisi, « Ouvrir caisse », pas de ticket */
async function ouvrirCaisseSiProposee(p) {
  const fin = Date.now() + 3000;
  while (Date.now() < fin) {
    if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /caisse est ferm/i.test(m.el.dom.textContent)))) {
      await vues.repondre(p, 'yes');
      await p.waitForFunction(() => { const x = Ext.getCmp('btnValidate'); return x && x.isVisible(true) && !x.isDisabled(); }, null, { timeout: 60000 });
      await vues.saisir(p, '#coffreCaisseAmount', '20000');
      const ouverture = p.waitForResponse((r) => /\/caisse\/ouvrir-caisse/.test(r.url()), { timeout: 60000 });
      await vues.cliquer(p, '#btnValidate');
      await ouverture;
      const finTicket = Date.now() + 5000;
      while (Date.now() < finTicket) {
        if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /impression du ticket/i.test(m.el.dom.textContent)))) {
          await vues.repondre(p, 'no');
          break;
        }
        await p.waitForTimeout(200);
      }
      return;
    }
    await p.waitForTimeout(200);
  }
}

/* articles tapes par leur CIP ; on attend la reponse de l'ajout avant le suivant */
async function taper(p, cips) {
  for (const cip of cips) {
    await vues.cliquer(p, CHAMP);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(cip, { delay: 15 });
    const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 60000 });
    await p.keyboard.press('Enter');
    if ((await rep).status() >= 400) { throw new Error('ajout refusé'); }
    await p.waitForTimeout(800);
  }
  const net = await p.evaluate(() => { const d = testextjs.app.getController('VenteCtr').getNetAmountToPay(); return d ? d.montantNet : 0; });
  await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
  await p.waitForFunction(() => document.activeElement === Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].inputEl.dom, null, { timeout: 10000 });
  await p.waitForTimeout(300);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(net), { delay: 15 });
  await p.waitForTimeout(300);
}

/* clic sur « Terminer la vente » ; renvoie le texte du refus, ou null si la vente est passee */
async function terminer(p) {
  const rep = p.waitForResponse((r) => /\/vente\/cloturer\/vno/.test(r.url()), { timeout: 120000 });
  await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
  await ouvrirCaisseSiProposee(p);
  const r = await rep;
  const corps = await r.json().catch(() => ({}));
  await p.waitForTimeout(600);
  const ecran = await vues.texteMessage(p).catch(() => '');
  if (/imprimer le ticket/i.test(ecran)) { await vues.repondre(p, 'no'); }
  else if (ecran) { await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {}); }
  if (r.status() >= 400 || corps.success === false) { return 'HTTP ' + r.status() + ' ' + (corps.msg || '') + (ecran ? ' ; écran : ' + ecran.slice(0, 150) : ''); }
  return null;
}

(async () => {
  if (ARTICLES.length < NB_ARTICLES * TOURS) { throw new Error('pas assez d\'articles simples a stock large : ' + ARTICLES.length); }
  const b = await ENV_E2E.lancer(chromium);
  const postes = [await ouvrirPoste(b, 0), await ouvrirPoste(b, 1)];
  let echecs = 0;
  for (let t = 0; t < TOURS; t++) {
    const lot = ARTICLES.slice(t * NB_ARTICLES, (t + 1) * NB_ARTICLES);
    const ids = lot.map((a) => a[0]);
    const avant = stock(ids);
    await taper(postes[0], lot.map((a) => a[1]));
    await taper(postes[1], lot.map((a) => a[1]).reverse());
    const refus = await Promise.all(postes.map((p) => terminer(p)));
    const apres = stock(ids);
    const ecarts = ids.filter((id) => avant[id] - apres[id] !== 2).map((id) => id + ' : ' + avant[id] + ' -> ' + apres[id]);
    const ok = !refus[0] && !refus[1] && !ecarts.length;
    if (!ok) { echecs++; }
    console.log(`tour ${t + 1} : caisse 1 ${refus[0] ? 'REFUSEE (' + refus[0] + ')' : 'passee'}, caisse 2 ${refus[1] ? 'REFUSEE (' + refus[1] + ')' : 'passee'}`
      + (ecarts.length ? ', stock faux : ' + ecarts.join(' ; ') : ', stock baisse de 2 par article') + (ok ? '' : '  -> ECHEC'));
    /* vente suivante sur chaque poste : l'ecran rouvre une vente vide apres la cloture */
    for (const p of postes) { await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 }); }
    await postes[0].waitForTimeout(1500);
  }
  await b.close();
  console.log(echecs ? `\nECHEC : ${echecs} tour(s) sur ${TOURS} avec une vente refusee ou un stock faux` : `\nOK : ${TOURS} tours, les deux ventes passent a chaque fois`);
  process.exitCode = echecs ? 1 : 0;
})();
