/* IMPRESSION « LISTE DES CAISSES » (BalancePdfServlet, mode LISTECAISSE) - audit des exports apres le journal du 15/10.
 *
 * Chaque mouvement de caisse etait charge entier, avec, un par un, sa vente liee et les liens de celle-ci : 39 s pour un
 * mois sur le banc (16 565 mouvements). Seules les colonnes utiles sont lues. Ce que le test etablit (lecture seule) :
 *  - un mois en moins de 10 s ;
 *  - pour chaque caissier, autant de mouvements imprimes que dans la base (hors achats, periode et heures demandees).
 * Le modele de l'officine n'est pas dans le depot : le test pose un modele qui imprime les donnees, et le retire.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const DOSSIER = '/opt/CONF/LABOREX/REPORTS', M = 'rp_listecaisses1';
const F = ['operateur:String', 'datas:java.util.List'];
const posee = !fs.existsSync(path.join(DOSSIER, M + '.jrxml')) && !fs.existsSync(path.join(DOSSIER, M + '.jasper'));
if (posee) {
  fs.writeFileSync(path.join(DOSSIER, M + '.jrxml'), '<?xml version="1.0" encoding="UTF-8"?>\n<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" name="' + M
    + '" pageWidth="1400" pageHeight="842" orientation="Landscape" columnWidth="1360" leftMargin="20" rightMargin="20" topMargin="20" bottomMargin="20">'
    + '<parameter name="P_H_CLT_INFOS" class="java.lang.String"/><parameter name="totaux" class="java.util.List"/>' + F.map((x) => '<field name="' + x.split(':')[0] + '" class="' + (x.split(':')[1].includes('.') ? x.split(':')[1] : 'java.lang.' + x.split(':')[1]) + '"/>').join('')
    + '<detail><band height="12"><textField isBlankWhenNull="true"><reportElement x="0" y="0" width="1360" height="12"/><textElement><font size="6"/></textElement><textFieldExpression><![CDATA["L|" + '
    + '$F{operateur} + "|" + $F{datas}.size() + "|" + org.apache.commons.codec.digest.DigestUtils.md5Hex(String.valueOf($F{datas}))' + ']]></textFieldExpression></textField></band></detail><summary><band height="400"><textField isStretchWithOverflow="true" isBlankWhenNull="true"><reportElement x="0" y="0" width="1360" height="12"/><textElement><font size="6"/></textElement><textFieldExpression><![CDATA["T|" + String.valueOf($P{totaux})]]></textFieldExpression></textField></band></summary></jasperReport>');
}
(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true }); const p = await b.newPage();
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html'); await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const d = '2026-09-01', f = '2026-09-30';
    const t = Date.now();
    const r = await p.evaluate(async (u) => { const x = await fetch(u); return { url: x.url, t: (await x.text()).slice(0, 300) }; },
      '../BalancePdfServlet?mode=LISTECAISSE&startDate=' + d + '&endDate=' + f + '&startH=' + (process.env.H1 || '00:00') + '&endH=' + (process.env.H2 || '23:59') + '&user=&reglement=');
    const ms = Date.now() - t;
    let lien = null; try { const j = JSON.parse(r.t); lien = j.msg || j.url; } catch (e) { if (/\/data\/reports\//.test(r.url)) { lien = r.url; } }
    const fichier = lien ? path.join(DOSSIER, 'pdf', path.basename(lien.split('?')[0])) : null;
    const lignes = fichier && fs.existsSync(fichier) ? execFileSync('pdftotext', ['-layout', fichier, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').map((l) => l.trim()).filter((l) => l.startsWith('L|') || l.startsWith('T|') || /SumCaisseDTO/.test(l)) : [];
    if (fichier && fs.existsSync(fichier)) { fs.unlinkSync(fichier); }
    ok('Un mois en moins de 10 s', ms < 10000 && lignes.length > 0, ms + ' ms ' + (lignes.length ? '' : r.t.slice(0, 120)));
    const base = {};
    q("SELECT CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME), COUNT(*) FROM mvttransaction m JOIN t_user u ON u.lg_USER_ID = m.caisse WHERE m.lg_EMPLACEMENT_ID = '1'"
      + " AND m.typeTransaction <> 2 AND m.createdAt BETWEEN '" + d + " 00:00:00' AND '" + f + " 23:59:00' GROUP BY 1").split('\n').filter(Boolean)
      .forEach((l) => { const [n, c] = l.split('\t'); base[n] = Number(c); });
    const imp = {}; lignes.filter((l) => l.startsWith('L|')).forEach((l) => { const p2 = l.split('|'); imp[p2[1]] = Number(p2[2]); });
    ok('Par caissier : autant de mouvements imprimés que dans la base', Object.keys(base).length > 0 && JSON.stringify(Object.entries(imp).sort()) === JSON.stringify(Object.entries(base).sort()),
      JSON.stringify(imp).slice(0, 200));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    if (posee) { for (const e of ['.jrxml', '.jasper']) { const x = path.join(DOSSIER, M + e); if (fs.existsSync(x)) { fs.unlinkSync(x); } } }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
