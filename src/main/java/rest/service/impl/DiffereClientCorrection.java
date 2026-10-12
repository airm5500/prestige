package rest.service.impl;

import dal.TClient;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;

/**
 * CORRECTION DU NOM DU CLIENT D'UN DIFFERE (besoins du 11/10, point 3) : « MOUSSA » saisi par inattention pendant la
 * vente, corrige ensuite en « INOUSSA » depuis la gestion des differes.
 * <p>
 * Seuls le nom et les prenoms changent : sur la fiche du client, et sur le nom recopie dans ses ventes qui portent
 * encore l'ancien nom (une vente faite au nom d'un autre porteur n'est pas touchee). Reserve a un client qui a au moins
 * une vente en differe ; la ressource verifie le droit {@code P_CLIENT_STANDARD_MAJ}. Rien n'est journalise du nom.
 */
@Stateless
public class DiffereClientCorrection {

    private static final Logger LOG = Logger.getLogger(DiffereClientCorrection.class.getName());
    static final int LONGUEUR_MAX = 50;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public JSONObject lire(String clientId) {
        TClient c = StringUtils.isBlank(clientId) ? null : em.find(TClient.class, clientId);
        String motif = motifRefus(c);
        if (motif != null) {
            return refus(motif);
        }
        return new JSONObject().put("success", true).put("client",
                new JSONObject().put("id", c.getLgCLIENTID()).put("nom", StringUtils.defaultString(c.getStrFIRSTNAME()))
                        .put("prenoms", StringUtils.defaultString(c.getStrLASTNAME())));
    }

    public JSONObject corriger(String clientId, JSONObject saisie) {
        TClient c = StringUtils.isBlank(clientId) ? null : em.find(TClient.class, clientId);
        String motif = motifRefus(c);
        if (motif != null) {
            return refus(motif);
        }
        String nom = nettoyer(saisie.optString("nom", ""));
        String prenoms = nettoyer(saisie.optString("prenoms", ""));
        List<String> erreurs = controler(nom, prenoms);
        if (!erreurs.isEmpty()) {
            return refus(String.join(" ", erreurs));
        }
        String ancienNom = c.getStrFIRSTNAME();
        String anciensPrenoms = c.getStrLASTNAME();
        try {
            c.setStrFIRSTNAME(nom);
            c.setStrLASTNAME(prenoms);
            c.setDtUPDATED(new Date());
            em.merge(c);
            /* nom recopie dans les ventes du client qui portent encore l'ancien nom (<=> : NULL compris) */
            em.createNativeQuery(
                    "UPDATE t_preenregistrement SET str_FIRST_NAME_CUSTOMER = ?1, str_LAST_NAME_CUSTOMER = ?2"
                            + " WHERE lg_CLIENT_ID = ?3 AND str_FIRST_NAME_CUSTOMER <=> ?4 AND str_LAST_NAME_CUSTOMER <=> ?5")
                    .setParameter(1, nom).setParameter(2, prenoms).setParameter(3, clientId).setParameter(4, ancienNom)
                    .setParameter(5, anciensPrenoms).executeUpdate();
            return lire(clientId).put("message", "Client corrigé : " + (nom + " " + prenoms).trim() + ".");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "correction du nom du client d'un differe", e);
            return refus("Le nom n'a pas pu être corrigé.");
        }
    }

    /** Espaces de trop retires, majuscules (comme a la saisie des clients). */
    static String nettoyer(String v) {
        return StringUtils.normalizeSpace(StringUtils.defaultString(v)).toUpperCase();
    }

    static List<String> controler(String nom, String prenoms) {
        List<String> erreurs = new ArrayList<>();
        if (nom.isEmpty()) {
            erreurs.add("Le nom est obligatoire.");
        }
        if (nom.length() > LONGUEUR_MAX) {
            erreurs.add("Nom : " + nom.length() + " caractères, " + LONGUEUR_MAX + " au plus.");
        }
        if (prenoms.length() > LONGUEUR_MAX) {
            erreurs.add("Prénoms : " + prenoms.length() + " caractères, " + LONGUEUR_MAX + " au plus.");
        }
        if ((nom + prenoms).chars().anyMatch(Character::isISOControl)) {
            erreurs.add("Caractère de contrôle refusé.");
        }
        return erreurs;
    }

    private String motifRefus(TClient c) {
        if (c == null) {
            return "Client introuvable.";
        }
        if (!util.Constant.STATUT_ENABLE.equals(c.getStrSTATUT())) {
            return "Ce client est désactivé.";
        }
        Number n = (Number) em.createNativeQuery("SELECT COUNT(*) FROM t_compte_client cp"
                + " JOIN t_preenregistrement_compte_client o ON o.lg_COMPTE_CLIENT_ID = cp.lg_COMPTE_CLIENT_ID"
                + " WHERE cp.lg_CLIENT_ID = ?1").setParameter(1, c.getLgCLIENTID()).getSingleResult();
        if (n.intValue() == 0) {
            return "Ce client n'a pas de vente en différé.";
        }
        return null;
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }
}
