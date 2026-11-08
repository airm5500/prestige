package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Collecte des 9 listes de l'onglet Ubipharm contre un faux extranet local (127.0.0.1) : chaque ligne lue est comparee
 * cellule par cellule aux valeurs generees (rapprochement page -> lecture), GET seulement, referer et en-tete AJAX,
 * pagination, agences, et refus des pages qui ne ressemblent plus a celles relevees.
 */
class ListesUbipharmCollecteurTest {

    private static final String COOKIE = "SESSIONID=essai-local";

    private static void comparer(List<ListesUbipharmJeuEssai.Ligne> attendu, List<ListesUbipharmParseur.Ligne> lu) {
        assertEquals(attendu.size(), lu.size(), "nombre de lignes");
        for (int i = 0; i < attendu.size(); i++) {
            ListesUbipharmJeuEssai.Ligne a = attendu.get(i);
            ListesUbipharmParseur.Ligne l = lu.get(i);
            assertEquals(i, l.position, "position");
            assertEquals(a.attendu, l.cellules, "ligne " + (i + 1));
            assertEquals(a.pscode, l.pscode, "pscode ligne " + (i + 1));
            assertEquals(a.cip, l.cip, "cip ligne " + (i + 1));
            assertEquals(a.agence, l.agence, "agence ligne " + (i + 1));
        }
    }

    private static void seulementDesGet(FauxExtranet f) {
        for (FauxExtranet.Appel a : f.appels()) {
            assertEquals("GET", a.methode, "lecture seule : " + a.chemin);
            assertEquals(COOKIE, a.cookie);
        }
    }

    @Test
    void listesHtmlLuesLigneParLigne() throws Exception {
        Random r = new Random(20261108L);
        for (ListeUbipharm l : ListeUbipharm.values()) {
            if (l.mode != ListeUbipharm.Mode.HTML) {
                continue;
            }
            for (int n : new int[] { 0, 1, 383 }) {
                List<ListesUbipharmJeuEssai.Ligne> jeu = ListesUbipharmJeuEssai.generer(l, r, n, null);
                try (FauxExtranet f = new FauxExtranet()) {
                    f.route(l.chemin, Reponse.html(ListesUbipharmJeuEssai.page(l, jeu)));
                    ListesUbipharmCollecteur.Resultat res = ListesUbipharmCollecteur
                            .lire(f.transport(SourceExtranet.UBIPHARM, 0, COOKIE), l, 50);
                    comparer(jeu, res.lignes);
                    assertNull(res.annoncees, "une page HTML n'annonce pas de total");
                    assertEquals(1, f.appels().size());
                    assertEquals(l.chemin, f.appels().get(0).chemin);
                    seulementDesGet(f);
                }
            }
        }
    }

    @Test
    void listesJsonCompletes() throws Exception {
        Random r = new Random(7);
        for (ListeUbipharm l : Arrays.asList(ListeUbipharm.PRODUITS_UG, ListeUbipharm.PLUS_ACHETES)) {
            for (int n : new int[] { 0, 1, 698 }) {
                List<ListesUbipharmJeuEssai.Ligne> jeu = ListesUbipharmJeuEssai.generer(l, r, n, null);
                /* produits avec UG : total annonce a 0 malgre les lignes (releve du 08/11) */
                int total = l == ListeUbipharm.PRODUITS_UG ? 0 : n;
                try (FauxExtranet f = new FauxExtranet()) {
                    f.route(l.chemin, Reponse.json(ListesUbipharmJeuEssai.json(jeu, total, 1).toString()));
                    ListesUbipharmCollecteur.Resultat res = ListesUbipharmCollecteur
                            .lire(f.transport(SourceExtranet.UBIPHARM, 0, COOKIE), l, 50);
                    comparer(jeu, res.lignes);
                    assertEquals(total > 0 ? Integer.valueOf(n) : null, res.annoncees);
                    FauxExtranet.Appel a = f.appels().get(0);
                    assertEquals(1, f.appels().size());
                    assertEquals("XMLHttpRequest", a.ajax);
                    assertEquals(f.adresse() + l.pageOrigine, a.referer);
                    assertEquals(l.parametresFixes(), ReapproCollecteurTest.decoder(a.requete));
                    seulementDesGet(f);
                }
            }
        }
    }

