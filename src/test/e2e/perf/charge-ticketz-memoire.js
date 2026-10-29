/* TICKET Z SUR UNE LONGUE PERIODE : MEMOIRE DU SERVEUR (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md).
 *
 * Les journaux de domain1 montrent des « OutOfMemoryError: Java heap space » dont les piles passent par
 * CaisseRessource.fetchTicketZ. Le Ticket Z charge en memoire toutes les transactions de la periode et leurs
 * reglements (GenerateTicketServiceImpl.dataPerUser). Ce test demande, par l'ecran (GESTION COURANTE > Ticket Z, dates
 * saisies, « Afficher »), des periodes de plus en plus longues et releve la memoire Java du serveur toutes les 2 s
 * (jstat) : pic du tas, ramasse-miettes complets, duree, et erreur eventuelle. Lecture seule.
 *
 * Variables : BASE, DB_TEST + E2E_BASE_LIBRE=1, DATE_REF (dernier jour), MOIS (1,3,6,12), SERVEUR_PID, JSTAT.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFile } = require('child_process');

const PID = process.env.SERVEUR_PID;
const JSTAT = process.env.JSTAT || 'C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot/bin/jstat.exe';
const DATE_REF = process.env.DATE_REF;
const MOIS = (process.env.MOIS || '1,3,6,12').split(',').map(Number);

const jstat = () => new Promise((ok) => execFile(JSTAT, ['-gc', PID], { encoding: 'utf8' }, (e, out) => {
  if (e) { return ok(null); }
  const [t, v] = out.trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/));
  const x = (k) => Number(String(v[t.indexOf(k)]).replace(',', '.'));
  ok({ tasMo: Math.round((x('S0U') + x('S1U') + x('EU') + x('OU')) / 1024), vieuxMo: Math.round(x('OU') / 1024), gcComplets: x('FGC'), gcS: x('GCT') });
}));

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
  const lib = await p.evaluate(() => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
    .cascadeBy((n) => { if (!r && n.get('id') === 'ticketzmanager' && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; });
  await vues.ouvrirMenu(p, lib[0], lib[1]);
  await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 120000 });
  const poser = (r, d) => p.evaluate(([q, v]) => { Ext.ComponentQuery.query(q)[0].setValue(Ext.Date.parse(v, 'Y-m-d')); }, [r, d]);
  for (const m of MOIS) {
    const fin = new Date(DATE_REF + 'T12:00:00Z');
    const debut = new Date(fin); debut.setUTCMonth(debut.getUTCMonth() - m); debut.setUTCDate(debut.getUTCDate() + 1);
    await poser('ticketzmanager #dtStart', debut.toISOString().slice(0, 10));
    await poser('ticketzmanager #dtEnd', DATE_REF);
    const avant = await jstat();
    let pic = avant ? avant.tasMo : 0, picVieux = avant ? avant.vieuxMo : 0, dernier = avant;
    let enCours = true;
    const releve = (async () => { while (enCours) { const r = await jstat(); if (r) { pic = Math.max(pic, r.tasMo); picVieux = Math.max(picVieux, r.vieuxMo); dernier = r; }
      await new Promise((ok) => setTimeout(ok, 2000)); } })();
    const t0 = Date.now();
    const rep = p.waitForResponse((r) => /caisse\/fetch-tickez/.test(r.url()), { timeout: 900000 }).catch((e) => ({ status: () => 'sans réponse : ' + e.message.split('\n')[0] }));
    const id = await p.evaluate(() => { const v = Ext.ComponentQuery.query('ticketzmanager')[0];
      return v.query('button').filter((x) => x.isVisible(true) && /^\s*Afficher\s*$/i.test(x.getText() || ''))[0].getId(); });
    await p.click('#' + id);
    const r = await rep;
    const ms = Date.now() - t0;
    let taille = null;
    try { taille = Math.round((await r.body()).length / 1024); } catch (e) { /* pas de corps */ }
    enCours = false; await releve;
    console.log(`Ticket Z ${String(m).padStart(2)} mois (${debut.toISOString().slice(0, 10)} -> ${DATE_REF}) : HTTP ${r.status()} en ${ms} ms, reponse ${taille} Ko ;`
      + ` tas Java avant ${avant && avant.tasMo} Mo, pic ${pic} Mo (ancienne generation ${picVieux} Mo),`
      + ` GC complets ${dernier && avant ? dernier.gcComplets - avant.gcComplets : '?'}, temps GC ${dernier && avant ? Math.round((dernier.gcS - avant.gcS) * 10) / 10 : '?'} s`);
    await p.waitForTimeout(5000);
  }
  await b.close();
})();
