package etiquetagepro.disposition;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.pdf.Symbole;

/**
 * Garde-fous de la personnalisation : le plus important est de pouvoir lire le code et les informations. Une
 * disposition n'est validee que sans probleme bloquant :
 * <ul>
 * <li>tout reste dans l'etiquette, a {@value Disposition#MARGE} mm du bord ;</li>
 * <li>rien ne se chevauche (le cadre du code comprend sa zone de silence : aucun texte n'y entre) ;</li>
 * <li>code 2D : point d'au moins {@value #MODULE_2D_MIN} mm, controle sur le contenu le plus long possible ;
 * code-barres : barre fine d'au moins {@value #MODULE_1D_MIN} mm et hauteur d'au moins {@value #HAUTEUR_1D_MIN} mm
 * ;</li>
 * <li>texte : police d'au moins {@value ElementEtiquette#POLICE_MIN} pt, cadre assez haut pour une ligne.</li>
 * </ul>
 * Des avertissements (non bloquants) signalent un code lisible en laser mais limite sur une imprimante thermique de
 * base (203 points par pouce).
 */
public final class ControleDisposition {

    public static final float MODULE_2D_MIN = 0.25f, MODULE_2D_CONSEILLE = 0.33f;
    public static final float MODULE_1D_MIN = 0.19f, MODULE_1D_CONSEILLE = 0.25f, HAUTEUR_1D_MIN = 5f;
    private static final float TOLERANCE = 0.01f;

    /** Probleme d'une disposition. */
    public static final class Probleme {
        public final ElementEtiquette element;
        public final String message;
        public final boolean bloquant;

        Probleme(ElementEtiquette element, String message, boolean bloquant) {
            this.element = element;
            this.message = message;
            this.bloquant = bloquant;
        }
    }

    /** Resultat du controle : problemes, et taille du point du code. */
    public static final class Resultat {
        public final List<Probleme> problemes = new ArrayList<>();
        public float moduleMm;
        public int modules;

        public boolean valide() {
            for (Probleme p : problemes) {
                if (p.bloquant) {
                    return false;
                }
            }
            return true;
        }

        public JSONObject json() {
            JSONArray a = new JSONArray();
            for (Probleme p : problemes) {
                a.put(new JSONObject().put("element", p.element == null ? "" : p.element.name())
                        .put("message", p.message).put("bloquant", p.bloquant));
            }
            return new JSONObject().put("valide", valide()).put("problemes", a)
                    .put("moduleMm", Placement.arrondi(moduleMm)).put("modules", modules);
        }
    }

    private ControleDisposition() {
    }

    static String mm(float v) {
        return String.format(Locale.FRANCE, "%.2f mm", v);
    }

