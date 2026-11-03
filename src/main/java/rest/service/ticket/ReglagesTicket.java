package rest.service.ticket;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Reglages d'un modele de ticket pour une largeur de papier (menu « Modeles de ticket », demande du 02/11).
 *
 * <p>
 * Valeurs par defaut, decidees avec l'officine : nouveau modele ; remise affichee (« * ») ; lot vendu, CC/RC, encours
 * et signature du carnet desactives ; recapitulatif « articles · boites » et commentaires de l'officine affiches ;
 * signatures actives sur le mouvement de caisse et le ticket Z ; net a payer encadre (le cadre peut etre retire depuis
 * le retour du 03/11). La disposition (ordre, alignement et taille des blocs) est vide par defaut : l'ordre du modele
 * s'applique.
 */
public final class ReglagesTicket {

    public static final String ANCIEN = "ANCIEN";
    public static final String NOUVEAU = "NOUVEAU";
    /** Ecart de taille de police permis pour un bloc, en points, de part et d'autre de la taille du modele. */
    public static final int ECART_TAILLE_MAX = 4;

    /** Position d'un bloc : son identifiant, son alignement (G, C, D) et son ecart de taille. */
    public static final class Position {
        public final String bloc;
        public final String alignement;
        public final int taille;

        public Position(String bloc, String alignement, int taille) {
            this.bloc = bloc;
            this.alignement = alignement == null ? "" : alignement;
            this.taille = taille;
        }

        JSONObject json() {
            return new JSONObject().put("bloc", bloc).put("alignement", alignement).put("taille", taille);
        }
    }

    private final ModeleTicket ticket;
    private String modele = NOUVEAU;
    private boolean remise = true;
    private boolean lot = false;
    private boolean ccRc = false;
    private boolean recapitulatif = true;
    private boolean commentaires = true;
    private boolean encoursCarnet = false;
    private boolean signatureClient = false;
    private boolean signatures;
    private boolean cadreNet = true;
    private List<Position> disposition = new ArrayList<>();

    public ReglagesTicket(ModeleTicket ticket) {
        this.ticket = ticket;
        this.signatures = ticket == ModeleTicket.MOUVEMENT_CAISSE || ticket == ModeleTicket.TICKET_Z;
        if (!ticket.nouveauDisponible()) {
            this.modele = ANCIEN;
        }
    }

    public ModeleTicket ticket() {
        return ticket;
    }

    public boolean nouveau() {
        return NOUVEAU.equals(modele) && ticket.nouveauDisponible();
    }

    public String modele() {
        return modele;
    }

    public boolean remise() {
        return remise;
    }

    public boolean lot() {
        return lot;
    }

    public boolean ccRc() {
        return ccRc;
    }

    public boolean recapitulatif() {
        return recapitulatif;
    }

    public boolean commentaires() {
        return commentaires;
    }

    public boolean encoursCarnet() {
        return encoursCarnet;
    }

    public boolean signatureClient() {
        return signatureClient;
    }

    public boolean signatures() {
        return signatures;
    }

    /**
     * Retour du 03/11 : cadre autour du net a payer (montant, regle, total especes) ; sans lui, le net reste en grand.
     */
    public boolean cadreNet() {
        return cadreNet;
    }

    public List<Position> disposition() {
        return Collections.unmodifiableList(disposition);
    }

    public Position position(String bloc) {
        for (Position p : disposition) {
            if (p.bloc.equals(bloc)) {
                return p;
            }
        }
        return null;
    }

    public JSONObject json() {
        JSONArray d = new JSONArray();
        disposition.forEach(p -> d.put(p.json()));
        return new JSONObject().put("ticket", ticket.name()).put("modele", modele).put("remise", remise).put("lot", lot)
                .put("ccRc", ccRc).put("recapitulatif", recapitulatif).put("commentaires", commentaires)
                .put("encoursCarnet", encoursCarnet).put("signatureClient", signatureClient)
                .put("signatures", signatures).put("cadreNet", cadreNet).put("disposition", d);
    }

    /** Reglages lus d'un JSON (base ou ecran) ; une valeur absente garde le defaut. */
    public static ReglagesTicket depuis(ModeleTicket ticket, JSONObject j) {
        ReglagesTicket r = new ReglagesTicket(ticket);
        if (j == null) {
            return r;
        }
        String m = j.optString("modele", r.modele);
        r.modele = ANCIEN.equals(m) || !ticket.nouveauDisponible() ? ANCIEN : NOUVEAU;
        r.remise = j.optBoolean("remise", r.remise);
        r.lot = j.optBoolean("lot", r.lot);
        r.ccRc = j.optBoolean("ccRc", r.ccRc);
        r.recapitulatif = j.optBoolean("recapitulatif", r.recapitulatif);
        r.commentaires = j.optBoolean("commentaires", r.commentaires);
        r.encoursCarnet = j.optBoolean("encoursCarnet", r.encoursCarnet);
        r.signatureClient = j.optBoolean("signatureClient", r.signatureClient);
        r.signatures = j.optBoolean("signatures", r.signatures);
        r.cadreNet = j.optBoolean("cadreNet", r.cadreNet);
        JSONArray d = j.optJSONArray("disposition");
        if (d != null) {
            for (int i = 0; i < d.length(); i++) {
                JSONObject p = d.optJSONObject(i);
                if (p != null && !p.optString("bloc", "").isEmpty()) {
                    r.disposition.add(new Position(p.getString("bloc"), p.optString("alignement", ""),
                            Math.max(-ECART_TAILLE_MAX, Math.min(ECART_TAILLE_MAX, p.optInt("taille", 0)))));
                }
            }
        }
        return r;
    }
}
