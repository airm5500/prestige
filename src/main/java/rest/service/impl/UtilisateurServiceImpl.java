package rest.service.impl;

import dal.TEmplacement;
import dal.TLanguage;
import dal.TRole;
import dal.TRoleUser;
import dal.TUser;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.UtilisateurService;
import toolkits.parameters.commonparameter;
import toolkits.security.Md5;
import util.KeyUtilGen;

/**
 * Administration des utilisateurs en REST. Reprend a l'identique les regles de visibilite de
 * bll.userManagement.user.showAllOrOneEmplacement, les memes cles JSON que ws_data.jsp et le MEME hachage de mot de
 * passe (Md5.encode) que la connexion : aucun changement de comportement, seulement un chargement plus rapide.
 */
@Stateless
public class UtilisateurServiceImpl implements UtilisateurService {

    private static final Logger LOG = Logger.getLogger(UtilisateurServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;
    private static final String JAMAIS = "<span style='color: blue;'>Jamais</span>";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @javax.ejb.EJB
    private rest.service.LogService logService;

    private String connectedRoleName(TUser user) {
        try {
            for (TRoleUser roleUser : user.getTRoleUserCollection()) {
                if (roleUser.getLgROLEID() != null
                        && commonparameter.statut_enable.equalsIgnoreCase(roleUser.getLgROLEID().getStrSTATUT())) {
                    return roleUser.getLgROLEID().getStrNAME();
                }
            }
        } catch (Exception ignore) {
        }
        return "";
    }

    /** Vrai si l'utilisateur connecte detient le privilege actif nomme (chaine role -> role_privelege). */
    private boolean hasPrivilege(TUser user, String privilegeName) {
        try {
            Object result = em.createNativeQuery("SELECT COUNT(t_privilege.str_NAME) FROM t_role_user "
                    + "INNER JOIN t_user ON t_role_user.lg_USER_ID = t_user.lg_USER_ID "
                    + "INNER JOIN t_role ON t_role.lg_ROLE_ID = t_role_user.lg_ROLE_ID "
                    + "INNER JOIN t_role_privelege ON t_role.lg_ROLE_ID = t_role_privelege.lg_ROLE_ID "
                    + "INNER JOIN t_privilege ON t_role_privelege.lg_PRIVILEGE_ID = t_privilege.lg_PRIVELEGE_ID "
                    + "WHERE t_privilege.str_NAME = ?1 AND t_user.lg_USER_ID = ?2 AND t_privilege.str_STATUT = 'enable'")
                    .setParameter(1, privilegeName).setParameter(2, user.getLgUSERID()).getSingleResult();
            return Integer.parseInt(result + "") > 0;
        } catch (Exception e) {
            LOG.log(Level.WARNING, null, e);
            return false;
        }
    }

    @Override
    public JSONObject listUsers(TUser connecte, String search, boolean etat, boolean actifs, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String roleName = connectedRoleName(connecte);
            boolean superAdmin = bll.userManagement.user.isSuperAdminRole(roleName);
            boolean admin = bll.userManagement.user.isAdminRole(roleName);
            if (!actifs && !superAdmin && !admin) {
                // La vue des utilisateurs desactives est reservee aux administrateurs
                return json.put("total", 0).put("results", results);
            }
            String like = (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
            // etat=true (ou super admin) : tous les emplacements ; sinon celui de l'utilisateur connecte
            String emplacement = (superAdmin || etat) ? "%%" : connecte.getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            StringBuilder where = new StringBuilder(
                    " FROM TRoleUser t WHERE (t.lgUSERID.strFIRSTNAME LIKE ?1" + " OR t.lgUSERID.strLASTNAME LIKE ?1"
                            + " OR CONCAT(t.lgUSERID.strFIRSTNAME,' ',t.lgUSERID.strLASTNAME) LIKE ?1)"
                            + " AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?2 AND t.lgUSERID.strSTATUT = ?3");
            if (!superAdmin && !admin) {
                // Les autres profils ne voient ni l'administrateur ni le super administrateur
                where.append(" AND t.lgROLEID.strNAME NOT LIKE ?4 AND t.lgROLEID.strNAME NOT LIKE ?5")
                        .append(" AND t.lgROLEID.strDESIGNATION NOT LIKE ?4 AND t.lgROLEID.strDESIGNATION NOT LIKE ?5");
            }
            TypedQuery<Long> qc = em.createQuery("SELECT COUNT(t)" + where, Long.class);
            TypedQuery<TRoleUser> q = em.createQuery("SELECT t" + where + " ORDER BY t.lgUSERID.strFIRSTNAME ASC",
                    TRoleUser.class);
            for (Object query : new Object[] { qc, q }) {
                TypedQuery<?> tq = (TypedQuery<?>) query;
                tq.setParameter(1, like).setParameter(2, emplacement).setParameter(3,
                        actifs ? commonparameter.statut_enable : commonparameter.statut_disable);
                if (!superAdmin && !admin) {
                    tq.setParameter(4, commonparameter.ROLE_SUPERADMIN + "%").setParameter(5,
                            commonparameter.ROLE_ADMIN + "%");
                }
            }
            long total = qc.getSingleResult();
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start));
                q.setMaxResults(limit);
            }
            boolean modificationUser = hasPrivilege(connecte, bll.common.Parameter.P_BT_MODIFICATION_USER);
            SimpleDateFormat dateShort = new SimpleDateFormat("dd/MM/yyyy");
            SimpleDateFormat timeShort = new SimpleDateFormat("HH:mm:ss");
            for (TRoleUser roleUser : q.getResultList()) {
                TUser u = roleUser.getLgUSERID();
                JSONObject row = new JSONObject().put("lg_USER_ID", u.getLgUSERID()).put("str_IDS", u.getStrIDS())
                        .put("str_LOGIN", StringUtils.defaultString(u.getStrLOGIN()))
                        .put("str_PASSWORD", StringUtils.defaultString(u.getStrPASSWORD()))
                        .put("str_FIRST_NAME", StringUtils.defaultString(u.getStrFIRSTNAME()))
                        .put("str_LAST_NAME", StringUtils.defaultString(u.getStrLASTNAME()));
                if (u.getStrLASTCONNECTIONDATE() != null) {
                    row.put("str_LAST_CONNECTION_DATE", dateShort.format(u.getStrLASTCONNECTIONDATE()));
                    row.put("str_LAST_CONNECTION_TIME", timeShort.format(u.getStrLASTCONNECTIONDATE()));
                } else {
                    row.put("str_LAST_CONNECTION_DATE", JAMAIS);
                    row.put("str_LAST_CONNECTION_TIME", JAMAIS);
                }
                row.put("str_STATUT", StringUtils.defaultString(u.getStrSTATUT()))
                        .put("str_LIEU_TRAVAIL",
                                u.getLgEMPLACEMENTID() != null
                                        ? StringUtils.defaultString(u.getLgEMPLACEMENTID().getStrDESCRIPTION()) : "")
                        .put("str_FIRST_LAST_NAME",
                                StringUtils.defaultString(u.getStrFIRSTNAME()) + " "
                                        + StringUtils.defaultString(u.getStrLASTNAME()))
                        .put("lg_Language_ID",
                                u.getLgLanguageID() != null
                                        ? StringUtils.defaultString(u.getLgLanguageID().getStrDescription()) : "")
                        .put("lg_ROLE_ID",
                                roleUser.getLgROLEID() != null
                                        ? StringUtils.defaultString(roleUser.getLgROLEID().getStrDESIGNATION()) : "")
                        .put("P_BT_MODIFICATION_USER", modificationUser);
                results.put(row);
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listUsers", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject createUser(String login, String password, int ids, String firstName, String lastName,
            String roleId, String languageId, String emplacementId) {
        JSONObject json = new JSONObject();
        try {
            if (StringUtils.isBlank(login) || StringUtils.isBlank(password)) {
                return json.put("success", FAILED).put("errors", "Login et mot de passe sont obligatoires");
            }
            List<TUser> doublons = em
                    .createQuery("SELECT t FROM TUser t WHERE t.strLOGIN = ?1 AND t.strSTATUT = ?2", TUser.class)
                    .setParameter(1, login.trim()).setParameter(2, commonparameter.statut_enable).getResultList();
            if (!doublons.isEmpty()) {
                return json.put("success", FAILED).put("errors", "Ce login est déjà utilisé par un autre utilisateur");
            }
            TLanguage language = em.find(TLanguage.class, StringUtils.defaultIfBlank(languageId, "1"));
            if (language == null) {
                return json.put("success", FAILED).put("errors", "Veuillez sélectionner une langue valide");
            }
            TEmplacement emplacement = em.find(TEmplacement.class, emplacementId);
            if (emplacement == null) {
                return json.put("success", FAILED).put("errors", "Veuillez sélectionner un lieu de travail valide");
            }
            TRole role = em.find(TRole.class, roleId);
            if (role == null) {
                return json.put("success", FAILED).put("errors", "Veuillez sélectionner un profil valide");
            }
            TUser user = new TUser();
            user.setLgUSERID(new KeyUtilGen().getComplexId());
            user.setStrLOGIN(login.trim());
            user.setStrIDS(ids);
            // MEME hachage que le flux de connexion : Md5.encode
            user.setStrPASSWORD(Md5.encode(password));
            user.setStrFIRSTNAME(StringUtils.trimToEmpty(firstName));
            user.setStrLASTNAME(StringUtils.trimToEmpty(lastName));
            user.setStrSTATUT(commonparameter.statut_enable);
            user.setStrTYPE(commonparameter.PARAMETER_CUSTOMER);
            user.setBCHANGEPASSWORD(false);
            user.setIntCONNEXION(0);
            user.setLgLanguageID(language);
            user.setLgEMPLACEMENTID(emplacement);
            user.setStrPIC("default.png");
            em.persist(user);

            TRoleUser roleUser = new TRoleUser();
            roleUser.setLgUSERROLEID(new KeyUtilGen().getComplexId());
            roleUser.setLgROLEID(role);
            roleUser.setLgUSERID(user);
            roleUser.setDtCREATED(new Date());
            em.persist(roleUser);

            return json.put("success", SUCCESS)
                    .put("errors", "Utilisateur " + user.getStrFIRSTNAME() + " créé avec succès")
                    .put("LG_USER_ID", user.getLgUSERID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "createUser", e);
            return json.put("success", FAILED).put("errors", "Échec de création de l'utilisateur");
        }
    }

