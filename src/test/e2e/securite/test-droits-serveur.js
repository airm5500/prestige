/* DROITS VERIFIES PAR LE SERVEUR (demandes serveur des applications mobiles, lot 2 : « masquer un menu n'est pas une
 * securite »). Pour chaque groupe de routes d'ecriture : le droit du menu est retire au role du compte de test, une
 * nouvelle session est ouverte, la route doit repondre 403 {interdit:true} (jamais 401) SANS rien ecrire ; le droit
 * remis, la route repond de nouveau. Les droits retires sont toujours remis (meme apres un test interrompu).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 260) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const PRODUIT = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' ORDER BY f.lg_FAMILLE_ID LIMIT 1");

/* chaque cas : privilege(s) a retirer, appels refuses, controle « rien d'ecrit », appel accepte une fois remis */
const CAS = [
  {
    nom: 'Ajustement du stock', privileges: ['P_SM_AJUSTEMENT'],
    refuses: [['POST', '../api/v1/ajustement/creeation', { refParent: null, value: 1, description: 'E2E-DROITS', refTwo: PRODUIT, valueTwo: 0, valueFour: '1', zone: 'RAYON' }],
      ['PUT', '../api/v1/ajustement/zzz-inconnu', { description: 'x' }], ['DELETE', '../api/v1/ajustement/zzz-inconnu'], ['POST', '../api/v2/ajustement/creeation', { refParent: null, value: 1, refTwo: PRODUIT }]],
    rienEcrit: () => q(`SELECT COUNT(*) FROM t_ajustement WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}'`) === '0',
    accepte: ['POST', '../api/v1/ajustement/creeation', { refParent: null, value: 1, description: 'E2E-DROITS', refTwo: PRODUIT, valueTwo: 0, valueFour: '1', zone: 'RAYON' }]
  },
  {
    nom: 'Traiter la réserve', privileges: ['P_TRAITER_RESERVE', 'P_SM_RESERVE'],
    refuses: [['POST', '../api/v1/reserve/assort', { lg_FAMILLE_ID: PRODUIT, int_NUMBER: 1 }], ['POST', '../api/v1/reserve/reassort', { lg_FAMILLE_ID: PRODUIT, int_NUMBER: 1 }],
      ['PUT', '../api/v1/suggestion-reserve/zzz-inconnue/traiter'], ['POST', '../api/v1/suggestion-reserve/creer', { categorie: 'RAYON', motifId: 1, items: [{ lg_FAMILLE_ID: PRODUIT, int_QTE: 1 }] }]],
    rienEcrit: () => q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE dt_CREATED >= '${DEBUT}'`) === '0' && q(`SELECT COUNT(*) FROM t_suggestion_reserve WHERE dt_CREATED >= '${DEBUT}'`) === '0',
    accepte: ['POST', '../api/v1/reserve/assort', { lg_FAMILLE_ID: PRODUIT, int_NUMBER: 0 }]
  },
  {
    nom: 'Analyse Posologie (service payant)', privileges: ['P_SM_POSOS', 'P_ORDONNANCE_CLIENT'],
    refuses: [['POST', '../api/v1/posos/analyse', { produits: [] }]], rienEcrit: () => true,
    accepte: ['POST', '../api/v1/posos/analyse', { produits: [] }]
  },
  {
    nom: 'Retours fournisseur (préparation)', privileges: ['P_SM_RETOUR_FRS', 'P_VALIDER_RETOUR_FRS'],
    refuses: [['POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: 'ZZZ-E2E', strCOMMENTAIRE: 'E2E-DROITS', items: [{ produitId: PRODUIT, intNUMBERRETURN: 1 }] }],
      ['POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: 'zzz', produitId: PRODUIT, intNUMBERRETURN: 1 }], ['DELETE', '../api/v1/retourfournisseur/remove-item/zzz']],
    rienEcrit: () => q("SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = 'E2E-DROITS'") === '0',
    accepte: ['POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: 'ZZZ-E2E', strCOMMENTAIRE: 'E2E-DROITS', items: [{ produitId: PRODUIT, intNUMBERRETURN: 1 }] }]
  },
  {
    nom: 'Gestion des gardes', privileges: ['P_SM_GESTION_GARDES'],
    refuses: [['DELETE', '../api/v1/gardes/zzz-inconnue'], ['POST', '../api/v1/gardes/zzz-inconnue/inventaire', {}]], rienEcrit: () => true,
    accepte: ['GET', '../api/v1/gardes?annee=2026']
  },
  {
    nom: 'Commandes et suggestions (PharmaML)', privileges: ['P_SM_SUGGERER_CDE', 'P_SM_SUGGESTION', 'P_SM_SUGG_REAPPRO', 'P_M_COMMANDE', 'P_SM_COMMANDE_PROCESS'],
    refuses: [['GET', '../api/v1/suggestion-pharmaml/zzz-inconnue'], ['POST', '../api/v1/suggestion-pharmaml/zzz-inconnue/envoi'], ['POST', '../api/v1/suggestion-pharmaml/zzz-inconnue']],
    rienEcrit: () => true, accepte: ['GET', '../api/v1/suggestion-pharmaml/zzz-inconnue']
  },
  {
    nom: 'Créer un inventaire', privileges: ['P_CREER_INVENTAIRE'],
    refuses: [['POST', '../api/v1/inventaire/creation', { str_NAME: 'E2E-DROITS' }]],
    rienEcrit: () => q("SELECT COUNT(*) FROM t_inventaire WHERE str_NAME = 'E2E-DROITS'") === '0', accepte: null
  },
  {
    nom: 'Ventes modifiées (créer un inventaire)', privileges: ['P_SM_VENTES_MODIFIEES'],
    refuses: [['POST', '../api/v1/ventes-modifiees/create-inventaire', { ids: [] }]], rienEcrit: () => true, accepte: null
  }
];

function nettoyer() {
  exec(`CREATE TEMPORARY TABLE e2e_dr AS SELECT lg_AJUSTEMENT_ID id FROM t_ajustement WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${DEBUT}';`
    + "DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (SELECT lg_RETOUR_FRS_ID FROM t_retour_fournisseur WHERE str_COMMENTAIRE = 'E2E-DROITS');"
    + "DELETE FROM t_retour_fournisseur WHERE str_COMMENTAIRE = 'E2E-DROITS'; DELETE FROM t_inventaire WHERE str_NAME = 'E2E-DROITS';"
    + 'DELETE FROM t_ajustement_detail WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_dr); DELETE FROM t_ajustement WHERE lg_AJUSTEMENT_ID IN (SELECT id FROM e2e_dr); DROP TEMPORARY TABLE e2e_dr;');
}

