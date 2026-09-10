/* Etape 1 : quatre ecrans ajoutes a la presentation « collee », et deux donnees de plus
   dans la mise a jour selective de la fiche article (soumis a ordonnance, remise autorisee). */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 260) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

const NOUVEAUX = ['tpventes', 'balancesalecahs', 'recap', 'ordonnancier'];
let PRODUITS = [], AVANT = {};

function semer() {
  // Trois produits reels, dont on note l'etat AVANT pour le retablir a la fin.
  const lignes = q("SELECT CONCAT(lg_FAMILLE_ID,'~',IFNULL(is_scheduled,0),'~',IFNULL(bool_REMISE,0))"
    + " FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 3");
  lignes.split('\n').filter(Boolean).forEach(l => {
    const [id, sched, remise] = l.trim().split('~');
    PRODUITS.push(id);
    AVANT[id] = { sched: sched, remise: remise };
  });
  return PRODUITS.length === 3;
}
function restaurer() {
  PRODUITS.forEach(id => {
    exec("UPDATE t_famille SET is_scheduled=" + AVANT[id].sched + ", bool_REMISE=" + AVANT[id].remise
      + " WHERE lg_FAMILLE_ID='" + id + "'");
  });
}

(async () => {
  if (!semer()) { console.log('FATAL : pas assez de produits'); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  try {
    // ---------------- les quatre ecrans
    const liste = await p.evaluate(() => window.PrestigeAffichage
      ? window.PrestigeAffichage.ECRANS_COLLES : null);
    ok('la liste des ecrans colles est chargee', Array.isArray(liste), 'ecrans=' + (liste || []).length);
    NOUVEAUX.forEach(x => ok('ecran « ' + x + " » ajoute a la liste", (liste || []).indexOf(x) !== -1));
    ok('aucun doublon dans la liste',
       new Set(liste || []).size === (liste || []).length,
       (liste || []).length + ' entrees, ' + new Set(liste || []).size + ' distinctes');

    /* La liste ne vaut que si l'xtype existe reellement : une entree mal orthographiee ne
       produirait aucune erreur, elle serait simplement sans effet. */
    const connus = await p.evaluate((xtypes) => xtypes.map(x => ({
      xtype: x, connu: !!Ext.ClassManager.getNameByAlias('widget.' + x)
    })), NOUVEAUX);
    connus.forEach(c => ok('l xtype « ' + c.xtype + ' » correspond a une vue reelle', c.connu));

    // ---------------- les deux donnees de la maj selective
    const champs = await p.evaluate(async () => {
      const grille = Ext.ComponentQuery.query('famillemanager')[0];
      return typeof SEL_CHAMPS !== 'undefined' ? SEL_CHAMPS.map(c => c.champ) : null;
    });
    ok('la liste des donnees a mettre a jour est accessible', Array.isArray(champs), JSON.stringify(champs));
    ok('« Soumis a ordonnance » est propose', (champs || []).indexOf('ORDONNANCIER') !== -1, JSON.stringify(champs));
    ok('« Remise autorisee » est proposee', (champs || []).indexOf('REMISE') !== -1, JSON.stringify(champs));

    const appel = (corps) => p.evaluate(async (c) => {
      const r = await fetch('../api/v1/fichearticle/maj-selective/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c)
      });
      return JSON.parse(await r.text());
    }, corps);

    // ORDONNANCIER a Oui, puis a Non : les deux sens doivent fonctionner.
    let r = await appel({ mode: 'SELECTED', ids: PRODUITS, champ: 'ORDONNANCIER', valeur: '1' });
    ok('mise a jour « soumis a ordonnance = Oui »', r.success && r.count === 3, JSON.stringify(r));
    ok('les trois produits sont bien marques',
       q("SELECT COUNT(*) FROM t_famille WHERE is_scheduled=1 AND lg_FAMILLE_ID IN ('"
         + PRODUITS.join("','") + "')") === '3',
       'marques = ' + q("SELECT COUNT(*) FROM t_famille WHERE is_scheduled=1 AND lg_FAMILLE_ID IN ('" + PRODUITS.join("','") + "')"));

    r = await appel({ mode: 'SELECTED', ids: PRODUITS, champ: 'ORDONNANCIER', valeur: '0' });
    ok('mise a jour « soumis a ordonnance = Non »', r.success && r.count === 3, JSON.stringify(r));
    ok('le retour a Non est bien enregistre',
       q("SELECT COUNT(*) FROM t_famille WHERE is_scheduled=0 AND lg_FAMILLE_ID IN ('"
         + PRODUITS.join("','") + "')") === '3',
       'non marques = ' + q("SELECT COUNT(*) FROM t_famille WHERE is_scheduled=0 AND lg_FAMILLE_ID IN ('" + PRODUITS.join("','") + "')"));

    r = await appel({ mode: 'SELECTED', ids: PRODUITS, champ: 'REMISE', valeur: '1' });
    ok('mise a jour « remise autorisee = Oui »', r.success && r.count === 3, JSON.stringify(r));
    ok('la remise est bien autorisee sur les trois',
       q("SELECT COUNT(*) FROM t_famille WHERE bool_REMISE=1 AND lg_FAMILLE_ID IN ('"
         + PRODUITS.join("','") + "')") === '3', '');

    r = await appel({ mode: 'SELECTED', ids: PRODUITS, champ: 'REMISE', valeur: '0' });
    ok('mise a jour « remise autorisee = Non »', r.success && r.count === 3, JSON.stringify(r));

    // Un champ inconnu doit etre refuse, pas applique au hasard.
    r = await appel({ mode: 'SELECTED', ids: PRODUITS, champ: 'INEXISTANT', valeur: '1' });
    ok('une donnee inconnue est refusee', r.success === false, JSON.stringify(r).slice(0, 160));

    // Non-regression : les sept champs d'origine repondent toujours.
    const tva = q("SELECT lg_CODE_TVA_ID FROM t_code_tva LIMIT 1");
    r = await appel({ mode: 'SELECTED', ids: [PRODUITS[0]], champ: 'TVA', valeur: tva });
    ok('non-regression : la mise a jour du code TVA fonctionne toujours', r.success && r.count === 1,
       JSON.stringify(r));

    ok('aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } finally {
    await b.close();
    restaurer();
  }
  const total = res.length, passes = res.filter(x => x.c).length;
  console.log('\n===== ' + passes + '/' + total + ' PASS =====');
  process.exit(passes === total ? 0 : 1);
})();
