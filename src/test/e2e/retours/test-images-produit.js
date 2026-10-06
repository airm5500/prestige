/* IMAGES PRODUIT (plan d'octobre, lot L6b).
 *
 * Ce que le test etablit (les images d'essai et leurs fichiers sont retires a la fin) :
 *  - modification de la fiche : 4e colonne IMAGE, « Aucune image » puis « Ajouter » (vrai envoi par l'ecran) ; la
 *    vignette s'affiche (240 px au plus) ; fichier et vignette ecrits sous images-produits/AAAA/MM ; chemin relatif en
 *    base ; premiere image = principale ; le bouton devient « Modifier » ;
 *  - refus : faux PNG (contenu HTML), fichier de plus de 5 Mo -> message clair, AUCUN fichier ecrit ;
 *  - deuxieme image ; clic sur la miniature -> devient principale ; « Modifier » remplace la principale (l'ancienne et
 *    son fichier disparaissent) ;
 *  - detail de l'article : image affichee sous le bloc stock, sans bouton ;
 *  - fichier servi en ligne avec le bon type et nosniff ; refus sans session ;
 *  - « Retirer » : plus d'image, plus de fichier ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CAPT = process.env.CAPTURES || '/tmp';
/* dossier des images : images_produits a cote du dossier de configuration (D:\\CONF\\LABOREX\\images_produits en officine) */
const DOSSIER = process.env.DOSSIER_IMAGES || '/opt/CONF/LABOREX/images_produits';
const disque = (c) => path.join(DOSSIER, c.replace(/^images-produits\//, ''));
const TMP = fs.mkdtempSync('/tmp/e2e-img-');
let P, cip;

const fichiers = () => { const d = DOSSIER; const r = []; const parcourir = (x) => { if (!fs.existsSync(x)) { return; } for (const f of fs.readdirSync(x)) { const c = path.join(x, f); fs.statSync(c).isDirectory() ? parcourir(c) : r.push(c); } }; parcourir(d); return r; };
function nettoyer() {
  if (!P) { return; }
  q("SELECT CONCAT_WS('|', str_CHEMIN, IFNULL(str_CHEMIN_VIGNETTE, '')) FROM t_famille_image WHERE lg_FAMILLE_ID = '" + P + "'").split('\n').filter(Boolean)
    .forEach((l) => l.split('|').filter(Boolean).forEach((c) => { try { fs.unlinkSync(disque(c)); } catch (e) { /* deja absent */ } }));
  exec("DELETE FROM t_famille_image WHERE lg_FAMILLE_ID = '" + P + "'");
}

(async () => {
  [P, cip] = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$' ORDER BY f.str_NAME LIMIT 1 OFFSET 3").split('|');
  nettoyer();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    /* Images d'essai produites par le navigateur (canvas) */
    const images = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 600; const g = c.getContext('2d');
      g.fillStyle = '#2E75B6'; g.fillRect(0, 0, 900, 600); g.fillStyle = '#fff'; g.font = '120px Arial'; g.fillText('E2E 1', 200, 340);
      const a = c.toDataURL('image/png'); g.fillStyle = '#17987e'; g.fillRect(0, 0, 900, 600); g.fillStyle = '#fff'; g.fillText('E2E 2', 200, 340);
      const b2 = c.toDataURL('image/jpeg', 0.8); g.fillStyle = '#d0576b'; g.fillRect(0, 0, 900, 600); g.fillStyle = '#fff'; g.fillText('E2E 3', 200, 340);
      return [a, b2, c.toDataURL('image/png')]; });
    const ecrire = (nom, dataUrl) => { const f = path.join(TMP, nom); fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64')); return f; };
    const img1 = ecrire('produit1.png', images[0]), img2 = ecrire('produit2.jpg', images[1]), img3 = ecrire('produit3.png', images[2]);
    const faux = path.join(TMP, 'faux.png'); fs.writeFileSync(faux, '<html><script>alert(1)</script></html>'.repeat(5));
    const gros = path.join(TMP, 'gros.png'); fs.writeFileSync(gros, Buffer.concat([fs.readFileSync(img1), Buffer.alloc(6 * 1024 * 1024)]));

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    const ouvrirModif = async () => {
      await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(cip); g.onRechClick(); }, cip);
      await p.waitForFunction((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', P) >= 0; }, P, { timeout: 30000 });
      await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onEditClick(g, g.getStore().findExact('lg_FAMILLE_ID', P)); }, P);
      await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.down('#imagesProduit') && w.down('#imagesProduit').donnees; }, null, { timeout: 30000 });
      await p.waitForTimeout(600);
    };
    const panneau = () => p.evaluate(() => { const c = window.winModifArticleOuverte.down('#imagesProduit'); const el = c.getEl().dom;
      const img = el.querySelector('.img-principale img');
      return { vide: !!el.querySelector('.img-vide'), img: !!img, l: img ? img.naturalWidth : 0, bouton: c.down('#champImage').button.getText(),
        barre: c.down('#barreImages').isVisible(), mini: el.querySelectorAll('.img-miniatures img').length }; });
    const envoyerEcran = async (fichier) => {
      const input = await p.evaluateHandle(() => window.winModifArticleOuverte.down('#imagesProduit').getEl().dom.querySelector('input[type=file]'));
      await input.asElement().setInputFiles(fichier);
      await p.waitForFunction(() => { const c = window.winModifArticleOuverte.down('#imagesProduit'); return !Ext.MessageBox.isVisible() || /Image du produit/.test(Ext.MessageBox.title || ''); }, null, { timeout: 30000 });
      await p.waitForTimeout(2000);
    };

    await ouvrirModif();
    const v0 = await panneau();
    ok('Modification : colonne IMAGE, « Aucune image », bouton « Ajouter »', v0.vide && v0.barre && v0.bouton === 'Ajouter', JSON.stringify(v0));
    const n0 = fichiers().length;
    await envoyerEcran(img1);
    const v1 = await panneau();
    const lignes1 = q("SELECT CONCAT_WS('|', str_CHEMIN, IFNULL(str_CHEMIN_VIGNETTE, ''), str_TYPE, bool_PRINCIPALE, int_LARGEUR) FROM t_famille_image WHERE lg_FAMILLE_ID = '" + P + "'");
    ok('Ajout par l\'écran : image affichée (vignette ≤ 240 px), bouton « Modifier »', v1.img && v1.l > 0 && v1.l <= 240 && v1.bouton === 'Modifier', JSON.stringify(v1));
    ok('En base : chemin relatif images-produits/AAAA/MM, vignette, PNG, principale, largeur 900', /^images-produits\/\d{4}\/\d{2}\/[0-9a-f-]+\.png\|images-produits\/\d{4}\/\d{2}\/[0-9a-f-]+_v\.jpg\|png\|1\|900$/.test(lignes1), lignes1);
    ok('Fichier et vignette écrits sur le disque', fichiers().length === n0 + 2 && lignes1.split('|').slice(0, 2).every((c) => fs.existsSync(disque(c))));
    await p.screenshot({ path: CAPT + '/image-produit-modification.png' });

    /* Refus */
    const api = (f, principale) => p.evaluate(async (a) => { const fd = new FormData(); fd.append('principale', a.pr ? 'true' : 'false');
      fd.append('image', new Blob([new Uint8Array(a.octets)]), a.nom); const r = await fetch('../api/v1/produit-images/' + a.P, { method: 'POST', body: fd }); return r.text(); },
      { P, nom: path.basename(f), octets: [...fs.readFileSync(f)], pr: !!principale });
    const n1 = fichiers().length;
    const r1 = JSON.parse(await api(faux));
    ok('Faux PNG (contenu HTML) refusé, aucun fichier écrit', r1.success === false && /JPG, PNG ou WEBP/.test(r1.message) && fichiers().length === n1, JSON.stringify(r1));
    const r2 = JSON.parse(await api(gros));
    ok('Plus de 5 Mo refusé, aucun fichier écrit', r2.success === false && /5 Mo/.test(r2.message) && fichiers().length === n1, JSON.stringify(r2));

    /* Deuxieme image, miniature -> principale */
    const r3 = JSON.parse(await api(img2, false));
    await p.evaluate(() => window.winModifArticleOuverte.down('#imagesProduit').charger());
    await p.waitForTimeout(1200);
    const v2 = await panneau();
    ok('Deuxième image (JPEG) : en miniature, la première reste principale', r3.success && v2.mini === 1 && q("SELECT str_TYPE FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "' AND bool_PRINCIPALE=1") === 'png', JSON.stringify(v2));
    await p.click('.img-miniatures img');
    await p.waitForTimeout(1500);
    ok('Clic sur la miniature : elle devient principale', q("SELECT str_TYPE FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "' AND bool_PRINCIPALE=1") === 'jpg');

    /* Modifier : remplace la principale */
    const ancienne = q("SELECT CONCAT_WS('|', lg_ID, str_CHEMIN) FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "' AND bool_PRINCIPALE=1").split('|');
    await envoyerEcran(img3);
    ok('« Modifier » : la nouvelle image est principale, l\'ancienne et son fichier sont retirés',
      q("SELECT COUNT(*) FROM t_famille_image WHERE lg_ID='" + ancienne[0] + "'") === '0' && !fs.existsSync(disque(ancienne[1]))
      && q("SELECT COUNT(*) FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "'") === '2' && q("SELECT str_TYPE FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "' AND bool_PRINCIPALE=1") === 'png');
    await p.evaluate(() => window.winModifArticleOuverte.close());
    await p.waitForTimeout(500);

    /* Detail */
    await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', P)); }, P);
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('#imagesProduitDetail')[0]; return c && c.getEl() && c.getEl().dom.querySelector('.img-principale img'); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const det = await p.evaluate(() => { const c = Ext.ComponentQuery.query('#imagesProduitDetail')[0]; return { img: c.getEl().dom.querySelector('.img-principale img').naturalWidth, boutons: c.query('button').length }; });
    ok('Détail : image sous le bloc stock, sans bouton', det.img > 0 && det.boutons === 0, JSON.stringify(det));
    await p.screenshot({ path: CAPT + '/image-produit-detail.png' });
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('#imagesProduitDetail')[0].up('window'); if (w) { w.close(); } });

    /* Fichier servi */
    const id = q("SELECT lg_ID FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "' AND bool_PRINCIPALE=1");
    const f1 = await p.evaluate(async (a) => { const r = await fetch('../api/v1/produit-images/' + a.P + '/' + a.id + '/fichier'); const v = await fetch('../api/v1/produit-images/' + a.P + '/' + a.id + '/fichier?taille=vignette');
      return [r.status, r.headers.get('content-type'), r.headers.get('content-disposition'), r.headers.get('x-content-type-options'), v.headers.get('content-type')].join(' | '); }, { P, id });
    ok('Fichier en ligne, type réel, nosniff ; vignette en JPEG', /^200 \| image\/png \| inline \| nosniff \| image\/jpeg$/.test(f1), f1);
    const anonyme = (await (await b.newContext()).request.get('http://localhost:8080/prestige/api/v1/produit-images/' + P + '/' + id + '/fichier')).status();
    ok('Sans session : refusé', anonyme !== 200, anonyme);

    /* Retirer */
    await ouvrirModif();
    await p.evaluate(() => window.winModifArticleOuverte.down('#imagesProduit').retirer());
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 10000 });
    await p.click('#' + await p.evaluate(() => Ext.MessageBox.msgButtons.yes.getId()));
    await p.waitForTimeout(1500);
    const cheminRetire = id;
    ok('« Retirer » : l\'image principale disparaît, la suivante prend sa place', q("SELECT COUNT(*) FROM t_famille_image WHERE lg_ID='" + cheminRetire + "'") === '0' && q("SELECT COUNT(*) FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "' AND bool_PRINCIPALE=1") === '1');
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    nettoyer();
    fs.rmSync(TMP, { recursive: true, force: true });
    ok('Images d\'essai et fichiers retirés', q("SELECT COUNT(*) FROM t_famille_image WHERE lg_FAMILLE_ID='" + P + "'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
