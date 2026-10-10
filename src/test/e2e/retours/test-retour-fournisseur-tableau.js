/* RETOURS FOURNISSEUR (retours du 10/10, point 7).
 *  - le menu ouvre deux onglets : « Liste des retours » (l'ecran existant) et « Tableau de bord » ;
 *  - infobulles sur tous les boutons de la barre ;
 *  - sans le droit de suppression, l'icone de suppression est masquee (plus de cadenas) ;
 *  - « Répondre » : la saisie de la reponse s'ouvre en fenetre modale au-dessus de la liste ; « Retour » ferme la
 *    fenetre sans rien valider ; quantite acceptee saisie dans la grille puis « Enregistrer » : la reponse est
 *    enregistree, la fenetre se ferme, la liste est rechargee et reprend la main ;
 *  - tableau de bord : totaux, mois, produits les plus retournes et motifs, compares a une requete independante.
 * Jeu d'essai : un retour cloture sur un BL existant (2 lignes) ; tout est retire et le BL remis en etat a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const ID = 'e2e-rf-' + Date.now(), REF = 'E2ERF' + String(Date.now()).slice(-8);
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const lignesBl = q("SELECT d.lg_BON_LIVRAISON_DETAIL, d.lg_BON_LIVRAISON_ID, d.lg_GROSSISTE_ID, d.lg_FAMILLE_ID, IFNULL(d.int_QTE_RETURN, 'NULL'), f.str_NAME"
  + " FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
  + " WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON IS NOT NULL AND d.lg_GROSSISTE_ID IS NOT NULL AND f.str_NAME <> ''"
  + " AND d.lg_BON_LIVRAISON_ID = (SELECT x.lg_BON_LIVRAISON_ID FROM t_bon_livraison_detail x JOIN t_bon_livraison y ON y.lg_BON_LIVRAISON_ID = x.lg_BON_LIVRAISON_ID"
  + "   WHERE y.str_STATUT = 'is_Closed' AND y.dt_DATE_LIVRAISON IS NOT NULL AND x.lg_GROSSISTE_ID IS NOT NULL GROUP BY x.lg_BON_LIVRAISON_ID HAVING COUNT(*) >= 2 LIMIT 1)"
  + " ORDER BY d.lg_BON_LIVRAISON_DETAIL LIMIT 2").split('\n').map((l) => l.split('\t'));
const [L1, L2] = lignesBl;
const MOTIFS = q("SELECT lg_MOTIF_RETOUR, str_LIBELLE FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 2").split('\n').map((l) => l.split('\t'));

function semer() {
  q("INSERT INTO t_retour_fournisseur (lg_RETOUR_FRS_ID, str_REF_RETOUR_FRS, lg_BON_LIVRAISON_ID, lg_GROSSISTE_ID, lg_USER_ID, dt_DATE, str_STATUT, dt_UPDATED, dt_CREATED, dl_AMOUNT)"
    + ` VALUES ('${ID}', '${REF}', '${L1[1]}', '${L1[2]}', '${ADMIN}', NOW(), 'enable', NOW(), NOW(), 0);`
    + "INSERT INTO t_retour_fournisseur_detail (lg_RETOUR_FRS_DETAIL, lg_RETOUR_FRS_ID, lg_FAMILLE_ID, lg_MOTIF_RETOUR, int_NUMBER_RETURN, int_STOCK, str_STATUT, dt_CREATED, dt_UPDATED, int_NUMBER_ANSWER, int_PAF, bonLivraisonDetail_id) VALUES"
    + ` ('${ID}-1', '${ID}', '${L1[3]}', '${MOTIFS[0][0]}', 3, 10, 'enable', NOW(), NOW(), 0, 1000, '${L1[0]}'),`
    + ` ('${ID}-2', '${ID}', '${L2[3]}', '${MOTIFS[1][0]}', 2, 10, 'enable', NOW(), NOW(), 0, 500, '${L2[0]}');`);
}
function nettoyer() {
  q(`DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${ID}'; DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${ID}';`
    + `UPDATE t_bon_livraison_detail SET int_QTE_RETURN = ${L1[4]} WHERE lg_BON_LIVRAISON_DETAIL = '${L1[0]}';`
    + `UPDATE t_bon_livraison_detail SET int_QTE_RETURN = ${L2[4]} WHERE lg_BON_LIVRAISON_DETAIL = '${L2[0]}';`);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : un BL clôturé à deux lignes et deux motifs', L1 && L2 && MOTIFS.length === 2, JSON.stringify(L1));
    semer();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    /* ----------------------------------------------------------- ouverture depuis le menu */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('retourfrsmanager', 'Retours fournisseur', ''));
    await p.waitForFunction((id) => { const g = Ext.getCmp('retourfrsmanagerID'); return g && g.isVisible() && !g.getStore().isLoading() && g.getStore().findExact('lg_RETOUR_FRS_ID', id) >= 0; }, ID, { timeout: 60000 });
    const hub = await p.evaluate(() => { const h = Ext.ComponentQuery.query('retoursfournisseur')[0];
      return { hub: !!h, onglets: h ? h.query('#ongletsRf button').map((x) => x.getText()) : [], liste: h ? h.getLayout().getActiveItem() === Ext.getCmp('retourfrsmanagerID') : false }; });
    ok('Le menu ouvre « Liste des retours » / « Tableau de bord », la liste active', hub.hub && JSON.stringify(hub.onglets) === '["Liste des retours","Tableau de bord"]' && hub.liste, JSON.stringify(hub));

    const tips = await p.evaluate(() => Ext.getCmp('retourfrsmanagerID').getDockedItems('toolbar[dock=top]')[0].query('button')
      .filter((x) => !x.tooltip).map((x) => x.getText()));
    ok('Infobulle sur chaque bouton de la barre', tips.length === 0, JSON.stringify(tips));

    /* ----------------------------------------------------------- icone de suppression */
    const icone = () => p.evaluate((id) => { const g = Ext.getCmp('retourfrsmanagerID'), n = g.getView().getNode(g.getStore().findExact('lg_RETOUR_FRS_ID', id));
      const col = g.headerCt.getGridColumns().filter((c) => c.isXType('actioncolumn') && c.items.some((i) => i.handler === g.onRemoveClick))[0];
      const k = col.items.findIndex((i) => i.handler === g.onRemoveClick), img = n.querySelectorAll('td.' + col.getCellSelector().replace(/^\./, '') + ' img.x-action-col-icon')[k]
        || [...n.querySelectorAll('img.x-action-col-icon')].filter((x) => x.className.indexOf('x-action-col-' + k) >= 0)[0];
      return img ? img.className.replace(/x-action-col-icon|x-action-col-\d+/g, '').trim() : 'absente'; }, ID);
    const droit = (v) => p.evaluate((a) => { const g = Ext.getCmp('retourfrsmanagerID'), r = g.getStore().getAt(g.getStore().findExact('lg_RETOUR_FRS_ID', a[0])); r.set('BTNDELETE', a[1]); r.commit(); }, [ID, v]);
    const avecDroit = await p.evaluate((id) => { const g = Ext.getCmp('retourfrsmanagerID'); return g.getStore().getAt(g.getStore().findExact('lg_RETOUR_FRS_ID', id)).get('BTNDELETE'); }, ID);
    await droit(true);
    const a1 = await icone();
    ok('Avec le droit : icône de suppression affichée', /unpaid/.test(a1) && !/x-hide-display/.test(a1), a1);
    await droit(false);
    const a2 = await icone();
    ok('Sans le droit : icône de suppression masquée (plus de cadenas)', /x-hide-display/.test(a2) && !/unpaid|\block\b/.test(a2), a2);
    await p.evaluate((a) => { const g = Ext.getCmp('retourfrsmanagerID'), r = g.getStore().getAt(g.getStore().findExact('lg_RETOUR_FRS_ID', a[0])); r.set('BTNDELETE', a[1]); r.commit(); }, [ID, avecDroit]);

    /* ----------------------------------------------------------- reponse en fenetre */
    const repondre = async () => {
      await p.evaluate((id) => { const g = Ext.getCmp('retourfrsmanagerID'); g.getView().getNode(g.getStore().findExact('lg_RETOUR_FRS_ID', id)).setAttribute('data-e2e', 'rf'); }, ID);
      await p.locator('[data-e2e=rf] img[data-qtip^="Saisir la réponse"]').click();
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('#fenReponseRetour')[0], g = Ext.getCmp('gridpanelReponseretourID');
        return w && w.isVisible() && g && !g.getStore().isLoading() && g.getStore().getCount() === 2; }, null, { timeout: 30000 });
    };
    await repondre();
    const f1 = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenReponseRetour')[0];
      return { modal: w.modal, titre: w.title, liste: !!Ext.getCmp('retourfrsmanagerID') && !Ext.getCmp('retourfrsmanagerID').isDestroyed,
        tips: ['btn_save_reponseretour', 'btn_cancel_reponseretour'].every((i) => !!Ext.getCmp(i).tooltip) }; });
    ok('« Répondre » : saisie en fenêtre modale, la liste reste dessous', f1.modal === true && f1.titre.indexOf(REF) >= 0 && f1.liste, JSON.stringify(f1));
    ok('Infobulles sur « Enregistrer » et « Retour »', f1.tips);
    await p.click('#btn_cancel_reponseretour');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#fenReponseRetour').length === 0, null, { timeout: 10000 });
    const apresRetour = await p.evaluate(() => ({ liste: Ext.getCmp('retourfrsmanagerID').isVisible(), me: window.Me === Ext.getCmp('retourfrsmanagerID') }));
    ok('« Retour » : la fenêtre se ferme, rien n\'est validé, la liste reprend la main', apresRetour.liste && apresRetour.me
      && q(`SELECT COALESCE(str_REPONSE_FRS, '') FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${ID}'`) === '', JSON.stringify(apresRetour));

    await repondre();
    await p.evaluate((id) => { const g = Ext.getCmp('gridpanelReponseretourID'); g.getView().getNode(g.getStore().findExact('lgRETOURFRSDETAIL', id + '-1')).setAttribute('data-e2e', 'l1'); }, ID);
    const col = await p.evaluate(() => Ext.getCmp('gridpanelReponseretourID').headerCt.getVisibleGridColumns().findIndex((c) => c.dataIndex === 'intNUMBERANSWER'));
    await p.locator('[data-e2e=l1] td').nth(col).click();
    await p.waitForTimeout(400);
    await p.keyboard.press('Control+A'); await p.keyboard.type('2'); await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const r = Ext.getCmp('gridpanelReponseretourID').getStore().findRecord('lgRETOURFRSDETAIL', id + '-1'); return r && r.get('intNUMBERANSWER') === 2 && !r.dirty; }, ID, { timeout: 15000 });
    ok('Quantité acceptée saisie dans la grille et enregistrée (2 sur 3)', q(`SELECT int_NUMBER_ANSWER FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_DETAIL = '${ID}-1'`) === '2');
    await p.click('#btn_save_reponseretour');
    await p.waitForFunction(() => Ext.Msg.isVisible(), null, { timeout: 10000 });
    await p.evaluate(() => { const b = Ext.Msg.down('button[itemId=yes]'); b.getEl().dom.setAttribute('data-e2e', 'oui'); });
    await p.click('[data-e2e=oui]');
    await p.waitForFunction(() => Ext.ComponentQuery.query('#fenReponseRetour').length === 0, null, { timeout: 30000 });
    await p.waitForFunction(() => !Ext.getCmp('retourfrsmanagerID').getStore().isLoading(), null, { timeout: 30000 });
    const base = q(`SELECT r.str_REPONSE_FRS, r.dl_AMOUNT, IFNULL(d.int_QTE_RETURN, 0) FROM t_retour_fournisseur r JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_DETAIL = '${L1[0]}' WHERE r.lg_RETOUR_FRS_ID = '${ID}'`).split('\t');
    const fin = await p.evaluate(() => ({ liste: Ext.getCmp('retourfrsmanagerID').isVisible(), me: window.Me === Ext.getCmp('retourfrsmanagerID'), ecran: Ext.ComponentQuery.query('reponseretourfournisseurmanager').length }));
    ok('« Enregistrer » : réponse enregistrée (avoir 2 × 1000), fenêtre fermée, liste rechargée', /Prise en compte de la r/.test(base[0]) && Number(base[1]) === 2000
      && Number(base[2]) === (L1[4] === 'NULL' ? 0 : Number(L1[4])) + 2 && fin.liste && fin.me && fin.ecran === 0, JSON.stringify({ base, fin }));

    /* ----------------------------------------------------------- tableau de bord */
    await p.evaluate(() => { const h = Ext.ComponentQuery.query('retoursfournisseur')[0]; h.down('#rf-tableau').getEl().dom.setAttribute('data-e2e', 'onglet'); });
    await p.click('[data-e2e=onglet]');
    await p.waitForFunction(() => { const h = Ext.ComponentQuery.query('retoursfournisseur')[0], c = h.down('#tbContenu'); return c.getEl() && c.getEl().dom.querySelector('.rf-par-mois'); }, null, { timeout: 60000 });
    const crit = await p.evaluate(() => Ext.ComponentQuery.query('retoursfournisseur')[0].criteresTableau());
    const where = ` FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE r.str_STATUT = 'enable' AND DATE(r.dt_UPDATED) BETWEEN '${crit.dtStart}' AND '${crit.dtEnd}'`;
    const [nR, qte, acc, mt] = q('SELECT COUNT(DISTINCT r.lg_RETOUR_FRS_ID), SUM(d.int_NUMBER_RETURN), SUM(d.int_NUMBER_ANSWER), SUM(d.int_NUMBER_RETURN * d.int_PAF)' + where).split('\t').map(Number);
    const nMois = Number(q("SELECT COUNT(DISTINCT DATE_FORMAT(r.dt_UPDATED, '%Y-%m'))" + where));
    const tb = await p.evaluate((nom) => { const d = Ext.ComponentQuery.query('retoursfournisseur')[0].down('#tbContenu').getEl().dom, h = Ext.ComponentQuery.query('retoursfournisseur')[0];
      const v = [...d.querySelectorAll('.pml-tuile')].map((t) => t.querySelector('.pml-tuile-valeur').textContent.replace(/\s/g, ''));
      return { tuiles: v, mois: d.querySelectorAll('tr.rf-mois').length, produits: [...d.querySelectorAll('tr.rf-produit')].map((r) => r.textContent),
        motifs: [...d.querySelectorAll('tr.rf-motif td:first-child')].map((x) => x.textContent), donnees: h.donnees.total,
        tips: h.down('#tableauRetours').getDockedItems('toolbar[dock=top]')[0].query('button,combobox,datefield').filter((x) => !x.tooltip).length }; }, L1[5]);
    ok('Tuiles = requête indépendante (retours, quantité, acceptée, montant)', tb.tuiles[0] === String(nR) && tb.tuiles[1] === String(qte) && tb.tuiles[2] === String(acc)
      && tb.tuiles[3] === mt + 'F', JSON.stringify({ tuiles: tb.tuiles, attendu: [nR, qte, acc, mt] }));
    ok('Une ligne par mois de la période (' + nMois + ')', tb.mois === nMois, tb.mois);
    ok('Produits les plus retournés : le produit du jeu d\'essai y figure', tb.produits.some((t) => t.indexOf(L1[5]) >= 0), tb.produits.slice(0, 3).join(' | '));
    ok('Motifs les plus utilisés : les deux motifs du jeu d\'essai', [MOTIFS[0][1], MOTIFS[1][1]].every((m) => tb.motifs.indexOf(m) >= 0), JSON.stringify(tb.motifs));
    ok('Infobulles sur les critères et boutons du tableau', tb.tips === 0, tb.tips);

    /* filtre par grossiste : seuls ses retours */
    await p.evaluate((g) => { const h = Ext.ComponentQuery.query('retoursfournisseur')[0], c = h.tableau.down('#tbGrossiste'); h.donnees = null; c.setValue(g); h.chargerTableau(); }, L1[2]);
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('retoursfournisseur')[0].donnees, null, { timeout: 30000 });
    const qg = Number(q('SELECT SUM(d.int_NUMBER_RETURN)' + where + ` AND r.lg_GROSSISTE_ID = '${L1[2]}'`));
    const tg = await p.evaluate(() => Ext.ComponentQuery.query('retoursfournisseur')[0].donnees.total.quantite);
    ok('Filtre grossiste : quantité de ce grossiste seulement', tg === qg, tg + ' / ' + qg);

    await p.evaluate(() => Ext.ComponentQuery.query('retoursfournisseur')[0].afficher('liste'));
    ok('Retour à la liste', await p.evaluate(() => Ext.getCmp('retourfrsmanagerID').isVisible()));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : retour retiré, BL remis', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${ID}'`) === '0'
      && q(`SELECT IFNULL(int_QTE_RETURN, 'NULL') FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${L1[0]}'`) === L1[4]);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
