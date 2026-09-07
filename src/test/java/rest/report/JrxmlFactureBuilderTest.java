package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.ModelFactureDynamique;
import dal.ModelFactureDynamiqueColonne;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.xml.parsers.DocumentBuilderFactory;
import net.sf.jasperreports.engine.DefaultJasperReportsContext;
import net.sf.jasperreports.engine.JRField;
import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.JRPrintElement;
import net.sf.jasperreports.engine.JRPrintPage;
import net.sf.jasperreports.engine.JRPrintText;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRMapCollectionDataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * Export d'un modele de facture au format JasperReports (.jrxml) : le fichier doit etre un XML valide, tenir dans la
 * largeur d'une page A4 (pas de colonne qui deborde) et respecter les options d'en-tete et de pied de page.
 */
class JrxmlFactureBuilderTest {

    private static ModelFactureDynamique modele(String modeTri, String... champs) {
        ModelFactureDynamique m = new ModelFactureDynamique();
        m.setId(7);
        m.setNom("Modèle CNAM");
        m.setModeTri(modeTri);
        ajouterColonnes(m, ModelFactureDynamiqueColonne.NIVEAU_BON, champs);
        return m;
    }

    /** Meme modele, avec le detail des produits active et les colonnes produit demandees. */
    private static ModelFactureDynamique modeleAvecProduits(String[] champsBon, String... champsProduit) {
        ModelFactureDynamique m = modele("ALPHABETIQUE", champsBon);
        m.setDetaillerProduits(true);
        ajouterColonnes(m, ModelFactureDynamiqueColonne.NIVEAU_PRODUIT, champsProduit);
        return m;
    }

    private static void ajouterColonnes(ModelFactureDynamique m, String niveau, String... champs) {
        int ordre = 0;
        for (String champ : champs) {
            ModelFactureDynamiqueColonne c = new ModelFactureDynamiqueColonne();
            c.setChamp(champ);
            c.setLibelle(champ);
            c.setOrdre(ordre++);
            c.setNiveau(niveau);
            c.setModele(m);
            m.getColonnes().add(c);
        }
    }

