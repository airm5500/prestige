/* PLAN DU 09/11, POINT 4 : RETOUR FOURNISSEUR, RECHERCHE « CONTIENT » ET PAR N° DE BL.
 *
 * Par l'ecran (admin, vrais clics), en lecture seule sur un retour valide de la base d'essai (rien n'est enregistre) :
 *  - liste des retours : un morceau pris AU MILIEU du nom d'un produit retourne trouve le retour (l'ancien
 *    « commence par » ne le trouvait pas) ; un morceau pris au milieu du n° de BL trouve le retour ; chaque retour
 *    affiche verifie la regle en base (produit, n° de BL ou reference qui contient le texte) ; un texte absent ne
 *    ramene rien ;
 *  - nouveau retour : la liste « Bon de livraison » propose le BL a partir d'un morceau du milieu de son n° ; une fois
 *    le BL choisi, la liste « Article » propose le produit a partir d'un morceau du milieu de son nom ; chaque
 *    proposition contient le texte tape ;
 *  - aucune erreur JavaScript.
 */
const C = require('../audits/commun');
const { ok, q } = C;
const { ouvrirMenu, cliquer, saisir } = require('../outils/vues');

const [RF, REF_BL, NOM, ID_BL] = q(`SELECT CONCAT_WS('|', rf.lg_RETOUR_FRS_ID, b.str_REF_LIVRAISON, f.str_NAME, b.lg_BON_LIVRAISON_ID)
  FROM t_retour_fournisseur rf JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = rf.lg_BON_LIVRAISON_ID
  JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = rf.lg_RETOUR_FRS_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
  WHERE rf.str_STATUT = 'enable' AND b.str_STATUT = 'is_Closed' AND rf.dt_UPDATED >= CURDATE() - INTERVAL 300 DAY
    AND f.str_NAME REGEXP '^[A-Z0-9]+ [A-Z0-9]{4,}' AND b.str_REF_LIVRAISON REGEXP '^[A-Za-z0-9/-]{8,}$'
  ORDER BY rf.dt_UPDATED DESC LIMIT 1`).split('|');
/* morceaux pris au milieu : le 2e mot du nom (4 lettres), le n° de BL sans ses 2 premiers ni son dernier caractere */
const MOT = NOM.split(' ')[1].slice(0, 4);
const MILIEU_BL = REF_BL.slice(2, -1);
const contient = (texte) => `(SELECT COUNT(*) FROM t_retour_fournisseur x LEFT JOIN t_bon_livraison xb ON xb.lg_BON_LIVRAISON_ID = x.lg_BON_LIVRAISON_ID
  WHERE x.lg_RETOUR_FRS_ID = '%ID%' AND (INSTR(IFNULL(xb.str_REF_LIVRAISON, ''), '${texte}') > 0 OR INSTR(IFNULL(x.str_REF_RETOUR_FRS, ''), '${texte}') > 0
  OR EXISTS (SELECT 1 FROM t_retour_fournisseur_detail xd JOIN t_famille xf ON xf.lg_FAMILLE_ID = xd.lg_FAMILLE_ID WHERE xd.lg_RETOUR_FRS_ID = x.lg_RETOUR_FRS_ID
    AND (INSTR(xf.str_NAME, '${texte}') > 0 OR INSTR(IFNULL(xf.int_CIP, ''), '${texte}') > 0 OR INSTR(IFNULL(xf.int_EAN13, ''), '${texte}') > 0))))`;

