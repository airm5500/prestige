/* PLAN DU 09/11, POINT 13 : TOUT ENVOI WHATSAPP EST RETRACE, AVEC SON ORIGINE, SON UTILISATEUR ET SON SUIVI.
 *
 * Par les vues, avec de vrais clics. Sans numero d'administration regle (fichier de configuration du poste), le
 * ticket Z ne part pas : le test verifie alors la trace « Non envoye » ; l'envoi simule est verifie par le meme chemin
 * (envoyerTexte, origine TICKET_Z) quand un numero est regle.
 *
 *  1. Ticket Z > « Envoyer WhatsApp » : une ligne de journal WhatsApp d'origine TICKET_Z, avec l'utilisateur connecte,
 *     et une ligne du journal des evenements « Ticket Z envoye au pharmacien (WhatsApp) : ... » (jamais le texte) ;
 *  2. Comptes WhatsApp > « Envoyer un essai » : une ligne d'origine ESSAI, avec l'utilisateur ;
 *  3. Suivi conso clients > campagne WhatsApp assistee > clic sur le lien wa.me : une ligne d'origine LIEN, statut
 *     OUVERT, avec le client et l'utilisateur (le site wa.me n'est pas ouvert : la requete est bloquee) ;
 *  4. Comptes WhatsApp, grille « Derniers envois » : colonnes Origine, Utilisateur et Suivi ; ecran = API = base,
 *     ligne par ligne ; l'indicateur suit le statut (simule : 1 pastille ; distribue : 3 ; lu : 4 ; lien ouvert : 2 ;
 *     echec : rouge) apres actualisation.
 * Bilan : exactement les lignes attendues (journal WhatsApp, journal des evenements), ni plus ni moins.
 * Securite : comptes WhatsApp en mode test (aucun vrai message), aucun SMS ; tout est retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const MODES_TEST = q("SELECT CONCAT(mode, '=', mode_test) FROM whatsapp_compte").split('\n').filter(Boolean);
const remettreModes = () => MODES_TEST.forEach((l) => { const [m, v] = l.split('='); q(`UPDATE whatsapp_compte SET mode_test = ${Number(v)} WHERE mode = '${m}'`); });
const JOURNAL_AVANT = new Set(q('SELECT id FROM whatsapp_message').split('\n').filter(Boolean));
const EVT_AVANT = new Set(q("SELECT lg_EVENT_LOG_ID FROM t_event_log WHERE dt_CREATED >= NOW() - INTERVAL 1 DAY").split('\n').filter(Boolean));
const nouvelles = () => q("SELECT CONCAT_WS('|', id, IFNULL(origine, ''), IFNULL(utilisateur_id, ''), statut, mode, IFNULL(client_id, ''), IFNULL(notification_id, '')) FROM whatsapp_message WHERE created_at >= NOW() - INTERVAL 1 HOUR ORDER BY created_at")
  .split('\n').filter(Boolean).map((l) => l.split('|')).filter((c) => !JOURNAL_AVANT.has(c[0]));
const evenements = () => q("SELECT CONCAT_WS('|', lg_EVENT_LOG_ID, IFNULL(lg_USER_ID, ''), IFNULL(str_DESCRIPTION, ''), IFNULL(typeLog, '')) FROM t_event_log WHERE dt_CREATED >= NOW() - INTERVAL 1 HOUR AND str_DESCRIPTION LIKE 'Ticket Z envoy%'")
  .split('\n').filter(Boolean).map((l) => l.split('|')).filter((c) => !EVT_AVANT.has(c[0]));
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1`);
const CLIENT = 'E2E-TRACE-WA-1011';
const NOM = 'ZZTRACEWA';

(async () => {
  let b = null;
  const dialogues = [], erreurs = [];
  try {
    q('UPDATE whatsapp_compte SET mode_test = 1');
    q(`DELETE FROM t_client WHERE lg_CLIENT_ID = '${CLIENT}'`);
    q("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, str_ADRESSE, str_SEXE, dt_NAISSANCE, dt_CREATED, dt_UPDATED, str_STATUT)"
      + ` VALUES ('${CLIENT}', '${NOM}', 'ESSAI', '1', '0707070731', 'F', '1990-03-03', NOW(), NOW(), 'enable')`);
    q(`UPDATE t_client SET bool_CONSENT_WHATSAPP = 1 WHERE lg_CLIENT_ID = '${CLIENT}'`);
    /* « Suivi de consommation » ne liste que les clients qui ont une vente close : une vente minimale, sans ligne ni
       mouvement (aucun stock, aucune caisse touches), retiree a la fin */
    q(`DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${CLIENT}'`);
    q("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, lg_CLIENT_ID, str_STATUT, b_IS_CANCEL, int_PRICE, dt_CREATED, dt_UPDATED)"
      + ` VALUES ('${CLIENT}', '${CLIENT}', 'is_Closed', 0, 1000, NOW(), NOW())`);
    ok('Préparation : comptes WhatsApp en mode test, client d\'essai créé', q('SELECT COUNT(*) FROM whatsapp_compte WHERE mode_test <> 1') === '0' && !!USER);

    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
    /* le site wa.me n'est jamais ouvert : la requete est bloquee */
    await ctx.route(/wa\.me/, (r) => r.abort());
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => erreurs.push(e.message));
    const sms = [];
    p.on('request', (r) => { if (/\/caisse\/send-sms|\/clients\/send-sms/.test(r.url())) { sms.push(r.url()); } });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const ouvrirEcran = async (composant) => {
      const lib = await p.evaluate((c) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
        .cascadeBy((n) => { if (!r && n.get('id') === c && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, composant);
      if (!lib) { throw new Error('Menu absent pour ' + composant); }
      await vues.ouvrirMenu(p, lib[0], lib[1]);
      await p.waitForTimeout(800);
      if (await p.locator('.prestige-nav .x-grid-row').filter({ visible: true }).count() > 0) { await p.mouse.click(1000, 33); }
    };

    /* 1. ticket Z par WhatsApp */
    await ouvrirEcran('ticketzmanager');
    await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 60000 });
    const [rep] = await Promise.all([
      p.waitForResponse((r) => r.url().indexOf('/caisse/send-whatsapp') > 0, { timeout: 30000 }).catch(() => null),
      p.click('.ticketz .x-btn:has-text("Envoyer WhatsApp")')]);
    const o = rep ? await rep.json().catch(() => ({})) : {};
    await p.waitForTimeout(800);
    let l1 = nouvelles(), e1 = evenements();
    if (o.success) {
      ok('Ticket Z : une ligne de journal WhatsApp, origine TICKET_Z, avec l\'utilisateur connecté', l1.length === 1 && l1[0][1] === 'TICKET_Z' && l1[0][2] === USER && l1[0][3] === 'SIMULE', JSON.stringify(l1));
      ok('Ticket Z : une ligne du journal des événements « … (WhatsApp) : Simulé (mode test) », même utilisateur, sans texte du ticket',
        e1.length === 1 && e1[0][2].startsWith('Ticket Z envoyé au pharmacien (WhatsApp) : Simulé (mode test)') && e1[0][1] === USER, JSON.stringify(e1));
    } else {
      ok('Ticket Z sans numéro : aucune ligne WhatsApp, une ligne d\'événement « Non envoyé »', l1.length === 0 && e1.length === 1 && /Non envoyé/.test(e1[0][2]), JSON.stringify({ o, l1, e1 }));
    }
    const typeLog = e1.length ? e1[0][3] : '';

    /* 2. essai depuis Comptes WhatsApp */
    await ouvrirEcran('whatsappcomptes');
    await p.locator('#whatsappcomptesID').waitFor({ timeout: 30000 });
    await vues.cliquer(p, 'whatsappcomptes #numeroEssai');
    await p.keyboard.type('0707070731', { delay: 15 });
    const [repEssai] = await Promise.all([
      p.waitForResponse((r) => /\/whatsapp\/test/.test(r.url()), { timeout: 30000 }).catch(() => null),
      vues.cliquer(p, 'whatsappcomptes #btnEssai')]);
    await p.waitForTimeout(1500);
    const l2 = nouvelles().filter((c) => c[1] === 'ESSAI');
    ok('Essai : une ligne d\'origine ESSAI, avec l\'utilisateur, simulée', !!repEssai && l2.length === 1 && l2[0][2] === USER && l2[0][3] === 'SIMULE', JSON.stringify(l2));

    /* 3. lien wa.me depuis Suivi conso clients */
    /* « Suivi de consommation » est un onglet de l'ecran Clients */
    await ouvrirEcran('clientmanager');
    await p.locator('.x-tab:has-text("Suivi de consommation")').filter({ visible: true }).first().click({ timeout: 30000 });
    await p.waitForFunction(() => Ext.ComponentQuery.query('suiviconsoclients #query').length > 0, null, { timeout: 30000 });
    await vues.cliquer(p, 'suiviconsoclients #query');
    await p.keyboard.type(NOM, { delay: 15 });
    await vues.cliquer(p, 'suiviconsoclients #rechercher');
    const rangee = p.locator('.x-grid-row').filter({ visible: true, hasText: NOM }).first();
    await rangee.waitFor({ timeout: 30000 });
    await rangee.locator('.x-grid-row-checker').first().click();
    await vues.cliquer(p, 'suiviconsoclients #btnCampagne');
    await p.waitForFunction(() => Ext.ComponentQuery.query('campagneclient').some((w) => w.isVisible()), null, { timeout: 20000 });
    await p.locator('label:has-text("WhatsApp (assisté par lien)")').click();
    await vues.cliquer(p, 'campagneclient #message');
    await p.keyboard.type('Essai de suivi', { delay: 10 });
    await vues.cliquer(p, 'campagneclient #btnControler');
    /* « Continuer » s'appelle « Préparer les liens WhatsApp (n) » pour le canal WhatsApp */
    await p.locator('.x-btn:has-text("Préparer les liens WhatsApp")').filter({ visible: true }).first().click({ timeout: 20000 });
    /* la ligne de la fenetre de campagne (la grille du suivi, derriere, porte le meme nom) */
    const lien = p.locator('.x-window').filter({ hasText: 'campagne clients' }).locator('.x-grid-row').filter({ hasText: NOM })
      .locator('.x-action-col-icon').first();
    await lien.waitFor({ timeout: 30000 });
    const [repLien] = await Promise.all([
      p.waitForResponse((r) => /whatsapp-lien-ouvert/.test(r.url()), { timeout: 20000 }).catch(() => null),
      lien.click()]);
    await p.waitForTimeout(800);
    for (const x of ctx.pages()) { if (x !== p) { await x.close().catch(() => {}); } }
    const l3 = nouvelles().filter((c) => c[1] === 'LIEN');
    ok('Lien wa.me ouvert : une ligne d\'origine LIEN, statut OUVERT, mode LIEN, avec le client et l\'utilisateur',
      !!repLien && l3.length === 1 && l3[0][3] === 'OUVERT' && l3[0][4] === 'LIEN' && l3[0][5] === CLIENT && l3[0][2] === USER, JSON.stringify(l3));
    await p.evaluate(() => Ext.ComponentQuery.query('campagneclient').forEach((w) => w.close()));

    /* 4. grille du journal : ecran = API = base, et l'indicateur suit le statut */
    const essai = l2[0] && l2[0][0];
    if (essai) { q(`UPDATE whatsapp_message SET statut = 'DELIVRE', updated_at = NOW() WHERE id = '${essai}'`); }
    await ouvrirEcran('whatsappcomptes');
    const lireGrille = () => p.evaluate(() => {
      const g = Ext.ComponentQuery.query('whatsappcomptes #journal')[0];
      return Array.from(g.getView().getEl().dom.querySelectorAll('.x-grid-row')).slice(0, 10).map((tr) => {
        const s = tr.querySelector('.wa-suivi'), o = tr.querySelector('.wa-origine');
        return { origine: o && o.dataset.origine, libelle: o && o.textContent, statut: s && s.dataset.statut,
          faites: s ? s.querySelectorAll('.wa-etape-faite').length : -1, pastilles: s ? s.querySelectorAll('.wa-etape').length : -1,
          etat: s && s.querySelector('.wa-etat').textContent, texte: tr.textContent };
      });
    });
    const actualiser = async () => {
      const r = p.waitForResponse((x) => /\/whatsapp\/journal/.test(x.url()), { timeout: 20000 }).catch(() => null);
      await p.locator('#whatsappcomptesID .x-tool-refresh').first().click();
      await r; await p.waitForTimeout(600);
    };
    await actualiser();
    const api = await p.evaluate(async () => (await (await fetch('../api/v1/whatsapp/journal?limite=10')).json()).data);
    const ecran = await lireGrille();
    const ecarts = [];
    api.slice(0, ecran.length).forEach((a, i) => {
      const e = ecran[i];
      if (e.origine !== a.origine || e.libelle !== a.origineLibelle || e.statut !== a.statut || e.faites !== a.etapes || e.etat !== a.etat
        || (a.utilisateur && e.texte.indexOf(a.utilisateur) < 0)) { ecarts.push(i + ' ' + JSON.stringify({ e, a })); }
    });
    ok('Grille = API, ligne par ligne (origine, libellé, utilisateur, statut, étapes, état)', api.length > 0 && ecarts.length === 0, ecarts.join(' | '));
    const base = q("SELECT CONCAT_WS('|', IFNULL(origine, ''), statut) FROM whatsapp_message ORDER BY created_at DESC LIMIT 10").split('\n').filter(Boolean);
    const ecartsBase = api.slice(0, base.length).filter((a, i) => { const [ob, sb] = base[i].split('|'); return sb !== a.statut || (ob && ob !== a.origine); });
    ok('API = base, ligne par ligne (origine enregistrée, statut)', ecartsBase.length === 0, JSON.stringify(ecartsBase).slice(0, 200));
    const parOrigine = (o) => ecran.find((e) => e.origine === o);
    const vEssai = parOrigine('ESSAI'), vLien = parOrigine('LIEN');
    ok('Indicateur : essai distribué = 3 pastilles sur 4, « Distribué »', vEssai && vEssai.faites === 3 && vEssai.pastilles === 4 && vEssai.etat === 'Distribué', JSON.stringify(vEssai));
    ok('Indicateur : lien wa.me = 2 pastilles sur 2, « Lien ouvert »', vLien && vLien.faites === 2 && vLien.pastilles === 2 && vLien.etat === 'Lien ouvert', JSON.stringify(vLien));
    if (o.success) {
      const vZ = parOrigine('TICKET_Z');
      ok('Indicateur : ticket Z simulé = 1 pastille, origine « Ticket Z »', vZ && vZ.faites === 1 && vZ.libelle === 'Ticket Z' && vZ.etat === 'Simulé (mode test)', JSON.stringify(vZ));
    }
    if (essai) { q(`UPDATE whatsapp_message SET statut = 'LU', updated_at = NOW() WHERE id = '${essai}'`); }
    await actualiser();
    const vLu = (await lireGrille()).find((e) => e.origine === 'ESSAI');
    ok('Statut passé à « lu » : l\'indicateur avance (4 pastilles, « Lu »)', vLu && vLu.faites === 4 && vLu.etat === 'Lu', JSON.stringify(vLu));
    if (essai) { q(`UPDATE whatsapp_message SET statut = 'ECHEC', updated_at = NOW() WHERE id = '${essai}'`); }
    await actualiser();
    const vEchec = (await lireGrille()).find((e) => e.origine === 'ESSAI');
    ok('Échec : aucune étape faite, « Échec »', vEchec && vEchec.faites === 0 && vEchec.etat === 'Échec', JSON.stringify(vEchec));

    /* bilan */
    const toutes = nouvelles();
    const attendu = (o.success ? 1 : 0) + 2;
    ok('Bilan : exactement ' + attendu + ' lignes WhatsApp (ticket Z, essai, lien), chacune avec origine et utilisateur', toutes.length === attendu && toutes.every((c) => c[1] && c[2] === USER), JSON.stringify(toutes));
    ok('Bilan : une seule ligne d\'événement « Ticket Z »', evenements().length === 1, JSON.stringify(evenements()));
    ok('Bilan : la ligne d\'événement porte le type « Envoi de message »', typeLog === '43' /* rang de TypeLog.ENVOI_MESSAGE (le type est enregistre par son rang) */, typeLog);
    const colonnes = q("SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_message'");
    ok('Le journal ne garde aucun texte de message', !/texte|contenu|corps|body/i.test(colonnes), colonnes);
    ok('Aucun SMS envoyé, aucune fenêtre surgissante, aucune erreur JavaScript', sms.length === 0 && dialogues.length === 0 && erreurs.length === 0, JSON.stringify({ sms, dialogues, erreurs }));
  } catch (e) {
    if (process.env.E2E_CAPTURE_ECHEC && b) { for (const c of b.contexts()) { for (const x of c.pages()) { await x.screenshot({ path: process.env.E2E_CAPTURE_ECHEC }).catch(() => {}); } } }
    ok('Parcours sans exception', false, e.stack);
  } finally {
    /* chaque retrait a part : un retrait qui echoue (ancien code, sans la colonne origine) n'empeche pas les autres */
    const sur = (f) => { try { f(); } catch (e) { console.log('retrait : ' + String(e.message).split('\n')[0]); } };
    sur(() => q("SELECT id FROM whatsapp_message WHERE created_at >= NOW() - INTERVAL 1 HOUR").split('\n').filter((i) => i && !JOURNAL_AVANT.has(i))
      .forEach((i) => q(`DELETE FROM whatsapp_message WHERE id = '${i}'`)));
    sur(() => evenements().forEach((c) => q(`DELETE FROM t_event_log WHERE lg_EVENT_LOG_ID = '${c[0]}'`)));
    sur(() => q(`DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${CLIENT}'`));
    sur(() => q(`DELETE FROM t_client WHERE lg_CLIENT_ID = '${CLIENT}'`));
    sur(remettreModes);
    let restes = -1;
    sur(() => { restes = nouvelles().length; });
    ok('Nettoyage : journaux, client d\'essai et modes WhatsApp remis', restes <= 0 && evenements().length === 0
      && q(`SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '${CLIENT}'`) === '0' && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${CLIENT}'`) === '0'
      && JSON.stringify(q("SELECT CONCAT(mode, '=', mode_test) FROM whatsapp_compte").split('\n').filter(Boolean)) === JSON.stringify(MODES_TEST));
    if (b) { await b.close(); }
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
