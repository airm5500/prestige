package rest.service.utils;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import java.util.function.Supplier;
import org.json.JSONObject;

/**
 * Cache court des etats lourds (demande du 02/11) : l'ecran charge les donnees, l'impression les reprend au lieu de
 * refaire le meme calcul. Le PDF est alors aussi celui de l'ecran, meme si une vente arrive entre les deux clics.
 *
 * <ul>
 * <li>l'ecran calcule toujours ({@link #ecran}) et garde le resultat ;</li>
 * <li>l'edition ({@link #edition}) reprend le resultat de la meme session, du meme etat et des memes filtres, s'il a
 * moins de 5 minutes ; sinon elle calcule comme avant ;</li>
 * <li>le resultat est garde en texte : chaque lecture en refait un objet neuf, que l'edition peut modifier sans toucher
 * a ce qui est garde ;</li>
 * <li>un resultat en echec ({@code success: false}) n'est pas garde ; sans session, rien n'est garde ;</li>
 * <li>taille bornee : au-dela, les plus anciens sortent.</li>
 * <li>les etats dont l'ecran et l'edition partagent des objets (listes de lignes) passent par {@link #ecranObjet} et
 * {@link #editionObjet} : l'objet garde est rendu tel quel, l'edition ne le modifie pas (elle trie une copie) ; au plus
 * {@link #OBJETS_MAX} objets gardes.</li>
 * <li>un filtre absent et un filtre vide sont le meme filtre (parametres d'une requete).</li>
 * </ul>
 */
public final class CacheEtats {

    static final long DUREE_MS = 5 * 60_000L;
    /** Environ 64 Mo (caracteres de 2 octets). */
    static final long TAILLE_MAX_CARACTERES = 32_000_000L;

    static LongSupplier horloge = System::currentTimeMillis;

    private static final class Entree {
        final String json;
        final long le;

        Entree(String json, long le) {
            this.json = json;
            this.le = le;
        }
    }

    private static final Map<String, Entree> ENTREES = new ConcurrentHashMap<>();

    static final int OBJETS_MAX = 32;

    private static final class Objet {
        final Object valeur;
        final long le;

        Objet(Object valeur, long le) {
            this.valeur = valeur;
            this.le = le;
        }
    }

    private static final Map<String, Objet> OBJETS = new ConcurrentHashMap<>();

    private CacheEtats() {
    }

    /** Ecran : calcule, garde le resultat pour l'edition et le rend. */
    public static JSONObject ecran(String session, String etat, Supplier<JSONObject> calcul, Object... filtres) {
        JSONObject r = calcul.get();
        if (session != null && r != null && r.optBoolean("success", true)) {
            String json = r.toString();
            ENTREES.put(cle(session, etat, filtres), new Entree(json, horloge.getAsLong()));
            borner();
        }
        return r;
    }

    /** Edition : le resultat de l'ecran s'il est encore frais, sinon le calcul. */
    public static JSONObject edition(String session, String etat, Supplier<JSONObject> calcul, Object... filtres) {
        if (session != null) {
            Entree e = ENTREES.get(cle(session, etat, filtres));
            if (e != null && horloge.getAsLong() - e.le < DUREE_MS) {
                REPRIS.set(Boolean.TRUE);
                return new JSONObject(e.json);
            }
        }
        REPRIS.set(Boolean.FALSE);
        return calcul.get();
    }

    /** Ecran dont le resultat est un objet (liste de lignes) : calcule, garde et rend. */
    public static <T> T ecranObjet(String session, String etat, Supplier<T> calcul, Object... filtres) {
        T r = calcul.get();
        if (session != null && r != null) {
            long maintenant = horloge.getAsLong();
            OBJETS.put(cle(session, etat, filtres), new Objet(r, maintenant));
            OBJETS.values().removeIf(o -> o.le <= maintenant - DUREE_MS);
            while (OBJETS.size() > OBJETS_MAX) {
                OBJETS.entrySet().stream().min((a, b) -> Long.compare(a.getValue().le, b.getValue().le))
                        .ifPresent(x -> OBJETS.remove(x.getKey()));
            }
        }
        return r;
    }

    /** Edition d'un etat garde par {@link #ecranObjet} : l'objet de l'ecran s'il est encore frais, sinon le calcul. */
    @SuppressWarnings("unchecked")
    public static <T> T editionObjet(String session, String etat, Supplier<T> calcul, Object... filtres) {
        if (session != null) {
            Objet o = OBJETS.get(cle(session, etat, filtres));
            if (o != null && horloge.getAsLong() - o.le < DUREE_MS) {
                REPRIS.set(Boolean.TRUE);
                return (T) o.valeur;
            }
        }
        REPRIS.set(Boolean.FALSE);
        return calcul.get();
    }

    private static final ThreadLocal<Boolean> REPRIS = ThreadLocal.withInitial(() -> Boolean.FALSE);

    /**
     * La derniere edition de ce fil a-t-elle repris les donnees de l'ecran ? Les ressources le disent dans l'en-tete
     * {@link #ENTETE} de la reponse (controle des tests, diagnostic).
     */
    public static boolean repris() {
        return REPRIS.get();
    }

    public static final String ENTETE = "X-Donnees-Ecran";

    /** Etats partages entre une ressource d'ecran et une servlet d'edition. */
    public static final String SURSTOCK = "articles-surstock";
    public static final String STAT_FAMILLE = "statistique-famille";

    /**
     * La cle : session, etat et chaque filtre, longueur comprise (« a|b » et « a », « b » different) ; absent = vide.
     */
    static String cle(String session, String etat, Object... filtres) {
        StringBuilder b = new StringBuilder(session).append('\u0000').append(etat);
        for (Object f : filtres) {
            String v = f == null ? "" : String.valueOf(f);
            b.append('\u0000').append(v.length()).append(':').append(v);
        }
        return b.toString();
    }

    private static void borner() {
        long limite = horloge.getAsLong() - DUREE_MS;
        ENTREES.values().removeIf(e -> e.le <= limite);
        while (taille() > TAILLE_MAX_CARACTERES && !ENTREES.isEmpty()) {
            String plusAncienne = null;
            long le = Long.MAX_VALUE;
            for (Iterator<Map.Entry<String, Entree>> it = ENTREES.entrySet().iterator(); it.hasNext();) {
                Map.Entry<String, Entree> x = it.next();
                if (x.getValue().le < le) {
                    le = x.getValue().le;
                    plusAncienne = x.getKey();
                }
            }
            ENTREES.remove(plusAncienne);
        }
    }

    static long taille() {
        long t = 0;
        for (Entree e : ENTREES.values()) {
            t += e.json.length();
        }
        return t;
    }

    static void vider() {
        ENTREES.clear();
        OBJETS.clear();
    }
}
