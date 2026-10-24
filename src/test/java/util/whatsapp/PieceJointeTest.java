package util.whatsapp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/** Piece jointe d'un message WhatsApp (campagnes) : controle a l'entree, corps envoye au service WhatsApp Web. */
class PieceJointeTest {

    private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0 };
    private static final byte[] JPEG = { (byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 0, 0 };
    private static final byte[] PDF = "%PDF-1.4\n%%EOF\n".getBytes(StandardCharsets.ISO_8859_1);

    private static JSONObject recu(byte[] b, String nom) {
        return new JSONObject().put("base64", Base64.getEncoder().encodeToString(b)).put("nomFichier", nom);
    }

    @Test
    void absenteOuVide() {
        assertNull(PieceJointe.lire(null).piece);
        assertNull(PieceJointe.lire(null).refus);
        assertNull(PieceJointe.lire(new JSONObject()).refus, "aucune piece : pas un refus");
        assertEquals("Pièce jointe vide.", PieceJointe.lire(new JSONObject().put("base64", "")).refus);
    }

    @Test
    void typesReconnusASignature() {
        PieceJointe p = PieceJointe.lire(recu(PNG, "visuel.png")).piece;
        assertEquals("image", p.type);
        assertEquals("image/png", p.mimeType);
        assertEquals("visuel.png", p.nomFichier);
        assertEquals("image/jpeg", PieceJointe.lire(recu(JPEG, "photo.jpg")).piece.mimeType);
        PieceJointe d = PieceJointe.lire(recu(PDF, "promo.pdf")).piece;
        assertEquals("document", d.type);
        assertEquals("application/pdf", d.mimeType);
    }

    @Test
    void refus() {
        assertTrue(PieceJointe.lire(recu("bonjour".getBytes(StandardCharsets.UTF_8), "x.png")).refus
                .contains("image JPEG, PNG ou un document PDF"));
        assertTrue(PieceJointe.lire(new JSONObject().put("base64", "%%%pas du base64%%%")).refus.contains("illisible"));
        byte[] gros = new byte[PieceJointe.MAX_OCTETS + 1];
        System.arraycopy(PDF, 0, gros, 0, PDF.length);
        assertTrue(PieceJointe.lire(recu(gros, "lourd.pdf")).refus.contains("5 Mo"));
    }

    @Test
    void nomNettoyeEtParDefaut() {
        assertEquals("_.._etc_passwd.pdf", PieceJointe.lire(recu(PDF, "/../etc/passwd.pdf")).piece.nomFichier);
        assertEquals("document.pdf", PieceJointe.lire(recu(PDF, null)).piece.nomFichier);
        assertEquals("image.png", PieceJointe.lire(recu(PNG, "")).piece.nomFichier);
    }

    @Test
    void corpsPourLeServiceWhatsAppWeb() {
        PieceJointe p = PieceJointe.lire(recu(PDF, "promo.pdf")).piece;
        JSONObject m = p.media();
        assertEquals("document", m.getString("type"));
        assertEquals("promo.pdf", m.getString("nomFichier"));
        assertEquals(Base64.getEncoder().encodeToString(PDF), m.getString("base64"));
    }

    @Test
    void canalSansPieceJointe() {
        assertNull(PieceJointe.refusCanal("WHATSAPP", "WEB"));
        assertTrue(PieceJointe.refusCanal("SMS", "WEB").contains("WhatsApp"));
        assertTrue(PieceJointe.refusCanal("WHATSAPP", "API").contains("WhatsApp Web"));
        assertNull(PieceJointe.refusCanal("SMS_WHATSAPP", "WEB"),
                "WhatsApp avec repli SMS : la piece part par WhatsApp");
    }
}
