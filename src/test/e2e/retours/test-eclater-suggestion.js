/* Retour du 17/09, point 8 : « suggestion de reappro, je ne vois pas le bouton d'eclatement de suggestion ».
 *
 * Il n'existait pas : ni dans le code, ni sous un autre nom, ni dans l'historique. L'officine a precise le
 * besoin : « permettre pour une commande trop grande en terme de ligne d'eclater en un nombre voulu - eclater
 * en 3 fois une commande de 1500 lignes creera 3 suggestions manuelles de 500 lignes ». C'est l'inverse du
 * bouton FUSIONNER qui existait deja.
 *
 * Ce que le test etablit, a l'ecran :
 *  - depuis le 05/10, le bouton est sur chaque ligne (la barre du haut n'en a plus), masque pour une suggestion
 *    sans lignes ; « Tout cocher (toutes les pages) » est devenu « Tout cocher » ;
 *  - la question rappelle le nombre de lignes, refuse 1 et un nombre superieur aux lignes, et l'eclatement
 *    se fait par l'ecran (bouton de la ligne, saisie, OK) ;
 *  - un eclatement en 3 d'une suggestion de 10 lignes donne 4 + 3 + 3, et pas 3 + 3 + 3 ;
 *  - AUCUNE ligne n'est perdue ni dupliquee : c'est la seule chose qui compte vraiment, une ligne perdue
 *    etant un article qui ne sera pas commande ;
 *  - la suggestion de depart garde sa reference, et tous les morceaux sont des suggestions MANUELLES du
 *    meme grossiste ;
 *  - une suggestion deja commandee est refusee, et un nombre impossible aussi.
 *
 * Tout ce que le test pose est retire a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 340) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const SUGG = 'E2E-ECL-SUGG';
const SUGG2 = 'E2E-ECL-SUGG2';
const SUGG3 = 'E2E-ECL-COMMANDEE';
const MARQUE = 'E2E-ECL-L';
const LIGNES = 10;

function nettoyer() {
  // Les morceaux crees par l'eclatement portent une reference tiree au sort : on les retrouve par leurs
  // lignes, qui gardent la marque du test.
  exec("DELETE FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_DETAILS_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID IN ('" + SUGG + "','" + SUGG2 + "','"
    + SUGG3 + "');"
    + "DELETE FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID NOT IN"
    + " (SELECT DISTINCT lg_SUGGESTION_ORDER_ID FROM t_suggestion_order_details)"
    + " AND str_REF LIKE 'REF_%' AND dt_CREATED >= DATE_SUB(NOW(), INTERVAL 1 HOUR);");
}

/* Une suggestion de dix lignes chez un grossiste existant, plus une suggestion vide et une deja commandee. */
function poser() {
  nettoyer();
  const grossiste = q("SELECT lg_GROSSISTE_ID FROM t_grossiste LIMIT 1");
  const arts = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID SEPARATOR '|') FROM (SELECT lg_FAMILLE_ID FROM t_famille"
    + " WHERE str_STATUT='enable' ORDER BY str_NAME LIMIT " + LIGNES + ") x").split('|').filter(Boolean);
  if (!grossiste || arts.length !== LIGNES) { return null; }
  exec("INSERT INTO t_suggestion_order (lg_SUGGESTION_ORDER_ID, str_REF, lg_GROSSISTE_ID, str_STATUT,"
    + " dt_CREATED, dt_UPDATED) VALUES"
    + " ('" + SUGG + "', 'E2E-ECL-REF', '" + grossiste + "', 'auto', NOW(), NOW()),"
    + " ('" + SUGG2 + "', 'E2E-ECL-REF2', '" + grossiste + "', 'auto', NOW(), NOW()),"
    + " ('" + SUGG3 + "', 'E2E-ECL-REF3', '" + grossiste + "', 'enable', NOW(), NOW());");
  arts.forEach((id, i) => {
    exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID,"
      + " lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL,"
      + " dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
      + " VALUES ('" + MARQUE + '-' + i + "', '" + SUGG + "', '" + grossiste + "', '" + id + "', "
      + (i + 1) + ", " + (100 * (i + 1)) + ", 100, 100, NOW(), NOW(), 'is_Process', 0);");
  });
  // Une ligne sur la suggestion deja commandee, sinon l'eclatement la refuserait pour une autre raison.
  exec("INSERT INTO t_suggestion_order_details (lg_SUGGESTION_ORDER_DETAILS_ID, lg_SUGGESTION_ORDER_ID,"
    + " lg_GROSSISTE_ID, lg_FAMILLE_ID, int_NUMBER, int_PRICE, int_PRICE_DETAIL, int_PAF_DETAIL,"
    + " dt_CREATED, dt_UPDATED, str_STATUT, b_falg)"
    + " VALUES ('" + MARQUE + "-C0', '" + SUGG3 + "', '" + grossiste + "', '" + arts[0] + "', 1, 100, 100, 100,"
    + " NOW(), NOW(), 'is_Process', 0),"
    + " ('" + MARQUE + "-C1', '" + SUGG3 + "', '" + grossiste + "', '" + arts[1] + "', 1, 100, 100, 100,"
    + " NOW(), NOW(), 'is_Process', 0);");
  return grossiste;
}

