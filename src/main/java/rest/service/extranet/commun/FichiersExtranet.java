package rest.service.extranet.commun;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Fichiers des documents proposes par les extranets (demande du 09/11, point 4 : « on utilise juste ce qui y est
 * disponible »), releves le 09/11 en lecture seule. Chaque fichier est fabrique par le serveur de l'extranet et rendu a
 * un GET ; Prestige le recupere avec la session du connecteur et le renvoie tel quel (rien n'est garde, le contenu
 * n'est jamais journalise).
 * <ul>
 * <li>Ubipharm, factures non relevees : BLV en CSV, Excel, TXT (/BLVCSV, /BLVExcel, /BLVTxt ; fcnum, etcoda) ;</li>
 * <li>TEDIS, BL par quinzaine : TXT et CSV (/exportationsBlTxt, /exportationsBlQuizainecsv ; IDFACTURECLIENT) ;</li>
 * <li>DPCI, factures : CSV 9 colonnes et 2 colonnes (/module/geide/ExportDonnee.action ; dates AAAAMMJJ, type, nombre
 * de colonnes, numero de facture) ;</li>
 * <li>Copharmed, factures et avoirs : CSV et XLS (ViewPharmacy-DownloadInvoiceCSVXLS ; InvoiceNo, Type, Format).</li>
 * <li>Copharmed, releves : PDF (ViewPharmacy-DownloadStatementsPDF ; StatementNo, SpoolName, Year), releve du
 * 09/11.</li>
 * </ul>
 * Non proposes : les BL et releves DPCI (PDF seulement) et les avoirs DPCI (le bouton de l'extranet part sans type ni
 * nombre de colonnes).
 */
public final class FichiersExtranet {

    /** Reference de document acceptee : lettres, chiffres et separateurs simples, 40 caracteres au plus. */
    public static final Pattern REFERENCE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9_./-]{0,39}");
    /** Taille maximale d'un fichier rendu (les BL et factures relevees font quelques dizaines de Ko). */
    public static final int TAILLE_MAX = 20 * 1024 * 1024;
    private static final Pattern TITRE_NUMERO = Pattern.compile("^N° (BL|facture|document|avoir|relevé)$",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final String INTERSHOP = "/INTERSHOP/web/WFS/EASy-Copharmed-Site/fr_FR/-/XOF/";

    /** Un fichier propose pour une liste. */
    public static final class Fichier {
        public final SourceExtranet source;
        public final String liste;
        /** code du format (CSV, EXCEL, TXT, CSV_9, CSV_2) */
        public final String format;
        /** libelle affiche */
        public final String libelle;
        public final String chemin;
        public final String referer;
        public final String extension;
        public final String typeMime;
        /** prefixe du nom du fichier (grossiste et document) */
        public final String prefixe;
        public final boolean htmlAdmis;
        /** cles du document exigees */
        public final List<String> cles;
        private final Function<Map<String, String>, Map<String, String>> parametres;

        Fichier(SourceExtranet source, String liste, String format, String libelle, String chemin, String referer,
                String extension, String typeMime, String prefixe, boolean htmlAdmis, List<String> cles,
                Function<Map<String, String>, Map<String, String>> parametres) {
            this.source = source;
            this.liste = liste;
            this.format = format;
            this.libelle = libelle;
            this.chemin = chemin;
            this.referer = referer;
            this.extension = extension;
            this.typeMime = typeMime;
            this.prefixe = prefixe;
            this.htmlAdmis = htmlAdmis;
            this.cles = cles;
            this.parametres = parametres;
        }

        /**
         * Parametres de l'appel pour un document ; leve IllegalArgumentException si une reference manque ou n'a pas la
         * forme attendue (jamais d'appel avec une valeur venue d'ailleurs que de la ligne gardee).
         */
        public Map<String, String> parametres(Map<String, String> document) {
            if (document == null) {
                throw new IllegalArgumentException("Aucun fichier pour cette ligne");
            }
            for (String c : cles) {
                String v = document.get(c);
                if (v == null || !REFERENCE.matcher(v).matches()) {
                    throw new IllegalArgumentException("Référence du document absente ou illisible");
                }
            }
            return parametres.apply(document);
        }

        public TransportExtranet.Attendu attendu() {
            return htmlAdmis ? TransportExtranet.Attendu.FICHIER_HTML_ADMIS : TransportExtranet.Attendu.FICHIER;
        }

        /** Classeur xlsx (archive ZIP « PK ») : essai reel du 09/11, BLV Excel d'Ubipharm. */
        private static boolean zip(byte[] o) {
            return o != null && o.length >= 4 && o[0] == 0x50 && o[1] == 0x4B && o[2] == 0x03 && o[3] == 0x04;
        }

        /**
         * Extension rendue selon le fichier recu : pour un Excel, « xlsx » si classeur ZIP, « xls » sinon (classeur OLE
         * ou tableau HTML) ; l'extension declaree sinon, et quand rien n'a ete recu.
         */
        public String extension(byte[] octets) {
            if (!"EXCEL".equals(format) || octets == null) {
                return extension;
            }
            return zip(octets) ? "xlsx" : "xls";
        }

        /** Type rendu selon le fichier recu (meme regle que {@link #extension(byte[])}). */
        public String typeMime(byte[] octets) {
            if (!"EXCEL".equals(format) || octets == null) {
                return typeMime;
            }
            return zip(octets) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/vnd.ms-excel";
        }

        /** Nom rendu selon le fichier recu : extension de {@link #extension(byte[])}. */
        public String nom(String numero, byte[] octets) {
            String n = nom(numero);
            return n.substring(0, n.length() - extension.length()) + extension(octets);
        }

        /** Nom du fichier rendu : prefixe, numero du document, extension ; caracteres surs seulement. */
        public String nom(String numero) {
            String n = numero == null ? ""
                    : numero.trim().replaceAll("[^A-Za-z0-9._-]+", "-").replaceAll("\\.{2,}", ".");
            if (n.length() > 60) {
                n = n.substring(0, 60);
            }
            /* jamais de point ni de tiret en bord (« .. » avant l'extension, fichier cache) */
            n = n.replaceAll("^[-.]+|[-.]+$", "");
            return prefixe + (n.isEmpty() ? "" : "_" + n) + "." + extension;
        }
    }

    private static final List<Fichier> FICHIERS;
    static {
        List<Fichier> f = new ArrayList<>();
        /* Ubipharm : liens « Exporter le BLV au format CSV / Excel / TXT » de chaque facture non relevee */
        for (String[] x : new String[][] { { "CSV", "CSV", "/BLVCSV", "csv", "text/csv" },
                { "EXCEL", "Excel", "/BLVExcel", "xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
                { "TXT", "TXT", "/BLVTxt", "txt", "text/plain" } }) {
            f.add(new Fichier(SourceExtranet.UBIPHARM, "FACTURES", x[0], x[1], x[2], "/ListeFactures", x[3], x[4],
                    "Ubipharm_BLV", "EXCEL".equals(x[0]),
                    Collections.unmodifiableList(java.util.Arrays.asList("fcnum", "etcoda")),
                    d -> ordre("fcnum", d.get("fcnum"), "etcoda", d.get("etcoda"))));
        }
        /* TEDIS : boutons « TXT » et « CSV » du BL de quinzaine */
        f.add(new Fichier(SourceExtranet.TEDIS, "TEDIS_BL_QUINZAINE", "TXT", "TXT", "/exportationsBlTxt",
                "/blparquizaine", "txt", "text/plain", "TEDIS_BLV", false, Collections.singletonList("IDFACTURECLIENT"),
                d -> ordre("IDFACTURECLIENT", d.get("IDFACTURECLIENT"))));
        f.add(new Fichier(SourceExtranet.TEDIS, "TEDIS_BL_QUINZAINE", "CSV", "CSV", "/exportationsBlQuizainecsv",
                "/blparquizaine", "csv", "text/csv", "TEDIS_BLV", false, Collections.singletonList("IDFACTURECLIENT"),
                d -> ordre("IDFACTURECLIENT", d.get("IDFACTURECLIENT"))));
        /* DPCI : « Exporter en CSV » 9 colonnes (detail) et 2 colonnes des factures cochees */
        for (String n : new String[] { "9", "2" }) {
            f.add(new Fichier(SourceExtranet.DPCI, "DPCI_FACTURES", "CSV_" + n, "CSV " + n + " colonnes",
                    "/module/geide/ExportDonnee.action", "/geide", "csv", "text/csv", "DPCI_Facture_" + n + "col",
                    false, Collections.unmodifiableList(java.util.Arrays.asList("id", "date")), d -> {
                        String j = jour(d.get("date"));
                        return ordre("dateDebut", j, "dateFin", j, "typeDocument", "FACTURE", "nbColonnes", n,
                                "selectIdDocument", d.get("id"));
                    }));
        }
        /* Copharmed : icones CSV et XLS de chaque facture et de chaque avoir */
        for (String[] l : new String[][] { { "COPHARMED_FACTURES", "Invoices", "Copharmed_Facture" },
                { "COPHARMED_AVOIRS", "CreditNotes", "Copharmed_Avoir" } }) {
            for (String[] x : new String[][] { { "CSV", "CSV", "csv", "csv", "text/csv" },
                    { "EXCEL", "Excel", "xls", "xls", "application/vnd.ms-excel" } }) {
                f.add(new Fichier(SourceExtranet.COPHARMED, l[0], x[0], x[1],
                        INTERSHOP + "ViewPharmacy-DownloadInvoiceCSVXLS",
                        INTERSHOP + ("Invoices".equals(l[1]) ? "ViewPharmacy-Invoices" : "ViewPharmacy-CreditNotes"),
                        x[3], x[4], l[2], "EXCEL".equals(x[0]), Collections.singletonList("InvoiceNo"),
                        d -> ordre("InvoiceNo", d.get("InvoiceNo"), "Type", l[1], "Format", x[2])));
            }
        }
        /* Copharmed : icone PDF de chaque releve (Mon espace > Releves) */
        f.add(new Fichier(SourceExtranet.COPHARMED, "COPHARMED_RELEVES", "PDF", "PDF",
                INTERSHOP + "ViewPharmacy-DownloadStatementsPDF", INTERSHOP + "ViewPharmacy-Statements", "pdf",
                "application/pdf", "Copharmed_Releve", false,
                Collections.unmodifiableList(java.util.Arrays.asList("StatementNo", "SpoolName", "Year")),
                d -> ordre("StatementNo", d.get("StatementNo"), "SpoolName", d.get("SpoolName"), "Year",
                        d.get("Year"))));
        FICHIERS = Collections.unmodifiableList(f);
    }

    private FichiersExtranet() {
    }

    private static Map<String, String> ordre(String... kv) {
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put(kv[i], kv[i + 1]);
        }
        return m;
    }

    /** « 2026-11-07 » : « 20261107 » (format attendu par DPCI) ; refuse toute autre forme. */
    static String jour(String date) {
        try {
            return LocalDate.parse(date == null ? "" : date.trim()).format(DateTimeFormatter.BASIC_ISO_DATE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Date du document illisible");
        }
    }

    public static List<Fichier> tous() {
        return FICHIERS;
    }

    /** Fichiers proposes pour une liste (vide : liste sans fichier). */
    public static List<Fichier> de(SourceExtranet source, String liste) {
        List<Fichier> r = new ArrayList<>();
        for (Fichier f : FICHIERS) {
            if (f.source == source && f.liste.equals(liste)) {
                r.add(f);
            }
        }
        return r;
    }

    /** Fichier d'une liste par son format ; null si la liste ne le propose pas. */
    public static Fichier un(SourceExtranet source, String liste, String format) {
        for (Fichier f : de(source, liste)) {
            if (f.format.equalsIgnoreCase(format == null ? "" : format.trim())) {
                return f;
            }
        }
        return null;
    }

    /** Formats proposes pour une ligne : ceux de la liste dont la ligne porte toutes les references. */
    public static JSONArray formats(SourceExtranet source, String liste, Map<String, String> document) {
        return formats(source, liste, document, null);
    }

    /**
     * Formats proposes pour une ligne, avec le nom de fichier propose (« Enregistrer sous ») quand le numero du
     * document est connu.
     */
    public static JSONArray formats(SourceExtranet source, String liste, Map<String, String> document, String numero) {
        JSONArray a = new JSONArray();
        if (document == null) {
            return a;
        }
        for (Fichier f : de(source, liste)) {
            try {
                f.parametres(document);
                a.put(new JSONObject().put("format", f.format).put("libelle", f.libelle).put("nom", f.nom(numero)));
            } catch (IllegalArgumentException e) {
                /* reference absente : format non propose pour cette ligne */
            }
        }
        return a;
    }

    /** Index de la colonne du numero de document (N° BL, N° facture, N° document, N° avoir) ; -1 si aucune. */
    public static int colonneNumero(JSONArray titres) {
        for (int i = 0; titres != null && i < titres.length(); i++) {
            if (TITRE_NUMERO.matcher(titres.optString(i, "").trim()).matches()) {
                return i;
            }
        }
        return -1;
    }

    /** Document garde (texte JSON de la base) ; null si absent ou illisible. */
    public static Map<String, String> lireDocument(String json) {
        if (json == null || json.trim().isEmpty()) {
            return null;
        }
        try {
            JSONObject o = new JSONObject(json);
            Map<String, String> m = new LinkedHashMap<>();
            for (String k : o.keySet()) {
                m.put(k, o.optString(k, ""));
            }
            return m.isEmpty() ? null : m;
        } catch (org.json.JSONException e) {
            return null;
        }
    }

    /** Texte JSON d'un document a garder ; null si vide. */
    public static String ecrireDocument(Map<String, String> document) {
        return document == null || document.isEmpty() ? null : new JSONObject(document).toString();
    }

    /** Reference lue sur l'extranet, gardee seulement si elle a la forme attendue ; sinon null. */
    public static String reference(String v) {
        String s = v == null ? "" : v.trim();
        return REFERENCE.matcher(s).matches() ? s : null;
    }
}
