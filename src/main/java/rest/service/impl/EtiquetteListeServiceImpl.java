package rest.service.impl;

import dal.TEmplacement;
import dal.TEtiquette;
import dal.TFamille;
import dal.TTypeetiquette;
import dal.TUser;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
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
import rest.service.EtiquetteListeService;
import toolkits.parameters.commonparameter;

/**
 * Ecran « Gestion des etiquettes » : reprise en JPA de ce que faisaient trois pages JSP.
 *
 * <p>
 * Le comportement metier est repris a l'identique - memes filtres, memes champs, meme tri. Deux choses changent :
 *
 * <ul>
 * <li>la pagination est faite par la BASE. Les pages chargeaient toutes les lignes puis les decoupaient en Java, en
 * rafraichissant chaque ligne une par une ; sur un fonds de plusieurs milliers d'etiquettes, c'est tout le fonds qui
 * remontait a chaque changement de page ;</li>
 * <li>la recherche est LIEE et non concatenee.</li>
 * </ul>
 *
 * @author koben
 */
@Stateless
public class EtiquetteListeServiceImpl implements EtiquetteListeService {

    private static final Logger LOG = Logger.getLogger(EtiquetteListeServiceImpl.class.getName());

    /**
     * Libelles d'etat affiches dans la colonne « Etat ». Ce sont ceux de la page JSP, aux accents pres : elle les
     * ecrivait dans un encodage qui les rendait illisibles a l'ecran.
     */
    private static final String ETAT_A_EDITER = "Non éditée";
    private static final String ETAT_EDITEE = "Editée";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /**
     * Etat affiche pour une ligne. Seuls deux etats arrivent jusqu'a la liste : les lignes supprimees et celles encore
     * dans le panier de la creation groupee en sont ecartees par le filtre.
     */
    static String libelleEtat(String statut) {
        if (commonparameter.statut_Read.equalsIgnoreCase(StringUtils.trimToEmpty(statut))) {
            return ETAT_EDITEE;
        }
        return ETAT_A_EDITER;
    }

    /**
     * Borne basse de la periode. Une date absente ou illisible ne doit pas vider la liste : on repart de l'origine des
     * temps, comme le faisait la page JSP dont la conversion rendait null.
     */
    static Date debutDePeriode(String saisie) {
        LocalDate jour = jour(saisie);
        return jour != null ? java.sql.Timestamp.valueOf(jour.atStartOfDay()) : new Date(0L);
    }

    /**
     * Borne haute de la periode, fin de journee comprise : une etiquette creee a 16 h le jour de fin doit ressortir.
     * Sans date de fin, on prend la fin de la journee en cours.
     */
    static Date finDePeriode(String saisie) {
        LocalDate jour = jour(saisie);
        return java.sql.Timestamp.valueOf((jour != null ? jour : LocalDate.now()).atTime(LocalTime.MAX));
    }

    private static LocalDate jour(String saisie) {
        try {
            return LocalDate.parse(StringUtils.trimToEmpty(saisie));
        } catch (RuntimeException e) {
            return null;
        }
    }