(async () => {
  ok('Jeu d\'essai : un retour (actif) avec son BL et un produit', !!RF && !!REF_BL && MOT.length === 4 && MILIEU_BL.length >= 4,
    [REF_BL, NOM, MOT, MILIEU_BL].join(' / '));
  ok('Les morceaux sont bien au milieu (ni le nom ni le n° de BL ne commencent par eux)', !NOM.startsWith(MOT) && !REF_BL.startsWith(MILIEU_BL), '');
  const { b, p, erreurs } = await C.connecter();
  const debut = new Date(Date.now() - 300 * 864e5);
  const jj = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  const chercher = async (texte) => {
    await cliquer(p, 'retourfrsmanager #rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(texte, { delay: 20 });
    const rep = p.waitForResponse((r) => /retours-data/.test(r.url()), { timeout: 20000 });
    await p.keyboard.press('Enter');
    await rep;
    await p.waitForFunction(() => !Ext.ComponentQuery.query('retourfrsmanager')[0].getStore().isLoading(), null, { timeout: 20000 });
    await p.waitForTimeout(400);
    return p.evaluate(() => Ext.ComponentQuery.query('retourfrsmanager')[0].getStore().getRange().map((r) => (r.raw && r.raw.lgRETOURFRSID) || r.get('lg_RETOUR_FRS_ID')));
  };
  const respectent = (ids, texte) => ids.filter((id) => q(contient(texte).replace('%ID%', id)) !== '1');
  try {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('retourfrsmanager')[0]; return e && e.isVisible(true); }, null, { timeout: 30000 });
    await p.waitForTimeout(1000);
    await saisir(p, 'retourfrsmanager #datedebut', jj(debut));

    const parNom = await chercher(MOT);
    ok('Liste : un morceau du milieu du nom du produit trouve le retour', parNom.indexOf(RF) >= 0, MOT + ' -> ' + parNom.length + ' retour(s)');
    const fauxNom = respectent(parNom, MOT);
    ok('Liste : chaque retour trouvé contient le texte (produit, n° de BL ou référence), vérifié en base', parNom.length > 0 && fauxNom.length === 0, fauxNom.join(','));
    const parBl = await chercher(MILIEU_BL);
    ok('Liste : un morceau du milieu du n° de BL trouve le retour', parBl.indexOf(RF) >= 0, MILIEU_BL + ' -> ' + parBl.length + ' retour(s)');
    const fauxBl = respectent(parBl, MILIEU_BL);
    ok('Liste : chaque retour trouvé par le n° de BL vérifie la règle en base', fauxBl.length === 0, fauxBl.join(','));
    const rien = await chercher('ZZQXW9');
    ok('Liste : un texte absent ne ramène rien', rien.length === 0, rien.length);

    /* nouveau retour : listes BL et article (rien n'est enregistre) */
    await cliquer(p, 'retourfrsmanager button[text=NOUVEAU RETOUR]');
    await p.waitForFunction(() => { const c = Ext.getCmp('lg_BON_LIVRAISON_ID'); return c && c.isVisible(true); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await cliquer(p, '#lg_BON_LIVRAISON_ID');
    const repBl = p.waitForResponse((r) => /\/RetourFournisseur\?/.test(r.url()) && /query=/.test(r.url()), { timeout: 20000 });
    await p.keyboard.type(MILIEU_BL, { delay: 30 });
    await repBl;
    await p.waitForTimeout(800);
    const propBl = await p.evaluate(() => Ext.getCmp('lg_BON_LIVRAISON_ID').getStore().getRange().map((r) => r.get('str_REF_LIVRAISON')));
    ok('Nouveau retour : la liste des BL propose le BL à partir du milieu de son n°', propBl.indexOf(REF_BL) >= 0, MILIEU_BL + ' -> ' + propBl.slice(0, 6).join(','));
    ok('Nouveau retour : chaque BL proposé contient le texte tapé', propBl.length > 0 && propBl.every((x) => String(x).indexOf(MILIEU_BL) >= 0), propBl.slice(0, 6).join(','));
    const item = await p.evaluate((ref) => { const c = Ext.getCmp('lg_BON_LIVRAISON_ID'), picker = c.getPicker(), i = c.getStore().findExact('str_REF_LIVRAISON', ref);
      const n = i >= 0 ? picker.getNode(i) : null; if (!n) { return null; } n.id = n.id || 'e2e-bl-propose'; return '#' + n.id; }, REF_BL);
    if (!item) { throw new Error('BL non proposé : ' + REF_BL); }
    await p.click(item);
    await p.waitForFunction(() => { const c = Ext.getCmp('str_NAME'); return c && !c.disabled; }, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    await cliquer(p, '#str_NAME');
    const repArt = p.waitForResponse((r) => /\/RetourFourData\?/.test(r.url()) && /query=/.test(r.url()), { timeout: 20000 });
    await p.keyboard.type(MOT, { delay: 30 });
    await repArt;
    await p.waitForTimeout(800);
    const propArt = await p.evaluate(() => Ext.getCmp('str_NAME').getStore().getRange().map((r) => String(r.get('str_DESCRIPTION') || r.get('str_NAME') || '')));
    ok('Nouveau retour : la liste des articles du BL propose le produit à partir du milieu de son nom', propArt.some((x) => x.indexOf(NOM) >= 0), MOT + ' -> ' + propArt.slice(0, 6).join(' ; '));
    const nomsBl = q(`SELECT GROUP_CONCAT(CONCAT(f.int_CIP, ' ', f.str_NAME) SEPARATOR '|') FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID
      WHERE d.lg_BON_LIVRAISON_ID = '${ID_BL}'`).split('|');
    ok('Nouveau retour : chaque article proposé est un produit du BL qui contient le texte', propArt.length > 0
      && propArt.every((x) => x.indexOf(MOT) >= 0 && nomsBl.some((n) => x.indexOf(n.split(' ').slice(1).join(' ')) >= 0 || n.indexOf(x) >= 0)), propArt.slice(0, 6).join(' ; '));
    const enBase = q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE dt_CREATED >= NOW() - INTERVAL 10 MINUTE`);
    ok('Bilan : aucun retour créé par le test', enBase === '0', enBase);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } finally {
    await b.close();
    C.bilan();
  }
})();
