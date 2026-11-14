package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import util.SmsUserMessage;

/**
 * Rapport d'exploitation du 13/11, point 6 : le forfait SMS Orange de l'officine a expire le 12/11 (POL0001 « Expired
 * contract »). Constat : 11 suspensions d'une heure, donc 11 evenements identiques ; une consigne en 4 pistes generales
 * qui ne dit pas « forfait expire » ; le numero d'administration en clair dans le journal.
 * <p>
 * Test de COHERENCE sur 5 000 sequences tirees au hasard (graine fixe) : refus de configuration (dont contrat expire),
 * refus passagers, succes, passage du temps. Regles :
 * </p>
 * <ul>
 * <li>la consigne est ecrite UNE fois par panne, quel que soit le nombre de suspensions, et de nouveau apres un succes
 * ;</li>
 * <li>a la reprise, un seul envoi d'essai : s'il est refuse pour la meme raison, les envois sont de nouveau suspendus
 * aussitot (pas 3 refus de plus) ;</li>
 * <li>jamais d'envoi accepte pendant une suspension ; un succes referme tout ;</li>
 * <li>« Expired contract » est reconnu meme sous un code inconnu, et la consigne dit « forfait expire ».</li>
 * </ul>
 */
class SmsContratExpireCoherenceTest {

    /** horloge d'essai, avancee a la main */
    private static final class Horloge extends Clock {
        long ms = 1_763_000_000_000L;

        @Override
        public ZoneId getZone() {
            return ZoneId.systemDefault();
        }

        @Override
        public Clock withZone(ZoneId z) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(ms);
        }
    }

    private static final String EXPIRE = "Erreur de politique générique (Expired contract)";

    @Test
    @DisplayName("Le 13/11 rejoue : 24 heures de forfait expire, une seule consigne")
    void journeeDu13() {
        Horloge h = new Horloge();
        SmsCoupeCircuit c = new SmsCoupeCircuit(h);
        int consignes = 0;
        int appelsOperateur = 0;
        for (int minute = 0; minute < 24 * 60; minute += 5) {
            h.ms += 5 * 60_000L;
            if (c.suspendu()) {
                continue;
            }
            appelsOperateur++;
            if (c.enregistrerRefus("POL0001", EXPIRE)) {
                consignes++;
            }
        }
        assertEquals(1, consignes, "une seule consigne pour la journee");
        // 3 refus pour couper, puis un envoi d'essai par heure : 3 + 23
        assertTrue(appelsOperateur <= 3 + 24, "appels a l'operateur : " + appelsOperateur);
    }

    @Test
    @DisplayName("5 000 sequences : une consigne par panne, essai unique a la reprise, succes qui referme")
    void sequences() {
        Random r = new Random(20261113L);
        for (int s = 0; s < 5000; s++) {
            Horloge h = new Horloge();
            SmsCoupeCircuit c = new SmsCoupeCircuit(h);
            boolean panneSignalee = false;
            boolean dejaSuspenduDansLaPanne = false;
            int configDeSuite = 0;
            int etapes = 5 + r.nextInt(60);
            for (int e = 0; e < etapes; e++) {
                h.ms += (long) r.nextInt(90) * 60_000L;
                boolean etaitSuspendu = c.suspendu();
                int t = r.nextInt(10);
                String quoi = "sequence " + s + " etape " + e;
                if (etaitSuspendu) {
                    // l'application n'appelle pas l'operateur : rien a enregistrer
                    continue;
                }
                if (t < 5) {
                    String code = r.nextBoolean() ? "POL0001" : (r.nextBoolean() ? "X" + r.nextInt(99) : "POL1009");
                    String msg = code.startsWith("X") ? (r.nextBoolean() ? "Expired contract" : "contract expired")
                            : (r.nextBoolean() ? EXPIRE : null);
                    boolean consigne = c.enregistrerRefus(code, msg);
                    configDeSuite++;
                    boolean doitCouper = dejaSuspenduDansLaPanne || configDeSuite >= SmsCoupeCircuit.SEUIL;
                    assertEquals(doitCouper, c.suspendu(), quoi + " : suspension");
                    assertEquals(doitCouper && !panneSignalee, consigne, quoi + " : consigne");
                    if (doitCouper) {
                        panneSignalee = true;
                        dejaSuspenduDansLaPanne = true;
                    }
                } else if (t < 7) {
                    assertFalse(c.enregistrerRefus(r.nextBoolean() ? "POL0013" : "HTTP_503", "panne"), quoi);
                    configDeSuite = 0;
                    assertFalse(c.suspendu(), quoi + " : un refus passager ne coupe jamais");
                } else {
                    c.enregistrerSucces();
                    panneSignalee = false;
                    dejaSuspenduDansLaPanne = false;
                    configDeSuite = 0;
                    assertFalse(c.suspendu(), quoi);
                }
            }
        }
    }

    @Test
    @DisplayName("« Expired contract » : consigne et message disent « forfait expire », meme sous un code inconnu")
    void contratExpireReconnu() {
        assertTrue(SmsCoupeCircuit.erreurDeConfiguration("SVC9999", "Expired contract"));
        assertFalse(SmsCoupeCircuit.erreurDeConfiguration("SVC9999", "autre chose"));
        String consigne = SmsCoupeCircuit.consigne("POL0001", EXPIRE, 3);
        assertTrue(consigne.contains("Forfait SMS Orange expiré"), consigne);
        assertFalse(consigne.contains("senderAddress"), "pas de pistes hors sujet : " + consigne);
        assertEquals("Forfait SMS Orange expiré : le renouveler (envois SMS suspendus)",
                SmsCoupeCircuit.messageCourt("ORANGE", "POL0001", EXPIRE));
        String court = SmsCoupeCircuit.messageCourt("ORANGE", "POL0001", "Erreur de politique générique");
        assertTrue(court.contains("POL0001"), court);
        String pourLaCaisse = SmsUserMessage.friendly("POL0001", EXPIRE);
        assertTrue(pourLaCaisse.startsWith("Forfait SMS Orange expiré"), pourLaCaisse);
    }

    @Test
    @DisplayName("Le numero d'administration n'apparait jamais en clair")
    void numeroAdministrationMasque() {
        Random r = new Random(7L);
        for (int i = 0; i < 1000; i++) {
            String numero = (r.nextBoolean() ? "+225" : "") + "07" + String.format("%08d", r.nextInt(100_000_000));
            String detail = SmsImpl.detailAdministration(numero, "Erreur de politique générique");
            assertFalse(detail.contains(numero), detail);
            assertFalse(detail.contains(numero.substring(numero.length() - 8)), detail);
            assertTrue(detail.endsWith("Erreur : Erreur de politique générique"), detail);
        }
    }
}
