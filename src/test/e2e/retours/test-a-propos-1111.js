/* PLAN DU 09/11, POINT 8 : « A PROPOS » DE PRESTIGE 3, VOLET A DROITE, DEUX ONGLETS (VERSION, ASSISTANCE).
 *
 * Retour du 11/11 : « je veux juste l'onglet version et assistance » (pas de « Nouveautes »), aux couleurs de
 * l'application. Par les vues, avec de vrais clics (menu des options du bandeau > « A propos »).
 *
 * Rapprochement : chaque valeur est comparee entre l'ecran, l'API v1/a-propos et la base.
 *  - Version : version et date de construction (ecran = API), schema de la base (= plus haute version Flyway reussie),
 *    officine (= t_officine), utilisateur (= t_user de la session), poste (= nom garde par ce navigateur).
 *  - Assistance : derniere sauvegarde reussie (= MAX(debut) de t_sauvegarde), son niveau (regle : 26 h vert, 72 h
 *    orange, au-dela rouge), base de donnees, espace disque (ecran = API), contact « Service D.I.C.I ».
 * Bilan : une sauvegarde d'essai est ajoutee (30 h, puis 1 h ; les vraies sauvegardes plus recentes sont masquees le temps
 * du test) : le niveau passe a orange puis a vert ; elle est retiree a la fin et la base revient a l'identique (meme nombre de lignes, meme derniere sauvegarde).
 * Ergonomie : volet colle a droite, ecran en cours garde, Echap et la croix referment, aucune fenetre surgissante,
 * copie des informations sans mot de passe, jeton ni chemin, aucune erreur JavaScript, API refusee sans session.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { BASE, connexion } = require('../outils/vues');
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const ORIGINE = 'E2E-APROPOS';
const frDate = (s) => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) + ' ' + s.slice(11, 16) : '';
const niveauSauvegarde = (ageMin) => ageMin == null ? 'ROUGE' : ageMin <= 26 * 60 ? 'VERT' : ageMin <= 72 * 60 ? 'ORANGE' : 'ROUGE';
const comparerVersions = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) { return d; } } return 0; };

(async () => {
  q("UPDATE t_sauvegarde SET statut = 'REUSSIE' WHERE statut = 'E2E_MASQUE'");
  q("DELETE FROM t_sauvegarde WHERE origine = '" + ORIGINE + "'");
  /* bilan : les lignes presentes avant le test, a l'identique apres (les sauvegardes horaires du serveur peuvent en
     ajouter pendant le test : elles ne sont pas de son fait) */
  const idMax = q('SELECT IFNULL(MAX(id), 0) FROM t_sauvegarde');
  const empreinte = () => q("SELECT IFNULL(MD5(GROUP_CONCAT(CONCAT_WS(':', id, statut, debut, origine) ORDER BY id)), '') FROM t_sauvegarde WHERE id <= " + idMax);
  const avantEmpreinte = empreinte();
  const maxReussie = () => q("SELECT IFNULL(DATE_FORMAT(MAX(debut), '%Y-%m-%d %H:%i'), '') FROM t_sauvegarde WHERE statut = 'REUSSIE'");
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const volet = '#aboutmanagerID';
  const ouvrir = async () => {
    const ouvreur = await p.evaluate(() => { const btn = Ext.ComponentQuery.query('button').find((x) => x.menu && x.menu.items
      && x.menu.items.findIndexBy((m) => /A propos/.test(m.text || '')) >= 0); return btn ? btn.getId() : null; });
    const entree = p.locator('.x-menu-item').filter({ hasText: 'A propos' }).filter({ visible: true }).first();
    /* le menu des options se replie parfois au premier clic s'il vient d'etre ferme : un second clic le deplie */
    for (let i = 0; i < 3 && !(await entree.isVisible().catch(() => false)); i++) {
      await p.locator('#' + ouvreur).click();
      await entree.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
    }
    await entree.click();
    await p.locator(volet).waitFor({ state: 'visible', timeout: 20000 });
    await p.locator(volet + ' .apropos-charge').waitFor({ state: 'attached', timeout: 20000 });
  };
  const onglet = (nom) => p.locator(volet + ' .apropos-onglet').filter({ hasText: nom }).first().click();
  const info = (cle) => p.evaluate((c) => { const e = document.querySelector('#aboutmanagerID .apropos-info[data-cle="' + c + '"] .apropos-valeur');
    return e ? e.innerText.trim() : null; }, cle);
  const etat = (cle) => p.evaluate((c) => { const e = document.querySelector('#aboutmanagerID .apropos-etat[data-cle="' + c + '"]');
    if (!e) { return null; } const pt = e.querySelector('.apropos-pt'); const v = e.getBoundingClientRect();
    return { texte: e.querySelector('.apropos-detail').innerText.trim(), niveau: pt && pt.getAttribute('data-niveau'), visible: v.width > 0 && v.height > 0 }; }, cle);
  const fermer = async () => { await p.locator(volet + ' .apropos-fermer').click(); await p.locator(volet).waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {}); };
  try {
    /* 0. API sans session : refusee */
    const anonyme = await p.request.get(BASE + '/api/v1/a-propos');
    ok('API sans session : refusée', anonyme.status() === 401 || anonyme.status() === 403, anonyme.status());

    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const ecranAvant = await p.evaluate(() => { const c = Ext.ComponentQuery.query('#contentPanel, [itemId=contentPanel]')[0]
      || testextjs.app.getController('App').getContentPanel(); return c.items.getCount() + ':' + (c.items.getAt(0) ? c.items.getAt(0).getId() : ''); });

    /* 1. ouverture par le menu des options : volet a droite, ecran en cours garde */
    await ouvrir();
    const geo = await p.evaluate(() => { const r = document.getElementById('aboutmanagerID').getBoundingClientRect();
      return { g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.height), l: Math.round(r.width), vl: innerWidth, vh: innerHeight }; });
    ok('Volet collé à droite, sur presque toute la hauteur', Math.abs(geo.d - geo.vl) <= 2 && geo.g > geo.vl / 2 && geo.l >= 340 && geo.l <= 460 && geo.h >= geo.vh * 0.8, JSON.stringify(geo));
    const ecranPendant = await p.evaluate(() => { const c = testextjs.app.getController('App').getContentPanel(); return c.items.getCount() + ':' + (c.items.getAt(0) ? c.items.getAt(0).getId() : ''); });
    ok('L\'écran en cours reste ouvert derrière le volet', ecranPendant === ecranAvant, ecranAvant + ' / ' + ecranPendant);
    const onglets = await p.evaluate(() => Array.from(document.querySelectorAll('#aboutmanagerID .apropos-onglet')).map((o) => o.innerText.trim()));
    ok('Deux onglets seulement : Version et Assistance', JSON.stringify(onglets) === JSON.stringify(['Version', 'Assistance']), onglets);
    const tete = await p.evaluate(() => { const w = document.getElementById('aboutmanagerID'); const i = w.querySelector('img.about-icone');
      const t = w.querySelector('.apropos-tete'); const h = document.getElementById('app-header');
      return { img: i && i.naturalWidth > 0, texte: t && t.innerText, fond: t && getComputedStyle(t).backgroundImage, bandeau: h && getComputedStyle(h).backgroundImage }; });
    ok('En-tête : icône Prestige 3, « PRESTIGE 3 », couleurs du bandeau de l’application (pas de violet)', tete.img && /PRESTIGE 3/.test(tete.texte)
      && tete.fond === tete.bandeau && !/45, 26, 143/.test(tete.fond), JSON.stringify(tete).slice(0, 300));

    /* 2. onglet Version : ecran = API = base */
    const api = await p.evaluate(async () => (await fetch('../api/v1/a-propos', { credentials: 'same-origin' })).json());
    ok('API : version, construction, schéma, officine, utilisateur présents', api && api.version && api.construction && api.schema && api.officine && api.utilisateur, JSON.stringify(api).slice(0, 300));
    const schemaBase = q('SELECT version FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL').split('\n').filter(Boolean).sort(comparerVersions).pop();
    const officineBase = q('SELECT str_NOM_COMPLET FROM t_officine LIMIT 1');
    const userBase = q("SELECT CONCAT(str_FIRST_NAME, ' ', str_LAST_NAME) FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
    const vue = { version: await info('version'), construction: await info('construction'), schema: await info('schema'),
      officine: await info('officine'), utilisateur: await info('utilisateur'), poste: await info('poste'), navigateur: await info('navigateur') };
    ok('Version : écran = API', vue.version === api.version, vue.version + ' / ' + api.version);
    ok('Construite le : écran = API (jj/mm/aaaa hh:mm)', vue.construction && vue.construction.startsWith(frDate(api.construction)), vue.construction + ' / ' + api.construction);
    ok('Schéma de la base : écran = API = plus haute version Flyway', vue.schema === api.schema && api.schema === schemaBase, [vue.schema, api.schema, schemaBase]);
    ok('Officine : écran = API = t_officine', vue.officine === api.officine && api.officine === officineBase, [vue.officine, officineBase]);
    ok('Utilisateur : écran = API = t_user de la session', vue.utilisateur === api.utilisateur && api.utilisateur === userBase, [vue.utilisateur, userBase]);
    const posteNav = await p.evaluate(() => window.PrestigePoste.lire());
    ok('Ce poste : nom gardé par ce navigateur (ou « non nommé »)', vue.poste === (posteNav || 'non nommé'), vue.poste + ' / ' + posteNav);
    ok('Navigateur et taille d\'écran affichés', /\d+ × \d+/.test(vue.navigateur || ''), vue.navigateur);

    /* 3. onglet Assistance : ecran = API = base, niveaux par la regle */
    await onglet('Assistance');
    let sv = await etat('sauvegarde');
    const avantMax = maxReussie();
    const ageBase = avantMax ? Math.floor((Date.now() - new Date(avantMax.replace(' ', 'T')).getTime()) / 60000) : null;
    ok('Dernière sauvegarde : écran = API = t_sauvegarde', sv && sv.visible && (avantMax ? sv.texte.includes(frDate(avantMax)) : /aucune/i.test(sv.texte))
      && (api.assistance.sauvegarde.derniere || '') === avantMax, JSON.stringify(sv) + ' / ' + avantMax);
    ok('Dernière sauvegarde : niveau par la règle (26 h, 72 h)', sv.niveau === api.assistance.sauvegarde.niveau && sv.niveau === niveauSauvegarde(ageBase), sv.niveau + ' / ' + ageBase + ' min');
    const bd = await etat('base');
    ok('Base de données : répond, temps affiché = API, niveau par la règle', bd && /répond en \d+ ms/.test(bd.texte) && bd.niveau === api.assistance.base.niveau
      && api.assistance.base.ms >= 0, JSON.stringify(bd));
    const dq = await etat('disque');
    ok('Espace disque : écran = API (Go libres sur Go)', dq && dq.texte === api.assistance.disque.libreTexte + ' libres sur ' + api.assistance.disque.totalTexte
      && dq.niveau === api.assistance.disque.niveau, JSON.stringify(dq) + ' / ' + JSON.stringify(api.assistance.disque));
    const srv = await etat('serveur');
    ok('Serveur : en marche depuis (durée)', srv && /en marche depuis \d+ (j|h|min)/.test(srv.texte) && srv.niveau === 'VERT', JSON.stringify(srv));
    const contact = await info('contact');
    ok('Contact : « Service D.I.C.I », sans numéro', contact === 'Service D.I.C.I', contact);
    /* le texte des valeurs, sans la legende du volet (« Aucun chemin de serveur, mot de passe ou jeton n'est montre ») */
    const texteVolet = await p.evaluate(() => { const c = document.getElementById('aboutmanagerID').cloneNode(true);
      c.querySelectorAll('.apropos-petit').forEach((e) => e.remove()); document.body.appendChild(c);
      const t = c.innerText; c.remove(); return t; });
    ok('Aucun chemin, mot de passe ni jeton affiché', !/[A-Z]:\\|\/payara|password|mot de passe|jeton|token/i.test(texteVolet), texteVolet.slice(0, 200));

    /* 4. bilan : sauvegarde d'essai a 30 h (orange), puis a 1 h (vert) */
    await fermer();
    /* une vraie sauvegarde de moins de 30 h passerait devant celle de l'essai : masquee le temps du test, remise ensuite */
    q("UPDATE t_sauvegarde SET statut = 'E2E_MASQUE' WHERE statut = 'REUSSIE' AND debut > NOW() - INTERVAL 31 HOUR");
    q("INSERT INTO t_sauvegarde (debut, fin, origine, statut, fichier, taille_octets, duree_s) VALUES (NOW() - INTERVAL 30 HOUR, NOW() - INTERVAL 30 HOUR, '" + ORIGINE + "', 'REUSSIE', 'essai.sql.gz', 1, 1)");
    await ouvrir(); await onglet('Assistance');
    sv = await etat('sauvegarde');
    const d30 = q("SELECT DATE_FORMAT(MAX(debut), '%Y-%m-%d %H:%i') FROM t_sauvegarde WHERE statut = 'REUSSIE'");
    ok('Sauvegarde de 30 h : orange, date = base', sv.niveau === 'ORANGE' && sv.texte.includes(frDate(d30)), JSON.stringify(sv) + ' / ' + d30);
    await fermer();
    q("UPDATE t_sauvegarde SET debut = NOW() - INTERVAL 1 HOUR, fin = NOW() - INTERVAL 1 HOUR WHERE origine = '" + ORIGINE + "'");
    await ouvrir(); await onglet('Assistance');
    sv = await etat('sauvegarde');
    const d1 = q("SELECT DATE_FORMAT(MAX(debut), '%Y-%m-%d %H:%i') FROM t_sauvegarde WHERE statut = 'REUSSIE'");
    ok('Sauvegarde de 1 h : verte, date = base', sv.niveau === 'VERT' && sv.texte.includes(frDate(d1)), JSON.stringify(sv) + ' / ' + d1);

    /* 5. copie pour l'assistance : un clic, confirmation dans le bouton, rien de sensible */
    const btn = p.locator(volet + ' .apropos-copier').filter({ visible: true }).first();
    await btn.click();
    await p.waitForTimeout(400);
    const apres = (await btn.innerText()).trim();
    const copie = await p.evaluate(() => navigator.clipboard.readText());
    ok('Copie : le bouton confirme (« Copié »), aucune fenêtre surgissante', /Copié/.test(apres)
      && await p.locator('.x-message-box').filter({ visible: true }).count() === 0, apres);
    ok('Copie : version, schéma, officine, sauvegarde ; aucun chemin, mot de passe ni jeton', copie.includes(api.version) && copie.includes(api.schema)
      && copie.includes(api.officine) && copie.includes(frDate(d1)) && !/[A-Z]:\\|password|mot de passe|jeton|token/i.test(copie), copie.slice(0, 300));

    /* 6. fermeture : Echap */
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    ok('Échap referme le volet', !(await p.locator(volet).isVisible()));
    const ecranApres = await p.evaluate(() => { const c = testextjs.app.getController('App').getContentPanel(); return c.items.getCount() + ':' + (c.items.getAt(0) ? c.items.getAt(0).getId() : ''); });
    ok('Après fermeture, l\'écran en cours est intact', ecranApres === ecranAvant, ecranApres);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    q("UPDATE t_sauvegarde SET statut = 'REUSSIE' WHERE statut = 'E2E_MASQUE'");
    q("DELETE FROM t_sauvegarde WHERE origine = '" + ORIGINE + "'");
    const restes = q("SELECT COUNT(*) FROM t_sauvegarde WHERE origine = '" + ORIGINE + "' OR statut = 'E2E_MASQUE'");
    const apresEmpreinte = empreinte();
    ok('Bilan : t_sauvegarde revenue à l\'identique (lignes d\'avant le test inchangées, aucune ligne d\'essai ni masquée)',
      apresEmpreinte === avantEmpreinte && restes === '0', avantEmpreinte.slice(0, 8) + '/' + apresEmpreinte.slice(0, 8) + ' restes ' + restes);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
