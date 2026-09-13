package rest.service.impl;

import dal.TParameters;
import dal.TRoleUser;
import dal.TUser;
import dal.TZoneGeographique;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import dal.TFamille;
import dal.TFamilleZonegeo;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ZoneGeographiqueService;
import toolkits.parameters.commonparameter;
import util.KeyUtilGen;

/**
 * Gestion des emplacements en REST. Reprend a l'identique les regles des JSP historiques
 * (bll.configManagement.familleManagement : visibilite par privilege P_SHOW_ALL_ACTIVITY_ADMIN, unicite du code par
 * officine, prise en compte comptage) avec une vraie pagination SQL.
 */
@Stateless
public class ZoneGeographiqueServiceImpl implements ZoneGeographiqueService {

    private static final Logger LOG = Logger.getLogger(ZoneGeographiqueServiceImpl.class.getName());
    private static final String SUCCESS = commonparameter.PROCESS_SUCCESS;
    private static final String FAILED = commonparameter.PROCESS_FAILED;
    /** Code de l'emplacement par defaut (bll.common.Parameter.DEFAUL_ZONE_GEOGRAPHIQUE) : jamais desactivable. */
    private static final String CODE_ZONE_DEFAUT = bll.common.Parameter.DEFAUL_ZONE_GEOGRAPHIQUE;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Vrai si l'utilisateur connecte detient le privilege actif nomme (meme regle que privilege historique). */
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

    /** Parametre KEY_TAKE_INTO_ACCOUNT = 1 : la colonne de prise en compte comptage est visible (regle historique). */
    private boolean keyTakeIntoAccount() {
        try {
            TParameters param = em.find(TParameters.class, "KEY_TAKE_INTO_ACCOUNT");
            return param != null && Integer.parseInt(param.getStrVALUE().trim()) == 1;
        } catch (Exception e) {
            return false;
        }
    }

    /** Meme regle d'unicite que le flux historique : code deja utilise dans l'officine (statut enable). */
    private boolean codeExiste(TUser user, String code, String zoneIdExclu) {
        List<TZoneGeographique> existants = em
                .createQuery(
                        "SELECT o FROM TZoneGeographique o WHERE o.strCODE = ?1 AND o.lgZONEGEOID <> ?2"
                                + " AND o.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3 AND o.strSTATUT = ?4",
                        TZoneGeographique.class)
                .setParameter(1, code).setParameter(2, StringUtils.defaultString(zoneIdExclu))
                .setParameter(3, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID())
                .setParameter(4, commonparameter.statut_enable).getResultList();
        return !existants.isEmpty();
    }