    @Override
    public JSONObject updateUser(String userId, String login, int ids, String firstName, String lastName,
            String languageId, String emplacementId, String roleId) {
        JSONObject json = new JSONObject();
        try {
            TUser user = em.find(TUser.class, userId);
            if (user == null) {
                return json.put("success", FAILED).put("errors", "Utilisateur introuvable");
            }
            if (StringUtils.isNotBlank(login) && !login.trim().equalsIgnoreCase(user.getStrLOGIN())) {
                List<TUser> doublons = em
                        .createQuery(
                                "SELECT t FROM TUser t WHERE t.strLOGIN = ?1 AND t.strSTATUT = ?2 AND t.lgUSERID <> ?3",
                                TUser.class)
                        .setParameter(1, login.trim()).setParameter(2, commonparameter.statut_enable)
                        .setParameter(3, userId).getResultList();
                if (!doublons.isEmpty()) {
                    return json.put("success", FAILED).put("errors",
                            "Ce login est déjà utilisé par un autre utilisateur");
                }
                user.setStrLOGIN(login.trim());
            }
            user.setStrIDS(ids);
            user.setStrFIRSTNAME(StringUtils.trimToEmpty(firstName));
            user.setStrLASTNAME(StringUtils.trimToEmpty(lastName));
            user.setStrSTATUT(commonparameter.statut_enable);
            TLanguage language = em.find(TLanguage.class, StringUtils.defaultIfBlank(languageId, ""));
            if (language != null) {
                user.setLgLanguageID(language);
            }
            TEmplacement emplacement = em.find(TEmplacement.class, StringUtils.defaultIfBlank(emplacementId, ""));
            if (emplacement != null) {
                user.setLgEMPLACEMENTID(emplacement);
            }
            em.merge(user);

            // Changement de profil : suppression puis recreation du lien (comme l'existant).
            // Repli par libelle/description : l'ecran historique envoie parfois la
            // designation du profil au lieu de son identifiant (edition en ligne).
            TRole role = em.find(TRole.class, StringUtils.defaultIfBlank(roleId, ""));
            if (role == null && StringUtils.isNotBlank(roleId)) {
                List<TRole> parLibelle = em.createQuery(
                        "SELECT t FROM TRole t WHERE (t.strNAME = ?1 OR t.strDESIGNATION = ?1) AND t.strSTATUT = ?2",
                        TRole.class).setParameter(1, roleId.trim()).setParameter(2, commonparameter.statut_enable)
                        .setMaxResults(1).getResultList();
                role = parLibelle.isEmpty() ? null : parLibelle.get(0);
            }
            if (role != null) {
                List<TRoleUser> liens = em
                        .createQuery("SELECT t FROM TRoleUser t WHERE t.lgUSERID.lgUSERID = ?1", TRoleUser.class)
                        .setParameter(1, userId).getResultList();
                final String roleIdEffectif = role.getLgROLEID();
                boolean dejaCeRole = liens.stream()
                        .anyMatch(l -> l.getLgROLEID() != null && roleIdEffectif.equals(l.getLgROLEID().getLgROLEID()));
                if (!dejaCeRole) {
                    for (TRoleUser lien : liens) {
                        em.remove(lien);
                    }
                    TRoleUser roleUser = new TRoleUser();
                    roleUser.setLgUSERROLEID(new KeyUtilGen().getComplexId());
                    roleUser.setLgROLEID(role);
                    roleUser.setLgUSERID(user);
                    roleUser.setDtCREATED(new Date());
                    em.persist(roleUser);
                }
            }
            return json.put("success", SUCCESS).put("errors", "Utilisateur modifié avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateUser", e);
            return json.put("success", FAILED).put("errors", "Impossible de modifier cet utilisateur");
        }
    }

