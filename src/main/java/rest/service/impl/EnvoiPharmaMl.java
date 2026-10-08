package rest.service.impl;

import java.io.IOException;
import java.net.ConnectException;
import java.net.NoRouteToHostException;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.channels.UnresolvedAddressException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.lang3.StringUtils;

/**
 * Envoi HTTP d'un message PharmaML avec adresse de secours (retours du 07/10). L'adresse de secours n'est essayee que
 * si la principale est INJOIGNABLE (connexion impossible ou adresse introuvable : rien n'a pu partir). Une reponse,
 * meme en erreur, ou un depassement du delai de reponse ne declenchent jamais le secours : le grossiste a pu recevoir
 * le message, le renvoyer ailleurs risquerait une commande en double.
 */
public final class EnvoiPharmaMl {

    private static final Logger LOG = Logger.getLogger(EnvoiPharmaMl.class.getName());

    /** Resultat : la reponse et l'adresse qui l'a donnee. */
    public static final class Resultat {
        public final HttpResponse<String> reponse;
        public final String url;
        public final boolean secours;

        Resultat(HttpResponse<String> reponse, String url, boolean secours) {
            this.reponse = reponse;
            this.url = url;
            this.secours = secours;
        }
    }

    private EnvoiPharmaMl() {
    }

    /** int_PHARMAML_DISPO (TINYINT(1), lu en Boolean ou en nombre selon le pilote) : vide = active. */
    public static boolean disponibiliteActive(Object valeur) {
        if (valeur == null) {
            return true;
        }
        if (valeur instanceof Boolean) {
            return (Boolean) valeur;
        }
        return !(valeur instanceof Number) || ((Number) valeur).intValue() != 0;
    }

    /** Adresses a essayer, dans l'ordre, sans vide ni doublon. */
    public static List<String> adresses(String principale, String secours) {
        List<String> l = new ArrayList<>();
        for (String u : new String[] { principale, secours }) {
            String t = StringUtils.trimToEmpty(u);
            if (!t.isEmpty() && !l.contains(t)) {
                l.add(t);
            }
        }
        return l;
    }

    public static Resultat envoyer(List<String> adresses, String xml, Duration delaiConnexion, Duration delaiReponse)
            throws IOException, InterruptedException {
        return envoyer(adresses, xml, null, null, null, delaiConnexion, delaiReponse);
    }

    /** Nom de l'en-tete HTTP de controle exige par certains repartiteurs (ex. DPCI : statut 11 s'il manque). */
    public static final String ENTETE_CONTROLE = "Content-PharmaML";
    /**
     * Modes de calcul du controle (parametre KEY_PHARMAML_CONTROLE). CSRP (defaut) = specification Pharma-ML v4.8, §
     * 4.4.3 : base64(MD5(corps http + donnee secrete)), donnee secrete = identifiant de l'officine complete a droite
     * par des « 0 » jusqu'a 16 caracteres, suivi de la cle de 4 caracteres du repartiteur. Verifie sur la valeur
     * recalculee par DPCI le 07/10. Les autres modes ne servent que de repli.
     */
    public static final String CSRP = "CSRP", HMAC_MD5 = "HMAC_MD5", MD5_CLE_FIN = "MD5_CLE_FIN",
            MD5_CLE_DEBUT = "MD5_CLE_DEBUT", AUCUN = "AUCUN";

    /** Donnee secrete de la specification : identifiant officine sur 16 caracteres (zeros a droite) + cle. */
    public static String donneeSecrete(String idOfficine, String cle) {
        String id = StringUtils.defaultString(idOfficine).trim();
        id = id.length() >= 16 ? id.substring(0, 16) : StringUtils.rightPad(id, 16, '0');
        return id + StringUtils.defaultString(cle);
    }

