/* RH, CONGES ET ABSENCES : BOUTON DE VALIDATION INVISIBLE (plan du 12/11 : « j'ai le privilege mais je ne vois pas
 * le bouton de validation du conge »).
 *
 * Cause : l'ecran est habille au theme commun, qui redessine les icones d'action d'apres leur classe. Les icones de la
 * liste des demandes etaient des <img> dont le dessin venait d'un « :before » (police d'icones), qu'une image n'affiche
 * jamais : « Valider » (classe fixe + getClass, non convertie) et « Supprimer » (classe non reconnue) restaient une case
 * vide ; « Refuser » recevait l'icone d'un client (« refUSER » reconnu comme « user »).
 *
 * Vrai chemin (admin, qui a P_RH_VALIDER_CONGE) : menu RESSOURCES HUMAINES, onglet « Congés et absences », mois suivant
 * par « ▶ » ; clics a la souris sur les icones. Jeu d'essai varie, retire a la fin : deux employes, deux demandes
 * (conge de 2 jours, autre absence d'une demi-journee), une absence deja validee, une deja refusee.
 * Controles :
 *  - demande : Valider, Refuser, Modifier, Supprimer visibles (taille, dessin non vide, dans la cellule), quatre dessins
 *    differents ; Valider porte la coche du theme ; Refuser n'est pas l'icone du client ;
 *  - absence validee ou refusee : ni Valider ni Refuser, Supprimer visible (droit de valider) ;
 *  - clic souris sur Valider : statut VALIDE, valide par l'admin ; clic sur Refuser : REFUSE ;
 *  - rapprochement : statut de la grille = statut en base, ligne a ligne ;
 *  - bilan : seules les deux demandes changent, aucune absence creee ni supprimee ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const E1 = 'E2E-RHI-E1', E2 = 'E2E-RHI-E2';
const LIBELLES = { DEMANDE: 'Demandée', VALIDE: 'Validée', REFUSE: 'Refusée' };

function nettoyer() {
  q(`DELETE FROM t_absence WHERE employe_id IN ('${E1}', '${E2}'); DELETE FROM t_employe WHERE id IN ('${E1}', '${E2}')`);
}
const statuts = () => q(`SELECT GROUP_CONCAT(CONCAT(id, '=', statut, '/', IFNULL(valide_par, '')) ORDER BY id) FROM t_absence WHERE employe_id IN ('${E1}', '${E2}')`);

(async () => {
  nettoyer();
  q(`INSERT INTO t_employe (id, matricule, nom, prenoms, statut, created_at) VALUES ('${E1}', 'E2E-RHI-1', 'E2E VISIBLE', 'Un', 'ACTIF', NOW()),
    ('${E2}', 'E2E-RHI-2', 'E2E VISIBLE', 'Deux', 'ACTIF', NOW())`);
  q(`INSERT INTO t_absence (id, employe_id, type, debut, fin, demi_journee, motif, statut, demande_par, created_at) VALUES
    ('E2E-RHI-A1', '${E1}', 'CONGE', '2026-12-07', '2026-12-08', NULL, 'Conge deux jours', 'DEMANDE', '${ADMIN}', NOW()),
    ('E2E-RHI-A2', '${E2}', 'AUTRE', '2026-12-10', '2026-12-10', 'MATIN', 'Demi-journee', 'DEMANDE', '${ADMIN}', NOW()),
    ('E2E-RHI-A3', '${E1}', 'CONGE', '2026-12-21', '2026-12-22', NULL, 'Deja validee', 'VALIDE', '${ADMIN}', NOW()),
    ('E2E-RHI-A4', '${E2}', 'AUTRE', '2026-12-23', '2026-12-23', NULL, 'Deja refusee', 'REFUSE', '${ADMIN}', NOW());
    UPDATE t_absence SET valide_par = '${ADMIN}', dt_validation = NOW() WHERE id IN ('E2E-RHI-A3', 'E2E-RHI-A4')`);
  const total = q('SELECT COUNT(*) FROM t_absence');
  const avant = statuts();
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    const erreurs = [], dialogues = [];
    p.on('pageerror', (e) => erreurs.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'rhmanager', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    if (!lib) { throw new Error('menu rhmanager absent pour ce compte'); }
    await ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.locator('.x-tab', { hasText: 'Congés et absences' }).first().click();
    await p.waitForTimeout(2000);
    /* mois de decembre 2026 par « ▶ » */
    for (let i = 0; i < 24; i++) {
      const mois = await p.evaluate(() => { const m = Ext.ComponentQuery.query('rhmanager')[0].mois; return m.getFullYear() * 100 + m.getMonth() + 1; });
      if (mois === 202612) { break; }
      await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #moisSuiv')[0].getId()));
      await p.waitForTimeout(1500);
    }
    await p.waitForFunction(() => Ext.ComponentQuery.query('rhmanager #grilleAbsences')[0].getStore().findExact('id', 'E2E-RHI-A1') >= 0, null, { timeout: 20000 })
      .catch(async (e) => { throw new Error(e.message.split('\n')[0] + ' ; mois ' + await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #titreMois')[0].text)
        + ' ; lignes ' + await p.evaluate(() => Ext.ComponentQuery.query('rhmanager #grilleAbsences')[0].getStore().collect('id').slice(0, 10).join(' '))); });
    await p.waitForTimeout(500);

    /* icones de chaque ligne d'essai : visibles (taille, dessin, dans la cellule) et leur dessin */
    const lire = () => p.evaluate(() => {
      const g = Ext.ComponentQuery.query('rhmanager #grilleAbsences')[0], l = {};
      g.getStore().each((r, i) => {
        if (!/^E2E-RHI/.test(r.get('id'))) { return; }
        const n = g.getView().getNode(i), cell = n.querySelector('.x-action-col-cell') || n.querySelector('.x-grid-cell-inner-action-col');
        const zone = cell.getBoundingClientRect();
        const icones = Array.from(n.querySelectorAll('.x-action-col-icon')).map((e) => {
          const b = e.getBoundingClientRect(), cs = getComputedStyle(e), avant = getComputedStyle(e, ':before');
          const dessin = cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
          return { info: e.getAttribute('data-qtip'), visible: cs.display !== 'none' && cs.visibility !== 'hidden' && b.width >= 12 && b.height >= 12
              && b.left >= zone.left - 1 && b.right <= zone.right + 1 && !!dessin, dessin, cls: e.className, police: avant.content,
            x: b.left + b.width / 2, y: b.top + b.height / 2 };
        });
        l[r.get('id')] = { statut: r.get('statut'), texte: n.innerText, icones };
      });
      return l;
    });
    const dessinDe = (cls) => p.evaluate((c) => { const d = document.createElement('div'); d.className = c; document.body.appendChild(d);
      const v = getComputedStyle(d).backgroundImage; d.remove(); return v; }, cls);
    const coche = await dessinDe('act-ico act-valider'), client = await dessinDe('act-ico act-client');
    let l = await lire();
    for (const id of ['E2E-RHI-A1', 'E2E-RHI-A2']) {
      const v = (l[id] || { icones: [] }).icones.filter((x) => x.visible);
      const infos = v.map((x) => x.info);
      ok(`${id} (demande) : Valider, Refuser, Modifier, Supprimer visibles`, ['Valider', 'Refuser', 'Modifier', 'Supprimer'].every((t) => infos.includes(t)),
        JSON.stringify((l[id] || { icones: [] }).icones.map((x) => [x.info, x.visible, x.cls, x.dessin.slice(0, 30)])));
      ok(`${id} : quatre dessins différents`, new Set(v.map((x) => x.dessin)).size === v.length && v.length === 4, v.length + ' visibles');
      const val = v.find((x) => x.info === 'Valider'), ref = v.find((x) => x.info === 'Refuser');
      ok(`${id} : Valider porte la coche du thème`, !!val && val.dessin === coche, val ? val.cls : 'absent');
      ok(`${id} : Refuser n'est pas l'icône du client`, !!ref && ref.dessin !== client, ref ? ref.cls : 'absent');
    }
    for (const id of ['E2E-RHI-A3', 'E2E-RHI-A4']) {
      const infos = (l[id] || { icones: [] }).icones.filter((x) => x.visible).map((x) => x.info);
      ok(`${id} (${l[id] && l[id].statut}) : ni Valider ni Refuser, Supprimer visible`, !infos.includes('Valider') && !infos.includes('Refuser') && infos.includes('Supprimer'),
        JSON.stringify(infos));
    }

    /* clics a la souris : Valider sur A1, Refuser sur A2 */
    const cliquerIcone = async (id, info) => {
      const ic = ((await lire())[id] || { icones: [] }).icones.find((x) => x.info === info && x.visible);
      if (!ic) { return false; }
      await p.mouse.click(ic.x, ic.y);
      await p.waitForTimeout(2500);
      return true;
    };
    ok('Clic souris sur Valider (A1)', await cliquerIcone('E2E-RHI-A1', 'Valider'));
    ok('Clic souris sur Refuser (A2)', await cliquerIcone('E2E-RHI-A2', 'Refuser'));
    const base = statuts();
    ok('Base : A1 validée et A2 refusée par l\'admin, A3 et A4 inchangées', base === `E2E-RHI-A1=VALIDE/${ADMIN},E2E-RHI-A2=REFUSE/${ADMIN},E2E-RHI-A3=VALIDE/${ADMIN},E2E-RHI-A4=REFUSE/${ADMIN}`, base);
    l = await lire();
    const enBase = Object.fromEntries(base.split(',').map((x) => x.split('=')).map(([i, s]) => [i, s.split('/')[0]]));
    ok('Rapprochement : statut de la grille = statut en base, ligne à ligne', Object.keys(enBase).every((i) => l[i] && l[i].statut === enBase[i]
      && l[i].texte.indexOf(LIBELLES[enBase[i]]) >= 0), JSON.stringify(Object.keys(l).map((i) => [i, l[i].statut])));
    ok('Après décision : plus de Valider ni Refuser sur A1 et A2', ['E2E-RHI-A1', 'E2E-RHI-A2'].every((i) => !l[i].icones.some((x) => x.visible && /Valider|Refuser/.test(x.info))));
    ok('Bilan : aucune absence créée ni supprimée', q('SELECT COUNT(*) FROM t_absence') === total, total);
    ok('Bilan : seules A1 et A2 ont changé', avant.split(',').filter((x, i) => x !== base.split(',')[i]).map((x) => x.split('=')[0]).join(',') === 'E2E-RHI-A1,E2E-RHI-A2', avant + ' / ' + base);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Remise en état : employés et absences d\'essai retirés', q(`SELECT COUNT(*) FROM t_absence WHERE employe_id IN ('${E1}', '${E2}')`) === '0'
      && q(`SELECT COUNT(*) FROM t_employe WHERE id IN ('${E1}', '${E2}')`) === '0');
  }
  const n = res.filter((r) => r.c).length;
  console.log('===== ' + n + '/' + res.length + (n === res.length ? ' PASS' : ' ECHEC') + ' =====');
  process.exit(n === res.length ? 0 : 1);
})();
