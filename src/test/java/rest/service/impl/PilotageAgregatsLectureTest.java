package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Ce que la refonte du 19/09 doit garantir : les totaux d'une periode restent les MEMES, qu'ils soient lus dans les
 * agregats mensuels ou calcules directement.
 *
 * <p>
 * L'officine mesurait 17 a 71 secondes par onglet, et deux onglets rendaient 500. La correction consiste a additionner
 * des mois deja calcules plutot qu'a relire le detail des ventes ; ces controles verifient que l'addition n'a rien
 * change aux chiffres et que les mois s'abregent comme on les lit.
 */
class PilotageAgregatsLectureTest {

    private static PilotageService.Totaux totaux(double caTTC, double caHT, double cout, double achat, int ventes,
            double encaisse) {
        PilotageService.Totaux t = new PilotageService.Totaux();
        t.caTTC = caTTC;
        t.caHT = caHT;
        t.coutAchat = cout;
        t.achatTTC = achat;
        t.nbVentes = ventes;
        t.encaisse = encaisse;
        t.marge = caHT - cout;
        return t;
    }

    @Test
    @DisplayName("Additionner deux bords de periode donne la meme chose que la periode entiere")
    void additionDesBords() {
        PilotageService.Totaux entier = totaux(1000d, 900d, 600d, 700d, 40, 800d);
        PilotageService.Totaux cumul = totaux(600d, 540d, 360d, 400d, 25, 500d);
        cumul.ajouter(totaux(400d, 360d, 240d, 300d, 15, 300d));

        assertEquals(entier.caTTC, cumul.caTTC);
        assertEquals(entier.caHT, cumul.caHT);
        assertEquals(entier.coutAchat, cumul.coutAchat);
        assertEquals(entier.achatTTC, cumul.achatTTC);
        assertEquals(entier.nbVentes, cumul.nbVentes);
        assertEquals(entier.encaisse, cumul.encaisse);
    }

    @Test
    @DisplayName("La marge suit l'addition : elle se recalcule, elle ne s'additionne pas a l'aveugle")
    void margeRecalculee() {
        PilotageService.Totaux cumul = totaux(600d, 540d, 360d, 400d, 25, 500d);
        cumul.ajouter(totaux(400d, 360d, 240d, 300d, 15, 300d));
        assertEquals(900d - 600d, cumul.marge);
        assertEquals((900d - 600d) / 900d * 100d, cumul.tauxMarge());
    }

    @Test
    @DisplayName("L'encaisse et les annulations s'additionnent comme le reste")
    void encaisseEtAnnulations() {
        PilotageService.Totaux cumul = new PilotageService.Totaux();
        PilotageService.Totaux bord = new PilotageService.Totaux();
        bord.encaisse = 250d;
        bord.nbAnnulees = 3d;
        bord.montantAnnule = 1200d;
        cumul.ajouter(bord);
        cumul.ajouter(bord);
        assertEquals(500d, cumul.encaisse);
        assertEquals(6d, cumul.nbAnnulees);
        assertEquals(2400d, cumul.montantAnnule);
    }

    @Test
    @DisplayName("Les mois s'abregent comme on les ecrit : « Septembre 2026 » devient « sept. 26 »")
    void moisAbreges() {
        assertEquals("sept. 26", PilotageService.moisCourt("Septembre 2026"));
        assertEquals("oct. 25", PilotageService.moisCourt("Octobre 2025"));
        assertEquals("janv. 24", PilotageService.moisCourt("Janvier 2024"));
        assertEquals("févr. 24", PilotageService.moisCourt("Février 2024"));
        assertEquals("déc. 25", PilotageService.moisCourt("Décembre 2025"));
        assertEquals("juil. 26", PilotageService.moisCourt("Juillet 2026"));
        assertEquals("avr. 26", PilotageService.moisCourt("Avril 2026"));
    }

    @Test
    @DisplayName("Mars, mai, juin et aout s'ecrivent deja en entier : on ne les tronque pas")
    void moisCourtsInchanges() {
        assertEquals("mars 26", PilotageService.moisCourt("Mars 2026"));
        assertEquals("mai 26", PilotageService.moisCourt("Mai 2026"));
        assertEquals("juin 26", PilotageService.moisCourt("Juin 2026"));
        assertEquals("août 26", PilotageService.moisCourt("Août 2026"));
    }

    @Test
    @DisplayName("Un libelle vide ou inattendu ne fait pas tomber l'edition")
    void libelleInattendu() {
        assertEquals("", PilotageService.moisCourt(null));
        assertEquals("", PilotageService.moisCourt("   "));
        assertEquals("2026-09", PilotageService.moisCourt("2026-09"));
    }
}