    @Override
    public JSONObject updatePassword(String userId, String password) {
        JSONObject json = new JSONObject();
        try {
            TUser user = em.find(TUser.class, userId);
            if (user == null) {
                return json.put("success", FAILED).put("errors", "Utilisateur introuvable");
            }
            if (StringUtils.isBlank(password) || password.length() < 8) {
                return json.put("success", FAILED).put("errors", "Le mot de passe doit contenir au moins 8 caractères");
            }
            // MEME hachage que le flux de connexion : Md5.encode
            user.setStrPASSWORD(Md5.encode(password));
            em.merge(user);
            return json.put("success", SUCCESS).put("errors", "Mot de passe réinitialisé avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updatePassword", e);
            return json.put("success", FAILED).put("errors",
                    "Impossible de réinitialiser le mot de passe de l'utilisateur sélectionné");
        }
    }

    /** Tables et colonnes referencant la table donnee par cle etrangere (schema courant). */
    @SuppressWarnings("unchecked")
    private List<Object[]> referencesVers(String tableReferencee) {
        return em
                .createNativeQuery("SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE kcu"
                        + " WHERE kcu.REFERENCED_TABLE_SCHEMA = DATABASE() AND kcu.REFERENCED_TABLE_NAME = ?1")
                .setParameter(1, tableReferencee).getResultList();
    }

