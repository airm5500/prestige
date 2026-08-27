package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Diagnostic d'une suggestion qui tarde a s'ouvrir : reconnaissance de l'appel, lecture des index de la table des
 * lignes de vente, et redaction du rapport depose dans le Centre de support.
 */
class DiagnosticSuggestionLenteTest {

    /** Une ligne d'information_schema.STATISTICS : index, rang de la colonne, colonne, non_unique. */
    private static Object[] colonne(String index, int rang, String colonne, int nonUnique) {
        return new Object[] { index, rang, colonne, nonUnique };
    }

    private static List<DiagnosticSuggestionLente.Index> index(Object[]... lignes) {
        return DiagnosticSuggestionLente.index(Arrays.asList(lignes));
    }

    @Test
    @DisplayName("Seuls les appels de l'ecran des suggestions declenchent le diagnostic")
    void reconnaissanceDeLAppel() {
        assertTrue(DiagnosticSuggestionLente.estAppelSuggestion("/prestige/api/v1/suggestion/list/items"));
        assertTrue(DiagnosticSuggestionLente.estAppelSuggestion("/prestige/api/v1/suggestion/amount/abc"));
        assertFalse(DiagnosticSuggestionLente.estAppelSuggestion("/prestige/api/v1/vente/liste"));
        assertFalse(DiagnosticSuggestionLente.estAppelSuggestion(null));
    }

    @Test
    @DisplayName("L'identifiant de la suggestion est lu quel que soit le nom du parametre")
    void identifiantDeLaSuggestion() {
        assertEquals("d9fce820", DiagnosticSuggestionLente.identifiantSuggestion("orderId=d9fce820&query="));
        assertEquals("b0fc8aca", DiagnosticSuggestionLente.identifiantSuggestion("_dc=17&suggestionId=b0fc8aca"));
        assertEquals("42", DiagnosticSuggestionLente.identifiantSuggestion("id=42"));
        assertEquals("", DiagnosticSuggestionLente.identifiantSuggestion("start=0&limit=20"));
        assertEquals("", DiagnosticSuggestionLente.identifiantSuggestion(null));
    }

    @Test
    @DisplayName("Un identifiant vide ne masque pas celui qui suit")
    void identifiantVideIgnore() {
        assertEquals("abc", DiagnosticSuggestionLente.identifiantSuggestion("orderId=&suggestionId=abc"));
    }

    @Test
    @DisplayName("L'index unique qui interdit les doublons est reconnu, et lui seul")
    void uniciteVenteProduit() {
        List<DiagnosticSuggestionLente.Index> pose = index(colonne("un_vente_produit", 1, "lg_FAMILLE_ID", 0),
                colonne("un_vente_produit", 2, "lg_PREENREGISTREMENT_ID", 0));
        assertTrue(DiagnosticSuggestionLente.uniciteSur(pose, "lg_FAMILLE_ID", "lg_PREENREGISTREMENT_ID"));

        // Les memes colonnes, mais en index ordinaire : les doublons restent possibles.
        List<DiagnosticSuggestionLente.Index> ordinaire = index(colonne("idx_vente_produit", 1, "lg_FAMILLE_ID", 1),
                colonne("idx_vente_produit", 2, "lg_PREENREGISTREMENT_ID", 1));
        assertFalse(DiagnosticSuggestionLente.uniciteSur(ordinaire, "lg_FAMILLE_ID", "lg_PREENREGISTREMENT_ID"));

        // Un index unique plus large n'interdit pas deux fois le meme article sur la meme vente.
        List<DiagnosticSuggestionLente.Index> troisColonnes = index(colonne("un_large", 1, "lg_FAMILLE_ID", 0),
                colonne("un_large", 2, "lg_PREENREGISTREMENT_ID", 0), colonne("un_large", 3, "int_PRICE", 0));
        assertFalse(DiagnosticSuggestionLente.uniciteSur(troisColonnes, "lg_FAMILLE_ID", "lg_PREENREGISTREMENT_ID"));
    }

