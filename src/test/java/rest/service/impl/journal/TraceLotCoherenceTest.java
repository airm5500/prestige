package rest.service.impl.journal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.enumeration.TypeLog;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.impl.achats.ModificationBl;

/**
 * Retours du 23/11 : trace des mises a jour en lot de la fiche article, sur 3 000 lots tires au hasard (graine fixe).
 * Regles : une ligne par article dont une valeur affichee change, aucune pour un article deja a la valeur voulue ; le
 * detail donne avant → apres et se relit a l'identique ; la description commence par « Modification en lot », tient en
 * 255 caracteres et l'onglet « Historique » l'affiche « Modification en lot ».
 */
class TraceLotCoherenceTest {

    private static final List<TraceLot.Colonne> TOUTES = TraceLot.colonnes(TraceLot.GROSSISTE, TraceLot.FAMILLE,
            TraceLot.TVA, TraceLot.CODE_REMISE, TraceLot.TABLEAU, TraceLot.LABORATOIRE, TraceLot.GAMME,
            TraceLot.ORDONNANCIER, TraceLot.SENSIBLE, TraceLot.REMISE, TraceLot.Q1, TraceLot.Q2, TraceLot.RETENU);

    /** Valeur brute, telle que la base la rend, pour une colonne. */
    private static Object brut(TraceLot.Colonne c, Random r) {
        int k = r.nextInt(5);
        if (k == 0) {
            return null;
        }
        if (c == TraceLot.TVA) {
            return new int[] { 0, 9, 18 }[r.nextInt(3)];
        }
        if (c == TraceLot.Q1 || c == TraceLot.Q2) {
            return r.nextBoolean() ? (Object) (r.nextInt(3000) - 2) : (Object) BigInteger.valueOf(r.nextInt(5));
        }
        if (c == TraceLot.ORDONNANCIER || c == TraceLot.SENSIBLE || c == TraceLot.REMISE || c == TraceLot.RETENU) {
            return new Object[] { true, false, 0, 1, (short) 1, "1", "0" }[r.nextInt(7)];
        }
        return new String[] { "LABOREX", "COPHARMED", "", "  ", "A", "ÉTÉ 50%" }[r.nextInt(6)];
    }

    private static Map<String, String> valeurs(List<TraceLot.Colonne> cols, Object[] bruts) {
        Map<String, String> v = new LinkedHashMap<>();
        for (int i = 0; i < cols.size(); i++) {
            v.put(cols.get(i).libelle, cols.get(i).format.apply(bruts[i]));
        }
        return v;
    }

    @Test
    void lotsAuHasard() {
        Random r = new Random(20261123L);
        int lignes = 0;
        int inchanges = 0;
        for (int lot = 0; lot < 3_000; lot++) {
            // une operation touche une ou deux colonnes (MAJ seuil : Q1 et Q2)
            List<TraceLot.Colonne> cols = new ArrayList<>();
            cols.add(TOUTES.get(r.nextInt(TOUTES.size())));
            if (r.nextInt(4) == 0) {
                TraceLot.Colonne c2 = TOUTES.get(r.nextInt(TOUTES.size()));
                if (!cols.contains(c2)) {
                    cols.add(c2);
                }
            }
            int n = 1 + r.nextInt(30);
            Map<String, TraceLot.Photo> avant = new LinkedHashMap<>();
            Map<String, TraceLot.Photo> apres = new LinkedHashMap<>();
            Object[] cible = new Object[cols.size()];
            for (int k = 0; k < cols.size(); k++) {
                cible[k] = brut(cols.get(k), r);
            }
            for (int a = 0; a < n; a++) {
                String id = "F" + lot + "-" + a;
                Object[] b = new Object[cols.size()];
                for (int k = 0; k < cols.size(); k++) {
                    // un article sur trois est deja a la valeur voulue
                    b[k] = r.nextInt(3) == 0 ? cible[k] : brut(cols.get(k), r);
                }
                avant.put(id, new TraceLot.Photo("80" + a, "ART " + a, valeurs(cols, b)));
                // un article sur 20 disparait entre les deux lectures (supprime ailleurs) : jamais de trace
                if (r.nextInt(20) != 0) {
                    apres.put(id, new TraceLot.Photo("80" + a, "ART " + a, valeurs(cols, cible)));
                }
            }
            Map<String, List<ModificationBl.Champ>> e = TraceLot.ecarts(avant, apres);
            for (String id : avant.keySet()) {
                TraceLot.Photo b = avant.get(id);
                TraceLot.Photo p = apres.get(id);
                boolean change = p != null && !b.valeurs.equals(p.valeurs);
                assertEquals(change, e.containsKey(id), "lot " + lot + " article " + id);
                if (!change) {
                    inchanges++;
                    continue;
                }
                lignes++;
                List<ModificationBl.Champ> champs = e.get(id);
                for (ModificationBl.Champ c : champs) {
                    assertEquals(b.valeurs.get(c.libelle), c.avant);
                    assertEquals(p.valeurs.get(c.libelle), c.apres);
                    assertFalse(c.avant.equals(c.apres), "jamais un champ inchange");
                    assertFalse(c.avant.isEmpty() || c.apres.isEmpty(), "jamais de valeur vide");
                }
                assertEquals(champs, ModificationBl.lire(ModificationBl.detail(champs)), "relecture du detail");
                String d = TraceLot.description("MAJ seuil", p.cip, p.nom, "YAO BRIGITTE", champs);
                assertTrue(d.startsWith(TraceLot.PREFIXE + " (MAJ seuil) de la fiche " + p.cip + " "), d);
                assertTrue(d.length() <= ModificationFiche.LONGUEUR_DESCRIPTION);
                assertEquals("Modification en lot", HistoriqueFiche.action(TypeLog.MODIFICATION_FICHE_PRODUIT, d));
            }
        }
        assertTrue(lignes > 15_000 && inchanges > 8_000, lignes + " / " + inchanges);
    }

