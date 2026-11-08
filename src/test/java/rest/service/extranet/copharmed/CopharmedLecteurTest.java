package rest.service.extranet.copharmed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ConnexionExtranet;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SessionExtranet;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Copharmed (Intershop, structure relevee le 08/11, valeurs inventees) : connexion par le formulaire classique, lecture
 * des produits, des promotions et de leurs paliers d'unites gratuites, catalogue par pages, page publique (session
 * perdue) relue apres reconnexion. Rapprochement source = lignes sur des produits tires au hasard (graine fixe).
 */
class CopharmedLecteurTest {

    static final String ENTETE_CONNECTE = "<header><a href=\"/fr/account\">Mon Espace</a><a href=\"/fr/logout\">Déconnexion</a></header>";
    static final String ENTETE_PUBLIC = "<header><a href=\"/fr/login\">Se connecter</a></header>";

    /** Produit tire au hasard : valeurs sources et valeurs attendues apres lecture. */
    static final class P {
        String nom, code, colisage, dci1, dci2, ht, remise, net, ppv, dispoHtml, dispoAttendue, promo;
        long[][] ug;
    }

    /** Corps de formulaire decode (nom -> valeur). */
    static Map<String, String> champs(String corps) {
        Map<String, String> m = new java.util.LinkedHashMap<>();
        for (String kv : (corps == null ? "" : corps).split("&")) {
            int e = kv.indexOf('=');
            if (e > 0) {
                m.put(java.net.URLDecoder.decode(kv.substring(0, e), StandardCharsets.UTF_8),
                        java.net.URLDecoder.decode(kv.substring(e + 1), StandardCharsets.UTF_8));
            }
        }
        return m;
    }

    static String cfa(long v) {
        return String.format(java.util.Locale.ROOT, "%,d", v).replace(',', '.') + " CFA";
    }

    static P tirer(Random r, int i) {
        P p = new P();
        p.nom = (i % 7 == 0 ? "Sirop « enfant » & co " : "PRODUIT ") + i + " 500MG CP B/" + (1 + r.nextInt(100));
        p.code = r.nextInt(4) == 0 ? String.valueOf(3_400_000_000_000L + r.nextInt(1_000_000))
                : String.valueOf(10000 + r.nextInt(9000000));
        p.colisage = r.nextBoolean() ? (10 + r.nextInt(500)) + ", " + (1 + r.nextInt(200)) : "";
        p.dci1 = r.nextBoolean() ? "Paracetamol" : "Artemether";
        p.dci2 = r.nextInt(3) == 0 ? "Codeine" : null;
        long ht = r.nextInt(300_000), ppv = ht + r.nextInt(50_000);
        p.ht = String.valueOf(ht);
        p.remise = r.nextBoolean() ? "0,0%" : (r.nextInt(30)) + ",5%";
        p.net = String.valueOf(ht);
        p.ppv = String.valueOf(ppv);
        switch (r.nextInt(3)) {
        case 0:
            p.dispoHtml = "<div class=\"flex\">Indisponible</div><a>12 autres produits disponibles</a>";
            p.dispoAttendue = "Indisponible";
            break;
        case 1:
            p.dispoHtml = "<button>-</button><input name=\"Quantity\" value=\"0\"><button>+</button><div>Livraison en 48 h</div>";
            p.dispoAttendue = "Disponible (Livraison en 48 h)";
            break;
        default:
            p.dispoHtml = "<button>-</button><input name=\"Quantity\" value=\"0\"><button>+</button>";
            p.dispoAttendue = "Disponible";
        }
        if (r.nextInt(3) == 0) {
            p.promo = "PROMO " + i;
            int n = 1 + r.nextInt(4);
            p.ug = new long[n][];
            for (int k = 0; k < n; k++) {
                p.ug[k] = new long[] { 1 + k * 10 + r.nextInt(5), 10L * (k + 1) * (1 + r.nextInt(100)) };
            }
        }
        return p;
    }

