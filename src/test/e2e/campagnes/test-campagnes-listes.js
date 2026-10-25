/* CAMPAGNES : LISTES DE DIFFUSION (retours du 25/10, point 14).
 *
 * Jeu d'essai : 3 clients d'essai « ZZLISTE » (WhatsApp accepte), retires a la fin avec la liste.
 * Par les vues (admin), Campagnes SMS / WhatsApp > Campagnes > Listes de diffusion :
 *  - creer une liste nommee (nom vide refuse, nom en double refuse, message dans l'ecran) ;
 *  - chercher « ZZLISTE » (3 caracteres), cocher 2 clients, « Ajouter les clients cochés » : la liste en compte 2 ;
 *  - retirer un client : confirmation dans le bouton (1er clic), retrait au 2e clic ;
 *  - Infos clients, filtre « Liste » : « Voir les destinataires » ne donne que le client de la liste ;
 *  - supprimer la liste : confirmation dans le bouton ;
 *  - aucune erreur JavaScript, aucune fenetre (navigateur ou ExtJS). Rien n'est envoye.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const NOM = 'E2E liste ' + Date.now();

function nettoyer() {
  q("DELETE lc FROM t_campagne_liste_client lc JOIN t_campagne_liste l ON l.id = lc.liste_id WHERE l.nom LIKE 'E2E liste %';"
    + " DELETE FROM t_campagne_liste WHERE nom LIKE 'E2E liste %'; DELETE FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-LISTE-%';");
}

(async () => {
  nettoyer();
  ['AMANI', 'BAKARY', 'CYRILLE'].forEach((n, i) => q("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED, bool_CONSENT_WHATSAPP)"
    + ` VALUES ('E2E-LISTE-${i}', 'ZZLISTE', '${n}', '070707080${i}', '6', 'enable', NOW(), 1)`));
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const L = 'campagnes #ongletListes';
  const etat = () => p.evaluate((s) => Ext.ComponentQuery.query(s + ' #etat')[0].getEl().dom.innerText, L);
  const texteBouton = (s) => p.evaluate((x) => Ext.ComponentQuery.query(x)[0].getText(), s);
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length);
  const idListe = () => q(`SELECT id FROM t_campagne_liste WHERE nom = '${NOM}'`);
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'Campagnes SMS / WhatsApp', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].tab.getEl().dom.id, L));
    await p.waitForTimeout(1500);

    await cliquer(p, L + ' #creerListe');
    await p.waitForTimeout(500);
    ok('Nom vide : refusé, message dans l\'écran', /Donnez un nom/.test(await etat()) && q("SELECT COUNT(*) FROM t_campagne_liste WHERE nom LIKE 'E2E liste %'") === '0', await etat());
    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #nomListe')[0].inputEl.dom.id, L));
    await p.keyboard.type(NOM);
    await p.keyboard.press('Enter');
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #listes')[0].getSelectionModel().getCount() === 1, L, { timeout: 15000 });
    ok('Liste créée et choisie (Entrée)', idListe() !== '' && /créée/.test(await etat()), await etat());
    await p.evaluate(([s, n]) => { Ext.ComponentQuery.query(s + ' #nomListe')[0].setValue(n); }, [L, NOM]);
    await cliquer(p, L + ' #creerListe');
    await p.waitForTimeout(1200);
    ok('Nom en double : refusé', /déjà ce nom/.test(await etat()) && q(`SELECT COUNT(*) FROM t_campagne_liste WHERE nom = '${NOM}'`) === '1', await etat());

    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s + ' #rechercheClient')[0].inputEl.dom.id, L));
    await p.keyboard.type('ZZLISTE', { delay: 40 });
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #trouves')[0].getStore().getCount() === 3, L, { timeout: 15000 });
    await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #trouves')[0]; g.getSelectionModel().select([g.getStore().findRecord('clientId', 'E2E-LISTE-0'), g.getStore().findRecord('clientId', 'E2E-LISTE-1')]); }, L);
    await cliquer(p, L + ' #ajouterMembres');
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #membres')[0].getStore().getCount() === 2, L, { timeout: 15000 });
    ok('Recherche « ZZLISTE », 2 clients cochés ajoutés', q(`SELECT COUNT(*) FROM t_campagne_liste_client WHERE liste_id = '${idListe()}'`) === '2' && /2 client\(s\) ajouté/.test(await etat()), await etat());
    await p.waitForTimeout(800);
    ok('Nombre de clients affiché dans les listes', await p.evaluate(([s, n]) => { const st = Ext.ComponentQuery.query(s + ' #listes')[0].getStore(); return st.getAt(st.findExact('nom', n)).get('nombre'); }, [L, NOM]) === 2);

    await p.evaluate((s) => { const g = Ext.ComponentQuery.query(s + ' #membres')[0]; g.getSelectionModel().select(g.getStore().findRecord('clientId', 'E2E-LISTE-1')); }, L);
    await cliquer(p, L + ' #retirerMembres');
    await p.waitForTimeout(500);
    ok('Retrait : confirmation dans le bouton, rien retiré au 1er clic', /Confirmer : retirer 1 client/.test(await texteBouton(L + ' #retirerMembres'))
      && q(`SELECT COUNT(*) FROM t_campagne_liste_client WHERE liste_id = '${idListe()}'`) === '2' && await fenetres() === 0);
    await cliquer(p, L + ' #retirerMembres');
    await p.waitForFunction((s) => Ext.ComponentQuery.query(s + ' #membres')[0].getStore().getCount() === 1, L, { timeout: 15000 });
    ok('Retrait au 2e clic', q(`SELECT GROUP_CONCAT(lg_CLIENT_ID) FROM t_campagne_liste_client WHERE liste_id = '${idListe()}'`) === 'E2E-LISTE-0');

    /* envoi a une liste : filtre « Liste » dans Infos clients */
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0].tab.getEl().dom.id));
    await p.waitForTimeout(1500);
    await p.evaluate((id) => { const o = Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS')[0]; o.down('#liste').setValue(id); o.down('#recherche').setValue('ZZLISTE'); }, idListe());
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #voir');
    await p.waitForFunction(() => /Destinataires : \d+ joignable/.test(Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0].title), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const pop = await p.evaluate(() => { const l = []; Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0].getStore().each((r) => l.push(r.get('clientId'))); return l; });
    ok('Infos clients, filtre « Liste » : seul le client de la liste', pop.join(',') === 'E2E-LISTE-0', pop.join(','));
    await p.evaluate(() => { Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #liste')[0].clearValue(); });
    await cliquer(p, 'campagnes #onglet-INFO_CLIENTS #voir');
    await p.waitForTimeout(2500);
    ok('Sans liste : les 3 clients « ZZLISTE »', await p.evaluate(() => Ext.ComponentQuery.query('campagnes #onglet-INFO_CLIENTS #destinataires')[0].getStore().getCount()) === 3);

    await p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].tab.getEl().dom.id, L));
    await p.waitForTimeout(1500);
    await cliquer(p, L + ' #supprimerListe');
    await p.waitForTimeout(500);
    ok('Suppression : confirmation dans le bouton', /Confirmer : supprimer/.test(await texteBouton(L + ' #supprimerListe')) && idListe() !== '');
    await cliquer(p, L + ' #supprimerListe');
    await p.waitForTimeout(1500);
    ok('Liste supprimée au 2e clic (inscriptions retirées, clients gardés)', idListe() === '' && q("SELECT COUNT(*) FROM t_campagne_liste_client WHERE lg_CLIENT_ID LIKE 'E2E-LISTE-%'") === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-LISTE-%'") === '3', await etat());
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0 && await fenetres() === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-LISTE-%'") === '0' && q("SELECT COUNT(*) FROM t_campagne_liste WHERE nom LIKE 'E2E liste %'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
