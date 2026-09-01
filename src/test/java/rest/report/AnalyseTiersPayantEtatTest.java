package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import net.sf.jasperreports.engine.JasperPrint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.dto.AnalyseTiersPayantDTO;

/**
 * Mise en page des deux editions de l'analyse tiers payants.
 *
 * <p>
 * Releve de recette : le nom du tiers payant passe sur deux lignes et le trait de separation le traverse. Le champ du
 * nom s'etirait seul - les autres colonnes de la ligne restaient a leur hauteur d'origine - et le trait etait pose a
 * une hauteur fixe, donc au beau milieu de la seconde ligne du nom.
 *
 * <p>
 * Les noms d'organismes sont longs par nature (« MUTUELLE GENERALE DES FONCTIONNAIRES ET AGENTS DE L'ETAT »). On mesure
 * donc la page produite avec des noms de cette longueur - voir {@link GeometrieEtat} pour la methode.
 */
class AnalyseTiersPayantEtatTest {

    /** Un nom d'organisme reel : il ne tient pas sur une ligne dans sa colonne. */
    private static final String NOM_LONG = "MUTUELLE GENERALE DES FONCTIONNAIRES ET AGENTS DE L'ETAT";
    private static final String DESIGNATION_LONGUE = "AMOXICILLINE 1G GELULES SECABLES BOITE DE 12 UNITES POUR ADULTES";

    private static final List<String> ENTETES_ORGANISMES = Arrays.asList("Tiers payant", "Ventes", "Quantité", "CA TTC",
            "Part tiers payant", "Part client", "CA HT", "Achat", "Marge", "Marge/CA HT");
    private static final List<String> ENTETES_PRODUITS = Arrays.asList("CIP", "Désignation", "Quantité", "CA TTC",
            "CA HT", "Achat", "Marge", "Marge/CA HT");

    private static AnalyseTiersPayantDTO ligne(String tiersPayant, String cip, String designation) {
        AnalyseTiersPayantDTO l = new AnalyseTiersPayantDTO();
        l.setTiersPayant(tiersPayant);
        l.setCip(cip);
        l.setDesignation(designation);
        l.setNbVentes(1284);
        l.setQuantite(3517);
        l.setCaTtc(12845600);
        l.setCaHt(10879322);
        l.setMontantAchat(8123450);
        l.setMarge(2755872);
        l.setPartTiersPayant(10276480);
        // La part client se deduit du CA TTC moins la part tiers payant : c'est le DTO qui la calcule.
        return l;
    }

    private static List<AnalyseTiersPayantDTO> jeuOrganismes() {
        List<AnalyseTiersPayantDTO> lignes = new ArrayList<>();
        lignes.add(ligne(NOM_LONG, "", ""));
        lignes.add(ligne("MCI CARE", "", ""));
        lignes.add(ligne("CAISSE NATIONALE DE PREVOYANCE SOCIALE DE COTE D'IVOIRE", "", ""));
        return lignes;
    }

    private static List<AnalyseTiersPayantDTO> jeuProduits() {
        List<AnalyseTiersPayantDTO> lignes = new ArrayList<>();
        lignes.add(ligne(NOM_LONG, "3232018", DESIGNATION_LONGUE));
        lignes.add(ligne(NOM_LONG, "8081802", "DOLIPRANE"));
        return lignes;
    }

    private static JasperPrint organismes() throws Exception {
        return GeometrieEtat.imprimer("analyse_tiers_payant", jeuOrganismes(), "ANALYSE DES TIERS PAYANTS",
                "du 01/01/2026 au 01/09/2026");
    }

    private static JasperPrint produits() throws Exception {
        return GeometrieEtat.imprimer("analyse_tiers_payant_produit", jeuProduits(),
                "ANALYSE DES TIERS PAYANTS PAR PRODUIT", "du 01/01/2026 au 01/09/2026");
    }

    @Test
    @DisplayName("Organismes : le trait de separation ne coupe jamais le nom du tiers payant")
    void organismesTraitNeCoupePas() throws Exception {
        String fautes = GeometrieEtat.traitsQuiCoupent(organismes());
        assertTrue(fautes.isEmpty(), "Le trait de separation traverse du texte :" + fautes);
    }

