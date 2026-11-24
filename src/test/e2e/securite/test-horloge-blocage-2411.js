/* BLOCAGE SUR L'HEURE DU SERVEUR (cahier des charges du 24/11, point 1).
 *
 * Domaine d'essai lance avec -Dprestige.essais.horloge=true : l'horloge du serveur est simulee par des parametres
 * (KEY_HORLOGE_ESSAI_MURALE_MIN, KEY_HORLOGE_ESSAI_SANS_INTERNET, KEY_HORLOGE_ESSAI_DECALAGE), sans toucher a la date
 * de Windows. Pour chaque cas (horloge reculee de 2 h sans Internet, partie 2 h dans le futur, date de 2189, ecart
 * d'une heure avec Internet) :
 *  - rapprochement : fenetre de blocage = API etat = API publique de la page de connexion = bandeau de connexion =
 *    traces en base (heure du serveur, etat, causes) ;
 *  - la fenetre ne se ferme pas (Echap, clic a cote, touches) et les touches ne vont plus a l'application ;
 *  - le serveur refuse toute ecriture (423), meme fenetre retiree du navigateur ; les lectures passent ;
 *  - « Mettre a jour » : demande et resultat traces avec le poste et l'utilisateur, compte rendu dans la fenetre ;
 *  - levee : la fenetre se retire seule quand l'heure est remise, l'ecriture repasse ;
 *  - bilan avant / apres : exactement les traces attendues (apparition, affichage, mise a jour, levee), aucune vente
 *    creee, aucun mouvement de caisse ;
 *  - ergonomie : fenetre affichee en moins de 3 s apres la verification.
 * Parametres d'essai et traces retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sNr', '-e', s], { encoding: 'utf8' }).trim();
const CLES = ['KEY_HORLOGE_ESSAI_MURALE_MIN', 'KEY_HORLOGE_ESSAI_SANS_INTERNET', 'KEY_HORLOGE_ESSAI_DECALAGE'];
const BASE = process.env.BASE || 'http://localhost:8080/prestige';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");

const nettoyerParametres = () => q("DELETE FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')");
const poser = (cle, valeur) => q("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('"
  + cle + "', '" + valeur + "', 'essai e2e horloge', 'CUSTOMER', 'enable', NOW()) ON DUPLICATE KEY UPDATE str_VALUE = '" + valeur + "'");
const traceMax = () => Number(q('SELECT COALESCE(MAX(id), 0) FROM horloge_trace'));
const traces = (depuis) => q('SELECT evenement, COALESCE(causes, \'\'), COALESCE(poste, \'\'), COALESCE(utilisateur_id, \'\') FROM horloge_trace WHERE id > ' + depuis + ' ORDER BY id')
  .split(/\r?\n/).filter(Boolean).map((l) => { const c = l.split('\t').map((x) => x.trim()); return { ev: c[0], causes: c[1], poste: c[2], user: c[3] }; });
const compteurs = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_preenregistrement), '/', (SELECT COUNT(*) FROM mvttransaction))");

const etat = (p) => p.evaluate(async () => (await fetch('../api/v1/horloge/etat')).json());
const voile = (p) => p.evaluate(() => { const v = document.getElementById('phb-voile');
  if (!v) { return null; }
  const s = v.querySelector('[data-phb="serveur"]'), r = v.querySelector('[data-phb="reelle"]'), rect = v.getBoundingClientRect();
  return { texte: v.innerText, serveur: s && s.textContent, reelle: r && r.textContent, raison: (v.querySelector('[data-phb="raison"]') || {}).textContent || '',
    couvre: rect.width >= innerWidth - 1 && rect.height >= innerHeight - 1, croix: !!v.querySelector('.x-tool-close, [data-phb="fermer"]') }; });
const verifier = (p) => p.evaluate(() => window.PrestigeAlerteHorloge.verifier());
/* la decision relit les parametres au plus toutes les 5 s */
async function attendreEtat(p, bloque, ms = 20000) {
  const fin = Date.now() + ms;
  let e;
  do { e = await etat(p); if (e.blocage && e.blocage.bloque === bloque) { return e; } await p.waitForTimeout(1000); } while (Date.now() < fin);
  return e;
}
async function attendreTrace(depuis, ev, ms = 75000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (traces(depuis).some((t) => t.ev === ev)) { return true; } await new Promise((r) => setTimeout(r, 2000)); }
  return false;
}
const ecrire = (p) => p.evaluate(async () => { const r = await fetch('../api/v1/vente/add/vno', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return { statut: r.status, corps: await r.text() }; });

async function cas(b, p, nom, reglages, attendu) {
  const debut = traceMax(), avant = compteurs();
  nettoyerParametres();
  for (const [c, v] of reglages) { poser(c, v); }
  const e = await attendreEtat(p, true);
  ok(nom + ' : API etat bloquée, cause ' + attendu.cause, e.blocage && e.blocage.bloque && e.blocage.causes.includes(attendu.cause), JSON.stringify(e.blocage));
  ok(nom + ' : message attendu', e.blocage && e.blocage.messages.some((m) => attendu.message.test(m)), JSON.stringify(e.blocage && e.blocage.messages));

  const t0 = Date.now();
  await verifier(p);
  await p.waitForSelector('#phb-voile', { timeout: 10000 }).catch(() => {});
  const delai = Date.now() - t0;
  let v = await voile(p);
  ok(nom + ' : fenêtre de blocage affichée sur toute la page, sans croix (' + delai + ' ms, plafond 3 000)', v && v.couvre && !v.croix && delai < 3000, v && v.texte);
  ok(nom + ' : fenêtre = API (heure du serveur, heure réelle, messages)', v && v.serveur === e.blocage.serveur && v.reelle === e.blocage.heureReelle
    && e.blocage.messages.every((m) => v.texte.includes(m)), v && JSON.stringify({ v: [v.serveur, v.reelle], api: [e.blocage.serveur, e.blocage.heureReelle] }));

  /* API publique (page de connexion, sans session) et bandeau */
  const ctxP = await b.newContext();
  const pub = await ctxP.newPage();
  await pub.goto(BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
  const api = await pub.evaluate(async () => (await fetch('../api/v1/horloge/public', { cache: 'no-store' })).json());
  await pub.waitForSelector('#pl-horloge:not([hidden])', { timeout: 10000 }).catch(() => {});
  const bandeau = await pub.evaluate(() => { const d = document.getElementById('pl-horloge'); return { visible: !d.hidden, etat: d.getAttribute('data-etat'), texte: d.textContent }; });
  ok(nom + ' : API publique = état et date du serveur seulement', api.etat === 'BLOQUE' && api.serveur === e.blocage.serveur && Object.keys(api).sort().join(',') === 'etat,serveur', JSON.stringify(api));
  ok(nom + ' : bandeau de la page de connexion visible, même date', bandeau.visible && bandeau.etat === 'BLOQUE' && bandeau.texte.includes(api.serveur), JSON.stringify(bandeau));
  await ctxP.close();

  /* la fenetre ne se ferme pas, les touches ne vont pas a l'application */
  await p.evaluate(() => { let n = 0; const f = () => n++; window.addEventListener('keydown', f); window.__phbFrappes = () => { window.removeEventListener('keydown', f); return n; }; });
  await p.keyboard.press('Escape');
  await p.mouse.click(10, 10);
  await p.keyboard.type('abc');
  await p.keyboard.press('F5').catch(() => {});
  v = await voile(p);
  const recues = await p.evaluate(() => window.__phbFrappes());
  ok(nom + ' : Échap, clic à côté, frappe : la fenêtre reste, aucune touche ne va à l\'application', v !== null && recues === 0, 'touches reçues : ' + recues);

  /* verrou du serveur */
  let w = await ecrire(p);
  ok(nom + ' : écriture refusée par le serveur (423)', w.statut === 423 && /heure du serveur/.test(w.corps), w.statut + ' ' + w.corps.slice(0, 120));
  await p.evaluate(() => { const x = document.getElementById('phb-voile'); x.parentNode.removeChild(x); });
  w = await ecrire(p);
  ok(nom + ' : fenêtre retirée du navigateur, écriture toujours refusée', w.statut === 423, String(w.statut));
  await p.waitForSelector('#phb-voile', { timeout: 10000 }).catch(() => {});
  ok(nom + ' : le refus 423 réaffiche aussitôt la fenêtre', (await voile(p)) !== null);
  const lecture = await p.evaluate(async () => (await fetch('../api/v1/horloge/etat')).status);
  ok(nom + ' : les lectures passent', lecture === 200, String(lecture));

  /* Mettre a jour (la tache Windows est absente sur le poste d'essai : compte rendu clair) */
  if (attendu.mettreAJour) {
    await p.click('#phb-voile [data-phb="mettre-a-jour"]');
    await p.waitForFunction(() => { const r = document.querySelector('#phb-voile [data-phb="raison"]'); return r && r.textContent.length > 0; }, null, { timeout: 95000 }).catch(() => {});
    v = await voile(p);
    ok(nom + ' : « Mettre à jour » : compte rendu dans la fenêtre', v && v.raison.length > 10, v && v.raison);
    /* tâche Windows « Prestige - Heure » absente (script d'installation non passé) et Prestige sans droit
     * d'administrateur : le compte rendu nomme la tâche et le remède, le refus est tracé, rien ne se débloque */
    let tacheAbsente = true;
    try { execFileSync('schtasks', ['/query', '/tn', 'Prestige - Heure'], { stdio: 'ignore' }); tacheAbsente = false; } catch (x) { tacheAbsente = true; }
    if (tacheAbsente && v && !/synchronisée/.test(v.raison)) {
      ok(nom + ' : tâche Windows absente : le compte rendu nomme la tâche et le remède (9-tache-heure.ps1 en administrateur)',
        /Prestige - Heure/.test(v.raison) && /9-tache-heure\.ps1/.test(v.raison) && /administrateur/.test(v.raison), v.raison);
      const refus = q("SELECT COUNT(*) FROM horloge_trace WHERE id > " + debut + " AND evenement = 'MISE_A_JOUR_REFUSEE' AND detail LIKE '%9-tache-heure%'"
        + " AND utilisateur_id = '" + ADMIN + "' AND poste IS NOT NULL AND poste <> ''");
      ok(nom + ' : tâche absente : refus tracé avec le compte rendu, l\'utilisateur et le poste', refus === '1', refus);
      const w2 = await ecrire(p);
      ok(nom + ' : tâche absente : la fenêtre reste et l\'écriture est toujours refusée (423) : aucun contournement', (await voile(p)) !== null && w2.statut === 423, String(w2.statut));
    } else {
      console.log('NOTE  ' + nom + ' : tâche « Prestige - Heure » installée ou heure synchronisée sur ce poste : cas « tâche absente » non joué');
    }
  }

  /* levee */
  nettoyerParametres();
  const l = await attendreEtat(p, false);
  ok(nom + ' : heure remise, API débloquée', l.blocage && !l.blocage.bloque, JSON.stringify(l.blocage));
  await p.waitForFunction(() => !document.getElementById('phb-voile'), null, { timeout: 20000 }).catch(() => {});
  ok(nom + ' : la fenêtre se retire seule', (await voile(p)) === null);
  w = await ecrire(p);
  ok(nom + ' : l\'écriture n\'est plus refusée pour l\'heure', w.statut !== 423, String(w.statut));

  /* bilan : traces exactes */
  /* la levee est tracee des qu'un poste la constate (plus d'attente de la veille de la minute) */
  const leve = await attendreTrace(debut, 'BLOCAGE_LEVEE', 10000);
  const tr = traces(debut);
  const evs = tr.map((t) => t.ev);
  const attendus = ['BLOCAGE_APPARITION', 'FENETRE_AFFICHEE'].concat(attendu.mettreAJour ? ['MISE_A_JOUR_DEMANDEE', 'MISE_A_JOUR_FAITE|MISE_A_JOUR_REFUSEE'] : []).concat(['BLOCAGE_LEVEE']);
  const egal = (a, x) => x.split('|').includes(a);
  const tries = evs.filter((x) => x !== 'BLOCAGE_CHANGEMENT');
  ok(nom + ' : traces exactes ' + attendus.join(', '), leve && tries.length === attendus.length && attendus.every((x) => tries.filter((a) => egal(a, x)).length === 1),
    evs.join(', '));
  const app = tr.find((t) => t.ev === 'BLOCAGE_APPARITION');
  ok(nom + ' : apparition tracée avec la cause, par le serveur', app && app.causes.split(',').includes(attendu.cause) && app.poste === 'serveur', JSON.stringify(app));
  const aff = tr.find((t) => t.ev === 'FENETRE_AFFICHEE');
  ok(nom + ' : affichage tracé avec le poste et l\'utilisateur', aff && aff.poste.length > 0 && aff.user === ADMIN, JSON.stringify(aff));
  if (attendu.mettreAJour) {
    const dem = tr.find((t) => t.ev === 'MISE_A_JOUR_DEMANDEE');
    ok(nom + ' : mise à jour tracée avec le poste et l\'utilisateur', dem && dem.poste.length > 0 && dem.user === ADMIN, JSON.stringify(dem));
  }
  ok(nom + ' : aucune vente ni mouvement de caisse créé pendant le blocage', compteurs() === avant, avant + ' -> ' + compteurs());
  q('DELETE FROM horloge_trace WHERE id > ' + debut);
}

(async () => {
  nettoyerParametres();
  const debutTout = traceMax();
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => !!window.PrestigeAlerteHorloge && window.PrestigeAlerteHorloge.blocage, null, { timeout: 30000 });

    const e = await attendreEtat(p, false);
    ok('Précondition : heure juste, aucun blocage, domaine d\'essai', e.blocage && !e.blocage.bloque, JSON.stringify(e.blocage));
    await verifier(p);
    await p.waitForTimeout(1500);
    ok('Heure juste : aucune fenêtre', (await voile(p)) === null);
    const pub = await p.evaluate(async () => (await fetch('../api/v1/horloge/public')).json());
    ok('Heure juste : API publique « OK »', pub.etat === 'OK', JSON.stringify(pub));

    await cas(b, p, 'Horloge reculée de 2 h, sans Internet', [['KEY_HORLOGE_ESSAI_SANS_INTERNET', '1'], ['KEY_HORLOGE_ESSAI_MURALE_MIN', '-120']],
      { cause: 'RECUL', message: /reculée.*en retard de (2 h|1 h 59 min|2 h 1 min)/, mettreAJour: true });
    await cas(b, p, 'Horloge partie 2 h dans le futur, sans Internet', [['KEY_HORLOGE_ESSAI_SANS_INTERNET', '1'], ['KEY_HORLOGE_ESSAI_MURALE_MIN', '120']],
      { cause: 'SAUT', message: /futur.*en avance de (2 h|1 h 59 min|2 h 1 min)/ });
    await cas(b, p, 'Horloge en 2189, sans Internet', [['KEY_HORLOGE_ESSAI_SANS_INTERNET', '1'], ['KEY_HORLOGE_ESSAI_MURALE_MIN', String(163 * 365 * 24 * 60)]],
      { cause: 'PLAFOND', message: /n'est pas plausible/ });
    const net = await etat(p);
    if (net.reference) {
      await cas(b, p, 'Écart d\'une heure avec Internet', [['KEY_HORLOGE_ESSAI_DECALAGE', '3600']], { cause: 'ECART', message: /en avance de 1 h( [0-9] min)? sur l'heure d'Internet/ });
    } else {
      ok('Écart avec Internet : non joué, Internet injoignable depuis le serveur', true);
    }
    ok('Aucune fenêtre du navigateur (alert, confirm)', dialogues.length === 0, dialogues.join(' | '));
  } catch (x) { ok('Parcours sans exception', false, x.stack); } finally {
    await b.close();
    nettoyerParametres();
    q('DELETE FROM horloge_trace WHERE id > ' + debutTout);
    ok('Essais retirés (paramètres et traces)', q("SELECT COUNT(*) FROM t_parameters WHERE str_KEY IN ('" + CLES.join("','") + "')") === '0'
      && Number(q('SELECT COUNT(*) FROM horloge_trace WHERE id > ' + debutTout)) === 0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
