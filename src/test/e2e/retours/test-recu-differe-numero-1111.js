/* PLAN DU 10/11, POINT 1 : RECU DE REGLEMENT D'UN DIFFERE, NUMERO DE LA VENTE A LA PLACE DE L'IDENTIFIANT INTERNE.
 *
 * Defaut : le recu imprime apres « Faire un réglement » (titre « REÇU DE RÈGLEMENT · DIFFÉRÉ ») listait « Vente <uuid> »,
 * l'uuid etant t_dossier_reglement_detail.str_REF = identifiant de la dette (t_preenregistrement_compte_client),
 * inconnu de l'utilisateur. Attendu : « Vente N° <numero> du jj/mm/aaaa », le numero etant celui des autres tickets
 * (str_REF de la vente si KEY_SHOW_NUMERO_TICKET vaut 1, sinon str_REF_TICKET), la date celle de la vente
 * (t_preenregistrement.dt_CREATED) ; le montant de la ligne reste le montant regle sur cette vente (dbl_AMOUNT du detail).
 *
 * Parcours :
 *  1. Mise en place par les aides d'API (comme audits/repro-differes.js) : un client d'essai « ZZAUDIT RD1111 » et
 *     trois ventes comptant mises en differe (mode 4, rien recu), quantites 1, 2 et 3 : trois dettes differentes.
 *  2. Reglement par l'ECRAN, avec de vrais clics : volet du menu > FACTURATION > « Gestion des différés », onglet de la
 *     liste des reglements, bouton « Faire un réglement » (fenetre), client tape puis choisi dans la liste, « Type
 *     Paiement » = « Partiel » (toutes les ventes cochees par defaut), la vente de quantite 1 decochee d'un clic sur sa
 *     case, montant recu PARTIEL en especes (plus que la plus grosse des deux dettes cochees, moins que leur somme :
 *     les deux ventes recoivent une part, quel que soit l'ordre de ventilation), « Valider ». A la question « Voulez-vous
 *     imprimer le ticket ? », « Non » : rien ne part a l'imprimante (le test passe aussi sur un poste sans imprimante).
 *     Le dossier de reglement est celui de la reponse de reglementdiffere, verifie en base.
 *  3. Rapprochement ecran / recu / base, ligne par ligne, par l'apercu sans impression (GET
 *     api/v1/reglement/ticket/{dossier}/apercu, session de l'ecran), avec le parametre KEY_SHOW_NUMERO_TICKET a sa
 *     valeur du poste PUIS a l'autre valeur (0 et 1, remis a la fin) :
 *      - une ligne du bloc CORPS par vente cochee, libelle = « Vente N° <numero> du <date> » (numero et date lus en base
 *        par la dette), montant = dbl_AMOUNT du detail ; aucun uuid ni identifiant de dette dans tout le recu ;
 *      - somme des lignes = « RÉGLÉ » imprime = t_dossier_reglement.dbl_AMOUNT = montant saisi a l'ecran ;
 *      - « Montant dû (n ventes) » imprime = reste avant reglement des seules ventes cochees = « Net à payer » de
 *        l'ecran, n = nombre de ventes cochees ;
 *      - « Reste sur ces ventes » = leur reste en base apres reglement = du - regle ;
 *      - « Solde restant du client » (accord du 11/11) = solde du client en base apres reglement (somme des
 *        int_PRICE_RESTE de toutes ses dettes, vente non cochee comprise) = dbl_MONTANT_ATTENDU - regle ;
 *      - le numero de chaque vente cochee affiche dans la grille (colonne « Référence.Bon » = str_REF) est le str_REF de
 *        la base, et se retrouve tel quel dans le recu quand le parametre vaut 1 ; avec 0, le recu porte str_REF_TICKET ;
 *        la date de la grille est celle du recu ;
 *      - la vente non cochee n'apparait ni dans le recu (ni son numero, ni son numero de ticket) ni dans les details.
 *  4. Bilan avant / apres : une seule ligne t_dossier_reglement, autant de details que de ventes cochees, un seul
 *     t_reglement, un seul t_mvt_caisse et une seule mvttransaction pour le dossier (et rien d'autre cree par le
 *     compte de test pendant la validation), aucune vente creee ; dettes cochees : reste apres = reste avant - part,
 *     jamais negatif ; dette non cochee inchangee ; somme des parts = montant regle ; aucune demande d'impression.
 *  5. Nettoyage complet (finally) par C.nettoyer() : ventes, dettes, dossier et details, reglements, mouvements de
 *     caisse et transactions du dossier, notifications et journal du compte de test, client et compte, produit (stock)
 *     et parametre remis.
 *
 * Ancien code : lignes « Vente <uuid> » (et pas d'apercu) : les controles du recu echouent.
 * Lancement seul (jamais en meme temps qu'un autre test d'ecran) : node src/test/e2e/retours/test-recu-differe-numero-1111.js
 */
