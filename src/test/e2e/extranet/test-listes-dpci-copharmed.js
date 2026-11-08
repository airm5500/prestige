/* EXTRANETS GROSSISTES (demande du 08/11) : listes DPCI et Copharmed lues sur les VRAIS extranets, par l'ecran.
 *
 * Parcours : connexion, menu GESTION DES COMMANDES > Extranets grossistes, onglet du grossiste, rubrique, sous-onglet,
 * bouton « Lire sur l'extranet » (identifiants deja enregistres dans l'onglet Sessions : le test ne saisit rien).
 * Lecture seule chez le grossiste : seules des pages et des listes sont lues (GET).
 *
 * Rapprochement, pour chaque liste : reponse de l'ecran = base (extranet_liste_ligne de la collecte, ligne par ligne :
 * position, pscode, cip, cellules) = grille affichee (nombre de lignes, texte de chaque cellule des lignes affichees,
 * montants remis en forme « 55 260 ») ; collecte COMPLETE au nom de l'utilisateur, nombre de lignes = base.
 * Coherence : dates au format AAAA-MM-JJ, montants numeriques, avoirs negatifs, factures positives, paliers d'unites
 * gratuites bien formes (« 25 à 49 : 2 UG ; dès 200 : 50 UG »), une seule ligne par position.
 * Bilan avant / apres : une collecte par liste lue, aucune table metier touchee ; les collectes du test et leurs lignes
 * sont retirees a la fin (les listes n'avaient aucun cache avant le test, verifie au depart).
 *
 * Lancement (domain3, base laborex_audit), une liste ou plusieurs :
 *   BASE=http://localhost:10090/prestige DB_TEST=laborex_audit E2E_BASE_LIBRE=1 node test-listes-dpci-copharmed.js [CODE,...]
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', '--raw', ENV_E2E.BASE, '-sN',
  '-e', s], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };

const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : ''));
}

const ECRAN = 'extranetsgrossistes';
const METIER = ['t_famille', 't_famille_grossiste', 't_order', 't_order_detail', 't_bon_livraison', 't_grossiste'];
const empreinteMetier = () => Object.fromEntries(METIER.map((t) => [t, q('CHECKSUM TABLE ' + t).split('\t')[1]]));

/* liste -> chemin d'onglets (grossiste, rubrique, sous-onglet) */
const LISTES = {
  DPCI_RECLAMATIONS: ['DPCI', 'exOngletDpci', 'Mes réclamations', 'exRubriqueDpciReclamations', 'Mes réclamations'],
  DPCI_RELEVES: ['DPCI', 'exOngletDpci', 'Mes documents', 'exRubriqueDpciDocuments', 'Relevés'],
  DPCI_AVOIRS: ['DPCI', 'exOngletDpci', 'Mes documents', 'exRubriqueDpciDocuments', 'Avoirs'],
  DPCI_FACTURES: ['DPCI', 'exOngletDpci', 'Mes documents', 'exRubriqueDpciDocuments', 'Factures'],
  DPCI_BL: ['DPCI', 'exOngletDpci', 'Mes documents', 'exRubriqueDpciDocuments', 'Bons de livraison'],
  DPCI_COMMANDES: ['DPCI', 'exOngletDpci', 'Mes commandes', 'exRubriqueDpciCommandes', 'Mes commandes'],
  DPCI_OFFRES: ['DPCI', 'exOngletDpci', 'Mes offres en cours', 'exRubriqueDpciOffres', 'Offres en cours'],
  COPHARMED_CATALOGUE: ['Copharmed', 'exOngletCopharmed', 'Produits', 'exRubriqueCopharmedProduits', 'Catalogue produits'],
  COPHARMED_PROMOTIONS: ['Copharmed', 'exOngletCopharmed', 'Promotions', 'exRubriqueCopharmedPromotions', 'Promotion'],
};
const choisies = (process.argv[2] ? process.argv[2].split(',') : Object.keys(LISTES)).filter((c) => LISTES[c]);
const source = (c) => c.split('_')[0];

const montantEcran = (v) => String(v).replace(/[\s  ]/g, '').replace(',', '.');
const dateOk = (v) => v === '' || /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(v);
const PALIERS = /^((\d+ à \d+|dès \d+) : \d+(\.\d+)? (UG|%|F)( \+ \d+(\.\d+)? (UG|%|F))*)( ; (\d+ à \d+|dès \d+) : \d+(\.\d+)? (UG|%|F)( \+ \d+(\.\d+)? (UG|%|F))*)*$/;

