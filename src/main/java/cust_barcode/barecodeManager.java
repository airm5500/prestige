/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package cust_barcode;

import com.itextpdf.text.Image;
import com.itextpdf.text.pdf.Barcode128;
import com.itextpdf.text.pdf.Barcode39;
import com.itextpdf.text.pdf.PdfWriter;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.imageio.ImageIO;
import org.krysalis.barcode4j.HumanReadablePlacement;
import org.krysalis.barcode4j.impl.AbstractBarcodeBean;
import org.krysalis.barcode4j.impl.code128.Code128Bean;
import org.krysalis.barcode4j.impl.datamatrix.DataMatrixBean;
import org.krysalis.barcode4j.output.bitmap.BitmapCanvasProvider;
import toolkits.utils.jdom;

/**
 *
 * @author Thierry Bekola
 */
public class barecodeManager {

    private static int uom = 0; // 0 - Pixel, 1 - CM, 2 - Inch
    private static int resolution = 72;
    private static float leftMargin = 10.000f;
    private static float rightMargin = 10.000f;
    private static float topMargin = 10.000f;
    private static float bottomMargin = 10.000f;
    private static int rotate = 0; // 0 - 0, 1 - 90, 2 - 180, 3 - 270

    private static float barWidth = 1.000f;
    private static float barHeight = 80.000f;

    public barecodeManager() {

        jdom.InitRessource();
        jdom.LoadRessource();
    }

    public String build2DBarecode(String DATA, String FileName) {
        String file = FileName;
        try {
            DataMatrixBean bean = new DataMatrixBean();
            final int dpi = 150;

            bean.setHeight(10);
            bean.setModuleWidth(10);

            File outputFile = new File(jdom.barecode_file + "" + FileName + ".jpg");
            file = outputFile.getAbsolutePath();

            try (OutputStream out = new FileOutputStream(outputFile)) {
                BitmapCanvasProvider canvas = new BitmapCanvasProvider(out, "image/jpeg", dpi,
                        BufferedImage.TYPE_BYTE_BINARY, false, 0);
                bean.generateBarcode(canvas, DATA);
                canvas.finish();
            }
        } catch (IOException e) {

        }
        return file;
    }

    public String buildLineBarecode(String DATA) {
        String file = DATA;

        try {
            Barcode128 barcode128 = new Barcode128();
            barcode128.setCode(DATA);
            barcode128.setBaseline(10);
            barcode128.setBarHeight(50);
            barcode128.setCodeType(Barcode128.CODE128);
            java.awt.Image img = barcode128.createAwtImage(Color.BLACK, Color.WHITE);
            BufferedImage bi = new BufferedImage(100, 70, BufferedImage.BITMASK);
            Graphics2D gd = bi.createGraphics();
            gd.drawImage(img, 4, 2, null);
            gd.setColor(Color.BLACK);
            gd.drawString(DATA, 10, 65);
            gd.dispose();
            File f = new File(jdom.barecode_file + "" + file + ".png");

            ImageIO.write(bi, "png", f);

        } catch (Exception e) {

            // new logger().OCategory.error(e.getMessage());
        }

        return file;
    }

    public static Image getItextImageForCode39(String code, PdfWriter writer) {
        Barcode39 barcode39 = new Barcode39();
        barcode39.setCode(code);
        return barcode39.createImageWithBarcode(writer.getDirectContent(), null, null);

    }

    // fin dernier code de
    public static String buildbarcodeOther(String data, String str_file_name) {
        FileOutputStream out = null;
        try {
            // BufferedImage imgtext = new BufferedImage(100, 70, BufferedImage.TYPE_BYTE_BINARY);
            // Graphics2D g2d = imgtext.createGraphics();
            File f = new File(str_file_name);
            out = new FileOutputStream(f);
            AbstractBarcodeBean barcode = new Code128Bean();
            // barcode.setBarHeight(50.0);
            barcode.setFontName("Calibri (Corps)");
            barcode.setFontSize(15.0);
            barcode.setMsgPosition(HumanReadablePlacement.HRP_NONE);
            barcode.setModuleWidth(0.8);
            BitmapCanvasProvider canvas = new BitmapCanvasProvider(out, "image/x-png", 160,
                    BufferedImage.TYPE_BYTE_BINARY, false, 0);
            barcode.generateBarcode(canvas, data);
            try {
                canvas.finish();
            } catch (IOException ex) {
                Logger.getLogger(barecodeManager.class.getName()).log(Level.SEVERE, null, ex);
            }
        } catch (FileNotFoundException ex) {
            Logger.getLogger(barecodeManager.class.getName()).log(Level.SEVERE, null, ex);
        } finally {
            try {
                out.close();
            } catch (IOException ex) {
                Logger.getLogger(barecodeManager.class.getName()).log(Level.SEVERE, null, ex);
            }
        }
        return str_file_name;
    }

}
