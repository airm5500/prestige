/* Correspondance produits grossistes / Prestige, lot 1 (cles exactes) : API v1/correspondance-grossiste.
   Pas encore d'ecran (lot 3) : le test passe par l'API, connecte comme l'utilisateur.
   - rapprochement : base = API (produit, liste, mesures, calculs), ligne par ligne ;
   - coherence en base : chaque correspondance AUTO par code grossiste a sa ligne t_famille_grossiste, chaque AUTO
     par CIP/EAN pointe sur la seule fiche active qui porte ce code ; compteurs du calcul = lignes ;
   - bilan : deux calculs ecrivent exactement deux lignes de journal ; le second ne cree ni ne modifie rien ;
     t_famille et t_famille_grossiste inchangees (CHECKSUM) ;
   - une correspondance VALIDEE, REJETEE ou CONTREDITE n'est jamais recalculee ; une AUTO fausse est corrigee ;
   - sans session : 401.
   Le contenu des tables de correspondance est remis en l'etat a la fin. */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const URL_PRESTIGE = process.env.E2E_URL || 'http://localhost:8080/prestige';
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r\n/g, '\n').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const SAUVE = 'e2e_correspondance_sauve';

function sauver() {
  q('DROP TABLE IF EXISTS ' + SAUVE + '; CREATE TABLE ' + SAUVE + ' AS SELECT * FROM correspondance_grossiste;');
  return Number(q('SELECT IFNULL(MAX(id),0) FROM correspondance_calcul'));
}
function restaurer(calculMax) {
  if (process.env.GARDER_JEU_ESSAI) { return; }
  q('DELETE FROM correspondance_grossiste; INSERT INTO correspondance_grossiste SELECT * FROM ' + SAUVE + ';'
    + ' DROP TABLE ' + SAUVE + '; DELETE FROM correspondance_calcul WHERE id > ' + calculMax + ';');
}
const sommes = () => q('CHECKSUM TABLE t_famille, t_famille_grossiste').split('\n').map((l) => l.split('\t')[1]).join('/');

