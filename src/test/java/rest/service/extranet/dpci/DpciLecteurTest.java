package rest.service.extranet.dpci;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ConnexionExtranet;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Appel;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * DPCI (structure relevee le 08/11, valeurs inventees) : connexion par le formulaire /login.action, offres en cours et
 * leurs paliers, commandes par pages, documents avec le formulaire de la page, reclamations ; session perdue (page
 * redirigee vers /login, appel .action en 500) puis reconnexion. Rapprochement source = lignes sur des donnees tirees
 * au hasard (graines fixes) ; coherence des paliers sur 5 000 cas.
 */
class DpciLecteurTest {

    static final LocalDate JOUR = LocalDate.of(2026, 11, 8);
    static final String JETON = "4A82086681CD";

    @BeforeAll
    static void sansAttente() {
        DpciLecteur.attenteOffreMs = 0;
    }

    @AfterAll
    static void attenteNormale() {
        DpciLecteur.attenteOffreMs = 1000;
    }

    /* ============================================================ outils */

    static Map<String, String> champs(String corps) {
        Map<String, String> m = new LinkedHashMap<>();
        for (String kv : (corps == null ? "" : corps).split("&")) {
            int e = kv.indexOf('=');
            if (e > 0) {
                m.put(URLDecoder.decode(kv.substring(0, e), StandardCharsets.UTF_8),
                        URLDecoder.decode(kv.substring(e + 1), StandardCharsets.UTF_8));
            }
        }
        return m;
    }

    static final String LOGIN = "<html><head><title>Login | Extranet DPCI</title></head><body>"
            + "<form method=\"post\" action=\"/login.action;jsessionid=" + JETON + "\">"
            + "<input type=\"text\" name=\"identifiant\"><input type=\"password\" name=\"password\">"
            + "<button type=\"submit\" name=\"method:submit\" value=\"Submit\">Se connecter</button>"
            + "<input type=\"checkbox\" name=\"connexionAuto\" value=\"true\" checked></form>"
            + "<form method=\"POST\" action=\"/module/compte/DemandeChangementMdp\"><input type=\"hidden\" "
            + "name=\"deblocage\"><input type=\"email\" name=\"demandeChgtMdpIdentifiant\"></form></body></html>";
    static final String CONNECTE = "<html><body><a href=\"/module/compte/Deconnexion.action\">Déconnexion</a>";

    /** Faux DPCI : connexion, pages HTML (redirigees sans session), appels .action (500 sans session). */
    static final class Faux implements AutoCloseable {
        final FauxExtranet f;
        final AtomicInteger sessions = new AtomicInteger();

        Faux() throws Exception {
            f = new FauxExtranet();
            f.route("/login", Reponse.html(LOGIN));
            f.routeAppel("/login.action;jsessionid=" + JETON, a -> {
                Map<String, String> c = champs(a.corps);
                /* comme DPCI (Struts) : sans le bouton « method:submit », la page de connexion revient, statut 200 */
                if (!"ESSAI".equals(c.get("identifiant")) || !"secret".equals(c.get("password"))
                        || !"Submit".equals(c.get("method:submit")) || !"true".equals(c.get("connexionAuto"))) {
                    return Reponse.html(LOGIN);
                }
                return new Reponse(302, "text/html", new byte[0], Map.of("Location", "/", "Set-Cookie",
                        "JSESSIONID=s" + sessions.incrementAndGet() + "; Path=/"));
            });
            f.routeAppel("/", a -> Reponse.html(CONNECTE + "Accueil</body></html>"));
        }

        boolean ouverte(Appel a) {
            return a.cookie != null && sessions.get() > 0 && a.cookie.contains("JSESSIONID=s" + sessions.get());
        }

        void page(String chemin, Function<Appel, String> html) {
            f.routeAppel(chemin, a -> ouverte(a) ? Reponse.html(html.apply(a))
                    : new Reponse(302, "text/html", new byte[0], Map.of("Location", "/login")));
        }

        void action(String chemin, Function<Appel, String> json) {
            f.routeAppel(chemin,
                    a -> ouverte(a) ? Reponse.json(json.apply(a)) : new Reponse(500, "text/html;charset=utf-8",
                            "<!doctype html><html><title>État HTTP 500</title></html>".getBytes(StandardCharsets.UTF_8),
                            null));
        }

