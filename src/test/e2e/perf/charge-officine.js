/* ESSAI DE CHARGE D'UNE OFFICINE (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md).
 *
 * Plusieurs postes travaillent EN MEME TEMPS, chacun par le vrai chemin de l'ecran (menu clique, champs tapes,
 * boutons cliques), avec son propre compte et sa propre caisse. La charge monte par paliers (PALIERS, par defaut
 * 1, 2, 4, 8, 15 postes) ; chaque palier dure DUREE_PALIER secondes. Les postes sont pris dans cet ordre :
 *   caisse, caisse, recherche, caisse, commande, caisse, etats, caisse, facturation, caisse, recherche, caisse,
 *   commande, caisse, caisse
 * soit, a 15 postes : 9 caisses, 2 postes de recherche et de stock, 2 postes de commande, 1 poste d'etats (Ticket Z,
 * ventes terminees, recap), 1 poste de facturation.
 *
 * Gestes de chaque poste :
 *   - caisse : 1 a 3 articles tapes par leur CIP dans la recherche produit (Entree), montant recu tape,
 *     « Terminer la vente » clique ; une pause de PAUSE_CAISSE secondes entre deux ventes ;
 *   - recherche : un mot tape dans la Fiche article, Entree, apercu d'une ligne (double-clic) ;
 *   - commande : « NOUVELLE COMMANDE », grossiste, 3 articles cherches par leur CIP, quantite, Entree ;
 *   - etats : Ticket Z du jour, ventes terminees du jour, recap des articles vendus de la semaine ;
 *   - facturation : liste des factures du mois, puis « Créer » et recherche des bons du mois (sans generer).
 * Chaque geste est chronometre du premier clic jusqu'au repos de la page (aucune requete en vol depuis 400 ms, aucun
 * masque de chargement). Erreurs relevees : reponses 5xx, requetes echouees, erreurs JavaScript, boites de message
 * d'erreur, gestes qui n'aboutissent pas en GESTE_MAX secondes.
 *
 * Toutes les 5 s : memoire Java et temps de ramasse-miettes du serveur (jstat), connexions et requetes en cours de
 * MariaDB, attentes de verrous, interblocages, processeur et memoire du poste de test.
 *
 * L'IMPRESSION DU TICKET EST BLOQUEE : les appels vente/ticket/* sont annules dans le navigateur, sinon le serveur
 * enverrait de vrais tickets a l'imprimante configuree.
 *
 * ECRIT DANS LA BASE (comptes, caisses, ventes, commandes) : uniquement sur une copie de mesure (nom en _perf), qui est
 * rechargee depuis l'original apres l'essai. Preparation : comptes e2e-c01 a e2e-c15, copies de e2e (memes roles) ;
 * chaque caisse est ouverte par l'ecran, quand la vente le propose (« Votre caisse est fermée... » : Oui, fond saisi).
 *
 * RYTHME REEL D'UNE OFFICINE (lenteurs aleatoires en caisse, 08/11) : ROLES=caisse ne lance que des caisses ;
 * VENTES_HEURE fixe le nombre de ventes par heure de toutes les caisses ensemble (pic mesure dans les copies : 175 a
 * 185 ventes/h avec 5 a 8 caissiers pour une officine a 1 800 ventes/jour ; heure normale 60 a 90). Les clients
 * arrivent au hasard (attente exponentielle entre deux ventes d'une caisse), donc en rafales comme au comptoir. Chaque
 * geste qui depasse SEUIL_LENT ms est date et liste ; s'il depasse 1,5 s, les fils du serveur sont captures (jstack,
 * SERVEUR_PID) chaque seconde tant qu'il dure. Les sauvegardes automatiques (t_sauvegarde) du palier sont relevees.
 *
 * REJEU D'UNE HEURE REELLE : REJOUER='2025-11-15 11:00' rejoue les ventes terminees de cette heure (REJEU_MINUTES,
 * 60 par defaut), vente par vente, a leur instant (divise par ACCELERATION) : memes articles (tapes par leur CIP ; un
 * article sans CIP a 7 chiffres unique ou sans stock est remplace par un article tire au hasard), meme quantite (scans
 * repetes, 3 au plus), chaque caissier de l'epoque sur son poste (PALIERS = nombre de caissiers ; au-dela, modulo). Un
 * client en retard est servi des que sa caisse se libere, comme une file au comptoir. Toutes les ventes sont rejouees
 * au comptant. SAUVEGARDES_A='5,35' : un poste super administrateur (E2E_LOGIN_SUPPORT) clique « Sauvegarder
 * maintenant » (Stabilite du serveur, onglet Sauvegardes) a ces minutes du rejeu.
 *
 * Variables : BASE, DB_TEST + E2E_BASE_LIBRE=1, MARIADB_OPTIONS, PALIERS (1,2,4,8,15), DUREE_PALIER (300), LOURDS (0),
 * PERIODE_LOURDE (30),
 * PAUSE_CAISSE (8), GESTE_MAX (120), SERVEUR_PID (processus Java de Payara), JSTAT, SORTIE,
 * ROLES (liste separee par des virgules, ou « caisse »), VENTES_HEURE, SEUIL_LENT (2000), JSTACK, REJOUER,
 * REJEU_MINUTES (60), ACCELERATION (1), SAUVEGARDES_A.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execFile } = require('child_process');

const DB = ENV_E2E.BASE;
if (!/_perf$/.test(DB)) { throw new Error('Essai de charge : copie de mesure (nom en _perf) obligatoire, pas ' + DB); }
const PALIERS = (process.env.PALIERS || '1,2,4,8,15').split(',').map(Number);
const DUREE = Number(process.env.DUREE_PALIER || 300) * 1000;
const PAUSE_CAISSE = Number(process.env.PAUSE_CAISSE || 8) * 1000;
const GESTE_MAX = Number(process.env.GESTE_MAX || 120) * 1000;
const PID = process.env.SERVEUR_PID;
const JSTAT = process.env.JSTAT || 'C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot/bin/jstat.exe';
const SORTIE = process.env.SORTIE || path.join(ENV_E2E.TMP, 'charge-' + DB + '.json');
const ROLES = process.env.ROLES === 'caisse' ? Array(Math.max(...PALIERS)).fill('caisse')
  : process.env.ROLES ? process.env.ROLES.split(',')
    : ['caisse', 'caisse', 'recherche', 'caisse', 'commande', 'caisse', 'etats', 'caisse', 'facturation', 'caisse',
      'recherche', 'caisse', 'commande', 'caisse', 'caisse'];
const VENTES_HEURE = Number(process.env.VENTES_HEURE || 0);
const SEUIL_LENT = Number(process.env.SEUIL_LENT || 2000);
const JSTACK = process.env.JSTACK || JSTAT.replace(/jstat(\.exe)?$/, 'jstack$1');
/* postes d'etats lourds en plus (LOURDS) : suggestion depuis le recap sur PERIODE_LOURDE jours, en boucle ; ils
   demarrent une minute apres les autres postes et occupent chacun un fil du serveur pendant des minutes */
