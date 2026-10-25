/* CAMPAGNES : SUIVI MESSAGE PAR MESSAGE (retours du 25/10, point 14).
 *
 * Jeu d'essai : une campagne envoyee le jour meme a 5 clients d'essai (WhatsApp) : 1 lu et repondu (le client a ecrit
 * dans les 7 jours), 1 distribue, 1 envoye, 1 en echec, 1 ecarte (motif). Retire a la fin.
 * Par les vues (admin), Campagnes SMS / WhatsApp > Campagnes > Journal :
 *  - la ligne de la campagne donne Distribués 2, Lus 1, Répondus 1, Échecs 1 ;
 *  - un clic sur la ligne affiche, sous le journal (pas de fenetre), le suivi : un client par ligne avec son etat
 *    (Lu, Distribué, Envoyé, Échec, Exclu + motif) et « Répondu » ; les totaux au-dessus ;
 *  - un message passe a « lu » : le suivi se met a jour seul (toutes les 20 s) ;
 *  - la reponse du serveur ne contient aucun texte de message ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAMP = 'E2E-CSUIVI', TEXTE = 'E2ETEXTESECRETREPONSE';
const CLIENTS = [['LU', '22990000901'], ['DELIVRE', '22990000902'], ['ENVOYE', '22990000903'], ['ECHEC', '22990000904'], ['EXCLU', '22990000905']];

function nettoyer() {
  q(`DELETE FROM whatsapp_discussion WHERE numero LIKE '2299000090%'; DELETE FROM whatsapp_message WHERE id LIKE 'E2E-CSUIVI-%';`
    + ` DELETE FROM t_campagne_ligne WHERE campagne_id = '${CAMP}'; DELETE FROM t_campagne WHERE id = '${CAMP}';`
    + " DELETE FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-CSUIVI-%';");
}

(async () => {
  nettoyer();
  q(`INSERT INTO t_campagne (id, categorie, origine, statut, canal, nb_cibles, nb_envoyes, nb_exclus, created_at, traitee_at)`
    + ` VALUES ('${CAMP}', 'INFO_CLIENTS', 'MANUEL', 'ENVOYEE', 'WHATSAPP', 5, 4, 1, NOW(), NOW() + INTERVAL 1 DAY)`);
  CLIENTS.forEach(([s, tel], i) => {
    const id = 'E2E-CSUIVI-' + i;
    q(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${id}', 'E2ESUIVI', '${s}', '${tel}', '6', 'enable', NOW())`);
    q(`INSERT INTO t_campagne_ligne (campagne_id, lg_CLIENT_ID, retenu, statut, motif, lg_NOTIFICATION_ID) VALUES ('${CAMP}', '${id}', ${s === 'EXCLU' ? "b'0', 'EXCLU', 'Sans numéro'" : "b'1', 'PREPARE', NULL"}, ${s === 'EXCLU' ? 'NULL' : `'E2E-CSUIVI-N${i}'`})`);
    if (s !== 'EXCLU') {
      q(`INSERT INTO whatsapp_message (id, notification_id, client_id, telephone, mode, simule, statut, created_at) VALUES ('E2E-CSUIVI-${i}', 'E2E-CSUIVI-N${i}', '${id}', '${tel}', 'WEB', 0, '${s}', NOW() - INTERVAL 1 HOUR)`);
    }
  });
  /* le client « LU » repond ; le client « DELIVRE » avait ecrit AVANT l'envoi (ce n'est pas une reponse) */
  q(`INSERT INTO whatsapp_discussion (numero, sens, type, texte, created_at) VALUES ('22990000901', 'E', 'TEXTE', '${TEXTE}', NOW()),`
    + ` ('22990000902', 'E', 'TEXTE', '${TEXTE}', NOW() - INTERVAL 3 HOUR)`);

  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = [], dialogues = [];
  let reponseSuivi = '';
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('response', async (r) => { if (/campagnes\/E2E-CSUIVI\/suivi/.test(r.url())) { reponseSuivi = await r.text().catch(() => ''); } });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'Campagnes SMS / WhatsApp', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes')[0].down('#ongletJournal').tab.getEl().dom.id));
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagnes #journal')[0].getStore().findExact('id', 'E2E-CSUIVI') >= 0, null, { timeout: 30000 });
    const l = await p.evaluate(() => { const g = Ext.ComponentQuery.query('campagnes #journal')[0]; const r = g.getStore().getAt(g.getStore().findExact('id', 'E2E-CSUIVI'));
      const cols = g.columns.map((c) => c.text); return { d: r.get('distribues'), l: r.get('lus'), rep: r.get('repondus'), e: r.get('echecs'), cols }; });
    ok('Journal : Distribués 2, Lus 1, Répondus 1, Échecs 1 (colonnes affichées)', l.d === 2 && l.l === 1 && l.rep === 1 && l.e === 1
      && ['Distribués', 'Lus', 'Répondus', 'Échecs'].every((t) => l.cols.includes(t)), JSON.stringify(l));
    const cellule = await p.evaluate(() => { const g = Ext.ComponentQuery.query('campagnes #journal')[0]; const i = g.getStore().findExact('id', 'E2E-CSUIVI');
      return g.getView().getNode(i).id; });
    await p.click('#' + cellule + ' td:nth-child(2)');
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('campagnes #suivi')[0]; return s && s.isVisible(true) && s.getStore().getCount() === 5; }, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const s = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('campagnes #suivi')[0], j = Ext.ComponentQuery.query('campagnes #journal')[0];
      const lignes = {}; g.getStore().each((r) => { lignes[r.get('client').split(' ').pop()] = r.get('etat') + (r.get('repondu') ? '+R' : '') + (r.get('motif') ? ':' + r.get('motif') : ''); });
      const rj = j.getEl().dom.getBoundingClientRect(), rs = g.getEl().dom.getBoundingClientRect();
      return { lignes, totaux: Ext.ComponentQuery.query('campagnes #suiviTotaux')[0].getEl().dom.innerText, dessous: rs.top >= rj.bottom - 2,
        fenetres: Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length };
    });
    ok('Suivi sous le journal, sans fenêtre', s.dessous && s.fenetres === 0, JSON.stringify(s));
    ok('Un état par client (Lu + répondu, Distribué, Envoyé, Échec, Exclu + motif)', JSON.stringify(s.lignes, Object.keys(s.lignes).sort()) === JSON.stringify({ DELIVRE: 'Distribué', ECHEC: 'Échec', ENVOYE: 'Envoyé', EXCLU: 'Exclu:Sans numéro', LU: 'Lu+R' }), JSON.stringify(s.lignes));
    ok('Totaux : 3 envoyés, 2 distribués, 1 lu, 1 répondu, 1 échec', /Envoyés\s*:?\s*3/.test(s.totaux) && /Distribués\s*:?\s*2/.test(s.totaux) && /Lus\s*:?\s*1/.test(s.totaux)
      && /Répondus\s*:?\s*1/.test(s.totaux) && /Échecs\s*:?\s*1/.test(s.totaux), s.totaux);
    /* evolution des envois : le message « ENVOYE » est lu ; le suivi se met a jour seul (20 s) */
    q("UPDATE whatsapp_message SET statut = 'LU' WHERE id = 'E2E-CSUIVI-2'");
    const evolue = await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('campagnes #suivi')[0]; const r = g.getStore().findRecord('client', 'E2ESUIVI ENVOYE');
      return r && r.get('etat') === 'Lu'; }, null, { timeout: 30000 }).then(() => true).catch(() => false);
    ok('Évolution des envois : le suivi se met à jour seul', evolue && /Lus\s*:\s*2/.test(await p.evaluate(() => Ext.ComponentQuery.query('campagnes #suiviTotaux')[0].getEl().dom.innerText)));
    ok('Aucun texte de message dans la réponse du serveur', reponseSuivi.length > 0 && !reponseSuivi.includes(TEXTE), reponseSuivi.length);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_campagne WHERE id = '${CAMP}'`) === '0' && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-CSUIVI-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
