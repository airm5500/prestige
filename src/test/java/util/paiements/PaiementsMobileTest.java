package util.paiements;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import util.paiements.FournisseurPaiement.Etat;
import util.paiements.FournisseurPaiement.Resultat;

/** B3 : signatures des notifications (simulateur, CinetPay, Wave), revérification, transitions et idempotence. */
public class PaiementsMobileTest {

    private static Function<String, String> entetes(Map<String, String> m) {
        return k -> {
            for (Map.Entry<String, String> e : m.entrySet()) {
                if (e.getKey().equalsIgnoreCase(k)) {
                    return e.getValue();
                }
            }
            return null;
        };
    }

    /** Serveur HTTP de l'agrégateur, simulé : enregistre les appels et rend une réponse préparée. */
    static final class FauxHttp implements HttpPaiements {
        final List<String> appels = new ArrayList<>();
        final Map<String, Reponse> reponses = new HashMap<>();

        @Override
        public Reponse envoyer(String methode, String url, Map<String, String> entetes, String corps) {
            appels.add(methode + " " + url + " " + (corps == null ? "" : corps));
            Reponse r = reponses.get(methode + " " + url);
            return r != null ? r : new Reponse(404, "{}");
        }
    }

    @BeforeEach
    public void avant() {
        SimulateurPaiement.vider();
    }

    @Test
    public void signatures() {
        String h = Signatures.hmacHex("secret", "message");
        assertEquals("8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b", h,
                "même référence que WhatsApp");
        assertTrue(Signatures.valide("secret", "message", h.toUpperCase()));
        assertFalse(Signatures.valide("autre", "message", h));
        assertFalse(Signatures.valide("secret", "message ", h), "corps modifié");
        assertFalse(Signatures.valide("", "message", h), "secret absent : tout est refusé");
        assertFalse(Signatures.valide("secret", "message", null));
    }

    @Test
    public void configurationDesactiveeParDefautEtSecretsMasques() {
        Map<String, String> env = new HashMap<>();
        assertNull(ConfigPaiements.depuis(env::get).creerFournisseur(new FauxHttp()), "aucun fournisseur : désactivé");
        env.put("PRESTIGE_PAIEMENTS_FOURNISSEUR", "cinetpay");
        env.put("CINETPAY_APIKEY", "CLE-SECRETE");
        env.put("CINETPAY_SITE_ID", "123");
        env.put("CINETPAY_SECRET_KEY", "HMAC-SECRET");
        assertNull(ConfigPaiements.depuis(env::get).creerFournisseur(new FauxHttp()), "sans URL publique : désactivé");
        env.put("PRESTIGE_PAIEMENTS_URL_PUBLIQUE", "https://pharmacie.exemple.ci/prestige/api/v1/");
        ConfigPaiements c = ConfigPaiements.depuis(env::get);
        assertNotNull(c.creerFournisseur(new FauxHttp()));
        assertEquals("https://pharmacie.exemple.ci/prestige/api/v1", c.urlPublique);
        assertFalse(c.toString().contains("CLE-SECRETE"));
        assertFalse(c.toString().contains("HMAC-SECRET"));
        env.put("PRESTIGE_PAIEMENTS_EXPIRATION_MIN", "999");
        assertEquals(60, ConfigPaiements.depuis(env::get).expirationMin);
    }

    @Test
    public void transitions() {
        Etat paye = new Etat(Resultat.PAYE, 6300, "XOF", "OP1", null);
        assertEquals(StatutPaiement.PAYE,
                TransitionsPaiement.appliquer(StatutPaiement.EN_ATTENTE, 6300, "XOF", paye).statut);
        // Notification répétée : rien ne change (idempotence).
        assertEquals(StatutPaiement.PAYE, TransitionsPaiement.appliquer(StatutPaiement.PAYE, 6300, "XOF", paye).statut);
        // Montant différent : jamais payé, anomalie.
        TransitionsPaiement.Decision d = TransitionsPaiement.appliquer(StatutPaiement.EN_ATTENTE, 6300, "XOF",
                new Etat(Resultat.PAYE, 100, "XOF", null, null));
        assertEquals(StatutPaiement.EN_ATTENTE, d.statut);
        assertNotNull(d.anomalie);
        assertEquals(StatutPaiement.EN_ATTENTE, TransitionsPaiement.appliquer(StatutPaiement.EN_ATTENTE, 6300, "XOF",
                new Etat(Resultat.PAYE, 6300, "EUR", null, null)).statut);
        // Paiement tardif après annulation / expiration : à régulariser.
        assertEquals(StatutPaiement.PAYE_APRES_ANNULATION,
                TransitionsPaiement.appliquer(StatutPaiement.ANNULE, 6300, "XOF", paye).statut);
        assertEquals(StatutPaiement.PAYE_APRES_ANNULATION,
                TransitionsPaiement.appliquer(StatutPaiement.EXPIRE, 6300, "XOF", paye).statut);
        // Échec puis en attente : rien ne régresse.
        Etat echec = new Etat(Resultat.ECHOUE, 6300, "XOF", null, null);
        assertEquals(StatutPaiement.ECHOUE,
                TransitionsPaiement.appliquer(StatutPaiement.EN_ATTENTE, 6300, "XOF", echec).statut);
        assertEquals(StatutPaiement.PAYE,
                TransitionsPaiement.appliquer(StatutPaiement.PAYE, 6300, "XOF", echec).statut);
        assertEquals(StatutPaiement.ANNULE, TransitionsPaiement.annuler(StatutPaiement.EN_ATTENTE));
        assertEquals(StatutPaiement.PAYE, TransitionsPaiement.annuler(StatutPaiement.PAYE));
        assertEquals(StatutPaiement.PAYE, TransitionsPaiement.expirer(StatutPaiement.PAYE));
    }

