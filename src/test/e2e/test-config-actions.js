/* Parametrage des actions de ligne de la fiche article (t_parameters). */
const { chromium } = require('playwright-core');
const res=[]; function ok(n,c,d){res.push({n,c:!!c});console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+String(d).slice(0,190)+']':''));}
const nbIcones = async p => p.evaluate(()=>{
  const g=Ext.ComponentQuery.query('famillemanager')[0];
  const cols=g.headerCt.items.items.filter(c=>c.xtype==='actioncolumn');
  const menu=cols.filter(c=>c.items[0] && c.items[0].tooltip==='Autres actions').length;
  return {total:cols.length, menu:menu, icones:cols.length-menu};
});
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err=[]; p.on('pageerror',e=>err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr',{waitUntil:'domcontentloaded'});
  await p.fill('#str_login','KGA3'); await p.fill('#str_password','e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**',{timeout:30000});
  await p.waitForFunction(()=>window.Ext&&window.testextjs&&testextjs.app,null,{timeout:60000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>testextjs.app.getController('App').onLoadNewComponent('famillemanager','Fiche Article',''));
  await p.waitForFunction(()=>Ext.ComponentQuery.query('famillemanager').length>0,null,{timeout:20000});
  await p.waitForTimeout(3000);

  const base = await nbIcones(p);
  ok('4 icones + le menu par defaut', base.icones===4 && base.menu===1, JSON.stringify(base));
  ok('bouton de configuration visible pour un administrateur',
     await p.evaluate(()=>{const b=Ext.getCmp('btn_config_actions');return !!b && b.isVisible();}));

  // ouvrir la fenetre
  await p.evaluate(()=>Ext.ComponentQuery.query('famillemanager')[0].onConfigurerActions());
  await p.waitForTimeout(1500);
  const fen = await p.evaluate(()=>{
    const w=Ext.ComponentQuery.query('window').filter(x=>x.isVisible());
    if(!w.length) return {ouverte:false};
    const grilles=w[w.length-1].query('gridpanel');
    return {ouverte:true, listes:grilles.length,
            gauche:grilles[0]?grilles[0].getStore().getCount():-1,
            droite:grilles[1]?grilles[1].getStore().getCount():-1,
            dd: !!(grilles[0] && grilles[0].getView().plugins && grilles[0].getView().plugins.length)};
  });
  ok('fenetre de configuration ouverte', fen.ouverte, JSON.stringify(fen));
  ok('deux listes : 4 en icone / 6 dans le menu', fen.listes===2 && fen.gauche===4 && fen.droite===6, JSON.stringify(fen));
  ok('glisser-deposer actif sur les listes', fen.dd, JSON.stringify(fen));

  // deplacer 2 actions du menu vers les icones -> 6 icones
  await p.evaluate(()=>{
    const w=Ext.ComponentQuery.query('window').filter(x=>x.isVisible());
    const g=w[w.length-1].query('gridpanel');
    const src=g[1].getStore(), dst=g[0].getStore();
    dst.add(src.getAt(0).copy()); src.removeAt(0);
    dst.add(src.getAt(0).copy()); src.removeAt(0);
  });
  await p.evaluate(()=>{
    const w=Ext.ComponentQuery.query('window').filter(x=>x.isVisible());
    w[w.length-1].down('button[text=Valider]').handler();
  });
  await p.waitForTimeout(4000);
  const apres = await nbIcones(p);
  ok('apres validation : 6 icones + le menu', apres.icones===6 && apres.menu===1, JSON.stringify(apres));

  // tout mettre en icone -> le menu doit disparaitre
  await p.evaluate(()=>Ext.ComponentQuery.query('famillemanager')[0].onConfigurerActions());
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{
    const w=Ext.ComponentQuery.query('window').filter(x=>x.isVisible());
    const g=w[w.length-1].query('gridpanel');
    const src=g[1].getStore(), dst=g[0].getStore();
    while(src.getCount()){ dst.add(src.getAt(0).copy()); src.removeAt(0); }
    w[w.length-1].down('button[text=Valider]').handler();
  });
  await p.waitForTimeout(4000);
  const tout = await nbIcones(p);
  ok('toutes en icone : le menu « ... » disparait', tout.icones===10 && tout.menu===0, JSON.stringify(tout));

  ok('aucune erreur JavaScript', err.length===0, err.join(' || '));
  await b.close();
  const ko=res.filter(r=>!r.c);
  console.log('\n===== '+(res.length-ko.length)+'/'+res.length+' PASS =====');
  process.exit(ko.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
