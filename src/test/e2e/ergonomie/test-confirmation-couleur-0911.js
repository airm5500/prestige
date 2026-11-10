/* PLAN DU 09/11, POINT 18 : UNE SEULE COULEUR POUR LES CONFIRMATIONS DANS LE BOUTON.
 *
 * Avant : la plupart des boutons armes passaient en rouge, texte blanc ; cinq ecrans ne changeaient que le texte
 * (Extranets grossistes, Mon compte, RH badges, Litiges) ou le mettaient en rouge seulement (Retour fournisseur). Par
 * l'ecran (admin, vrais clics), sans jamais donner le second clic :
 *  - Mon compte > code PIN du badge : « Enregistrer le code PIN » arme ;
 *  - Extranets grossistes : « Effacer les identifiants » arme ;
 *  - Ressources humaines > Badges : badge d'essai selectionne, « Régénérer le QR » puis « Désactiver » armes ;
 *  - Retour fournisseur > NOUVEAU RETOUR : « Valider le retour » arme ;
 *  pour chacun : fond rouge (#c0392b) et texte blanc une fois arme ; sans second clic, le bouton revient a son
 *  texte et a sa couleur d'origine ;
 *  - bilan : rien n'est ecrit (badges, PIN, retours, comptes d'extranet) ; badge d'essai retire ;
 *  - aucune erreur JavaScript.
 * Non couvert ici : Litiges (aucun litige dans la copie d'essai) ; meme correctif, relu.
 */
const C = require('../audits/commun');
const { ok, q, exec, MARQUE } = C;
const { ouvrirMenu, cliquer } = require('../outils/vues');

const ROUGE = 'rgb(192, 57, 43)', BLANC = 'rgb(255, 255, 255)';
const traces = () => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_rh_badge), (SELECT IFNULL(MAX(updated_at), '') FROM t_rh_badge),"
  + " (SELECT COUNT(*) FROM t_badge_pin), (SELECT COUNT(*) FROM t_retour_fournisseur))");

