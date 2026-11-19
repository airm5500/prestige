/* ECRANS DES TVA ET DE L'ANALYSE PAR MOTIF : DELAIS ET MEMES CHIFFRES (retour support du 18/11, R8).
 *
 * Serveur d'appaul : « v3/tvas » du 01/11 au 16/11, 5,6 s (x8) ; « vente-motifs/recap » d'un jour, plus de 5 s (x2).
 * Sur la copie : 3,2 a 4,4 s et 2,9 a 5 s. Causes : les TVA lisaient toutes les ventes des utilisateurs avant de
 * filtrer la date ; l'analyse par motif comptait les ventes encaissees sur COALESCE(completion_date, dt_UPDATED), sans
 * index. Les TVA lisent maintenant les ventes par l'index (statut, date) ; le compte des ventes passe par deux branches
 * indexees jusqu'a 186 jours.
 *
 * Par les clics (compte e2e) :
 *  1. Statistiques TVA, du 01/11/2026 au 16/11/2026, « rechercher » : reponse en moins de 1,5 s ; chaque taux, ecran =
 *     serveur ; HT + TVA = TTC sur chaque ligne ; en base, la requete d'avant et celle d'aujourd'hui rendent les memes
 *     lignes ;
 *  2. Ventes annulees, onglet « Analyse par motif », annulations du 16/11/2026 : reponse en moins de 1,5 s ; pour chaque
 *     caissiere du classement, ventes encaissees ecran = serveur = requete d'avant (COALESCE) en base, et taux =
 *     annulations / ventes ;
 *  3. memes rapprochements sur un autre jour et sur un mois (cas varies) ; aucune ecriture ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').replace(/\n$/, '');
const SEUIL_MS = 1500;
const idUser = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const emplacement = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE lg_USER_ID = '${idUser}'`);
const fr = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

/* TVA : requete d'avant (sans index force) et d'aujourd'hui, memes lignes */
const tvaSql = (d, f, force) => `SELECT SUM(d.int_PRICE), SUM(d.int_UG*d.int_PRICE_UNITAIR), d.valeurTva FROM t_preenregistrement_detail d,
  t_preenregistrement p${force ? ' FORCE INDEX (idx_preenr_statut_date)' : ''}, t_user u, mvttransaction m WHERE p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
  AND p.lg_PREENREGISTREMENT_ID = m.pkey AND d.bool_ACCOUNT AND p.lg_TYPE_VENTE_ID <> '5' AND p.str_STATUT = 'is_Closed' AND p.imported = 0
  AND p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < DATE_ADD('${f}', INTERVAL 1 DAY) AND p.lg_USER_ID = u.lg_USER_ID AND u.lg_EMPLACEMENT_ID = '${emplacement}'
  AND p.lg_EMPLACEMENT_VENTE_ID IS NULL AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY d.valeurTva`;
