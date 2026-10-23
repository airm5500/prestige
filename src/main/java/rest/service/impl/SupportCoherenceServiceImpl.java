/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.SupportControle;
import dal.SupportTicket;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.annotation.security.PermitAll;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.repo.SupportControleRepo;
import rest.service.SupportCoherenceService;
import rest.service.SupportEventService;
import rest.service.SupportTicketService;
import rest.service.dto.SupportEventDTO;

/**
 *
 * @author koben
 */
@PermitAll
@Stateless
public class SupportCoherenceServiceImpl implements SupportCoherenceService {

    private static final Logger LOG = Logger.getLogger(SupportCoherenceServiceImpl.class.getName());

    private static final int MAX_LIGNES_PAR_CONTROLE = 500;
    private static final int TAILLE_ECHANTILLON = 20;
    private static final String TYPE_EVENEMENT = "COHERENCE";
    private static final String AUTEUR = "VEILLE_COHERENCE";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Resource
    private SessionContext sessionContext;
    @EJB
    private SupportControleRepo supportControleRepo;
    @EJB
    private SupportEventService supportEventService;
    @EJB
    private SupportTicketService supportTicketService;

    @Override
    public List<Map<String, Object>> runActiveChecks() {
        List<Map<String, Object>> synthese = new ArrayList<>();
        List<SupportControle> controles = supportControleRepo.findActifs();
        // Chaque controle s'execute dans sa PROPRE transaction (REQUIRES_NEW) via le proxy du bean :
        // un controle en erreur ne condamne plus la transaction des controles suivants (fini l'effet cascade).
        SupportCoherenceService self = sessionContext.getBusinessObject(SupportCoherenceService.class);
        for (SupportControle controle : controles) {
            try {
                synthese.add(self.runOneIsolated(controle));
            } catch (Exception e) {
                // Echec au commit de la transaction isolee (ex. violation de contrainte) : on isole et on continue.
                LOG.log(Level.SEVERE, "runActiveChecks " + controle.getCode(), e);
                Map<String, Object> ligne = new LinkedHashMap<>();
                ligne.put("code", controle.getCode());
                ligne.put("libelle", controle.getLibelle());
                ligne.put("dryRun", controle.isDryRun());
                // On expose la cause RACINE (message SQL reel) et non le wrapper generique Hibernate.
                ligne.put("erreur", StringUtils.abbreviate(rootCauseMessage(e), 500));
                synthese.add(ligne);
                signalerControleEnErreur(controle, e);
            }
        }
        return synthese;
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public Map<String, Object> runOneIsolated(SupportControle controle) {
        return runOne(controle);
    }

    /**
     * Execute un controle. En cas d'erreur, l'exception est PROPAGEE : elle est traitee (et confinee a la transaction
     * REQUIRES_NEW du controle) par {@link #runActiveChecks()}. On n'avale plus l'erreur ici pour eviter tout effet
     * cascade sur les controles suivants.
     */
    private Map<String, Object> runOne(SupportControle controle) {
        Map<String, Object> resultat = new LinkedHashMap<>();
        resultat.put("code", controle.getCode());
        resultat.put("libelle", controle.getLibelle());
        resultat.put("dryRun", controle.isDryRun());
        if (!isSelectSeul(controle.getRequeteSql())) {
            throw new IllegalStateException("Requete non autorisee (SELECT uniquement)");
        }
        List<Object[]> lignes = executer(controle.getRequeteSql());
        int nbCas = lignes.size();
        resultat.put("nbCas", nbCas);
        // Enregistrement de l'anomalie en "best-effort" : recordCoherence tourne dans SA PROPRE transaction
        // (REQUIRES_NEW) et ecrit le fichier log AVANT tout acces base. Si l'insert de l'evenement echoue, le
        // controle reste valide (nombre de cas + fichier log disponibles) et on remonte juste la cause reelle.
        try {
            supportEventService.recordCoherence(controle.getCode(), controle.getLibelle(), controle.getModule(),
                    controle.getRequeteSql(), nbCas, buildPayload(controle, lignes),
                    buildListeComplete(controle, lignes));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "recordCoherence " + controle.getCode() + " : " + rootCauseMessage(e), e);
            resultat.put("avertissement", "Anomalies detectees mais evenement non enregistre : " + rootCauseMessage(e));
        }
        if (!controle.isDryRun()) {
            if (nbCas > 0) {
                creerTicketSynthese(controle, nbCas, lignes);
            } else {
                cloturerTicketResolu(controle);
            }
        }
        return resultat;
    }