    private static Element racine(String xml) throws Exception {
        DocumentBuilderFactory fabrique = DocumentBuilderFactory.newInstance();
        fabrique.setNamespaceAware(false);
        return fabrique.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)))
                .getDocumentElement();
    }

    /** Largeur cumulee des cellules d'une bande, telle que Jasper la calculera. */
    private static int largeurCumulee(Element racine, String bande) {
        NodeList bandes = racine.getElementsByTagName(bande);
        Element band = (Element) ((Element) bandes.item(0)).getElementsByTagName("band").item(0);
        NodeList elements = band.getElementsByTagName("reportElement");
        int max = 0;
        for (int i = 0; i < elements.getLength(); i++) {
            Element e = (Element) elements.item(i);
            int x = Integer.parseInt(e.getAttribute("x"));
            int w = Integer.parseInt(e.getAttribute("width"));
            max = Math.max(max, x + w);
        }
        return max;
    }

    /**
     * Imprime le modele avec des lignes fabriquees et renvoie le document obtenu.
     *
     * Lire le .jrxml ne suffit pas pour ces deux reglages : la taille de police passe par des styles conditionnels et
     * la coupure de page par un element <break>. Seul le document imprime dit ce que l'officine verra reellement sur
     * son papier.
     */
    private static JasperPrint imprimer(ModelFactureDynamique modele, int nbBons, int produitsParBon,
            Map<String, Object> parametres) throws Exception {
        DefaultJasperReportsContext.getInstance().setProperty("net.sf.jasperreports.awt.ignore.missing.font", "true");
        JasperReport rapport = JasperCompileManager.compileReport(new ByteArrayInputStream(
                JrxmlFactureBuilder.construire(modele, true, true).getBytes(StandardCharsets.UTF_8)));
        List<Map<String, ?>> lignes = new ArrayList<>();
        for (int bon = 1; bon <= nbBons; bon++) {
            for (int produit = 0; produit < produitsParBon; produit++) {
                Map<String, Object> ligne = new HashMap<>();
                for (JRField champ : rapport.getFields()) {
                    ligne.put(champ.getName(), valeurDEssai(champ, bon));
                }
                lignes.add(ligne);
            }
        }
        Map<String, Object> retenus = new HashMap<>();
        for (JRParameter p : rapport.getParameters()) {
            if (!p.isSystemDefined() && parametres.containsKey(p.getName())) {
                retenus.put(p.getName(), parametres.get(p.getName()));
            }
        }
        return JasperFillManager.fillReport(rapport, retenus, new JRMapCollectionDataSource(lignes));
    }

    /** Une valeur du bon type ; le NOM porte un repere qui identifie le bon sur le papier. */
    private static Object valeurDEssai(JRField champ, int bon) {
        String repere = String.format("BON%02d", bon);
        switch (champ.getValueClassName()) {
        case "java.lang.Integer":
            return 1000 * bon;
        case "java.lang.Double":
            return 1000.0 * bon;
        case "java.sql.Timestamp":
            return new java.sql.Timestamp(0L);
        default:
            return "str_FIRST_NAME_CUSTOMER".equals(champ.getName())
                    || "lg_PREENREGISTREMENT_ID".equals(champ.getName()) ? repere : "x";
        }
    }

    /** Nombre de bons imprimes sur chaque page. */
    private static List<Integer> bonsParPage(ModelFactureDynamique modele, int nbBons, Map<String, Object> parametres)
            throws Exception {
        return bonsParPage(modele, nbBons, 1, parametres);
    }

    private static List<Integer> bonsParPage(ModelFactureDynamique modele, int nbBons, int produitsParBon,
            Map<String, Object> parametres) throws Exception {
        List<Integer> parPage = new ArrayList<>();
        for (JRPrintPage page : imprimer(modele, nbBons, produitsParBon, parametres).getPages()) {
            Set<String> vus = new HashSet<>();
            for (JRPrintElement element : page.getElements()) {
                if (element instanceof JRPrintText) {
                    String texte = ((JRPrintText) element).getFullText();
                    if (texte != null && texte.startsWith("BON")) {
                        vus.add(texte.substring(0, 5));
                    }
                }
            }
            parPage.add(vus.size());
        }
        return parPage;
    }

    /** Tailles de police reellement imprimees sur les lignes de bon. */
    private static Set<Float> taillesDesLignes(ModelFactureDynamique modele, Map<String, Object> parametres)
            throws Exception {
        Set<Float> tailles = new HashSet<>();
        for (JRPrintPage page : imprimer(modele, 3, 1, parametres).getPages()) {
            for (JRPrintElement element : page.getElements()) {
                if (element instanceof JRPrintText) {
                    String texte = ((JRPrintText) element).getFullText();
                    if (texte != null && texte.startsWith("BON")) {
                        tailles.add(((JRPrintText) element).getFontsize());
                    }
                }
            }
        }
        return tailles;
    }

    @Test
    @DisplayName("Le fichier produit est un XML valide")
    void xmlValide() throws Exception {
        String xml = JrxmlFactureBuilder.construire(
                modele("ALPHABETIQUE", "NUMERO", "NOM_COMPLET", "MONTANT_BRUT", "PART_TIERS_PAYANT"), true, true);
        Element racine = racine(xml);
        assertEquals("jasperReport", racine.getTagName());
        assertEquals("595", racine.getAttribute("pageWidth"));
    }

    @Test
    @DisplayName("Le tableau ne deborde jamais de la largeur de la page, quel que soit le nombre de colonnes")
    void pasDeDebordement() throws Exception {
        List<String[]> jeux = Arrays.asList(new String[] { "NOM_COMPLET", "PART_TIERS_PAYANT" },
                new String[] { "NUMERO", "DATE_BON", "REF_BON", "NOM_CLIENT", "PRENOM_CLIENT", "MATRICULE",
                        "MONTANT_BRUT", "REMISE", "PART_CLIENT", "PART_TIERS_PAYANT" },
                new String[] { "NUMERO", "DATE_BON", "REF_BON", "NOM_CLIENT", "PRENOM_CLIENT", "NOM_COMPLET",
                        "MATRICULE", "REF_VENTE", "TAUX", "MONTANT_BRUT", "REMISE", "PART_CLIENT",
                        "PART_TIERS_PAYANT" });
        for (String[] champs : jeux) {
            Element racine = racine(JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", champs), true, true));
            int largeur = largeurCumulee(racine, "detail");
            assertTrue(largeur <= 585, champs.length + " colonnes : largeur " + largeur + " > 585");
            assertTrue(largeur >= 575, champs.length + " colonnes : la page n'est pas remplie (" + largeur + ")");
        }
    }

    @Test
    @DisplayName("A toutes les tailles de police, le tableau remplit la page sans jamais la deborder")
    void pasDeDebordementQuelleQueSoitLaPolice() throws Exception {
        // Point 20 : les largeurs minimales sont mises a l'echelle de la police demandee. Il faut
        // verifier qu'a 12 points, la plus grande taille reglable, le decoupage tient toujours dans
        // la page - et qu'a 5 points il ne laisse pas la moitie de la page vide.
        for (int taille = 5; taille <= 12; taille++) {
            ModelFactureDynamique m = modeleAvecProduits(
                    new String[] { "NUMERO", "DATE_BON", "REF_BON", "NOM_COMPLET", "MATRICULE", "MONTANT_BRUT",
                            "PART_CLIENT", "PART_TIERS_PAYANT" },
                    "PROD_CIP", "PROD_DESIGNATION", "PROD_QUANTITE", "PROD_PRIX_UNITAIRE", "PROD_MONTANT",
                    "PROD_REMISE");
            m.setTaillePolice(taille);
            Element racine = racine(JrxmlFactureBuilder.construire(m, true, true));
            int largeur = largeurCumulee(racine, "detail");
            assertTrue(largeur <= 585, taille + " pt : largeur " + largeur + " > 585");
            assertTrue(largeur >= 575, taille + " pt : la page n'est pas remplie (" + largeur + ")");
        }
    }

    @Test
    @DisplayName("En-tete masque : la bande ne contient plus que le bandeau des colonnes")
    void enteteMasquee() throws Exception {
        String avec = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT"), true, true);
        String sans = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT"), false,
                true);
        assertTrue(avec.contains("P_TIERS_PAYANT_NAME"));
        assertFalse(sans.contains("$P{P_TIERS_PAYANT_NAME}"));
        Element racineSans = racine(sans);
        Element band = (Element) ((Element) racineSans.getElementsByTagName("columnHeader").item(0))
                .getElementsByTagName("band").item(0);
        assertEquals("25", band.getAttribute("height"));
    }

    @Test
    @DisplayName("Pied de page masque : bande vide, aucune numerotation")
    void piedDePageMasque() throws Exception {
        String sans = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT"), true,
                false);
        assertFalse(sans.contains("PAGE_NUMBER"));
        Element band = (Element) ((Element) racine(sans).getElementsByTagName("pageFooter").item(0))
                .getElementsByTagName("band").item(0);
        assertEquals("0", band.getAttribute("height"));
    }

    @Test
    @DisplayName("Un total est calcule pour chaque colonne de montant, et pour elles seules")
    void totauxSurColonnesNumeriques() throws Exception {
        String xml = JrxmlFactureBuilder
                .construire(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT", "PART_TIERS_PAYANT"), true, true);
        assertTrue(xml.contains("v_TOTAL_MONTANT_BRUT"));
        assertTrue(xml.contains("v_TOTAL_PART_TIERS_PAYANT"));
        assertFalse(xml.contains("v_TOTAL_NOM_COMPLET"));
    }

    @Test
    @DisplayName("La taille de police du modele est appliquee aux lignes imprimees")
    void taillePoliceDuModele() throws Exception {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");
        m.setTaillePolice(6);

        assertEquals(Collections.singleton(6f), taillesDesLignes(m, new HashMap<>()),
                "les lignes doivent prendre la taille demandee");
    }

    @Test
    @DisplayName("Sans taille demandee, la presentation d'origine est conservee")
    void taillePoliceParDefaut() throws Exception {
        assertEquals(Collections.singleton(8f),
                taillesDesLignes(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT"), new HashMap<>()),
                "8 points, comme avant que l'option n'existe");
    }

    @Test
    @DisplayName("Une taille aberrante revient a la taille d'origine, au lieu d'une facture illisible")
    void taillePoliceAberrante() throws Exception {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");
        m.setTaillePolice(99);
        assertEquals(Collections.singleton(8f), taillesDesLignes(m, new HashMap<>()));

        m.setTaillePolice(null);
        assertEquals(Collections.singleton(8f), taillesDesLignes(m, new HashMap<>()),
                "un modele cree avant cette option n'a pas de taille : il garde la sienne");
    }

    @Test
    @DisplayName("Les lignes de produit restent d'un point plus petites que la ligne du bon")
    void produitsUnPointPlusPetits() throws Exception {
        ModelFactureDynamique m = modeleAvecProduits(new String[] { "NOM_COMPLET", "MONTANT_BRUT" }, "PROD_DESIGNATION",
                "PROD_MONTANT");
        m.setTaillePolice(9);

        String xml = JrxmlFactureBuilder.construire(m, true, true);

        assertTrue(xml.contains("<style name=\"LigneBon\" mode=\"Transparent\" fontName=\"SansSerif\" fontSize=\"9\""),
                "la ligne du bon prend la taille demandee");
        assertTrue(
                xml.contains("<style name=\"LigneProduit\" mode=\"Transparent\" fontName=\"SansSerif\" fontSize=\"8\""),
                "les lignes de produit restent un point en dessous");
    }

    @Test
    @DisplayName("La fiche du tiers payant peut remplacer la taille de police du modele")
    void taillePoliceRempaceeParLaFiche() throws Exception {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");
        m.setTaillePolice(8);

        Map<String, Object> parametres = new HashMap<>();
        parametres.put(MiseEnPageFacture.PARAMETRE_TAILLE_POLICE, 6);

        assertEquals(Collections.singleton(6f), taillesDesLignes(m, parametres));
    }

    @Test
    @DisplayName("Sans nombre de bons par page, la page se remplit d'elle-meme comme avant")
    void bonsParPageAutomatique() throws Exception {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");

        List<Integer> parPage = bonsParPage(m, 40, new HashMap<>());

        // La page se remplit d'elle-meme : elle porte tout ce qu'elle peut, et pas un nombre fixe.
        assertEquals(2, parPage.size(), "40 bons debordent d'une page : " + parPage);
        assertTrue(parPage.get(0) > 20, "une page pleine porte bien plus de 20 bons : " + parPage);
    }

    @Test
    @DisplayName("Le nombre de bons par page du modele est respecte")
    void bonsParPageDuModele() throws Exception {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");
        m.setNbBonsParPage(12);

        assertEquals(Arrays.asList(12, 12, 12, 4), bonsParPage(m, 40, new HashMap<>()));
    }

    @Test
    @DisplayName("La fiche du tiers payant peut remplacer le nombre de bons par page du modele")
    void bonsParPageRemplaceParLaFiche() throws Exception {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");
        m.setNbBonsParPage(12);

        Map<String, Object> parametres = new HashMap<>();
        parametres.put(MiseEnPageFacture.PARAMETRE_BONS_PAR_PAGE, 10);

        assertEquals(Arrays.asList(10, 10, 10, 10, 0), bonsParPage(m, 40, parametres),
                "la derniere page ne porte plus que le total general");
    }

    @Test
    @DisplayName("Avec le detail des produits, la coupure compte les BONS et non les lignes de produit")
    void bonsParPageAvecDetailProduits() throws Exception {
        ModelFactureDynamique m = modeleAvecProduits(new String[] { "NOM_COMPLET", "MONTANT_BRUT" }, "PROD_DESIGNATION",
                "PROD_MONTANT");
        m.setNbBonsParPage(5);

        // 12 bons de 3 produits : sans le comptage par bon, la coupure tomberait toutes les
        // 5 LIGNES DE PRODUIT, soit moins de deux bons par page.
        List<Integer> parPage = bonsParPage(m, 12, 3, new HashMap<>());

        assertEquals(Arrays.asList(5, 5, 2), parPage, "5 bons entiers par page, produits compris");
    }

    @Test
    @DisplayName("Le modele genere reprend la presentation des etats livres a l'officine (0202)")
    void memePresentationQueLesEtatsLivres() {
        String xml = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "DATE_BON", "MONTANT_BRUT"),
                true, true);

        // Bandeau des colonnes : fond bleu marine, libelles blancs.
        assertTrue(xml.contains("backcolor=\"#1E3A5F\"") && xml.contains("forecolor=\"#FFFFFF\""),
                "le bandeau des colonnes doit etre bleu marine a texte blanc");
        // Un libelle de montant est cadre a droite, au-dessus de sa colonne de chiffres.
        assertTrue(xml.contains("style=\"EnteteColonneMontant\""),
                "la colonne de montant doit porter son libelle a droite");
        // Lignes : une sur deux teintee, filet fin dessous, et non un quadrillage complet.
        assertTrue(xml.contains("backcolor=\"#F2F6FA\"") && xml.contains("$V{REPORT_COUNT} % 2 == 0"),
                "une ligne sur deux doit etre teintee");
        assertTrue(xml.contains("<bottomPen lineWidth=\"0.25\" lineColor=\"#D6DEE8\"/>"),
                "chaque ligne doit se terminer par un filet fin");
        // Bloc de totaux : fond bleu pale, filet marine au-dessus.
        assertTrue(xml.contains("backcolor=\"#DDE6F0\""), "le bloc de totaux doit etre sur fond bleu pale");
        assertTrue(xml.contains("style=\"TotalLigne\""), "le bloc de totaux doit porter son style");
        // Le gris de l'ancienne presentation ne doit plus apparaitre nulle part.
        assertFalse(xml.contains("#CCCCCC"), "l'ancien bandeau gris ne doit plus etre genere");
    }

    @Test
    @DisplayName("L'en-tete est celui du modele 0202 : cartouche bleu pale a filet vert-bleu")
    void enteteDuModele0202() {
        String xml = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "DATE_BON", "MONTANT_BRUT"),
                true, true);

        // Le rectangle qui porte « FACTURE N° ... / PERIODE DU ... » : fond bleu tres pale,
        // borde a gauche d'un filet vert-bleu de 3 points. C'est ce bloc que l'officine reconnait.
        assertTrue(xml.contains("backcolor=\"#EDF2F8\""), "le cartouche de la facture doit etre sur fond bleu pale");
        assertTrue(xml.contains("<leftPen lineWidth=\"3.0\" lineColor=\"#48A9A6\"/>"),
                "le cartouche doit porter son filet vert-bleu a gauche");
        // Le numero de facture dans le cartouche, en marine gras, decale de la marge interieure.
        assertTrue(xml.contains("$P{P_CODE_FACTURE}"), "le numero de facture doit figurer dans l'en-tete");
        assertTrue(xml.contains("<box leftPadding=\"10\">"), "le texte du cartouche doit respirer de sa bordure");
        // La periode juste dessous, dans le meme cartouche.
        assertTrue(xml.contains("$P{P_H_CLT_INFOS}"), "la periode doit figurer sous le numero de facture");
        // Le destinataire cadre a droite : date, nom du tiers payant, puis ses coordonnees.
        for (String parametre : new String[] { "$F{DATEFACTURE}", "$P{P_TIERS_PAYANT_NAME}", "$P{P_CODE_POSTALE}",
                "$P{P_COMPTE_CONTRIBUABLE}", "$P{P_CODE_OFFICINE}", "$P{P_REGISTRE_COMMERCE}" }) {
            assertTrue(xml.contains(parametre), parametre + " doit figurer dans le bloc de droite");
        }
        assertTrue(xml.contains("textAlignment=\"Right\""), "le bloc du destinataire doit etre cadre a droite");
        // Les mentions secondaires dans le gris-bleu du modele, pas en noir.
        assertTrue(xml.contains("forecolor=\"#5A6B7D\""), "les mentions secondaires doivent etre en gris-bleu");
    }

    @Test
    @DisplayName("Sans en-tete demande, aucun element de l'en-tete n'est genere")
    void sansEntete() {
        String xml = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT"), false, true);
        assertFalse(xml.contains("backcolor=\"#EDF2F8\""), "le cartouche ne doit pas sortir quand l'en-tete est ote");
        assertFalse(xml.contains("$P{P_TIERS_PAYANT_NAME}"), "le destinataire ne doit pas sortir non plus");
    }

    @Test
    @DisplayName("Le tri du modele pilote l'ordre de la requete")
    void triDansLaRequete() {
        assertTrue(JrxmlFactureBuilder.construire(modele("DATE_BON", "NOM_COMPLET"), true, true)
                .contains("ORDER BY p.dt_CREATED"));
        // NOM puis PRENOM. Attention au piege de cette base : str_FIRST_NAME porte le NOM et
        // str_LAST_NAME les PRENOMS (la fiche client libelle "Nom" le champ strFIRSTNAME).
        // Trier sur str_LAST_NAME revenait a classer par prenom, et la facture paraissait non triee.
        assertTrue(JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET"), true, true)
                .contains("ORDER BY p.str_FIRST_NAME_CUSTOMER, p.str_LAST_NAME_CUSTOMER"));
    }

    @Test
    @DisplayName("Quand le modele suit la fiche du tiers payant, l'etat porte LES DEUX ordres")
    void triSelonLaFicheDuTiersPayant() {
        String xml = JrxmlFactureBuilder.construire(modele("TIERS_PAYANT", "NOM_COMPLET"), true, true);

        // l'etat ne peut pas connaitre la fiche a la generation : c'est le parametre qui tranche
        // a l'impression. Auparavant l'ordre alphabetique etait fige et une fiche reglee sur
        // "date de bon" restait sans effet sur les modeles dynamiques.
        assertTrue(xml.contains("<parameter name=\"" + TriFacture.PARAMETRE + "\" class=\"java.lang.Integer\">"),
                "l'etat doit declarer le parametre de tri");
        assertTrue(xml.contains("CASE WHEN $P{" + TriFacture.PARAMETRE + "} = 1 THEN p.dt_CREATED END"),
                "la date de bon ne doit compter que si la fiche la demande");
        assertTrue(xml.contains("p.str_FIRST_NAME_CUSTOMER, p.str_LAST_NAME_CUSTOMER"),
                "a defaut, l'ordre reste alphabetique nom puis prenom - et dans cette base le NOM "
                        + "est porte par str_FIRST_NAME");
    }

    @Test
    @DisplayName("Le parametre de tri est un entier lie, jamais un fragment de SQL")
    void triSansInjectionDeSql() {
        for (String mode : new String[] { "DATE_BON", "ALPHABETIQUE", "TIERS_PAYANT" }) {
            String xml = JrxmlFactureBuilder.construire(modele(mode, "NOM_COMPLET"), true, true);
            assertFalse(xml.contains("$P!{"), "aucun fragment de SQL ne doit etre injecte (modele " + mode + ")");
        }
    }

    // ------------------------------------------------------- detail des produits

    @Test
    @DisplayName("Sans detail des produits : aucun regroupement, aucune jointure produit")
    void sansDetailProduits() {
        String xml = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT"), true, true);
        assertFalse(xml.contains("grpBon"));
        assertFalse(xml.contains("t_preenregistrement_detail"));
    }

    @Test
    @DisplayName("Avec detail : la ligne du bon passe en tete de groupe, les produits en bande de detail")
    void avecDetailProduits() throws Exception {
        String xml = JrxmlFactureBuilder.construire(modeleAvecProduits(new String[] { "NOM_COMPLET", "MONTANT_BRUT" },
                "PROD_DESIGNATION", "PROD_QUANTITE", "PROD_MONTANT"), true, true);
        Element racine = racine(xml);
        assertEquals(1, racine.getElementsByTagName("group").getLength());
        assertEquals(1, racine.getElementsByTagName("groupHeader").getLength());
        assertTrue(xml.contains("$F{lg_PREENREGISTREMENT_ID}"), "regroupement sur le bon");
        assertTrue(xml.contains("$F{PROD_DESIGNATION}"), "colonnes produit dans la bande de detail");
    }

    @Test
    @DisplayName("Les totaux du bon ne sont comptes qu'une fois par bon, pas une fois par produit")
    void totauxDuBonIncrementesParGroupe() {
        String xml = JrxmlFactureBuilder.construire(
                modeleAvecProduits(new String[] { "NOM_COMPLET", "MONTANT_BRUT" }, "PROD_MONTANT"), true, true);
        int i = xml.indexOf("v_TOTAL_MONTANT_BRUT");
        assertTrue(i > 0);
        String declaration = xml.substring(i, xml.indexOf('>', i));
        assertTrue(declaration.contains("incrementType=\"Group\""), "total du bon : " + declaration);
        assertTrue(declaration.contains("incrementGroup=\"grpBon\""), "total du bon : " + declaration);
        // le total d'une colonne produit, lui, s'incremente a chaque ligne
        int j = xml.indexOf("v_TOTAL_PROD_MONTANT");
        assertFalse(xml.substring(j, xml.indexOf('>', j)).contains("incrementType"));
    }

    @Test
    @DisplayName("Un bon sans ligne de vente reste sur la facture (jointure externe)")
    void bonSansProduitConserve() {
        String xml = JrxmlFactureBuilder
                .construire(modeleAvecProduits(new String[] { "NOM_COMPLET" }, "PROD_DESIGNATION"), true, true);
        assertTrue(xml.contains("LEFT JOIN t_preenregistrement_detail"));
        assertTrue(xml.contains("LEFT JOIN t_famille"));
    }

    @Test
    @DisplayName("Les jointures produit precedent la liste de tables separees par des virgules")
    void jointuresAvantLesVirgules() {
        // en SQL la virgule est moins prioritaire que LEFT JOIN : une condition ON placee apres
        // une virgule ne peut pas referencer t_preenregistrement, et la requete echouerait
        String xml = JrxmlFactureBuilder
                .construire(modeleAvecProduits(new String[] { "NOM_COMPLET" }, "PROD_DESIGNATION"), true, true);
        int from = xml.indexOf("FROM t_preenregistrement p");
        int jointure = xml.indexOf("LEFT JOIN t_preenregistrement_detail", from);
        int premiereVirgule = xml.indexOf("t_preenregistrement_compte_client_tiers_payent pr,", from);
        assertTrue(jointure > from && jointure < premiereVirgule,
                "les LEFT JOIN doivent etre accroches directement a t_preenregistrement");
    }

    @Test
    @DisplayName("Le sous-tableau des produits est en retrait et ne deborde pas de la page")
    void produitsEnRetraitSansDebordement() throws Exception {
        Element racine = racine(JrxmlFactureBuilder.construire(
                modeleAvecProduits(new String[] { "NOM_COMPLET", "MONTANT_BRUT" }, "PROD_CIP", "PROD_DESIGNATION",
                        "PROD_QUANTITE", "PROD_PRIX_UNITAIRE", "PROD_MONTANT", "PROD_REMISE"),
                true, true));
        Element band = (Element) ((Element) racine.getElementsByTagName("detail").item(0)).getElementsByTagName("band")
                .item(0);
        NodeList elements = band.getElementsByTagName("reportElement");
        int gauche = Integer.MAX_VALUE, droite = 0;
        for (int i = 0; i < elements.getLength(); i++) {
            Element e = (Element) elements.item(i);
            int x = Integer.parseInt(e.getAttribute("x"));
            gauche = Math.min(gauche, x);
            droite = Math.max(droite, x + Integer.parseInt(e.getAttribute("width")));
        }
        assertTrue(gauche >= 14, "les produits doivent etre en retrait sous le bon (x=" + gauche + ")");
        assertTrue(droite <= 585, "debordement des produits : " + droite);
    }

    @Test
    @DisplayName("Detail active sans colonne produit : refus avec un message clair")
    void detailSansColonneProduit() {
        ModelFactureDynamique m = modeleAvecProduits(new String[] { "NOM_COMPLET" });
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> JrxmlFactureBuilder.construire(m, true, true));
        assertTrue(e.getMessage().contains("produit"));
    }

    @Test
    @DisplayName("Un modele sans colonne exportable est refuse avec un message clair")
    void modeleSansColonne() {
        ModelFactureDynamique vide = modele("ALPHABETIQUE");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> JrxmlFactureBuilder.construire(vide, true, true));
        assertTrue(e.getMessage().contains("aucune colonne"));
    }
}
