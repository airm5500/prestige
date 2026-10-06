package rest.service;

import commonTasks.dto.RhPresenceDTO;
import commonTasks.dto.RhTableauDTO;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/** Pointage, presence et tableau RH (plan d'octobre, section 3, lot L11b). */
@Local
public interface RhPointageService {

    JSONObject modeles();

    JSONObject enregistrerModele(JSONObject saisie);

    /** Etape 1 : lecture du fichier, garde sous un jeton ; rend un apercu des premieres lignes brutes. */
    JSONObject analyserImport(String nomFichier, byte[] contenu);

    /** Etape 2 (ecrire = false) : controle ligne a ligne ; etape 3 (ecrire = true) : enregistrement du lot. */
    JSONObject importer(String jeton, String modeleId, boolean ecrire, TUser operateur);

    JSONObject lots(int limite);

    /** Pointage manuel : motif obligatoire, trace (saisi par). */
    JSONObject saisirPointage(JSONObject saisie, TUser operateur);

    /** Seuls les pointages manuels se suppriment. */
    JSONObject supprimerPointage(String id);

    /** Feuille de presence : une ligne par employe et par jour ou il se passe quelque chose. */
    List<RhPresenceDTO> presences(LocalDate du, LocalDate au, String employeId);

    /** Pointages d'un jour (pour la feuille de presence) : [{id, employeId, horodatage, sens, source, motif}]. */
    JSONObject pointagesDuJour(LocalDate jour);

    List<RhTableauDTO> tableau(LocalDate du, LocalDate au, String employeId);
}