    static String html(P p) {
        StringBuilder ug = new StringBuilder();
        if (p.ug != null) {
            /* comme le site : paliers du plus grand au plus petit, repetes dans la fenetre de detail */
            for (int rep = 0; rep < 2; rep++) {
                for (int k = p.ug.length - 1; k >= 0; k--) {
                    ug.append("<span>")
                            .append(String.format(java.util.Locale.ROOT, "%,d", p.ug[k][0]).replace(',', '.'))
                            .append(" U.G. / ")
                            .append(String.format(java.util.Locale.ROOT, "%,d", p.ug[k][1]).replace(',', '.'))
                            .append("</span>");
                }
            }
        }
        return "<div class=\"product-row\"><div class=\"product-row-essential\"><div class=\"product-row-details\">"
                + "<div class=\"product-row-promotion\">"
                + (p.promo == null ? ""
                        : "<span>Promotions</span> " + p.promo + "<div class=\"modal\"><strong>Promotion</strong>" + ug
                                + "</div>")
                + "</div><div class=\"product-row-infos\"><div><div class=\"product-row-name\">"
                + org.jsoup.nodes.Entities.escape(p.nom) + "</div><div class=\"fs-14px\">Code CIP/ACL/EAN7 : " + p.code
                + "</div>" + (p.colisage.isEmpty() ? "" : "<div class=\"fs-14px\">Colisage : " + p.colisage + "</div>")
                + "</div></div></div><div class=\"product-row-actions\"><div class=\"product-row-features\"><strong>"
                + "<a href=\"/x?DCI=a\">" + p.dci1 + "</a>"
                + (p.dci2 == null ? "" : ", <a href=\"/x\">" + p.dci2 + "</a>")
                + "</strong></div><div class=\"product-row-price\"><strong class=\"text-nowrap\">"
                + cfa(Long.parseLong(p.ht)) + "</strong><span class=\"fs-14px\"><span class=\"text-nowrap\">" + p.remise
                + "</span></span>" + "<span class=\"fs-14px\"><span class=\"text-nowrap\">" + cfa(Long.parseLong(p.net))
                + "</span></span>" + "<span class=\"fs-14px\"><span class=\"text-nowrap\">" + cfa(Long.parseLong(p.ppv))
                + "</span></span></div>" + "<div class=\"product-row-buybox\">" + p.dispoHtml
                + "</div></div></div></div>";
    }

    static String pageProduits(List<P> ps, boolean connecte) {
        return "<html><body>" + (connecte ? ENTETE_CONNECTE : ENTETE_PUBLIC) + "<main>"
                + ps.stream().map(CopharmedLecteurTest::html).collect(Collectors.joining()) + "</main></body></html>";
    }

    static String ugAttendu(P p) {
        if (p.ug == null) {
            return "";
        }
        List<long[]> l = new ArrayList<>(List.of(p.ug));
        l.sort((a, b) -> a[1] != b[1] ? Long.compare(a[1], b[1]) : Long.compare(a[0], b[0]));
        return l.stream().map(x -> x[0] + " UG / " + x[1]).distinct().collect(Collectors.joining(" ; "));
    }

    @Test
    void rapprochementDesProduits() {
        Random r = new Random(20261108);
        List<P> ps = new ArrayList<>();
        for (int i = 0; i < 300; i++) {
            ps.add(tirer(r, i));
        }
        List<CopharmedLecteur.Produit> lus = CopharmedLecteur.produits(pageProduits(ps, true));
        assertEquals(300, lus.size());
        for (int i = 0; i < 300; i++) {
            P p = ps.get(i);
            CopharmedLecteur.Produit x = lus.get(i);
            assertEquals(p.nom, x.nom, "ligne " + i);
            assertEquals(p.code, x.code);
            assertEquals(p.colisage, x.colisage);
            assertEquals(p.dci2 == null ? p.dci1 : p.dci1 + " + " + p.dci2, x.dci);
            assertEquals(p.ht, x.prixHT, "prix HT ligne " + i);
            assertEquals(p.remise, x.remise);
            assertEquals(p.net, x.prixNet);
            assertEquals(p.ppv, x.prixPublic);
            assertEquals(p.dispoAttendue, x.dispo, "dispo ligne " + i);
            assertEquals(p.promo == null ? "" : "Oui", x.promotion);
            assertEquals(ugAttendu(p), x.ug, "paliers ligne " + i);
        }
    }

