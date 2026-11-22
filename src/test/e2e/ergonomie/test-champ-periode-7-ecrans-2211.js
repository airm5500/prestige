/* RETOUR DU 22/11, POINT 2 : le selecteur de periode unique « du → au » (avec ses cases Du / Au) sur sept ecrans de plus :
 * SERVICE CLIENT > Vente terminées ; GESTION COURANTE > Liste des Bons par Organisme (onglet Pointage : l'onglet Bons
 * l'avait deja), Liste des articles vendus récap, Liste des articles vendus ; ANALYSE DE GESTION > Statistique sur TVA2,
 * Tableau de bord du pharmacien2, Récapitulatif activité (rapport d'activite).
 *
 * Par le vrai menu, pour chaque ecran :
 *  - un seul champ « Période » visible, les deux champs d'origine masques, dates d'ouverture reprises ;
 *  - saisie au clavier « jj/mm/aaaa → jj/mm/aaaa » + Entree : rapprochement champ affiche = champs d'origine = dates de
 *    la requete envoyee au serveur, reponse sans erreur ;
 *  - calendrier : un clic dans le champ l'ouvre, cases « Du » et « Au » ; premier clic = debut, second = fin : meme
 *    rapprochement ;
 *  - 1366×768, 1280×720 et 1920×1080 : champ entier dans sa barre, sans chevauchement, barre du champ sans debordement.
 * Lecture seule : aucune ecriture en base (les recherches ne font que lire).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const q = (x) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', x], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const D = (d) => d.toISOString().slice(0, 10);
const jour = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const fr = (d) => D(d).split('-').reverse().join('/');

/* menu parent, composant du menu (le libelle affiche est lu en base : il change d'une base a l'autre), libelle par
 * defaut, xtype de l'ecran, champ de fin, champ de debut ; onglet : bouton a cliquer avant ; organisme : l'onglet
 * Pointage ne recharge sa liste qu'avec un organisme choisi */
