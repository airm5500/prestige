/* FICHE ARTICLE, LOT 9 (retour du 22/11, point 1).
 *
 * Par les clics (compte e2e, role Administrateur), Fiche Article a 1366 x 768 :
 *  1. droits : libelles des trois autorisations en base (« Autorisation d'importation fiche article », « Autorisation
 *     de mise à jour sur fiche article », « Autorisation de création article ») ; l'ancien droit « recalculer seuils »
 *     est retire de la liste ; sans l'autorisation de mise a jour, d'importation et de creation (retirees du role le
 *     temps du test), « Recalculer seuils », « MAJ SEUIL », « MAJ SÉLECTIVE », « Importation » et « Créer un Article »
 *     sont masques et le serveur refuse le recalcul ; avec elles, les cinq boutons sont visibles ;
 *  2. « Recalculer seuils », Oui, puis « OK » du message de fin : la liste est relue (meme recherche, meme page) et
 *     affiche le seuil (t_famille.int_SEUIL_MIN, colonne « Seuil ») et la quantite de reappro en base. Le recalcul lui-meme est remplace par une reponse « fait »
 *     (il reecrirait les seuils de tous les articles de la copie) ; les seuils de deux articles sont changes en base
 *     pendant le message, comme le ferait le recalcul, puis remis ;
 *  3. « Créé le » : double clic sur la ligne (apercu) et icone « Détail sur l'article » : date de creation et auteur
 *     identiques a la base (t_famille.dt_CREATED, notification de creation et son utilisateur) ; un article sans
 *     notification de creation : la date seule ;
 *  4. apercu sur une ligne a 1366 : chaque repere (derniere vente, derniere entree, creation) tient sur une ligne ;
 *  bilan : droits du role et seuils des articles revenus a leur etat d'avant ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, attendreMessage, repondre } = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').replace(/\n$/, '');
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };

const DROITS = ['P_BTN_MAJ_SEUIL', 'P_BTN_IMPORT_ARTICLE', 'P_BTN_CREER_ARTICLE'];
const BOUTONS = ['btn_recalc_seuils', 'btn_maj_seuil', 'btn_maj_selective', 'btn_import_menu', 'btn_add'];
const role = q(`SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1`);
const listeDroits = DROITS.map((d) => `'${d}'`).join(',');
const attributions = lignes(`SELECT rp.lg_ROLE_PRIVILEGE, rp.lg_ROLE_ID, rp.lg_PRIVILEGE_ID, IFNULL(DATE_FORMAT(rp.dt_CREATED, '%Y-%m-%d %H:%i:%s'), ''), IFNULL(rp.str_CREATED_BY, ''), IFNULL(DATE_FORMAT(rp.dt_UPDATED, '%Y-%m-%d %H:%i:%s'), ''), IFNULL(rp.str_UPDATED_BY, '') FROM t_role_privelege rp
  JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '${role}' AND p.str_NAME IN (${listeDroits})`);
const empreinteDroits = () => q(`SELECT COUNT(*), IFNULL(GROUP_CONCAT(rp.lg_ROLE_PRIVILEGE ORDER BY rp.lg_ROLE_PRIVILEGE), '') FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = '${role}'`);
const droitsAvant = empreinteDroits();
const sql = (v) => (v === '' ? 'NULL' : `'${v.replace(/'/g, "''")}'`);
function remettreDroits() {
  for (const a of attributions) {
    q(`INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, str_CREATED_BY, dt_UPDATED, str_UPDATED_BY) VALUES (${a.map(sql).join(', ')})`);
  }
}

/* article avec notification de creation (le plus recent) et article sans notification, tous deux actifs */
const [avecAuteur] = lignes(`SELECT f.lg_FAMILLE_ID, f.int_CIP, DATE_FORMAT(f.dt_CREATED, '%d/%m/%Y %H:%i'), TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, '')))
  FROM notification n JOIN t_famille f ON f.lg_FAMILLE_ID = n.entity_ref JOIN t_user u ON u.lg_USER_ID = n.user_id
  WHERE n.type_notification = 21 AND f.str_STATUT = 'enable' AND f.dt_CREATED IS NOT NULL ORDER BY n.created_at DESC LIMIT 1`);
