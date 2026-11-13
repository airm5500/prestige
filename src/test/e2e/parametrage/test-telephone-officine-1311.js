/* TELEPHONE DE L'OFFICINE DOUBLE APRES ENREGISTREMENT (plan du 12/11, « Identification de l'officine » : « quand on
 * saisit 0102030405;0404040506, apres enregistrement le menu affiche 0102030405;0404040506;0102030405;0404040506 »).
 *
 * Vrai chemin de l'ecran, sur une COPIE de travail (DB_TEST + E2E_BASE_LIBRE) : menu > Informations officine, champ
 * « Telephone », « Enregistrer », retour au menu, puis reouverture de l'ecran par le menu.
 *
 * Cause : seul « ; » separait les numeros ; une saisie « A,B » (ou un seul numero) etait recopiee dans str_PHONE ET
 * dans str_AUTRESPHONES, et l'ecran relisait « A,B;A,B » (constate sur la copie tiassale).
 *
 * Jeu d'essai varie (numeros factices 0100000xxx, jamais un vrai numero) : fiche deja abimee par l'ancien
 * enregistrement, deux numeros, le meme enregistre deux fois de suite, un seul numero, separateurs « , » et « / »,
 * trois numeros, des espaces autour du separateur, des espaces dans les numeros, un « ; » final, un doublon dans la
 * saisie, puis un champ vide.
 * Controles, pour chaque saisie :
 *  - rapprochement : champ rouvert = reponse de l'API de lecture = t_officine (str_PHONE ; str_AUTRESPHONES) = en-tete
 *    du PDF « Analyse tiers payants » (Tel: (+225) 01-00-.. / ..) = attendu (numeros dans l'ordre, sans doublon, sans
 *    vide) ;
 *  - bilan : seule la fiche de l'officine change (une ligne), aucune autre table touchee par l'enregistrement ;
 *  - aucune erreur JavaScript, aucun message d'echec.
 * La fiche de l'officine est remise a l'identique a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, texteMessage } = require('../outils/vues');
const { fichierEdition } = require('../support/editions');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });

const SAUV = 'zz_e2e_officine_1311';
const COLS = ['str_NOM_ABREGE', 'str_NOM_COMPLET', 'str_ADRESSSE_POSTALE', 'dt_UPDATED', 'str_FIRST_NAME', 'str_LAST_NAME', 'str_PHONE',
  'str_COMMENTAIRE1', 'str_COMMENTAIRE2', 'str_ENTETE', 'str_COMPTE_CONTRIBUABLE', 'str_REGISTRE_COMMERCE', 'str_REGISTRE_IMPOSITION',
  'str_CENTRE_IMPOSITION', 'str_NUM_COMPTABLE', 'str_COMMENTAIREOFFICINE', 'str_COMPTE_BANCAIRE', 'str_AUTRESPHONES'];

/* numeros attendus pour une saisie : decoupe sur « ; , / | », espaces retires, vides et doublons ecartes, ordre garde */
function attendus(saisie) {
  const vus = [];
  saisie.split(/[;/,|]/).map((s) => s.trim()).filter((s) => s).forEach((s) => { if (!vus.includes(s)) { vus.push(s); } });
  return vus;
}

/* empreinte des tables (hors t_officine) que l'enregistrement ne doit pas toucher */
const TABLES = ['t_event_log', 'notification', 'mvttransaction', 't_mvt_caisse', 't_user'];
const empreinte = () => TABLES.map((t) => t + '=' + q('SELECT COUNT(*) FROM ' + t)).join(' ');

