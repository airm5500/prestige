/* Etape 3 : les correctifs de l'ordonnancier.

   L'ecran presentait quatre defauts. La colonne « Medecin » restait vide alors que la requete ne
   rapporte QUE des ventes rattachees a un medecin ; le (+) ouvrait une zone vide ; le nom du
   patient n'apparaissait nulle part ; et on ne pouvait ni chercher un client, ni imprimer, ni
   exporter, ni faire un inventaire des produits delivres.

   La base de test ne contient aucune vente rattachee a un medecin, ni aucun produit soumis a
   ordonnance : la suite construit donc son propre jeu d'essai et le retire integralement a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

const MEDECIN = 'E2E-MED-ORDO';
const JOUR = '2026-09-05';
const VENTES = [
  { id: 'E2EORD-1', ref: 'E2EORD-REF-1', client: null, heure: '09:15:00', prix: 4500 },
  { id: 'E2EORD-2', ref: 'E2EORD-REF-2', client: null, heure: '11:40:00', prix: 3200 },
  { id: 'E2EORD-3', ref: 'E2EORD-REF-3', client: null, heure: '16:05:00', prix: 7800 }
];
let PRODUITS = [], SCHED_AVANT = {}, CLIENTS = [], USER = '';

function semer() {
  // Un passage precedent interrompu peut avoir laisse des traces : on repart d'une base propre.
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  // Trois produits porteurs d'un code tableau : ce sont eux que le registre doit retenir.
  q("SELECT CONCAT_WS('~',lg_FAMILLE_ID,IFNULL(is_scheduled,0),int_T) FROM t_famille"
    + " WHERE int_T IN ('A','C','II') AND str_STATUT='enable' ORDER BY str_NAME LIMIT 3")
    .split('\n').filter(Boolean).forEach(l => {
      const [id, sched, tableau] = l.trim().split('~');
      PRODUITS.push({ id: id, tableau: tableau });
      SCHED_AVANT[id] = sched;
      exec("UPDATE t_famille SET is_scheduled=1 WHERE lg_FAMILLE_ID='" + id + "'");
    });
  CLIENTS = q("SELECT CONCAT_WS('~',lg_CLIENT_ID,str_FIRST_NAME,str_LAST_NAME) FROM t_client"
    + " WHERE str_FIRST_NAME IS NOT NULL AND str_FIRST_NAME<>'' ORDER BY lg_CLIENT_ID LIMIT 2")
    .split('\n').filter(Boolean).map(l => {
      const [id, prenom, nom] = l.trim().split('~');
      return { id: id, prenom: prenom, nom: nom };
    });
  if (!USER || PRODUITS.length !== 3 || CLIENTS.length !== 2) { return false; }

  exec("INSERT INTO medecin (id, num_ordre, nom, commentaire, created_at)"
    + " VALUES ('" + MEDECIN + "','E2E-9001','DOCTEUR ESSAI ORDONNANCIER','recette e2e', NOW())");

  VENTES[0].client = CLIENTS[0];
  VENTES[1].client = CLIENTS[1];
  VENTES[2].client = CLIENTS[0];
  VENTES.forEach((v, i) => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, lg_CLIENT_ID, medecin_id, b_IS_CANCEL, b_IS_AVOIR,"
      + " b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy,"
      + " imported, margeug, montantttcug, montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.ref + "','0'," + v.prix + ",0,'is_Closed',"
      + "'" + JOUR + " " + v.heure + "','" + JOUR + " " + v.heure + "',1,"
      + "'" + USER + "','" + USER + "','" + USER + "','" + v.client.id + "','" + MEDECIN + "',"
      + "0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    // Deux produits sur la premiere vente, un sur les deux autres : le (+) doit rendre le detail
    // reel, pas un nombre de lignes fixe.
    const produits = i === 0 ? [PRODUITS[0], PRODUITS[1]] : [PRODUITS[i]];
    produits.forEach((prod, j) => {
      exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
        + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
        + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
        + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
        + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
        + " VALUES ('" + v.id + "-D" + j + "','" + v.id + "','" + prod.id + "'," + (2 + j) + ",0,0,0,"
        + (1000 * (j + 1)) + "," + (500 * (j + 1)) + ",0,'" + JOUR + " " + v.heure + "','"
        + JOUR + " " + v.heure + "',0,0,0,0,0,0,1,0,0,0,0,0)");
    });
  });
  return true;
}

/** Retire les enregistrements du jeu d'essai, qu'ils viennent de ce passage ou d'un precedent. */
function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EORD-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EORD-%'");
  exec("DELETE FROM medecin WHERE id='" + MEDECIN + "'");
  exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN"
    + " (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%')");
  exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%'");
}

