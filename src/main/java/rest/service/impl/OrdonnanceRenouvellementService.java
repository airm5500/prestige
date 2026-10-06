package rest.service.impl;

import dal.CategorieNotification;
import dal.ModeleMessage;
import dal.Notification;
import dal.NotificationClient;
import dal.TClient;
import dal.TUser;
import dal.enumeration.TypeNotification;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.NotificationService;
import util.MessageModele;
import util.TelephoneCi;

/**
 * RENOUVELLEMENTS d'ordonnance (retour du 30/09).
 *
 * <p>
 * Un renouvellement est une NOUVELLE ordonnance, liee a son origine avec son rang : memes produits, memes quantites,
 * memes posologies, meme prescripteur et meme contexte clinique, datee du jour. Elle a son propre service, ses propres
 * preventes et son propre reste a delivrer. Elle passe par l'enregistrement ordinaire des ordonnances : memes
 * controles.
 *
 * <p>
 * RAPPEL : par le module SMS existant, sans le modifier. Une notification de categorie RAPPEL_RENOUVELLEMENT (canal
 * SMS) est enregistree pour le client, puis envoyee apres validation de la transaction, comme les campagnes clients. Le
 * texte vient du modele « Rappel de renouvellement » (modifiable dans Modeles de messages). Un client qui a refuse les
 * SMS, ou sans numero valable, n'est pas relance ; un renouvellement n'est rappele qu'une fois.
 */
@Stateless
public class OrdonnanceRenouvellementService {

    private static final Logger LOG = Logger.getLogger(OrdonnanceRenouvellementService.class.getName());
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    /** Modele seme par V6.9.21, modifiable par l'officine. */
    static final String MODELE = "MODELE_RENOUVELLEMENT";
    /** Si le modele a ete desactive ou supprime : un texte sobre, sans donnee de sante. */
    static final String TEXTE_DEFAUT = "Bonjour {client}, votre ordonnance est à renouveler à partir du "
            + "{date_renouvellement}. La pharmacie {officine} vous attend.";
    /** Parametre : combien de jours avant l'echeance le rappel part (defaut 2). */
    static final String PARAM_JOURS = "KEY_RAPPEL_RENOUVELLEMENT_JOURS";
    /** Parametre : rappel automatique quotidien actif (1) ou non (0). */
    static final String PARAM_ACTIF = "KEY_SMS_RAPPEL_RENOUVELLEMENT";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private OrdonnanceClientService ordonnanceService;

    @EJB
    private NotificationService notificationService;

    @EJB
    private TerrainCliniqueService terrainService;

    /* ------------------------------------------------------------------------------------------ renouveler */

