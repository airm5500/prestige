/* SMS : PLUS D'IDENTIFIANTS ORANGE DANS LE CODE (retour du 23/10).
 *
 * Les identifiants de l'API SMS (client ID, client secret, en-tete, jeton) etaient ecrits dans le code, donc dans Git.
 * Ils viennent maintenant seulement de la configuration (fiche du fournisseur SMS, ou dicisms.properties repris au
 * demarrage). Ce que le test etablit, par les ecrans :
 *  - Fournisseurs SMS, fiche Orange : chaque parametre a une indication (valeur par defaut a reprendre pour les URL,
 *    origine pour les identifiants), sans aucun identifiant ;
 *  - Centre de support > Sante : ligne « SMS » qui dit si l'envoi est configure, par quel fournisseur, et ce qui
 *    manque ; elle bascule quand un parametre obligatoire est vide (valeur remise a la fin) ;
 *  - aucune erreur JavaScript. La base du banc est remise dans son etat.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const TABLE = q("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 'sms_fournisseur_param%' LIMIT 1");
const COLS = TABLE ? q("SELECT GROUP_CONCAT(column_name) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '" + TABLE + "'") : '';

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  let sauvegarde = null;
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('smsfournisseur', 'Fournisseurs SMS', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('smsfournisseur').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    /* fiche Orange : dans l'onglet ou elle se trouve (actifs, sinon desactives), vrai clic sur « Voir / modifier » */
    const trouver = () => p.evaluate(() => {
      const g = Ext.ComponentQuery.query('smsfournisseur gridpanel').filter((x) => x.isVisible(true))[0];
      const r = g && g.getStore().findRecord('code', 'ORANGE');
      if (!r) { return null; }
      const col = g.columns.filter((c) => c.items && c.items[0] && c.items[0].tooltip === 'Voir / modifier')[0];
      const cible = g.getView().getCell(r, col).dom.querySelector('img');
      cible.id = cible.id || 'e2e-editer-orange'; return cible.id; });
    let id = await trouver();
    if (!id) {
      const onglet = await p.evaluate(() => { const t = Ext.ComponentQuery.query('smsfournisseur tab').filter((x) => /désactivés/i.test(x.text || ''))[0]; t.el.dom.id = t.el.dom.id || 'e2e-onglet'; return t.el.dom.id; });
      await p.click('#' + onglet);
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('smsfournisseur #gridInactifs')[0]; return g.isVisible(true) && g.getStore().findRecord('code', 'ORANGE'); }, null, { timeout: 15000 });
      await p.waitForTimeout(500);
      id = await trouver();
    }
    await p.click('#' + id);
    await p.waitForFunction(() => Ext.ComponentQuery.query('#paramsFieldset textfield').length > 0, null, { timeout: 15000 });
    const champs = await p.evaluate(() => Ext.ComponentQuery.query('#paramsFieldset textfield').map((f) => ({ nom: f.name, indication: f.emptyText || '', secret: f.inputType === 'password' })));
    ok('Fiche Orange : chaque paramètre a une indication', champs.length >= 7 && champs.every((c) => c.indication.trim().length > 0), JSON.stringify(champs.map((c) => c.nom + '=' + c.indication)));
    const url = champs.filter((c) => c.nom === 'param_token_endpoint')[0];
    ok('Indication des URL : la valeur par défaut à reprendre', url && url.indication === 'https://api.orange.com/oauth/v2/token', url && url.indication);
    const ident = champs.filter((c) => c.nom === 'param_client_id' || c.nom === 'param_client_secret');
    ok('Indication des identifiants : leur origine, aucun identifiant', ident.length === 2 && ident.every((c) => /portail/i.test(c.indication) && !/[A-Za-z0-9]{16,}/.test(c.indication)), JSON.stringify(ident));
    await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible())[0].close());

    const sante = async () => {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('supportsante', 'Santé', ''));
      await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('supportsante #santeContent')[0]; return c && /Indicateurs/.test(c.getEl().dom.textContent); }, null, { timeout: 30000 });
      return p.evaluate(() => { const lignes = Array.from(Ext.ComponentQuery.query('supportsante #santeContent')[0].getEl().dom.querySelectorAll('tr'));
        const l = lignes.filter((tr) => /^\s*SMS/.test(tr.textContent))[0]; return l ? l.textContent.replace(/\s+/g, ' ').trim() : ''; });
    };
    const avant = await sante();
    ok('Santé : ligne « SMS » avec le fournisseur', /SMS/.test(avant) && /Orange|LeTexto/i.test(avant) && /Configuré|Non configuré/.test(avant), avant);

    if (TABLE && /cle/.test(COLS) && /valeur/.test(COLS)) {
      const fk = COLS.split(',').filter((c) => /fournisseur/i.test(c))[0];
      sauvegarde = q("SELECT IFNULL(valeur, '') FROM " + TABLE + " WHERE " + fk + " = 'ORANGE' AND cle = 'client_id'");
      q("UPDATE " + TABLE + " SET valeur = '' WHERE " + fk + " = 'ORANGE' AND cle = 'client_id'");
      await p.evaluate(() => Ext.ComponentQuery.query('supportsante')[0].close && Ext.ComponentQuery.query('supportsante')[0].close());
      const apres = await sante();
      ok('Client ID vidé : « Non configuré », le paramètre manquant est nommé', /Non configuré/.test(apres) && /Client ID/.test(apres), apres);
      q("UPDATE " + TABLE + " SET valeur = " + (sauvegarde === '' ? "''" : "'" + sauvegarde.replace(/'/g, "''") + "'") + " WHERE " + fk + " = 'ORANGE' AND cle = 'client_id'");
      sauvegarde = null;
    } else {
      ok('Table des paramètres SMS trouvée', false, TABLE + ' ' + COLS);
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
