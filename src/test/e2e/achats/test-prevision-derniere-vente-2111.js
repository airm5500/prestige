/* PLAN DU 21/11, POINT 4.3 : la fenetre de prevision d'un produit tres vendu mettait des secondes a s'ouvrir (la
 * « dernière vente » lisait toutes les ventes du produit depuis toujours). Nouvelle lecture en deux temps.
 * Rapprochement : pour des produits varies (les plus vendus, moyens, peu vendus, jamais vendus), la derniere vente
 * (date, quantite) de la fenetre = celle de l'ANCIENNE requete, rejouee en base.
 * Cas limites, crees sur la base de test puis remis a l'identique :
 *  - une vente plus ancienne (par ses lignes) cloturee APRES la plus recente : c'est elle la derniere vente ;
 *  - la vente la plus recente annulee : elle est ecartee.
 * Ecran : GESTION DES COMMANDES > Prévisions, onglet Prévisions, recherche, clic sur la ligne : la fenetre montre la
 * meme derniere vente, ouverte en moins de PLAFOND_MS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s.replace(/\s*\n\s*/g, ' ')], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const EMPL = '1';
const PLAFOND_MS = 3000;
/* l'ancienne requete, mot pour mot : la reference */
const ANCIENNE = (f) => q(`SELECT CONCAT(DATE_FORMAT(p.dt_UPDATED, '%d/%m/%Y'), '|', SUM(d.int_QUANTITY))
  FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
  JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '${EMPL}'
  WHERE d.lg_FAMILLE_ID = '${f}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
  GROUP BY p.lg_PREENREGISTREMENT_ID, p.dt_UPDATED ORDER BY p.dt_UPDATED DESC LIMIT 1`);
/* produits de la prevision, par nombre de lignes de vente */
const VENTES = `SELECT pp.lg_FAMILLE_ID, (SELECT COUNT(*) FROM t_preenregistrement_detail d WHERE d.lg_FAMILLE_ID = pp.lg_FAMILLE_ID) n
  FROM t_prevision_produit pp JOIN t_famille f ON f.lg_FAMILLE_ID = pp.lg_FAMILLE_ID WHERE pp.lg_EMPLACEMENT_ID = '${EMPL}'`;
const liste = (s) => q(s).split('\n').filter(Boolean).map((l) => l.split('\t')[0]);