    @Test
    public void simulateurNotificationSigneeEtRevérifiee() {
        SimulateurPaiement s = new SimulateurPaiement("sim-secret");
        FournisseurPaiement.Creation c = s
                .creer(new FournisseurPaiement.Demande("T1", 6300, "XOF", Operateur.WAVE, "vente", "u", "r"));
        assertTrue(c.lien.startsWith("simulateur://payer/T1"));
        assertEquals(Resultat.EN_ATTENTE, s.verifier("T1", c.refFournisseur).resultat);
        String corps = s.payer("T1", null);
        String sig = s.signer(corps);
        assertEquals("T1", s.lireNotification(corps, entetes(Map.of("x-simulateur-signature", sig))));
        assertNull(s.lireNotification(corps, entetes(Map.of(SimulateurPaiement.ENTETE_SIGNATURE, "00"))),
                "signature fausse");
        assertNull(s.lireNotification(corps.replace("T1", "T2"),
                entetes(Map.of(SimulateurPaiement.ENTETE_SIGNATURE, sig))));
        Etat e = s.verifier("T1", c.refFournisseur);
        assertEquals(Resultat.PAYE, e.resultat);
        assertEquals(6300, e.montant);
        // Idempotence : la même notification rejouée 3 fois donne toujours « payé », sans autre effet.
        StatutPaiement st = StatutPaiement.EN_ATTENTE;
        int changements = 0;
        for (int i = 0; i < 3; i++) {
            TransitionsPaiement.Decision d = TransitionsPaiement.appliquer(st, 6300, "XOF", s.verifier(
                    s.lireNotification(corps, entetes(Map.of(SimulateurPaiement.ENTETE_SIGNATURE, sig))), null));
            if (d.change(st)) {
                changements++;
            }
            st = d.statut;
        }
        assertEquals(StatutPaiement.PAYE, st);
        assertEquals(1, changements, "une seule transition (une seule clôture)");
        // Montant payé falsifié par le « client » : refusé.
        s.payer("T1", 100);
        assertEquals(StatutPaiement.EN_ATTENTE,
                TransitionsPaiement.appliquer(StatutPaiement.EN_ATTENTE, 6300, "XOF", s.verifier("T1", null)).statut);
    }

