/* PLAN DU 14/11, POINT 2 : en-tete et pied de page propres a la pharmacie (images), apposes sur les factures.
 *
 * Par l'ecran (compte e2e) :
 *  - FACTURATION > En-tete des factures : en-tete charge (PNG 1200 x 240, 40 mm) ; pied : hauteur hors bornes refusee
 *    dans l'ecran, rien n'est ecrit ; pied charge (PNG 1200 x 120, 15 mm) ; hauteur seule changee (30 mm) sans
 *    toucher a l'image ; apercu PDF ; retrait confirme dans le bouton (premier clic : « Confirmer le retrait ? »,
 *    sans fenetre ; sans second clic en 10 s, rien n'est retire) ;
 *  - FACTURATION > Factures > Imprimer : la meme facture imprimee avant, avec l'en-tete et le pied, avec le pied seul,
 *    puis sans rien.
 *  - rapprochement : image en base = fichier charge = image de l'apercu de l'ecran = image posee dans le PDF
 *    (dimensions) ; hauteur de l'ecran = hauteur en base ; texte du PDF identique avant / avec / apres ;
 *  - bilan : chaque page porte une image de plus par partie reglee, rien d'autre ; une ligne par partie dans
 *    t_entete_facture ; retrait = retour exact a la facture d'origine (memes images, meme texte, memes pages) ;
 *  - les impressions groupees (JSP modifiees) se compilent.
 * Nettoyage : t_entete_facture remise comme avant (vide), fichiers d'images du test retires.
 *
 * node src/test/e2e/facturation/test-entete-facture-1511.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const crypto = require('crypto');
const editions = require('../support/editions');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' })
  .replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

/* PNG RVB sans bibliotheque : signature, IHDR, IDAT (zlib), IEND */
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; } t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xFFFFFFFF; for (const x of b) { c = CRC[(c ^ x) & 0xFF] ^ (c >>> 8); } return (c ^ 0xFFFFFFFF) >>> 0; };
function morceau(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function png(l, h, couleur) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const brut = Buffer.alloc((l * 3 + 1) * h);
  for (let y = 0; y < h; y++) { for (let x = 0; x < l; x++) { const o = y * (l * 3 + 1) + 1 + x * 3; brut[o] = couleur[0]; brut[o + 1] = (couleur[1] + x) & 0xFF; brut[o + 2] = (couleur[2] + y) & 0xFF; } }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), morceau('IHDR', ihdr), morceau('IDAT', zlib.deflateSync(brut)), morceau('IEND', Buffer.alloc(0))]);
}
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-entete-'));
const IMG_E = path.join(TMP, 'entete-pharmacie.png'), IMG_P = path.join(TMP, 'pied-pharmacie.png');
fs.writeFileSync(IMG_E, png(1200, 240, [20, 60, 140]));
fs.writeFileSync(IMG_P, png(1200, 120, [150, 30, 30]));

/* texte et images d'un PDF (pdftotext, pdfimages -list) */
const texte = (f) => execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }).replace(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?/g, '').replace(/\s+/g, ' ').trim();
const images = (f) => execFileSync('pdfimages', ['-list', f], { encoding: 'utf8' }).replace(/\r/g, '').split('\n').slice(2).filter(Boolean)
  .map((l) => { const c = l.trim().split(/\s+/); return { page: Number(c[0]), l: Number(c[3]), h: Number(c[4]) }; });
const pages = (f) => Number((execFileSync('pdfinfo', [f], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/) || [])[1]);
const reglage = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', partie, hauteur, type, LENGTH(image), MD5(image), lg_USER_ID) ORDER BY partie SEPARATOR ';'), '') FROM t_entete_facture")
  .split(';').filter(Boolean).map((x) => x.split('|'));

