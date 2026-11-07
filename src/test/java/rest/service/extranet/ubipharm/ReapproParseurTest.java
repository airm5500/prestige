package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.ParcoursDataTables;
import rest.service.extranet.ubipharm.LigneReapproUbipharm.DisponibiliteAgence;

/**
 * Lecture des lignes de reapprovisionnement sur un jeu reconstitue a partir du plan du 07/11 (§6, selecteurs du §3) :
 * colisages « 120, 140 » avec data-colisage="120", N/A, ligne sans CIP, plusieurs agences, entites, script ignore,
 * ligne de moins de six cellules refusee.
 */
class ReapproParseurTest {

    static final String JEU = "/extranet/ubipharm/reappro/reconstitue-page-1.json";

    private static List<LigneReapproUbipharm> lignes;

    static String lireRessource(String chemin) throws IOException {
        try (InputStream in = ReapproParseurTest.class.getResourceAsStream(chemin)) {
            assertNotNull(in, chemin);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @BeforeAll
    static void lire() throws Exception {
        JSONObject racine = new JSONObject(lireRessource(JEU));
        lignes = new ArrayList<>();
        ParcoursDataTables.Enveloppe e = ParcoursDataTables.Enveloppe.lire(racine);
        assertEquals(5, e.recordsTotal);
        for (int i = 0; i < e.data.length(); i++) {
            lignes.add(ReapproParseur.ligne(i, e.data.getJSONArray(i)));
        }
        assertEquals(5, lignes.size());
    }

    @Test
    void ligneCompleteLueChampParChamp() {
        LigneReapproUbipharm l = lignes.get(0);
        assertEquals(0, l.position);
        assertEquals("FAIR248", l.pscode);
        assertEquals("XTRA 1000ML", l.designation);
        assertEquals("3000001262862", l.code);
        assertEquals("PARAPHARMACIE", l.categorie);
        assertEquals("06/11/2026", l.dateAffichee);
        assertEquals(LocalDate.of(2026, 11, 6), l.date);
        assertEquals("BKE", l.codeAgence);
        assertEquals("Normal", l.statut);
        assertEquals("FAIR248", l.pscodeCache);
        assertEquals("3000001262862", l.cipCache);
        assertEquals("BKE", l.etcodaCache);
        assertEquals(6, l.cellulesBrutes.size());
        assertTrue(l.cellulesBrutes.get(0).contains("popup-produit"));
    }

    @Test
    void colisagesAfficheesListeEtAttributBrutSepares() {
        DisponibiliteAgence bke = lignes.get(0).disponibilites.get(0);
        assertEquals("BKE", bke.etcode);
        assertEquals("BOUAKE", bke.etlib);
        assertEquals("En stock", bke.dispo);
        assertEquals(List.of(120, 140), bke.colisages);
        assertEquals("120, 140", bke.colisageTexte);
        assertEquals("120", bke.dataColisage);
    }

    @Test
    void naResteInconnuJamaisZero() {
        DisponibiliteAgence yop = lignes.get(0).disponibilites.get(1);
        assertEquals("YOP", yop.etcode);
        assertEquals("ABIDJAN YOPOUGON", yop.etlib);
        assertEquals("N/A", yop.dispo);
        assertNull(yop.colisages);
        assertEquals("N/A", yop.colisageTexte);
        assertEquals("", yop.dataColisage);
        assertEquals(JSONObject.NULL, yop.toJson().get("colisages"));
    }

    @Test
    void zeroAfficheResteZeroDistinctDeInconnuEtDeVide() {
        DisponibiliteAgence zero = lignes.get(3).disponibilites.get(0);
        assertEquals(List.of(0), zero.colisages);
        assertEquals("0", zero.dataColisage);
        /* texte de colisage vide : liste vide, attribut absent : null */
        DisponibiliteAgence vide = lignes.get(2).disponibilites.get(2);
        assertEquals(Collections.emptyList(), vide.colisages);
        assertEquals("", vide.colisageTexte);
        assertNull(vide.dataColisage);
    }

    @Test
    void ligneSansCip() {
        LigneReapproUbipharm l = lignes.get(1);
        assertEquals("0071AB", l.pscode);
        assertEquals("COMPRESSES STERILES 10X10", l.designation);
        assertNull(l.code);
        assertNull(l.categorie);
        assertTrue(l.details.isEmpty());
        /* champ cache present mais vide : "" et non null */
        assertEquals("", l.cipCache);
        assertEquals("0071AB", l.pscodeCache);
        assertEquals(List.of(50), l.disponibilites.get(0).colisages);
        assertEquals("Oui", l.disponibilites.get(0).dispo);
    }

    @Test
    void plusieursAgencesEntitesEtScriptIgnore() {
        LigneReapproUbipharm l = lignes.get(2);
        assertEquals("CRÈME HYDRATANTE & Réparatrice", l.designation);
        assertEquals("0034009123456", l.code);
        assertEquals("DERMO & SOINS", l.categorie);
        assertEquals("Rupture", l.statut);
        assertEquals("0034009123456", l.cipCache);
        assertEquals(3, l.disponibilites.size());
        assertEquals(List.of("GNA", "VRI", "BKE"), List.of(l.disponibilites.get(0).etcode,
                l.disponibilites.get(1).etcode, l.disponibilites.get(2).etcode));
        assertEquals(List.of(6, 12, 24), l.disponibilites.get(0).colisages);
        assertEquals("6", l.disponibilites.get(0).dataColisage);
        assertEquals("ABIDJAN VRIDI", l.disponibilites.get(1).etlib);
        String json = l.toJson().toString();
        assertFalse(json.contains("PIEGE"), json);
        assertFalse(json.contains("document.write"), json);
    }

    @Test
    void cipEnChaineAvecZerosDeTete() {
        assertEquals("0034009123456", lignes.get(2).code);
        assertTrue(lignes.get(2).toJson().get("cipCache") instanceof String);
    }

    @Test
    void ligneDegradeeToleree() {
        LigneReapproUbipharm l = lignes.get(4);
        assertNull(l.pscode);
        assertNull(l.designation);
        assertEquals("2026-11-03", l.dateAffichee);
        assertNull(l.date, "format non explicite : pas de date devinee");
        assertEquals("", l.codeAgence);
        assertNull(l.statut, "cellule JSON null : null, pas vide");
        assertTrue(l.disponibilites.isEmpty());
        /* seuls les champs caches sont lus : un champ texte nomme cip_ est ignore */
        assertNull(l.cipCache);
        assertNull(l.pscodeCache);
        assertNull(l.etcodaCache);
        assertNull(l.cellulesBrutes.get(3));
    }

    @Test
    void memeProduitSurDeuxAgencesDonneDeuxLignes() {
        long n = lignes.stream().filter(l -> "FAIR248".equals(l.pscode)).count();
        assertEquals(2, n);
        assertEquals("BKE", lignes.get(0).codeAgence);
        assertEquals("YOP", lignes.get(3).codeAgence);
    }

    @Test
    void toJsonSansBaliseNiCelluleBrute() {
        for (LigneReapproUbipharm l : lignes) {
            String json = l.toJson().toString();
            assertFalse(json.matches("(?s).*<\\s*[a-zA-Z/!].*"), json);
            assertFalse(l.toJson().has("cellulesBrutes"));
        }
    }

    @Test
    void moinsDeSixCellulesRefusee() {
        JSONArray cinq = new JSONArray().put("a").put("b").put("c").put("d").put("e");
        ExtranetException e = assertThrows(ExtranetException.class, () -> ReapproParseur.ligne(7, cinq));
        assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
        assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                assertThrows(ExtranetException.class, () -> ReapproParseur.ligne(0, new JSONArray())).nature());
        assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                assertThrows(ExtranetException.class, () -> ReapproParseur.ligne(0, null)).nature());
    }

    @Test
    void prefixeDesChampsCaches() {
        assertEquals("cip", ReapproParseur.prefixe("cip_FAIR248"));
        assertEquals("etcoda", ReapproParseur.prefixe("ETCODA[2]"));
        assertEquals("pscode", ReapproParseur.prefixe("pscode"));
        assertEquals("", ReapproParseur.prefixe(null));
        assertEquals("cipx", ReapproParseur.prefixe("cipx_1"));
    }
}