function nettoyer() {
  VENTES.forEach(v => {
    exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + v.id + "'");
    exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + v.id + "'");
  });
  exec("DELETE FROM medecin WHERE id='" + MEDECIN + "'");
  PRODUITS.forEach(p => {
    exec("UPDATE t_famille SET is_scheduled=" + SCHED_AVANT[p.id] + " WHERE lg_FAMILLE_ID='" + p.id + "'");
  });
}

(async () => {
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); nettoyer(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const lire = (params) => p.evaluate(async (params) => {
    const url = '../api/v1/ventestats/ventesordonnanciers?' + Object.keys(params)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch(url, { credentials: 'same-origin' });
    return await r.json();
  }, params);

  try {
    const jour = { dtStart: JOUR, dtEnd: JOUR, medecinId: '', query: '' };
    let reponse = await lire(jour);
    const lignes = reponse.data || [];
    ok('Les trois delivrances du jour remontent', lignes.length === 3, reponse.total);

    // ---------------------------------------------------------- 1. le medecin
    ok('La colonne Medecin est renseignee',
      lignes.length === 3 && lignes.every(l => l.nom === 'DOCTEUR ESSAI ORDONNANCIER'),
      lignes.map(l => l.nom).join(' | '));
    ok('Le numero d\'ordre du medecin suit', lignes.every(l => l.numOrder === 'E2E-9001'),
      lignes.map(l => l.numOrder).join(' | '));

    // ---------------------------------------------------------- 2. le detail du (+)
    const v1 = lignes.filter(l => l.strREF === 'E2EORD-REF-1')[0] || {};
    ok('Le (+) recoit les produits de la delivrance', Array.isArray(v1.items) && v1.items.length === 2,
      JSON.stringify(v1.items || []).slice(0, 200));
    ok('Chaque produit porte son code tableau',
      (v1.items || []).every(i => ['A', 'C', 'II'].indexOf(i.codeTableau) >= 0),
      (v1.items || []).map(i => i.strNAME + '=' + i.codeTableau).join(' | '));
    ok('Chaque produit porte CIP, quantite et montant',
      (v1.items || []).every(i => i.intCIP && i.intQUANTITY > 0 && i.intPRICE > 0),
      JSON.stringify((v1.items || []).map(i => [i.intCIP, i.intQUANTITY, i.intPRICE])));

    // le modele ExtJS doit conserver items, sinon le (+) reste vide a l'ecran
    const modele = await p.evaluate(() => {
      const champs = [];
      Ext.ClassManager.get('testextjs.model.caisse.Vente').getFields().forEach(f => champs.push(f.name));
      return champs;
    });
    ok('Le modele conserve « items »', modele.indexOf('items') >= 0);

    // ---------------------------------------------------------- 3. le client
    ok('La colonne Client est renseignee', lignes.every(l => l.clientFullName && l.clientFullName.trim()),
      lignes.map(l => l.clientFullName).join(' | '));

    // ---------------------------------------------------------- 4. la recherche
    const motClient = CLIENTS[1].nom.split(' ')[0];
    reponse = await lire(Ext_apply(jour, { query: motClient }));
    ok('La recherche par nom de client filtre bien',
      (reponse.data || []).length === 1 && reponse.data[0].strREF === 'E2EORD-REF-2',
      motClient + ' -> ' + (reponse.data || []).map(l => l.strREF).join(','));

    reponse = await lire(Ext_apply(jour, { query: 'E2EORD-REF-3' }));
    ok('La recherche accepte aussi la reference',
      (reponse.data || []).length === 1 && reponse.data[0].strREF === 'E2EORD-REF-3',
      (reponse.data || []).map(l => l.strREF).join(','));

    reponse = await lire(Ext_apply(jour, { query: 'ZZZ-INEXISTANT' }));
    ok('Une recherche sans resultat ne rend rien', (reponse.data || []).length === 0, reponse.total);

    reponse = await lire(jour);
    ok('Une recherche vide ne filtre rien', (reponse.data || []).length === 3, reponse.total);

    // le filtre medecin continue de fonctionner : pas de regression
    reponse = await lire(Ext_apply(jour, { medecinId: MEDECIN }));
    ok('Le filtre par medecin fonctionne toujours', (reponse.data || []).length === 3, reponse.total);
    reponse = await lire(Ext_apply(jour, { medecinId: 'MEDECIN-INEXISTANT' }));
    ok('Un medecin inconnu ne rend rien', (reponse.data || []).length === 0, reponse.total);

    // ---------------------------------------------------------- 5. l'edition
    const pdf = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/pdf?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      return await r.json();
    }, jour);
    ok('L\'edition PDF aboutit', pdf.success === true && !!pdf.url, JSON.stringify(pdf));
    if (pdf.url) {
      const chemin = '/opt/CONF/reports/pdf/' + pdf.url.split('/').pop();
      const fs = require('fs');
      const existe = fs.existsSync(chemin);
      ok('Le fichier PDF est ecrit sur le disque', existe, chemin);
      if (existe) {
        const zlib = require('zlib');
        const buf = fs.readFileSync(chemin);
        let texte = '';
        let i = 0;
        while ((i = buf.indexOf('stream', i)) !== -1) {
          const debut = i + (buf[i + 6] === 0x0d ? 8 : 7);
          const fin = buf.indexOf('endstream', debut);
          if (fin === -1) { break; }
          try { texte += zlib.inflateSync(buf.slice(debut, fin)).toString('latin1'); } catch (e) { /* flux non compresse */ }
          i = fin + 9;
        }
        ok('L\'edition porte le titre ORDONNANCIER', /ORDONNANCIER/.test(texte));
        ok('L\'edition nomme le medecin', /DOCTEUR/.test(texte), texte.slice(0, 200));
        ok('L\'edition est une ligne par produit delivre, pas par vente',
          (texte.match(/E2EORD-REF-1/g) || []).length === 2,
          'REF-1 apparait ' + (texte.match(/E2EORD-REF-1/g) || []).length + ' fois');
      }
    }

    // ---------------------------------------------------------- 6. l'export
    const excel = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/excel?' + Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { statut: r.status, taille: buf.byteLength, type: r.headers.get('content-type') };
    }, jour);
    ok('L\'export Excel repond', excel.statut === 200, JSON.stringify(excel));
    ok('L\'export Excel n\'est pas vide', excel.taille > 2000, excel.taille);
    ok('L\'export Excel a le bon type', /excel/.test(excel.type || ''), excel.type);

    // ---------------------------------------------------------- 7. l'inventaire
    const controle = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/inventaire?controle=true&'
        + Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { method: 'POST', credentials: 'same-origin' });
      return await r.json();
    }, jour);
    ok('Le controle compte les produits distincts', controle.success === true && controle.count === 3,
      JSON.stringify(controle));
    ok('Le controle compte les delivrances', controle.ventes === 3, JSON.stringify(controle));
    const avantInv = parseInt(q("SELECT COUNT(*) FROM t_inventaire"), 10);
    ok('Le controle ne cree aucun inventaire',
      parseInt(q("SELECT COUNT(*) FROM t_inventaire"), 10) === avantInv);

    const creation = await p.evaluate(async (params) => {
      const url = '../api/v1/ventestats/ventesordonnanciers/inventaire?'
        + Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
      const r = await fetch(url, { method: 'POST', credentials: 'same-origin' });
      return await r.json();
    }, jour);
    ok('L\'inventaire est cree', creation.success === true && creation.count === 3, JSON.stringify(creation));
    ok('L\'inventaire porte un nom parlant',
      q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%'") !== '0');

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    exec("DELETE FROM t_inventaire_famille WHERE lg_INVENTAIRE_ID IN"
      + " (SELECT lg_INVENTAIRE_ID FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%')");
    exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'INVENTAIRE ORDONNANCIER%'");
    nettoyer();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM medecin WHERE id='" + MEDECIN + "'") === '0'
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EORD-%'") === '0'
      && PRODUITS.every(p2 => q("SELECT IFNULL(is_scheduled,0) FROM t_famille WHERE lg_FAMILLE_ID='"
        + p2.id + "'") === SCHED_AVANT[p2.id]));
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();

/* Fusion de deux objets sans dependre d'Ext cote node. */
function Ext_apply(base, ajouts) {
  const o = {};
  Object.keys(base).forEach(k => { o[k] = base[k]; });
  Object.keys(ajouts).forEach(k => { o[k] = ajouts[k]; });
  return o;
}
