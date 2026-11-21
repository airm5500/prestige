/* DEMANDE 70 (Prestige Mobile 5.4.0, SUNMI V3, 20/11) : sur l'image du ticket en 58 mm (GET v1/vente/ticket/{type}/{id}/image),
 * les textes non gras (8 points, Arial Narrow) sortaient pales : apres passage en noir et blanc, une grande part de leurs
 * traits ne faisait qu'un point d'imprimante.
 *
 * Correctif : en 58 mm, l'image redessine les textes non gras decales d'un point d'imprimante (traits d'au moins deux
 * points). Mise en page, code-barres, QR, textes gras, 80 mm, apercu du web et poste inchanges.
 *
 * Controles, par la route de l'application avec une vraie session, en lecture seule (ventes existantes du banc) :
 *  - vente assurance a deux organismes, 58 mm a 203 dpi : moins de 15 % des suites noires horizontales des textes
 *    font un seul point (seuil 128 ; rangees du code-barres ecartees) ; largeur 384 ; dimensions annoncees = PNG ;
 *  - meme vente, 80 mm : largeur 576, part des traits d'un seul point sous 15 % (inchange) ;
 *  - rapprochement : le texte des tickets (route image/texte) contient les organismes et les taux imprimes en base ;
 *    code-barres present (rangees identiques) en 58 et 80 mm ; QR de la prevente retrouve (3 motifs de reperage) ;
 *  - bilan : lire les images n'ecrit rien.
 * Lancement seul : node src/test/e2e/mobile/test-demande70-2111.js
 */
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const API = (process.env.BASE || 'http://localhost:8080/prestige') + '/api/';

/* lecture d'un PNG 8 bits (meme lecteur que test-demande63-1911.js) */
function lirePng(b64) {
  const buf = Buffer.from(b64, 'base64');
  const largeur = buf.readUInt32BE(16), hauteur = buf.readUInt32BE(20), type = buf[25];
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
  return { largeur, hauteur, noir: (x, y) => gris[y * largeur + x] < 128 };
}

/* suites noires de chaque rangee ; les rangees du code-barres (identiques a la precedente, plus de 12 suites) sont ecartees */
function mesurer(img) {
  let un = 0, toutes = 0, rangeesCode = 0;
  let prec = null;
  for (let y = 0; y < img.hauteur; y++) {
    const suites = [];
    let n = 0, debut = 0;
    for (let x = 0; x <= img.largeur; x++) {
      const noir = x < img.largeur && img.noir(x, y);
      if (noir) { if (n === 0) { debut = x; } n++; } else if (n > 0) { suites.push(debut + ':' + n); n = 0; }
    }
    const cle = suites.join(',');
    if (suites.length > 12 && cle === prec) { rangeesCode++; prec = cle; continue; }
    prec = cle;
    for (const s of suites) { toutes++; if (s.endsWith(':1')) { un++; } }
  }
  return { part: toutes ? 100 * un / toutes : 0, toutes, rangeesCode };
}

/* motifs de reperage d'un QR code (test-demande63-1911.js) */
function motifsQr(img) {
  const rapport = (r) => { const u = (r[0] + r[1] + r[3] + r[4]) / 4; return u >= 2 && r.every((v, i) => Math.abs(v - (i === 2 ? 3 * u : u)) <= u * 0.6); };
  const runs = (val, n) => { const r = []; let cur = val(0), len = 0, debut = 0;
    for (let i = 0; i <= n; i++) { const v = i < n ? val(i) : !cur; if (v === cur) { len++; } else { r.push({ noir: cur, len, debut }); cur = v; len = 1; debut = i; } } return r; };
  const centres = [];
  for (let y = 0; y < img.hauteur; y += 2) {
    const r = runs((x) => img.noir(x, y), img.largeur);
    for (let i = 0; i + 4 < r.length; i++) {
      if (!r[i].noir) { continue; }
      if (!rapport(r.slice(i, i + 5).map((x) => x.len))) { continue; }
      const cx = r[i + 2].debut + (r[i + 2].len >> 1);
      const col = runs((yy) => img.noir(cx, yy), img.hauteur);
      const k = col.findIndex((x) => x.debut <= y && y < x.debut + x.len);
      if (k >= 2 && k + 2 < col.length && rapport(col.slice(k - 2, k + 3).map((x) => x.len))) { centres.push([cx, y]); }
    }
  }
  const groupes = [];
  for (const [x, y] of centres) { if (!groupes.some(([gx, gy]) => Math.abs(gx - x) < 12 && Math.abs(gy - y) < 12)) { groupes.push([x, y]); } }
  return groupes.length;
}

