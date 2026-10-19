/* PHOTO DE CONTROLE DU POINTAGE PAR BADGE (demandes serveur des applications mobiles, point 31).
 *
 * Par les routes du terminal de pointage (session d'un compte RH), images produites par le navigateur (canvas) :
 *  - POST rh/pointages avec id du terminal : meme id rendu ; meme id renvoye -> « deja existant », rien de plus ;
 *    controle {photo:false, motif} range (SANS + motif) ; {photo:true} -> ATTENDUE ;
 *  - POST rh/pointages/{id}/photo : JPEG 640 px accepte (statut AVEC) ; plus de 150 Ko, non JPEG, plus de 1024 px,
 *    pointage qui n'est pas « Badge terminal » : refuses ; un second envoi remplace le premier ;
 *  - GET rh/pointages/{id}/photo : image/jpeg, Cache-Control no-store ; sans le droit P_SM_RH : refus ;
 *  - GET rh/presence : photoStatut, photo, photoMotif ; GET rh/droits : photoRetentionJours (30) ;
 *  - suppression du pointage : la photo part avec (cascade).
 * Les pointages du test (marque E2E-PHOTO) sont retires.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droitRh = require('../support/privilege-essai')(q, exec, 'admin', 'P_SM_RH');
/* demande 52 : P_RH_POINTER ouvre aussi l'envoi de la photo (terminal) ; « sans droit RH » = sans les deux */
const droitPointer = require('../support/privilege-essai')(q, exec, 'admin', 'P_RH_POINTER');
const ID1 = 'e2e-photo-0001-aaaa', ID2 = 'e2e-photo-0002-bbbb', ID3 = 'e2e-photo-0003-cccc';

function retirer() {
  exec("DELETE FROM t_pointage WHERE id LIKE 'e2e-photo-%' OR motif LIKE 'E2E-PHOTO%'");
}