async function ouvrir(p, code) {
  const [g, gId, rub, rubId, sous] = LISTES[code];
  await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=' + g + ']');
  await p.waitForTimeout(500);
  await vues.cliquer(p, ECRAN + ' #' + gId + ' > tabbar tab[text=' + rub + ']');
  await p.waitForTimeout(500);
  await vues.cliquer(p, ECRAN + ' #' + rubId + ' > tabbar tab[text=' + sous + ']');
  await p.waitForTimeout(1500);
}

(async () => {
  const nav = await ENV_E2E.lancer(chromium);
  const p = await (await nav.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const metierAvant = empreinteMetier();
  const maxAvant = Number(q('SELECT COALESCE(MAX(id),0) FROM extranet_collecte'));
  const modules = choisies.map((c) => "'LISTE_" + c + "'").join(',');
  const listesSql = choisies.map((c) => "'" + c + "'").join(',');
  ok('départ : aucune ligne en cache pour ces listes (rien à perdre au nettoyage)',
    q('SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste IN (' + listesSql + ')') === '0',
    q('SELECT GROUP_CONCAT(DISTINCT liste) FROM extranet_liste_ligne WHERE liste IN (' + listesSql + ')'));
  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.waitForTimeout(3000);
    const login = ENV_E2E.LOGIN;
    for (const code of choisies) {
      await ouvrir(p, code);
      const debut = Date.now();
      const reponse = p.waitForResponse((x) => x.url().indexOf('/listes/' + code + '/collecte') >= 0, { timeout: 1200000 });
      await vues.cliquer(p, ECRAN + ' #exListe' + code + 'Collecter');
      const r = await (await reponse).json().catch(() => ({ success: false, msg: 'réponse illisible' }));
      const duree = Math.round((Date.now() - debut) / 1000);
      ok(code + ' : lecture réussie (' + duree + ' s)', r.success === true, r.msg);
      if (!r.success) {
        continue;
      }
      await p.waitForTimeout(1500);
      const c = r.collecte || {};
      const col = lignes('SELECT id, source, statut, lignes_recues, utilisateur FROM extranet_collecte WHERE module = \'LISTE_'
        + code + '\' AND id > ' + maxAvant + ' ORDER BY id DESC LIMIT 1')[0] || [];
      const base = lignes('SELECT position, COALESCE(pscode,\'\'), COALESCE(cip,\'\'), cellules FROM extranet_liste_ligne'
        + ' WHERE liste = \'' + code + '\' AND collecte_id = ' + Number(col[0] || 0) + ' ORDER BY position');
      ok(code + ' : collecte COMPLETE, source ' + source(code) + ', nombre = base', col[1] === source(code)
        && col[2] === 'COMPLETE' && Number(col[3]) === base.length, col.join(' | ') + ' / base ' + base.length);
      ok(code + ' : collecte affichée = collecte en base', String(c.id) === String(col[0]), c.id + ' / ' + col[0]);
      if (login) {
        ok(code + ' : collecte au nom de l\'utilisateur', col[4] === login, col[4]);
      }
      /* reponse = base, ligne par ligne */
      const rep = r.lignes || [];
      let ecarts = [];
      if (rep.length !== base.length) {
        ecarts.push('nombre ' + rep.length + ' / ' + base.length);
      }
      for (let i = 0; i < Math.min(rep.length, base.length) && ecarts.length < 3; i++) {
        const b = base[i];
        const x = rep[i];
        if (String(x.position) !== b[0] || (x.pscode || '') !== b[1] || (x.cip || '') !== b[2]
          || JSON.stringify(x.cellules) !== JSON.stringify(JSON.parse(b[3]))) {
          ecarts.push('ligne ' + i);
        }
      }
      ok(code + ' : réponse = base, ' + base.length + ' lignes', ecarts.length === 0, ecarts.join(', '));
      ok(code + ' : une ligne par position', new Set(base.map((b) => b[0])).size === base.length);
      /* grille = base : nombre affiche, texte de chaque cellule affichee */
      const g = await p.evaluate((code) => {
        const e = Ext.ComponentQuery.query('extranetsgrossistes')[0];
        const grille = e.down('#exListe' + code + 'Grille');
        const lignes = Array.from(grille.getView().getEl().dom.querySelectorAll('tr.x-grid-row')).map((tr) =>
          Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.replace(/\s+/g, ' ').trim()));
        return { nombre: e.down('#exListe' + code + 'Nombre').text, store: e.listes[code].getCount(), max: e.AFFICHAGE_MAX,
          titres: grille.columns.map((x) => x.text), lignes };
      }, code);
      ok(code + ' : nombre affiché = base', g.nombre.indexOf(base.length + ' ligne(s)') === 0, g.nombre);
      ok(code + ' : grille chargée = base (dans la limite d\'affichage)', g.store === Math.min(base.length, g.max),
        g.store + ' / ' + base.length);
      ecarts = [];
      const titresRep = r.colonnes || [];
      const montants = titresRep.map((t) => /Prix|HT|TTC|Montant/.test(t) && !/Remise/.test(t));
      for (let i = 0; i < g.lignes.length && ecarts.length < 3; i++) {
        const attendu = JSON.parse(base[i][3]);
        for (let k = 0; k < attendu.length; k++) {
          const v = String(attendu[k]).replace(/\s+/g, ' ').trim();
          const e = g.lignes[i][k];
          const egal = montants[k] && /^-?\d+(\.\d+)?$/.test(v) ? Number(montantEcran(e)) === Number(v) : e === v;
          if (!egal) {
            ecarts.push('ligne ' + i + ' « ' + titresRep[k] + ' » : ' + e + ' / ' + v);
            break;
          }
        }
      }
      ok(code + ' : texte de la grille = base (' + g.lignes.length + ' lignes affichées)', ecarts.length === 0, ecarts.join(' ; '));
      /* coherence */
      const titres = r.colonnes || [];
      const cel = base.map((b) => JSON.parse(b[3]));
      const bad = [];
      titres.forEach((t, k) => {
        cel.forEach((l, i) => {
          const v = l[k];
          if (/^(Date|Début|Fin|Créée|Modifiée)/.test(t) && !dateOk(v) && !/^\d{2}\/\d{2}\/\d{2,4}$/.test(v)) {
            bad.push(t + ' ligne ' + i + ' : ' + v);
          }
          if (/^Montant/.test(t) && v !== '' && !/^-?\d+(\.\d+)?$/.test(v)) {
            bad.push(t + ' ligne ' + i + ' : ' + v);
          }
          if (/^Montant/.test(t) && code === 'DPCI_AVOIRS' && v !== '' && Number(v) > 0) {
            bad.push('avoir positif ligne ' + i + ' : ' + v);
          }
          if (/^Montant/.test(t) && code === 'DPCI_FACTURES' && v !== '' && Number(v) < 0) {
            bad.push('facture négative ligne ' + i + ' : ' + v);
          }
          if (/^Paliers/.test(t) && v !== '' && !PALIERS.test(v)) {
            bad.push('paliers ligne ' + i + ' : ' + v);
          }
        });
      });
      ok(code + ' : cohérence des valeurs (dates, montants, signes, paliers)', bad.length === 0, bad.slice(0, 3).join(' ; '));
      if (/^Montant HT/.test(titres[5] || '')) {
        const somme = cel.reduce((s, l) => s + (l[5] === '' ? 0 : Number(l[5])), 0);
        const sommeBase = Number(q('SELECT COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(cellules, \'$[5]\')) AS DECIMAL(18,2))),0)'
          + ' FROM extranet_liste_ligne WHERE liste = \'' + code + '\' AND collecte_id = ' + Number(col[0] || 0)
          + ' AND JSON_UNQUOTE(JSON_EXTRACT(cellules, \'$[5]\')) <> \'\''));
        ok(code + ' : total HT écran = total HT base (' + somme + ')', Math.abs(somme - sommeBase) < 0.005, somme + ' / ' + sommeBase);
      }
      console.log('      ' + code + ' : ' + base.length + ' lignes, ' + duree + ' s');
    }
    await p.screenshot({ path: process.env.CAPTURE || 'capture-listes-dpci-copharmed.png' });
  } catch (e) {
    ok('déroulé sans erreur', false, e.message);
  } finally {
    await nav.close();
    const metierApres = empreinteMetier();
    ok('bilan : aucune table métier touchée', JSON.stringify(metierAvant) === JSON.stringify(metierApres));
    const nouvelles = lignes('SELECT module, COUNT(*) FROM extranet_collecte WHERE id > ' + maxAvant + ' AND module IN ('
      + modules + ') GROUP BY module');
    ok('bilan : une collecte par liste lue', nouvelles.every((x) => x[1] === '1') && nouvelles.length <= choisies.length,
      nouvelles.map((x) => x.join('=')).join(' '));
    /* nettoyage : collectes du test et leurs lignes */
    q('DELETE FROM extranet_liste_ligne WHERE liste IN (' + listesSql + ') AND collecte_id > ' + maxAvant);
    q('DELETE FROM extranet_collecte WHERE id > ' + maxAvant + ' AND module IN (' + modules + ')');
    ok('nettoyage : lignes et collectes du test retirées',
      q('SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste IN (' + listesSql + ') AND collecte_id > ' + maxAvant) === '0'
      && q('SELECT COUNT(*) FROM extranet_collecte WHERE id > ' + maxAvant + ' AND module IN (' + modules + ')') === '0');
    const nOk = res.filter((x) => x.c).length;
    console.log('\n' + nOk + '/' + res.length + ' PASS');
    process.exit(nOk === res.length ? 0 : 1);
  }
})();