/* ventes encaissees par caissiere, requete d'avant (COALESCE) */
const ventesSql = (d, f) => `SELECT p.lg_USER_CAISSIER_ID, COUNT(*) FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0
  AND p.lg_TYPE_VENTE_ID IN ('1', '2', '3') AND COALESCE(p.completion_date, p.dt_UPDATED) >= '${d}' AND COALESCE(p.completion_date, p.dt_UPDATED) < DATE_ADD('${f}', INTERVAL 1 DAY)
  AND p.lg_USER_CAISSIER_ID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID) GROUP BY p.lg_USER_CAISSIER_ID`;

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  const ecritures = [];
  p.on('request', (r) => { if (r.method() !== 'GET' && /\/api\//.test(r.url()) && !/support|journal|evenement|user\/auth/.test(r.url())) { ecritures.push(r.method() + ' ' + r.url()); } });
  const menuDe = (id) => p.evaluate((x) => { let t = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === x) { t = [n.parentNode.get('text'), n.get('text')]; } }); return t; }, id);
  const taper = async (sel, texte) => { await cliquer(p, sel); await p.keyboard.press('Control+A'); await p.keyboard.type(texte); await p.keyboard.press('Tab'); };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* 1. TVA */
    const mTva = await menuDe('tvastat');
    ok('Menu des statistiques TVA trouvé', !!mTva, JSON.stringify(mTva));
    await ouvrirMenu(p, mTva[0], mTva[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('tvastat #rechercher').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    for (const [d, f] of [['2026-11-01', '2026-11-16'], ['2026-11-12', '2026-11-12'], ['2026-10-01', '2026-10-31']]) {
      await taper('tvastat #dtStart', fr(d));
      await taper('tvastat #dtEnd', fr(f));
      const lire = async () => {
        const rep = p.waitForResponse((r) => r.url().includes('/api/v3/tvas') && r.url().includes('dtStart=' + d), { timeout: 60000 });
        const t0 = Date.now();
        await cliquer(p, 'tvastat #rechercher');
        const r = await rep;
        return { ms: Date.now() - t0, json: await r.json() };
      };
      await lire(); // cache chaud
      const r = await lire();
      await p.waitForTimeout(600);
      const ecran = await p.evaluate(() => Ext.ComponentQuery.query('tvastat #tvaGrid')[0].getStore().getRange()
        .map((x) => ({ taux: x.get('TAUX'), ht: x.get('Total HT'), tva: x.get('Total TVA'), ttc: x.get('Total TTC') })));
      const serveur = (r.json.data || []).map((x) => ({ taux: x.TAUX, ht: x['Total HT'], tva: x['Total TVA'], ttc: x['Total TTC'] }));
      ok(`TVA ${fr(d)} → ${fr(f)} : réponse en moins de ${SEUIL_MS} ms`, r.ms < SEUIL_MS, r.ms + ' ms');
      ok(`TVA ${fr(d)} → ${fr(f)} : chaque taux, écran = serveur`, ecran.length > 0 && JSON.stringify(ecran) === JSON.stringify(serveur), JSON.stringify(ecran) + ' / ' + JSON.stringify(serveur));
      ok(`TVA ${fr(d)} → ${fr(f)} : HT + TVA = TTC sur chaque ligne, jamais négatif`, ecran.every((x) => x.ht + x.tva === x.ttc && x.ht >= 0 && x.tva >= 0));
      ok(`TVA ${fr(d)} → ${fr(f)} : en base, requête d'avant = requête par l'index de date`, q(tvaSql(d, f, false)) === q(tvaSql(d, f, true)) && q(tvaSql(d, f, true)) !== '');
    }

    /* 2. Analyse par motif */
    const mVa = await menuDe('venteannuler');
    ok('Menu des ventes annulées trouvé', !!mVa, JSON.stringify(mVa));
    await ouvrirMenu(p, mVa[0], mVa[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('venteannuler #ongletAnalyse').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'venteannuler #ongletAnalyse');
    await p.waitForTimeout(1500);
    /* operations : annulations */
    await cliquer(p, 'venteannuler #analyseType');
    await p.locator('.x-boundlist-item').filter({ hasText: 'Annulations seulement' }).filter({ visible: true }).first().click();
    await p.waitForTimeout(1500);
    ok('Opérations : « Annulations seulement »', await p.evaluate(() => Ext.ComponentQuery.query('venteannuler #analyseType')[0].getValue()) === 'ANNULATION');
    let cas = 0;
    for (const [d, f] of [['2026-11-16', '2026-11-16'], ['2026-11-13', '2026-11-13'], ['2026-10-01', '2026-10-31']]) {
      await taper('venteannuler #dtStart', fr(d));
      await taper('venteannuler #dtEnd', fr(f));
      const lire = async () => {
        const rep = p.waitForResponse((r) => r.url().includes('/vente-motifs/recap') && r.url().includes('dtStart=' + d) && r.url().includes('dtEnd=' + f), { timeout: 60000 });
        const t0 = Date.now();
        await cliquer(p, 'venteannuler #rechercher');
        const r = await rep;
        return { ms: Date.now() - t0, json: await r.json() };
      };
      await lire();
      const r = await lire();
      await p.waitForTimeout(800);
      const cl = r.json.classementAnnulations || [];
      if (!cl.length) { ok(`Motifs ${fr(d)} → ${fr(f)} : aucune annulation, rien à rapprocher`, true); continue; }
      cas++;
      ok(`Motifs ${fr(d)} → ${fr(f)} : réponse en moins de ${SEUIL_MS} ms`, r.ms < SEUIL_MS, r.ms + ' ms');
      const base = {};
      q(ventesSql(d, f)).split('\n').filter(Boolean).forEach((l) => { const [id, n] = l.split('\t'); base[id] = Number(n); });
      const ecarts = cl.filter((c) => (c.caissierId ? (base[c.caissierId] || 0) : 0) !== c.ventes).map((c) => c.rang + ' : ' + c.ventes + ' / ' + base[c.caissierId]);
      ok(`Motifs ${fr(d)} → ${fr(f)} : ventes encaissées de chaque caissière, serveur = requête d'avant en base`, ecarts.length === 0, ecarts.join(' | '));
      ok(`Motifs ${fr(d)} → ${fr(f)} : taux = annulations / ventes`, cl.every((c) => !c.ventes || Math.abs(c.taux - Math.round(1000 * c.annulations / c.ventes) / 10) < 1e-9));
      /* ecran : lignes du classement (rang, annulations, ventes, taux) */
      const lignesEcran = await p.evaluate(() => { const el = Ext.ComponentQuery.query('venteannuler #analyseMotifs')[0].getEl().dom;
        return Array.from(el.querySelectorAll('table.va-classement-caissieres tbody tr')).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim())).filter((t) => t.length === 6); });
      const attendu = cl.map((c) => [String(c.rang), String(c.annulations), c.ventes ? String(c.ventes) : '—', typeof c.taux === 'number' ? String(c.taux).replace('.', ',') + ' %' : '—']);
      const vus = lignesEcran.map((t) => [t[0], t[2].replace(/\s/g, ''), t[3].replace(/\s/g, ''), t[4].replace(/ | /g, ' ')]);
      ok(`Motifs ${fr(d)} → ${fr(f)} : classement à l'écran = serveur (rang, annulations, ventes, taux)`, JSON.stringify(vus) === JSON.stringify(attendu), JSON.stringify(vus).slice(0, 200) + ' / ' + JSON.stringify(attendu).slice(0, 200));
    }
    ok('Au moins deux périodes avec des annulations', cas >= 2, cas);
    ok('Aucune écriture envoyée', ecritures.length === 0, ecritures.join(' | '));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
