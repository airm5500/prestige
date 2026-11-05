/* CAS 3 DU 03/11/2026, TEST D'ECRAN 1 : un produit coche « sensible » suit tout le parcours de l'ordonnancier.
 *
 * Parcours a l'ecran (compte de test, KEY_GERE_ORDONCIER mis a 1 pour la duree du test) :
 *  1. Ordonnancier > onglet « Produits sensibles » : la barre commune (periode, medecin) est masquee ; recherche du
 *     produit par son CIP, clic sur la case : enregistre aussitot, journalise, visible apres rechargement ;
 *  2. Ventes : l'article tape par son CIP porte le triangle violet « ! » (retour du 05/11), qui clignote ;
 *  3. « Terminer la vente » est refuse tant qu'il n'y a pas de medecin ; le parcours client puis medecin s'ouvre, on le
 *     suit, la vente se termine ;
 *  4. Ordonnancier > Registre : la vente est la, son detail porte le motif « Sensible », l'edition PDF aussi ;
 *  5. decocher la case : le produit sort du registre, tout redevient comme avant.
 * Tout est retire a la fin : vente, medecin, client, journal, parametre, drapeaux du produit, stock, caisse.
 */
const { chromium } = require('playwright-core');
const C = require('./commun');
const fs = require('fs');
const zlib = require('zlib');

const MEDECIN = 'E2E-MED-SENS';
const NOM_MEDECIN = 'DOCTEUR ESSAI SENSIBLE';
const CLIENT = 'E2E-SENS-CLI';
const NOM_CLIENT = 'ZZSENSIBLE';
const CAISSE = 'E2E-SENS-CAISSE';
const article = C.articleSimple();
const ventes = [];
let paramAvant = null, caisseOuverte = false;
const DEBUT = C.q('SELECT NOW()');

function poser() {
  purger();
  paramAvant = C.parametreOrdonnancier('1');
  caisseOuverte = C.ouvrirCaisse(CAISSE);
  C.q("INSERT INTO medecin (id, num_ordre, nom, commentaire, created_at) VALUES ('" + MEDECIN + "', 'E2E-9002', '" + NOM_MEDECIN + "', 'recette e2e', NOW());"
    + " INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + CLIENT + "', '" + NOM_CLIENT + "', 'E2E', '6', NOW(), NOW(), 'enable');"
    + " INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, str_CODE_COMPTE_CLIENT, str_TYPE, P_KEY, dbl_QUOTA_CONSO_MENSUELLE, dbl_CAUTION, dec_Balance,"
    + " dt_CREATED, dt_UPDATED, str_STATUT, lg_CLIENT_ID, dbl_PLAFOND) VALUES ('" + CLIENT + "', '" + CLIENT + "', 'CLIENT', '" + CLIENT + "', 0, 0, 0,"
    + " NOW(), NOW(), 'enable', '" + CLIENT + "', 0)");
}
function purger() {
  C.q("DELETE FROM medecin WHERE id = '" + MEDECIN + "'; DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + CLIENT + "';"
    + " DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'");
}
function nettoyer() {
  try { C.retirerVentes(ventes); } catch (e) { console.log('Retrait des ventes incomplet : ' + String(e.message).split('\n').pop()); }
  purger();
  C.remettreArticle(article);
  if (paramAvant !== null) { C.remettreParametre(paramAvant); }
  if (caisseOuverte) { C.fermerCaisse(CAISSE); }
  C.q("DELETE FROM t_event_log WHERE str_TYPE_LOG = '" + article.id + "' AND dt_CREATED >= '" + DEBUT + "'");
}

const lire = (p, url) => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return r.json(); }, url);

