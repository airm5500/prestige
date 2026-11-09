package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Donnees d'extranet dans les suggestions (demande du 09/11). Formats releves sur le poste : Ubipharm PRODUITS_UG (« 20
 * U → 02 UG ; 50 U → 10 UG »), Copharmed promotions (« 1 UG / 10 ; 10 UG / 50 »), DPCI offres (« 25 à 49 : 2 UG ; 50 à
 * 99 : 7 UG »), TEDIS catalogue par agence et commandes en attente (CIP dans la designation ou designation tronquee).
 * Regles verifiees sur des milliers de produits tires au hasard (graine fixe) : un produit ne recoit que les offres des
 * lignes qui le designent (code, PSCODE ou code article), toutes ses offres, sans doublon ; le stock n'est rendu que si
 * le parametre le demande.
 */
class InfosGrossisteCoherenceTest {

    private static final Map<String, JSONArray> TITRES = new HashMap<>();
    static {
        TITRES.put("PRODUITS_UG", new JSONArray(Arrays.asList("Référence", "Produit", "CIP", "Disponibilité",
                "Paliers (quantité → unités gratuites)")));
        TITRES.put("COPHARMED_PROMOTIONS",
                new JSONArray(Arrays.asList("Promotion", "Début", "Fin", "Type", "Désignation", "Code", "DCI",
                        "Colisage", "Prix HT", "Taux TVA", "Prix TTC", "Prix public", "Unités gratuites")));
        TITRES.put("COPHARMED_CATALOGUE", new JSONArray(Arrays.asList("Désignation", "Code", "DCI", "Colisage",
                "Prix HT", "Taux TVA", "Prix TTC", "Prix public", "Disponibilité", "Promotion", "Unités gratuites")));
        TITRES.put("DPCI_OFFRES", new JSONArray(Arrays.asList("Offre", "Laboratoire", "Début", "Fin", "Désignation",
                "Code", "Code facture", "Paliers (UG, remise)")));
        TITRES.put("TEDIS_CATALOGUE", new JSONArray(Arrays.asList("Agence", "Date d'entrée", "Désignation", "CIP",
                "EAN", "Famille", "Nature", "Laboratoire", "Dispo", "Cession HT", "Public TTC", "Colisage")));
        TITRES.put("TEDIS_COMMANDES_ATTENTE",
                new JSONArray(Arrays.asList("Commande du", "Désignation", "Qté", "Cession HT", "Public TTC")));
    }

    private static InfosGrossiste.Ligne ug(String ps, String cip, String paliers) {
        return new InfosGrossiste.Ligne("PRODUITS_UG", null, ps, cip,
                new JSONArray(Arrays.asList(ps, "PRODUIT " + ps, cip, "En stock — BKE : Oui, YOP : Oui", paliers)));
    }

    @Test
    void formatsReleves() {
        InfosGrossiste.Produit abz = new InfosGrossiste.Produit("L1", "ABZ 200MG/5ML SUSP BUV F/10ML",
                Arrays.asList("3000000258453", null, ""), Arrays.asList("ABZ2100"));
        List<InfosGrossiste.Ligne> l = Arrays.asList(ug("ABZ2100", "3000000258453", "20 U → 02 UG ; 50 U → 10 UG"),
                ug("ABZ4100", "8059783", "20 U → 02 UG"));
        JSONObject o = InfosGrossiste.infos(SourceExtranet.UBIPHARM, abz, l, TITRES, false);
        assertEquals(Arrays.asList("20 U → 02 UG", "50 U → 10 UG"), o.getJSONArray("ug").toList());
        assertFalse(o.has("stock"), "parametre a 0 : pas de stock");
        assertEquals(Collections.singletonList("En stock — BKE : Oui, YOP : Oui"),
                InfosGrossiste.infos(SourceExtranet.UBIPHARM, abz, l, TITRES, true).getJSONArray("stock").toList());

        /* DPCI : cip = EAN, pscode = code DPCI ; le produit est trouve par son code article chez DPCI */
        InfosGrossiste.Produit amical = new InfosGrossiste.Produit("L2", "AMICAL CPR 10MG BT30",
                Arrays.asList("9999999"), Arrays.asList("2471795"));
        InfosGrossiste.Ligne dpci = new InfosGrossiste.Ligne("DPCI_OFFRES", null, "2471795", "3000000365236",
                new JSONArray(Arrays.asList("CAMPAGNE UG", "*****", "2026-10-09", "2026-11-09", "AMICAL CPR 10MG BT30",
                        "2471795", "3000000365236", "25 à 49 : 2 UG ; 50 à 99 : 7 UG ; dès 200 : 50 UG")));
        assertEquals(3, InfosGrossiste.infos(SourceExtranet.DPCI, amical, Collections.singletonList(dpci), TITRES, true)
                .getJSONArray("ug").length());

        /* TEDIS : stock par agence ; commandes en attente par CIP dans la designation ou designation tronquee */
        InfosGrossiste.Produit nozinan = new InfosGrossiste.Produit("L3", "NOZINAN 25MG AMP INJ 1ML B/5",
                Arrays.asList("9999072"), Collections.emptyList());
        InfosGrossiste.Produit physiolac = new InfosGrossiste.Produit("L4", "PHYSIOLAC CROISSANCE LAIT PDRE 800G",
                Arrays.asList("1234567"), Collections.emptyList());
        List<InfosGrossiste.Ligne> tedis = Arrays.asList(
                new InfosGrossiste.Ligne("TEDIS_CATALOGUE", "GAGNOA", null, "9999072",
                        new JSONArray(Arrays.asList("GAGNOA", "", "NOZINAN", "9999072", "", "", "", "", "Oui", "1", "2",
                                "3"))),
                new InfosGrossiste.Ligne("TEDIS_CATALOGUE", "BOUAKE", null, "9999072",
                        new JSONArray(Arrays.asList("BOUAKE", "", "NOZINAN", "9999072", "", "", "", "", "Non", "1", "2",
                                "3"))),
                new InfosGrossiste.Ligne("TEDIS_COMMANDES_ATTENTE", "29/10/2026 13:03:22", null, null,
                        new JSONArray(Arrays.asList("29/10/2026 13:03:22",
                                "NOZINAN 25MG AMP INJ 1ML B/5 CIP : 9999072 / EAN : 9999072 - Colisage : 100", "30",
                                "1 495 F", "2 260 F"))),
                new InfosGrossiste.Ligne("TEDIS_COMMANDES_ATTENTE", "17/10/2026 12:52:00", null, null,
                        new JSONArray(Arrays.asList("17/10/2026 12:52:00", "PHYSIOLAC CROISSANCE LAIT PDRE...", "12",
                                "3 982 F", "4 770 F"))));
        JSONObject n = InfosGrossiste.infos(SourceExtranet.TEDIS, nozinan, tedis, TITRES, true);
        assertEquals("[\"GAGNOA : Oui\",\"BOUAKE : Non\"]", n.getJSONArray("stock").toString());
        assertEquals(1, n.getJSONArray("enCommande").length());
        assertEquals("30", n.getJSONArray("enCommande").getJSONObject(0).getString("quantite"));
        JSONObject ph = InfosGrossiste.infos(SourceExtranet.TEDIS, physiolac, tedis, TITRES, true);
        assertEquals(1, ph.getJSONArray("enCommande").length(), "designation tronquee");
        assertEquals("17/10/2026 12:52:00", ph.getJSONArray("enCommande").getJSONObject(0).getString("date"));
        assertEquals(0, ph.getJSONArray("stock").length());
    }

