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
import rest.service.dto.ReleveGroupeDTO;
import rest.service.dto.ReleveGroupeLigneDTO;

/**
 * Releve des factures de groupe : l'etat embarque doit se compiler et s'editer.
 *
 * Un .jrxml casse (colonne trop large, champ inconnu, ordre des balises) ne se voit qu'a l'impression, en clientele. Ce
 * test le detecte a la construction.
 */
class ReleveGroupeFactureEtatTest {

    private static JasperReport etat;

    @BeforeAll
    static void compiler() throws Exception {
        DefaultJasperReportsContext.getInstance().setProperty("net.sf.jasperreports.awt.ignore.missing.font", "true");
        try (InputStream in = ReleveGroupeFactureEtatTest.class
                .getResourceAsStream("/reports/rp_releve_factures_groupe.jrxml")) {
            assertTrue(in != null, "l'etat rp_releve_factures_groupe.jrxml doit etre livre dans le war");
            etat = JasperCompileManager.compileReport(in);
        }
    }

    private static ReleveGroupeLigneDTO ligne(String codeGroupe, String date, String code, String tiersPayant,
            long facture, long regle) {
        return new ReleveGroupeLigneDTO(codeGroupe, date, code, tiersPayant, BigDecimal.valueOf(facture),
                BigDecimal.valueOf(regle), BigDecimal.valueOf(facture - regle),
                facture - regle <= 0 ? "Soldée" : "En cours");
    }

    private static ReleveGroupeDTO groupe(int id, String libelle, ReleveGroupeLigneDTO... lignes) {
        ReleveGroupeDTO groupe = new ReleveGroupeDTO(id, libelle);
        BigDecimal facture = BigDecimal.ZERO;
        BigDecimal regle = BigDecimal.ZERO;
        for (ReleveGroupeLigneDTO l : lignes) {
            groupe.getFactures().add(l);
            facture = facture.add(l.getMontantFacture());
            regle = regle.add(l.getMontantRegle());
        }
        groupe.setMontantFacture(facture);
        groupe.setMontantRegle(regle);
        groupe.setMontantRestant(facture.subtract(regle));
        return groupe;
    }

    private static Map<String, Object> parametres() {
        Map<String, Object> parametres = new HashMap<>();
        parametres.put("P_H_INSTITUTION", "PHARMACIE DU CENTRE");
        parametres.put("P_AUTRE_DESC", "Dr KOUAME");
        parametres.put("P_H_CLT_INFOS", "RELEVE DES FACTURES DE GROUPE PERIODE DU 01/07/2026 AU 31/07/2026");
        parametres.put("P_PRINTED_BY", " OPERATEUR");
        parametres.put("P_INSTITUTION_ADRESSE", "Abidjan");
        parametres.put("P_FOOTER_RC", "RC N° CI-ABJ-2020-B-1234");
        parametres.put("P_NOTE_MONTANT", "");
        parametres.put("P_MONTANT_FACTURE", BigDecimal.ZERO);
        parametres.put("P_MONTANT_REGLE", BigDecimal.ZERO);
        parametres.put("P_MONTANT_RESTANT", BigDecimal.ZERO);
        parametres.put("P_NB_FACTURES", 0);
        return parametres;
    }

