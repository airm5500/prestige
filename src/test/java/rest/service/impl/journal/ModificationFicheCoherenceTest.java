package rest.service.impl.journal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TFamille;
import dal.TGrossiste;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.function.BiConsumer;
import org.junit.jupiter.api.Test;
import rest.service.impl.achats.ModificationBl;

/**
 * Retours du 23/11, proposition 1 : trace d'une modification de fiche, sur 5 000 fiches tirees au hasard (graine fixe).
 * Regles : les champs traces sont exactement ceux dont la valeur affichee change ; rien de change, rien de trace ; le
 * detail se relit a l'identique ; la ligne du journal tient en 255 caracteres et nomme chaque champ change tant qu'elle
 * n'est pas coupee.
 */
class ModificationFicheCoherenceTest {

    private static final class Mutation {
        final String libelle;
        final BiConsumer<TFamille, Random> m;

        Mutation(String libelle, BiConsumer<TFamille, Random> m) {
            this.libelle = libelle;
            this.m = m;
        }
    }

    private static String mot(Random r) {
        String[] t = { "R-LUME", "FINSTAM 0,4MG", "DOLIPRANE", "", null, "  ", "50%", "X Y", "ÉTÉ" };
        return t[r.nextInt(t.length)];
    }

    private static Integer entier(Random r) {
        int k = r.nextInt(6);
        return k == 0 ? null : (k == 1 ? 0 : r.nextInt(200_000) - 1_000);
    }

    private static Boolean booleen(Random r) {
        int k = r.nextInt(3);
        return k == 0 ? null : k == 1;
    }

    private static final List<Mutation> MUTATIONS = new ArrayList<>();

    static {
        MUTATIONS.add(new Mutation("Libellé", (f, r) -> f.setStrNAME(mot(r))));
        MUTATIONS.add(new Mutation("Désignation", (f, r) -> f.setStrDESCRIPTION(mot(r))));
        MUTATIONS.add(new Mutation("CIP", (f, r) -> f.setIntCIP(r.nextBoolean() ? "8014527" : "1239734")));
        MUTATIONS.add(new Mutation("EAN 13", (f, r) -> f.setIntEAN13(r.nextBoolean() ? null : "3400930000001")));
        MUTATIONS.add(new Mutation("EAN fabricant", (f, r) -> f.setCodeEanFabriquant(mot(r))));
        MUTATIONS.add(new Mutation("PSCODE", (f, r) -> f.setStrPSCODE(mot(r))));
        MUTATIONS.add(new Mutation("Prix de vente", (f, r) -> f.setIntPRICE(entier(r))));
        MUTATIONS.add(new Mutation("Prix d'achat facture", (f, r) -> f.setIntPAF(entier(r))));
        MUTATIONS.add(new Mutation("Prix d'achat tarif", (f, r) -> f.setIntPAT(entier(r))));
        MUTATIONS.add(new Mutation("Prix de référence", (f, r) -> f.setCmuPrice(entier(r))));
        MUTATIONS.add(new Mutation("Tableau", (f, r) -> f.setIntT(r.nextBoolean() ? "" : "A")));
        MUTATIONS.add(new Mutation("Grossiste", (f, r) -> {
            TGrossiste g = new TGrossiste();
            g.setStrLIBELLE(r.nextBoolean() ? "LABOREX" : "COPHARMED");
            f.setLgGROSSISTEID(r.nextInt(4) == 0 ? null : g);
        }));
        MUTATIONS.add(new Mutation("Code géo", (f, r) -> f.setStrCODEGEOARTICLE(mot(r))));
        MUTATIONS.add(new Mutation("Colisage", (f, r) -> f.setIntCOLISAGE(entier(r))));
        MUTATIONS.add(new Mutation("Quantité détail", (f, r) -> f.setIntNUMBERDETAIL(entier(r))));
        MUTATIONS.add(new Mutation("Seuil de réapprovisionnement", (f, r) -> f.setIntSEUILMIN(entier(r))));
        MUTATIONS.add(new Mutation("Réserve", (f, r) -> f.setBoolRESERVE(booleen(r))));
        MUTATIONS.add(new Mutation("Seuil de réserve", (f, r) -> f.setIntSEUILRESERVE(entier(r))));
        MUTATIONS.add(new Mutation("Calcul du seuil", (f, r) -> f.setBoolCALCULSEUIL(booleen(r))));
        MUTATIONS.add(new Mutation("Suggérable", (f, r) -> f.setBoolSUGGERABLE(booleen(r))));
        MUTATIONS.add(new Mutation("Q1", (f, r) -> f.setIntQ1SEUILREAPPRO(entier(r))));
        MUTATIONS.add(new Mutation("Date de péremption", (f, r) -> f.setDtPEREMPTION(
                r.nextBoolean() ? null : new Date(1_700_000_000_000L + r.nextInt(1000) * 86_400_000L))));
        MUTATIONS.add(new Mutation("Statut",
                (f, r) -> f.setStrSTATUT(new String[] { "enable", "disable", "delete", null }[r.nextInt(4)])));
    }

