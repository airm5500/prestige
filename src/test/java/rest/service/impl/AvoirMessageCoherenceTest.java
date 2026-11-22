package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 11 : etat du message d'avoir d'une vente (liste des avoirs).
 *
 * Regles verifiees sur des milliers de jeux tires au hasard (graine fixe) :
 * <ul>
 * <li>l'etat est celui du dernier envoi ; a date egale le SMS (repli) passe apres WhatsApp, puis l'identifiant ;</li>
 * <li>l'ordre des envois lus en base ne change rien ;</li>
 * <li>WhatsApp : ECHEC -> Échec, LU -> Lu, DELIVRE -> Distribué, ENVOYE/SIMULE -> Envoyé, sinon En attente ;</li>
 * <li>SMS : accuse « distribue » -> Distribué, « impossible » -> Échec, SENT -> Envoyé, LOCK ou code d'erreur -> Échec,
 * sinon En attente ;</li>
 * <li>canal = WhatsApp si l'envoi a une ligne WhatsApp, sinon SMS ; date = mise a jour WhatsApp / envoi SMS, a defaut
 * la creation ;</li>
 * <li>motif seulement sur un echec, jamais vide alors ;</li>
 * <li>parametre du canal : SMS, WHATSAPP ou SMS_WHATSAPP, toute autre valeur (ou absence) = SMS.</li>
 * </ul>
 */
class AvoirMessageCoherenceTest {

    private static final String[] WA = { null, "ECHEC", "LU", "DELIVRE", "ENVOYE", "SIMULE", "INCONNU" };
    private static final String[] SMS_STATUT = { null, "NOT_SEND", "SENT" };
    private static final String[] LIVRAISON = { null, "ACCEPTED_BY_PROVIDER", "DELIVERED_TO_TERMINAL",
            "DELIVERY_IMPOSSIBLE", "ACCEPTED_BY_ORANGE" };
    private static final String[] NOTIF = { "NOT_SEND", "SENT", "LOCK" };

    private static <T> T un(Random r, T[] t) {
        return t[r.nextInt(t.length)];
    }

    private static Date date(Random r) {
        return r.nextInt(8) == 0 ? null : new Date(1_700_000_000_000L + r.nextInt(5) * 1000L);
    }

    private static AvoirMessage.Envoi envoi(Random r, int i) {
        boolean wa = r.nextBoolean();
        String waStatut = wa ? un(r, Arrays.copyOfRange(WA, 1, WA.length)) : null;
        return new AvoirMessage.Envoi("N" + r.nextInt(50) + "-" + i, date(r), un(r, NOTIF), waStatut,
                wa ? date(r) : null, wa && r.nextBoolean() ? "Le client a refusé WhatsApp" : null,
                wa ? "NOT_SEND" : un(r, SMS_STATUT), wa ? null : un(r, LIVRAISON), wa ? null : date(r),
                !wa && r.nextInt(4) == 0 ? "LT400" : null, !wa && r.nextBoolean() ? "No valid addresses" : null);
    }

    /** Reference ecrite a part : etat attendu d'un envoi. */
    private static String etatAttendu(AvoirMessage.Envoi e) {
        if (e.whatsapp != null) {
            if ("ECHEC".equals(e.whatsapp)) {
                return "Échec";
            }
            if ("LU".equals(e.whatsapp)) {
                return "Lu";
            }
            if ("DELIVRE".equals(e.whatsapp)) {
                return "Distribué";
            }
            return "ENVOYE".equals(e.whatsapp) || "SIMULE".equals(e.whatsapp) ? "Envoyé" : "En attente";
        }
        if ("DELIVERED_TO_TERMINAL".equals(e.livraison)) {
            return "Distribué";
        }
        if ("DELIVERY_IMPOSSIBLE".equals(e.livraison)) {
            return "Échec";
        }
        if ("SENT".equals(e.smsStatut)) {
            return "Envoyé";
        }
        return "LOCK".equals(e.notificationStatut) || e.smsErreurCode != null ? "Échec" : "En attente";
    }

    /** Reference : dernier envoi par tri explicite (date, puis SMS apres WhatsApp, puis identifiant). */
    private static AvoirMessage.Envoi dernierAttendu(List<AvoirMessage.Envoi> l) {
        List<AvoirMessage.Envoi> t = new ArrayList<>(l);
        t.sort((a, b) -> {
            long da = a.creeLe == null ? Long.MIN_VALUE : a.creeLe.getTime();
            long db = b.creeLe == null ? Long.MIN_VALUE : b.creeLe.getTime();
            if (da != db) {
                return Long.compare(da, db);
            }
            int ca = a.whatsapp != null ? 0 : 1;
            int cb = b.whatsapp != null ? 0 : 1;
            if (ca != cb) {
                return Integer.compare(ca, cb);
            }
            return a.notificationId.compareTo(b.notificationId);
        });
        return t.get(t.size() - 1);
    }

