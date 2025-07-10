
package rest;

import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import javax.ejb.Stateless;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;

/**
 *
 * @author koben
 */
@Stateless
public class ExportExcelUtilService {

    public Response exportToExecel(byte[] data, String file) {

        StreamingOutput output = (OutputStream out) -> {
            try {

                out.write(data);
                out.flush();

            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = file + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)

                .header("content-disposition", "attachment; filename = " + filename).build();
    }
}
