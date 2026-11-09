package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Ubipharm, factures non relevees (demande du 09/11, point 4 ; liens releves le 09/11 : « Exporter le BLV au format CSV
 * / Excel / TXT », /BLVCSV?fcnum=...&etcoda=...). Chaque ligne garde les references de SON BLV, et les cellules
 * affichees ne changent pas. Jeux tires au hasard (graine fixe) : liens dans un menu, ordre des liens, ligne sans lien,
 * reference illisible, plusieurs etablissements.
 */
class DocumentsBlvTest {

    static final class F {
        String numero, commande, date, montant, fcnum, etcoda;
        boolean liens, illisible;
    }

    static String page(List<F> fs) {
        StringBuilder h = new StringBuilder("<html><body><script>location='/BLVCSV?fcnum=PIEGE&etcoda=X'</script>"
                + "<table id='factures'><thead><tr><th></th><th>N° Facture</th><th>Ref Commande</th><th>Date</th>"
                + "<th>Montant (CFA)</th></tr></thead><tbody>");
        Random r = new Random(fs.size());
        for (F f : fs) {
            h.append("<tr><td><div class='dropdown'>");
            if (f.liens) {
                List<String> liens = new ArrayList<>(Arrays.asList(
                        "<a class='link-nodblclick dlblv' href='/BLVCSV?fcnum=" + f.fcnum + "&amp;etcoda=" + f.etcoda
                                + "'>Exporter le BLV au format CSV</a>",
                        "<a class='link-nodblclick dlblv' href='/BLVExcel?fcnum=" + f.fcnum + "&amp;etcoda=" + f.etcoda
                                + "'>Exporter le BLV au format Excel</a>",
                        "<a class='link-nodblclick' href='BLVTxt?fcnum=" + f.fcnum + "&amp;etcoda=" + f.etcoda
                                + "'>Exporter le BLV au format TXT</a>"));
                java.util.Collections.shuffle(liens, r);
                h.append("<a href='GetPDF?format=pdf&amp;fcnum=").append(f.fcnum)
                        .append("'>Consulter au format PDF</a>");
                liens.forEach(h::append);
            }
            h.append("</div></td><td>").append(f.numero).append("</td><td>").append(f.commande).append("</td><td>")
                    .append(f.date).append("</td><td>").append(f.montant).append("</td></tr>");
        }
        return h.append("</tbody></table></body></html>").toString();
    }

    @Test
    void referencesDuBlvParLigne_hasard() throws Exception {
        Random r = new Random(20261109L);
        int avec = 0, sans = 0;
        for (int essai = 0; essai < 40; essai++) {
            List<F> fs = new ArrayList<>();
            int n = essai == 0 ? 0 : 1 + r.nextInt(120);
            for (int i = 0; i < n; i++) {
                F f = new F();
                f.numero = "F26" + (100000 + r.nextInt(900000));
                f.commande = r.nextBoolean() ? "CDE-" + r.nextInt(9999) : "";
                f.date = (1 + r.nextInt(28)) + "/11/2026";
                f.montant = String.valueOf(r.nextInt(5_000_000));
                f.liens = r.nextInt(10) != 0;
                f.illisible = f.liens && r.nextInt(12) == 0;
                f.fcnum = f.illisible ? "F1%20OR%201" : f.numero.substring(1);
                f.etcoda = new String[] { "YOP", "BKE", "GNA", "SPE" }[r.nextInt(4)];
                fs.add(f);
            }
            List<ListesUbipharmParseur.Ligne> l = ListesUbipharmParseur.page(ListeUbipharm.FACTURES, page(fs));
            assertEquals(fs.size(), l.size());
            for (int i = 0; i < n; i++) {
                F f = fs.get(i);
                ListesUbipharmParseur.Ligne x = l.get(i);
                assertEquals(Arrays.asList(f.numero, f.commande, f.date, f.montant), x.cellules, "ligne " + i);
                if (!f.liens || f.illisible) {
                    assertNull(x.document, "ligne " + i);
                    sans++;
                } else {
                    assertEquals(Map.of("fcnum", f.fcnum, "etcoda", f.etcoda), x.document, "ligne " + i);
                    avec++;
                }
            }
        }
        assertTrue(avec > 1000 && sans > 100, avec + " / " + sans);
    }

    @Test
    void autresListesSansFichier() throws Exception {
        F f = new F();
        f.numero = "F261";
        f.commande = "";
        f.date = "01/11/2026";
        f.montant = "1";
        f.liens = true;
        f.fcnum = "261";
        f.etcoda = "YOP";
        String h = page(Arrays.asList(f)).replace("id='factures'", "id='lastCdeExt'");
        /* la page des commandes extranet n'a pas les memes colonnes : seul compte qu'aucun document n'est garde */
        assertNull(ListesUbipharmParseur
                .documentBlv(org.jsoup.Jsoup.parse("<table><tr><td>x</td></tr></table>").selectFirst("tr")));
        assertEquals(Map.of("fcnum", "261", "etcoda", "YOP"),
                ListesUbipharmParseur.documentBlv(org.jsoup.Jsoup.parse(h).selectFirst("tbody tr")));
    }
}
