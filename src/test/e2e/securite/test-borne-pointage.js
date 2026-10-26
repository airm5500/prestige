/* BORNE DE POINTAGE SANS COMPTE (demande mobile 57), par l'API, comme la future application Prestige Pointage :
 *  - enrolement : P_SM_RH ou administrateur, sinon 403 {interdit} ; empreinte ou nom invalide : 400 INVALIDE ;
 *  - secret : rendu une seule fois, absent de la liste, du journal des evenements et du journal du serveur ;
 *  - signature : juste (200), fausse, date hors des 300 s, rejeu, empreinte differente : 401 BORNE ;
 *  - une autre route appelee avec les en-tetes de la borne : 401 ;
 *  - pointage : idempotent par id, source BORNE et borne_id enregistres, saisi_par vide ; plus de 2 min dans le futur
 *    ou plus de 72 h dans le passe : refuses ;
 *  - photo : acceptee pour un pointage de cette borne, refusee pour celui d'une autre ;
 *  - empreintes : refusees quand KEY_EMPREINTES_PARTAGEES = 0, lues et tracees (LIRE_BORNE) quand il vaut 1 ;
 *  - reenrolement de la meme empreinte : l'ancienne borne recoit 401 REVOQUEE ; retrait : 401 REVOQUEE immediat ;
 *  - limites : 429 au-dela de 120 appels par minute ; 10 signatures fausses par minute bloquent l'adresse (429).
 * Non couvert ici : le refus d'une adresse hors de l'officine (KEY_BORNE_POINTAGE_RESEAU_LOCAL = 1), les appels
 * partant de ce poste, local par nature.
 * Employe, bornes, pointages, photos, parametres et journaux d'essai retires a la fin.
 */
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 240) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const EMP = 'E2E-BORNE-EMP', VEND = 'E2E-BORNE-VEND', LOGIN_VEND = 'e2e-borne-vendeur', NOM = 'E2E Borne';
const RACINE = '/prestige/api/';
const empreinte = (graine) => crypto.createHash('sha256').update('ANDROID-' + graine + ':com.dici.prestigepointage').digest('hex');
const PARTAGE = q("SELECT COALESCE((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES'), '0')");
/* JPEG 1 x 1 valide */
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

