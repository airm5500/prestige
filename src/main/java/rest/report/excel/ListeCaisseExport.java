package rest.report.excel;

import commonTasks.dto.SumCaisseDTO;
import commonTasks.dto.VenteReglementDTO;
import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import rest.service.v2.dto.VisualisationCaisseDTO;

/**
 * Plan du 19/11, point 15 : export CSV et Excel de « Liste de caisse » et de « Visualiser la caisse ». L'export montre
 * l'ecran, mais en entier et non la seule page affichee :
 * <ul>
 * <li>une ligne par mouvement, dans l'ordre de l'ecran, avec ses colonnes (type de mouvement tel qu'affiche, reference,
 * operateur, client, date, heure, montant) et le detail des reglements (ligne depliee de l'ecran) ;</li>
 * <li>puis les totaux par mode de reglement de la barre du bas de l'ecran, dans le meme ordre.</li>
 * </ul>
 */
public final class ListeCaisseExport {

    public static final String MOUVEMENT = "Mouvement";
    public static final String TOTAL = "Total";

    /* libelles de l'ecran (correctifs-affichage.js, PrestigeLibelleVente) : la colonne montre COMPTANT / ASSURANCE */
    private static final Map<String, String> TYPES = new LinkedHashMap<>();
    private static final Pattern VNO = Pattern.compile("\\bVNO\\b");
    private static final Pattern VO = Pattern.compile("\\bVO\\b");

    static {
        TYPES.put("VNO", "COMPTANT");
        TYPES.put("VO", "ASSURANCE");
        TYPES.put("ventes N.O.", "Ventes comptant");
        TYPES.put("ventes ordonnancees", "Ventes assurance");
    }

    private ListeCaisseExport() {
    }

    /** Une ligne : nature (mouvement ou total), colonnes de l'ecran, detail des reglements. */
    public static final class Ligne {
        public final String nature;
        public final String type;
        public final String reference;
        public final String operateur;
        public final String client;
        public final String date;
        public final String heure;
        public final long montant;
        public final String reglements;

        Ligne(String nature, String type, String reference, String operateur, String client, String date, String heure,
                long montant, String reglements) {
            this.nature = nature;
            this.type = type;
            this.reference = reference;
            this.operateur = operateur;
            this.client = client;
            this.date = date;
            this.heure = heure;
            this.montant = montant;
            this.reglements = reglements;
        }
    }

    /** Le type de mouvement tel que la colonne de l'ecran l'affiche. */
    public static String libelleAffiche(String valeur) {
        if (valeur == null) {
            return "";
        }
        String v = valeur.trim();
        if (TYPES.containsKey(v)) {
            return TYPES.get(v);
        }
        return VO.matcher(VNO.matcher(v).replaceAll("COMPTANT")).replaceAll("ASSURANCE");
    }

    /** Detail des reglements d'un mouvement, dans l'ordre de la ligne depliee de l'ecran (le dernier en premier). */
    public static String reglements(List<VenteReglementDTO> reglements) {
        if (reglements == null || reglements.isEmpty()) {
            return "";
        }
        StringBuilder s = new StringBuilder();
        for (int i = reglements.size() - 1; i >= 0; i--) {
            VenteReglementDTO r = reglements.get(i);
            if (s.length() > 0) {
                s.append(" | ");
            }
            s.append(r.getTypeReglement() == null ? "" : r.getTypeReglement()).append(" : ").append(r.getMontant());
        }
        return s.toString();
    }

    private static String t(String v) {
        return v == null ? "" : v;
    }

    /** Lignes de l'export : les mouvements, puis les totaux par mode de reglement. */
    public static List<Ligne> lignes(List<VisualisationCaisseDTO> mouvements, List<SumCaisseDTO> totaux) {
        List<Ligne> l = new ArrayList<>();
        if (mouvements != null) {
            for (VisualisationCaisseDTO m : mouvements) {
                l.add(new Ligne(MOUVEMENT, libelleAffiche(m.getTypeMouvement()), t(m.getReference()),
                        t(m.getOperateur()), t(m.getClient()), t(m.getTaskDate()), t(m.getTaskHeure()), m.getMontant(),
                        reglements(m.getReglements())));
            }
        }
        if (totaux != null) {
            for (SumCaisseDTO s : totaux) {
                l.add(new Ligne(TOTAL, t(s.getModeReglement()), "", "", "", "", "", s.getAmount(), ""));
            }
        }
        return l;
    }

    public static byte[] excel(List<Ligne> lignes, String titre, List<String> criteres) throws IOException {
        ClasseurExcel<Ligne> c = new ClasseurExcel<Ligne>(titre.length() > 31 ? titre.substring(0, 31) : titre)
                .titre(titre.toUpperCase());
        criteres.forEach(c::critere);
        return c.texte("Ligne", x -> x.nature).texte("Type mouvement", x -> x.type).texte("Référence", x -> x.reference)
                .texte("Opérateur", x -> x.operateur).texte("Client", x -> x.client).texte("Date", x -> x.date)
                .texte("Heure", x -> x.heure).nombre("Montant", x -> x.montant).texte("Règlements", x -> x.reglements)
                .construire(lignes);
    }

    /** CSV pour un tableur : separateur « ; », UTF-8 avec BOM, montants entiers sans separateur de milliers. */
    public static byte[] csv(List<Ligne> lignes) throws IOException {
        StringWriter w = new StringWriter();
        try (CSVPrinter p = new CSVPrinter(w, CSVFormat.EXCEL.withDelimiter(';'))) {
            p.printRecord("Ligne", "Type mouvement", "Référence", "Opérateur", "Client", "Date", "Heure", "Montant",
                    "Règlements");
            for (Ligne x : lignes) {
                p.printRecord(x.nature, x.type, x.reference, x.operateur, x.client, x.date, x.heure, x.montant,
                        x.reglements);
            }
        }
        byte[] corps = w.toString().getBytes(StandardCharsets.UTF_8);
        byte[] r = new byte[corps.length + 3];
        r[0] = (byte) 0xEF;
        r[1] = (byte) 0xBB;
        r[2] = (byte) 0xBF;
        System.arraycopy(corps, 0, r, 3, corps.length);
        return r;
    }
}
