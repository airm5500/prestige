package rest.service.impl.pointage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.impl.PointageBonService;

/**
 * Plan du 19/11, point 11 : compteurs d'un groupe d'organismes (onglet « Pointage »), sur 10 000 groupes tires au
 * hasard (graine fixe ; 0 a 12 organismes, 0 a 400 bons chacun, montants jusqu'a plusieurs milliards au total) :
 * <ul>
 * <li>chaque compteur du groupe = somme des compteurs de ses organismes (montant en entier long, sans debordement)
 * ;</li>
 * <li>bons a pointer + pointes = bons en base ; conformes + anomalies &lt;= pointes ; jamais negatif ;</li>
 * <li>bons annonces et ecart : absents (propres a un organisme) ;</li>
 * <li>groupe vide : tout a zero.</li>
 * </ul>
 */
class SommeCompteursGroupeCoherenceTest {

    @Test
    void sommeDesOrganismes() {
        Random r = new Random(20261119L);
        int vides = 0;
        for (int cas = 0; cas < 10000; cas++) {
            int n = r.nextInt(13);
            List<JSONObject> l = new ArrayList<>();
            long[] attendu = new long[7];
            for (int i = 0; i < n; i++) {
                int enBase = r.nextInt(401);
                int pointes = enBase == 0 ? 0 : r.nextInt(enBase + 1);
                int conformes = pointes == 0 ? 0 : r.nextInt(pointes + 1);
                int anomalies = pointes - conformes == 0 ? 0 : r.nextInt(pointes - conformes + 1);
                int alertes = enBase == 0 ? 0 : r.nextInt(enBase + 1);
                long montant = (long) enBase * (r.nextInt(2_000_000) + (r.nextInt(10) == 0 ? 1_000_000_000L : 0));
                JSONObject c = new JSONObject().put("enBase", enBase).put("pointes", pointes)
                        .put("conformes", conformes).put("anomalies", anomalies).put("alertes", alertes)
                        .put("montant", montant).put("aPointer", enBase - pointes)
                        .put("annonces", r.nextBoolean() ? JSONObject.NULL : enBase).put("ecart", 0);
                l.add(c);
                attendu[0] += enBase;
                attendu[1] += pointes;
                attendu[2] += conformes;
                attendu[3] += anomalies;
                attendu[4] += alertes;
                attendu[5] += montant;
                attendu[6] += enBase - pointes;
            }
            JSONObject s = PointageBonService.sommeCompteurs(l);
            String ici = "cas " + cas;
            assertEquals(attendu[0], s.getLong("enBase"), ici);
            assertEquals(attendu[1], s.getLong("pointes"), ici);
            assertEquals(attendu[2], s.getLong("conformes"), ici);
            assertEquals(attendu[3], s.getLong("anomalies"), ici);
            assertEquals(attendu[4], s.getLong("alertes"), ici);
            assertEquals(attendu[5], s.getLong("montant"), ici + " : montant");
            assertEquals(attendu[6], s.getLong("aPointer"), ici);
            assertEquals(s.getLong("enBase"), s.getLong("aPointer") + s.getLong("pointes"),
                    ici + " : a pointer + pointes");
            assertTrue(s.getLong("conformes") + s.getLong("anomalies") <= s.getLong("pointes"), ici);
            assertTrue(s.isNull("annonces") && s.isNull("ecart"), ici + " : annonces propres a un organisme");
            if (n == 0) {
                vides++;
                assertEquals(0, s.getLong("enBase") + s.getLong("montant"), ici);
            }
        }
        assertTrue(vides > 300, "groupes vides essayes : " + vides);
    }
}
