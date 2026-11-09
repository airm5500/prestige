/* AVIS CLIENTS : REPONSE PAR LE MEME ENVOI QUE LES DISCUSSIONS WHATSAPP (plan avoir du 08/11, point 10).
 *
 * « Ce menu pourra utiliser WhatsApp Web pour répondre ? » La reponse a un avis part par l'envoi des discussions (mode
 * par defaut : WhatsApp Web quand c'est le compte actif) et entre dans le fil du client, avec son etat d'envoi.
 * Chemin reel : menu AVIS CLIENTS > Avis clients, recherche « Contient », clic sur l'avis, texte, « Envoyer la
 * réponse » ; puis CAMPAGNES SMS / WHATSAPP > Discussions WhatsApp.
 * L'envoi est remplace par un faux : un faux service WhatsApp Web lance par le test (port 3991, aucun vrai message),
 * ou le mode test du compte API (simulation). Le vrai service du poste n'est pas touche ; les comptes sont remis.
 * Cas :
 *  A. WhatsApp Web, envoi accepte : avis (reponse, canal, etat) = fil (texte, etat) = ecran du fil = base ; une trace
 *     d'envoi et un message dans le fil, un seul appel au service ;
 *  B. API WhatsApp (mode test : simule) : meme rapprochement, aucun appel au faux service ;
 *  C. e-mail : avis « Traité » par e-mail, rien dans le fil ni au journal WhatsApp ;
 *  D. client qui refuse d'etre recontacte : pas de zone de reponse ; le serveur refuse ; aucune trace ;
 *  E. echec d'envoi (le service repond une erreur) : « ÉCHEC » reste affiche a l'avis (detail et liste), texte
 *     conserve, avis non traite ; le fil garde le message « échec » ; une seule trace ;
 *  F. client qui a demande l'arret (STOP) : refuse, avis en echec, ni message ni trace d'envoi.
 * Les avis, clients, messages et traces de l'essai sont retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const { execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const lit = (s) => (s === null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'");

const MARQUE = 'ZZAVFIL';
const PORT_FAUX = 3991, JETON_FAUX = 'jeton-essai-avis-fil-' + Date.now();
/* numeros de l'essai : aucun client de la base ne doit les porter (verifie au debut) */
const N = { A: '0709990101', B: '0709990102', D: '0709990104', E: '0709990105', F: '0709990106' };
const NUMS = '(' + Object.values(N).map(lit).join(',') + ')';
const EMAIL_C = 'zzavfil@exemple.invalid';
const TEXTES = {
  A: 'Bonjour, merci pour votre avis (WhatsApp Web). {prenom} reste tel quel.',
  B: 'Bonjour, merci pour votre avis (API WhatsApp).',
  C: 'Bonjour, merci pour votre avis (e-mail).',
  E: 'Bonjour, merci pour votre avis (envoi en échec).',
  F: 'Bonjour, merci pour votre avis (client STOP).'
};

/* faux service WhatsApp Web : POST /messages rend un identifiant, ou une erreur en mode echec */
let modeFaux = 'ok';
const recus = [];
const faux = http.createServer((req, rep) => {
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => {
    const autorise = req.headers.authorization === 'Bearer ' + JETON_FAUX;
    if (req.method === 'GET' && req.url.startsWith('/etat')) {
      rep.writeHead(autorise ? 200 : 401, { 'Content-Type': 'application/json' });
      return rep.end(JSON.stringify({ etat: 'CONNECTE', faux: true }));
    }
    if (req.method === 'POST' && req.url.startsWith('/messages')) {
      let j = {}; try { j = JSON.parse(corps); } catch (e) { j = {}; }
      recus.push({ to: j.to, text: j.text, autorise });
      if (!autorise || modeFaux === 'echec') {
        rep.writeHead(500, { 'Content-Type': 'application/json' });
        return rep.end(JSON.stringify({ erreur: 'panne simulée' }));
      }
      rep.writeHead(200, { 'Content-Type': 'application/json' });
      return rep.end(JSON.stringify({ id: 'FAUX-' + recus.length }));
    }
    rep.writeHead(404); rep.end();
  });
});

