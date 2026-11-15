package rest.service.facture;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import javax.activation.DataHandler;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.util.ByteArrayDataSource;

import org.apache.commons.lang3.StringUtils;

/**
 * Plan du 14/11, point 4 : regles de l'envoi des factures d'un tiers payant.
 *
 * <ul>
 * <li>mode d'envoi de la fiche : IMPRESSION (par defaut, comportement historique), MAIL (la facture part en PDF a
 * l'adresse de la fiche) ou API (reglage seul : l'envoi par API n'est pas encore disponible) ;</li>
 * <li>adresse de la fiche : une ou plusieurs adresses separees par « ; », « , » ou des espaces ; en mode MAIL, il en
 * faut au moins une et toutes doivent etre valides ;</li>
 * <li>message : objet « Facture &lt;numero&gt; - &lt;officine&gt; », corps court (organisme, periode, montant, nombre
 * de bons), la facture en piece jointe PDF. Aucun nom de patient dans l'objet ni dans le corps.</li>
 * </ul>
 * Aucune dependance au conteneur : verifie par EnvoiFactureCoherenceTest.
 */
public final class EnvoiFacture {

    public static final String IMPRESSION = "IMPRESSION";
    public static final String MAIL = "MAIL";
    public static final String API = "API";
    public static final List<String> MODES = Collections
            .unmodifiableList(java.util.Arrays.asList(IMPRESSION, MAIL, API));

    public static final String STATUT_ENVOYEE = "ENVOYEE";
    public static final String STATUT_ECHEC = "ECHEC";

    /** Une adresse : une partie locale, un @, un domaine avec au moins un point ; ni espace ni second @. */
    private static final Pattern ADRESSE = Pattern
            .compile("^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$");
    private static final Pattern SEPARATEURS = Pattern.compile("[;,\\s]+");

    private EnvoiFacture() {
    }

    /**
     * Mode lu sur la fiche ou recu de l'ecran. Vide : null (la valeur en place ne change pas). Inconnu :
     * IllegalArgumentException, avec le motif a afficher.
     */
    public static String normaliserMode(String mode) {
        if (StringUtils.isBlank(mode)) {
            return null;
        }
        String m = mode.trim().toUpperCase(Locale.ROOT);
        if (!MODES.contains(m)) {
            throw new IllegalArgumentException(
                    "Mode d'envoi des factures inconnu : " + mode.trim() + " (attendu : impression, email ou API)");
        }
        return m;
    }

    /** Mode d'une fiche, IMPRESSION si la colonne est vide ou inconnue (fiches anterieures a la migration). */
    public static String modeEffectif(String mode) {
        try {
            String m = normaliserMode(mode);
            return m == null ? IMPRESSION : m;
        } catch (IllegalArgumentException e) {
            return IMPRESSION;
        }
    }

    /** Morceaux non vides du champ adresse, dans l'ordre, sans doublon (casse ignoree). */
    public static List<String> morceaux(String champ) {
        List<String> liste = new ArrayList<>();
        if (StringUtils.isBlank(champ)) {
            return liste;
        }
        for (String m : SEPARATEURS.split(champ.trim())) {
            if (!m.isEmpty() && liste.stream().noneMatch(x -> x.equalsIgnoreCase(m))) {
                liste.add(m);
            }
        }
        return liste;
    }

    public static boolean adresseValide(String adresse) {
        if (adresse == null || adresse.length() > 254 || !ADRESSE.matcher(adresse).matches() || adresse.contains("..")
                || adresse.startsWith(".") || adresse.contains(".@")) {
            return false;
        }
        try {
            new InternetAddress(adresse, true).validate();
            return true;
        } catch (AddressException e) {
            return false;
        }
    }

    /** Adresses valides du champ. */
    public static List<String> adresses(String champ) {
        List<String> ok = new ArrayList<>();
        for (String m : morceaux(champ)) {
            if (adresseValide(m)) {
                ok.add(m);
            }
        }
        return ok;
    }

    /** Morceaux du champ qui ne sont pas des adresses valides. */
    public static List<String> adressesInvalides(String champ) {
        List<String> ko = new ArrayList<>();
        for (String m : morceaux(champ)) {
            if (!adresseValide(m)) {
                ko.add(m);
            }
        }
        return ko;
    }