    /** Cree le renouvellement suivant de la chaine de l'ordonnance donnee (origine ou renouvellement). */
    @SuppressWarnings("unchecked")
    public JSONObject renouveler(String ordonnanceId, TUser operateur) {
        try {
            String origineId = origine(ordonnanceId);
            if (origineId == null) {
                return refus("Ordonnance introuvable.");
            }
            /* Verrou sur l'origine : deux renouvellements simultanes ne prennent pas le meme rang. */
            List<Tuple> o = em.createNativeQuery("SELECT o.str_STATUT AS statut, o.str_NUMERO AS numero,"
                    + " o.int_RENOUVELLEMENTS AS autorises, o.lg_CLIENT_ID AS clientId, o.lg_MEDECIN_ID AS medecinId,"
                    + " o.str_ETABLISSEMENT AS etablissement, o.int_AGE_PATIENT AS age, o.str_SEXE_PATIENT AS sexe,"
                    + " o.bool_GROSSESSE AS grossesse, o.bool_ALLAITEMENT AS allaitement,"
                    + " o.bool_INSUF_RENALE AS ir, o.bool_INSUF_HEPATIQUE AS ih"
                    + " FROM t_ordonnance_client o WHERE o.lg_ORDONNANCE_ID = ?1 FOR UPDATE", Tuple.class)
                    .setParameter(1, origineId).getResultList();
            Tuple t = o.get(0);
            if ("annulee".equals(t.get("statut", String.class))) {
                return refus("L'ordonnance d'origine est annulée : elle ne se renouvelle plus.");
            }
            int autorises = entier(t.get("autorises"));
            int faits = faits(origineId);
            if (!RenouvellementOrdonnance.resteARenouveler(autorises, faits)) {
                return refus(autorises == 0 ? "Cette ordonnance n'est pas renouvelable."
                        : "Tous les renouvellements (" + autorises + ") ont déjà été faits.");
            }
            int rang = faits + 1;
            JSONArray produits = new JSONArray();
            for (Tuple d : (List<Tuple>) em.createNativeQuery(
                    "SELECT d.lg_FAMILLE_ID AS articleId, d.str_LIBELLE AS libelle,"
                            + " d.int_QUANTITE AS quantite, d.str_POSOLOGIE AS posologie, d.str_DUREE AS duree"
                            + " FROM t_ordonnance_client_detail d WHERE d.lg_ORDONNANCE_ID = ?1 ORDER BY d.int_ORDRE",
                    Tuple.class).setParameter(1, origineId).getResultList()) {
                produits.put(
                        new JSONObject().put("articleId", StringUtils.defaultString(d.get("articleId", String.class)))
                                .put("libelle", StringUtils.defaultString(d.get("libelle", String.class)))
                                .put("quantite", entier(d.get("quantite")))
                                .put("posologie", StringUtils.defaultString(d.get("posologie", String.class)))
                                .put("duree", StringUtils.defaultString(d.get("duree", String.class))));
            }
            JSONObject requete = new JSONObject().put("clientId", t.get("clientId", String.class))
                    .put("dateOrdonnance", LocalDate.now().toString())
                    .put("medecinId", StringUtils.defaultString(t.get("medecinId", String.class)))
                    .put("etablissement", StringUtils.defaultString(t.get("etablissement", String.class)))
                    .put("observations",
                            "Renouvellement " + rang + "/" + autorises + " de l'ordonnance "
                                    + t.get("numero", String.class) + ".")
                    .put("agePatient", t.get("age") == null ? JSONObject.NULL : entier(t.get("age")))
                    .put("sexePatient", StringUtils.defaultString(t.get("sexe", String.class)))
                    .put("grossesse", vrai(t.get("grossesse"))).put("allaitement", vrai(t.get("allaitement")))
                    .put("insuffisanceRenale", vrai(t.get("ir"))).put("insuffisanceHepatique", vrai(t.get("ih")))
                    .put("produits", produits)
                    /* Terrains cliniques et poids de l'origine (30/09) : le patient est le meme. */
                    .put("terrains", terrainService.deLOrdonnance(origineId));
            Object poids = em
                    .createNativeQuery("SELECT int_POIDS_PATIENT FROM t_ordonnance_client WHERE lg_ORDONNANCE_ID = ?1")
                    .setParameter(1, origineId).getSingleResult();
            if (poids != null) {
                requete.put("poidsPatient", entier(poids));
            }
            /*
             * Date de naissance de l'origine (30/09) : l'age du renouvellement en est recalcule au jour du
             * renouvellement.
             */
            Object naissance = em
                    .createNativeQuery(
                            "SELECT dt_NAISSANCE_PATIENT FROM t_ordonnance_client WHERE lg_ORDONNANCE_ID = ?1")
                    .setParameter(1, origineId).getSingleResult();
            if (naissance != null) {
                requete.put("dateNaissance", String.valueOf(naissance).substring(0, 10));
            }
            JSONObject cree = ordonnanceService.enregistrer(requete, operateur);
            if (!cree.optBoolean("success", false)) {
                return cree;
            }
            em.createNativeQuery("UPDATE t_ordonnance_client SET lg_ORDONNANCE_ORIGINE_ID = ?1,"
                    + " int_RANG_RENOUVELLEMENT = ?2 WHERE lg_ORDONNANCE_ID = ?3").setParameter(1, origineId)
                    .setParameter(2, rang).setParameter(3, cree.getString("id")).executeUpdate();
            return new JSONObject().put("success", true).put("id", cree.getString("id"))
                    .put("numero", cree.optString("numero")).put("rang", rang).put("autorises", autorises)
                    .put("message", "Renouvellement " + rang + "/" + autorises + " créé : ordonnance "
                            + cree.optString("numero") + ", datée d'aujourd'hui.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "renouvellement d'une ordonnance", e);
            return refus("Le renouvellement n'a pas pu être créé.");
        }
    }

    /** L'origine de la chaine (l'ordonnance elle-meme si ce n'est pas un renouvellement), ou null si inconnue. */
    @SuppressWarnings("unchecked")
    String origine(String ordonnanceId) {
        List<Object> r = em
                .createNativeQuery("SELECT COALESCE(o.lg_ORDONNANCE_ORIGINE_ID, o.lg_ORDONNANCE_ID)"
                        + " FROM t_ordonnance_client o WHERE o.lg_ORDONNANCE_ID = ?1")
                .setParameter(1, StringUtils.defaultString(ordonnanceId)).getResultList();
        return r.isEmpty() ? null : (String) r.get(0);
    }

    private int faits(String origineId) {
        return entier(
                em.createNativeQuery("SELECT COUNT(*) FROM t_ordonnance_client r WHERE r.lg_ORDONNANCE_ORIGINE_ID = ?1"
                        + " AND r.str_STATUT <> 'annulee'").setParameter(1, origineId).getSingleResult());
    }

    /* ------------------------------------------------------------------------------------------------ rappels */

    /**
     * Prepare le rappel SMS d'UNE chaine (bouton de la fiche) : la notification est enregistree ; l'appelant l'envoie
     * apres validation de la transaction (voir {@link #envoyer}).
     */
    public JSONObject preparerRappel(String ordonnanceId, TUser operateur) {
        try {
            String origineId = origine(ordonnanceId);
            if (origineId == null) {
                return refus("Ordonnance introuvable.");
            }
            List<Echeance> e = echeances(origineId, Integer.MAX_VALUE, true);
            if (e.isEmpty()) {
                return refus("Aucun renouvellement n'est à rappeler pour cette ordonnance.");
            }
            return preparer(e.get(0), operateur);
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, "rappel de renouvellement", ex);
            return refus("Le rappel n'a pas pu être préparé.");
        }
    }