const LOURDS = Number(process.env.LOURDS || 0);
const PERIODE_LOURDE = Number(process.env.PERIODE_LOURDE || 30);
for (let k = 0; k < LOURDS; k++) { ROLES[Math.max(...PALIERS) + k] = 'suggestion'; }
const SAUVEGARDES_A = (process.env.SAUVEGARDES_A || '').split(',').filter(Boolean).map(Number);
if (SAUVEGARDES_A.length) { ROLES[Math.max(...PALIERS) + LOURDS] = 'sauvegarde'; }
const NB = Math.max(...PALIERS) + LOURDS + (SAUVEGARDES_A.length ? 1 : 0);
const REJOUER = process.env.REJOUER || '';
const REJEU_MINUTES = Number(process.env.REJEU_MINUTES || 60);
const ACCELERATION = Number(process.env.ACCELERATION || 1);
/* le rejeu commence une minute apres le lancement du palier : connexions et ecrans de vente ouverts */
const REJEU_ATTENTE_MS = 60000;
let debutRejeu = 0;

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN'], { input: s, encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024 }).replace(/\r/g, '').trim();
const qa = (s) => new Promise((ok) => {
  const c = execFile('mariadb', [...ENV_E2E.MARIADB, DB, '-sN', '-e', s], { encoding: 'utf8' }, (e, out) => ok(e ? '' : out.replace(/\r/g, '').trim()));
  c.on('error', () => ok(''));
});
const jour = (d) => d.toISOString().slice(0, 10);

/* ---------- preparation : comptes, fonds de caisse, articles ---------- */
const login = (i) => 'e2e-c' + String(i + 1).padStart(2, '0');
const idUser = (i) => '900000000000000001' + String(i + 10).padStart(2, '0');
function preparerComptes() {
  let s = "CREATE TEMPORARY TABLE e2e_u AS SELECT * FROM t_user WHERE str_LOGIN = 'e2e';";
  for (let i = 0; i < NB; i++) {
    s += `DELETE FROM t_role_user WHERE lg_USER_ID = '${idUser(i)}';`
      + `UPDATE e2e_u SET lg_USER_ID = '${idUser(i)}', str_LOGIN = '${login(i)}', str_FIRST_NAME = 'Caisse', str_LAST_NAME = '${login(i).toUpperCase()}';`
      + 'INSERT IGNORE INTO t_user SELECT * FROM e2e_u;'
      + `INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED, dt_UPDATED) SELECT CONCAT('E2E-CH-', '${i}', '-', ru.lg_ROLE_ID), ru.lg_ROLE_ID,`
      + ` '${idUser(i)}', NOW(), NOW() FROM t_role_user ru JOIN t_user a ON a.lg_USER_ID = ru.lg_USER_ID WHERE a.str_LOGIN = 'e2e';`;
  }
  q(s);
}
/* articles vendables : CIP a 7 chiffres unique, prix moyen, stock large ; mots de recherche tires de leurs noms */
const ARTICLES = q("SELECT CONCAT_WS('|', f.int_CIP, f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 30"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY RAND(7) LIMIT 300").split('\n').filter(Boolean).map((l) => l.split('|'));
/* rejeu : ventes de l'heure choisie (decalage en secondes, rang du caissier, lignes « cip:quantite ») ; aucune donnee
   nominative lue, seulement les articles, quantites, instants et le rang du caissier */
const VENTES_REJOUEES = !REJOUER ? [] : q("SELECT TIMESTAMPDIFF(SECOND, '" + REJOUER + "', p.dt_CREATED), c.rang,"
  + " GROUP_CONCAT(CONCAT(IF(f.int_CIP REGEXP '^[0-9]{7}$' AND IFNULL(s.int_NUMBER_AVAILABLE, 0) > d.int_QUANTITY + 5"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1, f.int_CIP, ''), ':', d.int_QUANTITY) ORDER BY d.lg_PREENREGISTREMENT_DETAIL_ID SEPARATOR ' ')"
  + " FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
  + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID LEFT JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " JOIN (SELECT lg_USER_CAISSIER_ID u, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, lg_USER_CAISSIER_ID) - 1 rang FROM t_preenregistrement"
  + "   WHERE str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND dt_CREATED >= '" + REJOUER + "' AND dt_CREATED < '" + REJOUER + "' + INTERVAL " + REJEU_MINUTES + ' MINUTE'
  + '   GROUP BY lg_USER_CAISSIER_ID) c ON c.u = p.lg_USER_CAISSIER_ID'
  + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_CREATED >= '" + REJOUER + "' AND p.dt_CREATED < '" + REJOUER + "' + INTERVAL " + REJEU_MINUTES + ' MINUTE'
  + ' GROUP BY p.lg_PREENREGISTREMENT_ID ORDER BY p.dt_CREATED').split('\n').filter(Boolean).map((l) => {
  const [s, rang, lignes] = l.split('\t');
  return { s: Number(s), rang: Number(rang), lignes: lignes.split(' ').map((x) => { const [cip, qte] = x.split(':'); return { cip, qte: Number(qte) }; }) };
});
const MOTS = ['PARA', 'DOLI', 'AMOX', 'VITA', 'SIROP', 'CREME', 'GEL', 'COMP', 'IBU', 'SPASF'];
const GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const hasard = (t) => t[Math.floor(Math.random() * t.length)];

