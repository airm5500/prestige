/* OUVERTURE ET CHARGEMENT DES ECRANS (demande du 02/11).
 *
 * Ecrans mesures : modification d'une vente (bouton « Modifier » de « Ventes terminées »), etat de controle des
 * achats, pilotage (chaque onglet), audit et rapprochements, comparaison CA familles, statistiques des ventes, clients
 * desactives, tiers payants desactives, balance agee.
 *
 * Vrai chemin de l'ecran : chaque ecran est ouvert par un clic dans le menu, chaque onglet par un clic sur son
 * en-tete, la modification par un clic sur l'icone « Modifier » d'une vente, le retour par le bouton « Retour » de
 * l'ecran de vente. Le menu cherche l'entree par l'identifiant de l'ecran puis la clique par son libelle affiche : un
 * menu absent des droits du compte fait echouer la mesure.
 *
 * Un ecran est charge quand le reseau est calme (aucun appel en vol pendant 400 ms) et qu'aucun masque « Chargement »
 * n'est affiche ; les 400 ms d'attente ne sont pas comptees. Chaque ecran est ouvert deux fois : la premiere porte les
 * caches froids, la seconde est l'usage courant. On retient la pire des deux.
 *
 * Donnees : seule la modification de vente ecrit (une copie de la vente, supprimee par le bouton « Retour » ; si le
 * test s'arrete avant, la copie est supprimee a la fin). Aucune donnee de patient n'est affichee.
 * Variables : BASE (adresse de Prestige ; a fixer : domain2 http://localhost:9080/prestige pour les mesures),
 * E2E_LOGIN (e2e), E2E_LOGIN_SUPPORT pour l'audit (e2e-sa), ECRANS (liste de cles pour n'en mesurer que certains).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion } = require('../outils/vues');

const BUDGET = {
  ouverture: 3000,     /* clic sur le menu -> ecran charge */
  onglet: 3000,        /* clic sur l'en-tete -> onglet charge */
  modification: 3000   /* clic sur « Modifier » -> vente affichee dans l'ecran de vente */
};

/* cle : identifiant de l'entree du menu ; superAdmin : menu reserve au super administrateur */
const ECRANS = [
  { cle: 'ventemanager', libelle: 'Ventes terminées, puis Modifier', modification: true },
  { cle: 'etatscontrolemanager', libelle: 'État de contrôle des achats' },
  { cle: 'pilotage', libelle: 'Pilotage' },
  { cle: 'auditrapprochements', libelle: 'Audit et rapprochements', superAdmin: true },
  { cle: 'comparaisonChiffreAffaireManager', libelle: 'Comparaison CA familles' },
  { cle: 'statistiqueventemanager', libelle: 'Statistiques des ventes' },
  { cle: 'clientdesactive', libelle: 'Clients désactivés' },
  { cle: 'tierspayantdesactive', libelle: 'Tiers payants désactivés' },
  { cle: 'balanceagee', libelle: 'Balance âgée' }
].filter((e) => !process.env.ECRANS || process.env.ECRANS.split(',').indexOf(e.cle) >= 0);

const res = [];
const mesures = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
/* au-dela du budget : les appels de plus d'une seconde faits pendant le geste (adresse sans parametres) */
function noter(ecran, geste, ms, limite, s, t0) {
  mesures.push({ ecran, geste, ms, limite });
  const lents = ms > limite && s ? s.etat.appels.filter((a) => a.debut >= t0 - 50 && a.ms >= 1000)
    .sort((a, b) => b.ms - a.ms).slice(0, 4).map((a) => a.adresse + ' ' + a.ms + ' ms').join(' ; ') : '';
  ok(ecran + ' : ' + geste, ms <= limite, ms + ' ms, budget ' + limite + ' ms' + (lents ? ' ; appels lents : ' + lents : ''));
}

