package rest.service.mobile;

import commonTasks.dto.RetourFournisseurDTO;
import dal.TRetourFournisseur;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.EJBException;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;

/**
 * H4 (Prestige Mobile) : creation idempotente d'une vente ou d'un retour fournisseur.
 * <p>
 * Le telephone envoie une cle unique (en-tete HTTP {@code X-Client-Ref}) sur la requete de creation. La cle est
 * enregistree dans {@code mobile_client_ref} DANS LA MEME TRANSACTION que la creation :
 * <ul>
 * <li>cle deja connue : la creation n'est pas refaite, la reponse de la creation initiale est renvoyee (meme
 * identifiant, meme reference) ;</li>
 * <li>deux envois simultanes de la meme cle : la cle primaire bloque le second jusqu'a la fin du premier, puis le
 * second echoue sur la cle (sa transaction est annulee, rien n'est cree) et relit la reponse du premier ;</li>
 * <li>creation refusee ({@code success:false}) ou en erreur : tout est annule, la cle n'est pas gardee (un nouvel envoi
 * peut reessayer) ;</li>
 * <li>sans en-tete, ou si la table n'existe pas (migration non passee) : comportement d'origine, sans aucun
 * changement.</li>
 * </ul>
 */
@Stateless
public class MobileClientRefService {

    private static final Logger LOG = Logger.getLogger(MobileClientRefService.class.getName());

    public static final String TYPE_VENTE = "VENTE";
    public static final String TYPE_RETOUR_FOURNISSEUR = "RETOUR_FRS";
    /** Annulation de vente (POST vente/{id}/annuler) : meme cle = meme reponse, rien de refait. */
    public static final String TYPE_ANNULATION_VENTE = "ANNULATION_VENTE";
    /** Reserve (demande 15) : creation de suggestion, assort / reassort. */
    public static final String TYPE_SUGGESTION_RESERVE = "SUGG_RESERVE";
    public static final String TYPE_MOUVEMENT_RESERVE = "MVT_RESERVE";
    /** Envoi PharmaML d'une suggestion (demande 2). */
    public static final String TYPE_ENVOI_PHARMAML = "ENVOI_PHARMAML";
    /** Creation et cloture d'ajustement (demandes 1 et 13) : meme cle = meme reponse, rien de refait. */
    public static final String TYPE_AJUSTEMENT = "AJUSTEMENT";
    public static final String TYPE_CLOTURE_AJUSTEMENT = "CLOTURE_AJUSTEMENT";
    /** Longueur maximale d'une cle (colonne ref). */
    public static final int LONGUEUR_MAX = 64;

    private static volatile boolean tablePresente;
    private static volatile long tableVerifieeA;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Resource
    private SessionContext sessionContext;

    /** Ligne de {@code mobile_client_ref}. */
    public static final class Entree {
        public final String ref;
        public final String type;
        public final String entityId;
        public final String reference;
        public final String reponse;

        Entree(String ref, String type, String entityId, String reference, String reponse) {
            this.ref = ref;
            this.type = type;
            this.entityId = entityId;
            this.reference = reference;
            this.reponse = reponse;
        }
    }

    /** Identifiant, reference et texte de reponse d'une creation reussie (null si la creation a echoue). */
    public static final class Cree {
        final String entityId;
        final String reference;
        final String reponse;

        public Cree(String entityId, String reference, String reponse) {
            this.entityId = entityId;
            this.reference = reference;
            this.reponse = reponse;
        }
    }

    /** Cle recue dans l'en-tete, nettoyee (null = pas de cle). */
    public static String normaliser(String ref) {
        return StringUtils.isBlank(ref) ? null : ref.trim();
    }

