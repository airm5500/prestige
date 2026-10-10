package rest.service;

import dal.TUser;
import java.time.LocalDate;
import javax.ejb.Local;
import javax.servlet.http.HttpServletRequest;
import org.json.JSONArray;
import org.json.JSONObject;

/** Ressources humaines, socle (plan d'octobre, section 3, lot L11a). */
@Local
public interface RhService {

    /* employes */
    JSONObject employes(String recherche, boolean inactifs);

    JSONObject enregistrerEmploye(JSONObject saisie, TUser operateur);

    /**
     * Retours du 07/10 : chaque utilisateur ACTIF du logiciel (t_user) qui n'est rattache a aucun employe devient un
     * employe rattache (matricule = identifiant de connexion). Le compte technique « admin » est ignore. Sans effet
     * quand tout est deja rattache. Rend {success, crees}.
     */
    JSONObject synchroniserUtilisateurs();

    /** Utilisateurs du logiciel pas encore lies a un employe (et celui de l'employe donne). */
    JSONObject utilisateursLibres(String employeId);

    /* planning de la semaine */
    JSONObject planning(LocalDate jour);

    /** Cases de la semaine : [{employeId, jour, type, debut, fin, pause, commentaire}] ; type vide = case videe. */
    JSONObject enregistrerPlanning(JSONArray cases, TUser operateur);

    /**
     * Copie la semaine de {@code source} sur celle de {@code cible} ; {@code remplacer} = ecraser les cases deja
     * saisies.
     */
    JSONObject copierSemaine(LocalDate source, LocalDate cible, boolean remplacer, TUser operateur);

    /** Retours du 10/10 : equipes (membres et programme commun de la semaine). */
    JSONObject equipes();

    /**
     * Cree ou modifie une equipe : {id?, nom, membres:[employeId], programme:[{jour 1..7, type, debut, fin, pause}]}.
     */
    JSONObject enregistrerEquipe(JSONObject equipe);

    JSONObject supprimerEquipe(String id);

    /**
     * Applique le programme de l'equipe a ses membres sur la semaine du jour donne (cases deja saisies gardees ou non).
     */
    JSONObject appliquerEquipe(String id, LocalDate semaine, boolean remplacer, TUser operateur);

    /* absences */
    JSONObject absences(LocalDate du, LocalDate au, String employeId, String statut);

    JSONObject enregistrerAbsence(JSONObject saisie, TUser operateur);

    /** VALIDE ou REFUSE (droit P_RH_VALIDER_CONGE verifie par la ressource). */
    JSONObject deciderAbsence(String id, String statut, TUser operateur);

    JSONObject supprimerAbsence(String id, TUser operateur, boolean valideur);

    int absencesADecider();

    /* connexions */
    JSONObject sessions(LocalDate du, LocalDate au, String userId);

    /** Ouvre une session a la connexion ; ne doit jamais empecher la connexion. */
    void ouvrirSession(TUser user, HttpServletRequest request, String poste);

    /** Clot la session HTTP a la deconnexion. */
    void fermerSession(String sessionHttp, String finPar);
}