/* ---------- releve du serveur toutes les 5 s ---------- */
const releves = [];
let cpuAvant = os.cpus().map((c) => c.times);
function cpuPoste() {
  const apres = os.cpus().map((c) => c.times);
  let occupe = 0, total = 0;
  apres.forEach((t, i) => { const a = cpuAvant[i]; const d = (k) => t[k] - a[k];
    const tt = d('user') + d('nice') + d('sys') + d('idle') + d('irq'); total += tt; occupe += tt - d('idle'); });
  cpuAvant = apres;
  return total ? Math.round(100 * occupe / total) : null;
}
const statutMaria = ['Threads_connected', 'Threads_running', 'Innodb_row_lock_waits', 'Innodb_row_lock_time', 'Innodb_deadlocks', 'Questions', 'Innodb_row_lock_current_waits'];
async function relever(palier) {
  const r = { t: Date.now(), palier, cpuPoste: cpuPoste(), memLibreGo: Math.round(os.freemem() / 1e8) / 10 };
  const st = await qa("SHOW GLOBAL STATUS WHERE Variable_name IN ('" + statutMaria.join("','") + "')");
  st.split('\n').filter(Boolean).forEach((l) => { const [k, v] = l.split('\t'); r[k] = Number(v); });
  r.requetesLongues = Number(await qa("SELECT COUNT(*) FROM information_schema.processlist WHERE command = 'Query' AND time >= 5 AND info NOT LIKE '%processlist%'")) || 0;
  if (PID) {
    const g = await new Promise((ok) => execFile(JSTAT, ['-gc', PID], { encoding: 'utf8' }, (e, out) => ok(e ? '' : out)));
    const [tete, val] = g.trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/));
    if (tete && val) { const v = (k) => Number(String(val[tete.indexOf(k)]).replace(',', '.'));
      r.tasMo = Math.round((v('S0U') + v('S1U') + v('EU') + v('OU')) / 1024); r.tasMaxMo = Math.round((v('S0C') + v('S1C') + v('EC') + v('OC')) / 1024);
      r.vieuxMo = Math.round(v('OU') / 1024); r.gcS = v('GCT'); r.gcComplets = v('FGC'); }
  }
  releves.push(r);
}

/* ---------- un poste ---------- */
const gestes = [];
const erreurs = [];
/* PARCOURS D'UN SCAN DANS L'ECRAN (scan perdu du 11/11, une fois sur 439, sans requete d'ajout) : execute dans la page,
   une seule fois ; observe sans rien changer. Chaque evenement : heure, quoi, texte et valeur du champ de recherche, liste
   ouverte ou non, nombre de lignes de la liste, element qui a le curseur. Garde les 80 derniers. */
