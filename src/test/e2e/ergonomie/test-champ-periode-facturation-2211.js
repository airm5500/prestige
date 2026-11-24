/* PLAN DU 21/11, POINT 7.2, RETOUR DU 22/11 : le selecteur de periode unique « du → au » aussi sur le menu FACTURATION,
 * avec une aide au choix pour des utilisateurs habitues a deux champs.
 *
 * Par le vrai menu, pour chaque ecran du menu FACTURATION qui avait deux champs « Du » et « Au » (onglets compris ;
 * « Règlement différé », menu desactive, n'est pas touche) :
 *  - un seul champ visible, les deux champs d'origine masques, dates d'ouverture reprises (rien ne change a l'ouverture) ;
 *  - saisie au clavier « jj/mm/aaaa → jj/mm/aaaa » + Entree : rapprochement champ affiche = champs d'origine = dates de
 *    la requete envoyee au serveur (parametres ou corps), reponse sans erreur ;
 *  - aide au choix : un clic dans le champ ouvre le calendrier ; deux cases « Du » et « Au » montrent les dates des
 *    champs d'origine ; la case « Du » est active ; apres le premier clic, la case « Au » devient active et le survol
 *    colore exactement les jours de la periode qui serait choisie ; un clic sur la case « Au » puis sur un jour ne change
 *    que la fin ; Echap ferme le calendrier ;
 *  - 1366×768, 1280×720 et 1920×1080 : le champ entier dans sa barre, sans chevauchement, et aucune barre de l'ecran
 *    ne deborde (Factures et Recap par organisme debordaient deja avant : filtres et actions sur deux lignes).
 * Lecture seule : aucune ecriture en base (les recherches ne font que lire).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const D = (d) => d.toISOString().slice(0, 10);
const jour = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const fr = (d) => D(d).split('-').reverse().join('/');

/* menu, xtype de l'ecran, champ de fin, champ de debut ; recherche : faux si l'ecran n'a pas de bouton de recherche */
const ECRANS = [
  { menu: 'Gestion des différés', xtype: 'delayed', fin: 'delayed #dtEndre', debut: 'delayed #dtStartre', recherche: true },
  { menu: 'Gestion des différés', xtype: 'delayed', fin: 'delayed #dtEnd', debut: 'delayed #dtStart', recherche: true },
  { menu: 'Gestion des différés', xtype: 'delayed', fin: 'delayed #soldeAu', debut: 'delayed #soldeDu', recherche: true },
  { menu: 'Liste des Différés Client', xtype: 'diffmanager', fin: 'diffmanager #datefin', debut: 'diffmanager #datedebut', recherche: true },
  { menu: 'Liste des Reglements', xtype: 'reglementmanager', fin: 'reglementmanager #datefin', debut: 'reglementmanager #datedebut', recherche: true },
  { menu: 'Factures', xtype: 'facturemanager', fin: 'facturemanager #datefin', debut: 'facturemanager #datedebut', recherche: true },
  { menu: 'Dossiers à facturer', xtype: 'factureenattenteedition', fin: 'factureenattenteedition #dt_fin_journal', debut: 'factureenattenteedition #dt_debut_journal', recherche: true },
  { menu: 'Récap par organisme', xtype: 'recapOrganisme', fin: 'recapOrganisme #dt_end_recap', debut: 'recapOrganisme #dt_start_recap', recherche: true },
  { menu: 'Factures Compagnies Ass', xtype: 'groupeInvoices', fin: 'groupeInvoices #dt_end', debut: 'groupeInvoices #dt_start', recherche: false },
  { menu: 'Suivi des bons', xtype: 'tpventes', fin: 'tpventes #dtEnd', debut: 'tpventes #dtStart', recherche: true }
];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    let ouvert = null;
    for (const E of ECRANS) {
      const nom = E.menu + ' (' + E.fin.split('#')[1] + ')';
      if (ouvert !== E.menu) {
        await V.ouvrirMenu(p, 'FACTURATION', E.menu);
        await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), E.xtype, { timeout: 60000 });
        await p.waitForTimeout(2500);
        ouvert = E.menu;
      }
      /* onglet du champ, par un clic sur son titre */
      const onglet = await p.evaluate((q) => { const f = Ext.ComponentQuery.query(q)[0]; if (!f) { return null; }
        const t = f.up('[tab]'); return t && t.tab && !t.tab.active ? t.tab.getId() : null; }, E.fin);
      if (onglet) { await p.click('#' + onglet); await p.waitForTimeout(1500); }
      await p.waitForFunction((q) => { const f = Ext.ComponentQuery.query(q)[0]; return f && f.champPeriode && f.champPeriode.rendered; }, E.fin, { timeout: 30000 }).catch(() => {});
      const etat = () => p.evaluate(([qf, qd, xt]) => { const f = Ext.ComponentQuery.query(qf)[0], d = Ext.ComponentQuery.query(qd)[0], c = f && f.champPeriode;
        const r = c && c.getEl().dom.getBoundingClientRect(), barre = c && c.ownerCt.getEl().dom.getBoundingClientRect();
        const voisins = c ? c.ownerCt.items.items.filter((x) => x !== c && x.isVisible(true) && x.getEl()).map((x) => x.getEl().dom.getBoundingClientRect()) : [];
        const inner = c && c.ownerCt.layout && c.ownerCt.layout.innerCt ? c.ownerCt.layout.innerCt.dom : null;
        return { existe: !!c, visible: !!c && c.isVisible(true), texte: c ? c.getValue() : '', du: d ? d.getSubmitValue() || '' : null, au: f ? f.getSubmitValue() || '' : null,
          duTexte: d && d.getValue() ? Ext.Date.format(d.getValue(), 'd/m/Y') : '', auTexte: f && f.getValue() ? Ext.Date.format(f.getValue(), 'd/m/Y') : '',
          masques: !!d && !!f && !d.isVisible(true) && !f.isVisible(true),
          entier: !!r && r.left >= barre.left - 1 && r.right <= barre.right + 1 && r.width > 150,
          chevauche: !!r && voisins.some((v) => v.right > r.left + 1 && v.left < r.right - 1 && v.bottom > r.top + 1 && v.top < r.bottom - 1),
          deborde: inner ? inner.scrollWidth > c.ownerCt.getEl().dom.clientWidth + 2 : false,
          input: c ? c.inputEl.dom.id : null,
          /* toutes les barres visibles de l'ecran (filtres, actions) : contenu dans la largeur */
          barres: Ext.ComponentQuery.query(xt).filter((x) => x.isVisible(true))[0].query('toolbar').filter((t) => t.isVisible(true) && t.layout && t.layout.innerCt)
            .filter((t) => t.layout.innerCt.dom.scrollWidth > t.getEl().dom.clientWidth + 2).map((t) => (t.itemId || t.id) + ' ' + t.layout.innerCt.dom.scrollWidth + '/' + t.getEl().dom.clientWidth) }; }, [E.fin, E.debut, E.xtype]);
      const e0 = await etat();
      ok(`${nom} : un seul champ « période » visible, les deux champs d'origine masqués, dates d'ouverture reprises`, e0.existe && e0.visible && e0.masques
        && e0.texte === (e0.duTexte || e0.auTexte ? e0.duTexte + ' → ' + e0.auTexte : ''), JSON.stringify(e0));
      if (!e0.existe) { continue; }

      /* saisie au clavier + Entree : la requete part avec les dates du champ */
      const verifier = async (libelle, action, d1, d2) => {
        let rep = null;
        if (E.recherche) {
          [rep] = await Promise.all([p.waitForResponse((r) => { const q = r.request(); const t = decodeURIComponent(q.url()) + ' ' + (q.postData() || '');
            return q.resourceType() === 'xhr' && t.indexOf(D(d1)) >= 0 && t.indexOf(D(d2)) >= 0; }, { timeout: 60000 }).catch(() => null), action()]);
        } else { await action(); }
        await p.waitForTimeout(500);
        const e = await etat();
        const corps = rep ? await rep.text().catch(() => '') : '';
        ok(`${nom} : ${libelle} → champ = Du/Au` + (E.recherche ? ' = dates de la requête, réponse sans erreur' : ''),
          e.texte === fr(d1) + ' → ' + fr(d2) && e.du === D(d1) && e.au === D(d2) && (!E.recherche || (rep && rep.status() === 200 && !/"success"\s*:\s*false/.test(corps))),
          JSON.stringify({ texte: e.texte, du: e.du, au: e.au, requete: rep ? rep.url().replace(/^.*\/prestige\//, '').slice(0, 160) : null, http: rep && rep.status() }));
      };
      const taper = async (texte) => { await p.click('#' + e0.input); await p.keyboard.press('Control+A'); await p.keyboard.type(texte, { delay: 10 }); await p.keyboard.press('Enter'); };
      const a1 = jour(-9), a2 = jour(-4);
      await verifier(`saisie « ${fr(a1)} → ${fr(a2)} » + Entrée`, () => taper(fr(a1) + ' → ' + fr(a2)), a1, a2);

      /* aide au choix : clic dans le champ, cases Du / Au, survol, case Au seule */
      const panneau = () => p.evaluate(() => { const pan = Ext.ComponentQuery.query('container[cls~=champ-periode-panneau]').find((x) => x.isVisible());
        if (!pan) { return null; } const cases = Array.from(pan.getEl().dom.querySelectorAll('.champ-periode-case'));
        return { consigne: pan.down('#consigne').getEl().dom.textContent, cases: cases.map((c) => c.textContent.replace(/\s+/g, ' ').trim()),
          active: cases.filter((c) => /champ-periode-case-active/.test(c.className)).map((c) => c.getAttribute('data-borne')).join(','),
          colores: pan.getEl().dom.querySelectorAll('td.champ-periode-dans, td.champ-periode-borne').length }; });
      const cellule = (d) => p.evaluate((t) => { const pan = Ext.ComponentQuery.query('container[cls~=champ-periode-panneau]').find((x) => x.isVisible());
        const cal = pan && pan.down('#calendrier'); let cible = null;
        cal.cells.each((c) => { const a = c.dom.firstChild; if (a && a.dateValue && new Date(a.dateValue).toDateString() === new Date(t).toDateString()) { cible = a; } });
        if (!cible) { return null; } cible.id = cible.id || 'e2e-j-' + Math.random().toString(36).slice(2); return cible.id; }, d.getTime());
      await p.click('#' + e0.input);
      await p.waitForTimeout(400);
      const p0 = await panneau();
      ok(`${nom} : un clic dans le champ ouvre le calendrier, cases « Du ${fr(a1)} » et « Au ${fr(a2)} », « Du » active`,
        p0 && p0.cases.length === 2 && p0.cases[0] === 'Du ' + fr(a1) && p0.cases[1] === 'Au ' + fr(a2) && p0.active === 'debut' && /date de début/.test(p0.consigne), JSON.stringify(p0));
      const b1 = jour(-6), b2 = jour(-2);
      const id1 = await cellule(b1); await p.click('#' + id1); await p.waitForTimeout(250);
      const id2 = await cellule(b2); await p.hover('#' + id2); await p.waitForTimeout(250);
      const p1 = await panneau();
      ok(`${nom} : après le premier clic, « Au » active, et le survol colore les ${5} jours de la période`,
        p1 && p1.active === 'fin' && p1.cases[0] === 'Du ' + fr(b1) && p1.colores === 5 && /date de fin/.test(p1.consigne), JSON.stringify(p1));
      await verifier(`calendrier, début puis fin (${fr(b1)} → ${fr(b2)})`, () => p.click('#' + id2), b1, b2);
      /* case « Au » : un seul clic, seule la fin change */
      await p.click('#' + e0.input); await p.waitForTimeout(400);
      await p.locator('.champ-periode-panneau .champ-periode-case[data-borne=fin]:visible').click(); await p.waitForTimeout(250);
      const p2 = await panneau();
      ok(`${nom} : clic sur la case « Au » : elle devient active, consigne « le début reste le même »`, p2 && p2.active === 'fin' && /début reste le même/.test(p2.consigne), JSON.stringify(p2));
      const c3 = jour(-1);
      await verifier(`case « Au » puis ${fr(c3)} : seule la fin change`, async () => { await p.click('#' + await cellule(c3)); }, b1, c3);
      /* frappe apres des clics dans le calendrier : le calendrier ne doit plus prendre le focus (defaut trouve le 22/11) */
      await verifier(`saisie au clavier après des clics dans le calendrier « ${fr(a1)} → ${fr(a2)} »`, () => taper(fr(a1) + ' → ' + fr(a2)), a1, a2);
      await p.click('#' + e0.input); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      ok(`${nom} : Échap ferme le calendrier`, (await panneau()) === null);

      for (const [l, h] of [[1366, 768], [1280, 720], [1920, 1080]]) {
        await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(700);
        const e = await etat();
        ok(`${nom} : ${l}×${h}, champ entier dans sa barre, sans chevauchement ni débordement`, e.visible && e.entier && !e.chevauche && !e.deborde, JSON.stringify({ entier: e.entier, chevauche: e.chevauche, deborde: e.deborde }));
        ok(`${nom} : ${l}×${h}, aucune barre de l'écran ne déborde (filtres, actions)`, e.barres.length === 0, e.barres.join(' ; '));
      }
      await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(500);
    }
    const fenetres = await p.evaluate(() => Ext.ComponentQuery.query('messagebox').filter((x) => x.isVisible()).length);
    ok('Aucune fenêtre surgissante pendant les choix de période', fenetres === 0, fenetres);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const n = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - n) + '/' + res.length + (n ? ' ECHEC' : ' OK'));
  process.exit(n ? 1 : 0);
})();
