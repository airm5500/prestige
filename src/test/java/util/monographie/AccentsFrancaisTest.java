package util.monographie;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class AccentsFrancaisTest {

    @Test
    void motsDeLaFicheInteractions() {
        String[][] cas = { { "Parac?tamol", "Paracétamol" }, { "parac?tamol", "paracétamol" },
                { "M?dicaments administr?s par voie orale", "Médicaments administrés par voie orale" },
                { "apr?s son arr?t", "après son arrêt" }, { "Contr?le plus fr?quent", "Contrôle plus fréquent" },
                { "Adaptation ?ventuelle", "Adaptation éventuelle" }, { "risque h?morragique", "risque hémorragique" },
                { "R?sines ch?latrices", "Résines chélatrices" }, { "l'efficacit? d'autres", "l'efficacité d'autres" },
                { "D'une fa?on g?n?rale", "D'une façon générale" }, { "simultan?ment", "simultanément" },
                { "doit se faire ? distance", "doit se faire à distance" }, { "la r?alisation", "la réalisation" },
                { "un d?lai", "un délai" }, { "voire jusqu'? la r?alisation", "voire jusqu'à la réalisation" },
                { "A prendre en compte", "À prendre en compte" }, { "Eviter la prise", "Éviter la prise" },
                { "Il faut. Eviter", "Il faut. Éviter" }, { "vitamine A prendre", "vitamine A prendre" } };
        for (String[] c : cas) {
            assertEquals(c[1], AccentsFrancais.reparer(c[0]), c[0]);
        }
    }

    @Test
    void reglesGeneralesEtCasse() {
        assertEquals("système, modèle, fièvre, règle", AccentsFrancais.reparer("syst?me, mod?le, fi?vre, r?gle"));
        assertEquals("œdème, cœur, symptômes, même, déjà, où",
                AccentsFrancais.reparer("?d?me, c?ur, sympt?mes, m?me, d?j?, o?"));
        assertEquals("MÉDICAMENTS ADMINISTRÉS", AccentsFrancais.reparer("M?DICAMENTS ADMINISTR?S"));
        assertEquals("arrêter le traitement, arrêté", AccentsFrancais.reparer("arr?ter le traitement, arr?t?"));
    }

    @Test
    void ponctuationIntacte() {
        assertEquals("Que faire ? Rien.", AccentsFrancais.reparer("Que faire ? Rien."));
        assertEquals("Sans accent perdu", AccentsFrancais.reparer("Sans accent perdu"));
        assertEquals("pourquoi ?", AccentsFrancais.reparer("pourquoi ?"));
    }

    @Test
    void ficheExempleSansPointDInterrogation() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/monographie/qPX_506504_3.html")) {
            JSONObject f = FichePharmagora.lireFiche(new String(in.readAllBytes(), StandardCharsets.ISO_8859_1), 3);
            String t = f.getJSONArray("interactions").toString();
            assertFalse(t.matches("(?s).*\\p{L}\\?.*|.*\\?\\p{L}.*"), t);
            assertFalse(f.getBoolean("accentsPerdus"));
            assertEquals("Paracétamol", f.getJSONArray("interactions").getJSONObject(0).getString("classe"));
        }
    }
}
