package rest.service.ticket;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Reglages d'un modele de ticket pour une largeur de papier (menu « Modeles de ticket », demande du 02/11).
 *
 * <p>
 * Valeurs par defaut, decidees avec l'officine : nouveau modele ; remise affichee (« * ») ; lot vendu, CC/RC, encours
 * et signature du carnet desactives ; recapitulatif « lignes · boites » et commentaires de l'officine affiches ;
 * signatures actives sur le mouvement de caisse et le ticket Z ; net a payer encadre (le cadre peut etre retire depuis
 * le retour du 03/11).
 * </p>
 *
 * <p>
 * Retour du 05/11 : nouvelles valeurs par defaut (version 2) : Arial Narrow, tailles du nom de l'officine, du numero,
 * du client et des lignes d'article reduites, ticket Z et mouvement de caisse sans cadre, vente depot sans net a payer.
 * Elles ne valent QUE pour un ticket jamais enregistre : des reglages deja enregistres (version 1, sans numero de
 * version) gardent leurs anciennes valeurs par defaut, pour que l'officine puisse les exporter et les importer ailleurs
 * telles quelles.
 * </p>
 */
public final class ReglagesTicket {

    public static final String ANCIEN = "ANCIEN";
    public static final String NOUVEAU = "NOUVEAU";
    /** Version des valeurs par defaut : 1 avant le retour du 05/11, 2 depuis. */
    public static final int VERSION = 2;
    /** Ecart de taille de police permis pour un bloc, en points, de part et d'autre de la taille du modele. */
    public static final int ECART_TAILLE_MAX = 4;
    /** Retour du 05/11 : largeur d'un bloc, en pourcentage de la largeur imprimable. */
    public static final int LARGEUR_MIN = 30;
    /** Retour du 05/11 : marge laissee de chaque cote du rouleau, en millimetres. */
    public static final int MARGE_MAX = 6;
    /**
     * Retour du 10/11 : debut d'impression, decalage de tout le ticket vers la gauche (negatif) ou la droite, en
     * millimetres, par pas de {@link #DEBUT_PAS} ; la largeur du ticket ne change pas.
     */
    public static final double DEBUT_MIN = -3;
    public static final double DEBUT_MAX = 6;
    public static final double DEBUT_PAS = 0.5;
    /**
     * Retour du 03/11 : polices proposees (toutes livrees avec Windows). Une police absente du poste qui imprime
     * retombe sur Arial Narrow (RenduTicket).
     */
    public static final List<String> POLICES = Collections
            .unmodifiableList(Arrays.asList("Segoe UI", "Arial Narrow", "Tahoma", "Calibri", "Verdana"));
    /** Police par defaut depuis le retour du 05/11 ; celle d'avant pour des reglages de version 1. */
    public static final String POLICE_DEFAUT = "Arial Narrow";
    static final String POLICE_V1 = "Segoe UI";

    /**
     * Retour du 05/11 : blocs communs a tous les tickets (en-tete de l'officine, commentaire du bas, code-barres) ;
     * leur reglage, comme la police et la marge, se recopie sur tous les modeles a l'enregistrement.
     */
    public static final List<String> BLOCS_COMMUNS = Collections.unmodifiableList(
            Arrays.asList(TicketDocument.ENTETE, TicketDocument.PHARMACIEN, TicketDocument.COORDONNEES,
                    TicketDocument.MESSAGE, TicketDocument.COMMENTAIRE, TicketDocument.DATE, TicketDocument.PIED));

    /**
     * Position d'un bloc : son identifiant, son alignement (G, C, D), son ecart de taille, sa largeur (pourcentage,
     * retour du 05/11 : en dessous de 100, chaque texte tient sur une ligne, termine par « … ») et, pour les articles,
     * l'ecart de taille de chaque partie (titre de section, designation, « quantite × prix »).
     */
    public static final class Position {
        public final String bloc;
        public final String alignement;
        public final int taille;
        public final int largeur;
        public final int section;
        public final int nom;
        public final int detail;

        public Position(String bloc, String alignement, int taille) {
            this(bloc, alignement, taille, 100, 0, 0, 0);
        }

        public Position(String bloc, String alignement, int taille, int largeur, int section, int nom, int detail) {
            this.bloc = bloc;
            this.alignement = alignement == null ? "" : alignement;
            this.taille = taille;
            this.largeur = Math.max(LARGEUR_MIN, Math.min(100, largeur));
            this.section = borne(section);
            this.nom = borne(nom);
            this.detail = borne(detail);
        }