const C = require('../audits/commun');
const vues = require('../outils/vues');
const { q, exec, MARQUE } = C;

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); C.ok(n, c, d); }
const lignes = (s) => String(s || '').replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean);
const chiffres = (t) => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-/i;
const CLE = 'KEY_SHOW_NUMERO_TICKET';
const CLIENT = MARQUE + '-CL-RD1111';
const NOM = MARQUE + ' RD1111';

/* recu lu par l'apercu : lignes du bloc CORPS, paires de tous les blocs, tous les textes (sauf l'image du pied) */
function lireRecu(t) {
  const corps = [], paires = [], textes = [];
  for (const b of t.blocs || []) {
    for (const e of b.elements || []) {
      ['a', 'b', 'c', 'd'].forEach((k) => { if (e[k] && !(e.genre === 'PIED' && k === 'a')) { textes.push(String(e[k])); } });
      if (b.id === 'CORPS' && e.genre === 'PAIRE') { corps.push({ libelle: String(e.a || '').trim(), montant: chiffres(e.b), brut: e.b }); }
      if (e.genre === 'PAIRE' || e.genre === 'ENCADRE') { paires.push({ bloc: b.id, libelle: String(e.a || '').replace(/\s*:\s*$/, '').trim(), valeur: e.b }); }
    }
  }
  const paire = (re) => paires.find((x) => re.test(x.libelle));
  return { corps, paires, textes, texte: textes.join(' | '), paire };
}

