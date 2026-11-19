/* TABLEAU DE BORD SUR ONZE MOIS (retour support du 18/11, R8).
 *
 * Serveur d'appaul, 18/11 12:17 : tableau-board/tableau du 01/01/2025 au 30/11/2025, par mois, 28,9 s (deux fois).
 * Sur la copie : 14 a 15 s cache chaud, dont 5,5 s pour la requete des ventes et ~9 s pour les avoirs fournisseurs,
 * lus par une requete PAR LIGNE D'ACHAT (1 473). Ils sont maintenant lus en une requete pour la periode.
 *
 * Par les clics (compte e2e), menu du tableau de bord, dates tapees, « par mois » coche, « rechercher » :
 *  1. avec des avoirs d'essai (trois groupes de grossistes, plusieurs le meme jour, un jour ou deux grossistes
 *     LABOREX-CI ont livre, un jour sans achat, un jour sans achat de son groupe, un desactive, un sans reponse, deux
 *     hors periode) : colonnes AVOIRS et ACHATS Nets, mois par mois, identiques a l'ecran, dans la reponse du serveur
 *     et au calcul fait directement en base (regle : chaque avoir compte une fois ; achat net = achats - avoirs) ;
 *     total des avoirs = somme des avoirs d'essai retenus, comptee a part (retour du 19/11, « double avoir » : l'avoir
 *     d'un groupe etait repris sur chaque livraison du groupe ce jour-la, et perdu un jour sans livraison du groupe) ;
 *     le PDF (bouton « imprimer ») et l'Excel (bouton Excel) du tableau de bord : memes AVOIRS et ACHATS Nets, mois
 *     par mois pour l'Excel, au total pour le PDF ;
 *  2. delai : la recherche des onze mois, cache chaud, repond en moins de 11 s (14 a 15 s avant ; 8,9 s apres, dont
 *     5,4 s pour les ventes et 3,4 s pour les modes de reglement par jour : 400 000 ventes, le volume) ;
 *  bilan : les avoirs d'essai sont retires, t_retour_fournisseur revient a son compte d'avant ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').replace(/\n$/, '');
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const DEBUT = '2025-01-01';
const FIN = '2025-11-30';
const PREFIXE = 'E2E-R8-';
const SEUIL_MS = 11000;

const idUser = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const emplacement = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '${idUser}'`);
const retoursAvant = q('SELECT COUNT(*) FROM t_retour_fournisseur');
/* lignes d'achat du tableau (meme requete que le serveur) : jour, montant, groupe */
const ACHATS = `SELECT DATE_FORMAT(m.mvtdate, '%Y-%m-%d'), SUM(m.montant), IFNULL(gf.libelle, 'AUTRES') FROM mvttransaction m JOIN t_grossiste g ON m.grossisteId = g.lg_GROSSISTE_ID
  LEFT JOIN groupefournisseur gf ON g.groupeId = gf.id WHERE m.mvtdate >= '${DEBUT}' AND m.mvtdate < DATE_ADD('${FIN}', INTERVAL 1 DAY) AND m.typeTransaction = 2
  AND m.lg_EMPLACEMENT_ID = '${emplacement}' GROUP BY m.grossisteId, m.mvtdate`;

/* un grossiste par groupe, et des jours d'achat de ce groupe (mois differents) */
const grossiste = (lib) => q(`SELECT g.lg_GROSSISTE_ID FROM t_grossiste g JOIN groupefournisseur gf ON gf.id = g.groupeId WHERE gf.libelle = '${lib}' ORDER BY g.lg_GROSSISTE_ID LIMIT 1`);
const joursAchat = (lib) => q(`SELECT DISTINCT DATE_FORMAT(m.mvtdate, '%Y-%m-%d') FROM mvttransaction m JOIN t_grossiste g ON m.grossisteId = g.lg_GROSSISTE_ID
  JOIN groupefournisseur gf ON g.groupeId = gf.id WHERE gf.libelle = '${lib}' AND m.mvtdate >= '${DEBUT}' AND m.mvtdate <= '${FIN}' AND m.typeTransaction = 2
  AND m.lg_EMPLACEMENT_ID = '${emplacement}' ORDER BY 1`).split('\n').filter(Boolean);
/* jours ou au moins deux grossistes du groupe ont livre (deux lignes d'achat du groupe) */
const joursPlusieurs = (lib) => q(`SELECT DATE_FORMAT(m.mvtdate, '%Y-%m-%d') FROM mvttransaction m JOIN t_grossiste g ON m.grossisteId = g.lg_GROSSISTE_ID
  JOIN groupefournisseur gf ON g.groupeId = gf.id WHERE gf.libelle = '${lib}' AND m.mvtdate >= '${DEBUT}' AND m.mvtdate <= '${FIN}' AND m.typeTransaction = 2
  AND m.lg_EMPLACEMENT_ID = '${emplacement}' GROUP BY m.mvtdate HAVING COUNT(DISTINCT m.grossisteId) >= 2 ORDER BY 1`).split('\n').filter(Boolean);