(async () => {
  if (q('SELECT COUNT(*) FROM t_officine') !== '1') { throw new Error('t_officine doit avoir une seule ligne'); }
  exec('DROP TABLE IF EXISTS ' + SAUV + '; CREATE TABLE ' + SAUV + ' AS SELECT * FROM t_officine;');
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const libelles = await p.evaluate(() => {
      const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'info_officine', true);
      return n ? { parent: n.parentNode.get('text'), entree: n.get('text') } : null;
    });
    if (!libelles) { throw new Error('menu info_officine absent pour ce compte'); }

    const ouvrir = async () => {
      await ouvrirMenu(p, libelles.parent, libelles.entree);
      await p.waitForFunction(() => { const c = Ext.getCmp('str_PHONE'); const v = Ext.ComponentQuery.query('info_officine')[0];
        return c && v && v.isVisible(true) && c.isVisible(true) && typeof OFFICINE !== 'undefined' && OFFICINE; }, null, { timeout: 60000 });
      await p.waitForTimeout(400);
    };

    /* texte du PDF « Analyse tiers payants » (en-tete : adresse et telephones de l'officine, ReportUtil.officineData) */
    const textePdf = async () => {
      const r = await p.evaluate(async () => { const x = await fetch('../api/v1/analyse-tierspayant/print?dtStart=2026-11-01&dtEnd=2026-11-01&niveau=TIERS&query=&tri=&groupeId=&tiersPayantId=');
        return x.text(); });
      let j = null; try { j = JSON.parse(r); } catch (e) { return 'reponse illisible : ' + r.slice(0, 200); }
      const lien = j.msg || j.url || j.data;
      const f = lien ? fichierEdition(lien) : null;
      if (!f || !fs.existsSync(f)) { return 'PDF absent : ' + r.slice(0, 200); }
      return execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\s+/g, ' ');
    };
    /* mise en forme d'un numero dans les PDF (DateConverter.groupLocalPhone) */
    const enPaires = (n) => { let d = n.replace(/[\s.]/g, ''); if (!/^\d+$/.test(d)) { return ''; } if (d.length === 9 && d[0] !== '0') { d = '0' + d; } return d.replace(/(\d\d)(?=\d)/g, '$1-'); };

    /* abime : la fiche est d'abord mise dans l'etat laisse par l'ancien enregistrement (saisie « A,B » recopiee dans les
       deux colonnes), puis l'ecran est ouvert et enregistre sans rien toucher */
    const CAS = [
      { abime: '0100000020,0100000021', attendu: '0100000020;0100000021' },
      { saisie: '0100000001;0100000002' },
      { saisie: '0100000001;0100000002' },
      { saisie: '0100000003' },
      { saisie: '0100000004,0100000005' },
      { saisie: '0100000004;0100000005;0100000006' },
      { saisie: ' 0100000007 / 0100000008 ' },
      { saisie: '01 00 00 00 12;01 00 00 00 13' },
      { saisie: '0100000009;' },
      { saisie: '0100000010;0100000011;0100000010' },
      { saisie: '' },
    ];
    let k = 0;
    let ouvert = false;
    for (const c of CAS) {
      k++;
      const nom = 'cas ' + k + (c.abime !== undefined ? ' fiche abimee « ' + c.abime + ' »' : ' saisie « ' + c.saisie + ' »');
      if (c.abime !== undefined) {
        exec("UPDATE t_officine SET str_PHONE = '" + c.abime + "', str_AUTRESPHONES = '" + c.abime + "'");
      }
      if (!ouvert) { await ouvrir(); }
      if (c.abime !== undefined) {
        const lu = await p.evaluate(() => Ext.getCmp('str_PHONE').getValue());
        ok(nom + ' : champ a l\'ouverture sans doublon', lu === c.attendu, 'champ ' + lu + ' attendu ' + c.attendu);
      }
      const avant = empreinte();
      if (c.saisie !== undefined) {
        await cliquer(p, '#str_PHONE');
        await p.keyboard.press('Control+A');
        await p.keyboard.press('Delete');
        if (c.saisie) { await p.keyboard.type(c.saisie, { delay: 10 }); }
        await p.keyboard.press('Tab');
      }
      await cliquer(p, '#btn_savemyaccountID');
      await p.waitForFunction(() => Ext.ComponentQuery.query('messagebox{isVisible()}').length > 0, null, { timeout: 30000 });
      const message = await texteMessage(p);
      ok(nom + ' : enregistrement accepte', /succes/i.test(message), message);
      await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').forEach((m) => m.close()));
      const att = attendus(c.saisie !== undefined ? c.saisie : c.abime);
      const base = q('SELECT CONCAT(IFNULL(str_PHONE,\'<null>\'), \'|\', IFNULL(str_AUTRESPHONES,\'<null>\')) FROM t_officine').split('|');
      const enBase = [base[0], ...(base[1] && base[1] !== '<null>' ? base[1].split(';') : [])];
      ok(nom + ' : base = attendu (premier numero ; les suivants)', JSON.stringify(enBase.filter((x) => x)) === JSON.stringify(att)
        && enBase.slice(1).every((x) => x) && base[0] !== '<null>', 'base ' + JSON.stringify(enBase) + ' attendu ' + JSON.stringify(att));
      const api = await p.evaluate(async () => { const r = await fetch('../api/v1/officine/infos'); return (await r.json())[0].str_PHONE; });
      ok(nom + ' : API de lecture = attendu', (api || '') === att.join(';'), 'api ' + api + ' attendu ' + att.join(';'));
      const pdf = (await textePdf()).replace(/\s+/g, '');
      const ligneTel = att.length ? 'Tel:(+225)' + att.map(enPaires).join('/') : '';
      ok(nom + ' : PDF = attendu, chaque numero une fois', att.length
        ? pdf.indexOf(ligneTel) >= 0 && att.every((n) => pdf.split(enPaires(n)).length === 2)
        : pdf.length > 0 && pdf.indexOf('Tel:') < 0, 'attendu ' + (ligneTel || '(aucun Tel:)') + ' ; PDF ' + (pdf.match(/Tel:[^A-Za-z]{0,120}/) || [pdf.slice(0, 160)])[0]);
      await ouvrir();
      ouvert = true;
      const champ = await p.evaluate(() => Ext.getCmp('str_PHONE').getValue());
      ok(nom + ' : champ rouvert = attendu', champ === att.join(';'), 'champ ' + champ + ' attendu ' + att.join(';'));
      ok(nom + ' : bilan, aucune autre table touchee', empreinte() === avant, avant + ' / ' + empreinte());
    }
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('deroulement du test', false, e.stack);
  } finally {
    await b.close();
    exec('UPDATE t_officine o JOIN ' + SAUV + ' s ON s.lg_OFFICINE_ID = o.lg_OFFICINE_ID SET ' + COLS.map((c) => 'o.' + c + ' = s.' + c).join(', ') + '; DROP TABLE ' + SAUV + ';');
  }
  const n = res.filter((r) => r.c).length;
  console.log('===== ' + n + '/' + res.length + (n === res.length ? ' PASS' : ' ECHEC') + ' =====');
  process.exit(n === res.length ? 0 : 1);
})();
