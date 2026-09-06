/* Non-regression apres les correctifs carnet depot : l'ecran s'ouvre, le combo ne
   propose que des carnets, et choisir un carnet declenche la recherche. */
const { chromium } = require('playwright-core');
const res=[]; function ok(n,c,d){res.push({n,c:!!c});console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+String(d).slice(0,170)+']':''));}
(async () => {
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
  const ko=res.filter(r=>!r.c);
  console.log('\n===== '+(res.length-ko.length)+'/'+res.length+' PASS =====');
  process.exit(ko.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
