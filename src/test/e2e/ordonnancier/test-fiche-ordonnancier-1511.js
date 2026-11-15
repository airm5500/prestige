/* PLAN DU 14/11, POINT 7 : « Ordonnancier » et « Produit sensible » modifiables sur la fiche produit, visibles dans
 * le detail.
 *
 * Parcours de l'utilisateur, pour trois produits aux etats de depart differents :
 *  - P1 (non, non)  : les deux cases cochees a la souris ;
 *  - P2 (oui, non)  : « inscrit a l'ordonnancier » decochee, « produit sensible » cochee ;
 *  - P3 (oui, oui)  : rien de change, simple enregistrement.
 * Menu Fiche Article, recherche du CIP au clavier, action « Modifier », clic sur les cases, « Enregistrer » ; puis
 * action « Détail sur l'article ».
 * Contrôles :
 *  - rapprochement : etat des cases a l'ouverture = base ; apres enregistrement, base = cases = detail (Oui / Non) ;
 *  - bilan : une ligne de journal ORDONNANCIER_PRODUIT par case reellement changee (2, 2, 0), aucune autre colonne
 *    de la fiche modifiee par les cases (les envois des cases sont retenus le temps de photographier la ligne t_famille
 *    enregistree, puis relaches ; comparaison hors dates et VERSION) ;
 *  - les envois partent l'un apres l'autre : ensemble, ils se percutaient sur la version de la ligne (rien d'ecrit) ;
 *  - sans le droit du menu Ordonnancier (reponse du service de droit remplacee) : cases grisees, libelle
 *    « Ordonnancier (droit requis) », aucun envoi a l'enregistrement.
 * Tout est remis : drapeaux, journal.
 * Lancement seul : node src/test/e2e/ordonnancier/test-fiche-ordonnancier-1511.js
 */
const { chromium } = require('playwright-core');
const C = require('./commun');

const DEBUT = C.q('SELECT NOW()');
const lignes = C.q("SELECT CONCAT_WS('~', f.lg_FAMILLE_ID, f.int_CIP, IFNULL(f.is_scheduled, 0), IFNULL(f.is_sensible, 0)) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.bool_DECONDITIONNE = 0 AND IFNULL(f.bool_DECONDITIONNE_EXIST, 0) = 0"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY f.int_CIP DESC LIMIT 3")
  .split(/\n/).filter(Boolean).map((l) => { const [id, cip, scheduled, sensible] = l.split('~'); return { id, cip, scheduled, sensible }; });
/* etat de depart, cases a cliquer, etat attendu */
const CAS = [
  { nom: 'P1', depart: [0, 0], clics: ['cb_ordonnancier', 'cb_sensible'], attendu: [1, 1] },
  { nom: 'P2', depart: [1, 0], clics: ['cb_ordonnancier', 'cb_sensible'], attendu: [0, 1] },
  { nom: 'P3', depart: [1, 1], clics: [], attendu: [1, 1] }
];
CAS.forEach((c, i) => { c.p = lignes[i]; });

const drapeaux = (id) => C.q("SELECT CONCAT(IFNULL(is_scheduled, 0), IFNULL(is_sensible, 0)) FROM t_famille WHERE lg_FAMILLE_ID = '" + id + "'");
const journal = (id) => C.q("SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG = '" + id + "' AND dt_CREATED >= '" + DEBUT + "'"
  + " AND str_DESCRIPTION LIKE '%coch%' AND (str_DESCRIPTION LIKE '%ordonnancier%' OR str_DESCRIPTION LIKE '%sensible%')");
/* la ligne de la fiche, hors dates et drapeaux */
const colonnes = C.q("SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()"
  + " AND TABLE_NAME = 't_famille' AND COLUMN_NAME NOT IN ('is_scheduled', 'is_sensible') AND DATA_TYPE NOT IN ('datetime', 'timestamp', 'date')").split(',');
const fiche = (id) => C.q("SELECT CONCAT_WS('|', " + colonnes.map((c) => "IFNULL(`" + c + "`, '~')").join(', ') + ") FROM t_famille WHERE lg_FAMILLE_ID = '" + id + "'").split('|');

function nettoyer() {
  lignes.forEach((x) => C.q("UPDATE t_famille SET is_scheduled = " + x.scheduled + ", is_sensible = " + x.sensible + " WHERE lg_FAMILLE_ID = '" + x.id + "'"));
  if (lignes.length) {
    C.q("DELETE FROM t_event_log WHERE dt_CREATED >= '" + DEBUT + "' AND str_TYPE_LOG IN ('" + lignes.map((x) => x.id).join("','") + "')");
  }
}

/* menu Fiche Article, recherche du CIP au clavier, puis action de ligne (icone ou menu « Autres actions ») */
async function actionLigne(p, cip, action) {
  if (!(await p.evaluate(() => Ext.ComponentQuery.query('famillemanager').some((c) => c.isVisible(true))))) {
    await C.vues.ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await p.mouse.move(1000, 600);
  }
  await C.vues.cliquer(p, 'famillemanager #rechecher');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(cip, { delay: 20 });
  await p.keyboard.press('Enter');
  const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: cip }).first();
  await ligne.waitFor({ timeout: 60000 });
  await p.waitForTimeout(600);
  const icone = ligne.locator('img[data-qtip="' + action + '"]');
  if (await icone.count() && await icone.first().isVisible()) {
    await icone.first().click();
  } else {
    await ligne.locator('img[data-qtip="Autres actions"]').click();
    const entree = p.locator('.x-menu-item').filter({ visible: true, hasText: action }).first();
    await entree.waitFor({ timeout: 10000 });
    await entree.click();
  }
}

