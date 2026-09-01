package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import commonTasks.dto.ProduitDetailleDTO;
import net.sf.jasperreports.engine.JasperPrint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Mise en page de la liste des produits detailles (reports/liste_produits_detailles.jrxml).
 *
 * <p>
 * Les intitules ont ete revus en recette : « CH » pour la boite, « Détail » pour l'unite. Rallonger un titre le fait
 * passer sur deux lignes des que la colonne est trop etroite, et le titre deborde alors de la bande de couleur - c'est
 * ce qui etait arrive au registre des ventes ratees. On mesure donc ici, plutot que de s'en remettre a l'oeil.
 */
class ListeProduitsDetaillesEtatTest {

    /** Intitules attendus, ceux que l'ecran et l'export Excel portent aussi. */
    private static final List<String> ENTETES = Arrays.asList("Code CIP CH", "Libellé CH", "Stock CH", "Contenance",
            "Code CIP Détail", "Libellé Détail", "Stock Détail");

    private static ProduitDetailleDTO ligne(String cipPP, String nomPP, long stockPP, long contenance, String cipPD,
            String nomPD, long stockPD) {
        ProduitDetailleDTO l = new ProduitDetailleDTO();
        l.setCipPP(cipPP);
        l.setNomPP(nomPP);
        l.setStockPP(stockPP);
        l.setContenance(contenance);
        l.setCipPD(cipPD);
        l.setNomPD(nomPD);
        l.setStockPD(stockPD);
        return l;
    }

    /** Des libelles d'officine : longs, et des stocks a plusieurs chiffres. */
    private static List<ProduitDetailleDTO> jeuDEssai() {
        List<ProduitDetailleDTO> lignes = new ArrayList<>();
        lignes.add(ligne("3232018", "DOLIPRANE 500MG COMPRIMES BOITE DE 16", 124, 16, "8081802",
                "DOLIPRANE 500MG COMPRIME (DETAIL A L'UNITE)", 1984));
        // Libelles assez longs pour passer sur deux lignes : c'est la que le trait de separation
        // trahissait la mise en page, en traversant la seconde ligne du libelle.
        lignes.add(ligne("6041234", "AMOXICILLINE 1G GELULES SECABLES BOITE DE 12 UNITES POUR ADULTES", 8, 12,
                "6041235", "AMOXICILLINE 1G GELULE SECABLE VENDUE A L'UNITE (DECONDITIONNEE)", 96));
        lignes.add(ligne("1112223", "PARACETAMOL", 0, 0, "", "", 0));
        return lignes;
    }

    private static JasperPrint imprimer() throws Exception {
        return GeometrieEtat.imprimer("liste_produits_detailles", jeuDEssai(), "LISTE DES PRODUITS DETAILLES",
                "3 produit(s) détaillé(s)");
    }

    @Test
    @DisplayName("Les intitules demandes en recette sont bien ceux de l'edition")
    void intitulesAttendus() throws Exception {
        JasperPrint impression = imprimer();
        assertEquals(ENTETES.size(), GeometrieEtat.enTetesVus(impression, ENTETES),
                "les sept intitules doivent figurer a l'identique : " + ENTETES);
    }

    @Test
    @DisplayName("Chaque en-tete de colonne tient sur une seule ligne")
    void enTetesSurUneSeuleLigne() throws Exception {
        String fautes = GeometrieEtat.enTetesSurPlusieursLignes(imprimer(), ENTETES);
        assertTrue(fautes.isEmpty(), "Un en-tete de colonne ne tient pas sur une ligne :" + fautes);
    }

    @Test
    @DisplayName("Aucun texte ne deborde de sa case")
    void aucunTexteNeDeborde() throws Exception {
        String fautes = GeometrieEtat.debordements(imprimer());
        assertTrue(fautes.isEmpty(),
                "Du texte ne tient pas dans sa colonne : il passe a la ligne et deborde, ou il est tronque." + fautes);
    }

    @Test
    @DisplayName("Le trait de separation ne coupe jamais un texte")
    void traitNeCoupePasLeTexte() throws Exception {
        String fautes = GeometrieEtat.traitsQuiCoupent(imprimer());
        assertTrue(fautes.isEmpty(), "Le trait de separation traverse du texte :" + fautes);
    }

    @Test
    @DisplayName("Deux colonnes voisines ne se recouvrent jamais")
    void colonnesNeSeChevauchentPas() throws Exception {
        String fautes = GeometrieEtat.chevauchements(imprimer());
        assertTrue(fautes.isEmpty(), "Deux textes se chevauchent :" + fautes);
    }

    @Test
    @DisplayName("Les libelles longs sont imprimes en entier")
    void libellesEnEntier() throws Exception {
        List<String> lus = new ArrayList<>();
        for (GeometrieEtat.Bloc t : GeometrieEtat.textes(imprimer())) {
            lus.add(t.texte);
        }
        assertTrue(lus.contains("AMOXICILLINE 1G GELULES SECABLES BOITE DE 12 UNITES POUR ADULTES"),
                "le libelle CH long doit figurer en entier");
        assertTrue(lus.contains("AMOXICILLINE 1G GELULE SECABLE VENDUE A L'UNITE (DECONDITIONNEE)"),
                "le libelle Détail long doit figurer en entier");
    }

    @Test
    @DisplayName("Une liste vide donne quand meme l'entete de l'edition")
    void listeVide() throws Exception {
        JasperPrint impression = GeometrieEtat.imprimer("liste_produits_detailles", new ArrayList<>(),
                "LISTE DES PRODUITS DETAILLES", "0 produit(s)");
        assertFalse(impression.getPages().isEmpty(), "l'entete doit s'imprimer meme sans ligne");
    }

    @Test
    @DisplayName("Liste : le trait garde une marge franche sous le texte, pas seulement zero")
    void traitNeCoupePasLeTexteDegagement() throws Exception {
        int degagement = GeometrieEtat.degagementMinimal(imprimer());
        assertTrue(degagement >= 1,
                "Le trait de separation se pose a " + degagement
                        + " point(s) du bas du texte. A zero, la mise en page ne tient qu'a un arrondi de mesure de"
                        + " police : elle passe sur une machine et coupe le texte sur une autre.");
    }
}
