package rest.service.ticket;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Contenu d'un ticket du nouveau modele, en blocs nommes : c'est ce que le rendu dessine, a l'impression comme dans
 * l'apercu du menu « Modeles de ticket ». Un bloc se deplace d'un seul tenant ; seul le pied est fixe (le nom de
 * l'officine se deplace et se regle comme les autres blocs depuis le retour du 02/11).
 */
public final class TicketDocument {

    public static final String ENTETE = "ENTETE";
    /** Retour du 05/11 : le nom du pharmacien, l'adresse et le commentaire de l'en-tete sont trois blocs. */
    public static final String PHARMACIEN = "PHARMACIEN";
    public static final String COORDONNEES = "COORDONNEES";
    public static final String MESSAGE = "MESSAGE";
    public static final String TITRE = "TITRE";
    public static final String INTERVENANTS = "INTERVENANTS";
    public static final String CLIENT = "CLIENT";
    public static final String CORPS = "CORPS";
    public static final String RECAP = "RECAP";
    public static final String TOTAUX = "TOTAUX";
    public static final String NET = "NET";
    public static final String REGLEMENT = "REGLEMENT";
    public static final String MENTIONS = "MENTIONS";
    public static final String COMMENTAIRE = "COMMENTAIRE";
    public static final String SIGNATURES = "SIGNATURES";
    /** Retour du 06/11 : la date du ticket, a part du code-barres (taille et alignement propres). */
    public static final String DATE = "DATE";
    public static final String PIED = "PIED";

    /** Ordre du modele ; le pied reste dernier. */
    public static final List<String> ORDRE = Collections
            .unmodifiableList(Arrays.asList(ENTETE, PHARMACIEN, COORDONNEES, MESSAGE, TITRE, INTERVENANTS, CLIENT,
                    CORPS, RECAP, TOTAUX, NET, REGLEMENT, MENTIONS, COMMENTAIRE, SIGNATURES, DATE, PIED));
    public static final List<String> FIXES = Collections.unmodifiableList(Arrays.asList(PIED));

    private static final Map<String, String> LIBELLES = new LinkedHashMap<>();

    static {
        LIBELLES.put(ENTETE, "Nom de l'officine");
        LIBELLES.put(PHARMACIEN, "Nom du pharmacien");
        LIBELLES.put(COORDONNEES, "Adresse et téléphones");
        LIBELLES.put(MESSAGE, "Commentaire de l'en-tête");
        LIBELLES.put(TITRE, "Numéro du ticket");
        LIBELLES.put(INTERVENANTS, "Caisse et vendeur");
        LIBELLES.put(CLIENT, "Client / organisme");
        LIBELLES.put(CORPS, "Articles / détail");
        LIBELLES.put(RECAP, "Lignes · articles");
        LIBELLES.put(TOTAUX, "Total et remise");
        LIBELLES.put(NET, "Net à payer");
        LIBELLES.put(REGLEMENT, "Règlement");
        LIBELLES.put(MENTIONS, "Mentions (acompte, reste…)");
        LIBELLES.put(COMMENTAIRE, "Commentaire du bas");
        LIBELLES.put(SIGNATURES, "Signatures");
        LIBELLES.put(DATE, "Date du ticket");
        LIBELLES.put(PIED, "Code-barres");
    }

    public static String libelle(String bloc) {
        return LIBELLES.getOrDefault(bloc, bloc);
    }

    /**
     * Retour du 03/11 : une partie d'un texte ou d'une paire en gras (taux du tiers-payant, montant du credit). Les
     * marques ne s'impriment pas ; le rendu change de police entre elles. Caracteres a usage prive : trim() ne les
     * retire pas, aucun texte de Prestige ne les contient.
     */
    public static final char GRAS_DEBUT = '';
    public static final char GRAS_FIN = '';

    public static String gras(String t) {
        return t == null || t.isEmpty() ? "" : GRAS_DEBUT + t + GRAS_FIN;
    }

    public enum Style {
        NORMAL, GRAS, PETIT, NOM, GRAND, NUMERO,
        /** Retour du 05/11 : titre de section (« VENTE ASSURANCE », « CAISSIER : ») : gras, taille reglable a part. */
        SECTION
    }

    public enum Genre {
        TEXTE, PAIRE, ARTICLE, ENCADRE, TRAIT, TRAIT_PLEIN, SIGNATURES, PIED, TABLE,
        /** Retour du 05/11 : trait plein et fin, au-dessus du numero du ticket. */
        TRAIT_FIN
    }

    /** Une ligne logique du ticket ; le rendu la coupe a la largeur du papier si besoin. */
    public static final class Element {
        public final Genre genre;
        public final Style style;
        /** TEXTE : le texte ; PAIRE / ENCADRE : la gauche ; ARTICLE : la designation ; PIED : l'image. */
        public final String a;
        /** PAIRE / ENCADRE : la droite ; ARTICLE : « quantite × prix » ; PIED : la reference. */
        public final String b;
        /** ARTICLE : le lot ; PIED : la date ; TABLE : la troisieme colonne. */
        public final String c;
        /** ARTICLE : le montant ; PIED : « QR » pour un QR code ; TABLE : la quatrieme colonne. */
        public final String d;
        /** SIGNATURES : les libelles. */
        public final List<String> libelles;

        Element(Genre genre, Style style, String a, String b, String c, String d, List<String> libelles) {
            this.genre = genre;
            this.style = style == null ? Style.NORMAL : style;
            this.a = a == null ? "" : a;
            this.b = b == null ? "" : b;
            this.c = c == null ? "" : c;
            this.d = d == null ? "" : d;
            this.libelles = libelles == null ? Collections.emptyList() : libelles;
        }

        @Override
        public String toString() {
            return (genre + "[" + a + (b.isEmpty() ? "" : " | " + b) + (c.isEmpty() ? "" : " | " + c)
                    + (d.isEmpty() ? "" : " | " + d) + "]").replace(String.valueOf(GRAS_DEBUT), "**")
                            .replace(String.valueOf(GRAS_FIN), "**");
        }
    }

    public static final class Bloc {
        public final String id;
        public final List<Element> elements = new ArrayList<>();
        /** Alignement par defaut des textes du bloc : G, C ou D. */
        public final String alignement;

        Bloc(String id, String alignement) {
            this.id = id;
            this.alignement = alignement;
        }

        public Bloc texte(String t, Style s) {
            if (t != null && !t.trim().isEmpty()) {
                elements.add(new Element(Genre.TEXTE, s, t.trim(), null, null, null, null));
            }
            return this;
        }

        public Bloc paire(String g, String d, Style s) {
            elements.add(new Element(Genre.PAIRE, s, g, d, null, null, null));
            return this;
        }

        public Bloc article(String designation, String detail, String lot, String montant) {
            elements.add(new Element(Genre.ARTICLE, Style.NORMAL, designation, detail, lot, montant, null));
            return this;
        }

        public Bloc encadre(String g, String d, Style s) {
            elements.add(new Element(Genre.ENCADRE, s, g, d, null, null, null));
            return this;
        }

        /** Retour du 05/11 : trait plein et fin. */
        public Bloc traitFin() {
            elements.add(new Element(Genre.TRAIT_FIN, Style.NORMAL, null, null, null, null, null));
            return this;
        }

        public Bloc trait(boolean plein) {
            elements.add(
                    new Element(plein ? Genre.TRAIT_PLEIN : Genre.TRAIT, Style.NORMAL, null, null, null, null, null));
            return this;
        }

        public Bloc signatures(List<String> libelles) {
            elements.add(new Element(Genre.SIGNATURES, Style.PETIT, null, null, null, null, libelles));
            return this;
        }

        public Bloc pied(String image, String reference, String date, boolean qr) {
            elements.add(new Element(Genre.PIED, Style.PETIT, image, reference, date, qr ? "QR" : "", null));
            return this;
        }

        public Bloc table(String c1, String c2, String c3, Style s) {
            elements.add(new Element(Genre.TABLE, s, c1, c2, c3, null, null));
            return this;
        }

        public boolean vide() {
            return elements.isEmpty();
        }
    }

    private final ModeleTicket ticket;
    private final Map<String, Bloc> blocs = new LinkedHashMap<>();

    public TicketDocument(ModeleTicket ticket) {
        this.ticket = ticket;
    }

    public ModeleTicket ticket() {
        return ticket;
    }

    /** Le bloc, cree au besoin avec l'alignement du modele. */
    public Bloc bloc(String id) {
        return blocs.computeIfAbsent(id, k -> new Bloc(k, alignementModele(k)));
    }

    /** Le bloc, cree au besoin avec l'alignement donne (prevente : titre centre). */
    public Bloc bloc(String id, String alignement) {
        return blocs.computeIfAbsent(id, k -> new Bloc(k, alignement));
    }

    public Bloc existant(String id) {
        return blocs.get(id);
    }

    public List<Bloc> blocsNonVides() {
        List<Bloc> l = new ArrayList<>();
        blocs.values().forEach(b -> {
            if (!b.vide()) {
                l.add(b);
            }
        });
        return l;
    }

    static String alignementModele(String bloc) {
        switch (bloc) {
        case ENTETE:
        case PHARMACIEN:
        case COORDONNEES:
        case MESSAGE:
        case COMMENTAIRE:
            return "C";
        default:
            return "G";
        }
    }
}
