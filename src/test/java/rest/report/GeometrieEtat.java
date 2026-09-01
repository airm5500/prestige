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
 * Deux mesures servent ici. La hauteur de texte ({@link JRPrintText#getTextHeight()}) est celle dont le texte a
 * REELLEMENT besoin : des qu'elle depasse la hauteur de la case, le texte est passe a la ligne - il deborde s'il y a la
 * place en dessous, il est purement TRONQUE sinon. Et les positions, qui disent si un trait traverse un texte ou si
 * deux colonnes se recouvrent.
 *
 * <p>
 * Attention aux CADRES : les elements qu'ils contiennent - les en-tetes de colonnes, la ligne TOTAL - portent des
 * coordonnees RELATIVES au cadre. Il faut y ajouter la position du cadre, sans quoi un en-tete et un total paraissent
 * tous deux poses en haut de page, et se recouvrir.
 */
final class GeometrieEtat {

    /**
     * Marge de tolerance en points. JasperReports pose les cases sur des entiers alors que la hauteur de texte est
     * fractionnaire : l'ecart tient toujours sous 1 point, et il depend des polices installees sur la machine.
     *
     * <p>
     * Un VRAI defaut coute tout autre chose : une ligne entiere. Mesure sur ces editions, en corps 8, une ligne fait
     * 9,3 points ; un intitule qui passe sur deux lignes saute donc de 9,31 a 18,63, et un libelle qui deborde d'une
     * case de 14 points reclame 18,63, soit 4,6 points de trop. Entre le bruit d'arrondi (au plus 1) et le plus petit
     * defaut reel (4,6), 2,5 tranche franchement : assez haut pour ne pas dependre des polices, assez bas pour ne rien
     * laisser passer.
     */
    static final float TOLERANCE = 2.5f;

    private GeometrieEtat() {
    }

    /** Un element imprime, ramene a des coordonnees ABSOLUES dans la page. */
    static final class Bloc {
        final String texte;
        final int x;
        final int y;
        final int largeur;
        final int hauteur;
        final float hauteurTexte;
        final boolean estTrait;

        Bloc(String texte, int x, int y, int largeur, int hauteur, float hauteurTexte, boolean estTrait) {
            this.texte = texte;
            this.x = x;
            this.y = y;
            this.largeur = largeur;
            this.hauteur = hauteur;
            this.hauteurTexte = hauteurTexte;
            this.estTrait = estTrait;
        }

        @Override
        public String toString() {
            return "« " + texte.replace('\n', '/') + " »";
        }
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

    /** Aplatit les elements d'une page en ajoutant, a chaque descente dans un cadre, la position de ce cadre. */
    private static void collecter(List<JRPrintElement> elements, int decalageX, int decalageY, List<Bloc> blocs) {
        for (JRPrintElement e : elements) {
            int x = decalageX + e.getX();
            int y = decalageY + e.getY();
            if (e instanceof JRPrintFrame) {
                collecter(((JRPrintFrame) e).getElements(), x, y, blocs);
            } else if (e instanceof JRPrintText) {
                JRPrintText t = (JRPrintText) e;
                if (!t.getFullText().trim().isEmpty()) {
                    blocs.add(new Bloc(t.getFullText(), x, y, t.getWidth(), t.getHeight(), t.getTextHeight(), false));
                }
            } else if (e instanceof JRPrintLine) {
                blocs.add(new Bloc("", x, y, e.getWidth(), e.getHeight(), 0f, true));
            }
        }
    }

    private static List<Bloc> blocsDeLaPage(JRPrintPage page) {
        List<Bloc> blocs = new ArrayList<>();
        collecter(page.getElements(), 0, 0, blocs);
        return blocs;
    }

    /** Tous les textes de l'edition, toutes pages confondues. */
    static List<Bloc> textes(JasperPrint impression) {
        List<Bloc> textes = new ArrayList<>();
        for (JRPrintPage page : impression.getPages()) {
            for (Bloc bloc : blocsDeLaPage(page)) {
                if (!bloc.estTrait) {
                    textes.add(bloc);
                }
            }
        }
        return textes;
    }

    /** Textes dont le contenu ne tient pas dans la case : passage a la ligne, debordement ou troncature. */
    static String debordements(JasperPrint impression) {
        StringBuilder fautes = new StringBuilder();
        for (Bloc t : textes(impression)) {
            if (t.hauteurTexte > t.hauteur + TOLERANCE) {
                fautes.append("\n  ").append(t).append(" demande ").append(String.format("%.1f", t.hauteurTexte))
                        .append(" points de hauteur dans une case de ").append(t.hauteur).append(" (largeur ")
                        .append(t.largeur).append(")");
            }
        }
        return fautes.toString();
    }

    /** En-tetes de colonnes qui ne tiennent pas sur une seule ligne. */
    static String enTetesSurPlusieursLignes(JasperPrint impression, List<String> attendus) {
        float uneLigne = Float.MAX_VALUE;
        for (Bloc t : textes(impression)) {
            if (attendus.contains(t.texte)) {
                uneLigne = Math.min(uneLigne, t.hauteurTexte);
            }
        }
        StringBuilder fautes = new StringBuilder();
        for (Bloc t : textes(impression)) {
            if (attendus.contains(t.texte) && t.hauteurTexte > uneLigne + TOLERANCE) {
                fautes.append("\n  l'en-tete ").append(t).append(" passe sur plusieurs lignes dans ").append(t.largeur)
                        .append(" points de large");
            }
        }
        return fautes.toString();
    }

    /** Nombre d'en-tetes attendus reellement imprimes : un intitule mal orthographie ne serait pas mesure. */
    static int enTetesVus(JasperPrint impression, List<String> attendus) {
        int vus = 0;
        for (Bloc t : textes(impression)) {
            if (attendus.contains(t.texte)) {
                vus++;
            }
        }
        return vus;
    }

    /** Traits de separation qui traversent un texte. */
    static String traitsQuiCoupent(JasperPrint impression) {
        StringBuilder fautes = new StringBuilder();
        for (JRPrintPage page : impression.getPages()) {
            List<Bloc> blocs = blocsDeLaPage(page);
            for (Bloc trait : blocs) {
                if (!trait.estTrait) {
                    continue;
                }
                for (Bloc texte : blocs) {
                    if (texte.estTrait) {
                        continue;
                    }
                    boolean traverse = trait.y > texte.y && trait.y < texte.y + texte.hauteur
                            && trait.x < texte.x + texte.largeur && trait.x + trait.largeur > texte.x;
                    if (traverse) {
                        fautes.append("\n  le trait a y=").append(trait.y).append(" coupe ").append(texte);
                    }
                }
            }
        }
        return fautes.toString();
    }

    /**
     * Degagement entre un trait de separation et le bas du texte qu'il vient clore.
     *
     * <p>
     * Ne pas couper le texte ne suffit pas : un trait pose EXACTEMENT sur le bas du texte tient a un arrondi pres. La
     * hauteur d'une ligne depend des polices installees sur la machine, si bien qu'une mise en page juste au point de
     * bascule passe ici et coupe le texte ailleurs. On exige donc une marge franche.
     *
     * @return le plus petit ecart constate, ou {@link Integer#MAX_VALUE} si aucun trait ne clot de texte
     */
    static int degagementMinimal(JasperPrint impression) {
        int minimum = Integer.MAX_VALUE;
        for (JRPrintPage page : impression.getPages()) {
            List<Bloc> blocs = blocsDeLaPage(page);
            for (Bloc trait : blocs) {
                if (!trait.estTrait) {
                    continue;
                }
                for (Bloc texte : blocs) {
                    if (texte.estTrait || trait.x >= texte.x + texte.largeur || trait.x + trait.largeur <= texte.x) {
                        continue;
                    }
                    int bas = texte.y + texte.hauteur;
                    // Seuls comptent les textes que CE trait vient clore : ceux qui finissent juste au-dessus.
                    if (bas <= trait.y && trait.y - bas <= 4) {
                        minimum = Math.min(minimum, trait.y - bas);
                    }
                }
            }
        }
        return minimum;
    }

    /**
     * Textes qui se recouvrent : deux colonnes voisines qui empietent l'une sur l'autre.
     *
     * <p>
     * La comparaison se fait PAGE PAR PAGE. Les coordonnees repartent de zero a chaque page : confronter un element de
     * la page 1 a un element de la page 2 signalerait un chevauchement qui n'existe pas.
     */
    static String chevauchements(JasperPrint impression) {
        StringBuilder fautes = new StringBuilder();
        for (JRPrintPage page : impression.getPages()) {
            List<Bloc> tous = new ArrayList<>();
            for (Bloc bloc : blocsDeLaPage(page)) {
                if (!bloc.estTrait) {
                    tous.add(bloc);
                }
            }
            for (int i = 0; i < tous.size(); i++) {
                for (int j = i + 1; j < tous.size(); j++) {
                    Bloc a = tous.get(i), b = tous.get(j);
                    boolean seRecouvrent = a.x < b.x + b.largeur && b.x < a.x + a.largeur && a.y < b.y + b.hauteur
                            && b.y < a.y + a.hauteur;
                    if (seRecouvrent) {
                        fautes.append("\n  ").append(a).append(" recouvre ").append(b);
                    }
                }
            }
        }
        return fautes.toString();
    }
}
