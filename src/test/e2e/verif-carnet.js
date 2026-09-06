/* Non-regression apres les correctifs carnet depot : l'ecran s'ouvre, le combo ne
   propose que des carnets, et choisir un carnet declenche la recherche. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res=[]; function ok(n,c,d){res.push({n,c:!!c});console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+String(d).slice(0,170)+']':''));}

/* Le test pose lui-meme ses jeux d'essai puis les retire : un carnet depot et une assurance
   marquee depot. Sans l'assurance, le filtrage du point 1.3 ne serait pas reellement verifie. */
const BASE = process.env.DB_TEST || 'capitale';
const sql = (q) => execFileSync('mariadb', [BASE, '-e', q], { encoding: 'utf8' });
const MODELE = process.env.TP_MODELE || '16131133926037859341';
function semer() {
  nettoyer();
  sql(`CREATE TEMPORARY TABLE tmp_tp AS SELECT * FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID='${MODELE}';
       UPDATE tmp_tp SET lg_TIERS_PAYANT_ID='V13-CARNET', str_NAME='ZZ CARNET TEST',
              str_FULLNAME='ZZ CARNET TEST', str_CODE_ORGANISME='ZZ CARNET TEST',
              is_depot=1, account=0, str_STATUT='enable', lg_TYPE_TIERS_PAYANT_ID='2';
       INSERT INTO t_tiers_payant SELECT * FROM tmp_tp;
       UPDATE tmp_tp SET lg_TIERS_PAYANT_ID='V13-ASSUR', str_NAME='ZZ ASSURANCE TEST',
              str_FULLNAME='ZZ ASSURANCE TEST', str_CODE_ORGANISME='ZZ ASSURANCE TEST',
              lg_TYPE_TIERS_PAYANT_ID='1';
       INSERT INTO t_tiers_payant SELECT * FROM tmp_tp;`);
}
function nettoyer() {
  sql("DELETE FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID IN ('V13-CARNET','V13-ASSUR')");
}

(async () => {
  semer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err=[]; p.on('pageerror',e=>err.push(String(e.message)));
  let appels=0; p.on('request', r=>{ if(r.url().includes('carnet-depot/ventes')) appels++; });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr',{waitUntil:'domcontentloaded'});
  await p.fill('#str_login','KGA3'); await p.fill('#str_password','e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**',{timeout:30000});
  await p.waitForFunction(()=>window.Ext&&window.testextjs&&testextjs.app,null,{timeout:60000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>testextjs.app.getController('App').onLoadNewComponent('reglementdepot','Gerer carnet depot',''));
  const ouvert = await p.waitForFunction(()=>Ext.ComponentQuery.query('reglementdepot').length>0,null,{timeout:20000}).then(()=>true).catch(()=>false);
  ok('ecran Gerer carnet depot ouvert', ouvert);
  await p.waitForTimeout(3500);
  const combo = await p.evaluate(()=>{
    const c = Ext.ComponentQuery.query('reglementdepot #tiersPayantsExclus')[0];
    if(!c) return {present:false};
    return {present:true, nb:c.getStore().getCount(),
            noms:c.getStore().getRange().slice(0,5).map(r=>r.get('nom')||r.get('nomComplet'))};
  });
  ok('combo des carnets present', combo.present, JSON.stringify(combo));
  ok('seuls les carnets sont proposes (assurance depot ecartee)',
     combo.nb===1 && /CARNET/.test((combo.noms||[]).join(',')) && !/ASSURANCE/.test((combo.noms||[]).join(',')),
     JSON.stringify(combo));

  // 1.4 : choisir un carnet doit declencher la recherche de l'onglet actif
  const avant = appels;
  await p.evaluate(()=>{
    const c = Ext.ComponentQuery.query('reglementdepot #tiersPayantsExclus')[0];
    const rec = c.getStore().getAt(0);
    c.setValue(rec.get('id'));
    c.fireEvent('select', c, [rec]);
  });
  await p.waitForTimeout(2500);
  ok('choisir un carnet lance la recherche', appels > avant, 'appels avant='+avant+' apres='+appels);

  ok('aucune erreur JavaScript', err.length===0, err.join(' || '));
  console.log('  (appels de recherche ventes observes : '+appels+')');
  await b.close();
  nettoyer();
  const ko=res.filter(r=>!r.c);
  console.log('\n===== '+(res.length-ko.length)+'/'+res.length+' PASS =====');
  process.exit(ko.length?1:0);
})().catch(e=>{console.error('FATAL',e);try{nettoyer();}catch(_){}process.exit(2);});
