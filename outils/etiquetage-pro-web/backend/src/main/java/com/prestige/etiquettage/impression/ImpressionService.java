package com.prestige.etiquettage.impression;

import com.prestige.etiquettage.catalogue.Produit;
import com.prestige.etiquettage.catalogue.Produits;
import com.prestige.etiquettage.web.Refus;
import etiquetagepro.LigneEtiquette;
import etiquetagepro.MoteurEtiquettes;
import etiquetagepro.OptionsImpression;
import etiquetagepro.Zone;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.UnaryOperator;
import org.springframework.stereotype.Service;
import rest.report.pdf.LabelSheetPdf;

/**
 * Impression des etiquettes du catalogue avec le moteur d'Etiquettage Pro (memes planches, memes dessins que Prestige) :
 * produits coches, nombre d'etiquettes par produit, type de code, planche, case de depart, date imprimee ; page de test
 * pour caler l'imprimante. Les reglages (pharmacie, monnaie, planche, calage) sont gardes en base.
 */
@Service
public class ImpressionService {

    public static final int MAX_PRODUITS = 20000;
    /** Reglages : nom expose -> cle du moteur (planche et calage), avec bornes. */
    record Borne(String cle, double min, double max, boolean entier) {
    }

    static final Map<String, Borne> PLANCHE = new LinkedHashMap<>();
    static {
        PLANCHE.put("colonnes", new Borne(LabelSheetPdf.KEY_NB_COLONNES, 1, 20, true));
        PLANCHE.put("lignes", new Borne(LabelSheetPdf.KEY_NB_LIGNES, 1, 40, true));
        PLANCHE.put("largeur", new Borne(LabelSheetPdf.KEY_LARGEUR_MM, 10, 210, false));
        PLANCHE.put("hauteur", new Borne(LabelSheetPdf.KEY_HAUTEUR_MM, 5, 297, false));
        PLANCHE.put("espaceH", new Borne(LabelSheetPdf.KEY_ESPACE_H_MM, 0, 50, false));
        PLANCHE.put("espaceV", new Borne(LabelSheetPdf.KEY_ESPACE_V_MM, 0, 50, false));
        PLANCHE.put("margeGauche", new Borne(LabelSheetPdf.KEY_MARGE_GAUCHE_MM, 0, 100, false));
        PLANCHE.put("margeHaut", new Borne(LabelSheetPdf.KEY_MARGE_HAUT_MM, 0, 100, false));
        PLANCHE.put("decalageX", new Borne(LabelSheetPdf.KEY_DECALAGE_X_MM, -20, 20, false));
        PLANCHE.put("decalageY", new Borne(LabelSheetPdf.KEY_DECALAGE_Y_MM, -20, 20, false));
        PLANCHE.put("echelle", new Borne(LabelSheetPdf.KEY_ECHELLE_POURCENT, 50, 150, false));
    }
    public static final List<String> MODELES = List.of(LabelSheetPdf.MODELE_CARRE_38X21_2,
            LabelSheetPdf.MODELE_ARRONDI_38X21, LabelSheetPdf.MODELE_CARRE_38_1X21_2, LabelSheetPdf.MODELE_PERSONNALISE);
    public static final List<String> CODES = List.of(LabelSheetPdf.CODE_BARRES, LabelSheetPdf.QR,
            LabelSheetPdf.DATAMATRIX, LabelSheetPdf.QR_PLUS, LabelSheetPdf.DATAMATRIX_PLUS);

    private final Produits produits;
    private final Reglages reglages;
    private final RegistreBase registre;
    private final Dispositions dispositions;

    public ImpressionService(Produits produits, Reglages reglages, RegistreBase registre, Dispositions dispositions) {
        this.produits = produits;
        this.reglages = reglages;
        this.registre = registre;
        this.dispositions = dispositions;
    }

    /* ------------------------------------------------------------ reglages */

    public Map<String, Object> reglages() {
        Map<String, String> r = reglages.tous();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("officine", r.getOrDefault("officine", ""));
        m.put("monnaie", r.getOrDefault("monnaie", "CFA"));
        m.put("code", r.getOrDefault("code", LabelSheetPdf.CODE_BARRES));
        m.put("modele", r.getOrDefault("modele", LabelSheetPdf.MODELE_CARRE_38X21_2));
        Map<String, String> planche = new LinkedHashMap<>();
        PLANCHE.forEach((nom, b) -> planche.put(nom, r.get(b.cle())));
        m.put("planche", planche);
        m.put("modeles", MODELES);
        m.put("codes", CODES);
        return m;
    }

    private static String texte(String v, int max, String libelle) {
        String s = v == null ? "" : v.strip().replaceAll("\\s+", " ");
        if (s.length() > max) {
            throw Refus.requete(libelle + " : " + max + " caractères au plus.");
        }
        if (s.codePoints().anyMatch(Character::isISOControl)) {
            throw Refus.requete(libelle + " : caractère de contrôle non autorisé.");
        }
        return s;
    }

