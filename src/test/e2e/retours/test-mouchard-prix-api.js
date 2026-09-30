/* MOUCHARD DES PRIX DE VENTE passe en API (demande de l'officine du 30/09).
 *
 * 1. Pour plusieurs jeux de filtres et plusieurs pages, l'ancienne page ws_data.jsp (conservee) et l'API
 *    v1/mouchard-prix/liste renvoient EXACTEMENT les memes lignes et le meme total, pour un administrateur et pour un
 *    caissier (filtre d'emplacement).
 * 2. A l'ecran, la liste et le PDF passent par l'API ; filtres, recherche et pages fonctionnent. Lecture seule.
 */
const { chromium } = require('playwright-core');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const auj = new Date(); const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const err = [];
  const connecter = async (login) => { const p = await b.newPage({ viewport: { width: 1600, height: 950 } }); p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', login); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 }); return p; };
  try {
    const JEUX = [
      { nom: 'aujourd\'hui (sans dates)', q: {} },
      { nom: 'depuis 2020, page 1', q: { dt_Date_Debut: '2020-01-01', dt_Date_Fin: iso(auj) } },
      { nom: 'depuis 2020, page 3', q: { dt_Date_Debut: '2020-01-01', dt_Date_Fin: iso(auj), start: 40 } },
      { nom: 'recherche « ACC »', q: { dt_Date_Debut: '2020-01-01', dt_Date_Fin: iso(auj), search_value: 'ACC' } },
      { nom: 'recherche par CIP « 82 »', q: { dt_Date_Debut: '2020-01-01', dt_Date_Fin: iso(auj), search_value: '82' } },
      { nom: 'action VENTE', q: { dt_Date_Debut: '2020-01-01', dt_Date_Fin: iso(auj), str_ACTION: 'VENTE' } },
      { nom: 'action COMMANDE', q: { dt_Date_Debut: '2020-01-01', dt_Date_Fin: iso(auj), str_ACTION: 'COMMANDE' } },
      { nom: 'action FICHEARTICLE, un mois', q: { dt_Date_Debut: iso(new Date(auj.getFullYear(), auj.getMonth() - 1, 1)), dt_Date_Fin: iso(auj), str_ACTION: 'FICHEARTICLE' } }
    ];
    for (const login of ['admin', 'KGA3']) {
      const p = await connecter(login);
      for (const j of JEUX) {
        const qs = new URLSearchParams(Object.assign({ start: 0, limit: 20, page: 1 }, j.q)).toString();
        /* L'ancienne page decoupe par pages de sa configuration (50 ici), quel que soit « limit » : on reconstitue la
           tranche [start, start + 20) de sa liste complete, que l'API doit rendre a l'identique. */
        const r = await p.evaluate(async (a) => {
          const lire = async (st) => { const t = await (await fetch('../webservices/sm_user/prixmodifies/ws_data.jsp?' + new URLSearchParams(Object.assign({}, a.q, { start: st, limit: 20 })).toString())).text();
            return JSON.parse(t.slice(t.indexOf('({') + 1, t.lastIndexOf('})') + 1)); };
          const debut = a.q.start || 0;
          const p1 = await lire(0); const taille = Math.max(p1.results.length, 1);
          let lignes = [];
          for (let st = Math.floor(debut / taille) * taille; st < debut + 20 && st < Number(String(p1.total).trim()); st += taille) { lignes = lignes.concat((await lire(st)).results.map((x, i) => ({ x, rang: st + i }))); }
          const tranche = lignes.filter((l) => l.rang >= debut && l.rang < debut + 20).map((l) => l.x);
          const api = JSON.parse(await (await fetch('../api/v1/mouchard-prix/liste?' + new URLSearchParams(Object.assign({ limit: 20, page: 1 }, a.q, { start: debut })).toString())).text());
          return { jsp: JSON.stringify({ total: p1.total, results: tranche, taillePageJsp: taille }), api: JSON.stringify(api) };
        }, { q: j.q });
        let a, j2;
        try { a = JSON.parse(r.jsp); j2 = JSON.parse(r.api); } catch (e) { ok(login + ' / ' + j.nom + ' : réponses lisibles', false, e.message); continue; }
        const memeTotal = Number(String(a.total).trim()) === Number(j2.total);
        const canon = (l) => JSON.stringify(l.map((x) => Object.keys(x).sort().reduce((o, k) => { o[k] = x[k]; return o; }, {})));
        const memesLignes = canon(a.results) === canon(j2.results);
        ok(login + ' / ' + j.nom + ' : même total et mêmes lignes que l\'ancienne page (' + j2.total + ' ; ' + j2.results.length + ' sur la page)', memeTotal && memesLignes,
          memeTotal && memesLignes ? '' : 'total ' + a.total + ' / ' + j2.total + ' ; lignes jsp ' + a.results.length + ' api ' + j2.results.length + ' ; jsp ' + a.results.map((x) => x.str_DESCRIPTION_PLUS).slice(0, 4).join(',') + ' api ' + j2.results.map((x) => x.str_DESCRIPTION_PLUS).slice(0, 4).join(','));
      }
      if (login === 'admin') {
        /* ------------------------------------------------ a l'ecran */
        const appels = []; p.on('request', (q) => { if (/prixmodifies|mouchard-prix/.test(q.url())) { appels.push(q.url()); } });
        await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
        await p.waitForTimeout(1500);
        await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('mouvementprixvente', 'Mouchard des prix de vente', ''); });
        await p.waitForFunction(() => { const g = Ext.getCmp('GridArticleID'); return g && g.rendered && !g.getStore().isLoading(); }, null, { timeout: 30000 });
        await p.evaluate(() => { Ext.getCmp('dt_debut').setValue(new Date(2020, 0, 1)); Me.onRechClick(); });
        await p.waitForFunction(() => { const s = Ext.getCmp('GridArticleID').getStore(); return !s.isLoading() && s.getCount() > 0; }, null, { timeout: 30000 });
        const e1 = await p.evaluate(() => { const s = Ext.getCmp('GridArticleID').getStore(); return { n: s.getCount(), total: s.getTotalCount(), groupes: s.getGroups().length, premier: s.getAt(0).get('str_DESCRIPTION') }; });
        ok('Écran : la liste se charge par l\'API (20 lignes, groupées par mouvement)', e1.n === 20 && e1.total > 20 && e1.groupes >= 1 && appels.some((u) => /mouchard-prix\/liste/.test(u)) && !appels.some((u) => /prixmodifies/.test(u)), JSON.stringify(e1) + ' ' + appels.slice(-2).join(' '));
        await p.evaluate(() => { const c = Ext.getCmp('str_TYPE_TRANSACTION'); c.setValue('VENTE'); c.fireEvent('select', c); });
        await p.waitForTimeout(2500);
        const e2 = await p.evaluate(() => Ext.getCmp('GridArticleID').getStore().collect('MOUVEMENT'));
        ok('Écran : le filtre « Ventes » ne garde que les mouvements VENTE', e2.length === 1 && e2[0] === 'VENTE', e2.join(','));
        await p.evaluate(() => { Ext.getCmp('GridArticleID').down('pagingtoolbar').moveNext(); });
        await p.waitForTimeout(2500);
        const e3 = await p.evaluate(() => { const s = Ext.getCmp('GridArticleID').getStore(); return { page: s.currentPage, n: s.getCount() }; });
        ok('Écran : page suivante', e3.page === 2 && e3.n > 0, JSON.stringify(e3));
        const pdf = await p.evaluate(async () => { const r = await fetch('../api/v1/mouchard-prix/pdf?dt_Date_Debut=2020-01-01&dt_Date_Fin=' + Ext.Date.format(new Date(), 'Y-m-d') + '&search_value=&str_ACTION=VENTE');
          const t = new Uint8Array(await r.arrayBuffer()); return { type: r.headers.get('content-type'), debut: String.fromCharCode.apply(null, t.slice(0, 5)), taille: t.length, dispo: r.headers.get('content-disposition') }; });
        ok('PDF par l\'API : un vrai PDF, ouvert dans l\'onglet (inline)', /pdf/.test(pdf.type) && pdf.debut === '%PDF-' && pdf.taille > 2000 && /inline/.test(pdf.dispo), JSON.stringify(pdf));
        const lien = await p.evaluate(() => { let u = null; const o = window.open; window.open = (x) => { u = x; return null; }; Me.onPdfClick(); window.open = o; return u; });
        ok('Écran : le bouton Imprimer ouvre le PDF de l\'API avec les filtres de l\'écran', /api\/v1\/mouchard-prix\/pdf\?dt_Date_Debut=2020-01-01.*str_ACTION=VENTE/.test(lien), lien);
      }
      await p.close();
    }
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
