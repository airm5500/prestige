package rest.service.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Liste des bons : la colonne de date ne porte plus l'heure.
 *
 * La regle vivait dans le service tant que l'edition « avec produits » etait construite en code ; elle est desormais
 * portee par le bean, que les deux etats lisent directement ($F{dateSeule}). Le test suit la regle a son nouvel
 * emplacement : elle doit tenir quand l'heure manque, quand la valeur est vide, et quand elle est absente.
 */
class DateSeuleBonsTest {

    private static BonsDTO bon(String date, String heure) {
        BonsDTO b = BonsDTO.builder().build();
        b.setDtUPDATED(date);
        b.setHeure(heure);
        return b;
    }

    @Test
    void lHeureEstRetiree() {
        assertEquals("04/09/2026", bon("04/09/2026", "14:55:29").getDateSeule());
        assertEquals("04/09/2026", bon("04/09/2026", "14:55").getDateSeule());
    }

    @Test
    void uneDateDejaSeuleEstRendueTelleQuelle() {
        assertEquals("04/09/2026", bon("04/09/2026", null).getDateSeule());
        assertEquals("04/09/2026", bon("04/09/2026", "").getDateSeule());
    }

    @Test
    void lesEspacesDeBordNeLaissentPasPasserLHeure() {
        assertEquals("04/09/2026", bon("  04/09/2026 14:55:29  ", null).getDateSeule());
    }

    @Test
    void uneValeurAbsenteOuVideNeCassePasLEdition() {
        assertEquals("", bon(null, null).getDateSeule());
        assertEquals("", bon("", "").getDateSeule());
        assertEquals("", bon("   ", "   ").getDateSeule());
    }

    /** Une valeur tronquee est rendue telle quelle plutot que de lever une exception. */
    @Test
    void uneValeurTropCourteEstRendueTelleQuelle() {
        assertEquals("04/09", bon("04/09", null).getDateSeule());
    }

    /**
     * L'etat construit une source de donnees a partir des produits du bon : une liste nulle ferait echouer l'edition du
     * bon concerne, et l'edition simple ne les renseigne jamais.
     */
    @Test
    void lesProduitsNeSontJamaisNuls() {
        BonsDTO b = BonsDTO.builder().build();
        assertTrue(b.getProduits().isEmpty());
    }
}