    /**
     * Rappels du jour (tache quotidienne) : chaque chaine dont le renouvellement suivant tombe dans les N jours (ou est
     * passe) et n'a pas encore ete rappele. Rend les identifiants des notifications a envoyer apres validation.
     */
    public List<String> preparerRappelsDuJour() {
        List<String> ids = new ArrayList<>();
        if (!"1".equals(parametre(PARAM_ACTIF, "1"))) {
            return ids;
        }
        int jours;
        try {
            jours = Integer.parseInt(parametre(PARAM_JOURS, "2").trim());
        } catch (NumberFormatException e) {
            jours = 2;
        }
        for (Echeance e : echeances(null, jours, false)) {
            JSONObject r = preparer(e, null);
            if (r.optBoolean("success", false)) {
                ids.add(r.getString("notificationId"));
            }
        }
        return ids;
    }

    /**
     * Tableau de bord (plan d'octobre, section 8) : nombre de chaines dont le renouvellement suivant tombe d'ici N
     * jours (ou est deja passe sans avoir ete fait). Lecture seule : aucun rappel n'est prepare.
     */
    public int aRenouvelerSous(int jours) {
        LocalDate limite = LocalDate.now().plusDays(Math.max(0, jours));
        int n = 0;
        for (Echeance e : echeances(null, Integer.MAX_VALUE, true)) {
            if (e.date != null && !e.date.isAfter(limite)) {
                n++;
            }
        }
        return n;
    }

