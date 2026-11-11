package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 10 : les sept indicateurs d'equipe verifies par leurs regles, sur des milliers de periodes
 * tirees au hasard (graine fixe) : montants, remises (dont 0), lignes et quantites superieures a 1, preventes, attentes
 * aberrantes (negatives, plus d'une heure, inconnues), ventes conseillees ou non, avoirs, modifications de chaque type,
 * caisses justes, en manquant, en surplus ou sans billetage, sessions qui se chevauchent, debordent la periode ou
 * restent ouvertes.
 */
class IndicateursEquipeCoherenceTest {

    private static final String[] EMPS = { "A", "B", "C", "D", "E" };
    private static final Map<String, String> NOMS = Map.of("A", "Alice", "B", "Bruno", "C", "Carla", "D", "Dina", "E",
            "Eric");

    @SuppressWarnings("unchecked")
    private static Map<String, Object> ligne(Map<String, Object> r, String code, String id) {
        for (Map<String, Object> x : (List<Map<String, Object>>) ((Map<String, Object>) r.get(code)).get("lignes")) {
            if (id.equals(x.get("id"))) {
                return x;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> total(Map<String, Object> r, String code) {
        return (Map<String, Object>) ((Map<String, Object>) r.get(code)).get("total");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> lignes(Map<String, Object> r, String code) {
        return (List<Map<String, Object>>) ((Map<String, Object>) r.get(code)).get("lignes");
    }

    private static long n(Map<String, Object> x, String k) {
        return x == null ? 0 : ((Number) x.get(k)).longValue();
    }

    private static Double taux(long a, long b) {
        return b <= 0 ? null : Math.round(1000.0 * a / b) / 10.0;
    }

    @Test
    void milliersDePeriodes() {
        Random r = new Random(1011L);
        LocalDateTime de = LocalDateTime.of(2026, 10, 1, 0, 0), a = de.plusDays(3);
        for (int essai = 0; essai < 2000; essai++) {
            List<IndicateursEquipe.Vente> ventes = new ArrayList<>();
            int nv = r.nextInt(60);
            for (int i = 0; i < nv; i++) {
                String c = EMPS[r.nextInt(5)];
                String vendeur = r.nextInt(3) == 0 ? EMPS[r.nextInt(5)] : (r.nextBoolean() ? c : null);
                String conseil = r.nextInt(3) == 0 ? EMPS[r.nextInt(5)] : (r.nextBoolean() ? null : " ");
                int lignes = 1 + r.nextInt(5);
                Long attente = r.nextInt(6) == 0 ? null : (long) (r.nextInt(5000) - 200);
                ventes.add(new IndicateursEquipe.Vente(c, vendeur, conseil, 100 + r.nextInt(50000),
                        r.nextInt(3) == 0 ? r.nextInt(3000) : 0, lignes, lignes + r.nextInt(6), r.nextInt(8) == 0,
                        r.nextInt(5) == 0 ? 1 + r.nextInt(lignes) : 0, attente));
            }
            List<IndicateursEquipe.Modification> modifs = new ArrayList<>();
            for (int i = r.nextInt(10); i > 0; i--) {
                modifs.add(new IndicateursEquipe.Modification(EMPS[r.nextInt(5)],
                        new String[] { "INFOS", "DATE", "PRODUITS" }[r.nextInt(3)], r.nextInt(20000),
                        r.nextInt(20000)));
            }
            List<IndicateursEquipe.Caisse> caisses = new ArrayList<>();
            for (int i = r.nextInt(8); i > 0; i--) {
                long att = 10000 + r.nextInt(500000);
                int k = r.nextInt(4);
                caisses.add(new IndicateursEquipe.Caisse(EMPS[r.nextInt(5)], att,
                        k == 0 ? null : k == 1 ? att : att + r.nextInt(20000) - 10000));
            }
            List<IndicateursEquipe.Session> sessions = new ArrayList<>();
            LocalDateTime maintenant = de.plusMinutes(r.nextInt(5 * 24 * 60));
            for (int i = r.nextInt(12); i > 0; i--) {
                LocalDateTime d = de.minusHours(6).plusMinutes(r.nextInt(4 * 24 * 60));
                sessions.add(new IndicateursEquipe.Session(EMPS[r.nextInt(5)], d,
                        r.nextInt(6) == 0 ? null : d.plusMinutes(1 + r.nextInt(900))));
            }
            Map<String, Object> res = IndicateursEquipe.calculer(ventes, modifs, caisses, sessions, de, a, maintenant,
                    NOMS, null);

            /* references independantes */
            Map<String, long[]> parC = new HashMap<>();
            long caCons = 0, nCons = 0, caAvec = 0, caSans = 0, nSans = 0;
            Map<String, long[]> conseils = new HashMap<>();
            Map<String, List<Long>> attentes = new HashMap<>();
            for (IndicateursEquipe.Vente v : ventes) {
                long[] x = parC.computeIfAbsent(v.caissier, k -> new long[10]);
                x[0]++;
                x[1] += v.prix;
                x[2] += v.remise;
                x[3] += v.remise > 0 ? 1 : 0;
                x[4] += v.lignes;
                x[5] += v.quantites;
                x[6] += v.avoir || v.lignesAvoir > 0 ? 1 : 0;
                x[7] += v.lignesAvoir;
                if (v.vendeur != null && !v.vendeur.equals(v.caissier)) {
                    x[8]++;
                    if (v.attente != null && v.attente >= 0 && v.attente <= 3600) {
                        attentes.computeIfAbsent(v.caissier, k -> new ArrayList<>()).add(v.attente);
                    }
                }
                if (v.conseil != null && !v.conseil.isBlank()) {
                    x[9]++;
                    long[] c = conseils.computeIfAbsent(v.conseil, k -> new long[2]);
                    c[0]++;
                    c[1] += v.prix;
                    caCons += v.prix;
                    nCons++;
                    caAvec += v.prix;
                } else {
                    caSans += v.prix;
                    nSans++;
                }
            }
            for (String e : EMPS) {
                long[] x = parC.getOrDefault(e, new long[10]);
                Map<String, Object> rem = ligne(res, "REMISES", e);
                assertEquals(x[0], n(rem, "ventes"));
                assertEquals(x[2], n(rem, "remise"));
                assertEquals(x[3], n(rem, "ventesRemisees"));
                if (rem != null) {
                    assertEquals(taux(x[2], x[1]), rem.get("tauxRemise"), "taux de remise = remises / CA");
                    Map<String, Object> pan = ligne(res, "PANIER", e);
                    assertEquals(Math.round((double) x[1] / x[0]), pan.get("panierMoyen"), "panier = CA / ventes");
                    assertEquals(Math.round(10.0 * x[4] / x[0]) / 10.0, pan.get("lignesParVente"));
                    assertEquals(Math.round(10.0 * x[5] / x[0]) / 10.0, pan.get("produitsParVente"));
                    assertTrue((Double) pan.get("produitsParVente") >= (Double) pan.get("lignesParVente"));
                    Map<String, Object> av = ligne(res, "AVOIRS", e);
                    assertEquals(x[6], n(av, "ventesAvoir"));
                    assertEquals(x[7], n(av, "lignesAvoir"));
                    assertEquals(taux(x[6], x[0]), av.get("tauxAvoir"));
                }
                Map<String, Object> att = ligne(res, "ATTENTE", e);
                assertEquals(x[8], n(att, "preventes"));
                List<Long> la = attentes.getOrDefault(e, new ArrayList<>());
                assertEquals(la.size(), n(att, "mesurees"));
                assertTrue(n(att, "longues") <= n(att, "mesurees") && n(att, "mesurees") <= n(att, "preventes"));
                if (!la.isEmpty()) {
                    double med = (Double) att.get("attenteMediane");
                    assertTrue(
                            med >= la.stream().mapToLong(Long::longValue).min().getAsLong()
                                    && med <= la.stream().mapToLong(Long::longValue).max().getAsLong(),
                            "mediane entre min et max");
                    assertEquals(la.stream().filter(t -> t > 300).count(), n(att, "longues"));
                } else if (att != null) {
                    assertNull(att.get("attenteMediane"));
                }
                Map<String, Object> con = ligne(res, "CONSEIL", e);
                long[] c = conseils.getOrDefault(e, new long[2]);
                assertEquals(c[0], n(con, "conseils"));
                assertEquals(c[1], n(con, "caConseille"));
                assertEquals(x[9], n(con, "ventesConseillees"));
                if (con != null) {
                    assertEquals(taux(x[9], x[0]), con.get("tauxConseil"));
                }
            }
            /* sommes = totaux, tous blocs */
            assertEquals(ventes.stream().mapToLong(v -> v.remise).sum(), n(total(res, "REMISES"), "remise"));
            assertEquals(ventes.stream().mapToLong(v -> v.prix).sum(), n(total(res, "PANIER"), "ca"));
            assertEquals(nCons, n(total(res, "CONSEIL"), "conseils"), "chaque vente conseillee compte une fois");
            assertEquals(nCons, n(total(res, "CONSEIL"), "ventesConseillees"));
            assertEquals(caCons, n(total(res, "CONSEIL"), "caConseille"));
            assertEquals(nCons == 0 ? null : Math.round((double) caAvec / nCons),
                    total(res, "CONSEIL").get("panierAvecConseil"));
            assertEquals(nSans == 0 ? null : Math.round((double) caSans / nSans),
                    total(res, "CONSEIL").get("panierSansConseil"));
            for (String code : IndicateursEquipe.CODES) {
                for (Map.Entry<String, Object> t : total(res, code).entrySet()) {
                    if (t.getValue() instanceof Long && !"panierAvecConseil".equals(t.getKey())
                            && !"panierSansConseil".equals(t.getKey()) && !"caParHeure".equals(t.getKey())
                            && !"panierMoyen".equals(t.getKey()) && !"panierConseille".equals(t.getKey())) {
                        long s = lignes(res, code).stream().mapToLong(x -> n(x, t.getKey())).sum();
                        assertEquals(s, t.getValue(), code + "." + t.getKey() + " : somme des lignes = total");
                    }
                }
                for (Map<String, Object> x : lignes(res, code)) {
                    for (Map.Entry<String, Object> v : x.entrySet()) {
                        if (v.getValue() instanceof Number && !"montantManquant".equals(v.getKey())) {
                            assertTrue(((Number) v.getValue()).doubleValue() >= 0,
                                    code + "." + v.getKey() + " jamais negatif");
                        }
                    }
                    assertTrue(!x.containsKey("montantManquant") || n(x, "montantManquant") <= 0);
                    assertEquals(NOMS.get(x.get("id")), x.get("nom"));
                }
            }
            /* modifications et caisses */
            long ecarts = 0;
            for (IndicateursEquipe.Caisse c : caisses) {
                ecarts += c.billetage == null ? 0 : c.billetage - c.attendu;
            }
            Map<String, Object> tm = total(res, "MODIFS_ECARTS");
            assertEquals(ecarts, n(tm, "montantManquant") + n(tm, "montantSurplus"),
                    "manquant + surplus = somme des ecarts");
            assertEquals(caisses.stream().filter(c -> c.billetage != null).count(), n(tm, "caisses"));
            assertEquals(caisses.stream().filter(c -> c.billetage == null).count(), n(tm, "sansBilletage"));
            assertTrue(n(tm, "manquants") + n(tm, "surplus") <= n(tm, "caisses"));
            assertEquals(modifs.stream().mapToLong(m -> Math.abs(m.apres - m.avant)).sum(), n(tm, "montantModifie"));
            assertEquals(modifs.stream().filter(m -> "PRODUITS".equals(m.type)).count(),
                    n(total(res, "AVOIRS"), "retoursProduits"));
            /* presence : minutes couvertes comptees une fois, bornees a la periode */
            for (String e : EMPS) {
                Set<Long> minutes = new HashSet<>();
                for (IndicateursEquipe.Session s : sessions) {
                    if (!e.equals(s.user)) {
                        continue;
                    }
                    LocalDateTime f = s.fin != null ? s.fin
                            : maintenant.isBefore(s.debut.plusHours(12)) ? maintenant : s.debut.plusHours(12);
                    for (LocalDateTime m = s.debut; m.isBefore(f); m = m.plusMinutes(1)) {
                        if (!m.isBefore(de) && m.isBefore(a)) {
                            minutes.add(java.time.Duration.between(de, m).toMinutes());
                        }
                    }
                }
                Map<String, Object> p = ligne(res, "PRESENCE", e);
                assertEquals(minutes.size() * 60L, n(p, "secondes"), "presence de " + e);
                assertTrue(n(p, "secondes") <= java.time.Duration.between(de, a).getSeconds());
                if (p != null && n(p, "secondes") > 0) {
                    assertEquals(Math.round(10.0 * n(p, "ventes") * 3600 / n(p, "secondes")) / 10.0,
                            p.get("ventesParHeure"));
                }
            }
            /* filtre employe : ses lignes seulement, identiques */
            String e = EMPS[r.nextInt(5)];
            Map<String, Object> f = IndicateursEquipe.calculer(ventes, modifs, caisses, sessions, de, a, maintenant,
                    NOMS, e);
            for (String code : IndicateursEquipe.CODES) {
                assertTrue(lignes(f, code).stream().allMatch(x -> e.equals(x.get("id"))));
                assertEquals(ligne(res, code, e), ligne(f, code, e), code + " : ligne filtree = ligne de l'equipe");
            }
        }
    }

    @Test
    void casLimites() {
        LocalDateTime de = LocalDateTime.of(2026, 10, 1, 0, 0), a = de.plusDays(1);
        Map<String, Object> vide = IndicateursEquipe.calculer(new ArrayList<>(), new ArrayList<>(), new ArrayList<>(),
                new ArrayList<>(), de, a, a, NOMS, null);
        for (String code : IndicateursEquipe.CODES) {
            assertTrue(lignes(vide, code).isEmpty());
        }
        assertNull(total(vide, "REMISES").get("tauxRemise"));
        assertNull(total(vide, "PANIER").get("panierMoyen"));
        /* deux sessions qui se chevauchent : 9 h-12 h et 11 h-13 h = 4 h ; une session ouverte depuis 20 h : 4 h */
        List<IndicateursEquipe.Session> s = List.of(
                new IndicateursEquipe.Session("A", de.plusHours(9), de.plusHours(12)),
                new IndicateursEquipe.Session("A", de.plusHours(11), de.plusHours(13)),
                new IndicateursEquipe.Session("B", de.plusHours(20), null));
        Map<String, Object> p = IndicateursEquipe.calculer(new ArrayList<>(), new ArrayList<>(), new ArrayList<>(), s,
                de, a, a.plusDays(2), NOMS, null);
        assertEquals(4 * 3600L, n(ligne(p, "PRESENCE", "A"), "secondes"));
        assertEquals(4 * 3600L, n(ligne(p, "PRESENCE", "B"), "secondes"));
        /* caisse en manquant de 500, en surplus de 200, juste, sans billetage */
        Map<String, Object> c = IndicateursEquipe.calculer(new ArrayList<>(), new ArrayList<>(),
                List.of(new IndicateursEquipe.Caisse("A", 1000, 500L), new IndicateursEquipe.Caisse("A", 1000, 1200L),
                        new IndicateursEquipe.Caisse("A", 1000, 1000L), new IndicateursEquipe.Caisse("A", 1000, null)),
                new ArrayList<>(), de, a, a, NOMS, null);
        Map<String, Object> la = ligne(c, "MODIFS_ECARTS", "A");
        assertEquals(3, n(la, "caisses"));
        assertEquals(1, n(la, "sansBilletage"));
        assertEquals(-500, n(la, "montantManquant"));
        assertEquals(200, n(la, "montantSurplus"));
        assertEquals(33.3, la.get("recurrence"));
    }
}
