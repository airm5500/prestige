package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Regles de declenchement de la surveillance de la base. Le risque n'est pas de rater une alerte, c'est d'en produire
 * une qui ne veut rien dire : une supervision qui crie tous les jours cesse d'etre lue, et le vrai incident passe alors
 * inapercu. D'ou les cas "mesure indisponible" ci-dessous, qui doivent rester silencieux plutot que d'alerter a tort.
 */
class SupportDatabaseMonitorTest {

    @Test
    @DisplayName("Pourcentage : calcule, et neutre quand la mesure manque")
    void pourcentage() {
        assertEquals(50, SupportDatabaseMonitor.pourcentage(75L, 150L));
        assertEquals(100, SupportDatabaseMonitor.pourcentage(151L, 151L));
        // Une division par zero, ou une mesure absente, ne doit pas produire un pourcentage fantaisiste.
        assertEquals(-1, SupportDatabaseMonitor.pourcentage(10L, 0L));
        assertEquals(-1, SupportDatabaseMonitor.pourcentage(-1L, 151L));
    }

    @Test
    @DisplayName("Connexions : silence sous le seuil, alerte a partir du seuil")
    void connexions() {
        assertNull(SupportDatabaseMonitor.evaluerConnexions(100L, 151L, 80, 3L), "66% reste sous un seuil a 80%");

        SupportDatabaseMonitor.Alerte alerte = SupportDatabaseMonitor.evaluerConnexions(130L, 151L, 80, 12L);

        assertNotNull(alerte);
        assertEquals("bdd-connexions", alerte.code);
        assertEquals("WARN", alerte.niveau);
        assertTrue(alerte.message.contains("130 / 151"), "le message doit porter les chiffres bruts");
        assertTrue(alerte.detail.contains("12"), "le detail precise combien sont reellement actives");
    }

    @Test
    @DisplayName("Connexions : mesure indisponible, aucune alerte")
    void connexionsMesureIndisponible() {
        // -1 = compteur illisible (SGBD non MySQL, droits insuffisants). Alerter la-dessus serait un pur faux positif.
        assertNull(SupportDatabaseMonitor.evaluerConnexions(-1L, 151L, 80, -1L));
        assertNull(SupportDatabaseMonitor.evaluerConnexions(130L, 0L, 80, -1L));
    }

    @Test
    @DisplayName("Requetes lentes : aucune requete, aucune alerte")
    void requetesLentesAucune() {
        assertNull(SupportDatabaseMonitor.evaluerRequetesLentes(0L, 0L, 10));
        assertNull(SupportDatabaseMonitor.evaluerRequetesLentes(-1L, 0L, 10));
    }

    @Test
    @DisplayName("Requetes lentes : l'alerte porte le nombre et la plus ancienne")
    void requetesLentes() {
        SupportDatabaseMonitor.Alerte alerte = SupportDatabaseMonitor.evaluerRequetesLentes(3L, 47L, 10);

        assertNotNull(alerte);
        assertEquals("bdd-requetes-lentes", alerte.code);
        assertTrue(alerte.message.contains("3 requete(s)"));
        assertTrue(alerte.message.contains("47 s"), "la duree de la plus ancienne oriente le diagnostic");
        assertTrue(alerte.detail.contains("index"), "le detail doit orienter vers la cause la plus frequente");
    }

    @Test
    @DisplayName("Verrous : silence sous le seuil, alerte a partir du seuil, silence si mesure absente")
    void verrous() {
        assertNull(SupportDatabaseMonitor.evaluerVerrous(2L, 5));
        assertNull(SupportDatabaseMonitor.evaluerVerrous(-1L, 5), "compteur illisible : ne pas alerter");

        SupportDatabaseMonitor.Alerte alerte = SupportDatabaseMonitor.evaluerVerrous(5L, 5);

        assertNotNull(alerte);
        assertEquals("bdd-verrous", alerte.code);
        assertTrue(alerte.message.contains("5 transaction(s)"));
        assertTrue(alerte.detail.contains("Lock wait timeout"),
                "le detail doit nommer l'erreur que l'utilisateur voit");
    }
}
