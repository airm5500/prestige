/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ComboDTO;
import java.util.List;
import java.util.Set;
import javax.ejb.EJB;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import rest.service.TypeReglementService;
import util.Constant;

/**
 *
 * @author DICI
 */
@Path("v1/type-reglements")
@Produces("application/json")
@Consumes("application/json")
public class TypeReglementRessource {

    @EJB
    private TypeReglementService typeReglementService;

    @GET
    @Path("list/sans-espece")
    public Response findAllWithoutEspece() throws JSONException {

        List<ComboDTO> data = typeReglementService.findAllWithoutEspece();
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    /**
     * Identifiants des types mobile money : l'ecran de vente s'en sert pour reconnaitre un mode mobile (client par
     * defaut, fractionnement mobile + mobile). Pas de cache : un mode cree doit etre reconnu tout de suite.
     */
    @GET
    @Path("mobile-money")
    public Response mobileMoney() throws JSONException {
        List<String> data = typeReglementService.identifiantsMobileMoney();
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    /**
     * Identifiants des types de reglement qui exigent un client sur la vente. Pas de cache : un reglage change dans
     * l'ecran des modes de reglement doit valoir des la vente suivante.
     */
    @GET
    @Path("client-requis")
    public Response clientRequis() throws JSONException {
        List<String> data = typeReglementService.identifiantsClientRequis();
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @GET
    @Path("list")
    public Response findAll() throws JSONException {
        List<ComboDTO> data = typeReglementService.findAllExclude(Set.of(Constant.REGL_DIFF, Constant.MODE_DEVISE));
        CacheControl cc = new CacheControl();
        cc.setMaxAge(86400);
        cc.setPrivate(true);
        return Response.ok().cacheControl(cc).entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

}
