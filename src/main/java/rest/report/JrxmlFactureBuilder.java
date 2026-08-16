package rest.report;

import dal.ModelFactureDynamique;
import dal.ModelFactureDynamiqueColonne;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.commons.lang3.StringUtils;

/**
 * Fabrique un fichier de mise en page JasperReports (.jrxml) a partir d'un modele de facture dynamique.
 *
 * La presentation reprend celle du modele de reference rp_facture_0909.jrxml livre par l'officine : page A4 portrait,
 * en-tete officine + bloc tiers payant, bandeau de colonnes sur fond gris, lignes encadrees, pied de page numerote,
 * puis un bloc de synthese (totaux, montant en lettres, signature du pharmacien).
 *
 * Le fichier produit est autonome : il embarque sa requete SQL (les memes tables que la facture historique) et peut
 * donc etre ouvert et retouche dans Jaspersoft Studio, puis depose dans le dossier des etats du serveur.
 */
public final class JrxmlFactureBuilder {

    /** Largeur utile d'une page A4 avec les marges du modele de reference (595 - 5 - 5). */
    private static final int LARGEUR_UTILE = 585;
    private static final int MARGE_GAUCHE_TABLE = 2;
    private static final int HAUTEUR_LIGNE = 20;
    private static final int HAUTEUR_ENTETE_COLONNES = 25;
    private static final int HAUTEUR_LIGNE_PRODUIT = 13;
    private static final int HAUTEUR_ENTETE_PRODUIT = 11;
    /** Hauteur du bloc d'en-tete (nom de l'officine, bloc tiers payant, numero de facture). */
    private static final int HAUTEUR_ENTETE = 155;

    /** Definition d'une colonne : expression Jasper, classe, format, alignement, largeur souhaitee. */
    private static final class Champ {
        final String expression;
        final String classe;
        final String pattern;
        final String alignement;
        final int largeur;
        /** Champ SQL a declarer dans le .jrxml (null pour les colonnes calculees). */
        final String champSql;
        final boolean numerique;

        Champ(String expression, String classe, String pattern, String alignement, int largeur, String champSql,
                boolean numerique) {
            this.expression = expression;
            this.classe = classe;
            this.pattern = pattern;
            this.alignement = alignement;
            this.largeur = largeur;
            this.champSql = champSql;
            this.numerique = numerique;
        }
    }

    private static final Map<String, Champ> CHAMPS = new LinkedHashMap<>();

    static {
        CHAMPS.put("NUMERO", new Champ("$V{REPORT_COUNT}", "java.lang.Integer", null, "Center", 30, null, false));
        CHAMPS.put("DATE_BON",
                new Champ("$F{dt_CREATED}", "java.sql.Timestamp", "dd/MM/yyyy", "Center", 55, "dt_CREATED", false));
        CHAMPS.put("REF_BON", new Champ("$F{strREFBON}", "java.lang.String", null, "Center", 55, "strREFBON", false));
        CHAMPS.put("NOM_CLIENT", new Champ("$F{str_FIRST_NAME_CUSTOMER}", "java.lang.String", null, "Left", 75,
                "str_FIRST_NAME_CUSTOMER", false));
        CHAMPS.put("PRENOM_CLIENT", new Champ("$F{str_LAST_NAME_CUSTOMER}", "java.lang.String", null, "Left", 95,
                "str_LAST_NAME_CUSTOMER", false));
        CHAMPS.put("NOM_COMPLET", new Champ("$F{str_FIRST_NAME_CUSTOMER} + \" \" + $F{str_LAST_NAME_CUSTOMER}",
                "java.lang.String", null, "Left", 135, null, false));
        CHAMPS.put("MATRICULE",
                new Champ("$F{SECURITE_SOCIAL}", "java.lang.String", null, "Center", 65, "SECURITE_SOCIAL", false));
        CHAMPS.put("REF_VENTE", new Champ("$F{str_REF}", "java.lang.String", null, "Center", 60, "str_REF", false));
        CHAMPS.put("TAUX", new Champ("$F{TAUX_TP}", "java.lang.Integer", null, "Center", 40, "TAUX_TP", false));
        CHAMPS.put("MONTANT_BRUT",
                new Champ("$F{int_PRICE}", "java.lang.Integer", "#,##0", "Right", 70, "int_PRICE", true));
        CHAMPS.put("REMISE", new Champ("$F{dbl_MONTANT_REMISE}", "java.math.BigDecimal", "#,##0", "Right", 65,
                "dbl_MONTANT_REMISE", true));
        CHAMPS.put("PART_CLIENT",
                new Champ("$F{int_CUST_PART}", "java.lang.Integer", "#,##0", "Right", 65, "int_CUST_PART", true));
        CHAMPS.put("PART_TIERS_PAYANT", new Champ("$F{str_TIERS_PAYANT_RO}", "java.lang.Double", "#,##0", "Right", 80,
                "str_TIERS_PAYANT_RO", true));
    }

