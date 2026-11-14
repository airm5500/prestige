/* TICKET D'UN MOUVEMENT DE CAISSE : LE SERVEUR NE RESTE PLUS FIGE SUR LE SPOULEUR (rapport d'exploitation du 13/11,
 * point 1).
 *
 * Constat chez appaul le 13/11 : l'entree de caisse de 17:16 est enregistree, mais l'impression de son ticket reste
 * 7 h 09 dans le pilote de Windows (WPrinterJob._startDoc) ; le fil HTTP et sa connexion a la base sont pris, 134
 * alertes de blocage. Le serveur de l'officine est isole et n'a pas d'imprimante a tickets (precision du 14/11) :
 * l'imprimante par defaut y est virtuelle, et une imprimante virtuelle attend un nom de fichier sans jamais rendre la
 * main. Le poste de test est dans ce cas (imprimante par defaut : « Microsoft Print to PDF »).
 *
 * Vrai chemin de l'ecran, sur une COPIE de travail (DB_TEST + E2E_BASE_LIBRE) : menu > Mouvements de caisse, « Creer »,
 * type de mouvement, montant, commentaire, « Enregistrer », « OK » a « Voulez-vous imprimer le ticket ? » ; puis, dans
 * la liste, l'icone « Reediter le ticket de ce mouvement » de chaque ligne creee.
 *
 * Jeu d'essai varie : trois mouvements de types differents (rang 0, 1 et 2 de la liste), montants 300, 450 000 et
 * 45 200.
 * Controles :
 *  - delai : chaque demande de ticket (a l'enregistrement et a la reedition) a sa reponse en 25 s au plus (ancien
 *    code : pas de reponse) ;
 *  - serveur sans imprimante a tickets : aucun avis « Ticket non imprime » (c'est normal) ; avec une vraie imprimante
 *    en defaut, l'avis s'affiche ;
 *  - rapprochement : montant et type identiques a l'ecran (journal), dans t_mvt_caisse, t_reglement et mvttransaction ;
 *  - bilan : exactement un mouvement, un reglement, une transaction et une notification par enregistrement, rien
 *    d'autre ; la reedition n'ajoute rien ;
 *  - le serveur repond encore a un autre ecran juste apres ;
 *  - aucune erreur JavaScript.
 * Tout ce que le test a cree est retire (repere : commentaire E2E-TKD-...).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, attendreMessage, repondre } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 700) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };

const DELAI_MAX = 25000;
const MARQUE = 'E2E-TKD-' + String(Date.now()).slice(-6);
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

/* attend la reponse de la demande de ticket ; null si elle n'arrive pas dans le delai */
async function reponseTicket(p, declencher) {
  const t0 = Date.now();
  const attente = p.waitForResponse((r) => r.url().indexOf('/api/v1/caisse/ticke-mvt-caisse') >= 0, { timeout: DELAI_MAX + 15000 })
    .then(async (r) => ({ duree: Date.now() - t0, statut: r.status(), corps: await r.text().catch(() => '') }))
    .catch(() => null);
  await declencher();
  const r = await attente;
  if (r) { try { r.json = JSON.parse(r.corps); } catch (e) { r.json = null; } }
  return r;
}

/* une boite de message restee ouverte (ancien code : « Error Message » vide apres 30 s) : notee puis fermee */
async function fermerBoite(p) {
  const b = await p.evaluate(() => {
    const m = Ext.Msg;
    if (!m || !m.isVisible()) { return null; }
    return { titre: m.title || (m.header && m.header.title) || '', texte: (m.getEl() ? m.getEl().dom.innerText : '').replace(/\s+/g, ' ').trim() };
  });
  if (b) { await repondre(p, 'ok').catch(() => p.evaluate(() => Ext.Msg.hide())); await p.waitForTimeout(400); }
  return b;
}

/* le menu de navigation, deplie au survol, peut rester au-dessus de la barre d'outils : la souris s'en eloigne */
async function replierMenu(p) {
  for (let k = 0; k < 10; k++) {
    await p.mouse.move(1300, 700);
    await p.waitForTimeout(500);
    const couvert = await p.evaluate(() => {
      const b = Ext.ComponentQuery.query('mvtcaissemanager button[text=Créer]')[0];
      if (!b) { return false; }
      const r = b.getEl().dom.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(e && b.getEl().dom.contains(e));
    });
    if (!couvert) { return; }
  }
}

const avisVisibles = (p) => p.evaluate(() => Array.prototype.slice.call(document.querySelectorAll('.prestige-toast'))
  .map((e) => e.textContent).filter((t) => t.indexOf('Ticket non imprimé') >= 0));