    @Test
    void totalAnnonceDifferentRefuse() throws Exception {
        Random r = new Random(3);
        List<ListesUbipharmJeuEssai.Ligne> jeu = ListesUbipharmJeuEssai.generer(ListeUbipharm.PLUS_ACHETES, r, 10,
                null);
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(ListeUbipharm.PLUS_ACHETES.chemin,
                    Reponse.json(ListesUbipharmJeuEssai.json(jeu, 11, 1).toString()));
            ExtranetException e = assertThrows(ExtranetException.class, () -> ListesUbipharmCollecteur
                    .lire(f.transport(SourceExtranet.UBIPHARM, 0, COOKIE), ListeUbipharm.PLUS_ACHETES, 50));
            assertEquals(ExtranetException.Nature.PAGINATION, e.nature());
        }
    }

    @Test
    void listesPagineesParCent() throws Exception {
        Random r = new Random(118);
        for (ListeUbipharm l : Arrays.asList(ListeUbipharm.RELEVES, ListeUbipharm.AVOIRS)) {
            for (int n : new int[] { 0, 1, 100, 101, 118, 250 }) {
                List<ListesUbipharmJeuEssai.Ligne> jeu = ListesUbipharmJeuEssai.generer(l, r, n, null);
                try (FauxExtranet f = new FauxExtranet()) {
                    f.route(l.chemin, q -> {
                        Map<String, String> p = ReapproCollecteurTest.decoder(q);
                        int start = Integer.parseInt(p.get("start"));
                        int length = Integer.parseInt(p.get("length"));
                        return Reponse.json(ListesUbipharmJeuEssai
                                .json(jeu.subList(Math.min(start, n), Math.min(start + length, n)), n,
                                        Integer.parseInt(p.get("draw")))
                                .toString());
                    });
                    ListesUbipharmCollecteur.Resultat res = ListesUbipharmCollecteur
                            .lire(f.transport(SourceExtranet.UBIPHARM, 0, COOKIE), l, 50);
                    comparer(jeu, res.lignes);
                    assertEquals(Integer.valueOf(n), res.annoncees);
                    int pages = Math.max(1, (n + 99) / 100);
                    assertEquals(pages, f.appels().size());
                    for (int i = 0; i < pages; i++) {
                        Map<String, String> p = ReapproCollecteurTest.decoder(f.appels().get(i).requete);
                        assertEquals(String.valueOf(i * 100), p.get("start"));
                        assertEquals("100", p.get("length"));
                        assertEquals(String.valueOf(i + 1), p.get("draw"));
                        assertEquals("2", p.get("order[0][column]"));
                        assertEquals("desc", p.get("order[0][dir]"));
                        assertEquals(f.adresse() + l.pageOrigine, f.appels().get(i).referer);
                    }
                    seulementDesGet(f);
                }
            }
        }
    }

    @Test
    void dernieresCommandesParAgence() throws Exception {
        Random r = new Random(4);
        ListeUbipharm l = ListeUbipharm.DERNIERES_COMMANDES;
        int[] tailles = { 3, 0, 1, 12 };
        List<ListesUbipharmJeuEssai.Ligne> tout = new ArrayList<>();
        List<List<ListesUbipharmJeuEssai.Ligne>> parAgence = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            List<ListesUbipharmJeuEssai.Ligne> jeu = ListesUbipharmJeuEssai.generer(l, r, tailles[i],
                    ListesUbipharmJeuEssai.AGENCES[i]);
            parAgence.add(jeu);
            tout.addAll(jeu);
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(l.pageOrigine, Reponse.html(ListesUbipharmJeuEssai.pageAgences(ListesUbipharmJeuEssai.AGENCES)));
            f.route(l.chemin, q -> {
                String etab = ReapproCollecteurTest.decoder(q).get("etab");
                int i = Arrays.asList(ListesUbipharmJeuEssai.AGENCES).indexOf(etab);
                List<ListesUbipharmJeuEssai.Ligne> jeu = parAgence.get(i);
                return Reponse.json(ListesUbipharmJeuEssai.json(jeu, jeu.size(), 1).put("sDatemaj", "08/11/2026 04:00")
                        .put("sStatut", "OK").toString());
            });
            ListesUbipharmCollecteur.Resultat res = ListesUbipharmCollecteur
                    .lire(f.transport(SourceExtranet.UBIPHARM, 0, COOKIE), l, 50);
            comparer(tout, res.lignes);
            assertEquals(Integer.valueOf(16), res.annoncees);
            assertEquals(5, f.appels().size());
            assertEquals(l.pageOrigine, f.appels().get(0).chemin);
            for (int i = 0; i < 4; i++) {
                assertEquals(ListesUbipharmJeuEssai.AGENCES[i],
                        ReapproCollecteurTest.decoder(f.appels().get(i + 1).requete).get("etab"));
            }
            seulementDesGet(f);
        }
    }

    @Test
    void agenceEnCoursDeMiseAJourRefusee() throws Exception {
        ListeUbipharm l = ListeUbipharm.DERNIERES_COMMANDES;
        JSONObject enCours = ListesUbipharmJeuEssai.json(new ArrayList<>(), 0, 1).put("sStatut", "ENC");
        ExtranetException e = assertThrows(ExtranetException.class,
                () -> ListesUbipharmCollecteur.assembler(l, Arrays.asList("YOP"), Arrays.asList(enCours)));
        assertTrue(e.getMessage().contains("mise à jour en cours"));
    }

    @Test
    void pageModifieeRefusee() throws Exception {
        ListeUbipharm l = ListeUbipharm.FACTURES;
        String bonne = ListesUbipharmJeuEssai.page(l, ListesUbipharmJeuEssai.generer(l, new Random(1), 3, null));
        /* tableau absent (page de connexion, page changee) */
        assertThrows(ExtranetException.class, () -> ListesUbipharmParseur.page(l, "<html><body>Bonjour</body></html>"));
        /* colonnes inversees : la date n'est plus a sa place */
        assertThrows(ExtranetException.class,
                () -> ListesUbipharmParseur.page(l, bonne.replace("<th>Date</th>", "<th>Statut</th>")));
        /* ligne trop courte */
        assertThrows(ExtranetException.class, () -> ListesUbipharmParseur.page(l,
                bonne.replaceFirst("<tbody><tr>.*?</tr>", "<tbody><tr><td>1</td><td>2</td></tr>")));
        /* ligne JSON trop courte */
        assertThrows(ExtranetException.class, () -> ListesUbipharmParseur.ligne(ListeUbipharm.RELEVES, 0, null,
                new org.json.JSONArray("[\"a\",\"b\"]")));
        /* code d'agence anormal */
        assertThrows(ExtranetException.class, () -> ListesUbipharmParseur.agences(ListeUbipharm.DERNIERES_COMMANDES,
                ListesUbipharmJeuEssai.pageAgences("BK E")));
        assertThrows(ExtranetException.class,
                () -> ListesUbipharmParseur.agences(ListeUbipharm.DERNIERES_COMMANDES, "<html></html>"));
    }

    @Test
    void definitionsCoherentes() {
        for (ListeUbipharm l : ListeUbipharm.values()) {
            JSONObject d = l.description();
            assertEquals(l, ListeUbipharm.parCode(l.name()));
            assertTrue(l.chemin.startsWith("/"));
            int attendues = l.colonnes().size() + (l.aProduit() ? 2 : 0)
                    + (l.mode == ListeUbipharm.Mode.JSON_PAR_AGENCE ? 1 : 0);
            assertEquals(attendues, d.getJSONArray("colonnes").length(), l.name());
            /* une ligne generee a autant de cellules que de titres */
            ListesUbipharmJeuEssai.Ligne x = ListesUbipharmJeuEssai.ligne(l, new Random(9), 0, "YOP");
            assertEquals(attendues, x.attendu.size(), l.name());
        }
        assertNull(ListeUbipharm.parCode("INCONNUE"));
        assertNull(ListeUbipharm.parCode(null));
    }

    @Test
    void transportUtilise() throws Exception {
        /* le transport refuse un chemin hors du site : les chemins des listes sont tous relatifs */
        try (FauxExtranet f = new FauxExtranet()) {
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, COOKIE);
            assertThrows(IllegalArgumentException.class, () -> ListesUbipharmCollecteur.lire(t, null, 1));
        }
    }
}
