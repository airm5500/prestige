/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.ApplicationEvent;
import dal.TUser;
import java.util.List;
import java.util.Map;
import javax.ejb.Local;
import rest.service.dto.SupportEventDTO;

/**
 * Journal des evenements applicatifs du Centre de Support : capture, deduplication par signature, creation automatique
 * de tickets, sante application et purge.
 *
 * @author koben
 */
@Local
public interface SupportEventService {

    void record(SupportEventDTO dto, String utilisateur);

    /**
     * Enregistre l'etat COURANT d'un controle de coherence : un seul evenement par controle, rafraichi a chaque passage
     * (nombre de cas, echantillon, fichier log). Si {@code nbCas <= 0}, l'evenement et son log sont supprimes (anomalie
     * resolue).
     */
    void recordCoherence(String code, String libelle, String module, String requeteSql, int nbCas, String payloadSample,
            String listeComplete);

    List<ApplicationEvent> findAll(int start, int limit, String niveau);

    /**
     * Liste filtree par niveau ET par recherche libre « contient » sur les colonnes textuelles (message, module, type,
     * ecran ou URL, utilisateur). limit <= 0 : tout le resultat.
     */
    List<ApplicationEvent> findAll(int start, int limit, String niveau, String recherche);

    long count(String niveau);

    /** Comptage avec les memes criteres que la liste, recherche comprise. */
    long count(String niveau, String recherche);

    String createTicketFromEvent(String eventId, TUser user);

    /**
     * Retourne le contenu du fichier log associe a un evenement (lecture seule, borne en taille). Le chemin est valide
     * comme etant SOUS le dossier de stockage du support (aucune lecture de fichier arbitraire).
     */
    String readLogContent(String eventId);

    /**
     * Contexte metier a joindre a un evenement, deduit de l'adresse appelee : pour la vente, la reference de la vente
     * concernee, son etat et qui la tenait. {@code null} quand rien n'est reconnu.
     */
    String contexteMetier(String uri);

    /**
     * Valeur d'un parametre applicatif (t_parameters), ou {@code null} si absent.
     */
    String getParameter(String key);

    /**
     * Enregistre le dernier passage d'un job planifie (t_support_job_run) pour la surveillance de fraicheur.
     */
    void recordJobRun(String code);

    /**
     * Enregistre un incident serveur distinct (ex. crash detecte par le watchdog). Cree un evenement avec le detail
     * ecrit dans un fichier log, de facon synchrone et idempotente (par signature).
     */
    void recordServerIncident(String code, String niveau, String message, String detail);

    Map<String, Object> sante();

    int purgeOldEvents();

    /**
     * Occurrences individuelles d'un evenement : date/heure suivie de l'utilisateur + IP + poste qui l'a constatee
     * (niveaux ERROR/FATAL uniquement, plafond 100, enregistrees a partir de la mise en place de la table). Triees de
     * la plus recente a la plus ancienne.
     */
    List<String> findOccurrences(String eventId);

    /**
     * Nombre d'evenements qui seraient supprimes par une purge manuelle avec ces criteres (apercu avant confirmation).
     *
     * @param niveaux
     *            liste CSV de niveaux (ex. "ERROR,WARN"), vide = tous
     * @param avantLe
     *            date ISO (yyyy-MM-dd) : ne purge que les evenements vus avant cette date ; vide = sans limite
     * @param inclureTickets
     *            false = les evenements lies a un ticket sont proteges
     */
    long countForPurge(String niveaux, String avantLe, boolean inclureTickets);

    /**
     * Purge manuelle des evenements selon les memes criteres que {@link #countForPurge}. Supprime aussi les fichiers
     * logs et les occurrences associees, et trace l'action dans le journal (evenement MAINTENANCE).
     */
    int purgeSelective(String niveaux, String avantLe, boolean inclureTickets, String utilisateur);

    /**
     * Recapitulatif analytique des evenements : groupes par module + type + niveau avec nombre d'anomalies distinctes,
     * total d'occurrences et derniere apparition, tries par total d'occurrences decroissant. Periode optionnelle sur la
     * derniere apparition (dates ISO yyyy-MM-dd, vides = sans borne).
     */
    List<Map<String, Object>> recap(String dtStart, String dtEnd);

    /**
     * Trace une action de maintenance dans le journal des evenements (type MAINTENANCE, niveau INFO, un evenement
     * distinct par action executee : qui, quoi, combien).
     */
    void recordMaintenance(String action, String message, String utilisateur);
}
