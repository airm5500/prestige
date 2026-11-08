package rest.service.extranet.mayite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;

/**
 * Lecture de Mayite (formats releves le 08/11, valeurs inventees) : liste des specialites (JSON DataTables) et
 * monographie (HTML). Rapprochement source = resultat ligne par ligne sur des lignes tirees au hasard (graine fixe).
 */
class MayiteLecteurTest {

    static final String[] NOMS = { "Codoliprane cp B/16", "AARCOLD 325MG/5MG CPR B/100", "Sirop « enfant » 125ml",
            "Amox & Clav 1g", "Vit C 500 <efferv.>" };
    static final String[] DCIS = { "Paracetamol + Codeine", "Amoxicilline", "Acide ascorbique", "" };

    static String lienDetail(String id) {
        return "<a href=\"/pro/medicament/detail/" + id + "/\"><span class='fa fa-eye'></span></a>";
    }

    @Test
    void rapprochementDesResultats() throws Exception {
        Random r = new Random(20261108);
        JSONArray data = new JSONArray();
        List<String[]> attendu = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            String id = new UUID(r.nextLong(), r.nextLong()).toString();
            String nom = NOMS[r.nextInt(NOMS.length)] + " " + i;
            String dci = DCIS[r.nextInt(DCIS.length)];
            String liste = r.nextBoolean() ? "Liste I" : "ST";
            String dosages = (100 + r.nextInt(900)) + "mg";
            int centimes = r.nextInt(5_000_000);
            String prixSource = BigDecimal.valueOf(centimes, 1).toPlainString();
            String prop = "<a href=/pro/classe/liste/>Antalgique</a>, <a href=/pro/classe/liste/>Antipyrétique</a>";
            data.put(new JSONArray().put(org.jsoup.nodes.Entities.escape(nom)).put(dci).put(liste).put(dosages)
                    .put(prop).put(prixSource).put(lienDetail(id)));
            attendu.add(new String[] { id, nom, dci, liste, dosages, "Antalgique, Antipyrétique",
                    BigDecimal.valueOf(centimes, 1).stripTrailingZeros().toPlainString() });
        }
        JSONObject res = RechercheMayite.lire(new JSONObject().put("recordsTotal", 53253).put("recordsFiltered", 497)
                .put("data", data).put("result", "ok"));
        assertEquals(53253, res.getInt("total"));
        assertEquals(497, res.getInt("trouves"));
        assertTrue(res.getBoolean("tronque"));
        JSONArray l = res.getJSONArray("resultats");
        assertEquals(100, l.length());
        for (int i = 0; i < 100; i++) {
            JSONObject o = l.getJSONObject(i);
            String[] a = attendu.get(i);
            assertEquals(a[0], o.getString("id"), "ligne " + i);
            assertEquals(a[1], o.getString("nom"), "ligne " + i + " : nom sans entites HTML");
            assertEquals(a[2], o.getString("dci"));
            assertEquals(a[3], o.getString("liste"));
            assertEquals(a[4], o.getString("dosages"));
            assertEquals(a[5], o.getString("proprietes"), "proprietes sans liens");
            assertEquals(new BigDecimal(a[6]).compareTo(new BigDecimal(o.getString("prix"))), 0, "prix ligne " + i);
        }
    }

    @Test
    void lignesIncompletesEtReponsesRefusees() throws Exception {
        JSONArray data = new JSONArray().put(new JSONArray().put("sans lien").put("x").put("x").put("x").put("x")
                .put("1.0").put("<a href=\"/autre/\">x</a>")).put(new JSONArray().put("trop courte"));
        JSONObject res = RechercheMayite
                .lire(new JSONObject().put("recordsTotal", 2).put("recordsFiltered", 0).put("data", data));
        assertEquals(0, res.getJSONArray("resultats").length());
        assertFalse(res.getBoolean("tronque"));
        assertThrows(ExtranetException.class, () -> RechercheMayite.lire(new JSONObject().put("error", "x")));
        assertThrows(ExtranetException.class, () -> RechercheMayite.lire(new JSONObject().put("data", "x")));
    }

    @Test
    void parametresEnvoyes() {
        Map<String, String> p = RechercheMayite
                .parametres(new RechercheMayite.Criteres(" doli\tprane ", "", null, "Sanofi"), 0, 100);
        assertEquals("doli prane", p.get("nom"));
        assertEquals("", p.get("dci__nom"));
        assertEquals("", p.get("formes__nom"));
        assertEquals("Sanofi", p.get("laboratoire__nom"));
        assertEquals("100", p.get("length"));
        assertEquals("0", p.get("start"));
        for (int i = 0; i < 7; i++) {
            assertEquals(String.valueOf(i), p.get("columns[" + i + "][data]"), "les 7 colonnes (sans elles : 500)");
        }
        assertTrue(p.containsKey("prix__lte") && p.containsKey("prix__gte"));
    }

    @Test
    void criteres() {
        assertNotNull(new RechercheMayite.Criteres("", " ", null, "").refus(), "aucun critere");
        assertNotNull(new RechercheMayite.Criteres("d", "", "", "").refus(), "1 caractere");
        assertNotNull(new RechercheMayite.Criteres("x".repeat(61), "", "", "").refus(), "61 caracteres");
        assertNull(new RechercheMayite.Criteres("do", "", "", "").refus());
        assertNull(new RechercheMayite.Criteres("", "paracetamol", "cpr", "").refus());
    }

    @Test
    void identifiants() {
        String id = "9a1206b3-47a0-47a6-be71-d73e36444393";
        assertEquals(id, RechercheMayite.identifiant(lienDetail(id.toUpperCase())));
        assertTrue(RechercheMayite.identifiantValide(id));
        assertFalse(RechercheMayite.identifiantValide("../../logout"));
        assertFalse(RechercheMayite.identifiantValide(id + "/../x"));
        assertFalse(RechercheMayite.identifiantValide(""));
        assertFalse(RechercheMayite.identifiantValide(null));
        assertNull(RechercheMayite.identifiant("<a href=\"/pro/classe/liste/\">x</a>"));
    }

    /** Coherence du prix : meme valeur que la source, sans zero inutile, jamais negatif invente ; 5 000 valeurs. */
    @Test
    void coherenceDesPrix() {
        Random r = new Random(20261108);
        for (int i = 0; i < 5000; i++) {
            BigDecimal v = BigDecimal.valueOf(r.nextInt(10_000_000), r.nextInt(3));
            String s = RechercheMayite.prix(v.toPlainString());
            assertEquals(0, v.compareTo(new BigDecimal(s)), "valeur " + v);
            assertFalse(s.contains(".") && s.endsWith("0"), "zero inutile : " + s);
            assertFalse(s.startsWith("-"));
        }
        assertEquals("2095", RechercheMayite.prix("2095.0"));
        assertEquals("0", RechercheMayite.prix("0.00"));
        assertEquals("", RechercheMayite.prix("n/a"));
        assertEquals("", RechercheMayite.prix(""));
    }

    static String monographie(String nom, String[][] rubriques, String[][] equivalents) {
        StringBuilder sb = new StringBuilder(
                "<html><body><section class=\"content-header\"><div class=\"header-title\">" + "<h1>" + nom
                        + "</h1><small>Monographie</small></div></section>"
                        + "<h3>DCI: Paracetamol + Codeine</h3><h3>Prix: 2095,0 FCFA</h3>"
                        + "<div class=\"tab-content\"><div id=\"tab1\" class=\"tab-pane\"><div class=\"panel-body\">");
        for (String[] rb : rubriques) {
            sb.append("<div class=\"row\"><div class=\"col-md-6\"><div class=\"cbp_tmlabel\"><h3>").append(rb[0])
                    .append("</h3><p>").append(rb[1]).append("</p></div></div></div>");
        }
        sb.append("</div></div><div id=\"tab2\" class=\"tab-pane\"><h3>").append(equivalents.length)
                .append(" Spécialités</h3><table><thead><tr><th>Spécialité</th><th>Prix (FCFA)</th><th>Actions</th>"
                        + "</tr></thead><tbody>");
        for (String[] e : equivalents) {
            sb.append("<tr><td>").append(e[1]).append("</td><td>").append(e[2]).append("</td><td>")
                    .append(lienDetail(e[0])).append("</td></tr>");
        }
        return sb.append("</tbody></table></div></div></body></html>").toString();
    }

    @Test
    void lectureDeLaMonographie() throws Exception {
        String[][] rb = { { "Formes", "Comprimé" }, { "Indications", "Douleurs<br>modérées à intenses" },
                { "Contre indications et Interactions", "Insuffisance hépatique<br/>Enfant &lt; 12 ans" },
                { "Remarques", "" } };
        String[][] eq = { { "4dcc3e21-2dad-4efc-ae94-a5976cf7aa01", "Dafalgan codéiné", "2 400,0" },
                { "4dcc3e21-2dad-4efc-ae94-a5976cf7aa02", "Klipal", "1890.0" } };
        JSONObject m = MonographieMayite.lire(monographie("Codoliprane cp B/16", rb, eq), "id-essai");
        assertEquals("Codoliprane cp B/16", m.getString("nom"));
        assertEquals("Paracetamol + Codeine", m.getString("dci"));
        assertEquals("2095,0 FCFA", m.getString("prix"));
        JSONArray r = m.getJSONArray("rubriques");
        assertEquals(4, r.length());
        assertEquals("Indications", r.getJSONObject(1).getString("titre"));
        assertEquals("Douleurs\nmodérées à intenses", r.getJSONObject(1).getString("texte"),
                "retours a la ligne gardes");
        assertEquals("Insuffisance hépatique\nEnfant < 12 ans", r.getJSONObject(2).getString("texte"));
        assertEquals("", r.getJSONObject(3).getString("texte"));
        JSONArray e = m.getJSONArray("equivalents");
        assertEquals(2, e.length());
        assertEquals("4dcc3e21-2dad-4efc-ae94-a5976cf7aa01", e.getJSONObject(0).getString("id"));
        assertEquals("Dafalgan codéiné", e.getJSONObject(0).getString("nom"));
        assertEquals("2400", e.getJSONObject(0).getString("prix"));
        assertEquals("1890", e.getJSONObject(1).getString("prix"));
        /* page qui n'est pas une monographie (connexion, erreur) : refusee */
        assertThrows(ExtranetException.class,
                () -> MonographieMayite.lire("<html><body><h1>Erreur</h1></body></html>", "x"));
        assertThrows(ExtranetException.class, () -> MonographieMayite.lire(null == null ? "" : "", "x"));
        /* texte tres long : borne */
        JSONObject longue = MonographieMayite
                .lire(monographie("X", new String[][] { { "Remarques", "a".repeat(30000) } }, new String[0][]), "x");
        assertTrue(longue.getJSONArray("rubriques").getJSONObject(0).getString("texte").length() <= 20002);
    }
}
