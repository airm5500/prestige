package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SessionExtranet;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Collecte des reapprovisionnements contre un faux extranet local (127.0.0.1) : 414 lignes par 25 = 17 appels, start 0
 * a 400 ; parametres DataTables exacts et dans l'ordre ; referer et X-Requested-With ; page de connexion en cours de
 * lecture ; total qui change.
 */
class ReapproCollecteurTest {

    private static final String CONNEXION = "<html><body><form action='/Login' method='post'>"
            + "<input name='login'><input type='password' name='pwd'></form></body></html>";

    static Map<String, String> decoder(String requete) {
        Map<String, String> m = new LinkedHashMap<>();
        if (requete == null || requete.isEmpty()) {
            return m;
        }
        for (String paire : requete.split("&")) {
            int i = paire.indexOf('=');
            String k = URLDecoder.decode(i < 0 ? paire : paire.substring(0, i), StandardCharsets.UTF_8);
            String v = i < 0 ? "" : URLDecoder.decode(paire.substring(i + 1), StandardCharsets.UTF_8);
            assertFalse(m.containsKey(k), "parametre en double : " + k);
            m.put(k, v);
        }
        return m;
    }

    /** Sert la liste par pages, selon start/length/draw de la requete. */
    private static FauxExtranet.Repondeur serveur(List<ReapproJeuEssai.Ligne> jeu, int[] total) {
        return q -> {
            Map<String, String> p = decoder(q);
            int start = Integer.parseInt(p.get("start"));
            int length = Integer.parseInt(p.get("length"));
            int draw = Integer.parseInt(p.get("draw"));
            return Reponse.json(ReapproJeuEssai.page(jeu, total[0], start, length, draw).toString());
        };
    }

