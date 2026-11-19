/* DEMANDE 63 (applications mobiles, 19/11) : ticket dessine par le serveur et remise sur les ventes du mobile.
 *
 * 1. GET v1/vente/ticket/{type}/{id}/image?largeur=58|80&dpi=203 :
 *    - vente au comptant (deux produits, quantites 1 et 3) : largeur 58 -> PNG de 384 points, 80 -> 576, 57 -> 384,
 *      100 -> 576 ; largeurPoints / hauteurPoints = dimensions lues dans le PNG ; meme modele que l'apercu du poste ;
 *    - vente assurance a deux organismes : tickets dans l'ordre d'impression (rapprochement avec l'apercu du poste
 *      ticket/vo/{id}/apercu) ;
 *    - prevente : modele PREVENTE, QR code dans l'image (trois motifs de reperage) ;
 *    - sans session : 401 ; type inconnu : 400 success:false ;
 *    - bilan : rien en base (ventes, lignes, mouvements, date de mise a jour), aucun travail d'impression nouveau.
 * 2. Droit P_REMISE_VENTE : liste dans GET v1/user/droits ; compte dont le role ne l'a plus : vente/remise -> 403
 *    interdit, et a l'ecran de vente, le choix d'une remise affiche « Droit manquant : Remise sur une vente » ; droit
 *    rendu : success:true.
 * 3. client avec une remise sur sa fiche : rien choisi -> remise de la fiche ; « sans remise » (« 0 ») -> remise 0 a l'ecran du
 *    net, a la cloture et en base ; la vente suivante garde la remise de la fiche.
 * 5. vente/remise : remiseId inconnu -> success:false et message ; vente terminee -> success:false et message ; remise
 *    valide sur une vente au comptant -> data = net de net/vno (rapprochement) ; « 0 » -> sans remise (remise 0).
 * Jeu d'essai marque ZZAUDIT, retire a la fin. Lancement seul : node src/test/e2e/mobile/test-demande63-1911.js
 */
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const C = require('../audits/commun');
const L = require('../ligne-comptant/commun');
const vues = require('../outils/vues');
const { ok, q, exec, MARQUE } = C;

/* ---- lecture d'un PNG (niveaux de gris ou couleur, 8 bits) ---- */
function lirePng(b64) {
  const buf = Buffer.from(b64, 'base64');
  const largeur = buf.readUInt32BE(16), hauteur = buf.readUInt32BE(20), prof = buf[24], type = buf[25];
  const idat = [];
  for (let o = 8; o < buf.length;) {
    const n = buf.readUInt32BE(o), t = buf.toString('ascii', o + 4, o + 8);
    if (t === 'IDAT') { idat.push(buf.slice(o + 8, o + 8 + n)); }
    o += 12 + n;
  }
  const canaux = { 0: 1, 2: 3, 4: 2, 6: 4 }[type] || 1;
  const brut = zlib.inflateSync(Buffer.concat(idat));
  const ligne = largeur * canaux, gris = new Uint8Array(largeur * hauteur);
  let prec = Buffer.alloc(ligne);
  for (let y = 0; y < hauteur; y++) {
    const f = brut[y * (ligne + 1)], cur = Buffer.from(brut.slice(y * (ligne + 1) + 1, (y + 1) * (ligne + 1)));
    for (let i = 0; i < ligne; i++) {
      const a = i >= canaux ? cur[i - canaux] : 0, b = prec[i], c = i >= canaux ? prec[i - canaux] : 0;
      let v = cur[i];
      if (f === 1) { v += a; } else if (f === 2) { v += b; } else if (f === 3) { v += (a + b) >> 1; } else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < largeur; x++) { gris[y * largeur + x] = cur[x * canaux]; }
    prec = cur;
  }
  return { largeur, hauteur, prof, gris, noir: (x, y) => gris[y * largeur + x] < 128 };
}

