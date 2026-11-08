/* SCAN PERDU A LA CAISSE (rejeu de l'heure de pointe d'appaul, 08/11, 17:53) : un article scanne n'est pas ajoute a
 * la vente. La liste reste ouverte sur l'article, le curseur reste dans la recherche, la caissiere doit rescanner.
 *
 * La douchette tape le CIP puis Entree d'un seul trait. La recherche de la liste (../vente/search) part une demi-seconde
 * apres la derniere touche : Entree arrive donc toujours AVANT sa reponse, et plus le serveur est charge, plus cette
 * reponse tarde. Le test rejoue ce geste, par le vrai ecran, en faisant varier la duree de la recherche (0 a 2 s : de
 * l'heure creuse a l'heure de pointe) :
 *  - premier scan d'un article ;
 *  - deuxieme scan du meme article (la liste garde le resultat du premier) ;
 *  - scan d'un autre article juste apres.
 * Attendu pour chaque scan : l'article est ajoute a la vente (une ligne de plus ou une quantite de plus), sans autre
 * geste. Si l'ecran place le curseur dans « QD », la caissiere appuie une seconde fois sur Entree, comme a la caisse :
 * ce cas est compte a part (ce n'est pas un scan perdu, mais un geste de plus).
 *
 * Tout ce que le test pose est retire : ventes, caisse d'essai, stocks remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const CAISSE = 'E2E-SCAN-CAISSE';
const ECRAN = 'doventemanager';
const CHAMP = ECRAN + ' #contenu [xtype=fieldcontainer] #produit';
const QD = ECRAN + ' #contenu [xtype=fieldcontainer] #qtyField';
/* temps de reponse du serveur (ms) pour la recherche de la liste, la recherche du code (findone) et l'ajout : de l'heure
   creuse a l'heure de pointe. Le defaut se montre des que findone + ajout depassent la demi-seconde d'attente de la liste. */
const CHARGES = [
  { nom: 'serveur rapide', search: 0, findone: 0, add: 0 },
  { nom: 'liste lente (2 s)', search: 2000, findone: 0, add: 0 },
  { nom: 'serveur chargé (findone 0,4 s, ajout 0,5 s)', search: 400, findone: 400, add: 500 },
  { nom: 'heure de pointe (1 s partout)', search: 1000, findone: 1000, add: 1000 }
].filter((c, i) => !process.env.SCAN_CHARGES || process.env.SCAN_CHARGES.split(',').indexOf(String(i)) >= 0);
const ATTENTE_AJOUT_MS = 6000;

/* deux articles simples, CIP unique (pas d'homonyme), stock large ; leurs stocks d'origine sont remis a la fin */
const ARTICLES = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s"
  + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 100 AND f.bool_DECONDITIONNE = 0"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP OR x.int_CIP LIKE CONCAT(f.int_CIP, '%') OR x.str_NAME LIKE CONCAT(f.int_CIP, '%')) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT 2")
  .split('\n').filter(Boolean).map((l) => { const [id, cip, dispo, total] = l.split('\t'); return { id, cip, dispo, total }; });
const ventes = [];

function retirerVentes() {
  if (!ventes.length) { return; }
  const tout = "('" + ventes.join("','") + "')";
  q("CREATE TEMPORARY TABLE e2e_scan_lignes AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (SELECT id FROM e2e_scan_lignes);"
    + " DELETE FROM hmvtproduit WHERE pkey IN " + tout + " OR pkey IN (SELECT id FROM e2e_scan_lignes);"
    + " DELETE FROM vente_reglement WHERE vente_id IN " + tout + ";"
    + " DELETE FROM vente_exclu WHERE preenregistrement_id IN " + tout + ";"
    + " DELETE FROM mvttransaction WHERE pkey IN " + tout + " OR vente_id IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN " + tout + ";"
    + " DROP TEMPORARY TABLE e2e_scan_lignes");
}

