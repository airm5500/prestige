/* DEMANDE DU 25/11 : LES MODELES DE TICKET DU FICHIER DU 20/11 DEVIENNENT LES REGLAGES PAR DEFAUT.
 *
 * Demande de l'utilisateur : « je veux que ce modele de ticket soit par defaut » (fichier modeles-ticket_20112026.json,
 * livre dans src/main/resources/ticket/modeles-ticket-defaut.json).
 *
 * Ecran « Modèles de ticket », par les vues, avec de vrais clics (1366 × 768), sur une table ticket_modele vide (un
 * poste qui n'a jamais rien enregistre). Ce que le test etablit :
 *  - ecran : la police choisie est celle du fichier, pour plusieurs tickets et les deux largeurs (Calibri en 80 mm,
 *    Arial Narrow en 58 mm) ;
 *  - rapprochement fichier = ecran (reglages charges) = export (bouton « Exporter ») : chaque ticket, chaque largeur,
 *    chaque option et chaque bloc (taille, alignement, ordre) ;
 *  - « Rétablir la disposition par défaut » remet la disposition du fichier (tailles) ;
 *  - bilan : sans enregistrement, rien n'est ecrit dans ticket_modele ; la table est remise comme avant ;
 *  - delai d'affichage de l'apercu < 5 s ; aucune fenetre, aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MENU = q("SELECT str_VALUE FROM t_menu WHERE lg_MENU_ID = '10'");
const FICHIER = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../main/resources/ticket/modeles-ticket-defaut.json'), 'utf8')).largeurs;
const TABLE = () => q("SELECT CONCAT_WS('|', ticket, largeur, HEX(reglages), DATE_FORMAT(maj, '%Y-%m-%d %H:%i:%s'), IFNULL(HEX(utilisateur), 'NULL')) FROM ticket_modele ORDER BY ticket, largeur");
const AVANT = TABLE();
const SECOURS = path.join(require('os').tmpdir(), 'ticket_modele_avant_' + process.pid + '.txt');
fs.writeFileSync(SECOURS, AVANT);
const remettre = () => {
  q('DELETE FROM ticket_modele');
  AVANT.split(/\r?\n/).filter(Boolean).forEach((l) => {
    const [t, lg, r, maj, u] = l.split('|');
    q(`INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur) VALUES ('${t}', ${Number(lg)}, UNHEX('${r}'), '${maj}', ${u === 'NULL' ? 'NULL' : `UNHEX('${u}')`})`);
  });
};
const OPTIONS = ['remise', 'promotion', 'lot', 'ccRc', 'recapitulatif', 'commentaires', 'encoursCarnet', 'signatureClient', 'signatures', 'cadreNet', 'net', 'police', 'marge', 'modele', 'tiersPayant'];
/* ecarts entre une entree du fichier et des reglages lus ailleurs */
const ecarts = (a, b) => {
  const e = [];
  OPTIONS.forEach((o) => { if (a[o] !== b[o]) e.push(o + ' ' + a[o] + '≠' + b[o]); });
  const da = a.disposition || [], db = b.disposition || [];
  if (da.length !== db.length) e.push('blocs ' + da.length + '≠' + db.length);
  da.forEach((p, i) => {
    const x = db[i] || {};
    ['bloc', 'taille', 'alignement'].forEach((k) => { if ((p[k] || (k === 'taille' ? 0 : '')) !== (x[k] || (k === 'taille' ? 0 : ''))) e.push(p.bloc + '.' + k + ' ' + p[k] + '≠' + x[k]); });
    ['section', 'nom', 'detail'].forEach((k) => { if ((p[k] || 0) !== (x[k] || 0)) e.push(p.bloc + '.' + k); });
  });
  return e;
};

