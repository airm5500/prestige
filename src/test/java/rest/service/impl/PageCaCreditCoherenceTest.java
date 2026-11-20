package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.ErpTiersPayantDTO;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * Demande 67 : {@code GET v1/ca-credit} pagine, filtre et totalise cote serveur. Regles verifiees sur 5 000 periodes
 * tirees au hasard (graine fixe), avec des recherches et des tiers payants varies :
 * <ul>
 * <li>sans {@code limit} ni filtre : la liste d'origine, telle quelle (meme objet, meme ordre) ;</li>
 * <li>total = nombre de lignes apres filtres ; montant = leur somme ; clients = clients distincts apres filtres ;</li>
 * <li>tiersPayants = libelles distincts de la periode, AVANT les filtres, tries ;</li>
 * <li>les pages mises bout a bout redonnent exactement les lignes filtrees, triees par date decroissante puis numero de
 * facture ; une page ne depasse jamais {@code limit} ; au-dela du total, page vide ;</li>
 * <li>chaque ligne retenue contient la recherche (sans tenir compte de la casse) et porte le tiers payant demande.</li>
 * </ul>
 */
class PageCaCreditCoherenceTest {

    private static final String[] TP = { "MUGEFCI", "CNPS", "ASCOMA", "Sanlam", "MCI CARE", " VITALIS NSIA " };
    private static final String[] NOMS = { "KOUASSI Jean", "TRAORE Awa", "KONE Ali", "Yao Marie", "N'GUESSAN Paul",
            "Bamba Fatou", "Diallo Ibrahim" };

    private static ErpTiersPayantDTO ligne(Random r) {
        ErpTiersPayantDTO o = new ErpTiersPayantDTO();
        int tp = r.nextInt(TP.length);
        o.setTiersPayantId("TP" + tp);
        o.setTiersPayantLibelle(TP[tp]);
        int c = r.nextInt(NOMS.length);
        o.setClientId(r.nextInt(10) == 0 ? null : "C" + c);
        o.setClientName(NOMS[c]);
        if (r.nextBoolean()) {
            o.setAyantDroitId("A" + r.nextInt(5));
            o.setAyantDroitName(NOMS[r.nextInt(NOMS.length)]);
        }
        o.setMvtDate(String.format("202611%02d", 1 + r.nextInt(20)));
        o.setNumFacturation(r.nextInt(3) == 0 ? "0" : "FAC-" + (1 + r.nextInt(150)));
        o.setMontant(r.nextInt(8) == 0 ? 0 : 100 + r.nextInt(250_000));
        return o;
    }