(async () => {
  C.ok('Jeu d\'essai : un article simple, ni ordonnancier ni sensible', !!article.cip && article.sensible === '0', article.cip);
  poser();
  const b = await C.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');

    /* 1. l'onglet Produits sensibles */
    await C.ouvrirOnglet(p, 'Produits sensibles', 'ongletSensibles');
    C.ok('Onglet Produits sensibles : la barre commune (période, médecin) est masquée',
      !(await p.evaluate(() => Ext.ComponentQuery.query('ordonnancier #dtStart')[0].isVisible(true))));
    let lignes = await C.chercherProduits(p, 'ongletSensibles', article.cip, 'Tous');
    C.ok('La recherche par CIP rend le produit, non coché', lignes.length === 1 && lignes[0].sensible === false, JSON.stringify(lignes));
    const rep = await C.cliquerCase(p, 'ongletSensibles', 0);
    C.ok('Clic sur la case : enregistré aussitôt, sans fenêtre', rep.success === true && (await C.vues.texteMessage(p)) === '', JSON.stringify(rep));
    C.ok('is_sensible = 1 en base', C.q("SELECT is_sensible FROM t_famille WHERE lg_FAMILLE_ID = '" + article.id + "'") === '1');
    C.ok('Le cochage est journalisé (qui, quoi), sans donnée patient',
      C.q("SELECT COUNT(*) FROM t_event_log WHERE str_TYPE_LOG = '" + article.id + "' AND str_DESCRIPTION LIKE '%coché sensible%' AND dt_CREATED >= '" + DEBUT + "'") === '1');
    lignes = await C.chercherProduits(p, 'ongletSensibles', article.cip, 'Produits cochés');
    C.ok('Après rechargement, filtre « cochés » : la case reste cochée', lignes.length === 1 && lignes[0].sensible === true, JSON.stringify(lignes));

    /* 2. la vente : pastille SENSIBLE clignotante des l'ajout */
    await C.nouvelleVente(p);
    await C.taperArticle(p, article.cip);
    const venteId = await C.venteCourante(p);
    if (venteId) { ventes.push(venteId); }
    const ligne = await C.ligneVente(p, article.cip);
    C.ok('La ligne de vente porte le motif Sensible', ligne && ligne.motif === 'Sensible' && ligne.sensible === true, JSON.stringify(ligne));
    C.ok('Triangle violet « ! » (sensible) affiché sur la ligne', ligne && ligne.pastille === 'SENSIBLE' && /vp-triangle-sensible/.test(ligne.classes), ligne && ligne.classes);
    C.ok('Le triangle clignote à l'ajout (animation CSS)', ligne && ligne.animation === 'vp-triangle-clignote', ligne && ligne.animation);

    /* 3. la cloture exige un medecin ; parcours client puis medecin */
    const refus = await C.terminer(p);
    C.ok('Terminer la vente est refusé tant qu\'il n\'y a pas de médecin', !refus.ok && refus.codeError === 1 && /m[ée]decin/i.test(refus.msg), refus.msg);
    await C.visible(p, 'ordonnanceparcours');
    C.ok('Le parcours « client puis médecin » s\'ouvre', true);
    await C.vues.cliquer(p, 'ordonnanceparcours #rechercheClient');
    const repClients = p.waitForResponse((r) => /client\/lambda/.test(r.url()), { timeout: 60000 });
    await p.keyboard.type(NOM_CLIENT, { delay: 20 });
    await repClients;
    await p.waitForTimeout(800);
    const ligneClient = p.locator('.x-window:visible .x-grid-row').filter({ hasText: NOM_CLIENT }).first();
    await ligneClient.waitFor({ timeout: 15000 });
    await ligneClient.locator('.x-action-col-icon').first().click();
    await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('ordonnanceparcours')[0];
      const v = f && f.down('#volets'); return v && v.getLayout().getActiveItem().getItemId() === 'voletMedecin'; }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    C.ok('Le client est rattaché, le volet médecin s\'ouvre', C.q("SELECT IFNULL(lg_CLIENT_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === CLIENT);
    await C.vues.cliquer(p, 'ordonnanceparcours #rechercheMedecin');
    const repMed = p.waitForResponse((r) => /medecin\/medecins/.test(r.url()), { timeout: 60000 });
    await p.keyboard.type('DOCTEUR ESSAI SENS', { delay: 20 });
    await repMed;
    await p.waitForTimeout(800);
    const ligneMed = p.locator('.x-window:visible .x-grid-row').filter({ hasText: NOM_MEDECIN }).first();
    await ligneMed.waitFor({ timeout: 15000 });
    const repUpd = p.waitForResponse((r) => /vente\/update\/medecin/.test(r.url()), { timeout: 60000 });
    await ligneMed.locator('.x-action-col-icon').first().click();
    await repUpd;
    await p.waitForTimeout(1200);
    await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {});
    C.ok('Le médecin est rattaché à la vente', C.q("SELECT IFNULL(medecin_id, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === MEDECIN);
    const fin = await C.terminer(p);
    C.ok('Avec le médecin, la vente se termine', fin.ok, fin.msg);
    const ref = C.q("SELECT CONCAT_WS('|', str_STATUT, IFNULL(str_REF, '')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'").split('|');
    C.ok('La vente est close en base', ref[0] === 'is_Closed', ref.join(' '));

    /* 4. le registre, le detail, l'edition */
    await C.ouvrirOnglet(p, 'Registre', 'grilleRegistre');
    const repReg = p.waitForResponse((r) => /ventesordonnanciers\?/.test(r.url()), { timeout: 60000 });
    await C.vues.cliquer(p, 'ordonnancier #rechercher');
    await repReg;
    await p.waitForTimeout(800);
    const auRegistre = await p.evaluate((id) => Ext.ComponentQuery.query('ordonnancier #grilleRegistre')[0].getStore().findExact('lgPREENREGISTREMENTID', id), venteId);
    C.ok('La vente apparaît au registre du jour', auRegistre >= 0, auRegistre);
    const idGrille = await p.evaluate(() => Ext.ComponentQuery.query('ordonnancier #grilleRegistre')[0].getId());
    const repDetail = p.waitForResponse((r) => /ventesordonnanciers\/detail\//.test(r.url()), { timeout: 60000 });
    await p.locator('#' + idGrille + ' .x-grid-row').nth(auRegistre).locator('.x-action-col-icon').first().click();
    await repDetail;
    await p.waitForTimeout(800);
    const detail = await p.evaluate(() => { const f = Ext.ComponentQuery.query('detailproduitsvente')[0]; if (!f) { return null; }
      return { entetes: f.down('#grilleProduits').columns.map((c) => c.text || c.header), lignes: f.produitStore.getRange().map((r) => r.getData()) }; });
    C.ok('Le détail de la vente a une colonne Motif', detail && detail.entetes.indexOf('Motif') >= 0, detail && detail.entetes.join(' | '));
    C.ok('Le produit y est, avec le motif « Sensible » et sans code tableau', detail && detail.lignes.length === 1 && detail.lignes[0].motif === 'Sensible'
      && detail.lignes[0].intCIP === article.cip, JSON.stringify(detail && detail.lignes));
    await p.evaluate(() => Ext.ComponentQuery.query('detailproduitsvente').forEach((f) => f.close()));
    const jour = new Date().toISOString().slice(0, 10);
    const pdf = await lire(p, '../api/v1/ventestats/ventesordonnanciers/pdf?dtStart=' + jour + '&dtEnd=' + jour + '&medecinId=' + MEDECIN + '&query=');
    C.ok('L\'édition PDF du registre aboutit', pdf.success === true && !!pdf.url, JSON.stringify(pdf));
    if (pdf.url) {
      const chemin = require('../support/editions').fichierEdition(pdf.url);
      let texte = '';
      if (fs.existsSync(chemin)) {
        const buf = fs.readFileSync(chemin); let i = 0;
        while ((i = buf.indexOf('stream', i)) !== -1) {
          const debut = i + (buf[i + 6] === 0x0d ? 8 : 7); const fin2 = buf.indexOf('endstream', debut); if (fin2 === -1) { break; }
          try { texte += zlib.inflateSync(buf.slice(debut, fin2)).toString('latin1'); } catch (e) { /* flux non compresse */ }
          i = fin2 + 9;
        }
      }
      C.ok('L\'édition porte la colonne Motif et la mention Sensible', /Motif/.test(texte) && /Sensible/.test(texte), chemin);
    }
    const excel = await p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return { statut: r.status, taille: (await r.arrayBuffer()).byteLength }; },
      '../api/v1/ventestats/ventesordonnanciers/excel?dtStart=' + jour + '&dtEnd=' + jour + '&medecinId=' + MEDECIN + '&query=');
    C.ok('L\'export Excel du registre répond', excel.statut === 200 && excel.taille > 2000, JSON.stringify(excel));

    /* 5. decocher : tout redevient comme avant */
    await C.ouvrirOnglet(p, 'Produits sensibles', 'ongletSensibles');
    lignes = await C.chercherProduits(p, 'ongletSensibles', article.cip, 'Produits cochés');
    C.ok('Le produit est dans les cochés', lignes.length === 1 && lignes[0].sensible === true);
    const rep2 = await C.cliquerCase(p, 'ongletSensibles', 0);
    C.ok('Décocher : enregistré aussitôt', rep2.success === true && C.q("SELECT is_sensible FROM t_famille WHERE lg_FAMILLE_ID = '" + article.id + "'") === '0');
    const detailApres = await lire(p, '../api/v1/ventestats/ventesordonnanciers/detail/' + venteId);
    C.ok('Décoché, le produit ne figure plus au détail du registre (comme avant)', detailApres.success === true && (detailApres.data || []).length === 0, JSON.stringify(detailApres));
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: C.ENV_E2E.TMP + '/ordonnancier-sensible-echec.png' }).catch(() => {});
    C.ok('Parcours sans exception', false, (await C.vues.texteMessage(p).catch(() => '')) + ' ' + e.stack);
  } finally {
    await b.close();
    nettoyer();
    C.ok('Données d\'essai retirées, produit et paramètre remis',
      C.q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && C.q("SELECT COUNT(*) FROM medecin WHERE id = '" + MEDECIN + "'") === '0'
      && C.q("SELECT CONCAT(is_scheduled, is_sensible, IFNULL(int_T, '')) FROM t_famille WHERE lg_FAMILLE_ID = '" + article.id + "'") === article.scheduled + article.sensible + article.intT
      && C.q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_GERE_ORDONCIER'") === paramAvant);
  }
  process.exit(C.bilan() ? 1 : 0);
})();
