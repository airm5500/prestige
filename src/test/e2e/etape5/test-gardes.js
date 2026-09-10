/* Etape 5 : les gardes.

   Ce que la suite verrouille avant tout, c'est la FENETRE HORAIRE. Une garde va de 20 h a 8 h le
   lendemain. Si l'analyse retombait sur des journees entieres -- ce que fait la procedure ABC de
   l'application, qui travaille au jour -- le classement serait celui de l'activite diurne, pas de
   la garde, tout en restant parfaitement plausible a la lecture.

   Le jeu d'essai place donc volontairement des ventes DANS la garde et HORS de la garde le meme
   jour, et verifie que seules les premieres sont comptees. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });

let PRODUITS = [], USER = '';

/* Une nuit de garde du 5 au 6 septembre 2026, de 20 h a 8 h.
   Dedans  : 20h30 (P1 x2, 1000), 23h15 (P2 x1, 4000), 03h00 (P1 x3, 1500), 07h45 (P3 x1, 500)
   Dehors  : 14h00 le 5 (activite de jour), 12h00 le 6 (activite de jour)
   Les deux ventes « dehors » tombent dans les journees du 5 et du 6 : une analyse au jour les
   compterait, et ferait basculer le classement. */
const VENTES = [
  { id: 'E2EG-IN-1', ref: 'E2EG-1', quand: '2026-09-05 20:30:00', prod: 0, qte: 2, montant: 1000, dedans: true },
  { id: 'E2EG-IN-2', ref: 'E2EG-2', quand: '2026-09-05 23:15:00', prod: 1, qte: 1, montant: 4000, dedans: true },
  { id: 'E2EG-IN-3', ref: 'E2EG-3', quand: '2026-09-06 03:00:00', prod: 0, qte: 3, montant: 1500, dedans: true },
  { id: 'E2EG-IN-4', ref: 'E2EG-4', quand: '2026-09-06 07:45:00', prod: 2, qte: 1, montant: 500, dedans: true },
  { id: 'E2EG-OUT-1', ref: 'E2EG-J1', quand: '2026-09-05 14:00:00', prod: 2, qte: 90, montant: 90000, dedans: false },
  { id: 'E2EG-OUT-2', ref: 'E2EG-J2', quand: '2026-09-06 12:00:00', prod: 2, qte: 80, montant: 80000, dedans: false }
];

function purger() {
  exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EG-%'");
  exec("DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EG-%'");
  exec("DELETE FROM garde WHERE libelle LIKE 'E2E %'");
}

function semer() {
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='KGA3'");
  q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT 3")
    .split('\n').filter(Boolean).forEach(id => PRODUITS.push(id.trim()));
  if (!USER || PRODUITS.length !== 3) { return false; }
  VENTES.forEach(v => {
    exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE,"
      + " int_PRICE_REMISE, str_STATUT, dt_CREATED, dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID,"
      + " lg_USER_CAISSIER_ID, lg_USER_ID, b_IS_CANCEL, b_IS_AVOIR, b_WITHOUT_BON, int_PRICE_OTHER,"
      + " int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION)"
      + " VALUES ('" + v.id + "','" + v.ref + "','0'," + v.montant + ",0,'is_Closed','" + v.quand + "','"
      + v.quand + "',1,'" + USER + "','" + USER + "','" + USER + "',0,0,0,0,0,0,0,1,0,0,0,0,0,0)");
    exec("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID,"
      + " lg_FAMILLE_ID, int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE,"
      + " int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, b_IS_AVOIR,"
      + " int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT,"
      + " montantTva, valeurTva, prixAchat, montanttvaug, int_AVOIR_INITIAL)"
      + " VALUES ('" + v.id + "-D','" + v.id + "','" + PRODUITS[v.prod] + "'," + v.qte + ",0,0,0,"
      + v.montant + "," + Math.round(v.montant / v.qte) + ",0,'" + v.quand + "','" + v.quand
      + "',0,0,0,0,0,0,1,0,0,0,0,0)");
  });
  return true;
}

