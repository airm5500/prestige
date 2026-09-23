/* ORDONNANCES : CREATIONS RAPIDES DEPUIS LA FICHE (23/09) - client standard (la fenetre s'ouvrait VIDE),
 * prescripteur et etablissement.
 *
 * Joue a la souris et au clavier : Nouvelle ordonnance, recherche d'un client absent, « Nouveau client », saisie,
 * « Creer le client ». Le client est cree en STANDARD (meme service et meme type que la caisse), choisi dans la
 * fiche, et l'ordonnance s'enregistre sur lui. Le client et l'ordonnance de test sont retires a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOM = 'ZZNCLIENT';
const PRENOM = 'ESSAI' + Date.now().toString().slice(-5);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1700, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('ordonnanceclient', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('ordonnanceclient #grilleOrdonnances').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const idDe = (sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0]; return c ? c.getId() : null; }, sel);
    const clic = async (sel) => { await p.click('#' + (await idDe(sel))); await p.waitForTimeout(900); };
    const saisir = async (sel, texte) => { await p.click('#' + (await idDe(sel)) + '-inputEl'); await p.keyboard.type(texte, { delay: 30 }); };

    await clic('ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]');
    /* Le curseur est dans le client : on tape un nom qui n'existe pas. */
    await p.keyboard.type(NOM, { delay: 40 });
    await p.waitForTimeout(1500);
    await clic('ordonnanceclient #vueFiche button[itemId=nouveauClient]');
    const ouvert = await p.evaluate(() => { const f = Ext.ComponentQuery.query('ordonnanceclient #formNouveauClient')[0]; const r = f.getEl().dom.getBoundingClientRect(); return { visible: f.isVisible(), hauteur: r.height, nom: f.down('#ncNom').getValue(), fenetres: Ext.ComponentQuery.query('window[title=NOUVEAU CLIENT]').length }; });
    ok('« Nouveau client » ouvre un formulaire REMPLI dans la fiche, pas une fenêtre vide', ouvert.visible && ouvert.hauteur > 30 && ouvert.fenetres === 0, JSON.stringify(ouvert));
    ok('Le nom tapé dans la recherche est repris', ouvert.nom === NOM, ouvert.nom);
    await clic('ordonnanceclient #formNouveauClient button[itemId=creerClient]');
    await p.waitForTimeout(600);
    const refus = await p.evaluate(() => { const vis = Ext.MessageBox.isVisible(); const t = vis ? Ext.MessageBox.msg.getEl().dom.textContent : ''; if (vis) { Ext.MessageBox.hide(); } return t; });
    ok('Sans prénom ni téléphone : refusé, avec la raison', /obligatoires/.test(refus), refus);
    await saisir('ordonnanceclient #formNouveauClient #ncPrenom', PRENOM);
    await saisir('ordonnanceclient #formNouveauClient #ncTelephone', '0707070707');
    await p.evaluate(() => { Ext.ComponentQuery.query('ordonnanceclient #formNouveauClient #ncSexe')[0].setValue('F'); });
    await clic('ordonnanceclient #formNouveauClient button[itemId=creerClient]');
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheClient')[0]; return !!(c.getValue() && c.findRecordByValue(c.getValue())); }, null, { timeout: 15000 });
    const enBase = q("SELECT CONCAT_WS('|', c.lg_CLIENT_ID, c.lg_TYPE_CLIENT_ID, t.str_NAME, c.str_ADRESSE, c.str_SEXE) FROM t_client c JOIN t_type_client t ON t.lg_TYPE_CLIENT_ID=c.lg_TYPE_CLIENT_ID WHERE c.str_FIRST_NAME='" + NOM + "' AND c.str_LAST_NAME='" + PRENOM + "'").split('|');
    ok('Client créé en STANDARD, avec son téléphone et son genre', enBase[2] === 'Standard' && enBase[3] === '0707070707' && enBase[4] === 'F', enBase.join(' | '));
    const fiche = await p.evaluate(() => { const f = Ext.ComponentQuery.query('ordonnanceclient #vueFiche')[0]; return { id: f.down('#ficheClient').getValue(), affiche: f.down('#ficheClient').getRawValue(), sexe: f.down('#sexePatient').getValue(), formCache: !f.down('#formNouveauClient').isVisible() }; });
    ok('Le client créé est choisi dans la fiche, le formulaire se referme, le genre passe au contexte clinique', fiche.id === enBase[0] && new RegExp(NOM).test(fiche.affiche) && fiche.sexe === 'F' && fiche.formCache, JSON.stringify(fiche));
    /* ---------------------------------------------------- prescripteur rapide (23/09) */
    await p.click('#' + (await idDe('ordonnanceclient #vueFiche #ficheMedecin')) + '-inputEl');
    await p.keyboard.type('ZZDOCTEUR', { delay: 30 });
    await clic('ordonnanceclient #vueFiche button[itemId=nouveauMedecin]');
    const nm = await p.evaluate(() => { const f = Ext.ComponentQuery.query('ordonnanceclient #formNouveauMedecin')[0]; return { visible: f.isVisible(), nom: f.down('#nmNom').getValue() }; });
    ok('Prescripteur : « Nouveau » ouvre la saisie rapide, le nom tapé est repris', nm.visible && nm.nom === 'ZZDOCTEUR', JSON.stringify(nm));
    await saisir('ordonnanceclient #formNouveauMedecin #nmPrenom', 'Awa');
    await saisir('ordonnanceclient #formNouveauMedecin #nmSpecialite', 'Pédiatre');
    await clic('ordonnanceclient #formNouveauMedecin button[itemId=creerMedecin]');
    await p.waitForTimeout(600);
    const med = q("SELECT CONCAT_WS('|', lg_MEDECIN_ID, str_FIRST_NAME, str_LAST_NAME, str_Commentaire, str_STATUT) FROM t_medecin WHERE str_LAST_NAME='ZZDOCTEUR'").split('|');
    const choixMed = await p.evaluate(() => { const c = Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheMedecin')[0]; return { id: c.getValue(), affiche: c.getRawValue(), cache: !Ext.ComponentQuery.query('ordonnanceclient #formNouveauMedecin')[0].isVisible() }; });
    ok('Prescripteur créé (actif, spécialité notée) et choisi dans la fiche', med[1] === 'AWA' && med[3] === 'Pédiatre' && med[4] === 'enable' && choixMed.id === med[0] && /ZZDOCTEUR/.test(choixMed.affiche) && choixMed.cache, JSON.stringify([med, choixMed]));
    const doublon = await p.evaluate(async () => JSON.parse(await (await fetch('../api/v1/ordonnance-client/medecins/creer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'zzdocteur', prenom: 'awa' }) })).text()));
    ok('Même nom et prénom : pas de doublon, le prescripteur existant est rendu', doublon.existant === true && doublon.id === med[0] && q("SELECT COUNT(*) FROM t_medecin WHERE str_LAST_NAME='ZZDOCTEUR'") === '1', JSON.stringify(doublon));

    /* ---------------------------------------------------- etablissement rapide (23/09) */
    await clic('ordonnanceclient #vueFiche button[itemId=nouvelEtablissement]');
    await saisir('ordonnanceclient #formNouvelEtablissement #neNom', 'Clinique ZZ Essai');
    await clic('ordonnanceclient #formNouvelEtablissement button[itemId=ajouterEtablissement]');
    const etab = await p.evaluate(() => Ext.ComponentQuery.query('ordonnanceclient #vueFiche #ficheEtablissement')[0].getRawValue());
    ok('Établissement ajouté et posé dans la fiche', etab === 'CLINIQUE ZZ ESSAI', etab);

    /* L ordonnance s enregistre sur ce client. */
    const c = await p.evaluate(() => { const g = Ext.ComponentQuery.query('ordonnanceclient #grilleProduits')[0]; const col = g.down('#colProduit'); const n = g.getView().getCell(g.getStore().getAt(0), col).dom.getBoundingClientRect(); return { x: n.left + 20, y: n.top + n.height / 2 }; });
    await p.mouse.click(c.x, c.y); await p.waitForTimeout(400);
    await p.keyboard.type('PRODUIT LIBRE ' + NOM); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    await p.evaluate((m) => { Ext.ComponentQuery.query('ordonnanceclient #vueFiche #observations')[0].setValue(m); }, NOM);
    await clic('ordonnanceclient #vueFiche button[itemId=enregistrer]');
    await p.waitForTimeout(800);
    ok('L ordonnance s enregistre sur le nouveau client, avec le prescripteur et l établissement créés', q("SELECT CONCAT_WS('|', COUNT(*), MAX(lg_MEDECIN_ID), MAX(str_ETABLISSEMENT)) FROM t_ordonnance_client WHERE lg_CLIENT_ID='" + enBase[0] + "'") === '1|' + med[0] + '|CLINIQUE ZZ ESSAI');
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Le parcours va au bout', false, e.message + ' ' + (e.stack || '').split('\n')[1]);
  } finally {
    await b.close();
    const ids = q("SELECT GROUP_CONCAT(CONCAT(\"'\", lg_CLIENT_ID, \"'\")) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'");
    if (ids && ids !== 'NULL') {
      exec('DELETE d FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID=d.lg_ORDONNANCE_ID WHERE o.lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_ordonnance_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (' + ids + ')');
      exec('DELETE FROM t_client WHERE lg_CLIENT_ID IN (' + ids + ')');
    }
    exec("DELETE FROM t_medecin WHERE str_LAST_NAME='ZZDOCTEUR'");
    ok('Remise en état : client et ordonnance de test retirés', q("SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME='" + NOM + "'") === '0');
    const kos = res.filter((r) => !r.c);
    console.log('\n' + res.filter((r) => r.c).length + '/' + res.length + ' controles OK');
    process.exit(kos.length ? 1 : 0);
  }
})();