/* facture imprimee : modele Jasper, quelques bons */
const [FID, FCODE, FCREE] = q("SELECT CONCAT_WS('|', f.lg_FACTURE_ID, f.str_CODE_FACTURE, DATE_FORMAT(f.dt_CREATED, '%d/%m/%Y')) FROM t_facture f JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = f.str_CUSTOMER"
  + " JOIN t_model_facture m ON m.lg_MODEL_FACTURE_ID = t.lg_MODEL_FACTURE_ID WHERE m.model_facture_dynamique_id IS NULL AND f.str_STATUT = 'enable' AND f.int_NB_DOSSIER BETWEEN 2 AND 30"
  + " ORDER BY f.dt_DATE_FACTURE DESC LIMIT 1").split('|');
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const AVANT = reglage();
const FENETRES_IMPRESSION = [];

(async () => {
  ok('Préparation : aucun en-tête en place, une facture à imprimer, compte e2e avec le droit', AVANT.length === 0 && !!FID
    && q("SELECT COUNT(*) FROM t_role_user ru JOIN t_role_privelege rp ON rp.lg_ROLE_ID = ru.lg_ROLE_ID JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE ru.lg_USER_ID = '" + U + "' AND p.str_NAME = 'P_SM_ENTETE_FACTURE'") !== '0',
  'facture ' + FCODE + ' ; réglage avant : ' + AVANT.length);
  if (AVANT.length) { console.log('ARRET : un en-tête est déjà en place, le test ne le remplace pas.'); process.exit(1); }
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue()));
  const fermerVolet = () => p.mouse.click(1550, 870);
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('messagebox, window').filter((w) => w.isVisible(true)).length);
  const etat = (partie) => p.evaluate((x) => Ext.ComponentQuery.query('entetefacture')[0].down('#etat' + x).el.dom.textContent, partie);
  const attendreEtat = async (partie, re) => { await p.waitForFunction(([x, r]) => new RegExp(r).test(Ext.ComponentQuery.query('entetefacture')[0].down('#etat' + x).el.dom.textContent), [partie, re.source], { timeout: 30000 }).catch(() => {}); return etat(partie); };
  const ecran = () => p.evaluate(() => { const e = Ext.ComponentQuery.query('entetefacture')[0];
    const im = (x) => { const i = e.down('#apercu' + x).el.dom.querySelector('img'); return i ? { l: i.naturalWidth, h: i.naturalHeight, ok: i.complete } : null; };
    return { hE: e.down('#hauteurENTETE').getValue(), hP: e.down('#hauteurPIED').getValue(), imE: im('ENTETE'), imP: im('PIED'),
      retirerE: { texte: e.down('#retirerENTETE').getText(), off: e.down('#retirerENTETE').isDisabled() }, retirerP: { off: e.down('#retirerPIED').isDisabled() } }; });
  const bouton = (itemId) => p.evaluate((i) => Ext.ComponentQuery.query('entetefacture')[0].down('#' + i).getId(), itemId).then((id) => p.locator('#' + id));
  const choisirFichier = async (partie, fichier) => {
    const id = await p.evaluate((x) => Ext.ComponentQuery.query('entetefacture')[0].down('#fichier' + x).getId(), partie);
    await p.locator('#' + id + ' input[type=file]').setInputFiles(fichier);
  };
  const hauteur = async (partie, v) => vues.saisir(p, 'entetefacture #hauteur' + partie, String(v)).catch(async () => {
    const id = await p.evaluate((x) => Ext.ComponentQuery.query('entetefacture')[0].down('#hauteur' + x).inputEl.id, partie);
    await p.fill('#' + id, String(v));
  });
  const ouvrirEcran = async () => {
    await vues.ouvrirMenu(p, 'FACTURATION', 'En-tête des factures');
    await fermerVolet();
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('entetefacture')[0]; return e && e.info && e.isVisible(true); }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
  };
  /* impression par la liste des factures (icone de la ligne) : le PDF est relu sur le disque */
  const imprimer = async (nom) => {
    await vues.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await fermerVolet();
    await p.waitForFunction(() => Ext.getCmp('facturemanagerID') && Ext.getCmp('rechecherFacture') && Ext.getCmp('rechecherFacture').isVisible(true), null, { timeout: 60000 });
    await vues.saisir(p, '#datedebut', FCREE);
    await vues.saisir(p, '#datefin', FCREE);
    await vues.saisir(p, '#rechecherFacture', '');
    await p.locator('.x-btn').filter({ visible: true }).filter({ hasText: /^\s*rechercher\s*$/ }).first().click();
    await p.waitForFunction((c) => { const s = Ext.getCmp('facturemanagerID').getStore(); return !s.isLoading() && !!s.findRecord('str_CODE_FACTURE', c, 0, false, true, true); }, FCODE, { timeout: 30000 });
    const noeud = await p.evaluate((c) => { const g = Ext.getCmp('facturemanagerID'); return g.getView().getNode(g.getStore().indexOf(g.getStore().findRecord('str_CODE_FACTURE', c, 0, false, true, true))).id; }, FCODE);
    const redirige = ctx.waitForEvent('response', { predicate: (r) => /ws_rp_facture_tiers_payant\.jsp/.test(r.url()) && r.status() === 302, timeout: 120000 });
    const ouvertes = [];
    const compter = (pg) => ouvertes.push(pg);
    ctx.on('page', compter);
    const [popup] = await Promise.all([ctx.waitForEvent('page'), p.locator('#' + noeud + ' [data-qtip^="Imprimer Bordereau"]').first().click()]);
    const r = await redirige;
    const fichier = editions.fichierEdition(r.headers().location || '');
    await p.waitForTimeout(1500);
    ctx.off('page', compter);
    FENETRES_IMPRESSION.push(ouvertes.length);
    for (const pg of ouvertes) { await pg.close().catch(() => {}); }
    const copie = path.join(TMP, nom + '.pdf');
    if (fs.existsSync(fichier)) { fs.copyFileSync(fichier, copie); }
    return fs.existsSync(copie) ? copie : null;
  };

  try {
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const ESSAI = (id) => vues.BASE + '/webservices/' + id;
    /* les impressions groupees modifiees se compilent (sans parametre : elles ne produisent rien, mais pas d'erreur de compilation) */
    const jsp = [];
    for (const j of ['sm_user/facturation/ws_rp_print_all_invoices.jsp', 'configmanagement/groupe/group_invoice_pdf.jsp', 'configmanagement/groupe/ws_allinvoice_pdf.jsp']) {
      const r = await ctx.request.get(ESSAI(j), { maxRedirects: 0 });
      const t = await r.text();
      jsp.push(j.split('/').pop() + ':' + r.status() + (/Unable to compile|cannot be resolved|PWC619[0-9]/i.test(t) ? ':COMPILATION' : ''));
    }
    ok('Impressions groupées modifiées : elles se compilent', jsp.every((x) => !/COMPILATION/.test(x)), jsp.join(' '));

    /* 0. facture d'origine */
    const pdf0 = await imprimer('0-origine');
    const n0 = pdf0 ? pages(pdf0) : 0, i0 = pdf0 ? images(pdf0) : [], t0 = pdf0 ? texte(pdf0) : null;
    ok('Facture d\'origine imprimée par l\'écran', !!pdf0 && n0 >= 1, pdf0 + ' : ' + n0 + ' page(s), ' + i0.length + ' image(s)');

    /* 1. en-tete : image chargee, 40 mm */
    await ouvrirEcran();
    const e0 = await ecran();
    ok('Écran : sans image, rien à retirer, hauteurs par défaut', !e0.imE && !e0.imP && e0.retirerE.off && e0.retirerP.off && e0.hE === 35 && e0.hP === 20, JSON.stringify(e0));
    await choisirFichier('ENTETE', IMG_E);
    await hauteur('ENTETE', 40);
    await (await bouton('enregistrerENTETE')).click();
    const m1 = await attendreEtat('ENTETE', /enregistr|impossible|Refus/i);
    const r1 = reglage();
    ok('En-tête enregistré par l\'écran : une ligne, 40 mm, image = fichier chargé, compte e2e', /En-tête enregistré/.test(m1) && r1.length === 1 && r1[0][0] === 'ENTETE'
      && r1[0][1] === '40' && r1[0][2] === 'png' && Number(r1[0][3]) === fs.statSync(IMG_E).size && r1[0][4] === md5(fs.readFileSync(IMG_E)) && r1[0][5] === U, m1 + ' | ' + JSON.stringify(r1.map((x) => x.slice(0, 4))));
    await p.waitForFunction(() => { const i = Ext.ComponentQuery.query('entetefacture')[0].down('#apercuENTETE').el.dom.querySelector('img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
    const e1 = await ecran();
    ok('Rapprochement : aperçu de l\'écran = image en base (1200 x 240), hauteur de l\'écran = base', e1.imE && e1.imE.l === 1200 && e1.imE.h === 240 && e1.hE === Number(r1[0][1]) && !e1.retirerE.off, JSON.stringify(e1));

    /* 2. pied : hauteur hors bornes refusee, rien d'ecrit ; puis 15 mm */
    await choisirFichier('PIED', IMG_P);
    await hauteur('PIED', 200);
    await (await bouton('enregistrerPIED')).click();
    await p.waitForTimeout(800);
    const m2 = await etat('PIED');
    ok('Pied à 200 mm : refusé dans l\'écran, rien n\'est écrit, aucune fenêtre', /hors bornes/i.test(m2) && reglage().length === 1 && (await fenetres()) === 0, m2);
    await hauteur('PIED', 15);
    await (await bouton('enregistrerPIED')).click();
    const m3 = await attendreEtat('PIED', /enregistr|impossible|Refus/i);
    const r3 = reglage();
    ok('Pied enregistré : deux lignes (en-tête 40 mm, pied 15 mm), image du pied = fichier chargé', /Pied de page enregistré/.test(m3) && r3.length === 2 && r3[1][0] === 'PIED' && r3[1][1] === '15'
      && r3[1][4] === md5(fs.readFileSync(IMG_P)) && r3[0][4] === r1[0][4], m3 + ' | ' + JSON.stringify(r3.map((x) => x.slice(0, 3))));

    /* 3. apercu sur une page d'essai */
    /* la fenetre ouverte par le bouton affiche le PDF : son adresse est relue avec la meme session */
    const [demande] = await Promise.all([ctx.waitForEvent('request', { predicate: (r) => /entete-facture\/apercu/.test(r.url()), timeout: 60000 }), (await bouton('apercu')).click()]);
    const fa = path.join(TMP, 'apercu.pdf'); fs.writeFileSync(fa, await (await ctx.request.get(demande.url())).body());
    for (const pg of ctx.pages()) { if (pg !== p) { await pg.close().catch(() => {}); } }
    const ia = images(fa);
    ok('Aperçu : page d\'essai avec l\'en-tête (1200 x 240) et le pied (1200 x 120), corps lisible', ia.length === 2 && ia.some((x) => x.l === 1200 && x.h === 240) && ia.some((x) => x.l === 1200 && x.h === 120)
      && /Corps de la facture/.test(texte(fa)), JSON.stringify(ia));

    /* 4. facture avec l'en-tete et le pied */
    const pdf1 = await imprimer('1-entete-pied');
    const i1 = pdf1 ? images(pdf1) : [], n1 = pdf1 ? pages(pdf1) : 0;
    const ajout1 = i1.length - i0.length;
    const parPage = (liste, l, h) => Array.from({ length: n1 }, (x, k) => liste.filter((im) => im.page === k + 1 && im.l === l && im.h === h).length);
    ok('Bilan : même nombre de pages, une image d\'en-tête et une de pied de plus sur chaque page, rien d\'autre', !!pdf1 && n1 === n0 && ajout1 === 2 * n0
      && parPage(i1, 1200, 240).every((x) => x === 1) && parPage(i1, 1200, 120).every((x) => x === 1), n1 + ' page(s), ' + i0.length + ' -> ' + i1.length + ' image(s)');
    ok('Rapprochement : texte de la facture identique avec l\'en-tête (montants, lignes)', pdf1 && texte(pdf1) === t0, (pdf1 ? texte(pdf1).length : -1) + ' / ' + (t0 || '').length);

    /* 5. hauteur seule : l'image ne change pas */
    await ouvrirEcran();
    await hauteur('ENTETE', 30);
    await (await bouton('enregistrerENTETE')).click();
    const m5 = await attendreEtat('ENTETE', /Hauteur|impossible|Refus/i);
    const r5 = reglage();
    ok('Hauteur seule : 30 mm en base, image de l\'en-tête inchangée, pied inchangé', /Hauteur enregistrée/.test(m5) && r5[0][1] === '30' && r5[0][4] === r1[0][4] && r5[1].join('|') === r3[1].join('|'), m5 + ' | ' + r5.map((x) => x[0] + ' ' + x[1]).join(', '));

    /* 6. retrait confirme dans le bouton */
    const retirer = await bouton('retirerENTETE');
    await retirer.click();
    await p.waitForTimeout(400);
    const c1 = await ecran();
    ok('Premier clic sur « Retirer » : le bouton demande confirmation, aucune fenêtre, rien n\'est retiré', /Confirmer le retrait/.test(c1.retirerE.texte) && (await fenetres()) === 0 && reglage().length === 2, c1.retirerE.texte);
    await p.waitForTimeout(10600);
    const c2 = await ecran();
    ok('Sans second clic en 10 s : le bouton revient, l\'en-tête reste', /^Retirer l'image$/.test(c2.retirerE.texte) && reglage().length === 2, c2.retirerE.texte);
    await retirer.click();
    await p.waitForTimeout(300);
    await retirer.click();
    const m6 = await attendreEtat('ENTETE', /retirée|Aucune|impossible/i);
    const r6 = reglage();
    ok('Deux clics : l\'en-tête est retiré, le pied reste', /Image retirée/.test(m6) && r6.length === 1 && r6[0][0] === 'PIED', m6);

    /* 7. facture avec le pied seul */
    const pdf2 = await imprimer('2-pied');
    const i2 = pdf2 ? images(pdf2) : [];
    ok('Facture avec le pied seul : une image de plus par page (le pied), texte identique', !!pdf2 && pages(pdf2) === n0 && i2.length - i0.length === n0
      && i2.filter((x) => x.l === 1200 && x.h === 120).length === n0 && i2.filter((x) => x.l === 1200 && x.h === 240).length === 0 && texte(pdf2) === t0, i0.length + ' -> ' + i2.length);

    /* 8. pied retire : retour exact a la facture d'origine */
    await ouvrirEcran();
    const retirerP = await bouton('retirerPIED');
    await retirerP.click(); await p.waitForTimeout(300); await retirerP.click();
    const m8 = await attendreEtat('PIED', /retirée|Aucune|impossible/i);
    const pdf3 = await imprimer('3-sans');
    const i3 = pdf3 ? images(pdf3) : [];
    ok('Tout retiré : table vide, facture revenue à l\'origine (pages, images, texte)', /Image retirée/.test(m8) && reglage().length === 0 && !!pdf3 && pages(pdf3) === n0
      && JSON.stringify(i3) === JSON.stringify(i0) && texte(pdf3) === t0, m8 + ' | ' + i3.length + ' / ' + i0.length);
    await ouvrirEcran();
    const e8 = await ecran();
    ok('Écran après retrait : aucune image, plus rien à retirer', !e8.imE && !e8.imP && e8.retirerE.off && e8.retirerP.off, JSON.stringify(e8));
    console.log('INFO  Fenêtres ouvertes par chaque impression : ' + FENETRES_IMPRESSION.join(', '));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (AVANT.length === 0) { q('DELETE FROM t_entete_facture'); }
    ok('Nettoyage : t_entete_facture remise comme avant', reglage().length === AVANT.length, reglage().length);
    fs.rmSync(TMP, { recursive: true, force: true });
    await b.close();
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