(async () => {
  const produits = [...new Set([
    ...liste(VENTES + ' ORDER BY n DESC LIMIT 6'),
    ...liste(`SELECT x.lg_FAMILLE_ID FROM (${VENTES}) x WHERE x.n BETWEEN 20 AND 500 ORDER BY RAND(2111) LIMIT 8`),
    ...liste(`SELECT x.lg_FAMILLE_ID FROM (${VENTES}) x WHERE x.n BETWEEN 1 AND 19 ORDER BY RAND(2111) LIMIT 8`),
    ...liste(`SELECT x.lg_FAMILLE_ID FROM (${VENTES}) x WHERE x.n = 0 ORDER BY RAND(2111) LIMIT 3`)])];
  /* cas limites sur le produit le plus vendu : ses deux ventes retenues les plus recentes par les lignes */
  const P = produits[0];
  const deux = q(`SELECT p.lg_PREENREGISTREMENT_ID, p.dt_UPDATED FROM t_preenregistrement_detail d
    JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
    JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '${EMPL}'
    WHERE d.lg_FAMILLE_ID = '${P}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
    ORDER BY d.dt_CREATED DESC LIMIT 2`).split('\n').map((l) => l.split('\t'));
  const [VA, VB] = deux;
  const remettre = () => { if (VA && VB) { q(`UPDATE t_preenregistrement SET dt_UPDATED = '${VB[1]}' WHERE lg_PREENREGISTREMENT_ID = '${VB[0]}';`
    + `UPDATE t_preenregistrement SET b_IS_CANCEL = 0 WHERE lg_PREENREGISTREMENT_ID = '${VA[0]}'`); } };
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    ok('Jeu d\'essai : produits variés (très vendus, moyens, peu vendus, jamais vendus)', produits.length >= 15 && deux.length === 2, produits.length);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const fenetre = (id) => p.evaluate(async (i) => { const t0 = performance.now(); const o = await fetch('../api/v1/analyse-commande/produit/' + i).then((r) => r.json());
      return { ms: Math.round(performance.now() - t0), succes: o.success, v: o.derniereVente ? o.derniereVente + '|' + o.derniereVenteQte : '' }; }, id);

    /* 1. rapprochement produit par produit */
    const ecarts = [];
    let avecVente = 0, sansVente = 0, plusLong = 0;
    for (const id of produits) {
      const r = await fenetre(id);
      const attendu = ANCIENNE(id);
      if (r.succes !== false) { if (attendu) { avecVente++; } else { sansVente++; } }
      plusLong = Math.max(plusLong, r.ms);
      if (r.succes !== false && r.v !== attendu) { ecarts.push(id + ' : ' + r.v + ' au lieu de ' + attendu); }
    }
    ok('Dernière vente (date et quantité) = ancienne requête, produit par produit', ecarts.length === 0 && avecVente >= 10, ecarts.slice(0, 4).join(' / ') + ' ; ' + avecVente + ' avec vente, ' + sansVente + ' sans');
    ok('Chaque fenêtre en moins de ' + PLAFOND_MS + ' ms', plusLong < PLAFOND_MS, plusLong + ' ms au plus');

    /* 2. une vente plus ancienne par ses lignes, cloturee apres la plus recente */
    q(`UPDATE t_preenregistrement SET dt_UPDATED = DATE_ADD('${VA[1]}', INTERVAL 26 HOUR) WHERE lg_PREENREGISTREMENT_ID = '${VB[0]}'`);
    const att2 = ANCIENNE(P), r2 = await fenetre(P);
    ok('Vente clôturée plus tard que la plus récente : c\'est elle qui est retenue', r2.v === att2 && att2 !== '', r2.v + ' / ' + att2);
    q(`UPDATE t_preenregistrement SET dt_UPDATED = '${VB[1]}' WHERE lg_PREENREGISTREMENT_ID = '${VB[0]}'`);

    /* 3. la vente la plus recente annulee : ecartee */
    q(`UPDATE t_preenregistrement SET b_IS_CANCEL = 1 WHERE lg_PREENREGISTREMENT_ID = '${VA[0]}'`);
    const att3 = ANCIENNE(P), r3 = await fenetre(P);
    ok('Vente la plus récente annulée : écartée', r3.v === att3 && att3 !== '', r3.v + ' / ' + att3);
    remettre();

    /* 4. ecran */
    const cip = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`);
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Prévisions');
    await p.waitForFunction(() => Ext.ComponentQuery.query('analysecommande').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('analysecommande')[0]; const t = a.isXType('tabpanel') ? a : a.down('tabpanel'); t.setActiveTab(t.down('#ongletPrevisions')); });
    await p.waitForTimeout(1500);
    await saisir(p, 'analysecommande #ongletPrevisions #query', cip);
    const charge = p.waitForResponse((r) => /analyse-commande\/previsions\?/.test(r.url()), { timeout: 30000 }).catch(() => null);
    await cliquer(p, 'analysecommande #ongletPrevisions button[text=Rechercher]');
    await charge; await p.waitForTimeout(1500);
    const ligne = await p.evaluate((f) => { const g = Ext.ComponentQuery.query('analysecommande #ongletPrevisions')[0];
      const i = g.getStore().findBy((r) => r.get('id') === f || r.get('lg_FAMILLE_ID') === f || r.get('familleId') === f);
      const n = i >= 0 ? g.getView().getNode(i) : null; if (n) { n.id = n.id || 'e2e-ligne-prev'; } return n ? '#' + n.id + ' td' : null; }, P);
    ok('Écran : le produit est dans la liste des prévisions', !!ligne);
    if (ligne) {
      const t0 = Date.now();
      await p.locator(ligne).nth(2).click();
      await p.waitForFunction(() => Array.from(document.querySelectorAll('.pv-derniere')).some((x) => x.offsetWidth > 0), null, { timeout: 30000 });
      const ms = Date.now() - t0;
      const texte = await p.evaluate(() => Array.from(document.querySelectorAll('.pv-derniere')).find((x) => x.offsetWidth > 0).innerText);
      const [date, qte] = ANCIENNE(P).split('|');
      ok('Écran : « Dernière vente » = base (date et quantité)', texte.indexOf(date) >= 0 && new RegExp('—\\s*' + qte + ' unité').test(texte), texte + ' / ' + date + ' ' + qte);
      ok('Écran : fenêtre ouverte en moins de ' + PLAFOND_MS + ' ms', ms < PLAFOND_MS, ms + ' ms');
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    remettre();
    ok('Ventes remises à l\'identique', !VA || q(`SELECT COUNT(*) FROM t_preenregistrement WHERE (lg_PREENREGISTREMENT_ID = '${VB[0]}' AND dt_UPDATED = '${VB[1]}') OR (lg_PREENREGISTREMENT_ID = '${VA[0]}' AND b_IS_CANCEL = 0)`) === '2');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