    /** Retrait du sous-tableau des produits sous la ligne du bon. */
    private static final int RETRAIT_PRODUIT = 14;

    /** Champs du niveau PRODUIT (lignes de vente affichees sous chaque bon). */
    private static final Map<String, Champ> CHAMPS_PRODUIT = new LinkedHashMap<>();

    static {
        CHAMPS_PRODUIT.put("PROD_CIP",
                new Champ("$F{PROD_CIP}", "java.lang.String", null, "Center", 55, "PROD_CIP", false));
        CHAMPS_PRODUIT.put("PROD_DESIGNATION",
                new Champ("$F{PROD_DESIGNATION}", "java.lang.String", null, "Left", 160, "PROD_DESIGNATION", false));
        CHAMPS_PRODUIT.put("PROD_QUANTITE",
                new Champ("$F{PROD_QUANTITE}", "java.lang.Integer", null, "Center", 35, "PROD_QUANTITE", false));
        CHAMPS_PRODUIT.put("PROD_PRIX_UNITAIRE", new Champ("$F{PROD_PRIX_UNITAIRE}", "java.lang.Integer", "#,##0",
                "Right", 60, "PROD_PRIX_UNITAIRE", true));
        CHAMPS_PRODUIT.put("PROD_MONTANT",
                new Champ("$F{PROD_MONTANT}", "java.lang.Integer", "#,##0", "Right", 60, "PROD_MONTANT", true));
        CHAMPS_PRODUIT.put("PROD_REMISE",
                new Champ("$F{PROD_REMISE}", "java.lang.Integer", "#,##0", "Right", 60, "PROD_REMISE", true));
    }

    private JrxmlFactureBuilder() {
    }

    /**
     * Largeur relative d'une colonne, partagee avec l'edition PDF pour que les deux presentations (PDF genere et
     * fichier .jrxml exporte) aient exactement les memes proportions de colonnes.
     */
    public static float largeurRelative(String champ) {
        Champ c = CHAMPS.get(champ);
        return c != null ? c.largeur : 60f;
    }

    /** Nom de fichier propose pour le modele (sans extension), utilisable comme nom de rapport Jasper. */
    public static String nomRapport(ModelFactureDynamique modele) {
        String base = "rp_facture_dyn_" + (modele.getId() != null ? modele.getId() : 0);
        String suffixe = StringUtils.stripAccents(StringUtils.defaultString(modele.getNom())).toLowerCase()
                .replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        return StringUtils.isBlank(suffixe) ? base : base + "_" + suffixe;
    }