    /** La table existe (verifie au plus une fois par minute tant qu'elle est absente). */
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public boolean disponible() {
        if (tablePresente) {
            return true;
        }
        long now = System.currentTimeMillis();
        if (now - tableVerifieeA < 60_000L && tableVerifieeA != 0) {
            return false;
        }
        try {
            Number n = (Number) em.createNativeQuery("SELECT COUNT(*) FROM information_schema.tables "
                    + "WHERE table_schema = DATABASE() AND table_name = 'mobile_client_ref'").getSingleResult();
            tablePresente = n != null && n.intValue() > 0;
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "mobile_client_ref : verification de la table impossible", e);
            tablePresente = false;
        }
        tableVerifieeA = now;
        if (!tablePresente) {
            LOG.warning("Table mobile_client_ref absente : X-Client-Ref ignore (migration V6.9.132.1 non passee).");
        }
        return tablePresente;
    }

    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public Optional<Entree> lire(String ref) {
        String r = normaliser(ref);
        if (r == null || r.length() > LONGUEUR_MAX || !disponible()) {
            return Optional.empty();
        }
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em
                .createNativeQuery(
                        "SELECT ref, type, entity_id, reference, reponse FROM mobile_client_ref WHERE ref = ?1")
                .setParameter(1, r).getResultList();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Object[] o = rows.get(0);
        return Optional.of(new Entree(s(o[0]), s(o[1]), s(o[2]), s(o[3]), s(o[4])));
    }

    /** Statut actuel de l'objet cree (null s'il n'existe plus). */
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public String statut(Entree e) {
        String sql;
        if (TYPE_VENTE.equals(e.type)) {
            sql = "SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = ?1";
        } else if (TYPE_RETOUR_FOURNISSEUR.equals(e.type)) {
            sql = "SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = ?1";
        } else {
            return null;
        }
        List<?> rows = em.createNativeQuery(sql).setParameter(1, e.entityId).getResultList();
        return rows.isEmpty() ? null : s(rows.get(0));
    }

    /** Retour fournisseur deja cree, sous la forme renvoyee par /retourfournisseur/new (null s'il n'existe plus). */
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public RetourFournisseurDTO retour(String retourId) {
        TRetourFournisseur f = retourId == null ? null : em.find(TRetourFournisseur.class, retourId);
        return f == null ? null : new RetourFournisseurDTO(f);
    }

    /**
     * Creation idempotente.
     *
     * @param ref
     *            cle recue (X-Client-Ref) ; vide = creation d'origine, sans rien de plus
     * @param type
     *            {@link #TYPE_VENTE} ou {@link #TYPE_RETOUR_FOURNISSEUR}
     * @param creation
     *            la creation d'origine (appel du service existant)
     * @param cree
     *            identifiant/reference/reponse a garder si la creation a reussi (null = echec)
     * @param rejouer
     *            reponse a renvoyer pour une cle deja enregistree
     * @param echec
     *            reponse d'erreur (message)
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public <T> T executer(String ref, String type, Supplier<T> creation, Function<T, Cree> cree,
            Function<Entree, T> rejouer, Function<String, T> echec) {
        String r = normaliser(ref);
        if (r == null || !disponible()) {
            return creation.get();
        }
        if (r.length() > LONGUEUR_MAX) {
            return echec.apply("Clé client trop longue (" + LONGUEUR_MAX + " caractères au maximum).");
        }
        Optional<Entree> deja = lire(r);
        if (deja.isPresent()) {
            return rejouer(deja.get(), type, rejouer, echec);
        }
        try {
            MobileClientRefService self = sessionContext.getBusinessObject(MobileClientRefService.class);
            return self.creerDansUneTransaction(r, type, creation, cree);
        } catch (EJBException | javax.persistence.PersistenceException e) {
            // Le plus souvent : meme cle envoyee deux fois en meme temps ; la transaction perdante est annulee.
            Optional<Entree> apres = lire(r);
            if (apres.isPresent()) {
                LOG.log(Level.INFO, "X-Client-Ref {0} : creation simultanee, reponse de la premiere renvoyee", r);
                return rejouer(apres.get(), type, rejouer, echec);
            }
            LOG.log(Level.SEVERE, "X-Client-Ref " + r + " : creation impossible", e);
            return echec.apply("Erreur :: l'opération a échouée");
        }
    }

    /**
     * Operation a reponse JSON ({success, ...}) faite une seule fois par cle X-Client-Ref : la meme cle renvoie la
     * reponse de la premiere fois, sans rien refaire. Sans cle : l'operation, comme avant. Un echec n'est pas garde (la
     * cle reste libre pour un nouvel essai).
     *
     * @param identifiant
     *            identifiant de l'objet cree tire de la reponse (null : « OK »)
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public String uneFois(String clientRef, String type, Supplier<org.json.JSONObject> operation,
            Function<org.json.JSONObject, String> identifiant) {
        if (normaliser(clientRef) == null) {
            return operation.get().toString();
        }
        return executer(clientRef, type, () -> operation.get().toString(), r -> {
            org.json.JSONObject o = new org.json.JSONObject(r);
            if (!o.optBoolean("success")) {
                return null;
            }
            String id = identifiant == null ? null : identifiant.apply(o);
            return new Cree(StringUtils.isBlank(id) ? "OK" : id, null, r);
        }, e -> e.reponse, msg -> new org.json.JSONObject().put("success", false).put("msg", msg).toString());
    }

    private static <T> T rejouer(Entree e, String type, Function<Entree, T> rejouer, Function<String, T> echec) {
        if (!type.equals(e.type)) {
            return echec.apply("Clé client déjà utilisée pour une autre opération (" + e.type + ").");
        }
        if (e.entityId == null) {
            return echec.apply("Création en cours pour cette clé : réessayez dans un instant.");
        }
        T t = rejouer.apply(e);
        return t != null ? t : echec.apply("L'objet créé avec cette clé n'existe plus sur le serveur.");
    }

    /** Usage interne (appel via le conteneur pour la transaction) : cle + creation, valide ou annule ensemble. */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public <T> T creerDansUneTransaction(String ref, String type, Supplier<T> creation, Function<T, Cree> cree) {
        // La cle est posee AVANT la creation : un envoi simultane de la meme cle attend ici la fin de celui-ci.
        em.createNativeQuery("INSERT INTO mobile_client_ref (ref, type, created_at) VALUES (?1, ?2, NOW())")
                .setParameter(1, ref).setParameter(2, type).executeUpdate();
        T result = creation.get();
        Cree c = result == null ? null : cree.apply(result);
        if (c == null || StringUtils.isBlank(c.entityId)) {
            // Creation refusee : rien n'est garde (ni la cle, ni une creation partielle).
            sessionContext.setRollbackOnly();
            return result;
        }
        em.createNativeQuery("UPDATE mobile_client_ref SET entity_id = ?1, reference = ?2, reponse = ?3 WHERE ref = ?4")
                .setParameter(1, c.entityId).setParameter(2, c.reference).setParameter(3, c.reponse)
                .setParameter(4, ref).executeUpdate();
        return result;
    }

    /** Cles conservees : elles ne servent qu'aux reprises d'envoi, quelques jours suffisent. */
    public static final int CONSERVATION_JOURS = 90;

    /** Purge de nuit des cles anciennes (retours du 12/10) ; rien si la table n'existe pas. */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public int purger() {
        if (!disponible()) {
            return 0;
        }
        return em.createNativeQuery(
                "DELETE FROM mobile_client_ref WHERE created_at < NOW() - INTERVAL " + CONSERVATION_JOURS + " DAY")
                .executeUpdate();
    }

    private static String s(Object o) {
        return o == null ? null : o.toString();
    }
}
