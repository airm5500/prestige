package rest.service.extranet.commun;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Reponse brute d'un extranet : octets d'origine, statut, type. Le corps n'est jamais journalise. */
public final class ReponseExtranet {

    private final int statut;
    private final String typeContenu;
    private final String location;
    private final byte[] corps;
    private final String chemin;

    public ReponseExtranet(int statut, String typeContenu, String location, byte[] corps, String chemin) {
        this.statut = statut;
        this.typeContenu = typeContenu == null ? "" : typeContenu;
        this.location = location;
        this.corps = corps == null ? new byte[0] : corps;
        this.chemin = chemin;
    }

    public int statut() {
        return statut;
    }

    public String typeContenu() {
        return typeContenu;
    }

    public String location() {
        return location;
    }

    public byte[] octets() {
        return corps.clone();
    }

    public int taille() {
        return corps.length;
    }

    /** Chemin appele, sans les parametres (pour les messages). */
    public String chemin() {
        return chemin;
    }

    public boolean typeJson() {
        String t = typeContenu.toLowerCase(Locale.ROOT);
        return t.contains("application/json") || t.contains("text/json") || t.contains("+json");
    }

    public boolean typeHtml() {
        return typeContenu.toLowerCase(Locale.ROOT).contains("text/html");
    }

    public boolean typePdf() {
        return typeContenu.toLowerCase(Locale.ROOT).contains("application/pdf");
    }

    /** Signature d'un fichier PDF (%PDF-), quel que soit le type annonce. */
    public boolean signaturePdf() {
        return corps.length >= 5 && corps[0] == '%' && corps[1] == 'P' && corps[2] == 'D' && corps[3] == 'F'
                && corps[4] == '-';
    }

    /** Premier caractere significatif du texte : '{' ou '[' pour du JSON. */
    public char premierCaractere() {
        String t = texte();
        for (int i = 0; i < t.length(); i++) {
            char c = t.charAt(i);
            if (c != '﻿' && !Character.isWhitespace(c)) {
                return c;
            }
        }
        return 0;
    }

    public String texte() {
        return new String(corps, jeu());
    }

    private Charset jeu() {
        String t = typeContenu.toLowerCase(Locale.ROOT);
        int i = t.indexOf("charset=");
        if (i >= 0) {
            String n = t.substring(i + 8).split("[;\\s]")[0].replace("\"", "");
            try {
                return Charset.forName(n);
            } catch (Exception e) {
                return StandardCharsets.UTF_8;
            }
        }
        return StandardCharsets.UTF_8;
    }
}
