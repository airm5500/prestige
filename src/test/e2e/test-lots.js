/* Suppression d'un lot depuis "Voir les lots / peremptions" : confirmation lisible,
   suppression effective, et refus propre si le lot n'existe plus. Le lot supprime est un lot d'essai pose par le
   test sur un produit qui n'en avait aucun. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const q = (x) => execFileSync('mariadb', [process.env.DB_TEST || 'capitale', '-sN', '-e', x], { encoding: 'utf8' }).trim();
/* Jeu d'essai : un produit sans lot recoit un lot d'essai ; c'est LUI que le test supprime
   (jamais un lot reel). Retire a la fin s'il reste. */
const PRODUIT = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1'"
  + " WHERE f.str_STATUT='enable' AND f.int_CIP IS NOT NULL AND f.int_CIP <> ''"
  + " AND NOT EXISTS (SELECT 1 FROM t_lot l WHERE l.lg_FAMILLE_ID=f.lg_FAMILLE_ID) ORDER BY f.str_NAME LIMIT 1").split('|');
const retirerLot = () => q("DELETE FROM t_lot WHERE lg_LOT_ID='E2E-LOTS-1'");
const res=[]; function ok(n,c,d){res.push({n,c:!!c});console.log((c?'PASS':'FAIL')+'  '+n+(d?'  ['+String(d).slice(0,180)+']':''));}
(async () => {
  retirerLot();
  q("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, current_stock)"
    + " SELECT 'E2E-LOTS-1', lg_USER_ID, '" + PRODUIT[0] + "', 'E2ELOTS', 2, NOW(), NOW(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), 'enable', 2 FROM t_user WHERE str_LOGIN='"
    + (process.env.E2E_LOGIN || 'admin') + "'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err=[]; p.on('pageerror',e=>err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr',{waitUntil:'domcontentloaded'});
  await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password','e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**',{timeout:30000});
  await p.waitForFunction(()=>window.Ext&&window.testextjs&&testextjs.app,null,{timeout:60000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>testextjs.app.getController('App').onLoadNewComponent('famillemanager','Fiche Article',''));
  await p.waitForFunction(()=>Ext.ComponentQuery.query('famillemanager').length>0,null,{timeout:20000});
  await p.waitForTimeout(1200);
  await p.evaluate((cip)=>{Ext.getCmp('rechecher').setValue(cip);Ext.ComponentQuery.query('famillemanager')[0].onRechClick();}, PRODUIT[1]);
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
  ok('c est le lot d essai qui a disparu en base', q("SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID='E2E-LOTS-1'") === '0');
  ok('aucune erreur JavaScript', err.length===0, err.join(' || '));
  await b.close();
  retirerLot();
  const ko=res.filter(r=>!r.c);
  console.log('\n===== '+(res.length-ko.length)+'/'+res.length+' PASS =====');
  process.exit(ko.length?1:0);
})().catch(e=>{console.error('FATAL',e);try{retirerLot();}catch(x){}process.exit(2);});
