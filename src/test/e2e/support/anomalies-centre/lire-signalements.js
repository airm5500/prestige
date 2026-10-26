/* LECTURE SEULE des signalements du centre de support, par les API de l'ecran (compte super administrateur).
 * node support/anomalies-centre/lire-signalements.js <dossier de sortie>
 * Ecrit un fichier JSON par source : demandes (« Me contacter »), tickets et leurs messages, evenements
 * applicatifs, recapitulatif, controles de coherence. Aucune ecriture en base. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
(async () => {
  const sortie = process.argv[2] || '.';
  fs.mkdirSync(sortie, { recursive: true });
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 60000 });
  const lire = (url) => p.evaluate(async (u) => { const x = await fetch(u); return { statut: x.status, corps: await x.text() }; }, url);
  const api = '/prestige/api/v1/support/';
  const sources = {
    demandes: 'demandes?start=0&limit=1000',
    tickets: 'tickets?start=0&limit=1000',
    evenements: 'events?start=0&limit=1000',
    recap: 'events/recap',
    coherence: 'coherence',
  };
  for (const [nom, url] of Object.entries(sources)) {
    const r = await lire(api + url);
    fs.writeFileSync(path.join(sortie, nom + '.json'), r.corps);
    let n = '?'; try { const j = JSON.parse(r.corps); n = j.total ?? (j.data || []).length; } catch (e) { /* non JSON */ }
    console.log(nom, r.statut, 'total=' + n);
    if (nom === 'tickets' && r.statut === 200) {
      const msgs = {};
      for (const t of (JSON.parse(r.corps).data || [])) {
        msgs[t.numero || t.id] = JSON.parse((await lire(api + 'tickets/' + t.id + '/messages')).corps).data;
      }
      fs.writeFileSync(path.join(sortie, 'tickets-messages.json'), JSON.stringify(msgs, null, 1));
    }
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
