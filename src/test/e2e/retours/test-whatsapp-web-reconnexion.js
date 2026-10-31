/* WHATSAPP WEB : L'ECRAN SUIT LA CONNEXION SANS « ACTUALISER » (retour du 31/10).
 *
 * Apres le scan du QR code, WhatsApp coupe toujours une fois la connexion avant de l'ouvrir pour de bon : le service
 * passe QR -> DECONNECTE (quelques secondes) -> CONNECTE. L'ecran cessait de se rafraichir sur DECONNECTE et restait
 * « Déconnecté » jusqu'au clic sur « Actualiser ».
 * Les reponses de /whatsapp/web/etat et /qr sont simulees dans le navigateur : le vrai service et son telephone ne sont
 * pas touches, rien n'est ecrit en base. L'onglet est ouvert d'un clic, comme l'utilisateur.
 * Onglet Comptes (meme retour) : textes d'exemple de l'adresse et du jeton, « Compte actif » coche par la saisie,
 * « Parcourir » pour le dossier du service. Rien n'est enregistre.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  /* etat rendu par le « service » : change par le test */
  let etat = 'QR', appels = 0;
  /* l'ecran ajoute un parametre anti-cache a l'adresse */
  await p.route(/\/api\/v1\/whatsapp\/web\/etat(\?|$)/,(r) => { appels++; r.fulfill({ contentType: 'application/json',
    body: JSON.stringify(Object.assign({ success: true, etat, file: { enAttente: 0, envoyesAujourdhui: 0, plafondDuJour: 20 } },
      etat === 'CONNECTE' ? { numero: '2250700000000' } : {}, etat === 'DECONNECTE' ? { erreur: 'Connexion coupée (code 515)' } : {})) }); });
  await p.route(/\/api\/v1\/whatsapp\/web\/qr(\?|$)/,(r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, image: QR }) }));
  const texte = () => p.evaluate(() => Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('whatsappcomptes', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappcomptes').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    /* onglet Comptes (rien n'est enregistre : l'ecran est quitte sans « Enregistrer ») */
    const centre = (sel) => p.evaluate((s) => { const r = Ext.ComponentQuery.query(s)[0].getEl().dom.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
    const clic = async (sel) => { const c = await centre(sel); await p.mouse.click(c.x, c.y); };
    await p.waitForFunction(() => !Ext.ComponentQuery.query('whatsappcomptes')[0].isMasked || !Ext.ComponentQuery.query('whatsappcomptes')[0].isMasked(), null, { timeout: 20000 });
    await p.waitForTimeout(1500);
    const aides = await p.evaluate(() => { const f = Ext.ComponentQuery.query('whatsappcomptes #formWEB')[0];
      return { url: f.down('[name=webUrl]').emptyText, jeton: f.down('[name=webJeton]').emptyText }; });
    ok('Texte d\'exemple dans « Adresse du service »', /http:\/\/localhost:3010/.test(aides.url), aides.url);
    ok('Texte d\'exemple dans « Jeton partagé »', /config\.json|défini/.test(aides.jeton), aides.jeton);

    await clic('whatsappcomptes #formWEB [name=actif]');
    const decoche = await p.evaluate(() => Ext.ComponentQuery.query('whatsappcomptes #formWEB [name=actif]')[0].getValue());
    await clic('whatsappcomptes #formWEB [name=webUrl]');
    await p.keyboard.press('End');
    await p.keyboard.type(' ');
    await p.keyboard.press('Backspace');
    await p.waitForTimeout(500);
    const etatActif = await p.evaluate(() => { const f = Ext.ComponentQuery.query('whatsappcomptes #formWEB')[0];
      return { actif: f.down('[name=actif]').getValue(), url: !!f.down('[name=webUrl]').getValue(), jeton: f.down('[name=webJeton]').secretDefini }; });
    ok('Adresse et jeton renseignés : la saisie coche « Compte actif »', decoche === false && etatActif.actif === true, JSON.stringify(etatActif));

    await clic('whatsappcomptes #btnParcourirWeb');
    await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('whatsappcomptes #arbreDossiers')[0];
      return a && a.isVisible(true) && a.getRootNode().childNodes.length > 0; }, null, { timeout: 20000 }).catch(() => {});
    const lecteurs = await p.evaluate(() => { const a = Ext.ComponentQuery.query('whatsappcomptes #arbreDossiers')[0];
      return a ? a.getRootNode().childNodes.map((n) => n.getId()) : []; });
    ok('« Parcourir » déroule les lecteurs du serveur sous le champ', lecteurs.length > 0, lecteurs.join(', '));
    /* deplier le premier lecteur, comme l'utilisateur : clic sur sa fleche */
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('whatsappcomptes #arbreDossiers')[0]; a.getSelectionModel().select(a.getRootNode().firstChild); });
    await p.evaluate(() => { const a = Ext.ComponentQuery.query('whatsappcomptes #arbreDossiers')[0], n = a.getView().getNode(a.getRootNode().firstChild);
      n.querySelector('.x-tree-expander').setAttribute('data-e2e', 'fleche'); });
    await p.click('[data-e2e=fleche]');
    await p.waitForFunction(() => { const a = Ext.ComponentQuery.query('whatsappcomptes #arbreDossiers')[0]; const n = a.getRootNode().firstChild;
      return n.isExpanded() && n.childNodes.length > 0; }, null, { timeout: 20000 }).catch(() => {});
    const sous = await p.evaluate(() => Ext.ComponentQuery.query('whatsappcomptes #arbreDossiers')[0].getRootNode().firstChild.childNodes.length);
    ok('Un lecteur se déplie en sous-dossiers', sous > 0, sous);
    await clic('whatsappcomptes #btnChoisirDossier');
    const choix = await p.evaluate(() => ({ v: Ext.ComponentQuery.query('whatsappcomptes #formWEB [name=webRepertoire]')[0].getValue(),
      ouvert: Ext.ComponentQuery.query('whatsappcomptes #parcoursWeb')[0].isVisible() }));
    ok('« Choisir ce dossier » remplit « Dossier du service » et replie l\'arbre', choix.v === lecteurs[0] && !choix.ouvert, JSON.stringify(choix));

    const onglet = await p.evaluate(() => { const t = Ext.ComponentQuery.query('whatsappcomptes #ongletWeb')[0].tab.getEl().dom.getBoundingClientRect();
      return { x: t.left + t.width / 2, y: t.top + t.height / 2 }; });
    await p.mouse.click(onglet.x, onglet.y);
    await p.waitForFunction(() => Ext.ComponentQuery.query('whatsappcomptes #qrWeb')[0].getEl().down('img.wa-qr'), null, { timeout: 20000 }).catch(() => {});
    ok('Onglet ouvert : « En attente du scan » et QR code', /En attente du scan/.test(await texte()), await texte());

    /* le telephone scanne : coupure de redemarrage, puis connexion */
    etat = 'DECONNECTE';
    await p.waitForFunction(() => /Déconnecté/.test(Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent), null, { timeout: 15000 }).catch(() => {});
    ok('Coupure de redémarrage affichée « Déconnecté »', /Déconnecté/.test(await texte()), await texte());
    const avant = appels;
    etat = 'CONNECTE';
    await p.waitForFunction(() => /Connecté/.test(Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent)
      && !/Déconnecté/.test(Ext.ComponentQuery.query('whatsappcomptes #etatWeb')[0].getEl().dom.textContent), null, { timeout: 15000 }).catch(() => {});
    const t = await texte();
    ok('Connexion réussie affichée sans cliquer sur « Actualiser »', /Connecté/.test(t) && !/Déconnecté/.test(t), t + ' (appels après la coupure : ' + (appels - avant) + ')');
    ok('« Déconnecter / changer de numéro » actif une fois connecté',
      await p.evaluate(() => !Ext.ComponentQuery.query('whatsappcomptes #btnDeconnecterWeb')[0].isDisabled()));

    /* onglet quitte : plus aucun appel */
    const comptes = await p.evaluate(() => { const r = Ext.ComponentQuery.query('whatsappcomptes #ongletComptes')[0].tab.getEl().dom.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(comptes.x, comptes.y);
    await p.waitForTimeout(1000);
    const n = appels;
    await p.waitForTimeout(20000);
    ok('Onglet quitté : l\'écran cesse d\'interroger le service', appels === n, (appels - n) + ' appel(s)');
    ok('Aucune erreur JavaScript, aucune fenêtre', !erreurs.length && !dialogues.length, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
