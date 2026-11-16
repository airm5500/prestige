package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Random;

import org.junit.jupiter.api.Test;

/**
 * Retour du 15/11 (suivi des bons) : requete SQL des ventes a tiers payant par organisme. Sur des milliers de
 * combinaisons tirees au hasard (graine fixe) : autant de parametres que de « ? », bornes de la periode en tete ;
 * chaque filtre present n'apparait que s'il est demande ; la requete part des ventes si et seulement si la periode fait
 * moins de 92 jours ; pagination seulement hors « tout » ; jamais de valeur saisie collee dans le texte SQL.
 */
class VentesTiersPayantsRequeteCoherenceTest {

    @Test
    void parametresFiltresEtOrdreDeJointure() {
        Random r = new Random(20261115L);
        LocalDate origine = LocalDate.of(2024, 1, 1);
        for (int i = 0; i < 5000; i++) {
            LocalDate du = origine.plusDays(r.nextInt(900));
            int jours = r.nextInt(4) == 0 ? 91 + r.nextInt(3) : r.nextInt(400);
            LocalDate au = du.plusDays(jours);
            String query = r.nextBoolean() ? null : r.nextBoolean() ? "" : "mu'" + r.nextInt(99);
            String tp = r.nextBoolean() ? null : "TP" + r.nextInt(1000);
            String groupe = r.nextBoolean() ? null : String.valueOf(r.nextInt(50));
            String type = r.nextInt(3) == 0 ? null : r.nextBoolean() ? "ALL" : "2";
            boolean tout = r.nextBoolean();
            int start = r.nextInt(100), limit = 1 + r.nextInt(50);
            VentesTiersPayantsRequete q = new VentesTiersPayantsRequete(query, du.toString(), au.toString(), tp, groupe,
                    type, start, limit, tout);
            long marques = q.sql.chars().filter(c -> c == '?').count();
            assertEquals(marques, q.parametres.size(), q.sql);
            java.util.Date[] b = ClientServiceImpl.bornesJours(du.toString(), au.toString());
            assertEquals(b[0], q.parametres.get(0));
            assertEquals(b[1], q.parametres.get(1));
            boolean recherche = query != null && !query.isEmpty();
            assertEquals(recherche, q.sql.contains("UPPER(t.str_FULLNAME) LIKE ?"));
            assertEquals(tp != null, q.sql.contains("t.lg_TIERS_PAYANT_ID = ?"));
            assertEquals(groupe != null, q.sql.contains("t.lg_GROUPE_ID = ?"));
            assertEquals(type != null && !"ALL".equals(type), q.sql.contains("t.lg_TYPE_TIERS_PAYANT_ID = ?"));
            if (recherche) {
                assertFalse(q.sql.contains(query), "valeur saisie dans le SQL");
                assertEquals(query.toUpperCase() + "%", q.parametres.get(2));
            }
            assertEquals(jours < 92, q.sql.contains(" STRAIGHT_JOIN "), jours + " jours");
            assertEquals(!tout, q.sql.contains(" LIMIT " + limit + " OFFSET " + start));
            assertTrue(q.sql.contains("ORDER BY t.str_FULLNAME"));
        }
    }
}
