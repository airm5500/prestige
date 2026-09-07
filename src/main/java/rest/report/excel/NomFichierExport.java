package rest.report.excel;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import javax.ws.rs.core.Response;

/**
 * Reponse d'un export Excel : le contenu, et un nom de fichier horodate.
 *
 * <p>
 * Les exports du cahier des charges sont nombreux ; sans nom horodate, deux exports successifs du meme ecran se
 * recouvraient dans le dossier de telechargement de l'utilisateur.
 */
public final class NomFichierExport {

    private static final DateTimeFormatter HORODATAGE = DateTimeFormatter.ofPattern("ddMMyyyy_HHmmss");

    private NomFichierExport() {
    }

    /** Nom du fichier : prefixe metier, date et heure, extension .xlsx. */
    public static String nom(String prefixe) {
        return prefixe + "_" + LocalDateTime.now().format(HORODATAGE) + ".xlsx";
    }

    /** Reponse HTTP portant le classeur en piece jointe. */
    public static Response reponse(byte[] contenu, String prefixe) {
        return Response.ok(contenu).header("Content-Disposition", "attachment; filename=\"" + nom(prefixe) + "\"")
                .build();
    }
}
