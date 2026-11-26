/* PARAMETRAGES > « Mode de règlements » : la liste ne transporte plus les images des QR codes (journal support du
 * 26/11, capitale, J26-7).
 *
 * Le 25/11 a 09:59, `GET modereglement/all` a depasse 5 s (connu depuis le 31/08). Chaque mode de reglement porte son
 * QR code (MEDIUMBLOB) : la liste chargeait les images et org.json les ecrivait en tableaux de nombres (« [-119,80,
 * 78,...] »), soit plusieurs Mo de JSON pour une vignette de 50 px. Correctif : la liste donne l'adresse de l'image,
 * servie a part (`GET modereglement/{id}/qrcode`).
 *
 * Par les vues : connexion, menu, ecran. Rapprochement base / ecran / image :
 *  - lignes de la grille = modes actifs en base (hors 3, 4 et 6, ecartes par la liste), meme libelle ;
 *  - une vignette affichee (image chargee) pour chaque mode dont le QR code est en base, aucune pour les autres ;
 *  - octets de chaque image servie = LENGTH(qr_code) en base ;
 *  - reponse de la liste : moins de 20 Ko, en moins de 2 s, sans tableau d'octets ;
 *  - bilan : l'ouverture de l'ecran n'ecrit rien (t_mode_reglement inchangee) ; aucune erreur JavaScript.
 * Lecture seule : rien a retirer.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const lignes = (s) => q(s).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
const EMPREINTE = "SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', lg_MODE_REGLEMENT_ID, str_STATUT, IFNULL(MD5(qr_code), ''),"
  + " IFNULL(lg_CLIENT_DEFAUT_ID, '')) ORDER BY lg_MODE_REGLEMENT_ID)) FROM t_mode_reglement";

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    const avant = q(EMPREINTE);
    const enBase = lignes("SELECT m.lg_MODE_REGLEMENT_ID, t.str_NAME, IFNULL(LENGTH(m.qr_code), 0) FROM t_mode_reglement m"
      + " JOIN t_type_reglement t ON t.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID"
      + " WHERE m.str_STATUT = 'enable' AND m.lg_MODE_REGLEMENT_ID NOT IN ('3', '4', '6')");
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    const t0 = Date.now();
    const reponse = p.waitForResponse((r) => r.url().includes('/api/v1/modereglement/all'), { timeout: 120000 });
    await ouvrirMenu(p, 'PARAMETRAGES', 'Mode de règlements');
    const r = await reponse;
    const corps = await r.text();
    const duree = Date.now() - t0;
    let total = -1; try { total = JSON.parse(corps).total; } catch (e) { /* reponse illisible */ }
    ok('Liste des modes : réponse valide, autant de modes qu\'en base', r.status() === 200 && total === enBase.length, r.status() + ' ; ' + corps.slice(0, 200));
    ok('Liste des modes : moins de 20 Ko', corps.length < 20000, corps.length + ' octets');
    ok('Liste des modes : en moins de 2 s (ouverture du menu comprise)', duree < 2000, duree + ' ms');
    ok('Liste des modes : aucune image en tableau d\'octets', !/"qrCode"\s*:\s*\[/.test(corps), corps.slice(0, 200));

    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('modereglementgrid')[0]; return g && g.isVisible(true) && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    await p.waitForFunction(() => [...document.querySelectorAll('.x-grid-cell img')].every((i) => i.complete), null, { timeout: 30000 });
    const ecran = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('modereglementgrid')[0];
      const colonne = g.columns.filter((c) => c.dataIndex === 'qrCode')[0];
      return g.getStore().getRange().map((rec) => {
        const ligne = g.getView().getNode(rec);
        const cellule = ligne && colonne && ligne.querySelector('.x-grid-cell-' + colonne.id);
        const img = cellule && cellule.querySelector('img');
        return { id: rec.get('id'), nom: rec.get('name'), image: !!(img && img.complete && img.naturalWidth > 0), src: img ? img.src : '' };
      });
    });
    const parId = new Map(ecran.map((e) => [e.id, e]));
    ok('Écran = base : mêmes modes, même nombre', ecran.length === enBase.length && enBase.every(([id]) => parId.has(id)),
      ecran.length + ' / ' + enBase.length);
    ok('Écran = base : même libellé, ligne par ligne', enBase.every(([id, nom]) => parId.get(id) && parId.get(id).nom === nom));
    const avecQr = enBase.filter((l) => Number(l[2]) > 0);
    ok('Une vignette affichée pour chaque QR code en base, aucune ailleurs',
      enBase.every(([id, , n]) => parId.get(id) && parId.get(id).image === (Number(n) > 0)),
      JSON.stringify(ecran.map((e) => e.id + ':' + e.image)));
    for (const [id, , n] of avecQr) {
      const src = parId.get(id) ? parId.get(id).src : '';
      const taille = await p.evaluate(async (u) => { if (!u) { return -1; } const x = await fetch(u); return (await x.arrayBuffer()).byteLength; }, src);
      ok(`Mode ${id} : image servie = QR code en base, octet pour octet`, taille === Number(n), taille + ' / ' + n);
    }
    ok('Bilan : l\'ouverture de l\'écran n\'a rien écrit dans t_mode_reglement', q(EMPREINTE) === avant);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
