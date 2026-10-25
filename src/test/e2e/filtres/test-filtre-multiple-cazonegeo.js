/* FILTRE MULTIPLE (maquette validee le 13/10) sur « CA emplacement/famille » (cazonegeomanager).
 *  - presentation B par defaut : un bouton « Filtres », panneau a onglets Rayon / Famille / Grossiste ;
 *  - cocher 3 rayons : le tableau ne garde que ces 3 rayons, avec les memes montants qu'en les demandant un par un ;
 *  - etiquettes sous la barre ; retirer une etiquette relance la recherche ;
 *  - rayon ET famille combines ; grossiste ; recherche dans la liste ; « Tout cocher » ne coche que les lignes affichees ;
 *  - bouton ⇄ : presentation A (un bouton par axe), memorisee pour l'utilisateur, puis retour a B ;
 *  - l'API accepte toujours un seul identifiant (ancien fonctionnement) et refuse sans erreur une saisie piegee ;
 *  - aucune erreur JavaScript, aucune fenetre.
 * Seule ecriture : la preference de presentation de l'admin, remise a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { fichierEdition } = require('../support/editions');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const PREF = q("SELECT COALESCE((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'filtres.presentation'), '__absent__')");

(async () => {
  q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'filtres.presentation'");
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const err = [], dialogues = [];
  p.on('pageerror', (e) => err.push(String(e.message))); p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const api = (params) => p.evaluate(async (u) => (await fetch('../api/v1/ca-zone-geo?' + u)).json(), new URLSearchParams(Object.assign({ typePeriode: 'TROIS_MOIS', regroupement: 'ZONE' }, params)).toString());
  const total = (j) => (j.data || []).reduce((s, x) => s + Number(x.total || 0), 0);
  const ouvrirEcran = async () => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('cazonegeomanager', 'CA emplacement/famille', ''));
    await p.waitForFunction(() => { const f = Ext.ComponentQuery.query('cazonegeomanager #filtres')[0]; return f && f.rendered && Ext.ComponentQuery.query('filtresmulti button').length > 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  const lignesTableau = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('cazonegeomanager grid')[0]; return g.getStore().getRange().map((r) => r.get('zoneId')).filter((z) => z !== undefined); });
  const attendreRecherche = () => p.waitForFunction(() => { const e = Ext.ComponentQuery.query('cazonegeomanager')[0]; return e && !(e.getEl().isMasked && e.getEl().isMasked()); }, null, { timeout: 30000 }).then(() => p.waitForTimeout(600));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* donnees : les 3 rayons qui ont le plus de CA sur la periode, par l'API elle-meme */
    const tous = await api({});
    const rayons = (tous.data || []).filter((x) => x.zoneId).sort((a, c) => c.total - a.total).slice(0, 3).map((x) => x.zoneId);
    ok('Précondition : au moins 3 rayons avec du CA sur 3 mois', rayons.length === 3, (tous.data || []).length + ' lignes');
    const unParUn = [];
    for (const z of rayons) { unParUn.push(total(await api({ zoneId: z }))); }

    await ouvrirEcran();
    const etat0 = await p.evaluate(() => { const f = Ext.ComponentQuery.query('cazonegeomanager #filtres')[0];
      return { presentation: f.presentation, ouvrir: !!f.down('#fmOuvrir'), zoneVisible: Ext.ComponentQuery.query('cazonegeomanager #zone')[0].isVisible(),
        familleVisible: Ext.ComponentQuery.query('cazonegeomanager #famille')[0].isVisible() }; });
    ok('Présentation B par défaut : un bouton « Filtres », anciennes listes masquées', etat0.presentation === 'B' && etat0.ouvrir && !etat0.zoneVisible && !etat0.familleVisible, JSON.stringify(etat0));

    /* panneau : 3 rayons coches */
    await p.click('.fm .fm-bouton');
    await p.waitForSelector('.fm-panneau .fm-case');
    const onglets = await p.$$eval('.fm-panneau .fm-axe', (x) => x.map((y) => y.textContent));
    ok('Panneau : onglets Rayon / Famille / Grossiste', JSON.stringify(onglets) === JSON.stringify(['Rayon', 'Famille', 'Grossiste']), onglets.join('|'));
    for (const z of rayons) { await p.click('.fm-panneau input[data-id="' + z + '"]'); }
    const recap = await p.textContent('.fm-panneau .fm-recap');
    ok('Récapitulatif « Votre sélection » : Rayon (3)', /Rayon \(3\)/.test(recap), recap.slice(0, 120));
    await p.click('.fm-panneau [data-action="appliquer"]');
    await attendreRecherche();
    const lignes3 = await lignesTableau();
    ok('Tableau : seulement les 3 rayons cochés', lignes3.length === 3 && lignes3.every((z) => rayons.indexOf(z) >= 0), JSON.stringify(lignes3));
    const total3 = total(await api({ zoneId: rayons.join(',') }));
    ok('Montant des 3 rayons = somme des 3 rayons demandés un par un', total3 === unParUn.reduce((s, x) => s + x, 0) && total3 > 0, total3 + ' / ' + unParUn.join('+'));
    const etiquettes = await p.$$eval('.fm-etiquettes .fm-etiquette', (x) => x.length);
    ok('Étiquettes sous la barre : 3', etiquettes === 3, etiquettes);

    /* retrait d'une etiquette */
    await p.click('.fm-etiquettes .fm-etiquette .fm-retirer');
    await attendreRecherche();
    const lignes2 = await lignesTableau();
    ok('Retirer une étiquette relance la recherche (2 rayons)', lignes2.length === 2, JSON.stringify(lignes2));

    /* rayon ET famille ; grossiste */
    const famille = q("SELECT f.lg_FAMILLEARTICLE_ID FROM t_famille f WHERE f.lg_ZONE_GEO_ID IN ('" + rayons.join("','") + "') AND f.lg_FAMILLEARTICLE_ID IS NOT NULL GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1");
    const combine = total(await api({ zoneId: rayons.join(','), familleId: famille }));
    const zoneSeule = total(await api({ zoneId: rayons.join(',') }));
    ok('Rayons ET famille : sous-ensemble des rayons seuls', combine > 0 && combine <= zoneSeule, combine + ' <= ' + zoneSeule);
    const gros = q("SELECT f.lg_GROSSISTE_ID FROM t_famille f WHERE f.lg_ZONE_GEO_ID = '" + rayons[0] + "' AND f.lg_GROSSISTE_ID IS NOT NULL GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1");
    const avecGros = total(await api({ zoneId: rayons[0], grossisteId: gros }));
    ok('Grossiste : filtre pris en compte (sous-ensemble du rayon)', avecGros > 0 && avecGros <= unParUn[0], avecGros + ' <= ' + unParUn[0]);

    /* recherche et « Tout cocher » limite aux lignes affichees */
    await p.click('.fm .fm-bouton');
    await p.waitForSelector('.fm-panneau .fm-case');
    await p.click('.fm-panneau [data-ouvrir="famille"]');
    const mot = q("SELECT LEFT(str_LIBELLE, 4) FROM t_famillearticle WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE DESC LIMIT 1");
    await p.fill('.fm-panneau .fm-cherche', mot);
    await p.waitForTimeout(300);
    const affichees = await p.$$eval('.fm-panneau .fm-case', (x) => x.map((y) => y.textContent.trim()));
    ok('Recherche dans la liste : seules les familles qui contiennent « ' + mot + ' »', affichees.length >= 1 && affichees.every((t) => t.toUpperCase().indexOf(mot.toUpperCase()) >= 0), affichees.join('|'));
    await p.click('.fm-panneau [data-action="tout"]');
    const nbFam = await p.evaluate(() => Ext.ComponentQuery.query('cazonegeomanager #filtres')[0].getValeurs().famille.length);
    ok('« Tout cocher » ne coche que les lignes affichées', nbFam === affichees.length, nbFam + ' / ' + affichees.length);
    await p.click('.fm-panneau [data-action="rien"]');
    await p.mouse.click(5, 5);
    await attendreRecherche();

    /* presentation A, memorisee */
    await p.click('.fm .fm-presentation');
    await p.waitForTimeout(800);
    const etatA = await p.evaluate(() => { const f = Ext.ComponentQuery.query('cazonegeomanager #filtres')[0];
      return { presentation: f.presentation, boutons: f.query('button[itemId^=fmAxe-]').map((x) => x.getText().replace(/<[^>]+>/g, '')), etiquettesVisibles: f.barreEtiquettes.isVisible() }; });
    ok('Bouton ⇄ : présentation A, un bouton par axe avec le résumé', etatA.presentation === 'A' && etatA.boutons.length === 3 && /^Rayon : /.test(etatA.boutons[0]) && /\+?/.test(etatA.boutons[0]), JSON.stringify(etatA));
    await p.waitForTimeout(800);
    ok('Choix mémorisé pour l\'utilisateur (préférence A)', /"A"/.test(q("SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'filtres.presentation'")));
    await p.click('.fm .fm-bouton');
    await p.waitForSelector('.fm-panneau .fm-case');
    const axesA = await p.$$eval('.fm-panneau .fm-axe', (x) => x.length);
    ok('Présentation A : la liste d\'un seul axe, sans onglets', axesA === 0);
    await p.mouse.click(5, 5);
    await p.evaluate(() => { Ext.ComponentQuery.query('cazonegeomanager')[0].close(); });
    await p.waitForTimeout(500);
    await ouvrirEcran();
    await p.waitForTimeout(1000);
    ok('Réouverture de l\'écran : présentation A conservée', await p.evaluate(() => Ext.ComponentQuery.query('cazonegeomanager #filtres')[0].presentation) === 'A');
    await p.click('.fm .fm-presentation');
    await p.waitForTimeout(800);
    ok('Retour à la présentation B', await p.evaluate(() => Ext.ComponentQuery.query('cazonegeomanager #filtres')[0].presentation) === 'B');

    /* impression : NOMS des rayons et du grossiste coches dans le titre */
    const noms = rayons.slice(0, 2).map((z) => q("SELECT str_LIBELLEE FROM t_zone_geographique WHERE lg_ZONE_GEO_ID = '" + z + "'"));
    const nomGros = q("SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + gros + "'");
    const pdf = await p.evaluate(async (u) => (await fetch('../api/v1/ca-zone-geo/pdf?' + u)).json(),
      new URLSearchParams({ typePeriode: 'TROIS_MOIS', regroupement: 'ZONE', zoneId: rayons.slice(0, 2).join(','), grossisteId: gros }).toString());
    const texte = pdf.msg ? execFileSync('pdftotext', ['-layout', fichierEdition(pdf.msg), '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ') : '';
    ok('Impression : les noms des rayons et du grossiste cochés', noms.every((n) => texte.indexOf(n.replace(/\s+/g, ' ')) >= 0) && texte.indexOf(nomGros) >= 0 && /Rayons :/.test(texte),
      noms.join(' / ') + ' + ' + nomGros + ' :: ' + texte.slice(0, 300) + (pdf.msg ? '' : JSON.stringify(pdf)));

    /* compatibilite et saisie piegee */
    const un = await api({ zoneId: rayons[0] });
    ok('API : un seul identifiant comme avant', un.success !== false && total(un) === unParUn[0], total(un));
    const piege = await api({ zoneId: "x' OR '1'='1", familleId: '1) OR SLEEP(3)-- -' });
    ok('API : saisie piégée traitée comme un identifiant inconnu (aucun résultat, pas d\'erreur)', piege.success !== false && total(piege) === 0, JSON.stringify(piege).slice(0, 120));
    ok('Aucune erreur JavaScript, aucune fenêtre', err.length === 0 && dialogues.length === 0, err.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    q("DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '" + ADMIN + "' AND str_CLE = 'filtres.presentation'");
    if (PREF !== '__absent__') { q("INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR, dt_UPDATED) VALUES ('" + ADMIN + "', 'filtres.presentation', '" + PREF.replace(/'/g, "''") + "', NOW())"); }
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
