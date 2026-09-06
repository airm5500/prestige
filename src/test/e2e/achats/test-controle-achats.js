/* Point 17 : etat de controle des achats.
   - filtre sur le statut du controle (Controle / Non controle / Tous) ;
   - filtre sur les ecarts (Avec ecarts / Sans ecart / Tous) ;
   - bouton Details par ligne ;
   - impression respectant les filtres et rappelant les criteres. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 240) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

/* Les bons de livraison clotures de la base d'essai n'ont aucune ligne de detail : le statut de
   controle et l'ecart ne se calculent donc sur rien. Le test pose deux lignes - l'une comptee a la
   quantite recue, l'autre en ecart - sur deux bons clotures du meme jour, puis les retire. */
const MARQUE = 'E2E-P17';

/* La base d'essai est tronquee : ses 2049 bons de livraison clotures renvoient tous a une commande
   absente, et aucun n'a de ligne de detail. Le test pose donc ses propres bons - rattaches a la
   seule commande existante -, l'un compte conforme, l'autre en ecart, puis les retire. */
function semer() {
  nettoyer();
  const commande = q("SELECT lg_ORDER_ID FROM t_order LIMIT 1");
  if (!commande) { return null; }
  const gabaritBon = q("SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE str_STATUT='is_Closed' LIMIT 1");
  const gabaritLigne = q("SELECT lg_BON_LIVRAISON_DETAIL FROM t_bon_livraison_detail LIMIT 1");
  if (!gabaritBon || !gabaritLigne) { return null; }
  // Les gabarits portent deja les cles etrangeres obligatoires, qu'il serait fragile de deviner.
  [[10, 10], [10, 7]].forEach(function (compte, i) {
    exec("CREATE TEMPORARY TABLE tmp_bl AS SELECT * FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID='" + gabaritBon + "';"
      + "UPDATE tmp_bl SET lg_BON_LIVRAISON_ID='" + MARQUE + "-B" + i + "', lg_ORDER_ID='" + commande + "',"
      + " str_REF_LIVRAISON='" + MARQUE + "-REF" + i + "', str_STATUT='is_Closed', dt_DATE_LIVRAISON=NOW(),"
      + " dt_CREATED=NOW(), int_MHT=10000, int_TVA=1800, int_HTTC=11800;"
      + "INSERT INTO t_bon_livraison SELECT * FROM tmp_bl;"
      + "DROP TEMPORARY TABLE tmp_bl;"
      + "CREATE TEMPORARY TABLE tmp_bld AS SELECT * FROM t_bon_livraison_detail"
      + " WHERE lg_BON_LIVRAISON_DETAIL='" + gabaritLigne + "';"
      + "UPDATE tmp_bld SET lg_BON_LIVRAISON_DETAIL='" + MARQUE + "-L" + i + "',"
      + " lg_BON_LIVRAISON_ID='" + MARQUE + "-B" + i + "', int_QTE_CMDE=" + compte[0]
      + ", int_QTE_RECUE=" + compte[0] + ", quantite_controle=" + compte[1] + ", checked=1,"
      + " int_PAF=1000, int_PA_REEL=1000, prixUni=1000, int_PRIX_VENTE=1500,"
      + " int_PRIX_REFERENCE=1500, int_QTE_UG=0, int_INITSTOCK=0, str_STATUT='is_Closed';"
      + "INSERT INTO t_bon_livraison_detail SELECT * FROM tmp_bld;"
      + "DROP TEMPORARY TABLE tmp_bld;");
  });
  return new Date().toISOString().slice(0, 10);
}
function nettoyer() {
  if (process.env.GARDER_JEU_ESSAI) { return; }
  exec("DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL LIKE '" + MARQUE + "%';"
     + "DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "%';");
}

(async () => {
  const dtLivraison = semer();
  if (!dtLivraison) { console.error('Aucun bon de livraison exploitable en base'); process.exit(2); }

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etatscontrolemanager', 'Contrôle des achats', ''));
  const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('etatscontrolemanager').length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('ecran Etat de controle des achats ouvert', ouvert);
  await p.waitForTimeout(4000);

  const ecran = await p.evaluate(() => {
    const g = Ext.ComponentQuery.query('etatscontrolemanager')[0];
    const statut = Ext.getCmp('filtreStatutControle'), ecart = Ext.getCmp('filtreEcartControle');
    return {
      statut: statut ? statut.getStore().getRange().map(r => r.get('code')) : null,
      ecart: ecart ? ecart.getStore().getRange().map(r => r.get('code')) : null,
      detail: g.headerCt.items.items.some(c => /DETAIL/i.test(c.header || c.text || ''))
    };
  });
  ok('le filtre de statut propose Controle / Non controle / Tous',
     ecran.statut && ecran.statut.join(',') === 'TOUS,CONTROLE,NON_CONTROLE', JSON.stringify(ecran.statut));
  ok('le filtre d ecarts propose Avec / Sans / Tous',
     ecran.ecart && ecran.ecart.join(',') === 'TOUS,AVEC_ECART,SANS_ECART', JSON.stringify(ecran.ecart));
  ok('la colonne Details est presente sur chaque ligne', ecran.detail);

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = r.headers.get('content-type') || '';
    if (t.indexOf('json') !== -1) { return { status: r.status, json: JSON.parse(await r.text()) }; }
    const buf = await r.arrayBuffer();
    return { status: r.status, taille: buf.byteLength,
             signature: new TextDecoder().decode(new Uint8Array(buf.slice(0, 4))) };
  }, url);

  const base = '../api/v1/etat-control-bon/list?start=0&limit=100&search=&grossisteId='
      + '&dtStart=2020-01-01&dtEnd=' + new Date().toISOString().slice(0, 10) + '&dateType=';
  const tout = await appel(base);
  const nb = (tout.json || {}).total;
  ok('la liste sans filtre repond', typeof nb === 'number' && nb > 0, 'total=' + nb);

  const controles = await appel(base + '&statutControle=CONTROLE');
  const nonControles = await appel(base + '&statutControle=NON_CONTROLE');
  ok('les deux statuts se partagent exactement la liste',
     (controles.json.total + nonControles.json.total) === nb,
     'controles=' + controles.json.total + ' non=' + nonControles.json.total + ' total=' + nb);

  const avecEcart = await appel(base + '&ecart=AVEC_ECART');
  const sansEcart = await appel(base + '&ecart=SANS_ECART');
  ok('les deux valeurs d ecart se partagent exactement la liste',
     (avecEcart.json.total + sansEcart.json.total) === nb,
     'avec=' + avecEcart.json.total + ' sans=' + sansEcart.json.total + ' total=' + nb);
  ok('le bon prepare en ecart est bien retenu par le filtre', avecEcart.json.total > 0,
     'avec ecart=' + avecEcart.json.total);

  const combine = await appel(base + '&statutControle=CONTROLE&ecart=AVEC_ECART');
  ok('les deux filtres se combinent',
     combine.json.total <= Math.min(controles.json.total, avecEcart.json.total),
     'combine=' + combine.json.total);

  // --- impression ---
  const pdf = await appel('../api/v1/etat-control-bon/print?search=&grossisteId=&dtStart=2020-01-01'
      + '&dtEnd=' + new Date().toISOString().slice(0, 10) + '&dateType=&statutControle=CONTROLE&ecart=AVEC_ECART');
  ok('l impression aboutit', pdf.json && pdf.json.success === true && /\.pdf$/i.test(pdf.json.msg || ''),
     JSON.stringify(pdf.json));

  if (pdf.json && pdf.json.success) {
    const fichier = path.join(process.env.REPORTS_PDF || '/opt/CONF/reports/pdf', pdf.json.msg.split('/').pop());
    ok('le PDF a bien ete ecrit', fs.existsSync(fichier), fichier);
    if (fs.existsSync(fichier)) {
      const brut = fs.readFileSync(fichier);
      ok('le fichier est un PDF non vide', brut.slice(0, 4).toString() === '%PDF' && brut.length > 1000,
         'octets=' + brut.length);
      let texte = '', position = 0;
      const debut = Buffer.from('stream'), fin = Buffer.from('endstream');
      while (true) {
        const d = brut.indexOf(debut, position);
        if (d < 0) { break; }
        const f = brut.indexOf(fin, d);
        if (f < 0) { break; }
        let depart = d + debut.length;
        while (brut[depart] === 0x0d || brut[depart] === 0x0a) { depart++; }
        try { texte += zlib.inflateSync(brut.slice(depart, f)).toString('latin1'); } catch (e) { }
        position = f + fin.length;
      }
      ok('les criteres retenus sont rappeles sur l etat',
         /contr/i.test(texte) && /cart/i.test(texte), 'longueur texte=' + texte.length);
      ok('l etat est regroupe par grossiste avec sous-totaux',
         /Grossiste/.test(texte) && /Sous-total/.test(texte));
      ok('le total general est edite', /TOTAL/.test(texte));
      fs.unlinkSync(fichier);
    }
  }

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  nettoyer();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); try { nettoyer(); } catch (_) { } process.exit(2); });
