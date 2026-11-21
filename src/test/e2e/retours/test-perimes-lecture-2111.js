/* PLAN DU 21/11, POINT 17 : recherche des perimes. Le nombre et les totaux sont lus en une passe (au lieu de deux
 * requetes), et les lots sont lus en premier (STRAIGHT_JOIN, index dt_PEREMPTION/current_stock) : sur la copie
 * d'appaul, 2,4 s -> 42 ms pour un appel de l'ecran. Le badge reste un simple compte.
 * Rapprochement : pour des filtres varies (sans filtre, 1 et 6 mois, periode, recherche CIP/nom, rayon, grossiste,
 * famille, pages 1 et 2, filtre sans resultat), l'API (lignes, ordre, nombre, totaux), le badge, le compte des
 * produits et le CSV = l'ANCIENNE requete d'Hibernate rejouee en base, sans l'indication d'ordre.
 * Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s.replace(/\s*\n\s*/g, ' ')], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const sql = (v) => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = " + sql(ENV_E2E.LOGIN));

/* la requete d'Hibernate d'avant, telle que journalisee (sans STRAIGHT_JOIN) */
const FROM = ` from t_lot tlot0_ inner join t_famille tfamille1_ on tlot0_.lg_FAMILLE_ID=tfamille1_.lg_FAMILLE_ID
  inner join t_famille_stock tfamillest2_ on tfamille1_.lg_FAMILLE_ID=tfamillest2_.lg_FAMILLE_ID
  left outer join t_famillearticle tfamillear3_ on tfamille1_.lg_FAMILLEARTICLE_ID=tfamillear3_.lg_FAMILLEARTICLE_ID
  left outer join t_grossiste tgrossiste4_ on tfamille1_.lg_GROSSISTE_ID=tgrossiste4_.lg_GROSSISTE_ID
  left outer join t_zone_geographique tzonegeogr5_ on tfamille1_.lg_ZONE_GEO_ID=tzonegeogr5_.lg_ZONE_GEO_ID
  where (tlot0_.dt_PEREMPTION is not null) and (tlot0_.int_NUM_LOT is not null) and tlot0_.current_stock>0
  and tfamille1_.str_STATUT='enable' and tfamillest2_.int_NUMBER_AVAILABLE>0 and tfamillest2_.str_STATUT='enable'
  and tfamillest2_.lg_EMPLACEMENT_ID=${sql(EMPL)}`;
function filtre(c) {
  let w = '';
  if (c.query) { w += ` and (tfamille1_.int_CIP like ${sql(c.query + '%')} or tfamille1_.str_NAME like ${sql(c.query + '%')})`; }
  if (c.codeFamile) { w += ` and tfamillear3_.lg_FAMILLEARTICLE_ID in (${c.codeFamile.split(',').map(sql).join(',')})`; }
  if (c.codeRayon) { w += ` and tzonegeogr5_.lg_ZONE_GEO_ID in (${c.codeRayon.split(',').map(sql).join(',')})`; }
  if (c.codeGrossiste) { w += ` and tgrossiste4_.lg_GROSSISTE_ID in (${c.codeGrossiste.split(',').map(sql).join(',')})`; }
  if (c.nbreMois > 0) { w += ` and tlot0_.dt_PEREMPTION>=CURDATE() and tlot0_.dt_PEREMPTION<CURDATE() + INTERVAL ${c.nbreMois} MONTH + INTERVAL 1 DAY`; }
  else if (c.dtStart && c.dtEnd) { w += ` and tlot0_.dt_PEREMPTION>=${sql(c.dtStart)} and tlot0_.dt_PEREMPTION<${sql(c.dtEnd)} + INTERVAL 1 DAY`; }
  else { w += ' and tlot0_.dt_PEREMPTION<CURDATE() + INTERVAL 1 DAY'; }
  return w;
}
const ancienneListe = (c) => lignes(`select tlot0_.lg_LOT_ID, tfamille1_.int_CIP, coalesce(tzonegeogr5_.str_LIBELLEE, '(sans rayon)'), DATE_FORMAT(tlot0_.dt_PEREMPTION, '%d/%m/%Y'),
  tlot0_.int_NUMBER, tlot0_.int_NUMBER*tfamille1_.int_PAF, tlot0_.int_NUMBER*tfamille1_.int_PRICE, tlot0_.current_stock ${FROM} ${filtre(c)}
  order by tzonegeogr5_.str_LIBELLEE asc, tlot0_.dt_PEREMPTION asc`);
