package rest.service.impl;

import dal.TMouvementprice;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * MOUCHARD DES PRIX DE VENTE, en API (demande de l'officine du 30/09) : les memes lignes que l'ancienne page
 * webservices/sm_user/prixmodifies/ws_data.jsp, conservee sans plus etre appelee par l'ecran.
 *
 * <p>
 * Meme requete (produit, operateur, action, periode, recherche « commence par » sur CIP / designation / EAN13, filtre
 * d'emplacement), meme tri (action decroissante, designation, date decroissante) et memes noms de champs dans la
 * reponse : l'ecran et son modele restent inchanges.
 */
@Stateless
public class MouchardPrixService {

    private static final Logger LOG = Logger.getLogger(MouchardPrixService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Une ligne du mouchard, lue telle quelle par l'edition PDF (proprietes publiques). */
    public static class Ligne {

        private final String mouvement, cip, designation, reference, date, heure, operateur;
        private final Integer ancienPrix, nouveauPrix, ecart;

        Ligne(TMouvementprice m) {
            this.mouvement = m.getStrACTION();
            this.cip = m.getLgFAMILLEID().getIntCIP();
            this.designation = m.getLgFAMILLEID().getStrDESCRIPTION();
            this.reference = m.getStrREF();
            this.date = new SimpleDateFormat("dd/MM/yyyy").format(m.getDtCREATED());
            this.heure = new SimpleDateFormat("HH:mm").format(m.getDtCREATED());
            this.operateur = m.getLgUSERID().getStrFIRSTNAME() + " " + m.getLgUSERID().getStrLASTNAME();
            this.ancienPrix = m.getIntPRICEOLD();
            this.nouveauPrix = m.getIntPRICENEW();
            this.ecart = m.getIntECART();
        }

        public String getMouvement() {
            return mouvement;
        }

        public String getCip() {
            return cip;
        }

        public String getDesignation() {
            return designation;
        }

        public String getReference() {
            return reference;
        }

        public String getDate() {
            return date;
        }

        public String getHeure() {
            return heure;
        }

        public String getOperateur() {
            return operateur;
        }

        public Integer getAncienPrix() {
            return ancienPrix;
        }

        public Integer getNouveauPrix() {
            return nouveauPrix;
        }

        public Integer getEcart() {
            return ecart;
        }
    }

    /**
     * Les prix modifies, comme MouvementPrice.listPrixModifies. Les filtres vides valent « tout » ('%%'), comme dans la
     * page JSP.
     *
     * @param emplacement
     *            l'emplacement de l'operateur, ou null s'il voit toute l'activite
     */
    @SuppressWarnings("unchecked")
    public List<TMouvementprice> lister(String recherche, Date debut, Date fin, String utilisateur, String action,
            String emplacement) {
        try {
            return em.createQuery("SELECT t FROM TMouvementprice t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1"
                    + " AND t.lgUSERID.lgUSERID LIKE ?2 AND t.strACTION LIKE ?3 AND (t.dtCREATED BETWEEN ?4 AND ?5)"
                    + " AND (t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?6"
                    + " OR t.lgFAMILLEID.intEAN13 LIKE ?6) AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7"
                    + " ORDER BY t.strACTION DESC, t.lgFAMILLEID.strDESCRIPTION ASC, t.dtCREATED DESC")
                    .setParameter(1, "%%").setParameter(2, StringUtils.defaultIfEmpty(utilisateur, "%%"))
                    .setParameter(3, StringUtils.defaultIfEmpty(action, "%%")).setParameter(4, debut)
                    .setParameter(5, fin).setParameter(6, StringUtils.defaultIfEmpty(recherche, "%%") + "%")
                    .setParameter(7, emplacement == null ? "%%" : emplacement).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "mouchard des prix de vente", e);
            return new ArrayList<>();
        }
    }

    /** Une page de la liste, au format de ws_data.jsp : {total, results[]} et les memes cles par ligne. */
    public JSONObject page(List<TMouvementprice> lignes, int start, int limit) {
        JSONArray resultats = new JSONArray();
        int debut = Math.max(start, 0);
        int fin = limit > 0 ? Math.min(debut + limit, lignes.size()) : lignes.size();
        SimpleDateFormat jour = new SimpleDateFormat("dd/MM/yyyy");
        SimpleDateFormat heure = new SimpleDateFormat("HH:mm");
        for (int i = debut; i < fin; i++) {
            TMouvementprice m = lignes.get(i);
            resultats.put(new JSONObject().put("lg_FAMILLEARTICLE_ID", m.getLgMOUVEMENTPRICEID())
                    .put("str_DESCRIPTION", m.getLgFAMILLEID().getStrDESCRIPTION())
                    .put("lg_AJUSTEMENTDETAIL_ID",
                            m.getLgUSERID().getStrFIRSTNAME() + " " + m.getLgUSERID().getStrLASTNAME())
                    .put("int_CIP", m.getLgFAMILLEID().getIntCIP()).put("MOUVEMENT", m.getStrACTION())
                    .put("dt_CREATED", jour.format(m.getDtCREATED())).put("str_STATUT", m.getStrSTATUT())
                    .put("str_DESCRIPTION_PLUS", m.getStrREF()).put("int_PRICE_DETAIL", m.getIntPRICEOLD())
                    .put("int_QTEDETAIL", m.getIntPRICENEW()).put("lg_ETAT_ARTICLE_ID", heure.format(m.getDtCREATED()))
                    .put("int_NUMBERDETAIL", m.getIntECART()));
        }
        return new JSONObject().put("total", lignes.size()).put("results", resultats);
    }

    /** Les lignes de l'edition PDF. */
    public List<Ligne> lignesEdition(List<TMouvementprice> lignes) {
        List<Ligne> sortie = new ArrayList<>();
        for (TMouvementprice m : lignes) {
            sortie.add(new Ligne(m));
        }
        return sortie;
    }
}
