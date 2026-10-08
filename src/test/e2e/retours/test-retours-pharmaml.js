/* RETOURS FOURNISSEURS ET RECLAMATIONS PAR PHARMAML (retours du 08/10 (13)).
 * Faux grossiste local ; bon de livraison du banc (2 produits) ; par les ecrans :
 *  - etat de controle des achats : icone « Retour fournisseur » sur la ligne -> ecran de retour, bon et grossiste choisis ;
 *  - 2 lignes : PC produits casses (-> demande de retour 0104) et EL erreur livraison (-> reclamation 0102, action 0004) ;
 *  - « Envoyer par PharmaML » : REQ_RETOUR (document = bon) et RECLAMATIONS conformes ; fin de service : en attente ;
 *    bouton bloque (pas de double envoi) ;
 *  - plus tard, « Réponses PharmaML » : bon de retour (ligne refusee, 0 accepte) et reponse a la reclamation ;
 *    ecran : « Réponse du grossiste reçue », ligne « Accepté 0 / 1 » ;
 *  - ligne reclamation retiree, validation : la ligne refusee ne sort pas du stock (aucun mouvement) ;
 *  - aucune erreur JavaScript ; tout est retire (retour, attentes, notification, archives) et le grossiste restaure.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const archives = require('./archives-pharmaml');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || '/tmp';
const PORT = 18783;
/* bon de livraison du banc : numero unique, 2 a 5 produits recus et en stock */
const BL = process.env.BL_RETOUR || execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', "SELECT b.str_REF_LIVRAISON FROM t_bon_livraison b"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " AND s.int_NUMBER_AVAILABLE > 2 WHERE d.int_QTE_RECUE >= 1 AND b.str_STATUT <> 'delete'"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " GROUP BY b.lg_BON_LIVRAISON_ID HAVING COUNT(DISTINCT d.lg_FAMILLE_ID) BETWEEN 2 AND 5 ORDER BY b.dt_CREATED DESC LIMIT 1"], { encoding: 'utf8' }).trim();
const recus = [];
const depot = [];
const avant = new Set(archives.fichiers());
let G = '', sauve = null, retourId = '', intervalle = '30';

const env = (corps, enRep) => '<?xml version="1.0" encoding="UTF-8"?><CSRP_ENVELOPPE xmlns="urn:x-csrp:fr.csrp.protocole:enveloppe" Nature_Action="REP_EMISSION" Version_Protocole="1.0.0.0"><ENTETE><REF_MESSAGE>T' + Date.now() + Math.floor(Math.random() * 1000)
  + '</REF_MESSAGE>' + (enRep ? '<EN_REPONSE_A>' + enRep + '</EN_REPONSE_A>' : '') + '</ENTETE><CORPS>' + corps + '</CORPS></CSRP_ENVELOPPE>';
const msg = (corps) => '<MESSAGE_REPARTITEUR xmlns="urn:x-csrp:fr.csrp.protocole:message"><CORPS>' + corps + '</CORPS></MESSAGE_REPARTITEUR>';
const serveur = http.createServer((req, rep) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
  recus.push(b);
  rep.writeHead(200, { 'Content-Type': 'text/xml' });
  const refMsg = (b.match(/<REF_MESSAGE>([^<]*)</) || [])[1];
  if (/REQ_RETOUR|RECLAMATIONS/.test(b)) { rep.end(env('<ACTION>FIN_SERVICE</ACTION>', refMsg)); return; }
  if (/VIDAGE|ACQUITTEMENT/.test(b)) { rep.end(depot.length ? depot.shift() : env('<ACTION>FIN_SERVICE</ACTION>')); return; }
  rep.end(env('<ACTION>FIN_SERVICE</ACTION>'));
}); });

function nettoyer() {
  const ids = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(\"'\", lg_RETOUR_FRS_ID, \"'\")), \"''\") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = 'E2E-RETOUR-PML'");
  exec("DELETE FROM notification WHERE entity_ref IN (" + ids + ");"
    + "DELETE FROM t_pharmaml_attente WHERE lg_SOURCE_ID IN (" + ids + ") OR (str_STATUT = 'ORPHELINE' AND str_SOURCE IN ('RETOUR', 'RECLAM') AND dt_ENVOI > NOW() - INTERVAL 1 HOUR);"
    + "DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (" + ids + ");"
    + "DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (" + ids + ");");
}