    /**
     * Valeur de l'en-tete Content-PharmaML : empreinte du message (octets UTF-8 exactement envoyes), encodee en base64.
     * null si pas de cle ou mode AUCUN. La cle n'est jamais journalisee.
     */
    public static String controle(String xml, String idOfficine, String cle, String mode) {
        String m = StringUtils.defaultIfBlank(StringUtils.upperCase(StringUtils.trim(mode)), CSRP);
        if (StringUtils.isEmpty(cle) || AUCUN.equals(m)) {
            return null;
        }
        byte[] corps = xml.getBytes(StandardCharsets.UTF_8), k = cle.getBytes(StandardCharsets.UTF_8);
        try {
            byte[] empreinte;
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            if (HMAC_MD5.equals(m)) {
                javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacMD5");
                mac.init(new javax.crypto.spec.SecretKeySpec(k, "HmacMD5"));
                empreinte = mac.doFinal(corps);
            } else if (MD5_CLE_FIN.equals(m)) {
                md.update(corps);
                md.update(k);
                empreinte = md.digest();
            } else if (MD5_CLE_DEBUT.equals(m)) {
                md.update(k);
                md.update(corps);
                empreinte = md.digest();
            } else {
                md.update(corps);
                md.update(donneeSecrete(idOfficine, cle).getBytes(StandardCharsets.UTF_8));
                empreinte = md.digest();
            }
            return java.util.Base64.getEncoder().encodeToString(empreinte);
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("controle PharmaML", e);
        }
    }

    public static Resultat envoyer(List<String> adresses, String xml, String idOfficine, String cle, String mode,
            Duration delaiConnexion, Duration delaiReponse) throws IOException, InterruptedException {
        String controle = controle(xml, idOfficine, cle, mode);
        HttpClient client = HttpClient.newBuilder().connectTimeout(delaiConnexion).build();
        IOException derniere = null;
        for (int i = 0; i < adresses.size(); i++) {
            String url = adresses.get(i);
            for (int essai = 1; essai <= ESSAIS_PAR_ADRESSE; essai++) {
                try {
                    HttpRequest.Builder req = HttpRequest.newBuilder().uri(URI.create(url)).timeout(delaiReponse)
                            .header("Content-Type", "text/xml; charset=UTF-8");
                    if (controle != null) {
                        req.header(ENTETE_CONTROLE, controle);
                    }
                    HttpResponse<String> r = client.send(
                            req.POST(HttpRequest.BodyPublishers.ofString(xml, StandardCharsets.UTF_8)).build(),
                            HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                    if (i > 0) {
                        LOG.log(Level.INFO, "PharmaML : message envoye par l''adresse de secours {0}", url);
                    }
                    return new Resultat(r, url, i > 0);
                } catch (IOException e) {
                    if (!injoignable(e)) {
                        throw e;
                    }
                    derniere = e;
                    if (essai < ESSAIS_PAR_ADRESSE) {
                        long attente = attenteAvantEssai(essai);
                        LOG.log(Level.WARNING, "PharmaML : {0} injoignable ({1}), nouvel essai dans {2} ms",
                                new Object[] { url, e.getClass().getSimpleName(), attente });
                        Thread.sleep(attente);
                    } else if (i < adresses.size() - 1) {
                        LOG.log(Level.WARNING,
                                "PharmaML : {0} injoignable apres {1} essais, essai de l''adresse de secours",
                                new Object[] { url, ESSAIS_PAR_ADRESSE });
                    }
                }
            }
        }
        throw derniere != null ? derniere : new ConnectException("aucune adresse PharmaML");
    }

    /**
     * Specification CSRP 4.8 par. 4.1.5 : 3 echecs de connexion avant l'adresse de secours. Le meme XML est renvoye
     * (meme reference de message) : le grossiste reconnait un doublon. Jamais de relance apres une reponse ou un delai
     * de reponse depasse.
     */
    static final int ESSAIS_PAR_ADRESSE = 3;
    /** Attente avant le 2e essai ; doublee ensuite (2 s puis 4 s). Modifiable par les tests. */
    static volatile long attenteInitialeMs = 2000;

    static long attenteAvantEssai(int essai) {
        return attenteInitialeMs << (essai - 1);
    }

    /** Rien n'a pu partir : connexion refusee ou trop longue, adresse introuvable, pas de route. */
    public static boolean injoignable(Throwable ex) {
        for (Throwable c = ex; c != null; c = c.getCause() == c ? null : c.getCause()) {
            if (c instanceof ConnectException || c instanceof HttpConnectTimeoutException
                    || c instanceof UnknownHostException || c instanceof NoRouteToHostException
                    || c instanceof UnresolvedAddressException) {
                return true;
            }
        }
        return false;
    }
}