const etatCases = (p) => p.evaluate(() => {
  const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.down('#cb_ordonnancier')).pop();
  if (!w) { return null; }
  const o = w.down('#cb_ordonnancier'), s = w.down('#cb_sensible');
  return { ordo: o.getValue() ? 1 : 0, sens: s.getValue() ? 1 : 0, gris: o.isDisabled() && s.isDisabled(), libelle: w.down('#ordo_container').getFieldLabel() };
});

async function ouvrirModification(p, cip) {
  await actionLigne(p, cip, 'Modifier');
  await p.waitForFunction(() => Ext.ComponentQuery.query('window').some((x) => x.isVisible(true) && x.down('#cb_ordonnancier')), null, { timeout: 60000 });
  /* reponse du service de droit arrivee */
  await p.waitForTimeout(1500);
}

async function enregistrer(p) {
  const id = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.down('#cb_ordonnancier')).pop();
    return w.down('button[text=Enregistrer]').getId(); });
  await p.click('#' + id);
  await p.waitForFunction(() => !Ext.ComponentQuery.query('window').some((x) => x.isVisible(true) && x.down('#cb_ordonnancier')), null, { timeout: 60000 })
    .catch(() => {});
  await p.waitForTimeout(2000);
}

(async () => {
  C.ok('Jeu d\'essai : trois produits simples', lignes.length === 3, lignes.map((x) => x.cip).join(', '));
  if (lignes.length < 3) { process.exit(1); }
  CAS.forEach((c) => C.q("UPDATE t_famille SET is_scheduled = " + c.depart[0] + ", is_sensible = " + c.depart[1] + " WHERE lg_FAMILLE_ID = '" + c.p.id + "'"));
  const b = await C.ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const envois = []; p.on('request', (r) => { if (/fichearticle\/ordonnancier\/[^/?]+$/.test(r.url()) && r.method() === 'PUT') { envois.push({ url: r.url(), corps: r.postData() }); } });
  /* les envois des cases sont retenus jusqu'a la photo de la fiche enregistree, pour isoler leur seul effet */
  const retenus = []; let libre = true;
  await p.route(/fichearticle\/ordonnancier\/[^/?]+$/, (r) => { if (r.request().method() === 'PUT' && !libre) { retenus.push(r); } else { r.continue(); } });
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');
    for (const c of CAS) {
      const t = c.nom + ' (' + c.depart.join(',') + ' -> ' + c.attendu.join(',') + ') : ';
      const avant = fiche(c.p.id);
      await ouvrirModification(p, c.p.cip);
      const e0 = await etatCases(p);
      C.ok(t + 'les cases s\'ouvrent sur l\'état de la base, actives', e0 && e0.ordo === c.depart[0] && e0.sens === c.depart[1] && !e0.gris, JSON.stringify(e0));
      for (const qid of c.clics) {
        const id = await p.evaluate((x) => { const w = Ext.ComponentQuery.query('window').filter((y) => y.isVisible(true) && y.down('#cb_ordonnancier')).pop();
          return w.down('#' + x).inputEl.id; }, qid);
        await p.click('#' + id);
      }
      const e1 = await etatCases(p);
      C.ok(t + 'cases cliquées à la souris', e1 && e1.ordo === c.attendu[0] && e1.sens === c.attendu[1], JSON.stringify(e1));
      const n0 = envois.length;
      const changees = c.attendu.filter((v, i) => v !== c.depart[i]).length;
      libre = false;
      await enregistrer(p);
      for (let k = 0; k < 40 && changees && !retenus.length; k++) { await p.waitForTimeout(250); }
      /* fiche enregistree, cases pas encore envoyees */
      const apresFiche = fiche(c.p.id);
      const ecritFiche = colonnes.filter((x, i) => avant[i] !== apresFiche[i]);
      if (ecritFiche.length) { console.log('INFO  ' + c.nom + ' : colonnes réécrites par « Enregistrer » (existant, hors cases) : ' + ecritFiche.join(', ')); }
      libre = true;
      retenus.splice(0).forEach((r) => r.continue());
      await p.waitForTimeout(2000);
      C.ok(t + 'base = cases', drapeaux(c.p.id) === c.attendu.join(''), drapeaux(c.p.id));
      C.ok(t + changees + ' envoi(s), un par case changée', envois.length - n0 === changees, JSON.stringify(envois.slice(n0).map((x) => x.corps)));
      C.ok(t + 'bilan : ' + changees + ' ligne(s) de journal', journal(c.p.id) === String(changees), journal(c.p.id));
      const apres = fiche(c.p.id);
      const ecarts = colonnes.filter((x, i) => x !== 'VERSION' && apresFiche[i] !== apres[i]);
      C.ok(t + 'les cases ne changent aucune autre colonne de la fiche', ecarts.length === 0,
        colonnes.map((x, i) => apresFiche[i] !== apres[i] ? x + ' ' + apresFiche[i] + ' -> ' + apres[i] : null).filter(Boolean).join(', '));
      /* rouverture : les cases relisent la base */
      await ouvrirModification(p, c.p.cip);
      const e2 = await etatCases(p);
      C.ok(t + 'rouverture : cases = base', e2 && e2.ordo === c.attendu[0] && e2.sens === c.attendu[1], JSON.stringify(e2));
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true) && x.down('#cb_ordonnancier')).forEach((w) => w.close()));
      await p.waitForTimeout(500);
      /* detail */
      await actionLigne(p, c.p.cip, 'Détail sur l\'article');
      const lu = await p.waitForFunction(() => {
        const o = Ext.ComponentQuery.query('#detail_ordonnancier').filter((x) => x.isVisible(true)).pop(), s = Ext.ComponentQuery.query('#detail_sensible').filter((x) => x.isVisible(true)).pop();
        if (!o || !s || !o.getEl() || !o.getValue()) { return null; }
        return { ordo: o.inputEl.dom.textContent.trim(), sens: s.inputEl.dom.textContent.trim() };
      }, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => null);
      const oui = (v) => (v ? 'Oui' : 'Non');
      C.ok(t + 'détail : Ordonnancier ' + oui(c.attendu[0]) + ', Produit sensible ' + oui(c.attendu[1]) + ' (rapprochement base)',
        lu && lu.ordo === oui(c.attendu[0]) && lu.sens === oui(c.attendu[1]), JSON.stringify(lu));
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((x) => x.isVisible(true)).forEach((w) => w.close()));
      await p.waitForTimeout(500);
    }

    /* sans le droit du menu Ordonnancier : reponse du service de droit remplacee */
    await p.route(/fichearticle\/ordonnancier\/droit/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"droit":false}' }));
    const c = CAS[0];
    const avantDroit = drapeaux(c.p.id), n0 = envois.length;
    await ouvrirModification(p, c.p.cip);
    const e = await etatCases(p);
    C.ok('Sans le droit : cases grisées, libellé « Ordonnancier (droit requis) », état de la base affiché',
      e && e.gris && e.libelle === 'Ordonnancier (droit requis)' && String(e.ordo) + e.sens === avantDroit, JSON.stringify(e));
    const id = await p.evaluate(() => Ext.ComponentQuery.query('window').filter((y) => y.isVisible(true) && y.down('#cb_ordonnancier')).pop().down('#cb_ordonnancier').inputEl.id);
    await p.click('#' + id, { force: true }).catch(() => {});
    await enregistrer(p);
    C.ok('Sans le droit : aucun envoi, base inchangée', envois.length === n0 && drapeaux(c.p.id) === avantDroit, (envois.length - n0) + ' envoi(s), ' + drapeaux(c.p.id));
    await p.unroute(/fichearticle\/ordonnancier\/droit/);
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (err) {
    C.ok('Parcours sans exception', false, err.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    nettoyer();
    C.ok('Nettoyage : drapeaux rendus, journal retiré', lignes.every((x) => drapeaux(x.id) === x.scheduled + x.sensible)
      && C.q("SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '" + DEBUT + "' AND str_TYPE_LOG IN ('" + lignes.map((x) => x.id).join("','") + "')") === '0');
  }
  process.exit(C.bilan() ? 1 : 0);
})();