(async () => {
  const grossiste = poser();
  if (!grossiste) { console.log('FATAL : jeu d\'essai incomplet (grossiste ou articles absents)'); nettoyer(); process.exit(1); }

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1700, height: 950 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_sugg_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_sugg_manager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(4000);

    /* 1. plus de bouton en haut, une action par ligne, « Tout cocher » raccourci */
    const haut = await p.evaluate(() => { const c = Ext.ComponentQuery.query('i_sugg_manager')[0];
      return { boutons: c.query('toolbar[dock=top] button').map((x) => x.itemId || x.text), colonne: !!c.down('#eclaterLigne'),
        tout: c.down('#btnToutCocher').text, infobulle: c.down('#btnToutCocher').tooltip }; });
    ok('Barre du haut : plus de « ÉCLATER », « Tout cocher » raccourci (détail dans l\'info-bulle)',
      !haut.boutons.some((t) => /clater/i.test(String(t))) && haut.colonne && haut.tout === 'Tout cocher' && /toutes les pages/.test(haut.infobulle), JSON.stringify(haut));

    /* 2. la ligne de test, cherchee comme l'utilisateur */
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue('E2E-ECL-REF'); Ext.ComponentQuery.query('i_sugg_manager')[0].onRechClick(); });
    await p.waitForFunction(() => { const st = Ext.ComponentQuery.query('i_sugg_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF', 'E2E-ECL-REF') >= 0; }, null, { timeout: 30000 });
    await p.waitForTimeout(600);
    const icones = await p.evaluate((a) => { const g = Ext.ComponentQuery.query('i_sugg_manager')[0]; const st = g.getStore();
      const vis = (id) => { const i = st.findExact('lg_SUGGESTION_ORDER_ID', id); if (i < 0) { return null; } const n = g.getView().getNode(i);
        const el = n.querySelector('.x-grid-cell-eclaterLigne .x-action-col-icon'); if (el && id === a.s) { el.setAttribute('data-e2e', 'eclater'); }
        return !!el && el.offsetParent !== null && !el.classList.contains('x-hide-display'); };
      return { pleine: vis(a.s), vide: vis(a.v) }; }, { s: SUGG, v: SUGG2 });
    ok('Bouton « éclater » sur la ligne de 10 lignes, masqué sur une suggestion sans lignes', icones.pleine === true && icones.vide !== true, JSON.stringify(icones));

    const messageBoite = () => p.evaluate(() => {
      const box = Ext.MessageBox;
      return box && box.isVisible() ? String(box.el.dom.textContent || '').replace(/\s+/g, ' ').trim() : null;
    });
    const repondre = async (valeur) => {
      await p.click('[data-e2e=eclater]');
      await p.waitForTimeout(500);
      const question = await messageBoite();
      await p.evaluate((v) => { const box = Ext.MessageBox; box.textField.setValue(v); box.btnCallback(box.msgButtons.ok); }, valeur);
      await p.waitForTimeout(700);
      return question;
    };
    const fermerBoite = async () => {
      await p.evaluate(() => { const box = Ext.MessageBox; if (box && box.isVisible()) { box.hide(); } });
      await p.waitForTimeout(400);
    };

    /* 3. la question rappelle les lignes ; 1 et 11 sont refuses sans rien envoyer */
    let question = await repondre('1');
    ok('La question nomme la suggestion et rappelle ses 10 lignes', /E2E-ECL-REF/.test(question || '') && /les 10 lignes/.test(question || ''), question);
    let message = await messageBoite();
    ok('« 1 » est refusé : au moins 2', /au moins 2/.test(message || ''), String(message));
    await fermerBoite();
    await repondre('11');
    message = await messageBoite();
    ok('« 11 » est refusé : la suggestion porte 10 lignes', /porte 10 ligne/.test(message || ''), String(message));
    await fermerBoite();

    /* 4. l eclatement par l ecran : 10 lignes en 3 donnent 4 + 3 + 3 */
    const avant = q("SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID='" + SUGG + "'");
    ok('Précondition : la suggestion porte bien ' + LIGNES + ' lignes', avant === String(LIGNES), avant);
    const [reponse] = await Promise.all([p.waitForResponse((r) => /suggestion\/eclater/.test(r.url()), { timeout: 60000 }), repondre('3')]);
    const resultat = JSON.parse(await reponse.text());
    await p.waitForTimeout(800);
    message = await messageBoite();
    await fermerBoite();
    ok('L éclatement en 3 réussit et annonce ses morceaux à l écran',
      resultat.success === true && resultat.nombre === 3 && resultat.total === LIGNES && /éclatée/.test(message || ''),
      JSON.stringify(resultat) + ' / ' + message);
    ok('Les trois morceaux font 4 + 3 + 3, le reste allant au premier',
      JSON.stringify((resultat.morceaux || []).map((m) => m.lignes)) === '[4,3,3]',
      JSON.stringify((resultat.morceaux || []).map((m) => m.lignes)));

    /* Parametres dans l URL : la ressource les lit en @QueryParam, comme le service « clean » voisin. */
    const eclater = (id, nombre) => p.evaluate(async (a) => {
      const r = await fetch('../api/v1/suggestion/eclater?suggestionId=' + encodeURIComponent(a.id)
        + '&nombre=' + encodeURIComponent(a.nombre), { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const texte = await r.text();
      try { return JSON.parse(texte); } catch (e) { return { success: false, brut: texte.slice(0, 200) }; }
    }, { id: id, nombre: nombre });

    /* 5. la garantie qui compte : aucune ligne perdue ni dupliquee */
    const reparties = q("SELECT COUNT(*) FROM t_suggestion_order_details"
      + " WHERE lg_SUGGESTION_ORDER_DETAILS_ID LIKE '" + MARQUE + "-%'"
      + " AND lg_SUGGESTION_ORDER_DETAILS_ID NOT LIKE '" + MARQUE + "-C%'");
    ok('Aucune ligne n est perdue ni dupliquée : les ' + LIGNES + ' lignes sont toutes là, une seule fois',
      reparties === String(LIGNES), reparties);
    const refs = (resultat.morceaux || []).map((m) => m.suggestionId);
    const parMorceau = q("SELECT GROUP_CONCAT(n ORDER BY n DESC) FROM (SELECT COUNT(*) n"
      + " FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID IN ('" + refs.join("','") + "')"
      + " GROUP BY lg_SUGGESTION_ORDER_ID) x");
    ok('La base porte bien trois suggestions de 4, 3 et 3 lignes', parMorceau === '4,3,3', parMorceau);

    /* 6. la suggestion de depart garde sa reference, et tout le monde est manuel et chez le meme grossiste */
    const etat = q("SELECT GROUP_CONCAT(CONCAT(lg_SUGGESTION_ORDER_ID,'/',str_REF,'/',str_STATUT,'/',"
      + "lg_GROSSISTE_ID) ORDER BY str_REF SEPARATOR ' | ') FROM t_suggestion_order"
      + " WHERE lg_SUGGESTION_ORDER_ID IN ('" + refs.join("','") + "')");
    ok('La suggestion de départ garde sa référence et devient le premier morceau',
      etat.indexOf(SUGG + '/E2E-ECL-REF/') >= 0, etat);
    ok('Les trois morceaux sont des suggestions MANUELLES',
      (etat.match(/is_Process/g) || []).length === 3, etat);
    ok('Les trois morceaux sont chez le même grossiste que l originale',
      (etat.match(new RegExp('/' + grossiste, 'g')) || []).length === 3, etat);

    /* 7. les refus : nombre impossible, suggestion deja commandee */
    const appeler = eclater;

    let refus = await appeler(SUGG, 99);
    ok('Éclater en plus de morceaux qu il y a de lignes est refusé, en disant combien il y en a',
      refus.success === false && /ligne\(s\)/.test(refus.msg || ''), JSON.stringify(refus));
    refus = await appeler(SUGG, 1);
    ok('Éclater en 1 est refusé', refus.success === false && /au moins 2/.test(refus.msg || ''),
      JSON.stringify(refus));
    refus = await appeler(SUGG3, 2);
    ok('Une suggestion déjà commandée est refusée, en la nommant',
      refus.success === false && /d.j. command.e/.test(refus.msg || '') && /E2E-ECL-REF3/.test(refus.msg || ''),
      JSON.stringify(refus));
    refus = await appeler(SUGG2, 2);
    ok('Une suggestion sans ligne est refusée : il n y a rien à éclater',
      refus.success === false && /rien . .clater/.test(refus.msg || ''), JSON.stringify(refus));
    refus = await appeler('CE-QUI-N-EXISTE-PAS', 2);
    ok('Une suggestion inconnue est refusée proprement',
      refus.success === false && /introuvable/.test(refus.msg || ''), JSON.stringify(refus));

    /* 8. la suggestion déjà commandée n a pas bougé d un pouce */
    ok('La suggestion déjà commandée est intacte : deux lignes, statut inchangé',
      q("SELECT CONCAT((SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID='"
        + SUGG3 + "'), '|', str_STATUT) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID='"
        + SUGG3 + "'") === '2|enable');

    ok('Aucune erreur JavaScript pendant tout le parcours', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours complet sans exception', false, e.message + ' | ' + p.url());
  } finally {
    await b.close();
    nettoyer();
    const reste = q("SELECT CONCAT((SELECT COUNT(*) FROM t_suggestion_order_details"
      + " WHERE lg_SUGGESTION_ORDER_DETAILS_ID LIKE '" + MARQUE + "%'), '|',"
      + " (SELECT COUNT(*) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID LIKE 'E2E-ECL%'))");
    ok('Tout ce que le test a posé est retiré', reste === '0|0', reste);
  }
  const echecs = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' controles OK');
  process.exit(echecs ? 1 : 0);
})();
