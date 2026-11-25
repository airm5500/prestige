package rest.report;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import net.sf.jasperreports.engine.JRPrintElement;
import net.sf.jasperreports.engine.JRPrintFrame;
import net.sf.jasperreports.engine.JRPrintText;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRMapCollectionDataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Retour du 25/11 : dans les PDF des articles vendus (detail, par caissier, par rayon, recapitulatif, recapitulatif par
 * rayon), le CIP etait coupe a 9 chiffres (colonne de 50 points). Les zones sont agrandies.
 *
 * Coherence, sur 300 lignes tirees avec une graine fixe (CIP de 6 a 13 chiffres, noms de 4 a 60 caracteres, quantites,
 * prix et stocks varies dont zero, rayons differents) et des cas limites (CIP de 13 chiffres, nom le plus long) : -
 * chaque CIP est imprime en entier (rien de coupe) ; - chaque nom de produit est imprime en entier (il passe a la ligne
 * au lieu d'etre coupe) ; - aucune ligne n'est perdue : autant de CIP imprimes que de lignes ; - dans les
 * recapitulatifs, le rayon reste entier.
 */
public class ArticlesVendusJrxmlTest {

    private static final long GRAINE = 251125L;
    private static final int LIGNES = 300;

    @ParameterizedTest
    @ValueSource(strings = { "rp_articlesvendus", "rp_articlesvendus_user", "rp_articlesvendus_rayon",
            "rp_articlesvendusgroup", "rp_articlesvendusgroup_rayon" })
    public void cipEtNomJamaisCoupes(String modele) throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/" + modele + ".jrxml")) {
            assertNotNull(in, "modele absent des ressources : " + modele);
            JasperReport rapport = JasperCompileManager.compileReport(in);
            List<Map<String, ?>> lignes = jeu();
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres(),
                    new JRMapCollectionDataSource(lignes));
            /* PDF garde dans target pour l'oeil (mise en page) */
            net.sf.jasperreports.engine.JasperExportManager.exportReportToPdfFile(impression,
                    "target/" + modele + ".pdf");
            List<JRPrintText> textes = new ArrayList<>();
            impression.getPages().forEach(p -> p.getElements().forEach(e -> ajouter(e, textes)));

            Map<String, Integer> attendus = new HashMap<>();
            lignes.forEach(l -> attendus.merge((String) l.get("intCIP"), 1, Integer::sum));
            /*
             * le moteur coupe le texte qui deborde au remplissage et ne garde que la partie visible : une valeur
             * imprimee en entier se retrouve telle quelle parmi les textes de la page, une valeur coupee non
             */
            Map<String, Integer> imprimes = new HashMap<>();
            java.util.Set<String> vus = new java.util.HashSet<>();
            java.util.Set<String> rayonsColonne = new java.util.HashSet<>();
            for (JRPrintText t : textes) {
                String plein = t.getFullText();
                if (plein == null) {
                    continue;
                }
                vus.add(plein);
                if (attendus.containsKey(plein)) {
                    imprimes.merge(plein, 1, Integer::sum);
                }
                if (t.getWidth() < 200) {
                    rayonsColonne.add(plein);
                }
            }
            List<String> cipsCoupes = new ArrayList<>();
            List<String> nomsCoupes = new ArrayList<>();
            java.util.Set<String> rayonsCoupes = new java.util.TreeSet<>();
            for (Map<String, ?> l : lignes) {
                String cip = (String) l.get("intCIP"), nom = (String) l.get("strNAME"),
                        rayon = (String) l.get("libelleRayon");
                if (!vus.contains(cip)) {
                    cipsCoupes.add(cip + " (" + cip.length() + " chiffres)");
                }
                if (!vus.contains(nom)) {
                    nomsCoupes.add(nom + " (" + nom.length() + " car.)");
                }
                /* recapitulatifs : le rayon est une colonne de chaque ligne */
                if (modele.startsWith("rp_articlesvendusgroup") && !rayonsColonne.contains(rayon)) {
                    rayonsCoupes.add(rayon);
                }
            }
            assertTrue(cipsCoupes.isEmpty(), modele + " : CIP coupes " + cipsCoupes.size() + " : "
                    + cipsCoupes.subList(0, Math.min(5, cipsCoupes.size())));
            assertTrue(nomsCoupes.isEmpty(), modele + " : noms coupes " + nomsCoupes.size() + " : "
                    + nomsCoupes.subList(0, Math.min(5, nomsCoupes.size())));
            assertTrue(rayonsCoupes.isEmpty(), modele + " : rayons coupes " + rayonsCoupes);
            assertEquals(attendus, imprimes, modele + " : chaque ligne imprimee une fois, avec son CIP");
        }
    }

    /** Lignes variees, graine fixe ; les CIP sont uniques et ne ressemblent a aucune autre valeur imprimee. */
    private static List<Map<String, ?>> jeu() {
        Random r = new Random(GRAINE);
        String[] rayons = { "PARAPHARMACIE", "RAYON ETAGERE A", "FRIGO", "SPECIALITES PHARMACEUTIQUES", "RESERVE" };
        String[] caissiers = { "E2E JS1", "ADMINISTRATEUR SYSTEME", "KOUASSI AYA" };
        int[] longueurs = { 6, 7, 8, 9, 10, 12, 13, 13, 13 };
        List<Map<String, ?>> l = new ArrayList<>();
        java.util.Set<String> vus = new java.util.HashSet<>();
        for (int i = 0; i < LIGNES; i++) {
            int n = i == 0 ? 13 : longueurs[r.nextInt(longueurs.length)];
            String cip;
            do {
                StringBuilder sb = new StringBuilder().append(1 + r.nextInt(9));
                while (sb.length() < n) {
                    sb.append(r.nextInt(10));
                }
                cip = sb.toString();
            } while (!vus.add(cip));
            int lg = i == 1 ? 60 : 4 + r.nextInt(57);
            StringBuilder nom = new StringBuilder("P" + i + " ");
            while (nom.length() < lg) {
                nom.append((char) ('A' + r.nextInt(26)));
                if (r.nextInt(6) == 0) {
                    nom.append(' ');
                }
            }
            Map<String, Object> m = new HashMap<>();
            m.put("lgFAMILLEID", "F" + i);
            m.put("intCIP", cip);
            m.put("strNAME", nom.toString().trim());
            m.put("operateur", "OP");
            m.put("dtCREATED", String.format("%02d/11/2026", 1 + r.nextInt(25)));
            m.put("HEURE", String.format("%02d:%02d", r.nextInt(24), r.nextInt(60)));
            m.put("caissier", caissiers[r.nextInt(caissiers.length)]);
            m.put("caissierId", "U" + r.nextInt(3));
            m.put("seuil", r.nextInt(5));
            m.put("currentStock", r.nextInt(3) == 0 ? 0 : r.nextInt(2000));
            m.put("intQUANTITY", 1 + r.nextInt(r.nextBoolean() ? 3 : 400));
            int ir = r.nextInt(rayons.length);
            m.put("rayonId", "R" + ir);
            m.put("libelleRayon", rayons[ir]);
            m.put("typeVente", r.nextBoolean() ? "VNO" : "VO");
            m.put("intPRICE", r.nextInt(4) == 0 ? 0 : r.nextInt(2_000_000));
            m.put("intAVOIR", r.nextInt(4) == 0 ? r.nextInt(5) : 0);
            m.put("stockReserve", r.nextInt(3) == 0 ? r.nextInt(500) : 0);
            m.put("couvertParReserve", r.nextBoolean());
            m.put("ticketNum",
                    "2611" + String.format("%02d", 1 + r.nextInt(25)) + "_" + String.format("%05d", r.nextInt(99999)));
            l.add(m);
        }
        /* les modeles « par rayon » et « par caissier » attendent des lignes regroupees */
        l.sort(java.util.Comparator.comparing((Map<String, ?> m) -> (String) m.get("libelleRayon"))
                .thenComparing(m -> (String) m.get("caissier")));
        return l;
    }

    private static Map<String, Object> parametres() {
        Map<String, Object> p = new HashMap<>();
        p.put("P_H_INSTITUTION", "PHARMACIE TEST");
        p.put("P_H_CLT_INFOS", "Liste des articles vendus PERIODE DU 01/11/2026 AU 25/11/2026");
        p.put("P_PRINTED_BY", "TEST");
        return p;
    }

    private static void ajouter(JRPrintElement e, List<JRPrintText> l) {
        if (e instanceof JRPrintText) {
            l.add((JRPrintText) e);
        } else if (e instanceof JRPrintFrame) {
            ((JRPrintFrame) e).getElements().forEach(x -> ajouter(x, l));
        }
    }
}
