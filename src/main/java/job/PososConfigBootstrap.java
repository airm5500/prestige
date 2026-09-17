package job;

import java.nio.file.Path;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.ejb.DependsOn;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import rest.service.posos.PososConfiguration;

/**
 * Cree le fichier de configuration de la passerelle Posos au deploiement s'il n'existe pas.
 *
 * <p>
 * Demande de l'officine : « il doit etre genere automatiquement apres deploiement s'il n'existe pas comme
 * dicisms.properties ». Le fichier apparait donc tout seul, dans le MEME dossier que {@code dicisms.properties}, avec
 * ses cles et les explications dedans, et des valeurs VIDES - aucun secret n'est livre.
 *
 * <p>
 * Un fichier deja present n'est jamais touche : la configuration du site survit a tous les deploiements. Rien ne bloque
 * le demarrage si l'ecriture echoue - la passerelle se declare alors « non configuree » et l'ecran « Analyse Posologie
 * » affiche le chemin attendu.
 */
@Singleton
@Startup
@DependsOn({ "AppConfig" })
public class PososConfigBootstrap {

    private static final Logger LOG = Logger.getLogger(PososConfigBootstrap.class.getName());

    @PostConstruct
    public void creerSiAbsent() {
        try {
            Path cree = PososConfiguration.creerModeleSiAbsent();
            if (cree != null) {
                LOG.log(Level.INFO, "Passerelle Posos : configuration a renseigner dans {0}", cree);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Amorcage de la configuration Posos impossible : " + e.getMessage());
        }
    }
}
