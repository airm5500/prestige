package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Random;
import java.util.TreeSet;

import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Demande 72 (Prestige Inventaire 5.0.3) : PUT ws/inventaires/details confirme une saisie enregistree par
 * {"success":1,"id":id recu,"quantite":quantite enregistree}. Coherence : sur des milliers de cas tires au hasard
 * (graine fixe), le corps se relit en JSON, porte exactement ces trois cles, l'id recu (meme au-dela de 2^53) et la
 * quantite enregistree, jamais celle envoyee si elles different.
 */
class ConfirmationSaisieInventaireTest {

    private static void verifier(long id, int quantite) {
        String corps = ErpRessource.confirmationSaisie(id,
                new JSONObject().put("status", 200).put("quantite", quantite));
        JSONObject j = new JSONObject(corps);
        assertEquals("[id, quantite, success]", new TreeSet<>(j.keySet()).toString(), corps);
        assertEquals(1, j.getInt("success"), corps);
        assertEquals(id, j.getLong("id"), corps);
        assertEquals(quantite, j.getInt("quantite"), corps);
        assertEquals(Long.toString(id), corps.replaceAll(".*\"id\":(\\d+).*", "$1"),
                "id ecrit en entier exact : " + corps);
    }

    @Test
    void casLimites() {
        verifier(1L, 0);
        verifier(118468L, 1);
        verifier(9007199254740993L, 7); // au-dela de 2^53
        verifier(Long.MAX_VALUE, 1250);
        verifier(124494L, Integer.MAX_VALUE);
    }

    @Test
    void coherenceSurTirages() {
        Random r = new Random(72);
        for (int i = 0; i < 20000; i++) {
            long id = r.nextBoolean() ? 1 + r.nextInt(5_000_000) : 1 + (r.nextLong() & Long.MAX_VALUE) % Long.MAX_VALUE;
            int quantite = r.nextInt(10) == 0 ? 0 : r.nextInt(r.nextBoolean() ? 50 : 100_000);
            verifier(id, quantite);
        }
    }

    @Test
    void quantiteEnregistreeEtNonEnvoyee() {
        /* le corps reprend ce que le service a enregistre (cle « quantite » de sa reponse) */
        String corps = ErpRessource.confirmationSaisie(5L, new JSONObject().put("status", 200).put("quantite", 9));
        assertEquals(9, new JSONObject(corps).getInt("quantite"));
    }
}