function installerParcoursScan() {
  if (window.__parcoursScanPose || !window.testextjs || !testextjs.app) { return; }
  const c = testextjs.app.getController('VenteCtr');
  const combo = c && c.getVnoproduitCombo && c.getVnoproduitCombo();
  if (!combo) { return; }
  window.__parcoursScanPose = true;
  window.__parcoursScan = [];
  const noter = (quoi) => {
    let etat = {};
    try {
      const st = combo.getStore();
      etat = { brut: String(combo.getRawValue()).slice(0, 40), valeur: String(combo.getValue()).slice(0, 40), ouverte: !!combo.isExpanded,
        lignes: st ? st.getCount() : null, chargement: st ? !!st.isLoading() : null,
        curseur: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
        rechercheEnAttente: !!(combo.doQueryTask && combo.doQueryTask.id) };
    } catch (e) { etat = { erreur: String(e.message).slice(0, 80) }; }
    window.__parcoursScan.push(Object.assign({ t: Date.now(), quoi }, etat));
    if (window.__parcoursScan.length > 80) { window.__parcoursScan.shift(); }
  };
  ['onProduitSpecialKey', 'checkDouchette', 'addProduitFromScan', 'addVenteVno', 'curseurDansRecherche'].forEach((m) => {
    const f = c[m];
    if (typeof f !== 'function') { return; }
    c[m] = function () { noter(m + ' : debut'); try { return f.apply(this, arguments); } finally { noter(m + ' : fin'); } };
  });
  combo.on('specialkey', (cb, e) => { if (e.getKey() === e.ENTER) { noter('Entree (apres le controleur)'); } });
  combo.on('expand', () => noter('liste ouverte'));
  combo.on('collapse', () => noter('liste fermee'));
  combo.on('select', () => noter('article choisi dans la liste'));
  combo.on('beforequery', () => noter('recherche lancee'));
  combo.getStore().on('load', () => noter('liste chargee'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter') { noter('touche Entree (document)'); } }, true);
}

/* scans qui n'ajoutent pas l'article : l'ecran attend la quantite (seconde touche Entree de la caissiere) */
const secondeEntree = [];
let captureEnCours = false;
async function poste(b, i, fin, palier) {
  const role = ROLES[i];
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  /* impression du ticket bloquee : pas de vrai ticket envoye a l'imprimante */
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  let enVol = 0, derniere = Date.now();
  const suivi = (r) => ['xhr', 'fetch', 'document', 'script'].indexOf(r.resourceType()) >= 0;
  /* duree de chaque requete (depart -> fin de reponse) et attente du serveur (envoi -> premier octet), pour dire si un
     geste lent attendait le serveur ou le navigateur */
  const departs = new Map();
  const requetes = [];
  /* chronologie de TOUTES les requetes parties, meme restees sans reponse (pour un geste en echec) */
  const chrono = [];
  const chronoDe = new Map();
  p.on('request', (r) => { if (suivi(r)) { enVol++; derniere = Date.now(); departs.set(r, Date.now());
    const c = { url: r.method() + ' ' + r.url().replace(/^.*\/prestige/, '').split('?')[0].slice(0, 90), depart: Date.now(), fin: null };
    chrono.push(c); chronoDe.set(r, c); if (chrono.length > 600) { chrono.splice(0, 300); } } });
  const finChrono = (r, etat) => { const c = chronoDe.get(r); if (c) { c.fin = Date.now(); c.etat = etat; chronoDe.delete(r); } };
  p.on('requestfinished', (r) => { r.response().then((x) => finChrono(r, x ? x.status() : '?')).catch(() => finChrono(r, '?')); });
  p.on('requestfailed', (r) => finChrono(r, 'echec ' + ((r.failure() || {}).errorText || '')));
  const finReq = (r) => { if (suivi(r)) { enVol = Math.max(0, enVol - 1); derniere = Date.now();
    const d = departs.get(r); departs.delete(r);
    if (d) { let serveur = null; try { const tm = r.timing(); if (tm.responseStart >= 0 && tm.requestStart >= 0) { serveur = Math.round(tm.responseStart - tm.requestStart); } } catch (e) { /* sans mesure */ }
      requetes.push({ url: r.method() + ' ' + r.url().replace(/^.*\/prestige/, '').split('?')[0].slice(0, 90), debut: d, ms: Date.now() - d, serveur });
      if (requetes.length > 400) { requetes.splice(0, 200); } } } };
  p.on('requestfinished', finReq);
  p.on('requestfailed', (r) => { finReq(r); if (!/\/vente\/ticket\//.test(r.url()) && suivi(r)) {
    erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'requete echouee', detail: r.method() + ' ' + r.url().replace(/^.*\/prestige/, '') + ' ' + (r.failure() || {}).errorText }); } });
  p.on('response', (r) => { if (r.status() >= 500) { erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'HTTP ' + r.status(), detail: r.request().method() + ' ' + r.url().replace(/^.*\/prestige/, '').slice(0, 200) }); } });
  p.on('pageerror', (e) => erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'erreur JavaScript', detail: String(e.message).slice(0, 300) }));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));

  async function repos() {
    const limite = Date.now() + GESTE_MAX;
    while (Date.now() < limite) {
      const masque = await p.evaluate(() => !!(window.Ext && (Ext.ComponentQuery.query('loadmask{isVisible()}').length
        || Array.prototype.some.call(document.querySelectorAll('.x-mask-msg'), (e) => e.offsetParent !== null)))).catch(() => false);
      if (!masque && enVol === 0 && Date.now() - derniere >= 400) { return derniere; }
      await p.waitForTimeout(50);
    }
    throw new Error('geste non abouti en ' + GESTE_MAX / 1000 + ' s');
  }
  /* boite de message d'erreur visible : relevee, puis fermee */
  async function messageErreur(nom) {
    const t = await vues.texteMessage(p).catch(() => '');
    if (t && /erreur|error|exception|impossible|échec|echec|failure|500/i.test(t)) {
      erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'message', detail: nom + ' : ' + t.slice(0, 300) });
      await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close())).catch(() => {});
    }
  }
  async function geste(nom, action) {
    const t0 = Date.now();
    let ok = true, detail = '';
    /* geste encore en cours apres 1,5 s : fils du serveur captures chaque seconde tant qu'il dure */
    const piles = [];
    let enCours = true;
    const capturer = async () => {
      while (enCours && PID && Date.now() - t0 < GESTE_MAX) {
        /* une seule capture a la fois pour tous les postes, sinon les captures chargent elles-memes le serveur */
        if (!captureEnCours) {
          captureEnCours = true;
          const f = path.join(path.dirname(SORTIE), 'piles-p' + palier + '-poste' + i + '-' + t0 + '-' + (Date.now() - t0) + '.txt');
          await new Promise((r) => execFile(JSTACK, [PID], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
            (e, out) => { if (!e) { fs.writeFileSync(f, out); piles.push(path.basename(f)); } r(); }));
          captureEnCours = false;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    const minuteurPiles = setTimeout(() => { capturer().catch(() => {}); }, 1500);
    const finir = () => { enCours = false; clearTimeout(minuteurPiles); };
    /* les trois requetes les plus longues du geste */
    const pires = () => requetes.filter((x) => x.debut >= t0).sort((a, c) => c.ms - a.ms).slice(0, 3);
    try { await action(); const tf = await repos(); finir(); await messageErreur(nom); gestes.push({ t: t0, palier, poste: i, role, nom, ms: Math.max(0, tf - t0), ok, piles, requetes: pires() }); return; }
    catch (e) { ok = false; detail = String(e.message).split('\n')[0].slice(0, 200); }
    finir();
    gestes.push({ t: t0, palier, poste: i, role, nom, ms: Date.now() - t0, ok, piles, requetes: pires() });
    /* ce que montrait l'ecran : boite de message visible et capture */
    const ecran = await vues.texteMessage(p).catch(() => '');
    const capture = path.join(path.dirname(SORTIE), 'echec-p' + palier + '-poste' + i + '-' + Date.now() + '.png');
    await p.screenshot({ path: capture }).catch(() => {});
    /* pour reproduire : requetes parties depuis 5 s avant le geste (avec celles restees sans reponse) et parcours du
       scan dans l'ecran (touches traitees, chemin pris, etat du champ de recherche) */
    const requetesDuGeste = chrono.filter((c) => c.depart >= t0 - 5000)
      .map((c) => ({ url: c.url, depart: c.depart - t0, ms: c.fin ? c.fin - c.depart : null, etat: c.fin ? c.etat : 'SANS REPONSE' }));
    const parcoursScan = await p.evaluate(() => window.__parcoursScan || []).catch(() => []);
    erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'geste en echec', detail: nom + ' : ' + detail + (ecran ? ' ; écran : ' + ecran.slice(0, 200) : ''), capture,
      debutGeste: t0, requetesDuGeste, parcoursScan: parcoursScan.filter((x) => x.t >= t0 - 5000).map((x) => Object.assign({}, x, { t: x.t - t0 })) });
    await messageErreur(nom);
  }
  /* ecran par son xtype : libelles lus dans l'arbre du menu de l'utilisateur, puis clic dans le menu */
  async function ouvrir(xtype) {
    await p.evaluate(() => { try { prestigeShowMetro(); } catch (e) { /* ancien en-tete */ } }).catch(() => {});
    await p.waitForTimeout(500);
    const lib = await p.evaluate((x) => { let r = null; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode()
      .cascadeBy((n) => { if (!r && n.get('id') === x && n.parentNode) { r = [n.parentNode.get('text'), n.get('text')]; } }); return r; }, xtype);
    if (!lib) { throw new Error('ecran ' + xtype + ' absent du menu'); }
    await vues.ouvrirMenu(p, lib[0], lib[1]);
  }
  const poser = (requete, d) => p.evaluate(([r, v]) => { const c = r.charAt(0) === '#' && r.indexOf(' ') < 0 ? Ext.getCmp(r.slice(1)) : Ext.ComponentQuery.query(r)[0];
    c.setValue(Ext.Date.parse(v, 'Y-m-d')); }, [requete, d]);
  async function bouton(xtype, texte) {
    const id = await p.evaluate(([x, t]) => { const v = Ext.ComponentQuery.query(x).filter((c) => c.isVisible(true))[0]; if (!v) { return null; }
      const btn = v.query('button').filter((b) => b.isVisible(true) && new RegExp('^\\s*' + t + '\\s*$', 'i').test((b.getText() || '').replace(/&eacute;/g, 'é')))[0];
      return btn ? btn.getId() : null; }, [xtype, texte]);
    if (!id) { throw new Error('bouton « ' + texte + ' » introuvable dans ' + xtype); }
    await p.click('#' + id);
  }

  try {
    await geste('connexion', () => vues.connexion(p, role === 'sauvegarde' ? ENV_E2E.LOGIN_SUPPORT : login(i), 'e2etest'));
    const aujourdhui = jour(new Date());
    if (role === 'caisse') {
      /* caisse fermee : l'ecran le propose au moment de terminer la vente (« Votre caisse est fermée, voulez-vous
         l'ouvrir ? ») ; Oui, puis « Ouvrir caisse » dans la fenetre d'ouverture, comme la caissiere */
      const ouvrirCaisseSiProposee = async () => {
        const fin = Date.now() + 3000;
        while (Date.now() < fin) {
          if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /caisse est ferm/i.test(m.el.dom.textContent)))) {
            await vues.repondre(p, 'yes');
            await p.waitForFunction(() => { const b = Ext.getCmp('btnValidate'); return b && b.isVisible(true) && !b.isDisabled(); }, null, { timeout: GESTE_MAX });
            await vues.saisir(p, '#coffreCaisseAmount', '20000');
            const ouverture = p.waitForResponse((r) => /\/caisse\/ouvrir-caisse/.test(r.url()), { timeout: GESTE_MAX });
            await vues.cliquer(p, '#btnValidate');
            await ouverture;
            /* « Confirmation de l'impression du ticket » d'ouverture : Non (pas d'impression) */
            const finTicket = Date.now() + 5000;
            while (Date.now() < finTicket) {
              if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /impression du ticket/i.test(m.el.dom.textContent)))) {
                await vues.repondre(p, 'no');
                break;
              }
              await p.waitForTimeout(200);
            }
            return true;
          }
          await p.waitForTimeout(200);
        }
        return false;
      };
      await ouvrir('cloturerventemanager');
      await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await vues.cliquer(p, 'cloturerventemanager #addBtn');
      const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
      await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), CHAMP, { timeout: 60000 });
      await p.waitForTimeout(1500);
      /* clients : tires au hasard, ou ceux de l'heure rejouee que servait ce poste */
      const miennes = VENTES_REJOUEES.filter((v) => v.rang % palier === i);
      let suivant = 0;
      while (Date.now() < fin && (!REJOUER || suivant < miennes.length)) {
        let cips;
        if (REJOUER) {
          const v = miennes[suivant++];
          const arrivee = debutRejeu + v.s * 1000 / ACCELERATION;
          if (arrivee > Date.now()) { await p.waitForTimeout(Math.min(arrivee - Date.now(), Math.max(0, fin - Date.now()))); }
          if (Date.now() >= fin) { break; }
          cips = [];
          v.lignes.forEach((l) => { const c = l.cip || hasard(ARTICLES)[0]; for (let r = 0; r < Math.min(Math.max(1, l.qte), 3); r++) { cips.push(c); } });
        } else {
          cips = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => hasard(ARTICLES)[0]);
        }
        for (let k = 0; k < cips.length && Date.now() < fin; k++) {
          const cip = cips[k];
          await geste('caisse : article ajouté', async () => {
            await p.evaluate(installerParcoursScan).catch(() => {});
            await vues.cliquer(p, CHAMP);
            await p.keyboard.press('Control+A');
            await p.keyboard.type(cip, { delay: 15 });
            const rep = p.waitForResponse((r) => /\/vente\/add\/(vno|item)/.test(r.url()), { timeout: GESTE_MAX });
            await p.keyboard.press('Enter');
            /* la recherche de l'article etait deja revenue (deuxieme scan du meme article, ou serveur rapide) : l'ecran ne
               l'ajoute pas, il place le curseur dans « QD » et attend Entree ; la caissiere appuie une seconde fois */
            let r = await Promise.race([rep, p.waitForTimeout(2500).then(() => null)]);
            if (!r) {
              const dansQd = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0];
                return !!c && document.activeElement === c.inputEl.dom; }).catch(() => false);
              if (dansQd) { secondeEntree.push({ t: Date.now(), palier, poste: i, cip }); await p.keyboard.press('Enter'); }
              r = await rep;
            }
            if (r.status() >= 400) { throw new Error('ajout refusé ' + r.status()); }
          });
          await p.waitForTimeout(600);
        }
        await geste('caisse : vente terminée', async () => {
          const net = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); const d = c.getNetAmountToPay(); return d ? d.montantNet : 0; });
          if (!net) { throw new Error('vente sans montant'); }
          /* apres un ajout, l'ecran rend le curseur a la recherche produit : attendre le focus dans « Montant reçu »
             avant de taper, sinon le premier chiffre part dans l'autre champ */
          await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
          await p.waitForFunction(() => document.activeElement === Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].inputEl.dom, null, { timeout: 10000 });
          await p.waitForTimeout(300);
          await p.keyboard.press('Control+A');
          await p.keyboard.type(String(net), { delay: 15 });
          await p.waitForTimeout(300);
          const rep = p.waitForResponse((r) => /\/vente\/cloturer\/vno/.test(r.url()), { timeout: GESTE_MAX });
          await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
          await ouvrirCaisseSiProposee();
          const r = await rep;
          const corps = await r.json().catch(() => ({}));
          if (r.status() >= 400 || corps.success === false) { throw new Error('clôture refusée ' + r.status() + ' ' + String(corps.msg || '').slice(0, 120)); }
          /* « Voulez-vous imprimer le ticket ? » : Non */
          await p.waitForTimeout(400);
          if (await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /imprimer le ticket/i.test(m.el.dom.textContent)))) {
            await vues.repondre(p, 'no');
          }
        });
        /* rythme reel : attente exponentielle, moyenne = postes x 3 600 s / VENTES_HEURE, moins la duree d'une vente (~10 s) */
        if (!REJOUER) await p.waitForTimeout(VENTES_HEURE ? Math.min(Math.max(0, fin - Date.now()),
          Math.round(-Math.log(1 - Math.random()) * Math.max(1000, palier * 3600000 / VENTES_HEURE - 10000))) : PAUSE_CAISSE);
      }
    } else if (role === 'sauvegarde') {
      /* super administrateur : « Sauvegarder maintenant » aux minutes SAUVEGARDES_A du rejeu (ou du palier) */
      await ouvrir('supportserveur');
      await p.locator('.x-tab:visible').filter({ hasText: 'Sauvegardes' }).first().click({ timeout: 60000 });
      await p.waitForFunction(() => { const b = Ext.ComponentQuery.query('supportserveur #btnSauvMaintenant')[0]; return b && b.isVisible(true); }, null, { timeout: 60000 });
      for (const m of SAUVEGARDES_A) {
        const a = debutRejeu + m * 60000 / ACCELERATION;
        if (a > Date.now()) { await p.waitForTimeout(Math.min(a - Date.now(), Math.max(0, fin - Date.now()))); }
        if (Date.now() >= fin) { break; }
        await geste('sauvegarde : lancée', async () => {
          const id = await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #btnSauvMaintenant')[0].getId());
          const rep = p.waitForResponse((r) => /\/sauvegardes\/maintenant/.test(r.url()), { timeout: GESTE_MAX });
          await p.click('#' + id);
          const r = await rep;
          const corps = await r.json().catch(() => ({}));
          if (r.status() >= 400 || corps.success === false) { throw new Error('sauvegarde refusée ' + r.status() + ' ' + String(corps.message || '').slice(0, 120)); }
        });
      }
      while (Date.now() < fin) { await p.waitForTimeout(Math.min(5000, Math.max(0, fin - Date.now()))); }
    } else if (role === 'recherche') {
      await geste('fiche article : ouverture', () => ouvrir('famillemanager'));
      while (Date.now() < fin) {
        await geste('fiche article : recherche', async () => { await vues.saisir(p, '#rechecher', hasard(MOTS)); await p.keyboard.press('Enter'); });
        await p.waitForTimeout(1500);
        await geste('fiche article : aperçu', async () => {
          const n = await p.locator('.x-grid-row:visible').count();
          if (n > 1) { await p.locator('.x-grid-row:visible').nth(1 + Math.floor(Math.random() * Math.min(n - 1, 15))).locator('td').nth(2).dblclick(); }
        });
        await p.waitForTimeout(4000);
      }
    } else if (role === 'commande') {
      while (Date.now() < fin) {
        await geste('commande : ouverture', () => ouvrir('i_order_manager'));
        await geste('commande : nouvelle commande', async () => {
          await bouton('commandesencours', 'NOUVELLE COMMANDE');
          await p.waitForFunction(() => Ext.getCmp('str_NAME') && Ext.getCmp('str_NAME').rendered, null, { timeout: 60000 });
        });
        await p.waitForTimeout(800);
        await p.evaluate((g) => { const c = Ext.getCmp('lgGROSSISTEID'); c.getStore().load({ callback: () => c.setValue(g) }); }, GROSSISTE);
        await p.waitForFunction((g) => Ext.getCmp('lgGROSSISTEID').getValue() === g, GROSSISTE, { timeout: 30000 }).catch(() => {});
        for (let k = 0; k < 3 && Date.now() < fin; k++) {
          const [cip] = hasard(ARTICLES);
          await geste('commande : article ajouté', async () => {
            await p.click('#str_NAME-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type(cip, { delay: 15 });
            await p.waitForFunction((c) => { const x = Ext.getCmp('str_NAME'); return x.isExpanded && x.getStore().getCount() > 0 && !x.getStore().isLoading(); }, cip, { timeout: GESTE_MAX });
            await p.locator('#' + await p.evaluate(() => Ext.getCmp('str_NAME').picker.getId()) + ' .x-boundlist-item').first().click();
            await p.waitForFunction(() => document.activeElement && /int_QUANTITE/.test(document.activeElement.id), null, { timeout: 15000 });
            await p.keyboard.press('Control+A'); await p.keyboard.type('5'); await p.keyboard.press('Enter');
          });
          await p.waitForTimeout(2000);
        }
        await p.waitForTimeout(5000);
      }
    } else if (role === 'etats') {
      while (Date.now() < fin) {
        await geste('états : Ticket Z du jour', async () => {
          await ouvrir('ticketzmanager');
          await p.waitForSelector('.ticketz-carte, .ticketz-vide', { timeout: GESTE_MAX });
          await poser('ticketzmanager #dtStart', aujourdhui); await poser('ticketzmanager #dtEnd', aujourdhui);
          await bouton('ticketzmanager', 'Afficher');
        });
        await p.waitForTimeout(3000);
        await geste('états : ventes terminées du jour', async () => {
          await ouvrir('ventemanager');
          await poser('ventemanager #dtStart', aujourdhui); await poser('ventemanager #dtEnd', aujourdhui);
          await vues.cliquer(p, 'ventemanager #rechercher');
        });
        await p.waitForTimeout(3000);
        await geste('états : récap articles vendus, 7 jours', async () => {
          await ouvrir('articlevendurecapitulatif');
          await poser('#dt_debut', jour(new Date(Date.now() - 6 * 86400000))); await poser('#dt_fin', aujourdhui);
          await bouton('articlevendurecapitulatif', 'rechercher');
        });
        await p.waitForTimeout(10000);
      }
    } else if (role === 'suggestion') {
      await ouvrir('articlevendurecapitulatif');
      await p.waitForFunction(() => Ext.getCmp('str_TYPE_TRANSACTION') && Ext.getCmp('str_TYPE_TRANSACTION').rendered, null, { timeout: GESTE_MAX });
      await poser('#dt_debut', jour(new Date(Date.now() - (PERIODE_LOURDE - 1) * 86400000))); await poser('#dt_fin', aujourdhui);
      await p.evaluate(() => { Ext.getCmp('str_TYPE_TRANSACTION').setValue('ALL'); });
      while (Date.now() < fin) {
        await geste('état lourd : suggestion ' + PERIODE_LOURDE + ' jours', async () => {
          const id = await p.evaluate(() => Ext.ComponentQuery.query('articlevendurecapitulatif splitbutton[text=Suggerer]')[0].getId());
          const box = await p.locator('#' + id).boundingBox();
          await p.mouse.click(box.x + box.width - 6, box.y + box.height / 2);
          await p.locator('.x-menu-item:visible').filter({ hasText: /quantités vendues/ }).first().click();
          await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /produits suggérés/.test(m.el.dom.textContent)), null, { timeout: 2400000 });
          await p.evaluate(() => Ext.MessageBox.hide());
        });
      }
    } else if (role === 'facturation') {
      const debutMois = jour(new Date(Date.now() - 30 * 86400000));
      while (Date.now() < fin) {
        await geste('facturation : factures du mois', async () => {
          await ouvrir('facturemanager');
          await p.waitForFunction(() => Ext.getCmp('datedebut') && Ext.getCmp('datedebut').rendered, null, { timeout: GESTE_MAX });
          await poser('#datedebut', debutMois); await poser('#datefin', aujourdhui);
          await bouton('facturemanager', 'rechercher');
        });
        await p.waitForTimeout(3000);
        await geste('facturation : bons à facturer du mois', async () => {
          await bouton('facturemanager', 'Créer');
          await p.waitForFunction(() => Ext.getCmp('dt_debut') && Ext.getCmp('dt_debut').rendered, null, { timeout: GESTE_MAX });
          await poser('#dt_debut', debutMois); await poser('#dt_fin', aujourdhui);
          await vues.cliquer(p, '#btn_add');
        });
        await p.waitForTimeout(15000);
      }
    }
  } catch (e) {
    const ecran = await vues.texteMessage(p).catch(() => '');
    const capture = path.join(path.dirname(SORTIE), 'arret-p' + palier + '-poste' + i + '-' + Date.now() + '.png');
    await p.screenshot({ path: capture }).catch(() => {});
    erreurs.push({ t: Date.now(), palier, poste: i, role, type: 'poste arrêté', detail: String(e.message).split('\n')[0].slice(0, 300) + (ecran ? ' ; écran : ' + ecran.slice(0, 200) : ''), capture });
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* ---------- paliers ---------- */
(async () => {
  preparerComptes();
  const b = await ENV_E2E.lancer(chromium);
  console.log(new Date().toISOString() + ' base ' + DB + ', ' + ARTICLES.length + ' articles, paliers ' + PALIERS.join(', ') + ', ' + DUREE / 1000 + ' s par palier');
  const resultat = { base: DB, debut: new Date().toISOString(), paliers: [] };
  for (const n of PALIERS) {
    const debut = Date.now();
    const fin = debut + (REJOUER ? REJEU_ATTENTE_MS + REJEU_MINUTES * 60000 / ACCELERATION + 180000 : DUREE);
    debutRejeu = debut + REJEU_ATTENTE_MS;
    if (REJOUER) { console.log('rejeu de ' + REJOUER + ' : ' + VENTES_REJOUEES.length + ' ventes, ' + (new Set(VENTES_REJOUEES.map((v) => v.rang))).size + ' caissiers, acceleration ' + ACCELERATION); }
    const minuteur = setInterval(() => relever(n).catch(() => {}), 5000);
    await relever(n);
    /* postes lances a 3 s d'intervalle, comme une ouverture d'officine */
    const postes = [];
    for (let i = 0; i < n; i++) { postes.push(poste(b, i, fin, n)); await new Promise((r) => setTimeout(r, 3000)); }
    if (LOURDS) {
      await new Promise((r) => setTimeout(r, 60000));
      for (let k = 0; k < LOURDS; k++) { postes.push(poste(b, Math.max(...PALIERS) + k, fin, n)); }
    }
    if (SAUVEGARDES_A.length) { postes.push(poste(b, Math.max(...PALIERS) + LOURDS, fin, n)); }
    await Promise.all(postes);
    clearInterval(minuteur);
    await relever(n);
    const g = gestes.filter((x) => x.palier === n);
    const ventes = g.filter((x) => x.nom === 'caisse : vente terminée' && x.ok).length;
    const rel = releves.filter((x) => x.palier === n);
    const par = {};
    g.forEach((x) => { (par[x.nom] = par[x.nom] || []).push(x); });
    const quantile = (t, qq) => { const s = t.slice().sort((a, c) => a - c); return s.length ? s[Math.min(s.length - 1, Math.floor(qq * s.length))] : null; };
    const synthese = { postes: n, dureeS: Math.round((Date.now() - debut) / 1000), ventes, ventesParHeure: Math.round(ventes * 3600000 / (Date.now() - debut)),
      erreurs: erreurs.filter((x) => x.palier === n).length,
      gestes: Object.keys(par).map((k) => ({ nom: k, n: par[k].length, echecs: par[k].filter((x) => !x.ok).length,
        mediane: quantile(par[k].map((x) => x.ms), 0.5), p90: quantile(par[k].map((x) => x.ms), 0.9), p99: quantile(par[k].map((x) => x.ms), 0.99),
        max: Math.max(...par[k].map((x) => x.ms)), lents: par[k].filter((x) => x.ms > SEUIL_LENT).length })),
      serveur: { tasMaxMo: Math.max(...rel.map((x) => x.tasMo || 0)), vieuxMaxMo: Math.max(...rel.map((x) => x.vieuxMo || 0)),
        gcS: rel.length ? Math.round(((rel[rel.length - 1].gcS || 0) - (rel[0].gcS || 0)) * 10) / 10 : null,
        gcComplets: rel.length ? (rel[rel.length - 1].gcComplets || 0) - (rel[0].gcComplets || 0) : null,
        connexionsMax: Math.max(...rel.map((x) => x.Threads_connected || 0)), enCoursMax: Math.max(...rel.map((x) => x.Threads_running || 0)),
        attentesVerrou: rel.length ? (rel[rel.length - 1].Innodb_row_lock_waits || 0) - (rel[0].Innodb_row_lock_waits || 0) : null,
        interblocages: rel.length ? (rel[rel.length - 1].Innodb_deadlocks || 0) - (rel[0].Innodb_deadlocks || 0) : null,
        requetesLonguesMax: Math.max(...rel.map((x) => x.requetesLongues || 0)) },
      poste: { cpuMax: Math.max(...rel.map((x) => x.cpuPoste || 0)), memLibreMinGo: Math.min(...rel.map((x) => x.memLibreGo || 99)) } };
    resultat.paliers.push(synthese);
    console.log(`\n=== ${n} poste(s) : ${ventes} ventes (${synthese.ventesParHeure}/h), ${synthese.erreurs} erreur(s) ; tas Java max ${synthese.serveur.tasMaxMo} Mo,`
      + ` GC ${synthese.serveur.gcS} s (${synthese.serveur.gcComplets} complets), connexions max ${synthese.serveur.connexionsMax}, verrous ${synthese.serveur.attentesVerrou},`
      + ` interblocages ${synthese.serveur.interblocages} ; poste de test : CPU max ${synthese.poste.cpuMax} %, memoire libre min ${synthese.poste.memLibreMinGo} Go`);
    synthese.gestes.forEach((x) => console.log(`   ${x.nom.padEnd(42)} n=${String(x.n).padStart(4)}  echecs ${x.echecs}  mediane ${x.mediane} ms  p90 ${x.p90} ms  p99 ${x.p99} ms  max ${x.max} ms  > ${SEUIL_LENT} ms : ${x.lents}`));
    /* gestes lents dates, avec l'etat de MariaDB au releve le plus proche */
    const heure = (t) => new Date(t).toTimeString().slice(0, 8);
    g.filter((x) => x.ms > SEUIL_LENT).sort((a, c) => a.t - c.t).forEach((x) => {
      const r = rel.reduce((m, y) => (!m || Math.abs(y.t - x.t) < Math.abs(m.t - x.t) ? y : m), null) || {};
      console.log(`   lent ${heure(x.t)} poste ${x.poste} ${x.nom} ${x.ms} ms${x.ok ? '' : ' (echec)'} ; MariaDB en cours ${r.Threads_running}, longues ${r.requetesLongues}, CPU poste ${r.cpuPoste} %, libre ${r.memLibreGo} Go ; piles ${x.piles && x.piles.length ? x.piles[0] : '-'}`
        + (x.requetes || []).map((y) => `\n        ${y.url} ${y.ms} ms (serveur ${y.serveur === null ? '?' : y.serveur} ms)`).join(''));
    });
    let sauvegardes = '';
    try {
      sauvegardes = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(TIME(debut), ' ', statut, ' ', IFNULL(duree_s, '?'), ' s') SEPARATOR ' | '), 'aucune')"
        + ' FROM t_sauvegarde WHERE debut >= FROM_UNIXTIME(' + Math.floor(debut / 1000) + ')');
    } catch (e) { sauvegardes = 'illisible'; }
    synthese.sauvegardes = sauvegardes;
    console.log('   sauvegardes pendant le palier : ' + sauvegardes);
    synthese.secondeEntree = secondeEntree.filter((x) => x.palier === n).length;
    console.log('   scans non ajoutés (seconde touche Entrée dans « QD ») : ' + synthese.secondeEntree);
    erreurs.filter((x) => x.palier === n).slice(0, 8).forEach((x) => console.log('   ! poste ' + x.poste + ' (' + x.role + ') ' + x.type + ' : ' + x.detail));
    fs.writeFileSync(SORTIE, JSON.stringify(Object.assign({}, resultat, { gestes, erreurs, releves, secondeEntree })));
  }
  await b.close();
  console.log('\nResultats : ' + SORTIE);
})();
