/* EXTRANETS GROSSISTES : retours de l'utilisateur du 08/11, verifies par le vrai chemin de l'ecran.
 * Autorise par l'utilisateur le 08/11 : domain3, base laborex_audit telle quelle (comptes reels), CONSULTATION seulement.
 * Ce test ne relit aucune liste sur l'extranet, n'enregistre ni n'efface aucun compte et n'ecrit rien en base : il ouvre
 * l'ecran (l'ecran se connecte seul avec les comptes enregistres, comme pour l'utilisateur) et lit les listes gardees.
 *
 *  1. « Se connecter » inactif et marque « ✓ Connecte » quand la session est ouverte ;
 *  3. disponibilite : « En stock », « oui »... en vert, « non », « rupture »... en rouge ;
 *  4. contenu complet au survol (data-qtip) = valeur de la cellule ;
 *  5. onglet Sessions visible pour l'administrateur ;
 *  7. stock par agence : au moins 300 px de haut ;
 *  8. nouveaux produits : nombre affiche = lignes de la grille = API ;
 * 10. liste deja lue : le premier clic sur « Lire sur l'extranet » demande confirmation dans le bouton et ne lit rien ;
 *     sans second clic, le bouton revient a son texte.
 * Bilan : aucune ligne ajoutee a extranet_collecte, comptes inchanges.
 *
 * Lancement : BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-ecran-retours-0811.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : ''));
}
const ECRAN = 'extranetsgrossistes';

(async () => {
  const comptesAvant = q('SELECT CONCAT_WS(\'|\', source, modifie_le) FROM extranet_compte ORDER BY source');
  const collecteAvant = q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte');
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const lectures = [];
  p.on('request', (r) => { if (/\/collecte(\?|$)|\/lectures\//.test(r.url()) && r.method() === 'POST') { lectures.push(r.url()); } });
  const onglet = async (titres) => {
    for (const t of titres) { await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + t + ']'); await p.waitForTimeout(500); }
  };
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });

    /* 5 : onglet Sessions montre a l'administrateur */
    const api = await p.evaluate(() => fetch('../api/v1/extranet/sessions').then((r) => r.json()));
    await p.waitForTimeout(1500);
    const visible = await p.evaluate(() => { const o = Ext.ComponentQuery.query('extranetsgrossistes #exOngletSessions')[0];
      return o && o.tab && o.tab.isVisible(); });
    ok('5 : onglet Sessions visible = administrateur', api.administrateur === true && visible === true, 'admin=' + api.administrateur + ' visible=' + visible);

    /* 1 : sessions ouvertes -> « Se connecter » inactif ; attendre la fin des connexions seules */
    await onglet(['Sessions']);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('extranetsgrossistes')[0].query('[isMasked]').length
      && Ext.ComponentQuery.query('extranetsgrossistes #exOngletSessions')[0].el.dom.textContent.indexOf('Connexion en cours') < 0,
    null, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(3000);
    const etats = await p.evaluate(() => fetch('../api/v1/extranet/sessions').then((r) => r.json()));
    const boutons = await p.evaluate(() => ['UBIPHARM', 'TEDIS', 'COPHARMED', 'DPCI'].map((s) => {
      const b = Ext.ComponentQuery.query('extranetsgrossistes #exConnecter' + s)[0];
      return { s, inactif: b.isDisabled(), texte: b.getText() };
    }));
    const attendu = etats.data.filter((x) => x.source !== 'MAYITE').map((x) => {
      const ouverte = x.etat === 'VALIDE' || x.etat === 'A_VERIFIER', b = boutons.find((y) => y.s === x.source);
      return { s: x.source, ouverte, enregistre: !!(x.compte && x.compte.enregistre), b };
    });
    ok('1 : bouton inactif et « ✓ Connecté » si la session est ouverte, actif sinon (identifiants enregistrés)', attendu.every((a) =>
      a.ouverte ? a.b.inactif && a.b.texte === '✓ Connecté' : (a.b.inactif === !a.enregistre && a.b.texte === 'Se connecter')),
    JSON.stringify(attendu.map((a) => [a.s, a.ouverte, a.b.inactif, a.b.texte])));
    ok('1 : au moins une session ouverte pour la vérification', attendu.some((a) => a.ouverte), JSON.stringify(attendu.map((a) => a.s + ':' + a.ouverte)));

    /* 8 et 3 : nouveaux produits gardes (aucune lecture) ; 4 : la bulle affiche son attribut en HTML, compare decode */
    await onglet(['Ubipharm', 'Produits', 'Nouveaux produits']);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('extranetsgrossistes')[0].nouveaux.isLoading(), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const nv = await p.evaluate(async () => {
      const me = Ext.ComponentQuery.query('extranetsgrossistes')[0], g = me.down('#exOngletNouveaux gridpanel');
      const api = await fetch('../api/v1/extranet/ubipharm/nouveaux').then((r) => r.json());
      const cellules = Array.from(g.getView().el.dom.querySelectorAll('td'));
      const dispo = cellules.map((td) => { const s = td.querySelector('span[style*="color"]');
        return s ? { t: s.textContent, c: s.getAttribute('style') } : null; }).filter((x) => x);
      const qtips = cellules.filter((td) => td.getAttribute('data-qtip')).map((td) => ({ q: (() => { const d = document.createElement('div'); d.innerHTML = td.getAttribute('data-qtip'); return d.textContent; })(),
        t: td.textContent }));
      return { nombre: me.down('#exNouveauxNombre').el.dom.textContent, lignes: me.nouveaux.getCount(),
        api: (api.produits || []).length, dispo, qtips, date: me.down('#exNouveauxDate').el.dom.textContent };
    });
    ok('8 : nombre affiché = lignes de la grille = API', nv.lignes > 0 && nv.nombre === nv.lignes + ' produit(s)' && nv.api === nv.lignes, nv.nombre + ' / ' + nv.lignes + ' / ' + nv.api);
    const vert = nv.dispo.filter((d) => /^\s*(oui|disponible|en stock)/i.test(d.t)), rouge = nv.dispo.filter((d) => /^\s*(non|indisponible|rupture|épuisé)/i.test(d.t));
    ok('3 : disponibilité en couleur (oui / en stock en vert, non / rupture en rouge)', vert.length + rouge.length > 0
      && vert.every((d) => /#1e8449/.test(d.c)) && rouge.every((d) => /#c0392b/.test(d.c)),
    'vert ' + vert.length + ', rouge ' + rouge.length + ' ' + JSON.stringify(nv.dispo.slice(0, 3)));
    const pleines = nv.qtips.filter((x) => x.t);
    ok('4 : contenu complet au survol = texte de la cellule', pleines.length > 0 && pleines.every((x) => x.q === x.t
      || x.q.replace(/\s+/g, ' ').indexOf(x.t.replace(/\s+/g, ' ').slice(0, 20)) >= 0), pleines.length + ' cellules ' + JSON.stringify(pleines.filter((x) => !(x.q === x.t || x.q.replace(/\s+/g, ' ').indexOf(x.t.replace(/\s+/g, ' ').slice(0, 20)) >= 0)).slice(0, 4)));

    /* 10 : deja lue -> confirmation dans le bouton, aucune lecture */
    const avantClic = lectures.length;
    await vues.cliquer(p, ECRAN + ' #exNouveauxCollecter');
    await p.waitForTimeout(1000);
    const texte1 = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exNouveauxCollecter')[0].getText());
    ok('10 : premier clic : « Déjà lu le … : relire ? » dans le bouton, aucune lecture lancée', /^Déjà lu le \d{4}-\d{2}-\d{2} \d{2}:\d{2} : relire \?$/.test(texte1)
      && lectures.length === avantClic, texte1 + ' / ' + nv.date);
    await p.waitForTimeout(6500);
    const texte2 = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exNouveauxCollecter')[0].getText());
    ok('10 : sans second clic, le bouton revient et rien n\'est lu', texte2 === 'Lire sur l\'extranet' && lectures.length === avantClic, texte2);

    /* 7 : stock par agence */
    await onglet(['Fiche produit']);
    const h = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exAgencesGrille')[0].getHeight());
    ok('7 : stock par agence : au moins 300 px', h >= 300, h + ' px');

    ok('bilan : aucune lecture sur l\'extranet lancée par le test', lectures.length === 0, JSON.stringify(lectures));
    ok('bilan : aucune collecte ajoutée', q('SELECT IFNULL(MAX(id), 0) FROM extranet_collecte') === collecteAvant);
    ok('bilan : comptes inchangés', q('SELECT CONCAT_WS(\'|\', source, modifie_le) FROM extranet_compte ORDER BY source') === comptesAvant);
    ok('aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
  } catch (e) {
    ok('déroulé sans erreur', false, e.stack || e);
    await ENV_E2E.capture(p, 'retours-0811-erreur').catch(() => {});
  } finally {
    await navigateur.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
