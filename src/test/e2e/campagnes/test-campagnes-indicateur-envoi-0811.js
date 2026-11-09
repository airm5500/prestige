/* PLAN DU 08/11, POINT 6 : INDICATEUR D'ENVOI DES CAMPAGNES SMS / WHATSAPP (resume apres l'envoi, reponse Q5).
 *
 * Jeu d'essai (retire a la fin) : deux campagnes envoyees.
 *  - W (WhatsApp, 7 clients) : 2 lus, 1 distribue, 1 envoye, 1 echec, 1 sans message (en attente), 1 ecarte ;
 *  - S (SMS, 5 clients)      : 2 distribues (DELIVERED_TO_TERMINAL), 1 envoye (SENT), 1 en attente, 1 ecarte.
 * Attendu (une seule regle, celle du suivi) :
 *   W : 4 envoyes · 3 distribues · 2 lus · 1 echec · 1 en attente
 *   S : 3 envoyes · 2 distribues · 0 lu · 0 echec · 1 en attente
 * Avant : le journal ne comptait distribues / lus / echecs que pour WhatsApp et « Partis » que pour le SMS : la ligne
 * du journal et le suivi de la meme campagne ne donnaient pas les memes chiffres.
 * Par les vues (admin), Campagnes > Journal :
 *  - colonne « Envoi » : barre et resume en clair ; colonnes Partis / Distribués / Lus / Échecs ;
 *  - un clic sur l'indicateur ouvre le suivi sous le journal (pas de fenetre) ;
 *  - rapprochement, campagne par campagne : indicateur = colonnes du journal = totaux du suivi = lignes du suivi =
 *    base (attendu ci-dessus) ; segments de la barre proportionnels ;
 *  - ergonomie : le resume tient dans sa colonne a 1366 px, info-bulle ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const W = 'E2E-CIND-W', S = 'E2E-CIND-S';
const LIGNES = {
  [W]: [['LU', 'LU'], ['LU2', 'LU'], ['DELIVRE', 'DELIVRE'], ['ENVOYE', 'ENVOYE'], ['ECHEC', 'ECHEC'], ['ATTENTE', null], ['EXCLU', null]],
  [S]: [['DIST', 'DELIVERED_TO_TERMINAL'], ['DIST2', 'DELIVERED_TO_TERMINAL'], ['SENT', ''], ['ATTENTE', null], ['EXCLU', null]]
};
const ATTENDU = { [W]: { envoyes: 4, distribues: 3, lus: 2, echecs: 1, attente: 1, exclus: 1 }, [S]: { envoyes: 3, distribues: 2, lus: 0, echecs: 0, attente: 1, exclus: 1 } };

function nettoyer() {
  q("DELETE FROM whatsapp_message WHERE id LIKE 'E2E-CIND-%'; DELETE FROM notification_client WHERE id LIKE 'E2E-CIND-%';"
    + ` DELETE FROM t_campagne_ligne WHERE campagne_id IN ('${W}', '${S}'); DELETE FROM t_campagne WHERE id IN ('${W}', '${S}');`
    + " DELETE FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-CIND-%';");
}

(async () => {
  nettoyer();
  [[W, 'WHATSAPP'], [S, 'SMS']].forEach(([camp, canal], k) => {
    const l = LIGNES[camp];
    q(`INSERT INTO t_campagne (id, categorie, origine, statut, canal, nb_cibles, nb_envoyes, nb_exclus, created_at, traitee_at)`
      + ` VALUES ('${camp}', 'INFO_CLIENTS', 'MANUEL', 'ENVOYEE', '${canal}', ${l.length}, ${l.length - 1}, 1, NOW(), NOW() + INTERVAL ${2 + k} DAY)`);
    l.forEach(([nom, etat], i) => {
      const id = `${camp}-C${i}`, tel = '2299000' + (k ? '18' : '17') + String(i).padStart(2, '0'), notif = `${camp}-N${i}`;
      q(`INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_ADRESSE, lg_TYPE_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('${id}', 'E2EIND', '${camp.slice(-1)}${nom}', '${tel}', '6', 'enable', NOW())`);
      const exclu = nom === 'EXCLU';
      q(`INSERT INTO t_campagne_ligne (campagne_id, lg_CLIENT_ID, retenu, statut, motif, lg_NOTIFICATION_ID) VALUES ('${camp}', '${id}', ${exclu ? "b'0', 'EXCLU', 'Sans numéro'" : "b'1', 'PREPARE', NULL"}, ${exclu ? 'NULL' : `'${notif}'`})`);
      if (exclu || etat === null) { return; }
      if (camp === W) {
        q(`INSERT INTO whatsapp_message (id, notification_id, client_id, telephone, mode, simule, statut, created_at) VALUES ('${camp}-M${i}', '${notif}', '${id}', '${tel}', 'WEB', 0, '${etat}', NOW() - INTERVAL 1 HOUR)`);
      } else {
        q(`INSERT INTO notification_client (id, notification_id, client_id, statut, sent_at, delivery_status) VALUES ('${camp}-NC${i}', '${notif}', '${id}', 'SENT', NOW() - INTERVAL 1 HOUR, ${etat ? "'" + etat + "'" : 'NULL'})`);
      }
    });
  });

  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CAMPAGNES SMS / WHATSAPP', 'Campagnes');
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('campagnes')[0]; return v && v.contexte; }, null, { timeout: 60000 });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('campagnes')[0].down('#ongletJournal').tab.getEl().dom.id));
    await p.waitForFunction((ids) => ids.every((id) => Ext.ComponentQuery.query('campagnes #journal')[0].getStore().findExact('id', id) >= 0), [W, S], { timeout: 30000 });
    await p.waitForTimeout(500);
    for (const camp of [W, S]) {
      const a = ATTENDU[camp], nom = camp === W ? 'W (WhatsApp)' : 'S (SMS)';
      const j = await p.evaluate((id) => {
        const g = Ext.ComponentQuery.query('campagnes #journal')[0], i = g.getStore().findExact('id', id), r = g.getStore().getAt(i), n = g.getView().getNode(i);
        const col = g.columns.find((c) => c.text === 'Envoi'), td = n.querySelector('.x-grid-cell-' + col.id);
        const t = td.querySelector('.cmp-envoi-texte'), barre = td.querySelector('.cmp-envoi-barre');
        const segs = {}; barre.querySelectorAll('.cmp-envoi-seg').forEach((s) => { segs[s.className.split(' ').pop()] = s.getBoundingClientRect().width; });
        td.id = td.id || 'e2e-envoi-' + i;
        return { id: td.id, texte: t.innerText, tronque: t.scrollWidth > t.clientWidth + 1, qtip: td.getAttribute('data-qtip') || '', segs, barre: barre.getBoundingClientRect().width,
          cols: { partis: r.get('partis'), distribues: r.get('distribues'), lus: r.get('lus'), echecs: r.get('echecs'), attente: r.get('enAttente') } };
      }, camp);
      const resume = `${a.envoyes} envoyé${a.envoyes > 1 ? 's' : ''} · ${a.distribues} distribué${a.distribues > 1 ? 's' : ''} · ${a.lus} lu${a.lus > 1 ? 's' : ''} · ${a.echecs} échec${a.echecs > 1 ? 's' : ''}`
        + (a.attente ? ` · ${a.attente} en attente` : '');
      ok(`${nom} : indicateur « ${resume} »`, j.texte === resume, j.texte);
      ok(`${nom} : colonnes du journal = indicateur = base (Partis ${a.envoyes}, Distribués ${a.distribues}, Lus ${a.lus}, Échecs ${a.echecs})`,
        j.cols.partis === a.envoyes && j.cols.distribues === a.distribues && j.cols.lus === a.lus && j.cols.echecs === a.echecs && j.cols.attente === a.attente, JSON.stringify(j.cols));
      const total = a.envoyes + a.echecs + a.attente, part = (x) => j.barre * x / total;
      const attSeg = { lu: a.lus, distribue: a.distribues - a.lus, envoye: a.envoyes - a.distribues, attente: a.attente, echec: a.echecs };
      const ecartsBarre = Object.entries(attSeg).filter(([k, x]) => Math.abs((j.segs[k] || 0) - part(x)) > 1.5);
      ok(`${nom} : segments de la barre proportionnels (lus, distribués, envoyés, en attente, échecs)`, ecartsBarre.length === 0, JSON.stringify({ segs: j.segs, barre: j.barre }));
      ok(`${nom} : le résumé tient dans la colonne à 1366 px, info-bulle avec le résumé`, !j.tronque && j.qtip.indexOf(resume) === 0, JSON.stringify({ tronque: j.tronque, qtip: j.qtip }));
      /* clic sur l'indicateur : suivi sous le journal */
      await p.click('#' + j.id);
      await p.waitForFunction((n) => { const s = Ext.ComponentQuery.query('campagnes #suivi')[0]; return s && s.isVisible(true) && s.getStore().getCount() === n; }, LIGNES[camp].length, { timeout: 30000 });
      await p.waitForTimeout(400);
      const s = await p.evaluate(() => { const g = Ext.ComponentQuery.query('campagnes #suivi')[0], c = {};
        g.getStore().each((r) => { c[r.get('etat')] = (c[r.get('etat')] || 0) + 1; });
        return { c, totaux: Ext.ComponentQuery.query('campagnes #suiviTotaux')[0].getEl().dom.innerText, titre: g.title,
          fenetres: Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).length }; });
      const nb = (re) => { const m = s.totaux.match(re); return m ? Number(m[1]) : -1; };
      const lignesOk = (s.c['Lu'] || 0) === a.lus && (s.c['Distribué'] || 0) === a.distribues - a.lus && (s.c['Envoyé'] || 0) === a.envoyes - a.distribues
        && (s.c['Échec'] || 0) === a.echecs && (s.c['En attente'] || 0) === a.attente && (s.c['Exclu'] || 0) === a.exclus;
      ok(`${nom} : clic sur l'indicateur -> suivi sous le journal, sans fenêtre ; lignes du suivi = totaux du suivi = indicateur`,
        s.fenetres === 0 && lignesOk && nb(/Envoyés\s*:?\s*(\d+)/) === a.envoyes && nb(/Distribués\s*:?\s*(\d+)/) === a.distribues && nb(/Lus\s*:?\s*(\d+)/) === a.lus
        && nb(/Échecs\s*:?\s*(\d+)/) === a.echecs, JSON.stringify(s));
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_campagne WHERE id IN ('${W}', '${S}')`) === '0' && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID LIKE 'E2E-CIND-%'") === '0'
      && q("SELECT COUNT(*) FROM notification_client WHERE id LIKE 'E2E-CIND-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
