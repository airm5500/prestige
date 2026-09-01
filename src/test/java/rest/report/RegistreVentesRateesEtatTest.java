package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import commonTasks.dto.VenteRateeDTO;
import net.sf.jasperreports.engine.JasperPrint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Mise en page du registre des ventes ratees (reports/ventes_ratees.jrxml).
 *
 * <p>
 * Releve de recette : sur l'edition, l'en-tete « Commentaire » passait sur deux lignes et debordait de la bande verte.
 * La colonne avait ete ramenee a 60 points pour elargir « Motif », et le titre n'y tenait plus. On mesure donc la page
 * reellement produite - voir {@link GeometrieEtat} pour la methode.
 */
class RegistreVentesRateesEtatTest {

    /** Motifs et commentaires d'officine : longs, et c'est bien la le sujet. */
    private static final String MOTIF_LONG = "Le produit n'est pas reference au catalogue de l'officine et doit"
            + " faire l'objet d'une commande speciale";
    private static final String COMMENTAIRE_LONG = "Client tres presse, a rappeler des reception de la commande"
            + " grossiste";

    private static final List<String> ENTETES = Arrays.asList("Date", "CIP", "Produit / désignation", "Qté", "Client",
            "Téléphone", "Motif", "Commentaire", "Utilisateur", "État");

    private static VenteRateeDTO ligne(String designation, String client, String motif, String commentaire) {
        VenteRateeDTO l = new VenteRateeDTO();
        l.setDate("01/09/2026 08:30");
        l.setCip("3232018");
        l.setDesignation(designation);
        l.setQuantite(2);
        l.setNomClient(client);
        l.setTelephone("07-07-58-88");
        l.setMotif(motif);
        l.setCommentaire(commentaire);
        l.setUtilisateur("admin@02");
        // L'etat imprime se deduit de « commande » : c'est le DTO qui le compose.
        return l;
    }

    /** Un jeu qui met la mise en page a l'epreuve : motifs longs, commentaires longs, noms longs. */
    private static List<VenteRateeDTO> jeuDEssai() {
        List<VenteRateeDTO> lignes = new ArrayList<>();
        lignes.add(ligne("DOLIPRANE 500MG CPR B/16", "KOUADIO AHOU CLAIRE",
                "Produit non disponible en stock, a commander chez le grossiste", "Le client repassera demain matin"));
        lignes.add(ligne("EFFERALGAN 1G CPR B/8", "BROU", "Rupture", "RAS"));
        lignes.add(ligne("AMOXICILLINE 1G GELULES BOITE DE 12 UNITES SECABLES", "KOUACOU KOUADIO GEORGES", MOTIF_LONG,
                COMMENTAIRE_LONG));
        lignes.add(ligne("PARACETAMOL", "N'GUESSAN", "Prix trop eleve pour le client", ""));
        return lignes;
    }

    private static JasperPrint imprimer() throws Exception {
        return GeometrieEtat.imprimer("ventes_ratees", jeuDEssai(), "REGISTRE DES VENTES RATEES",
                "du 01/09/2026 au 01/09/2026 - 4 demande(s)");
    }

    @Test
    @DisplayName("Les dix intitules de colonnes sont bien ceux de l'edition")
    void intitulesAttendus() throws Exception {
        assertEquals(ENTETES.size(), GeometrieEtat.enTetesVus(imprimer(), ENTETES),
                "les dix intitules doivent figurer a l'identique : " + ENTETES);
    }

    @Test
    @DisplayName("Chaque en-tete de colonne tient sur une seule ligne")
    void enTetesSurUneSeuleLigne() throws Exception {
        String fautes = GeometrieEtat.enTetesSurPlusieursLignes(imprimer(), ENTETES);
        assertTrue(fautes.isEmpty(), "Un en-tete de colonne ne tient pas sur une ligne :" + fautes);
    }

    @Test
    @DisplayName("Aucun texte ne deborde de sa case, en-tetes compris")
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
    @DisplayName("Motif, commentaire et etat sont imprimes en entier")
    void contenuImprimeEnEntier() throws Exception {
        List<String> lus = new ArrayList<>();
        for (GeometrieEtat.Bloc t : GeometrieEtat.textes(imprimer())) {
            lus.add(t.texte);
        }
        assertTrue(lus.contains(MOTIF_LONG), "le motif long doit figurer en entier");
        assertTrue(lus.contains(COMMENTAIRE_LONG), "le commentaire long doit figurer en entier");
        // « Non commande » avait ete coupe a « Non » par une colonne Etat trop etroite.
        assertTrue(lus.contains("Non commandé"), "l'etat doit figurer en entier, pas coupe");
    }

    @Test
    @DisplayName("Une liste vide donne quand meme l'entete de l'edition")
    void listeVide() throws Exception {
        JasperPrint impression = GeometrieEtat.imprimer("ventes_ratees", new ArrayList<>(),
                "REGISTRE DES VENTES RATEES", "aucune demande");
        assertFalse(impression.getPages().isEmpty(), "l'entete doit s'imprimer meme sans ligne");
    }
}
