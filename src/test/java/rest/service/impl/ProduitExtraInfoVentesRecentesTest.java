package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.ProduitExtraInfoCles;

/**
 * Demande 71 (21/11) : la derniere vente est lue d'abord sur les ventes recentes (depuis minuit, il y a
 * {@link ProduitExtraInfoServiceImpl#JOURS_RECENTS} jours), puis sur tout l'historique pour les seuls produits dont un
 * emplacement demande n'a pas de vente recente. Le resultat doit etre celui de la lecture complete.
 */
class ProduitExtraInfoVentesRecentesTest {

    private static String[] cle(String f, String e) {
        return new String[] { f, e };
    }

    private static Set<String> trouvees(String... fe) {
        Set<String> s = new HashSet<>();
        for (int i = 0; i < fe.length; i += 2) {
            s.add(ProduitExtraInfoCles.cle(fe[i], fe[i + 1]));
        }
        return s;
    }

    @Test
    @DisplayName("Vendu recemment : pas relu ; sans vente recente : relu en entier, dans l'ordre de la tranche")
    void choix() {
        List<String> l = ProduitExtraInfoServiceImpl.aLireEnEntier(Arrays.asList("A", "B", "C"),
                Arrays.asList(cle("C", "1"), cle("A", "1"), cle("B", "1")), trouvees("B", "1"));
        assertEquals(Arrays.asList("A", "C"), l);
    }

    @Test
    @DisplayName("Deux emplacements demandes, un seul vendu recemment : relu en entier, une seule fois")
    void deuxEmplacements() {
        assertEquals(Collections.singletonList("B"), ProduitExtraInfoServiceImpl.aLireEnEntier(Arrays.asList("B", "B"),
                Arrays.asList(cle("B", "1"), cle("B", "2"), cle("B", "3")), trouvees("B", "1")));
    }

    @Test
    @DisplayName("Demande sans emplacement : ne force pas la relecture (aucune vente possible)")
    void sansEmplacement() {
        assertTrue(ProduitExtraInfoServiceImpl.aLireEnEntier(Collections.singletonList("B"),
                Collections.singletonList(cle("B", null)), Collections.emptySet()).isEmpty());
    }

    @Test
    @DisplayName("Produit demande hors de la tranche : pas relu avec cette tranche")
    void horsTranche() {
        assertEquals(Collections.singletonList("A"), ProduitExtraInfoServiceImpl.aLireEnEntier(
                Collections.singletonList("A"), Arrays.asList(cle("A", "1"), cle("Z", "1")), Collections.emptySet()));
    }

    /* ---- coherence : simulation des deux requetes (jour : 0 = aujourd'hui, n = il y a n jours) ---- */

    private static final class Vente {
        final String f;
        final String e;
        final int jour;
        final int q;

        Vente(String f, String e, int jour, int q) {
            this.f = f;
            this.e = e;
            this.jour = jour;
            this.q = q;
        }
    }

    /** REQ_VENTES : par (produit, emplacement), le jour vendu le plus recent et la quantite totale de ce jour. */
    private static Map<String, int[]> derniere(List<Vente> ventes, Set<String> ids, int fenetre) {
        Map<String, int[]> m = new HashMap<>();
        for (Vente v : ventes) {
            if (!ids.contains(v.f) || v.jour > fenetre) {
                continue;
            }
            String k = ProduitExtraInfoCles.cle(v.f, v.e);
            int[] x = m.get(k);
            if (x == null || v.jour < x[0]) {
                m.put(k, new int[] { v.jour, v.q });
            } else if (v.jour == x[0]) {
                x[1] += v.q;
            }
        }
        return m;
    }

    @Test
    @DisplayName("Coherence : 5 000 tranches tirees au hasard, fenetre puis relecture = lecture complete, cle par cle")
    void coherence() {
        Random r = new Random(71L);
        int relus = 0;
        int evites = 0;
        for (int cas = 0; cas < 5_000; cas++) {
            int nb = 1 + r.nextInt(6);
            List<String> tranche = new ArrayList<>();
            List<Vente> ventes = new ArrayList<>();
            List<String[]> cles = new ArrayList<>();
            for (int i = 0; i < nb; i++) {
                String f = "P" + i;
                tranche.add(f);
                int n = r.nextInt(5) == 0 ? 0 : 1 + r.nextInt(30);
                /* derniere vente : aujourd'hui, dans la semaine, au bord de la fenetre (7 et 8 jours) ou bien avant */
                int recent = new int[] { 0, 3, 7, 8, 30, 400 }[r.nextInt(6)];
                for (int k = 0; k < n; k++) {
                    ventes.add(new Vente(f, String.valueOf(1 + r.nextInt(2)), recent + r.nextInt(3) * r.nextInt(10),
                            1 + r.nextInt(5)));
                }
                for (int e = 1; e <= 1 + r.nextInt(3); e++) {
                    cles.add(cle(f, String.valueOf(e)));
                }
                if (r.nextInt(10) == 0) {
                    cles.add(cle(f, null));
                }
            }
            Map<String, int[]> attendu = derniere(ventes, new HashSet<>(tranche), Integer.MAX_VALUE);
            /* service : fenetre (jour <= JOURS_RECENTS : depuis minuit, il y a 7 jours), puis relecture complete */
            Map<String, int[]> lu = new HashMap<>(
                    derniere(ventes, new HashSet<>(tranche), ProduitExtraInfoServiceImpl.JOURS_RECENTS));
            List<String> complets = ProduitExtraInfoServiceImpl.aLireEnEntier(tranche, cles, lu.keySet());
            derniere(ventes, new HashSet<>(complets), Integer.MAX_VALUE).forEach(lu::putIfAbsent);
            for (String[] c : cles) {
                if (c[1] == null) {
                    continue;
                }
                String k = ProduitExtraInfoCles.cle(c[0], c[1]);
                int[] a = attendu.get(k);
                int[] l = lu.get(k);
                assertEquals(a == null ? "-" : a[0] + "/" + a[1], l == null ? "-" : l[0] + "/" + l[1],
                        "cas " + cas + " cle " + k);
            }
            for (String f : tranche) {
                if (complets.contains(f)) {
                    relus++;
                } else {
                    evites++;
                }
            }
        }
        assertTrue(relus > 2_000 && evites > 2_000, "cas varies : " + relus + " relus, " + evites + " evites");
    }
}
