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

    @Test
    void laMarqueNeFuitPasApresDesactivation() {
        OrdreLectureVentes.activer();
        OrdreLectureVentes.desactiver();
        assertEquals(SQL, inspecteur.inspect(SQL));
    }
}
