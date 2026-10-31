/* GESTION DES UTILISATEURS ET DES PROFILS (retours du 31/10, points 2 et 6).
 *  - « Modifier » et « Réinitialiser mot de passe » s'ouvrent en fenetre modale (l'ecran derriere est masque) ;
 *  - reinitialisation du mot de passe : les deux zones de saisie sont alignees ;
 *  - « Tout sélectionner » des privileges d'un profil : cache hors super administrateur, et refuse par le serveur
 *    (sinon un pharmacien ou un administrateur s'attribue tous les droits). « Tout désélectionner » reste.
 * Compte e2e (profil de l'administrateur de l'officine). Rien n'est enregistre pour les utilisateurs (« Annuler ») ;
 * le profil d'essai E2E-TOUT-SEL est cree puis supprime avec ses privileges.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ROLE = 'E2E-TOUT-SEL';

(async () => {
  q(`DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE}'; DELETE FROM t_role WHERE lg_ROLE_ID = '${ROLE}';`
    + ` INSERT INTO t_role (lg_ROLE_ID, str_NAME, str_DESIGNATION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED)`
    + ` VALUES ('${ROLE}', '${ROLE}', 'Profil d''essai tout selectionner', 'CUSTOMER', 'enable', NOW(), NOW())`);
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  /* clic sur l'icone d'action d'une ligne, comme l'utilisateur */
  const clicIcone = async (ecran, icone) => {
    /* l'habillage redessine les icones : la colonne est retrouvee par son infobulle */
    await p.evaluate(([e, i]) => { const g = Ext.ComponentQuery.query(e + ' gridpanel')[0] || Ext.ComponentQuery.query(e)[0];
      const cols = g.headerCt.getVisibleGridColumns(), k = cols.findIndex((c) => c.xtype === 'actioncolumn' && c.items[0] && String(c.items[0].tooltip).indexOf(i) === 0);
      const td = g.getView().getNode(0).querySelectorAll('td')[k], img = td && td.querySelector('img');
      if (img) { img.setAttribute('data-e2e', 'icone'); } }, [ecran, icone]);
    await p.click('[data-e2e=icone]');
    await p.evaluate(() => document.querySelector('[data-e2e=icone]').removeAttribute('data-e2e'));
  };
  /* fenetre ouverte par l'action (son titre), et masque modal visible sous elle */
  const VISEE = /^(Modification Utilisateur|Reinitialisation du Mot de passe)/;
  const fenetre = () => p.evaluate((v) => { const w = Ext.ComponentQuery.query('window').find((x) => x.isVisible() && new RegExp(v).test(x.title || ''));
    const m = [...document.querySelectorAll('.x-mask')].some((x) => x.offsetWidth > 0 && getComputedStyle(x).display !== 'none' && !x.closest('.x-window'));
    return w ? { titre: w.title.replace(/\[.*\]/, '[…]'), modale: !!w.modal, masque: m } : null; }, VISEE.source);
  const annuler = async () => { await p.evaluate((v) => { const w = Ext.ComponentQuery.query('window').find((x) => x.isVisible() && new RegExp(v).test(x.title || ''));
      const bt = w.query('button').find((x) => x.text === 'Annuler'); bt.getEl().dom.setAttribute('data-e2e', 'annuler'); }, VISEE.source);
    await p.click('[data-e2e=annuler]'); await p.evaluate(() => document.querySelector('[data-e2e=annuler]') && document.querySelector('[data-e2e=annuler]').removeAttribute('data-e2e'));
    await p.waitForTimeout(500); };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('usermanager', 'Gestion des utilisateurs', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('usermanager gridpanel')[0] || Ext.ComponentQuery.query('usermanager')[0];
      return g && g.getStore && g.getStore().getCount() > 0 && g.getView().getNode(0); }, null, { timeout: 60000 });

    await clicIcone('usermanager', 'Modifier');
    await p.waitForTimeout(800);
    let f = await fenetre();
    ok('« Modifier » : fenêtre modale', f && f.modale && f.masque, JSON.stringify(f));
    if (f) { await annuler(); }

    await clicIcone('usermanager', 'Reinitialiser');
    await p.waitForTimeout(800);
    f = await fenetre();
    ok('« Réinitialiser mot de passe » : fenêtre modale', f && f.modale && f.masque, JSON.stringify(f));
    const zones = await p.evaluate(() => ['str_PASSWORDnew', 'str_PASSWORDn'].map((id) => { const r = Ext.getCmp(id).inputEl.dom.getBoundingClientRect();
      return { g: Math.round(r.left), l: Math.round(r.width) }; }));
    ok('Réinitialisation : les deux zones de saisie sont alignées', zones[0].g === zones[1].g && zones[0].l === zones[1].l, JSON.stringify(zones));
    if (f) { await annuler(); }

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rolemanager', 'Profils', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('rolemanager gridpanel')[0] || Ext.ComponentQuery.query('rolemanager')[0];
      return g && g.getStore && g.getStore().getCount() > 0 && g.getView().getNode(0); }, null, { timeout: 60000 });
    await clicIcone('rolemanager', 'Attribution des privileges');
    await p.waitForFunction(() => Ext.ComponentQuery.query('button').some((x) => /S&eacute;lectionner|sélectionner/i.test(x.text || '') && x.rendered), null, { timeout: 30000 }).catch(() => {});
    const boutons = await p.evaluate(() => Ext.ComponentQuery.query('button').filter((x) => x.rendered && /lectionner/i.test(x.text || ''))
      .map((x) => ({ t: x.text.replace(/&eacute;/g, 'é'), v: x.isVisible(true) })));
    const tout = boutons.find((x) => /^Tout sélectionner/.test(x.t)), aucun = boutons.find((x) => /désélectionner/.test(x.t));
    ok('Privilèges d\'un profil : « Tout sélectionner » caché (administrateur)', !tout || !tout.v, JSON.stringify(boutons));
    ok('« Tout désélectionner » toujours présent', aucun && aucun.v, JSON.stringify(boutons));

    const r = await p.evaluate((role) => fetch('../api/v1/roles/privileges/toggle-all', { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'lg_ROLE_ID=' + role + '&search_value=&checked=true' }).then((x) => x.text()), ROLE);
    const n = q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE}'`);
    ok('Serveur : attribution de tous les privilèges refusée hors super administrateur', n === '0' && /super administrateur/i.test(r), n + ' privilège(s) ; ' + r);
    ok('Aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    q(`DELETE FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE}'; DELETE FROM t_role WHERE lg_ROLE_ID = '${ROLE}'`);
    ok('Profil d\'essai retiré', q(`SELECT COUNT(*) FROM t_role WHERE lg_ROLE_ID = '${ROLE}'`) === '0');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();
