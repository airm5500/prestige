/* VENTE : VENDEUR TAPE SANS ETRE CHOISI DANS LA LISTE (journaux du poste caisse 3, 17/08 et 19/08).
 *
 * « TransientPropertyValueException : TPreenregistrement.lgUSERVENDEURID -> TUser » sur vente/add/vno et
 * vente/add/assurance : la liste « Vendeur » est editable ; un nom tape sans etre choisi part tel quel, et la creation
 * de la vente (premier article) rattachait un vendeur qui n'existe pas. L'article n'etait pas ajoute.
 * La cloture, elle, cherche le vendeur en base et retient la caissiere s'il n'existe pas : meme regle a la creation.
 * Parcours par les vues (admin, SERVICE CLIENT > Ventes > nouvelle vente) :
 *  - « ZZZ PERSONNE » tape dans « Vendeur », Tab ;
 *  - CIP d'un article tape dans la recherche produit, Entree : la vente est creee avec l'article, aucun message
 *    d'erreur, aucune erreur JavaScript ;
 *  - vendeur enregistre = la caissiere (admin), comme a la cloture.
 * La vente d'essai et le stock de l'article sont remis a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [PRODUIT, CIP, STOCK, STOCK_TOTAL] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 AND LENGTH(f.int_CIP) = 7 ORDER BY f.int_CIP DESC LIMIT 1").split('\t');
const ventes = [];

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  }
  q("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + STOCK + ", int_NUMBER = " + STOCK_TOTAL + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const echecs = []; p.on('response', (r) => { if (/vente\/add\//.test(r.url()) && r.status() >= 400) { echecs.push(r.status() + ' ' + r.url()); } });
  try {
    ok('Jeu d\'essai : un article en stock', !!CIP, CIP);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const PRODUIT_CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), PRODUIT_CHAMP, { timeout: 60000 });
    await p.waitForTimeout(1500);

    await cliquer(p, 'doventemanager #user');
    await p.keyboard.type('ZZZ PERSONNE', { delay: 20 });
    await p.keyboard.press('Tab');
    const vendeur = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #user')[0].getValue());

    const ajout = p.waitForResponse((r) => /vente\/add\/vno/.test(r.url()), { timeout: 30000 });
    await cliquer(p, PRODUIT_CHAMP);
    await p.keyboard.type(CIP, { delay: 30 });
    await p.keyboard.press('Enter');
    await ajout;
    await p.waitForTimeout(1500);
    const vente = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').current; return c ? c.lgPREENREGISTREMENTID : null; });
    if (vente) { ventes.push(vente); }
    const message = await texteMessage(p);
    ok('Vendeur tapé sans choix (« ' + vendeur + ' »), article ajouté : vente créée, sans message d\'erreur',
      !!vente && echecs.length === 0 && !/erreur|error/i.test(message), (vente || 'aucune vente') + ' ; ' + echecs.join(' | ') + ' ; ' + message);
    const lignes = vente ? q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vente + "' AND lg_FAMILLE_ID = '" + PRODUIT + "'") : '0';
    ok('L\'article est sur la vente', lignes === '1', lignes);
    const qui = vente ? q("SELECT CONCAT(IFNULL(v.str_LOGIN, '?'), '|', IFNULL(c.str_LOGIN, '?')) FROM t_preenregistrement p LEFT JOIN t_user v ON v.lg_USER_ID = p.lg_USER_VENDEUR_ID"
      + " LEFT JOIN t_user c ON c.lg_USER_ID = p.lg_USER_CAISSIER_ID WHERE p.lg_PREENREGISTREMENT_ID = '" + vente + "'") : '';
    ok('Vendeur enregistré = la caissière (comme à la clôture)', qui === 'admin|admin', qui);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + echecs.join(' | '));
  } finally {
    await b.close();
    nettoyer();
    ok('Vente d\'essai retirée, stock remis', ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0')
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