async function session(b, login) {
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const etat = { enVol: 0, dernier: Date.now(), erreurs: [], copies: [], appels: [] };
  const debuts = new Map();
  p.on('pageerror', (e) => etat.erreurs.push(String(e.message)));
  p.on('request', (r) => { etat.enVol++; etat.dernier = Date.now(); debuts.set(r, Date.now()); });
  const fini = (r) => {
    etat.enVol = Math.max(0, etat.enVol - 1); etat.dernier = Date.now();
    const d = debuts.get(r); debuts.delete(r);
    if (d) { etat.appels.push({ adresse: r.method() + ' ' + r.url().split('?')[0].replace(/^.*\/prestige\//, ''), debut: d, ms: Date.now() - d }); }
  };
  p.on('requestfinished', fini); p.on('requestfailed', fini);
  /* copie creee par « Modifier » : retenue pour etre supprimee si le test s'arrete avant le bouton « Retour » */
  p.on('response', async (r) => {
    const u = r.url();
    if (/\/api\/v1\/vente\/modifier-vente-terme\//.test(u)) {
      const j = await r.json().catch(() => null);
      if (j && j.success && j.data && j.data.lgPREENREGISTREMENTID) { etat.copies.push(j.data.lgPREENREGISTREMENTID); }
    } else if (/\/api\/v1\/vente\/copie\//.test(u) && r.request().method() === 'DELETE' && r.ok()) {
      const id = decodeURIComponent(u.split('/copie/')[1].split('?')[0]);
      etat.copies = etat.copies.filter((c) => c !== id);
    }
  });
  await connexion(p, login, 'e2etest');
  return { p, ctx, etat };
}

/* ecran charge : reseau calme depuis 400 ms et aucun masque de chargement visible ; jamais avant le clic (depuis) */
async function charge(s, limite, depuis) {
  const { p, etat } = s;
  const fin = Date.now() + limite;
  while (Date.now() < fin) {
    if (etat.enVol === 0 && Date.now() - etat.dernier >= 400) {
      const masque = await p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'),
        (m) => m.offsetParent !== null)).catch(() => false);
      if (!masque) { return Math.max(depuis || 0, Date.now() - 400); }
    }
    await p.waitForTimeout(50);
  }
  throw new Error('ecran toujours en chargement apres ' + limite + ' ms');
}

/* clic sur le menu : volet deplie, menu parent, puis entree ; le chronometre part au clic sur l'entree */
async function ouvrir(s, cle) {
  const { p } = s;
  const libelles = await p.evaluate((c) => {
    const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', c, true);
    return n ? { parent: n.parentNode.get('text'), entree: n.get('text'),
      ecran: testextjs.app.getController('App').ecranReel(c) } : null;
  }, cle);
  if (!libelles) { throw new Error('menu ' + cle + ' absent pour ce compte'); }
  const visible = (sel) => p.locator(sel).filter({ visible: true });
  /* volet flottant ou liste deroulante restes ouverts par l'ecran precedent ; le volet se replie avec une animation */
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  const deplier = async () => {
    const id = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n.placeholder && n.placeholder.isVisible() ? n.placeholder.getId() : null; });
    if (id) { await p.click('#' + id); }
    await visible('.prestige-nav .x-grid-row').first().waitFor({ timeout: 10000 });
  };
  const exact = (t) => new RegExp('^\\s*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
  const parent = () => visible('.prestige-nav .x-grid-row').filter({ has: p.getByText(exact(libelles.parent)) }).first();
  await deplier();
  await parent().click({ timeout: 5000 }).catch(async () => { await deplier(); await parent().click(); });
  const item = visible('.prestige-flyout-menu .x-menu-item').filter({ has: p.getByText(exact(libelles.entree)) }).first();
  await item.waitFor({ timeout: 10000 });
  const t0 = Date.now();
  await item.click();
  await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), libelles.ecran, { timeout: 120000 });
  const t1 = await charge(s, 300000, t0);
  return { ms: t1 - t0, t0, ecran: libelles.ecran, entree: libelles.entree };
}

