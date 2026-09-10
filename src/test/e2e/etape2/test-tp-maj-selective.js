/* Etape 2 : la mise a jour selective des tiers payants passe d'un formulaire de trois reglages
   figes a un selecteur de donnees a cocher, avec dix donnees de plus.

   Ce qui compte ici : une donnee NON cochee ne doit jamais bouger. Un ecran qui ecrit en masse
   et deborde sur des colonnes qu'on ne lui a pas demandees ferait perdre le parametrage de
   dizaines d'organismes d'un coup. Chaque assertion le verifie explicitement. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

const COLONNES = ['int_NBRE_EXEMPLAIRE_BORD', 'int_NBREBONS', 'int_MONTANTFAC', 'str_MODE_TRI_FACTURE',
  'dbl_PLAFOND_CREDIT', 'dbl_PLAFOND_VENTE', 'b_IsAbsolute', 'str_COMPTE_CONTRIBUABLE',
  'str_REGISTRE_COMMERCE', 'str_CODE_OFFICINE', 'int_NB_BONS_PAR_PAGE', 'int_TAILLE_POLICE'];

let TP = [], AVANT = {};

/* Le privilege « Autorisation de mise a jour selectives tiers payants ». La ressource REST le
   reverifie a chaque appel, et la session le lit AU MOMENT DE LA CONNEXION : il faut donc
   l'accorder avant d'ouvrir le navigateur, et le retirer a la fin pour rendre la base intacte. */
const PRIV = '20260816';
const LIGNE_PRIV = 'E2E-ETAPE2-MAJ-TP';
let privilegeAjoute = false;

function roleDuTesteur() {
  return q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID=ru.lg_USER_ID"
    + " WHERE u.str_LOGIN='KGA3' LIMIT 1");
}
function accorderPrivilege() {
  const role = roleDuTesteur();
  if (!role) { return false; }
  const deja = q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID='" + role
    + "' AND lg_PRIVILEGE_ID='" + PRIV + "'");
  if (deja !== '0') { return true; }
  exec("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED)"
    + " VALUES ('" + LIGNE_PRIV + "','" + role + "','" + PRIV + "', NOW())");
  privilegeAjoute = true;
  return true;
}
function retirerPrivilege() {
  if (privilegeAjoute) {
    exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE='" + LIGNE_PRIV + "'");
  }
}

function etat(id) {
  const ligne = q("SELECT CONCAT_WS('~'," + COLONNES.map(c => "IFNULL(`" + c + "`,'')").join(',') + ")"
    + " FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='" + id + "'");
  const parts = ligne.split('~');
  const o = {};
  COLONNES.forEach((c, i) => { o[c] = parts[i]; });
  return o;
}

