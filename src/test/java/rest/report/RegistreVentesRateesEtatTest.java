package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import commonTasks.dto.VenteRateeDTO;
import net.sf.jasperreports.engine.JRPrintElement;
import net.sf.jasperreports.engine.JRPrintFrame;
import net.sf.jasperreports.engine.JRPrintLine;
import net.sf.jasperreports.engine.JRPrintPage;
import net.sf.jasperreports.engine.JRPrintText;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Mise en page du registre des ventes ratees (reports/ventes_ratees.jrxml).
 *
 * <p>
 * Releve de recette : sur l'edition, l'en-tete « Commentaire » passait sur deux lignes et debordait de la bande verte.
 * La colonne avait ete ramenee a 60 points pour elargir « Motif », et le titre n'y tenait plus. Un defaut de mise en
 * page ne se voit ni a la compilation ni au deploiement : il n'apparait qu'a l'impression, chez l'officine.
 *
 * <p>
 * On remplit donc le VRAI modele et on mesure la page produite. La mesure cle est {@link JRPrintText#getTextHeight()} :
 * c'est la hauteur dont le texte a REELLEMENT besoin. Des qu'elle depasse la hauteur de la case, le texte est passe a
 * la ligne - il deborde s'il y a la place en dessous, il est purement TRONQUE sinon. Les deux se sont produits ici :
 * l'en-tete « Commentaire » debordait, et « Non commande » s'est retrouve coupe a « Non » lors d'un premier rattrapage
 * trop serre sur la colonne Etat.
 */
class RegistreVentesRateesEtatTest {

    /** Motifs et commentaires d'officine : longs, et c'est bien la le sujet. */
    private static final String MOTIF_LONG = "Le produit n'est pas reference au catalogue de l'officine et doit"
            + " faire l'objet d'une commande speciale";
    private static final String COMMENTAIRE_LONG = "Client tres presse, a rappeler des reception de la commande"
            + " grossiste";

    /**
     * Marge de tolerance en points. JasperReports arrondit la hauteur de bande a l'entier alors que la hauteur de texte
     * est fractionnaire : un ecart d'un point n'est pas un defaut de mise en page.
     */
    private static final float TOLERANCE = 1.5f;

    private static JasperPrint imprimer(List<VenteRateeDTO> lignes) throws Exception {
        try (InputStream flux = RegistreVentesRateesEtatTest.class.getClassLoader()
                .getResourceAsStream("reports/ventes_ratees.jrxml")) {
            JasperReport rapport = JasperCompileManager.compileReport(flux);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE DE TEST");
            parametres.put("P_INSTITUTION_ADRESSE", "Abidjan, Cocody");
            parametres.put("P_H_CLT_INFOS", "REGISTRE DES VENTES RATEES");
            parametres.put("P_PERIODE", "du 01/09/2026 au 01/09/2026 - 4 demande(s)");
            parametres.put("P_PRINTED_BY", "kobys");
            parametres.put("P_FOOTER_RC", "RC ABJ 2015 B 1234");
            return JasperFillManager.fillReport(rapport, parametres, new JRBeanCollectionDataSource(lignes));
        }
    }

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

    /** Les en-tetes de colonnes sont a l'INTERIEUR d'un cadre : sans descendre dedans, on ne les mesure pas. */
    private static void collecter(List<JRPrintElement> elements, List<JRPrintText> textes, List<JRPrintLine> traits) {
        for (JRPrintElement e : elements) {
            if (e instanceof JRPrintFrame) {
                collecter(((JRPrintFrame) e).getElements(), textes, traits);
            } else if (e instanceof JRPrintText && !((JRPrintText) e).getFullText().trim().isEmpty()) {
                textes.add((JRPrintText) e);
            } else if (e instanceof JRPrintLine) {
                traits.add((JRPrintLine) e);
            }
        }
    }

    private static List<JRPrintText> tousLesTextes(JasperPrint impression) {
        List<JRPrintText> textes = new ArrayList<>();
        for (JRPrintPage page : impression.getPages()) {
            collecter(page.getElements(), textes, new ArrayList<>());
        }
        return textes;
    }

    @Test
    @DisplayName("Aucun texte ne deborde de sa case, en-tetes de colonnes compris")
    void aucunTexteNeDeborde() throws Exception {
        JasperPrint impression = imprimer(jeuDEssai());
        StringBuilder fautes = new StringBuilder();
        for (JRPrintText t : tousLesTextes(impression)) {
            if (t.getTextHeight() > t.getHeight() + TOLERANCE) {
                fautes.append("\n  « ").append(t.getFullText().replace('\n', '/')).append(" » demande ")
                        .append(String.format("%.1f", t.getTextHeight())).append(" points de hauteur dans une case de ")
                        .append(t.getHeight()).append(" (largeur ").append(t.getWidth()).append(")");
            }
        }
        assertTrue(fautes.length() == 0,
                "Du texte ne tient pas dans sa colonne : il passe a la ligne et deborde, ou il est tronque." + fautes);
    }

    @Test
    @DisplayName("Les dix en-tetes de colonnes tiennent chacun sur une seule ligne")
    void enTetesSurUneSeuleLigne() throws Exception {
        JasperPrint impression = imprimer(jeuDEssai());
        List<String> attendus = java.util.Arrays.asList("Date", "CIP", "Produit / désignation", "Qté", "Client",
                "Téléphone", "Motif", "Commentaire", "Utilisateur", "État");

        // Hauteur d'une ligne : celle du plus court des en-tetes, qui tient forcement sur une ligne.
        float uneLigne = Float.MAX_VALUE;
        for (JRPrintText t : tousLesTextes(impression)) {
            if (attendus.contains(t.getFullText())) {
                uneLigne = Math.min(uneLigne, t.getTextHeight());
            }
        }

        int vus = 0;
        StringBuilder fautes = new StringBuilder();
        for (JRPrintText t : tousLesTextes(impression)) {
            if (!attendus.contains(t.getFullText())) {
                continue;
            }
            vus++;
            if (t.getTextHeight() > uneLigne + TOLERANCE) {
                fautes.append("\n  l'en-tete « ").append(t.getFullText()).append(" » passe sur plusieurs lignes dans ")
                        .append(t.getWidth()).append(" points de large");
            }
        }
        assertEquals(attendus.size(), vus, "les dix en-tetes doivent etre imprimes");
        assertTrue(fautes.length() == 0, "Un en-tete de colonne ne tient pas sur une ligne :" + fautes);
    }

    @Test
    @DisplayName("Le trait de separation ne coupe jamais un texte")
    void traitNeCoupePasLeTexte() throws Exception {
        JasperPrint impression = imprimer(jeuDEssai());
        StringBuilder fautes = new StringBuilder();
        for (JRPrintPage page : impression.getPages()) {
            List<JRPrintText> textes = new ArrayList<>();
            List<JRPrintLine> traits = new ArrayList<>();
            collecter(page.getElements(), textes, traits);
            for (JRPrintLine trait : traits) {
                for (JRPrintText texte : textes) {
                    boolean traverse = trait.getY() > texte.getY() && trait.getY() < texte.getY() + texte.getHeight()
                            && trait.getX() < texte.getX() + texte.getWidth()
                            && trait.getX() + trait.getWidth() > texte.getX();
                    if (traverse) {
                        fautes.append("\n  le trait a y=").append(trait.getY()).append(" coupe « ")
                                .append(texte.getFullText().replace('\n', '/')).append(" »");
                    }
                }
            }
        }
        assertTrue(fautes.length() == 0, "Le trait de separation traverse du texte :" + fautes);
    }

    @Test
    @DisplayName("Deux colonnes voisines ne se recouvrent jamais")
    void colonnesNeSeChevauchentPas() throws Exception {
        JasperPrint impression = imprimer(jeuDEssai());
        List<JRPrintText> tous = tousLesTextes(impression);
        StringBuilder fautes = new StringBuilder();
        for (int i = 0; i < tous.size(); i++) {
            for (int j = i + 1; j < tous.size(); j++) {
                JRPrintText a = tous.get(i), b = tous.get(j);
                boolean seRecouvrent = a.getX() < b.getX() + b.getWidth() && b.getX() < a.getX() + a.getWidth()
                        && a.getY() < b.getY() + b.getHeight() && b.getY() < a.getY() + a.getHeight();
                if (seRecouvrent) {
                    fautes.append("\n  « ").append(a.getFullText().replace('\n', '/')).append(" » recouvre « ")
                            .append(b.getFullText().replace('\n', '/')).append(" »");
                }
            }
        }
        assertTrue(fautes.length() == 0, "Deux textes se chevauchent :" + fautes);
    }

    @Test
    @DisplayName("Motif, commentaire et etat sont imprimes en entier")
    void contenuImprimeEnEntier() throws Exception {
        JasperPrint impression = imprimer(jeuDEssai());
        List<String> lus = new ArrayList<>();
        for (JRPrintText t : tousLesTextes(impression)) {
            lus.add(t.getFullText());
        }
        assertTrue(lus.contains(MOTIF_LONG), "le motif long doit figurer en entier");
        assertTrue(lus.contains(COMMENTAIRE_LONG), "le commentaire long doit figurer en entier");
        // « Non commande » avait ete coupe a « Non » par une colonne Etat trop etroite.
        assertTrue(lus.contains("Non commandé"), "l'etat doit figurer en entier, pas coupe");
    }

    @Test
    @DisplayName("Une liste vide donne quand meme l'entete de l'edition")
    void listeVide() throws Exception {
        JasperPrint impression = imprimer(new ArrayList<>());
        assertFalse(impression.getPages().isEmpty(), "l'entete doit s'imprimer meme sans ligne");
    }
}
