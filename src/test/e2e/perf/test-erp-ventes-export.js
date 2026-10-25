/* EXPORT DES VENTES VERS L'ERP (GET v1/whareouse-vno) - audit des exports apres le journal du 15/10.
 *
 * L'export relisait, pour chaque vente, ses lignes et son paiement, et pour chaque ligne son mouvement de stock : sur
 * le banc, une semaine de ventes depassait 20 min (Hibernate reverifiait avant chaque requete tous les objets deja
 * charges). Ce que le test etablit (lecture seule, session de l'ecran) :
 *  - une semaine de ventes en moins de 30 s ; autant de ventes que la base (VNO cloturees, non annulees, montant > 0) ;
 *  - echantillon : nombre de lignes, montant paye et mouvements de stock de chaque vente conformes a la base.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const DEBUT = '2026-10-01', FIN = '2026-10-07', MAX_MS = 30000;

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const r = await p.evaluate(async ([d, f, max]) => {
      const ctl = new AbortController(); const m = setTimeout(() => ctl.abort(), max * 2); const t = performance.now();
      try { const x = await fetch('../api/v1/whareouse-vno?dtStart=' + d + '&dtEnd=' + f, { signal: ctl.signal }); return { s: x.status, ms: Math.round(performance.now() - t), j: await x.json() }; }
      catch (e) { return { s: 0, ms: Math.round(performance.now() - t), e: String(e) }; } finally { clearTimeout(m); }
    }, [DEBUT, FIN, MAX_MS]);
    const attendu = Number(q("SELECT COUNT(*) FROM t_preenregistrement WHERE DATE(dt_UPDATED) BETWEEN '" + DEBUT + "' AND '" + FIN
      + "' AND str_TYPE_VENTE = 'VNO' AND b_IS_CANCEL = 0 AND int_PRICE > 0 AND str_STATUT = 'is_Closed'"));
    const ventes = Array.isArray(r.j) ? r.j : [];
    ok('Une semaine de ventes en moins de 30 s, autant de ventes que la base', r.s === 200 && r.ms < MAX_MS && ventes.length === attendu && attendu > 0,
      r.ms + ' ms, ' + ventes.length + ' / ' + attendu + (r.e ? ' ' + r.e : ''));

    let vus = 0; const faux = [];
    for (const v of ventes.filter((x, i) => i % Math.max(1, Math.floor(ventes.length / 30)) === 0)) {
      const ref = String(v.numberTransaction).replace(/'/g, '');
      const id = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE str_REF = '" + ref + "' AND str_TYPE_VENTE = 'VNO' AND str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0"
        + " AND DATE(dt_UPDATED) BETWEEN '" + DEBUT + "' AND '" + FIN + "'").split('\n').filter(Boolean);
      if (id.length !== 1) { continue; }
      const lignes = Number(q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + id[0] + "'"));
      const mvts = Number(q("SELECT COUNT(*) FROM t_preenregistrement_detail d JOIN hmvtproduit h ON h.pkey = d.lg_PREENREGISTREMENT_DETAIL_ID WHERE d.lg_PREENREGISTREMENT_ID = '" + id[0] + "'"));
      const paye = q("SELECT IFNULL((SELECT montantPaye FROM mvttransaction WHERE pkey = '" + id[0] + "' LIMIT 1), 'AUCUN')");
      const pv = v.payments && v.payments[0] ? String(v.payments[0].paidAmount) : 'AUCUN';
      const sv = (v.salesLines || []).filter((l) => l.snapshot).length;
      vus++;
      if (v.salesLines.length !== lignes || sv !== mvts || pv !== paye) { faux.push(ref + ' : ' + v.salesLines.length + '/' + sv + '/' + pv + ' ≠ ' + lignes + '/' + mvts + '/' + paye); }
    }
    ok('Échantillon : lignes, mouvements de stock et montant payé conformes à la base', vus >= 10 && faux.length === 0, vus + ' ventes ; ' + faux.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