    @Override
    public JSONObject list(TUser user, String search, boolean actifs, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray results = new JSONArray();
        try {
            if (!actifs && !isAdminOrSuperAdmin(user)) {
                // La vue des emplacements desactives est reservee aux administrateurs
                return json.put("total", 0).put("results", results);
            }
            // Meme visibilite que le flux historique : tout voir avec le privilege, sinon son officine
            String emplacement = hasPrivilege(user, bll.common.Parameter.P_SHOW_ALL_ACTIVITY_ADMIN) ? "%%"
                    : user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            // Recherche en 'contient' : "sir" remonte tous les emplacements contenant "sir"
            String like = "%" + (StringUtils.isBlank(search) ? "" : search.trim()) + "%";
            String statut = actifs ? commonparameter.statut_enable : commonparameter.statut_disable;
            String where = " FROM TZoneGeographique t WHERE (t.strLIBELLEE LIKE ?1 OR t.strCODE LIKE ?1)"
                    + " AND t.strSTATUT = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3";
            TypedQuery<Long> qc = em.createQuery("SELECT COUNT(t)" + where, Long.class).setParameter(1, like)
                    .setParameter(2, statut).setParameter(3, emplacement);
            TypedQuery<TZoneGeographique> q = em
                    .createQuery("SELECT t" + where + " ORDER BY t.strLIBELLEE", TZoneGeographique.class)
                    .setParameter(1, like).setParameter(2, statut).setParameter(3, emplacement);
            long total = qc.getSingleResult();
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start));
                q.setMaxResults(limit);
            }
            boolean keyIntoAccount = keyTakeIntoAccount();
            SimpleDateFormat dateShort = new SimpleDateFormat("dd/MM/yyyy");
            for (TZoneGeographique zone : q.getResultList()) {
                JSONObject row = new JSONObject().put("lg_ZONE_GEO_ID", zone.getLgZONEGEOID())
                        .put("str_LIBELLEE", StringUtils.defaultString(zone.getStrLIBELLEE()))
                        .put("str_CODE", StringUtils.defaultString(zone.getStrCODE()))
                        .put("str_STATUT", StringUtils.defaultString(zone.getStrSTATUT()))
                        .put("bool_ACCOUNT", zone.getBoolACCOUNT()).put("KEYINTOACCOUNT", keyIntoAccount);
                if (zone.getDtCREATED() != null) {
                    row.put("dt_CREATED", dateShort.format(zone.getDtCREATED()));
                }
                if (zone.getDtUPDATED() != null) {
                    row.put("dt_UPDATED", dateShort.format(zone.getDtUPDATED()));
                }
                results.put(row);
            }
            return json.put("total", total).put("results", results);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "list", e);
            return json.put("total", 0).put("results", results);
        }
    }

    @Override
    public JSONObject create(TUser user, String code, String libelle) {
        JSONObject json = new JSONObject();
        try {
            if (StringUtils.isBlank(code) || StringUtils.isBlank(libelle)) {
                return json.put("success", FAILED).put("errors", "Le code et le libellé sont obligatoires");
            }
            if (codeExiste(user, code.trim(), null)) {
                return json.put("success", FAILED).put("errors", "Le Code existe déjà");
            }
            TZoneGeographique zone = new TZoneGeographique();
            zone.setLgZONEGEOID(new KeyUtilGen().getComplexId());
            zone.setStrCODE(code.trim());
            zone.setStrLIBELLEE(libelle.trim());
            zone.setStrSTATUT(commonparameter.statut_enable);
            zone.setDtCREATED(new Date());
            zone.setBoolACCOUNT(true);
            zone.setLgEMPLACEMENTID(user.getLgEMPLACEMENTID());
            em.persist(zone);
            return json.put("success", SUCCESS).put("errors", "Emplacement créé avec succès").put("lg_ZONE_GEO_ID",
                    zone.getLgZONEGEOID());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "create", e);
            return json.put("success", FAILED).put("errors", "Impossible de créer l'emplacement");
        }
    }

    @Override
    public JSONObject update(TUser user, String zoneId, String code, String libelle) {
        JSONObject json = new JSONObject();
        try {
            TZoneGeographique zone = em.find(TZoneGeographique.class, zoneId);
            if (zone == null) {
                return json.put("success", FAILED).put("errors", "Emplacement introuvable");
            }
            if (StringUtils.isBlank(code) || StringUtils.isBlank(libelle)) {
                return json.put("success", FAILED).put("errors", "Le code et le libellé sont obligatoires");
            }
            if (codeExiste(user, code.trim(), zoneId)) {
                return json.put("success", FAILED).put("errors", "Le Code existe déjà");
            }
            zone.setStrCODE(code.trim());
            zone.setStrLIBELLEE(libelle.trim());
            zone.setDtUPDATED(new Date());
            em.merge(zone);
            return json.put("success", SUCCESS).put("errors", "Modification effectuée avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "update", e);
            return json.put("success", FAILED).put("errors", "Impossible de mettre à jour l'emplacement");
        }
    }

    @Override
    public JSONObject updateCount(String zoneId, boolean boolAccount) {
        JSONObject json = new JSONObject();
        try {
            TZoneGeographique zone = em.find(TZoneGeographique.class, zoneId);
            if (zone == null) {
                return json.put("success", FAILED).put("errors", "Emplacement introuvable");
            }
            zone.setBoolACCOUNT(boolAccount);
            zone.setDtUPDATED(new Date());
            em.merge(zone);
            return json.put("success", SUCCESS).put("errors", "Mise à jour effectuée avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "updateCount", e);
            return json.put("success", FAILED).put("errors", "Impossible de mettre à jour l'emplacement");
        }
    }

    /** Nombre de produits actifs rattaches a l'emplacement. */
    private long nbProduits(String zoneId) {
        return em
                .createQuery("SELECT COUNT(f) FROM TFamille f WHERE f.lgZONEGEOID.lgZONEGEOID = ?1"
                        + " AND f.strSTATUT = ?2", Long.class)
                .setParameter(1, zoneId).setParameter(2, commonparameter.statut_enable).getSingleResult();
    }

    /** Applique le changement de statut a une zone. Renvoie null si OK, sinon le message d'erreur. */
    private String changerStatut(TZoneGeographique zone, boolean actif) {
        if (zone == null) {
            return "Emplacement introuvable";
        }
        if (!actif && CODE_ZONE_DEFAUT.equalsIgnoreCase(StringUtils.defaultString(zone.getStrCODE()))) {
            return "L'emplacement par défaut '" + zone.getStrCODE() + "' ne peut pas être désactivé";
        }
        if (!actif) {
            long produits = nbProduits(zone.getLgZONEGEOID());
            if (produits > 0) {
                return "L'emplacement '" + zone.getStrCODE() + "' contient " + produits
                        + " produit(s) : déplacez-les avant de le désactiver";
            }
        }
        zone.setStrSTATUT(actif ? commonparameter.statut_enable : commonparameter.statut_disable);
        zone.setDtUPDATED(new Date());
        em.merge(zone);
        return null;
    }

    @Override
    public JSONObject toggleStatus(TUser user, String zoneId, boolean actif) {
        JSONObject json = new JSONObject();
        try {
            String erreur = changerStatut(em.find(TZoneGeographique.class, zoneId), actif);
            if (erreur != null) {
                return json.put("success", FAILED).put("errors", erreur);
            }
            return json.put("success", SUCCESS).put("errors",
                    actif ? "Emplacement réactivé avec succès" : "Emplacement désactivé avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleStatus", e);
            return json.put("success", FAILED).put("errors", "Impossible de changer le statut de cet emplacement");
        }
    }

    @Override
    public JSONObject toggleStatusMasse(TUser user, String zoneIds, boolean actif) {
        JSONObject json = new JSONObject();
        try {
            if (StringUtils.isBlank(zoneIds)) {
                return json.put("success", FAILED).put("errors", "Aucun emplacement sélectionné");
            }
            int traites = 0;
            StringBuilder refus = new StringBuilder();
            for (String zoneId : zoneIds.split(",")) {
                if (StringUtils.isBlank(zoneId)) {
                    continue;
                }
                TZoneGeographique zone = em.find(TZoneGeographique.class, zoneId.trim());
                String erreur = changerStatut(zone, actif);
                if (erreur == null) {
                    traites++;
                } else if (zone != null) {
                    refus.append(refus.length() > 0 ? ", " : "").append(zone.getStrCODE());
                }
            }
            String message = traites + " emplacement(s) " + (actif ? "réactivé(s)" : "désactivé(s)");
            if (refus.length() > 0) {
                message += " ; non traité(s) : " + refus;
            }
            return json.put("success", traites > 0 ? SUCCESS : FAILED).put("errors", message).put("count", traites);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "toggleStatusMasse", e);
            return json.put("success", FAILED).put("errors", "Impossible de changer le statut des emplacements");
        }
    }

    /* ------------------------------------------------------------ basculement (retours du 12/09, point 3) */

    private static final String PRODUITS_DE_LA_ZONE = " FROM TFamille o WHERE o.lgZONEGEOID.lgZONEGEOID = ?1"
            + " AND o.strSTATUT = 'enable' AND (o.intCIP LIKE ?2 OR o.strNAME LIKE ?2)"
            + " AND o.lgZONEGEOID.lgEMPLACEMENTID.lgEMPLACEMENTID = ?3";

    @Override
    public JSONObject produitsDeLaZone(TUser user, String zoneId, String recherche, int start, int limit) {
        JSONObject json = new JSONObject();
        JSONArray data = new JSONArray();
        try {
            String like = (recherche == null ? "" : recherche.trim()) + "%";
            String emplacement = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            List<Object[]> lignes = em
                    .createQuery("SELECT o.lgFAMILLEID, o.intCIP, o.strNAME, o.intPRICE," + " o.lgZONEGEOID.strLIBELLEE"
                            + PRODUITS_DE_LA_ZONE + " ORDER BY o.strNAME", Object[].class)
                    .setParameter(1, zoneId == null ? "" : zoneId).setParameter(2, like).setParameter(3, emplacement)
                    .setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 15).getResultList();
            long total = em.createQuery("SELECT COUNT(o)" + PRODUITS_DE_LA_ZONE, Long.class)
                    .setParameter(1, zoneId == null ? "" : zoneId).setParameter(2, like).setParameter(3, emplacement)
                    .getSingleResult();
            for (Object[] t : lignes) {
                data.put(new JSONObject().put("lg_FAMILLE_ID", String.valueOf(t[0]))
                        .put("int_CIP", t[1] == null ? "" : String.valueOf(t[1]))
                        .put("str_NAME", t[2] == null ? "" : String.valueOf(t[2]))
                        .put("int_PRICE", t[3] == null ? 0 : t[3])
                        .put("int_NUMBER", stockDisponible(String.valueOf(t[0]), emplacement))
                        .put("str_DESCRIPTION", t[4] == null ? "" : String.valueOf(t[4])).put("isChecked", false));
            }
            json.put("data", data).put("total", total).put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produits de la zone " + zoneId, e);
            json.put("data", new JSONArray()).put("total", 0).put("success", false);
        }
        return json;
    }

    private int stockDisponible(String produitId, String emplacementId) {
        try {
            Object stock = em
                    .createQuery("SELECT COALESCE(SUM(s.intNUMBERAVAILABLE), 0) FROM TFamilleStock s"
                            + " WHERE s.lgFAMILLEID.lgFAMILLEID = ?1 AND s.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2")
                    .setParameter(1, produitId).setParameter(2, emplacementId).getSingleResult();
            return stock instanceof Number ? ((Number) stock).intValue() : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public JSONObject basculer(TUser user, String zoneDestinationId, String zoneOrigineId, String mode,
            List<String> produits, List<String> decoches, String recherche) {
        JSONObject json = new JSONObject();
        try {
            TZoneGeographique destination = zoneDestinationId == null ? null
                    : em.find(TZoneGeographique.class, zoneDestinationId);
            if (destination == null) {
                return json.put("status", 0).put("message", "Choisissez l'emplacement de destination.");
            }
            String emplacement = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            List<String> cibles;
            if ("ALL".equals(mode)) {
                cibles = em
                        .createQuery("SELECT o.lgFAMILLEID" + PRODUITS_DE_LA_ZONE + " ORDER BY o.strNAME", String.class)
                        .setParameter(1, zoneOrigineId == null ? "" : zoneOrigineId)
                        .setParameter(2, (recherche == null ? "" : recherche.trim()) + "%").setParameter(3, emplacement)
                        .getResultList();
                if (decoches != null && !decoches.isEmpty()) {
                    cibles.removeAll(decoches);
                }
            } else {
                cibles = produits == null ? new java.util.ArrayList<>() : produits;
            }
            int compte = 0;
            List<String> ignores = new java.util.ArrayList<>();
            for (String id : cibles) {
                TFamille article = id == null ? null : em.find(TFamille.class, id.trim());
                if (article == null) {
                    ignores.add(String.valueOf(id));
                    continue;
                }
                article.setLgZONEGEOID(destination);
                article.setDtUPDATED(new Date());
                em.merge(article);
                lierProduitAZone(article, destination, user);
                compte++;
            }
            String message = "Le nombre de produits pris en compte : <span style=\"color:blue;font-weight:800; \" >"
                    + compte + "</span>";
            if (!ignores.isEmpty()) {
                message += " - " + ignores.size() + " produit(s) introuvable(s) ignoré(s)";
            }
            return json.put("status", 1).put("message", message).put("count", compte);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "basculement vers " + zoneDestinationId, e);
            return json.put("status", 0).put("message", "Le processus n'a pas abouti : " + e.getMessage());
        }
    }

    /**
     * La ligne t_famille_zonegeo du produit pour l'emplacement de l'utilisateur, mise a jour ou creee : un produit sans
     * ligne (cree hors de l'ecran des emplacements) faisait echouer tout le basculement.
     */
    private void lierProduitAZone(TFamille article, TZoneGeographique destination, TUser user) {
        List<TFamilleZonegeo> liens = em
                .createQuery("SELECT o FROM TFamilleZonegeo o WHERE o.lgFAMILLEID.lgFAMILLEID = ?1"
                        + " AND o.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2", TFamilleZonegeo.class)
                .setParameter(1, article.getLgFAMILLEID())
                .setParameter(2, user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()).setMaxResults(1).getResultList();
        TFamilleZonegeo lien;
        if (liens.isEmpty()) {
            lien = new TFamilleZonegeo();
            lien.setLgFAMILLEZONEGEOID(java.util.UUID.randomUUID().toString());
            lien.setLgFAMILLEID(article);
            lien.setLgEMPLACEMENTID(user.getLgEMPLACEMENTID());
            lien.setStrSTATUT("enable");
            lien.setDtCREATED(new Date());
            lien.setLgZONEGEOID(destination);
            lien.setDtUPDATED(new Date());
            em.persist(lien);
        } else {
            lien = liens.get(0);
            lien.setLgZONEGEOID(destination);
            lien.setDtUPDATED(new Date());
            em.merge(lien);
        }
    }
}
