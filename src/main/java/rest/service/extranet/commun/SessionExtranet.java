package rest.service.extranet.commun;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.json.JSONObject;

/**
 * Session d'un extranet (option A de l'analyse du 07/11) : l'administrateur se connecte dans son navigateur et colle le
 * ou les cookies dans Prestige. La valeur reste EN MEMOIRE du serveur : elle n'est ni ecrite en base, ni renvoyee par
 * l'API, ni journalisee ; un redeploiement l'efface. {@link #publique()} ne donne que l'etat.
 *
 * <p>
 * Une session par extranet : Ubipharm et TEDIS ne partagent rien. Les cookies renvoyes par l'extranet (Set-Cookie)
 * remplacent les anciens, ce qui suit un eventuel renouvellement.
 */
public final class SessionExtranet {

    public enum Etat {
        NON_CONFIGUREE, A_VERIFIER, VALIDE, EXPIREE
    }

    /** Nom de cookie : jeton HTTP (RFC 6265), sans espace ni separateur. */
    private static final Pattern NOM = Pattern.compile("[A-Za-z0-9!#$%&'*+.^_`|~-]{1,128}");
    /**
     * Valeur : caracteres imprimables sans espace, guillemet, virgule, point-virgule ni antislash (pas d'injection).
     */
    private static final Pattern VALEUR = Pattern
            .compile("[\\x21\\x23-\\x2B\\x2D-\\x3A\\x3C-\\x5B\\x5D-\\x7E]{0,4096}");

    private final SourceExtranet source;
    private final Map<String, String> cookies = new LinkedHashMap<>();
    private Etat etat = Etat.NON_CONFIGUREE;
    private LocalDateTime definieLe;
    private LocalDateTime derniereReussite;
    private LocalDateTime expireeLe;
    private String definiePar;

    public SessionExtranet(SourceExtranet source) {
        this.source = source;
    }

    public SourceExtranet source() {
        return source;
    }

    /**
     * Remplace la session par les cookies colles (« SESSIONID=abc » ou « a=1; b=2 »).
     *
     * @return null si accepte, sinon le motif du refus (sans jamais recopier la valeur)
     */
    public synchronized String definir(String texte, String utilisateur) {
        Map<String, String> lus = analyser(texte);
        if (lus == null) {
            return "Format attendu : NOM=valeur, plusieurs cookies séparés par « ; »";
        }
        cookies.clear();
        cookies.putAll(lus);
        etat = Etat.A_VERIFIER;
        definieLe = LocalDateTime.now();
        definiePar = utilisateur;
        expireeLe = null;
        return null;
    }

    /** Lecture d'un en-tete Cookie colle ; null si un seul element est invalide. */
    static Map<String, String> analyser(String texte) {
        if (texte == null) {
            return null;
        }
        String t = texte.trim();
        if (t.regionMatches(true, 0, "Cookie:", 0, 7)) {
            t = t.substring(7).trim();
        }
        if (t.isEmpty()) {
            return null;
        }
        Map<String, String> m = new LinkedHashMap<>();
        for (String morceau : t.split(";")) {
            String p = morceau.trim();
            if (p.isEmpty()) {
                continue;
            }
            int eg = p.indexOf('=');
            if (eg <= 0) {
                return null;
            }
            String nom = p.substring(0, eg).trim();
            String val = p.substring(eg + 1).trim();
            if (!NOM.matcher(nom).matches() || !VALEUR.matcher(val).matches()) {
                return null;
            }
            m.put(nom, val);
        }
        return m.isEmpty() ? null : m;
    }

    public synchronized void effacer() {
        cookies.clear();
        etat = Etat.NON_CONFIGUREE;
        definieLe = null;
        derniereReussite = null;
        expireeLe = null;
        definiePar = null;
    }

    public synchronized boolean utilisable() {
        return !cookies.isEmpty() && etat != Etat.EXPIREE;
    }

    /** En-tete Cookie a envoyer ; reserve au transport de ce paquet. */
    synchronized String enTeteCookie() {
        StringBuilder sb = new StringBuilder();
        cookies.forEach((k, v) -> {
            if (sb.length() > 0) {
                sb.append("; ");
            }
            sb.append(k).append('=').append(v);
        });
        return sb.toString();
    }

    /** Cookies renvoyes par l'extranet : on garde le couple nom=valeur, un cookie vide ou expire est retire. */
    synchronized void recevoir(List<String> setCookie) {
        if (setCookie == null || cookies.isEmpty()) {
            return;
        }
        for (String sc : setCookie) {
            String premier = sc.split(";", 2)[0];
            int eg = premier.indexOf('=');
            if (eg <= 0) {
                continue;
            }
            String nom = premier.substring(0, eg).trim();
            String val = premier.substring(eg + 1).trim();
            if (!NOM.matcher(nom).matches() || !VALEUR.matcher(val).matches()) {
                continue;
            }
            String bas = sc.toLowerCase();
            if (val.isEmpty() || bas.contains("max-age=0") || bas.contains("expires=thu, 01 jan 1970")) {
                cookies.remove(nom);
            } else {
                cookies.put(nom, val);
            }
        }
    }

    synchronized void reussite() {
        etat = Etat.VALIDE;
        derniereReussite = LocalDateTime.now();
    }

    /** Page de connexion detectee : la session est perdue, sa valeur est effacee. */
    synchronized void expiree() {
        cookies.clear();
        etat = Etat.EXPIREE;
        expireeLe = LocalDateTime.now();
    }

    public synchronized Etat etat() {
        return etat;
    }

    /** Ce que l'ecran peut voir : jamais la valeur, ni le nom des cookies. */
    public synchronized JSONObject publique() {
        return new JSONObject().put("source", source.name()).put("etat", etat.name()).put("definie", !cookies.isEmpty())
                .put("nombreCookies", cookies.size())
                .put("definieLe", definieLe == null ? JSONObject.NULL : definieLe.toString())
                .put("definiePar", definiePar == null ? JSONObject.NULL : definiePar)
                .put("derniereReussite", derniereReussite == null ? JSONObject.NULL : derniereReussite.toString())
                .put("expireeLe", expireeLe == null ? JSONObject.NULL : expireeLe.toString());
    }

    @Override
    public String toString() {
        return "SessionExtranet[" + source + ", " + etat + "]";
    }
}
