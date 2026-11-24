package rest.service.impl;

import dal.TClient;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.impl.campagne.CampagneService;
import util.TelephoneCi;

/**
 * Plan du 21/11, point 8.3 : CORRIGER LE NUMERO D'UN CLIENT depuis les listes de destinataires (onglets des Campagnes,
 * « Ciblage libre » des Rappels). Le crayon de la colonne Téléphone transforme la cellule en champ ; ce service
 * enregistre le numero.
 *
 * <p>
 * Regles : tout client actif, quel que soit son type ; numero valide selon {@link TelephoneCi} : mobile ivoirien (dix
 * chiffres, 01, 05 ou 07, zero de tete retabli s'il a ete perdu) ou, retour du 22/11, numero etranger ecrit avec son
 * indicatif (+32 470 12 34 56), garde sous la forme +32470123456 ; numero UNIQUE parmi les clients du meme type. Le
 * numero est ecrit dans {@code str_TELEPHONE} ; pour un client standard, aussi dans l'ancien champ {@code str_ADRESSE}
 * que lit la caisse (meme regle que la modification depuis la vente). Le droit {@code P_CLIENT_STANDARD_MAJ} est
 * verifie par la ressource. Le numero n'est jamais journalise.
 */
@Stateless
public class TelephoneClientModification {

    private static final Logger LOG = Logger.getLogger(TelephoneClientModification.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private CampagneService campagnes;
    @Resource
    private SessionContext contexte;

    /** Refus pour le client, ou null s'il peut etre modifie. */
    static String motifRefusClient(TClient c) {
        if (c == null) {
            return "Client introuvable.";
        }
        if (!util.Constant.STATUT_ENABLE.equals(c.getStrSTATUT())) {
            return "Ce client est désactivé.";
        }
        return null;
    }

    /** Controle de la saisie : le numero local a dix chiffres, ou le motif du refus. */
    static TelephoneCi.Resultat controler(String saisie) {
        return TelephoneCi.controler(ClientStandardSaisie.retablirZeroDeTete(saisie));
    }

    static String messageInvalide(TelephoneCi.Resultat r) {
        return "Numéro invalide : " + r.getMotif() + ". " + TelephoneCi.aide();
    }

    /** Un client standard porte aussi son numero dans l'ancien champ adresse (lu par la caisse et les SMS). */
    static boolean ecrireAussiAdresse(TClient c) {
        return c.getLgTYPECLIENTID() != null
                && ClientStandardSaisie.TYPE_CLIENT_STANDARD.equals(c.getLgTYPECLIENTID().getLgTYPECLIENTID());
    }

    /**
     * Enregistre le numero et rend la ligne relue pour le canal de l'ecran : telephone affiche, joignable, motif (memes
     * calculs que la liste des destinataires).
     */
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public JSONObject enregistrer(String clientId, String saisie, String canal, boolean accordExplicite) {
        TelephoneCi.Resultat numero = controler(saisie);
        String refus;
        try {
            /* ecriture validee AVANT la relecture : la liste des destinataires lit hors transaction */
            refus = contexte.getBusinessObject(TelephoneClientModification.class).ecrire(clientId, numero);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "correction du numero d'un client", e);
            return refus("Le numéro n'a pas pu être enregistré.");
        }
        if (refus != null) {
            return refus(refus);
        }
        return relire(clientId, canal, accordExplicite).put("message", "Numéro enregistré.");
    }

    /** Controle et ecrit le numero dans sa propre transaction ; motif du refus, ou null si ecrit. */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public String ecrire(String clientId, TelephoneCi.Resultat numero) {
        TClient c = StringUtils.isBlank(clientId) ? null : em.find(TClient.class, clientId);
        String motif = motifRefusClient(c);
        if (motif != null) {
            return motif;
        }
        if (!numero.isValide()) {
            return messageInvalide(numero);
        }
        String type = c.getLgTYPECLIENTID() == null ? null : c.getLgTYPECLIENTID().getLgTYPECLIENTID();
        Number doublon = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_client WHERE str_STATUT = 'enable'"
                        + " AND (str_TELEPHONE = ?1 OR str_ADRESSE = ?1) AND lg_CLIENT_ID <> ?2"
                        + " AND COALESCE(lg_TYPE_CLIENT_ID, '') = ?3")
                .setParameter(1, numero.getLocal()).setParameter(2, clientId)
                .setParameter(3, StringUtils.defaultString(type)).getSingleResult();
        if (doublon.intValue() > 0) {
            return "Ce numéro est déjà celui d'un autre client du même type.";
        }
        c.setStrTELEPHONE(numero.getLocal());
        if (ecrireAussiAdresse(c)) {
            c.setStrADRESSE(numero.getLocal());
        }
        c.setDtUPDATED(new Date());
        em.merge(c);
        return null;
    }

    /** La ligne du client telle que la liste des destinataires la calcule. */
    JSONObject relire(String clientId, String canal, boolean accordExplicite) {
        CampagneService.Filtres f = new CampagneService.Filtres();
        f.categorie = null;
        f.clientIds = Collections.singletonList(clientId);
        f.canal = rest.service.impl.campagne.Campagnes.canal(canal);
        f.accordExplicite = accordExplicite;
        List<CampagneService.Cible> l = campagnes.population(f);
        if (l.isEmpty()) {
            return refus("Client introuvable.");
        }
        JSONObject o = l.get(0).json();
        return new JSONObject().put("success", true).put("clientId", clientId)
                .put("telephone", o.getString("telephone")).put("joignable", o.getBoolean("joignable"))
                .put("motif", o.getString("motif"));
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }
}
