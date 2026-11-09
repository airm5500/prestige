/* GROSSISTES LIES AUX EXTRANETS (demande du 09/11 : « les grossistes doivent être liés aux grossistes de l'application »)
 * et parametre « afficher stock grossiste » (defaut 0).
 * Vrai chemin de l'ecran : GESTION DES COMMANDES > Extranets grossistes > onglet « Grossistes liés ». Aucun appel aux
 * extranets : l'onglet ne lit que t_grossiste et extranet_grossiste.
 *   - rapprochement : ecran (filtre retire) = base (grossistes actifs + lies), ligne par ligne ; proposition = regle ;
 *   - « Reprendre les propositions » : seuls les grossistes sans extranet et avec proposition changent ;
 *   - choix a la main dans la liste de la cellule (grossiste sans proposition -> DPCI, un propose -> aucun) ;
 *   - « Enregistrer » : premier clic = confirmation dans le bouton (rien n'est ecrit), second clic = ecriture ;
 *   - bilan : extranet_grossiste contient exactement les liens attendus (source, utilisateur), t_grossiste et
 *     t_parameters inchanges ; relecture de l'onglet = base ;
 *   - refus de l'API sans ecriture : extranet inconnu, Mayite, grossiste inconnu ;
 *   - parametre KEY_AFFICHER_STOCK_GROSSISTE present a 0 et lisible par l'API des parametres.
 * La table extranet_grossiste est copiee avant et remise a l'identique apres ; connexions d'essai retirees.
 *
 * Lancement (domain2, laborex_perf) :
 *   BASE=http://localhost:9080/prestige DB_TEST=laborex_perf E2E_BASE_LIBRE=1 PAYARA_DOMAINE=.../domain2 node test-ecran-grossistes-lies-0911.js
 */
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s],
  { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) {
  res.push({ n, c: !!c });
  console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : ''));
}

const garde = require('./garde-extranets');
garde.verifier(q, ENV_E2E.BASE, ENV_E2E.PAYARA_DOMAINE);
const ECRAN = 'extranetsgrossistes';
const TABLE = ['extranet_grossiste'];

