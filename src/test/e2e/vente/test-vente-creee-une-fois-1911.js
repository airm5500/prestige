/* VENTES CREEES EN DOUBLE A L'AJOUT DU PREMIER ARTICLE (Moaye, analyse du 18/11 : 307 preventes « jumelles » depuis le
 * 18/10, creees a la meme seconde que la vraie vente, dont 304 sur un seul compte, surtout entre 11 h et 14 h).
 *
 * Tant que la vente n'existe pas, l'ecran envoie l'article a add/vno (comptant) ou add/assurance, qui CREE la vente.
 * L'ecran ne retenait la vente creee qu'a la reponse : un second declenchement pendant l'attente (double Entree, scan
 * de la douchette) partait lui aussi vers la creation et creait une seconde vente, restee orpheline (« prevente »).
 *
 * Parcours a l'ecran, au clavier (compte admin), SERVICE CLIENT > Ventes, « Nouvelle vente », la creation retardee
 * de 1,5 s (serveur charge a l'heure de pointe ; le serveur lui-meme n'est pas touche) :
 *  A. sans retard : un article, une Entree (sans regression) ;
 *  B. double Entree sur la quantite du premier article ;
 *  C. scan du premier article (code + Entree), puis scan d'un autre article pendant l'attente ;
 *  D. scan du premier article deux fois pendant l'attente (meme geste repete) ;
 *  E. quantite 3 sur le premier article, double Entree.
 * Chaque cas en comptant puis en assurance (client E2EUNE, deux organismes). Attendu, lu en base : une seule vente
 * creee, les bonnes lignes et quantites, l'ecran sur cette vente ; la creation porte l'en-tete X-Client-Ref.
 * Bilan : aucune autre vente, aucun mouvement de stock ni de caisse (vente non terminee).
 * Tout ce que le test pose est retire : ventes, lignes, client, caisse d'essai, stocks remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();

const P = 'E2EUNE';
const CAISSE = P + '-CAISSE';
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const RETARD_CREATION = 1500;

/* deux articles simples, CIP sans homonyme, stock large ; leurs stocks d'origine sont remis a la fin */
const ARTICLES = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE, s.int_NUMBER FROM t_famille f JOIN t_famille_stock s"
  + " ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable'"
  + " AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.int_PRICE BETWEEN 300 AND 3000 AND s.int_NUMBER_AVAILABLE > 100 AND f.bool_DECONDITIONNE = 0"
  + " AND f.bool_ACCOUNT = 1"
  + " AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP OR x.int_CIP LIKE CONCAT(f.int_CIP, '%') OR x.str_NAME LIKE CONCAT(f.int_CIP, '%')) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM t_famille e WHERE e.lg_FAMILLE_PARENT_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT 2")
  .split('\n').filter(Boolean).map((l) => { const [id, cip, dispo, total] = l.split('\t'); return { id, cip, dispo, total }; });

const ventesDuTest = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement
  WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
const mouvements = () => {
  const v = ventesDuTest();
  return q(`SELECT (SELECT COUNT(*) FROM mvttransaction WHERE pkey IN (${v}) OR vente_id IN (${v}))
    + (SELECT COUNT(*) FROM hmvtproduit WHERE pkey IN (${v}))
    + (SELECT COUNT(*) FROM vente_reglement WHERE vente_id IN (${v}))`);
};