    @Test
    void paliersEtMontants() {
        assertEquals("1 UG / 10 ; 10 UG / 50 ; 120 UG / 480 ; 300 UG / 1000", CopharmedLecteur
                .paliers("300 U.G. / 1.000 120 U.G. / 480 10 U.G. / 50 1 U.G. / 10 + - 300 U.G. / 1.000"));
        assertEquals("", CopharmedLecteur.paliers("aucune promotion"));
        assertEquals("", CopharmedLecteur.paliers("0 U.G. / 10"));
        assertEquals("1469", CopharmedLecteur.montant("1.469 CFA"));
        assertEquals("1469", CopharmedLecteur.montant("1 469 FCFA"), "espaces fines et insecables");
        assertEquals("1234567", CopharmedLecteur.montant("1.234.567 CFA"));
        assertEquals("12.5", CopharmedLecteur.montant("12,5 CFA"));
        assertEquals("0", CopharmedLecteur.montant("0 CFA"));
        assertEquals("", CopharmedLecteur.montant("sur demande"));
        assertEquals("", CopharmedLecteur.montant(null));
        /* coherence : 5 000 montants ecrits comme le site puis relus : meme valeur, jamais de zero inutile */
        Random r = new Random(20261108);
        for (int i = 0; i < 5000; i++) {
            long ent = r.nextInt(100_000_000);
            int dec = r.nextInt(3) == 0 ? r.nextInt(100) : 0;
            String site = String.format(java.util.Locale.ROOT, "%,d", ent).replace(',', '.')
                    + (dec > 0 ? "," + String.format("%02d", dec) : "") + " CFA";
            BigDecimal attendu = new BigDecimal(ent + "." + String.format("%02d", dec));
            String lu = CopharmedLecteur.montant(site);
            assertEquals(0, attendu.compareTo(new BigDecimal(lu)), site);
            assertFalse(lu.contains(".") && lu.endsWith("0"), lu);
        }
    }

    static String pagePromotions(int n, boolean connecte) {
        StringBuilder sb = new StringBuilder("<html><body>" + (connecte ? ENTETE_CONNECTE : ENTETE_PUBLIC)
                + "<table><thead><tr><th>Promotion</th><th>Début</th><th>Fin</th><th>Type</th><th></th></tr></thead><tbody>");
        for (int i = 0; i < n; i++) {
            sb.append("<tr><td><a href=\"https://www.copharmed.com").append(CopharmedLecteur.PROMOTION_DETAIL)
                    .append("?PromotionUUID=PROMO").append(i).append("abcdEFGH\">Promotion ").append(i)
                    .append("</a></td><td>0").append(1 + i % 9)
                    .append("/11/26</td><td>30/11/26</td><td>Unités gratuites</td><td></td></tr>");
        }
        return sb.append("</tbody></table></body></html>").toString();
    }