function nettoyer() {
  q("DELETE FROM t_avis_client WHERE texte LIKE '" + MARQUE + "%';"
    + 'DELETE FROM whatsapp_discussion WHERE numero IN ' + NUMS + ';'
    + "DELETE FROM whatsapp_message WHERE telephone IN " + NUMS + " AND created_at >= '" + DEBUT + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID = 'E2E-AVFIL-STOP';");
}
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');

(async () => {
  await new Promise((r) => faux.listen(PORT_FAUX, '127.0.0.1', r));
  /* comptes et mode par defaut gardes en base (les jetons ne passent pas par le test) */
  q('DROP TABLE IF EXISTS zz_e2e_avfil_compte; CREATE TABLE zz_e2e_avfil_compte AS SELECT * FROM whatsapp_compte;'
    + "DROP TABLE IF EXISTS zz_e2e_avfil_param; CREATE TABLE zz_e2e_avfil_param AS SELECT str_KEY, str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';");
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const LOG = ENV_E2E.JOURNAL_SERVEUR;
  const tailleLog = LOG && fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
  const compteWeb = (actif, test) => q(`UPDATE whatsapp_compte SET actif = ${actif}, mode_test = ${test}, web_url = 'http://127.0.0.1:${PORT_FAUX}', web_jeton = ${lit(JETON_FAUX)} WHERE mode = 'WEB';`);
  const modeDefaut = (m) => q(`UPDATE t_parameters SET str_VALUE = '${m}' WHERE str_KEY = 'KEY_WHATSAPP_MODE_DEFAUT';`);
  const traces = (num) => q(`SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM whatsapp_message WHERE telephone = '${num}' AND created_at >= '${DEBUT}'),`
    + ` (SELECT COUNT(*) FROM whatsapp_discussion WHERE numero = '${num}'))`);
  const avis = (cle) => q(`SELECT CONCAT_WS('|', statut, IFNULL(canal_reponse, '-'), IFNULL(statut_reponse, '-'), IFNULL(reponse, '-')) FROM t_avis_client WHERE texte = '${MARQUE} ${cle}'`);
  try {
    nettoyer();
    const pris = q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID NOT LIKE 'E2E-%' AND (" + Object.values(N).map((n) => `REPLACE(REPLACE(str_ADRESSE,' ',''),'.','') LIKE '%${n.slice(2)}'`).join(' OR ') + ')');
    if (pris !== '0') { throw new Error('Un client de la base porte un numéro de l\'essai : essai arrêté.'); }
    /* avis de l'essai : notes et coordonnees differentes d'un cas a l'autre */
    q('INSERT INTO t_avis_client (id, dt_CREATED, note, texte, anonyme, nom, telephone, email, rappel, statut) VALUES'
      + ` ('E2E-AVFIL-A', NOW(), 1, '${MARQUE} A', 0, 'Awa A.', '07 09 99 01 01', NULL, 1, 'NOUVEAU'),`
      + ` ('E2E-AVFIL-B', NOW(), 4, '${MARQUE} B', 0, 'Ble B.', '${N.B}', NULL, 1, 'NOUVEAU'),`
      + ` ('E2E-AVFIL-C', NOW(), 5, '${MARQUE} C', 0, 'Cisse C.', NULL, '${EMAIL_C}', 1, 'NOUVEAU'),`
      + ` ('E2E-AVFIL-D', NOW(), 2, '${MARQUE} D', 0, 'Diallo D.', '${N.D}', NULL, 0, 'NOUVEAU'),`
      + ` ('E2E-AVFIL-E', NOW(), 3, '${MARQUE} E', 0, 'Essoh E.', '${N.E}', NULL, 1, 'LU'),`
      + ` ('E2E-AVFIL-F', NOW(), 1, '${MARQUE} F', 0, 'Fofana F.', '${N.F}', NULL, 1, 'NOUVEAU');`
      + "INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, str_SEXE, dt_CREATED, dt_UPDATED, str_STATUT, bool_CONSENT_WHATSAPP)"
      + ` VALUES ('E2E-AVFIL-STOP', 'Fanta', 'ZZAVFIL', '1', '${N.F}', 'F', NOW(), NOW(), 'enable', 0);`);
    compteWeb(1, 0);
    modeDefaut('WEB');

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'AVIS CLIENTS', 'Avis clients');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; return v && v.isVisible(true) && v.droits && v.droits.success; }, null, { timeout: 60000 });
    const attendre = () => p.waitForFunction(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; return v && !v.getEl().isMasked() && !v.down('#grilleAvis').getStore().isLoading(); }, null, { timeout: 30000 });

    /* ouvre l'avis d'un cas : recherche « Contient », puis clic sur la ligne */
    const ouvrir = async (cle) => {
      await cliquer(p, 'avisclients #contient');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(MARQUE + ' ' + cle, { delay: 30 });
      await p.waitForFunction((t) => { const g = Ext.ComponentQuery.query('avisclients #grilleAvis')[0]; const s = g.getStore();
        return !s.isLoading() && s.getCount() === 1 && s.getAt(0).get('texte') === t; }, MARQUE + ' ' + cle, { timeout: 20000 });
      await attendre();
      await p.evaluate(() => Ext.ComponentQuery.query('avisclients #grilleAvis')[0].getView().getNode(0).setAttribute('data-e2e', 'ligneAvis'));
      await p.click('[data-e2e=ligneAvis]');
      await p.waitForFunction((t) => { const v = Ext.ComponentQuery.query('avisclients')[0]; return v.avis && v.avis.texte === t && v.down('#traitement').isVisible(); }, MARQUE + ' ' + cle, { timeout: 15000 });
    };
    /* ecrit la reponse et clique « Envoyer la réponse » ; rend le message affiche sous le bouton */
    const repondre = async (texte) => {
      await cliquer(p, 'avisclients #texteReponse');
      await p.keyboard.press('Control+A');
      await p.keyboard.press('Backspace');
      await p.keyboard.type(texte);
      await cliquer(p, 'avisclients #envoyerReponse');
      await p.waitForFunction(() => Ext.ComponentQuery.query('avisclients #etatReponse')[0].getEl().dom.textContent.trim() !== '', null, { timeout: 30000 });
      await attendre();
      return p.evaluate(() => { const v = Ext.ComponentQuery.query('avisclients')[0];
        return { etat: v.down('#etatReponse').getEl().dom.textContent, detail: v.down('#detail').getEl().dom.textContent, saisie: v.down('#texteReponse').getValue(),
          ligne: v.down('#grilleAvis').getView().getNode(0).textContent }; });
    };

    /* ---------------------------------------------------------------- A : WhatsApp Web */
    let avant = traces(N.A);
    await ouvrir('A');
    const ecranA = await repondre(TEXTES.A);
    const avisA = avis('A');
    const filA = q(`SELECT CONCAT_WS('|', d.sens, d.statut, d.message_id, d.lg_USER_ID = u.lg_USER_ID, d.texte) FROM whatsapp_discussion d JOIN t_user u ON u.str_LOGIN = '${ENV_E2E.LOGIN}' WHERE d.numero = '${N.A}'`);
    const journalA = q(`SELECT CONCAT_WS('|', mode, statut, simule, message_id) FROM whatsapp_message WHERE telephone = '${N.A}' AND created_at >= '${DEBUT}'`);
    ok('A. WhatsApp Web : le faux service a reçu une seule demande, au bon numéro, avec le texte tel quel', recus.length === 1 && recus[0].autorise && recus[0].to === '225' + N.A && recus[0].text === TEXTES.A, JSON.stringify(recus));
    ok('A. Avis : « Traité », WhatsApp, envoyé, réponse gardée', avisA === 'TRAITE|WHATSAPP|ENVOYE|' + TEXTES.A, avisA);
    ok('A. Fil du client : la réponse, sortante, « envoyé », son identifiant WhatsApp et son auteur', filA === 'S|ENVOYE|FAUX-1|1|' + TEXTES.A, filA);
    ok('A. Journal des envois : mode WEB, envoyé, même identifiant', journalA === 'WEB|ENVOYE|0|FAUX-1', journalA);
    ok('A. Bilan : une trace d\'envoi et un message dans le fil, ni plus ni moins', avant === '0|0' && traces(N.A) === '1|1', avant + ' -> ' + traces(N.A));
    ok('A. Écran de l\'avis : réponse affichée, ligne « ✓ WhatsApp »', /accepté/i.test(ecranA.etat) && ecranA.detail.includes(TEXTES.A) && /✓ WhatsApp/.test(ecranA.ligne), JSON.stringify(ecranA));

    /* ---------------------------------------------------------------- B : API WhatsApp (mode test) */
    modeDefaut('API');
    q("UPDATE whatsapp_compte SET mode_test = 1 WHERE mode = 'API';");
    avant = traces(N.B);
    await ouvrir('B');
    const ecranB = await repondre(TEXTES.B);
    const avisB = avis('B');
    const filB = q(`SELECT CONCAT_WS('|', sens, statut, texte) FROM whatsapp_discussion WHERE numero = '${N.B}'`);
    const journalB = q(`SELECT CONCAT_WS('|', mode, statut, simule) FROM whatsapp_message WHERE telephone = '${N.B}' AND created_at >= '${DEBUT}'`);
    ok('B. API WhatsApp (simulée) : avis « Traité », WhatsApp, simulé', avisB === 'TRAITE|WHATSAPP|SIMULE|' + TEXTES.B, avisB);
    ok('B. Fil = avis : la réponse, « simulé »', filB === 'S|SIMULE|' + TEXTES.B, filB);
    ok('B. Journal : mode API, simulé ; le service WhatsApp Web n\'est pas appelé', journalB === 'API|SIMULE|1' && recus.length === 1, journalB + ' / ' + recus.length);
    ok('B. Bilan : une trace, un message', avant === '0|0' && traces(N.B) === '1|1', traces(N.B));
    ok('B. Écran : « (simulée) » et « ✓ WhatsApp »', /simulé/i.test(ecranB.etat) && /simulée/.test(ecranB.detail) && /✓ WhatsApp/.test(ecranB.ligne), JSON.stringify(ecranB));
    modeDefaut('WEB');

    /* ---------------------------------------------------------------- C : e-mail */
    const msgAvantC = q(`SELECT COUNT(*) FROM whatsapp_message WHERE created_at >= '${DEBUT}'`), filAvantC = q('SELECT COUNT(*) FROM whatsapp_discussion');
    await ouvrir('C');
    const canalC = await p.evaluate(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; return { canal: v.down('#canal').getValue().avCanal, wa: v.down('#canalWhatsapp').isDisabled() }; });
    const ecranC = await repondre(TEXTES.C);
    const avisC = avis('C');
    ok('C. E-mail (pas de numéro) : e-mail choisi, WhatsApp grisé', canalC.canal === 'EMAIL' && canalC.wa, JSON.stringify(canalC));
    ok('C. Avis « Traité » par e-mail ; rien dans le fil ni au journal WhatsApp', avisC === 'TRAITE|EMAIL|ENVOYE|' + TEXTES.C
      && q(`SELECT COUNT(*) FROM whatsapp_message WHERE created_at >= '${DEBUT}'`) === msgAvantC && q('SELECT COUNT(*) FROM whatsapp_discussion') === filAvantC && recus.length === 1, avisC);
    ok('C. Écran : ligne « ✓ E-mail »', /✓ E-mail/.test(ecranC.ligne), ecranC.ligne);

    /* ---------------------------------------------------------------- D : refuse d'etre recontacte */
    await ouvrir('D');
    const ecranD = await p.evaluate(() => { const v = Ext.ComponentQuery.query('avisclients')[0]; return { bloc: v.down('#blocReponse').isVisible(), sans: v.down('#sansReponse').isVisible() }; });
    const idD = 'E2E-AVFIL-D';
    const refusD = await p.evaluate((id) => fetch('../api/v1/avis-clients/avis/' + id + '/repondre', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canal: 'WHATSAPP', texte: 'Bonjour' }) }).then((r) => r.json()), idD);
    ok('D. Client qui refuse d\'être recontacté : pas de zone de réponse à l\'écran', !ecranD.bloc && ecranD.sans, JSON.stringify(ecranD));
    ok('D. Le serveur refuse aussi ; avis inchangé, aucune trace, aucun message', refusD.success === false && /pas accepté/.test(refusD.message)
      && avis('D') === 'LU|-|-|-' && traces(N.D) === '0|0' && recus.length === 1, JSON.stringify(refusD) + ' ' + avis('D'));

    /* ---------------------------------------------------------------- E : echec d'envoi */
    modeFaux = 'echec';
    avant = traces(N.E);
    await ouvrir('E');
    const ecranE = await repondre(TEXTES.E);
    const avisE = avis('E');
    const filE = q(`SELECT CONCAT_WS('|', sens, statut, texte) FROM whatsapp_discussion WHERE numero = '${N.E}'`);
    ok('E. Échec : le faux service a reçu la demande et répondu une erreur', recus.length === 2 && recus[1].to === '225' + N.E, recus.length);
    ok('E. Avis : « ÉCHEC » gardé, avis non traité, pas de réponse enregistrée', avisE === 'LU|WHATSAPP|ECHEC|-', avisE);
    ok('E. Fil : le message, « échec »', filE === 'S|ECHEC|' + TEXTES.E, filE);
    ok('E. Bilan : une trace d\'envoi (échec) et un message dans le fil', avant === '0|0' && traces(N.E) === '1|1'
      && q(`SELECT statut FROM whatsapp_message WHERE telephone = '${N.E}' AND created_at >= '${DEBUT}'`) === 'ECHEC', traces(N.E));
    ok('E. Écran : échec annoncé, détail « a échoué », ligne « ✗ Échec », texte saisi conservé', /refusé|échou/i.test(ecranE.etat) && /a échoué/.test(ecranE.detail)
      && /Échec/.test(ecranE.ligne) && ecranE.saisie === TEXTES.E, JSON.stringify(ecranE));
    modeFaux = 'ok';

    /* ---------------------------------------------------------------- F : client STOP */
    await ouvrir('F');
    const ecranF = await repondre(TEXTES.F);
    const avisF = avis('F');
    ok('F. Client STOP : refusé, « ÉCHEC » à l\'avis ; ni message dans le fil, ni trace, ni appel au service', /STOP/.test(ecranF.etat) && avisF === 'LU|WHATSAPP|ECHEC|-'
      && traces(N.F) === '0|0' && recus.length === 2, ecranF.etat + ' ' + avisF);

    /* ---------------------------------------------------------------- fil a l'ecran = avis = base */
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Discussions WhatsApp');
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappdiscussions').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    const bulle = async (num) => {
      await cliquer(p, 'whatsappdiscussions #recherche');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(num, { delay: 30 });
      await p.waitForTimeout(1500);
      await p.waitForFunction((n) => document.querySelectorAll('.wad .wad-item[data-numero="' + n + '"]').length === 1, num, { timeout: 30000 });
      await p.click('.wad .wad-item[data-numero="' + num + '"]');
      await p.waitForFunction(() => document.querySelectorAll('.wad .wad-fil .wad-msg.wad-S').length >= 1, null, { timeout: 20000 });
      await p.waitForTimeout(500);
      return p.evaluate(() => Array.from(document.querySelectorAll('.wad .wad-fil .wad-msg.wad-S')).map((m) => ({ texte: m.childNodes[0].textContent, meta: m.querySelector('.wad-meta').textContent })));
    };
    const ecranFilA = await bulle(N.A), ecranFilB = await bulle(N.B), ecranFilE = await bulle(N.E);
    ok('Fil à l\'écran (A) = avis = base : même texte, « envoyé », auteur', ecranFilA.length === 1 && ecranFilA[0].texte === TEXTES.A && /envoyé/.test(ecranFilA[0].meta), JSON.stringify(ecranFilA));
    ok('Fil à l\'écran (B) : même texte, « simulé »', ecranFilB.length === 1 && ecranFilB[0].texte === TEXTES.B && /simulé/.test(ecranFilB[0].meta), JSON.stringify(ecranFilB));
    ok('Fil à l\'écran (E) : même texte, « échec »', ecranFilE.length === 1 && ecranFilE[0].texte === TEXTES.E && /échec/.test(ecranFilE[0].meta), JSON.stringify(ecranFilE));
    const absents = await p.evaluate((n) => n.filter((x) => document.querySelector('.wad .wad-item[data-numero="' + x + '"]')), [N.D, N.F]);
    ok('Pas de fil pour D (refus) ni F (STOP)', absents.length === 0, absents.join(','));

    if (LOG && fs.existsSync(LOG)) {
      const log = fs.readFileSync(LOG, 'utf8').slice(tailleLog);
      ok('Journal du serveur : ni le texte des réponses, ni les numéros, ni le jeton', !/merci pour votre avis/i.test(log) && !/0999010|09990101|09990105/.test(log) && !log.includes(JETON_FAUX));
    }
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => {});
    try {
      nettoyer();
      q('UPDATE whatsapp_compte c JOIN zz_e2e_avfil_compte s ON s.mode = c.mode SET c.actif = s.actif, c.mode_test = s.mode_test, c.web_url = s.web_url,'
        + ' c.web_jeton = s.web_jeton, c.web_repertoire = s.web_repertoire, c.updated_at = s.updated_at, c.updated_by = s.updated_by;'
        + 'UPDATE t_parameters t JOIN zz_e2e_avfil_param s ON s.str_KEY = t.str_KEY SET t.str_VALUE = s.str_VALUE;'
        + 'DROP TABLE zz_e2e_avfil_compte; DROP TABLE zz_e2e_avfil_param;');
      ok('Données de l\'essai retirées, comptes et mode par défaut remis', q("SELECT COUNT(*) FROM t_avis_client WHERE texte LIKE '" + MARQUE + "%'") === '0'
        && traces(N.A) === '0|0' && q("SELECT COUNT(*) FROM whatsapp_compte WHERE web_url LIKE '%:" + PORT_FAUX + "%'") === '0');
    } catch (e) { ok('Remise en état', false, e.message); }
    faux.close();
    const echecs = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' contrôles réussis');
    process.exit(echecs ? 1 : 0);
  }
})();
