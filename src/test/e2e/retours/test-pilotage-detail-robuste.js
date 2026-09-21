/* Un libelle d'AFFICHAGE ne doit jamais faire perdre un chiffre.
 *
 * CE QUE CE TEST REJOUE. Le 20/09, chez l'officine, la liste des agences composant un groupe de
 * fournisseurs - un libelle d'affichage, rien de plus - a depasse la taille de sa colonne. L'ecriture a
 * echoue, et comme le detail s'ecrivait dans la MEME transaction que le mois, le mois de juillet tout
 * entier a ete annule alors que ses chiffres etaient justes et deja calcules.
 *
 * Le test reproduit exactement cette situation, en retrecissant la colonne le temps d'un recalcul, et
 * verifie que le mois SURVIT : ses chiffres sont enregistres et justes, seul le detail d'affichage
 * manque. Puis il rend a la colonne sa taille et verifie que le detail revient.
 *
 * Le recalcul est declenche par le BOUTON de l'ecran, avec sa confirmation : c'est le geste de
 * l'officine, pas un appel d'API.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 330) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const TAILLE_NORMALE = "ALTER TABLE pilotage_agregat_grossiste MODIFY COLUMN str_MEMBRES TEXT NULL;";

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('pilotage', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('pilotage #onglets').length > 0, null,
      { timeout: 30000 });
    await p.waitForTimeout(8000);

    /* Le geste de l'officine : le bouton « Recalculer », et « Oui » a la confirmation. */
    const recalculer = async () => {
      await p.evaluate(() => {
        Ext.ComponentQuery.query('pilotage #barrePeriode button[itemId=recalculer]')[0].el.dom.click();
      });
      await p.waitForFunction(() => {
        const f = Ext.WindowManager.getActive();
        return f && f.down && f.down('button[itemId=yes]');
      }, null, { timeout: 15000 });
      await p.evaluate(() => Ext.WindowManager.getActive().down('button[itemId=yes]').el.dom.click());
      /* Le recalcul reprend les treize mois affiches : on attend qu'il ait rendu la main. */
      await p.waitForFunction(() => {
        const z = Ext.ComponentQuery.query('pilotage #barrePeriode #zoneProgression')[0];
        return z && z.isHidden();
      }, null, { timeout: 300000 });
      await p.waitForTimeout(3000);
    };

    /* --------------------------------------------------- la colonne devient trop petite */
    exec("TRUNCATE TABLE pilotage_agregat_mensuel; TRUNCATE TABLE pilotage_agregat_grossiste;"
      + " ALTER TABLE pilotage_agregat_grossiste MODIFY COLUMN str_MEMBRES VARCHAR(4) NULL;");
    ok('Précondition : les agrégats sont vides et la colonne d affichage est devenue trop petite',
      q("SELECT COUNT(*) FROM pilotage_agregat_mensuel") === '0'
      && /varchar\(4\)/i.test(q("SELECT COLUMN_TYPE FROM information_schema.COLUMNS"
        + " WHERE TABLE_SCHEMA='" + BASE + "' AND TABLE_NAME='pilotage_agregat_grossiste'"
        + " AND COLUMN_NAME='str_MEMBRES'")),
      q("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='" + BASE + "'"
        + " AND TABLE_NAME='pilotage_agregat_grossiste' AND COLUMN_NAME='str_MEMBRES'"));

    await recalculer();

    /*
     * LA PREUVE. Le detail des grossistes ne peut pas s'ecrire - la colonne est trop petite - mais les
     * chiffres des mois, eux, sont la. Avant le correctif, ils disparaissaient avec lui.
     */
    const moisEnregistres = Number(q("SELECT COUNT(*) FROM pilotage_agregat_mensuel"));
    ok('Le détail d affichage échoue, mais les mois sont ENREGISTRÉS quand même',
      moisEnregistres > 0, moisEnregistres + ' mois enregistre(s)');
    ok('Et le détail a bien échoué : c est ce qu on voulait éprouver',
      q("SELECT COUNT(*) FROM pilotage_agregat_grossiste") === '0',
      q("SELECT COUNT(*) FROM pilotage_agregat_grossiste") + ' ligne(s) de detail');

    /* Les chiffres enregistres sont JUSTES : survivre ne suffit pas, encore faut-il etre exact. */
    const moisTest = q("SELECT str_MOIS FROM pilotage_agregat_mensuel WHERE int_CA_TTC > 0"
      + " ORDER BY str_MOIS DESC LIMIT 1");
    const caEnregistre = q("SELECT int_CA_TTC FROM pilotage_agregat_mensuel WHERE str_MOIS='" + moisTest + "'");
    const caBase = q("SELECT ROUND(COALESCE(SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE,0)),0))"
      + " FROM t_preenregistrement p WHERE p.int_PRICE>0 AND p.str_STATUT='is_Closed'"
      + " AND p.b_IS_CANCEL=0 AND p.lg_TYPE_VENTE_ID<>'5'"
      + " AND DATE_FORMAT(p.dt_UPDATED,'%Y-%m')='" + moisTest + "'");
    ok('Les chiffres conservés sont EXACTEMENT ceux de la base : survivre ne suffit pas',
      Math.abs(Number(caEnregistre) - Number(caBase)) <= 1,
      moisTest + ' : ' + caEnregistre + ' contre ' + caBase);

    /* Et l ecran, lui, continue d afficher ce mois : le defaut ne se voit pas a l usage. */
    await p.evaluate(() => Ext.ComponentQuery.query('pilotage #barrePeriode button[itemId=actualiser]')[0]
      .el.dom.click());
    await p.waitForTimeout(9000);
    const affiche = await p.evaluate((m) => {
      const e = Ext.ComponentQuery.query('pilotage')[0];
      let valeur = null;
      e.stores.synthese.mois.each((r) => { if (r.get('mois') === m) { valeur = r.get('caTTC'); } });
      return valeur;
    }, moisTest);
    ok('L écran affiche ce mois normalement : l échec du détail ne se voit pas à l usage',
      Math.abs(Number(affiche) - Number(caBase)) <= 1, affiche + ' contre ' + caBase);

    /* --------------------------------------------------- la colonne retrouve sa taille */
    exec(TAILLE_NORMALE);
    await recalculer();
    const detail = Number(q("SELECT COUNT(*) FROM pilotage_agregat_grossiste"));
    ok('La colonne rendue à sa taille, le détail revient tout seul au recalcul suivant',
      detail > 0, detail + ' ligne(s) de detail');
    const groupe = q("SELECT str_MEMBRES FROM pilotage_agregat_grossiste"
      + " WHERE str_MEMBRES LIKE '%,%' LIMIT 1");
    ok('Et il porte de nouveau le nom des agences composant un groupe',
      !!groupe && groupe.indexOf(',') > 0, groupe);

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + e.stack);
  } finally {
    /*
     * REMISE EN ETAT. Cette suite VIDE les agregats pour rejouer l'incident, et ne recalcule ensuite que
     * les mois de l'axe affiche - treize sur les trente-sept que porte le banc. Elle laissait donc la
     * table amputee, et la suite jouee juste apres lisait un tableau vide : « 0 ligne(s) » sur l'onglet
     * Achats / Ventes, qui a besoin de trois annees civiles. Ce n'etait pas un defaut du logiciel mais
     * une suite qui ne rendait pas la base telle qu'elle l'avait trouvee. Elle la rend maintenant :
     * la colonne a sa taille, et TOUS les mois presents dans les ventes sont reconstruits.
     */
    try { exec(TAILLE_NORMALE); } catch (e) { console.log('restauration : ' + e.message); }
    try {
      /*
       * Le recalcul suit la FENETRE GRAPHIQUE de l'axe demande, soit douze mois : c'est ce que fait le
       * bouton, qui refait ce que l'on regarde. Pour couvrir tout l'historique on le rappelle donc par
       * tranches de douze mois, en remontant du mois le plus recent au plus ancien.
       */
      const bornes = q("SELECT CONCAT(DATE_FORMAT(MIN(dt_UPDATED),'%Y-%m'),' ',"
        + " DATE_FORMAT(MAX(dt_UPDATED),'%Y-%m')) FROM t_preenregistrement"
        + " WHERE str_STATUT='is_Closed'").split(' ');
      const enMois = (aaaaMm) => Number(aaaaMm.slice(0, 4)) * 12 + Number(aaaaMm.slice(5, 7)) - 1;
      const premier = enMois(bornes[0]);
      let curseur = enMois(bornes[1]);
      let total = 0;
      while (curseur >= premier) {
        const an = Math.floor(curseur / 12);
        const mo = (curseur % 12) + 1;
        const fin = ('0' + mo).slice(-2) + '/' + an;
        const rep = await p.evaluate(async (f) => {
          const r = await fetch('../api/v1/pilotage/recalculer?axe=PERSO&dtStart=01/' + f
            + '&dtEnd=28/' + f, { credentials: 'same-origin' });
          return r.json();
        }, fin);
        total += (rep && rep.mois) || 0;
        curseur -= 12;
      }
      console.log('remise en etat : ' + total + ' mois reconstruits ('
        + bornes[0] + ' -> ' + bornes[1] + ')');
    } catch (e) { console.log('remise en etat impossible : ' + e.message); }
    await b.close();
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
