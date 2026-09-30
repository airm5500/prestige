/* ORDONNANCES CLIENTS : RETOURS DU 30/09, joues a la souris et au clavier.
 *
 *  - « getId, a is undefined » au clic sur Consulter : consulter, cliquer une cellule des produits, revenir,
 *    consulter une autre ordonnance ; et les memes gestes apres le retrait d'une ligne ;
 *  - presentation B : le patient et son contexte a gauche, l'ordonnance a droite ; le N° dans le titre de la
 *    section ; un seul bouton « Retour a l'historique », qui demande confirmation si une saisie est en cours ;
 *  - contexte clinique sans nom de technologie ;
 *  - bouton de retrait d'une ligne en premiere colonne, visible, et qui retire bien la ligne ;
 *  - recherche produit au-dessus de la grille, ou va le curseur apres le client, le sexe, le prescripteur ;
 *  - creations rapides en fenetre ;
 *  - info-bulles des alertes, qui restent tant que la souris est dessus ;
 *  - pieces : voir, telecharger, retirer sur chaque ligne ;
 *  - historique : recherche automatique pendant la frappe, en « contient ».
 *
 * Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const MB4 = '--default-character-set=utf8mb4';
const exec = (s) => execFileSync('mariadb', [MB4, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [MB4, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLIENT = 'E2E-3009-CLIENT';
const NOM = 'ZZTRENTESEPT';
const RACINE = path.join(os.homedir(), 'prestige');

function nettoyer() {
  const chemins = q("SELECT GROUP_CONCAT(p.str_CHEMIN SEPARATOR '|') FROM t_ordonnance_client_piece p"
    + " JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = p.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID = '" + CLIENT + "'");
  if (chemins && chemins !== 'NULL') {
    chemins.split('|').forEach((rel) => { try { fs.unlinkSync(path.join(RACINE, rel)); } catch (e) { /* deja parti */ } });
  }
  exec("DELETE p FROM t_ordonnance_client_piece p JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = p.lg_ORDONNANCE_ID"
    + " WHERE o.lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID"
    + " WHERE o.lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "';"
    + "DELETE FROM t_medecin WHERE str_LAST_NAME='ZZTRENTEDOC';");
}

