package util;

import java.net.InetAddress;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import com.kstruct.gethostname4j.Hostname;

/**
 * Nom du poste client, sans jamais bloquer la requete.
 *
 * <p>
 * {@code request.getRemoteHost()} fait une resolution DNS inverse de l'adresse du poste. Sur un reseau d'officine sans
 * serveur DNS local, cette resolution peut bloquer plusieurs secondes jusqu'au delai d'attente du systeme - et de facon
 * ALEATOIRE, selon l'etat du cache DNS. C'etait une des causes des lenteurs de connexion et de deconnexion : chacune la
 * faisait deux fois.
 *
 * <p>
 * Ici la resolution est bornee a {@value #DELAI_MS} ms : au-dela, on journalise l'adresse IP - toujours juste - et la
 * resolution se termine en arriere-plan pour remplir le cache. Les passages suivants du meme poste sont immediats.
 */
public final class NomDePoste {

    /** Attente maximale d'une resolution : au-dela, l'adresse IP suffit au journal. */
    static final long DELAI_MS = 300;

    private static final Map<String, String> CACHE = new ConcurrentHashMap<>();
    private static final ExecutorService RESOLVEUR = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "resolution-nom-de-poste");
        t.setDaemon(true);
        return t;
    });

    private NomDePoste() {
    }

    /**
     * Nom du poste a l'origine de la requete : le nom de la machine locale quand la requete vient du serveur lui-meme,
     * sinon le nom DNS du poste s'il est connu dans le delai, sinon son adresse IP.
     */
    public static String depuis(HttpServletRequest request) {
        if (request == null) {
            return "";
        }
        String ip = StringUtils.defaultString(request.getRemoteAddr());
        if (ip.equals(request.getLocalAddr())) {
            return Hostname.getHostname();
        }
        return resoudre(ip);
    }

    /** Resolution bornee et memoisee d'une adresse IP. Rend l'adresse elle-meme tant que le nom n'est pas connu. */
    static String resoudre(String ip) {
        if (StringUtils.isBlank(ip)) {
            return "";
        }
        String connu = CACHE.get(ip);
        if (connu != null) {
            return connu;
        }
        Future<String> resolution = RESOLVEUR.submit(() -> {
            String nom;
            try {
                nom = InetAddress.getByName(ip).getCanonicalHostName();
            } catch (Exception e) {
                nom = ip;
            }
            CACHE.put(ip, StringUtils.defaultIfBlank(nom, ip));
            return CACHE.get(ip);
        });
        try {
            return resolution.get(DELAI_MS, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            // la resolution continue en arriere-plan et remplira le cache pour la prochaine fois
            return ip;
        } catch (Exception e) {
            return ip;
        }
    }
}
