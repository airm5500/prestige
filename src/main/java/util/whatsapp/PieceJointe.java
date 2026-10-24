package util.whatsapp;

import java.util.Base64;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;

/**
 * Piece jointe d'un message WhatsApp (image JPEG ou PNG, document PDF), envoyee par le service WhatsApp Web (le texte
 * du message sert de legende). Reconnue a sa signature, pas a son extension. 5 Mo au plus : la piece d'une campagne est
 * gardee en base, et un paquet MariaDB est limite a 16 Mo par defaut. L'API officielle de Meta demande un envoi
 * prealable du fichier chez Meta : les pieces jointes passent par WhatsApp Web seulement.
 */
public final class PieceJointe {

    public static final int MAX_OCTETS = 5 * 1024 * 1024;

    public final String type;
    public final String mimeType;
    public final String nomFichier;
    public final byte[] donnees;

    public PieceJointe(String type, String mimeType, String nomFichier, byte[] donnees) {
        this.type = type;
        this.mimeType = mimeType;
        this.nomFichier = nomFichier;
        this.donnees = donnees;
    }

    /** Resultat de la lecture : piece (ou null s'il n'y en a pas), ou motif du refus. */
    public static final class Lecture {
        public final PieceJointe piece;
        public final String refus;

        private Lecture(PieceJointe piece, String refus) {
            this.piece = piece;
            this.refus = refus;
        }
    }

    /** Piece recue de l'ecran : {@code {base64, nomFichier}} ; absente ({@code null} ou sans base64) : aucune piece. */
    public static Lecture lire(JSONObject recu) {
        if (recu == null || !recu.has("base64")) {
            return new Lecture(null, null);
        }
        byte[] b;
        try {
            b = Base64.getDecoder().decode(StringUtils.deleteWhitespace(recu.optString("base64")));
        } catch (IllegalArgumentException e) {
            return new Lecture(null, "Pièce jointe illisible.");
        }
        if (b.length == 0) {
            return new Lecture(null, "Pièce jointe vide.");
        }
        if (b.length > MAX_OCTETS) {
            return new Lecture(null, "Pièce jointe trop lourde (5 Mo au plus).");
        }
        String type;
        String mime;
        if (commence(b, 0x89, 'P', 'N', 'G')) {
            type = "image";
            mime = "image/png";
        } else if (commence(b, 0xff, 0xd8, 0xff)) {
            type = "image";
            mime = "image/jpeg";
        } else if (commence(b, '%', 'P', 'D', 'F', '-')) {
            type = "document";
            mime = "application/pdf";
        } else {
            return new Lecture(null, "La pièce jointe doit être une image JPEG, PNG ou un document PDF.");
        }
        String nom = StringUtils.left(StringUtils.defaultString(recu.optString("nomFichier", null))
                .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim(), 120);
        if (nom.isEmpty()) {
            nom = "document".equals(type) ? "document.pdf" : ("image/png".equals(mime) ? "image.png" : "image.jpg");
        }
        return new Lecture(new PieceJointe(type, mime, nom, b), null);
    }

    /** Motif pour lequel la piece ne peut pas partir par ce canal (SMS) ou ce compte (API de Meta) ; null sinon. */
    public static String refusCanal(String canal, String modeWhatsApp) {
        if (!StringUtils.containsIgnoreCase(StringUtils.defaultString(canal), "WHATSAPP")) {
            return "Une pièce jointe ne part que par WhatsApp : choisissez le canal WhatsApp.";
        }
        if (!WhatsAppCompte.WEB.equalsIgnoreCase(StringUtils.defaultString(modeWhatsApp))) {
            return "Les pièces jointes partent par WhatsApp Web seulement : réglez le mode WhatsApp sur Web"
                    + " (Paramétrage WhatsApp).";
        }
        return null;
    }

    /** Corps {@code media} attendu par le service WhatsApp Web ({@code POST /messages}). */
    public JSONObject media() {
        return new JSONObject().put("type", type).put("base64", Base64.getEncoder().encodeToString(donnees))
                .put("mimeType", mimeType).put("nomFichier", nomFichier);
    }

    private static boolean commence(byte[] b, int... signature) {
        if (b.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((b[i] & 0xff) != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