/* motifs de reperage d'un QR code : 1:1:3:1:1 en ligne ET en colonne au meme centre ; centres regroupes */
function motifsQr(img) {
  const rapport = (r) => { const u = (r[0] + r[1] + r[3] + r[4]) / 4; return u >= 2 && r.every((v, i) => Math.abs(v - (i === 2 ? 3 * u : u)) <= u * 0.6); };
  const runs = (val, n) => { const r = []; let cur = val(0), len = 0, debut = 0;
    for (let i = 0; i <= n; i++) { const v = i < n ? val(i) : !cur; if (v === cur) { len++; } else { r.push({ noir: cur, len, debut }); cur = v; len = 1; debut = i; } } return r; };
  const centres = [];
  for (let y = 0; y < img.hauteur; y += 2) {
    const r = runs((x) => img.noir(x, y), img.largeur);
    for (let i = 0; i + 4 < r.length; i++) {
      if (!r[i].noir) { continue; }
      const l = r.slice(i, i + 5).map((x) => x.len);
      if (!rapport(l)) { continue; }
      const cx = r[i + 2].debut + (r[i + 2].len >> 1);
      const col = runs((yy) => img.noir(cx, yy), img.hauteur);
      const k = col.findIndex((x) => x.debut <= y && y < x.debut + x.len);
      if (k >= 2 && k + 2 < col.length && rapport(col.slice(k - 2, k + 3).map((x) => x.len))) { centres.push([cx, y]); }
    }
  }
  const groupes = [];
  centres.forEach(([x, y]) => { if (!groupes.some(([gx, gy]) => Math.abs(gx - x) < 15 && Math.abs(gy - y) < 15)) { groupes.push([x, y]); } });
  return groupes.length;
}

const travauxImpression = () => {
  try {
    return Number(execFileSync('powershell', ['-NoProfile', '-Command', '(Get-Printer | ForEach-Object { Get-PrintJob -PrinterName $_.Name -ErrorAction SilentlyContinue } | Measure-Object).Count'],
      { encoding: 'utf8' }).trim()) || 0;
  } catch (e) { return -1; }
};
const traces = (ids) => q("SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM t_preenregistrement_detail),"
  + " (SELECT COUNT(*) FROM mvttransaction), (SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_PREENREGISTREMENT_ID, '@', dt_UPDATED, '@', str_STATUT) ORDER BY lg_PREENREGISTREMENT_ID), '-')"
  + " FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + C.liste(ids) + ")))");

