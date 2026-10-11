package com.prestige.etiquettage.impression;

import com.prestige.etiquettage.catalogue.Produit;
import com.prestige.etiquettage.catalogue.Produits;
import com.prestige.etiquettage.web.Refus;
import etiquetagepro.LigneEtiquette;
import etiquetagepro.MoteurEtiquettes;
import etiquetagepro.OptionsImpression;
import etiquetagepro.disposition.ControleDisposition;
import etiquetagepro.disposition.Disposition;
import etiquetagepro.disposition.ElementEtiquette;
import etiquetagepro.disposition.Placement;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import rest.report.pdf.Gs1;
import rest.report.pdf.LabelSheetPdf;
import rest.report.pdf.RenduDisposition;
import rest.report.pdf.Symbole;

/**
 * Personnalisation des etiquettes, comme dans Prestige : disposition des elements (position, police, lignes, imprime ou
 * non, dans le code) par type de code et dimension, controle de lisibilite, apercu reel, essai sur papier.
 */
@Service
public class Personnalisation {

    private final Dispositions dispositions;
    private final ImpressionService impression;
    private final Produits produits;
    private final Reglages reglages;

    public Personnalisation(Dispositions dispositions, ImpressionService impression, Produits produits,
            Reglages reglages) {
        this.dispositions = dispositions;
        this.impression = impression;
        this.produits = produits;
        this.reglages = reglages;
    }

    static JSONObject corps(String s) {
        try {
            return new JSONObject(s == null || s.isBlank() ? "{}" : s);
        } catch (JSONException e) {
            throw Refus.requete("Requête illisible.");
        }
    }

    static Disposition disposition(JSONObject d) {
        try {
            return Disposition.lire(d.getJSONObject("disposition"));
        } catch (RuntimeException e) {
            throw Refus.requete("Disposition illisible.");
        }
    }

    static JSONArray elements() {
        JSONArray a = new JSONArray();
        for (ElementEtiquette e : ElementEtiquette.values()) {
            a.put(new JSONObject().put("id", e.name()).put("libelle", e.getLibelle()).put("police", e.getPoliceDefaut())
                    .put("lignes", e.getLignesMax()).put("dansLeCode", e.isPossibleDansLeCode())
                    .put("texte", e.estTexte()).put("gras", e.isGras()));
        }
        return a;
    }