const [sansAuteur] = lignes(`SELECT f.lg_FAMILLE_ID, f.int_CIP, DATE_FORMAT(f.dt_CREATED, '%d/%m/%Y %H:%i') FROM t_famille f
  WHERE f.str_STATUT = 'enable' AND f.dt_CREATED IS NOT NULL AND LENGTH(f.int_CIP) = 7 AND NOT EXISTS (SELECT 1 FROM notification n WHERE n.type_notification = 21 AND n.entity_ref = f.lg_FAMILLE_ID)
  AND NOT EXISTS (SELECT 1 FROM t_famille g WHERE g.int_CIP = f.int_CIP AND g.lg_FAMILLE_ID <> f.lg_FAMILLE_ID) ORDER BY f.dt_CREATED DESC LIMIT 1`);
const seuilsAvant = {};

async function ouvrirFiche(p) {
  await ouvrirMenu(p, 'GESTION DU STOCK', 'Fiche Article');
  await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager')[0] && Ext.ComponentQuery.query('famillemanager')[0].rendered, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
}
async function rechercher(p, texte) {
  const champ = p.locator('input[placeholder="Recherche"]').filter({ visible: true }).first();
  await champ.click(); await p.keyboard.press('Control+A'); await p.keyboard.type(texte); await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('famillemanager')[0].getStore(); return !s.isLoading() && s.getCount() > 0; }, null, { timeout: 60000 });
  await p.waitForTimeout(500);
}
const boutonsVisibles = (p) => p.evaluate((ids) => ids.filter((id) => { const b = Ext.getCmp(id); return b && b.isVisible(true); }), BOUTONS);
const valeurApercu = (p, libelle) => p.evaluate((l) => { const ls = Array.from(document.querySelectorAll('.vp-ap-ligne')).filter((e) => e.offsetParent !== null);
  const x = ls.find((e) => e.textContent.trim().startsWith(l)); return x ? x.querySelector('.v').textContent.replace(/\s+/g, ' ').trim() : null; }, libelle);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    /* ---------- 1. droits ---------- */
    const libelles = Object.fromEntries(lignes(`SELECT str_NAME, CONCAT(str_DESCRIPTION, '|', str_STATUT) FROM t_privilege WHERE str_NAME IN (${listeDroits}, 'P_BTN_RECALCULER_SEUILS')`));
    ok('1. Libellés des autorisations en base', libelles.P_BTN_IMPORT_ARTICLE === 'Autorisation d\'importation fiche article|enable'
      && libelles.P_BTN_MAJ_SEUIL === 'Autorisation de mise à jour sur fiche article|enable' && libelles.P_BTN_CREER_ARTICLE === 'Autorisation de création article|enable'
      && /\|disable$/.test(libelles.P_BTN_RECALCULER_SEUILS || ''), JSON.stringify(libelles));
    ok('1. Le rôle de l\'utilisateur d\'essai a les trois autorisations au départ', attributions.length === 3, attributions.length);
    q(`DELETE rp FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '${role}' AND p.str_NAME IN (${listeDroits})`);
    {
      const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => err.push(e.message));
      await connexion(p, ENV_E2E.LOGIN, 'e2etest');
      await ouvrirFiche(p);
      await p.waitForTimeout(1500);
      const vis = await boutonsVisibles(p);
      ok('1. Sans les autorisations : les cinq boutons sont masqués', vis.length === 0, vis.join(', '));
      const refus = await p.evaluate(() => fetch('../api/v1/update/compute-reappro').then((r) => r.json()));
      ok('1. Sans l\'autorisation de mise à jour : le serveur refuse le recalcul', refus.success === false && /privil/i.test(refus.message || ''), JSON.stringify(refus));
      await ctx.close();
    }
    remettreDroits();
    ok('Bilan droits : le rôle a retrouvé ses attributions', empreinteDroits() === droitsAvant);

    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirFiche(p);
    await p.waitForTimeout(1500);
    const vis = await boutonsVisibles(p);
    ok('1. Avec les autorisations : les cinq boutons sont visibles', vis.length === BOUTONS.length, vis.join(', '));

    /* ---------- 2. OK du recalcul : la liste est relue ---------- */
    await rechercher(p, 'a');
    await p.evaluate(() => Ext.ComponentQuery.query('famillemanager')[0].getStore().loadPage(2));
    await p.waitForFunction(() => { const s = Ext.ComponentQuery.query('famillemanager')[0].getStore(); return !s.isLoading() && s.currentPage === 2; }, null, { timeout: 60000 });
    const avant = await p.evaluate(() => Ext.ComponentQuery.query('famillemanager')[0].getStore().getRange().slice(0, 2).map((r) => ({ id: r.get('lg_FAMILLE_ID'), seuil: Number(r.get('int_STOCK_REAPROVISONEMENT')), qte: Number(r.get('int_QTE_REAPPROVISIONNEMENT')) })));
    for (const a of avant) { seuilsAvant[a.id] = q(`SELECT CONCAT(IFNULL(int_SEUIL_MIN, 'NULL'), ',', IFNULL(int_QTE_REAPPROVISIONNEMENT, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${a.id}'`); }
    let appels = 0;
    await p.route('**/api/v1/update/compute-reappro*', (r) => { appels++; r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }); });
    await p.locator('#btn_recalc_seuils').click();
    await attendreMessage(p, 'Lancer le recalcul', 10000);
    await repondre(p, 'yes');
    ok('2. Message de fin du recalcul affiché', !!(await attendreMessage(p, 'Recalcul des seuils terminé', 30000)), appels);
    /* le recalcul a change les seuils en base (valeurs differentes d'une ligne a l'autre, quantite > 1) */
    const nouveaux = avant.map((a, i) => ({ id: a.id, seuil: a.seuil + 7 + i * 5, qte: a.qte + 3 + i * 2 }));
    for (const n of nouveaux) { q(`UPDATE t_famille SET int_SEUIL_MIN = ${n.seuil}, int_QTE_REAPPROVISIONNEMENT = ${n.qte} WHERE lg_FAMILLE_ID = '${n.id}'`); }
    const [rech] = await Promise.all([
      p.waitForRequest((r) => /produit-search\/fiche/.test(r.url()), { timeout: 30000 }).catch(() => null),
      repondre(p, 'ok'),
    ]);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('famillemanager')[0].getStore().isLoading(), null, { timeout: 60000 });
    await p.waitForTimeout(500);
    const apres = await p.evaluate((ids) => { const s = Ext.ComponentQuery.query('famillemanager')[0].getStore(); return { page: s.currentPage, lignes: ids.map((id) => { const r = s.findRecord('lg_FAMILLE_ID', id, 0, false, true, true);
      const n = r && Ext.ComponentQuery.query('famillemanager')[0].getView().getNode(r); return r ? { seuil: Number(r.get('int_STOCK_REAPROVISONEMENT')), qte: Number(r.get('int_QTE_REAPPROVISIONNEMENT')), texte: n ? n.textContent : '' } : null; }) }; }, nouveaux.map((n) => n.id));
    const url = rech ? new URL(rech.url()) : null;
    ok('2. « OK » relit la liste : même recherche, même page', !!rech && url.searchParams.get('search_value') === 'a' && apres.page === 2, rech ? rech.url() : 'aucune requête');
    ok('2. Seuils et quantités relus = base, ligne par ligne', nouveaux.every((n, i) => apres.lignes[i] && apres.lignes[i].seuil === n.seuil && apres.lignes[i].qte === n.qte),
      JSON.stringify({ attendu: nouveaux, ecran: apres.lignes.map((l) => l && { seuil: l.seuil, qte: l.qte }) }));
    await p.unroute('**/api/v1/update/compute-reappro*');

    /* ---------- 3 et 4. « Créé le » : apercu (double clic) et detail ---------- */
    for (const [art, auteur] of [[avecAuteur, avecAuteur && avecAuteur[3]], [sansAuteur, '']]) {
      if (!art) { ok('3. Article d\'essai trouvé', false); continue; }
      await rechercher(p, art[1]);
      const idLigne = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; const r = g.getStore().findRecord('lg_FAMILLE_ID', id, 0, false, true, true); const n = r && g.getView().getNode(r);
        if (!n) { return null; } const c = n.querySelector('td:nth-child(3)') || n; c.id = c.id || 'e2e-ligne-' + id; return c.id; }, art[0]);
      await p.dblclick('#' + idLigne);
      await p.waitForFunction(() => Array.from(document.querySelectorAll('.vp-ap-ligne')).some((e) => e.offsetParent !== null), null, { timeout: 30000 });
      await p.waitForTimeout(800);
      const attendu = art[2] + (auteur ? ' par ' + auteur : '');
      const cree = await valeurApercu(p, 'Créé le');
      ok('3. Aperçu (double clic) ' + art[1] + ' : « Créé le » = base' + (auteur ? ' (date et auteur)' : ' (date seule)'), cree === attendu, cree + ' / attendu ' + attendu);
      /* 4. chaque repere sur une seule ligne */
      const hauteurs = await p.evaluate(() => Array.from(document.querySelectorAll('.vp-ap-ligne')).filter((e) => e.offsetParent !== null).map((e) => {
        const v = e.querySelector('.v'); const lh = parseFloat(getComputedStyle(v).lineHeight) || 18; return { l: e.textContent.trim().slice(0, 18), h: v.getBoundingClientRect().height, lh, deborde: v.scrollWidth > v.clientWidth + 1 }; }));
      const surDeux = hauteurs.filter((h) => h.h > h.lh * 1.5 || h.deborde);
      ok('4. Aperçu ' + art[1] + ' : ' + hauteurs.length + ' repères, chacun sur une ligne, sans texte coupé', hauteurs.length >= 3 && surDeux.length === 0, JSON.stringify(surDeux.length ? surDeux : hauteurs));
      /* detail sur l'article */
      const idDetail = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; const r = g.getStore().findRecord('lg_FAMILLE_ID', id, 0, false, true, true); const n = g.getView().getNode(r);
        const e = Array.from(n.querySelectorAll('[data-qtip], img, [title]')).find((x) => /D[ée]tail sur l.article/.test(x.getAttribute('data-qtip') || x.getAttribute('title') || x.getAttribute('alt') || ''));
        if (!e) { return null; } e.id = e.id || 'e2e-detail-' + id; return e.id; }, art[0]);
      if (idDetail) {
        await p.click('#' + idDetail);
      } else {
        /* action passee dans le menu « ... » de la ligne */
        const idPlus = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; const r = g.getStore().findRecord('lg_FAMILLE_ID', id, 0, false, true, true); const n = g.getView().getNode(r);
          const e = Array.from(n.querySelectorAll('*')).reverse().find((x) => /^\s*(…|\.\.\.)\s*$/.test(x.textContent) || /fa-ellipsis/.test(x.className)); if (!e) { return null; } e.id = e.id || 'e2e-plus-' + id; return e.id; }, art[0]);
        await p.click('#' + idPlus);
        await p.locator('.x-menu-item').filter({ hasText: /Détail sur l.article/ }).filter({ visible: true }).first().click();
      }
      await p.waitForFunction(() => { const c = Ext.getCmp('dt_CREATION_FICHE'); return c && c.isVisible(true) && c.getValue(); }, null, { timeout: 60000 });
      const detail = await p.evaluate(() => { const c = Ext.getCmp('dt_CREATION_FICHE'); return { texte: c.inputEl ? c.inputEl.dom.textContent.replace(/\s+/g, ' ').trim() : (c.el.dom.textContent || ''), label: c.getFieldLabel() }; });
      const dateDetail = (detail.texte.match(/\d{2}\/\d{2}\/\d{4}/) || [''])[0];
      ok('3. Détail ' + art[1] + ' : champ « Créé le » = date de création' + (auteur ? ' et auteur' : '') + ' en base',
        detail.label === 'Créé le' && dateDetail === art[2].slice(0, 10) && (auteur ? detail.texte.endsWith('par ' + auteur) : !/ par /.test(detail.texte)), JSON.stringify(detail) + ' / ' + art[2] + ' ' + auteur);
      await p.evaluate(() => { const w = Ext.getCmp('dt_CREATION_FICHE').up('window'); if (w) { w.close(); } });
      await p.waitForTimeout(500);
    }
    await ctx.close();
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    remettreDroits();
    for (const [id, v] of Object.entries(seuilsAvant)) {
      const [s, qte] = v.split(',');
      q(`UPDATE t_famille SET int_SEUIL_MIN = ${s}, int_QTE_REAPPROVISIONNEMENT = ${qte} WHERE lg_FAMILLE_ID = '${id}'`);
    }
    const remis = Object.entries(seuilsAvant).every(([id, v]) => q(`SELECT CONCAT(IFNULL(int_SEUIL_MIN, 'NULL'), ',', IFNULL(int_QTE_REAPPROVISIONNEMENT, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`) === v);
    ok('Bilan : droits du rôle et seuils des articles revenus à leur état d\'avant', empreinteDroits() === droitsAvant && remis);
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