const EMPREINTE = () => q('CHECKSUM TABLE t_preenregistrement, t_preenregistrement_detail, t_preenregistrement_compte_client_tiers_payent, mvttransaction, t_famille_stock')
  .split('\n').map((l) => l.split('\t')[1]).join(',');

(async () => {
  const avant = EMPREINTE();
  const login = await fetch(API + 'v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: ENV_E2E.LOGIN, password: 'e2etest' }) });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  const get = async (u) => { const r = await fetch(API + u, { headers: { Cookie: cookie } }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; } };
  try {
    /* vente assurance cloturee a deux organismes aux taux differents, la plus recente */
    const vo = q(`SELECT v.lg_PREENREGISTREMENT_ID FROM t_preenregistrement v JOIN t_preenregistrement_compte_client_tiers_payent t ON t.lg_PREENREGISTREMENT_ID = v.lg_PREENREGISTREMENT_ID
      WHERE v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0 AND v.int_PRICE > 0 GROUP BY v.lg_PREENREGISTREMENT_ID HAVING COUNT(*) = 2 AND COUNT(DISTINCT t.int_PERCENT) = 2
      ORDER BY MAX(v.dt_UPDATED) DESC LIMIT 1`);
    ok('Précondition : une vente assurance à deux organismes', !!vo, vo);
    const parts = {};
    for (const mm of [58, 80]) {
      const r = await get('v1/vente/ticket/vo/' + vo + '/image?largeur=' + mm + '&dpi=203');
      const t = (r.tickets || [])[0];
      const img = t ? lirePng(t.png) : null;
      const m = img ? mesurer(img) : { part: 100, toutes: 0, rangeesCode: 0 };
      parts[mm] = m;
      ok(mm + ' mm : PNG de ' + (mm === 58 ? 384 : 576) + ' points, dimensions annoncées = PNG, code-barres présent',
        r.success === true && img && img.largeur === (mm === 58 ? 384 : 576) && t.largeurPoints === img.largeur && t.hauteurPoints === img.hauteur && m.rangeesCode >= 20,
        img ? img.largeur + 'x' + img.hauteur + ', ' + m.rangeesCode + ' rangées de code-barres' : JSON.stringify(r).slice(0, 200));
      ok(mm + ' mm : moins de 15 % des traits des textes font un seul point d\'imprimante', m.toutes > 500 && m.part < 15,
        Math.round(m.part * 10) / 10 + ' % de ' + m.toutes + ' suites');
    }
    /* rapprochement : texte des memes tickets = organismes et taux de la base (taux imprimes bornes a 100 %) */
    const txt = await get('v1/vente/ticket/vo/' + vo + '/image/texte?largeur=58');
    const texte = JSON.stringify(txt);
    const tps = q(`SELECT tp.str_NAME, t.int_PERCENT, tp.str_FULLNAME FROM t_preenregistrement_compte_client_tiers_payent t
      JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
      JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID WHERE t.lg_PREENREGISTREMENT_ID = '${vo}' ORDER BY t.int_PERCENT DESC`).split('\n').map((l) => l.split('\t'));
    const taux = (texte.match(/(\d+) ?%/g) || []).map((x) => parseInt(x, 10));
    ok('Rapprochement : le ticket 58 mm porte les deux organismes et le taux du principal (base)',
      txt.success !== false && tps.every(([n, , f]) => texte.includes(n.slice(0, 8)) || texte.includes((f || '').slice(0, 8)))
        && taux.includes(+tps[0][1]),
      tps.map((x) => x[0] + ' ' + x[1]).join(' / ') + ' -> ' + taux.join(', '));
    /* prevente : QR toujours lisible en 58 mm */
    let qr = 0, pv = null;
    for (const id of q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE str_STATUT = 'pending' ORDER BY dt_UPDATED DESC LIMIT 10").split('\n').filter(Boolean)) {
      const r = await get('v1/vente/ticket/prevente/' + id + '/image?largeur=58&dpi=203');
      const t = (r.tickets || [])[0];
      if (t) { pv = id; qr = motifsQr(lirePng(t.png)); break; }
    }
    ok('Prévente 58 mm : QR code retrouvé (3 motifs de repérage)', pv && qr >= 3, pv + ' : ' + qr + ' motifs');
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    ok('Bilan : lire les images n\'écrit rien', EMPREINTE() === avant);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
