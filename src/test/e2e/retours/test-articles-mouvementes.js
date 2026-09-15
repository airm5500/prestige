/* Evolution 5, point 8 : ecran « articles mouvementes » (articlemvtgrid).
 *   - une seule ligne par article, quel que soit le nombre de mouvements de la periode ;
 *   - colonne « Type(s) de mouvement » : les modes rencontres, concatenes ;
 *   - filtres mode de mouvement / emplacement / famille, et bouton « Creer inventaire (toute la liste) » ;
 *   - l'ecran est rattache a la presentation collee (correctifs-affichage).
 * Le parcours est joue a l'ecran : saisie des dates, choix dans les combos, clics sur les boutons.
 * Le jeu de mouvements pose par le test et l'inventaire cree sont retires a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const MARQUE = 'E2E-ARTMVT';           // prefixe de pkey : tout ce que le test pose est retrouvable
const LIB = 'INVENTAIRE ARTICLES EN MOUVEMENT DU %';

function nettoyer() {
  exec("DELETE FROM hmvtproduit WHERE pkey LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN"
    + " (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE '" + LIB + "');"
    + "DELETE FROM t_inventaire WHERE str_NAME LIKE '" + LIB + "';");
}

/* Six articles, deux emplacements distincts. Le premier a DEUX mouvements de types differents :
   c'est lui qui prouve la ligne unique et la concatenation des modes. */
function poser() {
  nettoyer();
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='admin'");
  const zones = q("SELECT GROUP_CONCAT(z ORDER BY n DESC SEPARATOR '|') FROM (SELECT f.lg_ZONE_GEO_ID z, COUNT(*) n"
    + " FROM t_famille f WHERE f.str_STATUT='enable' AND f.lg_ZONE_GEO_ID IS NOT NULL GROUP BY 1 HAVING n>=4"
    + " ORDER BY n DESC LIMIT 2) x").split('|');
  const arts = [];
  zones.forEach((zone) => {
    q("SELECT GROUP_CONCAT(lg_FAMILLE_ID SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID FROM t_famille"
      + " WHERE str_STATUT='enable' AND lg_ZONE_GEO_ID='" + zone + "' ORDER BY lg_FAMILLE_ID LIMIT 3) y")
      .split('|').forEach((id) => arts.push({ id, zone }));
  });
  // (article, type de mouvement) : 7 mouvements pour 6 articles
  const mvts = [[0, '02'], [0, '01'], [1, '02'], [2, '01'], [3, '04'], [4, '08'], [5, '08']];
  const valeurs = mvts.map((m, i) => "('" + MARQUE + '-' + i + "', 1, NOW(), CURDATE(), '" + MARQUE + '-' + i + "',"
    + " 100, 200, 10, 10, 1, 0, '1', '" + arts[m[0]].id + "', '" + user + "', '" + m[1] + "', 0)").join(',');
  exec("INSERT INTO hmvtproduit (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale,"
    + " qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, ug) VALUES " + valeurs + ";");
  return { arts, zones };
}

