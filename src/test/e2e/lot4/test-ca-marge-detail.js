/* Lot 4 — point 19 : analyse du CA par emplacement et famille.
   - marge en valeur et en pourcentage, formule unique de « Marge sur produits » ;
   - detail d'une ligne : produits pris en compte, totaux, impression, export, inventaire.
   Point 13 : les modes mobile money viennent de la base et non d'une liste codee en dur. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 280) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const MARQUE = 'E2EL4';

/* Une vente a nous, aux montants CHOISIS : la marge attendue se calcule alors a la main, et le
   test verifie un resultat au lieu de relire ce que le serveur a bien voulu produire.

   Les ventes deja presentes dans cette base portent des lg_USER_ID qui n'existent pas dans t_user :
   la jointure de l'analyse les ecarte toutes. Il faut donc semer la notre, rattachee a un
   utilisateur reel.

   Trois produits, meme zone geographique, TVA et remise non nulles pour que la formule ne puisse
   pas passer par hasard. */
const PRODUITS = [
  { montant: 120000, remise: 20000, tva: 10000, achat: 60000, quantite: 4 },
  { montant: 60000, remise: 0, tva: 5000, achat: 40000, quantite: 2 },
  { montant: 30000, remise: 5000, tva: 0, achat: 35000, quantite: 1 }   // vendu a perte, exprès
];
let ZONE = null;
const attendu = {};

function nettoyer() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID LIKE '" + MARQUE + "%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'");
  // L'inventaire cree par le test porte le libelle de la ligne semee ; on le retire par sa date.
  exec("DELETE d FROM t_inventaire_famille d JOIN t_inventaire i ON i.lg_INVENTAIRE_ID = d.lg_INVENTAIRE_ID"
    + " WHERE i.str_NAME LIKE 'Inventaire issu%' AND DATE(i.dt_CREATED) = CURDATE()");
  exec("DELETE FROM t_inventaire WHERE str_NAME LIKE 'Inventaire issu%' AND DATE(dt_CREATED) = CURDATE()");
}