(async () => {
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + USER + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + MARQUE + "', '" + USER + "', 0, 0, CURDATE(), NOW(), '" + USER + "', NOW(), '" + USER + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await ENV_E2E.lancer(chromium);
  const cas = [{ montant: 300 }, { montant: 450000 }, { montant: 45200 }];
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

    /* 1. enregistrement et impression a la volee */
    for (let i = 0; i < cas.length; i++) {
      const c = cas[i];
      c.commentaire = MARQUE + '-' + i;
      await replierMenu(p);
      await cliquer(p, 'mvtcaissemanager button[text=Créer]');
      await p.waitForFunction(() => Ext.getCmp('paydebtID') && Ext.getCmp('paydebtID').isVisible(true), null, { timeout: 20000 });
      await p.waitForTimeout(600);
      c.typeLibelle = await choisir(p, '#lg_TYPE_MVT_CAISSE_ID', i % 3);
      c.typeMvt = await p.evaluate(() => Ext.getCmp('lg_TYPE_MVT_CAISSE_ID').getValue());
      await p.waitForTimeout(600);
      await saisir(p, '#int_MONTANT_Add_MvtCaisse', String(c.montant));
      await saisir(p, '#str_COMMENTAIRE_MOUVEMENT', c.commentaire);
      await cliquer(p, '#btn_clt_saveID');
      c.enregistre = !!(await attendreMessage(p, 'imprimer le ticket', 15000));
      if (!c.enregistre) { continue; }
      c.impression = await reponseTicket(p, () => repondre(p, 'ok'));
      await p.waitForTimeout(800);
      c.avis = await avisVisibles(p);
      c.boite = await fermerBoite(p);
    }

    /* 2. reedition depuis la liste */
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('mvtcaissemanager')[0]; return !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await cliquer(p, 'mvtcaissemanager button[text=rechercher]');
    await p.waitForTimeout(800);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('mvtcaissemanager')[0]; return !g.getStore().isLoading(); }, null, { timeout: 60000 });
    const enBase = {};
    lignes('SELECT m.str_COMMENTAIRE, m.lg_MVT_CAISSE_ID, m.lg_TYPE_MVT_CAISSE_ID, ROUND(m.int_AMOUNT) FROM t_mvt_caisse m WHERE m.lg_MVT_CAISSE_ID IN ' + ids())
      .forEach(([com, id, tm, mt]) => { (enBase[com] = enBase[com] || []).push({ id, tm, mt: Number(mt) }); });
    const journal = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('mvtcaissemanager')[0];
      const cols = g.headerCt.getGridColumns();
      const idx = (d) => cols.findIndex((x) => x.dataIndex === d);
      const out = {};
      g.getStore().getRange().forEach((r, i) => {
        const n = g.getView().getNode(i); if (!n) { return; }
        const cell = (d) => { const k = idx(d); const td = n.querySelectorAll('td')[k]; return td ? td.textContent.trim() : null; };
        out[r.get('id')] = { montant: cell('montant'), type: cell('typeMvtCaisse') };
      });
      return out;
    });
    for (const c of cas) {
      const m = enBase[c.commentaire] || [];
      if (m.length !== 1) { continue; }
      /* l'icone « Reediter le ticket » de la ligne, cliquee a la souris */
      await p.mouse.move(1300, 700); await p.waitForTimeout(1200); /* l'infobulle de la ligne precedente se ferme */
      const boite = await p.evaluate((id) => {
        const g = Ext.ComponentQuery.query('mvtcaissemanager')[0];
        const i = g.getStore().findExact('id', id);
        if (i < 0) { return null; }
        const col = g.headerCt.getGridColumns().filter((x) => x.xtype === 'actioncolumn' && (x.items || []).some((it) => /Reediter le ticket/.test(it.tooltip || '')))[0];
        const n = g.getView().getNode(i);
        if (!col || !n) { return null; }
        const td = n.querySelectorAll('td')[g.headerCt.getGridColumns().indexOf(col)];
        const img = td && td.querySelector('img, .x-action-col-icon');
        if (!img) { return null; }
        img.scrollIntoView({ block: 'center' });
        const r = img.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, m[0].id);
      if (!boite) { c.reedition = { absente: true }; continue; }
      await p.mouse.move(boite.x, boite.y); await p.waitForTimeout(300);
      c.reedition = await reponseTicket(p, () => p.mouse.click(boite.x, boite.y));
      await p.waitForTimeout(800);
      c.avisReedition = await avisVisibles(p);
      c.boiteReedition = await fermerBoite(p);
    }

    /* 3. le serveur repond encore a un autre ecran */
    const t0 = Date.now();
    await cliquer(p, 'mvtcaissemanager button[text=rechercher]');
    const repond = await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('mvtcaissemanager')[0]; return !g.getStore().isLoading(); }, null, { timeout: 20000 }).then(() => true).catch(() => false);
    ok('le serveur répond encore juste après (liste rechargée)', repond, (Date.now() - t0) + ' ms');

    /* --- controles --- */
    const reglements = {};
    lignes('SELECT r.str_REF_RESSOURCE, COUNT(*) FROM t_reglement r WHERE r.str_REF_RESSOURCE IN ' + ids() + ' GROUP BY 1').forEach(([r, n]) => { reglements[r] = Number(n); });
    const transactions = {};
    lignes('SELECT t.pkey, t.typeMvtCaisseId, t.montant FROM mvttransaction t WHERE t.pkey IN ' + ids())
      .forEach(([pk, tm, mt]) => { (transactions[pk] = transactions[pk] || []).push({ tm, mt: Number(mt) }); });
    const notifs = {};
    lignes('SELECT entity_ref, COUNT(*) FROM notification WHERE entity_ref IN ' + ids() + ' GROUP BY entity_ref').forEach(([e, n]) => { notifs[e] = Number(n); });
    const entier = (s) => Number(String(s || '').replace(/[^0-9-]/g, ''));

    for (const c of cas) {
      const nom = '[' + c.montant + ' F, ' + (c.typeLibelle || '?') + '] ';
      ok(nom + 'mouvement enregistré par l\'écran', c.enregistre);
      for (const [quoi, r, avis, boite] of [['impression', c.impression, c.avis, c.boite], ['réédition', c.reedition, c.avisReedition, c.boiteReedition]]) {
        ok(nom + quoi + ' : aucune fenêtre bloquante laissée à l\'écran', !boite, boite && (boite.titre + ' « ' + boite.texte + ' »'));
        if (!r || r.absente) {
          ok(nom + quoi + ' : réponse du serveur en ' + DELAI_MAX / 1000 + ' s au plus', false, r && r.absente ? 'icône de réédition introuvable' : 'aucune réponse (serveur figé sur le spouleur)');
          continue;
        }
        ok(nom + quoi + ' : réponse du serveur en ' + DELAI_MAX / 1000 + ' s au plus', r.statut === 200 && r.duree <= DELAI_MAX, r.duree + ' ms, HTTP ' + r.statut + ' ' + r.corps);
        const sans = r.json && r.json.success === false && r.json.sansImprimante === true;
        const imprime = r.json && r.json.success === true;
        ok(nom + quoi + ' : issue claire (imprimé, ou serveur sans imprimante à tickets)', imprime || sans || (r.json && r.json.success === false && r.json.msg), r.corps);
        if (sans) {
          ok(nom + quoi + ' : serveur sans imprimante, aucun avis « Ticket non imprimé »', (avis || []).length === 0, (avis || []).join(' | '));
        } else if (r.json && r.json.success === false) {
          ok(nom + quoi + ' : imprimante en défaut, avis « Ticket non imprimé » affiché', (avis || []).length > 0, r.json.msg);
        }
      }
      const m = enBase[c.commentaire] || [];
      const ecarts = [];
      if (m.length !== 1) { ecarts.push(m.length + ' mouvement(s) en base'); } else {
        const x = m[0];
        const signe = c.typeMvt === '4' ? -1 : 1;
        if (x.mt !== signe * c.montant) { ecarts.push('montant base ' + x.mt + ' / saisi ' + signe * c.montant); }
        if (x.tm !== c.typeMvt) { ecarts.push('type base ' + x.tm + ' / écran ' + c.typeMvt); }
        if (reglements[x.id] !== 1) { ecarts.push((reglements[x.id] || 0) + ' règlement(s)'); }
        const t = transactions[x.id] || [];
        if (t.length !== 1) { ecarts.push(t.length + ' transaction(s)'); } else if (t[0].mt !== x.mt || t[0].tm !== x.tm) { ecarts.push('transaction ' + t[0].tm + ' ' + t[0].mt); }
        if (notifs[x.id] !== 1) { ecarts.push((notifs[x.id] || 0) + ' notification(s)'); }
        const j = journal[x.id];
        if (!j) { ecarts.push('absent du journal'); } else if (Math.abs(entier(j.montant)) !== c.montant) { ecarts.push('journal ' + j.montant); }
      }
      ok(nom + 'rapprochement écran = mouvement = règlement = transaction', ecarts.length === 0, ecarts.join(' ; '));
    }
    const autres = q("SELECT COUNT(*) FROM t_mvt_caisse WHERE lg_USER_ID = '" + USER + "' AND dt_CREATED >= '" + DEBUT + "' AND IFNULL(str_COMMENTAIRE,'') NOT LIKE '" + MARQUE + "%'");
    const total = q('SELECT COUNT(*) FROM t_mvt_caisse WHERE lg_MVT_CAISSE_ID IN ' + ids());
    ok('bilan : ' + cas.length + ' mouvements, aucun autre (la réédition n\'ajoute rien)', Number(total) === cas.length && autres === '0', 'mouvements ' + total + ', autres ' + autres);
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
