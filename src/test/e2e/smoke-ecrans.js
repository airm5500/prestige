/*
 * Non-regression : ouverture des principaux ecrans du menu.
 *
 * Deux controles, et le second a ete ajoute apres coup.
 *
 * 1. Aucune erreur JavaScript a l'ouverture (la feuille vente-theme.css et les variables globales
 *    de FamilleManager.js sont partagees entre ecrans).
 *
 * 2. L'ecran est REELLEMENT DESSINE. « Gestion des gardes » s'ouvrait sans la moindre erreur, ses
 *    trois zones existaient et se disaient visibles - et l'utilisateur ne voyait qu'un bandeau
 *    vide : le panneau faisait DOUZE pixels de haut. Une disposition « border » ne se dimensionne
 *    pas sur son contenu, et le conteneur du menu ne lui donnait aucune hauteur. Aucun controle
 *    portant sur les composants ou sur les services ne pouvait voir cela ; seule la geometrie du
 *    rendu le montre. C'est desormais ce qui est verifie, pour tous les ecrans de la liste.
 */
const { chromium } = require('playwright-core');
const ECRANS = [
  ['famillemanager', 'Gestion des Articles'],
  ['monitoringproduct', 'Suivi mouvement article'],
  ['lotfamillemanager', 'Gestion des lots'],
  ['groupefamillemanager', 'Groupes de familles'],
  ['reservemanager', 'Gestion des reserves'],
  // Ecrans repris ou ajoutes pendant ces travaux : ils entrent dans le meme filet.
  ['gardemanager', 'Periodes de garde et leur analyse'],
  ['caisserecetterecap', 'Recapitulatif caisse/recette'],
  ['reglementdepot', 'Gerer carnet depot'],
  ['cazonegeomanager', 'CA par zone geographique'],
  ['balancesalecahs', 'Balance vente caisse'],
  ['ordonnancier', 'Ordonnancier'],
  ['modereglementview', 'Modes de reglement'],
  ['facturesubrogatoireother', 'Bons par organisme']
];

/* En dessous de cette hauteur, l'ecran est ouvert mais il n'y a rien a voir : c'est exactement ce
   qui arrivait aux gardes (12 px). Le seuil est bas a dessein - il s'agit de distinguer « dessine »
   de « pas dessine », pas de juger une mise en page. */
const HAUTEUR_MINIMALE = 200;
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 150) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 1000 } });
  const err = [];
  p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);
  ok('connexion et chargement de l application', true);

  for (const [xtype, titre] of ECRANS) {
    const avant = err.length;
    await p.evaluate(([x, t]) => testextjs.app.getController('App').onLoadNewComponent(x, t, ''), [xtype, titre]);
    const ouvert = await p.waitForFunction(x => Ext.ComponentQuery.query(x).length > 0, xtype, { timeout: 20000 })
      .then(() => true).catch(() => false);
    await p.waitForTimeout(1500);
    ok('ecran ' + xtype + ' ouvert sans erreur JS', ouvert && err.length === avant,
        ouvert ? err.slice(avant).join(' || ') : 'ecran non ouvert');
    if (!ouvert) {
      continue;
    }
    const geometrie = await p.evaluate(x => {
      const v = Ext.ComponentQuery.query(x)[0];
      if (!v || !v.el || !v.el.dom) {
        return null;
      }
      const rect = v.el.dom.getBoundingClientRect();
      // Le corps du panneau, en-tete deduit : c'est lui qui porte ce que l'utilisateur consulte.
      const corps = v.body && v.body.dom ? v.body.dom.getBoundingClientRect() : rect;
      return {hauteur: Math.round(rect.height), largeur: Math.round(rect.width),
        corps: Math.round(corps.height)};
    }, xtype);
    ok('ecran ' + xtype + ' reellement dessine (et non un bandeau vide)',
        !!geometrie && geometrie.hauteur >= HAUTEUR_MINIMALE && geometrie.corps >= 100
        && geometrie.largeur >= 400,
        JSON.stringify(geometrie));
  }
  ok('aucune erreur JavaScript sur tout le parcours', err.length === 0, err.join(' || '));
  await b.close();
  const ko = res.filter(r => !r.c);
  console.log('\n===== ' + (res.length - ko.length) + '/' + res.length + ' PASS =====');
  process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
