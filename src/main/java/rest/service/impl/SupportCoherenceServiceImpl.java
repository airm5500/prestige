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
import javax.ejb.EJB;
import javax.annotation.security.PermitAll;
import javax.ejb.Stateless;
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
        for (SupportControle controle : controles) {
            synthese.add(runOne(controle));
        }
        return synthese;
    }

    private Map<String, Object> runOne(SupportControle controle) {
        Map<String, Object> resultat = new LinkedHashMap<>();
        resultat.put("code", controle.getCode());
        resultat.put("libelle", controle.getLibelle());
        resultat.put("dryRun", controle.isDryRun());
        try {
            if (!isSelectSeul(controle.getRequeteSql())) {
                throw new IllegalStateException("Requete non autorisee (SELECT uniquement)");
            }
            List<Object[]> lignes = executer(controle.getRequeteSql());
            int nbCas = lignes.size();
            resultat.put("nbCas", nbCas);
            // Rafraichit l'etat courant du controle (cree, met a jour ou supprime l'evenement).
            supportEventService.recordCoherence(controle.getCode(), controle.getLibelle(), controle.getModule(), nbCas,
                    buildPayload(controle, lignes), buildListeComplete(controle, lignes));
            if (!controle.isDryRun()) {
                if (nbCas > 0) {
                    creerTicketSynthese(controle, nbCas, lignes);
                } else {
                    cloturerTicketResolu(controle);
                }
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "runOne " + controle.getCode(), e);
            resultat.put("erreur", StringUtils.abbreviate(e.getMessage(), 500));
            // une requete de controle en erreur est elle-meme signalee au support
            signalerControleEnErreur(controle, e);
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
            dto.setStack(StringUtils.abbreviate(String.valueOf(e), 8000));
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
