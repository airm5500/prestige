/* ACTIVITE DES EQUIPES, ONGLET « ANALYSES » : RETOURS DU 24/10.
 *
 * Par les vues : ANALYSE DE GESTION > « Activité des équipes » > Analyses.
 *  - infobulles : survol d'une barre « Vitesse par opérateur » et « Répartition des tâches » : tout le texte est
 *    lisible (aucune ligne coupée par « … », rien ne deborde de la bulle) ;
 *  - ventes longues : le cadre propose « Durée de la vente » (plus de / au moins / moins de / au plus) et une valeur
 *    en minutes, 10 min par defaut ; choisir « moins de 2 » : titre du cadre et tuile suivent le critere, la tuile
 *    egale la somme du graphique ; revenir a « plus de 10 » rend la valeur de depart ; valeur hors bornes refusee ;
 *  - cartes : en-tete clair et un seul cadre (pas de bordure du graphique dans la carte) ;
 *  - aucune erreur JavaScript, aucune fenetre. Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => document.querySelectorAll('.ae-pastille').length > 0, null, { timeout: 120000 });
    await cliquer(p, 'activiteequipes #ae-analyses');
    const charge = () => p.waitForFunction(() => { const a = Ext.ComponentQuery.query('activiteequipes #aeAnalyses')[0];
      return document.querySelectorAll('.ae-tuile').length > 0 && !(a.loadMask && a.loadMask.isVisible()); }, null, { timeout: 180000 });
    await charge();
    await p.waitForTimeout(2500);

    /* --- infobulles */
    const survoler = async (id) => {
      const c = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('activiteequipes #' + id)[0]; g.up('panel').getEl().dom.scrollIntoView();
        const s = g.series.getAt(0); const it = s.items.filter((x) => x.storeItem.get('ventes') > 0 || x.storeItem.get('total') > 0 || true).slice(-1)[0];
        const bb = it.sprite.getBBox(); const xy = g.getEl().getXY(); return { x: xy[0] + bb.x + bb.width / 2, y: xy[1] + bb.y + bb.height / 2 }; }, id);
      await p.mouse.move(c.x, c.y - 1); await p.mouse.move(c.x, c.y);
      await p.waitForTimeout(1500);
      return p.evaluate(() => { const t = Ext.ComponentQuery.query('tooltip{isVisible()}')[0]; if (!t) { return null; }
        const el = t.getEl().dom; const txt = el.querySelector('.x-tip-header-text, .x-title-text, .x-header-text') || el;
        const r = el.getBoundingClientRect();
        return { texte: el.textContent, coupe: txt.scrollWidth > txt.clientWidth + 1 || txt.scrollHeight > txt.clientHeight + 1,
          deborde: Array.from(el.querySelectorAll('*')).some((x) => { const q = x.getBoundingClientRect(); return q.width && (q.right > r.right + 1 || q.bottom > r.bottom + 1); }) }; });
    };
    for (const id of ['gOperateurs', 'gRepartition']) {
      const bulle = await survoler(id);
      ok('Infobulle ' + id + ' : texte entier, rien de coupé ni de débordant', bulle && !bulle.coupe && !bulle.deborde && bulle.texte.indexOf('…') < 0, JSON.stringify(bulle));
      await p.mouse.move(5, 5);
      await p.waitForTimeout(600);
    }

    /* --- critere de duree des ventes */
    const etat = () => p.evaluate(() => { const v = Ext.ComponentQuery.query('activiteequipes')[0];
      const t = Array.from(document.querySelectorAll('.ae-tuile')).find((x) => x.getAttribute('data-code') === 'LONGUES');
      return { titre: v.down('#cLongues').title, tuileLibelle: t ? t.querySelector('.l').textContent : null,
        tuile: t ? Number(t.querySelector('.v').getAttribute('data-cible')) : null, somme: v.st.operateurs.sum('ventesLongues'),
        op: v.down('#aeSeuilOp') ? v.down('#aeSeuilOp').getValue() : null, min: v.down('#aeSeuilMin') ? v.down('#aeSeuilMin').getValue() : null }; });
    const depart = await etat();
    ok('Critère par défaut : « plus de 10 min », sélecteur dans le cadre', depart.op === 'GT' && depart.min === 10 && /plus de 10 min/i.test(depart.titre), JSON.stringify(depart));
    if (depart.op !== null) {
      await choisir(p, 'activiteequipes #aeSeuilOp', 'moins de');
      await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeSeuilMin')[0].inputEl.id), { clickCount: 3 });
      await p.keyboard.type('2');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1500);
      await charge();
      await p.waitForTimeout(1500);
      const court = await etat();
      ok('« moins de 2 min » : titre et tuile suivent ; tuile = somme du graphique', court.titre === 'Ventes de moins de 2 min' && court.tuileLibelle === 'Ventes de moins de 2 min'
        && court.tuile === court.somme && court.tuile !== depart.tuile, JSON.stringify(court));
      await choisir(p, 'activiteequipes #aeSeuilOp', 'plus de');
      await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeSeuilMin')[0].inputEl.id), { clickCount: 3 });
      await p.keyboard.type('10');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1500);
      await charge();
      await p.waitForTimeout(1500);
      const retour = await etat();
      ok('Retour à « plus de 10 min » : valeur de départ', retour.tuile === depart.tuile && retour.titre === depart.titre, JSON.stringify(retour));
      await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes #aeSeuilMin')[0].inputEl.id), { clickCount: 3 });
      await p.keyboard.type('999');
      await p.keyboard.press('Tab');
      await p.waitForTimeout(1500);
      ok('Valeur hors bornes (999 min) : champ en erreur, analyse non relancée', await p.evaluate(() => !Ext.ComponentQuery.query('activiteequipes #aeSeuilMin')[0].isValid())
        && (await etat()).tuile === depart.tuile);
    }

    /* --- cartes */
    const carte = await p.evaluate(() => { const c = Ext.ComponentQuery.query('activiteequipes #cOperateurs')[0]; const cs = getComputedStyle(c.getEl().dom);
      const corps = getComputedStyle(c.body.dom); return { rayon: parseFloat(cs.borderTopLeftRadius), ombre: cs.boxShadow !== 'none', bordureCorps: parseFloat(corps.borderTopWidth) }; });
    ok('Cartes : coins arrondis, ombre légère, un seul cadre (corps sans bordure)', carte.rayon >= 8 && carte.ombre && carte.bordureCorps === 0, JSON.stringify(carte));
    ok('Aucune erreur JavaScript, aucune fenêtre', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
