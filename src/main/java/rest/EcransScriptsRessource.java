package rest;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.GZIPOutputStream;
import javax.servlet.ServletContext;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.EntityTag;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;

/**
 * Scripts des ecrans en un seul appel (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, § 4.6).
 * <p>
 * A la connexion, ExtJS (Ext.Loader) charge pres de 1 000 fichiers de general/app, un par un et en chaine de
 * dependances : 2,3 s pour un poste seul, plus de 60 s quand 15 postes se connectent ensemble. Cette ressource renvoie
 * le texte de tous ces fichiers dans une table {@code window.PRESTIGE_SCRIPTS} (chemin -> texte), sans rien executer.
 * resources/js/scripts-groupes.js branche Ext.Loader sur cette table : un fichier present s'execute depuis la memoire,
 * un fichier absent part par le reseau comme avant. L'ordre et les dependances restent ceux d'Ext.Loader.
 * <p>
 * La table est construite une fois, puis reconstruite si un fichier change (verification toutes les 5 s au plus).
 * Reponse compressee (gzip) et validee par son empreinte : un poste qui l'a deja recoit un 304.
 */
@javax.ws.rs.Path("v1/ecrans")
public class EcransScriptsRessource {

    private static final Logger LOG = Logger.getLogger(EcransScriptsRessource.class.getName());
    static final String DOSSIER = "/general/app";
    private static final long VERIFICATION_MS = 5_000;

    /** Table construite : signature des fichiers, empreinte, texte brut et compresse. */
    static final class Lot {
        final String signature;
        final String empreinte;
        final byte[] brut;
        final byte[] gzip;
        final long verifie;

        Lot(String signature, String empreinte, byte[] brut, byte[] gzip, long verifie) {
            this.signature = signature;
            this.empreinte = empreinte;
            this.brut = brut;
            this.gzip = gzip;
            this.verifie = verifie;
        }

        Lot verifieA(long t) {
            return new Lot(signature, empreinte, brut, gzip, t);
        }
    }

    private static volatile Lot lot;

    @Context
    private ServletContext contexte;

    @GET
    @javax.ws.rs.Path("scripts.js")
    @Produces("application/javascript; charset=UTF-8")
    public Response scripts(@Context Request requete, @HeaderParam("Accept-Encoding") String encodages) {
        Lot l = lot(contexte);
        EntityTag empreinte = new EntityTag(l.empreinte);
        Response.ResponseBuilder inchange = requete.evaluatePreconditions(empreinte);
        Response.ResponseBuilder r;
        if (inchange != null) {
            r = inchange;
        } else if (encodages != null && encodages.toLowerCase().contains("gzip")) {
            r = Response.ok(l.gzip).header("Content-Encoding", "gzip");
        } else {
            r = Response.ok(l.brut);
        }
        /* revalide a chaque connexion (304 si rien n'a change) ; reservee au poste connecte */
        return r.tag(empreinte).header("Cache-Control", "private, no-cache").header("Vary", "Accept-Encoding").build();
    }

    static Lot lot(ServletContext contexte) {
        Lot l = lot;
        long t = System.currentTimeMillis();
        if (l != null && t - l.verifie < VERIFICATION_MS) {
            return l;
        }
        synchronized (EcransScriptsRessource.class) {
            l = lot;
            if (l != null && t - l.verifie < VERIFICATION_MS) {
                return l;
            }
            String reel = contexte.getRealPath(DOSSIER);
            List<Path> fichiers = reel == null ? List.of() : fichiers(Paths.get(reel));
            String signature = signature(fichiers);
            if (l == null || !l.signature.equals(signature)) {
                l = construire(contexte.getContextPath() + DOSSIER, reel == null ? null : Paths.get(reel), fichiers,
                        signature, t);
            } else {
                l = l.verifieA(t);
            }
            lot = l;
            return l;
        }
    }

    static List<Path> fichiers(Path racine) {
        try (Stream<Path> s = Files.walk(racine)) {
            return s.filter(p -> Files.isRegularFile(p) && p.getFileName().toString().endsWith(".js")).sorted()
                    .collect(Collectors.toList());
        } catch (IOException | RuntimeException e) {
            LOG.log(Level.WARNING, "scripts des ecrans illisibles, chargement fichier par fichier : {0}",
                    e.getClass().getSimpleName());
            return List.of();
        }
    }

    /** Nombre, dates et tailles des fichiers : change des qu'un fichier est ajoute, retire ou modifie. */
    static String signature(List<Path> fichiers) {
        StringBuilder s = new StringBuilder().append(fichiers.size());
        for (Path p : fichiers) {
            try {
                s.append('|').append(p).append(':').append(Files.getLastModifiedTime(p).toMillis()).append(':')
                        .append(Files.size(p));
            } catch (IOException e) {
                s.append('|').append(p).append(":?");
            }
        }
        return s.toString();
    }

    static Lot construire(String prefixe, Path racine, List<Path> fichiers, String signature, long t) {
        StringBuilder js = new StringBuilder(16 * 1024 * 1024);
        js.append("/* Prestige : scripts des ecrans, voir rest.EcransScriptsRessource */\nwindow.PRESTIGE_SCRIPTS={");
        boolean premier = true;
        for (Path p : fichiers) {
            String texte;
            try {
                texte = new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
            } catch (IOException e) {
                /* fichier illisible : absent de la table, il part par le reseau */
                continue;
            }
            if (!texte.isEmpty() && texte.charAt(0) == '﻿') {
                texte = texte.substring(1);
            }
            String chemin = prefixe + "/" + racine.relativize(p).toString().replace('\\', '/');
            js.append(premier ? "" : ",").append('\n');
            chaine(js, chemin);
            js.append(':');
            chaine(js, texte);
            premier = false;
        }
        js.append("\n};\n");
        byte[] brut = js.toString().getBytes(StandardCharsets.UTF_8);
        return new Lot(signature, empreinte(brut), brut, gzip(brut), t);
    }

    /** Chaine JavaScript entre guillemets. */
    static void chaine(StringBuilder js, String s) {
        js.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
            case '"':
                js.append("\\\"");
                break;
            case '\\':
                js.append("\\\\");
                break;
            case '\n':
                js.append("\\n");
                break;
            case '\r':
                js.append("\\r");
                break;
            case '\t':
                js.append("\\t");
                break;
            default:
                /* caracteres de controle, fins de ligne Unicode, et « </ » pour ne jamais fermer une balise */
                if (c < 0x20 || c == ' ' || c == ' ' || (c == '/' && i > 0 && s.charAt(i - 1) == '<')) {
                    js.append(String.format("\\u%04x", (int) c));
                } else {
                    js.append(c);
                }
            }
        }
        js.append('"');
    }

    static String empreinte(byte[] contenu) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(contenu);
            StringBuilder s = new StringBuilder();
            for (int i = 0; i < 12; i++) {
                s.append(String.format("%02x", h[i]));
            }
            return s.toString();
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(java.util.Arrays.hashCode(contenu));
        }
    }

    static byte[] gzip(byte[] brut) {
        ByteArrayOutputStream o = new ByteArrayOutputStream(brut.length / 4);
        try (GZIPOutputStream z = new GZIPOutputStream(o)) {
            z.write(brut);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        return o.toByteArray();
    }
}