    @Test
    @DisplayName("Organismes : aucun texte ne deborde de sa case, en-tetes compris")
    void organismesAucunDebordement() throws Exception {
        String fautes = GeometrieEtat.debordements(organismes());
        assertTrue(fautes.isEmpty(),
                "Du texte ne tient pas dans sa colonne : il passe a la ligne et deborde, ou il est tronque." + fautes);
    }

    @Test
    @DisplayName("Organismes : chaque en-tete de colonne tient sur une seule ligne")
    void organismesEnTetesSurUneLigne() throws Exception {
        String fautes = GeometrieEtat.enTetesSurPlusieursLignes(organismes(), ENTETES_ORGANISMES);
        assertTrue(fautes.isEmpty(), "Un en-tete de colonne ne tient pas sur une ligne :" + fautes);
    }

    @Test
    @DisplayName("Organismes : deux colonnes voisines ne se recouvrent jamais")
    void organismesPasDeChevauchement() throws Exception {
        String fautes = GeometrieEtat.chevauchements(organismes());
        assertTrue(fautes.isEmpty(), "Deux textes se chevauchent :" + fautes);
    }

    @Test
    @DisplayName("Organismes : les dix intitules sont bien ceux de l'edition")
    void organismesIntitules() throws Exception {
        assertEquals(ENTETES_ORGANISMES.size(), GeometrieEtat.enTetesVus(organismes(), ENTETES_ORGANISMES),
                "les dix intitules doivent figurer a l'identique : " + ENTETES_ORGANISMES);
    }

    @Test
    @DisplayName("Organismes : un nom long est imprime en entier, pas tronque")
    void organismesNomEnEntier() throws Exception {
        List<String> lus = new ArrayList<>();
        for (GeometrieEtat.Bloc t : GeometrieEtat.textes(organismes())) {
            lus.add(t.texte);
        }
        assertTrue(lus.contains(NOM_LONG), "le nom long doit figurer en entier");
        assertTrue(lus.contains("CAISSE NATIONALE DE PREVOYANCE SOCIALE DE COTE D'IVOIRE"), "le second nom long aussi");
    }

    @Test
    @DisplayName("Par produit : le trait de separation ne coupe jamais la designation")
    void produitsTraitNeCoupePas() throws Exception {
        String fautes = GeometrieEtat.traitsQuiCoupent(produits());
        assertTrue(fautes.isEmpty(), "Le trait de separation traverse du texte :" + fautes);
    }

    @Test
    @DisplayName("Par produit : aucun texte ne deborde de sa case, en-tetes compris")
    void produitsAucunDebordement() throws Exception {
        String fautes = GeometrieEtat.debordements(produits());
        assertTrue(fautes.isEmpty(),
                "Du texte ne tient pas dans sa colonne : il passe a la ligne et deborde, ou il est tronque." + fautes);
    }

    @Test
    @DisplayName("Par produit : chaque en-tete de colonne tient sur une seule ligne")
    void produitsEnTetesSurUneLigne() throws Exception {
        String fautes = GeometrieEtat.enTetesSurPlusieursLignes(produits(), ENTETES_PRODUITS);
        assertTrue(fautes.isEmpty(), "Un en-tete de colonne ne tient pas sur une ligne :" + fautes);
    }

    @Test
    @DisplayName("Par produit : deux colonnes voisines ne se recouvrent jamais")
    void produitsPasDeChevauchement() throws Exception {
        String fautes = GeometrieEtat.chevauchements(produits());
        assertTrue(fautes.isEmpty(), "Deux textes se chevauchent :" + fautes);
    }

    @Test
    @DisplayName("Les deux editions sortent meme sans aucune ligne")
    void listesVides() throws Exception {
        for (String nom : Arrays.asList("analyse_tiers_payant", "analyse_tiers_payant_produit")) {
            JasperPrint impression = GeometrieEtat.imprimer(nom, new ArrayList<>(), "ANALYSE DES TIERS PAYANTS",
                    "aucune vente");
            assertFalse(impression.getPages().isEmpty(), "l'entete de " + nom + " doit s'imprimer meme sans ligne");
        }
    }
}