function jeuDEssai() {
  const lab = 'LABOREX-CI', dpci = 'DPCI', aut = 'AUTRES';
  const jl = joursAchat(lab), jd = joursAchat(dpci), ja = joursAchat(aut), jl2 = joursPlusieurs(lab);
  const dpciSansLab = jd.filter((j) => !jl.includes(j));
  const pris = (l, i) => l[Math.min(l.length - 1, Math.floor(l.length * i))];
  /* [jour, groupe, montant, repondu, actif] */
  const r = [
    [pris(jl, 0.1), lab, 125000, true, true], [pris(jl, 0.1), lab, 4300, true, true], // deux le meme jour
    [pris(jl, 0.5), lab, 98765, true, true],
    [pris(jd, 0.3), dpci, 15000, true, true], [pris(jd, 0.8), dpci, 2, true, true],
    [ja.length ? pris(ja, 0.6) : pris(jl, 0.6), aut, 33333, true, true],
    [pris(jl, 0.9), lab, 50000, false, true], // sans reponse : ne compte pas
    [pris(jd, 0.6), dpci, 70000, true, false], // desactive : ne compte pas
    ['2024-12-31', lab, 99999, true, true], // hors periode
    ['2025-12-01', lab, 99999, true, true], // hors periode
  ];
  if (jl2.length) { r.push([jl2[Math.floor(jl2.length / 2)], lab, 41000, true, true]); } // deux livraisons LABOREX-CI ce jour-la
  if (dpciSansLab.length) { r.push([dpciSansLab[0], lab, 6100, true, true]); } // jour d'achat DPCI, sans livraison LABOREX-CI
  /* un jour sans achat d'aucun groupe dans la periode */
  const sansAchat = q(`SELECT d FROM (SELECT DATE_ADD('${DEBUT}', INTERVAL n DAY) d FROM (SELECT a.N + b.N * 10 + c.N * 100 n FROM
    (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
    (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
    (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3) c) x) j WHERE d <= '${FIN}' AND NOT EXISTS (SELECT 1 FROM mvttransaction m WHERE m.mvtdate = j.d AND m.typeTransaction = 2) ORDER BY d LIMIT 1`);
  if (sansAchat) { r.push([sansAchat, lab, 7000, true, true]); }
  const g = { [lab]: grossiste(lab), [dpci]: grossiste(dpci), [aut]: grossiste(aut) };
  r.forEach(([jour, lib, mt, rep, actif], i) => {
    q(`INSERT INTO t_retour_fournisseur (lg_RETOUR_FRS_ID, str_REF_RETOUR_FRS, lg_GROSSISTE_ID, lg_USER_ID, dt_DATE, str_REPONSE_FRS, str_STATUT, dt_UPDATED, dt_CREATED, dl_AMOUNT)
      VALUES ('${PREFIXE}${i}', '${PREFIXE}${i}', '${g[lib]}', '${idUser}', '${jour} 10:00:00', '${rep ? 'E2E avoir' : ''}', '${actif ? 'enable' : 'disable'}', '${jour} 1${i % 10}:15:00', NOW(), ${mt})`);
  });
  return { r, sansAchat, plusieurs: jl2.length ? jl2[Math.floor(jl2.length / 2)] : null, dpciSansLab: dpciSansLab[0] || null, groupes: g };
}