    /** Libelle parlant des tables d'activite les plus courantes pour le message d'erreur. */
    private String libelleActivite(String table) {
        switch (table.toLowerCase()) {
        case "t_caisse":
            return "opérations de caisse";
        case "t_preenregistrement":
            return "ventes";
        case "t_order":
            return "commandes";
        case "t_user_phone":
            return "téléphones d'alerte";
        default:
            return "données liées : " + table;
        }
    }

    @Override
    public JSONObject toggleUserStatus(TUser connecte, String userId, boolean actif) {
        JSONObject json = new JSONObject();
        try {
            TUser user = em.find(TUser.class, userId);
            if (user == null) {
                return json.put("success", FAILED).put("errors", "Utilisateur introuvable");
            }
            if (!actif && connecte != null && connecte.getLgUSERID().equals(userId)) {
                return json.put("success", FAILED).put("errors", "Impossible de désactiver l'utilisateur connecté");
            }
            user.setStrSTATUT(actif ? commonparameter.statut_enable : commonparameter.statut_disable);
            user.setDtUPDATED(new Date());
            em.merge(user);
            // Trace dans le fichier journal : qui a active/desactive quel utilisateur
            if (connecte != null) {
                String desc = (actif ? "Activation" : "Désactivation") + " de l'utilisateur " + user.getStrFIRSTNAME()
                        + " " + user.getStrLASTNAME() + " (" + user.getStrLOGIN() + "), par "
                        + connecte.getStrFIRSTNAME() + " " + connecte.getStrLASTNAME();
                logService.updateItem(connecte, user.getLgUSERID(), desc,
                        actif ? dal.enumeration.TypeLog.ACTIVATION_UTILISATEUR
                                : dal.enumeration.TypeLog.DESACTIVATION_UTILISATEUR,
                        user);
            }
            return json.put("success", SUCCESS).put("errors", actif ? "Utilisateur réactivé avec succès"
                    : "Utilisateur désactivé avec succès : il ne peut plus se connecter");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleUserStatus", e);
            return json.put("success", FAILED).put("errors", "Impossible de changer le statut de cet utilisateur");
        }
    }

