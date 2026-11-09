package rest.service.extranet.dpci;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet.Appel;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Retour du 09/11 (« DPCI : je n'ai pas l'onglet produits ») : page /produits, liste DataTables RechercheCatalogue
 * (structure relevee le 09/11, valeurs inventees ; 100 lignes par page au plus). Rapprochement source = lignes gardees,
 * ligne par ligne et colonne par colonne, sur des catalogues tires au hasard (graine fixe) : 0, 1, 100, 101 produits et
 * davantage ; prix remise different ou non, colisage 0 et superieur a 1, avec et sans offre, code facture vide.
 * Cohérence : somme des prix lus = somme des prix de la source ; jamais de prix negatif ; un appel par page.
 */
class DpciProduitsTest {

    static final String[][] STATUTS = { { "DI", "Disponible", "true" }, { "SU", "Supprimé", "false" },
            { "ML", "Manque labo", "false" }, { "RL", "Retard de livraison", "false" },
            { "MR", "Manque Rayon", "false" } };

    /** Produit tire : source JSON et cellules attendues (ecrites a part, sans le code lu). */
    static final class Prod {
        JSONObject json;
        List<String> attendu;
        String interne, facture;
        BigDecimal prix;
    }

    static String nombre(BigDecimal b) {
        BigDecimal s = b.stripTrailingZeros();
        return s.scale() < 0 ? s.setScale(0).toPlainString() : s.toPlainString();
    }

    static Prod tirer(Random r, int i) {
        Prod p = new Prod();
        p.interne = String.valueOf(3_400_000_000_000L + r.nextInt(9_000_000));
        p.facture = r.nextInt(10) == 0 ? "" : r.nextInt(8) == 0 ? "ABC" + i : p.interne;
        BigDecimal nonRemise = new BigDecimal(r.nextInt(80_000) + (r.nextInt(5) == 0 ? ".5" : ""));
        BigDecimal remise = r.nextInt(4) == 0
                ? nonRemise.multiply(new BigDecimal("0.9")).setScale(0, java.math.RoundingMode.HALF_UP) : nonRemise;
        BigDecimal ppv = nonRemise.add(new BigDecimal(r.nextInt(20_000)));
        p.prix = nonRemise;
        int colis = r.nextInt(5) == 0 ? 0 : r.nextInt(3) == 0 ? 1 : 2 + r.nextInt(300);
        int tva = r.nextBoolean() ? 18 : 0;
        String[] st = STATUTS[r.nextInt(STATUTS.length)];
        List<DpciLecteurTest.Pal> pals = r.nextInt(3) == 0 ? DpciLecteurTest.tirerPaliers(r) : null;
        String nom = (i % 11 == 0 ? "SIROP « ENFANT » & CO " : "PRODUIT ") + i + " 500MG CP B/" + (1 + r.nextInt(90));
        JSONObject ol = null;
        if (pals != null) {
            JSONArray pj = new JSONArray();
            pals.forEach(x -> pj.put(x.json()));
            ol = new JSONObject().put("codeOffre", "O" + i).put("idPartenariat", "P" + i).put("panache", false)
                    .put("palierOffreViews", pj);
        }
        p.json = new JSONObject().put("libelleProduit", nom).put("codeProduitInterne", p.interne)
                .put("codeProduitFacture", p.facture).put("codeSi",
                        "123")
                .put("laboratoire", new JSONObject().put("code", "L" + (i % 7)).put("libelle", "LABO " + (i % 7)))
                .put("disponibiliteProduit", new JSONObject()
                        .put("agenceCommande",
                                new JSONObject().put("libelleAgence", i % 2 == 0 ? "ABIDJAN" : "BOUAKE")
                                        .put("codeAgence", "A" + (i % 2)).put("dispo", Boolean.parseBoolean(st[2]))
                                        .put("statut", new JSONObject().put("code", st[0]).put("libelle", st[1])))
                        .put("agences", new JSONArray()))
                .put("colisageMultiple", colis).put("colisageCommande", 0).put("quantiteCommande", 0)
                .put("tarifNonRemise", new JSONObject().put("numerique", nonRemise).put("formatSite", "x"))
                .put("tarifRemise", new JSONObject().put("numerique", remise).put("formatSite", "x"))
                .put("prixPublic", new JSONObject().put("numerique", ppv).put("formatSite", "x")).put("tva", tva)
                .put("offreLigne", ol == null ? JSONObject.NULL : ol).put("fromRgp", false);
        p.attendu = Arrays.asList(nom, p.facture.isEmpty() ? p.interne : p.facture, "LABO " + (i % 7),
                i % 2 == 0 ? "ABIDJAN" : "BOUAKE", st[1], colis == 0 ? "" : String.valueOf(colis), nombre(nonRemise),
                nombre(remise), nombre(ppv), String.valueOf(tva), pals == null ? "" : DpciLecteurTest.attendu(pals));
        return p;
    }

