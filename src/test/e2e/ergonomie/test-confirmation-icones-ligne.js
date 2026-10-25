/* CONFIRMATION DANS L'ICONE DE LIGNE (regle : aucune fenetre surgissante pour une modification ; demande du 18/10 :
 * « mets-le sur les autres icones de ligne »).
 *
 * 163 confirmations d'icones de ligne passent par PrestigeConfirmation.ligne : appel issu d'un clic sur l'icone ->
 * l'icone devient « Confirmer ? » ; sinon, la fenetre d'avant. Echantillon par les vues, sur trois ecrans de
 * PARAMETRAGES (ligne d'essai creee puis retiree) :
 *  - premier clic sur l'icone de suppression : « Confirmer ? » dans la ligne, aucune fenetre ;
 *  - sans second clic : l'icone revient apres 5 s, rien n'est supprime ;
 *  - double-clic : ne vaut pas confirmation, rien n'est supprime ;
 *  - second clic sur « Confirmer ? » : la ligne est supprimee (statut « delete »).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const ECRANS = [
  { nom: 'Gerer Ville', menu: ['PARAMETRAGES', 'Gerer Ville'], ecran: 'villemanager', table: 't_ville', id: 'lg_VILLE_ID', libelle: 'STR_NAME', statut: 'STR_STATUT',
    creer: "INSERT INTO t_ville (lg_VILLE_ID, STR_NAME, STR_STATUT, DT_CREATED) VALUES ('E2E-CONF-V', 'E2E CONFIRM VILLE', 'enable', NOW())", ligne: 'E2E CONFIRM VILLE', recherche: true },
  { nom: 'Groupe famille', menu: ['PARAMETRAGES', 'Groupe famille'], ecran: 'groupefamillemanager', table: 't_groupe_famille', id: 'lg_GROUPE_FAMILLE_ID', libelle: 'str_LIBELLE', statut: 'str_STATUT',
    creer: "INSERT INTO t_groupe_famille (lg_GROUPE_FAMILLE_ID, str_LIBELLE, str_CODE_GROUPE_FAMILLE, str_STATUT, dt_CREATED) VALUES ('E2E-CONF-G', 'E2E CONFIRM GROUPE', 'E2ECG', 'enable', NOW())", ligne: 'E2E CONFIRM GROUPE', recherche: true },
  { nom: 'Gerer Motif Retour', menu: ['PARAMETRAGES', 'Gerer Motif Retour'], ecran: 'motifretourmanager', table: 't_motif_retour', id: 'lg_MOTIF_RETOUR', libelle: 'str_LIBELLE', statut: 'str_STATUT',
    creer: "INSERT INTO t_motif_retour (lg_MOTIF_RETOUR, str_CODE, str_LIBELLE, str_STATUT, dt_CREATED) VALUES ('E2E-CONF-M', 'E2ECM', 'E2E CONFIRM MOTIF', 'enable', NOW())", ligne: 'E2E CONFIRM MOTIF', recherche: false }
];
const idEssai = { t_ville: 'E2E-CONF-V', t_groupe_famille: 'E2E-CONF-G', t_motif_retour: 'E2E-CONF-M' };
const nettoyer = () => ECRANS.forEach((e) => q('DELETE FROM ' + e.table + ' WHERE ' + e.id + " = '" + idEssai[e.table] + "'"));
const statut = (e) => q('SELECT IFNULL(' + e.statut + ", '') FROM " + e.table + ' WHERE ' + e.id + " = '" + idEssai[e.table] + "'");

(async () => {
  nettoyer();
  ECRANS.forEach((e) => q(e.creer));
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (x) => erreurs.push(x.message));
  try {
    await connexion(p, 'admin', 'e2etest');
    for (const e of ECRANS) {
      try {
        await ouvrirMenu(p, e.menu[0], e.menu[1]);
        await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), e.ecran, { timeout: 60000 });
        await p.waitForTimeout(1500);
        if (e.recherche) {
          await cliquer(p, e.ecran + ' #rechecher');
          await p.keyboard.type(e.ligne, { delay: 30 });
          await cliquer(p, e.ecran + ' button[text=rechercher]');
        }
        const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: e.ligne }).first();
        await ligne.waitFor({ timeout: 30000 });
        const icone = ligne.locator('img.x-action-col-icon[data-qtip^="Supprimer"]').first();
        await icone.click();
        const bouton = p.locator('.prestige-confirmer-icone');
        const vu = await bouton.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
        const [bi, bb] = vu ? [await icone.boundingBox(), await bouton.boundingBox()] : [null, null];
        const surIcone = !!(bi && bb && Math.abs((bb.y + bb.height / 2) - (bi.y + bi.height / 2)) < 4 && Math.abs((bb.x + bb.width) - (bi.x + bi.width)) < 4);
        ok(e.nom + ' : premier clic → « Confirmer ? » posé sur l\'icône de la ligne, aucune fenêtre', vu && surIcone && !(await texteMessage(p)),
          JSON.stringify({ icone: bi, bouton: bb }) + ' ' + (await texteMessage(p)));
        await p.waitForTimeout(5600);
        ok(e.nom + ' : sans second clic, l\'icône revient après 5 s, rien n\'est supprimé', await bouton.count() === 0 && await icone.isVisible() && statut(e) === 'enable', statut(e));
        await icone.dblclick();
        await p.waitForTimeout(1500);
        ok(e.nom + ' : double-clic → rien n\'est supprimé', statut(e) === 'enable' && !(await texteMessage(p)), statut(e));
        await p.waitForTimeout(5600);
        await icone.click();
        await bouton.waitFor({ timeout: 5000 });
        await p.waitForTimeout(500);
        await bouton.click();
        const fin = Date.now() + 15000;
        while (statut(e) === 'enable' && Date.now() < fin) { await p.waitForTimeout(300); }
        ok(e.nom + ' : second clic sur « Confirmer ? » → ligne supprimée', statut(e) === 'delete', statut(e));
        /* message de resultat de l'ecran (inchange) : ferme pour l'ecran suivant */
        for (let i = 0; i < 3 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => repondre(p, 'no')).catch(() => {}); await p.waitForTimeout(300); }
      } catch (x) {
        ok(e.nom + ' : parcours sans exception', false, x.message);
        for (let i = 0; i < 3 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => repondre(p, 'no')).catch(() => {}); await p.waitForTimeout(300); }
      }
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Lignes d\'essai retirées', ECRANS.every((e) => q('SELECT COUNT(*) FROM ' + e.table + ' WHERE ' + e.id + " = '" + idEssai[e.table] + "'") === '0'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