    private float[] dimension(JSONObject d) {
        OptionsImpression o = new OptionsImpression().modele(ImpressionService.modeleValide(
                d.has("modele") ? d.optString("modele") : reglages.lire("modele")));
        return LabelSheetPdf.dimension(o.planche(impression.configuration(planche(d))));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> planche(JSONObject d) {
        JSONObject p = d.optJSONObject("planche");
        if (p == null) {
            return Collections.emptyMap();
        }
        Map<String, String> m = new java.util.LinkedHashMap<>();
        for (String k : p.keySet()) {
            m.put(k, p.isNull(k) ? null : String.valueOf(p.get(k)));
        }
        return m;
    }

    /**
     * Disposition qui sert aujourd'hui pour ce type et la planche choisie : enregistree, sinon reportee a l'echelle
     * d'une disposition du meme type (a recontroler), sinon la disposition proposee.
     */
    public String charger(String json) {
        JSONObject d = corps(json);
        String type = ImpressionService.codeValide(d.has("code") ? d.optString("code") : reglages.lire("code"));
        float[] dim = dimension(d);
        Disposition disp = dispositions.pour(type, dim[0], dim[1]);
        String source = "enregistree";
        String depuis = null;
        if (disp == null) {
            java.util.List<Disposition> autres = dispositions.duType(type);
            if (!autres.isEmpty()) {
                disp = autres.get(0).aLEchelle(dim[0], dim[1]);
                source = "echelle";
                depuis = autres.get(0).getLargeur() + " x " + autres.get(0).getHauteur() + " mm";
            } else {
                disp = Disposition.parDefaut(type, dim[0], dim[1]);
                source = "proposee";
            }
        }
        boolean historique = !"enregistree".equals(source) && !disp.estEtendu();
        return new JSONObject().put("type", type).put("largeur", disp.getLargeur()).put("hauteur", disp.getHauteur())
                .put("source", source).put("depuis", depuis == null ? JSONObject.NULL : depuis)
                .put("historique", historique).put("disposition", disp.json())
                .put("controle", ControleDisposition.controler(disp).json()).put("elements", elements())
                .put("enregistrees", new JSONArray(dispositions.liste())).put("marge", Disposition.MARGE).toString();
    }

    /** Etiquette d'exemple : produit du catalogue ({@code cip}), sinon valeurs saisies, sinon un exemple. */
    LabelSheetPdf.LabelData exemple(JSONObject e, String type) {
        JSONObject x = e == null ? new JSONObject() : e;
        String cip = x.optString("cip", "").strip();
        Produit p = cip.matches("\\d{7}|\\d{13}") ? produits.lire(cip) : null;
        java.util.function.Function<String, String> v = k -> p != null ? p.valeurs().getOrDefault(k, "")
                : x.optString(k, "");
        if (cip.isEmpty()) {
            cip = "3400930000014";
        }
        String designation = p == null && v.apply("designation").isEmpty() ? "DOLIPRANE 1000MG CPR B/8"
                : v.apply("designation");
        String prixBrut = p == null && !x.has("prix") ? "1250" : v.apply("prix");
        String monnaie = reglages.lire("monnaie") == null ? "CFA" : reglages.lire("monnaie").strip();
        String prix = prixBrut.isEmpty() ? "" : MoteurEtiquettes.prixAffiche(LigneEtiquette.lirePrix(prixBrut), monnaie);
        String officine = reglages.lire("officine") == null ? "PHARMACIE" : reglages.lire("officine");
        LabelSheetPdf.LabelData l = new LabelSheetPdf.LabelData(officine, v.apply("grossiste"), designation, cip, prix,
                x.optString("date", "")).codeGeo(v.apply("code_geo")).mention(v.apply("mention"));
        LocalDate per = LigneEtiquette.lireDate(v.apply("peremption"));
        String lot = v.apply("lot").isEmpty() ? null : v.apply("lot");
        if (!LabelSheetPdf.CODE_BARRES.equals(type)) {
            String brute = Gs1.brute(v.apply("ean"), per, lot, cip);
            l.codeEtendu(type, brute, lot, per == null ? null : per.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .codeUnique("AB2CD");
        }
        return l;
    }

    /** Controle d'une disposition en cours, avec le texte de chaque element et les modules du code pour l'apercu. */
    public String controler(String json) {
        JSONObject d = corps(json);
        Disposition disp = disposition(d);
        LabelSheetPdf.LabelData l = exemple(d.optJSONObject("exemple"), disp.getTypeCode());
        JSONObject valeurs = new JSONObject(), mise = new JSONObject();
        for (Map.Entry<ElementEtiquette, String> v : l.valeurs().entrySet()) {
            String t = v.getValue() == null ? "" : v.getValue();
            valeurs.put(v.getKey().name(), t);
            Placement p = disp.placement(v.getKey());
            if (p != null && !t.isBlank() && p.getL() > 0 && p.getH() > 0) {
                mise.put(v.getKey().name(), RenduDisposition.miseEnPage(v.getKey().isGras(), t, p));
            }
        }
        JSONObject symbole = new JSONObject();
        String contenu = l.contenuCode(disp);
        try {
            Symbole s = Symbole.de(disp.getTypeCode(), contenu);
            symbole.put("lignes", new JSONArray(s.lignes())).put("silence", s.getSilence())
                    .put("lineaire", s.isLineaire()).put("caracteres", contenu == null ? 0 : contenu.length());
        } catch (IllegalArgumentException e) {
            symbole.put("erreur", "Contenu trop long pour ce code.");
        }
        return new JSONObject().put("disposition", disp.json()).put("controle", ControleDisposition.controler(disp).json())
                .put("valeurs", valeurs).put("mise", mise).put("symbole", symbole)
                .put("contenuLisible", lisible(disp.getTypeCode(), contenu)).toString();
    }

    static String lisible(String type, String contenu) {
        if (contenu == null) {
            return "";
        }
        if (LabelSheetPdf.QR.equals(type) || LabelSheetPdf.DATAMATRIX.equals(type)) {
            return Gs1.lisible(contenu);
        }
        return contenu.replace(String.valueOf(Gs1.GS), "<GS>");
    }

    public String enregistrer(String json, String qui) {
        Disposition disp = disposition(corps(json));
        ControleDisposition.Resultat c = ControleDisposition.controler(disp);
        if (!c.valide()) {
            throw Refus.requete("Disposition non enregistrée : corrigez d'abord ce qui est signalé en rouge.");
        }
        dispositions.enregistrer(disp, qui);
        return new JSONObject().put("cle", disp.cle()).put("controle", c.json())
                .put("message", "Disposition enregistrée : elle sert désormais à toutes les impressions de ce type"
                        + " et de ce format.")
                .toString();
    }

    public String supprimer(String json) {
        JSONObject d = corps(json);
        boolean fait = dispositions.supprimer(ImpressionService.codeValide(d.optString("type")),
                (float) d.optDouble("largeur", 0), (float) d.optDouble("hauteur", 0));
        return new JSONObject().put("supprimee", fait).put("message", fait
                ? "Disposition d'origine rétablie pour ce type et ce format." : "Aucune disposition enregistrée.")
                .toString();
    }

    /** Essai sur papier : une etiquette d'exemple dessinee comme a l'impression, dans la case choisie. */
    public byte[] essai(String json) {
        JSONObject d = corps(json);
        Disposition disp = disposition(d);
        OptionsImpression o = new OptionsImpression().modele(ImpressionService.modeleValide(
                d.has("modele") ? d.optString("modele") : reglages.lire("modele")));
        LabelSheetPdf.SheetFormat f = o.planche(impression.configuration(planche(d)));
        int position = Math.max(1, Math.min(d.optInt("position", 1), f.perPage()));
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        try {
            LabelSheetPdf.write(sortie, Collections.singletonList(exemple(d.optJSONObject("exemple"), disp.getTypeCode())),
                    position, f, (t, l, h) -> disp);
        } catch (Exception e) {
            throw new IllegalStateException("Essai impossible", e);
        }
        return sortie.toByteArray();
    }
}
