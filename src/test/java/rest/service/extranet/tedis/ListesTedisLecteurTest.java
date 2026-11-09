package rest.service.extranet.tedis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Appel;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.tedis.ListeTedis.Genre;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Les 10 listes de l'onglet TEDIS contre un faux TEDIS local, aux formats releves le 08/11 (JSON servi en text/html,
 * objets nommes, select des agences, quinzaines et annees, commandes en attente puis leur detail, tableaux HTML).
 * Rapprochement : chaque objet source est compare a sa ligne lue, cellule par cellule. GET seulement, referer de la
 * page de l'extranet. Refus des reponses qui ne ressemblent plus au releve.
 */
class ListesTedisLecteurTest {

    private static final String COOKIE = "laravel_session=essai-local";
    private static final String[] STATUTS = { "NORMAL", "ATTENTE", "MISE EN PLACE", "MANQUE LABO", "ELIMINE DE GAMME" };

    /** JSON tel que TEDIS le sert : type « text/html ». */
    static Reponse jsonHtml(Object o) {
        return new Reponse(200, "text/html; charset=UTF-8", o.toString().getBytes(StandardCharsets.UTF_8), null);
    }

    static String select(String id, String[][] options, int choisi) {
        StringBuilder s = new StringBuilder("<select id='" + id + "' class='form-control'>");
        for (int i = 0; i < options.length; i++) {
            s.append("<option value='").append(options[i][0]).append("'").append(i == choisi ? " selected" : "")
                    .append(">").append(options[i][1]).append("</option>");
        }
        return s.append("</select>").toString();
    }

    static String page(String corps) {
        return "<html><body><table id='TableauachatsMois'><thead><tr><th>Date</th></tr></thead><tbody></tbody></table>"
                + corps + "<script>var url = '/x';</script></body></html>";
    }

    /** Produit du catalogue, valeurs variees d'une ligne a l'autre (prix decimaux en texte, stock 0 ou positif). */
    static JSONObject produit(Random r, int i) {
        return new JSONObject().put("IDProduit", 281474976700000L + i).put("CodeInterneProduit", "PROD" + i)
                .put("CodeCipProduit1", i % 7 == 0 ? "" : String.valueOf(3400000000000L + i))
                .put("CodeEanProduit", String.valueOf(3400000000000L + i))
                .put("DesignationProduit", "PRODUIT " + i + (i % 5 == 0 ? " <b>B/10</b>" : " CPR B/" + (i % 30)))
                .put("PrixCessionHT", (100 + r.nextInt(50000)) + "." + String.format("%06d", r.nextInt(1000) * 1000))
                .put("PrixVentePublicTTC", (150 + r.nextInt(80000)) + ".000000").put("TypeTvaProduit", 0)
                .put("produitEnStock", r.nextInt(3) == 0 ? 0 : 1 + r.nextInt(400))
                .put("Statut", STATUTS[r.nextInt(STATUTS.length)])
                .put("Famille", i % 9 == 0 ? JSONObject.NULL : "MEDICAMENT").put("Nature", "MEDICAMENT PUBLIC")
                .put("Laboratoire", "LABO " + (i % 13)).put("ColisageProduit", 1 + r.nextInt(300))
                .put("StockTheorique", r.nextInt(50)).put("IDAgence", 3);
    }

    static List<String> attenduCatalogue(String agence, JSONObject p) {
        return Arrays.asList(agence, p.getString("CodeInterneProduit"),
                p.getString("DesignationProduit").replace("<b>", "").replace("</b>", ""),
                p.getString("CodeCipProduit1"), p.getString("CodeEanProduit"), p.getString("Statut"),
                p.isNull("Famille") ? "" : p.getString("Famille"), p.getString("Nature"), p.getString("Laboratoire"),
                p.getInt("produitEnStock") > 0 ? "Oui" : "Non", montant(p.getString("PrixCessionHT")),
                montant(p.getString("PrixVentePublicTTC")), String.valueOf(p.getInt("ColisageProduit")));
    }

    static String montant(String s) {
        BigDecimal b = new BigDecimal(s).stripTrailingZeros();
        return b.scale() < 0 ? b.setScale(0).toPlainString() : b.toPlainString();
    }

    static TransportExtranet transport(FauxExtranet f) {
        return f.transport(SourceExtranet.TEDIS, 0, COOKIE);
    }

