package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import commonTasks.dto.BalanceDTO;
import commonTasks.dto.VenteReglementReportDTO;
import rest.service.dto.BalanceVenteItemDTO;
import util.Constant;

/**
 * Defaut PRE-EXISTANT, constate en mesurant la balance d'un depot le 16/09, signale alors, corrige aujourd'hui : une
 * vente cloturee SANS ligne de reglement faisait tomber toute la balance en NullPointerException.
 *
 * <p>
 * Deux valeurs nulles y menaient : la liste des reglements elle-meme, que l'appelant obtient d'un {@code Map.remove()}
 * rendant null pour une cle absente, et le mode de reglement d'une ligne, sur lequel un {@code switch} etait fait sans
 * garde.
 *
 * <p>
 * La bonne reponse n'est pas de tomber : une vente sans reglement enregistre compte dans le chiffre d'affaires, elle ne
 * compte simplement dans aucun mode de reglement. Le total des modes est alors inferieur au net, et c'est l'information
 * exacte.
 */
public class BalanceVenteSansReglementTest {

    private static VenteReglementReportDTO reglement(String mode, long montant) {
        VenteReglementReportDTO r = new VenteReglementReportDTO();
        r.setTypeReglement(mode);
        r.setTypeVente(Constant.VENTE_COMPTANT_ID);
        r.setMontant(montant);
        r.setMontantAttentu(montant);
        r.setFlagedAmount(0);
        r.setUgNetAmount(0);
        r.setAmountNonCa(0);
        return r;
    }

    private static BalanceDTO construire(List<VenteReglementReportDTO> reglements) {
        return new BalanceServiceImpl().buildVenteBalance(new ArrayList<BalanceVenteItemDTO>(), false, false,
                reglements);
    }

    /** Le cas qui faisait tomber l'ecran : aucune vente de ce type n'a de ligne de reglement. */
    @Test
    public void uneListeDeReglementsNulleNeFaitPlusTomberLaBalance() {
        BalanceDTO balance = assertDoesNotThrow(() -> construire(null));

        assertEquals(0L, balance.getMontantEsp());
        assertEquals(0L, balance.getTotalModeReglement());
    }

    @Test
    public void uneListeVideDonneLeMemeResultatQuUneListeNulle() {
        BalanceDTO nulle = construire(null);
        BalanceDTO vide = construire(Collections.<VenteReglementReportDTO> emptyList());

        assertEquals(nulle.getTotalModeReglement(), vide.getTotalModeReglement());
        assertEquals(nulle.getMontantEsp(), vide.getMontantEsp());
        assertEquals(nulle.getMontantTp(), vide.getMontantTp());
    }

    /** Une ligne de reglement sans mode : elle compte dans le total encaisse, dans aucune colonne de mode. */
    @Test
    public void unModeDeReglementNulNeFaitPlusTomberLaBalance() {
        BalanceDTO balance = assertDoesNotThrow(() -> construire(Arrays.asList(reglement(null, 5000))));

        assertEquals(5000L, balance.getTotalModeReglement(), "le montant reste compte dans le total encaisse");
        assertEquals(0L, balance.getMontantEsp(), "mais dans aucune colonne de mode");
        assertEquals(0L, balance.getMontantCheque());
        assertEquals(0L, balance.getMontantCB());
    }

    @Test
    public void unModeVideEstTraiteCommeUnModeAbsent() {
        BalanceDTO balance = assertDoesNotThrow(() -> construire(Arrays.asList(reglement("", 2500))));

        assertEquals(2500L, balance.getTotalModeReglement());
        assertEquals(0L, balance.getMontantEsp());
    }

    /** NON-REGRESSION : un mode connu est toujours ventile dans sa colonne, exactement comme avant. */
    @Test
    public void unModeConnuEstToujoursVentileDansSaColonne() {
        BalanceDTO especes = construire(Arrays.asList(reglement(Constant.MODE_ESP, 12000)));
        assertEquals(12000L, especes.getMontantEsp());
        assertEquals(12000L, especes.getTotalModeReglement());

        BalanceDTO cheque = construire(Arrays.asList(reglement(Constant.MODE_CHEQUE, 7000)));
        assertEquals(7000L, cheque.getMontantCheque());
        assertEquals(0L, cheque.getMontantEsp());

        BalanceDTO carte = construire(Arrays.asList(reglement(Constant.MODE_CB, 3000)));
        assertEquals(3000L, carte.getMontantCB());
    }

    /** Plusieurs lignes, dont une sans mode : les autres sont ventilees normalement, la somme reste juste. */
    @Test
    public void uneLigneSansModeNEmpecheNiLesAutresNiLeTotal() {
        BalanceDTO balance = construire(Arrays.asList(reglement(Constant.MODE_ESP, 10000), reglement(null, 4000),
                reglement(Constant.MODE_CHEQUE, 1000)));

        assertEquals(10000L, balance.getMontantEsp());
        assertEquals(1000L, balance.getMontantCheque());
        assertEquals(15000L, balance.getTotalModeReglement(), "les trois montants sont dans le total encaisse");
    }
}
