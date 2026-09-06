/* Point 24 : normalisation du nom / des prenoms a la creation d'un client depuis une vente
   assurance ou carnet, et avertissement de doublon.
   Les appels sont faits depuis la page apres connexion, pour beneficier de la session. */
const { chromium } = require('playwright-core');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 220) + ']' : '')); }

const CARNET = process.env.CARNET_ID || '16131133926037859341';
const SUFFIXE = String(Date.now()).slice(-6);
const NOM = 'KONANTEST' + SUFFIXE;
const PRENOMS = 'ALIDATEST' + SUFFIXE;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
  await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
  await p.waitForURL('**/general/**', { timeout: 30000 });
  await p.waitForTimeout(2500);

  const poster = (url, body) => p.evaluate(async ([u, b]) => {
    const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    return { status: r.status, body: await r.text() };
  }, [url, body]);

  const base = (nom, prenoms, extra) => Object.assign({
    lgCLIENTID: '', lgTIERSPAYANTID: CARNET, strLASTNAME: nom, strFIRSTNAME: prenoms,
    strSEXE: 'F', strADRESSE: '', strCODEPOSTAL: '', strNUMEROSECURITESOCIAL: '',
    intPOURCENTAGE: 100, intPRIORITY: 1, dtNAISSANCE: '', lgVILLEID: '', lgTYPECLIENTID: ''
  }, extra || {});

  // 1 - creation avec des espaces de fin : le serveur doit les retirer
  let r = await poster('../api/v1/client/add/carnet', base(NOM + '  ', PRENOMS + ' '));
  let j = JSON.parse(r.body);
  ok('creation client carnet acceptee', j.success === true, r.body);
  const clientId = j.success ? j.data.lgCLIENTID : null;
  ok('nom enregistre sans espace de fin', j.success && j.data.strLASTNAME === NOM, j.success ? JSON.stringify(j.data.strLASTNAME) : r.body);
  ok('prenoms enregistres sans espace de fin', j.success && j.data.strFIRSTNAME === PRENOMS, j.success ? JSON.stringify(j.data.strFIRSTNAME) : r.body);

  // 2 - meme identite avec des espaces differents : doit etre reconnue comme doublon
  r = await poster('../api/v1/client/add/carnet', base(NOM + ' ', PRENOMS + '   '));
  j = JSON.parse(r.body);
  ok('doublon detecte malgre les espaces de fin', j.success === false && j.doublonClient === true, r.body);
  ok('le client existant est propose', Array.isArray(j.doublons) && j.doublons.some(c => c.lgCLIENTID === clientId), JSON.stringify(j.doublons));

  // 3 - creation forcee explicitement : elle passe
  r = await poster('../api/v1/client/add/carnet', base(NOM, PRENOMS, { forcerCreation: true }));
  j = JSON.parse(r.body);
  ok('creation forcee acceptee apres confirmation', j.success === true, r.body);
  const clientId2 = j.success ? j.data.lgCLIENTID : null;

  // 4 - une identite differente n'est pas signalee
  r = await poster('../api/v1/client/add/carnet', base(NOM + 'X', PRENOMS));
  j = JSON.parse(r.body);
  ok('identite differente creee sans avertissement', j.success === true, r.body);
  const clientId3 = j.success ? j.data.lgCLIENTID : null;

  // 5 - meme controle sur le circuit assurance
  r = await poster('../api/v1/client/add/assurance', base(NOM, PRENOMS, { lgTIERSPAYANTID: CARNET }));
  j = JSON.parse(r.body);
  ok('doublon detecte aussi sur le circuit assurance', j.success === false && j.doublonClient === true, r.body);

  console.log('CREES=' + [clientId, clientId2, clientId3].filter(Boolean).join(','));
  await b.close();
  const kos = res.filter(x => !x.c).length;
  console.log('\n===== ' + (res.length - kos) + '/' + res.length + (kos ? ' FAIL' : ' PASS') + ' =====');
  process.exit(kos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
