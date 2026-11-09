package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Collecte des nouveaux produits contre un faux extranet local (127.0.0.1) : jamais le vrai. Verifie la requete
 * envoyee, l'expiration de session, puis le bilan en base (fausse base en memoire) et la relecture : ce qui est relu
 * est identique, ligne par ligne, a ce que la page montrait.
 */
class NouveauxProduitsCollecteurTest {

    private static final String CONNEXION = "<html><body><form action='/Login' method='post'>"
            + "<input name='login'><input type='password' name='pwd'></form></body></html>";

    @Test
    void unSeulGetSurNouveauxProduits() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(NouveauxProduitsCollecteur.CHEMIN,
                    Reponse.html(NouveauxProduitsParseurTest.jeu("reconstitue-nouveaux-produits.html")));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            NouveauxProduitsParseur.Resultat r = new NouveauxProduitsCollecteur(t).collecter();
            assertEquals(3, r.lignes().size());
            assertEquals(1, f.appels().size());
            FauxExtranet.Appel a = f.appels().get(0);
            assertEquals("GET", a.methode);
            assertEquals("/NouveauxProduits", a.chemin);
            assertNull(a.requete);
            assertEquals("SESSIONID=essai-local", a.cookie);
            /* page HTML : pas d'en-tete AJAX */
            assertNull(a.ajax);
        }
    }

    @Test
    void pageDeConnexionEn200DonneSessionExpiree() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(NouveauxProduitsCollecteur.CHEMIN, Reponse.html(CONNEXION));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> new NouveauxProduitsCollecteur(t).collecter());
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, e.nature());
            assertFalse(e.getMessage().contains("essai-local"));
        }
    }

    @Test
    void transportTedisRefuse() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            TransportExtranet t = f.transport(SourceExtranet.TEDIS, 0, "x=y");
            assertThrows(IllegalArgumentException.class, () -> new NouveauxProduitsCollecteur(t));
            assertTrue(f.appels().isEmpty());
        }
    }

    @Test
    void bilanEtRelectureSurTroisCollectes() throws Exception {
        FausseBase base = new FausseBase();
        JournalCollecte journal = new JournalCollecte(base.em());
        NouveauxProduitsDepot depot = new NouveauxProduitsDepot(base.em());

        /* avant toute collecte : rien, et rien n'est presente comme complet */
        JSONObject vide = depot.lire();
        assertEquals(JSONObject.NULL, vide.get("collecte"));
        assertFalse(vide.getBoolean("listeComplete"));
        assertTrue(vide.getJSONArray("produits").isEmpty());

        String[] page = { NouveauxProduitsParseurTest.jeu("reconstitue-nouveaux-produits.html") };
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(NouveauxProduitsCollecteur.CHEMIN, q -> Reponse.html(page[0]));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            NouveauxProduitsCollecteur col = new NouveauxProduitsCollecteur(t);

            /* 1. collecte complete : 3 produits, 5 agences, relus a l'identique */
            long c1 = col.collecterEtEnregistrer(journal, depot, "essai");
            List<NouveauProduitUbipharm> attendu1 = new NouveauxProduitsParseur().analyser(page[0]).lignes();
            assertEquals(1, base.collectes.size());
            assertEquals(JournalCollecte.COMPLETE, base.collecte(c1).get("statut"));
            assertEquals(3, base.collecte(c1).get("lignes_recues"));
            assertEquals(3, base.produits.size());
            assertEquals(5, base.agences.size());
            JSONObject l1 = depot.lire();
            assertEquals(c1, l1.getJSONObject("collecte").getLong("id"));
            assertTrue(l1.getBoolean("listeComplete"));
            assertFalse(l1.getBoolean("paginationDetectee"));
            assertFalse(l1.isNull("dateCollecte"));
            rapprocher(attendu1, l1.getJSONArray("produits"));
            /* colisages relus depuis la colonne normalisee, inconnu garde inconnu */
            assertEquals(JSONObject.NULL, l1.getJSONArray("produits").getJSONObject(0).getJSONArray("agences")
                    .getJSONObject(1).get("colisages"));

            /* 2. pagination visible : collecte PARTIELLE, anciennes lignes retirees */
            page[0] = NouveauxProduitsParseurTest.jeu("reconstitue-pagination.html");
            long c2 = col.collecterEtEnregistrer(journal, depot, "essai");
            assertEquals(NouveauxProduitsCollecteur.PARTIELLE, base.collecte(c2).get("statut"));
            assertEquals(1, base.produits.size());
            assertTrue(base.agences.isEmpty());
            assertTrue(base.produits.stream().allMatch(p -> ((Number) p.get("collecte_id")).longValue() == c2));
            JSONObject l2 = depot.lire();
            assertEquals(c2, l2.getJSONObject("collecte").getLong("id"));
            assertFalse(l2.getBoolean("listeComplete"));
            assertTrue(l2.getBoolean("paginationDetectee"));
            rapprocher(new NouveauxProduitsParseur().analyser(page[0]).lignes(), l2.getJSONArray("produits"));

            /* 3. session expiree : collecte en ECHEC, rien d'ecrit, la liste precedente reste lisible */
            page[0] = CONNEXION;
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> col.collecterEtEnregistrer(journal, depot, "essai"));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, e.nature());
            assertEquals(3, base.collectes.size());
            Map<String, Object> c3 = base.collectes.get(2);
            assertEquals(JournalCollecte.ECHEC, c3.get("statut"));
            assertEquals(0, c3.get("lignes_recues"));
            assertEquals(1, base.produits.size());
            assertEquals(c2, depot.lire().getJSONObject("collecte").getLong("id"));
        }
        /* aucune requete ne touche une table de Prestige */
        assertTrue(base.requetes.stream().noneMatch(s -> s.contains("t_famille")), base.requetes.toString());
    }

    @Test
    void pageVideEnregistreUneListeCompleteVide() throws Exception {
        FausseBase base = new FausseBase();
        NouveauxProduitsDepot depot = new NouveauxProduitsDepot(base.em());
        try (FauxExtranet f = new FauxExtranet()) {
            f.route(NouveauxProduitsCollecteur.CHEMIN,
                    Reponse.html(NouveauxProduitsParseurTest.jeu("reconstitue-vide.html")));
            long c = new NouveauxProduitsCollecteur(f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=x"))
                    .collecterEtEnregistrer(new JournalCollecte(base.em()), depot, "essai");
            JSONObject l = depot.lire();
            assertEquals(c, l.getJSONObject("collecte").getLong("id"));
            assertTrue(l.getBoolean("listeComplete"));
            assertTrue(l.getJSONArray("produits").isEmpty());
        }
    }

    /** Rapprochement ligne par ligne : page analysee (toJson) contre base relue. */
    private static void rapprocher(List<NouveauProduitUbipharm> page, JSONArray relus) {
        assertEquals(page.size(), relus.length());
        for (int i = 0; i < page.size(); i++) {
            JSONObject a = page.get(i).toJson(), b = relus.getJSONObject(i);
            assertEquals(a.keySet(), b.keySet());
            for (String k : a.keySet()) {
                assertEquals(String.valueOf(a.get(k)), String.valueOf(b.get(k)), "ligne " + (i + 1) + ", " + k);
            }
            assertTrue(a.similar(b), "ligne " + (i + 1) + " : " + a + " / " + b);
        }
        assertEquals(page.stream().map(NouveauProduitUbipharm::pscode).collect(Collectors.toList()),
                relus.toList().stream().map(o -> ((Map<?, ?>) o).get("pscode")).collect(Collectors.toList()));
    }
}