    /** Faux Copharmed : connexion Intershop, promotions, catalogue en 3 pages ; page publique sans la session. */
    static FauxExtranet faux(AtomicInteger sessions, List<List<P>> pagesCatalogue, Map<Integer, List<P>> promos)
            throws Exception {
        FauxExtranet f = new FauxExtranet();
        String action = f.adresse() + "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/ViewUserAccount-ProcessLogin";
        String login = "<html><body>" + ENTETE_PUBLIC + "<form action=\"" + f.adresse() + "/fr/search\" method=\"get\">"
                + "<input type=\"hidden\" name=\"search\"><input type=\"text\" name=\"SearchTerm\"></form>"
                + "<form action=\"" + action
                + "\" method=\"post\"><input type=\"hidden\" name=\"SynchronizerToken\" value=\"jeton-1\">"
                + "<input type=\"hidden\" name=\"TargetPipeline\" value=\"\"><input type=\"text\" name=\"ShopLoginForm_Login\">"
                + "<input type=\"password\" name=\"ShopLoginForm_Password\"><button type=\"submit\" name=\"login\">Se connecter</button>"
                + "</form></body></html>";
        f.route("/fr/login", Reponse.html(login));
        f.routeAppel("/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/ViewUserAccount-ProcessLogin", a -> {
            Map<String, String> c = champs(a.corps);
            if (!"jeton-1".equals(c.get("SynchronizerToken")) || !"ESSAI".equals(c.get("ShopLoginForm_Login"))
                    || !"secret".equals(c.get("ShopLoginForm_Password"))) {
                return Reponse.html(login);
            }
            return new Reponse(302, "text/html", new byte[0], Map.of("Location", "/fr/account", "Set-Cookie",
                    "pgid-Copharmed=s" + sessions.incrementAndGet() + "; Path=/"));
        });
        f.routeAppel("/fr/account", a -> Reponse.html("<html><body>" + ENTETE_CONNECTE + "</body></html>"));
        java.util.function.Predicate<FauxExtranet.Appel> ouverte = a -> a.cookie != null && sessions.get() > 0
                && a.cookie.contains("pgid-Copharmed=s" + sessions.get());
        f.routeAppel("/fr/products/", a -> {
            int n = Integer.parseInt(a.requete.replaceAll(".*PageNumber=(\\d+).*", "$1"));
            List<P> l = n < pagesCatalogue.size() ? pagesCatalogue.get(n)
                    : pagesCatalogue.get(pagesCatalogue.size() - 1);
            return Reponse.html(pageProduits(l, ouverte.test(a)));
        });
        f.routeAppel(CopharmedLecteur.PROMOTIONS, a -> Reponse.html(pagePromotions(promos.size(), ouverte.test(a))));
        f.routeAppel(CopharmedLecteur.PROMOTION_DETAIL, a -> {
            int i = Integer.parseInt(a.requete.replaceAll(".*PromotionUUID=PROMO(\\d+).*", "$1"));
            return Reponse.html(pageProduits(promos.get(i), ouverte.test(a)));
        });
        f.routeAppel(CopharmedLecteur.RECHERCHE,
                a -> Reponse.html(pageProduits(pagesCatalogue.get(0), ouverte.test(a))));
        return f;
    }

    static TransportExtranet transport(FauxExtranet f) {
        return f.transportAvecConnexion(SourceExtranet.COPHARMED, null,
                new ConnexionExtranet.Identifiants("ESSAI", "secret", "e1", "/fr/login", null));
    }

