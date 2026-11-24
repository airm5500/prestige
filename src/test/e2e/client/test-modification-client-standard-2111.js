/* PLAN DU 21/11, POINT 6 : « Modification Client » d'un client standard refusee par « Veuillez renseignez les champs
 * obligatoires ». Par l'ecran GESTION DES TIERS-PAYANTS > Clients, icone « Modifier », bouton « Enregistrer ».
 *  - client standard (cree par « Créer client standard ») : l'adresse modifiee est enregistree, aucun refus ;
 *    le nom, le telephone, le type et l'absence de tiers payant restent tels quels ;
 *  - second client standard, autres valeurs (adresse vide au depart, code postal) : meme resultat ;
 *  - client assure (cree par « Créer ») : la modification passe toujours, l'organisme et le taux sont gardes ;
 *  - nom efface (assure et standard) : toujours refuse par le meme message, rien n'est change en base.
 * Clients d'essai retires a la fin, par l'ecran puis en base si besoin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, cliquer, saisir, texteMessage } = require('../outils/vues');
const { gestes } = require('./outils-clients');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MARQUE = 'E2EMODCS';
const ORGANISME = 'AMAT-CI';
const TEL = ['0799002111', '0799002112'];
const retirerBase = () => {
  const ids = q(`SELECT GROUP_CONCAT(CONCAT("'", lg_CLIENT_ID, "'")) FROM t_client WHERE str_FIRST_NAME LIKE '${MARQUE}%'`);
  if (!ids || ids === 'NULL') { return; }
  q(`DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_ID IN (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client WHERE lg_CLIENT_ID IN (${ids}));`
    + `DELETE FROM t_ayant_droit WHERE lg_CLIENT_ID IN (${ids});`
    + `DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (${ids});`
    + `DELETE FROM t_client WHERE lg_CLIENT_ID IN (${ids});`);
};
const fiche = (prenom) => q(`SELECT CONCAT_WS('|', c.lg_CLIENT_ID, c.str_FIRST_NAME, c.str_LAST_NAME, IFNULL(c.str_TELEPHONE,''), IFNULL(c.str_ADRESSE,''),`
  + ` IFNULL(c.str_CODE_POSTAL,''), c.lg_TYPE_CLIENT_ID, (SELECT COUNT(*) FROM t_compte_client_tiers_payant t JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = t.lg_COMPTE_CLIENT_ID`
  + ` WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID AND t.str_STATUT = 'enable'),`
  + ` IFNULL((SELECT GROUP_CONCAT(CONCAT(tp.str_FULLNAME, ':', t.int_POURCENTAGE)) FROM t_compte_client_tiers_payant t JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = t.lg_COMPTE_CLIENT_ID`
  + ` JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = t.lg_TIERS_PAYANT_ID WHERE cc.lg_CLIENT_ID = c.lg_CLIENT_ID AND t.str_STATUT = 'enable'), ''))`
  + ` FROM t_client c WHERE c.str_FIRST_NAME = '${MARQUE}' AND c.str_LAST_NAME = '${prenom}'`).split('|');

(async () => {
  retirerBase();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const g = gestes(p, { ORGANISME, MARQUE, PREFIXE: MARQUE });

    /* donnees de depart : deux clients standards par la route de « Créer client standard » */
    for (const [prenom, tel] of [['Standard Un', TEL[0]], ['Standard Deux', TEL[1]]]) {
      const r = await p.evaluate(async ([n, pr, t]) => (await fetch('../api/v1/client/gestion/create-standard', { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ str_FIRST_NAME: n, str_LAST_NAME: pr, str_TELEPHONE: t }).toString() })).json(), [MARQUE, prenom, tel]);
      ok('Client standard « ' + prenom + ' » créé', r.success === true || r.success === 'true' || r.success === 1, JSON.stringify(r));
    }
    q(`UPDATE t_client SET str_ADRESSE = 'Cocody ancienne' WHERE str_FIRST_NAME = '${MARQUE}' AND str_LAST_NAME = 'Standard Un'`);

    await g.ouvrirClients();
    const modifier = async (prenom) => {
      const l = (await g.chercherClients(false)).find((c) => c.nom.endsWith(' ' + prenom) || c.nom.indexOf(prenom) >= 0);
      if (!l) { throw new Error('client « ' + prenom + ' » introuvable dans la liste'); }
      await g.cliquerIcone('clientgestion', l.i, 'Modifier');
      await p.waitForFunction(() => Ext.getCmp('str_FIRST_NAME') && Ext.getCmp('str_FIRST_NAME').isVisible(true), null, { timeout: 20000 });
      await p.waitForTimeout(1200);
    };
    const invalides = () => p.evaluate(() => Ext.getCmp('str_FIRST_NAME').up('form').getForm().getFields()
      .filterBy((f) => !f.isValid()).getRange().map((f) => f.name || f.id));
    const enregistrer = async () => {
      const reponse = p.waitForResponse((r) => /client\/gestion\/update$/.test(r.url()) && r.request().method() === 'POST', { timeout: 8000 }).catch(() => null);
      await p.click('#' + await p.evaluate(() => Ext.getCmp('str_FIRST_NAME').up('window').down('button[text=Enregistrer]').getId()));
      const r = await reponse;
      await p.waitForTimeout(1000);
      const message = await texteMessage(p);
      const fenetreOuverte = await p.evaluate(() => !!Ext.getCmp('str_FIRST_NAME') && Ext.getCmp('str_FIRST_NAME').isVisible(true));
      await p.evaluate(() => { while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
      if (fenetreOuverte) { await g.fermerFenetres(); await p.waitForTimeout(500); }
      return { envoye: !!r, json: r ? await r.json().catch(() => ({})) : null, message, fenetreOuverte };
    };

    /* 1. client standard avec adresse : adresse modifiee */
    const avant1 = fiche('Standard Un');
    await modifier('Standard Un');
    const inv1 = await invalides();
    ok('Client standard : aucun champ obligatoire en défaut à l\'ouverture', inv1.length === 0, inv1.join(', '));
    await saisir(p, '#str_ADRESSE', 'Riviera 3 rue E2E');
    const r1 = await enregistrer();
    ok('Client standard : enregistrement envoyé, sans « Veuillez renseignez les champs obligatoires »', r1.envoye && !/champs obligatoires/i.test(r1.message || ''), JSON.stringify(r1));
    ok('Client standard : la fenêtre se ferme après l\'enregistrement', !r1.fenetreOuverte);
    const apres1 = fiche('Standard Un');
    ok('Base : adresse enregistrée', apres1[4] === 'Riviera 3 rue E2E', apres1[4]);
    ok('Base : nom, téléphone et type inchangés', apres1[1] === avant1[1] && apres1[2] === avant1[2] && apres1[3] === TEL[0] && apres1[6] === avant1[6],
      JSON.stringify([avant1.slice(1, 4), avant1[6], apres1.slice(1, 4), apres1[6]]));
    ok('Base : toujours aucun tiers payant', apres1[7] === avant1[7] && apres1[7] === '0', avant1[7] + ' -> ' + apres1[7]);

    /* 2. second client standard, adresse vide au depart, code postal renseigne */
    const avant2 = fiche('Standard Deux');
    await modifier('Standard Deux');
    const inv2 = await invalides();
    ok('Second client standard : aucun champ en défaut', inv2.length === 0, inv2.join(', '));
    await saisir(p, '#str_ADRESSE', 'Yopougon E2E');
    await saisir(p, '#str_CODE_POSTAL', 'BP 2111');
    const r2 = await enregistrer();
    ok('Second client standard : enregistré sans refus', r2.envoye && !/champs obligatoires/i.test(r2.message || ''), JSON.stringify(r2));
    const apres2 = fiche('Standard Deux');
    ok('Base : adresse et code postal du second client', apres2[4] === 'Yopougon E2E' && apres2[5] === 'BP 2111', apres2.slice(4, 6).join(' / '));
    ok('Base : second client, nom, téléphone, type et tiers payants inchangés', apres2[2] === avant2[2] && apres2[3] === TEL[1] && apres2[6] === avant2[6] && apres2[7] === '0',
      JSON.stringify(apres2));
    ok('Base : le premier client n\'a pas été touché par la seconde modification', fiche('Standard Un')[4] === 'Riviera 3 rue E2E');

    /* 3. client assure, cree par « Créer » : la modification passe, organisme et taux gardes */
    await g.remplirCreation('Assure', ORGANISME);
    const cree = await g.enregistrerCreation();
    const avant3 = fiche('Assure');
    ok('Client assuré créé avec son organisme à 80 %', avant3[7] === '1' && avant3[8].indexOf(':80') > 0, JSON.stringify([cree.message, avant3[8]]));
    await modifier('Assure');
    const inv3 = await invalides();
    ok('Client assuré : aucun champ en défaut à l\'ouverture', inv3.length === 0, inv3.join(', '));
    await saisir(p, '#str_ADRESSE', 'Plateau E2E');
    const r3 = await enregistrer();
    ok('Client assuré : enregistré sans refus', r3.envoye && !/champs obligatoires/i.test(r3.message || ''), JSON.stringify(r3));
    const apres3 = fiche('Assure');
    ok('Base : assuré, adresse enregistrée, organisme et taux gardés', apres3[4] === 'Plateau E2E' && apres3[8] === avant3[8] && apres3[7] === '1',
      JSON.stringify([avant3[8], apres3[8], apres3[4]]));

    /* 4. nom efface : toujours refuse, pour un assure comme pour un client standard */
    for (const prenom of ['Assure', 'Standard Un']) {
      const avant4 = fiche(prenom);
      await modifier(prenom);
      await cliquer(p, '#str_FIRST_NAME'); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.press('Tab');
      const r4 = await enregistrer();
      ok(prenom + ', nom effacé : toujours refusé par « champs obligatoires », rien envoyé', !r4.envoye && /champs obligatoires/i.test(r4.message || ''), JSON.stringify(r4));
      ok('Base : ' + prenom + ' inchangé après le refus', fiche(prenom).join('|') === avant4.join('|'));
    }
    await g.fermerFenetres();

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
    const reste = await g.nettoyerClients();
    ok('Clients d\'essai supprimés par l\'écran', reste === 0, reste);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack || x.message);
  } finally {
    await b.close();
    retirerBase();
    ok('Aucun client d\'essai en base', q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '${MARQUE}%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