(async () => {
  nettoyer();
  const type = q("SELECT lg_TYPE_CLIENT_ID FROM t_type_client WHERE str_NAME='Standard' LIMIT 1");
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED,"
    + " str_STATUT) VALUES ('" + CLIENT + "', '" + NOM + "', 'E2E', '" + type + "', NOW(), NOW(), 'enable');");
  const produitStock = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
    + " WHERE s.int_NUMBER_AVAILABLE > 5 AND f.str_STATUT = 'enable' AND f.str_NAME LIKE 'DOLIPRANE 1G%' LIMIT 1");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  let err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1500);

    /* Trois ordonnances de 3, 1 et 2 lignes. */
    for (const n of [3, 1, 2]) {
      await p.evaluate(async ([c, nb]) => {
        const produits = [];
        for (let i = 0; i < nb; i++) { produits.push({ libelle: 'PRODUIT ' + nb + '-' + i, quantite: 2, posologie: 'posologie ' + i }); }
        await fetch('../api/v1/ordonnance-client/enregistrer', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: c, dateOrdonnance: new Date().toISOString().slice(0, 10), produits }) });
      }, [CLIENT, n]);
    }

    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel, attente) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(attente || 900); };
    const marquer = (fn, args) => p.evaluate(fn, args);
    const store = () => p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeOrdonnances.getRange().map((r) => ({ n: r.get('nbProduits'), num: r.get('numero') })));

    /* ------------------------------------------------ historique : recherche automatique, en « contient » */
    await p.click('#' + (await idDe('ordonnanceclient #barreCriteres #recherche')) + '-inputEl');
    await p.keyboard.type('TRENTESE', { delay: 40 });
    await p.waitForTimeout(2200);
    let lignes = await store();
    ok('Historique : la recherche part pendant la frappe, sans Entrée, et trouve « TRENTESE » dans ZZTRENTESEPT', lignes.length === 3, JSON.stringify(lignes));
    const ordre = lignes.map((l) => l.n);

    const action = async (nb, nom) => {
      const id = await marquer(([rang, n]) => {
        const g = Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances')[0];
        const img = g.getView().getNode(rang).querySelector('.ordo-act-' + n);
        img.id = 'act' + Date.now(); return img.id;
      }, [ordre.indexOf(nb), nom]);
      await p.click('#' + id); await p.waitForTimeout(1500);
    };
    const cellule = async (rang, col) => {
      const id = await marquer(([r, c]) => {
        const g = Ext.ComponentQuery.query('ordonnanceclient #grilleProduits')[0];
        const td = g.getView().getNode(r).querySelectorAll('td')[c];
        td.id = 'cel' + Date.now(); return td.id;
      }, [rang, col]);
      await p.click('#' + id); await p.waitForTimeout(500);
    };
    const nbLignes = () => p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].storeProduits.getCount());
    const boite = () => p.evaluate(() => Ext.MessageBox.isVisible() ? Ext.MessageBox.msg.getEl().dom.textContent : '');
    const repondre = (bouton) => p.evaluate((bt) => Ext.MessageBox.msgButtons[bt].el.dom.click(), bouton);
    const retour = async () => {
      await clic('ordonnanceclient #vueFiche button[itemId=retourHistorique]', 600);
      if (await boite()) { await repondre('yes'); await p.waitForTimeout(1200); }
    };

    /* ------------------------------------------------ bug getId au clic sur Consulter */
    err = [];
    await action(3, 'consulter');
    await cellule(2, 5);
    await retour();
    await action(1, 'consulter');
    ok('Consulter, cliquer une cellule, revenir, consulter une autre : aucune erreur « getId »', err.length === 0 && (await nbLignes()) === 1, JSON.stringify(err));
    await retour();
    err = [];
    await action(3, 'modifier');
    await cellule(1, 5);
    await cellule(0, 0);
    const apresRetrait = await nbLignes();
    await retour();
    await action(2, 'consulter');
    ok('Modifier, retirer une ligne, revenir, consulter : aucune erreur « getId »', err.length === 0 && (await nbLignes()) === 2, JSON.stringify(err));
    ok('L\'icône de retrait (première colonne) retire bien la ligne', apresRetrait === 2, apresRetrait);

    /* ------------------------------------------------ presentation de la fiche consultee */
    const fiche = await p.evaluate(() => {
      const f = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0];
      const patient = f.down('#blocPatient'); const entete = f.down('#enteteOrdonnance');
      const rp = patient.getEl().dom.getBoundingClientRect(); const re = entete.getEl().dom.getBoundingClientRect();
      return {
        titre: entete.title,
        patientAGauche: rp.right <= re.left && Math.abs(rp.top - re.top) < 10,
        ageDansPatient: !!patient.down('#agePatient') && !!patient.down('#insuffisanceHepatique'),
        retours: Ext.ComponentQuery.query('ordonnanceclient #vueFiche button[itemId=retourHistorique]').length,
        abandonner: Ext.ComponentQuery.query('ordonnanceclient #vueFiche button[itemId=abandonner]').length,
        texteRetour: f.down('button[itemId=retourHistorique]').getText(),
        contexte: f.down('#contexteClinique').getEl().dom.textContent,
        premiereColonne: f.down('#grilleProduits').headerCt.getGridColumns()[0].getItemId()
      };
    });
    const numero = lignes[ordre.indexOf(2)].num;
    ok('Le N° de l\'ordonnance est dans le titre de la section', fiche.titre.indexOf(numero) >= 0, fiche.titre);
    ok('Présentation B : le patient et son contexte clinique à gauche, l\'ordonnance à droite', fiche.patientAGauche && fiche.ageDansPatient, JSON.stringify(fiche));
    ok('Un seul bouton « Retour à l\'historique », plus d\'« Abandonner »', fiche.retours === 1 && fiche.abandonner === 0 && fiche.texteRetour === 'Retour à l\'historique', JSON.stringify(fiche));
    ok('Contexte clinique : « sert à l\'analyse, aucune donnée du client ne sort », sans nom de technologie', /aucune donnée du client ne sort/.test(fiche.contexte) && !/posos/i.test(fiche.contexte), fiche.contexte);
    ok('Le retrait d\'une ligne est en première colonne', fiche.premiereColonne === 'colSupprimer', fiche.premiereColonne);
    await retour();

    /* ------------------------------------------------ nouvelle fiche : focus, recherche produit, fenetres */
    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]', 1500);
    const nouvelle = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #enteteOrdonnance')[0].title);
    ok('Fiche neuve : titre « Nouvelle ordonnance »', nouvelle === 'Nouvelle ordonnance', nouvelle);
    await p.keyboard.type(NOM, { delay: 40 });
    await p.waitForFunction((nom) => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return c.isExpanded && !c.getStore().isLoading() && c.getStore().getCount() === 1 && c.getStore().getAt(0).get('strFIRSTNAME') === nom; }, NOM, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
    const focusClient = await p.evaluate(() => { const r = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #rechercheProduit')[0]; return document.activeElement === r.inputEl.dom; });
    ok('Après le choix du client, le curseur est dans la recherche produit', focusClient);
    const pastille = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #typeClientFiche')[0].getEl().dom.textContent);
    ok('Le type du client s\'affiche sous son nom', /Standard/i.test(pastille), pastille);

    /* Retour sans rien saisir de plus qu'un client : c'est une saisie, on demande. */
    await clic('ordonnanceclient #vueFiche button[itemId=retourHistorique]', 600);
    const question = await boite();
    ok('Saisie en cours : « Retour à l\'historique » demande confirmation', /Abandonner la saisie/.test(question), question);
    await repondre('no'); await p.waitForTimeout(500);
    const resteFiche = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient')[0].getLayout().getActiveItem().itemId);
    ok('« Non » : on reste sur la fiche, la saisie est gardée', resteFiche === 'vueFiche');

    /* Recherche produit : le produit remplit la ligne vide et le curseur va dans la posologie. */
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #rechercheProduit')) + '-inputEl');
    await p.keyboard.type(produitStock.slice(0, 11), { delay: 50 });
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #rechercheProduit')[0]; return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 15000 });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    const produit = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const g = e.down('#grilleProduits'); const ed = g.plugins[0]; return { n: e.storeProduits.getCount(), lib: e.storeProduits.getAt(0).get('libelle'), art: e.storeProduits.getAt(0).get('articleId'), edite: ed.editing && ed.context && ed.context.column.getItemId() }; });
    ok('Le produit choisi remplit la ligne vide (pas de ligne en plus)', produit.n === 1 && produit.lib && produit.art, JSON.stringify(produit));
    ok('Le curseur est ensuite dans la posologie', produit.edite === 'colPosologie', JSON.stringify(produit));
    await p.keyboard.type('1 cp 3 fois par jour', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    /* Texte libre + Entree : produit hors referentiel. */
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #rechercheProduit')) + '-inputEl');
    await p.keyboard.type('Préparation magistrale ZZ', { delay: 30 });
    await p.waitForTimeout(1500);
    await p.keyboard.press('Escape');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    const libre = await p.evaluate(() => { const e = Ext.ComponentQuery.query('ordonnanceclient')[0]; const r = e.storeProduits.getAt(1); return r ? { lib: r.get('libelle'), art: r.get('articleId') } : null; });
    ok('Texte libre + Entrée : ligne hors référentiel', libre && libre.lib === 'PRÉPARATION MAGISTRALE ZZ' && !libre.art, JSON.stringify(libre));
    await p.keyboard.press('Escape');

    /* Sexe choisi : le curseur retourne dans la recherche produit. */
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #sexePatient')[0]; c.expand(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #sexePatient')[0]; const n = c.getPicker().getNode(c.getStore().getAt(1)); n.id = 'sexeF'; });
    await p.click('#sexeF'); await p.waitForTimeout(600);
    const focusSexe = await p.evaluate(() => document.activeElement === Ext.ComponentQuery.query('ordonnanceclient #vueFiche #rechercheProduit')[0].inputEl.dom);
    ok('Après le choix du sexe, le curseur est dans la recherche produit', focusSexe);

    /* Prescripteur rapide en fenetre. */
    await clic('ordonnanceclient #vueFiche button[itemId=nouveauMedecin]', 900);
    const fen = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window#fenNouveauMedecin')[0]; return w ? { modal: w.modal, visible: w.isVisible(), titre: w.title, focus: document.activeElement === w.down('#nmNom').inputEl.dom } : null; });
    ok('« + » prescripteur : fenêtre de création, curseur dans le nom', fen && fen.modal && fen.visible && fen.focus, JSON.stringify(fen));
    await p.keyboard.type('ZZTRENTEDOC', { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    const med = await p.evaluate(() => ({ fen: Ext.ComponentQuery.query('window#fenNouveauMedecin').length, val: Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheMedecin')[0].getRawValue(), focus: document.activeElement === Ext.ComponentQuery.query('ordonnanceclient #vueFiche #rechercheProduit')[0].inputEl.dom }));
    ok('Entrée crée le prescripteur, la fenêtre se ferme, il est choisi, le curseur revient à la recherche produit', med.fen === 0 && /ZZTRENTEDOC/.test(med.val) && med.focus, JSON.stringify(med));
    await clic('ordonnanceclient #vueFiche button[itemId=nouvelEtablissement]', 900);
    await p.keyboard.type('Clinique ZZ trente', { delay: 30 });
    await clic('window#fenNouvelEtablissement button[itemId=ajouterEtablissement]', 800);
    const etab = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheEtablissement')[0].getRawValue());
    ok('« + » établissement : fenêtre, ajouté et posé dans la fiche', etab === 'CLINIQUE ZZ TRENTE', etab);
    await clic('ordonnanceclient #vueFiche button[itemId=nouveauClient]', 900);
    const fenClient = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window#fenNouveauClient')[0]; return !!(w && w.isVisible()); });
    await clic('window#fenNouveauClient button[itemId=annulerClient]', 500);
    ok('« + » client : fenêtre, « Annuler » la ferme', fenClient && (await p.evaluate(() => Ext.ComponentQuery.query('window#fenNouveauClient').length)) === 0);

    /* Enregistrer : le titre prend le N° ; ensuite le retour ne demande plus rien. */
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]', 2000);
    const apres = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #enteteOrdonnance')[0].title);
    ok('Après enregistrement, le N° est dans le titre', /N° \S+/.test(apres) && /enregistrée/.test(apres), apres);

    /* ------------------------------------------------ info-bulles de l'analyse */
    await clic('ordonnanceclient #vueFiche button[itemId=analyserPosos]', 3000);
    const bulles = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('ordonnanceclient #alertesFiche')[0];
      const cellules = g.getView().getEl().dom.querySelectorAll('td');
      let avec = 0; let total = 0;
      g.getView().getEl().dom.querySelectorAll('tr.x-grid-row').forEach((tr) => {
        tr.querySelectorAll('td').forEach((td, i) => { if (i < 5) { total++; if (td.getAttribute('data-qtip')) { avec++; } } });
      });
      return { lignes: g.getStore().getCount(), avec, total, cellules: cellules.length };
    });
    ok('Analyse : chaque colonne de texte porte son info-bulle', bulles.lignes > 0 && bulles.avec === bulles.total, JSON.stringify(bulles));
    const cible = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #alertesFiche')[0]; const td = g.getView().getEl().dom.querySelector('tr.x-grid-row td:nth-child(3)'); td.id = 'bulle1'; return td.getAttribute('data-qtip'); });
    await p.hover('#bulle1');
    await p.waitForTimeout(7000);
    const tient = await p.evaluate(() => { const t = Ext.tip.QuickTipManager.getQuickTip(); return { visible: t.isVisible(), delai: t.dismissDelay, texte: t.isVisible() ? t.body.dom.textContent : '' }; });
    ok('L\'info-bulle est encore là après 7 secondes (elle reste tant que la souris est dessus)', tient.visible && tient.delai === 0, JSON.stringify(tient) + ' / ' + cible);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(600);
    const remis = await p.evaluate(() => Ext.tip.QuickTipManager.getQuickTip().dismissDelay);
    ok('Hors de l\'écran des ordonnances, le délai d\'origine est remis', remis > 0, remis);

    /* ------------------------------------------------ pieces : actions par ligne */
    const pdf = path.join(os.tmpdir(), 'zz-3009.pdf');
    fs.writeFileSync(pdf, Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1'));
    await p.setInputFiles('input[type=file]', pdf);
    await p.waitForTimeout(500);
    await clic('ordonnanceclient #grillePieces button[itemId=joindrePiece]', 2500);
    const pieces = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('ordonnanceclient #grillePieces')[0];
      const row = g.getView().getNode(0);
      return { n: g.getStore().getCount(), voir: !!row.querySelector('.ordo-act-piece-voir'), tel: !!row.querySelector('.ordo-act-piece-telecharger'), ret: !!row.querySelector('.ordo-act-piece-retirer'), anciens: ['voirPiece', 'telechargerPiece', 'retirerPiece'].filter((b) => g.down('button[itemId=' + b + ']')).length };
    });
    ok('Pièces : Voir, Télécharger et Retirer sur la ligne de la pièce, plus en haut', pieces.n === 1 && pieces.voir && pieces.tel && pieces.ret && pieces.anciens === 0, JSON.stringify(pieces));
    const [onglet] = await Promise.all([p.context().waitForEvent('page', { timeout: 10000 }), p.click('.ordo-act-piece-voir')]);
    await onglet.waitForLoadState('domcontentloaded').catch(() => {});
    ok('« Voir » de la ligne ouvre la pièce dans un onglet', /\/piece\//.test(onglet.url()), onglet.url());
    await onglet.close();
    await p.click('.ordo-act-piece-retirer');
    await p.waitForTimeout(600);
    const confirmation = await boite();
    await repondre('yes'); await p.waitForTimeout(1500);
    const restant = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #grillePieces')[0].getStore().getCount());
    ok('« Retirer » de la ligne demande confirmation puis retire la pièce', /Retirer/.test(confirmation) && restant === 0, confirmation + ' / ' + restant);
    fs.unlinkSync(pdf);

    /* Enregistree et inchangee : le retour ne demande rien. */
    await clic('ordonnanceclient #vueFiche button[itemId=retourHistorique]', 900);
    const direct = await p.evaluate(() => ({ boite: Ext.MessageBox.isVisible(), vue: Ext.ComponentQuery.query('ordonnanceclient')[0].getLayout().getActiveItem().itemId }));
    ok('Rien de changé depuis l\'enregistrement : retour direct à l\'historique, sans question', !direct.boite && direct.vue === 'onglets', JSON.stringify(direct));
    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    nettoyer();
    const reste = q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID='" + CLIENT + "'") + '/' + q("SELECT COUNT(*) FROM t_medecin WHERE str_LAST_NAME='ZZTRENTEDOC'");
    ok('Jeu d\'essai retiré', reste === '0/0', reste);
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
