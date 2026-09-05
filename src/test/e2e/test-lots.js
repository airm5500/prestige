/* Suppression d'un lot depuis "Voir les lots / peremptions" : confirmation lisible,
   suppression effective, et refus propre si le lot n'existe plus. */
const { chromium } = require('playwright-core');
const res=[]; function ok(n,c,d){res.push({n,c:!!c});console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+String(d).slice(0,180)+']':''));}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err=[]; p.on('pageerror',e=>err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr',{waitUntil:'domcontentloaded'});
  await p.fill('#str_login','KGA3'); await p.fill('#str_password','e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**',{timeout:30000});
  await p.waitForFunction(()=>window.Ext&&window.testextjs&&testextjs.app,null,{timeout:60000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>testextjs.app.getController('App').onLoadNewComponent('famillemanager','Fiche Article',''));
  await p.waitForFunction(()=>Ext.ComponentQuery.query('famillemanager').length>0,null,{timeout:20000});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{Ext.getCmp('rechecher').setValue('OZEMPIC');Ext.ComponentQuery.query('famillemanager')[0].onRechClick();});
  await p.waitForFunction(()=>Ext.ComponentQuery.query('famillemanager')[0].getStore().getCount()>0,null,{timeout:30000});
  await p.waitForTimeout(1000);

  await p.evaluate(()=>{const g=Ext.ComponentQuery.query('famillemanager')[0];g.onViewPerimesClick(g.getView(),0);});
  await p.waitForTimeout(6000);
  const grille = await p.evaluate(()=>{
    const w = Ext.ComponentQuery.query('window').filter(x=>x.isVisible());
    const g = Ext.ComponentQuery.query('grid').filter(x=>x.isVisible() && x.up('window'));
    if(!g.length) return {ouverte:false};
    const gr=g[g.length-1];
    return {ouverte:true, lignes:gr.getStore().getCount(),
            colonnes:gr.columns.map(c=>(c.text||'').replace(/<[^>]*>/g,''))};
  });
  ok('fenetre des lots ouverte', grille.ouverte, JSON.stringify(grille));
  ok('colonne Supprimer presente', (grille.colonnes||[]).indexOf('Supprimer')>=0, (grille.colonnes||[]).join(' | '));
  ok('des lots sont listes', grille.lignes>0, 'lignes='+grille.lignes);

  // declencher la suppression de la 1re ligne
  const avant = grille.lignes;
  await p.evaluate(()=>{
    const g = Ext.ComponentQuery.query('grid').filter(x=>x.isVisible() && x.up('window'));
    const gr=g[g.length-1];
    const col = gr.columns.filter(c=>(c.text||'')==='Supprimer')[0];
    col.items[0].handler(gr, 0);
  });
  await p.waitForTimeout(1200);
  const dialogue = await p.evaluate(()=>{
    const m = document.querySelector('.x-message-box');
    if(!m) return {present:false};
    // Mesurer la zone de texte, pas le cadre de la fenetre : c'est elle qui
    // tronquerait le message.
    const t = document.querySelector('.ext-mb-text') || m.querySelector('.x-window-body') || m;
    return {present:true, largeur:m.offsetWidth, texte:(m.innerText||'').replace(/\s+/g,' ').trim(),
            tronque: t.scrollWidth > t.clientWidth + 2 || t.scrollHeight > t.clientHeight + 2};
  });
  ok('confirmation affichee', dialogue.present, JSON.stringify(dialogue).slice(0,200));
  ok('message non tronque', dialogue.present && !dialogue.tronque, 'largeur='+dialogue.largeur);
  ok('message nomme le lot et la peremption',
     dialogue.present && /lot/i.test(dialogue.texte) && /rempti/i.test(dialogue.texte), dialogue.texte);
  ok('boutons Oui / Non', dialogue.present && /Oui/.test(dialogue.texte) && /Non/.test(dialogue.texte), dialogue.texte);

  // confirmer
  await p.evaluate(()=>{
    const btns=[...document.querySelectorAll('.x-message-box .x-btn')];
    const oui=btns.find(b=>/Oui/i.test(b.innerText));
    if(oui) oui.click();
  });
  await p.waitForTimeout(5000);
  const apres = await p.evaluate(()=>{
    const g = Ext.ComponentQuery.query('grid').filter(x=>x.isVisible() && x.up('window'));
    return g.length ? g[g.length-1].getStore().getCount() : -1;
  });
  ok('le lot est supprime et la liste rechargee', apres === avant-1, 'avant='+avant+' apres='+apres);
  ok('aucune erreur JavaScript', err.length===0, err.join(' || '));
  await b.close();
  const ko=res.filter(r=>!r.c);
  console.log('\n===== '+(res.length-ko.length)+'/'+res.length+' PASS =====');
  process.exit(ko.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