(async () => {
  const jeu = poser();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('articlemvtgrid', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('articlemvtgrid').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(4000);

    const attendre = () => p.waitForTimeout(2500);
    const grille = () => p.evaluate(() => {
      const g = Ext.ComponentQuery.query('articlemvtgrid')[0];
      const lignes = []; g.getStore().each((r) => lignes.push({
        id: r.get('lgFamilleId'), cip: r.get('codeCip'), nom: r.get('strName'),
        types: r.get('typesMvt'), empl: r.get('emplacement'), fam: r.get('famille')
      }));
      return { total: g.getStore().getTotalCount(), lignes };
    });

    /* 1. une seule ligne par article */
    let d = await grille();
    const uniques = new Set(d.lignes.map((l) => l.id));
    ok('Une seule ligne par article (6 articles pour 7 mouvements)',
      d.total === 6 && d.lignes.length === 6 && uniques.size === 6, JSON.stringify({ total: d.total, lignes: d.lignes.length, uniques: uniques.size }));

    /* 2. la colonne des types existe et concatene les modes de l'article qui a bouge deux fois */
    const colonnes = await p.evaluate(() => Ext.ComponentQuery.query('articlemvtgrid')[0].columns
      .filter((c) => !c.hidden && c.dataIndex).map((c) => [c.dataIndex, c.text]));
    ok('Colonne « Type(s) de mouvement » presente, avec Emplacement et Famille',
      colonnes.some((c) => c[0] === 'typesMvt') && colonnes.some((c) => c[0] === 'emplacement')
      && colonnes.some((c) => c[0] === 'famille'), JSON.stringify(colonnes));

    const deuxTypes = d.lignes.find((l) => l.id === jeu.arts[0].id);
    ok('L article qui a deux mouvements affiche ses deux modes sur sa ligne unique',
      !!deuxTypes && /VENTE/.test(deuxTypes.types) && /ENTREE EN STOCK/.test(deuxTypes.types) && deuxTypes.types.indexOf(',') > 0,
      deuxTypes && deuxTypes.types);
    ok('Chaque ligne porte son emplacement et sa famille',
      d.lignes.every((l) => l.empl && l.fam), JSON.stringify(d.lignes.map((l) => [l.empl, l.fam])));

    /* 3. le combo des modes est alimente depuis la base, pas d'une liste figee */
    const modes = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('articlemvtgrid combobox[itemId=filtreTypeMvt]')[0];
      const v = []; c.getStore().each((r) => v.push([r.get('id'), r.get('libelle')]));
      return v;
    });
    ok('Le combo « Mode de mvt » liste les 14 types de la base, plus l entree Tous',
      modes.length === 15 && modes[0][0] === 'ALL' && modes.some((m) => m[1] === 'INVENTAIRE'), JSON.stringify(modes.length));

    /* 4. filtre sur le mode : seuls les articles ayant bouge ainsi restent, en une ligne chacun */
    const choisir = async (itemId, valeur) => {
      await p.evaluate(([id, v]) => {
        const c = Ext.ComponentQuery.query('articlemvtgrid combobox[itemId=' + id + ']')[0];
        c.setValue(v);
        c.fireEvent('select', c, [c.getStore().findRecord('id', v)].filter(Boolean));
      }, [itemId, valeur]);
      await attendre();
    };
    const idVente = modes.find((m) => m[1] === 'VENTE')[0];
    await choisir('filtreTypeMvt', idVente);
    d = await grille();
    ok('Filtre mode = VENTE : 2 articles, une ligne chacun',
      d.total === 2 && d.lignes.length === 2 && d.lignes.every((l) => /VENTE/.test(l.types)), JSON.stringify(d.lignes.map((l) => l.types)));

    const idInv = modes.find((m) => m[1] === 'INVENTAIRE')[0];
    await choisir('filtreTypeMvt', idInv);
    d = await grille();
    ok('Filtre mode = INVENTAIRE : 1 seul article', d.total === 1, d.total);

    /* 5. filtre sur l emplacement, mode remis a Tous */
    await choisir('filtreTypeMvt', 'ALL');
    await choisir('filtreEmplacement', jeu.zones[0]);
    d = await grille();
    const attendus0 = jeu.arts.filter((a) => a.zone === jeu.zones[0]).map((a) => a.id);
    ok('Filtre emplacement : seuls les articles de cet emplacement (3)',
      d.total === 3 && d.lignes.every((l) => attendus0.indexOf(l.id) >= 0), JSON.stringify({ total: d.total }));

    /* 6. filtres cumules : emplacement + mode */
    await choisir('filtreTypeMvt', idVente);
    d = await grille();
    ok('Emplacement et mode se cumulent (2 ventes, toutes dans cet emplacement)',
      d.total === 2 && d.lignes.every((l) => attendus0.indexOf(l.id) >= 0), d.total);

    /* 7. filtre famille */
    await choisir('filtreTypeMvt', 'ALL');
    await choisir('filtreEmplacement', 'ALL');
    const familles = await p.evaluate(() => {
      const c = Ext.ComponentQuery.query('articlemvtgrid combobox[itemId=filtreFamille]')[0];
      const v = []; c.getStore().each((r) => v.push([r.get('id'), r.get('libelle')]));
      return v;
    });
    const famArticle = d.lignes.length ? d.lignes[0].fam : null;
    const idFam = (familles.find((f) => f[1] === famArticle) || [])[0];
    await choisir('filtreFamille', idFam);
    d = await grille();
    ok('Filtre famille : la liste ne garde que cette famille',
      d.total >= 1 && d.lignes.every((l) => l.fam === famArticle), JSON.stringify({ total: d.total, fam: famArticle }));

    const idFamAutre = (familles.find((f) => f[0] !== 'ALL' && f[1] !== famArticle) || [])[0];
    if (idFamAutre) {
      await choisir('filtreFamille', idFamAutre);
      d = await grille();
      ok('Une autre famille ne ramene aucun de ces articles', d.total === 0, d.total);
    } else {
      ok('Une autre famille ne ramene aucun de ces articles', true, 'une seule famille utilisee dans cette base');
    }

    /* 8. le bouton Reinitialiser remet aussi les trois filtres a Tous */
    await p.evaluate(() => Ext.ComponentQuery.query('articlemvtgrid button[itemId=btnReset]')[0].fireEvent('click',
      Ext.ComponentQuery.query('articlemvtgrid button[itemId=btnReset]')[0]));
    await attendre();
    const apresReset = await p.evaluate(() => ['filtreTypeMvt', 'filtreEmplacement', 'filtreFamille']
      .map((id) => Ext.ComponentQuery.query('articlemvtgrid combobox[itemId=' + id + ']')[0].getValue()));
    ok('Reinitialiser remet les trois filtres a Tous', apresReset.every((v) => !v || v === 'ALL'), JSON.stringify(apresReset));
    d = await grille();
    ok('Apres reinitialisation la liste complete revient (6 articles)', d.total === 6, d.total);

    /* 9. export Excel : les criteres de l ecran partent avec la demande, et rien ne s ouvre en fenetre.
       On repose une periode explicite apres la reinitialisation, comme le ferait l utilisateur. */
    const jourTexte = q("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d')");
    await p.evaluate(() => {
      Ext.ComponentQuery.query('articlemvtgrid #dtStart')[0].setValue(new Date());
      Ext.ComponentQuery.query('articlemvtgrid #dtEnd')[0].setValue(new Date());
    });
    await choisir('filtreTypeMvt', idVente);
    const attenteExport = p.waitForRequest((r) => r.url().indexOf('/api/v1/articlemvt/export') >= 0, { timeout: 20000 });
    const fenetres = ctx.pages().length;
    await p.evaluate(() => { const btn = Ext.ComponentQuery.query('articlemvtgrid button[itemId=btnExportExcel]')[0]; btn.fireEvent('click', btn); });
    const reqExport = await attenteExport;
    const urlExport = new URL(reqExport.url());
    ok('Export Excel : le mode choisi et la periode partent avec la demande',
      urlExport.searchParams.get('typeMvt') === idVente && urlExport.searchParams.get('dtStart') === jourTexte,
      reqExport.url());
    ok('Export Excel : aucune fenetre supplementaire n est ouverte', ctx.pages().length === fenetres, ctx.pages().length);

    /* 10. inventaire de toute la liste filtree : deux articles, libelle rappelant le mode */
    await p.evaluate(() => { const btn = Ext.ComponentQuery.query('articlemvtgrid button[itemId=btnCreateInventaireListe]')[0]; btn.fireEvent('click', btn); });
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 10000 });
    const question = await p.evaluate(() => Ext.MessageBox.msg.el.dom.innerText);
    ok('La confirmation annonce le nombre d articles et le mode retenu',
      /2 article/.test(question) && /VENTE/.test(question), question);
    await p.evaluate(() => Ext.MessageBox.btnCallback(Ext.MessageBox.msgButtons.yes));
    await p.waitForTimeout(6000);
    const message = await p.evaluate(() => (Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.el.dom.innerText : ''));
    ok('L inventaire est annonce cree', /cr..?.?e avec succ/i.test(message) || /2 article/.test(message), message);
    await p.evaluate(() => { if (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });

    const inv = q("SELECT CONCAT(COUNT(*), '|', COALESCE(MAX(str_NAME), ''), '|', COALESCE(MAX(str_STATUT), ''),"
      + " '|', COALESCE(MAX(str_TYPE), '')) FROM t_inventaire WHERE str_NAME LIKE '" + LIB + "'").split('|');
    ok('Un seul inventaire cree, ouvert, sur l emplacement',
      inv[0] === '1' && inv[2] === 'enable' && inv[3] === 'emplacement', JSON.stringify(inv));
    ok('Le libelle de l inventaire rappelle la periode resolue et le mode retenu',
      inv[1] === 'INVENTAIRE ARTICLES EN MOUVEMENT DU ' + jourTexte + ' AU ' + jourTexte + ' - VENTE', inv[1]);
    const lignesInv = q("SELECT COUNT(*) FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN"
      + " (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE '" + LIB + "')");
    ok('L inventaire contient exactement les 2 articles de la liste filtree', lignesInv === '2', lignesInv);

    /* 11. presentation collee : l ecran occupe la place disponible, sans defilement global */
    const mise = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('articlemvtgrid')[0], c = g.ownerCt;
      return { colle: g.collerEnHaut === true, entete: !!g.header,
        largeur: g.getWidth(), largeurConteneur: c.body.getViewSize().width,
        defile: c.body.dom.scrollHeight - c.body.dom.clientHeight,
        barres: g.getDockedItems('toolbar[dock=top]').length };
    });
    ok('L ecran est colle au conteneur, sans entete en double ni defilement global',
      mise.colle && !mise.entete && Math.abs(mise.largeur - mise.largeurConteneur) < 3 && mise.defile <= 2, JSON.stringify(mise));
    ok('Deux barres d outils en haut : periode/recherche puis les trois filtres', mise.barres === 2, mise.barres);

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err.slice(0, 3)));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM hmvtproduit WHERE pkey LIKE '" + MARQUE + "%'), '|',"
      + " (SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE '" + LIB + "'))");
    ok('Tout ce que le test a pose est retire', reste === '0|0', reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