function semer() {
  nettoyer();
  const utilisateur = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  // Trois produits d'une meme zone : la ligne « zone » de l'analyse les regroupe tous les trois.
  const zoneEtProduits = q("SELECT CONCAT(f.lg_ZONE_GEO_ID, '#', GROUP_CONCAT(f.lg_FAMILLE_ID))"
    + " FROM t_famille f WHERE f.str_STATUT='enable' AND f.lg_ZONE_GEO_ID IS NOT NULL"
    + " AND f.lg_ZONE_GEO_ID <> '' GROUP BY f.lg_ZONE_GEO_ID HAVING COUNT(*) >= 3 LIMIT 1");
  if (!zoneEtProduits) { return false; }
  ZONE = zoneEtProduits.split('#')[0];
  const familles = zoneEtProduits.split('#')[1].split(',').slice(0, 3);
  if (familles.length < 3) { return false; }

  // La vente est clonee depuis une vente existante : elle porte des dizaines de colonnes liees,
  // et une insertion a la main en oublierait toujours une.
  exec("CREATE TEMPORARY TABLE tmp_v SELECT * FROM t_preenregistrement WHERE str_STATUT='is_Closed' LIMIT 1;"
    + " UPDATE tmp_v SET lg_PREENREGISTREMENT_ID='" + MARQUE + "-V', lg_USER_ID='" + utilisateur + "',"
    + " dt_UPDATED=NOW(), dt_CREATED=NOW(), b_IS_CANCEL=0, str_STATUT='is_Closed', int_PRICE=210000;"
    + " INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;");

  let ttc = 0, remise = 0, tva = 0, achat = 0, quantite = 0;
  PRODUITS.forEach((x, i) => {
    exec("CREATE TEMPORARY TABLE tmp_d SELECT * FROM t_preenregistrement_detail LIMIT 1;"
      + " UPDATE tmp_d SET lg_PREENREGISTREMENT_DETAIL_ID='" + MARQUE + "-D" + i + "',"
      + " lg_PREENREGISTREMENT_ID='" + MARQUE + "-V', lg_FAMILLE_ID='" + familles[i] + "',"
      + " int_PRICE=" + x.montant + ", int_PRICE_REMISE=" + x.remise + ", montantTva=" + x.tva + ","
      + " prixAchat=" + Math.round(x.achat / x.quantite) + ", int_QUANTITY=" + x.quantite + ";"
      + " INSERT INTO t_preenregistrement_detail SELECT * FROM tmp_d; DROP TEMPORARY TABLE tmp_d;");
    // « montant » de l'analyse = prix - remise ; l'achat est le prix unitaire x la quantite.
    ttc += x.montant - x.remise;
    remise += x.remise;
    tva += x.tva;
    achat += Math.round(x.achat / x.quantite) * x.quantite;
    quantite += x.quantite;
  });
  attendu.montant = ttc;
  attendu.tva = tva;
  attendu.achat = achat;
  attendu.quantite = quantite;
  attendu.ht = ttc - tva;
  attendu.marge = attendu.ht - achat;
  attendu.pourcentage = Math.round((attendu.marge * 1000) / attendu.ht) / 10;
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : impossible de semer la vente de test'); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const appel = (url) => p.evaluate(async (u) => {
    const r = await fetch(u);
    const t = await r.text();
    let json = null; try { json = JSON.parse(t); } catch (e) { }
    return { status: r.status, json: json, texte: t.slice(0, 300) };
  }, url);

  try {
    // ---------------------------------------------------------------- point 13
    const modes = await appel('../api/v1/type-reglements/mobile-money');
    const attendus = q("SELECT GROUP_CONCAT(lg_TYPE_REGLEMENT_ID ORDER BY lg_TYPE_REGLEMENT_ID)"
      + " FROM t_type_reglement WHERE str_CATEGORIE = 'MOBILE_MONEY' AND str_STATUT = 'enable'").split(',');
    const rendus = (modes.json && modes.json.data) || [];
    ok('point 13 : la liste mobile money vient de la base',
       rendus.length > 0 && rendus.slice().sort().join(',') === attendus.slice().sort().join(','),
       'rendus=' + JSON.stringify(rendus) + ' attendus=' + JSON.stringify(attendus));
    const desactives = q("SELECT GROUP_CONCAT(lg_TYPE_REGLEMENT_ID) FROM t_type_reglement"
      + " WHERE str_CATEGORIE = 'MOBILE_MONEY' AND str_STATUT <> 'enable'");
    const listeDesactives = desactives ? desactives.split(',') : [];
    ok('point 13 : aucun mode desactive n est propose',
       listeDesactives.length > 0 && listeDesactives.every(id => rendus.indexOf(id) === -1),
       'desactives en base=' + JSON.stringify(listeDesactives) + ' proposes=' + JSON.stringify(rendus));
    const dansLEcran = await p.evaluate(async () => {
      const ctr = testextjs.app.getController('VenteCtr');
      ctr.chargerModesMobileMoney();
      await new Promise(r => setTimeout(r, 1500));
      return { liste: ctr.mobileModeIds, charges: ctr.mobileModeIdsCharges };
    });
    ok('point 13 : l ecran de vente REMPLACE sa liste par celle du serveur',
       dansLEcran.charges && dansLEcran.liste.slice().sort().join(',') === attendus.slice().sort().join(','),
       JSON.stringify(dansLEcran));
    ok('point 13 : les modes desactives ont disparu de l ecran de vente',
       listeDesactives.every(id => dansLEcran.liste.indexOf(id) === -1), JSON.stringify(dansLEcran.liste));

    // ---------------------------------------------------------------- point 19
    const analyse = await appel('../api/v1/ca-zone-geo?typePeriode=TROIS_MOIS&regroupement=ZONE');
    const lignes = (analyse.json && analyse.json.data) || [];
    ok('point 19 : l analyse repond', analyse.status === 200 && analyse.json && analyse.json.success,
       'lignes=' + lignes.length);
    ok('point 19 : chaque ligne porte la marge en valeur et en pourcentage',
       lignes.length > 0 && lignes.every(l => l.marge !== undefined && l.pourcentageMarge !== undefined),
       lignes[0] ? JSON.stringify({ total: lignes[0].total, ht: lignes[0].montantHt, achat: lignes[0].achat,
         marge: lignes[0].marge, pct: lignes[0].pourcentageMarge }) : 'aucune ligne');

    /* La formule doit etre celle de « Marge sur produits » : (vente - remise - TVA) - achat,
       le pourcentage se rapportant au hors taxes. On la reverifie sur chaque ligne. */
    const formuleJuste = lignes.every(l => {
      const htAttendu = l.total - l.tva;
      const margeAttendue = htAttendu - l.achat;
      const pctAttendu = htAttendu === 0 ? 0 : Math.round((margeAttendue * 1000) / htAttendu) / 10;
      return l.montantHt === htAttendu && l.marge === margeAttendue
        && Math.abs(l.pourcentageMarge - pctAttendu) < 0.15;
    });
    ok('point 19 : la marge suit la formule de « Marge sur produits »', lignes.length > 0 && formuleJuste,
       lignes[0] ? JSON.stringify(lignes[0]) : '');
    const totalMarges = lignes.reduce((s, l) => s + l.marge, 0);
    ok('point 19 : le total general de marge est coherent avec les lignes',
       analyse.json && Math.abs(analyse.json.margeGenerale - totalMarges) <= lignes.length,
       'general=' + (analyse.json && analyse.json.margeGenerale) + ' somme des lignes=' + totalMarges);

    // ---- detail d'une ligne
    const ligne = lignes.filter(l => l.zoneId === ZONE)[0] || lignes.filter(l => l.total > 0)[0];
    ok('point 19 : la ligne semee est retrouvee avec ses montants exacts',
       ligne && ligne.zoneId === ZONE && ligne.total === attendu.montant && ligne.marge === attendu.marge
         && Math.abs(ligne.pourcentageMarge - attendu.pourcentage) < 0.15,
       'attendu ' + JSON.stringify(attendu) + ' | obtenu ' + JSON.stringify(ligne && {
         total: ligne.total, tva: ligne.tva, achat: ligne.achat, ht: ligne.montantHt,
         marge: ligne.marge, pct: ligne.pourcentageMarge }));
    if (!ligne) { ok('point 19 : une ligne avec du chiffre existe pour tester le detail', false); throw new Error('pas de ligne'); }
    const critereLigne = 'typePeriode=TROIS_MOIS&regroupement=ZONE&ligneZoneId=' + encodeURIComponent(ligne.zoneId || '');
    const detail = await appel('../api/v1/ca-zone-geo/detail?' + critereLigne);
    const produits = (detail.json && detail.json.data) || [];
    ok('point 19 : le detail d une ligne renvoie ses produits',
       detail.json && detail.json.success && produits.length > 0, 'produits=' + produits.length);
    ok('point 19 : chaque produit porte les six colonnes demandees',
       produits.every(x => x.cip !== undefined && x.designation !== undefined && x.prixAchat !== undefined
         && x.prixVente !== undefined && x.quantite !== undefined && x.montant !== undefined),
       JSON.stringify(produits[0]));
    const sommeDetail = produits.reduce((s, x) => s + x.montant, 0);
    ok('point 19 : la somme du detail redonne exactement le total de la ligne',
       sommeDetail === ligne.total, 'detail=' + sommeDetail + ' ligne=' + ligne.total);
    const totaux = (detail.json && detail.json.totaux) || {};
    ok('point 19 : le detail affiche ses totaux', totaux.montant === sommeDetail && totaux.quantite > 0,
       JSON.stringify(totaux));
    ok('point 19 : la marge du detail est celle de la ligne',
       Math.abs(totaux.marge - ligne.marge) <= 1, 'detail=' + totaux.marge + ' ligne=' + ligne.marge);

    // ---- les trois actions du detail
    const excel = await p.evaluate(async (u) => {
      const r = await fetch(u);
      const buf = await r.arrayBuffer();
      const t = new Uint8Array(buf);
      return { status: r.status, type: r.headers.get('content-type'), taille: t.length,
               signature: String.fromCharCode(t[0], t[1]) };
    }, '../api/v1/ca-zone-geo/detail/excel?' + critereLigne + '&libelle=' + encodeURIComponent(ligne.libelle));
    ok('point 19 : l export Excel du detail est un classeur valide',
       excel.status === 200 && excel.signature === 'PK' && excel.taille > 2000, JSON.stringify(excel));

    const pdf = await appel('../api/v1/ca-zone-geo/detail/pdf?' + critereLigne
      + '&libelle=' + encodeURIComponent(ligne.libelle));
    ok('point 19 : l impression du detail produit un PDF',
       pdf.json && pdf.json.success && /\.pdf$/i.test(pdf.json.msg || ''), pdf.texte);
    if (pdf.json && pdf.json.success) {
      /* Le PDF est lu SUR LE DISQUE : le repertoire des editions est configure hors de
         l'application, et l'URL rendue n'est servie par le serveur que si l'exploitant l'a montee.
         Ce qui doit etre verifie ici, c'est le CONTENU de l'etat. */
      const dossier = process.env.REPORTS_PDF || '/opt/CONF/reports/pdf';
      const fichier = path.join(dossier, pdf.json.msg.split('/').pop());
      ok('point 19 : le PDF a bien ete ecrit', fs.existsSync(fichier), fichier);
      if (fs.existsSync(fichier)) {
        const octets = fs.readFileSync(fichier);
        let texte = '';
        let pos = 0;
        const debutFlux = Buffer.from('stream');
        const finFlux = Buffer.from('endstream');
        while (true) {
          const d = octets.indexOf(debutFlux, pos);
          if (d === -1) { break; }
          const f = octets.indexOf(finFlux, d);
          if (f === -1) { break; }
          let debut = d + 6;
          while (octets[debut] === 13 || octets[debut] === 10) { debut++; }
          try { texte += zlib.inflateSync(octets.slice(debut, f)).toString('latin1'); } catch (e) { }
          pos = f + 9;
        }
        ok('point 19 : le PDF porte le titre et les criteres de la ligne',
           texte.indexOf('PRODUITS PRIS EN COMPTE') !== -1 && texte.indexOf('produit') !== -1,
           'octets=' + octets.length + ' texte=' + texte.length);
        ok('point 19 : le PDF contient bien les produits du detail',
           produits.every(x => texte.indexOf(String(x.cip)) !== -1),
           'cip cherches=' + produits.map(x => x.cip).join(','));
        ok('point 19 : le PDF porte les totaux',
           texte.indexOf('TOTAL') !== -1, 'texte=' + texte.length);
      }
    }

    const avantInventaire = Number(q("SELECT COUNT(*) FROM t_inventaire"));
    const inventaire = await p.evaluate(async (u) => {
      const r = await fetch(u, { method: 'POST' });
      return JSON.parse(await r.text());
    }, '../api/v1/ca-zone-geo/detail/inventaire?' + critereLigne + '&libelle=' + encodeURIComponent(ligne.libelle));
    const apresInventaire = Number(q("SELECT COUNT(*) FROM t_inventaire"));
    /* Le service d'inventaire rend { count, ignores, message } et non un fanion « success » :
       c'est le NOMBRE de produits retenus qui dit que l'operation a abouti. */
    ok('point 19 : la creation d inventaire depuis le detail reussit',
       inventaire.count === produits.length, JSON.stringify(inventaire).slice(0, 200));
    ok('point 19 : l inventaire porte exactement les produits du detail',
       (inventaire.ignores || []).length === 0, JSON.stringify(inventaire.ignores));
    ok('point 19 : un inventaire de plus existe en base', apresInventaire === avantInventaire + 1,
       'avant=' + avantInventaire + ' apres=' + apresInventaire);

    // ---- l'ecran
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('cazonegeomanager', {}));
    await p.waitForTimeout(2500);
    const ecran = await p.evaluate(async () => {
      const ctr = testextjs.app.getController('CaZoneGeoCtr');
      ctr.rechercher();
      await new Promise(r => setTimeout(r, 6000));
      const grille = Ext.ComponentQuery.query('cazonegeomanager #grille')[0];
      const colonnes = grille.headerCt.items.items.map(c => (c.text || '').replace(/<[^>]*>/g, ''));
      return { colonnes: colonnes, lignes: grille.getStore().getCount(),
               actions: grille.headerCt.items.items.filter(c => c.xtype === 'actioncolumn').length };
    });
    ok('point 19 : la colonne Marge est a l ecran', ecran.colonnes.indexOf('Marge') !== -1,
       JSON.stringify(ecran.colonnes));
    ok('point 19 : la colonne % marge est a l ecran', ecran.colonnes.indexOf('% marge') !== -1,
       JSON.stringify(ecran.colonnes));
    ok('point 19 : chaque ligne porte un bouton de detail', ecran.actions >= 1, JSON.stringify(ecran));

    ok('aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } finally {
    await b.close();
    nettoyer();
  }
  const total = res.length, passes = res.filter(r => r.c).length;
  console.log('\n===== ' + passes + '/' + total + ' PASS =====');
  process.exit(passes === total ? 0 : 1);
})();
