/* Point 21 : liste des reglements.
   - filtres par type et par groupe de tiers payants ;
   - montant regle en vert gras, montant en attente en rouge gras ;
   - export Excel du resultat complet, criteres compris ;
   - edition PDF regroupee par groupe, avec sous-total par groupe et total general. */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 240) + ']' : '')); }

const PERIODE = '&dt_debut=2020-01-01&dt_fin=' + new Date().toISOString().slice(0, 10);

const { execFileSync } = require('child_process');
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2E-R21';

/* Aucun dossier de reglement de la base de test n'est rattache a un reglement : l'ecran y est donc
   vide, et les filtres ne seraient pas reellement eprouves. Le test rattache un reglement a un
   dossier existant, puis le retire. */
function semer() {
  nettoyer();
  const dossier = q("SELECT lg_DOSSIER_REGLEMENT_ID FROM t_dossier_reglement o"
    + " JOIN t_tiers_payant p ON p.lg_TIERS_PAYANT_ID = o.str_ORGANISME_ID"
    + " WHERE o.lg_FACTURE_ID IS NOT NULL LIMIT 1");
  const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const mode = q("SELECT lg_MODE_REGLEMENT_ID FROM t_mode_reglement WHERE str_STATUT='enable' LIMIT 1");
  exec("INSERT INTO t_reglement (lg_REGLEMENT_ID, str_REF_RESSOURCE, lg_MODE_REGLEMENT_ID, dt_CREATED,"
     + " dt_UPDATED, str_STATUT, dt_REGLEMENT, lg_USER_ID, bool_CHECKED)"
     + " VALUES ('" + MARQUE + "', '" + dossier + "', '" + mode + "', NOW(), NOW(), 'enable', NOW(), '"
     + user + "', 0)");
  return q("SELECT p.str_FULLNAME, tt.str_LIBELLE_TYPE_TIERS_PAYANT FROM t_dossier_reglement o"
    + " JOIN t_tiers_payant p ON p.lg_TIERS_PAYANT_ID = o.str_ORGANISME_ID"
    + " JOIN t_type_tiers_payant tt ON tt.lg_TYPE_TIERS_PAYANT_ID = p.lg_TYPE_TIERS_PAYANT_ID"
    + " WHERE o.lg_DOSSIER_REGLEMENT_ID='" + dossier + "'").split('\t');
}
function nettoyer() {
  exec("DELETE FROM t_reglement WHERE lg_REGLEMENT_ID='" + MARQUE + "'");
}

