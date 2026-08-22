package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.text.SimpleDateFormat;
import java.util.Date;
import org.junit.jupiter.api.Test;

/**
 * Date affichee pour la caisse d'un utilisateur.
 *
 * <p>
 * La regle tient en une phrase : tant que la caisse est ouverte, c'est l'heure de cette ouverture qui s'affiche, et
 * jamais la date d'affectation du fond par l'administrateur - laquelle peut preceder l'ouverture d'un jour entier.
 */
class DateOuvertureCaisseTest {

    private static Date date(String texte) throws Exception {
        return new SimpleDateFormat("dd/MM/yyyy HH:mm").parse(texte);
    }

    @Test
    void ouvertureConnue_elleEstAffichee() throws Exception {
        assertEquals("22/08/2026 03:10",
                BilletageServiceImpl.dateAffichee("22/08/2026 03:10", date("21/08/2026 18:30")));
    }

    @Test
    void caisseFermee_onRetombeSurLaDateDuFond() throws Exception {
        assertEquals("21/08/2026 18:30", BilletageServiceImpl.dateAffichee(null, date("21/08/2026 18:30")));
    }

    @Test
    void ouvertureVide_traiteeCommeAbsente() throws Exception {
        assertEquals("21/08/2026 18:30", BilletageServiceImpl.dateAffichee("  ", date("21/08/2026 18:30")));
    }

    @Test
    void niOuvertureNiFond_rendUneChaineVide() {
        assertEquals("", BilletageServiceImpl.dateAffichee(null, null));
    }
}
