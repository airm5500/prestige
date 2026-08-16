package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.ModelFactureDynamique;
import dal.ModelFactureDynamiqueColonne;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import javax.xml.parsers.DocumentBuilderFactory;
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
    @DisplayName("La taille de police du modele est appliquee aux lignes")
    void taillePoliceDuModele() {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");
        m.setTaillePolice(6);

        String xml = JrxmlFactureBuilder.construire(m, true, true);

        assertTrue(xml.contains("<font size=\"6\"/>"), "les lignes doivent prendre la taille demandee");
    }

    @Test
    @DisplayName("Sans taille demandee, la presentation d'origine est conservee")
    void taillePoliceParDefaut() {
        String xml = JrxmlFactureBuilder.construire(modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT"), true, true);

        assertTrue(xml.contains("<font size=\"8\"/>"), "8 points, comme avant que l'option n'existe");
    }

    @Test
    @DisplayName("Une taille aberrante revient a la taille d'origine, au lieu d'une facture illisible")
    void taillePoliceAberrante() {
        ModelFactureDynamique m = modele("ALPHABETIQUE", "NOM_COMPLET", "MONTANT_BRUT");
        m.setTaillePolice(99);

        assertTrue(JrxmlFactureBuilder.construire(m, true, true).contains("<font size=\"8\"/>"));

        m.setTaillePolice(null);
        assertTrue(JrxmlFactureBuilder.construire(m, true, true).contains("<font size=\"8\"/>"),
                "un modele cree avant cette option n'a pas de taille : il garde la sienne");
    }

    @Test
    @DisplayName("Les lignes de produit restent d'un point plus petites que la ligne du bon")
    void produitsUnPointPlusPetits() {
        ModelFactureDynamique m = modeleAvecProduits(new String[] { "NOM_COMPLET", "MONTANT_BRUT" }, "PROD_DESIGNATION",
                "PROD_MONTANT");
        m.setTaillePolice(9);

        String xml = JrxmlFactureBuilder.construire(m, true, true);

        assertTrue(xml.contains("<font size=\"9\"/>"), "la ligne du bon prend la taille demandee");
        assertTrue(xml.contains("<font size=\"8\"/>"), "les lignes de produit restent un point en dessous");
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