        JSONObject json() {
            JSONObject j = new JSONObject().put("bloc", bloc).put("alignement", alignement).put("taille", taille);
            if (largeur != 100) {
                j.put("largeur", largeur);
            }
            if (section != 0 || nom != 0 || detail != 0) {
                j.put("section", section).put("nom", nom).put("detail", detail);
            }
            return j;
        }

        static Position depuis(JSONObject p) {
            return new Position(p.getString("bloc"), p.optString("alignement", ""), borne(p.optInt("taille", 0)),
                    p.optInt("largeur", 100), p.optInt("section", 0), p.optInt("nom", 0), p.optInt("detail", 0));
        }
    }

    static int borne(int ecart) {
        return Math.max(-ECART_TAILLE_MAX, Math.min(ECART_TAILLE_MAX, ecart));
    }

    private final ModeleTicket ticket;
    private int version = VERSION;
    private String modele = NOUVEAU;
    private boolean remise = true;
    /** Plan du 08/11, point 16 : mention « PROMOTION … » sous la ligne (oui par defaut). */
    private boolean promotion = true;
    private boolean lot = false;
    private boolean ccRc = false;
    private boolean recapitulatif = true;
    private boolean commentaires = true;
    private boolean encoursCarnet = false;
    private boolean signatureClient = false;
    private boolean signatures;
    private boolean cadreNet;
    private boolean net;
    private int marge = 0;
    private double debut = 0;
    private String police = POLICE_DEFAUT;
    private List<Position> disposition = new ArrayList<>();

    /** Reglages par defaut d'un ticket jamais enregistre (valeurs du retour du 05/11). */
    public ReglagesTicket(ModeleTicket ticket) {
        this(ticket, VERSION);
    }

    private ReglagesTicket(ModeleTicket ticket, int version) {
        this.ticket = ticket;
        this.version = version;
        this.signatures = ticket == ModeleTicket.MOUVEMENT_CAISSE || ticket == ModeleTicket.TICKET_Z;
        if (!ticket.nouveauDisponible()) {
            this.modele = ANCIEN;
        }
        boolean v2 = version >= 2;
        this.police = v2 ? POLICE_DEFAUT : POLICE_V1;
        this.cadreNet = !v2 || (ticket != ModeleTicket.TICKET_Z && ticket != ModeleTicket.MOUVEMENT_CAISSE);
        this.net = !v2 || ticket != ModeleTicket.VENTE_DEPOT;
        if (v2) {
            this.disposition = dispositionDefaut(ticket);
        }
    }

    /**
     * Retour du 05/11 : tailles par defaut (en points autour du modele) : nom de l'officine −2, numero du ticket −1 (−2
     * sur le recu assurance + comptant et le ticket Z), client −1, designation et « quantite × prix » −1, « Caissier :
     * » du ticket Z −1. Les blocs sont listes dans l'ordre du modele : l'ordre ne change pas.
     */
    public static List<Position> dispositionDefaut(ModeleTicket t) {
        List<Position> d = new ArrayList<>();
        d.add(new Position(TicketDocument.ENTETE, "", -2));
        int numero = t == ModeleTicket.VENTE_MIXTE || t == ModeleTicket.TICKET_Z ? -2 : -1;
        d.add(new Position(TicketDocument.TITRE, "", numero));
        d.add(new Position(TicketDocument.CLIENT, "", -1));
        if (t == ModeleTicket.TICKET_Z) {
            d.add(new Position(TicketDocument.CORPS, "", 0, 100, -1, 0, 0));
        } else {
            d.add(new Position(TicketDocument.CORPS, "", 0, 100, 0, -1, -1));
        }
        return d;
    }

    public ModeleTicket ticket() {
        return ticket;
    }