    /** Une chaine a rappeler : son origine, son client, ses produits et l'echeance. */
    static final class Echeance {
        String origineId;
        String clientId;
        String createur;
        int rangSuivant;
        LocalDate date;
    }

    /**
     * Les chaines dont le renouvellement suivant est a rappeler. {@code force} (bouton de la fiche) : on rappelle meme
     * avant la fenetre et meme si ce rang a deja ete rappele.
     */
    @SuppressWarnings("unchecked")
    private List<Echeance> echeances(String origineId, int joursAvant, boolean force) {
        List<Echeance> sortie = new ArrayList<>();
        String faits = "(SELECT COUNT(*) FROM t_ordonnance_client rf WHERE rf.lg_ORDONNANCE_ORIGINE_ID = o.lg_ORDONNANCE_ID"
                + " AND rf.str_STATUT <> 'annulee')";
        String derniere = "(SELECT MAX(rd.dt_ORDONNANCE) FROM t_ordonnance_client rd WHERE (rd.lg_ORDONNANCE_ID ="
                + " o.lg_ORDONNANCE_ID OR rd.lg_ORDONNANCE_ORIGINE_ID = o.lg_ORDONNANCE_ID) AND rd.str_STATUT <> 'annulee')";
        javax.persistence.Query q = em.createNativeQuery("SELECT o.lg_ORDONNANCE_ID AS id, o.lg_CLIENT_ID AS clientId,"
                + " o.lg_USER_CREATED AS createur, o.int_RENOUVELLEMENTS AS autorises, o.int_PERIODICITE_JOURS AS periodicite,"
                + " o.int_RANG_RAPPELE AS rangRappele, " + faits + " AS faits, " + derniere + " AS derniere"
                + " FROM t_ordonnance_client o WHERE o.lg_ORDONNANCE_ORIGINE_ID IS NULL AND o.str_STATUT <> 'annulee'"
                + " AND o.int_RENOUVELLEMENTS > 0" + (origineId == null ? "" : " AND o.lg_ORDONNANCE_ID = ?1"),
                Tuple.class);
        if (origineId != null) {
            q.setParameter(1, origineId);
        }
        LocalDate aujourdhui = LocalDate.now();
        for (Tuple t : (List<Tuple>) q.getResultList()) {
            int autorises = entier(t.get("autorises"));
            int nbFaits = entier(t.get("faits"));
            Object d = t.get("derniere");
            LocalDate derniereDelivrance = d instanceof java.sql.Date ? ((java.sql.Date) d).toLocalDate()
                    : d == null ? null : LocalDate.parse(String.valueOf(d).substring(0, 10));
            LocalDate prochaine = RenouvellementOrdonnance.prochaine(autorises, nbFaits, derniereDelivrance,
                    t.get("periodicite") == null ? null : entier(t.get("periodicite")));
            boolean retenue = force ? prochaine != null : RenouvellementOrdonnance.aRappeler(autorises, nbFaits,
                    entier(t.get("rangRappele")), prochaine, aujourdhui, joursAvant);
            if (retenue) {
                Echeance e = new Echeance();
                e.origineId = t.get("id", String.class);
                e.clientId = t.get("clientId", String.class);
                e.createur = t.get("createur", String.class);
                e.rangSuivant = nbFaits + 1;
                e.date = prochaine;
                sortie.add(e);
            }
        }
        return sortie;
    }