(async () => {
  const [organismeSeme, typeSeme] = semer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const requetes = []; p.on('request', r => { if (r.url().includes('reglement-facture/list')) requetes.push(r.url()); });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('reglementmanager', 'Règlements', ''));
  const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('reglementmanager').length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('ecran Liste des reglements ouvert', ouvert);
  await p.waitForTimeout(4000);

  const champs = await p.evaluate(() => ({
    type: !!Ext.getCmp('reglementTypeTiersPayant'),
    groupe: !!Ext.getCmp('reglementGroupeTiersPayant'),
    colonnes: Ext.getCmp('Grid_Reglement_ID').headerCt.items.items.map(c => c.text || c.header).filter(Boolean)
  }));
  ok('les filtres type et groupe sont presents', champs.type && champs.groupe, JSON.stringify(champs));
  ok('la colonne Groupe est affichee', champs.colonnes.some(c => /Groupe/i.test(c)), JSON.stringify(champs.colonnes));

  // les couleurs viennent du meme utilitaire que le recapitulatif
  const rendus = await p.evaluate(() => {
    const g = Ext.getCmp('Grid_Reglement_ID');
    const col = (t) => g.headerCt.items.items.filter(c => (c.text || '').indexOf(t) !== -1)[0];
    const regle = col('Montant.Regl'), att = col('Montant.ATT');
    return {
      regle: regle && regle.renderer ? regle.renderer(1500) : null,
      attente: att && att.renderer ? att.renderer(1500) : null
    };
  });
  ok('le montant regle est en vert et gras', /#1e7e34/.test(rendus.regle || '') && /bold/.test(rendus.regle || ''), rendus.regle);
  ok('le montant en attente est en rouge et gras', /#c0392b/.test(rendus.attente || '') && /bold/.test(rendus.attente || ''), rendus.attente);

  // les criteres partent bien au serveur
  const avant = requetes.length;
  await p.evaluate(() => {
    Ext.getCmp('datedebut').setValue(new Date(2020, 0, 1));
    Ext.getCmp('datefin').setValue(new Date());
    Ext.getCmp('reglementTypeTiersPayant').setValue('Assurance');
    Ext.ComponentQuery.query('reglementmanager')[0].onRechDifClick();
  });
  await p.waitForTimeout(4000);
  const derniere = decodeURIComponent(requetes[requetes.length - 1] || '');
  ok('les filtres sont transmis au serveur',
     requetes.length > avant && /typeTiersPayant=Assurance/.test(derniere), derniere.slice(-150));

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = r.headers.get('content-type') || '';
    if (t.indexOf('json') !== -1) { return { status: r.status, json: JSON.parse(await r.text()) }; }
    const buf = await r.arrayBuffer();
    return { status: r.status, taille: buf.byteLength,
             signature: new TextDecoder().decode(new Uint8Array(buf.slice(0, 2))) };
  }, url);

  const base = '../api/v1/reglement-facture/list?search_value=&lg_TIERS_PAYANT_ID=' + PERIODE;
  const tout = await appel(base);
  const nbTout = parseInt((tout.json || {}).total, 10);
  ok('la liste ramene le reglement rattache', nbTout > 0,
     'total=' + nbTout + ' organisme seme=' + organismeSeme);
  ok('la ligne porte son type et son groupe',
     nbTout > 0 && tout.json.results[0].LIBELLE_TYPE_TIERS_PAYANT !== undefined
       && tout.json.results[0].GROUPE !== undefined, JSON.stringify(tout.json.results[0]).slice(0, 200));

  // le filtre de type retient la ligne, puis l'ecarte
  const bonType = await appel(base + '&typeTiersPayant=' + encodeURIComponent(typeSeme));
  ok('le filtre de type retient la ligne attendue', parseInt((bonType.json || {}).total, 10) > 0,
     'type=' + typeSeme + ' total=' + (bonType.json || {}).total);
  const typeInconnu = await appel(base + '&typeTiersPayant=' + encodeURIComponent('TYPE-INEXISTANT'));
  ok('un type inconnu ne ramene aucune ligne', typeInconnu.json && parseInt(typeInconnu.json.total, 10) === 0,
     JSON.stringify((typeInconnu.json || {}).total));
  const groupeInconnu = await appel(base + '&groupeTiersPayant=' + encodeURIComponent('GROUPE-INEXISTANT'));
  ok('un groupe inconnu ne ramene aucune ligne', groupeInconnu.json && parseInt(groupeInconnu.json.total, 10) === 0,
     JSON.stringify((groupeInconnu.json || {}).total));

  const excel = await appel('../api/v1/reglement-facture/export-excel?search_value=&lg_TIERS_PAYANT_ID='
      + PERIODE + '&typeTiersPayant=&groupeTiersPayant=');
  ok('l export Excel produit un classeur valide',
     excel.status === 200 && excel.signature === 'PK' && excel.taille > 1000, JSON.stringify(excel));

  const pdf = await appel('../api/v1/reglement-facture/print-groupe?search_value=&lg_TIERS_PAYANT_ID='
      + PERIODE + '&typeTiersPayant=&groupeTiersPayant=');
  ok('l edition PDF aboutit', pdf.json && pdf.json.success === true && /\.pdf$/i.test(pdf.json.msg || ''),
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
      ok('l edition est regroupee par groupe de tiers payants', /Groupe/.test(texte), 'longueur texte=' + texte.length);
      ok('un sous-total est edite par groupe', /Sous-total/.test(texte));
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