/* chaque onglet de l'ecran, par un clic sur son en-tete ; les onglets imbriques apres leur onglet parent */
async function onglets(s, ecran, nom, vus) {
  const { p } = s;
  const panneaux = await p.evaluate(([x, deja]) => {
    const racine = Ext.ComponentQuery.query(x).filter((c) => c.isVisible(true))[0];
    if (!racine) { return []; }
    const tous = (racine.isXType('tabpanel') ? [racine] : []).concat(racine.query('tabpanel'));
    return tous.filter((t) => t.isVisible(true) && deja.indexOf(t.getId()) < 0).map((t) => ({
      id: t.getId(),
      onglets: t.items.items.map((it, i) => ({ i, titre: (it.title || (it.tab && it.tab.text) || ('onglet ' + (i + 1))).replace(/<[^>]*>/g, '').trim(),
        tab: it.tab && it.tab.isVisible() && !it.tab.disabled ? it.tab.getId() : null }))
    }));
  }, [ecran, vus]);
  for (const t of panneaux) {
    if (vus.indexOf(t.id) >= 0) { continue; }
    vus.push(t.id);
    for (const o of t.onglets) {
      if (!o.tab) { continue; }
      const actif = await p.evaluate(([id, i]) => { const t = Ext.getCmp(id); return t.items.indexOf(t.getActiveTab()) === i; }, [t.id, o.i]);
      const t0 = Date.now();
      if (!actif) { await p.click('#' + o.tab); }
      const t1 = await charge(s, 300000, t0);
      if (!actif) { noter(nom, 'onglet « ' + o.titre + ' »', t1 - t0, BUDGET.onglet, s, t0); }
      await onglets(s, ecran, nom, vus);
    }
  }
}

/* onglets dessines en boutons (cec-onglet : etat de controle des achats, commandes en cours...) */
async function boutonsOnglets(s, ecran, nom) {
  const { p } = s;
  const boutons = await p.evaluate((x) => {
    const racine = Ext.ComponentQuery.query(x).filter((c) => c.isVisible(true))[0];
    return racine ? racine.query('button[toggleGroup]').filter((b) => b.isVisible(true) && /cec-onglet/.test(b.cls || ''))
      .map((b) => ({ id: b.getId(), texte: b.getText(), presse: b.pressed })) : [];
  }, ecran);
  for (const o of boutons.filter((b) => !b.presse).concat(boutons.filter((b) => b.presse))) {
    const t0 = Date.now();
    await p.click('#' + o.id);
    const t1 = await charge(s, 300000, t0);
    noter(nom, 'onglet « ' + o.texte + ' »', t1 - t0, BUDGET.onglet, s, t0);
  }
}