const anciensTotaux = (c) => lignes(`select count(tlot0_.lg_LOT_ID) ${FROM} ${filtre(c)}`)[0].concat(lignes(`select sum(tlot0_.current_stock),
  sum(tlot0_.current_stock*tfamille1_.int_PAF), sum(tlot0_.current_stock*tfamille1_.int_PRICE) ${FROM} ${filtre(c)}`)[0]);

(async () => {
  const tous = ancienneListe({ nbreMois: 0 });
  const six = ancienneListe({ nbreMois: 6 });
  const L = tous[0] || [];
  const fiche = L.length ? lignes(`SELECT lg_ZONE_GEO_ID, lg_GROSSISTE_ID, lg_FAMILLEARTICLE_ID, str_NAME FROM t_famille WHERE int_CIP = ${sql(L[1])} LIMIT 1`)[0] : [];
  const autreRayon = q(`SELECT lg_ZONE_GEO_ID FROM t_zone_geographique WHERE lg_ZONE_GEO_ID <> ${sql(fiche[0] || '')} LIMIT 1`);
  ok('Jeu d\'essai : des périmés et des péremptions à 6 mois, sur plusieurs rayons', tous.length >= 20 && six.length >= 5 && new Set(tous.map((x) => x[2])).size >= 3, tous.length + ' périmés, ' + six.length + ' à 6 mois');

  const cas = [
    { nom: 'sans filtre, page 1', nbreMois: 0, start: 0, limit: 20 },
    { nom: 'sans filtre, page 2', nbreMois: 0, start: 20, limit: 20 },
    { nom: 'sans filtre, tout', nbreMois: 0, start: 0, limit: 5000 },
    { nom: '6 mois', nbreMois: 6, start: 0, limit: 5000 },
    { nom: '1 mois', nbreMois: 1, start: 0, limit: 5000 },
    { nom: 'période', nbreMois: 0, dtStart: '2025-01-01', dtEnd: '2026-06-30', start: 0, limit: 5000 },
    { nom: 'recherche CIP', nbreMois: 0, query: (L[1] || '').slice(0, 4), start: 0, limit: 5000 },
    { nom: 'recherche nom', nbreMois: 0, query: (fiche[3] || '').slice(0, 3), start: 0, limit: 5000 },
    { nom: 'rayon', nbreMois: 0, codeRayon: fiche[0] || '', start: 0, limit: 5000 },
    { nom: 'deux rayons', nbreMois: 0, codeRayon: [fiche[0], autreRayon].filter(Boolean).join(','), start: 0, limit: 5000 },
    { nom: 'grossiste, 6 mois', nbreMois: 6, codeGrossiste: fiche[1] || '', start: 0, limit: 5000 },
    { nom: 'famille', nbreMois: 0, codeFamile: fiche[2] || '', start: 0, limit: 5000 },
    { nom: 'sans résultat', nbreMois: 0, query: 'zzzz-aucun', start: 0, limit: 20 }];

  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext()).newPage();
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const api = (u) => p.evaluate((x) => fetch(x).then((r) => (/csv/.test(x) ? r.text() : r.json())), '../api/v1/fichearticle/' + u);
    const prm = (c) => ['nbreMois', 'codeFamile', 'codeRayon', 'codeGrossiste', 'query', 'dtStart', 'dtEnd'].map((k) => k + '=' + encodeURIComponent(c[k] === undefined ? '' : c[k])).join('&');
    const ecarts = [];
    let nonVides = 0;
    for (const c of cas) {
      const r = await api('perimes?' + prm(c) + '&page=1&start=' + c.start + '&limit=' + c.limit);
      const ref = ancienneListe(c);
      const [nb, stock, achat, vente] = anciensTotaux(c);
      const page = ref.slice(c.start, c.start + c.limit);
      const data = r.data || [];
      if (data.length) { nonVides++; }
      /* memes lots ; meme suite de (rayon, date) : l'ordre entre lots d'un meme rayon et d'une meme date est libre */
      const cle = (x) => x.join('|');
      const apiLots = data.map((x) => [x.lgLOTID, x.codeCip, x.libelleRayon, String(x.datePerement || '').slice(0, 10), x.quantiteLot, x.valeurAchat, x.valeurVente, x.quantiteRestante].map(String));
      const memesLots = page.length === apiLots.length && (c.limit >= ref.length ? apiLots.map(cle).sort().join('\n') === ref.map(cle).sort().join('\n') : true);
      const suiteCles = apiLots.map((x) => x[2]).join('|') === page.map((x) => x[2]).join('|');
      const m = r.metaData || {};
      const totauxOk = String(r.total) === nb && (data.length === 0 || (String(m.totalQuantiteLot) === stock && String(m.totalValeurAchat) === achat && String(m.totalValeurVente) === vente));
      const dates = apiLots.map((x) => x[3]).join('|') === page.map((x) => x[3]).join('|');
      if (!memesLots || !suiteCles || !totauxOk || !dates) {
        ecarts.push(c.nom + ' : ' + (memesLots ? '' : 'lots ') + (suiteCles ? '' : 'ordre des rayons ') + (dates ? '' : 'dates ') + (totauxOk ? '' : 'totaux ' + r.total + '/' + nb + ' ' + JSON.stringify(m) + ' / ' + [stock, achat, vente].join(',')) + (apiLots[0] ? ' ; api ' + cle(apiLots[0]) + ' base ' + cle(page[0] || []) : ''));
      }
      /* badge et compte des produits : memes filtres */
      const badge = await api('perimes/count?' + prm(c));
      if (String(badge.total) !== nb) { ecarts.push(c.nom + ' : badge ' + badge.total + ' / ' + nb); }
      const produits = await api('perimes/produits/count?' + prm(c));
      const nbProduits = q(`select count(distinct tfamille1_.lg_FAMILLE_ID) ${FROM} ${filtre(c)}`);
      const valProduits = produits.count !== undefined ? produits.count : produits.total;
      if (String(valProduits) !== nbProduits) { ecarts.push(c.nom + ' : produits ' + JSON.stringify(produits) + ' / ' + nbProduits); }
    }
    ok('API = ancienne requête : lots, ordre (rayon, date), nombre, totaux, badge, produits (13 cas variés)', ecarts.length === 0 && nonVides >= 10, ecarts.slice(0, 3).join(' || ') + ' ; ' + nonVides + ' cas non vides');

    /* CSV complet : memes lots */
    const csv = await api('perimes/csv?' + prm({ nbreMois: 0 }));
    const lignesCsv = csv.replace(/^﻿/, '').replace(/\r/g, '').trim().split('\n').filter((l) => /;/.test(l));
    const cips = tous.map((x) => x[1]);
    const absents = cips.filter((x) => csv.indexOf(x) < 0);
    ok('CSV = base : un lot par ligne, chaque CIP présent', lignesCsv.length - 1 >= tous.length && lignesCsv.length - 1 <= tous.length + 2 && absents.length === 0, (lignesCsv.length - 1) + ' lignes / ' + tous.length + ' lots ; absents ' + absents.slice(0, 3).join(','));

    /* badge de la cloche = compte a 6 mois */
    const cloche = await api('perimes/count?' + prm({ nbreMois: 6 }));
    ok('Badge (6 mois) = nombre de lots de la base', String(cloche.total) === String(six.length), cloche.total + ' / ' + six.length);
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
