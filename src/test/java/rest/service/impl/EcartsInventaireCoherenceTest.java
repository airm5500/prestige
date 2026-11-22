package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.report.pdf.TableauPdf;

/**
 * Plan du 21/11, point 12 : regles de la liste des ecarts d'inventaire (EcartsInventaire), sur des milliers
 * d'inventaires tires au hasard (graine fixe) : ecart = compte - stock machine ; lignes retenues selon le filtre (tous
 * les ecarts, manquants, surplus), aucune perdue ni doublee ; valeur de l'ecart = prix x ecart ; total d'un groupe =
 * somme de ses lignes ; total general = somme des groupes ; colonnes stock machine et reserve selon les options, la
 * reserve imprimee = celle lue.
 */
class EcartsInventaireCoherenceTest {

    private static final String[] FILTRES = { "", "manquant", "surplus", "ALL", "MANQUANT" };

    private static long lire(String s) {
        return Long.parseLong(s.replace(" ", ""));
    }

    private static List<EcartsInventaire.Ligne> tirer(Random r) {
        int n = r.nextInt(40);
        List<EcartsInventaire.Ligne> l = new ArrayList<>();
        String[] groupes = { "Rayon A", "Rayon B", "Réserve", null, "Frigo" };
        for (int i = 0; i < n; i++) {
            int machine = r.nextInt(4) == 0 ? 0 : r.nextInt(500) - (r.nextInt(10) == 0 ? 50 : 0);
            int compte = r.nextInt(3) == 0 ? machine : Math.max(0, machine + r.nextInt(41) - 20);
            l.add(new EcartsInventaire.Ligne(groupes[r.nextInt(groupes.length)], "CIP" + i, "Produit " + i,
                    r.nextInt(3) == 0 ? 0 : r.nextInt(90000), r.nextInt(60000), machine, compte,
                    r.nextInt(4) == 0 ? 0 : r.nextInt(300)));
        }
        return l;
    }

    @Test
    void reglesDesEcartsSurDesMilliersDInventaires() {
        Random r = new Random(21112026L);
        for (int cas = 0; cas < 6000; cas++) {
            List<EcartsInventaire.Ligne> lignes = tirer(r);
            String filtre = FILTRES[r.nextInt(FILTRES.length)];
            boolean stock = r.nextBoolean(), reserve = r.nextBoolean();
            List<TableauPdf.Section> sections = EcartsInventaire.sections(lignes, filtre, stock, reserve);
            String[] entetes = EcartsInventaire.entetes(stock, reserve);
            int iEcart = Arrays.asList(entetes).indexOf("Écart"),
                    iReserve = Arrays.asList(entetes).indexOf("Stock réserve");
            int iMachine = Arrays.asList(entetes).indexOf("Stock machine"),
                    iCompte = Arrays.asList(entetes).indexOf("Stock compté");
            assertEquals(stock, iMachine >= 0, "colonne stock machine selon l'option");
            assertEquals(reserve, iReserve >= 0, "colonne reserve selon l'option");

            int attendus = 0;
            long ev = 0, ea = 0, cv = 0, ca = 0, e = 0;
            for (EcartsInventaire.Ligne l : lignes) {
                assertEquals(l.compte - l.machine, l.ecart(), "ecart = compte - stock machine");
                boolean garde = "manquant".equalsIgnoreCase(filtre) ? l.ecart() < 0
                        : "surplus".equalsIgnoreCase(filtre) ? l.ecart() > 0 : l.ecart() != 0;
                assertEquals(garde, EcartsInventaire.retenue(l, filtre));
                if (garde) {
                    attendus++;
                    e += l.ecart();
                    ev += l.prixVente * l.ecart();
                    ea += l.prixAchat * l.ecart();
                    cv += l.prixVente * l.compte;
                    ca += l.prixAchat * l.compte;
                }
            }

            int imprimees = 0;
            long sommeGroupes = 0;
            for (TableauPdf.Section s : sections.subList(0, sections.size() - 1)) {
                List<String[]> ls = s.lignes;
                long ecartGroupe = 0, evGroupe = 0, eaGroupe = 0, resGroupe = 0;
                for (String[] v : ls.subList(0, ls.size() - 1)) {
                    imprimees++;
                    assertEquals(entetes.length, v.length);
                    long pv = lire(v[2]), pa = lire(v[3]), ec = Long.parseLong(v[iEcart]);
                    assertTrue(ec != 0, "jamais une ligne sans ecart");
                    if (stock) {
                        assertEquals(Long.parseLong(v[iCompte]) - Long.parseLong(v[iMachine]), ec);
                    }
                    assertEquals(pv * ec, lire(v[v.length - 2]), "valeur de l'ecart au prix de vente");
                    assertEquals(pa * ec, lire(v[v.length - 1]), "valeur de l'ecart au prix d'achat");
                    if (reserve) {
                        int res = Integer.parseInt(v[iReserve]);
                        assertTrue(res >= 0);
                        resGroupe += res;
                    }
                    ecartGroupe += ec;
                    evGroupe += pv * ec;
                    eaGroupe += pa * ec;
                }
                String[] total = ls.get(ls.size() - 1);
                assertTrue(total[1].startsWith("Total " + s.titre + " (" + (ls.size() - 1) + " produit"), total[1]);
                assertEquals(ecartGroupe, Long.parseLong(total[iEcart]), "total du groupe = somme de ses lignes");
                assertEquals(evGroupe, lire(total[total.length - 2]));
                assertEquals(eaGroupe, lire(total[total.length - 1]));
                if (reserve) {
                    assertEquals(resGroupe, Long.parseLong(total[iReserve]));
                }
                sommeGroupes += ecartGroupe;
            }
            assertEquals(attendus, imprimees, "aucune ligne perdue ni doublee");
            String[] g = sections.get(sections.size() - 1).lignes.get(0);
            assertEquals("Total général", sections.get(sections.size() - 1).titre);
            assertEquals(attendus, Integer.parseInt(g[0]));
            assertEquals(e, Long.parseLong(g[1]));
            assertEquals(sommeGroupes, Long.parseLong(g[1]), "total general = somme des groupes");
            assertEquals(cv, lire(g[2]));
            assertEquals(ca, lire(g[3]));
            assertEquals(ev, lire(g[4]));
            assertEquals(ea, lire(g[5]));
        }
    }

