package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import util.sms.SmsProvider;
import util.sms.SmsSendResult;
import util.sms.SmsStatusResult;

/**
 * Journal support du 26/11 (capitale), J26-5 : le SMS d'administration de 00:12 a ete refuse par Orange, code SVC0280 «
 * Message too long. Message length is 940 characters. Maximum allowed is 700 ». Le recapitulatif du ticket Z envoye par
 * SMS compte une section par caissier : au-dela de quelques caissiers il depasse 700 caracteres, et rien ne part.
 * <p>
 * Test de COHERENCE (graine fixe) : textes tires au hasard (sections, lignes vides, lignes plus longues que la limite,
 * caracteres doubles), limites variees. Regles :
 * </p>
 * <ul>
 * <li>chaque SMS fait la limite au plus ; aucun SMS vide (sauf un texte vide, envoye tel quel) ;</li>
 * <li>les SMS mis bout a bout redonnent exactement le texte, dans l'ordre ;</li>
 * <li>une coupure tombe en fin de ligne, sauf dans une ligne plus longue que la limite ; jamais au milieu d'un
 * caractere double ;</li>
 * <li>un refus de l'operateur arrete l'envoi : les morceaux suivants ne partent pas, et le refus est rendu.</li>
 * </ul>
 */
class SmsMessageLongCoherenceTest {

    /** Fournisseur d'essai qui se comporte comme Orange : refus SVC0280 au-dela de 700 caracteres. */
    private static final class OrangeEssai implements SmsProvider {
        final List<String> envoyes = new ArrayList<>();
        int refuserAuNumero = -1;

        @Override
        public String getCode() {
            return "ORANGE";
        }

        @Override
        public SmsSendResult send(String localNumber, String message, String customData) {
            envoyes.add(message);
            if (message.length() > 700) {
                return SmsSendResult.rejected(400, "SVC0280", "Message too long. Message length is " + message.length()
                        + " characters. Maximum allowed is 700.");
            }
            if (envoyes.size() == refuserAuNumero) {
                return SmsSendResult.rejected(403, "POL0001", "Expired contract");
            }
            return SmsSendResult.accepted("id-" + envoyes.size(), 201);
        }

        @Override
        public JSONObject balance() {
            return new JSONObject();
        }

        @Override
        public boolean supportsMessageStatus() {
            return false;
        }

        @Override
        public SmsStatusResult messageStatus(String messageId) {
            return null;
        }
    }

    /**
     * Envoi par le meme chemin que sendSMSStatut, sans instancier le service (pas de lecture de dicisms.properties).
     */
    private static SmsSendResult envoyer(OrangeEssai orange, String texte) {
        return SmsImpl.envoyerEnMorceaux(orange, "0700000000", texte, new SmsCoupeCircuit(Clock.systemDefaultZone()));
    }

    /** Recapitulatif au format de GenerateTicketServiceImpl.sendToSms : une section par caissier, puis le total. */
    private static String ticketZ(Random h, int caissiers) {
        String[] modes = { "ESPECE", "CHEQUE", "CARTE BANCAIRE", "MOBILE MONEY", "DIFFERE", "VIREMENT" };
        StringBuilder sb = new StringBuilder();
        for (int c = 0; c < caissiers; c++) {
            String user = "CAISSIER " + (c + 1) + " NOM" + "X".repeat(h.nextInt(12));
            sb.append("RECAPITULATIF DE ").append(user).append("\n\n");
            int n = 1 + h.nextInt(modes.length);
            for (int m = 0; m < n; m++) {
                sb.append(modes[m]).append(": ").append(h.nextInt(2_000_000)).append("\n");
            }
            sb.append("\n").append("TOTAL ").append(user).append("\n");
            sb.append("MONTANT: ").append(h.nextInt(5_000_000)).append("\n");
        }
        sb.append("\n").append("TOTAL GENERAL").append("\n\n");
        for (String mode : modes) {
            sb.append(mode).append(": ").append(h.nextInt(9_000_000)).append("\n");
        }
        return sb.toString();
    }