(async () => {
  C.ouvrirCaisse();
  const P1 = C.produit(21, 400), P2 = C.produit(22, 400);
  const REMISE = L.remiseEssai(10, [P1, P2]);
  const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + C.ENV_E2E.LOGIN + "' LIMIT 1");
  let droitRetire = null;
  let sess = await C.connecter();
  try {
    const api = sess.api;
    const vc = C.venteComptant(api);
    /* vente au comptant : deux produits, quantites 1 et 3 */
    const V1 = await vc.ajouter(P1, 1);
    await vc.ajouter(P2, 3, V1);
    const c1 = await vc.cloturer(V1);
    ok('Jeu d\'essai : vente au comptant terminée', c1.success === true, JSON.stringify(c1).slice(0, 200));
    /* vente assurance a deux organismes */
    const TPA = C.tiersPayant('D63A', '1'), TPB = C.tiersPayant('D63B', '1');
    const cl = await C.clientAssure(api, 'D63', [{ tp: TPA, taux: 70 }, { tp: TPB, taux: 20 }]);
    const tps = [{ lien: cl.lien(TPA), taux: 70, bon: 'B63A' }, { lien: cl.lien(TPB), taux: 20, bon: 'B63B' }];
    const va = C.venteAssurance(api);
    const { v: V2 } = await va.vendre(cl, tps, P1, 2);
    ok('Jeu d\'essai : vente assurance à deux organismes terminée', C.lignesTp(V2).split(';').length === 2, C.lignesTp(V2));
    /* prevente */
    const rp = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: P2.id, itemPu: P2.pu, qte: 2, qteServie: 2,
      devis: false, prevente: true, remiseId: '', venteId: null, userVendeurId: C.ADMIN });
    const V3 = rp.data && rp.data.lgPREENREGISTREMENTID;
    if (V3) { C.etat.ventes.push(V3); await api('PUT', '../api/v1/vente/terminerprevente/' + V3); }
    ok('Jeu d\'essai : prévente enregistrée', !!V3, JSON.stringify(rp).slice(0, 200));

    /* ---- 1. image du ticket ---- */
    const avant = traces([V1, V2, V3]);
    const jobsAvant = travauxImpression();
    const image = (type, id, largeur, dpi) => api('GET', '../api/v1/vente/ticket/' + type + '/' + id + '/image?largeur=' + largeur + (dpi ? '&dpi=' + dpi : ''));
    for (const [demande, attendu] of [[58, 384], [80, 576], [57, 384], [100, 576]]) {
      const r = await image('vno', V1, demande, 203);
      const t = (r.tickets || [])[0];
      const png = t ? lirePng(t.png) : null;
      ok('1. vno largeur=' + demande + ' : PNG de ' + attendu + ' points, dimensions annoncées = dimensions du PNG', r.success === true && r.largeur === (demande <= 58 ? 58 : 80)
        && !!png && png.largeur === attendu && t.largeurPoints === attendu && t.hauteurPoints === png.hauteur && png.hauteur > 200,
        r.http + ' ' + (png ? png.largeur + 'x' + png.hauteur + ' annoncé ' + t.largeurPoints + 'x' + t.hauteurPoints + ' ' + t.modele : JSON.stringify(r).slice(0, 200)));
    }
    const apercuVno = await api('GET', '../api/v1/vente/ticket/vno/' + V1 + '/apercu');
    const imgVno = await image('vno', V1, 58);
    ok('1. vno : mêmes tickets que l\'aperçu du poste (rapprochement)', (imgVno.tickets || []).map((t) => t.modele).join(',') === (apercuVno.tickets || []).map((t) => t.modele).join(',')
      && (imgVno.tickets || []).length > 0, (imgVno.tickets || []).map((t) => t.modele) + ' / ' + (apercuVno.tickets || []).map((t) => t.modele));
    const apercuVo = await api('GET', '../api/v1/vente/ticket/vo/' + V2 + '/apercu');
    const imgVo = await image('vo', V2, 80);
    const modelesVo = (imgVo.tickets || []).map((t) => t.modele).join(',');
    ok('1. vo à deux organismes : tickets dans l\'ordre d\'impression du poste', imgVo.success === true && modelesVo === (apercuVo.tickets || []).map((t) => t.modele).join(',')
      && (imgVo.tickets || []).every((t) => lirePng(t.png).largeur === 576), modelesVo + ' / ' + (apercuVo.tickets || []).map((t) => t.modele));
    const imgPv = await image('prevente', V3, 58);
    const tPv = (imgPv.tickets || [])[0];
    const qr = tPv ? motifsQr(lirePng(tPv.png)) : 0;
    ok('1. prévente : modèle PREVENTE, QR code dans l\'image', imgPv.success === true && tPv.modele === 'PREVENTE' && qr >= 3 && lirePng(tPv.png).largeur === 384,
      (tPv ? tPv.modele : JSON.stringify(imgPv).slice(0, 200)) + ', motifs de repérage ' + qr);
    const qrVno = motifsQr(lirePng(imgVno.tickets[0].png));
    ok('1. témoin : pas de QR code sur le ticket de vente', qrVno < 3, qrVno);
    const inconnu = await image('facture', V1, 58);
    ok('1. type inconnu : 400 success:false', inconnu.http === 400 && inconnu.success === false, inconnu.http + ' ' + inconnu.msg);
    const absente = await image('vno', 'ZZAUDIT-inexistante', 58);
    ok('1. vente inconnue : success:false avec message', absente.success === false && !!absente.msg, JSON.stringify(absente).slice(0, 200));
    ok('1. bilan : rien écrit en base (ventes, lignes, mouvements, dates)', traces([V1, V2, V3]) === avant, avant + ' -> ' + traces([V1, V2, V3]));
    const jobsApres = travauxImpression();
    ok('1. bilan : aucun travail d\'impression nouveau', jobsApres === jobsAvant, jobsAvant + ' -> ' + jobsApres);
    const anonyme = await sess.p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'omit' }); return r.status; },
      '../api/v1/vente/ticket/vno/' + V1 + '/image?largeur=58');
    ok('1. sans session : 401', anonyme === 401, anonyme);

    /* ---- 5. reponse de vente/remise ---- */
    const V4 = await vc.ajouter(P1, 2);
    await vc.ajouter(P2, 1, V4);
    const rInconnue = await api('POST', '../api/v1/vente/remise', { venteId: V4, remiseId: 'ZZAUDIT-remise-inconnue' });
    ok('5. remiseId inconnu : success:false et message', rInconnue.success === false && /remise/i.test(rInconnue.msg || ''), JSON.stringify(rInconnue).slice(0, 200));
    const rFermee = await api('POST', '../api/v1/vente/remise', { venteId: V1, remiseId: REMISE });
    ok('5. vente terminée : success:false et message', rFermee.success === false && !!rFermee.msg, JSON.stringify(rFermee).slice(0, 200));
    ok('5. vente terminée : remise inchangée en base', C.vente(V1).remise === 0, C.vente(V1).remise);
    const rOk = await api('POST', '../api/v1/vente/remise', { venteId: V4, remiseId: REMISE });
    const netVno = await vc.net(V4, REMISE);
    ok('5. remise valide : net renvoyé = net de net/vno (rapprochement)', rOk.success === true && !!rOk.data && rOk.data.montantNet === netVno.montantNet
      && rOk.data.remise === netVno.remise && netVno.remise > 0, JSON.stringify(rOk.data || rOk).slice(0, 200) + ' / net ' + netVno.montantNet + ' remise ' + netVno.remise);
    const brut = P1.pu * 2 + P2.pu;
    ok('5. cohérence : net = montant - remise, remise = 10 % des lignes', !!rOk.data && rOk.data.montantNet === brut - rOk.data.remise
      && Math.abs(rOk.data.remise - Math.round(brut * 0.1)) <= 2, rOk.data ? brut + ' - ' + rOk.data.remise + ' = ' + rOk.data.montantNet : '-');
    const rZero = await api('POST', '../api/v1/vente/remise', { venteId: V4, remiseId: '0' });
    ok('5. « 0 » : sans remise (remise 0, net = montant)', rZero.success === true && !!rZero.data && rZero.data.remise === 0 && rZero.data.montantNet === brut,
      JSON.stringify(rZero.data || rZero).slice(0, 200));

    /* ---- 3. « sans remise » retire la remise de la fiche du client (regle validee le 19/11) ---- */
    exec("UPDATE t_client SET remise = '" + REMISE + "' WHERE lg_CLIENT_ID = '" + cl.clientId + "'");
    const tps6 = tps.map((t, i) => Object.assign({}, t, { bon: 'B63S' + i })), tps7 = tps.map((t, i) => Object.assign({}, t, { bon: 'B63T' + i }));
    const V6 = await va.ajouter(cl, tps6, P1, 2);
    await va.ajouter(cl, tps6, P2, 1, V6);
    const netFiche = await va.net(V6, tps6, null);
    ok('3. client avec remise sur sa fiche, rien choisi : la remise de la fiche s’applique', netFiche.succes === true && netFiche.remise > 0, netFiche.remise);
    const r0 = await api('POST', '../api/v1/vente/remise', { venteId: V6, remiseId: '0' });
    const netSans = await va.net(V6, tps6, '0');
    ok('3. « sans remise » (« 0 ») : remise 0, net client recalculé', r0.success === true && netSans.succes === true && netSans.remise === 0
      && netSans.montantNet > netFiche.montantNet, 'remise ' + netSans.remise + ', net ' + netFiche.montantNet + ' -> ' + netSans.montantNet);
    /* net client = montant - parts des organismes, arrondi au multiple de 5 inferieur (regle de l'officine) */
    const reste = netSans.montant - netSans.montantTp;
    ok('3. cohérence : net client = montant - parts des organismes, arrondi à 5 (sans remise)', netSans.montantNet === reste - (reste % 5),
      netSans.montant + ' - ' + netSans.montantTp + ' = ' + reste + ' -> net ' + netSans.montantNet);
    const c6 = await va.cloturer(cl, V6, tps6, { remiseId: '0' });
    ok('3. bilan : vente terminée sans remise en base (remise 0, marque « 0 »)', c6.success === true && C.vente(V6).remise === 0
      && q("SELECT IFNULL(lg_REMISE_ID, 'NULL') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + V6 + "'") === '0',
      JSON.stringify({ succes: c6.success, msg: c6.msg, remise: C.vente(V6).remise }));
    const { v: V7 } = await va.vendre(cl, tps7, P1, 1);
    ok('3. vente suivante du même client, rien choisi : la remise de la fiche s’applique toujours', C.vente(V7).remise > 0, C.vente(V7).remise);

    /* ---- 2. droit P_REMISE_VENTE ---- */
    const droits = await api('GET', '../api/v1/user/droits');
    ok('2. GET v1/user/droits liste P_REMISE_VENTE', (droits.droits || []).includes('P_REMISE_VENTE'), (droits.droits || []).length + ' droits');
    droitRetire = q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('|', rp.lg_ROLE_PRIVILEGE, rp.lg_PRIVILEGE_ID)), '') FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND p.str_NAME = 'P_REMISE_VENTE'");
    ok('2. migration : le rôle du compte de test a reçu le droit', droitRetire !== '', droitRetire);
    if (droitRetire) {
      exec("DELETE rp FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND p.str_NAME = 'P_REMISE_VENTE'");
    }
    await sess.b.close();
    sess = await C.connecter();
    const sans = await sess.api('POST', '../api/v1/vente/remise', { venteId: V4, remiseId: REMISE });
    ok('2. sans le droit : 403 interdit', sans.http === 403 && sans.interdit === true && sans.success === false, sans.http + ' ' + JSON.stringify(sans).slice(0, 150));
    const droitsSans = await sess.api('GET', '../api/v1/user/droits');
    ok('2. sans le droit : absent de v1/user/droits', !(droitsSans.droits || []).includes('P_REMISE_VENTE'), (droitsSans.droits || []).length + ' droits');
    /* ergonomie : a l'ecran de vente, le choix d'une remise dit pourquoi il est refuse */
    const p = sess.p;
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().childNodes.length > 0; }, null, { timeout: 120000 });
    await L.nouvelleVente(p);
    await L.taperArticle(p, L.cip(P1));
    const V5 = await L.venteCourante(p);
    if (V5) { C.etat.ventes.push(V5); }
    await L.choisirRemise(p, MARQUE + ' 10').catch(() => {});
    await p.waitForTimeout(800);
    const msg = await vues.texteMessage(p).catch(() => '');
    ok('2. écran de vente sans le droit : « Droit manquant : Remise sur une vente »', /Droit manquant : Remise sur une vente/.test(msg || ''), msg);
    if (msg) { await vues.repondre(p, 'ok').catch(() => {}); }
    ok('2. sans le droit : remise de la vente inchangée', V5 ? C.vente(V5).remise === 0 : false, V5 ? C.vente(V5).remise : 'pas de vente');
    /* droit rendu */
    if (droitRetire) {
      const [idRp, idPriv] = droitRetire.split('|');
      exec("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + idRp + "', '" + ROLE + "', '" + idPriv + "', NOW(), NOW())");
      droitRetire = null;
    }
    await sess.b.close();
    sess = await C.connecter();
    const avec = await sess.api('POST', '../api/v1/vente/remise', { venteId: V4, remiseId: REMISE });
    ok('2. droit rendu : success:true', avec.success === true && avec.http === 200, avec.http + ' ' + (avec.msg || ''));
    ok('E. aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (droitRetire) {
      const [idRp, idPriv] = droitRetire.split('|');
      exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + idRp + "', '" + ROLE + "', '" + idPriv + "', NOW(), NOW())");
    }
    await sess.b.close().catch(() => {});
    C.nettoyer();
  }
  process.exit(C.bilan() ? 1 : 0);
})();