(async () => {
  await new Promise((r) => serveur.listen(PORT, '127.0.0.1', r));
  G = q("SELECT o.lg_GROSSISTE_ID FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE b.str_REF_LIVRAISON = '" + BL + "' LIMIT 1");
  sauve = q("SELECT CONCAT(IFNULL(str_URL_PHARMAML, 'NULL'), '|', IFNULL(str_PHARMAML_VERSION_CMDE, 'NULL')) FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'").split('|');
  intervalle = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_PHARMAML_VIDAGE_MESSAGES_MIN'), '30')");
  exec("UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = 'KEY_PHARMAML_VIDAGE_MESSAGES_MIN'");
  exec("UPDATE t_grossiste SET str_URL_PHARMAML = 'http://127.0.0.1:" + PORT + "/ok/', str_PHARMAML_VERSION_CMDE = '1.0.0.0' WHERE lg_GROSSISTE_ID = '" + G + "'");
  nettoyer();
  const produits = q("SELECT GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, ':', s.int_NUMBER_AVAILABLE) ORDER BY f.str_NAME SEPARATOR '|') FROM t_bon_livraison b"
    + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
    + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE b.str_REF_LIVRAISON = '" + BL + "'").split('|').map((x) => x.split(':'));
  const motif = (code) => q("SELECT lg_MOTIF_RETOUR FROM t_motif_retour WHERE str_CODE = '" + code + "'");
  const { chromium } = require('playwright-core');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const fermer = async () => { await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } }); };
  const ajouterLigne = async (familleId, motifId) => {
    await p.evaluate(async ([f, m]) => {
      const c = Ext.getCmp('str_NAME');
      await new Promise((r) => c.getStore().load({ callback: r }));
      const rec = c.getStore().findRecord('lg_FAMILLE_ID', f, 0, false, false, true);
      c.select(rec); c.fireEvent('select', c, [rec]);
      const mo = Ext.getCmp('lg_MOTIF_RETOUR');
      await new Promise((r) => mo.getStore().load({ callback: r }));
      const mr = mo.getStore().findRecord('lgMOTIFRETOUR', m, 0, false, false, true);
      mo.select(mr); mo.fireEvent('select', mo, [mr]);
      Ext.getCmp('int_QUANTITE').setValue(1);
    }, [familleId, motifId]);
    const n = await p.evaluate(() => Ext.getCmp('gridpanelID').getStore().getCount());
    await p.focus('#' + await p.evaluate(() => Ext.getCmp('int_QUANTITE').inputEl.dom.id));
    await p.keyboard.press('Enter');
    try {
      await p.waitForFunction((k) => Ext.getCmp('gridpanelID').getStore().getCount() === k + 1 && !Ext.getCmp('gridpanelID').getStore().isLoading(), n, { timeout: 30000 });
    } catch (x) {
      throw new Error('ligne non ajoutee : ' + JSON.stringify(await p.evaluate(() => ({ boite: Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '',
        famille: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(), nom: Ext.getCmp('str_NAME').getValue(), motif: Ext.getCmp('lg_MOTIF_RETOUR').getValue(),
        n: Ext.getCmp('gridpanelID').getStore().getCount(), courant: Ext.ComponentQuery.query('retourfournisseurmanagerlist')[0].idRetour() }))));
    }
    await p.waitForTimeout(800);
  };
  const etatEcran = () => p.evaluate(() => {
    const g = Ext.getCmp('gridpanelID'), bt = Ext.getCmp('btn_retour_pml'), col = g.down('#colRetourPml');
    return { etat: Ext.getCmp('retourPmlEtat').getEl().dom.textContent, bouton: bt.getText(), actif: !bt.isDisabled(),
      lignes: g.getStore().getRange().map((r) => { const n = g.getView().getNode(r), c = n && n.querySelector('.x-grid-cell-colRetourPml .x-grid-cell-inner');
        return { id: r.get('lgRETOURFRSDETAIL'), pml: c ? c.textContent : '', coupe: c ? c.scrollWidth > c.clientWidth + 1 : true }; }),
      tronques: [...g.getEl().dom.querySelectorAll('.x-column-header-inner')].filter((h) => h.textContent.trim() && h.scrollWidth > h.clientWidth + 1).map((h) => h.textContent) };
  });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* etat de controle des achats -> icone retour fournisseur */
    const jour = q("SELECT DATE_FORMAT(dt_CREATED, '%Y-%m-%d') FROM t_bon_livraison WHERE str_REF_LIVRAISON = '" + BL + "' LIMIT 1");
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etatscontrolemanager', 'Etat de contrôle', ''));
    await p.waitForFunction(() => !!Ext.getCmp('datedebut'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    /* recherche par l'ecran : periode large, numero du bon dans le champ de recherche */
    await p.evaluate(([j, bl]) => { Ext.getCmp('datedebut').setValue(Ext.Date.add(Ext.Date.parse(j, 'Y-m-d'), Ext.Date.DAY, -60)); Ext.getCmp('datefin').setValue(new Date());
      Ext.getCmp('rechecher').setValue(bl); Ext.ComponentQuery.query('etatscontrolemanager')[0].onRechClick(); }, [jour, BL]);
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('strREFLIVRAISON', bl) >= 0; }, BL, { timeout: 60000 });
    await p.waitForTimeout(600);
    await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('etatscontrolemanager')[0], r = g.getStore().getAt(g.getStore().findExact('strREFLIVRAISON', bl));
      g.getView().getNode(r).querySelector('img.retour-frs-ligne').id = 'e2e-retour-frs'; }, BL);
    const bulle = await p.evaluate(() => document.getElementById('e2e-retour-frs').getAttribute('data-qtip'));
    await p.click('#e2e-retour-frs');
    await p.waitForFunction((bl) => { const c = Ext.getCmp('lg_BON_LIVRAISON_ID'); return c && c.getValue() === bl && !Ext.getCmp('str_NAME').isDisabled(); }, BL, { timeout: 30000 });
    const ouvert = await p.evaluate(() => ({ g: Ext.getCmp('str_GROSSISTE_LIBELLE').getValue(), titre: testextjs.app.getController('App').getContentPanel().title }));
    ok('État de contrôle : icône « Retour fournisseur » sur la ligne -> écran de retour, bon et grossiste déjà choisis',
      /Retour fournisseur/.test(bulle) && ouvert.g && !/object/.test(ouvert.g), JSON.stringify(ouvert) + ' ' + bulle);

    /* deux lignes : produit casse (retour) et erreur de livraison (reclamation) */
    await p.evaluate(() => Ext.getCmp('str_COMMENTAIRE').setValue('E2E-RETOUR-PML'));
    await ajouterLigne(produits[0][0], motif('PC'));
    await ajouterLigne(produits[1][0], motif('EL'));
    retourId = q("SELECT lg_RETOUR_FRS_ID FROM t_retour_fournisseur WHERE str_COMMENTAIRE = 'E2E-RETOUR-PML' LIMIT 1");
    await p.waitForFunction(() => !Ext.getCmp('btn_retour_pml').isDisabled(), null, { timeout: 20000 });
    let e = await etatEcran();
    ok('Écran de retour : colonne PharmaML (destination de chaque ligne selon son motif), bouton « Envoyer par PharmaML » actif',
      retourId && e.actif && e.lignes.length === 2 && e.lignes.some((l) => /Demande de retour 0104/.test(l.pml)) && e.lignes.some((l) => /Réclamation 0102/.test(l.pml))
      && e.lignes.every((l) => !l.coupe) && e.tronques.length === 0, JSON.stringify(e));
    await p.screenshot({ path: SORTIE + '/retour-pml-avant.png' });

    /* envoi */
    recus.length = 0;
    await p.evaluate(() => { Ext.getCmp('btn_retour_pml').getEl().dom.id = 'e2e-envoyer'; });
    await p.click('#e2e-envoyer');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.title === 'Envoyer par PharmaML', null, { timeout: 10000 });
    await p.evaluate(() => { Ext.MessageBox.down('button[itemId=yes]').getEl().dom.id = 'e2e-oui'; });
    await p.click('#e2e-oui');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && /Envoi PharmaML/.test(Ext.MessageBox.title || ''), null, { timeout: 60000 });
    const resume = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await fermer();
    const demande = recus.find((x) => /REQ_RETOUR/.test(x)) || '', reclam = recus.find((x) => /RECLAMATIONS/.test(x)) || '';
    ok('Demande de retour : référence, bon de livraison d\'origine, 1 ligne motif 0104',
      /Ref_Demande_Retour="RT/.test(demande) && new RegExp('<DOCUMENT Nature_Document="0002" Ref_Document="' + BL + '"/>').test(demande)
      && (demande.match(/<LIGNE /g) || []).length === 1 && /Motif="0104"/.test(demande), resume + ' ' + demande.slice(0, 600));
    ok('Réclamation : sur le bon de livraison, 1 ligne motif 0102, action 0004 (reprise avec re-livraison)',
      new RegExp('Ref_Reclamation="RC[^"]*" Nature_Document="0002" Ref_Document="' + BL + '"').test(reclam) && /Motif="0102" Action="0004"/.test(reclam) && /<PRODUIT_FACTURE /.test(reclam), reclam.slice(0, 600));
    await p.waitForFunction(() => /réponse du grossiste attendue/.test(Ext.getCmp('retourPmlEtat').getEl().dom.textContent), null, { timeout: 20000 });
    e = await etatEcran();
    ok('Fin de service : « en attente de réponse », bouton bloqué (pas de double envoi)', /réponse sera récupérée/.test(resume) && !e.actif && /réponse attendue/.test(e.bouton)
      && q("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + retourId + "' AND str_STATUT = 'EN_ATTENTE'") === '2', resume + ' ' + JSON.stringify(e));
    const double = await p.evaluate(async (id) => JSON.parse(await (await fetch('../api/v1/pharma/retour/' + id, { method: 'POST' })).text()), retourId);
    ok('Renvoi refusé par le serveur tant que la réponse est attendue', double.success === false && /réponse du grossiste est attendue/.test(double.msg), JSON.stringify(double));

    /* plus tard : bon de retour (ligne refusee) et reponse a la reclamation */
    const refDemande = (demande.match(/Ref_Demande_Retour="([^"]*)"/) || [])[1];
    const refMsgReclam = (reclam.match(/<REF_MESSAGE>([^<]*)</) || [])[1];
    const cipRetour = (demande.match(/Code_Produit="([^"]*)"/) || [])[1];
    /* la reponse a la reclamation arrive avant le bon de retour : les deux doivent rester visibles */
    depot.push(env(msg('<LIBRE Ref_Info_Libre="REC1" Commentaire="Avoir de 1 boîte établi sur la prochaine facture"/>'), refMsgReclam),
      env(msg('<BON_RETOUR Ref_Demande_Retour="' + refDemande + '" Ref_Bon_Retour="BR-E2E-1"><LIGNE Num_Ligne="1" Num_Ligne_Demande="1" Type_Codification="CIP39" Code_Produit="' + cipRetour
      + '" Quantite_acceptee="0" Commentaire="Refusé : produit hors délai"/></BON_RETOUR>')));
    const vid = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/pharma/reponses', { method: 'POST' })).text()));
    const statuts = (vid.grossistes || []).flatMap((x) => (x.messages || []).map((m) => m.statut + ':' + (m.source || '')));
    const repReclam = q("SELECT IFNULL(str_PML_DETAIL, '') FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '" + retourId + "'");
    ok('Réponse à la réclamation (information libre) reprise', /Avoir de 1 boîte/.test(q("SELECT str_DETAIL FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + retourId + "' AND str_SOURCE = 'RECLAM'")), repReclam);
    ok('Vidage : bon de retour et réponse à la réclamation rattachés', statuts.filter((s) => /^TRAITEE/.test(s)).length === 2
      && q("SELECT COUNT(*) FROM t_pharmaml_attente WHERE lg_SOURCE_ID = '" + retourId + "' AND str_STATUT = 'TRAITEE'") === '2', JSON.stringify(statuts));
    await p.evaluate(() => Ext.getCmp('gridpanelID').getStore().load({ params: { retourId: Ext.ComponentQuery.query('retourfournisseurmanagerlist')[0].idRetour() } }));
    await p.waitForFunction(() => /Réponse du grossiste reçue/.test(Ext.getCmp('retourPmlEtat').getEl().dom.textContent), null, { timeout: 20000 });
    e = await etatEcran();
    ok('Écran : « Réponse du grossiste reçue », ligne « Accepté 0 / 1 », bouton bloqué',
      e.lignes.some((l) => /Accepté 0 \/ 1/.test(l.pml)) && !e.actif && /Répondu/.test(e.bouton) && /BR-E2E-1/.test(e.etat) && /Réclamation : réponse à la réclamation/.test(e.etat), JSON.stringify(e));
    const ligne = q("SELECT CONCAT(int_PML_QTE_ACCEPTEE, '|', int_NUMBER_ANSWER, '|', str_PML_COMMENTAIRE) FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '" + retourId + "' AND str_PML_TYPE = 'RETOUR'");
    ok('Ligne : quantité acceptée 0, réponse pré-remplie, commentaire du grossiste', ligne === '0|0|Refusé : produit hors délai', ligne);
    await p.screenshot({ path: SORTIE + '/retour-pml-reponse.png' });

    /* validation : retirer la ligne reclamation (ecran), valider -> la ligne refusee ne sort pas du stock */
    const idReclam = q("SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '" + retourId + "' AND str_PML_TYPE = 'RECLAMATION'");
    const sup = await p.evaluate(async (id) => (await fetch('../api/v1/retourfournisseur/remove-item/' + id, { method: 'DELETE' })).status, idReclam);
    const stockAvant = q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produits[0][0] + "' AND lg_EMPLACEMENT_ID = '1'");
    const mvtAvant = q("SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID = '" + produits[0][0] + "'");
    await p.evaluate(() => Ext.getCmp('gridpanelID').getStore().load({ params: { retourId: Ext.ComponentQuery.query('retourfournisseurmanagerlist')[0].idRetour() } }));
    await p.waitForTimeout(800);
    await p.evaluate(() => { Ext.getCmp('btn_save').getEl().dom.id = 'e2e-valider'; });
    await p.click('#e2e-valider');
    await p.waitForFunction(() => Ext.MessageBox.isVisible() && Ext.MessageBox.title === 'Confirmation', null, { timeout: 10000 });
    await p.evaluate(() => { Ext.MessageBox.down('button[itemId=yes]').getEl().dom.id = 'e2e-oui2'; });
    await p.click('#e2e-oui2');
    for (let i = 0; i < 40 && q("SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '" + retourId + "'") !== 'enable'; i++) { await p.waitForTimeout(500); }
    const apres = q("SELECT CONCAT(r.str_STATUT, '|', d.str_STATUT, '|', d.int_NUMBER_RETURN, '|', d.int_PML_QTE_DEMANDEE) FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE r.lg_RETOUR_FRS_ID = '" + retourId + "'");
    const stockApres = q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produits[0][0] + "' AND lg_EMPLACEMENT_ID = '1'");
    const mvtApres = q("SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID = '" + produits[0][0] + "'");
    ok('Validation : la ligne refusée par le grossiste ne sort pas du stock (stock et mouvements inchangés, demande conservée)',
      sup < 400 && apres === 'enable|enable|0|1' && stockAvant === stockApres && mvtAvant === mvtApres, apres + ' stock ' + stockAvant + '->' + stockApres + ' mvt ' + mvtAvant + '->' + mvtApres);
    await fermer();

    const journal = archives.fichiers().filter((f) => /^log\//.test(f)).map((f) => fs.readFileSync(path.join(archives.DOSSIER, f), 'utf8')).join('\n');
    const rangees = archives.fichiers().filter((f) => !avant.has(f) && /^retours\//.test(f));
    ok('Archives rangées dans retours/AAAA-MM (demande, réclamation, réponses) et journal RETOUR / RECLAMATION', rangees.length >= 4 && /RETOUR.*BON DE RETOUR/.test(journal) && /RECLAMATION.*DEMANDE/.test(journal), JSON.stringify(rangees));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (ex) {
    ok('Exécution sans exception', false, ex.stack);
    await p.screenshot({ path: SORTIE + '/retour-pml-erreur.png' }).catch(() => {});
  } finally {
    await b.close();
    serveur.close();
    nettoyer();
    exec("UPDATE t_grossiste SET str_URL_PHARMAML = " + (sauve[0] === 'NULL' ? 'NULL' : "'" + sauve[0] + "'") + ", str_PHARMAML_VERSION_CMDE = " + (sauve[1] === 'NULL' ? 'NULL' : "'" + sauve[1] + "'") + " WHERE lg_GROSSISTE_ID = '" + G + "'");
    exec("UPDATE t_parameters SET str_VALUE = '" + intervalle + "' WHERE str_KEY = 'KEY_PHARMAML_VIDAGE_MESSAGES_MIN'");
    archives.fichiers().filter((f) => !avant.has(f) && !/^log\//.test(f)).forEach((f) => fs.unlinkSync(path.join(archives.DOSSIER, f)));
    ok('Nettoyage : retour, attentes et notification retirés, grossiste restauré', q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = 'E2E-RETOUR-PML'") === '0'
      && q("SELECT IFNULL(str_URL_PHARMAML, 'NULL') FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + G + "'") === sauve[0]);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