const libelle = (composant, defaut) => q(`SELECT str_DESCRIPTION FROM t_sous_menu WHERE str_COMPOSANT = '${composant}' AND str_Status = 'enable' LIMIT 1`) || defaut;
const ECRANS = [
  { parent: 'SERVICE CLIENT', menu: libelle('ventemanager', 'Vente terminées'), xtype: 'ventemanager', fin: 'ventemanager #dtEnd', debut: 'ventemanager #dtStart' },
  { parent: 'GESTION COURANTE', menu: libelle('facturesubrogatoireother', 'Liste des Bons par Organisme'), xtype: 'bonsorganismeonglets', onglet: 'bonsorganismeonglets #bo-pointage', organisme: 'pointagebons #ptOrganisme', fin: 'pointagebons #ptFin', debut: 'pointagebons #ptDebut' },
  { parent: 'GESTION COURANTE', menu: libelle('articlevendurecapitulatif', 'Liste des articles vendus récap'), xtype: 'articlevendurecapitulatif', fin: 'articlevendurecapitulatif #dt_fin', debut: 'articlevendurecapitulatif #dt_debut' },
  { parent: 'GESTION COURANTE', menu: libelle('articlevendumanager', 'Liste des articles vendus'), xtype: 'articlevendumanager', fin: 'articlevendumanager #dt_Date_Fin', debut: 'articlevendumanager #dt_Date_Debut' },
  { parent: 'ANALYSE DE GESTION', menu: libelle('tvastat', 'Statistique sur TVA2'), xtype: 'tvastat', fin: 'tvastat #dtEnd', debut: 'tvastat #dtStart' },
  { parent: 'ANALYSE DE GESTION', menu: libelle('tableauPhama', 'Tableau de bord du pharmacien2'), xtype: 'tableauPhama', fin: 'tableauPhama #dtEnd', debut: 'tableauPhama #dtStart' },
  { parent: 'ANALYSE DE GESTION', menu: libelle('activitiessummary', 'Récapitulatif activité'), xtype: 'activitiessummary', fin: 'activitiessummary #dt_end_activities', debut: 'activitiessummary #dt_start_activities' }
];

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    for (const E of ECRANS) {
      const nom = E.menu + (E.onglet ? ' (Pointage)' : '');
      await V.ouvrirMenu(p, E.parent, E.menu);
      await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), E.xtype, { timeout: 60000 });
      await p.waitForTimeout(2500);
      if (E.onglet) { await V.cliquer(p, E.onglet); await p.waitForTimeout(2000); }
      if (E.organisme) { const choisi = await V.choisir(p, E.organisme, 0); console.log('organisme : ' + choisi); await p.waitForTimeout(2500); }
      await p.waitForFunction((x) => { const f = Ext.ComponentQuery.query(x)[0]; return f && f.champPeriode && f.champPeriode.rendered; }, E.fin, { timeout: 20000 }).catch(() => {});
      const etat = () => p.evaluate(([qf, qd]) => { const f = Ext.ComponentQuery.query(qf)[0], d = Ext.ComponentQuery.query(qd)[0], c = f && f.champPeriode;
        const r = c && c.getEl().dom.getBoundingClientRect(), barre = c && c.ownerCt.getEl().dom.getBoundingClientRect();
        const voisins = c ? c.ownerCt.items.items.filter((x) => x !== c && x.isVisible(true) && x.getEl()).map((x) => x.getEl().dom.getBoundingClientRect()) : [];
        const inner = c && c.ownerCt.layout && c.ownerCt.layout.innerCt ? c.ownerCt.layout.innerCt.dom : null;
        return { existe: !!c, visible: !!c && c.isVisible(true), texte: c ? c.getValue() : '', du: d ? d.getSubmitValue() || '' : null, au: f ? f.getSubmitValue() || '' : null,
          duTexte: d && d.getValue() ? Ext.Date.format(d.getValue(), 'd/m/Y') : '', auTexte: f && f.getValue() ? Ext.Date.format(f.getValue(), 'd/m/Y') : '',
          masques: !!d && !!f && !d.isVisible(true) && !f.isVisible(true),
          largeur: r ? Math.round(r.width) : 0,
          entier: !!r && r.left >= barre.left - 1 && r.right <= barre.right + 1 && r.width > 150,
          chevauche: !!r && voisins.some((v) => v.right > r.left + 1 && v.left < r.right - 1 && v.bottom > r.top + 1 && v.top < r.bottom - 1),
          deborde: inner ? inner.scrollWidth > c.ownerCt.getEl().dom.clientWidth + 2 : false, input: c ? c.inputEl.dom.id : null }; }, [E.fin, E.debut]);
      const e0 = await etat();
      ok(`${nom} : un seul champ « période » visible, de 190 à 215 px (comme en facturation), les deux champs d'origine masqués, dates d'ouverture reprises`, e0.existe && e0.visible && e0.masques
        && e0.largeur >= 190 && e0.largeur <= 215
        && e0.texte === (e0.duTexte || e0.auTexte ? e0.duTexte + ' → ' + e0.auTexte : ''), JSON.stringify(e0));
      if (!e0.existe) { continue; }
      const verifier = async (libelle, action, d1, d2) => {
        const [rep] = await Promise.all([p.waitForResponse((r) => { const x = r.request(); const t = decodeURIComponent(x.url()) + ' ' + (x.postData() || '');
          return x.resourceType() === 'xhr' && t.indexOf(D(d1)) >= 0 && t.indexOf(D(d2)) >= 0; }, { timeout: 90000 }).catch(() => null), action()]);
        await p.waitForTimeout(600);
        const e = await etat();
        const corps = rep ? await rep.text().catch(() => '') : '';
        ok(`${nom} : ${libelle} → champ = Du/Au = dates de la requête, réponse sans erreur`,
          e.texte === fr(d1) + ' → ' + fr(d2) && e.du === D(d1) && e.au === D(d2) && rep && rep.status() === 200 && !/"success"\s*:\s*false/.test(corps),
          JSON.stringify({ texte: e.texte, du: e.du, au: e.au, requete: rep ? rep.url().replace(/^.*\/prestige\//, '').slice(0, 160) : null, http: rep && rep.status() }));
      };
      const a1 = jour(-9), a2 = jour(-4);
      await verifier(`saisie « ${fr(a1)} → ${fr(a2)} » + Entrée`, async () => {
        await p.click('#' + e0.input); await p.keyboard.press('Escape'); await p.keyboard.press('Control+A'); await p.keyboard.type(fr(a1) + ' → ' + fr(a2), { delay: 10 }); await p.keyboard.press('Enter');
      }, a1, a2);
      /* calendrier : clic dans le champ, cases, deux clics */
      const cellule = (d) => p.evaluate((t) => { const pan = Ext.ComponentQuery.query('container[cls~=champ-periode-panneau]').find((x) => x.isVisible());
        const cal = pan && pan.down('#calendrier'); let cible = null;
        if (!cal) { return null; }
        cal.cells.each((c) => { const a = c.dom.firstChild; if (a && a.dateValue && new Date(a.dateValue).toDateString() === new Date(t).toDateString()) { cible = a; } });
        if (!cible) { return null; } cible.id = cible.id || 'e2e-j-' + Math.random().toString(36).slice(2); return cible.id; }, d.getTime());
      await p.click('#' + e0.input); await p.waitForTimeout(400);
      const cases = await p.evaluate(() => { const pan = Ext.ComponentQuery.query('container[cls~=champ-periode-panneau]').find((x) => x.isVisible());
        return pan ? Array.from(pan.getEl().dom.querySelectorAll('.champ-periode-case')).map((c) => c.textContent.replace(/\s+/g, ' ').trim()) : null; });
      ok(`${nom} : un clic dans le champ ouvre le calendrier, cases « Du ${fr(a1)} » et « Au ${fr(a2)} »`, cases && cases[0] === 'Du ' + fr(a1) && cases[1] === 'Au ' + fr(a2), JSON.stringify(cases));
      const b1 = jour(-6), b2 = jour(-2);
      const id1 = await cellule(b1);
      if (id1) { await p.click('#' + id1); await p.waitForTimeout(250); }
      const id2 = await cellule(b2);
      await verifier(`calendrier, début puis fin (${fr(b1)} → ${fr(b2)})`, () => (id2 ? p.click('#' + id2) : Promise.resolve()), b1, b2);
      for (const [l, h] of [[1366, 768], [1280, 720], [1920, 1080]]) {
        await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(700);
        const e = await etat();
        ok(`${nom} : ${l}×${h}, champ entier dans sa barre, sans chevauchement ni débordement`, e.visible && e.entier && !e.chevauche && !e.deborde, JSON.stringify({ entier: e.entier, chevauche: e.chevauche, deborde: e.deborde }));
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
