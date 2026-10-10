/* RAPPELS TRAITEMENT (retours du 10/10, section 13).
 *  - le menu ouvre deux onglets : « Liste » (l'ecran existant) et « Analyse » ; infobulles sur tous les boutons ;
 *  - envoi lie au modele choisi dans la barre (modele « Disponibilité ») : le message suit ce modele, le rappel garde le
 *    canal et le modele ; un modele WhatsApp seul est refuse pour un envoi SMS (aucun message) ;
 *  - Imprimer (PDF) et Export CSV de la liste affichee, memes criteres ;
 *  - Analyse : tuiles et mois = requete independante ; une tuile de statut ouvre la liste de ce statut sur la periode.
 * Jeu d'essai : un client et cinq rappels (tous statuts, un envoi), un modele WhatsApp ; tout est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const T = String(Date.now()).slice(-7), C = 'E2E-RPA-' + T, NOM = 'ZZRAPPEL', PRENOM = 'ANALYSE' + T, MWA = 'E2E-RPA-WA-' + T;
const [P1, P2] = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP <> '' AND f.str_NAME REGEXP '^[A-Z]{3}' ORDER BY f.str_NAME LIMIT 2").split('\n');
const R = (i) => C + '-' + i;

function semer() {
  q("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, dt_CREATED, dt_UPDATED, str_STATUT)"
    + ` VALUES ('${C}', '${NOM}', '${PRENOM}', '2', '0707080910', NOW(), NOW(), 'enable');`
    + "INSERT INTO t_rappel_habitude (id, lg_CLIENT_ID, lg_FAMILLE_ID, dt_DERNIER_ACHAT, dt_PREVU, int_FREQUENCE, int_ACHATS, str_STATUT, dt_ENVOI, str_CANAL, dt_CREATED) VALUES"
    + ` ('${R(1)}', '${C}', '${P1}', CURDATE() - INTERVAL 27 DAY, CURDATE() + INTERVAL 3 DAY, 30, 4, 'A_PREPARER', NULL, NULL, NOW()),`
    + ` ('${R(2)}', '${C}', '${P2}', CURDATE() - INTERVAL 25 DAY, CURDATE() + INTERVAL 5 DAY, 30, 3, 'PREPARE', NULL, NULL, NOW()),`
    + ` ('${R(3)}', '${C}', '${P1}', CURDATE() - INTERVAL 60 DAY, CURDATE() - INTERVAL 30 DAY, 30, 3, 'ECARTE', NULL, NULL, NOW()),`
    + ` ('${R(4)}', '${C}', '${P2}', CURDATE() - INTERVAL 70 DAY, CURDATE() - INTERVAL 40 DAY, 30, 5, 'ACHETE', NOW() - INTERVAL 42 DAY, 'WHATSAPP', NOW()),`
    + ` ('${R(5)}', '${C}', '${P1}', CURDATE() - INTERVAL 90 DAY, CURDATE() - INTERVAL 60 DAY, 30, 3, 'ACHETE', NULL, NULL, NOW());`
    + "INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)"
    + ` VALUES ('${MWA}', 'E2E WHATSAPP SEUL ${T}', 'WHATSAPP', 'Bonjour {client}, essai.', 1, NOW(), NOW());`);
}
function nettoyer() {
  q(`DELETE FROM notification_client WHERE client_id = '${C}'; DELETE FROM notification WHERE entity_ref = '${C}';`
    + `DELETE FROM t_rappel_habitude WHERE lg_CLIENT_ID = '${C}'; DELETE FROM t_client WHERE lg_CLIENT_ID = '${C}';`
    + `DELETE FROM modele_message WHERE id = '${MWA}';`);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : deux produits', P1 && P2);
    nettoyer(); semer();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('rappelshabitude', 'Rappels traitement', ''));
    await p.waitForFunction(() => { const l = Ext.ComponentQuery.query('rappelshabitude')[0]; return l && l.isVisible() && l.rendered && !l.getStore().isLoading(); }, null, { timeout: 60000 });
    const hub = await p.evaluate(() => { const h = Ext.ComponentQuery.query('rappelstraitement')[0];
      return { hub: !!h, onglets: h ? h.query('#ongletsRp button').map((x) => x.getText()) : [] }; });
    ok('Le menu ouvre « Liste » / « Analyse »', hub.hub && JSON.stringify(hub.onglets) === '["Liste","Analyse"]', JSON.stringify(hub));
    const sansTip = await p.evaluate(() => Ext.ComponentQuery.query('rappelshabitude')[0].getDockedItems('toolbar[dock=top]')
      .reduce((a, t) => a.concat(t.query('button,combobox,datefield,textfield').filter((x) => !x.tooltip && !x.up('menu')).map((x) => x.getText ? x.getText() : x.itemId)), []));
    ok('Infobulle sur chaque bouton et critère des deux barres', sansTip.length === 0, JSON.stringify(sansTip));

    /* ------------------------------------------------ liste de l'essai */
    await p.evaluate((nom) => { const l = Ext.ComponentQuery.query('rappelshabitude')[0]; l.down('#statut').setValue('TOUS'); l.down('#query').setValue(nom); l.rechercher(); }, PRENOM);
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('rappelshabitude')[0].getStore(); return !s.isLoading() && s.getCount() === 5; }, null, { timeout: 30000 });
    const modele = await p.evaluate(() => { const c = Ext.ComponentQuery.query('rappelshabitude #modeleRappel')[0]; return { v: c.getValue(), n: c.getStore().getCount() }; });
    ok('Modèle du message : choisi dans la barre, « Rappel de traitement habituel » par défaut', modele.v === 'MODELE_HABITUDE' && modele.n >= 4, JSON.stringify(modele));

    /* PDF et CSV : memes criteres */
    /* les URL ouvertes par les boutons sont relevees (le CSV, en piece jointe, n'a pas d'URL lisible dans sa fenetre) */
    await p.evaluate(() => { window.__ouverts = []; const o = window.open; window.open = function (u) { window.__ouverts.push(u); return o.apply(this, arguments); }; });
    const ouvrir = async (id) => { const [pop] = await Promise.all([p.waitForEvent('popup'), p.evaluate((id) => { Ext.ComponentQuery.query('rappelshabitude #' + id)[0].btnEl.dom.click(); }, id)]);
      await pop.close().catch(() => {}); return p.evaluate(() => window.__ouverts[window.__ouverts.length - 1]); };
    const urlPdf = await ouvrir('btnPdf');
    const pdf = await p.evaluate(async (u) => { const r = await fetch(u); const a = new Uint8Array(await r.arrayBuffer()); return { type: r.headers.get('content-type'), b: Array.from(a) }; }, urlPdf);
    require('fs').writeFileSync('/tmp/e2e-rappels.pdf', Buffer.from(pdf.b));
    const texte = execFileSync('pdftotext', ['-layout', '/tmp/e2e-rappels.pdf', '-'], { encoding: 'utf8' });
    ok('Imprimer : PDF de la liste affichée (titre, critères, 5 lignes de l\'essai)', /pdf/.test(pdf.type) && /RAPPELS DE TRAITEMENT/.test(texte) && /Tous les statuts/.test(texte)
      && texte.split('\n').filter((x) => /^\s*\d\d\/\d\d\/\d{4}/.test(x) && x.indexOf(PRENOM) >= 0).length === 5 && /5 ligne\(s\)/.test(texte), JSON.stringify({ type: pdf.type, n: (texte.match(new RegExp(PRENOM, 'g')) || []).length, lignes: /5 ligne\(s\)/.test(texte), tous: /Tous les statuts/.test(texte) }));
    const urlCsv = await ouvrir('btnCsv');
    const csv = await p.evaluate(async (u) => { const r = await fetch(u); return { type: r.headers.get('content-type'), t: await r.text() }; }, urlCsv);
    const l = csv.t.replace(/^﻿/, '').trim().split(/\r\n/);
    ok('Export CSV : en-tête + 5 lignes, « ; », statuts en clair', /csv/.test(csv.type) && l[0].startsWith('Prévu le;Client;Téléphone') && l.length === 6
      && ['À préparer', 'Préparé', 'Écarté', 'Racheté'].every((s) => l.some((x) => x.split(';')[8] === s)), urlCsv + ' ' + csv.type + ' ' + l.slice(0, 2).join(' | ').slice(0, 150));

    /* ------------------------------------------------ envoi avec un modele */
    const choisir = async (id) => { await p.evaluate((id) => { const c = Ext.ComponentQuery.query('rappelshabitude #modeleRappel')[0]; c.getStore().load(() => {}); }, id);
      await p.waitForFunction((id) => { const c = Ext.ComponentQuery.query('rappelshabitude #modeleRappel')[0]; return !c.getStore().isLoading() && c.getStore().getById(id); }, id, { timeout: 15000 });
      await p.evaluate(() => { const c = Ext.ComponentQuery.query('rappelshabitude #modeleRappel')[0]; c.expand(); });
      await p.evaluate((id) => { const c = Ext.ComponentQuery.query('rappelshabitude #modeleRappel')[0], n = c.getPicker().getNode(c.getStore().getById(id)); n.setAttribute('data-e2e', 'modele'); }, id);
      await p.click('[data-e2e=modele]'); await p.waitForTimeout(200); };
    const cocher = async (id) => { await p.evaluate((id) => { const l = Ext.ComponentQuery.query('rappelshabitude')[0]; l.getSelectionModel().deselectAll();
      l.getView().getNode(l.getStore().getById(id)).setAttribute('data-e2e', 'ligne'); }, id); await p.click('[data-e2e=ligne] .x-grid-row-checker'); };
    const envoyerSms = async () => {
      await p.evaluate(() => { Ext.ComponentQuery.query('rappelshabitude #btnSms')[0].getEl().dom.setAttribute('data-e2e', 'envoyer'); });
      await p.click('[data-e2e=envoyer]');
      await p.evaluate(() => { Ext.ComponentQuery.query('rappelshabitude #envSms')[0].getEl().dom.setAttribute('data-e2e', 'sms'); });
      await p.click('[data-e2e=sms]');
      await p.waitForFunction(() => Ext.Msg.isVisible(), null, { timeout: 10000 });
      const question = await p.evaluate(() => Ext.Msg.msg.getEl().dom.textContent);
      await p.evaluate(() => { Ext.Msg.down('button[itemId=yes]').getEl().dom.setAttribute('data-e2e', 'oui'); }); await p.click('[data-e2e=oui]');
      await p.waitForFunction((qq) => Ext.Msg.isVisible() && Ext.Msg.msg.getEl().dom.textContent !== qq, question, { timeout: 30000 });
      const reponse = await p.evaluate(() => Ext.Msg.msg.getEl().dom.textContent);
      await p.evaluate(() => Ext.Msg.hide());
      return { question, reponse };
    };
    await choisir(MWA); await cocher(R(1));
    const refus = await envoyerSms();
    ok('Modèle WhatsApp seul + envoi SMS : refusé, aucun message', /n'est pas prévu pour ce canal/.test(refus.reponse)
      && q(`SELECT COUNT(*) FROM notification WHERE entity_ref = '${C}'`) === '0', refus.reponse);
    await choisir('MODELE_DISPONIBILITE'); await cocher(R(1));
    const envoi = await envoyerSms();
    const msg = q(`SELECT n.message FROM notification n WHERE n.entity_ref = '${C}'`);
    const ligne = q(`SELECT CONCAT_WS('|', str_CANAL, lg_MODELE, dt_ENVOI IS NOT NULL) FROM t_rappel_habitude WHERE id = '${R(1)}'`);
    ok('Confirmation : canal et modèle rappelés', /par SMS/.test(envoi.question) && /Disponibilit/.test(envoi.question), envoi.question);
    ok('Envoi SMS avec le modèle « Disponibilité » : le message suit ce modèle', /produits habituels sont disponibles/.test(msg) && msg.indexOf(NOM) >= 0, envoi.reponse);
    ok('Le rappel garde le canal et le modèle', ligne === 'SMS|MODELE_DISPONIBILITE|1', ligne);

    /* ------------------------------------------------ analyse */
    await p.evaluate(() => { const h = Ext.ComponentQuery.query('rappelstraitement')[0]; h.down('#rp-analyse').getEl().dom.setAttribute('data-e2e', 'analyse'); });
    await p.click('[data-e2e=analyse]');
    await p.waitForFunction(() => { const h = Ext.ComponentQuery.query('rappelstraitement')[0]; return h.donnees && h.down('#anContenu').getEl().dom.querySelector('.rp-par-mois'); }, null, { timeout: 30000 });
    const crit = await p.evaluate(() => Ext.ComponentQuery.query('rappelstraitement')[0].criteresAnalyse());
    const w = ` FROM t_rappel_habitude WHERE dt_PREVU BETWEEN '${crit.dtStart}' AND '${crit.dtEnd}'`;
    const att = q("SELECT COUNT(*), SUM(str_STATUT='A_PREPARER'), SUM(str_STATUT='PREPARE'), SUM(str_STATUT='ECARTE'), SUM(dt_ENVOI IS NOT NULL),"
      + " SUM(str_STATUT='ACHETE' AND dt_ENVOI IS NOT NULL), SUM(str_STATUT='ACHETE' AND dt_ENVOI IS NULL), SUM(dt_ENVOI IS NOT NULL AND str_CANAL='SMS')" + w).split('\t').map(Number);
    const nMois = Number(q("SELECT COUNT(DISTINCT DATE_FORMAT(dt_PREVU, '%Y-%m'))" + w));
    const an = await p.evaluate(() => { const h = Ext.ComponentQuery.query('rappelstraitement')[0], d = h.down('#anContenu').getEl().dom;
      return { tuiles: [...d.querySelectorAll('.pml-tuile')].map((t) => t.querySelector('.pml-tuile-valeur').textContent), mois: d.querySelectorAll('tr.rp-mois').length,
        sms: (h.donnees.total.canaux || {}).SMS || 0, envoyes: d.querySelectorAll('.pml-tuile')[4].textContent }; });
    ok('Tuiles = requête indépendante (rappels, à préparer, préparés, écartés, envoyés, rachetés après / sans rappel)',
      JSON.stringify(an.tuiles.map(Number)) === JSON.stringify([att[0], att[1], att[2], att[3], att[4], att[5], att[6]]), JSON.stringify({ ecran: an.tuiles, attendu: att }));
    ok('Envoyés par canal (SMS ' + att[7] + ')', an.sms === att[7] && /SMS/.test(an.envoyes), an.envoyes);
    ok('Une ligne par mois de la période (' + nMois + ')', an.mois === nMois, an.mois);
    await p.evaluate(() => { const d = Ext.ComponentQuery.query('rappelstraitement')[0].down('#anContenu').getEl().dom; d.querySelector('[data-statut=ECARTE]').setAttribute('data-e2e', 'tuile'); });
    await p.click('[data-e2e=tuile]');
    await p.waitForFunction(() => { const l = Ext.ComponentQuery.query('rappelshabitude')[0]; return l.isVisible() && !l.getStore().isLoading(); }, null, { timeout: 30000 });
    await p.waitForTimeout(300);
    const liste = await p.evaluate((id) => { const l = Ext.ComponentQuery.query('rappelshabitude')[0], s = l.getStore();
      return { statut: l.down('#statut').getValue(), du: l.down('#du').getSubmitValue(), ecartes: s.getCount() === s.queryBy((r) => r.get('statut') === 'ECARTE').getCount(), essai: !!s.getById(id), n: s.getCount() }; }, R(3));
    ok('Tuile « Écartés » : la liste des écartés de la période s\'ouvre', liste.statut === 'ECARTE' && liste.du === crit.dtStart && liste.ecartes && liste.essai, JSON.stringify(liste));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : client, rappels, messages et modèle de l\'essai retirés', q(`SELECT (SELECT COUNT(*) FROM t_rappel_habitude WHERE lg_CLIENT_ID = '${C}')`
      + ` + (SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${C}') + (SELECT COUNT(*) FROM notification WHERE entity_ref = '${C}') + (SELECT COUNT(*) FROM modele_message WHERE id = '${MWA}')`) === '0');
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
