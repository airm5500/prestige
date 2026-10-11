package rest.report.pdf;

import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfContentByte;
import etiquetagepro.disposition.Disposition;
import etiquetagepro.disposition.ElementEtiquette;
import etiquetagepro.disposition.Placement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;

/**
 * Dessin d'une etiquette selon sa disposition personnalisee. Chaque texte tient dans son cadre : il part de sa police,
 * passe sur une deuxieme ligne si le cadre et l'element le permettent (designation), puis la police descend jusqu'au
 * minimum lisible, et seulement en dernier recours le texte est abrege. Le code est dessine module par module, centre
 * dans son cadre avec sa zone de silence.
 */
public final class RenduDisposition {

    private static final float MM = 72f / 25.4f;

    private RenduDisposition() {
    }

    /**
     * @param valeurs
     *            texte de chaque element (vide ou absent : rien n'est imprime)
     * @param contenuCode
     *            contenu du code ({@link etiquetagepro.disposition.ContenuCode})
     * @param hauteurPt
     *            hauteur de l'etiquette en points (origine PDF en bas a gauche)
     */
    public static void dessiner(PdfContentByte cb, Disposition d, Map<ElementEtiquette, String> valeurs,
            String contenuCode, float hauteurPt, BaseFont regular, BaseFont bold) {
        for (Placement p : d.getPlacements()) {
            if (!p.isImprime()) {
                continue;
            }
            if (p.getElement() == ElementEtiquette.CODE) {
                if (StringUtils.isNotBlank(contenuCode)) {
                    dessinerCode(cb, Symbole.de(d.getTypeCode(), contenuCode), p, hauteurPt);
                }
                continue;
            }
            String texte = valeurs.get(p.getElement());
            if (StringUtils.isBlank(texte)) {
                continue;
            }
            BaseFont police = p.getElement().isGras() ? bold : regular;
            Mise mise = mettreEnPage(police, texte.trim().replaceAll("\\s+", " "), p);
            float hautBloc = mise.lignes.size() * Disposition.hauteurLigne(mise.taille);
            float yHaut = p.getY() + (p.getH() - hautBloc) / 2f;
            for (int i = 0; i < mise.lignes.size(); i++) {
                float base = yHaut + i * Disposition.hauteurLigne(mise.taille) + mise.taille / MM * 0.82f;
                float x = Placement.GAUCHE.equals(p.getAlignement()) ? p.getX()
                        : Placement.DROITE.equals(p.getAlignement()) ? p.getX() + p.getL() : p.getX() + p.getL() / 2f;
                int align = Placement.GAUCHE.equals(p.getAlignement()) ? PdfContentByte.ALIGN_LEFT
                        : Placement.DROITE.equals(p.getAlignement()) ? PdfContentByte.ALIGN_RIGHT
                                : PdfContentByte.ALIGN_CENTER;
                cb.beginText();
                cb.setFontAndSize(police, mise.taille);
                cb.showTextAligned(align, mise.lignes.get(i), x * MM, hauteurPt - base * MM, 0);
                cb.endText();
            }
        }
    }

    /**
     * Mise en page d'un texte telle qu'elle sera imprimee (lignes et taille), pour l'apercu de la personnalisation :
     * l'ecran montre exactement ce que donnera le PDF.
     */
    public static org.json.JSONObject miseEnPage(boolean gras, String texte, Placement p) {
        try {
            BaseFont police = BaseFont.createFont(gras ? BaseFont.HELVETICA_BOLD : BaseFont.HELVETICA, BaseFont.WINANSI,
                    BaseFont.NOT_EMBEDDED);
            Mise m = mettreEnPage(police, texte.trim().replaceAll("\\s+", " "), p);
            return new org.json.JSONObject().put("taille", m.taille).put("lignes", new org.json.JSONArray(m.lignes));
        } catch (com.itextpdf.text.DocumentException | java.io.IOException e) {
            throw new IllegalStateException("police Helvetica", e);
        }
    }

    /** Lignes et taille retenues pour un texte dans son cadre. */
    static final class Mise {
        final List<String> lignes = new ArrayList<>();
        float taille;
    }