    @Test
    @DisplayName("Un index plus large convient pour l'acces, du moment qu'il commence par les bonnes colonnes")
    void indexDAcces() {
        List<DiagnosticSuggestionLente.Index> exact = index(colonne("idx_prd_famille_date", 1, "lg_FAMILLE_ID", 1),
                colonne("idx_prd_famille_date", 2, "dt_CREATED", 1));
        assertTrue(DiagnosticSuggestionLente.commencePar(exact, "lg_FAMILLE_ID", "dt_CREATED"));

        List<DiagnosticSuggestionLente.Index> plusLarge = index(colonne("idx_maison", 1, "lg_FAMILLE_ID", 1),
                colonne("idx_maison", 2, "dt_CREATED", 1), colonne("idx_maison", 3, "int_QUANTITY", 1));
        assertTrue(DiagnosticSuggestionLente.commencePar(plusLarge, "lg_FAMILLE_ID", "dt_CREATED"));

        // Les memes colonnes dans l'autre ordre ne servent pas : le serveur ne peut pas s'en servir pour la date.
        List<DiagnosticSuggestionLente.Index> ordreInverse = index(colonne("idx_date_famille", 1, "dt_CREATED", 1),
                colonne("idx_date_famille", 2, "lg_FAMILLE_ID", 1));
        assertFalse(DiagnosticSuggestionLente.commencePar(ordreInverse, "lg_FAMILLE_ID", "dt_CREATED"));

        assertFalse(DiagnosticSuggestionLente.commencePar(Collections.emptyList(), "lg_FAMILLE_ID", "dt_CREATED"));
    }

    @Test
    @DisplayName("Une table sans aucun index ne fait pas trebucher la lecture")
    void aucunIndex() {
        assertTrue(DiagnosticSuggestionLente.index(null).isEmpty());
        assertTrue(DiagnosticSuggestionLente.index(new ArrayList<>()).isEmpty());
    }

    @Test
    @DisplayName("Le rapport nomme la suggestion, les deux index manquants et compte les lignes en trop")
    void rapportCauseTrouvee() {
        List<Object[]> doublons = Arrays.asList(new Object[] { "art-1", "vente-1", 3 },
                new Object[] { "art-2", "vente-2", 2 });
        String rapport = DiagnosticSuggestionLente.rapport("sugg-861", "/prestige/api/v1/suggestion/list/items", 27400,
                5000, "kobys", false, false, doublons, false);

        assertTrue(rapport.startsWith("Suggestion lente a l'ouverture."), rapport);
        assertTrue(rapport.contains("sugg-861"), rapport);
        assertTrue(rapport.contains("27400 ms (seuil 5000 ms)"), rapport);
        assertTrue(rapport.contains("un_vente_produit (lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID) : ABSENT"), rapport);
        assertTrue(rapport.contains("idx_prd_famille_date (lg_FAMILLE_ID, dt_CREATED)          : ABSENT"), rapport);
        // 3 lignes pour un groupe + 2 pour l'autre = 3 lignes en trop
        assertTrue(rapport.contains("2 groupes en double, soit 3 lignes en trop."), rapport);
        // Un seul groupe d'une seule ligne en trop se lit au singulier.
        String unSeul = DiagnosticSuggestionLente.rapport("s", "/api/v1/suggestion/list", 9000, 5000, "u", false, false,
                Collections.singletonList(new Object[] { "art", "vente", 2 }), false);
        assertTrue(unSeul.contains("1 groupe en double, soit 1 ligne en trop."), unSeul);
        assertTrue(rapport.contains("art-1"), rapport);
        assertTrue(rapport.contains("vente-2"), rapport);
    }

    @Test
    @DisplayName("Quand l'unicite est deja posee, on n'annonce pas des doublons qu'on n'a pas cherches")
    void rapportSansRecherche() {
        String rapport = DiagnosticSuggestionLente.rapport("", "/prestige/api/v1/suggestion/list", 9000, 5000, "", true,
                true, null, false);

        assertTrue(rapport.contains("non precisee par l'appel"), rapport);
        assertTrue(rapport.contains("un_vente_produit (lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID) : en place"), rapport);
        assertTrue(rapport.contains("Recherche non lancee"), rapport);
        assertFalse(rapport.contains("groupes en double"), rapport);
        assertTrue(rapport.contains("Les deux causes connues sont ecartees"), rapport);
    }

