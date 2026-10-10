package rest.service.impl.prevision;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ParametresPrevisionTest {

    @Test
    void defautsIdentiquesAuxValeursDuCode() {
        // aucune valeur ne change le calcul tant qu'on ne la modifie pas dans l'ecran
        assertEquals(15, ParametresPrevision.definition("KEY_PREVISION_COUVERTURE_JOURS").defaut);
        assertEquals(3, ParametresPrevision.definition("KEY_PREVISION_DELAI_JOURS").defaut);
        assertEquals(45, ParametresPrevision.definition("KEY_PREVISION_JOURS_EN_COURS").defaut);
        assertEquals(90, ParametresPrevision.definition("KEY_PREVISION_SURSTOCK_JOURS").defaut);
        assertEquals(180, ParametresPrevision.definition("KEY_PREVISION_ROTATION_LENTE_JOURS").defaut);
        assertEquals(3, ParametresPrevision.definition("KEY_PREVISION_ECART_ABERRANT").defaut);
        assertEquals(15, ParametresPrevision.definition("KEY_PREVISION_PRIX_ECART").defaut);
        assertEquals(Prevision.MOIS_TEST, ParametresPrevision.definition("KEY_PREVISION_MOIS_TEST").defaut);
        assertEquals(365, ParametresPrevision.definition("KEY_PREVISION_PLAFOND_COUVERTURE").defaut);
        assertEquals(50, ParametresPrevision.definition("KEY_PREVISION_SEUIL_PEU_FIABLE").defaut);
        assertEquals(2, ParametresPrevision.definition("KEY_RISQUE_SECURITE_JOURS").defaut);
        assertEquals(3, ParametresPrevision.definition("KEY_RISQUE_SURVEILLANCE_JOURS").defaut);
        assertEquals(30, ParametresPrevision.definition("KEY_RISQUE_JOURS_RUPTURE_FOURNISSEUR").defaut);
    }

    @Test
    void ecrans() {
        long previsions = ParametresPrevision.catalogue().values().stream()
                .filter(d -> d.ecrans.contains(ParametresPrevision.PREVISIONS)).count();
        long risque = ParametresPrevision.catalogue().values().stream()
                .filter(d -> d.ecrans.contains(ParametresPrevision.RISQUE)).count();
        assertEquals(10, previsions);
        assertEquals(7, risque);
    }

    @Test
    void lectureGardeLaValeurEnregistree() {
        assertEquals(15, ParametresPrevision.valeur("KEY_PREVISION_COUVERTURE_JOURS", null));
        assertEquals(15, ParametresPrevision.valeur("KEY_PREVISION_COUVERTURE_JOURS", "abc"));
        assertEquals(20, ParametresPrevision.valeur("KEY_PREVISION_COUVERTURE_JOURS", " 20 "));
        // une valeur deja en base, meme hors des bornes de saisie, reste celle utilisee (comme avant)
        assertEquals(400, ParametresPrevision.valeur("KEY_PREVISION_COUVERTURE_JOURS", "400"));
        assertThrows(IllegalArgumentException.class, () -> ParametresPrevision.valeur("KEY_INCONNUE", "1"));
    }

    @Test
    void controleDeSaisie() {
        assertNull(ParametresPrevision.controler("KEY_PREVISION_SEUIL_PEU_FIABLE", "60"));
        assertNull(ParametresPrevision.controler("KEY_PREVISION_SEUIL_PEU_FIABLE", "0"));
        assertTrue(ParametresPrevision.controler("KEY_PREVISION_SEUIL_PEU_FIABLE", "101").contains("entre 0 et 100"));
        assertTrue(ParametresPrevision.controler("KEY_PREVISION_MOIS_TEST", "0").contains("entre 1 et 12"));
        assertTrue(ParametresPrevision.controler("KEY_PREVISION_DELAI_JOURS", "2,5").contains("entier"));
        assertTrue(ParametresPrevision.controler("KEY_PREVISION_DELAI_JOURS", "").contains("entier"));
        assertNotNull(ParametresPrevision.controler("KEY_PREVISION_ACTIF", "1"));
        assertNotNull(ParametresPrevision.controler("KEY_SANS_RAPPORT", "1"));
    }

    @Test
    void moisDEssaiDesMethodes() {
        double[] serie = new double[30];
        for (int i = 0; i < serie.length; i++) {
            serie[i] = 10 + (i % 12 == 0 ? 20 : 0) + i * 0.5;
        }
        Prevision.Resultat defaut = Prevision.analyser(serie);
        Prevision.Resultat six = Prevision.analyser(serie, 6);
        assertEquals(defaut.methode, six.methode);
        assertEquals(defaut.prevuMois, six.prevuMois, 1e-9);
        assertEquals(defaut.fiabilite, six.fiabilite);
        // un autre nombre de mois d'essai est bien pris en compte (et jamais moins d'un mois)
        assertNotNull(Prevision.analyser(serie, 12).methode);
        assertEquals(Prevision.analyser(serie, 1).methode, Prevision.analyser(serie, 0).methode);
    }
}
