package rest.service.extranet.commun;

import java.util.EnumMap;
import java.util.Map;

/**
 * Sessions des extranets pour tout le serveur, une par extranet, en memoire seulement (effacees au redeploiement). Un
 * seul transport par extranet, pour que la pause entre appels vaille pour tous les utilisateurs.
 */
public final class CoffreSessions {

    private static final Map<SourceExtranet, SessionExtranet> SESSIONS = new EnumMap<>(SourceExtranet.class);
    private static final Map<SourceExtranet, TransportExtranet> TRANSPORTS = new EnumMap<>(SourceExtranet.class);
    private static final Map<SourceExtranet, ConnexionExtranet> CONNEXIONS = new EnumMap<>(SourceExtranet.class);

    static {
        for (SourceExtranet s : SourceExtranet.values()) {
            SESSIONS.put(s, new SessionExtranet(s));
        }
    }

    private CoffreSessions() {
    }

    public static SessionExtranet session(SourceExtranet s) {
        return SESSIONS.get(s);
    }

    public static synchronized TransportExtranet transport(SourceExtranet s) {
        return TRANSPORTS.computeIfAbsent(s, x -> {
            TransportExtranet t = new TransportExtranet(SESSIONS.get(x), ExtranetConfiguration.duServeur());
            t.connexion(connexion(x));
            return t;
        });
    }

    /** Connexion automatique de l'extranet (identifiants chargés par le service avant chaque usage). */
    public static synchronized ConnexionExtranet connexion(SourceExtranet s) {
        return CONNEXIONS.computeIfAbsent(s,
                x -> new ConnexionExtranet(SESSIONS.get(x), ExtranetConfiguration.duServeur()));
    }
}