    /**
     * Le controle ne remonte plus d'anomalie : on cloture (statut RESOLU) le ticket de synthese eventuellement ouvert.
     */
    private void cloturerTicketResolu(SupportControle controle) {
        try {
            SupportTicket ticket = supportTicketService.findOpenBySignature(controle.getCode());
            if (ticket != null) {
                supportTicketService.changeStatut(ticket.getId(), SupportTicket.STATUT_RESOLU, AUTEUR);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "cloturerTicketResolu " + controle.getCode(), e);
        }
    }

    private void creerTicketSynthese(SupportControle controle, int nbCas, List<Object[]> lignes) {
        // un seul ticket ouvert par controle : evite le flot de tickets
        if (supportTicketService.findOpenBySignature(controle.getCode()) != null) {
            return;
        }
        String description = "Controle de coherence : " + controle.getLibelle() + "\nNombre de cas detectes : " + nbCas
                + "\nEchantillon (ids) :\n" + buildListeComplete(controle, lignes);
        SupportTicket ticket = supportTicketService.createAutoTicket(
                "[Coherence] " + controle.getLibelle() + " (" + nbCas + " cas)", description, controle.getModule(),
                "HAUTE", controle.getCode(), null);
        LOG.log(Level.INFO, "Ticket de coherence cree : {0}", ticket.getNumero());
    }

