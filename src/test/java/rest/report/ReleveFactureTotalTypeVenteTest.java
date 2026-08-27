package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import net.sf.jasperreports.engine.DefaultJasperReportsContext;
import net.sf.jasperreports.engine.JRPrintElement;
import net.sf.jasperreports.engine.JRPrintFrame;
import net.sf.jasperreports.engine.JRPrintPage;
import net.sf.jasperreports.engine.JRPrintText;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Releve des factures clients en compte : total par TYPE DE VENTE.
 *
 * Le releve imprime un bandeau par type de tiers payant ; il doit se terminer par le total du type, et chaque type doit
 * demarrer sur une nouvelle page.
 */
class ReleveFactureTotalTypeVenteTest {

    private static JasperReport etat;

    @BeforeAll
    static void compiler() throws Exception {
        DefaultJasperReportsContext.getInstance().setProperty("net.sf.jasperreports.awt.ignore.missing.font", "true");
        try (InputStream in = ReleveFactureTotalTypeVenteTest.class
                .getResourceAsStream("/reports/rp_releve_factures.jrxml")) {
            assertTrue(in != null, "l'etat rp_releve_factures.jrxml doit etre livre dans le war");
            etat = JasperCompileManager.compileReport(in);
        }
    }

    /**
     * Les etats Jasper lisent les donnees par les GETTERS. Ces deux petits porteurs reproduisent ceux que l'application
     * fournit (ReportFactureDTO / FactureDTO), sans dependre de leurs constructeurs.
     */
    public static class Facture {
        private final String strCODEFACTURE;
        private final String dtCREATED;
        private final Integer dblMONTANTCMDE;
        private final Integer dblMONTANTPAYE;
        private final Integer dblMONTANTRESTANT;

        Facture(String code, String date, int montant, int paye) {
            strCODEFACTURE = code;
            dtCREATED = date;
            dblMONTANTCMDE = montant;
            dblMONTANTPAYE = paye;
            dblMONTANTRESTANT = montant - paye;
        }

        public String getStrCODEFACTURE() {
            return strCODEFACTURE;
        }

        public String getDtCREATED() {
            return dtCREATED;
        }

        public String getDtUPDATED() {
            return "";
        }

        public String getHeure() {
            return "";
        }

        public String getStrFULLNAME() {
            return "";
        }

        public String getDtDEBUTFACTURE() {
            return "01/06/2026";
        }

        public String getDtFINFACTURE() {
            return "30/06/2026";
        }

        public Integer getDblMONTANTCMDE() {
            return dblMONTANTCMDE;
        }

        public Integer getDblMONTANTPAYE() {
            return dblMONTANTPAYE;
        }

        public Integer getDblMONTANTRESTANT() {
            return dblMONTANTRESTANT;
        }
    }

    public static class Organisme {
        private final String tiersPayantId;
        private final String tiersPayantLibelle;
        private final String typeTiersPayantId;
        private final String typeTiersPayantLibelle;
        private final List<Facture> factures;
        private final BigDecimal montantFacture;
        private final BigDecimal montantRegle;
        private final BigDecimal montantRestant;

        Organisme(String id, String libelle, String typeId, String typeLibelle, List<Facture> factures) {
            tiersPayantId = id;
            tiersPayantLibelle = libelle;
            typeTiersPayantId = typeId;
            typeTiersPayantLibelle = typeLibelle;
            this.factures = factures;
            int montant = 0;
            int paye = 0;
            for (Facture f : factures) {
                montant += f.getDblMONTANTCMDE();
                paye += f.getDblMONTANTPAYE();
            }
            montantFacture = BigDecimal.valueOf(montant);
            montantRegle = BigDecimal.valueOf(paye);
            montantRestant = BigDecimal.valueOf(montant - paye);
        }

        public String getTiersPayantId() {
            return tiersPayantId;
        }

        public String getTiersPayantLibelle() {
            return tiersPayantLibelle;
        }

        public String getTypeTiersPayantId() {
            return typeTiersPayantId;
        }

        public String getTypeTiersPayantLibelle() {
            return typeTiersPayantLibelle;
        }

        public List<Facture> getFactures() {
            return factures;
        }

        public BigDecimal getMontantFacture() {
            return montantFacture;
        }

        public BigDecimal getMontantRegle() {
            return montantRegle;
        }

        public BigDecimal getMontantRestant() {
            return montantRestant;
        }
    }

    private static Facture facture(String code, String date, int montant, int paye) {
        return new Facture(code, date, montant, paye);
    }

    private static Organisme organisme(String id, String libelle, String typeId, String typeLibelle,
            Facture... factures) {
        return new Organisme(id, libelle, typeId, typeLibelle, List.of(factures));
    }

