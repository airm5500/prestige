package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TClient;
import dal.TTypeClient;
import java.util.Random;
import org.junit.jupiter.api.Test;
import util.TelephoneCi;

/**
 * Plan du 21/11, point 8.3 : regles du numero corrige depuis les listes de destinataires. Cohérence sur des milliers de
 * saisies tirees au hasard (graine fixe) : une saisie valide donne toujours un mobile ivoirien a dix chiffres, le meme
 * quelle que soit sa presentation (espaces, points, tirets, +225, 00225, zero de tete perdu) ; toute autre saisie est
 * refusee avec un motif.
 */
class TelephoneClientModificationCoherenceTest {

    private static final String[] PREFIXES = { "01", "05", "07" };

    private static TClient client(String type, String statut) {
        TClient c = new TClient();
        if (type != null) {
            TTypeClient t = new TTypeClient();
            t.setLgTYPECLIENTID(type);
            c.setLgTYPECLIENTID(t);
        }
        c.setStrSTATUT(statut);
        return c;
    }

    private static String presenter(String local, Random r) {
        switch (r.nextInt(7)) {
        case 0:
            return local;
        case 1:
            return local.replaceAll("(..)(?=.)", "$1 ");
        case 2:
            return local.replaceAll("(..)(?=.)", "$1.");
        case 3:
            return "+225 " + local;
        case 4:
            return "00225" + local;
        case 5:
            return "225" + local;
        default:
            return local.substring(1); // zero de tete perdu (tableur)
        }
    }

    @Test
    void uneSaisieValideDonneToujoursLeMemeMobileADixChiffres() {
        Random r = new Random(8_3_2211L);
        for (int i = 0; i < 5000; i++) {
            String local = PREFIXES[r.nextInt(3)] + String.format("%08d", r.nextInt(100_000_000));
            String saisie = presenter(local, r);
            TelephoneCi.Resultat res = TelephoneClientModification.controler(saisie);
            assertTrue(res.isValide(), saisie + " -> " + res.getMotif());
            assertEquals(local, res.getLocal(), saisie);
            assertTrue(res.getLocal().matches("0[157][0-9]{8}"), res.getLocal());
        }
    }

    @Test
    void touteAutreSaisieEstRefuseeAvecUnMotif() {
        Random r = new Random(2211L);
        int refusees = 0;
        for (int i = 0; i < 5000; i++) {
            int n = 1 + r.nextInt(14);
            StringBuilder b = new StringBuilder();
            for (int k = 0; k < n; k++) {
                b.append(r.nextInt(10));
            }
            if (r.nextInt(10) == 0) {
                b.insert(r.nextInt(b.length() + 1), (char) ('a' + r.nextInt(26)));
            }
            String saisie = b.toString();
            TelephoneCi.Resultat res = TelephoneClientModification.controler(saisie);
            if (res.isValide() && res.getLocal().startsWith("+")) {
                /* retour du 22/11 : « 00 » puis un autre indicatif = numero etranger, 8 a 15 chiffres, garde « + » */
                assertTrue(saisie.startsWith("00") && !saisie.startsWith("00225") && !saisie.startsWith("000"), saisie);
                assertEquals("+" + saisie.substring(2), res.getLocal(), saisie);
                assertTrue(saisie.length() - 2 >= 8 && saisie.length() - 2 <= 15, saisie);
            } else if (res.isValide()) {
                /* sinon, seules les formes ivoiriennes mobiles passent */
                assertTrue(res.getLocal().matches("0[157][0-9]{8}"), saisie);
                String chiffres = saisie.replaceAll("^(00225|225)", "");
                assertTrue(chiffres.equals(res.getLocal()) || ("0" + chiffres).equals(res.getLocal()), saisie);
            } else {
                refusees++;
                assertFalse(res.getMotif().isEmpty(), saisie);
                assertEquals("", res.getLocal(), saisie);
                assertTrue(TelephoneClientModification.messageInvalide(res).startsWith("Numéro invalide : "), saisie);
            }
        }
        assertTrue(refusees > 4000, "refusees : " + refusees);
    }

    @Test
    void casLimites() {
        assertFalse(TelephoneClientModification.controler("").isValide());
        assertFalse(TelephoneClientModification.controler(null).isValide());
        assertEquals("Ancien format à 8 chiffres", TelephoneClientModification.controler("08473750").getMotif());
        assertEquals("Numéro fixe (non mobile)", TelephoneClientModification.controler("2720212223").getMotif());
        assertEquals("0708473750", TelephoneClientModification.controler("708473750").getLocal());
        assertEquals("0102030405", TelephoneClientModification.controler("+225 01 02 03 04 05").getLocal());
    }

    @Test
    void tousLesTypesDeClientsActifsSeModifientLAdresseSeulementPourLeStandard() {
        assertNotNull(TelephoneClientModification.motifRefusClient(null));
        assertEquals("Ce client est désactivé.", TelephoneClientModification
                .motifRefusClient(client(ClientStandardSaisie.TYPE_CLIENT_STANDARD, "disable")));
        for (String type : new String[] { ClientStandardSaisie.TYPE_CLIENT_STANDARD, "1", "2", "3", "4", "5", null }) {
            TClient c = client(type, util.Constant.STATUT_ENABLE);
            assertNull(TelephoneClientModification.motifRefusClient(c), String.valueOf(type));
            assertEquals(ClientStandardSaisie.TYPE_CLIENT_STANDARD.equals(type),
                    TelephoneClientModification.ecrireAussiAdresse(c), String.valueOf(type));
        }
    }
}