    /** Valeurs de planche controlees (nom expose -> valeur), vides retirees ; refus avec le champ fautif. */
    static Map<String, String> plancheValide(Map<String, String> planche) {
        Map<String, String> r = new LinkedHashMap<>();
        Map<String, String> erreurs = new LinkedHashMap<>();
        if (planche != null) {
            for (Map.Entry<String, String> e : planche.entrySet()) {
                Borne b = PLANCHE.get(e.getKey());
                if (b == null) {
                    erreurs.put(e.getKey(), "Réglage inconnu.");
                    continue;
                }
                String v = e.getValue() == null ? "" : e.getValue().strip().replace(',', '.');
                if (v.isEmpty()) {
                    continue;
                }
                try {
                    double d = Double.parseDouble(v);
                    if (Double.isNaN(d) || d < b.min() || d > b.max() || (b.entier() && d != Math.rint(d))) {
                        throw new NumberFormatException();
                    }
                    r.put(e.getKey(), b.entier() ? Long.toString((long) d) : v);
                } catch (NumberFormatException x) {
                    erreurs.put(e.getKey(), (b.entier() ? "Nombre entier" : "Nombre") + " de "
                            + fmt(b.min()) + " à " + fmt(b.max()) + " attendu.");
                }
            }
        }
        if (!erreurs.isEmpty()) {
            throw new Refus(org.springframework.http.HttpStatus.BAD_REQUEST, "Réglages de planche invalides.", erreurs);
        }
        return r;
    }

    private static String fmt(double d) {
        return d == Math.rint(d) ? Long.toString((long) d) : Double.toString(d).replace('.', ',');
    }

    static String modeleValide(String m) {
        String v = m == null || m.isBlank() ? LabelSheetPdf.MODELE_CARRE_38X21_2 : m.strip().toUpperCase(Locale.ROOT);
        if (!MODELES.contains(v)) {
            throw Refus.requete("Planche inconnue : " + m + ".");
        }
        return v;
    }

    static String codeValide(String c) {
        String v = c == null || c.isBlank() ? LabelSheetPdf.CODE_BARRES : c.strip().toUpperCase(Locale.ROOT);
        if (!CODES.contains(v)) {
            throw Refus.requete("Type de code inconnu : " + c + ".");
        }
        return v;
    }

    public record NouveauxReglages(String officine, String monnaie, String code, String modele,
            Map<String, String> planche) {
    }

    public Map<String, Object> enregistrer(NouveauxReglages n) {
        String officine = texte(n.officine(), 60, "Nom de la pharmacie");
        String monnaie = texte(n.monnaie(), 8, "Monnaie");
        String code = codeValide(n.code());
        String modele = modeleValide(n.modele());
        Map<String, String> planche = plancheValide(n.planche());
        reglages.ecrire("officine", officine);
        /* monnaie vide permise (prix sans monnaie) : gardee comme un espace */
        reglages.ecrire("monnaie", monnaie.isEmpty() ? " " : monnaie);
        reglages.ecrire("code", code);
        reglages.ecrire("modele", modele);
        PLANCHE.forEach((nom, b) -> reglages.ecrire(b.cle(), planche.get(nom)));
        return reglages();
    }

    /* ------------------------------------------------------------ impression */

    /**
     * Demande d'impression : produits coches (dans l'ordre), nombre d'etiquettes par produit (sinon celui de la fiche),
     * type de code, planche, case de depart, date imprimee ; {@code planche} : calage pour cette impression seulement.
     */
    public record Demande(List<String> cips, Map<String, Integer> nombres, String code, String modele, Integer position,
            String date, Map<String, String> planche) {
    }

    /** Lecteur des reglages de planche : ceux de la demande, sinon ceux enregistres. */
    UnaryOperator<String> configuration(Map<String, String> planche) {
        Map<String, String> enregistres = reglages.tous();
        Map<String, String> demande = new LinkedHashMap<>();
        plancheValide(planche).forEach((nom, v) -> demande.put(PLANCHE.get(nom).cle(), v));
        return cle -> demande.containsKey(cle) ? demande.get(cle) : enregistres.get(cle);
    }

    OptionsImpression options(Demande d) {
        Map<String, String> r = reglages.tous();
        String monnaie = r.getOrDefault("monnaie", "CFA");
        String date = texte(d.date(), 20, "Date imprimée");
        int position = d.position() == null ? 1 : d.position();
        if (position < 1 || position > 999) {
            throw Refus.requete("Case de départ : de 1 au nombre de cases de la planche.");
        }
        return new OptionsImpression().typeCode(codeValide(d.code() == null ? r.get("code") : d.code()))
                .modele(modeleValide(d.modele() == null ? r.get("modele") : d.modele())).positionDepart(position)
                .officine(r.getOrDefault("officine", "")).monnaie(monnaie.strip()).dateParDefaut(date);
    }

