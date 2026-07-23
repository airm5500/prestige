package rest.service.impl;

import dal.TPrivilege;
import dal.TRole;
import dal.TRolePrivelege;
import dal.TRoleUser;
import dal.TUser;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.RoleService;
import toolkits.parameters.commonparameter;
import util.KeyUtilGen;

/**
 * Gestion des profils en REST. Reprend a l'identique les regles de visibilite des JSP historiques
 * (bll.userManagement.user.lstTRoles et bll.userManagement.privilege.getListePrivilege) avec une vraie pagination SQL
 * et un calcul de l'etat d'attribution en une seule requete (au lieu d'une requete par privilege).
 */
@Stateless
public class RoleServiceImpl implements RoleService {

    private static final Logger LOG = Logger.getLogger(RoleServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Nom du role actif de l'utilisateur connecte (premier role au statut enable). */
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

    private boolean isAdminOrSuperAdmin(TUser user) {
        String name = connectedRoleName(user);
        return bll.userManagement.user.isAdminRole(name) || bll.userManagement.user.isSuperAdminRole(name);
    }

    @Override
    public JSONObject isAdmin(TUser user) {
        return new JSONObject().put("authorize", isAdminOrSuperAdmin(user));
    }

    @Override
    public JSONObject listRoles(TUser user, String search, boolean actifs, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            boolean admin = isAdminOrSuperAdmin(user);
            if (!actifs && !admin) {
                // La vue des profils desactives est reservee aux administrateurs
                return json.put("total", 0).put("results", results);
            }
            String like = (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
            String statut = actifs ? commonparameter.statut_enable : commonparameter.statut_disable;
            StringBuilder where = new StringBuilder(" FROM TRole t WHERE t.strSTATUT = '" + statut
                    + "' AND (t.strNAME LIKE ?1 OR t.strDESIGNATION LIKE ?1)");
            if (!admin) {
                // Les autres profils ne voient ni administrateur ni super administrateur
                where.append(" AND t.strNAME NOT LIKE ?2 AND t.strNAME NOT LIKE ?3")
                        .append(" AND t.strDESIGNATION NOT LIKE ?2 AND t.strDESIGNATION NOT LIKE ?3");
            }
            TypedQuery<Long> qc = em.createQuery("SELECT COUNT(t)" + where, Long.class).setParameter(1, like);
            TypedQuery<TRole> q = em.createQuery("SELECT t" + where + " ORDER BY t.strDESIGNATION", TRole.class)
                    .setParameter(1, like);
            if (!admin) {
                qc.setParameter(2, commonparameter.ROLE_SUPERADMIN + "%").setParameter(3,
                        commonparameter.ROLE_ADMIN + "%");
                q.setParameter(2, commonparameter.ROLE_SUPERADMIN + "%").setParameter(3,
                        commonparameter.ROLE_ADMIN + "%");
            }
            long total = qc.getSingleResult();
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start));
                q.setMaxResults(limit);
            }
            for (TRole role : q.getResultList()) {
                results.put(new JSONObject().put("lg_ROLE_ID", role.getLgROLEID())
                        .put("str_NAME", StringUtils.defaultString(role.getStrNAME()))
                        .put("str_DESIGNATION", StringUtils.defaultString(role.getStrDESIGNATION()))
                        .put("str_TYPE", StringUtils.defaultString(role.getStrTYPE())));
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "listRoles", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject createRole(String name, String designation, String type) {
        JSONObject json = new JSONObject();
        try {
            if (StringUtils.isBlank(name)) {
                return json.put("success", FAILED).put("errors", "Le libellé est obligatoire");
            }
            TRole role = new TRole(new KeyUtilGen().getComplexId());
            role.setStrNAME(name.trim());
            role.setStrDESIGNATION(StringUtils.trimToEmpty(designation));
            role.setStrTYPE(StringUtils.isBlank(type) ? commonparameter.PARAMETER_CUSTOMER : type.trim());
            role.setStrSTATUT(commonparameter.statut_enable);
            role.setDtCREATED(new Date());
            em.persist(role);
            return json.put("success", SUCCESS).put("lg_ROLE_ID", role.getLgROLEID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "createRole", e);
            return json.put("success", FAILED).put("errors", "Création du profil impossible");
        }
    }

    @Override
    public JSONObject updateRole(String roleId, String name, String designation, String type) {
        JSONObject json = new JSONObject();
        try {
            TRole role = em.find(TRole.class, roleId);
            if (role == null) {
                return json.put("success", FAILED).put("errors", "Profil introuvable");
            }
            if (StringUtils.isNotBlank(name)) {
                role.setStrNAME(name.trim());
            }
            role.setStrDESIGNATION(StringUtils.trimToEmpty(designation));
            if (StringUtils.isNotBlank(type)) {
                role.setStrTYPE(type.trim());
            }
            role.setDtUPDATED(new Date());
            em.merge(role);
            return json.put("success", SUCCESS);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateRole", e);
            return json.put("success", FAILED).put("errors", "Modification du profil impossible");
        }
    }

    @Override
    public JSONObject duplicateRole(TUser user, String roleId, String name, String designation) {
        JSONObject json = new JSONObject();
        try {
            TRole source = em.find(TRole.class, roleId);
            if (source == null) {
                return json.put("success", FAILED).put("errors", "Profil d'origine introuvable");
            }
            if (StringUtils.isBlank(name)) {
                return json.put("success", FAILED).put("errors", "Le libellé du nouveau profil est obligatoire");
            }
            TRole copie = new TRole(new KeyUtilGen().getComplexId());
            copie.setStrNAME(name.trim());
            copie.setStrDESIGNATION(StringUtils.trimToEmpty(designation));
            copie.setStrTYPE(source.getStrTYPE());
            copie.setStrSTATUT(commonparameter.statut_enable);
            copie.setDtCREATED(new Date());
            em.persist(copie);

            // Copie de tous les privileges attribues au profil d'origine
            List<TRolePrivelege> liens = em
                    .createQuery("SELECT t FROM TRolePrivelege t WHERE t.lgROLEID.lgROLEID = ?1", TRolePrivelege.class)
                    .setParameter(1, roleId).getResultList();
            int copies = 0;
            for (TRolePrivelege lien : liens) {
                TRolePrivelege nouveau = new TRolePrivelege(new KeyUtilGen().getComplexId());
                nouveau.setLgROLEID(copie);
                nouveau.setLgPRIVILEGEID(lien.getLgPRIVILEGEID());
                nouveau.setDtCREATED(new Date());
                nouveau.setStrCREATEDBY(user != null ? user.getLgUSERID() : null);
                em.persist(nouveau);
                copies++;
            }
            return json.put("success", SUCCESS).put("lg_ROLE_ID", copie.getLgROLEID()).put("privileges", copies);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "duplicateRole", e);
            return json.put("success", FAILED).put("errors", "Duplication du profil impossible");
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

    @Override
    public JSONObject toggleRoleStatus(TUser user, String roleId, boolean actif) {
        JSONObject json = new JSONObject();
        try {
            TRole role = em.find(TRole.class, roleId);
            if (role == null) {
                return json.put("success", FAILED).put("errors", "Profil introuvable");
            }
            String nom = StringUtils.defaultString(role.getStrNAME());
            String designation = StringUtils.defaultString(role.getStrDESIGNATION());
            if (bll.userManagement.user.isAdminRole(nom) || bll.userManagement.user.isSuperAdminRole(nom)
                    || bll.userManagement.user.isAdminRole(designation)
                    || bll.userManagement.user.isSuperAdminRole(designation)
                    || commonparameter.ROLE_PHARMACIEN.equalsIgnoreCase(nom)) {
                return json.put("success", FAILED).put("errors", "Ce profil système ne peut pas être désactivé");
            }
            if (!actif) {
                long nbUtilisateurs = ((Number) em
                        .createNativeQuery("SELECT COUNT(*) FROM t_role_user WHERE lg_ROLE_ID = ?1")
                        .setParameter(1, roleId).getSingleResult()).longValue();
                if (nbUtilisateurs > 0) {
                    return json.put("success", FAILED).put("errors", "Ce profil est attribué à " + nbUtilisateurs
                            + " utilisateur(s) : retirez-le d'abord de ces utilisateurs");
                }
            }
            role.setStrSTATUT(actif ? commonparameter.statut_enable : commonparameter.statut_disable);
            role.setDtUPDATED(new Date());
            em.merge(role);
            return json.put("success", SUCCESS).put("errors",
                    actif ? "Profil réactivé avec succès" : "Profil désactivé avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleRoleStatus", e);
            return json.put("success", FAILED).put("errors", "Impossible de changer le statut de ce profil");
        }
    }

    @Override
    public JSONObject deleteRole(TUser user, String roleId) {
        JSONObject json = new JSONObject();
        try {
            TRole role = em.find(TRole.class, roleId);
            if (role == null) {
                return json.put("success", FAILED).put("errors", "Profil introuvable");
            }
            String nom = StringUtils.defaultString(role.getStrNAME());
            String designation = StringUtils.defaultString(role.getStrDESIGNATION());
            if (bll.userManagement.user.isAdminRole(nom) || bll.userManagement.user.isSuperAdminRole(nom)
                    || bll.userManagement.user.isAdminRole(designation)
                    || bll.userManagement.user.isSuperAdminRole(designation)
                    || commonparameter.ROLE_PHARMACIEN.equalsIgnoreCase(nom)) {
                return json.put("success", FAILED).put("errors", "Ce profil système ne peut pas être supprimé");
            }
            long nbUtilisateurs = ((Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_role_user WHERE lg_ROLE_ID = ?1").setParameter(1, roleId)
                    .getSingleResult()).longValue();
            if (nbUtilisateurs > 0) {
                return json.put("success", FAILED).put("errors", "Ce profil est attribué à " + nbUtilisateurs
                        + " utilisateur(s) : retirez-le d'abord de ces utilisateurs");
            }
            // Verification generique des autres references (evite l'erreur de cle etrangere du flux historique)
            for (Object[] ref : referencesVers("t_role")) {
                String table = String.valueOf(ref[0]);
                String colonne = String.valueOf(ref[1]);
                if ("t_role_privelege".equalsIgnoreCase(table) || "t_role_user".equalsIgnoreCase(table)) {
                    continue;
                }
                long nb = ((Number) em
                        .createNativeQuery("SELECT COUNT(*) FROM " + table + " WHERE " + colonne + " = ?1")
                        .setParameter(1, roleId).getSingleResult()).longValue();
                if (nb > 0) {
                    return json.put("success", FAILED).put("errors",
                            "Ce profil est encore utilisé (données liées : " + table + ") : suppression impossible");
                }
            }
            // Purge des liens privileges du profil puis du profil lui-meme
            em.createNativeQuery("DELETE FROM t_role_privelege WHERE lg_ROLE_ID = ?1").setParameter(1, roleId)
                    .executeUpdate();
            em.remove(role);
            em.flush();
            return json.put("success", SUCCESS).put("errors", "Profil supprimé avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "deleteRole", e);
            return json.put("success", FAILED).put("errors", "Echec de suppression de ce profil");
        }
    }

    /**
     * Clause du catalogue de privileges visibles par l'utilisateur connecte (memes regles que
     * privilege.getListePrivilege : superadmin = tout ; admin/pharmacien = CUSTOMER+ADMIN ; autres = CUSTOMER).
     */
    private String catalogueWhere(TUser user) {
        String roleName = connectedRoleName(user);
        if (bll.userManagement.user.isSuperAdminRole(roleName)) {
            return "";
        }
        if (bll.userManagement.user.isAdminRole(roleName)
                || roleName.equalsIgnoreCase(commonparameter.ROLE_PHARMACIEN)) {
            return " AND (p.str_TYPE = '" + commonparameter.PARAMETER_CUSTOMER + "' OR p.str_TYPE = '"
                    + commonparameter.PARAMETER_ADMIN + "')";
        }
        return " AND p.str_TYPE = '" + commonparameter.PARAMETER_CUSTOMER + "'";
    }

    @Override
    public JSONObject rolePrivileges(TUser user, String roleId, String search, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            String like = (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
            String where = " FROM t_privilege p WHERE p.str_STATUT = 'enable'"
                    + " AND (p.str_DESCRIPTION LIKE ?1 OR p.str_NAME LIKE ?1)" + catalogueWhere(user);
            Query qc = em.createNativeQuery("SELECT COUNT(*)" + where).setParameter(1, like);
            // is_select calcule par jointure : une seule requete pour toute la page
            // (au lieu d'une requete d'existence par privilege dans la JSP historique)
            Query q = em
                    .createNativeQuery("SELECT p.lg_PRIVELEGE_ID, p.str_DESCRIPTION,"
                            + " CASE WHEN rp.lg_ROLE_PRIVILEGE IS NULL THEN 'false' ELSE 'true' END AS is_select"
                            + " FROM t_privilege p LEFT JOIN t_role_privelege rp"
                            + " ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID AND rp.lg_ROLE_ID = ?2"
                            + " WHERE p.str_STATUT = 'enable' AND (p.str_DESCRIPTION LIKE ?1 OR p.str_NAME LIKE ?1)"
                            + catalogueWhere(user) + " ORDER BY p.str_DESCRIPTION ASC")
                    .setParameter(1, like).setParameter(2, roleId);
            long total = ((Number) qc.getSingleResult()).longValue();
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start));
                q.setMaxResults(limit);
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                results.put(new JSONObject().put("lg_PRIVELEGE_ID", String.valueOf(r[0]))
                        .put("str_DESCRIPTION", r[1] != null ? r[1] : "").put("is_select", String.valueOf(r[2])));
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rolePrivileges", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject toggleRolePrivilege(TUser user, String roleId, String privilegeId, boolean checked) {
        JSONObject json = new JSONObject();
        try {
            TRole role = em.find(TRole.class, roleId);
            TPrivilege privilege = em.find(TPrivilege.class, privilegeId);
            if (role == null || privilege == null) {
                return json.put("success", FAILED).put("errors", "Profil ou privilège introuvable");
            }
            List<TRolePrivelege> existants = em.createQuery(
                    "SELECT t FROM TRolePrivelege t WHERE t.lgROLEID.lgROLEID = ?1 AND t.lgPRIVILEGEID.lgPRIVELEGEID = ?2",
                    TRolePrivelege.class).setParameter(1, roleId).setParameter(2, privilegeId).getResultList();
            if (checked) {
                if (existants.isEmpty()) {
                    TRolePrivelege lien = new TRolePrivelege(new KeyUtilGen().getComplexId());
                    lien.setLgROLEID(role);
                    lien.setLgPRIVILEGEID(privilege);
                    lien.setDtCREATED(new Date());
                    lien.setStrCREATEDBY(user != null ? user.getLgUSERID() : null);
                    em.persist(lien);
                }
            } else {
                for (TRolePrivelege lien : existants) {
                    em.remove(lien);
                }
            }
            return json.put("success", SUCCESS);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleRolePrivilege", e);
            return json.put("success", FAILED).put("errors", "Mise à jour du privilège impossible");
        }
    }

    @Override
    public JSONObject toggleAllRolePrivileges(TUser user, String roleId, String search, boolean checked) {
        JSONObject json = new JSONObject();
        try {
            TRole role = em.find(TRole.class, roleId);
            if (role == null) {
                return json.put("success", FAILED).put("errors", "Profil introuvable");
            }
            String like = (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
            int count = 0;
            if (checked) {
                // privileges du catalogue visibles, correspondant a la recherche, PAS encore attribues
                List<?> manquants = em
                        .createNativeQuery("SELECT p.lg_PRIVELEGE_ID FROM t_privilege p"
                                + " WHERE p.str_STATUT = 'enable' AND (p.str_DESCRIPTION LIKE ?1 OR p.str_NAME LIKE ?1)"
                                + catalogueWhere(user) + " AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp"
                                + " WHERE rp.lg_ROLE_ID = ?2 AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID)")
                        .setParameter(1, like).setParameter(2, roleId).getResultList();
                for (Object id : manquants) {
                    TPrivilege privilege = em.find(TPrivilege.class, String.valueOf(id));
                    if (privilege == null) {
                        continue;
                    }
                    TRolePrivelege lien = new TRolePrivelege(new KeyUtilGen().getComplexId());
                    lien.setLgROLEID(role);
                    lien.setLgPRIVILEGEID(privilege);
                    lien.setDtCREATED(new Date());
                    lien.setStrCREATEDBY(user != null ? user.getLgUSERID() : null);
                    em.persist(lien);
                    count++;
                }
            } else {
                count = em
                        .createNativeQuery("DELETE rp FROM t_role_privelege rp"
                                + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
                                + " WHERE rp.lg_ROLE_ID = ?2 AND p.str_STATUT = 'enable'"
                                + " AND (p.str_DESCRIPTION LIKE ?1 OR p.str_NAME LIKE ?1)" + catalogueWhere(user))
                        .setParameter(1, like).setParameter(2, roleId).executeUpdate();
            }
            return json.put("success", SUCCESS).put("count", count);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleAllRolePrivileges", e);
            return json.put("success", FAILED).put("errors", "Mise à jour groupée impossible");
        }
    }
}