    public int version() {
        return version;
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

    public boolean promotion() {
        return promotion;
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

    /** Retour du 05/11 : net a payer imprime (vente depot : non par defaut). */
    public boolean net() {
        return net;
    }

    /** Retour du 05/11 : marge de chaque cote du rouleau, en millimetres. */
    public int marge() {
        return marge;
    }

    /** Retour du 10/11 : decalage du debut d'impression, en millimetres (negatif : vers la gauche). */
    public double debut() {
        return debut;
    }

    /** Debut d'impression borne et arrondi au pas de 0,5 mm ; une valeur illisible vaut 0. */
    public static double debutValide(double mm) {
        if (Double.isNaN(mm) || Double.isInfinite(mm)) {
            return 0;
        }
        double borne = Math.max(DEBUT_MIN, Math.min(DEBUT_MAX, mm));
        return Math.round(borne / DEBUT_PAS) * DEBUT_PAS;
    }

    /** Retour du 03/11 : police du nouveau modele, l'une de {@link #POLICES}. */
    public String police() {
        return police;
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
        return new JSONObject().put("ticket", ticket.name()).put("version", version).put("modele", modele)
                .put("remise", remise).put("promotion", promotion).put("lot", lot).put("ccRc", ccRc)
                .put("recapitulatif", recapitulatif).put("commentaires", commentaires)
                .put("encoursCarnet", encoursCarnet).put("signatureClient", signatureClient)
                .put("signatures", signatures).put("cadreNet", cadreNet).put("net", net).put("marge", marge)
                .put("debut", debut).put("police", police).put("disposition", d);
    }

    /**
     * Reglages lus d'un JSON (base, ecran ou fichier importe) ; une valeur absente garde le defaut de SA version : un
     * JSON sans numero de version est un reglage enregistre avant le retour du 05/11.
     */
    public static ReglagesTicket depuis(ModeleTicket ticket, JSONObject j) {
        if (j == null) {
            return new ReglagesTicket(ticket);
        }
        ReglagesTicket r = new ReglagesTicket(ticket, Math.max(1, Math.min(VERSION, j.optInt("version", 1))));
        String m = j.optString("modele", r.modele);
        r.modele = ANCIEN.equals(m) || !ticket.nouveauDisponible() ? ANCIEN : NOUVEAU;
        r.remise = j.optBoolean("remise", r.remise);
        r.promotion = j.optBoolean("promotion", r.promotion);
        r.lot = j.optBoolean("lot", r.lot);
        r.ccRc = j.optBoolean("ccRc", r.ccRc);
        r.recapitulatif = j.optBoolean("recapitulatif", r.recapitulatif);
        r.commentaires = j.optBoolean("commentaires", r.commentaires);
        r.encoursCarnet = j.optBoolean("encoursCarnet", r.encoursCarnet);
        r.signatureClient = j.optBoolean("signatureClient", r.signatureClient);
        r.signatures = j.optBoolean("signatures", r.signatures);
        r.cadreNet = j.optBoolean("cadreNet", r.cadreNet);
        r.net = j.optBoolean("net", r.net);
        r.marge = Math.max(0, Math.min(MARGE_MAX, j.optInt("marge", r.marge)));
        r.debut = debutValide(j.optDouble("debut", r.debut));
        String police = j.optString("police", r.police);
        r.police = POLICES.contains(police) ? police : r.police;
        JSONArray d = j.optJSONArray("disposition");
        if (d != null) {
            r.disposition = new ArrayList<>();
            for (int i = 0; i < d.length(); i++) {
                JSONObject p = d.optJSONObject(i);
                if (p != null && !p.optString("bloc", "").isEmpty()) {
                    r.disposition.add(Position.depuis(p));
                }
            }
        }
        return r;
    }

    /**
     * Retour du 05/11 : ces reglages, avec les reglages communs de {@code source} (police, marge, blocs de
     * {@link #BLOCS_COMMUNS}). Un bloc commun deja place garde sa place ; sinon sa position s'insere devant le premier
     * bloc qui le suit dans l'ordre du modele : l'ordre du ticket ne change pas.
     */
    public ReglagesTicket avecCommuns(ReglagesTicket source) {
        JSONObject j = json().put("police", source.police).put("marge", source.marge).put("debut", source.debut);
        List<Position> d = new ArrayList<>(disposition);
        for (String bloc : BLOCS_COMMUNS) {
            Position p = source.position(bloc);
            int i = indexDe(d, bloc);
            if (p == null) {
                if (i >= 0) {
                    d.set(i, new Position(bloc, "", 0));
                }
                continue;
            }
            if (i >= 0) {
                d.set(i, p);
                continue;
            }
            int rang = TicketDocument.ORDRE.indexOf(bloc);
            int k = 0;
            while (!TicketDocument.PIED.equals(bloc) && k < d.size()
                    && TicketDocument.ORDRE.indexOf(d.get(k).bloc) < rang) {
                k++;
            }
            if (TicketDocument.PIED.equals(bloc)) {
                // le pied reste le dernier
                k = d.size();
            }
            d.add(k, p);
        }
        JSONArray a = new JSONArray();
        d.forEach(x -> a.put(x.json()));
        return depuis(ticket, j.put("disposition", a));
    }

    private static int indexDe(List<Position> d, String bloc) {
        for (int i = 0; i < d.size(); i++) {
            if (d.get(i).bloc.equals(bloc)) {
                return i;
            }
        }
        return -1;
    }
}
