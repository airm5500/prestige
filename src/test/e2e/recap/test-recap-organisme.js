/* Point 10 : recapitulatif par compte organisme.
   - filtre sur le montant du solde, avec les six operateurs ;
   - filtres par type et par groupe de tiers payants ;
   - debit en rouge gras, credit en vert gras, solde colore selon son signe ;
   - export Excel du resultat complet. */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 240) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  const requetes = []; p.on('request', r => { if (r.url().includes('recap-organisme/list')) requetes.push(r.url()); });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  // --- les fonctions de coloration, verifiees directement ---
  const couleurs = await p.evaluate(() => ({
    debit: window.PrestigeMontants.debit(1500),
    credit: window.PrestigeMontants.credit(1500),
    soldeDebiteur: window.PrestigeMontants.solde(1500),
    soldeCrediteur: window.PrestigeMontants.solde(-1500),
    soldeNul: window.PrestigeMontants.solde(0),
    soldeVide: window.PrestigeMontants.solde(''),
    lectureMilliers: window.PrestigeMontants.nombre('1.500'),
    lectureVirgule: window.PrestigeMontants.nombre('1 500,25')
  }));
  ok('le debit est en rouge et gras', /#c0392b/.test(couleurs.debit) && /bold/.test(couleurs.debit), couleurs.debit);
  ok('le credit est en vert et gras', /#1e7e34/.test(couleurs.credit) && /bold/.test(couleurs.credit), couleurs.credit);
  ok('un solde debiteur est en rouge', /#c0392b/.test(couleurs.soldeDebiteur), couleurs.soldeDebiteur);
  ok('un solde crediteur est en vert', /#1e7e34/.test(couleurs.soldeCrediteur), couleurs.soldeCrediteur);
  ok('un solde nul est en gris', /#7f8c8d/.test(couleurs.soldeNul), couleurs.soldeNul);
  ok('un montant absent ne produit rien', couleurs.soldeVide === '', JSON.stringify(couleurs.soldeVide));
  ok('les montants sont lus quelle que soit leur ecriture',
     couleurs.lectureMilliers === 1500 && couleurs.lectureVirgule === 1500.25, JSON.stringify(couleurs));

  // --- l'ecran ---
  await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('recapOrganisme', 'Récapitulatif', ''));
  const ouvert = await p.waitForFunction(() => Ext.ComponentQuery.query('recapOrganisme').length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  ok('ecran recapitulatif ouvert', ouvert);
  await p.waitForTimeout(4000);

  const champs = await p.evaluate(() => ({
    operateur: !!Ext.getCmp('recapOperateurMontant'),
    valeur: !!Ext.getCmp('recapValeurMontant'),
    type: !!Ext.getCmp('recapTypeTiersPayant'),
    groupe: !!Ext.getCmp('recapGroupeTiersPayant'),
    excel: !!Ext.getCmp('recapBtnExcel'),
    operateurs: Ext.getCmp('recapOperateurMontant')
        ? Ext.getCmp('recapOperateurMontant').getStore().getRange().map(r => r.get('code')) : []
  }));
  ok('les trois filtres et le bouton Excel sont presents',
     champs.operateur && champs.valeur && champs.type && champs.groupe && champs.excel, JSON.stringify(champs));
  ok('les six operateurs de comparaison sont proposes',
     ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].every(o => champs.operateurs.indexOf(o) !== -1),
     JSON.stringify(champs.operateurs));

  const colonnes = await p.evaluate(() =>
      Ext.getCmp('RecapGrid').headerCt.items.items.map(c => c.text || c.header).filter(Boolean));
  ok('la colonne Groupe est affichee', colonnes.some(c => /Groupe/i.test(c)), JSON.stringify(colonnes));

  // --- les criteres partent bien au serveur ---
  const avant = requetes.length;
  await p.evaluate(() => {
    Ext.getCmp('dt_start_recap').setValue(new Date(2020, 0, 1));
    Ext.getCmp('dt_end_recap').setValue(new Date());
    Ext.getCmp('recapOperateurMontant').setValue('gte');
    Ext.getCmp('recapValeurMontant').setValue('1000');
    Ext.getCmp('RecapGrid').down('button[text=Rechercher]').fireEvent('click');
  });
  await p.waitForTimeout(4000);
  const derniere = decodeURIComponent(requetes[requetes.length - 1] || '');
  ok('les criteres de montant sont transmis au serveur',
     requetes.length > avant && /operateurMontant=gte/.test(derniere) && /valeurMontant=1000/.test(derniere),
     derniere.slice(-160));

  // --- le filtrage cote serveur ---
  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = r.headers.get('content-type') || '';
    if (t.indexOf('json') !== -1) { return { status: r.status, json: JSON.parse(await r.text()) }; }
    const buf = await r.arrayBuffer();
    return { status: r.status, taille: buf.byteLength,
             signature: new TextDecoder().decode(new Uint8Array(buf.slice(0, 2))) };
  }, url);

  const base = '../api/v1/reglement-facture/recap-organisme/list?dt_start_vente=2020-01-01&dt_end_vente='
      + new Date().toISOString().slice(0, 10) + '&search_value=&lg_TIERS_PAYANT_ID=';
  const tout = await appel(base);
  const filtre = await appel(base + '&operateurMontant=lt&valeurMontant=0');
  ok('la liste sans filtre repond', tout.json && typeof tout.json.total === 'number', JSON.stringify(tout.json && tout.json.total));
  ok('le filtre de montant reduit bien le resultat',
     filtre.json && filtre.json.total <= tout.json.total, 'tout=' + (tout.json || {}).total + ' filtre=' + (filtre.json || {}).total);

  // Un critere qui accepte tout doit rendre le meme total : sans cela, le « filtre » ne ferait
  // que vider la liste, et le test precedent passerait pour de mauvaises raisons.
  const filtreLarge = await appel(base + '&operateurMontant=gte&valeurMontant=-999999999');
  ok('un filtre qui accepte tout laisse le resultat entier',
     filtreLarge.json && filtreLarge.json.total === tout.json.total,
     'tout=' + (tout.json || {}).total + ' large=' + (filtreLarge.json || {}).total);

  const typeInexistant = await appel(base + '&typeTiersPayant=' + encodeURIComponent('TYPE-QUI-N-EXISTE-PAS'));
  ok('un type inconnu ne ramene aucune ligne', typeInexistant.json && typeInexistant.json.total === 0,
     JSON.stringify(typeInexistant.json && typeInexistant.json.total));

  // --- export Excel ---
  const excel = await appel('../api/v1/reglement-facture/recap-organisme/export-excel?dt_start_vente=2020-01-01'
      + '&dt_end_vente=' + new Date().toISOString().slice(0, 10) + '&search_value=&lg_TIERS_PAYANT_ID='
      + '&operateurMontant=&valeurMontant=&typeTiersPayant=&groupeTiersPayant=');
  ok('l export Excel produit un classeur valide',
     excel.status === 200 && excel.signature === 'PK' && excel.taille > 1000, JSON.stringify(excel));

  ok('aucune erreur JavaScript', err.length === 0, err.join(' || '));
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