    private String buildPayload(SupportControle controle, List<Object[]> lignes) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"code\":\"").append(controle.getCode()).append("\",\"nb_cas\":").append(lignes.size())
                .append(",\"echantillon\":[");
        int max = Math.min(lignes.size(), TAILLE_ECHANTILLON);
        for (int i = 0; i < max; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append('"').append(echapper(premiereColonne(lignes.get(i)))).append('"');
        }
        sb.append("]}");
        return StringUtils.abbreviate(sb.toString(), 4000);
    }

    private String buildListeComplete(SupportControle controle, List<Object[]> lignes) {
        StringBuilder sb = new StringBuilder();
        sb.append("Controle : ").append(controle.getCode()).append(" (").append(lignes.size()).append(" cas)\n");
        sb.append("Ou chercher : ").append(localisation(controle.getCode())).append("\n");
        sb.append("Colonnes : 1 = identifiant technique (a rechercher), 2 = contexte\n\n");
        for (Object[] ligne : lignes) {
            sb.append(premiereColonne(ligne));
            if (ligne.length > 1 && ligne[1] != null) {
                sb.append("  |  ").append(String.valueOf(ligne[1]));
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    private void signalerControleEnErreur(SupportControle controle, Exception e) {
        try {
            SupportEventDTO dto = new SupportEventDTO();
            dto.setType(TYPE_EVENEMENT);
            dto.setNiveau("ERROR");
            dto.setModule("SUPPORT");
            dto.setMessageCourt("Controle de coherence en erreur : " + controle.getCode());
            dto.setUrlOuEcran("controle:" + controle.getCode());
            // On joint la cause RACINE (message SQL reel) + la requete fautive pour un diagnostic immediat.
            String detail = "Ou chercher : " + localisation(controle.getCode()) + "\n\nCause reelle :\n"
                    + rootCauseMessage(e) + "\n\nRequete SQL du controle :\n"
                    + StringUtils.defaultString(controle.getRequeteSql()) + "\n\nPile complete :\n" + String.valueOf(e);
            dto.setStack(StringUtils.abbreviate(detail, 8000));
            supportEventService.record(dto, AUTEUR);
        } catch (Exception ignore) {
            LOG.log(Level.SEVERE, "signalerControleEnErreur", ignore);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> executer(String sql) {
        Query query = em.createNativeQuery(sql).setMaxResults(MAX_LIGNES_PAR_CONTROLE);
        List<Object[]> resultats = new ArrayList<>();
        for (Object ligne : query.getResultList()) {
            if (ligne instanceof Object[]) {
                resultats.add((Object[]) ligne);
            } else {
                // requete a une seule colonne : on normalise en tableau
                resultats.add(new Object[] { ligne });
            }
        }
        return resultats;
    }

    private String premiereColonne(Object[] ligne) {
        return ligne.length > 0 && ligne[0] != null ? String.valueOf(ligne[0]) : "";
    }

    /**
     * Deroule la chaine des causes pour renvoyer le message d'erreur le PLUS UTILE : si une {@link SQLException} est
     * presente, on renvoie son code erreur + SQLState + message (ex. "SQL[1062/23000] Duplicate entry ... for key ...")
     * plutot que le wrapper generique Hibernate ("could not execute statement").
     */
    private String rootCauseMessage(Throwable t) {
        Throwable courant = t;
        String meilleur = String.valueOf(t);
        while (courant != null) {
            if (courant instanceof java.sql.SQLException) {
                java.sql.SQLException se = (java.sql.SQLException) courant;
                return "SQL[" + se.getErrorCode() + "/" + se.getSQLState() + "] "
                        + StringUtils.defaultString(se.getMessage());
            }
            if (StringUtils.isNotBlank(courant.getMessage())) {
                meilleur = courant.getMessage();
            }
            if (courant.getCause() == courant) {
                break;
            }
            courant = courant.getCause();
        }
        return meilleur;
    }

    /**
     * Indique, pour un code de controle, la table et la colonne ou retrouver la donnee concernee (l'identifiant
     * technique renvoye en 1ere colonne). Permet au technicien de localiser immediatement l'enregistrement fautif.
     */
    private String localisation(String code) {
        if (code == null) {
            return "voir la requete du controle";
        }
        switch (code) {
        case "BL_SANS_DETAIL":
            return "table t_bon_livraison (colonne lg_BON_LIVRAISON_ID)";
        case "FACTURE_SANS_DETAIL":
            return "table t_facture (colonne lg_FACTURE_ID)";
        case "SUGGESTION_SANS_DETAIL":
            return "table t_suggestion_order (colonne lg_SUGGESTION_ORDER_ID)";
        case "COMMANDE_SANS_DETAIL":
            return "table t_order (colonne lg_ORDER_ID)";
        case "DOSSIER_REGLEMENT_SANS_DETAIL":
            return "table t_dossier_reglement (colonne lg_DOSSIER_REGLEMENT_ID)";
        case "VENTE_COMPTANT_SANS_MVT_CAISSE":
        case "VENTE_COMPTANT_SANS_MVT_STOCK":
        case "DIFFERE_MAUVAIS_COMPTE":
        case "TIERS_PAYANT_MAUVAIS_COMPTE":
            return "table t_preenregistrement (colonne lg_PREENREGISTREMENT_ID) - ecran de vente";
        case "ARTICLE_ACTIF_SANS_STOCK":
        case "STOCK_VS_LOTS":
            return "table t_famille (colonne lg_FAMILLE_ID) - fiche article";
        case "INVENTAIRE_SANS_LIGNE":
            return "table t_inventaire (colonne lg_INVENTAIRE_ID)";
        case "INVENTAIRE_LIGNE_SANS_STOCK":
            return "table t_inventaire_famille (colonne lg_INVENTAIRE_FAMILLE_ID)";
        case "LOT_PERIME_AVEC_STOCK":
        case "LOT_SANS_ARTICLE":
            return "table t_lot (colonne lg_LOT_ID)";
        case "VALORISATION_JOUR_MANQUANT":
            return "table stock_daily_value (colonne id au format AAAAMMJJ)";
        case "SNAPSHOT_JOUR_MANQUANT":
            return "table stock_snapshot_day (colonne stock_of_day = date du jour AAAAMMJJ)";
        case "CAISSE_JOUR_SANS_LIGNE":
            return "table t_resume_caisse (colonne ld_CAISSE_ID)";
        default:
            return "voir la requete du controle";
        }
    }

    private boolean isSelectSeul(String sql) {
        if (StringUtils.isBlank(sql)) {
            return false;
        }
        String normalise = sql.trim().toLowerCase();
        // une seule instruction, en lecture seule
        boolean uneSeuleInstruction = normalise.indexOf(';') == -1 || normalise.indexOf(';') == normalise.length() - 1;
        return normalise.startsWith("select") && uneSeuleInstruction;
    }

    private String echapper(String valeur) {
        return valeur == null ? "" : valeur.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