(async () => {
  let sess = null;
  const impressions = [];
  try {
    /* ---------------------------------------------------------------- 1. mise en place */
    C.ouvrirCaisse();
    /* prix multiple de 5 : « Montant dû » et « Montant versé » sont arrondis a 5 F sur le recu */
    const P = C.produit(0, 500, ' AND MOD(f.int_PRICE, 5) = 0');
    exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + CLIENT + "', 'Client', '" + NOM + "', 'enable', NOW());"
      + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + CLIENT + "-cpt', '" + CLIENT + "', 'enable', NOW())");
    sess = await C.connecter();
    const { p, api } = sess;
    p.on('request', (r) => { if (/\/api\/v1\/reglement\/ticket\//.test(r.url()) && r.method() === 'PUT') { impressions.push(r.url()); } });
    const V = C.venteComptant(api);
    const ventes = {};
    for (const [k, qte] of [['A', 1], ['B', 2], ['C', 3]]) {
      ventes[k] = await V.vendre(P, qte, { mode: '4', clientId: CLIENT, recu: 0 });
      if (!ventes[k]) { throw new Error('vente différée ' + k + ' (quantité ' + qte + ') non clôturée'); }
    }
    /* dette de chaque vente : id | reste | str_REF | str_REF_TICKET | date de la vente */
    const dette = (v) => {
      const r = q("SELECT CONCAT_WS('|', tp.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, tp.int_PRICE_RESTE, p.str_REF, p.str_REF_TICKET, DATE_FORMAT(p.dt_CREATED, '%d/%m/%Y'))"
        + " FROM t_preenregistrement_compte_client tp JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID"
        + " WHERE tp.lg_PREENREGISTREMENT_ID = '" + v + "' LIMIT 1").replace(/\r/g, '').split('|');
      return { id: r[0], reste: Number(r[1]), ref: r[2], ticket: r[3], date: r[4] };
    };
    const avant = { A: dette(ventes.A), B: dette(ventes.B), C: dette(ventes.C) };
    const soldeClient = () => Number(q("SELECT COALESCE(SUM(tp.int_PRICE_RESTE), 0) FROM t_preenregistrement_compte_client tp JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = tp.lg_COMPTE_CLIENT_ID"
      + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID WHERE cc.lg_CLIENT_ID = '" + CLIENT + "' AND p.b_IS_CANCEL = 0 AND tp.str_STATUT = 'is_Closed'"));
    const restesAvant = [avant.A.reste, avant.B.reste, avant.C.reste];
    ok('Mise en place : trois ventes différées de montants différents (quantités 1, 2, 3), restes multiples de 5',
      new Set(restesAvant).size === 3 && restesAvant.every((x) => x > 0 && x % 5 === 0) && avant.A.id && avant.B.id && avant.C.id,
      'restes ' + restesAvant.join(' / '));
    const grand = Math.max(avant.B.reste, avant.C.reste), petit = Math.min(avant.B.reste, avant.C.reste);
    const montant = grand + 5 * Math.max(1, Math.floor(petit / 10));
    ok('Mise en place : montant partiel ' + montant + ' > plus grosse dette cochée (' + grand + ') et < leur somme (' + (avant.B.reste + avant.C.reste) + ')',
      montant > grand && montant < avant.B.reste + avant.C.reste && montant % 5 === 0);

    /* ---------------------------------------------------------------- 2. reglement par l'ecran */
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0];
      return n && n.getStore().getRootNode().childNodes.length > 0 && !n.getStore().isLoading(); }, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await vues.ouvrirMenu(p, 'FACTURATION', 'Gestion des différés');
    await p.waitForFunction(() => Ext.ComponentQuery.query('delayed #doreglement').length > 0, null, { timeout: 30000 });
    /* le bouton est dans l'onglet de la liste des reglements : clic sur l'onglet s'il n'est pas devant */
    const onglet = await p.evaluate(() => { const bt = Ext.ComponentQuery.query('delayed #doreglement')[0]; if (bt.isVisible(true)) { return ''; }
      let c = bt; while (c.ownerCt && !(c.ownerCt instanceof Ext.tab.Panel)) { c = c.ownerCt; } return c.tab ? c.tab.getId() : null; });
    if (onglet) { await p.click('#' + onglet); await p.waitForTimeout(500); }
    await vues.cliquer(p, 'delayed #doreglement');
    await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('fairereglement').find((x) => x.isVisible(true));
      return f && f.down('#typeReglement').getValue() === '1'; }, null, { timeout: 30000 });

    /* client : saisie au clavier dans la liste deroulante, puis clic sur la ligne proposee */
    const champClient = await p.evaluate(() => Ext.ComponentQuery.query('fairereglement #client')[0].inputEl.dom.id);
    await p.click('#' + champClient);
    await p.keyboard.type(NOM, { delay: 30 });
    const proposition = p.locator('.x-boundlist-item').filter({ visible: true }).filter({ hasText: NOM }).first();
    await proposition.waitFor({ timeout: 20000 });
    await proposition.click();
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('fairereglement gridpanel')[0];
      return g && !g.getStore().isLoading() && g.getStore().getCount() === 3; }, null, { timeout: 30000 });

    /* reglement partiel : toutes les ventes cochees par defaut ; la vente A est decochee d'un clic sur sa case */
    const choisi = await vues.choisir(p, 'fairereglement #nature', 'Partiel');
    await p.waitForTimeout(500);
    const caseA = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('fairereglement gridpanel')[0];
      const n = g.getView().getNode(g.getStore().findExact('id', id)).querySelector('.x-grid-row-checker');
      n.scrollIntoView(); const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, avant.A.id);
    await p.mouse.click(caseA.x, caseA.y);
    await p.waitForTimeout(400);

    /* montant recu tape dans le champ (especes, mode par defaut), puis Tab */
    const champMontant = await p.evaluate(() => Ext.ComponentQuery.query('fairereglement #montantRecu')[0].inputEl.dom.id);
    /* selectOnFocus d'ExtJS sous Chrome selectionne le texte par une tache differee : taper tout de suite apres le clic
       laissait cette selection tardive englober le premier chiffre, ecrase par le suivant (7160 saisi, 160 enregistre).
       Un utilisateur ne tape pas en moins d'une milliseconde : on attend la selection, puis on relit le champ. */
    await p.click('#' + champMontant);
    await p.waitForTimeout(300);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(String(montant), { delay: 30 });
    await p.keyboard.press('Tab');
    await p.waitForTimeout(400);
    const saisi = await p.evaluate(() => Ext.ComponentQuery.query('fairereglement #montantRecu')[0].getValue());
    ok('Écran : le champ « MONTANT RECU » contient le montant tapé (' + montant + ')', Number(saisi) === montant, String(saisi));

    /* ecran avant validation : grille (texte affiche), selection, montants affiches */
    const ecran = await p.evaluate(() => {
      const f = Ext.ComponentQuery.query('fairereglement')[0], g = f.down('gridpanel'), v = g.getView();
      const col = (di) => g.columns.find((c) => c.dataIndex === di);
      const affiche = (c) => (c.inputEl ? c.inputEl.dom.textContent : String(c.getValue())).trim();
      return {
        nature: f.down('#nature').getValue(), mode: f.down('#typeReglement').getValue(),
        restant: affiche(f.down('#montantRestant')), net: affiche(f.down('#montantNet')),
        cochees: g.getSelectionModel().getSelection().map((r) => r.get('id')),
        grille: g.getStore().getRange().map((r, i) => { const n = v.getNode(i);
          const txt = (di) => { const c = col(di), td = n && c ? n.querySelector('.x-grid-cell-' + c.id + ' .x-grid-cell-inner') : null; return td ? td.textContent.trim() : null; };
          return { id: r.get('id'), bon: txt('bon'), date: txt('dateOp'), reste: txt('montantRegle') }; }),
      };
    });
    const ligneGrille = (id) => ecran.grille.find((x) => x.id === id) || {};
    ok('Écran : « Partiel » choisi, espèces, ventes B et C cochées, A décochée',
      choisi === 'Partiel' && String(ecran.nature) === '1' && ecran.mode === '1' && ecran.cochees.length === 2
      && ecran.cochees.includes(avant.B.id) && ecran.cochees.includes(avant.C.id) && !ecran.cochees.includes(avant.A.id),
      JSON.stringify({ choisi, nature: ecran.nature, mode: ecran.mode, cochees: ecran.cochees.length }));
    ok('Écran = base : chaque ligne de la grille porte le numéro (str_REF), la date et le reste dû de sa vente',
      ['A', 'B', 'C'].every((k) => { const l = ligneGrille(avant[k].id); return l.bon === avant[k].ref && l.date === avant[k].date && chiffres(l.reste) === avant[k].reste; }),
      JSON.stringify(ecran.grille.map((l) => [l.bon, l.date, l.reste])));
    ok('Écran : « Montant Restant » = toutes les dettes du client, « Net à payer » = dettes cochées',
      chiffres(ecran.restant) === restesAvant.reduce((a, b) => a + b, 0) && chiffres(ecran.net) === avant.B.reste + avant.C.reste,
      'restant ' + ecran.restant + ', net ' + ecran.net);

    /* bilan : compteurs avant la validation */
    const T0 = q('SELECT NOW()');
    const compter = () => ({
      dossiers: Number(q("SELECT COUNT(*) FROM t_dossier_reglement WHERE str_ORGANISME_ID = '" + CLIENT + "'")),
      dossiersCompte: Number(q("SELECT COUNT(*) FROM t_dossier_reglement WHERE lg_USER_ID = '" + C.ADMIN + "' AND dt_CREATED >= '" + T0 + "'")),
      caisse: Number(q("SELECT COUNT(*) FROM t_mvt_caisse WHERE lg_USER_ID = '" + C.ADMIN + "' AND dt_CREATED >= '" + T0 + "'")),
      transactions: Number(q("SELECT COUNT(*) FROM mvttransaction WHERE lg_USER_ID = '" + C.ADMIN + "' AND createdAt >= '" + T0 + "'")),
      reglements: Number(q("SELECT COUNT(*) FROM t_reglement WHERE lg_USER_ID = '" + C.ADMIN + "' AND dt_CREATED >= '" + T0 + "'")),
      ventes: Number(q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_USER_ID = '" + C.ADMIN + "' AND dt_CREATED >= '" + T0 + "'")),
    });
    const n0 = compter();
    const soldeAvant = soldeClient();

    const reponseP = p.waitForResponse((r) => /\/api\/v1\/reglement\/reglementdiffere(\?|$)/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 });
    await vues.cliquer(p, 'fairereglement #btnValider');
    const reponse = await (await reponseP).json().catch(() => ({}));
    /* message de fin : question d'impression (succes) ou message d'erreur */
    let message = null;
    for (const fin = Date.now() + 30000; Date.now() < fin && !message;) {
      const t = await vues.texteMessage(p);
      if (/imprimer le ticket|erreur|Error/i.test(t)) { message = t; } else { await p.waitForTimeout(200); }
    }
    ok('Validation : règlement accepté, question « Voulez-vous imprimer le ticket ? »', reponse.success === true && /imprimer le ticket/.test(message || ''),
      JSON.stringify({ succes: reponse.success, msg: reponse.msg }) + ' ; message « ' + message + ' »');
    if (/imprimer le ticket/.test(message || '')) { await vues.repondre(p, 'no'); }
    await p.waitForTimeout(1500);
    ok('« Non » à l\'impression : aucune demande d\'impression envoyée, fenêtre refermée',
      impressions.length === 0 && await p.evaluate(() => !Ext.ComponentQuery.query('fairereglement').some((x) => x.isVisible(true))), impressions.join(' ; '));

    const dossier = String(reponse.ref || '');
    const dossierBase = q("SELECT IFNULL(MAX(lg_DOSSIER_REGLEMENT_ID), '') FROM t_dossier_reglement WHERE str_ORGANISME_ID = '" + CLIENT + "'");
    ok('Dossier de règlement : celui de la réponse est le seul du client en base', dossier !== '' && dossier === dossierBase, dossier + ' / ' + dossierBase);
    if (!dossier) { throw new Error('pas de dossier de règlement : rapprochement impossible'); }

    /* base apres reglement */
    const d = lignes(q("SELECT CONCAT_WS('|', d.str_REF, ROUND(d.dbl_AMOUNT), IFNULL(p.str_REF, ''), IFNULL(p.str_REF_TICKET, ''), IFNULL(DATE_FORMAT(p.dt_CREATED, '%d/%m/%Y'), ''),"
      + " IFNULL(tp.int_PRICE_RESTE, ''))"
      + " FROM t_dossier_reglement_detail d LEFT JOIN t_preenregistrement_compte_client tp ON tp.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = d.str_REF"
      + " LEFT JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID WHERE d.lg_DOSSIER_REGLEMENT_ID = '" + dossier + "'"))
      .map((l) => { const x = l.split('|'); return { dette: x[0], part: Number(x[1]), ref: x[2], ticket: x[3], date: x[4], reste: Number(x[5]) }; });
    const dos = q("SELECT CONCAT_WS('|', ROUND(dbl_AMOUNT), ROUND(dbl_MONTANT_ATTENDU)) FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID = '" + dossier + "'").split('|').map(Number);
    const regleBase = dos[0], attenduBase = dos[1];
    const soldeApres = soldeClient();
    const apres = { A: dette(ventes.A), B: dette(ventes.B), C: dette(ventes.C) };
    const sommeParts = d.reduce((a, x) => a + x.part, 0);

    /* ---------------------------------------------------------------- 4. bilan avant / apres et coherence des dettes */
    const n1 = compter();
    ok('Bilan : une seule ligne t_dossier_reglement créée (client et compte de test)',
      n1.dossiers - n0.dossiers === 1 && n1.dossiersCompte - n0.dossiersCompte === 1, JSON.stringify({ avant: n0, apres: n1 }));
    ok('Bilan : autant de détails que de ventes cochées (2), un par dette cochée, aucun pour la vente non cochée',
      d.length === 2 && d.some((x) => x.dette === avant.B.id) && d.some((x) => x.dette === avant.C.id) && !d.some((x) => x.dette === avant.A.id),
      d.map((x) => x.part).join(' + '));
    const parDossier = q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE = '" + dossier + "'),"
      + " (SELECT COUNT(*) FROM mvttransaction WHERE pkey = '" + dossier + "'), (SELECT COUNT(*) FROM t_reglement WHERE str_REF_RESSOURCE = '" + dossier + "'),"
      + " (SELECT IFNULL(SUM(int_AMOUNT), 0) FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE = '" + dossier + "'),"
      + " (SELECT IFNULL(SUM(montantPaye), 0) FROM mvttransaction WHERE pkey = '" + dossier + "'))").split('|').map(Number);
    ok('Bilan : un seul mouvement de caisse, une seule transaction, un seul règlement, du montant réglé ; rien d\'autre créé (ni vente)',
      parDossier[0] === 1 && parDossier[1] === 1 && parDossier[2] === 1 && parDossier[3] === montant && parDossier[4] === montant
      && n1.caisse - n0.caisse === 1 && n1.transactions - n0.transactions === 1 && n1.reglements - n0.reglements === 1 && n1.ventes === n0.ventes,
      'caisse/transaction/règlement du dossier ' + parDossier.slice(0, 3).join('/') + ', montants ' + parDossier[3] + '/' + parDossier[4]
      + ' ; créés par le compte : ' + JSON.stringify({ caisse: n1.caisse - n0.caisse, transactions: n1.transactions - n0.transactions, reglements: n1.reglements - n0.reglements, ventes: n1.ventes - n0.ventes }));
    ok('Cohérence : somme des parts = montant réglé = dbl_AMOUNT du dossier = montant saisi', sommeParts === montant && regleBase === montant,
      'parts ' + sommeParts + ', dossier ' + regleBase + ', saisi ' + montant);
    ok('Cohérence : dettes cochées, reste après = reste avant − part (jamais négatif) ; dette non cochée inchangée',
      ['B', 'C'].every((k) => { const x = d.find((y) => y.dette === avant[k].id); return x && apres[k].reste === avant[k].reste - x.part && apres[k].reste >= 0 && x.part > 0; })
      && apres.A.reste === avant.A.reste,
      ['A', 'B', 'C'].map((k) => k + ' ' + avant[k].reste + ' → ' + apres[k].reste).join(', '));
    ok('Cohérence : solde du client après = solde avant − montant réglé', soldeApres === soldeAvant - montant, soldeAvant + ' − ' + montant + ' → ' + soldeApres);
    ok('Base : « Montant dû » enregistré (dbl_MONTANT_ATTENDU) = « Montant Restant » affiché à l\'écran', attenduBase === chiffres(ecran.restant),
      attenduBase + ' / ' + ecran.restant);

    /* ---------------------------------------------------------------- 3. rapprochement du recu, parametre 0 et 1 */
    const apercu = () => p.evaluate(async (id) => { const r = await fetch('../api/v1/reglement/ticket/' + id + '/apercu'); const t = await r.text();
      try { return Object.assign(JSON.parse(t), { http: r.status }); } catch (e) { return { success: false, http: r.status, brut: t.slice(0, 200) }; } }, dossier);
    const valeurPoste = q("SELECT IFNULL(MAX(str_VALUE), '0') FROM t_parameters WHERE str_KEY = '" + CLE + "'") === '1' ? '1' : '0';
    for (const valeur of [valeurPoste, valeurPoste === '1' ? '0' : '1']) {
      if (valeur !== valeurPoste) { C.parametre(CLE, valeur); }
      const sfx = ' [' + CLE + ' = ' + valeur + ']';
      const a = await apercu();
      const t = a.success === true && a.tickets && a.tickets.length === 1 ? a.tickets[0] : null;
      ok('Aperçu : un reçu « REÇU DE RÈGLEMENT · DIFFÉRÉ » produit sans impression' + sfx,
        t && t.modele === 'REGLEMENT_DIFFERE' && lireRecu(t).textes.some((x) => /REÇU DE RÈGLEMENT · DIFFÉRÉ/.test(x)) && impressions.length === 0,
        JSON.stringify({ http: a.http, succes: a.success, msg: a.msg, brut: a.brut, modele: t && t.modele }));
      if (!t) { continue; }
      const r = lireRecu(t);
      const numero = (x) => (valeur === '1' ? x.ref : x.ticket);
      const attendu = (x) => 'Vente N° ' + numero(x) + ' du ' + x.date;
      ok('Reçu : une ligne par vente cochée dans le bloc CORPS (2)' + sfx, r.corps.length === d.length && d.length === 2, r.corps.map((x) => x.libelle + ' = ' + x.brut).join(' ; '));
      for (const x of d) {
        const k = x.dette === avant.B.id ? 'B' : x.dette === avant.C.id ? 'C' : '?';
        const l = r.corps.find((y) => y.libelle === attendu(x));
        ok('Reçu = base, vente ' + k + ' : « ' + attendu(x) + ' » et montant = part réglée (' + x.part + ')' + sfx,
          !!numero(x) && !!x.date && l && l.montant === x.part, l ? l.libelle + ' = ' + l.brut : 'absente ; lignes : ' + r.corps.map((y) => y.libelle).join(' ; '));
        const g = ligneGrille(x.dette);
        if (valeur === '1') {
          ok('Écran = reçu, vente ' + k + ' : le numéro affiché dans la grille (' + g.bon + ') et sa date sont ceux du reçu' + sfx,
            !!g.bon && !!l && l.libelle === 'Vente N° ' + g.bon + ' du ' + g.date, l ? l.libelle : 'ligne absente');
        } else {
          ok('Écran / reçu, vente ' + k + ' : numéro de ticket de la base (le reçu suit le paramètre), date de la grille' + sfx,
            !!l && l.libelle === 'Vente N° ' + x.ticket + ' du ' + g.date, (l ? l.libelle : 'ligne absente') + ' ; grille ' + g.bon + ' du ' + g.date);
        }
      }
      ok('Reçu : aucun uuid, aucun identifiant de dette' + sfx,
        !UUID.test(r.texte) && [avant.A.id, avant.B.id, avant.C.id].every((id) => r.texte.indexOf(id) < 0), (r.texte.match(/.{0,20}[0-9a-f]{8}-[0-9a-f]{4}-.{0,20}/i) || [''])[0]);
      ok('Reçu : la vente non cochée (A) n\'apparaît pas (ni son numéro, ni son numéro de ticket)' + sfx,
        !!avant.A.ref && !!avant.A.ticket && r.texte.indexOf(avant.A.ref) < 0 && r.texte.indexOf(avant.A.ticket) < 0, avant.A.ref + ' / ' + avant.A.ticket);
      const somme = r.corps.reduce((s, y) => s + y.montant, 0);
      const regle = r.paire(/^R[ÉE]GL[ÉE]$/i), du = r.paire(/^Montant d[ûu]/i), reste = r.paire(/^Reste sur ces ventes$/i),
        solde = r.paire(/^Solde restant du client$/i);
      const duVentes = avant.B.reste + avant.C.reste, resteVentes = apres.B.reste + apres.C.reste;
      ok('Reçu : somme des lignes = « RÉGLÉ » imprimé = dbl_AMOUNT du dossier' + sfx,
        !!regle && somme === chiffres(regle.valeur) && somme === regleBase, 'lignes ' + somme + ', RÉGLÉ ' + (regle ? regle.valeur : 'absent') + ', base ' + regleBase);
      ok('Reçu : « Montant dû (2 ventes) » = reste avant règlement des seules ventes réglées = « Net à payer » de l\'écran' + sfx,
        !!du && chiffres(du.valeur) === duVentes && duVentes === chiffres(ecran.net) && /\(2 ventes\)/.test(du.libelle),
        (du ? du.libelle + ' = ' + du.valeur : 'absent') + ' ; base ' + duVentes + ' ; écran ' + ecran.net);
      ok('Reçu : « Reste sur ces ventes » = leur reste en base après règlement = dû − réglé' + sfx,
        !!reste && chiffres(reste.valeur) === resteVentes && resteVentes === duVentes - regleBase,
        (reste ? reste.valeur : 'absent') + ' ; base ' + resteVentes + ' ; ' + duVentes + ' − ' + regleBase);
      ok('Reçu : « Solde restant du client » = solde du client en base après règlement = « Montant Restant » de l\'écran − réglé' + sfx,
        !!solde && chiffres(solde.valeur) === soldeApres && soldeApres === attenduBase - regleBase && attenduBase === chiffres(ecran.restant),
        (solde ? solde.valeur : 'absent') + ' ; solde ' + soldeApres + ' ; ' + attenduBase + ' − ' + regleBase);
      ok('Reçu : plus de « Montant dû (n dossiers) » ni de « Reste dû »' + sfx,
        !r.paires.some((x) => /dossiers\)|^Reste d[ûu]$/i.test(x.libelle)), r.paires.map((x) => x.libelle).join(' ; '));
    }
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (sess) { await sess.b.close().catch(() => {}); }
    C.nettoyer();
    ok('Jeu d\'essai retiré : client, compte, ventes, dettes, dossiers et mouvements du client ; paramètre remis',
      q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0'
      && q("SELECT COUNT(*) FROM t_compte_client WHERE lg_CLIENT_ID = '" + CLIENT + "'") === '0'
      && q("SELECT COUNT(*) FROM t_dossier_reglement WHERE str_ORGANISME_ID = '" + CLIENT + "'") === '0'
      && q("SELECT COUNT(*) FROM mvttransaction WHERE organisme = '" + CLIENT + "'") === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement_compte_client WHERE lg_COMPTE_CLIENT_ID = '" + CLIENT + "-cpt'") === '0'
      && C.ventesDuTest().length === 0
      && C.etat.params.every(([cle, v]) => q("SELECT IFNULL(MAX(str_VALUE), '__ABSENT__') FROM t_parameters WHERE str_KEY = '" + cle + "'") === v));
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