function brut(methode, chemin, entetes, corps) {
  return new Promise((ok_, ko) => {
    const r = http.request({ host: 'localhost', port: 8080, path: chemin, method: methode, headers: Object.assign({ 'Content-Length': corps ? corps.length : 0 }, entetes) },
      (rep) => { let t = ''; rep.setEncoding('utf8'); rep.on('data', (c) => { t += c; }); rep.on('end', () => {
        let o = null; try { o = JSON.parse(t); } catch (e) { o = null; }
        ok_({ statut: rep.statusCode, o, t, cookie: (rep.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ') }); }); });
    r.on('error', ko); if (corps) { r.write(corps); } r.end();
  });
}
const session = async (login) => (await brut('POST', RACINE + 'v1/user/auth', { 'Content-Type': 'application/json' }, Buffer.from(JSON.stringify({ login, password: 'e2etest' })))).cookie;
const rh = (methode, route, cookie, corps) => brut(methode, RACINE + 'v1/rh/' + route, Object.assign({ Cookie: cookie }, corps ? { 'Content-Type': 'application/json' } : {}),
  corps ? Buffer.from(JSON.stringify(corps)) : null);

/* appel signe : CHAINE = methode \n chemin?parametres \n date \n empreinte \n sha256hex(corps) */
function signe(borne, methode, route, corps, options) {
  const o = Object.assign({ date: new Date().toISOString(), empreinte: borne.empreinte, secret: borne.secret, type: 'application/json' }, options || {});
  const chemin = RACINE + route;
  const b = corps || Buffer.alloc(0);
  const chaine = [methode, chemin, o.date, o.empreinte, crypto.createHash('sha256').update(b).digest('hex')].join('\n');
  const signature = o.signature || crypto.createHmac('sha256', Buffer.from(o.secret, 'base64url')).update(chaine).digest('base64url');
  return { chemin, entetes: Object.assign({ 'X-Borne': borne.id, 'X-Borne-Date': o.date, 'X-Borne-Empreinte': o.empreinte,
    'X-Borne-Signature': signature, 'X-Poste': 'Borne E2E' }, corps ? { 'Content-Type': o.type } : {}), corps: corps || null };
}
const appel = (borne, methode, route, corps, options) => { const s = signe(borne, methode, route, corps, options); return brut(methode, s.chemin, s.entetes, s.corps); };
const json = (o) => Buffer.from(JSON.stringify(o));
const iso = (d) => d.toISOString().slice(0, 10), hm = (d) => d.toTimeString().slice(0, 5);
function multipart(photo) {
  const f = 'e2eborne' + Date.now();
  const corps = Buffer.concat([Buffer.from(`--${f}\r\nContent-Disposition: form-data; name="photo"; filename="p.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`), photo,
    Buffer.from(`\r\n--${f}--\r\n`)]);
  return { corps, type: 'multipart/form-data; boundary=' + f };
}

function nettoyer() {
  q(`DELETE FROM t_pointage_photo WHERE pointage_id IN (SELECT id FROM t_pointage WHERE employe_id = '${EMP}');`
    + ` DELETE FROM t_pointage WHERE employe_id = '${EMP}'; DELETE FROM t_employe WHERE id = '${EMP}';`
    + ` DELETE FROM t_empreinte_journal WHERE action = 'LIRE_BORNE' AND utilisateur IN (SELECT id FROM t_borne_pointage WHERE nom LIKE '${NOM}%');`
    + ` DELETE FROM t_borne_pointage WHERE nom LIKE '${NOM}%';`
    + ` DELETE FROM t_event_log WHERE str_DESCRIPTION LIKE '%Borne de pointage ${NOM}%' OR str_DESCRIPTION LIKE '%Pointage par la borne ${NOM}%';`
    + ` DELETE FROM t_role_user WHERE lg_USER_ID = '${VEND}'; DELETE FROM t_event_log WHERE lg_USER_ID = '${VEND}';`
    + ` DELETE FROM t_session_utilisateur WHERE lg_USER_ID = '${VEND}'; DELETE FROM t_user WHERE lg_USER_ID = '${VEND}';`
    + ` UPDATE t_parameters SET str_VALUE = '${PARTAGE}' WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES'`);
}

(async () => {
  nettoyer();
  q(`INSERT INTO t_employe (id, matricule, nom, prenoms, statut, created_at) VALUES ('${EMP}', 'E2E-B1', 'ZZ ESSAI', 'Borne', 'ACTIF', NOW())`);
  q(`INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)`
    + ` VALUES ('${VEND}', '${LOGIN_VEND}', MD5('e2etest'), 'E2E', 'VENDEUR BORNE', 'enable', '1', NOW(), 0)`);
  q(`INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${VEND}', (SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur' LIMIT 1), '${VEND}', NOW())`);
  const debutLog = q('SELECT NOW()');
  try {
    const admin = await session(ENV_E2E.LOGIN);
    /* enrolement */
    const vendeur = await rh('POST', 'bornes', await session(LOGIN_VEND), { empreinte: empreinte(1), nom: NOM + ' refusee' });
    ok('Enrôlement par un vendeur : 403 {interdit}', vendeur.statut === 403 && vendeur.o && vendeur.o.interdit === true, vendeur.statut + ' ' + vendeur.t.slice(0, 80));
    const inv1 = await rh('POST', 'bornes', admin, { empreinte: 'abc', nom: NOM });
    const inv2 = await rh('POST', 'bornes', admin, { empreinte: empreinte(1), nom: '  ' });
    ok('Empreinte ou nom invalide : 400 INVALIDE', inv1.statut === 400 && inv1.o.code === 'INVALIDE' && inv2.statut === 400 && inv2.o.code === 'INVALIDE', inv1.statut + '/' + inv2.statut);
    const e1 = await rh('POST', 'bornes', admin, { empreinte: empreinte(1), nom: NOM + ' entrée' });
    const A = { id: e1.o.borneId, secret: e1.o.secret, empreinte: empreinte(1) };
    /* un passage precedent du test a pu laisser l'adresse bloquee (signatures fausses) : attente de la fin du blocage,
       par un appel juste (il n'est pas compte comme un echec) */
    for (let i = 0; i < 20; i++) {
      const p = await appel(A, 'GET', 'v1/borne-pointage/moi');
      if (p.statut !== 429) { break; }
      const attente = Number(p.o && /(\d+) s/.test(p.o.message) ? RegExp.$1 : 30);
      console.log('… adresse encore bloquée par un passage précédent : attente de ' + attente + ' s');
      await new Promise((r) => setTimeout(r, (attente + 1) * 1000));
    }
    ok('Enrôlement : borneId, secret de 32 octets (base64url), date', e1.statut === 200 && !!A.id && Buffer.from(A.secret, 'base64url').length === 32 && !!e1.o.creeLe, Object.keys(e1.o).join(','));
    const liste = await rh('GET', 'bornes', admin);
    ok('Secret rendu une seule fois : absent de la liste des bornes', liste.o.data.some((b) => b.id === A.id && b.statut === 'ACTIVE') && liste.t.indexOf(A.secret) < 0);

    /* signature */
    let r = await appel(A, 'GET', 'v1/borne-pointage/moi');
    ok('Signature juste : 200, nom et statut de la borne', r.statut === 200 && r.o.borneId === A.id && r.o.nom === NOM + ' entrée' && r.o.statut === 'ACTIVE'
      && r.o.empreintesPartagees === (PARTAGE === '1'), r.t.slice(0, 120));
    r = await appel(A, 'GET', 'v1/borne-pointage/moi', null, { secret: crypto.randomBytes(32).toString('base64url') });
    ok('Signature fausse : 401 BORNE', r.statut === 401 && r.o.code === 'BORNE', r.statut + ' ' + r.t.slice(0, 80));
    r = await appel(A, 'GET', 'v1/borne-pointage/moi', null, { date: new Date(Date.now() - 400000).toISOString() });
    ok('Date à plus de 300 s : 401 BORNE', r.statut === 401 && r.o.code === 'BORNE', r.statut);
    const s = signe(A, 'GET', 'v1/borne-pointage/moi');
    const premier = await brut('GET', s.chemin, s.entetes, null), rejeu = await brut('GET', s.chemin, s.entetes, null);
    ok('Rejeu de la même signature : 401 BORNE', premier.statut === 200 && rejeu.statut === 401 && rejeu.o.code === 'BORNE', premier.statut + '/' + rejeu.statut);
    r = await appel(A, 'GET', 'v1/borne-pointage/moi', null, { empreinte: empreinte(9) });
    ok('Empreinte différente de l\'enrôlement : 401 BORNE', r.statut === 401 && r.o.code === 'BORNE', r.statut);
    r = await appel(A, 'GET', 'v1/rh/employes');
    const r2 = await appel(A, 'GET', 'v1/officine');
    ok('Autre route avec les en-têtes de la borne : 401', r.statut === 401 && r2.statut === 401, r.statut + '/' + r2.statut);

    /* employes et pointages */
    r = await appel(A, 'GET', 'v1/borne-pointage/employes');
    const e = r.o && r.o.data ? r.o.data.find((x) => x.id === EMP) : null;
    ok('Employés : champs réduits (id, matricule, nom, prenoms, badge, statut)', r.statut === 200 && e && Object.keys(e).sort().join(',') === 'badge,id,matricule,nom,prenoms,statut', e && Object.keys(e).join(','));
    const maintenant = new Date(), idP = 'E2E-BORNE-P1-' + Date.now();
    const corpsP = json({ employeId: EMP, sens: 'ENTREE', id: idP, controle: { photo: true } });
    const p1 = await appel(A, 'POST', 'v1/borne-pointage/pointages', corpsP);
    const p1b = await appel(A, 'POST', 'v1/borne-pointage/pointages', corpsP);
    const ligne = q(`SELECT CONCAT_WS('|', source, IFNULL(saisi_par, 'vide'), borne_id, motif) FROM t_pointage WHERE id = '${idP}'`);
    ok('Pointage : enregistré (source BORNE, saisi_par vide, borne_id, motif « Borne <nom> »)', p1.o.success && ligne === `BORNE|vide|${A.id}|Borne ${NOM} entrée`, ligne);
    ok('Pointage : idempotent par id', p1b.o.success && p1b.o.deja === true && q(`SELECT COUNT(*) FROM t_pointage WHERE id = '${idP}'`) === '1', JSON.stringify(p1b.o));
    const futur = new Date(Date.now() + 3 * 60000), passe = new Date(Date.now() - 73 * 3600000), recent = new Date(Date.now() - 71 * 3600000);
    const pf = await appel(A, 'POST', 'v1/borne-pointage/pointages', json({ employeId: EMP, sens: 'SORTIE', id: 'E2E-BORNE-PF-' + Date.now(), jour: iso(futur), heure: hm(futur) }));
    const pp = await appel(A, 'POST', 'v1/borne-pointage/pointages', json({ employeId: EMP, sens: 'SORTIE', id: 'E2E-BORNE-PP-' + Date.now(), jour: iso(passe), heure: hm(passe) }));
    const pr = await appel(A, 'POST', 'v1/borne-pointage/pointages', json({ employeId: EMP, sens: 'SORTIE', id: 'E2E-BORNE-PR-' + Date.now(), jour: iso(recent), heure: hm(recent) }));
    ok('Plus de 2 min dans le futur et plus de 72 h dans le passé : refusés ; 71 h (file hors ligne) : accepté',
      pf.o.success === false && pp.o.success === false && pr.o.success === true, [pf.o.msg, pp.o.msg, pr.o.success].join(' / '));

    /* photo */
    const m = multipart(JPEG);
    const ph = await appel(A, 'POST', 'v1/borne-pointage/pointages/' + idP + '/photo', m.corps, { type: m.type });
    ok('Photo du pointage de cette borne : enregistrée', ph.statut === 200 && ph.o.success === true && q(`SELECT photo_statut FROM t_pointage WHERE id = '${idP}'`) === 'AVEC', ph.t.slice(0, 120));

    /* seconde borne : photo d'un pointage d'une autre borne */
    const e2 = await rh('POST', 'bornes', admin, { empreinte: empreinte(2), nom: NOM + ' sortie' });
    const B = { id: e2.o.borneId, secret: e2.o.secret, empreinte: empreinte(2) };
    const m2 = multipart(JPEG);
    const autre = await appel(B, 'POST', 'v1/borne-pointage/pointages/' + idP + '/photo', m2.corps, { type: m2.type });
    ok('Photo d\'un pointage d\'une autre borne : refusée', autre.statut === 200 && autre.o.success === false, autre.t.slice(0, 100));

    /* empreintes */
    q("UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES'");
    r = await appel(A, 'GET', 'v1/borne-pointage/empreintes?format=ISO19794-2');
    ok('Empreintes, partage désactivé : refusées (DESACTIVE)', r.o && r.o.success === false && r.o.code === 'DESACTIVE', r.t.slice(0, 100));
    q("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES'");
    r = await appel(A, 'GET', 'v1/borne-pointage/empreintes?format=ISO19794-2');
    ok('Empreintes, partage actif : lues, Cache-Control no-store, lecture tracée (LIRE_BORNE)', r.o && r.o.success === true
      && q(`SELECT COUNT(*) FROM t_empreinte_journal WHERE action = 'LIRE_BORNE' AND utilisateur = '${A.id}'`) !== '0', r.t.slice(0, 100));
    q(`UPDATE t_parameters SET str_VALUE = '${PARTAGE}' WHERE str_KEY = 'KEY_EMPREINTES_PARTAGEES'`);

    /* reenrolement et retrait */
    const e3 = await rh('POST', 'bornes', admin, { empreinte: empreinte(1), nom: NOM + ' entrée 2' });
    r = await appel(A, 'GET', 'v1/borne-pointage/moi');
    const A2 = { id: e3.o.borneId, secret: e3.o.secret, empreinte: empreinte(1) };
    const r3 = await appel(A2, 'GET', 'v1/borne-pointage/moi');
    ok('Même empreinte réenrôlée : l\'ancienne borne reçoit 401 REVOQUEE, la nouvelle répond (nouveau secret)', r.statut === 401 && r.o.code === 'REVOQUEE'
      && r3.statut === 200 && A2.secret !== A.secret, r.statut + ' ' + (r.o && r.o.code) + ' / ' + r3.statut);
    const ret = await rh('POST', 'bornes/' + B.id + '/retirer', admin);
    r = await appel(B, 'GET', 'v1/borne-pointage/moi');
    ok('Retrait : 401 REVOQUEE immédiat', ret.o.success && r.statut === 401 && r.o.code === 'REVOQUEE', r.statut + ' ' + (r.o && r.o.code));

    /* secret absent des journaux */
    const log = q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${debutLog}' AND (CONVERT(str_DESCRIPTION USING utf8mb4) LIKE '%${A.secret}%' OR CONVERT(str_DESCRIPTION USING utf8mb4) LIKE '%${A2.secret}%')`);
    const journalBorne = q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${debutLog}' AND str_DESCRIPTION LIKE '%Borne de pointage ${NOM} entr_e enr_l_e par%'`);
    const pointeLog = q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${debutLog}' AND str_DESCRIPTION LIKE '%Pointage par la borne ${NOM} entr_e pour ZZ ESSAI Borne%'`);
    let serveur = '';
    try { const f = 'D:/payara5/payara5/glassfish/domains/domain1/logs/server.log'; const t = fs.readFileSync(f, 'utf8'); serveur = t.slice(-3000000); } catch (x) { serveur = ''; }
    ok('Secret absent du journal des événements et du journal du serveur ; enrôlement et pointage journalisés',
      log === '0' && serveur.indexOf(A.secret) < 0 && serveur.indexOf(A2.secret) < 0 && journalBorne === '1' && pointeLog === '2' /* les deux pointages acceptés de la borne */, [log, journalBorne, pointeLog, serveur.length].join(' / '));

    /* limites */
    let codes = [];
    for (let i = 0; i < 122; i++) { codes.push((await appel(A2, 'GET', 'v1/borne-pointage/moi')).statut); }
    ok('Au-delà de 120 appels par minute : 429', codes.slice(0, 118).every((c) => c === 200) && codes.slice(-1)[0] === 429, codes.filter((c) => c === 429).length + ' refus');
    codes = [];
    for (let i = 0; i < 11; i++) { codes.push((await appel(A2, 'GET', 'v1/borne-pointage/moi', null, { secret: crypto.randomBytes(32).toString('base64url') })).statut); }
    const apres = await appel(A2, 'GET', 'v1/borne-pointage/moi');
    /* les signatures fausses des contrôles précédents (dans la même minute) comptent aussi : le blocage arrive au
       plus tard à la dixième, et tout appel suivant est refusé */
    const premier429 = codes.indexOf(429);
    ok('10 signatures fausses par minute : l\'adresse est bloquée (429, même avec une signature juste)', premier429 >= 0 && premier429 <= 9
      && codes.slice(0, premier429).every((c) => c === 401) && codes.slice(premier429).every((c) => c === 429) && apres.statut === 429
      && apres.o.code === 'TROP_DE_DEMANDES', codes.join(',') + ' / ' + apres.statut);
  } catch (x) { ok('Parcours sans exception', false, x.stack); } finally {
    nettoyer();
    ok('Essais retirés', q(`SELECT (SELECT COUNT(*) FROM t_borne_pointage WHERE nom LIKE '${NOM}%') + (SELECT COUNT(*) FROM t_pointage WHERE employe_id = '${EMP}')`
      + ` + (SELECT COUNT(*) FROM t_employe WHERE id = '${EMP}') + (SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '${VEND}')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