    @SuppressWarnings("unchecked")
    private JSONObject preparer(Echeance e, TUser operateur) {
        TClient client = em.find(TClient.class, e.clientId);
        if (client == null) {
            return refus("Client introuvable.");
        }
        /* Consentement : un refus explicite n'est jamais relance (NULL = jamais demande, comme les campagnes). */
        if (Boolean.FALSE.equals(client.getBoolCONSENTSMS())) {
            return refus("Le client a refusé les SMS : aucun rappel n'est envoyé.");
        }
        TelephoneCi.Resultat tel = TelephoneCi.controler(client.getStrADRESSE());
        if (!tel.isValide()) {
            return refus("Numéro de téléphone du client absent ou invalide : le rappel ne peut pas partir.");
        }
        TUser auteur = operateur != null ? operateur : e.createur == null ? null : em.find(TUser.class, e.createur);
        if (auteur == null) {
            return refus("Aucun utilisateur auquel rattacher le rappel.");
        }
        List<String> libelles = em
                .createNativeQuery("SELECT d.str_LIBELLE FROM t_ordonnance_client_detail d"
                        + " WHERE d.lg_ORDONNANCE_ID = ?1 ORDER BY d.int_ORDRE")
                .setParameter(1, e.origineId).getResultList();
        String[] officine = officine();
        String texte = message(modele(), client.getStrFIRSTNAME(), client.getStrLASTNAME(), libelles, officine[0],
                officine[1], e.date);
        CategorieNotification categorie = notificationService.getOneByName(TypeNotification.RAPPEL_RENOUVELLEMENT);
        Notification n = new Notification();
        n.setCategorieNotification(categorie);
        n.setMessage(texte);
        n.setUser(auteur);
        n.entityRef(e.origineId);
        n.getNotificationClients().add(new NotificationClient(client, n));
        em.persist(n);
        /* Un rappel par renouvellement : ce rang est marque rappele. */
        em.createNativeQuery("UPDATE t_ordonnance_client SET int_RANG_RAPPELE = ?1, dt_DERNIER_RAPPEL = ?2"
                + " WHERE lg_ORDONNANCE_ID = ?3").setParameter(1, e.rangSuivant).setParameter(2, new Date())
                .setParameter(3, e.origineId).executeUpdate();
        em.flush();
        return new JSONObject().put("success", true).put("notificationId", n.getId()).put("texte", texte).put("message",
                "Rappel SMS préparé pour le " + tel.getLocal() + " : il part maintenant.");
    }

    /** Le texte du rappel, depuis le modele de l'officine ({date_renouvellement} en plus des variables habituelles). */
    static String message(String modele, String nom, String prenom, List<String> produits, String officine,
            String telephoneOfficine, LocalDate echeance) {
        String medicament = produits == null || produits.isEmpty() ? "votre traitement"
                : produits.size() <= 2 ? String.join(", ", produits) : produits.get(0) + ", " + produits.get(1) + "…";
        Map<String, String> valeurs = MessageModele.valeurs(nom, prenom, medicament, officine, telephoneOfficine, "");
        valeurs.put("date_renouvellement", echeance == null ? "" : echeance.format(FR));
        return MessageModele.personnaliser(StringUtils.isBlank(modele) ? TEXTE_DEFAUT : modele, valeurs);
    }

    private String modele() {
        ModeleMessage m = em.find(ModeleMessage.class, MODELE);
        return m != null && m.isActif() ? m.getContenu() : TEXTE_DEFAUT;
    }

    @SuppressWarnings("unchecked")
    private String[] officine() {
        try {
            List<Object[]> r = em.createNativeQuery("SELECT str_NOM_COMPLET, str_PHONE FROM t_officine LIMIT 1")
                    .getResultList();
            if (!r.isEmpty()) {
                return new String[] { StringUtils.defaultString((String) r.get(0)[0]),
                        StringUtils.defaultString((String) r.get(0)[1]) };
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "officine pour le rappel", e);
        }
        return new String[] { "", "" };
    }

    @SuppressWarnings("unchecked")
    private String parametre(String cle, String defaut) {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        return r.isEmpty() || r.get(0) == null ? defaut : String.valueOf(r.get(0));
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }

    private static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v instanceof Number && ((Number) v).intValue() != 0;
    }
}
