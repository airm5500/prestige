package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.Test;

import commonTasks.dto.VenteDetailsDTO;
import dal.TFamille;
import dal.TFamillearticle;
import dal.TUser;
import dal.TWarehouse;
import net.sf.jasperreports.engine.JRPrintElement;
import net.sf.jasperreports.engine.JRPrintFrame;
import net.sf.jasperreports.engine.JRPrintText;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

/**
 * Retour du 15/11 : edition des perimes avec prix d'achat, prix de vente et valorisation a la derniere page.
 * <ul>
 * <li>coherence des lignes (milliers de saisies tirees au hasard, graine fixe) : valeur d'achat = quantite x prix
 * d'achat, valeur de vente = quantite x prix de vente, prix d'achat absent = 0, jamais negatif ;</li>
 * <li>le modele se compile et se remplit (liste et par groupe, quantites > 1, prix d'achat nul) ; la derniere page
 * porte la valorisation : lignes, quantite, valeur d'achat, valeur de vente et marge perdue = sommes des lignes ;
 * chaque sous-total de groupe = somme de ses lignes.</li>
 * </ul>
 */
class PerimesValorisesJrxmlTest {

    private static final long GRAINE = 20261115L;

    private static TWarehouse saisie(Random r, int i) {
        TFamillearticle fa = new TFamillearticle();
        fa.setLgFAMILLEARTICLEID("FA" + (i % 3));
        fa.setStrLIBELLE("FAMILLE " + (char) ('A' + i % 3));
        TFamille f = new TFamille("P" + i);
        f.setStrNAME("PRODUIT " + i);
        f.setIntCIP(String.valueOf(1000000 + i));
        f.setIntPRICE(50 * (1 + r.nextInt(400)));
        f.setIntPAF(r.nextInt(8) == 0 ? null : r.nextInt(5) == 0 ? 0 : 25 * (1 + r.nextInt(300)));
        f.setLgFAMILLEARTICLEID(fa);
        TUser u = new TUser("U1");
        u.setStrFIRSTNAME("Agent");
        u.setStrLASTNAME("Essai");
        TWarehouse w = new TWarehouse("W" + i);
        w.setLgFAMILLEID(f);
        w.setLgUSERID(u);
        w.setIntNUMBER(r.nextInt(6) == 0 ? 1 : 1 + r.nextInt(40));
        w.setIntNUMLOT("L" + r.nextInt(1000));
        w.setDtCREATED(new Date(1_790_000_000_000L + r.nextInt(1_000_000_000)));
        w.setDtPEREMPTION(new Date(1_790_000_000_000L - r.nextInt(1_000_000_000)));
        w.setStockInitial(100);
        w.setStockFinal(100 - w.getIntNUMBER());
        return w;
    }

