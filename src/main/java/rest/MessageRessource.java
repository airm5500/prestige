/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.MessagePayloadDTO;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;

/**
 *
 * @author koben
 */
@Path("v1/sms")
@Produces("application/json")
@Consumes("application/json")
public class MessageRessource {

    @POST
    public Response sendSms(MessagePayloadDTO payload) {
        System.out.println("-----------------   >>>>>>  " + payload.toString());
        return Response.ok().build();
    }
}
