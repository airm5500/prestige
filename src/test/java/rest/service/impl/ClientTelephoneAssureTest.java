package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import commonTasks.dto.ClientDTO;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 7 : telephone du client assure (fenetre « Modifier infos client »). Regles verifiees : absent de
 * l'envoi -> fiche non touchee ; vide -> efface ; numero ivoirien (01, 05, 07 + 8 chiffres, indicatif et separateurs
 * toleres) -> enregistre au format local a 10 chiffres ; tout autre numero -> refuse, sans etre repris dans le message.
 */
public class ClientTelephoneAssureTest {

    private static ClientDTO avec(String telephone) {
        ClientDTO c = new ClientDTO();
        c.setStrTELEPHONE(telephone);
        return c;
    }

    @Test
    public void absentVideEtCasSimples() {
        ClientDTO absent = avec(null);
        assertNull(ClientServiceImpl.controleTelephone(absent));
        assertNull(absent.getStrTELEPHONE(), "absent : rien n'est change");

        ClientDTO vide = avec("   ");
        assertNull(ClientServiceImpl.controleTelephone(vide));
        assertEquals("", vide.getStrTELEPHONE(), "vide : efface");

        ClientDTO ok = avec("+225 07 08 47 37 50");
        assertNull(ClientServiceImpl.controleTelephone(ok));
        assertEquals("0708473750", ok.getStrTELEPHONE());

        for (String faux : new String[] { "0208473750", "070847375", "07084737501", "07O8473750", "rue 12",
                "08 47 37 50" }) {
            ClientDTO c = avec(faux);
            String msg = ClientServiceImpl.controleTelephone(c);
            assertNotNull(msg, faux);
            assertEquals(faux, c.getStrTELEPHONE(), "refuse : la saisie n'est pas modifiee");
            assertEquals(-1, msg.indexOf(faux.trim()), "le numero n'est pas repris dans le message");
        }
    }

    /** Coherence sur 5 000 saisies tirees au hasard (graine fixe). */
    @Test
    public void coherenceSurDesMilliersDeSaisies() {
        Random r = new Random(21112026L);
        String[] prefixes = { "01", "05", "07" };
        String[] indicatifs = { "", "225", "+225", "00225", "+225 " };
        String[] separateurs = { "", " ", ".", "-" };
        String[] fauxPrefixes = { "02", "03", "04", "06", "08", "09", "00", "10" };
        for (int i = 0; i < 5000; i++) {
            boolean valide = r.nextInt(3) > 0;
            StringBuilder chiffres = new StringBuilder(
                    valide ? prefixes[r.nextInt(3)] : fauxPrefixes[r.nextInt(fauxPrefixes.length)]);
            int longueur = valide ? 10 : (r.nextBoolean() ? 10 : 9 + 2 * r.nextInt(2));
            while (chiffres.length() < longueur) {
                chiffres.append(r.nextInt(10));
            }
            String sep = separateurs[r.nextInt(separateurs.length)];
            StringBuilder saisie = new StringBuilder(indicatifs[r.nextInt(indicatifs.length)]);
            for (int k = 0; k < chiffres.length(); k++) {
                if (k > 0 && k % 2 == 0) {
                    saisie.append(sep);
                }
                saisie.append(chiffres.charAt(k));
            }
            boolean attenduValide = valide && longueur == 10;
            ClientDTO c = avec(saisie.toString());
            String msg = ClientServiceImpl.controleTelephone(c);
            if (attenduValide) {
                assertNull(msg, saisie.toString());
                assertEquals(chiffres.toString(), c.getStrTELEPHONE(), saisie.toString());
                assertEquals(10, c.getStrTELEPHONE().length());
            } else {
                assertNotNull(msg, saisie.toString());
                assertEquals(saisie.toString(), c.getStrTELEPHONE(), "refuse : saisie intacte");
            }
        }
    }
}