/* « Ventes terminees » : clic sur l'icone « Modifier » d'une vente, puis bouton « Retour » de l'ecran de vente */
async function modifierVente(s, nom) {
  const { p } = s;
  const icones = () => p.locator('img.x-action-col-icon[data-qtip="Modifier"]').filter({ visible: true });
  if (await icones().count() === 0) {
    /* aucune vente modifiable aujourd'hui : on elargit la periode aux 30 derniers jours, par les champs de l'ecran */
    const debut = new Date(Date.now() - 30 * 86400000);
    const z = (n) => String(n).padStart(2, '0');
    const id = await p.evaluate(() => Ext.ComponentQuery.query('ventemanager #dtStart').filter((c) => c.isVisible(true))[0].inputEl.dom.id);
    await p.keyboard.press('Escape');
    await p.click('#' + id); await p.keyboard.press('Control+A');
    await p.keyboard.type(z(debut.getDate()) + '/' + z(debut.getMonth() + 1) + '/' + debut.getFullYear());
    await p.keyboard.press('Tab');
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('ventemanager #rechercher')[0].getId()));
    await charge(s, 300000);
  }
  for (let essai = 0, mesurees = 0; essai < 6 && mesurees < 2; essai++) {
    const n = await icones().count();
    if (n === 0) { ok(nom + ' : une vente modifiable est affichee', false, 'aucune icone « Modifier »'); return; }
    const t0 = Date.now();
    await icones().nth(Math.min(essai, n - 1)).click();
    /* la vente s'affiche dans l'ecran de vente, avec ses lignes ; ou un message dit pourquoi elle ne se modifie pas */
    const issue = await p.waitForFunction(() => {
      const refus = Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible())[0];
      if (refus) { return 'refus'; }
      const v = Ext.ComponentQuery.query('doventemanager').filter((c) => c.isVisible(true))[0];
      const g = v && v.query('gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
      return g ? 'vente' : false;
    }, null, { timeout: 120000 }).then((h) => h.jsonValue());
    if (issue === 'refus') {
      await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible())[0].down('button[itemId=ok]').getId()));
      await charge(s, 120000);
      if (await p.evaluate(() => !Ext.ComponentQuery.query('ventemanager').some((c) => c.isVisible(true)))) { await ouvrir(s, 'ventemanager'); }
      continue;
    }
    const t1 = await charge(s, 300000, t0);
    noter(nom, 'clic sur « Modifier », vente affichee', t1 - t0, BUDGET.modification, s, t0);
    mesurees++;
    const retour = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #contenu [xtype=toolbar] #btnGoBack').filter((x) => x.isVisible(true))[0]; return b ? b.getId() : null; });
    if (!retour) { ok(nom + ' : bouton « Retour » visible', false); return; }
    const t2 = Date.now();
    await p.click('#' + retour);
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventemanager').some((c) => c.isVisible(true)), null, { timeout: 120000 });
    const t3 = await charge(s, 300000, t2);
    noter(nom, 'bouton « Retour », copie supprimee et liste reaffichee', t3 - t2, BUDGET.ouverture, s, t2);
  }
  ok(nom + ' : aucune copie de vente ne reste apres « Retour »', s.etat.copies.length === 0, s.etat.copies.length + ' copie(s)');
}

(async () => {
  console.log('Serveur : ' + BASE);
  const b = await ENV_E2E.lancer(chromium);
  const sessions = {};
  try {
    for (const e of ECRANS) {
      const login = e.superAdmin ? ENV_E2E.LOGIN_SUPPORT : ENV_E2E.LOGIN;
      try {
        sessions[login] = sessions[login] || await session(b, login);
        const s = sessions[login];
        for (let tour = 1; tour <= 2; tour++) {
          const o = await ouvrir(s, e.cle);
          noter(e.libelle, 'ouverture du menu « ' + o.entree + ' » (' + tour + (tour === 1 ? 're' : 'e') + ' fois)', o.ms, BUDGET.ouverture, s, o.t0);
          if (tour === 1) { await onglets(s, o.ecran, e.libelle, []); await boutonsOnglets(s, o.ecran, e.libelle); }
          if (tour === 1 && e.modification) { await modifierVente(s, e.libelle); }
        }
      } catch (ex) {
        ok(e.libelle + ' : mesure menee au bout', false, String(ex && ex.message).slice(0, 300));
        await ENV_E2E.capture(sessions[login] && sessions[login].p, 'echec-' + e.cle).catch(() => {});
      }
    }
  } finally {
    for (const login of Object.keys(sessions)) {
      const s = sessions[login];
      /* copie de vente laissee par un arret avant « Retour » : supprimee comme le fait l'ecran */
      for (const id of s.etat.copies) {
        await s.p.evaluate((c) => fetch('../api/v1/vente/copie/' + encodeURIComponent(c), { method: 'DELETE', credentials: 'same-origin' }), id).catch(() => {});
        console.log('copie de vente retiree a la fin du test');
      }
      ok('Aucune erreur JavaScript (' + login + ')', s.etat.erreurs.length === 0, JSON.stringify(s.etat.erreurs.slice(0, 3)));
    }
    console.log('');
    console.log('RECAPITULATIF (ms)');
    mesures.forEach((m) => console.log('  ' + (m.ms > m.limite ? '!! ' : '   ') + m.ms + '\t' + m.ecran + ' : ' + m.geste));
    await b.close();
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('');
  console.log((res.length - echecs) + '/' + res.length + ' controles respectes');
  process.exit(echecs ? 1 : 0);
})();
