/* MOUVEMENT DE CAISSE PAR TOUS LES MODES DE REGLEMENT (plan du 12/11, « aucun mouvement de caisse possible autre qu'en
 * especes, tester tous les modes »).
 *
 * Constat chez appaul : choisir un autre type de reglement que « Especes » levait une erreur JavaScript
 * (« Oint_AMOUNT_REMIS undefined », LaborexWorkFlow.js) ; le mode de reglement, masque, restait vide et l'enregistrement
 * etait refuse. Cote serveur, le mode et le type etaient retrouves par « LIKE '1%' » : « 1 » pouvait donner WAVE (11) ou
 * DJAMO (19), « 2 » les points de fidelite (20).
 *
 * Vrai chemin de l'ecran, sur une COPIE de travail (DB_TEST + E2E_BASE_LIBRE) : menu > Mouvements de caisse, « Creer »,
 * type de mouvement, type de reglement, mode (s'il y en a plusieurs), banque et lieu (cheque, carte), monnaie (devise),
 * montant, commentaire, « Enregistrer », « Annuler » a l'impression du ticket.
 *
 * Jeu d'essai varie : un mouvement par type de reglement actif propose par l'ecran, plus « Especes » sans toucher a la
 * liste (valeur par defaut), « Especes » choisi apres « Cheques » (retour en arriere), et les deux modes des cheques.
 * Montants tous differents, entrees, sorties et reglements 1/3 payant en alternance.
 * Controles :
 *  - rapprochement : pour chaque mouvement, ligne du journal (type de reglement, montant) = t_mvt_caisse (mode, montant
 *    signe) = t_reglement (mode, banque, lieu, monnaie) = mvttransaction (type de reglement, type de mouvement,
 *    montant) = attendu ; le mode appartient toujours au type choisi ;
 *  - bilan : exactement un mouvement, un reglement, une transaction, une trace et une notification par enregistrement ;
 *    rien d'autre ;
 *  - ergonomie : aucun champ visible ne sort de la fenetre ;
 *  - aucune erreur JavaScript.
 * Tout ce que le test a cree est retire (repere : commentaire E2E-MCM-...).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, texteMessage, attendreMessage, repondre } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };

const MARQUE = 'E2E-MCM-' + String(Date.now()).slice(-6);
const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW()');
const ids = () => "(SELECT lg_MVT_CAISSE_ID FROM t_mvt_caisse WHERE str_COMMENTAIRE LIKE '" + MARQUE + "%')";
let caisseCreee = false;

function nettoyer() {
  exec('CREATE TEMPORARY TABLE zm AS SELECT lg_MVT_CAISSE_ID id, str_REF_TICKET t FROM t_mvt_caisse WHERE str_COMMENTAIRE LIKE \'' + MARQUE + '%\';'
    + ' DELETE FROM mvttransaction WHERE pkey IN (SELECT id FROM zm);'
    + ' DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN (SELECT id FROM zm);'
    + ' DELETE FROM notification WHERE entity_ref IN (SELECT id FROM zm);'
    + " DELETE FROM t_event_log WHERE lg_USER_ID = '" + USER + "' AND dt_CREATED >= '" + DEBUT + "' AND str_TYPE_LOG IN (SELECT t FROM zm);"
    + ' DELETE FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN (SELECT id FROM zm);');
  if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + MARQUE + "'"); }
}

(async () => {
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + USER + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + MARQUE + "', '" + USER + "', 0, 0, CURDATE(), NOW(), '" + USER + "', NOW(), '" + USER + "', 'is_Using')");
    caisseCreee = true;
  }
  /* types de reglement actifs et leurs modes actifs, tels que la base les connait */
  const typesActifs = lignes("SELECT t.lg_TYPE_REGLEMENT_ID, t.str_NAME FROM t_type_reglement t WHERE t.str_STATUT = 'enable'"
    + " AND EXISTS (SELECT 1 FROM t_mode_reglement m WHERE m.lg_TYPE_REGLEMENT_ID = t.lg_TYPE_REGLEMENT_ID AND m.str_STATUT = 'enable')");
  const modesDuType = {};
  lignes("SELECT lg_MODE_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID FROM t_mode_reglement WHERE str_STATUT = 'enable'").forEach(([m, t]) => { (modesDuType[t] = modesDuType[t] || []).push(m); });
  const nomType = {}; lignes('SELECT lg_TYPE_REGLEMENT_ID, str_NAME FROM t_type_reglement').forEach(([i, n]) => { nomType[i] = n; });
  const typeDuMode = {}; lignes('SELECT lg_MODE_REGLEMENT_ID, lg_TYPE_REGLEMENT_ID FROM t_mode_reglement').forEach(([m, t]) => { typeDuMode[m] = t; });

  const b = await ENV_E2E.lancer(chromium);
  const cas = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const libelles = await p.evaluate(() => {
      const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'mvtcaissemanager', true);
      return n ? { parent: n.parentNode.get('text'), entree: n.get('text') } : null;
    });
    if (!libelles) { throw new Error('menu mvtcaissemanager absent pour ce compte'); }
    await ouvrirMenu(p, libelles.parent, libelles.entree);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('mvtcaissemanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });

    /* liste des types de reglement proposee par l'ecran */
    await cliquer(p, 'mvtcaissemanager button[text=Créer]');
    await p.waitForFunction(() => Ext.getCmp('paydebtID') && Ext.getCmp('paydebtID').isVisible(true), null, { timeout: 20000 });
    await p.waitForTimeout(800);
    await cliquer(p, '#lg_TYPE_REGLEMENT_ID');
    await p.evaluate(() => Ext.getCmp('lg_TYPE_REGLEMENT_ID').expand());
    await p.waitForFunction(() => { const s = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getStore(); return !s.isLoading() && s.getCount() > 0; }, null, { timeout: 20000 });
    const proposes = await p.evaluate(() => Ext.getCmp('lg_TYPE_REGLEMENT_ID').getStore().getRange().map((r) => [r.get('lg_TYPE_REGLEMENT_ID'), r.get('str_NAME')]));
    await p.keyboard.press('Escape');
    await cliquer(p, '#btn_clt_anulerID');
    await p.waitForTimeout(800);
    ok('l\'écran propose les types de règlement actifs', proposes.length === typesActifs.length
      && proposes.every(([i]) => typesActifs.some(([j]) => j === i)), JSON.stringify(proposes));

    /* les cas : especes par defaut, especes apres cheques, puis chaque type propose ; les cheques avec chacun de leurs modes */
    cas.push({ libelle: 'Especes (par défaut)', type: null, attenduType: '1' });
    cas.push({ libelle: 'Especes après Cheques', detour: proposes.find(([i]) => i === '2'), type: proposes.find(([i]) => i === '1'), attenduType: '1' });
    proposes.forEach((t) => {
      const n = (modesDuType[t[0]] || []).length;
      for (let r = 0; r < Math.max(1, n); r++) { cas.push({ libelle: t[1] + (n > 1 ? ' mode ' + (r + 1) : ''), type: t, rangMode: n > 1 ? r : undefined, attenduType: t[0] }); }
    });

    for (let i = 0; i < cas.length; i++) {
      const c = cas[i];
      c.montant = 1000 + 137 * (i + 1) + (i % 2 ? 5 : 0);
      c.commentaire = MARQUE + '-' + String(i).padStart(2, '0');
      await cliquer(p, 'mvtcaissemanager button[text=Créer]');
      await p.waitForFunction(() => Ext.getCmp('paydebtID') && Ext.getCmp('paydebtID').isVisible(true), null, { timeout: 20000 });
      await p.waitForTimeout(600);
      c.typeMvtLibelle = await choisir(p, '#lg_TYPE_MVT_CAISSE_ID', i % 3);
      c.typeMvt = await p.evaluate(() => Ext.getCmp('lg_TYPE_MVT_CAISSE_ID').getValue());
      if (c.detour) {
        await choisir(p, '#lg_TYPE_REGLEMENT_ID', new RegExp('^\\s*' + c.detour[1] + '\\s*$'));
        await p.waitForTimeout(1200);
      }
      if (c.type) {
        await choisir(p, '#lg_TYPE_REGLEMENT_ID', new RegExp('^\\s*' + c.type[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$'));
      }
      await p.waitForFunction(() => { const m = Ext.getCmp('lg_MODE_REGLEMENT_ID'); return m && !m.getStore().isLoading(); }, null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(900);
      if (c.rangMode !== undefined) {
        try { await choisir(p, '#lg_MODE_REGLEMENT_ID', c.rangMode); } catch (e) { c.erreurMode = String(e.message); }
      }
      const visibles = await p.evaluate(() => ['str_BANQUE', 'str_LIEU', 'str_CODE_MONNAIE', 'str_NOM', 'int_TAUX_CHANGE', 'lg_MODE_REGLEMENT_ID'].filter((x) => Ext.getCmp(x) && Ext.getCmp(x).isVisible(true)));
      c.visibles = visibles;
      /* ergonomie : aucun champ visible ne sort de la fenetre */
      c.deborde = await p.evaluate(() => { const w = Ext.getCmp('paydebtID').getEl().dom.getBoundingClientRect();
        return Ext.ComponentQuery.query('#paydebtID field').filter((f) => f.isVisible(true)).filter((f) => { const r = f.getEl().dom.getBoundingClientRect();
          return r.right > w.right + 1 || r.left < w.left - 1 || r.bottom > w.bottom + 1; }).map((f) => f.getId()); });
      if (visibles.indexOf('str_BANQUE') >= 0) { c.banque = 'BANQUE E2E ' + i; await saisir(p, '#str_BANQUE', c.banque); }
      if (visibles.indexOf('str_LIEU') >= 0) { c.lieu = 'LIEU ' + i; await saisir(p, '#str_LIEU', c.lieu); }
      if (visibles.indexOf('str_CODE_MONNAIE') >= 0) { c.monnaie = i % 2 ? 'EUR' : 'USD'; await saisir(p, '#str_CODE_MONNAIE', c.monnaie); }
      await saisir(p, '#int_MONTANT_Add_MvtCaisse', String(c.montant));
      await saisir(p, '#str_COMMENTAIRE_MOUVEMENT', c.commentaire);
      c.modeEcran = await p.evaluate(() => Ext.getCmp('lg_MODE_REGLEMENT_ID').getValue());
      await cliquer(p, '#btn_clt_saveID');
      const msg = await attendreMessage(p, 'imprimer le ticket', 15000);
      if (msg) {
        await repondre(p, 'cancel');
        c.enregistre = true;
      } else {
        c.message = await texteMessage(p);
        const boite = await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length);
        if (boite) { await repondre(p, 'ok').catch(() => {}); }
        await p.evaluate(() => { const w = Ext.getCmp('paydebtID'); if (w) { w.close(); } });
      }
      await p.waitForTimeout(700);
    }

    /* journal de l'ecran : la recherche du jour, relue sur les lignes affichees */
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('mvtcaissemanager')[0]; return !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await cliquer(p, 'mvtcaissemanager button[text=rechercher]');
    await p.waitForTimeout(800);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('mvtcaissemanager')[0]; return !g.getStore().isLoading(); }, null, { timeout: 30000 });
    const journal = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('mvtcaissemanager')[0];
      const cols = g.headerCt.getGridColumns();
      const idx = (d) => cols.findIndex((x) => x.dataIndex === d);
      const out = {};
      g.getStore().getRange().forEach((r, i) => {
        const n = g.getView().getNode(i); if (!n) { return; }
        const cell = (d) => { const k = idx(d); const td = n.querySelectorAll('td')[k]; return td ? td.textContent.trim() : null; };
        out[r.get('id')] = { mode: cell('modeReglement'), montant: cell('montant'), type: cell('typeMvtCaisse') };
      });
      return { lignes: out, total: g.getStore().getTotalCount(), page: g.getStore().getCount() };
    });

    /* --- base --- */
    const enBase = {};
    lignes('SELECT m.lg_MVT_CAISSE_ID, m.str_COMMENTAIRE, m.lg_TYPE_MVT_CAISSE_ID, m.lg_MODE_REGLEMENT_ID, ROUND(m.int_AMOUNT), m.str_REF_TICKET FROM t_mvt_caisse m WHERE m.lg_MVT_CAISSE_ID IN ' + ids())
      .forEach(([id, com, tm, mode, mt, tk]) => { (enBase[com] = enBase[com] || []).push({ id, tm, mode, mt: Number(mt), tk }); });
    const reglements = {};
    lignes("SELECT r.str_REF_RESSOURCE, r.lg_MODE_REGLEMENT_ID, IFNULL(r.str_BANQUE,''), IFNULL(r.str_LIEU,''), IFNULL(r.str_CODE_MONNAIE,'') FROM t_reglement r WHERE r.str_REF_RESSOURCE IN " + ids())
      .forEach(([ref, mode, bq, lieu, mon]) => { (reglements[ref] = reglements[ref] || []).push({ mode, bq, lieu, mon }); });
    const transactions = {};
    lignes('SELECT t.pkey, t.typeReglementId, t.typeMvtCaisseId, t.montant FROM mvttransaction t WHERE t.pkey IN ' + ids())
      .forEach(([pk, tr, tm, mt]) => { (transactions[pk] = transactions[pk] || []).push({ tr, tm, mt: Number(mt) }); });
    const notifs = {};
    lignes('SELECT entity_ref, COUNT(*) FROM notification WHERE entity_ref IN ' + ids() + ' GROUP BY entity_ref').forEach(([e, n]) => { notifs[e] = Number(n); });
    const traces = {};
    lignes("SELECT str_TYPE_LOG, COUNT(*) FROM t_event_log WHERE lg_USER_ID = '" + USER + "' AND dt_CREATED >= '" + DEBUT + "' AND str_TYPE_LOG IN (SELECT str_REF_TICKET FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN " + ids() + ') GROUP BY str_TYPE_LOG').forEach(([t, n]) => { traces[t] = Number(n); });
    const entier = (s) => Number(String(s || '').replace(/[^0-9-]/g, ''));

    for (const c of cas) {
      const nom = '[' + c.libelle + '] ';
      const ecarts = [];
      const m = (enBase[c.commentaire] || []);
      if (!c.enregistre) { ecarts.push('refusé : ' + (c.message || c.erreurMode || '?')); }
      if (m.length !== 1) { ecarts.push(m.length + ' mouvement(s) en base'); }
      if (m.length === 1) {
        const x = m[0];
        const signe = c.typeMvt === '4' ? -1 : 1;
        if (typeDuMode[x.mode] !== c.attenduType) { ecarts.push('mode ' + x.mode + ' du type ' + typeDuMode[x.mode] + ', attendu type ' + c.attenduType); }
        if (c.modeEcran !== x.mode) { ecarts.push('mode écran ' + c.modeEcran + ' / base ' + x.mode); }
        if (x.mt !== signe * c.montant) { ecarts.push('montant ' + x.mt + ' / attendu ' + signe * c.montant); }
        if (x.tm !== c.typeMvt) { ecarts.push('type de mouvement ' + x.tm + ' / ' + c.typeMvt); }
        const r = reglements[x.id] || [];
        if (r.length !== 1) { ecarts.push(r.length + ' règlement(s)'); } else {
          if (r[0].mode !== x.mode) { ecarts.push('règlement mode ' + r[0].mode); }
          if ((c.banque || '') !== r[0].bq) { ecarts.push('banque ' + r[0].bq + ' / ' + (c.banque || '')); }
          if ((c.lieu || '') !== r[0].lieu) { ecarts.push('lieu ' + r[0].lieu + ' / ' + (c.lieu || '')); }
          if (c.monnaie && c.monnaie !== r[0].mon) { ecarts.push('monnaie ' + r[0].mon + ' / ' + c.monnaie); }
        }
        const t = transactions[x.id] || [];
        if (t.length !== 1) { ecarts.push(t.length + ' transaction(s)'); } else {
          if (t[0].tr !== c.attenduType) { ecarts.push('transaction type de règlement ' + t[0].tr + ' / ' + c.attenduType); }
          if (t[0].tm !== c.typeMvt) { ecarts.push('transaction type de mouvement ' + t[0].tm); }
          if (t[0].mt !== x.mt) { ecarts.push('transaction montant ' + t[0].mt + ' / ' + x.mt); }
        }
        if (notifs[x.id] !== 1) { ecarts.push((notifs[x.id] || 0) + ' notification(s)'); }
        if (traces[x.tk] !== 1) { ecarts.push((traces[x.tk] || 0) + ' trace(s)'); }
        const j = journal.lignes[x.id];
        if (!j) { ecarts.push('absent du journal'); } else {
          if (j.mode !== nomType[c.attenduType]) { ecarts.push('journal : ' + j.mode + ' / ' + nomType[c.attenduType]); }
          if (Math.abs(entier(j.montant)) !== c.montant) { ecarts.push('journal montant ' + j.montant); }
        }
      }
      ok(nom + 'écran = journal = mouvement = règlement = transaction = attendu', ecarts.length === 0, ecarts.join(' ; '));
    }
    const modesCheques = cas.filter((c) => c.attenduType === '2' && c.rangMode !== undefined).map((c) => c.modeEcran);
    ok('les deux modes des chèques sont bien enregistrés chacun', new Set(modesCheques).size === (modesDuType['2'] || []).length, JSON.stringify(modesCheques));
    const champs = cas.filter((c) => c.attenduType === '2' || c.attenduType === '3').every((c) => c.visibles.indexOf('str_BANQUE') >= 0 && c.visibles.indexOf('str_LIEU') >= 0);
    ok('chèque et carte : la banque et le lieu sont demandés', champs, JSON.stringify(cas.filter((c) => /^[23]$/.test(c.attenduType)).map((c) => c.visibles)));
    const debordes = cas.filter((c) => c.deborde && c.deborde.length).map((c) => c.libelle + ' : ' + c.deborde.join(','));
    ok('ergonomie : aucun champ ne sort de la fenêtre', debordes.length === 0, debordes.join(' ; '));
    const especes = cas.filter((c) => c.attenduType === '1').every((c) => c.visibles.length === 0);
    ok('espèces : aucun champ de plus', especes, JSON.stringify(cas.filter((c) => c.attenduType === '1').map((c) => c.visibles)));
    /* bilan : exactement un mouvement par enregistrement, rien d'autre au nom du compte de test depuis le debut */
    const autres = q("SELECT COUNT(*) FROM t_mvt_caisse WHERE lg_USER_ID = '" + USER + "' AND dt_CREATED >= '" + DEBUT + "' AND IFNULL(str_COMMENTAIRE,'') NOT LIKE '" + MARQUE + "%'");
    const total = q('SELECT COUNT(*) FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN ' + ids());
    ok('bilan : ' + cas.length + ' mouvements, aucun autre', Number(total) === cas.length && autres === '0', 'mouvements ' + total + ', autres ' + autres);
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' || '));
  } finally {
    await b.close();
    nettoyer();
    ok('données d\'essai retirées', q('SELECT COUNT(*) FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN ' + ids()) === '0'
      && q("SELECT COUNT(*) FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + MARQUE + "'") === '0');
  }
  const ko = res.filter((r) => !r.c).length;
  console.log('\n===== ' + (res.length - ko) + '/' + res.length + (ko ? ' FAIL' : ' PASS') + ' =====');
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); try { nettoyer(); } catch (_) { /* rien */ } process.exit(2); });
