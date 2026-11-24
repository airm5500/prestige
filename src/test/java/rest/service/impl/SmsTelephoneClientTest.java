package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;

import org.junit.jupiter.api.Test;

import dal.TClient;
import util.TelephoneClient;
import util.sms.SmsSendResult;

/**
 * Plan du 21/11, SMS refuse : le numero du client est dans « Téléphone » (str_TELEPHONE) et l'adresse est vide ou porte
 * une vraie adresse. Le controle avant envoi ne lisait que l'ancien champ adresse : le SMS etait refuse (« Numéro non
 * mobile ivoirien ») alors que le numero retenu, lui, etait valide. Le controle suit maintenant la regle de
 * TelephoneClient : telephone d'abord, adresse a defaut.
 */
public class SmsTelephoneClientTest {

    private static TClient client(String telephone, String adresse) {
        TClient c = new TClient();
        c.setStrTELEPHONE(telephone);
        c.setStrADRESSE(adresse);
        return c;
    }

    @Test
    public void numeroDansTelephoneEtAdresseVide() {
        assertNull(SmsImpl.refusAvantEnvoi(client("0708473750", null)));
        assertNull(SmsImpl.refusAvantEnvoi(client("0708473750", "")));
        assertNull(SmsImpl.refusAvantEnvoi(client("+225 05 08 47 37 50", "   ")));
    }

    @Test
    public void numeroDansTelephoneEtVraieAdresse() {
        assertNull(SmsImpl.refusAvantEnvoi(client("0708473750", "Cocody Riviera 3, rue des jardins")));
        assertNull(SmsImpl.refusAvantEnvoi(client("0102030405", "Yopougon")));
    }

    @Test
    public void lesFichesNonReprisesGardentLeurNumeroDansAdresse() {
        assertNull(SmsImpl.refusAvantEnvoi(client(null, "0708473750")));
        assertNull(SmsImpl.refusAvantEnvoi(client("", "0708473750")));
        assertNull(SmsImpl.refusAvantEnvoi(client("2721345678", "0708473750")), "fixe en telephone, mobile en adresse");
    }

    @Test
    public void sansNumeroMobileLeClientResteRefuse() {
        for (String[] cas : new String[][] { { null, null }, { "", "" }, { "2721345678", "Cocody" },
                { "+33 61 23", null }, { "07 08 47", "08473750" } }) {
            SmsSendResult r = SmsImpl.refusAvantEnvoi(client(cas[0], cas[1]));
            assertTrue(r != null && !r.isAccepted(), String.join("|", String.valueOf(cas[0]), String.valueOf(cas[1])));
            assertEquals("NUMERO_INVALIDE", r.getErrorCode());
            assertEquals(0, r.getHttpStatus(), "aucun appel HTTP");
        }
    }

    /**
     * Rapprochement : l'ecran des notifications (NotificationClientDTO.clientPhone) montre le numero qui part au
     * fournisseur ; avant, il montrait l'ancien champ adresse (vide, ou une adresse postale).
     */
    @Test
    public void lEcranDesNotificationsMontreLeNumeroEnvoye() {
        String[] valeurs = { null, "", "0708473750", "+225 05 08 47 37 50", "0102030405", "2721345678",
                "Cocody Riviera 3", "BP 2111" };
        Random hasard = new Random(2111L);
        int envoyes = 0;
        for (int i = 0; i < 2000; i++) {
            TClient c = client(valeurs[hasard.nextInt(valeurs.length)], valeurs[hasard.nextInt(valeurs.length)]);
            dal.NotificationClient nc = new dal.NotificationClient();
            nc.setClient(c);
            String affiche = new commonTasks.dto.NotificationClientDTO(nc).getClientPhone();
            if (SmsImpl.refusAvantEnvoi(c) == null) {
                envoyes++;
                assertEquals(TelephoneClient.controler(c).getLocal(), affiche,
                        "tel=" + c.getStrTELEPHONE() + " adresse=" + c.getStrADRESSE());
            } else {
                assertEquals(TelephoneClient.affiche(c.getStrTELEPHONE(), c.getStrADRESSE()), affiche,
                        "jamais une adresse postale pour un numero");
            }
        }
        assertTrue(envoyes > 200, "jeu d'essai : " + envoyes + " envois");
        assertEquals("0708473750", affiche("0708473750", "Cocody Riviera 3"));
        assertEquals("0102030405", affiche(null, "0102030405"));
        assertEquals("", affiche("", "Yopougon"));
    }

    private static String affiche(String telephone, String adresse) {
        dal.NotificationClient nc = new dal.NotificationClient();
        nc.setClient(client(telephone, adresse));
        return new commonTasks.dto.NotificationClientDTO(nc).getClientPhone();
    }

    /** Coherence : sur 20 000 fiches tirees au hasard, refus si et seulement si la regle ne retient aucun numero. */
    @Test
    public void refusSiEtSeulementSiAucunNumeroRetenu() {
        String[] valeurs = { null, "", "  ", "0708473750", "+225 07 08 47 37 50", "002250508473750", "05.08.47.37.51",
                "0102030405", "2721345678", "0033612345678", "08473750", "07 08 47", "Cocody Riviera 3", "BP 2111",
                "Yopougon, rue 12", "0708473750 / 0102030405", "abc" };
        Random hasard = new Random(21112026L);
        int envoyes = 0;
        int refuses = 0;
        for (int i = 0; i < 20000; i++) {
            String tel = valeurs[hasard.nextInt(valeurs.length)];
            String adr = valeurs[hasard.nextInt(valeurs.length)];
            TClient c = client(tel, adr);
            SmsSendResult r = SmsImpl.refusAvantEnvoi(c);
            boolean retenu = TelephoneClient.controler(c).isValide();
            assertEquals(retenu, r == null, "tel=" + tel + " adresse=" + adr);
            if (r == null) {
                envoyes++;
                /*
                 * depuis le 22/11 (point 8.3) : numero ivoirien a 10 chiffres, ou etranger « +indicatif » de 8 a 15
                 * chiffres
                 */
                String local = TelephoneClient.controler(c).getLocal();
                assertTrue(local.matches("\\d{10}|\\+\\d{8,15}"), "numero retenu : " + local);
            } else {
                refuses++;
                assertEquals("NUMERO_INVALIDE", r.getErrorCode());
                for (String v : new String[] { tel, adr }) {
                    String chiffres = v == null ? "" : v.replaceAll("\\D", "");
                    if (chiffres.length() >= 6) {
                        assertFalse(r.getErrorMessage().contains(chiffres), "le motif ne recopie pas le numero");
                    }
                }
            }
        }
        assertTrue(envoyes > 1000 && refuses > 1000,
                "jeu d'essai varie : " + envoyes + " envois, " + refuses + " refus");
    }
}
