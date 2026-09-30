package rest.service.impl;

import dal.TClient;
import java.time.LocalDate;
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
 * MODIFICATION D'UN CLIENT STANDARD depuis l'ecran de vente (retour du 30/09) : nom, prenoms, telephone, date de
 * naissance et genre. Reservee aux operateurs qui ont le droit P_CLIENT_STANDARD_MAJ ; la ressource le verifie.
 *
 * <p>
 * Memes regles que la creation d'un client standard : nom et prenoms obligatoires, numero ivoirien valide et UNIQUE
 * parmi les clients standards. Un client assurance ou carnet ne se modifie pas ici : il a son propre ecran.
 */
@Stateless
public class ClientStandardModification {

    private static final Logger LOG = Logger.getLogger(ClientStandardModification.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** La fiche a modifier, ou un refus si ce n'est pas un client standard actif. */
    public JSONObject lire(String clientId) {
        TClient c = StringUtils.isBlank(clientId) ? null : em.find(TClient.class, clientId);
        String motif = motifRefusClient(c);
        if (motif != null) {
            return refus(motif);
        }
        String telephone = RechercheClientOrdonnance.telephone(c.getStrTELEPHONE(), c.getStrADRESSE());
        return new JSONObject().put("success", true).put("client",
                new JSONObject().put("id", c.getLgCLIENTID()).put("nom", StringUtils.defaultString(c.getStrFIRSTNAME()))
                        .put("prenoms", StringUtils.defaultString(c.getStrLASTNAME())).put("telephone", telephone)
                        .put("naissance",
                                c.getDtNAISSANCE() == null ? ""
                                        : new java.sql.Date(c.getDtNAISSANCE().getTime()).toLocalDate().toString())
                        .put("sexe", StringUtils.defaultString(c.getStrSEXE())));
    }

    /**
     * Enregistre la fiche. {@code venteId} (facultatif) : la vente en cours, dont le nom et le telephone du client
     * affiches sont mis a jour aussi, si elle est bien en cours et portee par ce client.
     */
    public JSONObject enregistrer(String clientId, JSONObject saisie, String venteId) {
        TClient c = StringUtils.isBlank(clientId) ? null : em.find(TClient.class, clientId);
        String motif = motifRefusClient(c);
        if (motif != null) {
            return refus(motif);
        }
        ClientStandardSaisie controle = ClientStandardSaisie.controler(saisie.optString("nom", ""),
                saisie.optString("prenoms", ""), saisie.optString("telephone", ""));
        List<String> erreurs = new ArrayList<>(controle.getErreurs());
        String naissanceSaisie = saisie.optString("naissance", "");
        String motifNaissance = DateNaissance.valider(naissanceSaisie, LocalDate.now());
        if (motifNaissance != null) {
            erreurs.add(motifNaissance);
        }
        String sexe = StringUtils.trimToEmpty(saisie.optString("sexe", "")).toUpperCase();
        if (!sexe.isEmpty() && !"F".equals(sexe) && !"M".equals(sexe)) {
            erreurs.add("Genre : F ou M.");
        }
        if (!erreurs.isEmpty()) {
            return refus(String.join(" ", erreurs));
        }
        try {
            Number doublon = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_client WHERE str_TELEPHONE = ?1"
                            + " AND lg_TYPE_CLIENT_ID = ?2 AND lg_CLIENT_ID <> ?3")
                    .setParameter(1, controle.getTelephone()).setParameter(2, ClientStandardSaisie.TYPE_CLIENT_STANDARD)
                    .setParameter(3, clientId).getSingleResult();
            if (doublon.intValue() > 0) {
                return refus("Ce numéro est déjà celui d'un autre client standard.");
            }
            LocalDate naissance = DateNaissance.lire(naissanceSaisie);
            c.setStrFIRSTNAME(controle.getNom());
            c.setStrLASTNAME(controle.getPrenoms());
            /* L'ancien champ « adresse » porte le numero lu par la caisse et les SMS ; le normalise, l'unicite. */
            c.setStrADRESSE(controle.getTelephone());
            c.setStrTELEPHONE(controle.getTelephone());
            c.setDtNAISSANCE(naissance == null ? null : java.sql.Date.valueOf(naissance));
            c.setStrSEXE(sexe.isEmpty() ? null : sexe);
            c.setDtUPDATED(new Date());
            em.merge(c);
            if (StringUtils.isNotBlank(venteId)) {
                em.createNativeQuery("UPDATE t_preenregistrement SET str_FIRST_NAME_CUSTOMER = ?1,"
                        + " str_LAST_NAME_CUSTOMER = ?2, str_PHONE_CUSTOME = ?3 WHERE lg_PREENREGISTREMENT_ID = ?4"
                        + " AND lg_CLIENT_ID = ?5 AND str_STATUT = 'is_Process'").setParameter(1, controle.getNom())
                        .setParameter(2, controle.getPrenoms()).setParameter(3, controle.getTelephone())
                        .setParameter(4, venteId).setParameter(5, clientId).executeUpdate();
            }
            JSONObject r = lire(clientId);
            return r.put("message", "Client " + controle.getNom() + " " + controle.getPrenoms() + " modifié.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "modification d'un client standard", e);
            return refus("Le client n'a pas pu être modifié.");
        }
    }

    static String motifRefusClient(TClient c) {
        if (c == null) {
            return "Choisissez d'abord le client de la vente.";
        }
        if (c.getLgTYPECLIENTID() == null
                || !ClientStandardSaisie.TYPE_CLIENT_STANDARD.equals(c.getLgTYPECLIENTID().getLgTYPECLIENTID())) {
            return "Seul un client standard se modifie depuis la caisse.";
        }
        if (!util.Constant.STATUT_ENABLE.equals(c.getStrSTATUT())) {
            return "Ce client est désactivé.";
        }
        return null;
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }
}
