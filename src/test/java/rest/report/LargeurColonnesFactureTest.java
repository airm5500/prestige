package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.pdf.BaseFont;
import dal.ModelFactureDynamiqueColonne;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Largeur des colonnes de la facture : aucune valeur courante ne doit passer a la ligne.
 *
 * <p>
 * Le defaut corrige ici : les largeurs etaient reparties au prorata d'une largeur « souhaitee ». Rien ne garantissait
 * qu'une colonne recoive de quoi ecrire son contenu, et un numero de bon, un matricule ou un nom de client se
 * retrouvaient coupes sur deux lignes. Chaque colonne recoit maintenant d'abord une largeur MINIMALE, puis la place
 * restante est partagee.
 * </p>
 *
 * <p>
 * Les besoins ne sont pas recopies a la main : ils sont MESURES ici avec la police de l'etat, sur la plus longue valeur
 * courante de chaque colonne. Si la police ou une largeur change, le controle le dit.
 * </p>
 */
class LargeurColonnesFactureTest {

    /** Marges interieures d'une cellule (gauche + droite) dans l'etat imprime. */
    private static final float MARGES_CELLULE = 7f;

    /** Taille des libelles du bandeau de colonnes, et taille d'une ligne de donnees. */
    private static final float TAILLE_ENTETE = 7f;
    private static final float TAILLE_LIGNE = 8f;

    /** Largeur utile d'une page A4 aux marges de l'etat (585 - 2 x 2). */
    private static final int LARGEUR_UTILE = 581;

    /** Pour chaque colonne : son libelle imprime, et la plus longue valeur courante attendue. */
    private static final Map<String, String[]> CAS = new LinkedHashMap<>();

    static {
        CAS.put("NUMERO", new String[] { "N°", "999" });
        CAS.put("DATE_BON", new String[] { "DATE", "30/07/2026" });
        CAS.put("REF_BON", new String[] { "N° BON", "260730JVB009" });
        CAS.put("NOM_COMPLET", new String[] { "NOM ET PRÉNOM(S)", "AMANI NEE AYO MARIE ANGE D'AVILA" });
        CAS.put("MATRICULE", new String[] { "MATRICULE", "842846W5041" });
        CAS.put("TAUX", new String[] { "TAUX (%)", "100" });
        CAS.put("PART_TIERS_PAYANT", new String[] { "PART TP", "1 234 567" });
    }

    /**
     * Colonnes du sous-tableau des PRODUITS (point 20 : le prix s'affichait sur deux lignes).
     *
     * <p>
     * Les valeurs retenues sont les plus longues rencontrees en production : un CIP a treize chiffres, une designation
     * complete, et des montants a sept chiffres separateurs compris.
     */
    private static final Map<String, String[]> CAS_PRODUIT = new LinkedHashMap<>();

    static {
        CAS_PRODUIT.put("PROD_CIP", new String[] { "CIP", "3400930000000" });
        CAS_PRODUIT.put("PROD_DESIGNATION",
                new String[] { "DÉSIGNATION", "DOLIPRANE 1000MG COMPRIME EFFERVESCENT B/8" });
        CAS_PRODUIT.put("PROD_QUANTITE", new String[] { "QTÉ", "999" });
        CAS_PRODUIT.put("PROD_PRIX_UNITAIRE", new String[] { "P.U.", "1 234 567" });
        CAS_PRODUIT.put("PROD_MONTANT", new String[] { "MONTANT", "12 345 678" });
        CAS_PRODUIT.put("PROD_REMISE", new String[] { "REMISE", "1 234 567" });
    }

    /** Les lignes de produit sont d'un point plus petites que la ligne du bon. */
    private static final float TAILLE_LIGNE_PRODUIT = TAILLE_LIGNE - 1f;

    private static BaseFont normal;
    private static BaseFont gras;

