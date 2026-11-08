/* Correspondance produits grossistes / Prestige, lot 3 : rapprochement par la designation et file de validation,
   par l'ecran GESTION DES COMMANDES > « Correspondance grossistes ».
   Etat de depart pose en base : 4 codes Copharmed non reconnus a un import passe (lot 2), dont 3 designations tirees
   de vraies fiches (casse et abreviations changees) et 1 inconnue ; 1 correspondance validee dont un BL a signale
   la contradiction.
   - « Proposer par designation » (confirme dans le bouton) : 4 propositions a valider, jamais appliquees d'office ;
   - rapprochement ecran = base, carte par carte (designation, etat, score, candidats dans l'ordre) ;
   - Valider un candidat, « Autre produit » (recherche par CIP), Rejeter, garder la validee signalee : chaque fois
     la base relue (etat, fiche, source, utilisateur, date, contradiction levee), la carte sort de la file ;
   - ergonomie : premier clic = question dans le bouton, rien d'ecrit ; sans second clic le bouton revient au bout
     de 6 s ; aucune fenetre ouverte ;
   - bilan : exactement les 4 lignes decidees changent ; un second rapprochement et le calcul du lot 1 conservent
     les decisions ; une decision sur une version perimee est refusee (409) sans rien ecrire.
   Tout est retire a la fin. */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const URL_PRESTIGE = process.env.E2E_URL || 'http://localhost:8080/prestige';
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r\n/g, '\n').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const SAUVE = 'e2e_correspondance_sauve3';
const CMD = 'E2E-CG3-C1';
const CODES = ['E2ECG3-01', 'E2ECG3-02', 'E2ECG3-03', 'E2ECG3-04', 'E2ECG3-05'];
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'COPHARMED' AND str_STATUT = 'enable' LIMIT 1");
let calculMax = 0;

/* 6 fiches actives a la designation unique, avec un dosage, et un CIP a 7 chiffres porte par elles seules */
const F = lignes("SELECT lg_FAMILLE_ID, str_DESCRIPTION, int_CIP FROM t_famille t WHERE str_STATUT = 'enable' AND str_DESCRIPTION REGEXP '[0-9]+ ?MG'"
  + " AND int_CIP REGEXP '^[0-9]{7}$' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t.int_CIP) = 1"
  + " AND (SELECT COUNT(*) FROM t_famille y WHERE y.str_DESCRIPTION = t.str_DESCRIPTION) = 1 ORDER BY lg_FAMILLE_ID LIMIT 6 OFFSET 700")
  .map((x) => ({ id: x[0], des: x[1], cip: x[2] }));
/* designation « grossiste » : casse et abreviations changees, meme produit */
const variante = (d) => d.toLowerCase().replace(/\bcpr\b/g, 'comprimes').replace(/\bgel\b/g, 'gelules').replace(/\bsp\b/g, 'sirop');

const ligneCorr = (code) => lignes(`SELECT id, etat, source, IFNULL(motif,''), IFNULL(lg_FAMILLE_ID,''), IFNULL(famille_contradiction,''), IFNULL(lg_USER_VALIDATION,''),`
  + ` dt_validation IS NOT NULL, score, IFNULL(candidats,''), DATE_FORMAT(dt_maj, '%Y-%m-%d %H:%i:%s.%f'), IFNULL(designation_grossiste,'') FROM correspondance_grossiste`
  + ` WHERE cle_grossiste = '${G}' AND code_grossiste = '${code}'`)[0] || [];
const autres = () => q(`SELECT COUNT(*), IFNULL(SUM(CRC32(CONCAT_WS('|', id, etat, source, IFNULL(lg_FAMILLE_ID,''), dt_maj))),0) FROM correspondance_grossiste`
  + ` WHERE NOT (cle_grossiste = '${G}' AND code_grossiste IN ('${CODES.join("','")}'))`);

function retirer() {
  q(`DELETE FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${CMD}'`);
  if (q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '" + SAUVE + "'") === '1') {
    q('DELETE FROM correspondance_grossiste; INSERT INTO correspondance_grossiste SELECT * FROM ' + SAUVE + ';'
      + ' DROP TABLE ' + SAUVE + '; DELETE FROM correspondance_calcul WHERE id > ' + calculMax + ';');
  }
}