    private static boolean contient(String v, String q) {
        return v != null && v.toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT));
    }

    @Test
    void reglesSurDesPeriodesTireesAuHasard() {
        Random r = new Random(20261120L);
        for (int cas = 0; cas < 5_000; cas++) {
            List<ErpTiersPayantDTO> periode = new ArrayList<>();
            int n = r.nextInt(6) == 0 ? 0 : r.nextInt(300);
            for (int i = 0; i < n; i++) {
                periode.add(ligne(r));
            }
            String query = null;
            switch (r.nextInt(5)) {
            case 0:
                query = "fac-1";
                break;
            case 1:
                query = NOMS[r.nextInt(NOMS.length)].substring(0, 3).toLowerCase(Locale.ROOT);
                break;
            case 2:
                query = "  ";
                break;
            default:
                break;
            }
            String tiers = null;
            int t = r.nextInt(4);
            if (t == 0) {
                tiers = TP[r.nextInt(TP.length)].trim().toLowerCase(Locale.ROOT); // libelle en base parfois entoure
                                                                                  // d'espaces
            } else if (t == 1) {
                tiers = "TP" + r.nextInt(TP.length);
            }
            int limit = 1 + r.nextInt(60);

            String qn = query == null ? "" : query.trim();
            String tpf = tiers;
            List<ErpTiersPayantDTO> attendu = periode.stream()
                    .filter(o -> qn.isEmpty() || contient(o.getClientName(), qn) || contient(o.getAyantDroitName(), qn)
                            || contient(o.getNumFacturation(), qn) || contient(o.getTiersPayantLibelle(), qn))
                    .filter(o -> tpf == null || tpf.trim().equalsIgnoreCase(o.getTiersPayantLibelle().trim())
                            || tpf.equals(o.getTiersPayantId()))
                    .sorted(Comparator.comparing(ErpTiersPayantDTO::getMvtDate, Comparator.reverseOrder())
                            .thenComparing(ErpTiersPayantDTO::getNumFacturation))
                    .collect(Collectors.toList());

            List<ErpTiersPayantDTO> lu = new ArrayList<>();
            Map<String, Object> premiere = null;
            for (int start = 0; start <= attendu.size() + limit; start += limit) {
                Map<String, Object> page = PageCaCredit.page(periode, start, limit, query, tiers);
                if (premiere == null) {
                    premiere = page;
                }
                @SuppressWarnings("unchecked")
                List<ErpTiersPayantDTO> data = (List<ErpTiersPayantDTO>) page.get("data");
                assertTrue(data.size() <= limit, "page plus longue que limit");
                if (start >= attendu.size()) {
                    assertEquals(0, data.size(), "page au-dela du total");
                }
                assertEquals((long) attendu.size(), page.get("total"));
                lu.addAll(data);
            }
            assertEquals(attendu, lu, "pages bout a bout = lignes filtrees triees (cas " + cas + ")");
            assertEquals(attendu.stream().mapToLong(ErpTiersPayantDTO::getMontant).sum(), premiere.get("montant"));
            assertEquals((long) attendu.stream()
                    .map(o -> o.getClientId() != null ? "id:" + o.getClientId() : "nom:" + o.getClientName()).distinct()
                    .count(), premiere.get("clients"));
            assertEquals(
                    new ArrayList<>(periode.stream().map(ErpTiersPayantDTO::getTiersPayantLibelle)
                            .filter(v -> v != null).collect(Collectors.toCollection(TreeSet::new))),
                    premiere.get("tiersPayants"));
            for (ErpTiersPayantDTO o : lu) {
                assertTrue(qn.isEmpty() || contient(o.getClientName(), qn) || contient(o.getAyantDroitName(), qn)
                        || contient(o.getNumFacturation(), qn) || contient(o.getTiersPayantLibelle(), qn));
            }
            // sans limit ni filtre : la liste d'origine, intacte
            assertSame(periode, PageCaCredit.liste(periode, null, null));
        }
    }

    @Test
    void periodeVideEtBornes() {
        Map<String, Object> vide = PageCaCredit.page(new ArrayList<>(), 0, 50, null, null);
        assertEquals(0L, vide.get("total"));
        assertEquals(0L, vide.get("montant"));
        assertEquals(0L, vide.get("clients"));
        assertEquals(0, ((List<?>) vide.get("data")).size());

        Random r = new Random(7L);
        List<ErpTiersPayantDTO> l = new ArrayList<>();
        for (int i = 0; i < 120; i++) {
            ErpTiersPayantDTO o = ligne(r);
            o.setNumFacturation("FAC-" + i);
            l.add(o);
        }
        long somme = l.stream().mapToLong(ErpTiersPayantDTO::getMontant).sum();
        Map<String, Object> p1 = PageCaCredit.page(l, 0, 50, null, null);
        assertEquals(50, ((List<?>) p1.get("data")).size());
        assertEquals(120L, p1.get("total"));
        assertEquals(somme, p1.get("montant"));
        assertEquals(20, ((List<?>) PageCaCredit.page(l, 100, 50, null, null).get("data")).size());
        // start negatif : lu comme 0 ; limit a 0 : totaux seuls
        assertEquals(50, ((List<?>) PageCaCredit.page(l, -5, 50, null, null).get("data")).size());
        Map<String, Object> totaux = PageCaCredit.page(l, 0, 0, null, null);
        assertEquals(0, ((List<?>) totaux.get("data")).size());
        assertEquals(120L, totaux.get("total"));
        assertEquals(120, l.size(), "la liste d'origine n'est pas modifiee");
    }
}