    private static String form(Map<String, String> m) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : m.entrySet()) {
            if (sb.length() > 0) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8)).append('=')
                    .append(URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    @Test
    public void cinetPay() throws Exception {
        FauxHttp http = new FauxHttp();
        CinetPayFournisseur f = new CinetPayFournisseur(http, "APIKEY", "445566", "SECRET");
        http.reponses.put("POST " + CinetPayFournisseur.BASE + "/payment", new HttpPaiements.Reponse(200,
                "{\"code\":\"201\",\"message\":\"CREATED\",\"data\":{\"payment_token\":\"tok1\",\"payment_url\":\"https://checkout.cinetpay.com/payment/tok1\"}}"));
        FournisseurPaiement.Creation c = f.creer(new FournisseurPaiement.Demande("T9", 6300, "XOF", Operateur.ORANGE,
                "vente", "https://ph/notif", "https://ph/retour"));
        assertEquals("https://checkout.cinetpay.com/payment/tok1", c.lien);
        JSONObject envoye = new JSONObject(http.appels.get(0).substring(http.appels.get(0).indexOf('{')));
        assertEquals(6300, envoye.getInt("amount"));
        assertEquals("https://ph/notif", envoye.getString("notify_url"));
        // Notification signée (x-token = HMAC des champs dans l'ordre documenté).
        Map<String, String> champs = new java.util.LinkedHashMap<>();
        champs.put("cpm_site_id", "445566");
        champs.put("cpm_trans_id", "T9");
        champs.put("cpm_trans_date", "2026-10-11 10:00:00");
        champs.put("cpm_amount", "6300");
        champs.put("cpm_currency", "XOF");
        champs.put("payment_method", "OM");
        String corps = form(champs);
        String token = Signatures.hmacHex("SECRET",
                CinetPayFournisseur.donneesToken(CinetPayFournisseur.formulaire(corps)));
        assertEquals("T9", f.lireNotification(corps, entetes(Map.of("X-TOKEN", token))));
        assertNull(f.lireNotification(corps, entetes(Map.of("x-token", Signatures.hmacHex("AUTRE", "x")))));
        assertNull(f.lireNotification(corps.replace("6300", "100"), entetes(Map.of("x-token", token))),
                "montant modifié");
        assertNull(f.lireNotification(corps.replace("445566", "999"), entetes(Map.of("x-token", token))), "autre site");
        // Revérification auprès de l'API.
        http.reponses.put("POST " + CinetPayFournisseur.BASE + "/payment/check", new HttpPaiements.Reponse(200,
                "{\"code\":\"00\",\"message\":\"SUCCES\",\"data\":{\"amount\":\"6300\",\"currency\":\"XOF\",\"status\":\"ACCEPTED\",\"operator_id\":\"MP1\"}}"));
        Etat e = f.verifier("T9", "tok1");
        assertEquals(Resultat.PAYE, e.resultat);
        assertEquals(6300, e.montant);
        http.reponses.put("POST " + CinetPayFournisseur.BASE + "/payment/check",
                new HttpPaiements.Reponse(200, "{\"code\":\"627\",\"data\":{\"status\":\"REFUSED\",\"amount\":6300}}"));
        assertEquals(Resultat.ECHOUE, f.verifier("T9", "tok1").resultat);
        for (String a : http.appels) {
            assertFalse(a.contains("SECRET\""), "la clé de signature n'est jamais envoyée");
        }
    }

    @Test
    public void wave() throws Exception {
        FauxHttp http = new FauxHttp();
        WaveFournisseur f = new WaveFournisseur(http, "wave_sn_prod_x", "whsec");
        f.maintenant = () -> 1_760_000_000L;
        http.reponses.put("POST " + WaveFournisseur.BASE + "/checkout/sessions", new HttpPaiements.Reponse(200,
                "{\"id\":\"cos-1\",\"wave_launch_url\":\"https://pay.wave.com/c/cos-1\",\"checkout_status\":\"open\"}"));
        FournisseurPaiement.Creation c = f
                .creer(new FournisseurPaiement.Demande("T5", 2100, "XOF", Operateur.WAVE, "v", "n", "r"));
        assertEquals("cos-1", c.refFournisseur);
        assertEquals("https://pay.wave.com/c/cos-1", c.lien);
        String corps = "{\"type\":\"checkout.session.completed\",\"data\":{\"id\":\"cos-1\",\"client_reference\":\"T5\"}}";
        String t = "1760000000";
        String sig = "t=" + t + ",v1=" + Signatures.hmacHex("whsec", t + corps);
        assertEquals("T5", f.lireNotification(corps, entetes(Map.of("wave-signature", sig))));
        assertNull(f.lireNotification(corps, entetes(Map.of("Wave-Signature", "t=" + t + ",v1=00"))));
        f.maintenant = () -> 1_760_000_000L + 3600;
        assertNull(f.lireNotification(corps, entetes(Map.of("Wave-Signature", sig))),
                "notification trop ancienne (rejeu)");
        http.reponses.put("GET " + WaveFournisseur.BASE + "/checkout/sessions/cos-1", new HttpPaiements.Reponse(200,
                "{\"id\":\"cos-1\",\"client_reference\":\"T5\",\"amount\":\"2100\",\"currency\":\"XOF\",\"checkout_status\":\"complete\",\"payment_status\":\"succeeded\"}"));
        Etat e = f.verifier("T5", "cos-1");
        assertEquals(Resultat.PAYE, e.resultat);
        assertEquals(2100, e.montant);
        assertEquals(Resultat.EN_ATTENTE, f.verifier("T6", "cos-1").resultat, "session d'une autre transaction");
    }

    @Test
    public void operateursEtModesDeReglement() {
        assertEquals("7", Operateur.ORANGE.typeReglement);
        assertEquals("8", Operateur.MOOV.typeReglement);
        assertEquals("9", Operateur.MTN.typeReglement);
        assertEquals("10", Operateur.WAVE.typeReglement);
        assertEquals(Operateur.ORANGE, Operateur.de("om"));
        assertEquals(Operateur.WAVE, Operateur.de("10"));
        assertNull(Operateur.de("paypal"));
        assertEquals(StatutPaiement.PAYE_APRES_ANNULATION, StatutPaiement.de("paye_apres_annulation"));
    }
}