    /** Tous les textes imprimes sur une page, y compris ceux places dans le tableau (donc dans des cadres). */
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
    @DisplayName("Une ligne par organisme, un sous-total par facture de groupe, un total par groupe")
    void detailParOrganisme() throws Exception {
        List<ReleveGroupeDTO> groupes = List.of(
                groupe(1, "GROUPE SUNU ASSURANCES",
                        ligne("26_1042", "05/07/2026", "26_2101", "ASCOMA CÔTE D'IVOIRE", 1820450, 1820450),
                        ligne("26_1042", "05/07/2026", "26_2102", "SUNU ASSURANCES VIE", 3000000, 3000000),
                        ligne("26_1088", "19/07/2026", "26_2210", "ASCOMA CÔTE D'IVOIRE", 6135900, 2000000)),
                groupe(2, "GROUPE ALLIANZ",
                        ligne("26_1044", "05/07/2026", "26_2106", "ALLIANZ CÔTE D'IVOIRE", 512000, 0)));

        Map<String, Object> parametres = parametres();
        parametres.put("P_MONTANT_FACTURE", BigDecimal.valueOf(11468350));
        parametres.put("P_MONTANT_REGLE", BigDecimal.valueOf(6820450));
        parametres.put("P_MONTANT_RESTANT", BigDecimal.valueOf(4647900));
        parametres.put("P_NB_FACTURES", 4);

        JasperPrint impression = JasperFillManager.fillReport(etat, parametres,
                new JRBeanCollectionDataSource(groupes));
        List<String> textes = textes(impression);

        assertTrue(textes.contains("GROUPE SUNU ASSURANCES"), "le nom du groupe doit figurer en tete de son bloc");
        assertTrue(textes.contains("GROUPE ALLIANZ"));
        // c'est la demande : savoir A QUI appartient chaque facture
        assertTrue(textes.contains("ASCOMA CÔTE D'IVOIRE"), "le tiers payant doit figurer sur sa ligne");
        assertTrue(textes.contains("SUNU ASSURANCES VIE"));
        assertTrue(textes.contains("26_2101"), "chaque facture d'organisme doit avoir son numero");
        assertTrue(textes.stream().anyMatch(t -> t.startsWith("FACTURE DE GROUPE N° 26_1042")),
                "la facture de groupe ouvre son propre bloc de lignes");
        // sous-total de la facture de groupe 26_1042 : 1 820 450 + 3 000 000
        assertTrue(contientMontant(textes, 4820450), "chaque facture de groupe doit avoir son sous-total");
        assertTrue(textes.contains("2 organismes"), "le sous-total rappelle le nombre d'organismes");
        // total du groupe : 4 820 450 + 6 135 900
        assertTrue(contientMontant(textes, 10956350), "le total du groupe doit etre imprime");
        assertTrue(textes.contains("3 factures"), "le total du groupe rappelle le nombre de factures");
        assertTrue(textes.contains("TOTAL GÉNÉRAL  (4 factures)"), "le total general rappelle le nombre de factures");
    }

    @Test
    @DisplayName("Le statut suit le reste a regler")
    void statutSelonLeReste() throws Exception {
        List<ReleveGroupeDTO> groupes = List.of(groupe(1, "GROUPE SUNU ASSURANCES",
                ligne("26_1042", "05/07/2026", "26_2101", "ASCOMA CÔTE D'IVOIRE", 4820450, 4820450),
                ligne("26_1088", "19/07/2026", "26_2210", "ASCOMA CÔTE D'IVOIRE", 6135900, 2000000)));

        List<String> textes = textes(
                JasperFillManager.fillReport(etat, parametres(), new JRBeanCollectionDataSource(groupes)));

        assertTrue(textes.contains("Soldée"), "une facture entierement reglee est soldee");
        assertTrue(textes.contains("En cours"), "une facture partiellement reglee reste en cours");
    }

    @Test
    @DisplayName("Sans aucune facture, l'etat sort quand meme et le dit")
    void aucuneFacture() throws Exception {
        JasperPrint impression = JasperFillManager.fillReport(etat, parametres(),
                new JRBeanCollectionDataSource(new ArrayList<ReleveGroupeDTO>()));

        assertEquals(1, impression.getPages().size(), "un releve vide doit produire une page, pas un PDF illisible");
        List<String> textes = textes(impression);
        assertTrue(textes.stream().anyMatch(t -> t.startsWith("Aucune facture de groupe")),
                "le releve vide doit expliquer qu'il n'y a rien a montrer");
        assertFalse(textes.contains("TOTAL"), "sans donnee, aucun bloc de total ne doit etre imprime");
    }
}