    /**
     * Controle de la fiche a l'enregistrement : motif du refus, ou null si la fiche est acceptable. Seul le mode MAIL
     * exige une adresse ; en IMPRESSION et en API, l'adresse reste libre comme aujourd'hui.
     */
    public static String controlerFiche(String mode, String champMail) {
        if (!MAIL.equals(mode)) {
            return null;
        }
        List<String> ko = adressesInvalides(champMail);
        if (!ko.isEmpty()) {
            return "Envoi des factures par email : adresse invalide (" + String.join(", ", ko) + ")";
        }
        if (adresses(champMail).isEmpty()) {
            return "Envoi des factures par email : renseignez l'adresse email de l'organisme (champ Mail)";
        }
        return null;
    }

    /** Montant en francs, espaces entre les milliers : 1 234 567 F CFA. */
    public static String montant(double valeur) {
        DecimalFormatSymbols s = new DecimalFormatSymbols(Locale.FRANCE);
        s.setGroupingSeparator(' ');
        return new DecimalFormat("#,##0", s).format(Math.round(valeur)) + " F CFA";
    }

    /** Nom de la piece jointe : Facture_&lt;organisme&gt;_&lt;numero&gt;.pdf, sans accent ni caractere special. */
    public static String nomPieceJointe(String organisme, String numero) {
        StringBuilder nom = new StringBuilder("Facture");
        for (String partie : new String[] { organisme, numero }) {
            String p = StringUtils.strip(Normalizer.normalize(StringUtils.defaultString(partie), Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "").replaceAll("[^A-Za-z0-9]+", "_"), "_");
            if (!p.isEmpty()) {
                nom.append('_').append(p);
            }
        }
        return nom.append(".pdf").toString();
    }

    public static String objet(String numero, String officine) {
        return "Facture " + StringUtils.defaultString(numero).trim()
                + (StringUtils.isBlank(officine) ? "" : " - " + officine.trim());
    }

    /** Corps du message, en texte : rien d'autre que ce qui figure deja en tete de la facture. */
    public static String corps(String organisme, String numero, String periode, double montantNet, int nbBons,
            String officine) {
        return "Bonjour,\n\n" + "Veuillez trouver ci-joint la facture " + StringUtils.defaultString(numero).trim()
                + (StringUtils.isBlank(organisme) ? "" : " adressee a " + organisme.trim()) + ".\n\n"
                + (StringUtils.isBlank(periode) ? "" : "Periode : " + periode.trim() + "\n") + "Nombre de bons : "
                + nbBons + "\n" + "Montant net : " + montant(montantNet) + "\n\n" + "Cordialement,\n"
                + (StringUtils.isBlank(officine) ? "" : officine.trim() + "\n");
    }

    /**
     * Message pret a partir. Les adresses doivent avoir ete controlees (controlerFiche) ; une liste vide est refusee.
     */
    public static MimeMessage construire(Session session, String expediteur, List<String> destinataires, String objet,
            String corps, byte[] pdf, String nomPieceJointe) throws MessagingException {
        if (destinataires == null || destinataires.isEmpty()) {
            throw new MessagingException("Aucun destinataire");
        }
        if (pdf == null || pdf.length == 0) {
            throw new MessagingException("Facture vide");
        }
        MimeMessage msg = new MimeMessage(session);
        msg.setFrom(new InternetAddress(expediteur));
        InternetAddress[] a = new InternetAddress[destinataires.size()];
        for (int i = 0; i < a.length; i++) {
            a[i] = new InternetAddress(destinataires.get(i), true);
        }
        msg.setRecipients(Message.RecipientType.TO, a);
        msg.setSubject(objet, "UTF-8");
        Multipart multipart = new MimeMultipart();
        MimeBodyPart texte = new MimeBodyPart();
        texte.setText(corps, "UTF-8");
        multipart.addBodyPart(texte);
        MimeBodyPart piece = new MimeBodyPart();
        piece.setDataHandler(new DataHandler(new ByteArrayDataSource(pdf, "application/pdf")));
        piece.setFileName(nomPieceJointe);
        multipart.addBodyPart(piece);
        msg.setContent(multipart);
        msg.saveChanges();
        return msg;
    }
}