/* meme regle que LiaisonGrossistes.proposer, ecrite a part pour le rapprochement */
function proposer(lib, url) {
  const u = (url || '').toLowerCase(), n = ' ' + (lib || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ') + ' ';
  if (u.includes('ubipharm') || n.includes(' LABOREX ') || n.includes(' UBIPHARM ')) { return 'UBIPHARM'; }
  if (u.includes('tedis') || n.includes(' TEDIS ')) { return 'TEDIS'; }
  if (u.includes('copharmed') || n.includes(' COPHARMED ')) { return 'COPHARMED'; }
  if (u.includes('dpci') || n.includes(' DPCI ')) { return 'DPCI'; }
  return '';
}

const lignesBase = () => q("SELECT CONCAT_WS('|', g.lg_GROSSISTE_ID, IFNULL(g.str_LIBELLE,''), IFNULL(g.str_URL_EXTRANET,''), IFNULL(e.source,''))"
  + ' FROM t_grossiste g LEFT JOIN extranet_grossiste e ON e.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID'
  + " WHERE g.str_STATUT = 'enable' OR e.lg_GROSSISTE_ID IS NOT NULL ORDER BY g.str_LIBELLE").split('\n').filter(Boolean)
  .map((l) => { const c = l.split('|'); return { id: c[0], libelle: c[1], url: c[2], source: c[3] }; });
const liensBase = () => q("SELECT CONCAT(lg_GROSSISTE_ID, '=', source, '=', IFNULL(modifie_par,'')) FROM extranet_grossiste ORDER BY 1")
  .split('\n').filter(Boolean);
const empreinte = (t) => q('CHECKSUM TABLE ' + t).split('\t')[1];

const ecranLignes = (p) => p.evaluate(() => {
  const st = Ext.ComponentQuery.query('extranetsgrossistes #exLiesGrille')[0].getStore();
  return st.getRange().map((r) => ({ id: r.get('id'), libelle: r.get('libelle'), source: r.get('source'), propose: r.get('propose') }));
});
const texte = (p, sel) => p.evaluate((s) => { const c = Ext.ComponentQuery.query('extranetsgrossistes ' + s)[0]; return c && c.el ? c.el.dom.textContent : ''; }, sel);

/* clic reel dans la cellule « Extranet » de la ligne, puis choix dans la liste qui s'ouvre */
async function choisirExtranet(p, id, libelle) {
  const box = await p.evaluate((gid) => {
    const g = Ext.ComponentQuery.query('extranetsgrossistes #exLiesGrille')[0], st = g.getStore(), r = st.findRecord('id', gid, 0, false, true, true);
    const col = g.headerCt.getGridColumns().filter((c) => c.dataIndex === 'source')[0];
    g.getView().focusRow(r);
    const cell = g.getView().getCell(r, col);
    const b = cell.dom.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, id);
  await p.mouse.click(box.x, box.y);
  await p.waitForTimeout(500);
  await vues.choisir(p, ECRAN + ' #exLiesGrille combo', libelle);
  await p.waitForTimeout(400);
}

(async () => {
  const navigateur = await ENV_E2E.lancer(chromium);
  const p = await (await navigateur.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(String(e.message)));
  const debut = q("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')");
  const journalTotal = q('SELECT COUNT(*) FROM t_event_log');
  const avantGrossistes = empreinte('t_grossiste'), avantParametres = empreinte('t_parameters');
  let sauve = null;
  try {
    ok('table extranet_grossiste créée par la migration',
      q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'extranet_grossiste'") === '1');
    sauve = garde.sauver(q, TABLE);
    q('DELETE FROM extranet_grossiste');
    const param = q("SELECT CONCAT(str_VALUE, '|', str_STATUT) FROM t_parameters WHERE str_KEY = 'KEY_AFFICHER_STOCK_GROSSISTE'");
    ok('paramètre KEY_AFFICHER_STOCK_GROSSISTE présent, à 0 par défaut', param === '0|enable', param);

    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lu = await p.evaluate(async () => (await fetch('../api/v1/app-params/value/KEY_AFFICHER_STOCK_GROSSISTE', { credentials: 'same-origin' })).json());
    ok('paramètre lisible par l\'API des paramètres (0)', lu.success === true && String(lu.data).trim() === '0', JSON.stringify(lu));
    await vues.ouvrirMenu(p, 'GESTION DES COMMANDES', 'Extranets grossistes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('extranetsgrossistes')[0], null, { timeout: 60000 });
    await p.mouse.move(1200, 600);
    await p.waitForTimeout(1500);
    const charge = p.waitForResponse((x) => /\/extranet\/grossistes$/.test(x.url().split('?')[0]) && x.request().method() === 'GET', { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exOnglets tab[text=Grossistes liés]');
    await charge;
    await p.waitForTimeout(800);

    /* rapprochement : ecran sans filtre = base, ligne par ligne, proposition comprise */
    const base = lignesBase();
    const attenduPropose = base.filter((g) => proposer(g.libelle, g.url));
    let ecran = await ecranLignes(p);
    ok('filtre par défaut : seulement les grossistes proposés (' + attenduPropose.length + ')',
      ecran.length === attenduPropose.length && attenduPropose.length >= 2, ecran.length + ' / ' + attenduPropose.length);
    await vues.cliquer(p, ECRAN + ' #exLiesFiltre');
    await p.waitForTimeout(500);
    ecran = await ecranLignes(p);
    const attendu = base.map((g) => ({ id: g.id, libelle: g.libelle, source: g.source, propose: proposer(g.libelle, g.url) }));
    ok('rapprochement : écran = base (' + base.length + ' grossistes), ligne par ligne, proposition = règle',
      JSON.stringify(ecran) === JSON.stringify(attendu), ecran.length + ' / ' + attendu.length);
    ok('aucun lien au départ, bouton Enregistrer grisé', ecran.every((g) => !g.source)
      && await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exLiesEnregistrer')[0].isDisabled()));

    /* propositions reprises : seuls les proposes changent */
    await vues.cliquer(p, ECRAN + ' #exLiesProposer');
    await p.waitForTimeout(400);
    ecran = await ecranLignes(p);
    ok('« Reprendre les propositions » : chaque proposé reçoit sa proposition, les autres restent sans extranet',
      ecran.every((g) => g.source === g.propose));
    const bouton = await texte(p, '#exLiesEnregistrer');
    ok('bouton : « Enregistrer (' + attenduPropose.length + ') »', bouton.indexOf('Enregistrer (' + attenduPropose.length + ')') >= 0, bouton);

    /* a la main : un sans proposition -> DPCI ; un propose Ubipharm -> aucun */
    const libre = attendu.find((g) => !g.propose), retire = attendu.filter((g) => g.propose === 'UBIPHARM').pop();
    await choisirExtranet(p, libre.id, 'DPCI');
    await choisirExtranet(p, retire.id, '— aucun —');
    ecran = await ecranLignes(p);
    ok('choix dans la cellule : ' + libre.libelle + ' -> DPCI, ' + retire.libelle + ' -> aucun',
      ecran.find((g) => g.id === libre.id).source === 'DPCI' && ecran.find((g) => g.id === retire.id).source === '');
    const voulus = ecran.filter((g) => g.source).map((g) => g.id + '=' + g.source + '=' + ENV_E2E.LOGIN).sort();

    /* premier clic : confirmation dans le bouton, rien n'est ecrit */
    await vues.cliquer(p, ECRAN + ' #exLiesEnregistrer');
    await p.waitForTimeout(500);
    const conf = await texte(p, '#exLiesEnregistrer');
    ok('premier clic : le bouton demande « Enregistrer ' + voulus.length + ' changement(s) ? », rien en base',
      conf.indexOf('Enregistrer ' + voulus.length + ' changement(s) ?') >= 0 && liensBase().length === 0, conf);
    await p.waitForTimeout(600);
    const ecrit = p.waitForResponse((x) => /\/extranet\/grossistes$/.test(x.url()) && x.request().method() === 'PUT', { timeout: 60000 });
    const relu = p.waitForResponse((x) => /\/extranet\/grossistes$/.test(x.url().split('?')[0]) && x.request().method() === 'GET', { timeout: 60000 });
    await vues.cliquer(p, ECRAN + ' #exLiesEnregistrer');
    const rep = await (await ecrit).json();
    await relu;
    await p.waitForTimeout(800);
    ok('second clic : enregistré (' + voulus.length + ' changements)', rep.success === true && rep.changes === voulus.length, JSON.stringify(rep).slice(0, 200));
    const msg = await texte(p, '#exLiesMsg');
    ok('message « ' + voulus.length + ' lien(s) enregistré(s) »', msg.indexOf(voulus.length + ' lien(s) enregistré(s)') >= 0, msg);

    /* bilan : exactement les liens voulus, rien d'autre */
    const apres = liensBase();
    ok('bilan : extranet_grossiste = liens voulus (source et utilisateur), ni plus ni moins',
      JSON.stringify(apres) === JSON.stringify(voulus), apres.length + ' / ' + voulus.length);
    ok('bilan : Ubipharm sert plusieurs grossistes (' + voulus.filter((v) => v.indexOf('=UBIPHARM=') > 0).length + ')',
      voulus.filter((v) => v.indexOf('=UBIPHARM=') > 0).length >= 2);
    ok('bilan : date d\'enregistrement renseignée', q("SELECT COUNT(*) FROM extranet_grossiste WHERE modifie_le >= '" + debut + "'") === String(voulus.length));
    ok('bilan : t_grossiste et t_parameters inchangés', empreinte('t_grossiste') === avantGrossistes && empreinte('t_parameters') === avantParametres);
    ecran = await ecranLignes(p);
    const relus = lignesBase();
    ok('relecture : écran = base après enregistrement', JSON.stringify(ecran.map((g) => g.id + '=' + g.source))
      === JSON.stringify(relus.map((g) => g.id + '=' + g.source)));
    const resume = await texte(p, '#exLiesResume');
    const nUbi = voulus.filter((v) => v.indexOf('=UBIPHARM=') > 0).length;
    ok('résumé : « Ubipharm : ' + nUbi + ' »', resume.indexOf('Ubipharm : ' + nUbi) >= 0, resume);
    ok('bouton Enregistrer de nouveau grisé', await p.evaluate(() => Ext.ComponentQuery.query('extranetsgrossistes #exLiesEnregistrer')[0].isDisabled()));

    /* Annuler remet l'etat enregistre */
    await choisirExtranet(p, libre.id, 'TEDIS');
    await vues.cliquer(p, ECRAN + ' #exLiesAnnuler');
    await p.waitForTimeout(400);
    ecran = await ecranLignes(p);
    ok('« Annuler » remet le lien enregistré (DPCI), rien en base', ecran.find((g) => g.id === libre.id).source === 'DPCI'
      && JSON.stringify(liensBase()) === JSON.stringify(voulus));

    /* refus de l'API, sans ecriture */
    const put = (corps) => p.evaluate(async (c) => (await fetch('../api/v1/extranet/grossistes', { method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })).json(), corps);
    const r1 = await put({ liaisons: [{ grossiste: libre.id, source: 'INCONNU' }] });
    const r2 = await put({ liaisons: [{ grossiste: libre.id, source: 'MAYITE' }] });
    const r3 = await put({ liaisons: [{ grossiste: 'PAS-UN-GROSSISTE', source: 'TEDIS' }, { grossiste: libre.id, source: '' }] });
    ok('API : extranet inconnu, Mayité, grossiste inconnu refusés, base inchangée', r1.success === false && r2.success === false
      && r3.success === false && JSON.stringify(liensBase()) === JSON.stringify(voulus), [r1.msg, r2.msg, r3.msg].join(' / '));

    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('déroulé sans exception', false, e.stack || e.message);
  } finally {
    await navigateur.close();
    const ecarts = sauve ? garde.restaurer(q, TABLE, sauve) : [];
    q("DELETE FROM t_event_log WHERE str_TABLE_CONCERN = 'dal.TUser' AND lg_USER_ID = (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '"
      + ENV_E2E.LOGIN + "') AND dt_CREATED >= '" + debut + "'");
    const fin = q('SELECT COUNT(*) FROM t_event_log');
    ok('bilan : table remise à l\'identique, journal des connexions d\'essai retiré (' + fin + ' = ' + journalTotal + ')',
      fin === journalTotal && ecarts.length === 0, ecarts.join(', '));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
