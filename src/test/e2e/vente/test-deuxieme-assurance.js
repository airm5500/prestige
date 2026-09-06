/* Point 11 : modification de la DEUXIEME assurance d'une vente assurance.
   Le test construit son propre jeu d'essai (client a deux assurances, vente assurance a deux
   lignes tiers payant), rejoue la modification par l'API de l'ecran, puis controle ce qui est
   reellement enregistre. Tout est retire a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-P11';

function nettoyer() {
  exec("DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
     + "DELETE FROM MvtTransaction WHERE pkey LIKE '" + MARQUE + "%';"
     + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
     + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
     + "DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%'));"
     + "DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%');"
     + "DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID IN (SELECT lg_CLIENT_ID FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%');"
     + "DELETE FROM t_client WHERE str_LAST_NAME LIKE '" + MARQUE + "%';");
}

(async () => {
  nettoyer();
  // Trois assurances distinctes : la principale, la seconde, et celle vers laquelle on bascule.
  const assurances = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE lg_TYPE_TIERS_PAYANT_ID='1' AND str_STATUT='enable' LIMIT 3").split('\n');
  if (assurances.length < 3) { console.error('Pas assez d assurances en base'); process.exit(2); }
  const [TP1, TP2, TP3] = assurances;
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForTimeout(2500);
  const poster = (url, body) => p.evaluate(async ([u, b2]) => {
    const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b2) });
    return await r.text();
  }, [url, body]);

  // --- client a deux assurances, cree par l'application elle-meme ---
  const creation = JSON.parse(await poster('../api/v1/client/add/assurance', {
    lgCLIENTID: '', lgTIERSPAYANTID: TP1, strLASTNAME: MARQUE, strFIRSTNAME: 'CLIENT',
    strSEXE: 'M', strADRESSE: '', strCODEPOSTAL: '', strNUMEROSECURITESOCIAL: '',
    intPOURCENTAGE: 70, intPRIORITY: 1, dtNAISSANCE: '', lgVILLEID: '', lgTYPECLIENTID: '',
    tiersPayants: [{ lgTIERSPAYANTID: TP2, taux: 20, order: 2, numSecurity: '', bIsAbsolute: false, dbPLAFONDENCOURS: 0, dblQUOTACONSOMENSUELLE: 0, compteTp: '' }]
  }));
  ok('client de test cree avec deux assurances', creation.success === true, JSON.stringify(creation).slice(0, 250));
  if (!creation.success) { await b.close(); nettoyer(); process.exit(1); }
  const clientId = creation.data.lgCLIENTID;

  const liens = q("SELECT lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_TIERS_PAYANT_ID, int_PRIORITY FROM t_compte_client_tiers_payant"
    + " WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID='" + clientId + "')"
    + " ORDER BY int_PRIORITY").split('\n').map(l => l.split('\t'));
  ok('deux liens client / assurance en base', liens.length === 2, JSON.stringify(liens));
  const [lien1, lien2] = liens;

  // --- vente assurance a deux lignes tiers payant ---
  // Une vente assurance porte toujours un ayant droit : celui cree avec le client.
  const ayantDroit = q("SELECT lg_AYANTS_DROITS_ID FROM t_ayant_droit WHERE lg_CLIENT_ID='" + clientId + "' LIMIT 1");
  ok('ayant droit du client de test present', !!ayantDroit, ayantDroit);
  const modele = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID='2' AND b_IS_CANCEL=0 LIMIT 1");
  exec("CREATE TEMPORARY TABLE tmp_v AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + modele + "';"
     + "UPDATE tmp_v SET lg_PREENREGISTREMENT_ID='" + MARQUE + "-V', str_REF='" + MARQUE + "-REF', str_REF_BON='BON-PRINCIPAL',"
     + " lg_CLIENT_ID='" + clientId + "', int_PRICE=10000, int_CUST_PART=1000, b_IS_CANCEL=0,"
     + " str_STATUT='is_Closed', lg_USER_ID='" + user + "', lg_AYANTS_DROITS_ID='" + ayantDroit + "';"
     + "INSERT INTO t_preenregistrement SELECT * FROM tmp_v;");
  [[lien1[0], 70, 7000, 'BON-PRINCIPAL'], [lien2[0], 20, 2000, 'BON-SECOND']].forEach(function (l, i) {
    exec("INSERT INTO t_preenregistrement_compte_client_tiers_payent"
      + " (lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID, lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_TIERS_PAYANT_ID,"
      + "  lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PERCENT, int_PRICE, int_PRICE_RESTE, str_REF_BON)"
      + " VALUES ('" + MARQUE + "-L" + i + "', '" + MARQUE + "-V', '" + l[0] + "', '" + user + "', 'is_Closed',"
      + " NOW(), NOW(), " + l[1] + ", " + l[2] + ", " + l[2] + ", '" + l[3] + "')");
  });
  // Le taux enregistre est recalcule a partir des LIGNES de la vente : sans detail, le montant
  // vendu vaut zero et le taux retombe a zero. La vente d'essai porte donc une ligne reelle.
  const produit = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' LIMIT 1");
  exec("INSERT INTO t_preenregistrement_detail"
     + " (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY,"
     + "  int_QUANTITY_SERVED, int_PRICE, int_PRICE_UNITAIR, str_STATUT, dt_CREATED, dt_UPDATED,"
     + "  int_PRICE_REMISE, montantTva, valeurTva, prixAchat)"
     + " VALUES ('" + MARQUE + "-D', '" + MARQUE + "-V', '" + produit + "', 1, 1, 10000, 10000,"
     + " 'is_Closed', NOW(), NOW(), 0, 0, 0, 5000)");
  const mvtModele = q("SELECT uuid FROM MvtTransaction WHERE pkey='" + modele + "' LIMIT 1");
  if (mvtModele) {
    exec("CREATE TEMPORARY TABLE tmp_m AS SELECT * FROM MvtTransaction WHERE uuid='" + mvtModele + "';"
       + "UPDATE tmp_m SET uuid='" + MARQUE + "-M', pkey='" + MARQUE + "-V', reference='" + MARQUE + "-REF';"
       + "INSERT INTO MvtTransaction SELECT * FROM tmp_m;");
  }
  ok('vente assurance de test posee avec deux lignes tiers payant',
     q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID='" + MARQUE + "-V'") === '2');

  // caisse ouverte, sans quoi la modification est refusee
  exec("INSERT IGNORE INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_CREATED, lg_CREATED_BY, str_STATUT)"
     + " VALUES ('" + MARQUE + "-C', '" + user + "', 0, 0, NOW(), '" + user + "', 'is_Using')");

  const avant = q("SELECT str_REF_BON FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + MARQUE + "-V'");

  // --- on ne change QUE la deuxieme assurance : TP2 devient TP3 ---
  const reponse = JSON.parse(await poster('../api/v1/vente/updateclientortierpayant', {
    clientId: clientId, ayantDroitId: '', venteId: MARQUE + '-V',
    tierspayants: [
      { compteTp: lien1[0], numBon: 'BON-PRINCIPAL', taux: 70, itemId: MARQUE + '-L0', principal: true },
      { compteTp: TP3,      numBon: 'BON-SECOND',    taux: 20, itemId: MARQUE + '-L1', principal: false }
    ]
  }));
  ok('la modification est acceptee', reponse.success === true, JSON.stringify(reponse));

  const lignes = q("SELECT c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, t.lg_TIERS_PAYANT_ID, c.int_PERCENT, c.str_REF_BON"
    + " FROM t_preenregistrement_compte_client_tiers_payent c"
    + " JOIN t_compte_client_tiers_payant t ON t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " WHERE c.lg_PREENREGISTREMENT_ID='" + MARQUE + "-V' ORDER BY c.int_PERCENT DESC")
    .split('\n').filter(Boolean).map(l => l.split('\t'));
  console.log('  lignes apres modification :', JSON.stringify(lignes));

  ok('la vente porte toujours deux tiers payants', lignes.length === 2, JSON.stringify(lignes));
  ok('la premiere assurance est intacte',
     lignes.some(l => l[1] === TP1 && l[2] === '70'), 'attendu ' + TP1 + ' a 70%');
  ok('la deuxieme assurance est bien la nouvelle',
     lignes.some(l => l[1] === TP3 && l[2] === '20'), 'attendu ' + TP3 + ' a 20%');
  ok('l ancienne deuxieme assurance ne figure plus sur la vente',
     !lignes.some(l => l[1] === TP2), 'TP2=' + TP2);

  const apres = q("SELECT str_REF_BON FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + MARQUE + "-V'");
  ok('la reference de bon de la vente n est pas ecrasee par celle de la seconde assurance',
     apres === avant, 'avant=' + avant + ' apres=' + apres);

  // --- meme modification sur une vente SANS ayant droit : elle ne doit plus echouer ---
  exec("UPDATE t_preenregistrement SET lg_AYANTS_DROITS_ID=NULL WHERE lg_PREENREGISTREMENT_ID='" + MARQUE + "-V'");
  const ligneCourante = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent"
    + " WHERE lg_PREENREGISTREMENT_ID='" + MARQUE + "-V' AND int_PERCENT=20 LIMIT 1");
  const sansAyantDroit = JSON.parse(await poster('../api/v1/vente/updateclientortierpayant', {
    clientId: clientId, ayantDroitId: '', venteId: MARQUE + '-V',
    tierspayants: [
      { compteTp: lien1[0], numBon: 'BON-PRINCIPAL', taux: 70, itemId: MARQUE + '-L0', principal: true },
      { compteTp: TP2,      numBon: 'BON-SECOND',    taux: 20, itemId: ligneCourante, principal: false }
    ]
  }));
  ok('une vente sans ayant droit peut etre modifiee', sansAyantDroit.success === true, JSON.stringify(sansAyantDroit));

  // --- un echec ne doit rien laisser derriere lui ---
  const etat = () => q("SELECT GROUP_CONCAT(CONCAT(c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, ':', c.int_PERCENT, ':', t.int_PRIORITY) ORDER BY c.int_PERCENT DESC)"
    + " FROM t_preenregistrement_compte_client_tiers_payent c"
    + " JOIN t_compte_client_tiers_payant t ON t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " WHERE c.lg_PREENREGISTREMENT_ID='" + MARQUE + "-V'");
  const etatAvant = etat();
  // Tiers payant inconnu : les controles d'entree passent (la somme des taux est la bonne), la
  // modification commence a ecrire, puis echoue. Quelle que soit la facon dont l'echec remonte,
  // la vente doit se retrouver exactement dans l'etat ou elle etait.
  const echec = JSON.parse(await poster('../api/v1/vente/updateclientortierpayant', {
    clientId: clientId, ayantDroitId: '', venteId: MARQUE + '-V',
    tierspayants: [{ compteTp: MARQUE + '-TP-INEXISTANT', numBon: 'X', taux: 90, itemId: MARQUE + '-L0', principal: true }]
  }));
  ok('une modification impossible est refusee', echec.success === false, JSON.stringify(echec));
  ok('un echec ne laisse pas la vente a moitie modifiee', etat() === etatAvant,
     'avant=' + etatAvant + ' apres=' + etat());

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='" + MARQUE + "-C'");
  nettoyer();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); try { nettoyer(); } catch (_) {} process.exit(2); });
