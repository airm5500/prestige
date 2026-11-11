package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Plan du 10/11, point 4 : releve des differes groupe par client. 3 000 releves tires au hasard (graine fixe), de 0 a 8
 * clients (dont des homonymes), 0 a 25 operations, soldes au debut nuls, positifs, ou sans operation :
 * <ul>
 * <li>chaque client : une ligne CLIENT puis ses operations ; solde courant = solde au debut + debits - credits, ligne
 * par ligne ; ligne CLIENT = solde au debut, debit, credit et solde a la fin du client ; « Solde fin » du mois = solde
 * courant a cet endroit ;</li>
 * <li>chaque operation une seule fois, sous son client, avec sa piece ; ordre chronologique dans le client ; clients
 * tries par nom ; un client sans solde ni operation absent ;</li>
 * <li>totaux : solde initial = somme des soldes au debut, solde final = somme des soldes a la fin = solde initial +
 * debit - credit ; memes totaux que le releve non groupe (rapprochement).</li>
 * </ul>
 */
class ReleveDifferesGroupeTest {

    @Test
    void troisMilleReleves() {
        Random r = new Random(20261111L);
        for (int cas = 0; cas < 3000; cas++) {
            int nc = r.nextInt(9);
            Map<String, Long> debut = new HashMap<>();
            Map<String, String> noms = new HashMap<>();
            for (int i = 0; i < nc; i++) {
                String id = "C" + i;
                /* homonymes : deux clients differents peuvent porter le meme nom */
                noms.put(id, "Client " + (char) ('A' + r.nextInt(Math.max(1, nc - 1))));
                debut.put(id, r.nextInt(3) == 0 ? 0L : 5L * r.nextInt(4000));
            }
            List<ReleveDifferes.Operation> ops = new ArrayList<>();
            /* operation par (type, piece) : une annulation porte la piece de sa vente, comme en base */
            Map<String, ReleveDifferes.Operation> parPiece = new HashMap<>();
            Map<String, List<ReleveDifferes.Operation>> ventesDe = new HashMap<>();
            int no = nc == 0 ? 0 : r.nextInt(26);
            for (int i = 0; i < no; i++) {
                String c = "C" + r.nextInt(nc);
                LocalDateTime d = LocalDateTime.of(2026, 1 + r.nextInt(3), 1 + r.nextInt(28), r.nextInt(24),
                        r.nextInt(60));
                int t = r.nextInt(3);
                long m = 5L * (1 + r.nextInt(3000));
                List<ReleveDifferes.Operation> vc = ventesDe.computeIfAbsent(c, k -> new ArrayList<>());
                ReleveDifferes.Operation o;
                if (t == 2 && !vc.isEmpty() && r.nextBoolean()) {
                    /*
                     * annulation d'une vente deja tiree : meme piece, meme numero, meme montant, en meme temps ou plus
                     * tard
                     */
                    ReleveDifferes.Operation v = vc.remove(r.nextInt(vc.size()));
                    o = new ReleveDifferes.Operation(r.nextBoolean() ? v.date : v.date.plusMinutes(r.nextInt(5000)),
                            "Annulation de la vente", v.reference, noms.get(c), 0, v.debit, "ANNULATION").de(c, v.id);
                } else if (t == 0 || t == 2) {
                    o = new ReleveDifferes.Operation(d, "Vente différée", "V" + i, noms.get(c), m, 0).de(c, "P" + i);
                    vc.add(o);
                } else {
                    o = new ReleveDifferes.Operation(d, "Règlement", "R" + i, noms.get(c), 0, m).de(c, "P" + i);
                }
                ops.add(o);
                parPiece.put(o.type + ":" + o.id, o);
            }
            JSONObject g = ReleveDifferes.releveParClient(debut, noms, ops);
            String cle = "cas " + cas;
            JSONArray l = g.getJSONArray("data");

            long sDebut = 0, sFin = 0, totD = 0, totC = 0;
            Set<String> pieces = new HashSet<>();
            Set<String> vus = new HashSet<>();
            String clientCourant = null, nomPrecedent = null;
            long courant = 0, dClient = 0, cClient = 0;
            JSONObject entete = null;
            LocalDateTime derniere = null;
            for (int i = 0; i <= l.length(); i++) {
                JSONObject x = i < l.length() ? l.getJSONObject(i) : null;
                if (x == null || "CLIENT".equals(x.getString("type"))) {
                    if (entete != null) {
                        assertEquals(entete.getLong("soldeDebut") + dClient - cClient, entete.getLong("solde"), cle);
                        assertEquals(courant, entete.getLong("solde"),
                                cle + " : solde courant final = solde du client");
                        assertEquals(dClient, entete.getLong("debit"), cle);
                        assertEquals(cClient, entete.getLong("credit"), cle);
                        sFin += entete.getLong("solde");
                    }
                    if (x == null) {
                        break;
                    }
                    entete = x;
                    clientCourant = x.getString("clientId");
                    assertTrue(vus.add(clientCourant), cle + " : un client une seule fois");
                    assertEquals(noms.get(clientCourant), x.getString("client"), cle);
                    assertEquals((long) debut.getOrDefault(clientCourant, 0L), x.getLong("soldeDebut"), cle);
                    if (nomPrecedent != null) {
                        assertTrue(nomPrecedent.compareToIgnoreCase(x.getString("client")) <= 0,
                                cle + " : tri par nom");
                    }
                    nomPrecedent = x.getString("client");
                    sDebut += x.getLong("soldeDebut");
                    courant = x.getLong("soldeDebut");
                    dClient = 0;
                    cClient = 0;
                    derniere = null;
                    continue;
                }
                assertEquals(clientCourant, x.getString("clientId"), cle);
                if ("MOIS".equals(x.getString("type"))) {
                    assertEquals(courant, x.getLong("solde"), cle + " : solde fin de mois = solde courant");
                    continue;
                }
                courant += x.getLong("debit") - x.getLong("credit");
                assertEquals(courant, x.getLong("solde"), cle + " ligne " + i);
                dClient += x.getLong("debit");
                cClient += x.getLong("credit");
                totD += x.getLong("debit");
                totC += x.getLong("credit");
                assertFalse(x.has("id"), cle + " : pas de cle id (l'ecran ne garderait qu'une ligne par id)");
                String piece = x.getString("type") + ":" + x.getString("piece");
                assertTrue(pieces.add(piece), cle + " : chaque operation une fois");
                ReleveDifferes.Operation o = parPiece.get(piece);
                assertTrue(o != null, cle + " : piece connue " + piece);
                assertEquals(o.clientId, clientCourant, cle + " : operation sous son client");
                assertEquals(o.debit, x.getLong("debit"), cle);
                assertEquals(o.credit, x.getLong("credit"), cle);
                assertEquals(o.reference, x.getString("reference"), cle);
                LocalDateTime d = o.date;
                assertTrue(derniere == null || !d.isBefore(derniere), cle + " : ordre chronologique");
                derniere = d;
            }
            assertEquals(ops.size(), pieces.size(), cle + " : toutes les operations");
            for (Map.Entry<String, Long> e : debut.entrySet()) {
                boolean aDesOps = ops.stream().anyMatch(o -> o.clientId.equals(e.getKey()));
                assertEquals(e.getValue() != 0 || aDesOps, vus.contains(e.getKey()), cle + " : client " + e.getKey());
            }
            assertEquals(sDebut, g.getLong("soldeInitial"), cle);
            assertEquals(sFin, g.getLong("soldeFinal"), cle);
            assertEquals(totD, g.getLong("totalDebit"), cle);
            assertEquals(totC, g.getLong("totalCredit"), cle);
            assertEquals(g.getLong("soldeInitial") + totD - totC, g.getLong("soldeFinal"), cle);
            assertEquals(vus.size(), g.getInt("clients"), cle);
            /* rapprochement avec le releve non groupe */
            JSONObject plat = ReleveDifferes.releve(sDebut, ops);
            assertEquals(plat.getLong("soldeFinal"), g.getLong("soldeFinal"), cle);
            assertEquals(plat.getLong("totalDebit"), g.getLong("totalDebit"), cle);
            assertEquals(plat.getLong("totalCredit"), g.getLong("totalCredit"), cle);
        }
    }

    @Test
    void clientQuiDoitSansOperationEtClientSoldeSansOperation() {
        Map<String, Long> debut = new HashMap<>();
        debut.put("A", 1500L);
        debut.put("B", 0L);
        Map<String, String> noms = new HashMap<>();
        noms.put("A", "Awa");
        noms.put("B", "Bakary");
        JSONObject g = ReleveDifferes.releveParClient(debut, noms, new ArrayList<>());
        JSONArray l = g.getJSONArray("data");
        assertEquals(1, l.length(), l.toString());
        assertEquals("CLIENT", l.getJSONObject(0).getString("type"));
        assertEquals(1500L, l.getJSONObject(0).getLong("solde"));
        assertFalse(l.toString().contains("Bakary"));
        assertEquals(1500L, g.getLong("soldeFinal"));
    }
}