function semer() {
  q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT='enable' ORDER BY str_FULLNAME LIMIT 3")
    .split('\n').filter(Boolean).forEach(id => { TP.push(id.trim()); AVANT[id.trim()] = etat(id.trim()); });
  return TP.length === 3;
}
function restaurer() {
  TP.forEach(id => {
    const a = AVANT[id];
    exec("UPDATE t_tiers_payant SET " + COLONNES.map(c =>
      "`" + c + "`=" + (a[c] === '' ? 'NULL' : "'" + String(a[c]).replace(/'/g, "''") + "'")).join(',')
      + " WHERE lg_TIERS_PAYANT_ID='" + id + "'");
  });
}

(async () => {
  if (!semer()) { console.log('FATAL : pas assez de tiers payants'); process.exit(1); }
  if (!accorderPrivilege()) { console.log('FATAL : role du compte de test introuvable'); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const poster = (params) => p.evaluate(async (params) => {
    const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch('../api/v1/tierspayant/mise-a-jour-selective/appliquer', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps
    });
    return { statut: r.status, texte: await r.text() };
  }, params);

  try {
    // ------------------------------------------------------------------ l'ecran
    const vue = await p.evaluate(() => {
      const f = Ext.create('testextjs.view.tierspayantmanagement.tierspayant.action.miseAJourSelective', {});
      const selecteur = f.down('#majChamps');
      const grille = f.down('#majGrille');
      const editeurs = f.down('#majEditeurs');
      const noms = []; selecteur.getStore().each(r => noms.push(r.get('champ')));
      const resultat = {
        selecteurPresent: !!selecteur,
        nbDonnees: noms.length,
        noms: noms,
        nbEditeurs: editeurs.items.getCount(),
        editeursMasques: editeurs.items.getRange().every(e => e.hidden === true),
        colonnesMasquees: ['int_NBREBONS', 'dbl_PLAFOND_CREDIT', 'str_CODE_OFFICINE']
          .every(d => grille.down('gridcolumn[dataIndex=' + d + ']').isHidden()),
        // les trois colonnes historiques restent visibles : pas de regression d'affichage
        colonnesHistoriques: ['str_CODE_EDIT_BORDEREAU', 'int_NB_BONS_PAR_PAGE', 'int_TAILLE_POLICE']
          .every(d => !grille.down('gridcolumn[dataIndex=' + d + ']').isHidden())
      };
      // cocher « plafond de credit » doit reveler son editeur ET sa colonne
      const ligne = selecteur.getStore().findRecord('champ', 'PLAFOND_CREDIT');
      ligne.set('retenu', true);
      f.surSelectionChamps();
      resultat.editeurRevele = !f.down('#valPlafondCredit').hidden;
      resultat.colonneRevelee = !grille.down('gridcolumn[dataIndex=dbl_PLAFOND_CREDIT]').isHidden();
      resultat.autresTjrsMasques = f.down('#valCodeOfficine').hidden;
      resultat.choisies = f.donneesChoisies().length;
      // decocher doit vider l'editeur : une valeur oubliee serait reappliquee au passage suivant
      f.down('#valPlafondCredit').setValue(4242);
      ligne.set('retenu', false);
      f.surSelectionChamps();
      resultat.editeurVide = f.down('#valPlafondCredit').getValue() === null;
      resultat.colonneRemasquee = grille.down('gridcolumn[dataIndex=dbl_PLAFOND_CREDIT]').isHidden();
      f.destroy();
      return resultat;
    });
    ok('L\'ecran offre un selecteur de donnees', vue.selecteurPresent);
    ok('Treize donnees sont proposees (3 historiques + 10 nouvelles)', vue.nbDonnees === 13, vue.nbDonnees);
    ok('Les dix nouvelles donnees sont bien la', ['NBRE_EXEMPLAIRE_BORD', 'NBREBONS', 'MONTANTFAC',
      'MODE_TRI_FACTURE', 'PLAFOND_CREDIT', 'PLAFOND_VENTE', 'IS_ABSOLUTE', 'COMPTE_CONTRIBUABLE',
      'REGISTRE_COMMERCE', 'CODE_OFFICINE'].every(n => vue.noms.indexOf(n) >= 0), vue.noms.join(','));
    ok('Un editeur par donnee', vue.nbEditeurs === 13, vue.nbEditeurs);
    ok('Aucun editeur visible tant que rien n\'est coche', vue.editeursMasques);
    ok('Les nouvelles colonnes sont masquees au depart', vue.colonnesMasquees);
    ok('Les trois colonnes historiques restent visibles', vue.colonnesHistoriques);
    ok('Cocher une donnee revele son editeur', vue.editeurRevele);
    ok('Cocher une donnee revele sa colonne actuelle', vue.colonneRevelee);
    ok('Les editeurs des donnees non cochees restent masques', vue.autresTjrsMasques);
    ok('donneesChoisies() ne rend que la donnee cochee', vue.choisies === 1, vue.choisies);
    ok('Decocher vide l\'editeur', vue.editeurVide);
    ok('Decocher remasque la colonne', vue.colonneRemasquee);

    // ------------------------------------------------------------------ la recherche
    const recherche = await p.evaluate(async () => {
      const r = await fetch('../api/v1/tierspayant/mise-a-jour-selective/rechercher?query=&start=0&limit=5',
        { credentials: 'same-origin' });
      return await r.json();
    });
    const premier = (recherche.results || [])[0] || {};
    ok('La recherche renvoie les dix valeurs actuelles', ['int_NBRE_EXEMPLAIRE_BORD', 'int_NBREBONS',
      'int_MONTANTFAC', 'str_MODE_TRI_FACTURE', 'dbl_PLAFOND_CREDIT', 'dbl_PLAFOND_VENTE', 'b_IsAbsolute',
      'str_COMPTE_CONTRIBUABLE', 'str_REGISTRE_COMMERCE', 'str_CODE_OFFICINE']
      .every(c => Object.prototype.hasOwnProperty.call(premier, c)), Object.keys(premier).join(','));

    // ------------------------------------------------------------------ l'application
    const ids = JSON.stringify(TP);
    let r = await poster({ tiersPayants: ids, valeurs: JSON.stringify({ NBREBONS: '25', PLAFOND_CREDIT: '150000' }) });
    let o = JSON.parse(r.texte);
    ok('Deux donnees appliquees en un seul passage', o.success === '1', r.texte);
    ok('Les deux donnees sont ecrites', TP.every(id => {
      const e = etat(id);
      return e.int_NBREBONS === '25' && Math.round(parseFloat(e.dbl_PLAFOND_CREDIT)) === 150000;
    }), TP.map(id => JSON.stringify(etat(id))).join(' | '));
    ok('Les onze autres donnees n\'ont pas bouge', TP.every(id => {
      const e = etat(id), a = AVANT[id];
      return COLONNES.filter(c => c !== 'int_NBREBONS' && c !== 'dbl_PLAFOND_CREDIT')
        .every(c => String(e[c]) === String(a[c]));
    }), TP.map(id => COLONNES.filter(c => c !== 'int_NBREBONS' && c !== 'dbl_PLAFOND_CREDIT')
      .filter(c => String(etat(id)[c]) !== String(AVANT[id][c])).join(',')).join(' | '));

    // chaque donnee sur sa propre colonne
    r = await poster({
      tiersPayants: ids, valeurs: JSON.stringify({
        NBRE_EXEMPLAIRE_BORD: '3', MONTANTFAC: '500000', MODE_TRI_FACTURE: 'DATE_BON',
        PLAFOND_VENTE: '20000', IS_ABSOLUTE: '1', COMPTE_CONTRIBUABLE: 'CC-E2E',
        REGISTRE_COMMERCE: 'RC-E2E', CODE_OFFICINE: 'OFF-E2E'
      })
    });
    o = JSON.parse(r.texte);
    ok('Les huit donnees restantes s\'appliquent', o.success === '1', r.texte);
    const e0 = etat(TP[0]);
    ok('Chaque donnee atterrit sur sa colonne',
      e0.int_NBRE_EXEMPLAIRE_BORD === '3' && e0.int_MONTANTFAC === '500000'
      && e0.str_MODE_TRI_FACTURE === 'DATE_BON' && Math.round(parseFloat(e0.dbl_PLAFOND_VENTE)) === 20000
      && e0.b_IsAbsolute === '1' && e0.str_COMPTE_CONTRIBUABLE === 'CC-E2E'
      && e0.str_REGISTRE_COMMERCE === 'RC-E2E' && e0.str_CODE_OFFICINE === 'OFF-E2E', JSON.stringify(e0));

    // ------------------------------------------------------------------ les refus
    const temoin = JSON.stringify(etat(TP[0]));
    r = await poster({ tiersPayants: ids, valeurs: JSON.stringify({ NBREBONS: 'vingt' }) });
    o = JSON.parse(r.texte);
    ok('Un nombre illisible est refuse', o.success === '0' && /vingt/.test(o.errors), r.texte);
    ok('Un refus ne modifie rien', JSON.stringify(etat(TP[0])) === temoin);

    r = await poster({ tiersPayants: ids, valeurs: JSON.stringify({ MODE_TRI_FACTURE: 'PAR_MONTANT' }) });
    o = JSON.parse(r.texte);
    ok('Un mode de tri inconnu est refuse', o.success === '0' && /PAR_MONTANT/.test(o.errors), r.texte);

    r = await poster({ tiersPayants: ids, valeurs: JSON.stringify({ PLAFOND_CREDIT: '-5' }) });
    o = JSON.parse(r.texte);
    ok('Un plafond negatif est refuse', o.success === '0', r.texte);

    r = await poster({ tiersPayants: ids, valeurs: JSON.stringify({ REGISTRE_COMMERCE: 'A'.repeat(101) }) });
    o = JSON.parse(r.texte);
    ok('Un texte trop long est refuse au lieu d\'etre tronque', o.success === '0' && /100/.test(o.errors), r.texte);
    ok('Aucun refus n\'a laisse de trace', JSON.stringify(etat(TP[0])) === temoin, etat(TP[0]).str_REGISTRE_COMMERCE);

    r = await poster({ tiersPayants: ids });
    o = JSON.parse(r.texte);
    ok('Aucune donnee demandee : l\'appel est refuse', o.success === '0', r.texte);

    r = await poster({ tiersPayants: '[]', valeurs: JSON.stringify({ NBREBONS: '5' }) });
    o = JSON.parse(r.texte);
    ok('Aucun tiers payant coche : l\'appel est refuse', o.success === '0', r.texte);

    // ------------------------------------------------------------------ non-regression
    r = await poster({ tiersPayants: ids, nbBonsParPage: '15', taillePolice: '8' });
    o = JSON.parse(r.texte);
    ok('Les trois reglages historiques fonctionnent toujours', o.success === '1', r.texte);
    ok('Bons par page et police sont ecrits', TP.every(id => {
      const e = etat(id);
      return e.int_NB_BONS_PAR_PAGE === '15' && e.int_TAILLE_POLICE === '8';
    }), JSON.stringify(etat(TP[0])));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    restaurer();
    retirerPrivilege();
    ok('Etat initial des tiers payants retabli',
      TP.every(id => JSON.stringify(etat(id)) === JSON.stringify(AVANT[id])),
      TP.map(id => JSON.stringify(etat(id))).join(' | '));
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