    /** Lignes du moteur pour les produits demandes ; CIP introuvables rendus a part. */
    List<LigneEtiquette> lignes(Demande d, List<String> introuvables) {
        if (d.cips() == null || d.cips().isEmpty()) {
            throw Refus.requete("Cochez au moins un produit.");
        }
        Set<String> cips = new LinkedHashSet<>(d.cips());
        if (cips.size() > MAX_PRODUITS) {
            throw Refus.requete("Trop de produits en une fois (" + MAX_PRODUITS + " au plus).");
        }
        Map<String, Produit> trouves = produits.lire(cips);
        Set<Zone> obligatoires = EnumSet.of(Zone.CIP, Zone.DESIGNATION);
        List<LigneEtiquette> l = new ArrayList<>();
        int n = 0;
        for (String cip : cips) {
            Produit p = trouves.get(cip);
            if (p == null) {
                introuvables.add(cip);
                continue;
            }
            Map<String, String> v = p.valeurs();
            LigneEtiquette e = new LigneEtiquette(++n).valeur(Zone.CIP, cip).valeur(Zone.DESIGNATION, v.get("designation"))
                    .valeur(Zone.PRIX, v.get("prix")).valeur(Zone.EAN, v.get("ean"))
                    .valeur(Zone.GROSSISTE, v.get("grossiste")).valeur(Zone.LOT, v.get("lot"))
                    .valeur(Zone.PEREMPTION, v.get("peremption")).valeur(Zone.CODE_GEO, v.get("code_geo"))
                    .valeur(Zone.MENTION, v.get("mention"));
            Integer nb = d.nombres() == null ? null : d.nombres().get(cip);
            e.valeur(Zone.NOMBRE, nb != null ? nb.toString() : v.getOrDefault("nombre", "1"));
            l.add(e.valider(obligatoires));
        }
        return l;
    }

    /** Resume avant impression : etiquettes, pages, lignes non imprimees et alertes (lot perime...). */
    public Map<String, Object> resume(Demande d) {
        List<String> introuvables = new ArrayList<>();
        List<LigneEtiquette> l = lignes(d, introuvables);
        OptionsImpression o = options(d);
        LabelSheetPdf.SheetFormat f = o.planche(configuration(d.planche()));
        int total = MoteurEtiquettes.total(l);
        int parPage = f.perPage();
        if (o.getPositionDepart() > parPage) {
            throw Refus.requete("Case de départ : de 1 à " + parPage + " sur cette planche.");
        }
        List<Map<String, Object>> alertes = new ArrayList<>();
        for (LigneEtiquette e : l) {
            if (!e.getErreurs().isEmpty() || !e.getAvertissements().isEmpty()) {
                Map<String, Object> a = new LinkedHashMap<>();
                a.put("cip", e.valeur(Zone.CIP));
                a.put("designation", e.valeur(Zone.DESIGNATION));
                a.put("erreurs", e.getErreurs());
                a.put("avertissements", e.getAvertissements());
                alertes.add(a);
            }
        }
        float[] dim = LabelSheetPdf.dimension(f);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("produits", l.size());
        m.put("etiquettes", total);
        m.put("parPage", parPage);
        m.put("pages", total == 0 ? 0 : (o.getPositionDepart() - 1 + total + parPage - 1) / parPage);
        m.put("position", o.getPositionDepart());
        m.put("largeur", dim[0]);
        m.put("hauteur", dim[1]);
        m.put("introuvables", introuvables);
        m.put("alertes", alertes);
        return m;
    }

    public byte[] pdf(Demande d) {
        List<LigneEtiquette> l = lignes(d, new ArrayList<>());
        OptionsImpression o = options(d);
        UnaryOperator<String> conf = configuration(d.planche());
        if (o.getPositionDepart() > o.planche(conf).perPage()) {
            throw Refus.requete("Case de départ : de 1 à " + o.planche(conf).perPage() + " sur cette planche.");
        }
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        try {
            MoteurEtiquettes.pdf(sortie, l, o, registre, conf, dispositions::pour);
        } catch (IllegalArgumentException e) {
            throw Refus.requete(e.getMessage());
        } catch (Exception e) {
            throw new IllegalStateException("Impression impossible", e);
        }
        return sortie.toByteArray();
    }

    public byte[] pageDeTest(String modele, Map<String, String> planche) {
        /* reglages controles avant : un refus reste un 400 avec le champ fautif */
        OptionsImpression o = new OptionsImpression().modele(modeleValide(modele == null ? reglages.lire("modele") : modele));
        UnaryOperator<String> conf = configuration(planche);
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        try {
            MoteurEtiquettes.pageDeTest(sortie, o, conf);
        } catch (Exception e) {
            throw new IllegalStateException("Page de test impossible", e);
        }
        return sortie.toByteArray();
    }
}
