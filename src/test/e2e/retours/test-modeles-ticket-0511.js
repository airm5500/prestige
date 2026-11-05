/* RETOUR DU 05/11 (LOT A) : ECRAN « MODELES DE TICKET ».
 *
 * Par les vues, avec de vrais clics (1366 × 768, l'ecran d'une caisse). Ce que le test etablit :
 *  - le bloc « alignement et taille » est juste a gauche de l'apercu ; l'apercu tient dans l'ecran sans defilement ;
 *    les boutons sont remontes dans la colonne des reglages ;
 *  - vente depot jamais enregistree : Arial Narrow, net a payer coupe (option proposee) ;
 *  - un bloc se retrecit (largeur en %), sans probleme bloquant ;
 *  - le bloc des articles regle a part la taille de la designation ;
 *  - le pied se choisit d'un clic et son « + » agrandit le code-barres ; il reste le dernier ;
 *  - marge du rouleau ; « Enregistrer » reporte les reglages communs (marge, adresse) sur les autres tickets ;
 *  - « Exporter » telecharge les reglages (80 et 58 mm) ; « Importer » demande confirmation dans le bouton, sans
 *    fenetre, puis ecrit le fichier en base ;
 *  - aucune erreur JavaScript.
 * Toute la table des reglages est remise comme avant.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MENU = q("SELECT str_VALUE FROM t_menu WHERE lg_MENU_ID = '10'");
const TABLE = () => q("SELECT CONCAT_WS('|', ticket, largeur, HEX(reglages), IFNULL(DATE_FORMAT(maj, '%Y-%m-%d %H:%i:%s'), ''), HEX(IFNULL(utilisateur, ''))) FROM ticket_modele ORDER BY ticket, largeur");
const AVANT = TABLE();
const remettre = () => {
  q('DELETE FROM ticket_modele');
  AVANT.split('\n').filter(Boolean).forEach((l) => {
    const [t, lg, r, maj, u] = l.split('|');
    q(`INSERT INTO ticket_modele (ticket, largeur, reglages, maj, utilisateur) VALUES ('${t}', ${Number(lg)}, UNHEX('${r}'), ${maj ? `'${maj}'` : 'NOW()'}, UNHEX('${u}'))`);
  });
};
const enBase = (t, l) => JSON.parse(q(`SELECT reglages FROM ticket_modele WHERE ticket = '${t}' AND largeur = ${l}`) || '{}');

(async () => {
  /* depart des valeurs par defaut en 80 mm */
  q('DELETE FROM ticket_modele WHERE largeur = 80');
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').some((w) => w.isVisible()));
  const racine = '.mtk';
  const composant = (f, x) => p.evaluate(f, x);
  const apresApercu = async (action) => {
    const r = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 30000 });
    await action();
    await r;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    await p.waitForTimeout(400);
  };
  const zone = (id) => p.locator(racine + ` .mtk-zone[data-bloc=${id}]`);
  const position = (id) => composant((id) => { const c = Ext.ComponentQuery.query('modelesticket')[0];
    return (c.reglages().disposition || []).find((d) => d.bloc === id) || null; }, id);
  const apercu = () => composant(() => { const a = Ext.ComponentQuery.query('modelesticket')[0].etat.apercu; return { zones: a.zones, bloquants: a.bloquants, ordre: a.ordre }; });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const premier = p.waitForResponse((x) => /modeles-ticket\/apercu/.test(x.url()), { timeout: 60000 });
    await ouvrirMenu(p, MENU, 'Modèles de ticket');
    await premier;
    await p.locator(racine + ' .mtk-feuille img').waitFor({ timeout: 30000 });
    const l80 = p.locator(racine + ' .mtk-barre [data-choix=largeur][data-valeur="80"]');
    if (await l80.getAttribute('aria-checked') !== 'true') { await apresApercu(() => l80.click()); }
    await apresApercu(() => p.locator(racine + ' .mtk-ticket[data-ticket=VENTE_DEPOT]').click());

    /* ergonomie de l'ecran */
    const mise = await composant(() => {
      const r = (s) => { const e = document.querySelector('.mtk ' + s); return e && e.getBoundingClientRect(); };
      const papier = document.querySelector('.mtk .mtk-papier'), outils = r('.mtk-outils'), pa = r('.mtk-papier'), feuille = r('.mtk-feuille');
      const enr = document.querySelector('.mtk [data-action=enregistrer]');
      return { outilsAGauche: outils && pa && outils.right <= pa.left + 1 && Math.abs(outils.top - pa.top) < 40,
        sansDefilement: papier.scrollHeight <= papier.clientHeight + 1, feuilleDansEcran: feuille.bottom <= window.innerHeight,
        boutonsAGauche: !!enr.closest('.mtk-outils'), basBoutons: Math.round(r('.mtk-boutons').bottom), hauteur: window.innerHeight,
        coupes: Array.from(document.querySelectorAll('.mtk .mtk-boutons button')).filter((x) => x.scrollWidth > x.clientWidth + 1).length };
    });
    ok('Alignement et taille juste à gauche de l\'aperçu', mise.outilsAGauche, JSON.stringify(mise));
    ok('Aperçu entier dans l\'écran, sans défilement', mise.sansDefilement && mise.feuilleDansEcran, JSON.stringify(mise));
    ok('Boutons remontés dans la place libre à gauche de l\'aperçu, entiers et visibles sans défiler', mise.boutonsAGauche && mise.basBoutons <= mise.hauteur && mise.coupes === 0, JSON.stringify(mise));

    /* valeurs par defaut d'un ticket jamais enregistre */
    const police = await composant(() => { const s = document.querySelector('.mtk [data-choix=police][aria-checked=true]'); return s && s.getAttribute('data-valeur'); });
    ok('Vente dépôt jamais enregistrée : Arial Narrow', police === 'Arial Narrow', police);
    const net = p.locator(racine + ' [data-option=net]');
    ok('Vente dépôt : option « net à payer », coupée par défaut, et pas de net dans l\'aperçu',
      await net.count() === 1 && await net.getAttribute('aria-checked') === 'false' && !(await apercu()).zones.NET, await net.count());

    /* bloc retreci */
    const hAvant = (await zone('COORDONNEES').boundingBox()).height;
    await zone('COORDONNEES').click();
    await p.waitForTimeout(300);
    for (let i = 0; i < 6; i++) {
      await apresApercu(() => p.locator(racine + ' [data-largeur="-1"]').click());
    }
    const coord = await position('COORDONNEES');
    const a1 = await apercu();
    const hApres = (await zone('COORDONNEES').boundingBox()).height;
    ok('Adresse rétrécie à 40 %, une ligne par texte, aucun problème bloquant',
      coord && coord.largeur === 40 && a1.bloquants.length === 0 && hApres <= hAvant + 1, JSON.stringify(coord) + ' ' + hAvant + ' → ' + hApres + ' ' + a1.bloquants.join(' | '));
    ok('Réglage commun signalé', /commun/i.test(await p.locator(racine + ' .mtk-commun').innerText().catch(() => '')));

    /* designation des articles */
    await zone('CORPS').click();
    await p.waitForTimeout(300);
    const nomAvant = ((await position('CORPS')) || {}).nom || 0;
    await apresApercu(() => p.locator(racine + ' [data-partie=nom][data-pas="1"]').click());
    const corps = await position('CORPS');
    ok('Articles : taille de la désignation réglée à part (+1)', corps && corps.nom === nomAvant + 1 && (corps.detail || 0) === -1, JSON.stringify(corps));

    /* pied : taille du code-barres */
    const hPied = (await zone('PIED').boundingBox()).height;
    await zone('PIED').click();
    await p.waitForTimeout(300);
    const libellePied = await p.locator(racine + ' .mtk-selection').innerText();
    await apresApercu(() => p.locator(racine + ' [data-taille="1"]').click());
    await apresApercu(() => p.locator(racine + ' [data-taille="1"]').click());
    const pied = await position('PIED');
    const disp = await composant(() => Ext.ComponentQuery.query('modelesticket')[0].reglages().disposition.map((d) => d.bloc));
    const hPied2 = (await zone('PIED').boundingBox()).height;
    ok('Pied choisi d\'un clic : « Taille du code-barres »', /Taille du code-barres/.test(libellePied), libellePied.slice(0, 120));
    ok('« + » : code-barres agrandi, le pied reste le dernier', pied && pied.taille === 2 && disp[disp.length - 1] === 'PIED' && hPied2 > hPied,
      JSON.stringify(pied) + ' ' + disp.join(',') + ' ' + hPied + ' → ' + hPied2);

    /* marge, enregistrement et report des reglages communs */
    await apresApercu(() => p.locator(racine + ' [data-marge="1"]').click());
    const enregistrer = p.locator(racine + ' [data-action=enregistrer]');
    ok('« Enregistrer » actif', await enregistrer.isEnabled());
    const charge = p.waitForResponse((x) => /modeles-ticket\?/.test(x.url()) && x.request().method() === 'GET', { timeout: 30000 });
    await enregistrer.click();
    await charge;
    await p.waitForTimeout(800);
    const depot = enBase('VENTE_DEPOT', 80), z = enBase('TICKET_Z', 80), vente = enBase('VENTE', 80);
    const coordVente = (vente.disposition || []).find((d) => d.bloc === 'COORDONNEES') || {};
    const piedZ = (z.disposition || []).find((d) => d.bloc === 'PIED') || {};
    ok('Enregistré : marge 1 mm, net coupé (vente dépôt)', depot.marge === 1 && depot.net === false && depot.version === 2, JSON.stringify(depot).slice(0, 250));
    ok('Réglages communs reportés : marge et adresse à 40 % sur la vente, marge et pied sur le ticket Z',
      vente.marge === 1 && coordVente.largeur === 40 && z.marge === 1 && piedZ.taille === 2, JSON.stringify({ vente: vente.marge, coordVente, z: z.marge, piedZ }));
    const corpsZ = (z.disposition || []).find((d) => d.bloc === 'CORPS') || {};
    ok('Le bloc des articles n\'est pas commun : le ticket Z garde le sien', (corpsZ.nom || 0) === 0 && corpsZ.section === -1, JSON.stringify(corpsZ));

    /* export */
    const [telechargement] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.locator(racine + ' [data-action=exporter]').click()]);
    const fichier = path.join(os.tmpdir(), 'e2e-modeles-ticket-' + Date.now() + '.json');
    await telechargement.saveAs(fichier);
    const exporte = JSON.parse(fs.readFileSync(fichier, 'utf8'));
    ok('Exporter : fichier des réglages 80 et 58 mm', exporte.format === 'prestige-modeles-ticket' && exporte.largeurs['80'] && exporte.largeurs['58']
      && exporte.largeurs['80'].VENTE_DEPOT.marge === 1, JSON.stringify(Object.keys(exporte.largeurs || {})));

    /* import : un fichier modifie (police Tahoma partout en 80 mm) */
    Object.values(exporte.largeurs['80']).forEach((r) => { r.police = 'Tahoma'; });
    fs.writeFileSync(fichier, JSON.stringify(exporte));
    await p.locator(racine + ' .mtk-fichier').setInputFiles(fichier);
    const importer = p.locator(racine + ' [data-action=importer]');
    await p.waitForFunction(() => /Confirmer/.test(document.querySelector('.mtk [data-action=importer]').textContent), null, { timeout: 10000 });
    ok('Importer : la confirmation est dans le bouton, aucune fenêtre', /Confirmer/.test(await importer.innerText()) && !(await fenetres()), await importer.innerText());
    const rep = p.waitForResponse((x) => /modeles-ticket\/import/.test(x.url()), { timeout: 30000 });
    await importer.click();
    await rep;
    await p.waitForTimeout(800);
    ok('Second clic : fichier importé en base', enBase('VENTE', 80).police === 'Tahoma' && enBase('TICKET_Z', 80).police === 'Tahoma',
      enBase('VENTE', 80).police + ' / ' + enBase('TICKET_Z', 80).police);
    fs.unlinkSync(fichier);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    remettre();
    const apres = TABLE();
    const diff = AVANT.split('\n').filter((l, i) => apres.split('\n')[i] !== l);
    ok('Réglages remis comme avant', apres === AVANT, diff.length + ' ligne(s) : ' + diff.map((l) => l.split('|').slice(0, 2).join(' ')).join(', ') + ' / ' + apres.split('\n').length + ' contre ' + AVANT.split('\n').length);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