        TransportExtranet transport(String mdp) {
            return f.transportAvecConnexion(SourceExtranet.DPCI, null,
                    new ConnexionExtranet.Identifiants("ESSAI", mdp, "e-" + mdp, "/login", null));
        }

        @Override
        public void close() {
            f.close();
        }
    }

    static Map<String, String> requete(Appel a) {
        return champs(a.requete == null ? "" : a.requete);
    }

    static void getSeulement(FauxExtranet f) {
        assertTrue(f.appels().stream().allMatch(a -> "GET".equals(a.methode) || a.chemin.startsWith("/login.action")),
                "GET seulement, hors connexion");
    }

    /* ============================================================ paliers : formulation attendue (ecrite a part) */

    /** Palier tire : operateur, bornes, avantages. */
    static final class Pal {
        String op;
        long p1, p2, ug, mt;
        double taux;

        JSONObject json() {
            return new JSONObject().put("operateur", op).put("palier1", p1).put("palier2", p2).put("uniteGratuite", ug)
                    .put("tauxRemise", taux).put("montantRemise", mt).put("indicateurCode", "QTE_CDE")
                    .put("autresUnitesGratuitesView", JSONObject.NULL);
        }

        String attendu() {
            List<String> av = new ArrayList<>();
            if (ug > 0) {
                av.add(ug + " UG");
            }
            if (taux > 0) {
                av.add(new BigDecimal(String.valueOf(taux)).stripTrailingZeros().toPlainString() + " %");
            }
            if (mt > 0) {
                av.add(mt + " F");
            }
            if (av.isEmpty()) {
                return null;
            }
            String seuil = "ENTRE".equals(op) && p2 > 0 ? p1 + " à " + p2 : "dès " + p1;
            return seuil + " : " + String.join(" + ", av);
        }
    }

    static List<Pal> tirerPaliers(Random r) {
        int n = r.nextInt(6);
        List<Pal> l = new ArrayList<>();
        long bas = 1 + r.nextInt(30);
        for (int k = 0; k < n; k++) {
            Pal p = new Pal();
            p.p1 = bas;
            boolean dernier = k == n - 1;
            p.op = dernier && r.nextBoolean() ? ">=" : "ENTRE";
            p.p2 = ">=".equals(p.op) ? 0 : bas + 1 + r.nextInt(200);
            bas = (p.p2 > 0 ? p.p2 : bas) + 1;
            switch (r.nextInt(5)) {
            case 0:
                p.taux = r.nextInt(30) + (r.nextBoolean() ? 0.5 : 0);
                break;
            case 1:
                p.mt = r.nextInt(5000);
                break;
            case 2:
                break; /* palier sans avantage : non montre */
            default:
                p.ug = r.nextInt(60);
            }
            l.add(p);
        }
        return l;
    }

    static String attendu(List<Pal> ps) {
        List<String> r = new ArrayList<>();
        for (Pal p : ps) {
            String s = p.attendu();
            if (s != null) {
                r.add(s);
            }
        }
        return String.join(" ; ", r);
    }

