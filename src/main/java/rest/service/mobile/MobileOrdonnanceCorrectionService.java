package rest.service.mobile;

import java.sql.Timestamp;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * O4 (Prestige Mobile) : apprentissage par correction des ordonnances, partage entre terminaux.
 * <p>
 * Quand le pharmacien valide ou corrige le produit propose pour une ligne d'ordonnance, le telephone retient
 * l'association « segment medicament lu → produit ». Ce service garde ces validations dans
 * {@code mobile_ordonnance_correction} pour que les autres terminaux de la pharmacie en profitent :
 * <ul>
 * <li>envoi par lot, idempotent : la cle {@code cle} (identifiant genere par le telephone) est la cle primaire, un
 * renvoi du meme lot ne cree rien de plus ({@code dejaConnus}) ;</li>
 * <li>lecture differentielle {@code depuis} / {@code jusqua} avec l'horloge de la base (comme H5) ;</li>
 * <li>aucune donnee patient : le telephone n'envoie que le segment « medicament » de la ligne (nom, dosage, forme),
 * filtre et borne (pas le texte lu complet, ni nom, date, telephone). Le serveur ne peut pas reconnaitre un nom de
 * personne : il borne la longueur (60) et n'accepte que lettres minuscules sans accents, chiffres, espaces et
 * {@code % / . , -} ; le filtrage du contenu est fait par le telephone (voir docs/serveur/O4_CORRECTIONS.md).</li>
 * </ul>
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.SUPPORTS)
public class MobileOrdonnanceCorrectionService {

    private static final Logger LOG = Logger.getLogger(MobileOrdonnanceCorrectionService.class.getName());

    public static final int LOT_MAX = 500;
    public static final int LIMITE_DEFAUT = 500;
    public static final int LIMITE_MAX = 2000;
    public static final int CLE_MAX = 64;
    public static final int SEGMENT_MIN = 3;
    public static final int SEGMENT_MAX = 60;
    public static final int NOM_MAX = 100;
    /** Au-dela, le segment porte un numero de telephone ou une date, pas un dosage. */
    public static final int CHIFFRES_MAX = 6;

    private static final Pattern CLE = Pattern.compile("[A-Za-z0-9_.:-]{1,64}");
    private static final Pattern SEGMENT = Pattern.compile("[a-z0-9 %/.,-]+");
    private static final Pattern LETTRES = Pattern.compile(".*[a-z]{3,}.*");

