package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retour du 10/11/2026 : toutes les explications de parametres livrees par les migrations sont relues ici. Chacune doit
 * etre lisible par l'ecran (format {@link ExplicationParametre}), dire quelque chose a 0 et a 1 quand le parametre est
 * un interrupteur, ne porter aucune balise, et etre rattachee a un parametre que le code lit vraiment : une explication
 * ecrite pour un parametre que plus rien ne lit serait un mensonge.
 */
class ExplicationsParametresLivreesTest {

    private static final Pattern INSERTION = Pattern.compile(
            "INSERT INTO parametre_explication \\(str_KEY, explication\\)\\s*SELECT '([A-Z0-9_]+)',\\s*'(\\{.*\\})'\\s*FROM DUAL");

    /** cle -> JSON, pour toutes les migrations qui ecrivent dans parametre_explication. */
    private static Map<String, String> livrees() throws IOException {
        Map<String, String> res = new LinkedHashMap<>();
        try (Stream<Path> fichiers = Files.list(Paths.get("src/main/resources/db/migration"))) {
            for (Path f : fichiers.sorted().collect(Collectors.toList())) {
                String sql = new String(Files.readAllBytes(f), StandardCharsets.UTF_8);
                if (!sql.contains("INSERT INTO parametre_explication")) {
                    continue;
                }
                Matcher m = INSERTION.matcher(sql);
                while (m.find()) {
                    assertFalse(res.containsKey(m.group(1)), "explication livree deux fois : " + m.group(1));
                    res.put(m.group(1), m.group(2).replace("''", "'"));
                }
            }
        }
        return res;
    }

    @Test
    void chaqueExplicationLivreeEstLisibleParLEcran() throws IOException {
        Map<String, String> livrees = livrees();
        assertTrue(livrees.size() >= 30, "explications livrees : " + livrees.size());
        for (Map.Entry<String, String> e : livrees.entrySet()) {
            assertTrue(ExplicationParametre.estValide(e.getValue()), e.getKey() + " : " + e.getValue());
            JSONObject o = new JSONObject(e.getValue());
            String regle = o.getString("regle");
            assertTrue(regle.length() >= 60, e.getKey() + " : regle trop courte pour expliquer quoi que ce soit");
            String tout = e.getValue();
            assertFalse(tout.contains("<") || tout.contains(">"), e.getKey() + " : balise dans l'explication");
            assertFalse(tout.toLowerCase().contains("mediciel"), e.getKey());
            assertFalse(tout.contains(".java") || tout.contains(".js"),
                    e.getKey() + " : nom de fichier dans l'explication");
            JSONArray cas = o.optJSONArray("cas");
            if (cas != null) {
                assertTrue(cas.length() >= 2 && cas.length() <= 6, e.getKey() + " : " + cas.length() + " cas");
            }
        }
    }

    @Test
    void chaqueExplicationEstRattacheeAUnParametreQueLeCodeLit() throws IOException {
        Map<String, String> livrees = livrees();
        StringBuilder sources = new StringBuilder();
        for (String racine : new String[] { "src/main/java", "src/main/webapp/general/app" }) {
            try (Stream<Path> fichiers = Files.walk(Paths.get(racine))) {
                for (Path f : fichiers.filter(p -> p.toString().endsWith(".java") || p.toString().endsWith(".js"))
                        .collect(Collectors.toList())) {
                    sources.append(new String(Files.readAllBytes(f), StandardCharsets.UTF_8)).append('\n');
                }
            }
        }
        String code = sources.toString();
        for (String cle : livrees.keySet()) {
            // la cle telle quelle, ou assemblee a partir d'un prefixe (« SUPPORT_ » + « WATCHDOG_ENABLED »...)
            boolean lue = code.contains("\"" + cle + "\"") || code.contains("'" + cle + "'")
                    || (cle.contains("_") && code.contains("\"" + cle.substring(cle.indexOf('_') + 1) + "\""));
            assertTrue(lue, cle + " : explication livree pour un parametre que le code ne lit pas");
        }
    }

    @Test
    void unInterrupteurDitCeQuIlFaitAZeroEtAUn() throws IOException {
        for (Map.Entry<String, String> e : livrees().entrySet()) {
            JSONObject o = new JSONObject(e.getValue());
            JSONArray entetes = o.optJSONArray("entetes");
            JSONArray cas = o.optJSONArray("cas");
            if (entetes == null || cas == null || !"Valeur".equals(entetes.optString(0))) {
                continue;
            }
            String valeurs = "";
            for (int i = 0; i < cas.length(); i++) {
                valeurs += cas.getJSONArray(i).getString(0) + ";";
            }
            if (valeurs.startsWith("0;") || valeurs.contains(";0;") || valeurs.contains("1;")) {
                assertEquals(true, valeurs.contains("0") && valeurs.contains("1") || !valeurs.matches("[01;]+"),
                        e.getKey() + " : le tableau ne couvre pas 0 et 1 (" + valeurs + ")");
            }
        }
    }
}