(async () => {
  const droits = {};
  CAS.forEach((c) => c.privileges.forEach((p) => { droits[p] = privilegeEssai(q, exec, 'admin', p); droits[p].remettre(); }));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const session = async () => {
    const p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    return p;
  };
  const appel = (p, [m, u, c]) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) { /* vide */ } return { http: r.status, interdit: j.interdit === true, msg: j.msg || '' }; }, [m, u, c]);
  try {
    for (const c of CAS) {
      c.privileges.forEach((p) => droits[p].retirer());
      const p = await session();
      const r = [];
      for (const a of c.refuses) { r.push(await appel(p, a)); }
      ok(c.nom + ' sans le droit : 403 « Droit manquant », jamais 401', r.every((x) => x.http === 403 && x.interdit && /Droit manquant/.test(x.msg)), JSON.stringify(r));
      ok(c.nom + ' sans le droit : rien n\'est écrit', c.rienEcrit());
      await p.context().close();
      c.privileges.forEach((pr) => droits[pr].remettre());
      const p2 = await session();
      if (c.accepte) {
        const r2 = await appel(p2, c.accepte);
        ok(c.nom + ' avec le droit : la route répond (pas de refus)', r2.http === 200 && !r2.interdit, JSON.stringify(r2));
      }
      await p2.context().close();
    }
    /* droits exposes aux applications */
    const p3 = await session();
    const lire = (u) => p3.evaluate(async (u) => { const r = await fetch(u); return Object.assign({ http: r.status }, await r.json().catch(() => ({}))); }, u);
    const mes = await lire('../api/v1/user/droits');
    ok('GET user/droits : profil, rôle et droits de la session (dont P_TRAITER_RESERVE, P_CREER_INVENTAIRE)', mes.http === 200 && mes.success && Array.isArray(mes.droits)
      && mes.droits.includes('P_TRAITER_RESERVE') && mes.droits.includes('P_CREER_INVENTAIRE') && mes.role && mes.role.code && mes.profil, JSON.stringify({ n: (mes.droits || []).length, role: mes.role, profil: mes.profil }));
    const res2 = await lire('../api/v1/reserve/droits'), pos = await lire('../api/v1/posos/droits');
    ok('GET reserve/droits et posos/droits : traiter et analyser', res2.traiter === true && pos.analyser === true, JSON.stringify([res2, pos]));
    const auth = await p3.evaluate(async () => (await fetch('../api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'admin', password: 'e2etest' }) })).json());
    ok('Connexion : rôle explicite et droits.creerInventaire, xtypeuser inchangé', auth.success && auth.role && /ADMINISTRATEUR|SYSTEME|PHARMACIEN/.test(auth.role.code)
      && auth.droits && auth.droits.creerInventaire === true && !!auth.xtypeuser, JSON.stringify({ role: auth.role, droits: auth.droits, x: auth.xtypeuser }));
    await p3.context().close();
    const anonyme = await (await b.newContext()).newPage();
    await anonyme.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    const sans = await anonyme.evaluate(async () => (await fetch('../api/v1/user/droits')).status);
    ok('GET user/droits sans session : 401', sans === 401, sans);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    Object.values(droits).forEach((d) => d.remettre());
    await b.close();
    nettoyer();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