(async () => {
  for (const t of ['correspondance_grossiste', 'ligne_import_grossiste']) {
    if (q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '" + t + "'") !== '1') {
      console.error('Table ' + t + ' absente : deployer la branche'); process.exit(2);
    }
  }
  if (!G || F.length < 6) { console.error('Jeu d\'essai introuvable'); process.exit(2); }
  calculMax = Number(q('SELECT IFNULL(MAX(id),0) FROM correspondance_calcul'));
  q('DROP TABLE IF EXISTS ' + SAUVE + '; CREATE TABLE ' + SAUVE + ' AS SELECT * FROM correspondance_grossiste;');
  q(`DELETE FROM correspondance_grossiste WHERE cle_grossiste = '${G}' AND code_grossiste IN ('${CODES.join("','")}')`);
  /* import passe : 4 lignes non reconnues (la 1re en double, quantites differentes) */
  const des = [variante(F[0].des), variante(F[1].des), variante(F[2].des), 'zzqx produit e2e sans equivalent 999 xl'];
  const traces = [[0, 2], [0, 1], [1, 5], [2, 1], [3, 3]];
  q(traces.map(([k, qte], i) => `INSERT INTO ligne_import_grossiste (lg_ORDER_ID, lg_GROSSISTE_ID, rang, code_brut, code_normalise, designation_brute, quantite, prix_achat, dt_import)`
    + ` VALUES ('${CMD}', '${G}', ${i + 1}, '${CODES[k]}', '${CODES[k]}', '${des[k].replace(/'/g, "''")}', ${qte}, ${1000 + 37 * i}, NOW(3));`).join(''));
  /* correspondance validee pour F3, un BL l'a recue pour F4 : signalee */
  q(`INSERT INTO correspondance_grossiste (cle_grossiste, lg_GROSSISTE_ID, code_grossiste, designation_grossiste, lg_FAMILLE_ID, etat, source, motif, score, candidats,`
    + ` nb_contradictions, famille_contradiction, dt_derniere_contradiction, lg_USER_VALIDATION, dt_validation, dt_creation, dt_maj)`
    + ` VALUES ('${G}', '${G}', '${CODES[4]}', 'E2E VALIDEE SIGNALEE', '${F[3].id}', 'VALIDEE', 'HUMAIN', 'CONSERVEE', 1.000, '["${F[3].id}"]', 1, '${F[4].id}', NOW(),`
    + ` 'autre', NOW() - INTERVAL 2 DAY, NOW(3) - INTERVAL 2 DAY, NOW(3) - INTERVAL 1 DAY)`);
  const autresAvant = autres();

  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await p.goto(URL_PRESTIGE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length);

    ok('menu declare : GESTION DES COMMANDES > Correspondance grossistes, droit P_CORRESPONDANCE_GROSSISTES',
      q("SELECT CONCAT(lg_MENU_ID, '|', str_DESCRIPTION, '|', P_KEY, '|', str_Status) FROM t_sous_menu WHERE str_COMPOSANT = 'correspondancesgrossistes'")
      === '6|Correspondance grossistes|P_CORRESPONDANCE_GROSSISTES|enable');
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('correspondancesgrossistes', 'Correspondance grossistes', '', ''));
    await p.waitForSelector('.cgr-barre [data-action=rapprocher]', { timeout: 30000 });
    const attendreFile = async () => { await p.waitForTimeout(400); await p.waitForLoadState('networkidle'); };
    await p.selectOption('.cgr-barre select[data-filtre=grossiste]', G);
    await attendreFile();
    await p.waitForFunction((g) => document.querySelector('.cgr-barre select[data-filtre=grossiste]').value === g, G);
    const carte = (code) => p.locator('.cgr-carte', { has: p.locator('.cgr-code', { hasText: new RegExp('^' + code + '$') }) });

    /* ---- proposer par designation : confirme dans le bouton */
    const bouton = p.locator('.cgr-barre [data-action=rapprocher]');
    await bouton.click();
    ok('premier clic : la question est dans le bouton, rien n\'est calcule, aucune fenetre',
      /Confirmer/.test(await bouton.textContent()) && ligneCorr(CODES[0]).length === 0 && await fenetres() === 0, await bouton.textContent());
    await bouton.click();
    await p.waitForFunction(() => /nouvelle\(s\) proposition/.test((document.getElementById('prestige-toasts') || {}).textContent || ''), null, { timeout: 120000 });
    await attendreFile();
    const calc = lignes(`SELECT origine, codes_lus, creees, statut, utilisateur FROM correspondance_calcul WHERE id > ${calculMax} ORDER BY id DESC LIMIT 1`)[0] || [];
    ok('journal : un calcul DESIGNATIONS, complet, par l\'utilisateur, 4 creees au moins', calc[0] === 'DESIGNATIONS' && calc[3] === 'COMPLET' && calc[4] === ENV_E2E.LOGIN && Number(calc[2]) >= 4, calc.join('|'));
    const prop = CODES.slice(0, 4).map(ligneCorr);
    ok('4 propositions a valider, source APPROCHE, aucune fiche retenue d\'office', prop.every((x) => x[1] === 'PROPOSEE' && x[2] === 'APPROCHE' && x[4] === ''), prop.map((x) => x.slice(1, 5).join('/')).join(' ; '));
    ok('designation du grossiste reprise de l\'import (doublon compris)', prop.every((x, i) => x[11] === des[i]), prop.map((x) => x[11]).join(' ; '));
    ok('la bonne fiche est parmi les candidats des 3 designations tirees de fiches', [0, 1, 2].every((i) => JSON.parse(prop[i][9]).includes(F[i].id)), prop.map((x) => x[9]).join(' ; '));
    ok('designation sans equivalent : a valider quand meme (motif INTROUVABLE ou score faible)', prop[3][1] === 'PROPOSEE' && (prop[3][3] === 'INTROUVABLE' || Number(prop[3][8]) < 0.7), prop[3].slice(1, 9).join('/'));

    /* rapprochement ecran = base, carte par carte */
    const ecarts = [];
    for (let i = 0; i < 4; i++) {
      const c = carte(CODES[i]);
      const lu = await c.evaluate((el) => ({
        etat: el.querySelector('[data-e2e=etat]').textContent, score: (el.querySelector('[data-e2e=score]') || {}).textContent,
        des: el.querySelector('[data-e2e=designation]').textContent,
        cands: [...el.querySelectorAll('.cgr-cands:not([data-e2e]) > .cgr-cand')].map((x) => x.getAttribute('data-famille')),
      }));
      const x = prop[i];
      const attendu = ['À valider', 'score ' + Math.round(Number(x[8]) * 100) + ' %', des[i], JSON.parse(x[9]).join(',')].join('|');
      const vu = [lu.etat, lu.score, lu.des, lu.cands.join(',')].join('|');
      if (attendu !== vu) { ecarts.push(attendu + ' <> ' + vu); }
    }
    ok('ecran = base : etat, score, designation et candidats dans l\'ordre', ecarts.length === 0, ecarts);
    const signalee = carte(CODES[4]);
    ok('correspondance validee signalee : dans la file, avec le produit recu en BL', await signalee.count() === 1
      && /Reçu en BL pour un autre produit/.test(await signalee.locator('[data-e2e=contradiction]').textContent()), await signalee.count());
    const compte0 = Number((await p.textContent('[data-e2e=compte]')).split(' ')[0]);
    ok('compteur de la file = base (a traiter chez Copharmed)', compte0 === Number(q(`SELECT COUNT(*) FROM correspondance_grossiste c WHERE cle_grossiste = '${G}' AND (c.etat IN ('PROPOSEE','CONTREDITE') OR c.famille_contradiction IS NOT NULL)`)), compte0);

    /* ---- ergonomie : sans second clic, le bouton revient */
    const rej4 = carte(CODES[3]).locator('[data-action=rejeter]');
    await rej4.click();
    ok('Rejeter, premier clic : « Confirmer le rejet ? » dans le bouton, rien d\'ecrit', (await rej4.textContent()) === 'Confirmer le rejet ?' && ligneCorr(CODES[3])[1] === 'PROPOSEE');
    await p.waitForTimeout(6500);
    ok('sans second clic : le bouton revient a « Rejeter » au bout de 6 s, rien d\'ecrit', (await rej4.textContent()) === 'Rejeter' && ligneCorr(CODES[3]).join('|') === prop[3].join('|'));

    /* ---- valider un candidat */
    const v1 = carte(CODES[0]).locator(`.cgr-cand[data-famille="${F[0].id}"] [data-action=valider]`);
    await v1.click();
    ok('Valider, premier clic : question dans le bouton, rien d\'ecrit', (await v1.textContent()) === 'Confirmer la validation ?' && ligneCorr(CODES[0])[1] === 'PROPOSEE');
    await v1.click();
    await p.waitForFunction((c) => ![...document.querySelectorAll('.cgr-code')].some((x) => x.textContent === c), CODES[0], { timeout: 15000 }).catch(() => {});
    let l = ligneCorr(CODES[0]);
    ok('valider un candidat : VALIDEE, HUMAIN, la fiche choisie, utilisateur et date ; la carte sort de la file',
      [l[1], l[2], l[4], l[6], l[7]].join('|') === ['VALIDEE', 'HUMAIN', F[0].id, ENV_E2E.LOGIN, '1'].join('|') && await carte(CODES[0]).count() === 0, l.join('|'));
    ok('compteur diminue de 1', Number((await p.textContent('[data-e2e=compte]')).split(' ')[0]) === compte0 - 1);

    /* ---- autre produit : recherche par CIP */
    const c2 = carte(CODES[1]);
    await c2.locator('[data-action=autre]').click();
    await c2.locator('input[data-action=chercher]').fill(F[5].cip);
    await c2.locator(`[data-e2e=resultats] .cgr-cand[data-famille="${F[5].id}"]`).waitFor({ timeout: 15000 });
    const v2 = c2.locator(`[data-e2e=resultats] .cgr-cand[data-famille="${F[5].id}"] [data-action=valider]`);
    await v2.click(); await v2.click();
    await p.waitForFunction((c) => ![...document.querySelectorAll('.cgr-code')].some((x) => x.textContent === c), CODES[1], { timeout: 15000 }).catch(() => {});
    l = ligneCorr(CODES[1]);
    ok('autre produit (recherche par CIP) : VALIDEE pour la fiche cherchee, hors candidats', l[1] === 'VALIDEE' && l[4] === F[5].id && !JSON.parse(l[9]).includes(F[5].id), l.join('|'));

    /* ---- rejeter */
    const r3 = carte(CODES[2]).locator('[data-action=rejeter]');
    await r3.click(); await r3.click();
    await p.waitForFunction((c) => ![...document.querySelectorAll('.cgr-code')].some((x) => x.textContent === c), CODES[2], { timeout: 15000 }).catch(() => {});
    l = ligneCorr(CODES[2]);
    ok('rejeter : REJETEE, HUMAIN, aucune fiche, utilisateur et date', [l[1], l[2], l[4], l[6], l[7]].join('|') === ['REJETEE', 'HUMAIN', '', ENV_E2E.LOGIN, '1'].join('|'), l.join('|'));

    /* ---- validee signalee : garder le produit valide, la contradiction est levee */
    const v5 = carte(CODES[4]).locator(`.cgr-cand[data-famille="${F[3].id}"] [data-action=valider]`);
    await v5.click(); await v5.click();
    await p.waitForFunction((c) => ![...document.querySelectorAll('.cgr-code')].some((x) => x.textContent === c), CODES[4], { timeout: 15000 }).catch(() => {});
    l = lignes(`SELECT etat, lg_FAMILLE_ID, IFNULL(famille_contradiction,''), nb_contradictions, lg_USER_VALIDATION FROM correspondance_grossiste WHERE cle_grossiste = '${G}' AND code_grossiste = '${CODES[4]}'`)[0];
    ok('validee signalee, produit garde : reste VALIDEE sur sa fiche, contradiction levee, compteur garde', l.join('|') === ['VALIDEE', F[3].id, '', '1', ENV_E2E.LOGIN].join('|'), l.join('|'));
    ok('aucune fenetre ouverte pendant tout le parcours', await fenetres() === 0);

    /* ---- bilan */
    ok('bilan : les autres correspondances de la table sont inchangees', autres() === autresAvant, autres() + ' / ' + autresAvant);
    ok('la proposition non traitee est inchangee', ligneCorr(CODES[3]).join('|') === prop[3].join('|'));
    const decidees = [0, 1, 2, 4].map((i) => ligneCorr(CODES[i]).join('|'));

    /* filtre « Validees » : ecran = base */
    await p.selectOption('.cgr-barre select[data-filtre=etat]', 'VALIDEE');
    await carte(CODES[0]).waitFor({ timeout: 15000 });
    const retenu = await carte(CODES[0]).locator('[data-e2e=retenu]').textContent();
    ok('filtre Validees : la carte montre le produit valide, l\'utilisateur et la date', retenu.includes(F[0].des.trim()) && retenu.includes('par ' + ENV_E2E.LOGIN), retenu);

    /* second rapprochement puis calcul du lot 1 : decisions conservees */
    const api = (chemin, methode, corps) => p.evaluate(async (a) => {
      const r = await fetch(a.u + '/api/v1/correspondance-grossiste/' + a.c, { method: a.m || 'GET', headers: a.b ? { 'Content-Type': 'application/json' } : {}, body: a.b ? JSON.stringify(a.b) : undefined });
      return { status: r.status, corps: await r.json().catch(() => null) };
    }, { u: URL_PRESTIGE, c: chemin, m: methode, b: corps });
    let r = await api('rapprocher', 'POST');
    ok('second rapprochement : les 3 codes importes et decides sont conserves (la 4e decision ne vient pas d un import), la proposition restante inchangee', r.status === 200 && r.corps.calcul.conservees === 3 && r.corps.calcul.inchangees >= 1
      && [0, 1, 2, 4].map((i) => ligneCorr(CODES[i]).join('|')).join(';') === decidees.join(';') && ligneCorr(CODES[3]).join('|') === prop[3].join('|'), JSON.stringify(r.corps && r.corps.calcul));
    r = await api('calculer', 'POST');
    ok('calcul du lot 1 ensuite : decisions et proposition par designation inchangees', r.status === 200
      && [0, 1, 2, 4].map((i) => ligneCorr(CODES[i]).join('|')).join(';') === decidees.join(';') && ligneCorr(CODES[3]).join('|') === prop[3].join('|'));

    /* version perimee : refusee, rien d'ecrit */
    const id4 = ligneCorr(CODES[3])[0];
    r = await api(id4 + '/rejeter', 'POST', { version: '2000-01-01 00:00:00.000000' });
    ok('decision sur une version perimee : 409, rien d\'ecrit', r.status === 409 && ligneCorr(CODES[3]).join('|') === prop[3].join('|'), r.status + ' ' + JSON.stringify(r.corps));
    r = await api(id4 + '/valider', 'POST', { familleId: 'E2E-INEXISTANTE', version: ligneCorr(CODES[3])[10] });
    ok('valider pour une fiche inexistante : refuse, rien d\'ecrit', r.status === 400 && ligneCorr(CODES[3]).join('|') === prop[3].join('|'), r.status);
    await p.close();
  } catch (e) {
    ok('execution sans exception', false, e && e.stack);
  } finally {
    await b.close();
    retirer();
    ok('remise en etat : traces, correspondances et journal', q(`SELECT COUNT(*) FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${CMD}'`) === '0'
      && Number(q('SELECT COUNT(*) FROM correspondance_calcul WHERE id > ' + calculMax)) === 0
      && q(`SELECT COUNT(*) FROM correspondance_grossiste WHERE code_grossiste LIKE 'E2ECG3-%'`) === '0');
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
