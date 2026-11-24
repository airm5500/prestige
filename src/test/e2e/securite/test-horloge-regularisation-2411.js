/* REGULARISATION A DATE PASSEE (cahier des charges du 24/11, point 1).
 *
 * Fermée par défaut. Seul le super administrateur l'ouvre ou la referme ; tout autre profil (administrateur, caisse)
 * est refusé par le serveur (403) et le refus est tracé avec le poste et l'utilisateur. Ouverte : bandeau permanent
 * dans l'application, état « REGULARISATION » sur la page de connexion, chaque écriture marquée « saisie en
 * régularisation » dans les traces (route, poste, utilisateur ; jamais le contenu). Refermée : tout revient à OK.
 * Trois navigateurs : administrateur (compte des tests), caisse (profil réel « Caisse/Commande/Stock »), super
 * administrateur d'essai. Tout est retiré à la fin ; la régularisation est toujours refermée.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const vues = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MDP = 'E2e-Regul-7';
const COMPTES = [['E2E-RG-CA', 'e2e-rg-caisse', 'Caisse/Commande/Stock'], ['E2E-RG-SA', 'e2e-rg-super', 'Super Administrateur']];
const T0 = Number(q('SELECT IFNULL(MAX(id), 0) FROM horloge_trace'));
const traces = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT_WS('/', evenement, IFNULL(utilisateur_id, '-'), IF(poste IS NULL OR poste = '', 'sans-poste', 'poste'), IFNULL(detail, '-')) ORDER BY id SEPARATOR ' ; '), '')"
  + ' FROM horloge_trace WHERE id > ' + T0 + " AND evenement LIKE 'REGULARISATION%' OR (id > " + T0 + " AND evenement = 'SAISIE_EN_REGULARISATION')");
const regul = () => q("SELECT CONCAT_WS('|', regularisation, IFNULL(regularisation_ouverture_ms, '-'), IFNULL(regularisation_par, '-')) FROM horloge_repere WHERE id = 1").split('|');

function nettoyer() {
  q("UPDATE horloge_repere SET regularisation = 0, regularisation_ouverture_ms = NULL, regularisation_par = NULL WHERE id = 1;"
    + ' DELETE FROM horloge_trace WHERE id > ' + T0 + ';'
    + " DELETE FROM t_role_user WHERE lg_USER_ID LIKE 'E2E-RG-%'; DELETE FROM t_event_log WHERE lg_USER_ID LIKE 'E2E-RG-%'; DELETE FROM t_user WHERE lg_USER_ID LIKE 'E2E-RG-%'");
}

async function poste(login, mdp) {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
  await vues.connexion(p, login, mdp);
  const post = (u) => p.evaluate(async (uu) => { const r = await fetch(uu, { method: 'POST' }); const t = await r.text();
    let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 300) }; } j.http = r.status; return j; }, u);
  return { b, p, post, erreurs };
}

(async () => {
  const etat0 = regul();
  nettoyer();
  for (const [id, login, role] of COMPTES) {
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + id + "', '" + login + "', MD5('" + MDP + "'), 'E2E', '" + id + "', 'Essai', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) SELECT '" + id + "', lg_ROLE_ID, '" + id + "', NOW() FROM t_role WHERE str_NAME = '" + role + "' LIMIT 1");
  }
  const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
  const postes = [];
  try {
    ok('Préparation : régularisation fermée par défaut', etat0[0] === '0', etat0.join('|'));
    const ad = await poste(ENV_E2E.LOGIN, 'e2etest'); postes.push(ad);
    const ca = await poste('e2e-rg-caisse', MDP); postes.push(ca);
    const sa = await poste('e2e-rg-super', MDP); postes.push(sa);

    const r1 = await ad.post('../api/v1/horloge/regularisation/1');
    ok('Administrateur (pas super administrateur) : ouverture refusée (403, droit manquant)', r1.http === 403 && r1.interdit === true, JSON.stringify(r1));
    const r2 = await ca.post('../api/v1/horloge/regularisation/1');
    ok('Profil caisse : ouverture refusée (403)', r2.http === 403 && r2.interdit === true, JSON.stringify(r2));
    ok('Après les deux refus : toujours fermée', regul()[0] === '0', regul().join('|'));
    ok('Les deux refus sont tracés avec l\'utilisateur et le poste', traces() === 'REGULARISATION_REFUSEE/' + ADMIN + '/poste/ouverture demandée sans le profil super administrateur ; '
      + 'REGULARISATION_REFUSEE/E2E-RG-CA/poste/ouverture demandée sans le profil super administrateur', traces());

    const avant = Date.now();
    const r3 = await sa.post('../api/v1/horloge/regularisation/1');
    const e3 = regul();
    ok('Super administrateur : ouverte, datée de l\'heure réelle, à son nom', r3.success === true && e3[0] === '1' && Math.abs(Number(e3[1]) - avant) < 120000 && e3[2] === 'E2E-RG-SA',
      JSON.stringify(r3) + ' ' + e3.join('|'));
    const pub = await ad.p.evaluate(async () => (await fetch('../api/v1/horloge/public')).json());
    ok('API publique (page de connexion) : état « REGULARISATION »', pub.etat === 'REGULARISATION', JSON.stringify(pub));
    await ad.p.evaluate(() => window.PrestigeAlerteHorloge && window.PrestigeAlerteHorloge.verifier());
    await ad.p.waitForFunction(() => { const b = document.getElementById('phb-bandeau'); return b && b.getBoundingClientRect().height > 0; }, null, { timeout: 15000 }).catch(() => {});
    const bandeau = await ad.p.evaluate(() => { const b = document.getElementById('phb-bandeau'); return b && b.getBoundingClientRect().height > 0 ? b.textContent : ''; });
    ok('Bandeau permanent de régularisation dans l\'application (autre poste)', /gularisation/i.test(bandeau), bandeau);
    const pc = await ad.b.newPage();
    await pc.goto(vues.BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await pc.waitForFunction(() => { const x = document.getElementById('pl-horloge'); return x && x.getAttribute('data-etat'); }, null, { timeout: 40000 });
    ok('Page de connexion : bandeau en état « REGULARISATION »', (await pc.getAttribute('#pl-horloge', 'data-etat')) === 'REGULARISATION');
    await pc.close();

    /* une ecriture pendant la regularisation (sans effet : vente inconnue) : marquee */
    await ca.post('../api/v1/vente-saisie/E2E-RG-INEXISTANTE/signal');
    const marque = q("SELECT CONCAT_WS('/', utilisateur_id, detail) FROM horloge_trace WHERE id > " + T0 + " AND evenement = 'SAISIE_EN_REGULARISATION' ORDER BY id DESC LIMIT 1");
    ok('Écriture pendant la régularisation : marquée « saisie en régularisation » (route, utilisateur ; jamais le contenu)', marque === 'E2E-RG-CA/POST v1/vente-saisie/E2E-RG-INEXISTANTE/signal', marque);

    const r4 = await ca.post('../api/v1/horloge/regularisation/0');
    ok('Profil caisse : fermeture refusée elle aussi (403), la régularisation reste ouverte', r4.http === 403 && regul()[0] === '1', JSON.stringify(r4));
    const r5 = await sa.post('../api/v1/horloge/regularisation/0');
    ok('Super administrateur : refermée', r5.success === true && regul()[0] === '0' && regul()[2] === '-', JSON.stringify(r5) + ' ' + regul().join('|'));
    const pub2 = await ad.p.evaluate(async () => (await fetch('../api/v1/horloge/public')).json());
    ok('API publique : retour à « OK »', pub2.etat === 'OK', JSON.stringify(pub2));
    const n = Number(q('SELECT COUNT(*) FROM horloge_trace WHERE id > ' + T0 + " AND evenement = 'SAISIE_EN_REGULARISATION'"));
    await ca.post('../api/v1/vente-saisie/E2E-RG-INEXISTANTE/signal');
    ok('Après la fermeture : plus aucune écriture marquée', Number(q('SELECT COUNT(*) FROM horloge_trace WHERE id > ' + T0 + " AND evenement = 'SAISIE_EN_REGULARISATION'")) === n);
    const t = traces().split(' ; ').map((x) => x.split('/')[0]);
    ok('Bilan des traces : 2 refus, ouverture, saisie marquée, refus de fermeture, fermeture — ni plus ni moins',
      t.join(',') === 'REGULARISATION_REFUSEE,REGULARISATION_REFUSEE,REGULARISATION_OUVERTE,SAISIE_EN_REGULARISATION,REGULARISATION_REFUSEE,REGULARISATION_FERMEE_MANUELLEMENT', t.join(','));
    ok('Aucune erreur JavaScript', postes.every((s) => s.erreurs.length === 0), postes.map((s) => s.erreurs.join(' | ')).join(' || '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    for (const s of postes) { await s.b.close().catch(() => {}); }
    nettoyer();
    ok('Nettoyage : régularisation refermée, traces et comptes d\'essai retirés', regul()[0] === '0' && q('SELECT COUNT(*) FROM horloge_trace WHERE id > ' + T0) === '0'
      && q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID LIKE 'E2E-RG-%'") === '0');
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