(async () => {
  q('DELETE FROM ticket_modele');
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()));
  const racine = '.mtk';
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    r.catch(() => null);
    const t0 = Date.now();
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(300);
    return Date.now() - t0;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    let delai = await apresApercu(() => ouvrirMenu(p, MENU, 'Modèles de ticket'));
    for (const mm of ['80', '58']) {
      const l = p.locator(racine + ` .mtk-barre [data-choix=largeur][data-valeur="${mm}"]`);
      if (await l.getAttribute('aria-checked') !== 'true') { delai = Math.max(delai, await apresApercu(() => l.click())); }
      /* reglages charges par l'ecran = fichier, pour les 11 tickets */
      const charges = await p.evaluate(() => {
        const v = Ext.ComponentQuery.query('modelesticket')[0];
        return (v.etat.donnees.tickets || []).map((t) => ({ ticket: t.ticket, reglages: t.reglages, defaut: t.defaut }));
      });
      const mauvais = charges.map((t) => ({ t: t.ticket, e: ecarts(FICHIER[mm][t.ticket], t.reglages) })).filter((x) => x.e.length);
      ok(`${mm} mm : réglages chargés par l'écran = fichier, ${charges.length} tickets`, charges.length === 11 && !mauvais.length, JSON.stringify(mauvais).slice(0, 250));
      const defautsFaux = charges.filter((t) => ecarts(FICHIER[mm][t.ticket], t.defaut).length);
      ok(`${mm} mm : « défaut » de chaque ticket = fichier`, !defautsFaux.length, defautsFaux.map((t) => t.ticket).join(', '));
      for (const t of ['VENTE', 'TICKET_Z', 'VENTE_ASSURANCE']) {
        delai = Math.max(delai, await apresApercu(() => p.locator(racine + ` .mtk-ticket[data-ticket=${t}]`).click()));
        const police = await p.locator(racine + ' [data-choix=police][aria-checked=true]').getAttribute('data-valeur');
        ok(`${t} ${mm} mm : police affichée = fichier (${FICHIER[mm][t].police})`, police === FICHIER[mm][t].police, police);
      }
    }
    ok('Délai de chaque aperçu < 5 000 ms', delai < 5000, delai + ' ms');

    /* « Rétablir la disposition par défaut » : tailles du fichier (VENTE 58 mm, en-tete −3) */
    const tailleEntete = () => p.evaluate(() => {
      const v = Ext.ComponentQuery.query('modelesticket')[0];
      return (Ext.Array.findBy(v.reglages().disposition || [], (x) => x.bloc === 'ENTETE') || {}).taille;
    });
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE]').click());
    await p.locator(racine + ' .mtk-zone[data-bloc=ENTETE]').click();
    await p.waitForTimeout(300);
    await apresApercu(() => p.locator(racine + ' [data-taille="1"]').first().click());
    const change = await tailleEntete();
    const bouton = p.locator(racine + ' [data-action=defaut]');
    await bouton.click();
    await p.waitForTimeout(300);
    await apresApercu(() => bouton.click());
    const remise = await tailleEntete();
    ok('« Rétablir la disposition par défaut » : en-tête de la vente 58 mm revient à la taille du fichier (−3)',
      change !== FICHIER['58'].VENTE.disposition[0].taille && remise === FICHIER['58'].VENTE.disposition[0].taille, change + ' → ' + remise);
    await p.locator(racine + ' [data-action=annuler]').click().catch(() => null);

    /* export = fichier */
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.locator(racine + ' [data-action=exporter]').click()]);
    const exporte = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    const fautes = [];
    ['58', '80'].forEach((mm) => Object.keys(FICHIER[mm]).forEach((t) => {
      const e = ecarts(FICHIER[mm][t], (exporte.largeurs[mm] || {})[t] || {});
      if (e.length) fautes.push(mm + ' ' + t + ' : ' + e.join(', '));
    }));
    ok('Rapprochement : export (bouton « Exporter ») = fichier, 22 tickets', !fautes.length, fautes.join(' | '));
    ok('Bilan : rien d\'écrit dans ticket_modele sans enregistrement', q('SELECT COUNT(*) FROM ticket_modele') === '0');
    ok('Aucune fenêtre surgissante', !(await fenetres()));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close().catch(() => null);
    remettre();
    const apres = TABLE();
    ok('Réglages remis comme avant', apres === AVANT, apres.split('\n').length + ' contre ' + AVANT.split('\n').length);
    if (apres === AVANT) { fs.unlinkSync(SECOURS); } else { console.log('Copie de secours : ' + SECOURS); }
    const echecs = res.filter((x) => !x.c).length;
    console.log((res.length - echecs) + '/' + res.length + (echecs ? ' ECHEC' : ' OK'));
    process.exit(echecs ? 1 : 0);
  }
})();
