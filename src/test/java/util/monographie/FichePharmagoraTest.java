package util.monographie;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/** Pages reelles du site (DOLIPRANE 500 mg cp, produit 506504), fournies par l'officine le 07/10. */
class FichePharmagoraTest {

    private static String page(String nom) throws Exception {
        try (InputStream in = FichePharmagoraTest.class.getResourceAsStream("/monographie/" + nom)) {
            return new String(in.readAllBytes(), StandardCharsets.ISO_8859_1);
        }
    }

    @Test
    void posologie() throws Exception {
        JSONObject f = FichePharmagora.lireFiche(page("qPX_506504_1.html"), 1);
        assertEquals("DOLIPRANE 500 mg cp", f.getString("titre"));
        assertEquals("506504", f.getString("produit"));
        assertEquals("Posologie", f.getString("libelleRubrique"));
        JSONArray pres = f.getJSONArray("presentations");
        assertEquals(2, pres.length());
        assertEquals("506504001I", pres.getJSONObject(0).getString("code"));
        assertEquals("DOLIPRANE 500mg Cpr 2Plq/8", pres.getJSONObject(0).getString("libelle"));
        assertEquals(7, f.getJSONArray("rubriques").length());
        String texte = f.getJSONArray("paragraphes").join("\n");
        assertTrue(texte.contains("1 à 2 comprimés de 500 mg par prise"), texte);
        assertTrue(texte.contains("clairance de la créatinine <= à 30 ml/min"), texte);
        assertTrue(texte.contains("MODE D'ADMINISTRATION"), texte);
        assertFalse(texte.contains("<" + "font"), texte);
        assertFalse(texte.contains("POSOLOGIE : POSOLOGIE"), texte);
        assertFalse(f.getBoolean("accentsPerdus"));
    }

    @Test
    void interactions() throws Exception {
        JSONObject f = FichePharmagora.lireFiche(page("qPX_506504_3.html"), 3);
        JSONArray classes = f.getJSONArray("interactions");
        assertEquals(2, classes.length());
        JSONObject para = classes.getJSONObject(0);
        assertEquals("Parac?tamol", para.getString("classe"));
        JSONArray avec = para.getJSONArray("avec");
        assertEquals(2, avec.length());
        assertEquals("Flucloxacilline", avec.getJSONObject(0).getString("classe"));
        assertEquals("Association déconseillée", avec.getJSONObject(0).getString("niveau"));
        assertEquals(3, avec.getJSONObject(0).getInt("gravite"));
        JSONObject avk = avec.getJSONObject(1);
        assertEquals("Antivitamines K", avk.getString("classe"));
        assertEquals("Précaution d'emploi", avk.getString("niveau"));
        assertEquals(2, avk.getInt("gravite"));
        assertTrue(avk.getString("analyse").startsWith("Risque d'augmentation de l'effet de l'antivitamine K"));
        assertTrue(avk.getString("conseilDispensateur").contains("INR"));
        JSONArray oral = classes.getJSONObject(1).getJSONArray("avec");
        assertEquals(3, oral.length());
        /* accents en UTF-8 lus comme ISO-8859-1 : repares */
        assertTrue(oral.getJSONObject(1).getString("conseilDispensateur").contains("précaution"),
                oral.getJSONObject(1).getString("conseilDispensateur"));
        assertEquals("A prendre en compte", oral.getJSONObject(2).getString("niveau"));
        assertEquals(1, oral.getJSONObject(2).getInt("gravite"));
        assertTrue(f.getBoolean("accentsPerdus"), "« Parac?tamol » : accents perdus a la source");
    }

    @Test
    void rechercheEtPagesInattendues() {
        assertEquals("506504", FichePharmagora.lireRecherche("<a href=\"qPX.php3?cbCprod=506504&curRub=6\">x</a>")
                .getString("produit"));
        assertEquals("506504001I", FichePharmagora.lireRecherche("<a href=\"qUV.php3?cbCuvSemp=506504001I\">x</a>")
                .getString("presentation"));
        assertEquals(null, FichePharmagora.lireRecherche("<html>Aucun résultat</html>"));
        JSONObject vide = FichePharmagora.lireFiche("<html>erreur</html>", 1);
        assertEquals("", vide.getString("titre"));
        assertEquals(0, vide.getJSONArray("paragraphes").length());
    }
}
