package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Lecture des ventes par la date (articles vendus, 05/10) : l'inspecteur ne touche qu'aux requetes marquees. */
class OrdreLectureVentesTest {

    private static final String SQL = "select count(distinct tpreenregi0_.lg_FAMILLE_ID) from t_preenregistrement_detail"
            + " tpreenregi0_ inner join t_preenregistrement tpreenregi1_ on tpreenregi0_.lg_PREENREGISTREMENT_ID="
            + "tpreenregi1_.lg_PREENREGISTREMENT_ID inner join t_famille tfamille2_ on x=y";

    private final OrdreLectureVentes inspecteur = new OrdreLectureVentes();

    @AfterEach
    void nettoyer() {
        OrdreLectureVentes.desactiver();
    }

    @Test
    void sansMarqueLaRequeteEstInchangee() {
        assertEquals(SQL, inspecteur.inspect(SQL));
    }

    @Test
    void marqueeLaLectureCommenceParLesVentesDansUnOrdreFixe() {
        OrdreLectureVentes.activer();
        assertEquals("select STRAIGHT_JOIN count(distinct tpreenregi0_.lg_FAMILLE_ID) from t_preenregistrement"
                + " tpreenregi1_ inner join t_preenregistrement_detail tpreenregi0_ on tpreenregi0_.lg_PREENREGISTREMENT_ID="
                + "tpreenregi1_.lg_PREENREGISTREMENT_ID inner join t_famille tfamille2_ on x=y",
                inspecteur.inspect(SQL));
    }

    @Test
    void laTableDesLignesNestJamaisTouchee() {
        OrdreLectureVentes.activer();
        String lignesSeules = "select 1 from t_famille f inner join t_preenregistrement_detail d on d.x=f.x";
        assertEquals(lignesSeules, inspecteur.inspect(lignesSeules));
    }

    /* Plan du 21/11, point 17 : recherche des perimes, lots lus en premier. */
    private static final String LOTS = "select count(tlot0_.lg_LOT_ID) as col_0_0_ from t_lot tlot0_ inner join"
            + " t_famille tfamille1_ on tlot0_.lg_FAMILLE_ID=tfamille1_.lg_FAMILLE_ID inner join t_famille_stock"
            + " tfamillest2_ on tfamille1_.lg_FAMILLE_ID=tfamillest2_.lg_FAMILLE_ID left outer join t_zone_geographique"
            + " tzonegeogr3_ on tfamille1_.lg_ZONE_GEO_ID=tzonegeogr3_.lg_ZONE_GEO_ID where tlot0_.current_stock>0";

    @Test
    void lotsNonMarquesInchanges() {
        assertEquals(LOTS, inspecteur.inspect(LOTS));
        OrdreLectureVentes.activer();
        assertEquals(LOTS, inspecteur.inspect(LOTS));
    }

    @Test
    void lotsMarquesLusEnPremierDansUnOrdreFixe() {
        OrdreLectureVentes.activerLots();
        try {
            assertEquals(LOTS.replaceFirst("^select ", "select STRAIGHT_JOIN "), inspecteur.inspect(LOTS));
            String distinct = LOTS.replaceFirst("count\\(tlot0_.lg_LOT_ID\\) as col_0_0_",
                    "distinct tfamille1_.lg_FAMILLE_ID as col_0_0_");
            assertEquals(distinct.replaceFirst("^select distinct ", "select distinct STRAIGHT_JOIN "),
                    inspecteur.inspect(distinct));
            // une requete qui ne part pas des lots, ou les ventes, ne sont pas touchees
            String autre = "select 1 from t_famille f inner join t_lot l on l.x=f.x";
            assertEquals(autre, inspecteur.inspect(autre));
            assertEquals(SQL, inspecteur.inspect(SQL));
        } finally {
            OrdreLectureVentes.desactiverLots();
        }
        assertEquals(LOTS, inspecteur.inspect(LOTS));
    }

    @Test
    void laMarqueNeFuitPasApresDesactivation() {
        OrdreLectureVentes.activer();
        OrdreLectureVentes.desactiver();
        assertEquals(SQL, inspecteur.inspect(SQL));
    }
}
