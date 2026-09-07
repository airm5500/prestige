/* Lot C - point 9 : les modes de reglement.
 *
 * 9a : le point mobile money ne doit plus lister les modes desactives, SAUF si la journee en
 *      compte des encaissements - un total qui ment serait pire qu'une ligne a zero.
 * 9b : un mode cree depuis le menu « modes de reglement » PENDANT que la caisse est ouverte doit
 *      se comporter comme les autres mobile money des sa selection, sans redemarrer l'application.
 *
 * Ce test JOUE LE PARCOURS REEL (menu, produit, liste deroulante, clic sur la ligne) : les tests
 * qui appelaient directement les services n'avaient pas vu le defaut, puisqu'ils rechargeaient
 * eux-memes les classements que l'ecran, lui, gardait perimes.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'WYZALLC';
function nettoyer() {
  exec("DELETE FROM t_mode_reglement WHERE str_NAME='" + NOM + "';"
     + "DELETE FROM t_type_reglement WHERE str_NAME='" + NOM + "';");
}

(async () => {
  nettoyer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const appel = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
    const opts = { method: m, headers: { 'Content-Type': 'application/json' } };
    if (c) { opts.body = JSON.stringify(c); }
    const r = await fetch(u, opts);
    return { status: r.status, body: await r.text() };
  }, [methode, url, corps || null]);

  const okButton = async () => p.evaluate(() => {
    const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0];
    if (!box) { return null; }
    const btn = box.query('button{isVisible()}').find(x => /ok|oui/i.test(x.text || ''));
    return btn ? '#' + btn.el.dom.id : null;
  });

  /* ------------------------------------------------------------------ 9a */
  const pointAvant = JSON.parse((await appel('GET', '../api/v1/caisse/point-mobile-money')).body);
  ok('9a) le point mobile money repond', pointAvant.success === true, JSON.stringify(pointAvant).slice(0, 200));

  const desactives = q("SELECT GROUP_CONCAT(str_NAME) FROM t_type_reglement "
    + "WHERE str_CATEGORIE='MOBILE_MONEY' AND str_STATUT<>'enable'");
  const libelles = (pointAvant.data || []).map(r => String(r.libelle || '').toUpperCase());
  const listes = (desactives || '').split(',').filter(Boolean);
  ok('9a) au moins un mode mobile est desactive en base (sinon le controle ne prouve rien)',
     listes.length > 0, desactives);
  let fuite = null;
  listes.forEach(function (nom) {
    const ligne = (pointAvant.data || []).find(r => String(r.libelle || '').toUpperCase() === nom.toUpperCase());
    // un mode desactive n'est tolere que s'il porte de l'activite du jour
    if (ligne && !(ligne.montant || ligne.nbVentes)) { fuite = nom; }
  });
  ok('9a) aucun mode desactive et sans activite dans le point', fuite === null, 'fuite=' + fuite
     + ' point=' + JSON.stringify(libelles));

  const somme = (pointAvant.data || []).reduce((t, r) => t + (r.montant || 0), 0);
  ok('9a) le total general reste la somme des lignes affichees',
     Math.round(somme) === Math.round(pointAvant.totalMontant || 0),
     somme + ' vs ' + pointAvant.totalMontant);

  /* ------------------------------------------------------------------ 9b */
  // 1) on ouvre d'abord la caisse : le controleur charge ses classements MAINTENANT
  await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
  await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  let sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }

  // 2) le mode est cree APRES : c'est tout le sujet du retour de test
  const r = await appel('POST', '../api/v1/modereglement', { name: NOM, mobileMoney: true, clientRequis: true });
  const cree = JSON.parse(r.body);
  ok('9b) mode mobile money cree pendant que la caisse est ouverte', cree.success === true, r.body);
  const modeId = String(cree.id);
  ok('9b) le serveur le classe en mobile money',
     q("SELECT str_CATEGORIE FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID='" + modeId + "'") === 'MOBILE_MONEY');

  const perime = await p.evaluate(id => testextjs.app.getController('VenteCtr').mobileModeIds.indexOf(String(id)) !== -1, modeId);
  ok('9b) l ecran ouvert ignore encore le mode (situation de depart du defaut)', perime === false);

  // 3) parcours reel : un produit dans le panier
  const comboInput = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id);
  await p.click(comboInput);
  await p.keyboard.type('0000498', { delay: 50 });
  await p.waitForSelector('.x-boundlist-item', { timeout: 20000 });
  await p.click('.x-boundlist-item');
  await p.waitForTimeout(800);
  const qtyInput = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0].inputEl.id);
  await p.click(qtyInput);
  await p.keyboard.press('Control+A');
  await p.keyboard.type('1', { delay: 60 });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  sel = await okButton(); if (sel) { await p.click(sel); await p.waitForTimeout(400); }
  const venteId = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); return c.current ? c.current.lgPREENREGISTREMENTID : null; });
  ok('9b) produit ajoute au panier', !!venteId, 'vente=' + venteId);

  // 4) on ouvre la liste des modes de reglement COMME L UTILISATEUR, puis on clique la ligne
  const trigger = await p.evaluate(() => {
    const c = Ext.ComponentQuery.query('doventemanager #contenu #typeReglement')[0];
    return c ? '#' + c.triggerEl.elements[0].id : null;
  });
  ok('9b) la liste des modes de reglement est presente a l ecran', !!trigger);
  await p.click(trigger);
  await p.waitForTimeout(2500);
  const presentDansListe = await p.evaluate(nom => {
    const c = Ext.ComponentQuery.query('doventemanager #contenu #typeReglement')[0];
    return c.getStore().getRange().some(x => String(x.get('strNAME') || '').toUpperCase() === nom);
  }, NOM);
  ok('9b) le nouveau mode figure dans la liste deroulante', presentDansListe === true);

  const relu = await p.evaluate(id => testextjs.app.getController('VenteCtr').mobileModeIds.indexOf(String(id)) !== -1, modeId);
  ok('9b) l ouverture de la liste a rafraichi le classement', relu === true);

  // clic reel sur la ligne du nouveau mode
  const items = await p.$$('.x-boundlist-item');
  let clique = false;
  for (const it of items) {
    const t = (await it.textContent() || '').trim().toUpperCase();
    if (t === NOM) { await it.click(); clique = true; break; }
  }
  ok('9b) la ligne du nouveau mode est cliquable', clique === true);
  await p.waitForTimeout(3000);

  // 5) verdict : meme comportement que les autres mobile money
  const etat = await p.evaluate(() => {
    const c = testextjs.app.getController('VenteCtr');
    const fenetre = Ext.ComponentQuery.query('clientlambda{isVisible()}')[0]
            || Ext.ComponentQuery.query('window{isVisible()}').find(w => !!w.down('#queryClientLambda'));
    const infos = c.getInfosClientStandard ? c.getInfosClientStandard() : null;
    const montant = c.getMontantRecu ? c.getMontantRecu() : null;
    const extra = c.getBtnExtraMode ? c.getBtnExtraMode() : null;
    return {
      applique: c._appliedTypeReglement,
      mobile: c.isMobileMode(String(c._appliedTypeReglement)),
      fenetreClient: !!fenetre,
      selectionRapide: !!(fenetre && fenetre.query('panel').some(x => /S\u00c9LECTION RAPIDE/i.test(String(x.title || '')))),
      infosVisibles: !!(infos && infos.isVisible()),
      montantVerrouille: !!(montant && montant.readOnly),
      boutonSecondMode: !!(extra && extra.isVisible())
    };
  });
  ok('9b) le mode selectionne est bien celui cree', String(etat.applique) === modeId, JSON.stringify(etat));
  ok('9b) l ecran le reconnait comme mobile money', etat.mobile === true, JSON.stringify(etat));
  ok('9b) la fenetre de choix du client s ouvre a la selection (et non a la validation)',
     etat.fenetreClient === true, JSON.stringify(etat));
  ok('9b) la zone client est affichee', etat.infosVisibles === true, JSON.stringify(etat));
  ok('9b) le montant recu est verrouille comme pour les autres mobile money',
     etat.montantVerrouille === true, JSON.stringify(etat));
  ok('9b) le bouton second mode mobile est propose comme pour les autres',
     etat.boutonSecondMode === true, JSON.stringify(etat));
  // le volet de selection rapide n'apparait que si l'officine a enregistre des clients mobile
  // money : on ne l'exige que dans ce cas, sinon on le signale sans faire echouer le test.
  const clientsMobile = JSON.parse((await appel('GET', '../api/v1/modereglement/clients-mobile-money')).body);
  if ((clientsMobile.data || []).length) {
    ok('9b) le volet de selection rapide mobile money est propose', etat.selectionRapide === true, JSON.stringify(etat));
  } else {
    console.log('INFO  aucun client mobile money enregistre : volet de selection rapide non applicable');
  }

  // 6) non-regression : le mobile money natif garde exactement le meme comportement
  await p.evaluate(() => { const w = Ext.ComponentQuery.query('window{isVisible()}').find(x => !!x.down('#queryClientLambda')); if (w) { w.close(); } });
  await p.waitForTimeout(800);
  const natif = await p.evaluate(() => {
    const c = testextjs.app.getController('VenteCtr');
    return { orange: c.isMobileMode('7'), especes: c.isMobileMode('1'), cheque: c.modeExigeClient('2'), esp: c.modeExigeClient('1') };
  });
  ok('9b) non-regression : Orange Money reste mobile', natif.orange === true, JSON.stringify(natif));
  ok('9b) non-regression : les especes ne sont pas mobile', natif.especes === false);
  ok('9b) non-regression : le cheque exige toujours un client', natif.cheque === true);
  ok('9b) non-regression : les especes n exigent pas de client', natif.esp === false);

  ok('aucune erreur javascript pendant le parcours', err.length === 0, err.join(' | '));

  if (venteId) { exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + venteId + "';"
                    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "';"); }
  nettoyer();
  await b.close();
  const echecs = res.filter(x => !x.c);
  console.log('\n' + (res.length - echecs.length) + '/' + res.length + ' OK');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); nettoyer(); process.exit(1); });