    private static volatile boolean tablePresente;
    private static volatile long tableVerifieeA;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** La table existe (verifiee au plus une fois par minute tant qu'elle est absente). */
    public boolean disponible() {
        if (tablePresente) {
            return true;
        }
        long now = System.currentTimeMillis();
        if (tableVerifieeA != 0 && now - tableVerifieeA < 60_000L) {
            return false;
        }
        try {
            Number n = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM information_schema.tables "
                            + "WHERE table_schema = DATABASE() AND table_name = 'mobile_ordonnance_correction'")
                    .getSingleResult();
            tablePresente = n != null && n.intValue() > 0;
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "mobile_ordonnance_correction : verification de la table impossible", e);
            tablePresente = false;
        }
        tableVerifieeA = now;
        if (!tablePresente) {
            LOG.warning("Table mobile_ordonnance_correction absente (migration V7.1.5 non passee) : "
                    + "partage des apprentissages d'ordonnances indisponible.");
        }
        return tablePresente;
    }

    /** Motif de refus d'une correction, null si elle est acceptable. */
    static String motifRefus(String cle, String segment, String produitId, String cip, String nom) {
        if (cle == null || !CLE.matcher(cle).matches()) {
            return "cle invalide";
        }
        if (segment == null || segment.length() < SEGMENT_MIN || segment.length() > SEGMENT_MAX
                || !SEGMENT.matcher(segment).matches() || !LETTRES.matcher(segment).matches()) {
            return "segment invalide (3 a 60 caracteres : a-z 0-9 espace % / . , -)";
        }
        // un numero de telephone ou une date (donnees du patient) n'est pas un segment medicament
        if (segment.replaceAll("[^0-9]", "").length() > CHIFFRES_MAX) {
            return "segment invalide (numero de telephone ou date)";
        }
        if (produitId == null || produitId.isEmpty() || produitId.length() > 40) {
            return "produit invalide";
        }
        if (cip != null && cip.length() > 20) {
            return "cip invalide";
        }
        if (nom != null && nom.length() > NOM_MAX) {
            return "nom invalide";
        }
        return null;
    }

    private static String texte(JSONObject o, String k) {
        if (o == null || !o.has(k) || o.isNull(k)) {
            return null;
        }
        String s = String.valueOf(o.get(k)).trim();
        return s.isEmpty() ? null : s;
    }

    /**
     * Enregistre un lot. Chaque correction est inseree si sa cle est nouvelle ({@code INSERT IGNORE} sur la cle
     * primaire : deux envois simultanes de la meme cle n'en gardent qu'une). Les corrections refusees (format, produit
     * inconnu) sont listees dans {@code rejetes} ; les autres sont gardees.
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public JSONObject enregistrer(JSONArray lot, String userId) {
        int enregistres = 0;
        int deja = 0;
        JSONArray rejetes = new JSONArray();
        Timestamp maintenant = new Timestamp(maintenant().getTime());
        for (int i = 0; i < lot.length(); i++) {
            JSONObject c = lot.optJSONObject(i);
            String cle = texte(c, "cle");
            String segment = texte(c, "segment");
            String produitId = texte(c, "produitId");
            String cip = texte(c, "cip");
            String nom = texte(c, "nom");
            String motif = c == null ? "correction illisible" : motifRefus(cle, segment, produitId, cip, nom);
            if (motif == null && !produitExiste(produitId)) {
                motif = "produit inconnu";
            }
            if (motif != null) {
                rejetes.put(new JSONObject().put("cle", cle == null ? JSONObject.NULL : cle).put("motif", motif));
                continue;
            }
            Date client = MobileCatalogueDeltaService.lire(texte(c, "at"));
            int n = em
                    .createNativeQuery("INSERT IGNORE INTO mobile_ordonnance_correction (cle, segment, lg_FAMILLE_ID, "
                            + "cip, nom, lg_USER_ID, valide_le, recu_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                    .setParameter(1, cle).setParameter(2, segment).setParameter(3, produitId).setParameter(4, cip)
                    .setParameter(5, nom).setParameter(6, userId)
                    .setParameter(7, client == null ? null : new Timestamp(client.getTime()))
                    .setParameter(8, maintenant).executeUpdate();
            if (n > 0) {
                enregistres++;
            } else {
                deja++;
            }
        }
        return new JSONObject().put("success", true).put("recus", lot.length()).put("enregistres", enregistres)
                .put("dejaConnus", deja).put("rejetes", rejetes)
                .put("serveurMaintenant", MobileCatalogueDeltaService.format(maintenant));
    }

    private boolean produitExiste(String id) {
        Number n = (Number) em.createNativeQuery("SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID = ?1")
                .setParameter(1, id).getSingleResult();
        return n != null && n.intValue() > 0;
    }

    /**
     * Corrections recues dans ({@code depuis}, {@code jusqua}] (horloge de la base), triees par date de reception puis
     * cle. {@code depuis} null : depuis le debut. {@code jusqua} null : maintenant ; le telephone repasse
     * {@code serveurMaintenant} en {@code jusqua} pour les pages suivantes (ensemble fige), puis en {@code depuis}
     * (moins une marge) la fois suivante.
     */
    public JSONObject changements(Date depuis, Date jusqua, int start, int limit) {
        Date fin = jusqua != null ? jusqua : maintenant();
        int lim = limit <= 0 ? LIMITE_DEFAUT : Math.min(limit, LIMITE_MAX);
        int deb = Math.max(start, 0);
        Timestamp d = new Timestamp(depuis == null ? 0L : depuis.getTime());
        Timestamp f = new Timestamp(fin.getTime());
        String where = " FROM mobile_ordonnance_correction WHERE recu_le > ?1 AND recu_le <= ?2";
        Number total = (Number) em.createNativeQuery("SELECT COUNT(*)" + where).setParameter(1, d).setParameter(2, f)
                .getSingleResult();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em
                .createNativeQuery("SELECT cle, segment, lg_FAMILLE_ID, cip, nom, valide_le, recu_le" + where
                        + " ORDER BY recu_le, cle")
                .setParameter(1, d).setParameter(2, f).setFirstResult(deb).setMaxResults(lim).getResultList();
        JSONArray data = new JSONArray();
        for (Object[] r : rows) {
            data.put(new JSONObject().put("cle", s(r[0])).put("segment", s(r[1])).put("produitId", s(r[2]))
                    .put("cip", r[3] == null ? JSONObject.NULL : s(r[3]))
                    .put("nom", r[4] == null ? JSONObject.NULL : s(r[4]))
                    .put("at", r[5] == null ? JSONObject.NULL : MobileCatalogueDeltaService.format(date(r[5])))
                    .put("recuLe", MobileCatalogueDeltaService.format(date(r[6]))));
        }
        return new JSONObject().put("success", true)
                .put("depuis", depuis == null ? JSONObject.NULL : MobileCatalogueDeltaService.format(depuis))
                .put("serveurMaintenant", MobileCatalogueDeltaService.format(fin))
                .put("total", total == null ? 0 : total.longValue()).put("start", deb).put("limit", lim)
                .put("data", data);
    }

    /** Horloge de la base. */
    public Date maintenant() {
        Object o = em.createNativeQuery("SELECT NOW()").getSingleResult();
        if (o instanceof Date) {
            return new Date(((Date) o).getTime() / 1000 * 1000);
        }
        if (o instanceof java.time.LocalDateTime) {
            return Timestamp.valueOf((java.time.LocalDateTime) o);
        }
        return new Date(System.currentTimeMillis() / 1000 * 1000);
    }

    private static Date date(Object o) {
        if (o instanceof Date) {
            return (Date) o;
        }
        if (o instanceof java.time.LocalDateTime) {
            return Timestamp.valueOf((java.time.LocalDateTime) o);
        }
        return new Date(0L);
    }

    private static String s(Object o) {
        return o == null ? null : o.toString();
    }
}
