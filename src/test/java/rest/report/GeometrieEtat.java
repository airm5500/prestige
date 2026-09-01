package rest.report;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

/**
 * Mesure de la mise en page d'un etat Jasper, pour les tests.
 *
 * <p>
 * Un defaut de mise en page ne se voit ni a la compilation ni au deploiement : il n'apparait qu'a l'impression, chez
 * l'officine. On remplit donc le VRAI modele avec des donnees representatives et on mesure la page produite.
 *
 * <p>
 * La mesure cle est {@link JRPrintText#getTextHeight()} : la hauteur dont le texte a REELLEMENT besoin. Des qu'elle
 * depasse la hauteur de la case, le texte est passe a la ligne - il deborde s'il y a la place en dessous, il est
 * purement TRONQUE sinon. Les deux se rencontrent en pratique, et ni l'un ni l'autre ne fait echouer l'edition : elle
 * sort, simplement illisible.
 */
final class GeometrieEtat {

    /**
     * Marge de tolerance en points. JasperReports arrondit la hauteur de bande a l'entier alors que la hauteur de texte
     * est fractionnaire : un ecart d'un point n'est pas un defaut de mise en page.
     */
    static final float TOLERANCE = 1.5f;

    private GeometrieEtat() {
    }

    /** Remplit un modele embarque (reports/&lt;nom&gt;.jrxml) avec les parametres d'entete usuels. */
    static JasperPrint imprimer(String nom, Collection<?> lignes, String titre, String sousTitre) throws Exception {
        try (InputStream flux = GeometrieEtat.class.getClassLoader().getResourceAsStream("reports/" + nom + ".jrxml")) {
            JasperReport rapport = JasperCompileManager.compileReport(flux);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE DE TEST");
            parametres.put("P_INSTITUTION_ADRESSE", "Abidjan, Cocody");
            parametres.put("P_H_CLT_INFOS", titre);
            parametres.put("P_PERIODE", sousTitre);
            parametres.put("P_PRINTED_BY", "kobys");
            parametres.put("P_FOOTER_RC", "RC ABJ 2015 B 1234");
            return JasperFillManager.fillReport(rapport, parametres, new JRBeanCollectionDataSource(lignes));
        }
    }

    /**
     * Les en-tetes de colonnes sont a l'INTERIEUR d'un cadre : sans descendre dedans, on ne les mesure pas - et c'est
     * justement la que se logent les debordements de titres.
     */
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

    static List<JRPrintText> textes(JasperPrint impression) {
        List<JRPrintText> textes = new ArrayList<>();
        for (JRPrintPage page : impression.getPages()) {
            collecter(page.getElements(), textes, new ArrayList<>());
        }
        return textes;
    }

    /** Textes dont le contenu ne tient pas dans la case : passage a la ligne, debordement ou troncature. */
    static String debordements(JasperPrint impression) {
        StringBuilder fautes = new StringBuilder();
        for (JRPrintText t : textes(impression)) {
            if (t.getTextHeight() > t.getHeight() + TOLERANCE) {
                fautes.append("\n  « ").append(t.getFullText().replace('\n', '/')).append(" » demande ")
                        .append(String.format("%.1f", t.getTextHeight())).append(" points de hauteur dans une case de ")
                        .append(t.getHeight()).append(" (largeur ").append(t.getWidth()).append(")");
            }
        }
        return fautes.toString();
    }

    /** En-tetes de colonnes qui ne tiennent pas sur une seule ligne. */
    static String enTetesSurPlusieursLignes(JasperPrint impression, List<String> attendus) {
        float uneLigne = Float.MAX_VALUE;
        for (JRPrintText t : textes(impression)) {
            if (attendus.contains(t.getFullText())) {
                uneLigne = Math.min(uneLigne, t.getTextHeight());
            }
        }
        StringBuilder fautes = new StringBuilder();
        for (JRPrintText t : textes(impression)) {
            if (attendus.contains(t.getFullText()) && t.getTextHeight() > uneLigne + TOLERANCE) {
                fautes.append("\n  l'en-tete « ").append(t.getFullText()).append(" » passe sur plusieurs lignes dans ")
                        .append(t.getWidth()).append(" points de large");
            }
        }
        return fautes.toString();
    }

    /** Nombre d'en-tetes attendus reellement imprimes : un intitule mal orthographie ne serait pas mesure. */
    static int enTetesVus(JasperPrint impression, List<String> attendus) {
        int vus = 0;
        for (JRPrintText t : textes(impression)) {
            if (attendus.contains(t.getFullText())) {
                vus++;
            }
        }
        return vus;
    }

    /** Traits de separation qui traversent un texte. */
    static String traitsQuiCoupent(JasperPrint impression) {
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
        return fautes.toString();
    }

    /** Textes qui se recouvrent : deux colonnes voisines qui empietent l'une sur l'autre. */
    static String chevauchements(JasperPrint impression) {
        List<JRPrintText> tous = textes(impression);
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
        return fautes.toString();
    }
}