    static Mise mettreEnPage(BaseFont police, String texte, Placement p) {
        float largeur = p.getL() * MM;
        for (float t = p.getPolice(); t >= ElementEtiquette.POLICE_MIN - 0.001f; t -= 0.25f) {
            int possibles = Math.max(1, Math.min(p.getElement().getLignesMax(),
                    (int) Math.floor(p.getH() / Disposition.hauteurLigne(t) + 0.01f)));
            List<String> l = couper(police, texte, t, largeur, possibles);
            if (l != null) {
                Mise m = new Mise();
                m.lignes.addAll(l);
                m.taille = t;
                return m;
            }
        }
        /* au minimum lisible et toujours trop long : derniere ligne abregee */
        float t = Math.max(ElementEtiquette.POLICE_MIN, Math.min(p.getPolice(), ElementEtiquette.POLICE_MIN));
        int possibles = Math.max(1, Math.min(p.getElement().getLignesMax(),
                (int) Math.floor(p.getH() / Disposition.hauteurLigne(t) + 0.01f)));
        Mise m = new Mise();
        m.taille = t;
        String reste = texte;
        for (int i = 0; i < possibles; i++) {
            if (i == possibles - 1) {
                m.lignes.add(LabelSheetPdf.abreger(police, reste, t, largeur));
                break;
            }
            String debut = premiereLigne(police, reste, t, largeur);
            m.lignes.add(debut);
            reste = reste.substring(debut.length()).trim();
            if (reste.isEmpty()) {
                break;
            }
        }
        return m;
    }

    /** Texte coupe aux espaces en au plus n lignes qui tiennent dans la largeur, sinon null. */
    static List<String> couper(BaseFont police, String texte, float taille, float largeur, int n) {
        List<String> lignes = new ArrayList<>();
        String reste = texte;
        while (!reste.isEmpty()) {
            if (lignes.size() == n) {
                return null;
            }
            if (police.getWidthPoint(reste, taille) <= largeur) {
                lignes.add(reste);
                return lignes;
            }
            String debut = premiereLigne(police, reste, taille, largeur);
            if (debut.isEmpty() || police.getWidthPoint(debut, taille) > largeur) {
                return null;
            }
            lignes.add(debut);
            reste = reste.substring(debut.length()).trim();
        }
        return lignes;
    }

    /** Plus long debut du texte, coupe a un espace, qui tient dans la largeur ; a defaut le premier mot. */
    static String premiereLigne(BaseFont police, String texte, float taille, float largeur) {
        String[] mots = texte.split(" ");
        StringBuilder b = new StringBuilder(mots[0]);
        for (int i = 1; i < mots.length; i++) {
            String essai = b + " " + mots[i];
            if (police.getWidthPoint(essai, taille) > largeur) {
                break;
            }
            b.setLength(0);
            b.append(essai);
        }
        return b.toString();
    }

    /** Le code, centre dans son cadre, zone de silence comprise ; noir plein, module par module. */
    static void dessinerCode(PdfContentByte cb, Symbole s, Placement p, float hauteurPt) {
        float module = s.module(p.getL(), p.getH());
        boolean[][] m = s.getModules();
        if (s.isLineaire()) {
            float x0 = p.getX() + (p.getL() - module * s.largeurTotale()) / 2f + s.getSilence() * module;
            float yBas = hauteurPt - (p.getY() + p.getH()) * MM;
            int i = 0;
            while (i < m[0].length) {
                if (!m[0][i]) {
                    i++;
                    continue;
                }
                int j = i;
                while (j < m[0].length && m[0][j]) {
                    j++;
                }
                cb.rectangle((x0 + i * module) * MM, yBas, (j - i) * module * MM, p.getH() * MM);
                i = j;
            }
        } else {
            float cote = module * s.largeurTotale();
            float x0 = p.getX() + (p.getL() - cote) / 2f + s.getSilence() * module;
            float y0 = p.getY() + (p.getH() - cote) / 2f + s.getSilence() * module;
            for (int y = 0; y < m.length; y++) {
                int x = 0;
                while (x < m[y].length) {
                    if (!m[y][x]) {
                        x++;
                        continue;
                    }
                    int f = x;
                    while (f < m[y].length && m[y][f]) {
                        f++;
                    }
                    cb.rectangle((x0 + x * module) * MM, hauteurPt - (y0 + (y + 1) * module) * MM,
                            (f - x) * module * MM, module * MM);
                    x = f;
                }
            }
        }
        cb.fill();
    }
}