    @Test
    void misesEnForme() {
        assertEquals("oui", TraceLot.oui(1));
        assertEquals("oui", TraceLot.oui(true));
        assertEquals("oui", TraceLot.oui("1"));
        assertEquals("non", TraceLot.oui(0));
        assertEquals("non", TraceLot.oui("0"));
        assertEquals("(vide)", TraceLot.oui(null));
        assertEquals("(vide)", TraceLot.oui(" "));
        // « Article retenu » : coche a l'ecran = bool_ACCOUNT a 0
        assertEquals("oui", TraceLot.RETENU.format.apply(0));
        assertEquals("non", TraceLot.RETENU.format.apply(1));
        assertEquals("(vide)", TraceLot.RETENU.format.apply(null));
        assertEquals("18 %", TraceLot.TVA.format.apply(18));
        assertEquals("0 %", TraceLot.TVA.format.apply(0));
        assertEquals("(vide)", TraceLot.TVA.format.apply(null));
        assertEquals("1 500", TraceLot.Q1.format.apply(1500).replace(' ', ' ').replace(' ', ' '));
        assertEquals("(vide)", TraceLot.GROSSISTE.format.apply(null));
        assertEquals(TraceLot.GROSSISTE.format.apply(""), TraceLot.GROSSISTE.format.apply("  "));
    }

    @Test
    void historiqueDistingueLotEtFiche() {
        assertEquals("Modification en lot", HistoriqueFiche.action(TypeLog.MODIFICATION_FICHE_PRODUIT,
                "Modification en lot (Ordonnancier) de la fiche 1 A par B : ordonnancier"));
        assertEquals(HistoriqueFiche.action(TypeLog.MODIFICATION_FICHE_PRODUIT),
                HistoriqueFiche.action(TypeLog.MODIFICATION_FICHE_PRODUIT, "Modification de la fiche 1 A par B : cip"));
        assertEquals(HistoriqueFiche.action(TypeLog.MODIFICATION_FICHE_PRODUIT),
                HistoriqueFiche.action(TypeLog.MODIFICATION_FICHE_PRODUIT, null));
        // une autre action qui commencerait par le meme texte n'est pas renommee
        assertEquals(HistoriqueFiche.action(TypeLog.ORDONNANCIER_PRODUIT),
                HistoriqueFiche.action(TypeLog.ORDONNANCIER_PRODUIT, "Modification en lot (x)"));
    }

    @Test
    void longueDescriptionCoupee() {
        List<ModificationBl.Champ> e = new ArrayList<>();
        for (TraceLot.Colonne c : TOUTES) {
            e.add(new ModificationBl.Champ(c.libelle, "a", "b"));
        }
        String nom = new String(new char[200]).replace('\0', 'X');
        String d = TraceLot.description("Mise à jour des articles", "8014527", nom, "A", e);
        assertEquals(ModificationFiche.LONGUEUR_DESCRIPTION, d.length());
        assertTrue(d.startsWith(TraceLot.PREFIXE));
    }
}