/* attendu, en base : avoirs du jour par groupe (somme > 0), chacun une fois, sur tous les jours de la periode */
function attendu() {
  const parMois = {};
  const leMois = (jour) => { const mois = jour.slice(5, 7) + '/' + jour.slice(0, 4); return parMois[mois] || (parMois[mois] = { avoir: 0, achatNet: 0 }); };
  for (const [jour, mt, lib] of lignes(`SELECT DATE_FORMAT(o.dt_UPDATED, '%Y-%m-%d'), SUM(o.dl_AMOUNT), IFNULL(gr.libelle, 'AUTRES') FROM t_retour_fournisseur o
      JOIN t_grossiste g ON o.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID LEFT JOIN groupefournisseur gr ON g.groupeId = gr.id WHERE o.dt_UPDATED >= '${DEBUT}'
      AND o.dt_UPDATED < DATE_ADD('${FIN}', INTERVAL 1 DAY) AND o.str_REPONSE_FRS <> '' AND o.str_STATUT = 'enable' GROUP BY DATE(o.dt_UPDATED), g.groupeId HAVING SUM(o.dl_AMOUNT) > 0`)) {
    const av = Math.trunc(Number(mt));
    leMois(jour).avoir += av;
    leMois(jour).achatNet -= av;
  }
  for (const [jour, mt] of lignes(ACHATS)) {
    leMois(jour).achatNet += Math.trunc(Number(mt));
  }
  return parMois;
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  let jeu = null;
  try {
    jeu = jeuDEssai();
    ok('Jeu d\'essai : un grossiste par groupe et 13 avoirs d\'essai', Object.values(jeu.groupes).every(Boolean) && jeu.r.length === 13 && q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID LIKE '${PREFIXE}%'`) === String(jeu.r.length),
      JSON.stringify(jeu.groupes) + ' ; jour sans achat : ' + jeu.sansAchat + ' ; deux livraisons LABOREX-CI : ' + jeu.plusieurs + ' ; DPCI sans LABOREX-CI : ' + jeu.dpciSansLab);
    /* les avoirs d'essai retenus, comptes a part, chacun une fois */
    const essaiRetenus = jeu.r.filter(([jour, , mt, rep, actif]) => rep && actif && jour >= DEBUT && jour <= FIN && mt > 0).reduce((t, x) => t + x[2], 0);
    const autresEnBase = Number(q(`SELECT COALESCE(SUM(dl_AMOUNT), 0) FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID NOT LIKE '${PREFIXE}%' AND dt_UPDATED >= '${DEBUT}'
      AND dt_UPDATED < DATE_ADD('${FIN}', INTERVAL 1 DAY) AND str_REPONSE_FRS <> '' AND str_STATUT = 'enable' AND dl_AMOUNT > 0`));
    const att = attendu();
    const moisAvecAvoir = Object.keys(att).filter((m) => att[m].avoir > 0);
    ok('Jeu varié : au moins 3 mois avec des avoirs, plusieurs groupes', moisAvecAvoir.length >= 3, moisAvecAvoir.join(', '));

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { let t = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'tableauPhama') { t = [n.parentNode.get('text'), n.get('text')]; } }); return t; });
    ok('Menu du tableau de bord trouvé', !!menu, JSON.stringify(menu));
    await ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('tableauPhama #rechercher').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    const taper = async (sel, texte) => { await cliquer(p, sel); await p.keyboard.press('Control+A'); await p.keyboard.type(texte); await p.keyboard.press('Tab'); };
    await taper('tableauPhama #dtStart', '01/01/2025');
    await taper('tableauPhama #dtEnd', '30/11/2025');
    const coche = await p.evaluate(() => Ext.ComponentQuery.query('tableauPhama #monthly')[0].getValue());
    if (!coche) { await cliquer(p, 'tableauPhama #monthly'); }
    const rechercher = async () => {
      const rep = p.waitForResponse((r) => r.url().includes('/api/v1/tableau-board/tableau') && r.url().includes('dtStart=2025-01-01'), { timeout: 120000 });
      const t0 = Date.now();
      await cliquer(p, 'tableauPhama #rechercher');
      const r = await rep;
      const json = await r.json();
      return { ms: Date.now() - t0, json, url: r.url() };
    };
    await rechercher(); // cache chaud, comme a l'officine apres la premiere recherche
    const r = await rechercher();
    ok('La demande porte sur les onze mois, par mois', /dtEnd=2025-11-30/.test(r.url) && /monthly=true/.test(r.url), r.url.replace(/^.*\?/, ''));
    ok(`Délai : onze mois en moins de ${SEUIL_MS / 1000} s (14 à 15 s avant)`, r.ms < SEUIL_MS, r.ms + ' ms');

    await p.waitForTimeout(800);
    const ecran = await p.evaluate(() => Ext.ComponentQuery.query('tableauPhama #tableauBoardGrid')[0].getStore().getRange()
      .map((x) => ({ mois: x.get('dateOperation'), avoir: x.get('AVOIR'), achatNet: x.get('Achat net') })));
    const serveur = (r.json.data || []).map((x) => ({ mois: x.dateOperation, avoir: x.AVOIR, achatNet: x['Achat net'] }));
    ok('L\'écran montre les 11 mois', ecran.length === 11, ecran.map((x) => x.mois).join(' '));
    const ecarts = [];
    for (const e of ecran) {
      const s = serveur.find((x) => x.mois === e.mois) || {};
      const a = att[e.mois] || { avoir: 0, achatNet: 0 };
      if (e.avoir !== s.avoir || e.avoir !== a.avoir || e.achatNet !== s.achatNet || e.achatNet !== a.achatNet) {
        ecarts.push(`${e.mois} : avoir écran ${e.avoir} / serveur ${s.avoir} / base ${a.avoir} ; achat net ${e.achatNet} / ${s.achatNet} / ${a.achatNet}`);
      }
    }
    ok('Rapprochement mois par mois : AVOIRS et ACHATS Nets, écran = serveur = base', ecarts.length === 0 && ecran.length > 0, ecarts.join(' | '));
    const totalAvoirs = ecran.reduce((s, x) => s + x.avoir, 0);
    ok('Les avoirs d\'essai comptent (avoirs du jour par groupe, pas les désactivés, sans réponse ni hors période)',
      totalAvoirs === Object.values(att).reduce((s, x) => s + x.avoir, 0) && totalAvoirs > 0, totalAvoirs);
    ok('Chaque avoir compte une fois : total affiché = avoirs d\'essai retenus + autres avoirs en base (deux livraisons du groupe, jour sans livraison du groupe)',
      totalAvoirs === essaiRetenus + Math.trunc(autresEnBase), `écran ${totalAvoirs} / essai ${essaiRetenus} + autres ${autresEnBase}`);
    ok('Aucun avoir négatif', ecran.every((x) => x.avoir >= 0));

    /* Excel (bouton Excel) : AVOIRS et ACHATS Nets, mois par mois, = ecran */
    const dossier = fs.mkdtempSync(path.join(process.env.E2E_TMP || os.tmpdir(), 'e2e-r8-'));
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), cliquer(p, 'tableauPhama #btnExcel')]);
    const xlsx = path.join(dossier, 'tableau.xlsx');
    await dl.saveAs(xlsx);
    const lignesXls = JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `
import json, sys, warnings
warnings.simplefilter('ignore')
import openpyxl
f = openpyxl.load_workbook(sys.argv[1], data_only=True).worksheets[0]
print(json.dumps([[str(x) for x in r if x not in (None, '')] for r in f.iter_rows(values_only=True)]))`, xlsx], { encoding: 'utf8' }));
    const nombre = (t) => Number(String(t).replace(/[\s\u00a0\u202f]/g, ''));
    const parMoisXls = {};
    for (const l of lignesXls) {
      if (/^(\d{2}\/\d{4}|TOTAL)$/.test(l[0])) { parMoisXls[l[0]] = { avoir: nombre(l[l.length - 3]), achatNet: nombre(l[l.length - 2]) }; }
    }
    const ecartsXls = ecran.filter((e) => !parMoisXls[e.mois] || parMoisXls[e.mois].avoir !== e.avoir || parMoisXls[e.mois].achatNet !== e.achatNet)
      .map((e) => `${e.mois} : écran ${e.avoir}/${e.achatNet}, Excel ${JSON.stringify(parMoisXls[e.mois])}`);
    const totalAchatNet = ecran.reduce((t, x) => t + x.achatNet, 0);
    ok('Excel : AVOIRS et ACHATS Nets mois par mois et au total = écran', ecartsXls.length === 0 && parMoisXls.TOTAL
      && parMoisXls.TOTAL.avoir === totalAvoirs && parMoisXls.TOTAL.achatNet === totalAchatNet, ecartsXls.join(' | ') + ' total ' + JSON.stringify(parMoisXls.TOTAL));

    /* PDF (bouton imprimer) : la ligne TOTAL porte AVOIRS puis ACHATS Nets, = ecran */
    const [repPdf] = await Promise.all([p.context().waitForEvent('response', { predicate: (r) => /application\/pdf/.test(r.headers()['content-type'] || ''), timeout: 120000 }),
      cliquer(p, 'tableauPhama #imprimer')]);
    const pdf = path.join(dossier, 'tableau.pdf');
    fs.writeFileSync(pdf, await (await p.context().request.get(repPdf.url())).body());
    const textePdf = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'latin1' });
    const millier = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const attenduPdf = millier(totalAvoirs) + ' ' + millier(totalAchatNet) + ' ';
    ok('PDF : total des AVOIRS puis des ACHATS Nets = écran', textePdf.replace(/[\u00a0\u202f]/g, ' ').replace(/ {2,}/g, ' ').includes(attenduPdf), attenduPdf);
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    q(`DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID LIKE '${PREFIXE}%'`);
    ok('Bilan : avoirs d\'essai retirés, t_retour_fournisseur à son compte d\'avant', q('SELECT COUNT(*) FROM t_retour_fournisseur') === retoursAvant, retoursAvant);
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
