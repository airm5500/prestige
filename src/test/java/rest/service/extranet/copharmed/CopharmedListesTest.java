package rest.service.extranet.copharmed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.Avancement;
import rest.service.extranet.commun.EtatLectures;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.FichiersExtranet;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Retour du 09/11 (« je n'ai que les onglets promotions et produits ») : Releves, E-Commandes, Tous les produits
 * commandes, Arrivages et Nouveautes de Copharmed. Structure relevee le 09/11 sur l'extranet connecte, valeurs
 * inventees. Rapprochement source = lignes gardees, ligne par ligne, sur des jeux tires au hasard (graine fixe) :
 * nombre de pages variable (0, une page pleine, plusieurs), quantites 0 et superieures a 1, lignes sans lien PDF, liste
 * vide. Avancement : total de pages annonce par les liens. GET seulement.
 */
class CopharmedListesTest {

    private static final String X = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/";
    private static final long GRAINE = 9112026L;

    static TransportExtranet transport(FauxExtranet f) {
        return f.transport(SourceExtranet.COPHARMED, 0, "JSESSIONID=x");
    }

    /** Liens de pagination comme l'extranet : fenetre autour de la page courante, « aller à la pageXdeN ». */
    static String liens(int page, int pages, String action, boolean pageable, int taille) {
        StringBuilder h = new StringBuilder("<nav class='pagination-sites'><ul class='pagination-site-list'>");
        for (int k = Math.max(0, page - 2); k < Math.min(pages, page + 5); k++) {
            if (k != page) {
                h.append("<li class='pagination-site-item'><a href='https://www.copharmed.com").append(X).append(action)
                        .append("?PageNumber=").append(k).append("&amp;PageSize=").append(taille)
                        .append("&amp;ViewType=").append(pageable ? "&amp;PageableID=Pg_Rel42x" : "")
                        .append("'>aller à la page").append(k + 1).append("de").append(pages).append("</a></li>");
            }
        }
        return h.append("</ul></nav>").toString();
    }

    /** Lecture suivie : appels faits et total prevu a la fin. */
    static int[] suivre(EtatLectures.Lecture l, EtatLectures e) {
        JSONObject j = l.toJson(e.maintenant());
        return new int[] { j.getInt("appels"), j.getInt("prevus") };
    }

    /* ============================================================ releves */

    static final class Rel {
        String date, numero, statement, spool, annee;
    }

    static String pageReleves(List<Rel> rs, int page, int pages) {
        StringBuilder h = new StringBuilder("<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE + "<form action='" + X
                + "ViewPharmacy-Statements' method='post'><input name='StartDateStr' "
                + "type='hidden'></form><table class='table'><thead><tr><th>Date</th><th>Numéro de relevé</th>"
                + "<th></th></tr></thead><tbody>");
        for (int i = page * 25; i < Math.min(rs.size(), (page + 1) * 25); i++) {
            Rel r = rs.get(i);
            h.append("<tr><td>").append(r.date).append("</td><td>").append(r.numero).append("</td><td>");
            if (r.statement != null) {
                h.append("<a href='https://www.copharmed.com").append(X)
                        .append("ViewPharmacy-DownloadStatementsPDF?StatementNo=").append(r.statement)
                        .append("&amp;SpoolName=").append(r.spool).append("&amp;Year=").append(r.annee)
                        .append("' target='_blank'><i class='icon-pdf'></i></a>");
            }
            h.append("</td></tr>");
        }
        return h.append("</tbody></table>").append(liens(page, pages, "ViewPharmacy-PagingStatements", true, 25))
                .append("</body></html>").toString();
    }

    @Test
    void relevesParPagesAvecPdf_rapprochement() throws Exception {
        Random r = new Random(GRAINE);
        for (int essai = 0; essai < 10; essai++) {
            int n = essai == 0 ? 0 : essai == 1 ? 25 : essai == 2 ? 26 : 1 + r.nextInt(300);
            int pages = Math.max(1, (n + 24) / 25);
            List<Rel> rs = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                Rel x = new Rel();
                x.date = String.format("%02d/%02d/20%02d", 1 + r.nextInt(28), 1 + r.nextInt(12), 20 + r.nextInt(7));
                x.numero = String.valueOf(1_000_000 + r.nextInt(9_000_000));
                /* une ligne sur 12 sans icone PDF ; une sur 15 avec une reference illisible (jamais gardee) */
                if (r.nextInt(12) != 0) {
                    x.statement = x.numero;
                    x.spool = r.nextInt(15) == 0 ? "a%26b%3Dc" : "SP" + r.nextInt(99999) + ".pdf";
                    x.annee = String.valueOf(2020 + r.nextInt(7));
                }
                rs.add(x);
            }
            try (FauxExtranet f = new FauxExtranet()) {
                f.route(X + "ViewPharmacy-Statements", Reponse.html(pageReleves(rs, 0, pages)));
                f.routeAppel(X + "ViewPharmacy-PagingStatements", a -> {
                    Map<String, String> q = CopharmedLecteurTest.champs(a.requete);
                    assertEquals("Pg_Rel42x", q.get("PageableID"));
                    assertEquals("25", q.get("PageSize"));
                    return Reponse.html(pageReleves(rs, Integer.parseInt(q.get("PageNumber")), pages));
                });
                EtatLectures e = EtatLectures.duServeur();
                EtatLectures.Lecture lu = e.demarrer("copharmed/TEST_RELEVES_" + essai, "u");
                Avancement.suivre(lu);
                List<Ligne> l;
                try {
                    l = CopharmedLecteur.lire(transport(f), ListeCopharmed.COPHARMED_RELEVES);
                } finally {
                    Avancement.finir();
                }
                assertEquals(n, l.size(), "essai " + essai);
                for (int i = 0; i < n; i++) {
                    Rel x = rs.get(i);
                    assertEquals(i, l.get(i).position);
                    assertEquals(Arrays.asList(x.date, x.numero), l.get(i).cellules, "ligne " + i);
                    if (x.statement == null || x.spool.contains("%")) {
                        assertNull(l.get(i).document, "ligne " + i + " : pas de PDF");
                        assertEquals(0, FichiersExtranet
                                .formats(SourceExtranet.COPHARMED, "COPHARMED_RELEVES", l.get(i).document).length());
                    } else {
                        assertEquals(Map.of("StatementNo", x.statement, "SpoolName", x.spool, "Year", x.annee),
                                l.get(i).document, "ligne " + i);
                        /* bouton PDF propose, nom « Copharmed_Releve_<numero>.pdf », parametres dans l'ordre du lien */
                        FichiersExtranet.Fichier pdf = FichiersExtranet.un(SourceExtranet.COPHARMED,
                                "COPHARMED_RELEVES", "PDF");
                        assertEquals("Copharmed_Releve_" + x.numero + ".pdf", pdf.nom(x.numero));
                        assertEquals("StatementNo=" + x.statement + "&SpoolName=" + x.spool + "&Year=" + x.annee,
                                pdf.parametres(l.get(i).document).entrySet().stream()
                                        .map(m -> m.getKey() + "=" + m.getValue()).collect(Collectors.joining("&")));
                    }
                }
                assertEquals(pages, f.appels().size(), "une lecture par page, sans doublon");
                assertTrue(f.appels().stream().allMatch(a -> "GET".equals(a.methode)));
                int[] av = suivre(lu, e);
                e.terminer(lu, new JSONObject().put("success", true));
                assertEquals(pages, av[0], "appels comptes");
                assertEquals(pages > 1 ? pages : 0, av[1], "total annonce par les liens");
            }
        }
    }

    /* ============================================================ e-commandes */

    static final class Cmd {
        String date, numero, total, etat, utilisateur;
        int commandee, aLivrer;
    }

    static String pageCommandes(List<Cmd> cs, int page, int pages) {
        StringBuilder h = new StringBuilder("<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE
                + "<ul class='list-unstyled'><li><a href='" + X + "ViewOrders-SimpleOrderSearch'>E-Commandes</a>"
                + "</li></ul><div class='list-header'><div class='list-header-item col-sm-1'>Date de la commande</div>"
                + "<div class='list-header-item col-sm-3'>Détails de l’e-commande</div><div class='list-header-item "
                + "col-sm-3'>Nom d'utilisateur</div><div class='list-header-item col-sm-2'>État</div>"
                + "<div class='list-header-item col-sm-2 column-price'>Total</div></div><div class='list-body'>");
        for (int i = page * 10; i < Math.min(cs.size(), (page + 1) * 10); i++) {
            Cmd c = cs.get(i);
            String det = "https://www.copharmed.com" + X + "ViewOrders-Detail?OrderID=oA" + i + "bCdEf";
            h.append("<div class='list-item-row list-item-row-big row'>")
                    .append("<div class='col-xs-7 col-sm-1 list-item'>").append(c.date).append("</div>")
                    .append("<div class='col-xs-3 col-sm-2 col-sm-push-8 list-item column-price'>").append(c.total)
                    .append("</div><div class='col-xs-2 col-sm-1 col-sm-push-8 list-item'><a href='").append(det)
                    .append("'><i class='icon-eye'></i> Détails</a></div><div class='clearfix visible-xs-block'></div>")
                    .append("<div class='col-sm-3 col-sm-pull-3 list-item'><a href='").append(det).append("'>")
                    .append(c.numero).append("</a><br>Quantité commandée : ").append(c.commandee)
                    .append("<br>Quantité à livrer : ").append(c.aLivrer).append("</div>")
                    .append("<div class='clearfix visible-xs-block'></div><div class='col-sm-3 col-sm-pull-3 list-item'>")
                    .append(c.utilisateur).append("</div><div class='col-sm-2 col-sm-pull-3 list-item'>État : ")
                    .append(c.etat).append("</div></div>");
        }
        return h.append("</div>").append(liens(page, pages, "ViewOrders-SimpleOrderSearch", false, 10))
                .append("</body></html>").toString();
    }

    @Test
    void eCommandesParPages_rapprochement() throws Exception {
        Random r = new Random(GRAINE + 1);
        String[] etats = { "En cours", "Livrée", "Annulée", "Partiellement livrée" };
        for (int essai = 0; essai < 10; essai++) {
            int n = essai == 0 ? 0 : essai == 1 ? 10 : 1 + r.nextInt(60);
            int pages = Math.max(1, (n + 9) / 10);
            List<Cmd> cs = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                Cmd c = new Cmd();
                c.date = String.format("%02d/%02d/2026 %02d:%02d", 1 + r.nextInt(28), 1 + r.nextInt(11), r.nextInt(24),
                        r.nextInt(60));
                c.numero = "00" + (10000 + r.nextInt(90000)) + "WB" + (1_000_000_000_000L + r.nextInt(999_999));
                c.commandee = r.nextInt(5) == 0 ? 0 : 1 + r.nextInt(400);
                c.aLivrer = r.nextInt(3) == 0 ? 0 : r.nextInt(c.commandee + 1);
                c.total = CopharmedLecteurTest.cfa(r.nextInt(3_000_000));
                c.etat = etats[r.nextInt(etats.length)];
                c.utilisateur = "Utilisateur Nominatif " + i;
                cs.add(c);
            }
            try (FauxExtranet f = new FauxExtranet()) {
                f.routeAppel(X + "ViewOrders-SimpleOrderSearch", a -> {
                    Map<String, String> q = CopharmedLecteurTest.champs(a.requete);
                    if (q.isEmpty()) {
                        return Reponse.html(pageCommandes(cs, 0, pages));
                    }
                    assertEquals("10", q.get("PageSize"), "taille de page reprise des liens");
                    assertFalse(q.containsKey("PageableID"), "liens sans PageableID : non envoye");
                    return Reponse.html(pageCommandes(cs, Integer.parseInt(q.get("PageNumber")), pages));
                });
                List<Ligne> l = CopharmedLecteur.lire(transport(f), ListeCopharmed.COPHARMED_COMMANDES);
                assertEquals(n, l.size(), "essai " + essai);
                long commandees = 0, aLivrer = 0;
                for (int i = 0; i < n; i++) {
                    Cmd c = cs.get(i);
                    assertEquals(Arrays.asList(c.date, c.numero, String.valueOf(c.commandee), String.valueOf(c.aLivrer),
                            c.etat, c.total), l.get(i).cellules, "ligne " + i);
                    assertFalse(String.join("|", l.get(i).cellules).contains("Nominatif"),
                            "nom d'utilisateur jamais garde");
                    commandees += Long.parseLong(l.get(i).cellules.get(2));
                    aLivrer += Long.parseLong(l.get(i).cellules.get(3));
                    assertTrue(Long.parseLong(l.get(i).cellules.get(3)) <= Long.parseLong(l.get(i).cellules.get(2)),
                            "quantite a livrer <= quantite commandee");
                }
                assertEquals(cs.stream().mapToLong(c -> c.commandee).sum(), commandees, "somme des quantites");
                assertEquals(cs.stream().mapToLong(c -> c.aLivrer).sum(), aLivrer);
                assertEquals(pages, f.appels().size());
                assertTrue(f.appels().stream().allMatch(a -> "GET".equals(a.methode)));
            }
        }
    }

    /* ============================================================ tous les produits commandes */

    @Test
    void produitsCommandesParPages_rapprochement() throws Exception {
        Random r = new Random(GRAINE + 2);
        for (int essai = 0; essai < 8; essai++) {
            int n = essai == 0 ? 0 : 1 + r.nextInt(200);
            int pages = Math.max(1, (n + 24) / 25);
            List<List<String>> src = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                int qc = r.nextInt(6) == 0 ? 0 : 1 + r.nextInt(120), ql = r.nextInt(qc + 1);
                src.add(Arrays.asList(String.format("%02d/%02d/26", 1 + r.nextInt(28), 1 + r.nextInt(11)),
                        String.valueOf(10000 + r.nextInt(90000)),
                        (i % 9 == 0 ? "SIROP « A & B » " : "PRODUIT ") + i + " 50MG CP B/" + (1 + r.nextInt(60)),
                        String.valueOf(qc), String.valueOf(ql), CopharmedLecteurTest.cfa(r.nextInt(900_000)),
                        r.nextInt(4) == 0 ? "" : String.valueOf(100000 + r.nextInt(900000))));
            }
            java.util.function.IntFunction<String> page = k -> {
                StringBuilder h = new StringBuilder("<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE
                        + "<table class='table'><thead><tr><th>Date</th><th>Code Article</th><th>Libellé Article</th>"
                        + "<th>Quantité Commandée</th><th>Quantité Livrée</th><th>Montant total</th><th>N° Facture</th>"
                        + "</tr></thead><tbody>");
                for (int i = k * 25; i < Math.min(n, (k + 1) * 25); i++) {
                    h.append("<tr>");
                    for (String c : src.get(i)) {
                        h.append("<td>").append(org.jsoup.nodes.Entities.escape(c)).append("</td>");
                    }
                    h.append("</tr>");
                }
                return h.append("</tbody></table>")
                        .append(liens(k, pages, "ViewEASyOrders-SimpleOrderSearch", true, 25)).append("</body></html>")
                        .toString();
            };
            try (FauxExtranet f = new FauxExtranet()) {
                f.routeAppel(X + "ViewEASyOrders-SimpleOrderSearch", a -> {
                    Map<String, String> q = CopharmedLecteurTest.champs(a.requete);
                    if (q.isEmpty()) {
                        return Reponse.html(page.apply(0));
                    }
                    assertEquals("Pg_Rel42x", q.get("PageableID"));
                    return Reponse.html(page.apply(Integer.parseInt(q.get("PageNumber"))));
                });
                List<Ligne> l = CopharmedLecteur.lire(transport(f), ListeCopharmed.COPHARMED_PRODUITS_COMMANDES);
                assertEquals(n, l.size());
                for (int i = 0; i < n; i++) {
                    assertEquals(src.get(i), l.get(i).cellules, "essai " + essai + " ligne " + i);
                    assertNull(l.get(i).document);
                }
                assertEquals(pages, f.appels().size());
            }
        }
    }

    /* ============================================================ arrivages et nouveautes */

    @Test
    void arrivagesEtNouveautesDeLAccueil_rapprochement() throws Exception {
        Random r = new Random(GRAINE + 3);
        for (int essai = 0; essai < 6; essai++) {
            List<CopharmedLecteurTest.P> arr = new ArrayList<>(), nouv = new ArrayList<>();
            int na = essai == 0 ? 0 : 1 + r.nextInt(12), nn = 1 + r.nextInt(12);
            for (int i = 0; i < na; i++) {
                arr.add(CopharmedLecteurTest.tirer(r, 1000 * essai + i));
            }
            for (int i = 0; i < nn; i++) {
                nouv.add(CopharmedLecteurTest.tirer(r, 1000 * essai + 500 + i));
            }
            /* comme l'accueil : d'autres blocs produits (promotions) avant, chaque bloc dans sa section */
            List<CopharmedLecteurTest.P> autres = List.of(CopharmedLecteurTest.tirer(r, 9999));
            String accueil = "<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE
                    + section("Meilleures ventes", autres) + section("Arrivages", arr) + section("Nouveautés", nouv)
                    + "</body></html>";
            try (FauxExtranet f = new FauxExtranet()) {
                f.route("/fr/", Reponse.html(accueil));
                TransportExtranet t = transport(f);
                verifier(arr, CopharmedLecteur.lire(t, ListeCopharmed.COPHARMED_ARRIVAGES));
                verifier(nouv, CopharmedLecteur.lire(t, ListeCopharmed.COPHARMED_NOUVEAUTES));
                assertEquals(2, f.appels().size(), "un appel par liste");
            }
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/fr/", Reponse.html("<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE
                    + section("Nouveautés", List.of()) + "</body></html>"));
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class,
                            () -> CopharmedLecteur.lire(transport(f), ListeCopharmed.COPHARMED_ARRIVAGES)).nature(),
                    "bloc absent : page modifiee, jamais une liste vide");
        }
    }

    static String section(String titre, List<CopharmedLecteurTest.P> ps) {
        return "<section class='py-14'><div class='flex'><h2 class='m-0'>" + titre + "</h2><a href='" + X
                + "ViewArrivals-Start'>Voir tout</a></div>"
                + ps.stream().map(CopharmedLecteurTest::html).collect(Collectors.joining()) + "</section>";
    }

    static void verifier(List<CopharmedLecteurTest.P> ps, List<Ligne> l) {
        assertEquals(ps.size(), l.size());
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < ps.size(); i++) {
            CopharmedLecteurTest.P p = ps.get(i);
            assertEquals(Arrays.asList(p.nom, p.code, p.dci2 == null ? p.dci1 : p.dci1 + " + " + p.dci2, p.colisage,
                    p.ht, p.remise, p.net, p.ppv, p.dispoAttendue, p.promo == null ? "" : "Oui",
                    CopharmedLecteurTest.ugAttendu(p)), l.get(i).cellules, "ligne " + i);
            codes.add(l.get(i).pscode);
            assertEquals(p.code, l.get(i).pscode);
        }
    }

    /* ============================================================ pages refusees */

    @Test
    void pagesSansListeRefusees() throws Exception {
        String vide = "<html><body>" + CopharmedLecteurTest.ENTETE_CONNECTE + "<p>Maintenance</p></body></html>";
        for (Object[] c : new Object[][] { { ListeCopharmed.COPHARMED_RELEVES, "ViewPharmacy-Statements" },
                { ListeCopharmed.COPHARMED_COMMANDES, "ViewOrders-SimpleOrderSearch" },
                { ListeCopharmed.COPHARMED_PRODUITS_COMMANDES, "ViewEASyOrders-SimpleOrderSearch" } }) {
            try (FauxExtranet f = new FauxExtranet()) {
                f.route(X + c[1], Reponse.html(vide));
                assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                        assertThrows(ExtranetException.class,
                                () -> CopharmedLecteur.lire(transport(f), (ListeCopharmed) c[0])).nature(),
                        c[0].toString());
            }
        }
        /* une action de pagination etrangere a la page n'est jamais suivie */
        String h = pageReleves(List.of(), 0, 1).replace("</table>",
                "</table><a href='" + X + "ViewCart-Delete?PageNumber=1&amp;PageSize=25'>aller à la page2de2</a>");
        CopharmedLecteur.PageListe p = CopharmedLecteur.releves(h);
        assertNull(p.pagination);
        assertTrue(p.pages.isEmpty());
    }
}