function nettoyer() {
  const v = ventesDuTest();
  q(`DELETE FROM prix_reference_saisie WHERE vente_id IN (${v});
     DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});
     UPDATE t_preenregistrement SET lg_PARENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});
     DELETE FROM mobile_client_ref WHERE entity_id IN (${v});
     DELETE FROM t_ayant_droit WHERE lg_AYANTS_DROITS_ID LIKE '${P}%';
     DELETE FROM t_compte_client_tiers_payant WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID LIKE '${P}%';
     DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID LIKE '${P}%';
     DELETE FROM t_client WHERE lg_CLIENT_ID LIKE '${P}%';
     DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}';`);
  ARTICLES.forEach((a) => q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${a.dispo}, int_NUMBER = ${a.total}
    WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '${a.id}'`));
}

function poser() {
  const tp = q(`SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' ORDER BY lg_TIERS_PAYANT_ID LIMIT 2`).split('\n');
  q(`INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)
       VALUES ('${P}-C', '${P}1', '${P}', 'ESSAI', '${P}MAT', '1', NOW(), NOW(), 'enable');
     INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED, dt_UPDATED, dbl_PLAFOND, dbl_QUOTA_CONSO_MENSUELLE) VALUES ('${P}-K', '${P}-C', 'enable', NOW(), NOW(), 0, 0);
     INSERT INTO t_compte_client_tiers_payant (lg_COMPTE_CLIENT_TIERS_PAYANT_ID, lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, dt_CREATED, dt_UPDATED, str_STATUT,
       int_POURCENTAGE, int_PRIORITY, dbl_PLAFOND, dbl_QUOTA_CONSO_MENSUELLE, str_NUMERO_SECURITE_SOCIAL, db_PLAFOND_ENCOURS, db_CONSOMMATION_MENSUELLE, b_IsAbsolute, b_CANBEUSE)
       VALUES ('${P}-L1', '${P}-K', '${tp[0]}', NOW(), NOW(), 'enable', 70, 1, 0, 0, '${P}MAT', 0, 0, 0, 1),
              ('${P}-L2', '${P}-K', '${tp[1]}', NOW(), NOW(), 'enable', 15, 2, 0, 0, '${P}MAT', 0, 0, 0, 1);
     INSERT INTO t_ayant_droit (lg_AYANTS_DROITS_ID, lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, str_NUMERO_SECURITE_SOCIAL, dt_CREATED, dt_UPDATED, str_STATUT)
       VALUES ('${P}-A', '${P}-C', '${P}A', '${P}', 'AYANT', '${P}AD', NOW(), NOW(), 'enable');`);
  ARTICLES.forEach((a) => q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 500, int_NUMBER = 500 WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '${a.id}'`));
  if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`) === '0') {
    q(`INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED,
      lg_UPDATED_BY, str_STATUT) VALUES ('${CAISSE}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
  }
  return tp;
}

(async () => {
  let b = null;
  const erreurs = [];
  try {
    ok('Jeu d\'essai : deux articles simples en stock, CIP sans homonyme', ARTICLES.length === 2, ARTICLES.map((a) => a.cip).join(' '));
    const tp = poser();
    ok('Jeu d\'essai : client assuré à deux organismes', tp.length === 2);
    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
    await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
    /* creation retardee (serveur charge) ; chaque creation est notee avec son en-tete X-Client-Ref */
    let retard = 0;
    const creations = [];
    await ctx.route(/\/api\/v1\/vente\/add\/(vno|assurance)$/, async (r) => {
      creations.push({ url: r.request().url().replace(/^.*\/vente\//, ''), ref: r.request().headers()['x-client-ref'] || null });
      if (retard) { await new Promise((f) => setTimeout(f, retard)); }
      r.continue();
    });
    let enVol = 0;
    const p = await ctx.newPage();
    p.on('request', (r) => { if (/\/api\/v1\/vente\/add\//.test(r.url())) { enVol++; } });
    const fini = (r) => { if (/\/api\/v1\/vente\/add\//.test(r.url())) { enVol--; } };
    p.on('requestfinished', fini); p.on('requestfailed', fini);
    p.on('pageerror', (e) => erreurs.push(e.message));
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');

    const nouvelleVente = async () => {
      /* fenetres laissees par le cas precedent (ayants droit du client, liste des clients) : fermees comme a la caisse */
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && !w.isXType('messagebox')).forEach((w) => w.close()));
      await p.waitForTimeout(300);
      await vues.ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
      await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await vues.cliquer(p, 'cloturerventemanager #addBtn');
      await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #typeVente').some((x) => x.isVisible(true)), null, { timeout: 60000 });
      await p.waitForTimeout(1500);
    };
    const cliquerType = async (v) => {
      const id = await p.evaluate((x) => { const d = Ext.ComponentQuery.query('doventemanager #typeVente')[0].bodyEl.dom.querySelector('.seg-bouton[data-valeur="' + x + '"]');
        d.id = 'e2e-seg-' + x + Date.now(); return d.id; }, v);
      await p.click('#' + id);
      await p.waitForTimeout(1500);
    };
    const choisirClient = async () => {
      await vues.cliquer(p, 'doventemanager #contenu #clientSearchTextField');
      await p.keyboard.type(P, { delay: 20 });
      await p.keyboard.press('Enter');
      await p.waitForFunction(() => !!testextjs.app.getController('VenteCtr').getClient(), null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      await p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && /ayant/i.test(w.title || '')).forEach((w) => w.close()));
      await p.waitForTimeout(500);
    };
    const produit = () => p.evaluate(() => { testextjs.app.getController('VenteCtr').getVnoproduitCombo().focus(); return true; });
    /* code tape a la main, Entree choisit l'article dans la liste, le curseur passe dans « QD » */
    const choisirArticle = async (art) => {
      await produit();
      await p.keyboard.press('Control+A');
      await p.keyboard.type(art.cip, { delay: 30 });
      await p.waitForFunction(() => { const cb = testextjs.app.getController('VenteCtr').getVnoproduitCombo(); return cb.isExpanded && cb.getStore().getCount() > 0 && !cb.getStore().isLoading(); }, null, { timeout: 30000 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(800);
    };
    /* scan a la douchette : code d'un trait, Entree tout de suite */
    const scanner = async (art) => {
      await produit();
      await p.keyboard.press('Control+A');
      await p.keyboard.type(art.cip, { delay: 15 });
      await p.keyboard.press('Enter');
    };
    const attendreCalme = async () => {
      await p.waitForTimeout(300);
      const t0 = Date.now();
      while (Date.now() - t0 < 20000) {
        await p.waitForTimeout(300);
        if (enVol <= 0) { await p.waitForTimeout(1500); if (enVol <= 0) { break; } }
      }
    };
    const venteEcran = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; });
    const lignes = (id) => q(`SELECT CONCAT(lg_FAMILLE_ID, ':', SUM(int_QUANTITY)) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${id}'
      GROUP BY lg_FAMILLE_ID ORDER BY lg_FAMILLE_ID`).split('\n').filter(Boolean);
    const nbLignes = (id) => Number(q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${id}'`));

    const [A, B] = ARTICLES;
    const CAS = [
      { nom: 'A. sans retard, une Entrée', retard: 0, geste: async () => { await choisirArticle(A); await p.keyboard.press('Control+A'); await p.keyboard.type('1'); await p.keyboard.press('Enter'); },
        attendu: [[A, 1]], lignes: 1 },
      { nom: 'B. double Entrée sur la quantité', retard: RETARD_CREATION, geste: async () => { await choisirArticle(A); await p.keyboard.press('Control+A'); await p.keyboard.type('1');
        await p.keyboard.press('Enter'); await p.waitForTimeout(40); await p.keyboard.press('Enter'); }, attendu: [[A, 1]], lignes: 1 },
      { nom: 'C. scan de A puis scan de B pendant l\'attente', retard: RETARD_CREATION, geste: async () => { await scanner(A); await p.waitForTimeout(350); await scanner(B); },
        attendu: [[A, 1], [B, 1]], lignes: 2 },
      { nom: 'D. même scan répété pendant l\'attente', retard: RETARD_CREATION, geste: async () => { await scanner(A); await p.waitForTimeout(150); await p.keyboard.press('Enter'); },
        attendu: [[A, 1]], lignes: 1 },
      { nom: 'E. quantité 3, double Entrée', retard: RETARD_CREATION, geste: async () => { await choisirArticle(B); await p.keyboard.press('Control+A'); await p.keyboard.type('3');
        await p.keyboard.press('Enter'); await p.waitForTimeout(40); await p.keyboard.press('Enter'); }, attendu: [[B, 3]], lignes: 1 }
    ];
    for (const [type, libelle] of [['1', 'Comptant'], ['2', 'Assurance']]) {
      for (const cas of CAS) {
        await nouvelleVente();
        if (type === '2') { await cliquerType('2'); await choisirClient(); }
        await p.waitForTimeout(1200);
        const t = q('SELECT NOW()');
        const n0 = creations.length;
        retard = cas.retard;
        await cas.geste();
        await attendreCalme();
        retard = 0;
        const ids = q(`SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_USER_ID = '${ADMIN}' AND dt_CREATED >= '${t}'`).split('\n').filter(Boolean);
        const id = await venteEcran();
        const attendu = cas.attendu.map(([a, n]) => a.id + ':' + n).sort();
        const vu = ids.length === 1 ? lignes(ids[0]) : ids.map((x) => x + '=' + lignes(x).join('+'));
        const envois = creations.slice(n0);
        ok(`${libelle} ${cas.nom} : une seule vente créée`, ids.length === 1, ids.length + ' vente(s) ; créations envoyées ' + envois.length);
        ok(`${libelle} ${cas.nom} : lignes et quantités attendues`, ids.length === 1 && JSON.stringify(vu) === JSON.stringify(attendu) && nbLignes(ids[0]) === cas.lignes,
          JSON.stringify(vu) + ' attendu ' + JSON.stringify(attendu));
        ok(`${libelle} ${cas.nom} : l'écran est sur la vente créée`, ids.length === 1 && id === ids[0], id + ' / ' + ids.join(','));
        ok(`${libelle} ${cas.nom} : une seule création envoyée, avec X-Client-Ref`, envois.length === 1 && !!envois[0].ref, JSON.stringify(envois));
        if (type === '2' && ids.length === 1) {
          /* comme a la caisse : le tiers-payant principal du client est pose a la creation, une seule fois */
          const [client, tps] = q(`SELECT IFNULL(lg_CLIENT_ID, '-'), (SELECT GROUP_CONCAT(lg_COMPTE_CLIENT_TIERS_PAYANT_ID) FROM t_preenregistrement_compte_client_tiers_payent
            WHERE lg_PREENREGISTREMENT_ID = '${ids[0]}') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${ids[0]}'`).split('\t');
          ok(`${libelle} ${cas.nom} : la vente porte le client et son organisme principal, une fois`, client === P + '-C' && tps === P + '-L1', client + ' / ' + tps);
        }
        const msg = await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((m) => m.isVisible()).map((m) => m.el.dom.textContent.trim().slice(0, 120)));
        ok(`${libelle} ${cas.nom} : aucun message d'erreur`, msg.length === 0, msg.join(' | '));
        if (msg.length) { await p.keyboard.press('Enter').catch(() => {}); }
      }
    }
    /* deux creations ne partagent jamais la meme reference provisoire (compteur sous verrou depuis le 02/11) */
    const v = ventesDuTest();
    const doublons = q(`SELECT COUNT(*) FROM (SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v}) GROUP BY str_REF HAVING COUNT(*) > 1) d`);
    ok('Références provisoires : aucune en double parmi les ventes du test', doublons === '0', doublons);
    ok('Bilan : aucun mouvement de stock, de caisse ni de règlement (ventes non terminées)', mouvements() === '0', mouvements());
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    if (b) { const pg = b.contexts()[0] && b.contexts()[0].pages()[0]; if (pg) { await pg.screenshot({ path: ENV_E2E.TMP + '/vente-creee-une-fois-echec.png' }).catch(() => {}); } }
    ok('Parcours sans exception', false, e.stack);
  } finally {
    if (b) { await b.close(); }
    nettoyer();
    ok('Données d\'essai retirées, stock remis', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${ventesDuTest()})`) === '0'
      && ARTICLES.every((a) => q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '${a.id}'`) === a.dispo));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