    @Test
    void lignesValorisees() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < 5000; i++) {
            TWarehouse w = saisie(r, i);
            VenteDetailsDTO d = new VenteDetailsDTO(w, r.nextBoolean() ? null : r.nextInt(3));
            Integer paf = w.getLgFAMILLEID().getIntPAF();
            int pa = paf == null ? 0 : paf;
            assertEquals(pa, d.getPrixAchat());
            assertEquals((long) w.getIntNUMBER() * pa, d.getMontantAchat());
            assertEquals(w.getIntNUMBER() * w.getLgFAMILLEID().getIntPRICE(), d.getIntPRICE().intValue());
            assertEquals(w.getLgFAMILLEID().getIntPRICE(), d.getIntPRICEUNITAIR());
            assertTrue(d.getMontantAchat() >= 0 && d.getIntPRICE() >= 0);
        }
    }

    @Test
    void valorisationEnDernierePage() throws Exception {
        JasperReport rapport;
        try (InputStream in = getClass().getResourceAsStream("/reports/rp_perimes_valorises.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            rapport = JasperCompileManager.compileReport(in);
        }
        for (Integer groupe : new Integer[] { null, 0 }) {
            Random r = new Random(GRAINE + (groupe == null ? 1 : 2));
            List<VenteDetailsDTO> lignes = new ArrayList<>();
            long qte = 0, achat = 0, vente = 0;
            Map<String, long[]> parGroupe = new java.util.TreeMap<>();
            for (int i = 0; i < 90; i++) {
                VenteDetailsDTO d = new VenteDetailsDTO(saisie(r, i), groupe);
                lignes.add(d);
                qte += d.getIntQUANTITY();
                achat += d.getMontantAchat();
                vente += d.getIntPRICE();
                if (groupe != null) {
                    long[] g = parGroupe.computeIfAbsent(d.getLgPREENREGISTREMENTID(), k -> new long[3]);
                    g[0] += d.getIntQUANTITY();
                    g[1] += d.getMontantAchat();
                    g[2] += d.getIntPRICE();
                }
            }
            if (groupe != null) {
                lignes.sort(java.util.Comparator.comparing(VenteDetailsDTO::getLgPREENREGISTREMENTID));
            }
            Map<String, Object> p = new HashMap<>();
            p.put("P_H_INSTITUTION", "PHARMACIE TEST");
            p.put("P_H_CLT_INFOS", "PRODUITS PERIMES PERIODE DU 01/11/2026 AU 15/11/2026");
            p.put("P_PRINTED_BY", "Imprimé par Essai");
            p.put("P_GROUPE", groupe != null);
            p.put("P_LIBELLE_GROUPE", groupe == null ? "" : "Famille");
            JasperPrint impression = JasperFillManager.fillReport(rapport, p, new JRBeanCollectionDataSource(lignes));
            int pages = impression.getPages().size();
            assertTrue(pages >= 2, pages + " page(s)");
            String derniere = texte(impression, pages - 1), tout = texte(impression, -1);
            assertTrue(derniere.contains("VALORISATION DES PRODUITS PÉRIMÉS"), derniere);
            assertEquals(1, compter(tout, "VALORISATION DES PRODUITS PÉRIMÉS"),
                    "valorisation sur la seule derniere page");
            assertEquals("90", valeurApres(derniere, "Lignes"));
            assertEquals(String.valueOf(qte), valeurApres(derniere, "Quantité totale"));
            assertEquals(String.valueOf(achat), valeurApres(derniere, "Valeur au prix d'achat"));
            assertEquals(String.valueOf(vente), valeurApres(derniere, "Valeur au prix de vente"));
            assertEquals(String.valueOf(vente - achat), valeurApres(derniere, "Marge perdue (vente - achat)"));
            assertTrue(tout.contains("Prix d'achat") && tout.contains("Prix de vente") && tout.contains("Valeur achat"),
                    tout);
            assertTrue(tout.contains("Page 1 sur"), tout);
            if (groupe != null) {
                assertEquals(parGroupe.size(), compter(tout, "Sous-total"));
                for (Map.Entry<String, long[]> e : parGroupe.entrySet()) {
                    assertTrue(tout.contains("Famille : " + e.getKey()), e.getKey());
                }
            } else {
                assertEquals(0, compter(tout, "Sous-total"));
            }
        }
    }

    /** Texte d'une page (ou de toutes, -1), un element par ligne. */
    private static String texte(JasperPrint jp, int page) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < jp.getPages().size(); i++) {
            if (page < 0 || i == page) {
                jp.getPages().get(i).getElements().forEach(e -> ajouter(e, sb));
            }
        }
        return sb.toString();
    }

    private static void ajouter(JRPrintElement e, StringBuilder sb) {
        if (e instanceof JRPrintText) {
            sb.append(((JRPrintText) e).getFullText()).append('\n');
        } else if (e instanceof JRPrintFrame) {
            ((JRPrintFrame) e).getElements().forEach(x -> ajouter(x, sb));
        }
    }

    /** Le nombre ecrit juste apres le libelle (separateurs de milliers retires). */
    private static String valeurApres(String texte, String libelle) {
        String[] l = texte.split("\n");
        for (int i = 0; i < l.length - 1; i++) {
            if (l[i].equals(libelle)) {
                return l[i + 1].replaceAll("[^0-9-]", "");
            }
        }
        return "(absent)";
    }

    private static int compter(String texte, String motif) {
        int n = 0;
        for (int i = texte.indexOf(motif); i >= 0; i = texte.indexOf(motif, i + 1)) {
            n++;
        }
        return n;
    }
}