    @Test
    void quatreCentQuatorzeLignesEnDixSeptAppels() throws Exception {
        List<ReapproJeuEssai.Ligne> jeu = ReapproJeuEssai.generer(new Random(414), 414);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN, serveur(jeu, new int[] { 414 }));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            ReapproCollecteur.Resultat r = ReapproCollecteur.lire(t, 50);
            assertEquals(414, r.lignes.size());
            assertEquals(414, r.bilan.recordsTotal);
            assertEquals(414, r.bilan.lignes);
            assertEquals(17, r.bilan.pages);
            List<FauxExtranet.Appel> appels = f.appels();
            assertEquals(17, appels.size());
            assertEquals(17, t.appels());
            for (int i = 0; i < appels.size(); i++) {
                FauxExtranet.Appel a = appels.get(i);
                assertEquals("GET", a.methode);
                assertEquals(ReapproCollecteur.CHEMIN, a.chemin);
                assertEquals("XMLHttpRequest", a.ajax);
                assertEquals(f.adresse() + "/ProduitsReappro", a.referer);
                assertEquals("SESSIONID=essai-local", a.cookie);
                Map<String, String> p = decoder(a.requete);
                assertEquals(String.valueOf(i * 25), p.get("start"));
                assertEquals("25", p.get("length"));
                assertEquals(String.valueOf(i + 1), p.get("draw"));
            }
            assertEquals("400", decoder(appels.get(16).requete).get("start"));
            for (int i = 0; i < 414; i++) {
                assertEquals(i, r.lignes.get(i).position);
                assertEquals(jeu.get(i).pscode, r.lignes.get(i).pscode);
                assertEquals(jeu.get(i).agence, r.lignes.get(i).codeAgence);
            }
        }
    }

    @Test
    void parametresExactsDeLaPremiereRequeteDansLOrdre() throws Exception {
        List<ReapproJeuEssai.Ligne> jeu = ReapproJeuEssai.generer(new Random(3), 30);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN, serveur(jeu, new int[] { 30 }));
            ReapproCollecteur.lire(f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x"), 5);
            List<String> attendu = new ArrayList<>();
            attendu.add("draw=1");
            for (int i = 0; i < 6; i++) {
                String c = "columns[" + i + "]";
                attendu.add(c + "[data]=" + i);
                attendu.add(c + "[name]=");
                attendu.add(c + "[searchable]=" + (i == 0 || i == 2 || i == 3 ? "true" : "false"));
                attendu.add(c + "[orderable]=" + (i <= 3 ? "true" : "false"));
                attendu.add(c + "[search][value]=");
                attendu.add(c + "[search][regex]=false");
            }
            attendu.add("order[0][column]=1");
            attendu.add("order[0][dir]=desc");
            attendu.add("start=0");
            attendu.add("length=25");
            attendu.add("search[value]=");
            attendu.add("search[regex]=false");
            List<String> recu = new ArrayList<>();
            decoder(f.appels().get(0).requete).forEach((k, v) -> recu.add(k + "=" + v));
            assertEquals(attendu, recu);
            assertFalse(f.appels().get(0).requete.contains("_="), "pas de parametre anti-cache ajoute");
        }
    }

    @Test
    void pageDeConnexionALaPageTroisArreteLaCollecte() throws Exception {
        List<ReapproJeuEssai.Ligne> jeu = ReapproJeuEssai.generer(new Random(9), 414);
        FauxExtranet.Repondeur normal = serveur(jeu, new int[] { 414 });
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN,
                    q -> "50".equals(decoder(q).get("start")) ? Reponse.html(CONNEXION) : normal.repondre(q));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            ExtranetException e = assertThrows(ExtranetException.class, () -> ReapproCollecteur.lire(t, 50));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, e.nature());
            assertFalse(e.getMessage().contains("essai-local"));
            assertEquals(3, f.appels().size());
            assertEquals(SessionExtranet.Etat.EXPIREE, t.session().etat());
        }
    }

    @Test
    void totalQuiChangeEnCoursDeLecture() throws Exception {
        List<ReapproJeuEssai.Ligne> jeu = ReapproJeuEssai.generer(new Random(11), 414);
        int[] total = { 414 };
        FauxExtranet.Repondeur normal = serveur(jeu, total);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN, q -> {
                if ("100".equals(decoder(q).get("start"))) {
                    total[0] = 415;
                }
                return normal.repondre(q);
            });
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ReapproCollecteur.lire(f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x"), 50));
            assertEquals(ExtranetException.Nature.PAGINATION, e.nature());
            assertEquals(5, f.appels().size());
        }
    }

    @Test
    void limiteDePagesAtteinteAvantLaSuite() throws Exception {
        List<ReapproJeuEssai.Ligne> jeu = ReapproJeuEssai.generer(new Random(12), 414);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN, serveur(jeu, new int[] { 414 }));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ReapproCollecteur.lire(f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x"), 16));
            assertEquals(ExtranetException.Nature.PAGINATION, e.nature());
            assertEquals(1, f.appels().size());
        }
    }

    @Test
    void reponseNonJsonOuLigneTropCourteRefusee() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN, Reponse.json("{\"msg\":[],\"datatables\":{\"recordsTotal\":1,"
                    + "\"recordsFiltered\":1,\"data\":[[\"a\",\"b\",\"c\"]],\"draw\":\"1\"}}"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ReapproCollecteur.lire(f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x"), 5));
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN, Reponse.html("<html><body>pas du json</body></html>"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ReapproCollecteur.lire(f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x"), 5));
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
        }
    }

    @Test
    void sansSessionAucunAppel() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ReapproCollecteur.CHEMIN, Reponse.json("{}"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ReapproCollecteur.lire(f.transport(SourceExtranet.UBIPHARM, 0, null), 5));
            assertEquals(ExtranetException.Nature.SESSION_ABSENTE, e.nature());
            assertTrue(f.appels().isEmpty());
            assertThrows(IllegalArgumentException.class,
                    () -> ReapproCollecteur.lire(f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x"), 0));
            assertTrue(f.appels().isEmpty());
        }
    }
}