    @Test
    void etatDuDernierEnvoiSurDesMilliersDeJeux() {
        Random r = new Random(20261122L);
        int echecs = 0;
        int egalites = 0;
        int[] parEtat = new int[5];
        List<String> etats = Arrays.asList("En attente", "Envoyé", "Distribué", "Lu", "Échec");
        for (int k = 0; k < 20_000; k++) {
            int n = 1 + r.nextInt(4);
            List<AvoirMessage.Envoi> l = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                l.add(envoi(r, i));
            }
            AvoirMessage.Etat e = AvoirMessage.etat(l);
            AvoirMessage.Envoi d = dernierAttendu(l);
            String attendu = etatAttendu(d);
            assertNotNull(e, "jeu " + k);
            assertEquals(attendu, e.etat, "jeu " + k);
            assertEquals(AvoirMessage.etat(d), e.etat, "jeu " + k);
            assertEquals(d.whatsapp != null ? "WhatsApp" : "SMS", e.canal, "jeu " + k);
            Date dateAttendue = d.whatsapp != null ? (d.whatsappMaj != null ? d.whatsappMaj : d.creeLe)
                    : (d.smsEnvoyeLe != null ? d.smsEnvoyeLe : d.creeLe);
            assertEquals(dateAttendue, e.date, "jeu " + k);
            if ("Échec".equals(e.etat)) {
                echecs++;
                assertNotNull(e.motif, "jeu " + k);
                assertTrue(!e.motif.trim().isEmpty(), "jeu " + k);
                String propre = d.whatsapp != null ? d.whatsappErreur : d.smsErreur;
                assertEquals(
                        propre != null ? propre
                                : (d.whatsapp != null ? "Refusé par WhatsApp" : "Refusé par le fournisseur SMS"),
                        e.motif);
            } else {
                assertNull(e.motif, "jeu " + k);
            }
            /* l'ordre de lecture en base ne change rien */
            List<AvoirMessage.Envoi> m = new ArrayList<>(l);
            Collections.shuffle(m, r);
            AvoirMessage.Etat e2 = AvoirMessage.etat(m);
            assertEquals(e.etat, e2.etat, "jeu melange " + k);
            assertEquals(e.canal, e2.canal, "jeu melange " + k);
            assertEquals(e.date, e2.date, "jeu melange " + k);
            for (int i = 0; i < l.size(); i++) {
                for (int j = i + 1; j < l.size(); j++) {
                    if (l.get(i).creeLe != null && l.get(i).creeLe.equals(l.get(j).creeLe)) {
                        egalites++;
                    }
                }
            }
            parEtat[etats.indexOf(e.etat)]++;
        }
        /* jeux varies : chaque etat, des echecs et des egalites de date ont bien ete tires */
        for (int i = 0; i < parEtat.length; i++) {
            assertTrue(parEtat[i] > 200, etats.get(i) + " : " + parEtat[i]);
        }
        assertTrue(echecs > 1000 && egalites > 1000, echecs + " / " + egalites);
    }

    @Test
    void repliSmsALaMemeDatePasseApresWhatsApp() {
        Date t = new Date(1_700_000_000_000L);
        AvoirMessage.Envoi wa = new AvoirMessage.Envoi("Z-wa", t, "NOT_SEND", "ECHEC", t, "Le client a refusé WhatsApp",
                "NOT_SEND", null, null, null, null);
        AvoirMessage.Envoi sms = new AvoirMessage.Envoi("A-sms", t, "NOT_SEND", null, null, null, "SENT",
                "ACCEPTED_BY_PROVIDER", t, null, null);
        for (List<AvoirMessage.Envoi> l : Arrays.asList(Arrays.asList(wa, sms), Arrays.asList(sms, wa))) {
            AvoirMessage.Etat e = AvoirMessage.etat(l);
            assertEquals("Envoyé", e.etat);
            assertEquals("SMS", e.canal);
            assertNull(e.motif);
        }
        /* sans repli : l'echec WhatsApp reste visible, avec son motif */
        AvoirMessage.Etat seul = AvoirMessage.etat(Collections.singletonList(wa));
        assertEquals("Échec", seul.etat);
        assertEquals("WhatsApp", seul.canal);
        assertEquals("Le client a refusé WhatsApp", seul.motif);
    }

    @Test
    void venteSansMessage() {
        assertNull(AvoirMessage.etat(Collections.emptyList()));
    }

    @Test
    void canalDuParametre() {
        assertEquals("SMS", AvoirMessage.canal((String) null));
        assertEquals("SMS", AvoirMessage.canal(""));
        assertEquals("SMS", AvoirMessage.canal("SMS"));
        assertEquals("SMS", AvoirMessage.canal("PIGEON"));
        assertEquals("SMS", AvoirMessage.canal("WHATSAPP_SMS"));
        assertEquals("WHATSAPP", AvoirMessage.canal("WHATSAPP"));
        assertEquals("WHATSAPP", AvoirMessage.canal(" whatsapp "));
        assertEquals("SMS_WHATSAPP", AvoirMessage.canal("SMS_WHATSAPP"));
        assertEquals("SMS_WHATSAPP", AvoirMessage.canal("sms_whatsapp"));
    }
}