    static List<Appel> nonGet(FauxExtranet f) {
        return f.appels().stream().filter(a -> !"GET".equals(a.methode)).collect(Collectors.toList());
    }

    @Test
    void catalogueEtMisesEnPlaceAgenceChoisie() throws Exception {
        Random r = new Random(20261108);
        JSONArray data = new JSONArray();
        for (int i = 0; i < 1500; i++) {
            data.put(produit(r, i));
        }
        String[][] agences = { { "2", "VRIDI" }, { "3", "GAGNOA" }, { "4", "BOUAKE" }, { "5", "YOPOUGON" } };
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/catalogueProduit", Reponse.html(page(select("ChooseAgence", agences, 1))));
            f.routeAppel("/catalogueProduitTableData", a -> "AgenceId=3".equals(a.requete)
                    ? jsonHtml(new JSONObject().put("succes", true).put("data", data)) : null);
            List<Ligne> cat = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_CATALOGUE).lignes;
            assertEquals(1500, cat.size());
            for (int i = 0; i < cat.size(); i++) {
                JSONObject p = data.getJSONObject(i);
                Ligne l = cat.get(i);
                assertEquals(attenduCatalogue("GAGNOA", p), l.cellules, "ligne " + (i + 1));
                assertEquals(i, l.position);
                assertEquals("PROD" + i, l.pscode, "reference TEDIS");
                assertEquals(p.getString("CodeCipProduit1").isEmpty() ? null : p.getString("CodeCipProduit1"), l.cip);
                assertEquals("GAGNOA", l.agence);
            }
            List<Ligne> mep = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_MISES_EN_PLACE).lignes;
            List<JSONObject> attendus = new ArrayList<>();
            for (int i = 0; i < data.length(); i++) {
                if ("MISE EN PLACE".equals(data.getJSONObject(i).getString("Statut"))) {
                    attendus.add(data.getJSONObject(i));
                }
            }
            assertTrue(attendus.size() > 100 && attendus.size() < 1500);
            assertEquals(attendus.size(), mep.size(), "mises en place = statut MISE EN PLACE");
            for (int i = 0; i < mep.size(); i++) {
                assertEquals(attenduCatalogue("GAGNOA", attendus.get(i)), mep.get(i).cellules);
                assertEquals(i, mep.get(i).position, "positions continues apres filtre");
            }
            assertTrue(nonGet(f).isEmpty(), "GET seulement");
            Appel donnees = f.appels().stream().filter(a -> a.chemin.equals("/catalogueProduitTableData")).findFirst()
                    .get();
            assertEquals("XMLHttpRequest", donnees.ajax);
            assertTrue(donnees.referer.endsWith("/catalogueProduit"));
        }
    }

    @Test
    void sortiesDeRuptureEtPromotions() throws Exception {
        Random r = new Random(7);
        JSONArray sorties = new JSONArray(), promos = new JSONArray();
        for (int i = 0; i < 487; i++) {
            sorties.put(new JSONObject().put("StockTheorique", i % 4 == 0 ? 0 : r.nextInt(90) + 1)
                    .put("IDPRODUIT", 1000 + i).put("DesignationProduit", "SORTIE " + i)
                    .put("CodeCipProduit1", String.valueOf(6181100000L + i)).put("CodeEanProduit", "")
                    .put("ColisageProduit", 12).put("DateReceptionBonLivraison", "2026-11-0" + (1 + i % 7))
                    .put("LibelleFamilleProduit", "PARAPHARMACIE").put("PrixVentePublicTTC", 1175 + i)
                    .put("PrixCessionHT", "795.500000").put("Nature", "DIVERS").put("NomLaboratoire", "LABO"));
        }
        for (int i = 0; i < 717; i++) {
            promos.put(new JSONObject().put("IDProduit", i).put("DesignationProduit", "PROMO " + i)
                    .put("CodeCipProduit1", String.valueOf(3000000 + i)).put("CodeEanProduit", "")
                    .put("PrixCessionHT", 1805.5 + i).put("PrixVentePublicHT", 2730).put("DateDebutUG", "2026-10-05")
                    .put("DateFinUG", "2026-11-30").put("NomLaboratoire", "PRAGOCHEM"));
        }
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/catalogueProduit",
                    Reponse.html(page(select("ChooseAgence", new String[][] { { "2", "VRIDI" } }, -1))));
            f.routeAppel("/NosReaprovisionnements", a -> "AgenceId=2".equals(a.requete)
                    ? jsonHtml(new JSONObject().put("succes", true).put("data", sorties)) : null);
            f.route("/produitpromo", jsonHtml(new JSONObject().put("succes", true).put("data", promos)));
            f.route("/produitpromoExclusive",
                    jsonHtml(new JSONObject().put("succes", true).put("data", new JSONArray())));
            List<Ligne> s = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_SORTIES_RUPTURE).lignes;
            assertEquals(487, s.size());
            for (int i = 0; i < s.size(); i++) {
                JSONObject o = sorties.getJSONObject(i);
                assertEquals(Arrays.asList("VRIDI", o.getString("DateReceptionBonLivraison"), "SORTIE " + i,
                        o.getString("CodeCipProduit1"), "", "PARAPHARMACIE", "DIVERS", "LABO",
                        o.getInt("StockTheorique") > 0 ? "Oui" : "Non", "795.5", String.valueOf(1175 + i), "12"),
                        s.get(i).cellules, "sortie " + (i + 1));
                assertNull(s.get(i).pscode);
                assertEquals(o.getString("CodeCipProduit1"), s.get(i).cip);
            }
            List<Ligne> p = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_PROMOS_LABO).lignes;
            assertEquals(717, p.size());
            for (int i = 0; i < p.size(); i++) {
                assertEquals(Arrays.asList("PROMO " + i, String.valueOf(3000000 + i), "", "PRAGOCHEM", "2026-10-05",
                        "2026-11-30", montant(String.valueOf(1805.5 + i)), "2730"), p.get(i).cellules);
            }
            assertEquals(0, ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_PROMOS_EXCLUSIVES).lignes.size());
            assertTrue(nonGet(f).isEmpty());
        }
    }

    @Test
    void blParQuinzaineEtFacturesParAnnee() throws Exception {
        String[][] quinzaines = { { "250", "1-11-2026" }, { "249", "2-10-2026" }, { "248", "1-10-2026" } };
        int[] nombres = { 0, 13, 4 };
        String[][] annees = { { "2026", "2026" }, { "2025", "2025" } };
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/blparquizaine", Reponse.html(page(select("SearchBlv", quinzaines, 0))));
            f.routeAppel("/donneequinzaine", a -> {
                for (int q = 0; q < quinzaines.length; q++) {
                    if (("idDate=" + quinzaines[q][0]).equals(a.requete)) {
                        JSONArray d = new JSONArray();
                        for (int i = 0; i < nombres[q]; i++) {
                            d.put(new JSONObject().put("IDFACTURECLIENT", 7_000_000 + q * 100 + i)
                                    .put("DateFactureClient", "2026-10-1" + i % 10)
                                    .put("LibelleTypeFactureClient", i % 2 == 0 ? "BL" : "AVOIR")
                                    .put("NumeroFactureClient", "BL-" + quinzaines[q][0] + "-" + i)
                                    .put("TotalHT", 1000.25 * (i + 1)).put("TotalRemise", 0).put("TotalTaxe", i * 18)
                                    .put("TotalTTC", 1000.25 * (i + 1) + i * 18).put("IDQUINZAINE", quinzaines[q][0]));
                        }
                        return jsonHtml(new JSONObject().put("succes", true).put("DatabonLivraison", d)
                                .put("TotalQuizaine", 0).put("TotalProtocol", 0));
                    }
                }
                return null;
            });
            f.route("/factureDequinzaine", Reponse.html(page(select("envoiAnnee", annees, 0))));
            f.routeAppel("/releveFacture", a -> {
                JSONArray d = new JSONArray();
                int n = "Annee=2026".equals(a.requete) ? 20 : "Annee=2025".equals(a.requete) ? 24 : -1;
                if (n < 0) {
                    return null;
                }
                for (int i = 0; i < n; i++) {
                    d.put(new JSONObject().put("Action", "<i class='fa fa-print' data-id='" + i + "'></i>")
                            .put("Date", "15/0" + (1 + i % 9) + "/" + a.requete.substring(6))
                            .put("Quinzaine", "FQ" + a.requete.substring(6) + "-" + i).put("P", i % 3 == 0 ? "P" : "")
                            .put("TotalHT", (i * 1000) + " F").put("Remise", "0 F").put("Tva", "0 F")
                            .put("TotalTTC", (i * 1000) + " F"));
                }
                return jsonHtml(new JSONObject().put("succes", true).put("data", d));
            });
            List<Ligne> bl = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_BL_QUINZAINE).lignes;
            assertEquals(17, bl.size(), "0 + 13 + 4 BL");
            assertEquals("2-10-2026", bl.get(0).cellules.get(0));
            assertEquals(Arrays.asList("2-10-2026", "2026-10-10", "BL", "BL-249-0", "1000.25", "0", "0", "1000.25"),
                    bl.get(0).cellules);
            assertEquals(Arrays.asList("1-10-2026", "2026-10-13", "AVOIR", "BL-248-3", "4001", "0", "54", "4055"),
                    bl.get(16).cellules);
            for (int i = 0; i < bl.size(); i++) {
                assertEquals(i, bl.get(i).position);
            }
            /* 09/11, point 4 : identifiant des exports TXT et CSV du BL, ligne par ligne (quinzaines 249 puis 248) */
            for (int i = 0; i < bl.size(); i++) {
                int q = i < 13 ? 1 : 2, k = i < 13 ? i : i - 13;
                assertEquals(java.util.Map.of("IDFACTURECLIENT", String.valueOf(7_000_000 + q * 100 + k)),
                        bl.get(i).document, "ligne " + i);
            }
            List<Ligne> fa = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_FACTURES_QUINZAINE).lignes;
            assertEquals(44, fa.size(), "20 factures 2026 + 24 factures 2025");
            assertTrue(fa.stream().allMatch(x -> x.document == null), "factures de quinzaine : impression seulement");
            assertEquals(Arrays.asList("2026", "15/01/2026", "FQ2026-0", "P", "0 F", "0 F", "0 F", "0 F"),
                    fa.get(0).cellules);
            assertEquals(Arrays.asList("2025", "15/06/2025", "FQ2025-23", "", "23000 F", "0 F", "0 F", "23000 F"),
                    fa.get(43).cellules);
            assertEquals(1 + 3 + 1 + 2, f.appels().size(), "une page et une reponse par quinzaine / annee");
            assertTrue(nonGet(f).isEmpty());
        }
    }

    @Test
    void commandesEnAttenteEtTableauxHtml() throws Exception {
        String attente = page("<table class='table table-striped'><thead><tr><th>#</th><th>Date &amp; Heure</th></tr>"
                + "</thead><tbody>" + "<tr><td><i id='suppressionLigne' data-id='29683' class='fa fa-trash'></i>"
                + "<i id='voirDetail' data-id='29683' class='fa fa-eye'></i></td><td>17/10/2026 12:52:00</td></tr>"
                + "<tr><td><i id='suppressionLigne' data-id='29941' class='fa fa-trash'></i>"
                + "<i id='voirDetail' data-id='29941' class='fa fa-eye'></i></td><td>29/10/2026 13:03:22</td></tr>"
                + "</tbody></table><table id='DetailCommandeAttente'><thead><tr><th>Désignation du produit</th></tr>"
                + "</thead><tbody></tbody></table>");
        String historique = page("<table id='historiqueTable'><thead><tr><th>#</th><th>Date</th><th>N° Commande</th>"
                + "<th>Type</th><th>Mode</th><th>Etape</th><th>Total HT</th><th>Remise</th><th>TVA</th>"
                + "<th>Total TTC</th><th>Nbre Ligne</th><th>Nbre Boite</th></tr></thead><tbody>"
                + "<tr><td><i data-id='5629'></i></td><td>07/11/2026 13:14:22</td><td>26031114711-GNA-E</td><td>NORMAL</td>"
                + "<td>EXTRANET</td><td>FACTURE</td><td>11 376 F</td><td>0 F</td><td>2 048 F</td><td>13 424 F</td>"
                + "<td>1</td><td>3</td></tr>"
                + "<tr><td></td><td>05/11/2026 19:03:57</td><td>26030913259-GNA-E</td><td>NORMAL</td><td>EXTRANET</td>"
                + "<td>EXPEDIEE</td><td>8 046 F</td><td>0 F</td><td>0 F</td><td>8 046 F</td><td>2</td><td>5</td></tr>"
                + "</tbody></table>");
        String reclamations = page("<table id='reclamationListeTable'><thead><tr><th>#</th><th>Date</th>"
                + "<th>N° Réclamation</th><th>Etape</th><th>Total HT</th><th>Remise</th><th>TVA</th><th>Total TTC</th>"
                + "</tr></thead><tbody><tr><td colspan='8'>Aucune donnée disponible dans le tableau</td></tr></tbody></table>");
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/CommandeAttente", Reponse.html(attente));
            f.routeAppel("/DetailCommandeAttente", a -> {
                JSONArray d = new JSONArray();
                int n = "IDCommandeAttente=29683".equals(a.requete) ? 1
                        : "IDCommandeAttente=29941".equals(a.requete) ? 3 : -1;
                if (n < 0) {
                    return null;
                }
                for (int i = 0; i < n; i++) {
                    d.put(new JSONObject().put("Designation", "ART " + a.requete.substring(18) + "-" + i)
                            .put("QuantiteCommmande", i + 2).put("PrixCession", "795 F").put("PrixPublic", "1 175 F"));
                }
                return jsonHtml(new JSONObject().put("succes", true).put("data", d));
            });
            f.route("/commandeHistorique", Reponse.html(historique));
            f.route("/historiqueReclamation", Reponse.html(reclamations));
            List<Ligne> at = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_COMMANDES_ATTENTE).lignes;
            assertEquals(4, at.size());
            assertEquals(Arrays.asList("17/10/2026 12:52:00", "ART 29683-0", "2", "795 F", "1 175 F"),
                    at.get(0).cellules);
            assertEquals(Arrays.asList("29/10/2026 13:03:22", "ART 29941-2", "4", "795 F", "1 175 F"),
                    at.get(3).cellules);
            List<Ligne> h = ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_HISTORIQUE_COMMANDES).lignes;
            assertEquals(2, h.size());
            assertEquals(Arrays.asList("05/11/2026 19:03:57", "26030913259-GNA-E", "NORMAL", "EXTRANET", "EXPEDIEE",
                    "8 046 F", "0 F", "0 F", "8 046 F", "2", "5"), h.get(1).cellules);
            assertEquals(0, ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_RECLAMATIONS).lignes.size(),
                    "ligne « aucune donnée » ignorée");
            assertTrue(nonGet(f).isEmpty());
        }
    }

    @Test
    void reponsesQuiNeRessemblentPlusAuReleve() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/catalogueProduit",
                    Reponse.html(page(select("ChooseAgence", new String[][] { { "3", "GAGNOA" } }, 0))));
            f.route("/produitpromo", jsonHtml(new JSONObject().put("succes", false).put("data", new JSONArray())));
            f.route("/produitpromoExclusive",
                    jsonHtml(new JSONObject().put("succes", true).put("donnees", new JSONArray())));
            f.route("/catalogueProduitTableData", jsonHtml(new JSONObject().put("succes", true).put("data",
                    new JSONArray().put(new JSONObject().put("CodeInterneProduit", "X")))));
            f.route("/NosReaprovisionnements", jsonHtml(new JSONObject().put("succes", true).put("data",
                    new JSONArray().put(new JSONArray().put("cellule")))));
            f.route("/commandeHistorique", Reponse.html(page("<table id='historiqueTable'><thead><tr><th>#</th>"
                    + "<th>N° Commande</th><th>Date</th></tr></thead><tbody></tbody></table>")));
            f.route("/historiqueReclamation", Reponse.html(page("<p>rien</p>")));
            f.route("/blparquizaine", Reponse.html(page("<p>aucun choix</p>")));
            TransportExtranet t = transport(f);
            assertTrue(assertThrows(ExtranetException.class,
                    () -> ListesTedisLecteur.lire(t, ListeTedis.TEDIS_PROMOS_LABO)).getMessage().contains("succes"));
            assertTrue(assertThrows(ExtranetException.class,
                    () -> ListesTedisLecteur.lire(t, ListeTedis.TEDIS_PROMOS_EXCLUSIVES)).getMessage()
                            .contains("absent"));
            assertTrue(
                    assertThrows(ExtranetException.class, () -> ListesTedisLecteur.lire(t, ListeTedis.TEDIS_CATALOGUE))
                            .getMessage().contains("absent"));
            assertTrue(assertThrows(ExtranetException.class,
                    () -> ListesTedisLecteur.lire(t, ListeTedis.TEDIS_SORTIES_RUPTURE)).getMessage().contains("objet"));
            assertTrue(assertThrows(ExtranetException.class,
                    () -> ListesTedisLecteur.lire(t, ListeTedis.TEDIS_HISTORIQUE_COMMANDES)).getMessage()
                            .contains("colonne"));
            assertTrue(assertThrows(ExtranetException.class,
                    () -> ListesTedisLecteur.lire(t, ListeTedis.TEDIS_RECLAMATIONS)).getMessage()
                            .contains("introuvable"));
            assertTrue(assertThrows(ExtranetException.class,
                    () -> ListesTedisLecteur.lire(t, ListeTedis.TEDIS_BL_QUINZAINE)).getMessage()
                            .contains("introuvable"));
        }
        /* page de connexion a la place des donnees : session expiree, jamais une liste vide */
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/produitpromo", Reponse.html("<html><body><form method='post' id='loginForm'><input name='_token' "
                    + "type='hidden' value='x'><input name='email'><input type='password' name='password'></form></body></html>"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> ListesTedisLecteur.lire(transport(f), ListeTedis.TEDIS_PROMOS_LABO));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, e.nature());
        }
    }

    /**
     * Coherence de la mise en forme, 5 000 valeurs tirees (graine fixe) : un montant garde sa valeur exacte, jamais de
     * zero inutile ; la disponibilite vaut Oui si et seulement si la valeur est positive ; texte sans balise ni espace
     * double ; null : vide (Non pour la disponibilite).
     */
    @Test
    void coherenceDesValeurs() {
        Random r = new Random(20261108);
        for (int i = 0; i < 5000; i++) {
            long entier = r.nextInt(2_000_000) - 1000;
            String dec = String.format("%06d", r.nextInt(1_000_000));
            String brut = entier + "." + dec;
            String m = ListesTedisLecteur.valeur(r.nextBoolean() ? brut : new BigDecimal(brut).doubleValue() + "",
                    Genre.MONTANT);
            assertEquals(0,
                    new BigDecimal(m).compareTo(
                            new BigDecimal(brut).setScale(6, java.math.RoundingMode.HALF_UP).stripTrailingZeros()),
                    brut + " -> " + m);
            assertTrue(!m.contains(".") || !m.endsWith("0"), "zero inutile : " + m);
            int n = r.nextInt(7) - 2;
            String d = ListesTedisLecteur.valeur(r.nextBoolean() ? (Object) n : String.valueOf(n), Genre.DISPO);
            assertEquals(n > 0 ? "Oui" : "Non", d, String.valueOf(n));
            String t = ListesTedisLecteur.valeur("  <b>A</b>  " + i + "  <i>x</i> ", Genre.TEXTE);
            assertEquals("A " + i + " x", t);
        }
        assertEquals("", ListesTedisLecteur.valeur(JSONObject.NULL, Genre.TEXTE));
        assertEquals("Non", ListesTedisLecteur.valeur(null, Genre.DISPO));
        assertEquals("Oui", ListesTedisLecteur.valeur(true, Genre.DISPO));
        assertEquals("0", ListesTedisLecteur.valeur("0.000000", Genre.MONTANT));
        assertEquals("1200", ListesTedisLecteur.valeur("1200.000000", Genre.MONTANT));
        assertEquals("1 200 F", ListesTedisLecteur.valeur("1 200 F", Genre.MONTANT), "texte non numerique garde");
        assertEquals(1000, ListesTedisLecteur.valeur("x".repeat(5000), Genre.TEXTE).length());
    }

    @Test
    void descriptionDesListes() {
        assertEquals(10, ListeTedis.values().length);
        for (ListeTedis l : ListeTedis.values()) {
            assertTrue(l.name().startsWith("TEDIS_"), "nom unique entre extranets");
            assertTrue(l.module().length() <= 40, "colonne module");
            JSONArray c = l.description().getJSONArray("colonnes");
            assertEquals(l.colonnes.size() + (l.colonneContexte() == null ? 0 : 1), c.length());
            assertTrue(l.description().getString("libelle").length() > 3);
        }
        assertEquals(ListeTedis.TEDIS_CATALOGUE, ListeTedis.parCode("tedis_catalogue"));
        assertNull(ListeTedis.parCode("CATALOGUE"));
    }
}
