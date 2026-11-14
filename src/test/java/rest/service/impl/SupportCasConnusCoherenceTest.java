package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Rapport d'exploitation du 13/11, point 11 : la veille de coherence doit separer les cas nouveaux de l'historique deja
 * connu.
 * <p>
 * Test de COHERENCE sur 2 000 suites de 1 a 12 passages tirees au hasard (graine fixe) : de 0 a 600 cas par passage,
 * identifiants repetes dans un meme passage, cas qui disparaissent puis reviennent, listes tronquees au plafond. Regles
 * : nouveaux + connus = cas du passage, dans l'ordre, sans recouvrement ; un cas est nouveau si et seulement si il
 * n'etait pas en memoire ; apres un passage complet, la memoire est exactement l'ensemble des cas presents ; apres un
 * passage tronque, rien n'est oublie.
 * </p>
 */
class SupportCasConnusCoherenceTest {

    private static final int PLAFOND = 500;

    @Test
    @DisplayName("2 000 suites de passages : partition, nouveaute et memoire exactes")
    void suitesDePassages() {
        Random r = new Random(20261113L);
        int nouveauxVus = 0;
        int connusVus = 0;
        int tronques = 0;
        int retours = 0;
        for (int s = 0; s < 2000; s++) {
            Set<String> memoire = new LinkedHashSet<>();
            Set<String> disparus = new LinkedHashSet<>();
            int univers = 1 + r.nextInt(r.nextInt(4) == 0 ? 900 : 60);
            int passages = 1 + r.nextInt(12);
            for (int pz = 0; pz < passages; pz++) {
                List<Object[]> lignes = new ArrayList<>();
                int n = r.nextInt(5) == 0 ? 0 : r.nextInt(Math.min(univers, 600) + 1);
                for (int i = 0; i < n; i++) {
                    String id = String.valueOf(r.nextInt(univers));
                    lignes.add(new Object[] { id, "contexte " + i });
                }
                boolean tronque = lignes.size() >= PLAFOND;
                if (tronque) {
                    tronques++;
                    lignes = lignes.subList(0, PLAFOND);
                }
                String quoi = "suite " + s + ", passage " + pz;
                SupportCasConnus sep = SupportCasConnus.separer(lignes, memoire, tronque);

                List<Object[]> fusion = new ArrayList<>();
                int iN = 0;
                int iC = 0;
                for (Object[] l : lignes) {
                    if (iN < sep.getNouveaux().size() && sep.getNouveaux().get(iN) == l) {
                        fusion.add(sep.getNouveaux().get(iN++));
                    } else if (iC < sep.getConnus().size() && sep.getConnus().get(iC) == l) {
                        fusion.add(sep.getConnus().get(iC++));
                    }
                }
                assertEquals(lignes.size(), fusion.size(), quoi + " : partition dans l'ordre");
                assertEquals(lignes.size(), sep.getNouveaux().size() + sep.getConnus().size(), quoi);
                for (Object[] l : sep.getNouveaux()) {
                    assertTrue(!memoire.contains(l[0]), quoi + " : un cas connu compte comme nouveau");
                    if (disparus.contains(l[0])) {
                        retours++;
                    }
                }
                for (Object[] l : sep.getConnus()) {
                    assertTrue(memoire.contains(l[0]), quoi + " : un cas nouveau compte comme connu");
                }
                nouveauxVus += sep.getNouveaux().size();
                connusVus += sep.getConnus().size();

                Set<String> presents = new LinkedHashSet<>();
                lignes.forEach((l) -> presents.add((String) l[0]));
                Set<String> avant = new LinkedHashSet<>(memoire);
                memoire.addAll(sep.getARetenir());
                memoire.removeAll(sep.getAOublier());
                assertTrue(Collections.disjoint(sep.getARetenir(), avant), quoi + " : retenu deux fois");
                if (tronque) {
                    assertTrue(sep.getAOublier().isEmpty(), quoi + " : oubli sur une liste tronquee");
                    assertTrue(memoire.containsAll(avant) && memoire.containsAll(presents), quoi);
                } else {
                    assertEquals(presents, memoire, quoi + " : memoire differente des cas presents");
                    avant.removeAll(presents);
                    disparus.addAll(avant);
                }
            }
        }
        assertTrue(nouveauxVus > 1000 && connusVus > 1000 && tronques > 10 && retours > 50,
                "jeux trop pauvres : " + nouveauxVus + "/" + connusVus + "/" + tronques + "/" + retours);
    }

    @Test
    @DisplayName("Factures vides du 13/11 : l'historique est connu, la facture du jour est nouvelle")
    void facturesVides() {
        List<String> historique = Arrays.asList("21987", "22415", "22558", "22652", "22937", "23067", "23237", "23434",
                "23613", "23763");
        List<Object[]> premier = new ArrayList<>();
        historique.forEach((id) -> premier.add(new Object[] { id, "Facture " + id }));
        SupportCasConnus p1 = SupportCasConnus.separer(premier, Collections.emptyList(), false);
        assertEquals(10, p1.getNouveaux().size());

        List<Object[]> second = new ArrayList<>(premier);
        second.add(new Object[] { "23901", "Facture 23901" });
        SupportCasConnus p2 = SupportCasConnus.separer(second, p1.getARetenir(), false);
        assertEquals(1, p2.getNouveaux().size());
        assertEquals("23901", p2.getNouveaux().get(0)[0]);
        assertEquals(10, p2.getConnus().size());
        assertTrue(SupportCasConnus.separer(null, null, false).getNouveaux().isEmpty());
    }
}
