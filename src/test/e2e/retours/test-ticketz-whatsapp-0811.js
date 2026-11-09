/* PLAN DU 08/11, POINT 19 : TICKET Z PAR WHATSAPP.
 *  - ecran Ticket Z (GESTION COURANTE > Ticket Z) : un bouton « Envoyer WhatsApp » a cote de « Envoyer SMS » ;
 *  - meme numero que le SMS (numero d'administration), texte seul, le meme que le SMS (verifie par TicketZTexteTest) ;
 *  - l'etat s'affiche dans le bouton (aucune fenetre), puis le bouton reprend son libelle ;
 *  - le parcours envoie les filtres affiches (dates, heures, caissier, type), comme « Afficher » ;
 *  - bilan : numero regle -> exactement une ligne whatsapp_message (statut SIMULE, mode test force), sans texte ;
 *    numero absent -> refus dans le bouton et aucune ligne. Aucun SMS ne part.
 * Securite : tous les comptes WhatsApp passent en mode test pendant le test (aucun vrai message), puis reprennent
 * leur valeur ; les lignes de journal creees sont retirees.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 260) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const MODES_TEST = q("SELECT CONCAT(mode, '=', mode_test) FROM whatsapp_compte").split('\n').filter(Boolean);
const remettreModes = () => MODES_TEST.forEach((l) => { const [m, v] = l.split('='); q(`UPDATE whatsapp_compte SET mode_test = ${Number(v)} WHERE mode = '${m}'`); });
const JOURNAL_AVANT = new Set(q('SELECT id FROM whatsapp_message').split('\n').filter(Boolean));
const nouvelles = () => q("SELECT CONCAT_WS('|', id, IFNULL(telephone, ''), mode, simule, statut, IFNULL(client_id, ''), IFNULL(notification_id, '')) FROM whatsapp_message WHERE created_at >= NOW() - INTERVAL 1 HOUR")
  .split('\n').filter(Boolean).map((l) => l.split('|')).filter((c) => !JOURNAL_AVANT.has(c[0]));

(async () => {
  let b = null;
  const dialogues = [];
  try {
    /* aucun vrai message : tous les comptes en mode test */
    q('UPDATE whatsapp_compte SET mode_test = 1');
    ok('Préparation : tous les comptes WhatsApp en mode test', q('SELECT COUNT(*) FROM whatsapp_compte WHERE mode_test <> 1') === '0');

    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    const lus = [], whatsapp = [], sms = [];
    p.on('request', (r) => {
      if (r.url().indexOf('/caisse/fetch-tickez') > 0) { lus.push(JSON.parse(r.postData() || '{}')); }
      if (r.url().indexOf('/caisse/send-whatsapp') > 0) { whatsapp.push(JSON.parse(r.postData() || '{}')); }
      if (r.url().indexOf('/caisse/send-sms') > 0) { sms.push(1); }
    });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await vues.ouvrirMenu(p, 'GESTION COURANTE', 'Ticket Z');
    await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: 60000 });

    /* le bouton, a cote de « Envoyer SMS », visible et entier en 1366 x 768 */
    const place = await p.evaluate(() => {
      const t = Ext.ComponentQuery.query('ticketzmanager')[0];
      const w = t.down('#whatsapp'), s = t.down('#sms');
      if (!w) { return null; }
      const barre = w.up('toolbar'), items = barre.items.items;
      const r = w.getEl().dom.getBoundingClientRect(), rs = s.getEl().dom.getBoundingClientRect();
      return { texte: w.getText(), visible: w.isVisible(), voisin: items.indexOf(w) - items.indexOf(s), dansEcran: r.right <= window.innerWidth && r.width > 40,
        chevauche: r.left < rs.right && rs.left < r.right && r.top < rs.bottom && rs.top < r.bottom,
        entier: w.btnInnerEl.dom.scrollWidth <= w.btnInnerEl.dom.clientWidth + 1,
        /* aucun bouton de l'ecran rejete dans un menu de debordement */
        tous: ['afficher', 'sms', 'whatsapp', 'imprimer', 'apercu'].every((i) => { const x = t.down('#' + i), e = x && x.getEl().dom.getBoundingClientRect();
          return x && x.isVisible(true) && e.width > 20 && e.right <= window.innerWidth; }) };
    });
    ok('Bouton « Envoyer WhatsApp » juste après « Envoyer SMS », entier, sans chevauchement ; Afficher, SMS, WhatsApp, Imprimer et Aperçu tous visibles dans l\'écran (1366 × 768)',
      place && place.texte === 'Envoyer WhatsApp' && place.visible && place.voisin === 1 && place.dansEcran && !place.chevauche && place.entier && place.tous, JSON.stringify(place));

    /* filtres non triviaux : veille, ventes uniquement */
    const veille = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return Ext_d(d); })();
    function Ext_d(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
    await p.evaluate((d) => { const t = Ext.ComponentQuery.query('ticketzmanager')[0];
      t.down('#dtStart').setValue(Ext.Date.parse(d, 'd/m/Y')); t.down('#dtEnd').setValue(Ext.Date.parse(d, 'd/m/Y'));
      t.down('#description').setValue('VENTE'); }, veille);
    await p.click('.ticketz .x-btn:has-text("Afficher")');
    await p.waitForTimeout(1500);
    const affiche = lus[lus.length - 1];

    const [rep] = await Promise.all([
      p.waitForResponse((r) => r.url().indexOf('/caisse/send-whatsapp') > 0, { timeout: 30000 }).catch(() => null),
      p.click('.ticketz .x-btn:has-text("Envoyer WhatsApp")')]);
    ok('Clic : un appel send-whatsapp, avec les filtres affichés (dates, heures, caissier, type)',
      !!rep && whatsapp.length === 1 && JSON.stringify(whatsapp[0]) === JSON.stringify(affiche), JSON.stringify({ envoye: whatsapp[0], affiche }));
    const o = rep ? await rep.json().catch(() => ({})) : {};
    await p.waitForTimeout(300);
    const etat = await p.evaluate(() => Ext.ComponentQuery.query('ticketzmanager #whatsapp')[0].getText());
    const lignes = nouvelles();
    if (o.success) {
      ok('Numéro réglé : réponse simulée (mode test), état « WhatsApp simulé (test) » dans le bouton',
        o.simule === true && o.statut === 'SIMULE' && etat === 'WhatsApp simulé (test)', JSON.stringify({ o, etat }));
      ok('Bilan : exactement une ligne de journal, statut SIMULE, simulée, avec téléphone, sans client ni campagne',
        lignes.length === 1 && lignes[0][4] === 'SIMULE' && lignes[0][3] === '1' && /^\d{8,}$/.test(lignes[0][1]) && !lignes[0][5] && !lignes[0][6], JSON.stringify(lignes));
    } else {
      ok('Numéro absent ou refusé : le motif dans le bouton, aucune ligne de journal',
        !!o.message && etat === o.message && lignes.length === 0, JSON.stringify({ o, etat, lignes }));
    }
    const colonnes = q("SELECT GROUP_CONCAT(COLUMN_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_message'");
    ok('Le journal ne garde aucun texte de message', !/texte|message_text|contenu|corps|body/i.test(colonnes.replace('message_id', '')), colonnes);
    ok('Aucun SMS envoyé, aucune fenêtre', sms.length === 0 && dialogues.length === 0
      && await p.evaluate(() => Ext.WindowManager.getActive() == null || !Ext.WindowManager.getActive().isVisible() || !(Ext.WindowManager.getActive() instanceof Ext.window.MessageBox)), JSON.stringify(dialogues));
    await p.waitForTimeout(2800);
    ok('Le bouton reprend son libellé et redevient cliquable', await p.evaluate(() => { const w = Ext.ComponentQuery.query('ticketzmanager #whatsapp')[0];
      return w.getText() === 'Envoyer WhatsApp' && !w.isDisabled(); }));
    ok('Les autres boutons sont intacts (Envoyer SMS, Imprimer, Aperçu)', await p.evaluate(() => { const t = Ext.ComponentQuery.query('ticketzmanager')[0];
      return t.down('#sms').getText() === 'Envoyer SMS' && t.down('#imprimer').getText() === 'Imprimer' && !!t.down('button[text=Aperçu]'); }));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    nouvelles().forEach((c) => q(`DELETE FROM whatsapp_message WHERE id = '${c[0]}'`));
    remettreModes();
    ok('Nettoyage : journal et modes WhatsApp remis', nouvelles().length === 0
      && JSON.stringify(q("SELECT CONCAT(mode, '=', mode_test) FROM whatsapp_compte").split('\n').filter(Boolean)) === JSON.stringify(MODES_TEST), MODES_TEST.join(','));
    if (b) { await b.close(); }
    const ko = res.filter((r) => !r.c).length;
    console.log((res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
    process.exit(ko ? 1 : 0);
  }
})();