    @Test
    void tousLesProduitsParPages_rapprochement() throws Exception {
        Random r = new Random(9112026L);
        int[] tailles = { 0, 1, 100, 101, 250, 1 + r.nextInt(1500), 1 + r.nextInt(1500) };
        for (int n : tailles) {
            List<Prod> ps = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                ps.add(tirer(r, i));
            }
            try (DpciLecteurTest.Faux x = new DpciLecteurTest.Faux()) {
                x.page(DpciLecteur.PAGE_PRODUITS, a -> DpciLecteurTest.CONNECTE + "produits</body></html>");
                x.action(DpciLecteur.PRODUITS, a -> {
                    Map<String, String> q = DpciLecteurTest.requete(a);
                    int start = Integer.parseInt(q.get("start")), length = Integer.parseInt(q.get("length"));
                    assertEquals(100, length, "100 lignes par page (200 : erreur 500 de l'extranet)");
                    JSONObject rech = new JSONObject(q.get("rechercheJson"));
                    assertEquals("", rech.getString("rechercheGlobale"), "aucun filtre");
                    assertEquals(0, rech.getJSONObject("filtreRecherche").getJSONArray("codesProduits").length());
                    assertEquals(0, rech.getJSONObject("filtreStrict").getJSONArray("codesGroupesProduit").length());
                    JSONArray d = new JSONArray();
                    for (int i = start; i < Math.min(n, start + length); i++) {
                        d.put(ps.get(i).json);
                    }
                    return new JSONObject().put("draw", q.get("draw")).put("recordsTotal", n).put("recordsFiltered", n)
                            .put("data", d).toString();
                });
                TransportExtranet t = x.transport("secret");
                List<Ligne> l = DpciLecteur.lire(t, ListeDpci.DPCI_PRODUITS);
                assertEquals(n, l.size());
                BigDecimal somme = BigDecimal.ZERO, sommeSource = BigDecimal.ZERO;
                for (int i = 0; i < n; i++) {
                    Prod p = ps.get(i);
                    Ligne y = l.get(i);
                    assertEquals(i, y.position);
                    assertEquals(p.attendu, y.cellules, n + " produits, ligne " + i);
                    assertEquals(p.interne, y.pscode, "code interne garde comme code produit");
                    /* meme regle que les offres : code facture s'il a la forme d'un CIP, sinon code interne */
                    String cip = p.facture.matches("\\d{7,14}") ? p.facture
                            : p.interne.matches("\\d{7,14}") ? p.interne : null;
                    assertEquals(cip, y.cip, "ligne " + i);
                    for (int c = 6; c <= 8; c++) {
                        assertTrue(new BigDecimal(y.cellules.get(c)).signum() >= 0, "jamais de prix negatif");
                    }
                    assertTrue(new BigDecimal(y.cellules.get(7)).compareTo(new BigDecimal(y.cellules.get(6))) <= 0,
                            "prix remise <= prix");
                    somme = somme.add(new BigDecimal(y.cellules.get(6)));
                    sommeSource = sommeSource.add(p.prix);
                }
                assertEquals(0, somme.compareTo(sommeSource), "somme des prix lus = somme de la source");
                long pagesLues = x.f.appels().stream().filter(a -> a.chemin.equals(DpciLecteur.PRODUITS)).count();
                assertEquals(Math.max(1, (n + 99) / 100), pagesLues, "un appel par page de 100");
                for (Appel a : x.f.appels()) {
                    if (a.chemin.equals(DpciLecteur.PRODUITS)) {
                        assertEquals(DpciLecteur.PAGE_PRODUITS,
                                a.referer == null ? null : a.referer.replaceFirst("^https?://[^/]+", ""),
                                "referer : la page /produits");
                    }
                }
                DpciLecteurTest.getSeulement(x.f);
            }
        }
    }

    @Test
    void listeAbsenteRefusee() throws Exception {
        try (DpciLecteurTest.Faux x = new DpciLecteurTest.Faux()) {
            x.page(DpciLecteur.PAGE_PRODUITS, a -> DpciLecteurTest.CONNECTE + "produits</body></html>");
            x.action(DpciLecteur.PRODUITS, a -> new JSONObject().put("recordsTotal", 3).toString());
            TransportExtranet t = x.transport("secret");
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> DpciLecteur.lire(t, ListeDpci.DPCI_PRODUITS)).nature());
        }
    }
}