    @Override
    public JSONObject liste(TUser user, boolean touteActivite, String recherche, String dateDebut, String dateFin,
            String typeEtiquetteId, int start, int limit) {
        JSONObject reponse = new JSONObject();
        try {
            /*
             * « Contient » et non « commence par » : c'est ce que l'ecran de suivi des mouvements fait deja, et taper
             * un mot situe au milieu du libelle donnait ici une liste vide.
             */
            String motif = "%" + StringUtils.trimToEmpty(recherche) + "%";
            String type = StringUtils.trimToEmpty(typeEtiquetteId);
            String emplacement = emplacementDe(user, touteActivite);

            StringBuilder filtre = new StringBuilder(" FROM TEtiquette t"
                    + " WHERE (t.strNAME LIKE :motif OR t.strCODE LIKE :motif OR t.lgFAMILLEID.intCIP LIKE :motif"
                    + " OR t.lgFAMILLEID.strDESCRIPTION LIKE :motif OR t.lgFAMILLEID.intEAN13 LIKE :motif)"
                    + " AND t.strSTATUT IN :statuts" + " AND t.dtCREATED BETWEEN :debut AND :fin"
                    + " AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE :emplacement");
            if (!type.isEmpty()) {
                filtre.append(" AND t.lgTYPEETIQUETTEID.lgTYPEETIQUETTEID = :type");
            }

            /*
             * Les deux etats que la liste montre. La page JSP les demandait deja tous les deux : les lignes encore en
             * preparation appartiennent a la creation groupee, les supprimees ne doivent plus paraitre.
             */
            List<String> statuts = new ArrayList<>();
            statuts.add(commonparameter.statut_enable);
            statuts.add(commonparameter.statut_Read);

            TypedQuery<Long> compte = em.createQuery("SELECT COUNT(t)" + filtre, Long.class);
            TypedQuery<TEtiquette> page = em.createQuery("SELECT t" + filtre + " ORDER BY t.dtCREATED DESC",
                    TEtiquette.class);
            for (javax.persistence.TypedQuery<?> q : new javax.persistence.TypedQuery<?>[] { compte, page }) {
                q.setParameter("motif", motif).setParameter("statuts", statuts)
                        .setParameter("debut", debutDePeriode(dateDebut)).setParameter("fin", finDePeriode(dateFin))
                        .setParameter("emplacement", emplacement);
                if (!type.isEmpty()) {
                    q.setParameter("type", type);
                }
            }

            long total = compte.getSingleResult();
            List<TEtiquette> lignes = page.setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 20)
                    .getResultList();

            JSONArray tableau = new JSONArray();
            for (TEtiquette e : lignes) {
                TFamille produit = e.getLgFAMILLEID();
                TTypeetiquette typeEtiquette = e.getLgTYPEETIQUETTEID();
                JSONObject json = new JSONObject();
                json.put("lg_ETIQUETTE_ID", texte(e.getLgETIQUETTEID()));
                json.put("str_NAME", texte(e.getStrNAME()));
                json.put("str_CODE", texte(e.getStrCODE()));
                // Comme la page JSP : ces deux champs portent des LIBELLES, pas des identifiants.
                json.put("lg_TYPEETIQUETTE_ID", typeEtiquette != null ? texte(typeEtiquette.getStrDESCRIPTION()) : "");
                json.put("lg_FAMILLE_ID", produit != null ? texte(produit.getStrDESCRIPTION()) : "");
                json.put("int_CIP", produit != null ? texte(produit.getIntCIP()) : "");
                json.put("str_STATUT", libelleEtat(e.getStrSTATUT()));
                /* Meme format que la page JSP, au caractere pres : la colonne « Date » ne doit pas changer d'aspect. */
                json.put("dt_CREATED",
                        toolkits.utils.date.DateToString(e.getDtCREATED(), toolkits.utils.date.formatterShort));
                json.put("int_NUMBER", texte(e.getIntNUMBER()));
                tableau.put(json);
            }
            return reponse.put("total", total).put("results", tableau);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste", e);
            return reponse.put("total", 0).put("results", new JSONArray());
        }
    }

    @Override
    public JSONObject types(String recherche, int start, int limit) {
        JSONObject reponse = new JSONObject();
        try {
            String motif = "%" + StringUtils.trimToEmpty(recherche) + "%";
            String filtre = " FROM TTypeetiquette t WHERE t.strSTATUT = :statut"
                    + " AND (t.strNAME LIKE :motif OR t.strDESCRIPTION LIKE :motif)";

            long total = em.createQuery("SELECT COUNT(t)" + filtre, Long.class)
                    .setParameter("statut", commonparameter.statut_enable).setParameter("motif", motif)
                    .getSingleResult();

            List<TTypeetiquette> lignes = em
                    .createQuery("SELECT t" + filtre + " ORDER BY t.strDESCRIPTION", TTypeetiquette.class)
                    .setParameter("statut", commonparameter.statut_enable).setParameter("motif", motif)
                    .setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 20).getResultList();

            JSONArray tableau = new JSONArray();
            for (TTypeetiquette t : lignes) {
                JSONObject json = new JSONObject();
                json.put("lg_TYPEETIQUETTE_ID", texte(t.getLgTYPEETIQUETTEID()));
                json.put("str_NAME", texte(t.getStrNAME()));
                json.put("str_DESCRIPTION", texte(t.getStrDESCRIPTION()));
                json.put("str_STATUT", texte(t.getStrSTATUT()));
                json.put("dt_CREATED",
                        toolkits.utils.date.DateToString(t.getDtCREATED(), toolkits.utils.date.formatterShort));
                tableau.put(json);
            }
            return reponse.put("total", total).put("results", tableau);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "types", e);
            return reponse.put("total", 0).put("results", new JSONArray());
        }
    }

    @Override
    public JSONObject supprimer(String etiquetteId) {
        try {
            TEtiquette ligne = em.find(TEtiquette.class, etiquetteId);
            if (ligne == null) {
                return new JSONObject().put("success", false).put("msg", "Etiquette introuvable.");
            }
            // La ligne n'est pas effacee : elle passe au statut supprime, comme le faisait la page JSP.
            ligne.setStrSTATUT(commonparameter.statut_delete);
            ligne.setDtUPDATED(new Date());
            em.merge(ligne);
            return new JSONObject().put("success", true).put("msg", "Etiquette supprimée.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "supprimer " + etiquetteId, e);
            return new JSONObject().put("success", false).put("msg", "La suppression n'a pas pu être enregistrée.");
        }
    }

    /**
     * Emplacement retenu pour la liste : celui de l'utilisateur, sauf s'il porte le privilege qui donne acces a toute
     * l'activite - auquel cas le joker les prend tous. Regle reprise telle quelle de la couche metier que la page JSP
     * appelait.
     */
    private String emplacementDe(TUser user, boolean touteActivite) {
        if (touteActivite || user == null) {
            return "%%";
        }
        TEmplacement emplacement = user.getLgEMPLACEMENTID();
        return emplacement != null ? emplacement.getLgEMPLACEMENTID() : "%%";
    }

    private static String texte(Object valeur) {
        return valeur != null ? String.valueOf(valeur) : "";
    }
}