    private static float besoin(String champ) throws Exception {
        if (normal == null) {
            normal = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false);
            gras = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, false);
        }
        String[] cas = CAS.get(champ);
        return Math.max(gras.getWidthPoint(cas[0], TAILLE_ENTETE), normal.getWidthPoint(cas[1], TAILLE_LIGNE))
                + MARGES_CELLULE;
    }

    private static List<ModelFactureDynamiqueColonne> colonnes(String... champs) {
        List<ModelFactureDynamiqueColonne> liste = new ArrayList<>();
        int ordre = 0;
        for (String champ : champs) {
            ModelFactureDynamiqueColonne c = new ModelFactureDynamiqueColonne();
            c.setChamp(champ);
            c.setLibelle(champ);
            c.setOrdre(ordre++);
            liste.add(c);
        }
        return liste;
    }

    private static float besoinProduit(String champ) throws Exception {
        if (normal == null) {
            normal = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false);
            gras = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, false);
        }
        String[] cas = CAS_PRODUIT.get(champ);
        return Math.max(gras.getWidthPoint(cas[0], TAILLE_ENTETE), normal.getWidthPoint(cas[1], TAILLE_LIGNE_PRODUIT))
                + MARGES_CELLULE;
    }

    @Test
    @DisplayName("Point 20 : aucun prix du sous-tableau des produits ne passe a la ligne")
    void aucunPrixDeProduitNeCoupeSonContenu() throws Exception {
        String[] champs = CAS_PRODUIT.keySet().toArray(new String[0]);
        int[] largeurs = JrxmlFactureBuilder.largeursColonnesProduit(colonnes(champs));
        for (int i = 0; i < champs.length; i++) {
            float besoin = besoinProduit(champs[i]);
            assertTrue(largeurs[i] >= besoin, champs[i] + " : " + largeurs[i] + " pt alloues pour " + Math.round(besoin)
                    + " pt necessaires, le contenu passera a la ligne");
        }
    }

    @Test
    @DisplayName("Point 20 : le prix tient a TOUTES les tailles de police proposees")
    void lePrixTientAToutesLesTaillesDePolice() throws Exception {
        if (normal == null) {
            normal = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false);
            gras = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, false);
        }
        String[] champs = CAS_PRODUIT.keySet().toArray(new String[0]);
        // La taille de police est reglable de 5 a 12 points sur le modele de facture ; les lignes
        // de produit sont d'un point plus petites. Le prix doit tenir sur une ligne dans tous les
        // cas, sans quoi il se coupe en deux - c'est le defaut signale.
        for (int taille = dal.ModelFactureDynamique.TAILLE_POLICE_MINIMUM; taille <= dal.ModelFactureDynamique.TAILLE_POLICE_MAXIMUM; taille++) {
            float tailleProduit = Math.max(dal.ModelFactureDynamique.TAILLE_POLICE_MINIMUM, taille - 1);
            int[] largeurs = JrxmlFactureBuilder.largeursColonnesProduit(colonnes(champs), taille);
            for (int i = 0; i < champs.length; i++) {
                // La designation est du texte libre, long et de longueur imprevisible : c'est la
                // seule colonne dont le passage a la ligne est normal, et elle absorbe la place
                // restante. Le controle porte sur les colonnes a contenu borne - CIP, quantite et
                // surtout les MONTANTS, qui ne doivent jamais se couper (point 20).
                if ("PROD_DESIGNATION".equals(champs[i])) {
                    continue;
                }
                String[] cas = CAS_PRODUIT.get(champs[i]);
                float besoin = Math.max(gras.getWidthPoint(cas[0], Math.min(tailleProduit, TAILLE_ENTETE)),
                        normal.getWidthPoint(cas[1], tailleProduit)) + MARGES_CELLULE;
                assertTrue(largeurs[i] >= besoin, "police " + taille + " pt, " + champs[i] + " : " + largeurs[i]
                        + " pt alloues pour " + Math.round(besoin) + " pt necessaires, le contenu passera a la ligne");
            }
        }
    }

    @Test
    @DisplayName("Point 20 : les colonnes de montant tiennent meme sans la designation")
    void lesMontantsTiennentDansUnSousTableauReduit() throws Exception {
        // Le modele peut n'afficher que les montants : chaque colonne doit garder sa largeur utile.
        String[] champs = { "PROD_CIP", "PROD_PRIX_UNITAIRE", "PROD_MONTANT", "PROD_REMISE" };
        int[] largeurs = JrxmlFactureBuilder.largeursColonnesProduit(colonnes(champs));
        for (int i = 0; i < champs.length; i++) {
            assertTrue(largeurs[i] >= besoinProduit(champs[i]), champs[i] + " : " + largeurs[i] + " pt alloues, "
                    + Math.round(besoinProduit(champs[i])) + " pt necessaires");
        }
    }

    @Test
    @DisplayName("Sur la facture courante de l'officine, aucune colonne ne coupe son contenu")
    void aucuneColonneNeCoupeSonContenu() throws Exception {
        String[] champs = CAS.keySet().toArray(new String[0]);
        int[] largeurs = JrxmlFactureBuilder.largeursColonnes(colonnes(champs));
        for (int i = 0; i < champs.length; i++) {
            float besoin = besoin(champs[i]);
            assertTrue(largeurs[i] >= besoin, champs[i] + " : " + largeurs[i] + " pt alloues pour " + Math.round(besoin)
                    + " pt necessaires, le contenu passera a la ligne");
        }
    }

    @Test
    @DisplayName("Le nom du client profite de la place restante")
    void leNomProfiteDeLaPlaceRestante() throws Exception {
        String[] champs = CAS.keySet().toArray(new String[0]);
        int[] largeurs = JrxmlFactureBuilder.largeursColonnes(colonnes(champs));
        int rangDuNom = Arrays.asList(champs).indexOf("NOM_COMPLET");
        for (int i = 0; i < largeurs.length; i++) {
            if (i != rangDuNom) {
                assertTrue(largeurs[rangDuNom] > largeurs[i], "le nom du client doit rester la colonne la plus large");
            }
        }
        // Il doit rester de la marge au-dela du strict necessaire : c'est ce qui absorbe les noms
        // plus longs que celui mesure ici.
        assertTrue(largeurs[rangDuNom] >= besoin("NOM_COMPLET") + 30,
                "le nom du client doit recevoir de la marge, obtenu " + largeurs[rangDuNom]);
    }

    @Test
    @DisplayName("Les largeurs remplissent exactement la page, sans trou ni debordement")
    void largeursExactementSurLaPage() {
        for (String[] jeu : new String[][] { CAS.keySet().toArray(new String[0]),
                { "NOM_COMPLET", "MATRICULE", "PART_TIERS_PAYANT" },
                { "NUMERO", "DATE_BON", "REF_BON", "NOM_CLIENT", "PRENOM_CLIENT", "NOM_COMPLET", "MATRICULE",
                        "REF_VENTE", "TAUX", "MONTANT_BRUT", "REMISE", "PART_CLIENT", "PART_TIERS_PAYANT" } }) {
            int[] largeurs = JrxmlFactureBuilder.largeursColonnes(colonnes(jeu));
            int total = 0;
            for (int l : largeurs) {
                total += l;
            }
            assertEquals(LARGEUR_UTILE, total, jeu.length + " colonnes : la somme doit faire la largeur utile");
        }
    }

    @Test
    @DisplayName("Avec toutes les colonnes, la page est trop etroite et TOUTES se resserrent")
    void avecToutesLesColonnesLeManqueEstPartage() {
        // Treize colonnes ne tiennent pas sur une page A4 portrait. Le partage doit alors resserrer
        // chaque colonne dans la meme proportion, et non en servir quelques-unes en ecrasant les
        // autres : une colonne reduite a rien serait illisible.
        int[] largeurs = JrxmlFactureBuilder.largeursColonnes(
                colonnes("NUMERO", "DATE_BON", "REF_BON", "NOM_CLIENT", "PRENOM_CLIENT", "NOM_COMPLET", "MATRICULE",
                        "REF_VENTE", "TAUX", "MONTANT_BRUT", "REMISE", "PART_CLIENT", "PART_TIERS_PAYANT"));
        for (int largeur : largeurs) {
            assertTrue(largeur >= 20, "aucune colonne ne doit tomber sous 20 pt, obtenu " + largeur);
        }
    }

    @Test
    @DisplayName("Une colonne inconnue est ignoree au lieu de faire echouer l'edition")
    void colonneInconnueIgnoree() {
        int[] largeurs = JrxmlFactureBuilder
                .largeursColonnes(colonnes("NOM_COMPLET", "CHAMP_QUI_N_EXISTE_PLUS", "PART_TIERS_PAYANT"));
        assertEquals(2, largeurs.length, "seules les colonnes connues doivent etre dimensionnees");
    }
}