    private static TFamille fiche(Random r) {
        TFamille f = new TFamille();
        for (Mutation m : MUTATIONS) {
            m.m.accept(f, r);
        }
        return f;
    }

    @Test
    void ecartsSurCinqMilleFiches() {
        Random r = new Random(20261125L);
        int traces = 0;
        int sansChangement = 0;
        for (int i = 0; i < 5_000; i++) {
            TFamille f = fiche(r);
            Map<String, String> avant = ModificationFiche.photo(f);
            assertEquals(ModificationFiche.libelles(), new ArrayList<>(avant.keySet()), "ordre des champs");
            Set<String> touches = new LinkedHashSet<>();
            int n = r.nextInt(5);
            for (int k = 0; k < n; k++) {
                Mutation m = MUTATIONS.get(r.nextInt(MUTATIONS.size()));
                m.m.accept(f, r);
                touches.add(m.libelle);
            }
            Map<String, String> apres = ModificationFiche.photo(f);
            List<ModificationBl.Champ> e = ModificationFiche.ecarts(avant, apres);
            // regle : un champ est trace si et seulement si sa valeur affichee a change ; seul un champ touche peut
            // changer
            List<String> attendus = new ArrayList<>();
            for (String l : ModificationFiche.libelles()) {
                if (!avant.get(l).equals(apres.get(l))) {
                    assertTrue(touches.contains(l), "cas " + i + " : " + l + " change sans avoir ete touche");
                    attendus.add(l);
                }
            }
            List<String> vus = new ArrayList<>();
            for (ModificationBl.Champ c : e) {
                vus.add(c.libelle);
                assertEquals(avant.get(c.libelle), c.avant, "cas " + i + " avant");
                assertEquals(apres.get(c.libelle), c.apres, "cas " + i + " apres");
                assertTrue(!c.avant.isEmpty() && !c.apres.isEmpty(), "jamais de valeur vide (« (vide) »)");
            }
            assertEquals(attendus, vus, "cas " + i);
            // relecture du detail ecrit en base
            assertEquals(e, ModificationBl.lire(ModificationBl.detail(e)), "cas " + i + " relecture");
            String d = ModificationFiche.description("8014527", "R-LUME", "YAO BRIGITTE", e);
            assertTrue(d.length() <= ModificationFiche.LONGUEUR_DESCRIPTION, "cas " + i + " longueur");
            assertTrue(d.startsWith("Modification de la fiche 8014527 R-LUME par YAO BRIGITTE : "), d);
            if (d.length() < ModificationFiche.LONGUEUR_DESCRIPTION) {
                for (ModificationBl.Champ c : e) {
                    assertTrue(d.contains(c.libelle.toLowerCase(java.util.Locale.FRENCH)), d);
                }
            }
            if (e.isEmpty()) {
                sansChangement++;
            } else {
                traces++;
            }
        }
        // jeux varies : des modifications tracees et des enregistrements sans changement
        assertTrue(traces > 2_000 && sansChangement > 800, traces + " / " + sansChangement);
    }

    @Test
    void longueDescriptionCoupee() {
        List<ModificationBl.Champ> e = new ArrayList<>();
        for (String l : ModificationFiche.libelles()) {
            e.add(new ModificationBl.Champ(l, "a", "b"));
        }
        String d = ModificationFiche.description("1", "N", "A", e);
        assertEquals(ModificationFiche.LONGUEUR_DESCRIPTION, d.length());
        assertEquals(e, ModificationBl.lire(ModificationBl.detail(e)), "le detail garde tout");
    }

    @Test
    void statutsEnClair() {
        assertEquals("active", ModificationFiche.statut("enable"));
        assertEquals("désactivée", ModificationFiche.statut("disable"));
        assertEquals("supprimée", ModificationFiche.statut("delete"));
        assertEquals("(vide)", ModificationFiche.statut(null));
        assertEquals("autre", ModificationFiche.statut(" autre "));
    }
}