    @Test
    void catalogueParPagesEtPromotionsAvecConnexion() throws Exception {
        Random r = new Random(7);
        List<List<P>> pages = new ArrayList<>();
        int i = 0;
        for (int n : new int[] { 200, 200, 37 }) {
            List<P> l = new ArrayList<>();
            for (int k = 0; k < n; k++) {
                l.add(tirer(r, i++));
            }
            pages.add(l);
        }
        Map<Integer, List<P>> promos = new java.util.HashMap<>();
        for (int k = 0; k < 4; k++) {
            List<P> l = new ArrayList<>();
            for (int j = 0; j <= k; j++) {
                P p = tirer(r, 1000 + k * 10 + j);
                p.promo = "Promotion " + k;
                p.ug = new long[][] { { 1, 10 }, { 12, 100 } };
                l.add(p);
            }
            promos.put(k, l);
        }
        AtomicInteger sessions = new AtomicInteger();
        try (FauxExtranet f = faux(sessions, pages, promos)) {
            TransportExtranet t = transport(f);
            List<Ligne> cat = CopharmedLecteur.lire(t, ListeCopharmed.COPHARMED_CATALOGUE);
            assertEquals(437, cat.size(), "3 pages, arret a la page deja vue");
            assertEquals(1, sessions.get(), "une seule connexion");
            for (int k = 0; k < cat.size(); k++) {
                P p = pages.get(k / 200).get(k % 200);
                List<String> c = cat.get(k).cellules;
                assertEquals(k, cat.get(k).position);
                assertEquals(p.nom, c.get(0));
                assertEquals(p.code, c.get(1));
                assertEquals(p.code, cat.get(k).pscode);
                assertEquals(p.code.length() >= 7 ? p.code : null, cat.get(k).cip);
                assertEquals(p.ht, c.get(4));
                assertEquals(p.dispoAttendue, c.get(8));
                assertEquals(ugAttendu(p), c.get(10));
            }
            List<Ligne> pr = CopharmedLecteur.lire(t, ListeCopharmed.COPHARMED_PROMOTIONS);
            assertEquals(1 + 2 + 3 + 4, pr.size(), "une ligne par produit de chaque promotion");
            assertEquals("Promotion 3", pr.get(9).cellules.get(0));
            assertEquals("Unités gratuites", pr.get(9).cellules.get(3));
            assertEquals("1 UG / 10 ; 12 UG / 100", pr.get(9).cellules.get(12));
            assertEquals(promos.get(3).get(3).nom, pr.get(9).cellules.get(4));
            assertTrue(
                    f.appels().stream().allMatch(
                            a -> "GET".equals(a.methode) || a.chemin.endsWith("ViewUserAccount-ProcessLogin")),
                    "GET seulement, hors connexion");
        }
    }

    @Test
    void pagePubliqueRelueApresReconnexion() throws Exception {
        Random r = new Random(9);
        List<P> l = new ArrayList<>();
        for (int k = 0; k < 5; k++) {
            l.add(tirer(r, k));
        }
        AtomicInteger sessions = new AtomicInteger();
        try (FauxExtranet f = faux(sessions, List.of(l), Map.of())) {
            TransportExtranet t = transport(f);
            JSONObject res = CopharmedLecteur.rechercher(t, "doliprane");
            assertEquals(5, res.getJSONArray("resultats").length());
            assertEquals(1, sessions.get());
            /* Copharmed oublie la session : la page revient publique, une reconnexion, puis la meme recherche */
            sessions.incrementAndGet();
            JSONArray a = CopharmedLecteur.rechercher(t, "doliprane").getJSONArray("resultats");
            assertEquals(5, a.length());
            assertEquals(3, sessions.get(), "une reconnexion");
            assertEquals(l.get(2).nom, a.getJSONObject(2).getString("designation"));
            assertEquals(SessionExtranet.Etat.VALIDE, t.session().etat());
        }
        /* mauvais identifiants : refus, rien lu */
        try (FauxExtranet f = faux(new AtomicInteger(), List.of(l), Map.of())) {
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.COPHARMED, null,
                    new ConnexionExtranet.Identifiants("ESSAI", "faux", "e2", "/fr/login", null));
            ExtranetException e = assertThrows(ExtranetException.class, () -> CopharmedLecteur.rechercher(t, "x1"));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
        }
    }

    @Test
    void listesDecrites() {
        assertEquals(13, ListeCopharmed.COPHARMED_PROMOTIONS.colonnes.size());
        assertEquals(11, ListeCopharmed.COPHARMED_CATALOGUE.colonnes.size());
        assertEquals("LISTE_COPHARMED_CATALOGUE", ListeCopharmed.COPHARMED_CATALOGUE.module());
        assertEquals(ListeCopharmed.COPHARMED_PROMOTIONS, ListeCopharmed.parCode(" copharmed_promotions "));
        assertNull(ListeCopharmed.parCode("TEDIS_CATALOGUE"));
        assertEquals("https://www.copharmed.com/fr/login",
                SourceExtranet.COPHARMED.pageConnexionParDefaut("https://www.copharmed.com/"));
        assertTrue(new String(new byte[0], StandardCharsets.UTF_8).isEmpty());
    }
}