    private static Map<String, Object> parametres() {
        Map<String, Object> parametres = new HashMap<>();
        parametres.put("P_H_INSTITUTION", "PHARMACIE DU CENTRE");
        parametres.put("P_AUTRE_DESC", "Dr KOUAME");
        parametres.put("P_H_CLT_INFOS", "RELEVE DES FACTURES CLIENTS EN COMPTE PERIODE DU 01/07/2026 AU 31/07/2026");
        parametres.put("P_PRINTED_BY", " OPERATEUR");
        parametres.put("P_INSTITUTION_ADRESSE", "Abidjan");
        parametres.put("P_FOOTER_RC", "RC N° CI-ABJ-2020-B-1234");
        parametres.put("P_NOTE_MONTANT", "");
        parametres.put("P_MONTANT_FACTURE", BigDecimal.valueOf(3000000));
        parametres.put("P_MONTANT_REGLE", BigDecimal.valueOf(1500000));
        parametres.put("P_MONTANT_RESTANT", BigDecimal.valueOf(1500000));
        return parametres;
    }

    private static List<String> textes(JasperPrint impression) {
        List<String> textes = new ArrayList<>();
        for (JRPrintPage page : impression.getPages()) {
            for (JRPrintElement element : page.getElements()) {
                collecter(element, textes);
            }
        }
        return textes;
    }

    private static void collecter(JRPrintElement element, List<String> textes) {
        if (element instanceof JRPrintText) {
            String texte = ((JRPrintText) element).getFullText();
            if (texte != null && !texte.trim().isEmpty()) {
                textes.add(texte.trim());
            }
        }
        if (element instanceof JRPrintFrame) {
            for (JRPrintElement enfant : ((JRPrintFrame) element).getElements()) {
                collecter(enfant, textes);
            }
        }
    }

    private static JasperPrint editer() throws Exception {
        List<Organisme> organismes = List.of(
                organisme("1", "ASCOMA", "1", "ASSURANCES", facture("22033", "02/06/2026 16:30:45", 1000000, 400000)),
                organisme("2", "ALLIANZ", "1", "ASSURANCES", facture("22032", "02/06/2026 16:28:31", 500000, 500000)),
                organisme("3", "MUGEFCI", "2", "MUTUELLES", facture("FA0021", "05/07/2026", 1500000, 600000)));
        return JasperFillManager.fillReport(etat, parametres(), new JRBeanCollectionDataSource(organismes));
    }

    /**
     * Le separateur de milliers depend de la LOCALE de la machine qui edite : le motif #,##0 donne "1,500,000" ici et
     * "1 500 000" sur un poste en francais. On compare donc les chiffres seuls, sinon le test passe chez l'un et echoue
     * chez l'autre sans qu'aucun etat n'ait change.
     */
    private static boolean contientMontant(List<String> textes, long montant) {
        String attendu = Long.toString(montant);
        return textes.stream().map(t -> t.replaceAll("[^0-9]", "")).anyMatch(attendu::equals);
    }

    @Test
    @DisplayName("Chaque type de vente se termine par son total")
    void totalParTypeDeVente() throws Exception {
        List<String> textes = textes(editer());

        // ASSURANCES : 1 000 000 + 500 000 facture, 400 000 + 500 000 regle
        assertTrue(textes.contains("TOTAL ASSURANCES"), "le pied de groupe doit nommer le type de vente");
        assertTrue(contientMontant(textes, 1500000), "le total facture du type doit etre imprime");
        assertTrue(contientMontant(textes, 900000), "le total regle du type doit etre imprime");
        assertTrue(textes.contains("2 organismes"), "le total du type rappelle le nombre d'organismes");

        // MUTUELLES : un seul organisme
        assertTrue(textes.contains("TOTAL MUTUELLES"));
        assertTrue(textes.contains("1 organisme"), "le singulier est utilise pour un seul organisme");
    }

    @Test
    @DisplayName("Chaque ligne porte sa periode facturee, et une facture non reglee le dit")
    void periodeEtFactureNonReglee() throws Exception {
        List<String> textes = textes(editer());

        assertTrue(textes.contains("01/06/2026 - 30/06/2026"), "la periode facturee figure sur chaque ligne");
        assertTrue(textes.contains("Période facturée"), "la colonne est nommee");
        assertTrue(textes.contains("Réglé le"), "l'entete du reglement est raccourci");
        // aucune de ces factures d'essai n'a de date de reglement
        assertTrue(textes.contains("Non réglée"), "une case vide ne laisse plus le lecteur deviner");
        // la date de facture ne porte plus l'heure : elle tient en dix caracteres
        assertTrue(textes.contains("02/06/2026"), "la date de facture est imprimee sans son heure");
        assertFalse(textes.stream().anyMatch(t -> t.startsWith("02/06/2026 16:30")),
                "l'heure d'edition de la facture n'a plus a etre imprimee");
    }

    @Test
    @DisplayName("Un type de vente demarre toujours sur une nouvelle page")
    void unTypeParPage() throws Exception {
        JasperPrint impression = editer();
        assertEquals(2, impression.getPages().size(), "deux types de vente : deux pages");
    }
}
