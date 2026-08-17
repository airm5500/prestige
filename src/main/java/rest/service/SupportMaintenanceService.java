/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import java.util.Map;
import javax.ejb.Local;

/**
 * Actions de maintenance du Centre de Support : vidage controle de tables de travail (etiquettes, suggestions,
 * commandes en cours...). Chaque action est tracee dans le journal des evenements.
 *
 * @author koben
 */
@Local
public interface SupportMaintenanceService {

    String ACTION_ETIQUETTES = "ETIQUETTES";
    String ACTION_SUGGESTIONS = "SUGGESTIONS";
    String ACTION_COMMANDES_EN_COURS = "COMMANDES_EN_COURS";
    String ACTION_LOTS_PERIMES_FANTOMES = "LOTS_PERIMES_FANTOMES";
    String ACTION_PIECES_JOINTES = "PIECES_JOINTES";

    /** Anciennete par defaut, en jours, au-dela de laquelle une piece jointe peut etre liberee du disque. */
    int PIECES_JOINTES_JOURS_DEFAUT = 365;

    /**
     * Compteurs courants des donnees concernees par chaque action (affiches avant confirmation).
     */
    Map<String, Object> counts();

    /**
     * Execute l'action de vidage demandee (details supprimes avant les entetes) et trace l'operation dans le journal
     * des evenements. Retourne les nombres de lignes supprimees.
     */
    Map<String, Object> vider(String action, String utilisateur);

    /**
     * Etat du dossier des pieces jointes : nombre de fichiers, volume occupe, et ce que libererait une purge a
     * {@code jours} d'anciennete. Rendu AVANT confirmation, comme {@link #counts()} pour les autres actions.
     *
     * Ce comptage parcourt l'arborescence des pieces jointes : il est volontairement separe de {@link #counts()} pour
     * ne pas ralentir l'ecran de maintenance.
     */
    Map<String, Object> comptesPiecesJointes(int jours);

    /**
     * Libere le disque occupe par les pieces jointes des demandes de plus de {@code jours} jours, et supprime au
     * passage les fichiers orphelins (plus references par aucune demande).
     *
     * La demande elle-meme n'est JAMAIS supprimee : son objet, son message et son historique restent consultables. Seul
     * le fichier joint quitte le disque, et la demande porte alors la mention de sa purge.
     *
     * Operation manuelle : aucun planificateur ne la declenche.
     */
    Map<String, Object> viderPiecesJointes(int jours, String utilisateur);
}
