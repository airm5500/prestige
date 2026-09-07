/* Lot 3 (suite).
   Point 3 : ecran de saisie d'une commande — l'icone du code EAN redevient visible, les actions
             de la fenetre portent un pictogramme explicite et un libelle accessible.
   Point 8 : produits detailles — quantite obtenue en vert apres le nom, nombre de boites en rouge,
             contenance rappelee, et boite de message qui ne tronque plus rien. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 280) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2EL3B';

let PARENT = null, DETAIL = null, CONTENANCE = 0;
const BOITES = 3;

function nettoyer() {
  exec("DELETE FROM hmvtproduit WHERE uuid LIKE '" + MARQUE + "%'");
}

/* Un deconditionnement ecrit DEUX mouvements au meme instant : le negatif (06) sur la boite,
   le positif (05) sur le detail. On seme la paire, avec une contenance connue. */
function semer() {
  nettoyer();
  const paire = q("SELECT CONCAT(fp.lg_FAMILLE_ID,'|',fd.lg_FAMILLE_ID,'|',fp.int_NUMBERDETAIL)"
    + " FROM t_famille fp JOIN t_famille fd ON fd.lg_FAMILLE_PARENT_ID = fp.lg_FAMILLE_ID"
    + " AND fd.bool_DECONDITIONNE = 1 WHERE fp.int_NUMBERDETAIL > 1 AND fp.str_STATUT = 'enable' LIMIT 1");
  if (!paire) { return false; }
  [PARENT, DETAIL, CONTENANCE] = paire.split('|');
  CONTENANCE = Number(CONTENANCE);
  const emplacement = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const utilisateur = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  const commun = "'2026-09-06 10:00:00', CURDATE(), 0, 0, ";
  exec("INSERT INTO hmvtproduit (uuid, createdAt, mvtdate, prixAchat, prixUn, qteDebut, qteFinale, qteMvt,"
    + " valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, pkey, ug) VALUES"
    + " ('" + MARQUE + "-06', " + commun + "10, " + (10 - BOITES) + ", " + BOITES + ", 0,"
    + " '" + emplacement + "', '" + PARENT + "', '" + utilisateur + "', '06', '" + MARQUE + "', 0)");
  exec("INSERT INTO hmvtproduit (uuid, createdAt, mvtdate, prixAchat, prixUn, qteDebut, qteFinale, qteMvt,"
    + " valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt, pkey, ug) VALUES"
    + " ('" + MARQUE + "-05', " + commun + "0, " + (BOITES * CONTENANCE) + ", " + (BOITES * CONTENANCE) + ", 0,"
    + " '" + emplacement + "', '" + DETAIL + "', '" + utilisateur + "', '05', '" + MARQUE + "', 0)");
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : aucun couple boite/detail dans la base'); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  try {
    // ---------------------------------------------------------------- point 3
    /* L'icone est posee sur une balise <img> : elle n'est visible que si elle a une IMAGE DE FOND.
       Un pseudo-element ne se rend jamais sur une image, et c'etait le defaut signale. */
    const icone = await p.evaluate(async () => {
      const grille = Ext.create('Ext.grid.Panel', {
        renderTo: Ext.getBody(), width: 400, height: 150,
        store: Ext.create('Ext.data.Store', { fields: ['a'], data: [{ a: '1' }] }),
        columns: [{ dataIndex: 'a', text: 'A' },
          { xtype: 'actioncolumn', width: 30,
            items: [{ iconCls: 'vp-icone-ean', tooltip: 'EAN', altText: 'Ajouter ou modifier le code EAN' }] }]
      });
      await new Promise(r => setTimeout(r, 400));
      const el = grille.getEl().dom.querySelector('.vp-icone-ean');
      const st = el ? getComputedStyle(el) : null;
      const r = {
        balise: el ? el.tagName : 'ABSENT',
        fond: st ? st.backgroundImage : '',
        largeur: el ? Math.round(el.getBoundingClientRect().width) : 0,
        hauteur: el ? Math.round(el.getBoundingClientRect().height) : 0,
        alt: el ? el.getAttribute('alt') : null,
        visible: st ? (st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0) : false
      };
      grille.destroy();
      return r;
    });
    ok('point 3 : l icone EAN est bien dessinee (image de fond, pas un pseudo-element)',
       icone.fond && icone.fond !== 'none' && icone.fond.indexOf('svg') !== -1, JSON.stringify(icone));
    ok('point 3 : l icone est visible', icone.visible && icone.largeur >= 16 && icone.hauteur >= 16,
       JSON.stringify(icone));
    ok('point 3 : la zone cliquable correspond a l icone affichee',
       icone.largeur === 16 && icone.hauteur === 16, icone.largeur + 'x' + icone.hauteur);
    ok('point 3 : l action porte un libelle accessible',
       (icone.alt || '').indexOf('EAN') !== -1, JSON.stringify(icone.alt));

    const source = await p.evaluate(async () => {
      const r = await fetch('app/view/commandemanagement/order/action/add.js');
      return await r.text();
    });
    ok('point 3 : le bouton de validation porte un pictogramme et une info-bulle',
       /text: 'Valider'[\s\S]{0,200}icon: 'resources\/images\/icons\/fam\/accept\.png'[\s\S]{0,200}tooltip:/.test(source),
       source.indexOf("text: 'Valider'") !== -1 ? 'bouton Valider present' : 'bouton Valider absent');
    ok('point 3 : le bouton de fermeture porte lui aussi son pictogramme',
       /text: 'Fermer'[\s\S]{0,200}icon: 'resources\/images\/icons\/fam\/cross\.gif'/.test(source));
    const imagesOk = await p.evaluate(async () => {
      const charge = (u) => new Promise(r => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = u; });
      return { accept: await charge('resources/images/icons/fam/accept.png'),
               cross: await charge('resources/images/icons/fam/cross.gif') };
    });
    ok('point 3 : les deux pictogrammes existent vraiment', imagesOk.accept && imagesOk.cross,
       JSON.stringify(imagesOk));

    // ---------------------------------------------------------------- point 8
    const histo = await p.evaluate(async () => {
      const r = await fetch('../api/v1/details/historique?start=0&limit=50');
      return JSON.parse(await r.text());
    });
    const ligne = (histo.data || []).filter(l => l.contenance > 0)[0];
    ok('point 8 : l historique renvoie la contenance', !!ligne && ligne.contenance > 0,
       ligne ? 'contenance=' + ligne.contenance : 'aucune ligne');
    ok('point 8 : la quantite de detail obtenue vaut boites x contenance',
       ligne && ligne.qteDetailObtenue === ligne.qteDet * ligne.contenance,
       ligne ? ligne.qteDet + ' x ' + ligne.contenance + ' = ' + ligne.qteDetailObtenue : '');
    ok('point 8 : le calcul correspond aux donnees semees',
       ligne && ligne.qteDet === 3 && ligne.contenance === CONTENANCE
         && ligne.qteDetailObtenue === 3 * CONTENANCE,
       ligne ? JSON.stringify({ qteDet: ligne.qteDet, contenance: ligne.contenance, obtenue: ligne.qteDetailObtenue }) : '');

    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('detailsmanager', {}));
    await p.waitForTimeout(3000);
    const rendu = await p.evaluate(async () => {
      const ecran = Ext.ComponentQuery.query('detailsmanager')[0];
      if (!ecran) { return { ecran: false }; }
      const grille = ecran.down('#grilleHistorique');
      grille.getStore().loadPage(1);
      await new Promise(r => setTimeout(r, 2500));
      const colonnes = grille.headerCt.items.items.map(c => (c.text || '').replace(/<[^>]*>/g, ''));
      const enr = grille.getStore().getAt(0);
      if (!enr) { return { ecran: true, lignes: 0, colonnes: colonnes }; }
      const colNom = grille.headerCt.items.items.filter(c => c.dataIndex === 'nomDet')[0];
      const colQte = grille.headerCt.items.items.filter(c => c.dataIndex === 'qteDet')[0];
      const meta = {};
      return {
        ecran: true, lignes: grille.getStore().getCount(), colonnes: colonnes,
        htmlNom: colNom.renderer(enr.get('nomDet'), meta, enr),
        htmlQte: colQte.renderer(enr.get('qteDet'), {}, enr),
        infobulle: meta.tdAttr || '',
        attendu: enr.get('qteDetailObtenue')
      };
    });
    ok('point 8 : l ecran des produits detailles s ouvre', rendu.ecran && rendu.lignes > 0,
       JSON.stringify({ ecran: rendu.ecran, lignes: rendu.lignes }));
    ok('point 8 : la colonne Contenance est presente',
       (rendu.colonnes || []).indexOf('Contenance') !== -1, JSON.stringify(rendu.colonnes));
    ok('point 8 : la quantite obtenue suit le nom, entre parentheses et precedee d un +',
       /\(\+[\d  ,.]+\)/.test(rendu.htmlNom || ''), rendu.htmlNom);
    ok('point 8 : elle est affichee en vert',
       /color:#1e7e34/.test(rendu.htmlNom || ''), rendu.htmlNom);
    ok('point 8 : le nombre de boites est affiche en rouge',
       /color:#c0392b/.test(rendu.htmlQte || ''), rendu.htmlQte);
    ok('point 8 : la contenance est rappelee dans l info-bulle de la ligne',
       /par bo/.test(rendu.infobulle || ''), rendu.infobulle);

    // boite de message : contenu entierement visible, sans troncature
    const boite = await p.evaluate(async () => {
      const ctr = testextjs.app.getController('DetailsCtr');
      const tres_long = new Array(120).fill('Article refuse par le serveur pour une raison detaillee.').join(' ');
      const fenetre = ctr.messageComplet('Message', tres_long);
      await new Promise(r => setTimeout(r, 600));
      const corps = fenetre.down('#corpsMessage').getEl().dom;
      const style = getComputedStyle(corps);
      const r = {
        redimensionnable: !!fenetre.resizable,
        // Le corps deborde (le texte est plus haut que la place) ET il defile : rien n'est perdu.
        deborde: corps.scrollHeight > corps.clientHeight,
        defile: style.overflowY === 'auto' || style.overflowY === 'scroll',
        tientDansEcran: fenetre.getHeight() <= Ext.getBody().getViewSize().height,
        texteComplet: corps.textContent.replace(/\s+/g, ' ').trim().length >= tres_long.length - 5,
        hauteur: fenetre.getHeight(), scrollH: corps.scrollHeight, clientH: corps.clientHeight
      };
      fenetre.close();
      return r;
    });
    ok('point 8 : la boite de message est redimensionnable', boite.redimensionnable, JSON.stringify(boite));
    ok('point 8 : un texte trop long defile au lieu d etre coupe', boite.deborde && boite.defile,
       JSON.stringify(boite));
    ok('point 8 : le texte est present en entier dans la boite', boite.texteComplet, JSON.stringify(boite));
    ok('point 8 : la boite ne deborde pas de l ecran', boite.tientDansEcran, JSON.stringify(boite));

    ok('aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } finally {
    await b.close();
    nettoyer();
  }
  const total = res.length, passes = res.filter(r => r.c).length;
  console.log('\n===== ' + passes + '/' + total + ' PASS =====');
  process.exit(passes === total ? 0 : 1);
})();