    @Override
    public JSONObject deleteUser(TUser connecte, String userId) {
        JSONObject json = new JSONObject();
        try {
            TUser user = em.find(TUser.class, userId);
            if (user == null) {
                return json.put("success", FAILED).put("errors", "Utilisateur introuvable");
            }
            if (connecte != null && connecte.getLgUSERID().equals(userId)) {
                return json.put("success", FAILED).put("errors", "Impossible de supprimer un utilisateur connecté");
            }
            // Verification generique de toute l'activite liee AVANT suppression : le flux historique laissait
            // l'erreur de cle etrangere se produire (t_caisse, etc.) puis affichait un message generique.
            for (Object[] ref : referencesVers("t_user")) {
                String table = String.valueOf(ref[0]);
                String colonne = String.valueOf(ref[1]);
                if ("t_role_user".equalsIgnoreCase(table)) {
                    continue; // lien profil purge ci-dessous
                }
                long nb = ((Number) em
                        .createNativeQuery("SELECT COUNT(*) FROM " + table + " WHERE " + colonne + " = ?1")
                        .setParameter(1, userId).getSingleResult()).longValue();
                if (nb > 0) {
                    return json.put("success", FAILED).put("errors",
                            "Impossible de supprimer cet utilisateur : il a déjà une activité dans l'application (" + nb
                                    + " enregistrement(s) - " + libelleActivite(table) + ")");
                }
            }
            em.createNativeQuery("DELETE FROM t_role_user WHERE lg_USER_ID = ?1").setParameter(1, userId)
                    .executeUpdate();
            em.remove(user);
            em.flush();
            return json.put("success", SUCCESS).put("errors", "Utilisateur supprimé avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "deleteUser", e);
            return json.put("success", FAILED).put("errors", "Impossible de supprimer cet utilisateur");
        }
    }
}