    @Test
    void groupesDansLOrdreDeLaRequeteSansRegroupementVide() {
        List<EcartsInventaire.Ligne> l = new ArrayList<>();
        l.add(new EcartsInventaire.Ligne("Z1", "1", "A", 100, 80, 5, 3, 0));
        l.add(new EcartsInventaire.Ligne("Z1", "2", "B", 100, 80, 5, 5, 7));
        l.add(new EcartsInventaire.Ligne("Z2", "3", "C", 1000, 800, 2, 9, 4));
        l.add(new EcartsInventaire.Ligne(" ", "4", "D", 10, 8, 1, 0, 0));
        Map<String, List<EcartsInventaire.Ligne>> g = EcartsInventaire.groupes(l, "");
        assertEquals(List.of("Z1", "Z2", "Sans regroupement"), new ArrayList<>(g.keySet()));
        assertEquals(1, g.get("Z1").size(), "la ligne sans ecart n'est pas imprimee");
        assertEquals(List.of("Z2"), new ArrayList<>(EcartsInventaire.groupes(l, "surplus").keySet()));
        assertEquals(List.of("Z1", "Sans regroupement"),
                new ArrayList<>(EcartsInventaire.groupes(l, "manquant").keySet()));
    }

    @Test
    void nombresAuFormatDeLOfficine() {
        assertEquals("0", EcartsInventaire.nombre(0));
        assertEquals("999", EcartsInventaire.nombre(999));
        assertEquals("1 000", EcartsInventaire.nombre(1000));
        assertEquals("-1 234 567", EcartsInventaire.nombre(-1234567));
        Random r = new Random(22112026L);
        for (int i = 0; i < 20000; i++) {
            long v = (long) (r.nextGaussian() * 1e9);
            assertEquals(v, lire(EcartsInventaire.nombre(v)));
        }
    }

    @Test
    void sousTitreDitLeFiltreEtLesOptions() {
        assertEquals("INV 1 · Tous les écarts", EcartsInventaire.sousTitre("INV 1", "", false, false, "x"));
        assertEquals("INV 1 · Manquants (écart négatif) · avec le stock machine · stock réserve au 22/11/2026 10:00",
                EcartsInventaire.sousTitre("INV 1", "manquant", true, true, "22/11/2026 10:00"));
        assertEquals("INV 1 · Surplus (écart positif)",
                EcartsInventaire.sousTitre("INV 1", "SURPLUS", false, false, "x"));
    }
}