function nettoyer() {
  try { retirerVentes(); } catch (e) { console.log('Retrait des ventes incomplet : ' + String(e.message).split('\n').pop()); }
  q("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'");
  ARTICLES.forEach((a) => q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + a.dispo + ", int_NUMBER = " + a.total
    + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + a.id + "'"));
}

function poser() {
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + user + "' AND str_STATUT = 'is_Using'") === '0') {
    q("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED,"
      + " lg_UPDATED_BY, str_STATUT) VALUES ('" + CAISSE + "', '" + user + "', 0, 0, CURDATE(), NOW(), '" + user + "', NOW(), '" + user + "', 'is_Using')");
  }
}

async function ouvrirEcran(p, composant) {
  const lib = await p.evaluate((c) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
    .cascadeBy((n) => { if (!r && n.get('id') === c && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, composant);
  if (!lib) { throw new Error('Menu absent pour ' + composant); }
  await vues.ouvrirMenu(p, lib[0], lib[1]);
  await p.waitForTimeout(800);
  if (await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).count() > 0) {
    await p.mouse.click(1000, 33);
    await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}
const visible = (p, requete) => p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), requete, { timeout: 60000 });

/* quantite de l'article dans la vente en cours, lue en base (la verite, pas l'affichage) */
function quantiteEnVente(venteId, produitId) {
  if (!venteId) { return 0; }
  return Number(q("SELECT IFNULL(SUM(int_QUANTITY), 0) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId
    + "' AND lg_FAMILLE_ID = '" + produitId + "'"));
}
const venteCourante = (p) => p.evaluate(() => { const v = testextjs.app.getController('VenteCtr').getCurrent(); return v ? v.lgPREENREGISTREMENTID : null; });

let delais = {};
/* serveur charge, partie 2 : chaque appel de l'ecran de vente (recherche, findone, ajout, liste, net) repond avec un
   retard tire au hasard (graine fixe, rejouable) ; nul hors de la rafale */
let retardMax = 0;
let graine = 20261108;
const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const chrono = [];
let t00 = Date.now();
const noter = (x) => chrono.push(Date.now() - t00 + ' ' + x);

/* scan a la douchette : CIP tape d'un trait puis Entree tout de suite. Rend ce qui s'est passe. */
async function scanner(p, article) {
  const avantId = await venteCourante(p);
  const avant = quantiteEnVente(avantId, article.id);
  await vues.cliquer(p, CHAMP);
  await p.keyboard.press('Control+A');
  let ajouts = 0;
  const compter = (r) => { if (/\/vente\/add\/(vno|item)/.test(r.url())) { ajouts++; } };
  p.on('response', compter);
  await p.keyboard.type(article.cip, { delay: 15 });
  await p.keyboard.press('Enter');
  const t0 = Date.now();
  let secondeEntree = false;
  /* la caissiere regarde l'ecran : si le curseur est passe dans « QD », elle appuie une seconde fois sur Entree */
  while (Date.now() - t0 < ATTENTE_AJOUT_MS && ajouts === 0) {
    await p.waitForTimeout(250);
    if (!secondeEntree && Date.now() - t0 > 2500 && ajouts === 0) {
      const dansQd = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r)[0]; return !!c && document.activeElement === c.inputEl.dom; }, QD);
      if (dansQd) { secondeEntree = true; await p.keyboard.press('Enter'); }
    }
  }
  await p.waitForTimeout(Math.max(delais.search || 0, (delais.findone || 0) + (delais.add || 0)) + 1500);
  p.off('response', compter);
  const id = await venteCourante(p);
  if (id && ventes.indexOf(id) < 0) { ventes.push(id); }
  const apres = quantiteEnVente(id, article.id);
  const etat = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r)[0];
    return { liste: !!c.isExpanded, curseur: document.activeElement === c.inputEl.dom ? 'recherche'
      : (document.activeElement && document.activeElement.id) || '', texte: c.getRawValue() }; }, CHAMP);
  /* remettre l'ecran au propre pour le scan suivant, comme la caissiere (Echap referme la liste) */
  if (etat.liste) { await p.keyboard.press('Escape'); }
  return { ajoute: apres - avant, ajouts, secondeEntree, etat };
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  /* serveur charge : les appels de l'ecran de vente repondent avec le retard voulu (le serveur lui-meme n'est pas touche) */
  await ctx.route(/\/api\/v1\/vente\//, async (r) => {
    const u = r.request().url().replace(/^.*\/api\/v1\/vente\//, '').replace(/\?.*/, '');
    let d = delais[u.split('/')[0]] || 0;
    if (retardMax) { d = Math.round(hasard() * retardMax); }
    noter('-> ' + u + ' (+' + d + ' ms)');
    if (d) { await new Promise((f) => setTimeout(f, d)); }
    r.continue();
  });
  const p = await ctx.newPage();
  p.on('response', (r) => { if (/\/api\/v1\/vente\//.test(r.url())) { noter('<- ' + r.url().replace(/^.*\/api\/v1\/vente\//, '').replace(/\?.*/, '')); } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    ok('Jeu d\'essai : deux articles simples en stock, CIP sans homonyme', ARTICLES.length === 2, ARTICLES.map((a) => a.cip).join(' '));
    poser();
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirEcran(p, 'cloturerventemanager');
    await visible(p, 'cloturerventemanager #addBtn');
    await vues.cliquer(p, 'cloturerventemanager #addBtn');
    await visible(p, CHAMP);
    await p.waitForTimeout(1500);
    const [A, B] = ARTICLES;
    for (const charge of CHARGES) {
      delais = charge;
      const etiquette = charge.nom;
      for (const [nom, art] of [['1er scan de A', A], ['2e scan de A', A], ['3e scan de A', A], ['scan de B après A', B], ['2e scan de B', B]]) {
        const r = await scanner(p, art);
        ok(etiquette + ' : ' + nom + ' ajouté' + (r.secondeEntree ? ' (après une seconde Entrée)' : ''), r.ajoute === 1,
          'quantité +' + r.ajoute + ', ajouts envoyés ' + r.ajouts + ', liste ' + (r.etat.liste ? 'ouverte' : 'fermée') + ', curseur ' + r.etat.curseur
          + ', texte « ' + r.etat.texte + ' »');
        ok(etiquette + ' : ' + nom + ' sans seconde Entrée', r.ajoute === 1 && !r.secondeEntree);
      }
    }

    /* sans regression : saisie a la main, la caissiere attend la liste, Entree choisit l'article, le curseur passe dans
       « QD », elle tape 2 et Entree : 2 boites ajoutees (chemin du choix dans la liste, inchange) */
    delais = {};
    {
      const id0 = await venteCourante(p);
      const avant = quantiteEnVente(id0, B.id);
      await vues.cliquer(p, CHAMP);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(B.cip, { delay: 120 });
      await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return c.isExpanded && c.getStore().getCount() === 1 && !c.getStore().isLoading(); }, CHAMP, { timeout: 15000 });
      await p.waitForTimeout(300);
      await p.keyboard.press('Enter');
      const dansQd = await p.waitForFunction((x) => { const c = Ext.ComponentQuery.query(x)[0]; return document.activeElement === c.inputEl.dom; }, QD, { timeout: 5000 }).then(() => true).catch(() => false);
      ok('Saisie à la main : Entrée sur la liste choisit l\'article et passe dans « QD » sans l\'ajouter', dansQd && quantiteEnVente(id0, B.id) === avant);
      await p.keyboard.press('Control+A');
      await p.keyboard.type('2', { delay: 30 });
      const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 15000 });
      await p.keyboard.press('Enter');
      await rep;
      await p.waitForTimeout(1500);
      const id = await venteCourante(p);
      if (id && ventes.indexOf(id) < 0) { ventes.push(id); }
      ok('Saisie à la main : « QD » 2 puis Entrée ajoute 2 boîtes', quantiteEnVente(id, B.id) - avant === 2, 'quantité +' + (quantiteEnVente(id, B.id) - avant));
    }

    /* rafale comme au rejeu de l'heure de pointe : scans enchaines 0,6 s apres chaque ajout, le meme article plusieurs
       fois de suite (quantite 2 ou 3 scannee boite par boite), chaque appel de vente retarde au hasard */
    delais = {};
    retardMax = Number(process.env.SCAN_RETARD_MAX || 1500);
    const N = Number(process.env.SCAN_RAFALE || 20);
    const suite = [];
    while (suite.length < N) { const art = hasard() < 0.5 ? A : B; const n = 1 + Math.floor(hasard() * 3); for (let k = 0; k < n; k++) { suite.push(art); } }
    const perdus = [];
    let secondes = 0;
    for (let k = 0; k < N; k++) {
      const art = suite[k];
      const id0 = await venteCourante(p);
      const avant = quantiteEnVente(id0, art.id);
      const debut = chrono.length;
      noter('SCAN ' + (k + 1) + ' ' + art.cip);
      await vues.cliquer(p, CHAMP);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(art.cip, { delay: 15 });
      const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: 8000 }).catch(() => null);
      await p.keyboard.press('Enter');
      noter('Entree');
      let r = await Promise.race([rep, p.waitForTimeout(2500).then(() => 'attente')]);
      if (r === 'attente') {
        const dansQd = await p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0]; return !!c && document.activeElement === c.inputEl.dom; }, QD);
        if (dansQd) { secondes++; noter('seconde Entree (curseur dans QD)'); await p.keyboard.press('Enter'); }
        r = await rep;
      }
      const id = await venteCourante(p);
      if (id && ventes.indexOf(id) < 0) { ventes.push(id); }
      if (!r) {
        await p.waitForTimeout(retardMax + 500);
        const etat = await p.evaluate((x) => { const c = Ext.ComponentQuery.query(x)[0];
          return { liste: !!c.isExpanded, n: c.getStore().getCount(), curseur: document.activeElement === c.inputEl.dom ? 'recherche'
            : (document.activeElement && document.activeElement.id) || '', texte: c.getRawValue(),
            attente: Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => m.el.dom.textContent.trim().slice(0, 60)) }; }, CHAMP);
        const apres = quantiteEnVente(id, art.id);
        perdus.push({ scan: k + 1, cip: art.cip, ajoute: apres - avant, etat, chrono: chrono.slice(debut) });
        await p.screenshot({ path: ENV_E2E.TMP + '/scan-perdu-' + (k + 1) + '.png' }).catch(() => {});
        if (etat.liste) { await p.keyboard.press('Escape'); }
      }
      await p.waitForTimeout(600);
    }
    const max = retardMax;
    retardMax = 0;
    await p.waitForTimeout(2000);
    perdus.forEach((x) => console.log('   scan perdu n° ' + x.scan + ' (' + x.cip + ', quantité +' + x.ajoute + ') : ' + JSON.stringify(x.etat) + '\n      ' + x.chrono.join('\n      ')));
    ok('Rafale de ' + N + ' scans, appels retardés jusqu\'à ' + max + ' ms : aucun scan perdu', perdus.length === 0,
      perdus.length + ' perdu(s) : n° ' + perdus.map((x) => x.scan).join(', ') + ' ; secondes Entrées ' + secondes);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: ENV_E2E.TMP + '/scan-pendant-recherche-echec.png' }).catch(() => {});
    ok('Parcours sans exception', false, (await vues.texteMessage(p).catch(() => '')) + ' ' + e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && ARTICLES.every((a) => q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + a.id + "'") === a.dispo));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