    /**
     * Construit le contenu du fichier .jrxml.
     *
     * @param modele
     *            modele concu dans le createur de modeles
     * @param avecEntete
     *            afficher le bloc d'en-tete (officine, tiers payant, numero de facture)
     * @param avecPiedPage
     *            afficher le pied de page (numerotation des pages)
     */
    public static String construire(ModelFactureDynamique modele, boolean avecEntete, boolean avecPiedPage) {
        List<ModelFactureDynamiqueColonne> colonnes = new ArrayList<>(modele.getColonnesBon());
        colonnes.removeIf(c -> !CHAMPS.containsKey(c.getChamp()));
        colonnes.sort(Comparator.comparing(ModelFactureDynamiqueColonne::getOrdre,
                Comparator.nullsLast(Comparator.naturalOrder())));
        if (colonnes.isEmpty()) {
            throw new IllegalArgumentException("Le modèle ne contient aucune colonne exportable");
        }
        List<ModelFactureDynamiqueColonne> colonnesProduit = new ArrayList<>();
        if (modele.isDetaillerProduits()) {
            colonnesProduit.addAll(modele.getColonnesProduit());
            colonnesProduit.removeIf(c -> !CHAMPS_PRODUIT.containsKey(c.getChamp()));
            colonnesProduit.sort(Comparator.comparing(ModelFactureDynamiqueColonne::getOrdre,
                    Comparator.nullsLast(Comparator.naturalOrder())));
            if (colonnesProduit.isEmpty()) {
                throw new IllegalArgumentException(
                        "Le détail des produits est activé mais aucune colonne de produit n'est exportable");
            }
        }
        boolean avecProduits = !colonnesProduit.isEmpty();

        int[] largeurs = repartirLargeurs(colonnes, CHAMPS, LARGEUR_UTILE - 2 * MARGE_GAUCHE_TABLE);
        int[] positions = positions(largeurs, MARGE_GAUCHE_TABLE);
        // le sous-tableau des produits est decale vers la droite, sous la ligne du bon
        int[] largeursProduit = avecProduits ? repartirLargeurs(colonnesProduit, CHAMPS_PRODUIT,
                LARGEUR_UTILE - 2 * MARGE_GAUCHE_TABLE - RETRAIT_PRODUIT) : new int[0];
        int[] positionsProduit = positions(largeursProduit, MARGE_GAUCHE_TABLE + RETRAIT_PRODUIT);

        StringBuilder xml = new StringBuilder(16000);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<!-- Modele genere depuis le createur de modeles de facture : ")
                .append(echapper(StringUtils.defaultString(modele.getNom())))
                .append(". Modifiable dans Jaspersoft Studio. -->\n");
        xml.append("<jasperReport xmlns=\"http://jasperreports.sourceforge.net/jasperreports\"")
                .append(" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"")
                .append(" xsi:schemaLocation=\"http://jasperreports.sourceforge.net/jasperreports")
                .append(" http://jasperreports.sourceforge.net/xsd/jasperreport.xsd\" name=\"")
                .append(nomRapport(modele)).append("\" language=\"groovy\" pageWidth=\"595\" pageHeight=\"842\"")
                .append(" columnWidth=\"585\" leftMargin=\"5\" rightMargin=\"5\" topMargin=\"20\" bottomMargin=\"20\"")
                .append(" whenNoDataType=\"AllSectionsNoDetail\" isSummaryWithPageHeaderAndFooter=\"true\"")
                .append(" isFloatColumnFooter=\"true\" uuid=\"").append(uuid()).append("\">\n");

        for (String p : new String[] { "P_H_INSTITUTION", "P_AUTRE_DESC", "P_INSTITUTION_ADRESSE", "P_H_LOGO",
                "P_H_CLT_INFOS", "P_PRINTED_BY", "P_LG_FACTURE_ID", "P_LG_TIERS_PAYANT_ID", "P_CODE_COMPTABLE",
                "P_TIERS_PAYANT_NAME", "P_CODE_FACTURE", "P_TOTAL_GENERAL", "P_ATT_AMOUNT", "P_TOTAL_IN_LETTERS",
                "P_CODE_POSTALE", "P_COMPTE_CONTRIBUABLE", "P_CODE_OFFICINE", "P_REGISTRE_COMMERCE" }) {
            xml.append("\t<parameter name=\"").append(p).append("\" class=\"java.lang.String\"/>\n");
        }
        // Tri demande sur la fiche du tiers payant : entier lie (0/1), jamais un fragment de SQL.
        xml.append("\t<parameter name=\"").append(TriFacture.PARAMETRE)
                .append("\" class=\"java.lang.Integer\">\n\t\t<defaultValueExpression><![CDATA[0]]>")
                .append("</defaultValueExpression>\n\t</parameter>\n");

        xml.append("\t<queryString>\n\t\t<![CDATA[").append(requeteSql(modele, avecProduits))
                .append("]]>\n\t</queryString>\n");

        // champs SQL : ceux utilises par les colonnes retenues, plus ceux du bloc d'en-tete et de tri
        Map<String, String> champsSql = new LinkedHashMap<>();
        champsSql.put("str_CODE_FACTURE", "java.lang.String");
        champsSql.put("DATEFACTURE", "java.sql.Timestamp");
        champsSql.put("str_FIRST_NAME_CUSTOMER", "java.lang.String");
        champsSql.put("str_LAST_NAME_CUSTOMER", "java.lang.String");
        champsSql.put("dt_CREATED", "java.sql.Timestamp");
        for (ModelFactureDynamiqueColonne c : colonnes) {
            Champ def = CHAMPS.get(c.getChamp());
            if (def.champSql != null) {
                champsSql.put(def.champSql, def.classe);
            }
        }
        if (avecProduits) {
            // une ligne SQL = un produit ; le regroupement par bon reconstitue la ligne du bon
            champsSql.put("lg_PREENREGISTREMENT_ID", "java.lang.String");
            for (ModelFactureDynamiqueColonne c : colonnesProduit) {
                Champ def = CHAMPS_PRODUIT.get(c.getChamp());
                champsSql.put(def.champSql, def.classe);
            }
        }
        for (Map.Entry<String, String> e : champsSql.entrySet()) {
            xml.append("\t<field name=\"").append(e.getKey()).append("\" class=\"").append(e.getValue())
                    .append("\"/>\n");
        }

        // Totaux du BON. Quand une ligne SQL = un produit, l'increment est fait UNE FOIS PAR BON :
        // sans cela le montant d'un bon de 3 produits serait compte 3 fois.
        for (ModelFactureDynamiqueColonne c : colonnes) {
            Champ def = CHAMPS.get(c.getChamp());
            if (def.numerique) {
                xml.append("\t<variable name=\"v_TOTAL_").append(c.getChamp()).append("\" class=\"java.lang.Double\"")
                        .append(" calculation=\"Sum\"");
                if (avecProduits) {
                    xml.append(" incrementType=\"Group\" incrementGroup=\"grpBon\"");
                }
                xml.append(">\n\t\t<variableExpression><![CDATA[").append(def.expression)
                        .append("]]></variableExpression>\n\t</variable>\n");
            }
        }
        // Totaux du PRODUIT : une ligne SQL = un produit, l'increment par defaut est correct.
        for (ModelFactureDynamiqueColonne c : colonnesProduit) {
            Champ def = CHAMPS_PRODUIT.get(c.getChamp());
            if (def.numerique) {
                xml.append("\t<variable name=\"v_TOTAL_").append(c.getChamp()).append("\" class=\"java.lang.Double\"")
                        .append(" calculation=\"Sum\">\n\t\t<variableExpression><![CDATA[").append(def.expression)
                        .append("]]></variableExpression>\n\t</variable>\n");
            }
        }
        if (avecProduits) {
            xml.append("\t<group name=\"grpBon\" isReprintHeaderOnEachPage=\"true\">\n")
                    .append("\t\t<groupExpression><![CDATA[$F{lg_PREENREGISTREMENT_ID}]]></groupExpression>\n")
                    .append(bandeGroupHeader(colonnes, largeurs, positions, colonnesProduit, largeursProduit,
                            positionsProduit))
                    .append("\t\t<groupFooter>\n\t\t\t<band height=\"3\"/>\n\t\t</groupFooter>\n")
                    .append("\t</group>\n");
        }

        xml.append("\t<background>\n\t\t<band splitType=\"Stretch\"/>\n\t</background>\n");
        xml.append(bandeColumnHeader(colonnes, largeurs, positions, avecEntete));
        // Sans detail : une ligne par bon. Avec detail : la ligne du bon est dans l'en-tete de
        // groupe et la bande de detail porte les lignes de produit.
        xml.append(bandeDetail(avecProduits ? colonnesProduit : colonnes, avecProduits ? largeursProduit : largeurs,
                avecProduits ? positionsProduit : positions, avecProduits ? CHAMPS_PRODUIT : CHAMPS,
                avecProduits ? 7 : 8));
        xml.append(bandePageFooter(avecPiedPage));
        xml.append(bandeSummary(colonnes, largeurs, positions));
        xml.append("</jasperReport>\n");
        return xml.toString();
    }

    // ------------------------------------------------------------------ bandes

    private static String bandeColumnHeader(List<ModelFactureDynamiqueColonne> colonnes, int[] largeurs,
            int[] positions, boolean avecEntete) {
        int decalage = avecEntete ? HAUTEUR_ENTETE : 0;
        int hauteur = decalage + HAUTEUR_ENTETE_COLONNES;
        StringBuilder b = new StringBuilder();
        b.append("\t<columnHeader>\n\t\t<band height=\"").append(hauteur).append("\">\n");
        if (avecEntete) {
            // nom de l'officine et sous-titre, centres en haut de page
            b.append(texteParametre("P_H_INSTITUTION", 46, 6, 493, 31, "Center", 20, true, "Century Gothic"));
            b.append(texteParametre("P_AUTRE_DESC", 46, 36, 493, 17, "Center", 8, true, null));
            // filet gris de separation
            b.append(filetGris(2, 53, 582));
            // date de la facture, a droite
            b.append("\t\t\t<textField pattern=\"EEEEE dd MMMMM yyyy\">\n").append(reportElement(420, 58, 160, 15))
                    .append("\t\t\t\t<textElement textAlignment=\"Left\"><font size=\"8\"/></textElement>\n")
                    .append("\t\t\t\t<textFieldExpression><![CDATA[$F{DATEFACTURE}]]></textFieldExpression>\n")
                    .append("\t\t\t</textField>\n");
            // bloc d'identification du tiers payant, a droite
            b.append(texteParametre("P_TIERS_PAYANT_NAME", 359, 76, 221, 15, "Left", 8, true, null));
            b.append(texteParametre("P_CODE_POSTALE", 359, 91, 221, 15, "Left", 8, false, null));
            b.append(texteParametre("P_COMPTE_CONTRIBUABLE", 359, 106, 221, 15, "Left", 8, false, null));
            b.append(texteParametre("P_CODE_OFFICINE", 359, 121, 221, 15, "Left", 8, false, null));
            b.append(texteParametre("P_REGISTRE_COMMERCE", 359, 136, 221, 15, "Left", 8, false, null));
            // numero de facture et periode, a gauche
            b.append("\t\t\t<textField>\n").append(reportElement(45, 121, 102, 15))
                    .append("\t\t\t\t<textElement textAlignment=\"Right\">")
                    .append("<font size=\"9\" isBold=\"true\" pdfFontName=\"Helvetica-Bold\"/></textElement>\n")
                    .append("\t\t\t\t<textFieldExpression><![CDATA[\"FACTURE N° \" + $F{str_CODE_FACTURE}]]>")
                    .append("</textFieldExpression>\n\t\t\t</textField>\n");
            b.append(texteParametre("P_H_CLT_INFOS", 156, 121, 198, 15, "Left", 9, true, null));
        }
        // bandeau des colonnes, sur fond gris
        for (int i = 0; i < colonnes.size(); i++) {
            b.append("\t\t\t<staticText>\n").append("\t\t\t\t<reportElement mode=\"Opaque\" x=\"").append(positions[i])
                    .append("\" y=\"").append(decalage).append("\" width=\"").append(largeurs[i]).append("\" height=\"")
                    .append(HAUTEUR_ENTETE_COLONNES).append("\" backcolor=\"#CCCCCC\" uuid=\"").append(uuid())
                    .append("\"/>\n").append(encadrement("0.25"))
                    .append("\t\t\t\t<textElement textAlignment=\"Center\" verticalAlignment=\"Middle\">")
                    .append("<font size=\"7\" isBold=\"true\" pdfFontName=\"Helvetica-Bold\" pdfEncoding=\"Cp1250\"")
                    .append(" isPdfEmbedded=\"true\"/></textElement>\n").append("\t\t\t\t<text><![CDATA[")
                    .append(echapper(StringUtils.upperCase(colonnes.get(i).getLibelle()))).append("]]></text>\n")
                    .append("\t\t\t</staticText>\n");
        }
        b.append("\t\t</band>\n\t</columnHeader>\n");
        return b.toString();
    }

    private static String bandeDetail(List<ModelFactureDynamiqueColonne> colonnes, int[] largeurs, int[] positions,
            Map<String, Champ> registre, int taillePolice) {
        int hauteur = registre == CHAMPS ? HAUTEUR_LIGNE : HAUTEUR_LIGNE_PRODUIT;
        StringBuilder b = new StringBuilder();
        b.append("\t<detail>\n\t\t<band height=\"").append(hauteur).append("\" splitType=\"Stretch\">\n");
        b.append(cellulesLigne(colonnes, largeurs, positions, registre, taillePolice, hauteur, 0));
        b.append("\t\t</band>\n\t</detail>\n");
        return b.toString();
    }

    /** Cellules encadrees d'une ligne de donnees, a la position verticale demandee dans la bande. */
    private static String cellulesLigne(List<ModelFactureDynamiqueColonne> colonnes, int[] largeurs, int[] positions,
            Map<String, Champ> registre, int taillePolice, int hauteur, int y) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < colonnes.size(); i++) {
            Champ def = registre.get(colonnes.get(i).getChamp());
            b.append("\t\t\t<textField isBlankWhenNull=\"true\"");
            if (def.pattern != null) {
                b.append(" pattern=\"").append(def.pattern).append("\"");
            }
            b.append(">\n").append(reportElement(positions[i], y, largeurs[i], hauteur)).append(encadrement("0.25"))
                    .append("\t\t\t\t<textElement textAlignment=\"").append(def.alignement)
                    .append("\" verticalAlignment=\"Middle\"><font size=\"").append(taillePolice).append("\"/>")
                    .append("<paragraph leftIndent=\"3\" rightIndent=\"1\"/></textElement>\n")
                    .append("\t\t\t\t<textFieldExpression><![CDATA[").append(def.expression)
                    .append("]]></textFieldExpression>\n\t\t\t</textField>\n");
        }
        return b.toString();
    }

    /**
     * En-tete de groupe, uniquement quand le detail des produits est actif : la ligne du BON, puis le bandeau des
     * libelles de colonnes produit — exactement la meme structure que le PDF genere par l'application.
     */
    private static String bandeGroupHeader(List<ModelFactureDynamiqueColonne> colonnes, int[] largeurs, int[] positions,
            List<ModelFactureDynamiqueColonne> colonnesProduit, int[] largeursProduit, int[] positionsProduit) {
        StringBuilder b = new StringBuilder();
        b.append("\t\t<groupHeader>\n\t\t\t<band height=\"").append(HAUTEUR_LIGNE + HAUTEUR_ENTETE_PRODUIT)
                .append("\" splitType=\"Stretch\">\n");
        b.append(cellulesLigne(colonnes, largeurs, positions, CHAMPS, 8, HAUTEUR_LIGNE, 0));
        for (int i = 0; i < colonnesProduit.size(); i++) {
            b.append("\t\t\t<staticText>\n\t\t\t\t<reportElement mode=\"Opaque\" x=\"").append(positionsProduit[i])
                    .append("\" y=\"").append(HAUTEUR_LIGNE).append("\" width=\"").append(largeursProduit[i])
                    .append("\" height=\"").append(HAUTEUR_ENTETE_PRODUIT).append("\" backcolor=\"#EEEEEE\" uuid=\"")
                    .append(uuid()).append("\"/>\n").append(encadrement("0.25"))
                    .append("\t\t\t\t<textElement textAlignment=\"")
                    .append(CHAMPS_PRODUIT.get(colonnesProduit.get(i).getChamp()).alignement)
                    .append("\" verticalAlignment=\"Middle\"><font size=\"6\" isItalic=\"true\"/></textElement>\n")
                    .append("\t\t\t\t<text><![CDATA[").append(echapper(colonnesProduit.get(i).getLibelle()))
                    .append("]]></text>\n\t\t\t</staticText>\n");
        }
        b.append("\t\t\t</band>\n\t\t</groupHeader>\n");
        return b.toString();
    }

    private static String bandePageFooter(boolean avecPiedPage) {
        if (!avecPiedPage) {
            return "\t<pageFooter>\n\t\t<band height=\"0\"/>\n\t</pageFooter>\n";
        }
        StringBuilder b = new StringBuilder();
        b.append("\t<pageFooter>\n\t\t<band height=\"40\">\n");
        b.append(filetGris(0, 4, 584));
        b.append("\t\t\t<textField>\n").append(reportElement(229, 12, 80, 15))
                .append("\t\t\t\t<textElement textAlignment=\"Right\"><font size=\"8\"/></textElement>\n")
                .append("\t\t\t\t<textFieldExpression><![CDATA[\"Page \" + $V{PAGE_NUMBER} + \" sur\"]]>")
                .append("</textFieldExpression>\n\t\t\t</textField>\n");
        b.append("\t\t\t<textField evaluationTime=\"Report\">\n").append(reportElement(309, 12, 40, 15))
                .append("\t\t\t\t<textElement textAlignment=\"Left\"><font size=\"8\"/></textElement>\n")
                .append("\t\t\t\t<textFieldExpression><![CDATA[\" \" + $V{PAGE_NUMBER}]]></textFieldExpression>\n")
                .append("\t\t\t</textField>\n");
        b.append("\t\t</band>\n\t</pageFooter>\n");
        return b.toString();
    }

    private static String bandeSummary(List<ModelFactureDynamiqueColonne> colonnes, int[] largeurs, int[] positions) {
        StringBuilder b = new StringBuilder();
        b.append("\t<summary>\n\t\t<band height=\"120\">\n");
        // ligne des totaux, alignee sur les colonnes du tableau
        boolean libelleTotalPose = false;
        for (int i = 0; i < colonnes.size(); i++) {
            ModelFactureDynamiqueColonne c = colonnes.get(i);
            Champ def = CHAMPS.get(c.getChamp());
            if (def.numerique) {
                b.append("\t\t\t<textField pattern=\"#,##0\" isBlankWhenNull=\"true\">\n")
                        .append(reportElement(positions[i], 5, largeurs[i], HAUTEUR_LIGNE)).append(encadrement("0.5"))
                        .append("\t\t\t\t<textElement textAlignment=\"Right\" verticalAlignment=\"Middle\">")
                        .append("<font size=\"8\" isBold=\"true\" pdfFontName=\"Helvetica-BoldOblique\"/>")
                        .append("<paragraph rightIndent=\"1\"/></textElement>\n")
                        .append("\t\t\t\t<textFieldExpression><![CDATA[$V{v_TOTAL_").append(c.getChamp())
                        .append("}]]></textFieldExpression>\n\t\t\t</textField>\n");
            } else if (!libelleTotalPose) {
                // le libelle "TOTAUX" occupe toutes les colonnes non numeriques de gauche
                int largeur = 0;
                for (int j = i; j < colonnes.size() && !CHAMPS.get(colonnes.get(j).getChamp()).numerique; j++) {
                    largeur += largeurs[j];
                }
                b.append("\t\t\t<staticText>\n").append(reportElement(positions[i], 5, largeur, HAUTEUR_LIGNE))
                        .append(encadrement("0.5")).append("\t\t\t\t<textElement verticalAlignment=\"Middle\">")
                        .append("<font size=\"8\" isBold=\"true\" pdfFontName=\"Helvetica-BoldOblique\"/>")
                        .append("<paragraph leftIndent=\"3\"/></textElement>\n")
                        .append("\t\t\t\t<text><![CDATA[TOTAUX]]></text>\n\t\t\t</staticText>\n");
                libelleTotalPose = true;
            }
        }
        // total general, montant en lettres et signature
        b.append("\t\t\t<textField>\n").append(reportElement(MARGE_GAUCHE_TABLE, 32, LARGEUR_UTILE - 4, 18))
                .append("\t\t\t\t<textElement verticalAlignment=\"Middle\">")
                .append("<font size=\"8\" isBold=\"true\"/><paragraph leftIndent=\"3\"/></textElement>\n")
                .append("\t\t\t\t<textFieldExpression><![CDATA[$P{P_TOTAL_GENERAL}]]></textFieldExpression>\n")
                .append("\t\t\t</textField>\n");
        b.append("\t\t\t<staticText>\n").append(reportElement(MARGE_GAUCHE_TABLE, 55, 394, 15))
                .append("\t\t\t\t<textElement verticalAlignment=\"Middle\">")
                .append("<font size=\"8\" isBold=\"true\"/><paragraph leftIndent=\"3\"/></textElement>\n")
                .append("\t\t\t\t<text><![CDATA[ARRETE LA PRESENTE FACTURE A LA SOMME DE (en lettres) :]]></text>\n")
                .append("\t\t\t</staticText>\n");
        b.append(texteParametre("P_TOTAL_IN_LETTERS", MARGE_GAUCHE_TABLE, 70, LARGEUR_UTILE - 4, 15, "Left", 8, true,
                null));
        b.append("\t\t\t<textField>\n").append(reportElement(420, 95, 160, 17))
                .append("\t\t\t\t<textElement textAlignment=\"Center\" verticalAlignment=\"Middle\">")
                .append("<font fontName=\"Monospaced\" size=\"8\" isBold=\"true\" isUnderline=\"true\"/>")
                .append("</textElement>\n")
                .append("\t\t\t\t<textFieldExpression><![CDATA[\"LE PHARMACIEN\"]]></textFieldExpression>\n")
                .append("\t\t\t</textField>\n");
        b.append("\t\t</band>\n\t</summary>\n");
        return b.toString();
    }

    // ------------------------------------------------------------------ briques XML

    private static String texteParametre(String parametre, int x, int y, int largeur, int hauteur, String alignement,
            int taille, boolean gras, String police) {
        StringBuilder b = new StringBuilder();
        b.append("\t\t\t<textField isBlankWhenNull=\"true\">\n").append(reportElement(x, y, largeur, hauteur))
                .append("\t\t\t\t<textElement textAlignment=\"").append(alignement)
                .append("\" verticalAlignment=\"Middle\"><font ");
        if (police != null) {
            b.append("fontName=\"").append(police).append("\" ");
        }
        b.append("size=\"").append(taille).append("\" isBold=\"").append(gras).append("\"/></textElement>\n")
                .append("\t\t\t\t<textFieldExpression><![CDATA[$P{").append(parametre)
                .append("}]]></textFieldExpression>\n\t\t\t</textField>\n");
        return b.toString();
    }

    private static String filetGris(int x, int y, int largeur) {
        return "\t\t\t<staticText>\n\t\t\t\t<reportElement mode=\"Opaque\" x=\"" + x + "\" y=\"" + y + "\" width=\""
                + largeur + "\" height=\"2\" backcolor=\"#CCCCCC\" uuid=\"" + uuid() + "\"/>\n"
                + "\t\t\t\t<text><![CDATA[]]></text>\n\t\t\t</staticText>\n";
    }

    private static String reportElement(int x, int y, int largeur, int hauteur) {
        return "\t\t\t\t<reportElement x=\"" + x + "\" y=\"" + y + "\" width=\"" + largeur + "\" height=\"" + hauteur
                + "\" uuid=\"" + uuid() + "\"/>\n";
    }

    private static String encadrement(String epaisseur) {
        return "\t\t\t\t<box leftPadding=\"1\" rightPadding=\"1\">\n" + "\t\t\t\t\t<topPen lineWidth=\"" + epaisseur
                + "\"/>\n" + "\t\t\t\t\t<leftPen lineWidth=\"" + epaisseur + "\"/>\n"
                + "\t\t\t\t\t<bottomPen lineWidth=\"" + epaisseur + "\"/>\n" + "\t\t\t\t\t<rightPen lineWidth=\""
                + epaisseur + "\"/>\n" + "\t\t\t\t</box>\n";
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }

    private static String echapper(String texte) {
        return StringUtils.defaultString(texte).replace("]]>", "]]&gt;");
    }

    /**
     * Repartit la largeur utile entre les colonnes retenues, proportionnellement a leur largeur souhaitee, en donnant
     * le reste d'arrondi a la derniere colonne : le tableau occupe donc TOUJOURS exactement la largeur de la page, sans
     * debordement ni bande blanche a droite.
     */
    private static int[] repartirLargeurs(List<ModelFactureDynamiqueColonne> colonnes, Map<String, Champ> registre,
            int disponible) {
        if (colonnes.isEmpty()) {
            return new int[0];
        }
        int total = 0;
        for (ModelFactureDynamiqueColonne c : colonnes) {
            total += registre.get(c.getChamp()).largeur;
        }
        int[] largeurs = new int[colonnes.size()];
        int cumul = 0;
        for (int i = 0; i < colonnes.size() - 1; i++) {
            largeurs[i] = Math.max(20, registre.get(colonnes.get(i).getChamp()).largeur * disponible / total);
            cumul += largeurs[i];
        }
        largeurs[colonnes.size() - 1] = Math.max(20, disponible - cumul);
        return largeurs;
    }

    /** Abscisses cumulees des colonnes, a partir d'une marge de depart. */
    private static int[] positions(int[] largeurs, int depart) {
        int[] positions = new int[largeurs.length];
        int x = depart;
        for (int i = 0; i < largeurs.length; i++) {
            positions[i] = x;
            x += largeurs[i];
        }
        return positions;
    }

    /**
     * Requete de la facture : memes tables et memes conditions que le modele Jasper de reference, avec le taux du tiers
     * payant ajoute (colonne "Taux") et l'ordre de tri du modele.
     */
    private static String requeteSql(ModelFactureDynamique modele, boolean avecProduits) {
        // ATTENTION aux noms de colonnes : dans cette base, str_FIRST_NAME porte le NOM et
        // str_LAST_NAME porte les PRENOMS. Ce n'est pas une supposition - la fiche client de
        // l'application libelle "Nom" le champ strFIRSTNAME et "Prenom" le champ strLASTNAME, et
        // la table CHAMPS ci-dessus associe NOM_CLIENT a str_FIRST_NAME_CUSTOMER. Trier sur
        // str_LAST_NAME revient donc a trier sur le PRENOM, ce qui donne un ordre illisible.
        String nom = "p.str_FIRST_NAME_CUSTOMER", prenom = "p.str_LAST_NAME_CUSTOMER";
        String ordre;
        if (ModelFactureDynamique.TRI_DATE_BON.equals(modele.getModeTri())) {
            ordre = "p.dt_CREATED, " + nom + ", " + prenom;
        } else if (ModelFactureDynamique.TRI_ALPHABETIQUE.equals(modele.getModeTri())) {
            // NOM puis PRENOM : l'ordre inverse etait applique, un annuaire ne se lit pas par prenom
            ordre = nom + ", " + prenom + ", p.dt_CREATED";
        } else {
            // Le modele suit la fiche du tiers payant : l'etat ne peut pas la connaitre a la
            // generation, il doit donc porter LES DEUX ordres et laisser le parametre trancher a
            // l'impression. Auparavant il figeait l'ordre alphabetique, et une fiche reglee sur
            // "date de bon" restait sans effet sur les modeles dynamiques.
            ordre = "CASE WHEN $P{" + TriFacture.PARAMETRE + "} = 1 THEN p.dt_CREATED END,\n" + "          " + nom
                    + ", " + prenom + ", p.dt_CREATED";
        }
        StringBuilder q = new StringBuilder(1200);
        q.append("SELECT p.*, fa.str_CODE_FACTURE, f.dbl_MONTANT AS str_TIERS_PAYANT_RO, f.dbl_MONTANT_REMISE,\n")
                .append("       f.dbl_MONTANT_Brut, pr.str_REF_BON AS strREFBON, pr.int_PERCENT AS TAUX_TP,\n")
                .append("       ctp.str_NUMERO_SECURITE_SOCIAL AS SECURITE_SOCIAL,\n")
                .append("       (SELECT tp.str_FULLNAME FROM t_tiers_payant tp\n")
                .append("         WHERE tp.lg_TIERS_PAYANT_ID = $P{P_LG_TIERS_PAYANT_ID}) AS str_FULLNAME,\n")
                .append("       fa.dt_CREATED AS DATEFACTURE");
        if (avecProduits) {
            q.append(",\n       fam.int_CIP AS PROD_CIP, fam.str_DESCRIPTION AS PROD_DESIGNATION,\n")
                    .append("       pd.int_QUANTITY AS PROD_QUANTITE, pd.int_PRICE_UNITAIR AS PROD_PRIX_UNITAIRE,\n")
                    .append("       pd.int_PRICE AS PROD_MONTANT, pd.int_PRICE_REMISE AS PROD_REMISE");
        }
        // Les jointures des produits sont accrochees DIRECTEMENT a t_preenregistrement, avant la
        // liste des autres tables : en SQL, la virgule est moins prioritaire que LEFT JOIN, et une
        // condition ON ne peut pas referencer une table declaree apres une virgule.
        q.append("\n  FROM t_preenregistrement p");
        if (avecProduits) {
            // LEFT JOIN : un bon sans ligne de vente reste present sur la facture
            q.append("\n  LEFT JOIN t_preenregistrement_detail pd")
                    .append(" ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID")
                    .append("\n  LEFT JOIN t_famille fam ON fam.lg_FAMILLE_ID = pd.lg_FAMILLE_ID");
        }
        q.append(",\n       t_preenregistrement_compte_client_tiers_payent pr, t_facture fa,\n")
                .append("       t_facture_detail f, t_client c, t_compte_client cp, t_compte_client_tiers_payant ctp\n")
                .append(" WHERE p.lg_PREENREGISTREMENT_ID = pr.lg_PREENREGISTREMENT_ID\n")
                .append("   AND pr.lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = f.str_REF\n")
                .append("   AND p.str_TYPE_VENTE LIKE 'VO'\n").append("   AND f.lg_FACTURE_ID = $P{P_LG_FACTURE_ID}\n")
                .append("   AND fa.lg_FACTURE_ID = f.lg_FACTURE_ID\n")
                .append("   AND p.str_STATUT = 'is_Closed' AND pr.str_STATUT = 'is_Closed'\n")
                .append("   AND c.lg_CLIENT_ID = cp.lg_CLIENT_ID AND cp.lg_COMPTE_CLIENT_ID = ctp.lg_COMPTE_CLIENT_ID\n")
                .append("   AND ctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = pr.lg_COMPTE_CLIENT_TIERS_PAYANT_ID\n")
                .append(" ORDER BY ").append(ordre);
        if (avecProduits) {
            // les produits d'un meme bon doivent se suivre, sinon le regroupement Jasper se casse
            q.append(", p.lg_PREENREGISTREMENT_ID, pd.dt_CREATED");
        }
        return q.toString();
    }
}
