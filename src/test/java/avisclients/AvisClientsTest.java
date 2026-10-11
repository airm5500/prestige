package avisclients;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class AvisClientsTest {

    private static JSONObject corps() {
        return new JSONObject().put("note", 4).put("duree", 15000).put("site", "");
    }

    /* ------------------------------------------------------------------ saisie */

    @Test
    void noteObligatoireEntre1Et5() {
        assertThrows(IllegalArgumentException.class, () -> Saisie.lire(corps().put("note", 0)));
        assertThrows(IllegalArgumentException.class, () -> Saisie.lire(corps().put("note", 6)));
        assertThrows(IllegalArgumentException.class, () -> Saisie.lire(corps().put("note", "5; DROP TABLE x")));
        assertEquals(5, Saisie.lire(corps().put("note", 5)).note);
    }

    @Test
    void textesNettoyes() {
        Saisie s = Saisie.lire(corps().put("texte",
                "Bon accueil<script>alert(1)</script>\u0000‮ ' OR 1=1 --\r\n\r\n\r\n\r\nmerci   beaucoup"));
        assertEquals("Bon accueil alert(1) ' OR 1=1 --\n\nmerci beaucoup", s.texte);
        assertEquals(Saisie.MAX_TEXTE, Saisie.lire(corps().put("texte", repeter('a', 5000))).texte.length());
        assertNull(Saisie.lire(corps().put("texte", "   <b></b>  ")).texte);
        assertEquals("Awa la caissiere", Saisie.lire(corps().put("employe", "Awa\nla   caissiere")).employe);
        assertEquals(Saisie.MAX_EMPLOYE, Saisie.lire(corps().put("employe", repeter('b', 500))).employe.length());
    }

    @Test
    void criteresInconnusEcartes() {
        Saisie s = Saisie.lire(corps().put("criteres", new JSONObject().put("ACCUEIL", "PLUS").put("ATTENTE", "MOINS")
                .put("PIRATE", "PLUS").put("PRIX", "<x>")));
        assertEquals("ACCUEIL=PLUS,ATTENTE=MOINS", s.criteresTexte());
        assertEquals(s.criteres, Saisie.criteres(s.criteresTexte()));
    }

    @Test
    void coordonnees() {
        Saisie anonyme = Saisie.lire(corps().put("anonyme", true).put("nom", "X").put("telephone", "0700000000"));
        assertTrue(anonyme.anonyme);
        assertNull(anonyme.nom);
        assertNull(anonyme.telephone);
        Saisie s = Saisie.lire(corps().put("anonyme", false).put("nom", "Kouassi").put("telephone", "07 08 09 10 11")
                .put("email", "K.A@Exemple.ci").put("rappel", true));
        assertFalse(s.anonyme);
        assertEquals("07 08 09 10 11", s.telephone);
        assertEquals("k.a@exemple.ci", s.email);
        assertTrue(s.rappel);
        assertThrows(IllegalArgumentException.class,
                () -> Saisie.lire(corps().put("anonyme", false).put("telephone", "07<script>")));
        assertThrows(IllegalArgumentException.class,
                () -> Saisie.lire(corps().put("anonyme", false).put("email", "a@b';--")));
        /* coordonnees vides : avis anonyme, pas de rappel possible */
        Saisie vide = Saisie.lire(corps().put("anonyme", false).put("rappel", true));
        assertTrue(vide.anonyme);
        assertFalse(vide.rappel);
    }

    @Test
    void robotsReperes() {
        assertTrue(Saisie.lire(corps().put("site", "http://spam")).robot);
        assertTrue(Saisie.lire(corps().put("duree", 300)).robot);
        assertFalse(Saisie.lire(corps()).robot);
    }

    @Test
    void celluleTableurNeutralisee() {
        assertEquals("'=HYPERLINK(\"x\")", Texte.cellule("=HYPERLINK(\"x\")"));
        assertEquals("'+33", Texte.cellule("+33"));
        assertEquals("Bien", Texte.cellule("Bien"));
    }

    /* ------------------------------------------------------------------ limiteur */

    @Test
    void limiteParAdresseEtParJour() {
        Limiteur l = new Limiteur(4);
        long t = 1_000_000_000L;
        assertTrue(l.accepter("a", 2, t));
        assertTrue(l.accepter("a", 2, t + 1));
        assertFalse(l.accepter("a", 2, t + 2), "3e avis de la meme adresse dans l'heure");
        assertTrue(l.accepter("b", 2, t + 3));
        assertTrue(l.accepter("a", 2, t + 3_600_001L), "une heure plus tard");
        assertFalse(l.accepter("c", 2, t + 3_600_002L), "plafond du jour atteint");
    }

    /* ------------------------------------------------------------------ analyse */

    private static int seq;

    private static Avis avis(int note, String texte, String employe, String criteres, int ilYaJours) {
        return new Avis("A" + (++seq), LocalDateTime.now().minusDays(ilYaJours), note, Saisie.criteres(criteres), texte,
                employe, "NOUVEAU", false);
    }

    @Test
    void employesRapprochesMalgreLesVariantes() {
        List<Avis> l = new ArrayList<>();
        l.add(avis(1, "Très impolie à la caisse", "Mme Awa", "ACCUEIL=MOINS", 2));
        l.add(avis(2, "Awa m'a mal parlé", "awah", "ACCUEIL=MOINS", 1));
        l.add(avis(5, "Excellent conseil", "Dr Koné", null, 3));
        l.add(avis(1, "Attente interminable", "AWA", "ATTENTE=MOINS", 0));
        Map<String, String> personnel = new HashMap<>();
        personnel.put("awa traore", "Awa TRAORE (atraore)");
        personnel.put("ibrahim kone", "Ibrahim KONE (ikone)");
        JSONArray e = Analyse.employes(l, personnel);
        assertEquals(2, e.length(), e.toString());
        JSONObject awa = e.getJSONObject(0);
        assertEquals(3, awa.getInt("nombre"));
        assertEquals(3, awa.getInt("negatifs"));
        assertEquals(1.3, awa.getDouble("moyenne"));
        assertEquals("Awa TRAORE (atraore)", awa.getString("correspondance"));
        assertEquals(2, awa.getJSONObject("criteresNegatifs").getInt("Accueil"));
        assertEquals("Ibrahim KONE (ikone)", e.getJSONObject(1).getString("correspondance"));
        assertFalse(Analyse.memePersonne("ali", "alia"));
        assertFalse(Analyse.memePersonne("awa", "ava"));
        assertTrue(Analyse.memePersonne("kouassi", "kouasi"));
        assertTrue(Analyse.memePersonne("christelle", "cristelle"));
    }

    @Test
    void motsClesEtThemes() {
        List<Avis> l = new ArrayList<>();
        l.add(avis(1, "Temps d'attente trop long, très long", null, null, 1));
        l.add(avis(2, "Attente longue à la caisse", null, null, 2));
        l.add(avis(5, "Pharmaciens très aimables et bons conseils", null, null, 3));
        l.add(avis(5, "Personnel aimable, bon conseil", null, null, 4));
        JSONArray m = Analyse.motsCles(l, 40);
        Map<String, JSONObject> parMot = new HashMap<>();
        for (int i = 0; i < m.length(); i++) {
            parMot.put(m.getJSONObject(i).getString("cle"), m.getJSONObject(i));
        }
        assertEquals(2, parMot.get("attente").getInt("nombre"), m.toString());
        assertEquals("negatif", parMot.get("attente").getString("ton"));
        assertEquals("positif", parMot.get("aimable").getString("ton"), "aimables rapproche de aimable");
        assertEquals(2, parMot.get("conseil").getInt("nombre"), "conseils rapproche de conseil");
        assertFalse(parMot.containsKey("tres"), "mot vide ecarte");
        assertEquals("aimable", parMot.get("aimable").getString("mot"));
        JSONArray t = Analyse.themes(l, Collections.emptyList());
        JSONObject attente = null;
        for (int i = 0; i < t.length(); i++) {
            if ("Attente".equals(t.getJSONObject(i).getString("theme"))) {
                attente = t.getJSONObject(i);
            }
        }
        assertEquals(2, attente.getInt("negatifs"));
    }

    @Test
    void syntheseEtAlertes() {
        List<Avis> l = new ArrayList<>();
        l.add(avis(1, "Mal reçu", "Awa", "ACCUEIL=MOINS", 1));
        l.add(avis(2, "Impolie", "Awa", "ACCUEIL=MOINS", 2));
        l.add(avis(5, "Parfait", null, "CONSEIL=PLUS", 3));
        l.add(new Avis("R1", LocalDateTime.now(), 4, new HashMap<>(), "Bien", null, "TRAITE", true));
        List<Avis> avant = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            avant.add(avis(5, "Super", null, null, 40));
        }
        JSONObject r = Analyse.analyser(l, avant, LocalDate.now().minusDays(29), LocalDate.now(), new HashMap<>());
        JSONObject s = r.getJSONObject("synthese");
        assertEquals(4, s.getInt("nombre"));
        assertEquals(3.0, s.getDouble("moyenne"));
        assertEquals(50.0, s.getDouble("satisfaits"));
        assertEquals(2, s.getInt("negatifsNonTraites"));
        assertEquals(1, s.getInt("reponsesAttendues"));
        assertEquals(30, r.getJSONArray("evolution").length(), "30 jours -> un point par jour");
        String alertes = r.getJSONArray("alertes").toString();
        assertTrue(alertes.contains("2 avis à 1 ou 2 étoiles non traités"), alertes);
        assertTrue(alertes.contains("1 client attend une réponse"), alertes);
        assertTrue(alertes.contains("« Awa » cité dans 2 avis négatifs"), alertes);
        assertTrue(alertes.contains("Note moyenne en baisse : 3.0 contre 5.0"), alertes);
        assertTrue(r.getJSONObject("bilan").getJSONArray("faibles").toString().contains("Accueil"));
        assertEquals(5, r.getJSONArray("repartition").getJSONObject(0).getInt("note"));
    }

    @Test
    void evolutionParSemaineEtParMois() {
        assertEquals("SEMAINE",
                Analyse.evolution(new ArrayList<>(), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31))
                        .getJSONObject(0).getString("pas"));
        assertEquals(12,
                Analyse.evolution(new ArrayList<>(), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)).length());
    }

    private static String repeter(char c, int n) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < n; i++) {
            b.append(c);
        }
        return b.toString();
    }
}
