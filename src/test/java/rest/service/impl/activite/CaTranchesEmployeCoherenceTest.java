package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.dto.ActiviteAnalysesDTO;
import rest.service.impl.activite.CaTranchesEmploye.Vente;

/**
 * Plan avoir du 08/11, point 1 : rapport « employé × tranche horaire × CA réalisé » et résumé de la carte du tableau de
 * bord. Règles vérifiées sur des milliers de cas tirés au hasard (graine fixe) :
 * <ul>
 * <li>somme des cases = CA total de la période = total des lignes = total des colonnes ;</li>
 * <li>chaque vente est comptée une seule fois, dans la bonne tranche, pour chaque taille de 1 à 6 h ;</li>
 * <li>attributions caissière et vendeur : même total ;</li>
 * <li>jamais négatif ; ventes à 0 ou sans heure écartées.</li>
 * </ul>
 */
class CaTranchesEmployeCoherenceTest {

    static final long GRAINE = 20261108L;
    static final String[] EMP = { "A", "B", "C", "D", "E" };

    static String tirer(Random r, boolean peutEtreNul) {
        return peutEtreNul && r.nextInt(6) == 0 ? null : EMP[r.nextInt(EMP.length)];
    }

    static List<Vente> jeu(Random r) {
        List<Vente> l = new ArrayList<>();
        int n = r.nextInt(60);
        for (int i = 0; i < n; i++) {
            LocalDateTime t = LocalDateTime.of(2026, 11, 1 + r.nextInt(7), r.nextInt(24), r.nextInt(60));
            /* montants varies, dont 0 (ecarte) ; prevente d'un autre vendeur souvent ; caissiere parfois inconnue */
            long montant = r.nextInt(10) == 0 ? 0 : 1 + r.nextInt(250000);
            l.add(new Vente(tirer(r, true), tirer(r, true), tirer(r, false), r.nextInt(40) == 0 ? null : t, montant));
        }
        return l;
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> liste(Map<String, Object> m, String k) {
        return (List<Map<String, Object>>) m.get(k);
    }

    static long nombre(Object o) {
        return ((Number) o).longValue();
    }

    @Test
    @DisplayName("5 000 jeux x 6 tailles x 2 attributions : cases = lignes = colonnes = CA total, une vente une case")
    void coherence() {
        Random r = new Random(GRAINE);
        Map<String, String> noms = new HashMap<>();
        for (String e : EMP) {
            noms.put(e, "Employé " + e);
        }
        int jeuxAvecPreventes = 0;
        for (int k = 0; k < 5000; k++) {
            List<Vente> ventes = jeu(r);
            long caAttendu = 0, nbAttendu = 0;
            for (Vente v : ventes) {
                if (v.encaissement != null && v.montant > 0) {
                    caAttendu += v.montant;
                    nbAttendu++;
                }
            }
            if (ventes.stream()
                    .anyMatch(v -> v.vendeur != null && v.caissier != null && !v.vendeur.equals(v.caissier))) {
                jeuxAvecPreventes++;
            }
            for (int taille = 1; taille <= 6; taille++) {
                long[] totalParAttribution = new long[2];
                for (String a : new String[] { CaTranchesEmploye.CAISSIER, CaTranchesEmploye.VENDEUR }) {
                    Map<String, Object> m = CaTranchesEmploye.calculer(ventes, taille, a, noms, null);
                    assertEquals(taille, m.get("taille"));
                    assertEquals(a, m.get("attribution"));
                    List<Map<String, Object>> tr = liste(m, "tranches");
                    Map<String, Object> tot = (Map<String, Object>) m.get("totaux");
                    long sommeCases = 0, nbCases = 0;
                    long[] colCa = new long[tr.size()], colNb = new long[tr.size()];
                    for (Map<String, Object> l : liste(m, "lignes")) {
                        List<Map<String, Object>> c = liste(l, "cellules");
                        assertEquals(tr.size(), c.size(), "une case par tranche");
                        long ca = 0, nb = 0;
                        for (int i = 0; i < c.size(); i++) {
                            long x = nombre(c.get(i).get("ca")), y = nombre(c.get(i).get("ventes"));
                            assertTrue(x >= 0 && y >= 0, "jamais negatif");
                            assertTrue(y > 0 || x == 0, "pas de CA sans vente");
                            ca += x;
                            nb += y;
                            colCa[i] += x;
                            colNb[i] += y;
                        }
                        assertEquals(ca, nombre(l.get("ca")), "total de ligne = somme de ses cases");
                        assertEquals(nb, nombre(l.get("ventes")));
                        sommeCases += ca;
                        nbCases += nb;
                    }
                    List<Map<String, Object>> ct = liste(tot, "cellules");
                    for (int i = 0; i < tr.size(); i++) {
                        assertEquals(colCa[i], nombre(ct.get(i).get("ca")), "total de colonne = somme de la colonne");
                        assertEquals(colNb[i], nombre(ct.get(i).get("ventes")));
                    }
                    assertEquals(caAttendu, sommeCases, "somme des cases = CA de la periode");
                    assertEquals(caAttendu, nombre(tot.get("ca")));
                    assertEquals(nbAttendu, nbCases, "chaque vente comptee une fois");
                    assertEquals(nbAttendu, nombre(tot.get("ventes")));
                    /* bonne tranche : recompte vente par vente */
                    Map<String, long[]> attendu = new HashMap<>();
                    for (Vente v : ventes) {
                        if (v.encaissement == null || v.montant <= 0) {
                            continue;
                        }
                        String e = CaTranchesEmploye.employe(v, a);
                        long[] x = attendu.computeIfAbsent(e + "|" + v.encaissement.getHour() / taille,
                                z -> new long[2]);
                        x[0] += v.montant;
                        x[1]++;
                    }
                    for (Map<String, Object> l : liste(m, "lignes")) {
                        List<Map<String, Object>> c = liste(l, "cellules");
                        for (int i = 0; i < c.size(); i++) {
                            int index = ((Number) tr.get(i).get("index")).intValue();
                            long[] x = attendu.remove(l.get("id") + "|" + index);
                            assertEquals(x == null ? 0 : x[0], nombre(c.get(i).get("ca")),
                                    "case " + l.get("id") + " " + index);
                            assertEquals(x == null ? 0 : x[1], nombre(c.get(i).get("ventes")));
                        }
                    }
                    assertTrue(attendu.isEmpty(), "aucune vente hors du tableau : " + attendu.keySet());
                    /* colonnes contigues, bornes 0 a 24 h, libelles */
                    for (int i = 0; i < tr.size(); i++) {
                        int index = ((Number) tr.get(i).get("index")).intValue();
                        assertEquals(index * taille, tr.get(i).get("debut"));
                        assertEquals(Math.min(24, (index + 1) * taille), tr.get(i).get("fin"));
                        assertTrue(i == 0 || index == ((Number) tr.get(i - 1).get("index")).intValue() + 1);
                    }
                    totalParAttribution[a.equals(CaTranchesEmploye.CAISSIER) ? 0 : 1] = nombre(tot.get("ca"));
                }
                assertEquals(totalParAttribution[0], totalParAttribution[1], "caissiere et vendeur : meme total");
            }
        }
        assertTrue(jeuxAvecPreventes > 4000, "jeux varies : preventes d'un autre vendeur");
    }

    @Test
    @DisplayName("filtre employe : seules ses ventes, selon l'attribution ; la somme des employes redonne le total")
    void filtreEmploye() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < 1000; k++) {
            List<Vente> ventes = jeu(r);
            for (String a : new String[] { CaTranchesEmploye.CAISSIER, CaTranchesEmploye.VENDEUR }) {
                int taille = 1 + r.nextInt(6);
                long total = nombre(((Map<String, Object>) CaTranchesEmploye.calculer(ventes, taille, a, Map.of(), null)
                        .get("totaux")).get("ca"));
                long somme = 0;
                for (String e : new String[] { "A", "B", "C", "D", "E", "?" }) {
                    Map<String, Object> m = CaTranchesEmploye.calculer(ventes, taille, a, Map.of(), e);
                    List<Map<String, Object>> l = liste(m, "lignes");
                    assertTrue(l.size() <= 1 && (l.isEmpty() || e.equals(l.get(0).get("id"))));
                    somme += nombre(((Map<String, Object>) m.get("totaux")).get("ca"));
                }
                assertEquals(total, somme);
            }
        }
    }

    @Test
    @DisplayName("cas limites : tranche 5 h (dernière à 24 h), taille hors bornes, attribution inconnue, aucun vendeur")
    void casLimites() {
        LocalDateTime j = LocalDateTime.of(2026, 11, 8, 0, 0);
        List<Vente> l = List.of(new Vente("A", "B", "A", j.withHour(23).withMinute(59), 1000),
                new Vente("A", null, "A", j.withHour(0), 500), new Vente(null, null, "C", j.withHour(10), 300),
                new Vente("A", "A", "A", j.withHour(10), 0));
        Map<String, Object> m = CaTranchesEmploye.calculer(l, 5, "VENDEUR", Map.of("A", "Awa", "B", "Bob"), null);
        List<Map<String, Object>> tr = liste(m, "tranches");
        assertEquals(5, tr.size());
        assertEquals("20 h - 24 h", tr.get(4).get("libelle"));
        assertEquals("0 h - 5 h", tr.get(0).get("libelle"));
        assertEquals(3L, nombre(((Map<String, Object>) m.get("totaux")).get("ventes")));
        /* la vente de 23 h 59 va a B (vendeur) ; sans vendeur : A (caissiere) ; sans caissiere : C (operateur) */
        assertEquals("B", CaTranchesEmploye.employe(l.get(0), "VENDEUR"));
        assertEquals("A", CaTranchesEmploye.employe(l.get(0), "CAISSIER"));
        assertEquals("A", CaTranchesEmploye.employe(l.get(1), "VENDEUR"));
        assertEquals("C", CaTranchesEmploye.employe(l.get(2), "VENDEUR"));
        assertEquals(1, CaTranchesEmploye.taille(0));
        assertEquals(6, CaTranchesEmploye.taille(9));
        assertEquals(2, CaTranchesEmploye.taille(null));
        assertEquals("CAISSIER", CaTranchesEmploye.attribution("n'importe quoi"));
        assertEquals("CAISSIER", CaTranchesEmploye.calculer(l, 1, null, Map.of(), null).get("attribution"));
        assertEquals(24, CaTranchesEmploye.nombreTranches(1));
        assertEquals(5, CaTranchesEmploye.nombreTranches(5));
        assertEquals(4, CaTranchesEmploye.nombreTranches(6));
        Map<String, Object> vide = CaTranchesEmploye.calculer(List.of(), 3, null, Map.of(), null);
        assertTrue(liste(vide, "tranches").isEmpty() && liste(vide, "lignes").isEmpty());
        assertEquals(0L, nombre(((Map<String, Object>) vide.get("totaux")).get("ca")));
    }

    /* ------------------------------------------------------------ resume de la carte du tableau de bord */

    static AgregatsActivite.Bl bl(LocalDate livraison, LocalDateTime creation) {
        return new AgregatsActivite.Bl("A", "G", creation.minusHours(1), creation, creation.plusMinutes(5), livraison,
                3);
    }

    @Test
    @DisplayName("résumé, 3 000 cas : sensibles = annulations + modifications, délai BL = moyenne des écarts, plus rapide = minimum")
    void resume() {
        Random r = new Random(GRAINE + 2);
        for (int k = 0; k < 3000; k++) {
            List<ActiviteAnalysesDTO.Sensible> sens = new ArrayList<>();
            long a = 0, mo = 0;
            for (int i = 0, n = r.nextInt(5); i < n; i++) {
                long x = r.nextInt(20), y = r.nextInt(20);
                a += x;
                mo += y;
                sens.add(ActiviteAnalysesDTO.Sensible.builder().id("E" + i).nom("E" + i).annulations(x).modifications(y)
                        .build());
            }
            List<AgregatsActivite.Bl> bls = new ArrayList<>();
            long jours = 0, mes = 0;
            for (int i = 0, n = r.nextInt(8); i < n; i++) {
                LocalDateTime c = LocalDateTime.of(2026, 11, 10, 9, 0);
                if (r.nextInt(5) == 0) {
                    bls.add(bl(null, c));
                    continue;
                }
                int ecart = r.nextInt(7) - 1;
                bls.add(bl(c.toLocalDate().minusDays(ecart), c));
                jours += Math.max(0, ecart);
                mes++;
            }
            List<ActiviteAnalysesDTO.Operateur> ops = new ArrayList<>();
            double min = Double.MAX_VALUE;
            String rapide = null;
            for (int i = 0, n = r.nextInt(6); i < n; i++) {
                long v = r.nextInt(12);
                double s = r.nextInt(5) == 0 ? 0 : 1 + r.nextInt(300) / 10.0;
                ops.add(ActiviteAnalysesDTO.Operateur.builder().id("O" + i).nom("O" + i).ventes(v).secondesParLigne(s)
                        .build());
                if (v >= AgregatsActivite.VENTES_MIN_RAPIDE && s > 0 && s < min) {
                    min = s;
                    rapide = "O" + i;
                }
            }
            List<ActiviteAnalysesDTO.Constat> constats = new ArrayList<>();
            long alertes = 0;
            for (int i = 0, n = r.nextInt(4); i < n; i++) {
                String niv = r.nextBoolean() ? "ALERTE" : "INFO";
                alertes += "ALERTE".equals(niv) ? 1 : 0;
                constats.add(AgregatsActivite.constat(niv, "T" + i, ""));
            }
            AgregatsActivite.Totaux t = new AgregatsActivite.Totaux();
            t.longues = r.nextInt(30);
            ActiviteAnalysesDTO.Resume res = AgregatsActivite.resume(t, bls, sens, ops, constats, SeuilDuree.defaut());
            assertEquals(a + mo, res.getActionsSensibles());
            assertEquals(a, res.getAnnulations());
            assertEquals(t.longues, res.getVentesLongues());
            assertEquals(mes, res.getBlMesures());
            if (mes == 0) {
                assertNull(res.getDelaiMoyenBl());
            } else {
                assertEquals(AgregatsActivite.arrondi((double) jours / mes), res.getDelaiMoyenBl());
                assertTrue(res.getDelaiMoyenBl() >= 0);
            }
            if (rapide == null) {
                assertNull(res.getPlusRapideId());
            } else {
                assertEquals(min, res.getPlusRapideSecondesParLigne());
                assertTrue(res.getPlusRapideVentes() >= AgregatsActivite.VENTES_MIN_RAPIDE);
            }
            assertEquals(alertes, res.getAlertes());
        }
    }
}