    @Test
    void designationTropCourte_aucuneCorrespondance() {
        InfosGrossiste.Produit p = new InfosGrossiste.Produit("L", "DOLIPRANE 1000MG CPR B/8", Arrays.asList("1"),
                Collections.emptyList());
        InfosGrossiste.Ligne l = new InfosGrossiste.Ligne("TEDIS_COMMANDES_ATTENTE", "d", null, null,
                new JSONArray(Arrays.asList("d", "DOLI...", "3", "", "")));
        assertEquals(0, InfosGrossiste.infos(SourceExtranet.TEDIS, p, Collections.singletonList(l), TITRES, true)
                .getJSONArray("enCommande").length());
    }

    @Test
    void regles_hasard() {
        Random r = new Random(20261109L);
        int produits = 0, avecUg = 0;
        for (int t = 0; t < 60; t++) {
            List<InfosGrossiste.Ligne> lignes = new ArrayList<>();
            int n = 20 + r.nextInt(80);
            for (int i = 0; i < n; i++) {
                StringBuilder pal = new StringBuilder();
                int k = r.nextInt(4);
                for (int j = 0; j < k; j++) {
                    pal.append(j == 0 ? "" : " ; ").append(10 * (j + 1)).append(" U → ").append(j + 1).append(" UG");
                }
                if (r.nextInt(8) == 0 && k > 0) {
                    pal.append(" ; 10 U → 1 UG"); /* doublon : rendu une seule fois */
                }
                lignes.add(ug("PS" + (i % 50), String.valueOf(3_400_000 + i % 50), pal.toString()));
            }
            for (int p = 0; p < 50; p++) {
                boolean parCip = r.nextBoolean();
                InfosGrossiste.Produit pr = new InfosGrossiste.Produit("P" + p, "PRODUIT",
                        parCip ? Arrays.asList(String.valueOf(3_400_000 + p)) : Arrays.asList("999"),
                        parCip ? Collections.emptyList() : Arrays.asList("ps" + p));
                JSONObject o = InfosGrossiste.infos(SourceExtranet.UBIPHARM, pr, lignes, TITRES, r.nextBoolean());
                List<String> attendu = new ArrayList<>();
                for (InfosGrossiste.Ligne l : lignes) {
                    if (("PS" + p).equals(l.pscode)) {
                        for (String x : InfosGrossiste.paliers(l.cellules.getString(4))) {
                            if (!attendu.contains(x)) {
                                attendu.add(x);
                            }
                        }
                    }
                }
                assertEquals(new JSONArray(attendu).toString(), o.getJSONArray("ug").toString(), "produit " + p);
                List<Object> vus = o.getJSONArray("ug").toList();
                assertEquals(vus.size(), new java.util.HashSet<>(vus).size(), "sans doublon");
                produits++;
                avecUg += attendu.isEmpty() ? 0 : 1;
            }
        }
        assertTrue(produits == 3000 && avecUg > 1000, produits + " / " + avecUg);
    }

    @Test
    void paliers() {
        assertEquals(Arrays.asList("1 UG / 10", "10 UG / 50"), InfosGrossiste.paliers("1 UG / 10 ;  10 UG /  50 ; "));
        assertTrue(InfosGrossiste.paliers(null).isEmpty());
        assertTrue(InfosGrossiste.paliers("").isEmpty());
    }
}