    @Test
    @DisplayName("Sans doublon mais sans index, le rapport ne conclut pas que la lenteur vient d'ailleurs")
    void rapportSansDoublonMaisSansIndex() {
        String rapport = DiagnosticSuggestionLente.rapport("s", "/api/v1/suggestion/list", 9000, 5000, "u", false,
                false, Collections.emptyList(), false);

        assertTrue(rapport.contains("Aucun doublon trouve."), rapport);
        assertTrue(rapport.contains("Reste donc l'index manquant du point 1"), rapport);
        assertFalse(rapport.contains("la lenteur vient d'ailleurs"), rapport);
    }

    @Test
    @DisplayName("Une liste tronquee le dit, et renvoie a la requete complete")
    void rapportListeTronquee() {
        List<Object[]> doublons = new ArrayList<>();
        for (int i = 0; i < DiagnosticSuggestionLente.MAX_LIGNES_DETAILLEES + 1; i++) {
            doublons.add(new Object[] { "art-" + i, "vente-" + i, 2 });
        }
        String rapport = DiagnosticSuggestionLente.rapport("s", "/api/v1/suggestion/list/items", 30000, 5000, "u",
                false, true, doublons, true);

        assertTrue(rapport.contains("groupes au moins"), rapport);
        assertTrue(rapport.contains("liste tronquee"), rapport);
        // La derniere ligne au-dela du plafond n'est pas detaillee.
        assertFalse(rapport.contains("art-" + DiagnosticSuggestionLente.MAX_LIGNES_DETAILLEES + " "), rapport);
    }

    @Test
    @DisplayName("Le verdict distingue les etats, pour qu'un diagnostic devenu faux ne reste pas affiche")
    void verdictParEtat() {
        List<Object[]> doublons = Collections.singletonList(new Object[] { "art", "vente", 2 });
        assertEquals("index manquant et lignes de vente en double", DiagnosticSuggestionLente.verdict(false, doublons));
        assertEquals("index manquant", DiagnosticSuggestionLente.verdict(false, Collections.emptyList()));
        assertEquals("index manquant", DiagnosticSuggestionLente.verdict(false, null));
        assertEquals("lignes de vente en double", DiagnosticSuggestionLente.verdict(true, doublons));
        assertEquals("cause non identifiee", DiagnosticSuggestionLente.verdict(true, null));
        assertEquals("cause non identifiee", DiagnosticSuggestionLente.verdict(true, Collections.emptyList()));
    }

    @Test
    @DisplayName("Le verdict ne porte aucun chiffre : deux constats identiques restent regroupes")
    void verdictSansChiffre() {
        for (Object[] cas : new Object[][] { { false, null }, { true, null } }) {
            String verdict = DiagnosticSuggestionLente.verdict((Boolean) cas[0], null);
            assertFalse(verdict.matches(".*[0-9].*"), verdict);
        }
    }

    @Test
    @DisplayName("Le script joint est complet, et le technicien peut le copier tel quel")
    void scriptComplet() {
        String script = DiagnosticSuggestionLente.scriptCorrection();

        // Les suppressions passent d'abord par hmvtproduit, sinon la cle etrangere refuse (erreur 1451).
        assertTrue(script.indexOf("DELETE FROM hmvtproduit") < script.indexOf("DELETE d"), script);
        assertTrue(script.contains("ADD UNIQUE KEY `un_vente_produit`"), script);
        assertTrue(script.contains("ADD INDEX `idx_prd_famille_date`"), script);
        assertTrue(script.contains("ANALYZE TABLE t_preenregistrement_detail;"), script);
        assertTrue(script.contains("ANALYZE TABLE hmvtproduit;"), script);
        // La liste des lignes a supprimer passe par une table derivee : elle n'est calculee qu'une fois,
        // au lieu d'etre reevaluee pour chaque ligne de hmvtproduit.
        assertTrue(script.contains(") a_supprimer"), script);
        assertTrue(script.contains("SELECT d.*"), script);
    }

    @Test
    @DisplayName("Le rapport porte toujours le script, meme quand aucune cause connue n'est trouvee")
    void scriptToujoursJoint() {
        String rapport = DiagnosticSuggestionLente.rapport("s", "/api/v1/suggestion/list", 6000, 5000, "u", true, true,
                null, false);
        assertTrue(rapport.contains(DiagnosticSuggestionLente.scriptCorrection()), rapport);
        assertTrue(rapport.contains("Les deux causes connues sont ecartees : la lenteur vient d'ailleurs."), rapport);
    }
}