    public static Resultat controler(Disposition d) {
        Resultat r = new Resultat();
        float w = d.getLargeur(), h = d.getHauteur(), m = Disposition.MARGE;
        Placement code = d.placement(ElementEtiquette.CODE);
        if (code == null) {
            r.problemes.add(new Probleme(ElementEtiquette.CODE, "Le code est absent de l'étiquette.", true));
            return r;
        }
        List<Placement> imprimes = new ArrayList<>();
        for (Placement p : d.getPlacements()) {
            if (p.isImprime()) {
                imprimes.add(p);
            }
        }
        for (Placement p : imprimes) {
            String nom = p.getElement().getLibelle();
            if (p.getL() <= 0 || p.getH() <= 0) {
                r.problemes.add(new Probleme(p.getElement(), nom + " : cadre vide.", true));
                continue;
            }
            if (p.getX() < m - TOLERANCE || p.getY() < m - TOLERANCE || p.getX() + p.getL() > w - m + TOLERANCE
                    || p.getY() + p.getH() > h - m + TOLERANCE) {
                r.problemes.add(new Probleme(p.getElement(),
                        nom + " sort de l'étiquette (" + Placement.arrondi(m) + " mm de marge au bord).", true));
            }
            if (p.getElement().estTexte()) {
                if (p.getPolice() < ElementEtiquette.POLICE_MIN - TOLERANCE) {
                    r.problemes.add(new Probleme(p.getElement(),
                            nom + " : police de " + Placement.arrondi(p.getPolice())
                                    + " pt, trop petite pour être lue (" + ElementEtiquette.POLICE_MIN
                                    + " pt au moins).",
                            true));
                } else if (p.getH() + TOLERANCE < Disposition.hauteurLigne(p.getPolice())) {
                    r.problemes.add(new Probleme(p.getElement(),
                            nom + " : cadre trop bas pour sa police (agrandissez-le" + " ou réduisez la police).",
                            true));
                }
            }
        }
        for (int i = 0; i < imprimes.size(); i++) {
            for (int j = i + 1; j < imprimes.size(); j++) {
                Placement a = imprimes.get(i), b = imprimes.get(j);
                float[] ra = a.rectangle(0), rb = b.rectangle(0);
                if (ra[0] < rb[2] - TOLERANCE && rb[0] < ra[2] - TOLERANCE && ra[1] < rb[3] - TOLERANCE
                        && rb[1] < ra[3] - TOLERANCE) {
                    boolean surCode = a.getElement() == ElementEtiquette.CODE
                            || b.getElement() == ElementEtiquette.CODE;
                    Placement t = a.getElement() == ElementEtiquette.CODE ? b : a;
                    Placement autre = t == a ? b : a;
                    r.problemes.add(new Probleme(t.getElement(),
                            t.getElement().getLibelle() + (surCode ? " chevauche le code ou sa zone de silence."
                                    : " chevauche « " + autre.getElement().getLibelle() + " »."),
                            true));
                }
            }
        }
        Symbole s;
        try {
            s = Symbole.de(d.getTypeCode(), ContenuCode.pireCas(d));
        } catch (IllegalArgumentException e) {
            r.problemes.add(new Probleme(ElementEtiquette.CODE,
                    "Trop d'informations dans le code : retirez-en (case « dans le code »).", true));
            return r;
        }
        r.modules = s.isLineaire() ? s.getModules()[0].length : s.getModules().length;
        r.moduleMm = s.module(code.getL(), code.getH());
        if (s.isLineaire()) {
            if (r.moduleMm < MODULE_1D_MIN - 0.001f) {
                r.problemes
                        .add(new Probleme(
                                ElementEtiquette.CODE, "Code-barres trop étroit pour être lu : barre fine de "
                                        + mm(r.moduleMm) + " (" + mm(MODULE_1D_MIN) + " au moins). Élargissez-le.",
                                true));
            } else if (r.moduleMm < MODULE_1D_CONSEILLE) {
                r.problemes
                        .add(new Probleme(ElementEtiquette.CODE, "Code-barres étroit (barre fine de " + mm(r.moduleMm)
                                + ") : lisible en laser, limite sur une imprimante thermique de base.", false));
            }
            if (code.getH() < HAUTEUR_1D_MIN - TOLERANCE) {
                r.problemes.add(new Probleme(ElementEtiquette.CODE,
                        "Code-barres trop bas : " + mm(code.getH()) + " (" + mm(HAUTEUR_1D_MIN) + " au moins).", true));
            }
        } else if (r.moduleMm < MODULE_2D_MIN - 0.001f) {
            float coteMin = MODULE_2D_MIN * s.largeurTotale();
            r.problemes.add(new Probleme(ElementEtiquette.CODE,
                    "Code trop petit pour être lu : point de " + mm(r.moduleMm) + " (" + mm(MODULE_2D_MIN)
                            + " au moins). Agrandissez-le à " + String.format(Locale.FRANCE, "%.1f", coteMin)
                            + " mm de côté au moins"
                            + (d.estEtendu() ? ", ou mettez moins d'informations dans le code." : "."),
                    true));
        } else if (r.moduleMm < MODULE_2D_CONSEILLE) {
            r.problemes.add(new Probleme(ElementEtiquette.CODE, "Code dense (point de " + mm(r.moduleMm)
                    + ") : lisible en laser, limite sur une imprimante thermique de base.", false));
        }
        return r;
    }
}
