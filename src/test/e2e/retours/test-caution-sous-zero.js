/* CAUTION TIERS-PAYANT : elle ne passe plus sous 0 (retour du 02/11, « Oui, bloquer »).
 *
 * Par le menu GESTION DES TIERS-PAYANTS > Cautions, caution d'essai de 4 000 F posée en base sur un tiers-payant qui
 * n'en a pas :
 *  - « Ajouter » sur sa ligne, montant -5 000, Enregistrer : refus « ne peut pas passer sous 0 » avec le solde et le
 *    retrait demandé ; la fenêtre reste ouverte pour corriger ;
 *  - en base : solde toujours 4 000, aucun historique, aucun mouvement de caisse ;
 *  - aucune erreur JavaScript.
 * La caution d'essai est retirée à la fin, même en cas d'échec.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const { execFileSync } = require('child_process');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ID = 'E2E-CAUTION-SOUS-ZERO';
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }

function retirer() {
  q(`DELETE FROM caution_historique WHERE caution_id = '${ID}'`);
  q(`DELETE FROM caution WHERE id = '${ID}'`);
}

(async () => {
  retirer();
  const tp = q(`SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable'
    AND lg_TIERS_PAYANT_ID NOT IN (SELECT tiersPayant_id FROM caution) LIMIT 1`);
  const user = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1`);
  q(`INSERT INTO caution (id, montant, mvt_date, tiersPayant_id, user_id, conso, mvt_update)
    VALUES ('${ID}', 4000, NOW(), '${tp}', '${user}', 0, NOW())`);
  const mvtAvant = q("SELECT COUNT(*) FROM t_mvt_caisse");
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES TIERS-PAYANTS', 'Cautions');
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('cautiontierspayant grid')[0];
      return !!(g && g.getStore().findRecord('id', id)); }, ID, { timeout: 60000 });
    const icone = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('cautiontierspayant grid')[0];
      const rec = g.getStore().findRecord('id', id); const ligne = g.getView().getNode(rec);
      const img = Array.from(ligne.querySelectorAll('img, .x-action-col-icon')).find((x) => x.getAttribute('data-qtip') === 'Ajouter');
      if (!img) { return null; } img.id = img.id || 'e2e-ajouter-caution'; return img.id; }, ID);
    ok('Ligne de la caution d\'essai avec son bouton « Ajouter »', !!icone);
    await p.click('#' + icone);
    const champ = p.locator('.x-window:visible input[name="montant"]');
    await champ.waitFor({ timeout: 15000 });
    await champ.fill('-5000');
    await p.locator('.x-window:visible').getByText('Enregistrer', { exact: true }).click();
    const texte = await p.waitForFunction(() => { const w = Array.from(document.querySelectorAll('.x-message-box')).find((x) => x.offsetParent && /caution/i.test(x.textContent));
      return w ? w.textContent : null; }, null, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => '');
    ok('Retrait de 5 000 F sur 4 000 F refusé : « ne peut pas passer sous 0 », solde et retrait cités', /sous 0/.test(texte) && /4\s?000/.test(texte) && /5\s?000/.test(texte), texte);
    const fenetre = await p.evaluate(() => Ext.ComponentQuery.query('cautionEditForm').some((w) => w.isVisible()));
    ok('La fenêtre de saisie reste ouverte pour corriger', fenetre);
    ok('En base : solde 4 000, aucun historique, aucun mouvement de caisse',
      q(`SELECT montant FROM caution WHERE id = '${ID}'`) === '4000'
      && q(`SELECT COUNT(*) FROM caution_historique WHERE caution_id = '${ID}'`) === '0'
      && q("SELECT COUNT(*) FROM t_mvt_caisse") === mvtAvant);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', err.length === 0 && dialogues.length === 0, err.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await ENV_E2E.capture(p, 'caution-sous-zero').catch(() => {});
    await b.close();
    retirer();
    ok('Caution d\'essai retirée', q(`SELECT COUNT(*) FROM caution WHERE id = '${ID}'`) === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