    @Test
    void paliersCoherence() {
        Random r = new Random(20261108);
        for (int i = 0; i < 5000; i++) {
            List<Pal> ps = tirerPaliers(r);
            /* DPCI peut les rendre dans le desordre : la lecture les remet du plus petit au plus grand */
            List<Pal> melange = new ArrayList<>(ps);
            java.util.Collections.shuffle(melange, r);
            JSONArray a = new JSONArray();
            melange.forEach(p -> a.put(p.json()));
            String lu = DpciLecteur.paliers(a);
            assertEquals(attendu(ps), lu, "cas " + i);
            long montres = ps.stream().filter(p -> p.attendu() != null).count();
            assertEquals(montres, lu.isEmpty() ? 0 : lu.split(" ; ").length, "un segment par palier avantageux");
            assertFalse(lu.contains("-"), "jamais de valeur négative");
            long ugTotal = ps.stream().mapToLong(p -> p.ug).sum(), ugLu = 0;
            for (String seg : lu.isEmpty() ? new String[0] : lu.split(" ; ")) {
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+) UG").matcher(seg);
                if (m.find()) {
                    ugLu += Long.parseLong(m.group(1));
                }
            }
            assertEquals(ugTotal, ugLu, "somme des UG lues = somme des UG de la source");
        }
        assertEquals("", DpciLecteur.paliers(null));
        assertEquals("", DpciLecteur.paliers(new JSONArray()));
    }

    /* ============================================================ offres */

    @Test
    void offresEnCoursAvecPaliersEtConnexion() throws Exception {
        Random r = new Random(11);
        JSONArray liste = new JSONArray();
        Map<String, JSONArray> details = new HashMap<>();
        Map<String, Integer> chargements = new HashMap<>();
        List<String[]> attendues = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            String code = "PART" + i;
            int numero = 1 + r.nextInt(3);
            /* une offre sur cinq est finie, une sur dix pas encore commencee : non lues */
            String debut = i % 10 == 3 ? "2026-12-01T00:00:00" : "2026-0" + (1 + r.nextInt(9)) + "-01T00:00:00";
            String fin = i % 5 == 1 ? "2026-11-07T00:00:00"
                    : i % 7 == 0 ? "2026-11-08T00:00:00" : "2027-01-31T00:00:00";
            String nom = "CAMPAGNE UG « " + i + " » & co";
            JSONObject remise = new JSONObject().put("numero", numero).put("dateDebut", debut).put("dateFin", fin)
                    .put("libelle", "remise " + i);
            liste.put(new JSONObject().put("id", code + "-" + numero).put("libelleRemise", nom).put("remise", remise)
                    .put("partenariat",
                            new JSONObject().put("code", code).put("dateDebut", debut).put("dateFin", fin)
                                    .put("laboratoire",
                                            new JSONObject().put("code", "L" + i).put("libelle", "LABO " + i))
                                    .put("societe", new JSONObject().put("code", "DREP"))));
            boolean enCours = !(i % 5 == 1) && i % 10 != 3;
            JSONArray lignes = new JSONArray();
            int n = r.nextInt(6);
            for (int k = 0; k < n; k++) {
                String pc = String.valueOf(1_000_000 + r.nextInt(8_000_000));
                String cf = r.nextInt(4) == 0 ? "" : String.valueOf(3_000_000_000_000L + r.nextInt(1_000_000));
                List<Pal> ps = tirerPaliers(r);
                JSONArray pj = new JSONArray();
                ps.forEach(p -> pj.put(p.json()));
                String lib = "PRODUIT " + i + "-" + k + " CPR BT" + (10 + r.nextInt(50));
                lignes.put(new JSONObject().put("codeProduit", pc).put("palierOffreViews", pj).put("produit",
                        new JSONObject().put("code", pc).put("codeFacture", cf).put("libelle", lib)));
                if (enCours) {
                    attendues.add(new String[] { nom, "LABO " + i, debut.substring(0, 10), fin.substring(0, 10), lib,
                            pc, cf, attendu(ps), cf.isEmpty() ? pc : cf });
                }
            }
            details.put(code + "|" + numero, lignes);
            chargements.put(code, i % 4 == 0 ? 2 : 0);
        }
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_OFFRES, a -> CONNECTE + "offres</body></html>");
            x.action(DpciLecteur.OFFRES, a -> new JSONObject().put("allOffresList", liste).toString());
            x.action(DpciLecteur.OFFRE, a -> {
                Map<String, String> q = requete(a);
                assertEquals("DREP", q.get("codeSociete"));
                String c = q.get("idPartenariat");
                int reste = chargements.get(c);
                if (reste > 0) {
                    chargements.put(c, reste - 1);
                    return new JSONObject().put("offreVue", new JSONObject().put("loading", true)).toString();
                }
                return new JSONObject().put("offreVue", new JSONObject().put("loading", false).put("offreLigneList",
                        details.get(c + "|" + q.get("numeroRemise")))).toString();
            });
            TransportExtranet t = x.transport("secret");
            List<Ligne> l = DpciLecteur.lire(t, ListeDpci.DPCI_OFFRES, JOUR);
            assertEquals(attendues.size(), l.size(), "une ligne par produit des offres en cours");
            assertTrue(l.size() > 20, "jeu d'essai suffisant : " + l.size());
            for (int k = 0; k < l.size(); k++) {
                String[] e = attendues.get(k);
                Ligne g = l.get(k);
                assertEquals(k, g.position);
                for (int c = 0; c < 8; c++) {
                    assertEquals(e[c], g.cellules.get(c), "ligne " + k + " colonne " + c);
                }
                assertEquals(e[5], g.pscode);
                assertEquals(e[8], g.cip);
            }
            assertEquals(1, x.sessions.get(), "une seule connexion");
            long lues = x.f.appels().stream().filter(a -> a.chemin.equals(DpciLecteur.OFFRE))
                    .map(a -> requete(a).get("idPartenariat")).distinct().count();
            assertEquals(30 - 6 - 3, lues, "offres finies ou futures : jamais lues");
            getSeulement(x.f);
        }
    }

    /* ============================================================ commandes */

    @Test
    void commandesParPagesAvecEtat() throws Exception {
        Random r = new Random(13);
        int n = 237;
        List<JSONObject> cmds = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            cmds.add(new JSONObject().put("numeroCommande", String.format("%09d", 13_000_000 + i))
                    .put("indiceCommande", String.valueOf(1 + r.nextInt(3)))
                    .put("date",
                            "2026-" + String.format("%02d", 1 + r.nextInt(11)) + "-0" + (1 + r.nextInt(9)) + "T"
                                    + (r.nextBoolean() ? "00:00:00" : "21:08:42"))
                    .put("referenceCommandeClient", r.nextBoolean() ? "REF" + i : "")
                    .put("etat",
                            new JSONObject().put("code", "P")
                                    .put("libelle", r.nextBoolean() ? "Bon de livraison édité" : "En préparation")
                                    .put("date", "2026-11-07T00:00:00"))
                    .put("type",
                            new JSONObject().put("code", "P").put("libelle", "Pharmaml").put("sousType",
                                    new JSONObject().put("code", "N").put("libelle",
                                            r.nextBoolean() ? "Normale" : "Urgente")))
                    .put("societe",
                            new JSONObject().put("code", "DREP").put("agence",
                                    new JSONObject().put("code", "01R").put("libelle", "Agence ABIDJAN Repartition")))
                    .put("totaux", new JSONObject().put("nombreLignes", r.nextInt(40)).put("quantite", r.nextInt(500)))
                    .put("client", new JSONObject().put("code", "10632")));
        }
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_COMMANDES, a -> CONNECTE + "commandes</body></html>");
            x.action(DpciLecteur.COMMANDES, a -> {
                Map<String, String> q = requete(a);
                assertEquals("2025-11-08", q.get("dateDebut"));
                assertEquals("2026-11-08", q.get("dateFin"));
                int s = Integer.parseInt(q.get("start")), len = Integer.parseInt(q.get("length"));
                JSONArray page = new JSONArray(cmds.subList(Math.min(s, n), Math.min(s + len, n)));
                return new JSONObject().put("draw", q.get("draw")).put("recordsTotal", n).put("recordsFiltered", n)
                        .put("data", new JSONObject().put("commandes", page)).toString();
            });
            TransportExtranet t = x.transport("secret");
            List<Ligne> l = DpciLecteur.lire(t, ListeDpci.DPCI_COMMANDES, JOUR);
            assertEquals(n, l.size());
            for (int i = 0; i < n; i++) {
                JSONObject c = cmds.get(i);
                List<String> g = l.get(i).cellules;
                String d = c.getString("date");
                assertEquals(d.endsWith("00:00:00") ? d.substring(0, 10) : d.substring(0, 10) + " 21:08", g.get(0));
                assertEquals(c.getString("numeroCommande") + "-" + c.getString("indiceCommande"), g.get(1));
                assertEquals(c.getString("referenceCommandeClient"), g.get(2));
                assertEquals(
                        "Pharmaml (" + c.getJSONObject("type").getJSONObject("sousType").getString("libelle") + ")",
                        g.get(3));
                assertEquals("Agence ABIDJAN Repartition", g.get(4));
                assertEquals(c.getJSONObject("etat").getString("libelle"), g.get(5));
                assertEquals("2026-11-07", g.get(6));
                assertEquals(String.valueOf(c.getJSONObject("totaux").getInt("nombreLignes")), g.get(7));
                assertEquals(String.valueOf(c.getJSONObject("totaux").getInt("quantite")), g.get(8));
                assertNull(l.get(i).pscode);
            }
            assertEquals(3, x.f.appels().stream().filter(a -> a.chemin.equals(DpciLecteur.COMMANDES)).count(),
                    "3 pages de 100");
            getSeulement(x.f);
        }
    }

    /* ============================================================ documents */

    static String pageDocuments(String type) {
        String client = "AVOIR".equals(type) || "FACTURE".equals(type) || "RELEVE".equals(type) ? "CODE_CLIENT_FACTURE"
                : "CODE_CLIENT_LIVRE";
        String code = "AVOIR".equals(type) ? "FACTURE" : type;
        return CONNECTE + "<form id=\"geide-form\" action=\"/module/geide/ListDocuments.action\">"
                + "<input type=\"hidden\" name=\"docuware-" + client + "\" value=\"%compteConnecte%\">"
                + "<input type=\"hidden\" name=\"docuware-CODE_DOCUMENT\" value=\"" + code + "\">"
                + "<input type=\"hidden\" name=\"docuware-TYPE_DOCUMENT\" value=\"" + type + "\">"
                + ("RELEVE".equals(type) ? ""
                        : "<input type=\"hidden\" name=\"docuware-CODE_ETABLISSEMENT\" value=\"DREP\">")
                + ("AVOIR".equals(type) ? "<input type=\"hidden\" name=\"docuware_empty-CODE_OD\" value=\"EMPTY()\">"
                        : "")
                + "<input type=\"text\" name=\"docuware-NUMERO_FACTURE\" value=\"\">"
                + "<input type=\"date\" name=\"docuware_debut-DATE_DOCUMENT\" value=\"2026-10-08\">"
                + "<input type=\"date\" name=\"docuware_fin-DATE_DOCUMENT\" value=\"2026-11-08\">"
                + "<input type=\"checkbox\" name=\"selectIdDocument\" value=\"x\"></form></body></html>";
    }

    static JSONObject champDoc(Object v) {
        return new JSONObject().put("value", v == null ? JSONObject.NULL : v);
    }

    @Test
    void documentsAvecLeFormulaireDeLaPage() throws Exception {
        Random r = new Random(17);
        Map<String, List<JSONObject>> docs = new HashMap<>();
        for (String type : new String[] { "BL", "FACTURE", "RELEVE", "AVOIR" }) {
            List<JSONObject> l = new ArrayList<>();
            int n = "RELEVE".equals(type) ? 0 : "AVOIR".equals(type) ? 56 : 100 + r.nextInt(150);
            if ("RELEVE".equals(type)) {
                n = 24;
            }
            for (int i = 0; i < n; i++) {
                long ht = 1000 + r.nextInt(500_000);
                if ("AVOIR".equals(type)) {
                    ht = -ht;
                }
                long ttc = ht + (ht / 100);
                JSONObject f = new JSONObject()
                        .put("DATE_DOCUMENT",
                                champDoc("2026-1" + r.nextInt(2) + "-0" + (1 + r.nextInt(9)) + "T00:00:00"))
                        .put("NOM_DOCUMENT", champDoc("N" + type + i)).put("NUMERO_BL", champDoc("0149" + i))
                        .put("NUMERO_COMMANDE", champDoc(r.nextInt(5) == 0 ? null : "0138" + i))
                        .put("NUMERO_FACTURE", champDoc("R11" + i))
                        .put("NUMERO_RELEVE", champDoc(r.nextBoolean() ? "1063" + i : null))
                        .put("MONTANT_HT", champDoc("BL".equals(type) || "RELEVE".equals(type) ? null : ht))
                        .put("MONTANT_TTC", champDoc("BL".equals(type) || "RELEVE".equals(type) ? null : ttc))
                        .put("CODE_AGENCE", champDoc("01R"))
                        .put("LIBELLE_AGENCE", champDoc("Agence ABIDJAN   Repartition"))
                        .put("DWDOCID", champDoc(125_690_000 + i));
                l.add(new JSONObject().put("fieldMap", f));
            }
            docs.put(type, l);
        }
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_DOCUMENTS, a -> pageDocuments(requete(a).get("typeDocument")));
            x.action(DpciLecteur.DOCUMENTS, a -> {
                Map<String, String> q = requete(a);
                String type = q.get("docuware-TYPE_DOCUMENT");
                assertEquals("2025-11-08", q.get("docuware_debut-DATE_DOCUMENT"), "profondeur d'un an");
                assertEquals("2026-11-08", q.get("docuware_fin-DATE_DOCUMENT"));
                assertTrue(q.containsValue("%compteConnecte%"), "compte du formulaire repris tel quel");
                assertFalse(q.containsKey("selectIdDocument"));
                if ("AVOIR".equals(type)) {
                    assertEquals("FACTURE", q.get("docuware-CODE_DOCUMENT"));
                    assertEquals("EMPTY()", q.get("docuware_empty-CODE_OD"));
                    assertEquals("%compteConnecte%", q.get("docuware-CODE_CLIENT_FACTURE"));
                }
                List<JSONObject> l = docs.get(type);
                int s = Integer.parseInt(q.get("start")), len = Integer.parseInt(q.get("length"));
                JSONArray page = new JSONArray(l.subList(Math.min(s, l.size()), Math.min(s + len, l.size())));
                return new JSONObject().put("recordsTotal", l.size()).put("recordsFiltered", l.size())
                        .put("data", new JSONObject().put("itemList", page)).toString();
            });
            TransportExtranet t = x.transport("secret");
            Map<ListeDpci, String> types = Map.of(ListeDpci.DPCI_BL, "BL", ListeDpci.DPCI_FACTURES, "FACTURE",
                    ListeDpci.DPCI_RELEVES, "RELEVE", ListeDpci.DPCI_AVOIRS, "AVOIR");
            for (Map.Entry<ListeDpci, String> e : types.entrySet()) {
                List<Ligne> l = DpciLecteur.lire(t, e.getKey(), JOUR);
                List<JSONObject> src = docs.get(e.getValue());
                assertEquals(src.size(), l.size(), e.getValue());
                long somme = 0, sommeLue = 0;
                for (int i = 0; i < l.size(); i++) {
                    JSONObject f = src.get(i).getJSONObject("fieldMap");
                    List<String> g = l.get(i).cellules;
                    assertEquals(e.getKey().colonnes.size(), g.size());
                    assertEquals(f.getJSONObject("DATE_DOCUMENT").getString("value").substring(0, 10), g.get(0));
                    String cmd = f.getJSONObject("NUMERO_COMMANDE").isNull("value") ? ""
                            : f.getJSONObject("NUMERO_COMMANDE").getString("value");
                    switch (e.getValue()) {
                    case "BL":
                        assertEquals(f.getJSONObject("NUMERO_BL").getString("value"), g.get(1));
                        assertEquals(cmd, g.get(2));
                        assertEquals("Agence ABIDJAN Repartition", g.get(4), "espaces repliés");
                        break;
                    case "RELEVE":
                        Object rel = f.getJSONObject("NUMERO_RELEVE").opt("value");
                        assertEquals(rel == JSONObject.NULL ? "N" + "RELEVE" + i : rel, g.get(1));
                        break;
                    default:
                        assertEquals(f.getJSONObject("NUMERO_FACTURE").getString("value"), g.get(1));
                        assertEquals(cmd, g.get(2));
                        long ht = f.getJSONObject("MONTANT_HT").getLong("value");
                        assertEquals(String.valueOf(ht), g.get(5));
                        assertEquals(String.valueOf(f.getJSONObject("MONTANT_TTC").getLong("value")), g.get(6));
                        somme += ht;
                        sommeLue += Long.parseLong(g.get(5));
                        if ("AVOIR".equals(e.getValue())) {
                            assertTrue(g.get(5).startsWith("-"), "avoir : montant négatif gardé");
                        }
                    }
                }
                assertEquals(somme, sommeLue, "total HT lu = total HT source (" + e.getValue() + ")");
            }
            assertEquals(1, x.sessions.get());
            getSeulement(x.f);
        }
    }

    /* ============================================================ reclamations et session perdue */

    @Test
    void reclamationsEtReconnexion() throws Exception {
        List<JSONObject> recl = new ArrayList<>();
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_RECLAMATIONS, a -> CONNECTE + "reclamations</body></html>");
            x.action(DpciLecteur.RECLAMATIONS, a -> new JSONObject().put("recordsTotal", recl.size())
                    .put("recordsFiltered", recl.size()).put("data", new JSONArray(recl)).toString());
            TransportExtranet t = x.transport("secret");
            assertTrue(DpciLecteur.lire(t, ListeDpci.DPCI_RECLAMATIONS, JOUR).isEmpty(), "aucune réclamation");
            for (int i = 0; i < 3; i++) {
                recl.add(new JSONObject().put("id", 500 + i).put("idCommande", "01381" + i)
                        .put("societe", new JSONObject().put("agence", new JSONObject().put("libelle", "Agence " + i)))
                        .put("statut", i == 1 ? "Transmise" : new JSONObject().put("libelle", "Traitée"))
                        .put("dateCreation", "2026-10-0" + (i + 1) + "T10:15:00").put("dateModif", JSONObject.NULL));
            }
            /* DPCI oublie la session : la page redirige vers /login, une reconnexion, puis la liste */
            x.sessions.incrementAndGet();
            List<Ligne> l = DpciLecteur.lire(t, ListeDpci.DPCI_RECLAMATIONS, JOUR);
            assertEquals(3, x.sessions.get(), "une reconnexion");
            assertEquals(3, l.size());
            assertEquals(List.of("501", "013811", "Agence 1", "Transmise", "2026-10-02 10:15", ""), l.get(1).cellules);
            assertEquals("Traitée", l.get(2).cellules.get(3));
            getSeulement(x.f);
        }
        /* mauvais mot de passe : refus, aucune liste lue */
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_COMMANDES, a -> CONNECTE + "</body></html>");
            TransportExtranet t = x.transport("faux");
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> DpciLecteur.lire(t, ListeDpci.DPCI_COMMANDES, JOUR));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
            assertTrue(x.f.appels().stream().noneMatch(a -> a.chemin.equals(DpciLecteur.COMMANDES)));
        }
    }

    @Test
    void reponseInattendueArreteLaLecture() throws Exception {
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_COMMANDES, a -> CONNECTE + "</body></html>");
            x.action(DpciLecteur.COMMANDES,
                    a -> new JSONObject().put("recordsTotal", 3).put("data", new JSONObject()).toString());
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> DpciLecteur.lire(x.transport("secret"), ListeDpci.DPCI_COMMANDES, JOUR));
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
        }
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_DOCUMENTS, a -> CONNECTE + "sans formulaire</body></html>");
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> DpciLecteur.lire(x.transport("secret"), ListeDpci.DPCI_BL, JOUR));
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
        }
    }

    @Test
    void journalSansJetonDeSession() {
        assertEquals("pro2.dpci.ci/login.action", ConnexionExtranet
                .cheminJournal(java.net.URI.create("https://pro2.dpci.ci/login.action;jsessionid=" + JETON + "?x=1")));
        assertEquals("pro2.dpci.ci/login",
                ConnexionExtranet.cheminJournal(java.net.URI.create("https://pro2.dpci.ci/login")));
        assertEquals("h/a/b", ConnexionExtranet.cheminJournal(java.net.URI.create("http://h/a;JSESSIONID=1/b")));
    }

    @Test
    void outilsEtListes() {
        assertEquals("2026-11-07", DpciLecteur.date("2026-11-07T00:00:00"));
        assertEquals("2026-11-07 21:08", DpciLecteur.dateHeure("2026-11-07T21:08:42"));
        assertEquals("2026-11-07", DpciLecteur.dateHeure("2026-11-07T00:00:00"));
        assertEquals("", DpciLecteur.montant(JSONObject.NULL));
        assertEquals("-10212", DpciLecteur.montant(-10212));
        assertEquals("55260", DpciLecteur.montant(55260.0));
        assertEquals("12.5", DpciLecteur.montant("12,50"));
        assertTrue(DpciLecteur.enCours("", "", JOUR));
        assertTrue(DpciLecteur.enCours("2026-11-08T00:00:00", "2026-11-08T00:00:00", JOUR));
        assertFalse(DpciLecteur.enCours("2026-11-09T00:00:00", "", JOUR));
        assertFalse(DpciLecteur.enCours("", "2026-11-07T23:59:59", JOUR));
        assertEquals(7, ListeDpci.values().length);
        assertEquals("LISTE_DPCI_FACTURES", ListeDpci.DPCI_FACTURES.module());
        assertEquals(ListeDpci.DPCI_AVOIRS, ListeDpci.parCode(" dpci_avoirs "));
        assertNull(ListeDpci.parCode("COPHARMED_CATALOGUE"));
        assertEquals("https://pro2.dpci.ci/login", SourceExtranet.DPCI.pageConnexionParDefaut("https://pro2.dpci.ci"));
        Map<String, String> f = DpciLecteur.formulaireDocuments(pageDocuments("AVOIR"));
        assertEquals("%compteConnecte%", f.get("docuware-CODE_CLIENT_FACTURE"));
        assertFalse(f.containsKey("selectIdDocument"));
        assertNull(DpciLecteur.formulaireDocuments("<html></html>"));
    }

    /**
     * Periode choisie a l'ecran (08/11) : DPCI recoit exactement les deux dates, pour les commandes, les documents et
     * les reclamations ; sans periode, un an jusqu'au jour (rafraichissement automatique, inchange).
     */
    @Test
    void periodeTransmiseADpci() throws Exception {
        Random r = new Random(20261108L);
        List<String[]> recus = new ArrayList<>();
        try (Faux x = new Faux()) {
            x.page(DpciLecteur.PAGE_COMMANDES, a -> CONNECTE + "commandes</body></html>");
            x.action(DpciLecteur.COMMANDES, a -> {
                Map<String, String> q = requete(a);
                recus.add(new String[] { "C", q.get("dateDebut"), q.get("dateFin") });
                return new JSONObject().put("draw", q.get("draw")).put("recordsTotal", 0).put("recordsFiltered", 0)
                        .put("data", new JSONObject().put("commandes", new JSONArray())).toString();
            });
            x.page(DpciLecteur.PAGE_DOCUMENTS, a -> pageDocuments(requete(a).get("typeDocument")));
            x.action(DpciLecteur.DOCUMENTS, a -> {
                Map<String, String> q = requete(a);
                recus.add(new String[] { "D", q.get("docuware_debut-DATE_DOCUMENT"),
                        q.get("docuware_fin-DATE_DOCUMENT") });
                return new JSONObject().put("recordsTotal", 0).put("recordsFiltered", 0)
                        .put("data", new JSONObject().put("itemList", new JSONArray())).toString();
            });
            x.page(DpciLecteur.PAGE_RECLAMATIONS, a -> CONNECTE + "reclamations</body></html>");
            x.action(DpciLecteur.RECLAMATIONS, a -> {
                Map<String, String> q = requete(a);
                recus.add(new String[] { "R", q.get("dateDebut"), q.get("dateFin") });
                return new JSONObject().put("recordsTotal", 0).put("recordsFiltered", 0).put("data", new JSONArray())
                        .toString();
            });
            TransportExtranet t = x.transport("secret");
            ListeDpci[] listes = { ListeDpci.DPCI_COMMANDES, ListeDpci.DPCI_BL, ListeDpci.DPCI_FACTURES,
                    ListeDpci.DPCI_RELEVES, ListeDpci.DPCI_AVOIRS, ListeDpci.DPCI_RECLAMATIONS };
            for (int cas = 0; cas < 30; cas++) {
                LocalDate du = JOUR.minusDays(r.nextInt(400)), au = cas % 3 == 0 ? du : du.plusDays(r.nextInt(366));
                ListeDpci l = listes[cas % listes.length];
                recus.clear();
                assertTrue(DpciLecteur.lire(t, l, du, au).isEmpty());
                assertEquals(1, recus.size(), l + " : une seule page vide");
                assertEquals(du.toString(), recus.get(0)[1], l + " du");
                assertEquals(au.toString(), recus.get(0)[2], l + " au");
            }
            recus.clear();
            DpciLecteur.lire(t, ListeDpci.DPCI_COMMANDES, JOUR);
            assertEquals("2025-11-08", recus.get(0)[1], "sans periode : un an");
            assertEquals("2026-11-08", recus.get(0)[2]);
            getSeulement(x.f);
        }
        TransportExtranet sans = null;
        assertThrows(IllegalArgumentException.class, () -> DpciLecteur.lire(sans, ListeDpci.DPCI_BL, JOUR, JOUR));
    }

    /** Offre en cours pendant la periode = chevauchement des intervalles (oracle independant, 20 000 cas). */
    @Test
    void offreEnCoursPendantLaPeriode() {
        Random r = new Random(20261108L);
        LocalDate base = LocalDate.of(2026, 1, 1);
        for (int cas = 0; cas < 20000; cas++) {
            LocalDate du = base.plusDays(r.nextInt(300)), au = du.plusDays(r.nextInt(30));
            boolean sansDebut = r.nextInt(8) == 0, sansFin = r.nextInt(8) == 0;
            LocalDate d = base.plusDays(r.nextInt(330)), f = d.plusDays(r.nextInt(60));
            String debut = sansDebut ? "" : d + (r.nextBoolean() ? "T00:00:00" : "T23:59:59");
            String fin = sansFin ? "" : f + "T00:00:00";
            boolean attendu = (sansDebut || !d.isAfter(au)) && (sansFin || !f.isBefore(du));
            assertEquals(attendu, DpciLecteur.enCours(debut, fin, du, au),
                    debut + " / " + fin + " / " + du + ".." + au);
            assertEquals(DpciLecteur.enCours(debut, fin, du), DpciLecteur.enCours(debut, fin, du, du));
        }
    }
}