(async () => {
  const { b, p, erreurs } = await C.connecter();
  const BADGE = MARQUE + '-BADGE-' + String(process.pid).slice(-4);
  const employe = q("SELECT IFNULL(MIN(id), '') FROM t_employe WHERE statut = 'ACTIF' AND id NOT IN (SELECT employe_id FROM t_rh_badge WHERE statut = 'ACTIF')");
  try {
    await p.setViewportSize({ width: 1366, height: 768 });
    if (employe) {
      exec(`INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, created_at) VALUES ('${BADGE}', '${employe}', '${BADGE}', 'ACTIF', CURDATE(), NOW())`);
    }
    const avant = traces();
    /* couleur du bouton (composant ExtJS designe par une requete) */
    const couleur = (req) => p.evaluate((r) => { const c = Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0];
      if (!c) { return null; }
      const el = c.getEl().dom, inner = el.querySelector('.x-btn-inner');
      return { texte: c.getText(), fond: getComputedStyle(el).backgroundColor, encre: inner ? getComputedStyle(inner).color : '' }; }, req);
    const verifier = async (nom, req, attente) => {
      const repos = await couleur(req);
      await cliquer(p, req);
      await p.waitForTimeout(500);
      const arme = await couleur(req);
      ok(nom + ' : armé en rouge, texte blanc', !!arme && arme.texte !== repos.texte && arme.fond === ROUGE && arme.encre === BLANC, JSON.stringify({ repos, arme }));
      await p.mouse.move(5, 5);
      await p.waitForTimeout(attente);
      const apres = await couleur(req);
      ok(nom + ' : sans second clic, revient à son texte et à sa couleur', !!apres && apres.texte === repos.texte && apres.fond === repos.fond && apres.encre === repos.encre,
        JSON.stringify({ repos, apres }));
    };

    /* Mon compte : code PIN */
    await ouvrirMenu(p, 'GESTION DES UTILISATEURS', 'Mon compte');
    await p.waitForFunction(() => Ext.ComponentQuery.query('myaccountmanager #pinEnregistrer').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    /* clic dans la zone de saisie du champ (pas sur son libelle) */
    const saisie = async (req) => { const id = await p.evaluate((r) => Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0].inputEl.dom.id, req); await p.click('#' + id); };
    for (const [champ, valeur] of [['#pinMotDePasse', 'essai-sans-envoi'], ['#pinCode', '2468'], ['#pinConfirme', '2468']]) {
      await saisie('myaccountmanager ' + champ);
      await p.keyboard.type(valeur, { delay: 15 });
    }
    await p.evaluate(() => { const b = Ext.ComponentQuery.query('myaccountmanager #pinEnregistrer')[0]; b.getEl().dom.scrollIntoView({ block: 'center' }); });
    /* ExtJS signale la saisie 50 ms apres la frappe (checkChangeBuffer) : un humain ne clique pas plus vite */
    await p.waitForTimeout(400);
    /* le PIN se desarme quand un champ change : on ne retape rien, on attend 6 s */
    const pinAvant = await couleur('myaccountmanager #pinEnregistrer');
    await cliquer(p, 'myaccountmanager #pinEnregistrer');
    await p.waitForTimeout(500);
    const pinArme = await couleur('myaccountmanager #pinEnregistrer');
    pinArme.message = await p.evaluate(() => { const m = Ext.ComponentQuery.query('myaccountmanager')[0];
      return m.down('#pinResultat').getEl().dom.innerText + ' / ' + ['#pinMotDePasse', '#pinCode', '#pinConfirme'].map((r) => String(m.down(r).getValue()).length).join(','); });
    ok('Mon compte, « Enregistrer le code PIN » : armé en rouge, texte blanc', pinArme.texte !== pinAvant.texte && pinArme.fond === ROUGE && pinArme.encre === BLANC, JSON.stringify({ pinAvant, pinArme }));
    await saisie('myaccountmanager #pinCode');
    await p.keyboard.press('End');
    await p.keyboard.press('Backspace');
    await p.keyboard.type('0', { delay: 15 });
    await p.waitForTimeout(500);
    const pinRendu = await couleur('myaccountmanager #pinEnregistrer');
    ok('Mon compte : un champ modifié désarme le bouton (texte et couleur d\'origine)', pinRendu.texte === pinAvant.texte && pinRendu.fond === pinAvant.fond, JSON.stringify(pinRendu));

    /* Extranets grossistes */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.locator('.x-tab').filter({ visible: true, hasText: /^\s*Sessions\s*$/ }).first().click({ timeout: 60000 });
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes button').some((x) => /^exCompteEffacer/.test(x.itemId || '') && x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    const effacer = await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes button').filter((x) => /^exCompteEffacer/.test(x.itemId || '') && x.isVisible(true))[0].itemId);
    await verifier('Extranets, « Effacer les identifiants »', 'extranetsgrossistes #' + effacer, 6800);

    /* Ressources humaines : badges */
    if (employe) {
      await ouvrirMenu(p, 'RESSOURCES HUMAINES', 'Ressources humaines');
      await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await p.waitForTimeout(1000);
      await p.locator('.x-tab').filter({ visible: true, hasText: /^\s*Badges\s*$/ }).first().click();
      await p.waitForTimeout(1200);
      await saisie('rhmanager #rechercheBadge');
      await p.keyboard.type(BADGE, { delay: 10 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1500);
      await p.locator('.x-grid-row').filter({ visible: true, hasText: BADGE }).first().locator('.x-grid-cell').nth(2).click();
      await p.waitForFunction(() => { const x = Ext.ComponentQuery.query('rhmanager #btnRegenererBadge')[0]; return x && !x.isDisabled(); }, null, { timeout: 15000 });
      await verifier('RH, « Régénérer le QR »', 'rhmanager #btnRegenererBadge', 8800);
      await verifier('RH, « Désactiver »', 'rhmanager #btnDesactiverBadge', 8800);
    } else {
      ok('RH : un employé actif sans badge pour l\'essai', false, 'aucun employé actif');
    }

    /* Retour fournisseur : nouveau retour */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
    await p.waitForFunction(() => Ext.ComponentQuery.query('retourfrsmanager button').some((x) => x.text === 'NOUVEAU RETOUR' && x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(800);
    await p.locator('.x-btn').filter({ visible: true, hasText: 'NOUVEAU RETOUR' }).first().click();
    await p.waitForFunction(() => { const x = Ext.getCmp('btn_save'); return x && x.isVisible(true) && !x.isDisabled(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    await verifier('Retour fournisseur, « Valider le retour »', '#btn_save', 6800);

    ok('Bilan : rien n\'est écrit (badges, PIN, retours)', traces() === avant, JSON.stringify({ avant, apres: traces() }));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    exec(`DELETE FROM t_rh_badge WHERE id = '${BADGE}'`);
    C.nettoyer();
    await b.close();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