(async () => {
  droitRh.remettre(); droitPointer.remettre();
  retirer();
  const EMP = q("SELECT id FROM t_employe ORDER BY id LIMIT 1");
  const jour = q("SELECT CURDATE() - INTERVAL 1 DAY");
  ok('Jeu d\'essai : un employé', !!EMP, EMP);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let p;
  const connecter = async () => {
    p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
  };
  const pointer = (corps) => p.evaluate(async (c) => (await fetch('../api/v1/rh/pointages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).json(), corps);
  /* image produite par le navigateur, envoyee comme le terminal (multipart, champ photo) */
  const envoyer = (id, opts) => p.evaluate(async ([id, o]) => {
    const c = document.createElement('canvas'); c.width = o.l; c.height = o.h; const x = c.getContext('2d');
    if (o.bruit) { const d = x.createImageData(o.l, o.h); for (let i = 0; i < d.data.length; i++) { d.data[i] = Math.random() * 255; } x.putImageData(d, 0, 0); } else { x.fillStyle = '#3a6'; x.fillRect(0, 0, o.l, o.h); x.fillStyle = '#fff'; x.fillText('E2E', 10, 20); }
    const blob = await new Promise((r) => c.toBlob(r, o.type || 'image/jpeg', o.qualite || 0.8));
    const f = new FormData(); f.append('photo', blob, 'photo.jpg'); f.append('prise', '2026-10-15T08:01:02');
    const r = await fetch('../api/v1/rh/pointages/' + id + '/photo', { method: 'POST', body: f });
    return { taille: blob.size, j: await r.json() };
  }, [id, opts]);
  const lirePhoto = (id) => p.evaluate(async (id) => { const r = await fetch('../api/v1/rh/pointages/' + id + '/photo'); const b = new Uint8Array(await r.arrayBuffer()); return { s: r.status, type: r.headers.get('content-type'), cache: r.headers.get('cache-control'), debut: Array.from(b.slice(0, 3)), n: b.length }; }, id);
  try {
    await connecter();
    const base = { employeId: EMP, jour, heure: '08:01', sens: 'ENTREE', motif: 'Badge terminal E2E-PHOTO' };
    const a = await pointer(Object.assign({ id: ID1, controle: { photo: true } }, base));
    ok('Pointage avec id du terminal : même id rendu, photo ATTENDUE', a.success && a.id === ID1 && q("SELECT photo_statut FROM t_pointage WHERE id = '" + ID1 + "'") === 'ATTENDUE', JSON.stringify(a));
    const bis = await pointer(Object.assign({ id: ID1, controle: { photo: true } }, base));
    ok('Même id renvoyé : « déjà existant », un seul pointage', bis.success && bis.deja === true && q("SELECT COUNT(*) FROM t_pointage WHERE id = '" + ID1 + "'") === '1', JSON.stringify(bis));
    const sans = await pointer(Object.assign({}, base, { id: ID2, heure: '12:00', sens: 'SORTIE', controle: { photo: false, motif: 'PERMISSION_REFUSEE' } }));
    ok('Contrôle sans photo : SANS + motif rangés', sans.success && q("SELECT CONCAT_WS('|', photo_statut, photo_motif) FROM t_pointage WHERE id = '" + ID2 + "'") === 'SANS|PERMISSION_REFUSEE', JSON.stringify(sans));
    const autre = await pointer(Object.assign({}, base, { id: ID3, heure: '13:00', motif: 'E2E-PHOTO oubli de badge' }));
    const ancien = await pointer({ employeId: EMP, jour, heure: '14:00', sens: 'ENTREE', motif: 'E2E-PHOTO sans id' });
    ok('Sans id (ancien terminal ou écran) : comme avant, un id est rendu', ancien.success && /^[0-9a-f-]{36}$/.test(ancien.id || ''), JSON.stringify(ancien));

    const e1 = await envoyer(ID1, { l: 640, h: 480 });
    ok('Photo JPEG 640 x 480 acceptée, statut AVEC', e1.j.success && q("SELECT photo_statut FROM t_pointage WHERE id = '" + ID1 + "'") === 'AVEC'
      && q("SELECT CONCAT_WS('|', largeur, hauteur, taille, prise_le) FROM t_pointage_photo WHERE pointage_id = '" + ID1 + "'") === '640|480|' + e1.taille + '|2026-10-15 08:01:02', JSON.stringify(e1));
    const lourd = await envoyer(ID1, { l: 1000, h: 1000, bruit: true, qualite: 1 });
    ok('Plus de 150 Ko : refusée, la première photo reste', lourd.taille > 150 * 1024 && lourd.j.success === false && /150 Ko/.test(lourd.j.msg) && q("SELECT largeur FROM t_pointage_photo WHERE pointage_id = '" + ID1 + "'") === '640', lourd.taille + ' ' + JSON.stringify(lourd.j));
    const png = await envoyer(ID1, { l: 100, h: 100, type: 'image/png' });
    ok('Fichier non JPEG : refusé', png.j.success === false && /JPEG/.test(png.j.msg), JSON.stringify(png.j));
    const grand = await envoyer(ID1, { l: 1600, h: 900, qualite: 0.3 });
    ok('Plus de 1024 px : refusée', grand.j.success === false && /1024/.test(grand.j.msg), JSON.stringify(grand.j));
    const pasBadge = await envoyer(ID3, { l: 320, h: 240 });
    ok('Pointage qui n\'est pas « Badge terminal » : refusé', pasBadge.j.success === false && q("SELECT COUNT(*) FROM t_pointage_photo WHERE pointage_id = '" + ID3 + "'") === '0', JSON.stringify(pasBadge.j));
    const e2 = await envoyer(ID1, { l: 480, h: 640 });
    ok('Second envoi : remplace la première (une seule photo)', e2.j.success && q("SELECT CONCAT(COUNT(*), '|', MAX(largeur)) FROM t_pointage_photo WHERE pointage_id = '" + ID1 + "'") === '1|480', JSON.stringify(e2.j));

    const lu = await lirePhoto(ID1);
    ok('Lecture : image/jpeg, no-store, octets JPEG', lu.s === 200 && /image\/jpeg/.test(lu.type) && /no-store/.test(lu.cache || '') && lu.debut.join(',') === '255,216,255', JSON.stringify(lu));
    const rien = await lirePhoto(ID2);
    ok('Pointage sans photo : 404', rien.s === 404, rien.s);
    const presence = await p.evaluate(async (j) => (await fetch('../api/v1/rh/presence?jour=' + j)).json(), jour);
    const pt = (presence.pointages || []).find((x) => x.id === ID1) || {}, pt2 = (presence.pointages || []).find((x) => x.id === ID2) || {};
    ok('Présence : photoStatut, photo, photoMotif', pt.photoStatut === 'AVEC' && pt.photo === true && pt2.photoStatut === 'SANS' && pt2.photo === false && pt2.photoMotif === 'PERMISSION_REFUSEE', JSON.stringify([pt, pt2]));
    const droits = await p.evaluate(async () => (await fetch('../api/v1/rh/droits')).json());
    ok('Droits RH : durée de conservation (30 jours)', droits.photoRetentionJours === 30, JSON.stringify(droits));

    droitRh.retirer(); droitPointer.retirer();
    await p.context().close();
    await connecter();
    const refus = await lirePhoto(ID1);
    ok('Sans le droit P_SM_RH : lecture refusée (403), aucune image', refus.s === 403 && !/image/.test(refus.type || ''), JSON.stringify(refus));
    const refusEnvoi = await envoyer(ID1, { l: 320, h: 240 });
    ok('Sans P_SM_RH ni P_RH_POINTER : envoi refusé, photo inchangée', refusEnvoi.j.success === false && q("SELECT largeur FROM t_pointage_photo WHERE pointage_id = '" + ID1 + "'") === '480', JSON.stringify(refusEnvoi.j));
    droitRh.remettre(); droitPointer.remettre();
    await p.context().close();
    await connecter();
    const sup = await p.evaluate(async (id) => (await fetch('../api/v1/rh/pointages/' + id, { method: 'DELETE' })).json(), ID1);
    ok('Pointage supprimé : sa photo part avec', sup.success && q("SELECT COUNT(*) FROM t_pointage_photo WHERE pointage_id = '" + ID1 + "'") === '0', JSON.stringify(sup));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    droitRh.remettre(); droitPointer.remettre();
    await b.close();
    retirer();
    ok('Pointages du test retirés', q("SELECT COUNT(*) FROM t_pointage WHERE id LIKE 'e2e-photo-%' OR motif LIKE 'E2E-PHOTO%'") === '0' && q("SELECT COUNT(*) FROM t_pointage_photo WHERE pointage_id LIKE 'e2e-photo-%'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
