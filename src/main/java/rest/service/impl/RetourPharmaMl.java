package rest.service.impl;

import java.util.ArrayList;
import java.util.List;
import javax.persistence.EntityManager;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 08/10 (13) : retours fournisseurs et reclamations par PharmaML. Donnees seulement (lecture des lignes a
 * envoyer, statut d'envoi, application du bon de retour) ; l'echange HTTP est dans PharmaMlServiceImpl.
 * <p>
 * Chaque ligne part selon le motif local : RETOUR (demande d'autorisation, tableau 6), RECLAMATION (tableau 3, action
 * du tableau 4) ou AUCUN (motif interne, pas d'envoi). Le bon de retour du grossiste renseigne la quantite acceptee de
 * chaque ligne ; la validation du retour ne sort du stock que les quantites acceptees.
 */
public final class RetourPharmaMl {

    public static final String RETOUR = "RETOUR", RECLAMATION = "RECLAMATION", AUCUN = "AUCUN";
    public static final String EN_ATTENTE = "EN_ATTENTE", REPONDU = "REPONDU", ENVOYE = "ENVOYE", ERREUR = "ERREUR";
    public static final String ACTION_DEFAUT = "0006"; /* reprise avec avoir */

    private RetourPharmaMl() {
    }

    /** Une ligne du retour avec sa destination PharmaML. */
    public static class Ligne {

        public String detailId, familleId, code, designation, motifLocal, type, codeNorme, action;
        public int quantite;
    }

    /** En-tete du retour : grossiste, bon de livraison, reference, statut et statut d'envoi. */
    @SuppressWarnings("unchecked")
    public static Object[] entete(EntityManager em, String retourId) {
        List<Object[]> l = em
                .createNativeQuery("SELECT r.lg_GROSSISTE_ID, IFNULL(b.str_REF_LIVRAISON, ''), r.str_REF_RETOUR_FRS,"
                        + " r.str_STATUT, IFNULL(r.str_PML_STATUT, '') FROM t_retour_fournisseur r"
                        + " LEFT JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = r.lg_BON_LIVRAISON_ID WHERE r.lg_RETOUR_FRS_ID = ?1")
                .setParameter(1, retourId).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    @SuppressWarnings("unchecked")
    public static List<Ligne> lignes(EntityManager em, String retourId) {
        List<Ligne> r = new ArrayList<>();
        for (Object[] x : (List<Object[]>) em.createNativeQuery("SELECT d.lg_RETOUR_FRS_DETAIL, f.lg_FAMILLE_ID,"
                + " IFNULL(NULLIF(f.int_CIP, ''), f.int_EAN13), f.str_NAME, IFNULL(m.str_CODE, ''), IFNULL(m.str_PML_TYPE, ''),"
                + " IFNULL(m.str_PML_CODE, ''), IFNULL(m.str_PML_ACTION, ''), IFNULL(d.int_NUMBER_RETURN, 0)"
                + " FROM t_retour_fournisseur_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " LEFT JOIN t_motif_retour m ON m.lg_MOTIF_RETOUR = d.lg_MOTIF_RETOUR"
                + " WHERE d.lg_RETOUR_FRS_ID = ?1 ORDER BY d.dt_CREATED, d.lg_RETOUR_FRS_DETAIL")
                .setParameter(1, retourId).getResultList()) {
            Ligne l = new Ligne();
            l.detailId = (String) x[0];
            l.familleId = (String) x[1];
            l.code = StringUtils.defaultString((String) x[2]).trim();
            l.designation = StringUtils.defaultString((String) x[3]);
            l.motifLocal = (String) x[4];
            l.type = StringUtils.defaultIfBlank((String) x[5], "");
            l.codeNorme = (String) x[6];
            l.action = StringUtils.defaultIfBlank((String) x[7], ACTION_DEFAUT);
            l.quantite = ((Number) x[8]).intValue();
            r.add(l);
        }
        return r;
    }

    /** Ligne envoyee : type, numero de ligne dans le message, quantite demandee. */
    public static void noterEnvoiLigne(EntityManager em, Ligne l, int numLigne) {
        em.createNativeQuery("UPDATE t_retour_fournisseur_detail SET str_PML_TYPE = ?2, int_PML_NUM_LIGNE = ?3,"
                + " int_PML_QTE_DEMANDEE = ?4, int_PML_QTE_ACCEPTEE = NULL, str_PML_COMMENTAIRE = NULL"
                + " WHERE lg_RETOUR_FRS_DETAIL = ?1").setParameter(1, l.detailId).setParameter(2, l.type)
                .setParameter(3, numLigne).setParameter(4, l.quantite).executeUpdate();
    }

    public static void statut(EntityManager em, String retourId, String statut, String detail, String refRetour,
            String refReclamation, boolean envoi) {
        em.createNativeQuery("UPDATE t_retour_fournisseur SET str_PML_STATUT = ?2, str_PML_DETAIL = ?3,"
                + " str_PML_REF_RETOUR = IFNULL(?4, str_PML_REF_RETOUR), str_PML_REF_RECLAMATION = IFNULL(?5, str_PML_REF_RECLAMATION),"
                + " dt_PML_ENVOI = IF(?6 = 1, NOW(), dt_PML_ENVOI) WHERE lg_RETOUR_FRS_ID = ?1")
                .setParameter(1, retourId).setParameter(2, statut).setParameter(3, StringUtils.left(detail, 500))
                .setParameter(4, refRetour).setParameter(5, refReclamation).setParameter(6, envoi ? 1 : 0)
                .executeUpdate();
    }

    /** Retour dont la demande porte cette reference (bon de retour sans EN_REPONSE_A exploitable). */
    @SuppressWarnings("unchecked")
    public static String retourDeLaDemande(EntityManager em, String grossisteId, String refDemande) {
        if (StringUtils.isBlank(refDemande)) {
            return null;
        }
        List<Object> l = em
                .createNativeQuery("SELECT lg_RETOUR_FRS_ID FROM t_retour_fournisseur WHERE str_PML_REF_RETOUR = ?1"
                        + " AND lg_GROSSISTE_ID = ?2 ORDER BY dt_PML_ENVOI DESC")
                .setParameter(1, refDemande).setParameter(2, grossisteId).setMaxResults(1).getResultList();
        return l.isEmpty() ? null : (String) l.get(0);
    }

    /**
     * Bon de retour : quantite acceptee par ligne (rattachement par numero de ligne de la demande, sinon par code
     * produit), commentaire et date de reprise ; la reponse du retour (quantite repondue) est pre-remplie. Rendu :
     * acceptees, refusees, lignes non rattachees.
     */
    @SuppressWarnings("unchecked")
    public static JSONObject appliquerBonRetour(EntityManager em, String retourId, Object[] bon) {
        List<PharmaMlMessages.LigneBonRetour> lignes = (List<PharmaMlMessages.LigneBonRetour>) bon[2];
        List<Object[]> envoyees = em.createNativeQuery("SELECT d.lg_RETOUR_FRS_DETAIL, d.int_PML_NUM_LIGNE,"
                + " IFNULL(NULLIF(f.int_CIP, ''), f.int_EAN13), f.int_EAN13, IFNULL(d.int_PML_QTE_DEMANDEE, d.int_NUMBER_RETURN)"
                + " FROM t_retour_fournisseur_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " WHERE d.lg_RETOUR_FRS_ID = ?1 AND d.str_PML_TYPE = ?2").setParameter(1, retourId)
                .setParameter(2, RETOUR).getResultList();
        int acceptees = 0, refusees = 0, inconnues = 0;
        List<String> faites = new ArrayList<>();
        for (PharmaMlMessages.LigneBonRetour l : lignes) {
            Object[] cible = null;
            for (Object[] e : envoyees) {
                if (faites.contains((String) e[0])) {
                    continue;
                }
                boolean parNumero = l.numLigneDemande != null && e[1] != null
                        && ((Number) e[1]).intValue() == l.numLigneDemande;
                boolean parCode = l.numLigneDemande == null && StringUtils.isNotBlank(l.code)
                        && (l.code.equals(e[2]) || l.code.equals(e[3]));
                if (parNumero || parCode) {
                    cible = e;
                    break;
                }
            }
            if (cible == null) {
                inconnues++;
                continue;
            }
            faites.add((String) cible[0]);
            int demandee = cible[4] == null ? 0 : ((Number) cible[4]).intValue();
            int acceptee = Math.min(Math.max(0, l.quantiteAcceptee), demandee);
            acceptees += acceptee > 0 ? 1 : 0;
            refusees += acceptee < demandee ? 1 : 0;
            em.createNativeQuery(
                    "UPDATE t_retour_fournisseur_detail SET int_PML_QTE_ACCEPTEE = ?2, int_NUMBER_ANSWER = ?2,"
                            + " str_PML_COMMENTAIRE = ?3, str_PML_DATE_REPRISE = ?4 WHERE lg_RETOUR_FRS_DETAIL = ?1")
                    .setParameter(1, cible[0]).setParameter(2, acceptee)
                    .setParameter(3, StringUtils.left(l.commentaire, 255))
                    .setParameter(4, StringUtils.left(l.dateReprise, 20)).executeUpdate();
        }
        String detail = "Bon de retour " + StringUtils.defaultString((String) bon[1]) + " : " + acceptees
                + " ligne(s) acceptée(s), " + refusees + " refusée(s) en tout ou partie"
                + (inconnues > 0 ? ", " + inconnues + " ligne(s) non rattachée(s)" : "");
        em.createNativeQuery(
                "UPDATE t_retour_fournisseur SET str_PML_STATUT = ?2, str_PML_DETAIL = ?3, str_PML_REF_BON_RETOUR = ?4,"
                        + " dt_PML_REPONSE = NOW() WHERE lg_RETOUR_FRS_ID = ?1")
                .setParameter(1, retourId).setParameter(2, REPONDU).setParameter(3, StringUtils.left(detail, 500))
                .setParameter(4, StringUtils.left((String) bon[1], 20)).executeUpdate();
        return new JSONObject().put("msg", detail).put("acceptees", acceptees).put("refusees", refusees)
                .put("inconnues", inconnues);
    }

    /**
     * Quantite a sortir du stock a la validation : la quantite acceptee par le grossiste si un bon de retour l'a
     * donnee, sinon la quantite saisie (circuit sans PharmaML inchange).
     */
    @SuppressWarnings("unchecked")
    public static java.util.Map<String, Integer> quantitesAcceptees(EntityManager em, String retourId) {
        java.util.Map<String, Integer> m = new java.util.HashMap<>();
        for (Object[] x : (List<Object[]>) em.createNativeQuery("SELECT lg_RETOUR_FRS_DETAIL, int_PML_QTE_ACCEPTEE"
                + " FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = ?1 AND int_PML_QTE_ACCEPTEE IS NOT NULL")
                .setParameter(1, retourId).getResultList()) {
            m.put((String) x[0], ((Number) x[1]).intValue());
        }
        return m;
    }

    /** Etat d'envoi du retour et de ses lignes (ecran de retour). */
    @SuppressWarnings("unchecked")
    public static JSONObject etat(EntityManager em, String retourId) {
        List<Object[]> e = em.createNativeQuery("SELECT IFNULL(str_PML_STATUT, ''), IFNULL(str_PML_DETAIL, ''),"
                + " IFNULL(DATE_FORMAT(dt_PML_ENVOI, '%d/%m/%Y %H:%i'), ''), IFNULL(DATE_FORMAT(dt_PML_REPONSE, '%d/%m/%Y %H:%i'), ''),"
                + " IFNULL(str_PML_REF_BON_RETOUR, '') FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = ?1")
                .setParameter(1, retourId).getResultList();
        JSONObject r = new JSONObject().put("success", !e.isEmpty());
        if (e.isEmpty()) {
            return r;
        }
        r.put("statut", e.get(0)[0]).put("detail", e.get(0)[1]).put("envoi", e.get(0)[2]).put("reponse", e.get(0)[3])
                .put("bonRetour", e.get(0)[4]);
        JSONArray lignes = new JSONArray();
        for (Object[] x : (List<Object[]>) em
                .createNativeQuery("SELECT d.lg_RETOUR_FRS_DETAIL, IFNULL(d.str_PML_TYPE, ''),"
                        + " d.int_PML_QTE_DEMANDEE, d.int_PML_QTE_ACCEPTEE, IFNULL(d.str_PML_COMMENTAIRE, ''), IFNULL(d.str_PML_DATE_REPRISE, ''),"
                        + " IFNULL(m.str_PML_TYPE, ''), IFNULL(m.str_PML_CODE, '') FROM t_retour_fournisseur_detail d"
                        + " LEFT JOIN t_motif_retour m ON m.lg_MOTIF_RETOUR = d.lg_MOTIF_RETOUR WHERE d.lg_RETOUR_FRS_ID = ?1")
                .setParameter(1, retourId).getResultList()) {
            lignes.put(new JSONObject().put("id", x[0]).put("type", x[1])
                    .put("demandee", x[2] == null ? JSONObject.NULL : x[2])
                    .put("acceptee", x[3] == null ? JSONObject.NULL : x[3]).put("commentaire", x[4])
                    .put("dateReprise", x[5]).put("typePrevu", StringUtils.defaultIfBlank((String) x[6], AUCUN))
                    .put("code", x[7]));
        }
        return r.put("lignes", lignes);
    }
}