    private static void verifierMorceaux(String texte, List<String> morceaux, int max, String cas) {
        assertEquals(texte, String.join("", morceaux), cas + " : bout a bout");
        if (texte.isEmpty()) {
            assertEquals(1, morceaux.size(), cas);
            return;
        }
        for (int i = 0; i < morceaux.size(); i++) {
            String m = morceaux.get(i);
            assertTrue(m.length() <= max, cas + " : morceau " + i + " de " + m.length() + " > " + max);
            assertFalse(m.isEmpty(), cas + " : morceau " + i + " vide");
            boolean dernier = i == morceaux.size() - 1;
            if (!dernier) {
                assertFalse(Character.isHighSurrogate(m.charAt(m.length() - 1)),
                        cas + " : caractere double coupe, morceau " + i);
                if (!m.endsWith("\n")) {
                    // coupure au milieu d'une ligne : seulement si cette ligne seule depasse la limite
                    assertFalse(m.contains("\n"), cas + " : coupure en milieu de ligne, morceau " + i);
                }
            }
        }
    }

    @Test
    @DisplayName("Le 26/11 rejoue : ticket Z de 940 caracteres et plus, accepte en plusieurs SMS de 700 au plus")
    void ticketZDu26() {
        Random h = new Random(20261126L);
        int longs = 0;
        for (int caissiers = 1; caissiers <= 20; caissiers++) {
            String texte = ticketZ(h, caissiers);
            OrangeEssai orange = new OrangeEssai();
            SmsSendResult r = envoyer(orange, texte);
            String cas = caissiers + " caissier(s), " + texte.length() + " caracteres";
            assertTrue(r.isAccepted(), cas + " : " + r.getErrorCode() + " " + r.getErrorMessage());
            verifierMorceaux(texte, orange.envoyes, SmsImpl.LONGUEUR_MAX_SMS, cas);
            if (texte.length() > SmsImpl.LONGUEUR_MAX_SMS) {
                longs++;
                for (String m : orange.envoyes.subList(0, orange.envoyes.size() - 1)) {
                    assertTrue(m.endsWith("\n"), cas + " : une ligne du ticket Z coupee");
                }
            } else {
                assertEquals(1, orange.envoyes.size(), cas + " : un texte court part en un seul SMS");
            }
        }
        assertTrue(longs >= 10, "jeu d'essai : " + longs + " recapitulatifs de plus de 700 caracteres");
    }

    @Test
    @DisplayName("5 000 textes au hasard : limite, bout a bout, coupure en fin de ligne, caracteres doubles")
    void textesAuHasard() {
        Random h = new Random(20261126L);
        String[] pieces = { "a", "Z", "9", " ", ":", "é", "😀", "\n", "\n\n" };
        for (int i = 0; i < 5_000; i++) {
            int max = i % 7 == 0 ? 2 + h.nextInt(20) : (i % 3 == 0 ? SmsImpl.LONGUEUR_MAX_SMS : 2 + h.nextInt(900));
            int longueur = h.nextInt(i % 5 == 0 ? 50 : 4_000);
            StringBuilder sb = new StringBuilder();
            while (sb.length() < longueur) {
                if (h.nextInt(40) == 0) {
                    sb.append("L".repeat(h.nextInt(1_500))); // ligne plus longue que la limite
                } else {
                    sb.append(pieces[h.nextInt(pieces.length)]);
                }
            }
            String texte = sb.toString();
            verifierMorceaux(texte, SmsImpl.decouper(texte, max), max, "cas " + i + " (max " + max + ")");
        }
        assertEquals(List.of(""), SmsImpl.decouper("", 700));
        assertEquals(List.of(""), SmsImpl.decouper(null, 700));
    }

    @Test
    @DisplayName("Un refus en cours d'envoi arrete la suite et est rendu")
    void refusEnCours() {
        Random h = new Random(20261127L);
        for (int essai = 0; essai < 200; essai++) {
            String texte = ticketZ(h, 8 + h.nextInt(12));
            int attendus = SmsImpl.decouper(texte, SmsImpl.LONGUEUR_MAX_SMS).size();
            OrangeEssai orange = new OrangeEssai();
            orange.refuserAuNumero = 1 + h.nextInt(attendus);
            SmsSendResult r = envoyer(orange, texte);
            assertFalse(r.isAccepted(), "essai " + essai);
            assertEquals("POL0001", r.getErrorCode(), "essai " + essai);
            assertEquals(orange.refuserAuNumero, orange.envoyes.size(), "essai " + essai + " : envois apres le refus");
        }
    }
}
