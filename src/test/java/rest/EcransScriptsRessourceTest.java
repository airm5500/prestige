package rest;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.util.List;
import java.util.zip.GZIPInputStream;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Table des scripts des ecrans (RAPPORT_CHARGE_2026-10-29, § 4.6) : chaque fichier y est rendu a l'identique. */
public class EcransScriptsRessourceTest {

    @TempDir
    Path dossier;

    private static JSONObject table(byte[] brut) {
        String js = new String(brut, StandardCharsets.UTF_8);
        String debut = "window.PRESTIGE_SCRIPTS=";
        int i = js.indexOf(debut);
        assertTrue(i > 0, "prefixe attendu");
        String corps = js.substring(i + debut.length()).trim();
        assertTrue(corps.endsWith("};"), "fin attendue");
        /* la table est un objet JavaScript litteral qui est aussi du JSON valide */
        return new JSONObject(corps.substring(0, corps.length() - 1));
    }

    @Test
    public void chaqueFichierRenduAlIdentique() throws Exception {
        String piege = "var a = \"x\\\"y\" + '\\\\';\r\n\tvar b = '</script>';   // é € \u0001\n";
        Files.createDirectories(dossier.resolve("view/sous dossier"));
        Files.write(dossier.resolve("view/sous dossier/A.js"), piege.getBytes(StandardCharsets.UTF_8));
        Files.write(dossier.resolve("app.js"), ("﻿" + "Ext.define('X', {});").getBytes(StandardCharsets.UTF_8));
        Files.write(dossier.resolve("lisez-moi.txt"), "pas un script".getBytes(StandardCharsets.UTF_8));

        List<Path> f = EcransScriptsRessource.fichiers(dossier);
        assertEquals(2, f.size(), "seuls les .js");
        EcransScriptsRessource.Lot l = EcransScriptsRessource.construire("/prestige/general/app", dossier, f,
                EcransScriptsRessource.signature(f), 0);
        JSONObject t = table(l.brut);
        assertEquals(2, t.length());
        assertEquals(piege, t.getString("/prestige/general/app/view/sous dossier/A.js"));
        assertEquals("Ext.define('X', {});", t.getString("/prestige/general/app/app.js"), "marque BOM retiree");
        assertTrue(!new String(l.brut, StandardCharsets.UTF_8).contains("</script>"), "jamais de </script> en clair");

        try (GZIPInputStream z = new GZIPInputStream(new ByteArrayInputStream(l.gzip))) {
            assertArrayEquals(l.brut, z.readAllBytes(), "version compressee identique");
        }
    }

    @Test
    public void signatureChangeAvecLesFichiers() throws Exception {
        Path a = dossier.resolve("A.js");
        Files.write(a, "1".getBytes(StandardCharsets.UTF_8));
        String s1 = EcransScriptsRessource.signature(EcransScriptsRessource.fichiers(dossier));
        assertEquals(s1, EcransScriptsRessource.signature(EcransScriptsRessource.fichiers(dossier)), "stable");

        Files.write(a, "12".getBytes(StandardCharsets.UTF_8));
        Files.setLastModifiedTime(a, FileTime.fromMillis(1_000_000));
        String s2 = EcransScriptsRessource.signature(EcransScriptsRessource.fichiers(dossier));
        assertNotEquals(s1, s2, "fichier modifie");

        Files.write(dossier.resolve("B.js"), "2".getBytes(StandardCharsets.UTF_8));
        assertNotEquals(s2, EcransScriptsRessource.signature(EcransScriptsRessource.fichiers(dossier)),
                "fichier ajoute");
    }

    @Test
    public void dossierAbsentTableVide() {
        List<Path> f = EcransScriptsRessource.fichiers(dossier.resolve("absent"));
        assertTrue(f.isEmpty());
        EcransScriptsRessource.Lot l = EcransScriptsRessource.construire("/p", null, f,
                EcransScriptsRessource.signature(f), 0);
        assertEquals(0, table(l.brut).length(), "table vide : tout part par le reseau comme avant");
    }
}
