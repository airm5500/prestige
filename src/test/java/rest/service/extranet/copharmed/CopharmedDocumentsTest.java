package rest.service.extranet.copharmed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Copharmed, Mon espace > Factures et Avoirs (demande du 09/11, point 4 ; structure relevee le 09/11, valeurs
 * inventees) : tableau N° / Date / Montant HT, icones PDF, CSV et XLS par ligne (InvoiceNo), pages de 25 suivies par
 * les liens de pagination de la page (PageNumber a partir de 0, PageableID). Rapprochement source = lignes gardees,
 * ligne par ligne, sur des jeux tires au hasard (graine fixe) : nombre de pages, ligne sans lien, fenetre de liens.
 */
class CopharmedDocumentsTest {

    private static final String X = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/";

    static final class Doc {
        String numero, date, montant, invoice;
    }

    static List<Doc> tirer(Random r, int n, boolean avoir) {
        List<Doc> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            Doc d = new Doc();
            int mil = 100000 + r.nextInt(900000);
            int fin = 10 + r.nextInt(90);
            d.numero = "26-" + mil + "-" + fin;
            d.date = String.format("%02d/%02d/26", 1 + r.nextInt(28), 1 + r.nextInt(11));
            d.montant = (avoir ? "- " : "") + CopharmedLecteurTest.cfa(r.nextInt(2_000_000));
            /* releve du 09/11 : InvoiceNo = numero sans le prefixe d'annee ; une ligne sur 15 sans lien */
            d.invoice = r.nextInt(15) == 0 ? null : String.valueOf(mil) + fin;
            l.add(d);
        }
        return l;
    }

    static String page(List<Doc> docs, int page, int pages, String type, String paging, String titre) {
        StringBuilder h = new StringBuilder("<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE
                + "<table class='table'><thead><tr><th>" + titre + "</th><th>Date</th>"
                + "<th class='text-left sm:text-right'>Montant HT</th><th></th></tr></thead><tbody>");
        for (int i = page * 25; i < Math.min(docs.size(), (page + 1) * 25); i++) {
            Doc d = docs.get(i);
            h.append("<tr><td>").append(d.numero).append("</td><td>").append(d.date)
                    .append("</td><td class='text-left sm:text-right'>").append(d.montant).append("</td><td>");
            if (d.invoice != null) {
                h.append("<a href='https://www.copharmed.com").append(X)
                        .append("ViewPharmacy-DownloadInvoicePDF?InvoiceNo=").append(d.invoice).append("&amp;Type=")
                        .append(type).append("'><i></i></a>");
                for (String f : new String[] { "csv", "xls" }) {
                    h.append("<a href='https://www.copharmed.com").append(X)
                            .append("ViewPharmacy-DownloadInvoiceCSVXLS?InvoiceNo=").append(d.invoice)
                            .append("&amp;Type=").append(type).append("&amp;Format=").append(f).append("'><i></i></a>");
                }
            }
            h.append("</td></tr>");
        }
        h.append("</tbody></table><nav>");
        /* fenetre de liens : jusqu'a 4 pages autour de la page courante (comme l'extranet) */
        for (int k = Math.max(0, page - 2); k < Math.min(pages, page + 5); k++) {
            if (k != page && paging != null) {
                h.append("<a href='https://www.copharmed.com").append(X).append(paging).append("?PageNumber=").append(k)
                        .append("&amp;PageSize=25&amp;ViewType=&amp;PageableID=Pg_AbC123xyz'>aller à la page")
                        .append(k + 1).append("de").append(pages).append("</a>");
            }
        }
        return h.append("</nav></body></html>").toString();
    }

    @Test
    void facturesParPagesEtAvoirs_rapprochement() throws Exception {
        Random r = new Random(9112026L);
        for (int essai = 0; essai < 12; essai++) {
            int n = essai == 0 ? 0 : essai == 1 ? 25 : 1 + r.nextInt(400);
            int pages = Math.max(1, (n + 24) / 25);
            List<Doc> factures = tirer(r, n, false), avoirs = tirer(r, 1 + r.nextInt(5), true);
            try (FauxExtranet f = new FauxExtranet()) {
                f.route(X + "ViewPharmacy-Invoices", Reponse
                        .html(page(factures, 0, pages, "Invoices", "ViewPharmacy-PagingInvoices", "N° Facture")));
                f.routeAppel(X + "ViewPharmacy-PagingInvoices", a -> {
                    Map<String, String> q = CopharmedLecteurTest.champs(a.requete);
                    assertEquals("Pg_AbC123xyz", q.get("PageableID"));
                    assertEquals("25", q.get("PageSize"));
                    int k = Integer.parseInt(q.get("PageNumber"));
                    return Reponse
                            .html(page(factures, k, pages, "Invoices", "ViewPharmacy-PagingInvoices", "N° Facture"));
                });
                f.route(X + "ViewPharmacy-CreditNotes",
                        Reponse.html(page(avoirs, 0, 1, "CreditNotes", null, "N° Avoir")));
                TransportExtranet t = f.transport(SourceExtranet.COPHARMED, 0, "JSESSIONID=x");
                List<Ligne> l = CopharmedLecteur.lire(t, ListeCopharmed.COPHARMED_FACTURES);
                verifier(factures, l);
                assertEquals(1 + (pages - 1), f.appels().size(), "une page lue par page de l'extranet, sans doublon");
                verifier(avoirs, CopharmedLecteur.lire(t, ListeCopharmed.COPHARMED_AVOIRS));
                assertTrue(f.appels().stream().allMatch(a -> "GET".equals(a.methode)));
            }
        }
    }

    private static void verifier(List<Doc> source, List<Ligne> l) {
        assertEquals(source.size(), l.size());
        for (int i = 0; i < l.size(); i++) {
            Doc d = source.get(i);
            Ligne x = l.get(i);
            assertEquals(i, x.position);
            assertEquals(Arrays.asList(d.numero, d.date, d.montant), x.cellules, "ligne " + i);
            if (d.invoice == null) {
                assertNull(x.document, "ligne " + i + " sans lien : pas de fichier");
            } else {
                assertEquals(Map.of("InvoiceNo", d.invoice), x.document, "ligne " + i);
            }
        }
    }

    @Test
    void pageSansTableauRefusee() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(X + "ViewPharmacy-Invoices", Reponse
                    .html("<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE + "<p>Maintenance</p></body></html>"));
            TransportExtranet t = f.transport(SourceExtranet.COPHARMED, 0, "JSESSIONID=x");
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, assertThrows(ExtranetException.class,
                    () -> CopharmedLecteur.lire(t, ListeCopharmed.COPHARMED_FACTURES)).nature());
        }
    }

    @Test
    void referenceIllisibleNonGardee() throws Exception {
        String h = "<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE + "<table><thead><tr><th>N° Facture</th>"
                + "<th>Date</th><th>Montant HT</th><th></th></tr></thead><tbody><tr><td>26-1-1</td><td>01/11/26</td>"
                + "<td>1 CFA</td><td><a href='" + X + "ViewPharmacy-DownloadInvoiceCSVXLS?InvoiceNo=12%26Type%3DX"
                + "&amp;Type=Invoices&amp;Format=csv'></a></td></tr></tbody></table></body></html>";
        CopharmedLecteur.PageDocuments p = CopharmedLecteur.documents(h);
        assertEquals("12&Type=X", p.lignes.get(0)[3], "valeur decodee telle que l'extranet l'envoie");
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(X + "ViewPharmacy-Invoices", Reponse.html(h));
            List<Ligne> l = CopharmedLecteur.lire(f.transport(SourceExtranet.COPHARMED, 0, "JSESSIONID=x"),
                    ListeCopharmed.COPHARMED_FACTURES);
            assertNull(l.get(0).document, "reference avec separateur d'adresse : jamais gardee");
        }
    }
}