(async () => {
  if (!semer()) { console.log('FATAL : jeu d\'essai incomplet'); purger(); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
  await p.waitForTimeout(3000);

  const poster = (params) => p.evaluate(async (params) => {
    const corps = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    const r = await fetch('../api/v1/gardes', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps
    });
    return await r.json();
  }, params);
  const lire = (chemin) => p.evaluate(async (chemin) => {
    const r = await fetch('../api/v1/gardes' + chemin, { credentials: 'same-origin' });
    return await r.json();
  }, chemin);

  let gardeId = null;
  try {
    // ------------------------------------------------------------------ enregistrement
    let r = await poster({ libelle: 'E2E Nuit du 5 au 6', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-06 08:00' });
    ok('Une garde valide s\'enregistre', r.success === true, JSON.stringify(r));
    gardeId = (r.data || {}).id;
    ok('Elle porte des bornes a l\'heure pres',
      (r.data || {}).dateDebut === '2026-09-05 20:00:00' && (r.data || {}).dateFin === '2026-09-06 08:00:00',
      JSON.stringify(r.data));
    ok('Sa duree est calculee', (r.data || {}).dureeMinutes === 720 && (r.data || {}).duree === '12 h',
      JSON.stringify(r.data));

    r = await poster({ libelle: 'E2E Fin avant debut', dateDebut: '2026-09-06 08:00', dateFin: '2026-09-05 20:00' });
    ok('Une fin anterieure au debut est refusee', r.success === false && /post/i.test(r.msg || ''), JSON.stringify(r));

    r = await poster({ libelle: 'E2E Bornes egales', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-05 20:00' });
    ok('Des bornes egales sont refusees', r.success === false, JSON.stringify(r));

    r = await poster({ libelle: '', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-06 08:00' });
    ok('Un libelle vide est refuse', r.success === false && /libell/i.test(r.msg || ''), JSON.stringify(r));

    r = await poster({ libelle: 'E2E Doublon', dateDebut: '2026-09-05 20:00', dateFin: '2026-09-06 08:00' });
    ok('Une periode deja prise est refusee', r.success === false && /d.j./i.test(r.msg || ''), JSON.stringify(r));

    r = await lire('');
    ok('La garde figure dans la liste',
      (r.data || []).filter(g => g.id === gardeId).length === 1, (r.data || []).length + ' garde(s)');

    // ------------------------------------------------------------------ la fenetre horaire
    const rapport = await lire('/' + gardeId + '/rapport?heures=2');
    const ind = rapport.indicateurs || {};
    ok('Le rapport repond', rapport.success === true, JSON.stringify(rapport).slice(0, 200));
    ok('Seules les 4 ventes DANS la garde sont comptees', ind.ventes === 4, JSON.stringify(ind));
    ok('Les ventes de jour du 5 et du 6 sont exclues', ind.montant === 7000,
      'attendu 7000 (1000+4000+1500+500), obtenu ' + ind.montant);
    ok('La quantite ne retient que la garde', ind.quantite === 7, JSON.stringify(ind));
    ok('Trois produits distincts sur la garde', ind.produitsDistincts === 3, JSON.stringify(ind));
    ok('La duree est celle de la garde', ind.dureeMinutes === 720, JSON.stringify(ind));
    ok('Le chiffre par heure ramene a une base comparable', ind.montantParHeure === 583,
      '7000 / 12 h = 583, obtenu ' + ind.montantParHeure);

    // ------------------------------------------------------------------ tranches horaires
    const tranches = rapport.tranches || [];
    ok('Douze heures en tranches de deux font six tranches', tranches.length === 6, tranches.length);
    ok('La premiere tranche part du debut de la garde, pas de minuit',
      tranches[0].libelle === '20h00 - 22h00', tranches.map(t => t.libelle).join(' | '));
    ok('La vente de 20h30 tombe dans la premiere tranche', tranches[0].montant === 1000,
      JSON.stringify(tranches[0]));
    ok('Celle de 23h15 dans la deuxieme', tranches[1].montant === 4000, JSON.stringify(tranches[1]));
    ok('Une tranche creuse est rendue quand meme',
      tranches.filter(t => t.montant === 0).length === 2,
      tranches.map(t => t.libelle + '=' + t.montant).join(' | '));
    ok('Le total des tranches egale le total de la garde',
      tranches.reduce((s, t) => s + t.montant, 0) === ind.montant,
      tranches.reduce((s, t) => s + t.montant, 0) + ' vs ' + ind.montant);

    const tranches1h = await lire('/' + gardeId + '/rapport?heures=1');
    ok('La largeur de tranche est parametrable', (tranches1h.tranches || []).length === 12,
      (tranches1h.tranches || []).length);
    ok('Le total ne change pas avec la largeur',
      (tranches1h.tranches || []).reduce((s, t) => s + t.montant, 0) === ind.montant);

    // ------------------------------------------------------------------ classification ABC
    const abc = rapport.abc || [];
    ok('L\'ABC porte sur les produits de la garde', abc.length === 3, JSON.stringify(abc.map(a => a.libelle)));
    ok('Il est trie par montant decroissant',
      abc.every((l, i, t) => i === 0 || t[i - 1].montant >= l.montant),
      abc.map(l => l.classe + ':' + l.montant).join(' | '));
    ok('Le plus gros produit est en classe A', abc[0].classe === 'A' && abc[0].montant === 4000,
      JSON.stringify(abc[0]));
    ok('Les parts cumulent a 100 %', Math.abs(abc[abc.length - 1].cumulPart - 100) < 0.01,
      abc.map(l => l.cumulPart).join(' | '));
    /* Le produit qui domine les JOURNEES du 5 et du 6 (90 000 + 80 000) ne doit pas dominer la
       garde : il n'y a vendu que 500. C'est le test qui distingue une analyse a l'heure d'une
       analyse au jour -- au jour, il serait premier avec 170 500 et ecraserait tout.
       Sa classe exacte depend des montants (ici B : le cumul avant lui vaut 92,9 %) ; ce qui
       compte est qu'il soit dernier et hors de la classe A. */
    ok('Le produit dominant les journees ne domine pas la garde',
      abc[abc.length - 1].montant === 500 && abc[abc.length - 1].classe !== 'A',
      abc.map(l => l.libelle + '=' + l.classe + '/' + l.montant).join(' | '));
    ok('Son montant est celui de la garde, pas celui des journees',
      abc.every(l => l.montant < 90000),
      abc.map(l => l.montant).join(' | '));

    const resume = rapport.resumeAbc || [];
    ok('Le resume donne les trois classes', resume.length === 3, JSON.stringify(resume));
    ok('Le resume totalise les memes produits',
      resume.reduce((s, c) => s + c.produits, 0) === abc.length, JSON.stringify(resume));

    // ------------------------------------------------------------------ comparaison
    r = await poster({ libelle: 'E2E Nuit precedente', dateDebut: '2026-09-04 20:00', dateFin: '2026-09-05 08:00' });
    const gardeVideId = (r.data || {}).id;
    const comparaison = await lire('/comparaison');
    ok('La comparaison rend les gardes', (comparaison.data || []).length >= 2,
      (comparaison.data || []).length);
    ok('Elle les classe de la plus ancienne a la plus recente',
      (comparaison.data || []).every((g, i, t) => i === 0 || t[i - 1].dateDebut <= g.dateDebut),
      (comparaison.data || []).map(g => g.dateDebut).join(' | '));
    ok('La premiere ligne n\'a pas d\'ecart', (comparaison.data || [])[0].ecartParHeure === undefined,
      JSON.stringify((comparaison.data || [])[0]).slice(0, 150));
    const derniere = (comparaison.data || [])[(comparaison.data || []).length - 1];
    ok('L\'ecart porte sur le chiffre par heure', derniere.ecartParHeure === 583,
      JSON.stringify(derniere).slice(0, 200));

    const ciblee = await lire('/comparaison?ids=' + gardeId);
    ok('Une comparaison ciblee ne rend que les gardes demandees',
      (ciblee.data || []).length === 1 && ciblee.data[0].id === gardeId, JSON.stringify(ciblee).slice(0, 150));

    // ------------------------------------------------------------------ editions
    const pdf = await lire('/' + gardeId + '/pdf?heures=2');
    ok('L\'edition du rapport aboutit', pdf.success === true && !!pdf.url, JSON.stringify(pdf));
    if (pdf.url) {
      const fs = require('fs');
      ok('Le PDF est ecrit sur le disque',
        fs.existsSync('/opt/CONF/reports/pdf/' + pdf.url.split('/').pop()), pdf.url);
    }
    const excel = await p.evaluate(async (id) => {
      const r2 = await fetch('../api/v1/gardes/' + id + '/excel?heures=2', { credentials: 'same-origin' });
      const buf = await r2.arrayBuffer();
      return { statut: r2.status, taille: buf.byteLength };
    }, gardeId);
    ok('L\'export ABC repond', excel.statut === 200 && excel.taille > 2000, JSON.stringify(excel));
    const excelT = await p.evaluate(async (id) => {
      const r2 = await fetch('../api/v1/gardes/' + id + '/tranches/excel?heures=2', { credentials: 'same-origin' });
      const buf = await r2.arrayBuffer();
      return { statut: r2.status, taille: buf.byteLength };
    }, gardeId);
    ok('L\'export des tranches repond', excelT.statut === 200 && excelT.taille > 2000, JSON.stringify(excelT));

    // ------------------------------------------------------------------ periode reutilisee
    const reutilisation = await p.evaluate(async (id) => {
      // Ecran a HEURES : la garde doit y etre rendue exactement.
      const avecHeures = Ext.create('testextjs.view.vente.VentesFinis', {renderTo: Ext.getBody()});
      const selecteur = avecHeures.down('selecteurgarde');
      const resultat = {selecteurPresent: !!selecteur};
      if (selecteur) {
        selecteur.setRechercherApres(false);
        await new Promise(r2 => selecteur.getStore().load({callback: r2}));
        const garde = selecteur.getStore().findRecord('id', id);
        resultat.gardeTrouvee = !!garde;
        if (garde) {
          selecteur.appliquer(garde);
          resultat.jourDebut = Ext.Date.format(avecHeures.down('#dtStart').getValue(), 'Y-m-d');
          resultat.jourFin = Ext.Date.format(avecHeures.down('#dtEnd').getValue(), 'Y-m-d');
          const h = avecHeures.down('#hStart').getValue();
          const hf = avecHeures.down('#hEnd').getValue();
          resultat.heureDebut = Ext.isDate(h) ? Ext.Date.format(h, 'H:i') : h;
          resultat.heureFin = Ext.isDate(hf) ? Ext.Date.format(hf, 'H:i') : hf;
          resultat.libelleListe = garde.get('libelleComplet');
        }
      }
      avecHeures.destroy();
      return resultat;
    }, gardeId);
    ok('Le selecteur de garde est pose sur les ventes terminees', reutilisation.selecteurPresent);
    ok('Il liste les gardes enregistrees', reutilisation.gardeTrouvee);
    ok('Il rappelle les bornes dans le libelle',
      /2026-09-05 20:00:00/.test(reutilisation.libelleListe || ''), reutilisation.libelleListe);
    ok('Il pose les deux dates', reutilisation.jourDebut === '2026-09-05' && reutilisation.jourFin === '2026-09-06',
      reutilisation.jourDebut + ' -> ' + reutilisation.jourFin);
    ok('Il pose AUSSI les heures sur un ecran qui les gere',
      reutilisation.heureDebut === '20:00' && reutilisation.heureFin === '08:00',
      reutilisation.heureDebut + ' -> ' + reutilisation.heureFin);

    // ------------------------------------------------------------------ l'ecran des gardes
    const ecran = await p.evaluate(() => {
      const vue = Ext.create('testextjs.view.garde.GardeManager', {renderTo: Ext.getBody()});
      const onglets = vue.down('#ongletsGarde');
      const resultat = {
        titres: onglets.items.getRange().map(o => o.title),
        listePresente: !!vue.down('#grilleGardes'),
        selectionMultiple: vue.down('#grilleGardes').getSelectionModel().mode === 'MULTI',
        tranchesPresentes: !!vue.down('#grilleTranches'),
        abcPresent: !!vue.down('#grilleAbc'),
        resumePresent: !!vue.down('#grilleResumeAbc'),
        actions: ['gardeNouvelle', 'gardeModifier', 'gardeSupprimer', 'gardeHeures', 'gardeImprimer',
          'gardeExporterAbc', 'gardeExporterTranches', 'comparerDernieres', 'comparerSelection']
          .every(id => !!vue.down('#' + id))
      };
      vue.destroy();
      return resultat;
    });
    ok('L\'ecran a ses deux onglets',
      ecran.titres.join('|') === 'Analyse de la garde|Comparaison', ecran.titres.join('|'));
    ok('La liste des gardes est presente', ecran.listePresente);
    ok('Elle accepte une selection multiple, pour comparer', ecran.selectionMultiple);
    ok('Tranches, ABC et resume sont presents',
      ecran.tranchesPresentes && ecran.abcPresent && ecran.resumePresent);
    ok('Toutes les actions sont cablees', ecran.actions);

    const formulaire = await p.evaluate(() => {
      const f = Ext.create('testextjs.view.garde.GardeForm', {garde: null});
      const champs = ['gardeLibelle', 'gardeJourDebut', 'gardeHeureDebut', 'gardeJourFin', 'gardeHeureFin']
        .every(id => !!f.down('#' + id));
      const valeurs = f.valeurs();
      f.destroy();
      return {champs: champs, valeurs: valeurs};
    });
    ok('Le formulaire porte date ET heure pour chaque borne', formulaire.champs);
    ok('Il produit des bornes au format attendu',
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(formulaire.valeurs.dateDebut),
      JSON.stringify(formulaire.valeurs));

    // ------------------------------------------------------------------ suppression
    const suppression = await p.evaluate(async (id) => {
      const r2 = await fetch('../api/v1/gardes/' + id, { method: 'DELETE', credentials: 'same-origin' });
      return await r2.json();
    }, gardeVideId);
    ok('Une garde se supprime', suppression.success === true, JSON.stringify(suppression));
    ok('Aucune vente n\'a ete supprimee avec elle',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EG-%'") === '6');

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Deroulement sans exception', false, e.message + '\n' + e.stack);
  } finally {
    purger();
    ok('Jeu d\'essai entierement retire',
      q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2EG-%'") === '0'
      && q("SELECT COUNT(*) FROM garde WHERE libelle LIKE 'E2E %'") === '0');
    await b.close();
  }
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' assertions');
  process.exit(ko ? 1 : 0);
})();