(async () => {
  if (q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'correspondance_grossiste'") !== '1') {
    console.error('Table correspondance_grossiste absente : deployer la branche (migration V7.6.0)'); process.exit(2);
  }
  const calculMax = sauver();
  const sommesAvant = sommes();
  const b = await ENV_E2E.lancer(chromium);
  try {
    // sans session
    const anonyme = await b.newPage();
    await anonyme.goto(URL_PRESTIGE + '/', { waitUntil: 'domcontentloaded' });
    const st = await anonyme.evaluate(async (u) => (await fetch(u + '/api/v1/correspondance-grossiste/calculer', { method: 'POST' })).status, URL_PRESTIGE);
    ok('calcul refuse sans session (401)', st === 401, st);
    const stL = await anonyme.evaluate(async (u) => (await fetch(u + '/api/v1/correspondance-grossiste/mesures')).status, URL_PRESTIGE);
    ok('lecture refusee sans session (401)', stL === 401, stL);
    await anonyme.close();

    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await p.goto(URL_PRESTIGE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    const api = (chemin, methode) => p.evaluate(async (a) => {
      const r = await fetch(a.u + '/api/v1/correspondance-grossiste/' + a.c, { method: a.m || 'GET' });
      return { status: r.status, corps: await r.json().catch(() => null) };
    }, { u: URL_PRESTIGE, c: chemin, m: methode });

    // ---- 1er calcul
    let r = await api('calculer', 'POST');
    ok('premier calcul accepte', r.status === 200 && r.corps && r.corps.success, JSON.stringify(r.corps).slice(0, 200));
    const c1 = r.corps.calcul;
    const attendus = Number(q("SELECT COUNT(*) FROM (SELECT fg.lg_GROSSISTE_ID, UPPER(REPLACE(REPLACE(REPLACE(fg.str_CODE_ARTICLE,' ',''),'\\t',''),'\\r','')) c"
      + " FROM t_famille_grossiste fg JOIN t_famille f ON f.lg_FAMILLE_ID = fg.lg_FAMILLE_ID JOIN t_grossiste g ON g.lg_GROSSISTE_ID = fg.lg_GROSSISTE_ID"
      + " WHERE fg.str_STATUT='enable' AND f.str_STATUT='enable' AND TRIM(fg.str_CODE_ARTICLE) <> '' GROUP BY 1,2) x"));
    ok('codes lus = codes distincts (grossiste, code) en base', c1.codesLus === attendus, c1.codesLus + ' / ' + attendus);
    ok('compteurs : creees + modifiees + inchangees + conservees + sans resultat = codes lus',
      c1.creees + c1.modifiees + c1.inchangees + c1.conservees + c1.sansResultat === c1.codesLus, JSON.stringify(c1));
    const calculBase = lignes('SELECT codes_lus, creees, modifiees, inchangees, conservees, sans_resultat, statut, utilisateur FROM correspondance_calcul WHERE id = ' + c1.id)[0];
    ok('journal du calcul : base = API', calculBase && calculBase.join('|') === [c1.codesLus, c1.creees, c1.modifiees, c1.inchangees, c1.conservees, c1.sansResultat, 'COMPLET', ENV_E2E.LOGIN].join('|'), calculBase);

    // ---- coherence en base
    const sansFg = q("SELECT COUNT(*) FROM correspondance_grossiste c WHERE c.etat='AUTO_EXACTE' AND c.source='CODE_GROSSISTE'"
      + " AND NOT EXISTS (SELECT 1 FROM t_famille_grossiste fg WHERE fg.lg_GROSSISTE_ID = c.lg_GROSSISTE_ID AND fg.lg_FAMILLE_ID = c.lg_FAMILLE_ID"
      + " AND fg.str_STATUT='enable' AND UPPER(REPLACE(fg.str_CODE_ARTICLE,' ','')) = c.code_grossiste)");
    ok('AUTO par code grossiste : la ligne t_famille_grossiste existe', sansFg === '0', sansFg);
    const cleFausse = q("SELECT COUNT(*) FROM correspondance_grossiste c WHERE c.etat='AUTO_EXACTE' AND c.source IN ('CIP','EAN')"
      + " AND (SELECT COUNT(*) FROM t_famille f WHERE f.str_STATUT='enable' AND c.code_grossiste IN (UPPER(REPLACE(f.int_CIP,' ','')), UPPER(REPLACE(f.int_EAN13,' ','')), UPPER(REPLACE(f.int_CIP2,' ','')), UPPER(REPLACE(f.int_CIP3,' ','')), UPPER(REPLACE(f.int_CIP4,' ','')))) <> 1");
    ok('AUTO par CIP/EAN : une seule fiche active porte ce code', cleFausse === '0', cleFausse);
    const autoSansFamille = q("SELECT COUNT(*) FROM correspondance_grossiste WHERE (etat='AUTO_EXACTE') <> (lg_FAMILLE_ID IS NOT NULL)");
    ok('une fiche retenue si et seulement si AUTO (aucune validation encore)', autoSansFamille === '0', autoSansFamille);
    const proposeesPauvres = q("SELECT COUNT(*) FROM correspondance_grossiste WHERE etat='PROPOSEE' AND JSON_LENGTH(candidats) < 2");
    ok('chaque correspondance a valider a au moins deux candidats', proposeesPauvres === '0', proposeesPauvres);
    const repartition = lignes("SELECT etat, motif, COUNT(*) FROM correspondance_grossiste GROUP BY 1,2 ORDER BY 3 DESC");
    console.log('     repartition : ' + repartition.map((x) => x.join(' ')).join(' ; '));
    ok('cas varies presents (AUTO par code, a valider par desaccord ou ambiguite)',
      repartition.some((x) => x[1] === 'CODE_GROSSISTE_CONNU') && repartition.some((x) => x[1] === 'DESACCORD_CODE_CLE' || x[1] === 'CODE_AMBIGU'));

    // ---- rapprochement base = API (liste, page par page, etat par etat)
    const champs = 'c.id, c.cle_grossiste, c.code_grossiste, IFNULL(c.lg_FAMILLE_ID,\'\'), c.etat, c.source, c.motif, c.score, c.candidats';
    for (const etat of ['PROPOSEE', 'AUTO_EXACTE']) {
      const total = Number(q("SELECT COUNT(*) FROM correspondance_grossiste WHERE etat='" + etat + "'"));
      r = await api('liste?etat=' + etat + '&start=0&limit=500');
      ok('liste ' + etat + ' : total API = base', r.corps.total === total, r.corps.total + ' / ' + total);
      const ids = r.corps.data.map((x) => x.id);
      const base = new Map(lignes('SELECT ' + champs + ' FROM correspondance_grossiste c WHERE c.id IN (' + (ids.join(',') || '0') + ')').map((x) => [Number(x[0]), x]));
      let ecarts = [];
      for (const x of r.corps.data) {
        const l = base.get(x.id);
        const attendu = l && [l[1], l[2], l[3], l[4], l[5], l[6], Number(l[7]), JSON.stringify(JSON.parse(l[8]))].join('|');
        const lu = [x.cleGrossiste, x.codeGrossiste, x.familleId || '', x.etat, x.source, x.motif, x.score, JSON.stringify(x.candidats)].join('|');
        if (attendu !== lu) { ecarts.push(attendu + ' <> ' + lu); }
        if (x.candidatsDetail.length !== x.candidats.length || x.candidatsDetail.some((d, i) => d.familleId !== x.candidats[i] || !d.famille)) { ecarts.push('detail ' + x.id); }
      }
      ok('liste ' + etat + ' : ' + r.corps.data.length + ' lignes, API = base champ par champ', r.corps.data.length === Math.min(500, total) && ecarts.length === 0, ecarts.slice(0, 3));
    }
    // filtre grossiste + page suivante
    const g = q("SELECT cle_grossiste FROM correspondance_grossiste GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1");
    const totalG = Number(q("SELECT COUNT(*) FROM correspondance_grossiste WHERE cle_grossiste='" + g + "'"));
    const p1 = await api('liste?grossiste=' + g + '&start=0&limit=100');
    const p2 = await api('liste?grossiste=' + g + '&start=100&limit=100');
    const vus = new Set(p1.corps.data.concat(p2.corps.data).map((x) => x.id));
    ok('filtre grossiste et pages : total = base, pages disjointes, un seul grossiste',
      p1.corps.total === totalG && vus.size === p1.corps.data.length + p2.corps.data.length
      && p1.corps.data.concat(p2.corps.data).every((x) => x.cleGrossiste === g), p1.corps.total + ' / ' + totalG);

    // produit : 40 fiches tirees (avec correspondance AUTO, et candidates d'une PROPOSEE)
    const fiches = lignes("(SELECT lg_FAMILLE_ID FROM correspondance_grossiste WHERE etat='AUTO_EXACTE' ORDER BY id LIMIT 30)"
      + " UNION (SELECT JSON_UNQUOTE(JSON_EXTRACT(candidats,'$[0]')) FROM correspondance_grossiste WHERE etat='PROPOSEE' ORDER BY id LIMIT 10)").map((x) => x[0]);
    let ecartsProduit = [];
    for (const f of fiches) {
      const attendu = lignes("SELECT id FROM correspondance_grossiste WHERE lg_FAMILLE_ID='" + f + "' OR famille_contradiction='" + f + "' OR (lg_FAMILLE_ID IS NULL AND JSON_CONTAINS(candidats, JSON_QUOTE('" + f + "')))").map((x) => Number(x[0])).sort((a, c) => a - c);
      const rp = await api('produit/' + encodeURIComponent(f));
      const lu = rp.corps.data.map((x) => x.id).sort((a, c) => a - c);
      if (attendu.join(',') !== lu.join(',')) { ecartsProduit.push(f + ' ' + attendu + ' <> ' + lu); }
    }
    ok('produit : correspondances retenues et a valider, API = base (' + fiches.length + ' fiches)', fiches.length >= 30 && ecartsProduit.length === 0, ecartsProduit.slice(0, 3));

    // mesures = base
    r = await api('mesures');
    const mesuresBase = new Map(lignes('SELECT cle_grossiste, etat, source, COUNT(*) FROM correspondance_grossiste GROUP BY 1,2,3').map((x) => [x[0] + '|' + x[1] + '|' + x[2], Number(x[3])]));
    ok('mesures : API = base', r.corps.data.length === mesuresBase.size && r.corps.data.every((x) => mesuresBase.get(x.cleGrossiste + '|' + x.etat + '|' + x.source) === x.nombre)
      && r.corps.dernierCalcul.id === c1.id, r.corps.data.length + ' / ' + mesuresBase.size);

    // ---- second calcul : rien ne change
    const majAvant = q('SELECT MAX(dt_maj), COUNT(*) FROM correspondance_grossiste');
    r = await api('calculer', 'POST');
    const c2 = r.corps.calcul;
    ok('second calcul : rien de cree ni de modifie', c2.creees === 0 && c2.modifiees === 0 && c2.inchangees === c1.codesLus - c1.sansResultat - c1.conservees, JSON.stringify(c2));
    ok('second calcul : aucune ligne reecrite (dt_maj, nombre)', q('SELECT MAX(dt_maj), COUNT(*) FROM correspondance_grossiste') === majAvant);

    // ---- validee / rejetee / contredite conservees ; AUTO fausse corrigee
    const auto = lignes("SELECT id, lg_FAMILLE_ID FROM correspondance_grossiste WHERE etat='AUTO_EXACTE' ORDER BY id LIMIT 4");
    const autre = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT='enable' AND lg_FAMILLE_ID NOT IN ('" + auto.map((x) => x[1]).join("','") + "') LIMIT 1");
    q("UPDATE correspondance_grossiste SET etat='VALIDEE', source='HUMAIN', lg_FAMILLE_ID='" + autre + "' WHERE id=" + auto[0][0]);
    q("UPDATE correspondance_grossiste SET etat='REJETEE', source='HUMAIN' WHERE id=" + auto[1][0]);
    q("UPDATE correspondance_grossiste SET etat='CONTREDITE' WHERE id=" + auto[2][0]);
    q("UPDATE correspondance_grossiste SET lg_FAMILLE_ID='" + autre + "' WHERE id=" + auto[3][0]);
    const avantHumain = lignes('SELECT id, etat, source, IFNULL(lg_FAMILLE_ID,\'\'), dt_maj FROM correspondance_grossiste WHERE id IN (' + auto.slice(0, 3).map((x) => x[0]).join(',') + ') ORDER BY id').map((x) => x.join('|')).join(';');
    r = await api('calculer', 'POST');
    const c3 = r.corps.calcul;
    const apresHumain = lignes('SELECT id, etat, source, IFNULL(lg_FAMILLE_ID,\'\'), dt_maj FROM correspondance_grossiste WHERE id IN (' + auto.slice(0, 3).map((x) => x[0]).join(',') + ') ORDER BY id').map((x) => x.join('|')).join(';');
    ok('validee, rejetee et contredite conservees a l\'identique', avantHumain === apresHumain && c3.conservees === 3, c3.conservees);
    ok('AUTO faussee en base : corrigee par le calcul (1 modifiee)', c3.modifiees === 1 && q('SELECT lg_FAMILLE_ID FROM correspondance_grossiste WHERE id=' + auto[3][0]) === auto[3][1], JSON.stringify(c3));

    // ---- bilan
    ok('bilan : 3 calculs = 3 lignes de journal', Number(q('SELECT COUNT(*) FROM correspondance_calcul WHERE id > ' + calculMax)) === 3);
    ok('bilan : t_famille et t_famille_grossiste inchangees', sommes() === sommesAvant, sommes() + ' / ' + sommesAvant);
    r = await api('calculs?limit=3');
    ok('journal des calculs : API = base (3 derniers)', r.corps.data.map((x) => x.id).join(',') === [c3.id, c2.id, c1.id].join(','));
    await p.close();
  } catch (e) {
    ok('execution sans exception', false, e && e.stack);
  } finally {
    await b.close();
    restaurer(calculMax);
    ok('remise en etat : contenu des tables de correspondance', Number(q('SELECT COUNT(*) FROM correspondance_calcul WHERE id > ' + calculMax)) === 0);
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
