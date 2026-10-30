/* CONNEXIONS SIMULTANEES (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, § 4.6).
 *
 * Pendant l'essai de charge, 17 postes sur 20 sont restes sur une page blanche plus de 60 s en se connectant
 * ensemble : chaque connexion chargeait pres de 1 000 fichiers de general/app, un par un. Correction : index.jsp
 * recoit tous ces fichiers en un appel (api/v1/ecrans/scripts.js) et Ext.Loader les prend dans cette table.
 *
 * Le test passe par le vrai chemin de l'ecran : POSTES navigateurs separes (contextes sans cache commun) saisissent
 * identifiant et mot de passe, cliquent « Connexion » au meme instant, puis attendent le menu. Il mesure, par poste :
 * duree jusqu'au menu, requetes vers general/app, erreurs JavaScript. Puis le premier poste ouvre l'ecran de vente
 * (une vente vide, rien d'enregistre) pour verifier qu'un ecran s'ouvre normalement depuis la table.
 *
 * Attendu : tous les postes connectes, aucune erreur JavaScript, au plus MAX_FICHIERS requetes vers general/app par
 * poste. SANS_TABLE=1 bloque l'appel de la table : on mesure l'ancien chargement (le test doit alors echouer sur le
 * nombre de requetes, et l'application doit quand meme fonctionner).
 *
 * N'ecrit rien d'autre que les traces de connexion habituelles.
 * Controle du journal des connexions RH (api/v1/rh/sessions, lu par un compte observateur, celui des tests) : chaque
 * poste connecte doit y avoir sa ligne. Lancer seul (pas d'autre test d'ecran en meme temps).
 * Variables : BASE, POSTES (6), LOGINS (liste separee par des virgules ; defaut : le compte des tests pour tous les
 * postes), SANS_TABLE, MAX_FICHIERS (20), DELAI_MS (120000).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');

const POSTES = Number(process.env.POSTES || 6);
const SANS_TABLE = process.env.SANS_TABLE === '1';
const MAX_FICHIERS = Number(process.env.MAX_FICHIERS || 20);
const DELAI = Number(process.env.DELAI_MS || 120000);
const LOGINS = (process.env.LOGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const login = (i) => (LOGINS.length ? LOGINS[i % LOGINS.length] : ENV_E2E.LOGIN);
const URL_BASE = vues.BASE;

const mediane = (t) => { const s = [...t].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

async function preparer(b, i) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  if (SANS_TABLE) { await ctx.route(/\/api\/v1\/ecrans\/scripts\.js/, (r) => r.abort()); }
  const p = await ctx.newPage();
  const poste = { i, p, ctx, fichiers: 0, erreurs: [], table: false };
  p.on('request', (r) => { if (/\/general\/app\//.test(r.url())) { poste.fichiers++; } });
  p.on('response', (r) => { if (/\/api\/v1\/ecrans\/scripts\.js/.test(r.url()) && r.status() < 400) { poste.table = true; } });
  p.on('pageerror', (e) => poste.erreurs.push(String(e && e.message || e).slice(0, 200)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  await p.goto(URL_BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', login(i));
  await p.fill('#str_password', 'e2etest');
  return poste;
}

async function connecter(poste) {
  const { p } = poste;
  const t0 = Date.now();
  try {
    await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: DELAI });
    await p.waitForFunction(() => { const n = window.Ext && Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: DELAI });
    poste.duree = Date.now() - t0;
  } catch (e) {
    poste.duree = Date.now() - t0;
    poste.echec = e.message.split('\n')[0].slice(0, 150);
  }
}

/* ecran de vente par le menu, puis une vente vide : le champ produit doit apparaitre */
async function ouvrirVente(p) {
  await p.evaluate(() => { try { prestigeShowMetro(); } catch (e) { /* ancien en-tete */ } }).catch(() => {});
  const lib = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
    .cascadeBy((n) => { if (!r && n.get('id') === 'cloturerventemanager' && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; });
  if (!lib) { return 'menu de vente absent pour ce compte'; }
  const t0 = Date.now();
  await vues.ouvrirMenu(p, lib[0], lib[1]);
  await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
  await vues.cliquer(p, 'cloturerventemanager #addBtn');
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').some((x) => x.isVisible(true)), null, { timeout: 60000 });
  return Date.now() - t0;
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  /* observateur : journal des connexions RH avant et apres, depuis un compte qui ne se connecte pas avec les postes */
  const obs = await (await b.newContext()).newPage();
  await vues.connexion(obs, ENV_E2E.LOGIN, 'e2etest');
  const journal = () => obs.evaluate(async () => { const r = await fetch('../api/v1/rh/sessions', { credentials: 'same-origin' });
    const j = await r.json(); const n = {}; (j.data || []).forEach((s) => { n[s.login] = (n[s.login] || 0) + 1; }); return j.success === false ? null : n; });
  const avant = await journal().catch(() => null);
  const postes = [];
  for (let i = 0; i < POSTES; i++) { postes.push(await preparer(b, i)); }
  await Promise.all(postes.map((x) => connecter(x)));
  const problemes = [];
  /* rapport de charge du 29/10, par. 4.6 : deux premieres connexions au meme instant s'interbloquaient dans
     t_session_utilisateur et MariaDB en annulait une ; la connexion aboutissait, mais sans trace au journal */
  const apres = avant ? await journal().catch(() => null) : null;
  if (!avant || !apres) {
    console.log(`journal des connexions RH : illisible pour ${ENV_E2E.LOGIN} (droit RH absent ?), controle saute`);
  } else {
    const attendu = {};
    postes.filter((x) => !x.echec).forEach((x) => { attendu[login(x.i)] = (attendu[login(x.i)] || 0) + 1; });
    const manquants = Object.keys(attendu).filter((l) => (apres[l] || 0) - (avant[l] || 0) < attendu[l]);
    console.log(`journal des connexions RH : ${Object.keys(attendu).length - manquants.length} compte(s) sur ${Object.keys(attendu).length} journalise(s)`);
    manquants.forEach((l) => problemes.push(`connexion de ${l} absente du journal RH (${(apres[l] || 0) - (avant[l] || 0)} sur ${attendu[l]})`));
  }
  for (const x of postes) {
    const restants = x.echec ? '?' : await x.p.evaluate(() => (window.PRESTIGE_SCRIPTS ? Object.keys(window.PRESTIGE_SCRIPTS).length : -1)).catch(() => '?');
    console.log(`poste ${x.i + 1} (${login(x.i)}) : ${x.echec ? 'ECHEC ' + x.echec : 'menu en ' + x.duree + ' ms'}, ${x.fichiers} requetes general/app, table ${x.table ? 'recue (' + restants + ' fichiers non utilises)' : 'absente'}, ${x.erreurs.length} erreur(s) JavaScript`);
    x.erreurs.forEach((e) => console.log('   ! ' + e));
    if (x.echec) { problemes.push(`poste ${x.i + 1} non connecte`); }
    if (x.erreurs.length) { problemes.push(`poste ${x.i + 1} : ${x.erreurs.length} erreur(s) JavaScript`); }
    if (x.fichiers > MAX_FICHIERS) { problemes.push(`poste ${x.i + 1} : ${x.fichiers} requetes general/app (max ${MAX_FICHIERS})`); }
  }
  const ok = postes.filter((x) => !x.echec).map((x) => x.duree);
  console.log(`\n${POSTES} poste(s)${SANS_TABLE ? ' SANS la table' : ''} : ${ok.length} connecte(s), mediane ${mediane(ok)} ms, max ${Math.max(0, ...ok)} ms`);

  const premier = postes.find((x) => !x.echec);
  if (premier) {
    const avant = premier.erreurs.length;
    const v = await ouvrirVente(premier.p).catch((e) => 'ECHEC ' + e.message.split('\n')[0].slice(0, 150));
    console.log(`ecran de vente sur le poste ${premier.i + 1} : ${typeof v === 'number' ? 'ouvert en ' + v + ' ms' : v}`);
    if (typeof v !== 'number') { problemes.push('ecran de vente : ' + v); }
    if (premier.erreurs.length > avant) { problemes.push('ecran de vente : ' + (premier.erreurs.length - avant) + ' erreur(s) JavaScript'); }
  }
  await b.close();
  console.log(problemes.length ? '\nECHEC :\n - ' + problemes.join('\n - ') : '\nOK');
  process.exitCode = problemes.length ? 1 : 0;
})();
