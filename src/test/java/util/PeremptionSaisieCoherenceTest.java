package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.YearMonth;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Random;
import javax.script.Invocable;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 16.1 : lecture de la date de peremption tapee au clavier. Coherence sur des milliers de dates
 * tirees au hasard (graine fixe), dans tous les formats : la date lue est celle ecrite (jour donne) ou le dernier jour
 * du mois (mois et annee seulement) ; une date passee ou impossible est refusee avec un motif ; les deux formes a 6
 * chiffres ne se confondent jamais.
 */
class PeremptionSaisieCoherenceTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 22);

    private static String d2(int v) {
        return String.format("%02d", v);
    }

    @Test
    void chaqueFormeDonneLaDateEcriteOuLaFinDuMois() {
        Random r = new Random(161_2211L);
        String[] seps = { "/", "-", "." };
        for (int i = 0; i < 6000; i++) {
            LocalDate d = AUJOURDHUI.plusDays(r.nextInt(365 * 30));
            String j = d2(d.getDayOfMonth()), m = d2(d.getMonthValue()), a4 = String.valueOf(d.getYear()),
                    a2 = a4.substring(2);
            String sep = seps[r.nextInt(3)];
            LocalDate fin = YearMonth.from(d).atEndOfMonth();
            /* jour donne */
            for (String s : new String[] { j + m + a2, j + m + a4, j + sep + m + sep + a2, j + sep + m + sep + a4,
                    Integer.parseInt(j) + sep + Integer.parseInt(m) + sep + a4 }) {
                PeremptionSaisie.Resultat res = PeremptionSaisie.lire(s, AUJOURDHUI);
                if (s.length() == 6 && m.equals("20")) {
                    continue; // impossible : un mois ne vaut jamais 20
                }
                assertTrue(res.isValide(), s + " -> " + res.getMotif());
                assertEquals(d, res.getDate(), s);
            }
            /* mois et annee seulement : dernier jour du mois */
            for (String s : new String[] { m + "/" + a2, m + sep + a4, m + a4 }) {
                PeremptionSaisie.Resultat res = PeremptionSaisie.lire(s, AUJOURDHUI);
                assertTrue(res.isValide(), s + " -> " + res.getMotif());
                assertEquals(fin, res.getDate(), s);
            }
        }
    }

    @Test
    void lesDeuxFormesASixChiffresNeSeConfondentJamais() {
        Random r = new Random(2211L);
        for (int i = 0; i < 5000; i++) {
            String s = String.format("%06d", r.nextInt(1_000_000));
            LocalDate d;
            try {
                d = PeremptionSaisie.interpreter(s);
            } catch (java.time.DateTimeException e) {
                continue; // date impossible : refusee
            }
            assertNotNull(d, s);
            if (s.startsWith("20", 2)) {
                /* MMAAAA : fin du mois de l'annee 20AA */
                assertEquals(YearMonth.of(Integer.parseInt(s.substring(2)), Integer.parseInt(s.substring(0, 2)))
                        .atEndOfMonth(), d, s);
            } else {
                /* JJMMAA : le jour et le mois tels qu'ecrits */
                assertEquals(Integer.parseInt(s.substring(0, 2)), d.getDayOfMonth(), s);
                assertEquals(Integer.parseInt(s.substring(2, 4)), d.getMonthValue(), s);
                assertEquals(2000 + Integer.parseInt(s.substring(4)), d.getYear(), s);
            }
        }
    }

    @Test
    void datesPasseesEtImpossiblesRefusees() {
        Random r = new Random(1322L);
        for (int i = 0; i < 3000; i++) {
            LocalDate d = AUJOURDHUI.minusDays(1 + r.nextInt(365 * 20));
            String s = d2(d.getDayOfMonth()) + "/" + d2(d.getMonthValue()) + "/" + d.getYear();
            PeremptionSaisie.Resultat res = PeremptionSaisie.lire(s, AUJOURDHUI);
            assertFalse(res.isValide(), s);
            assertTrue(res.getMotif().startsWith("Date passée"), s + " " + res.getMotif());
        }
        for (String s : new String[] { "13/27", "32/01/27", "00/27", "310227", "30022028", "29/02/2027", "abc",
                "1/2/3/4", "0127" }) {
            PeremptionSaisie.Resultat res = PeremptionSaisie.lire(s, AUJOURDHUI);
            assertFalse(res.isValide(), s);
            assertFalse(res.getMotif().isEmpty(), s);
        }
        assertFalse(PeremptionSaisie.lire("", AUJOURDHUI).isValide());
        assertFalse(PeremptionSaisie.lire(null, AUJOURDHUI).isValide());
    }

    @Test
    void exemplesDuPlan() {
        assertEquals(LocalDate.of(2027, 1, 31), PeremptionSaisie.lire("01/27", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2027, 1, 31), PeremptionSaisie.lire("012027", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2027, 1, 1), PeremptionSaisie.lire("010127", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2027, 1, 1), PeremptionSaisie.lire("01012027", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2027, 1, 1), PeremptionSaisie.lire("01-01-27", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2027, 1, 1), PeremptionSaisie.lire("01/01/27", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2027, 1, 1), PeremptionSaisie.lire("01-01-2027", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2028, 2, 29), PeremptionSaisie.lire("02/28", AUJOURDHUI).getDate());
        assertEquals(LocalDate.of(2026, 11, 30), PeremptionSaisie.lire("11/26", AUJOURDHUI).getDate());
        assertTrue(PeremptionSaisie.lire("22/11/2026", AUJOURDHUI).isValide());
    }

    /**
     * L'ecran (view/commun/PeremptionSaisie.js, apercu pendant la frappe) et le serveur lisent la meme date pour les
     * memes saisies, tirees au hasard dans toutes les formes, valides ou non.
     */
    @Test
    void ecranEtServeurLisentLaMemeDate() throws Exception {
        ScriptEngine js = new ScriptEngineManager().getEngineByName("nashorn");
        org.junit.jupiter.api.Assumptions.assumeTrue(js != null, "moteur JavaScript absent");
        js.eval("var module = {exports: {}};");
        js.eval(new String(Files.readAllBytes(Paths.get("src/main/webapp/general/app/view/commun/PeremptionSaisie.js")),
                StandardCharsets.UTF_8));
        js.eval("function lireTexte(s) { var r = module.exports.lire(s, new Date(2026, 10, 22)); return r.date ? r.texte : 'REFUS'; }");
        Random r = new Random(1612211L);
        String[] seps = { "/", "-", ".", "" };
        int valides = 0;
        for (int i = 0; i < 8000; i++) {
            String s;
            int forme = r.nextInt(5);
            String j = d2(r.nextInt(34)), m = d2(r.nextInt(15)),
                    a = r.nextBoolean() ? d2(r.nextInt(100)) : String.valueOf(2000 + r.nextInt(80));
            String sep = seps[r.nextInt(4)];
            if (forme == 0) {
                s = m + sep + a;
            } else if (forme == 1) {
                s = j + sep + m + sep + a;
            } else if (forme == 2) {
                s = String.format("%06d", r.nextInt(1_000_000));
            } else if (forme == 3) {
                s = String.format("%08d", r.nextInt(100_000_000));
            } else {
                s = m + "20" + d2(r.nextInt(100));
            }
            PeremptionSaisie.Resultat java = PeremptionSaisie.lire(s, AUJOURDHUI);
            String attendu = java.isValide() ? String.format("%02d/%02d/%04d", java.getDate().getDayOfMonth(),
                    java.getDate().getMonthValue(), java.getDate().getYear()) : "REFUS";
            valides += java.isValide() ? 1 : 0;
            assertEquals(attendu, String.valueOf(((Invocable) js).invokeFunction("lireTexte", s)), s);
        }
        assertTrue(valides > 1500, "valides : " + valides);
    }
}
