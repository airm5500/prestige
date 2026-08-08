/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.filesmanagers.FilesType;


import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;

import javax.imageio.ImageIO;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import com.itextpdf.text.Document;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfImportedPage;
import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.PdfWriter;

import com.sun.pdfview.PDFFile;
import com.sun.pdfview.PDFPage;

/**
 *
 * @author User
 */
public class PdfFiles extends files implements Ifile {

  
    public void InitFiles() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public List<String> LoadDataToFiles() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public void LoadFile(String path) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public void LoadRessource() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public void SaveToFile(List<String> Collection_data) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public void SaveToFile(String data) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public void Delete() {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    //conversion de fichier pdf en image
    public String convertPdfToImage(String str_file_pdf, String str_path_image, String str_file_image, String str_extension_image) {
        String result = "";
        try {
            File pdfFile = new File(str_file_pdf);
            RandomAccessFile raf = new RandomAccessFile(pdfFile, "r");
            FileChannel channel = raf.getChannel();
            ByteBuffer buf = channel.map(FileChannel.MapMode.READ_ONLY, 0, channel.size());
            PDFFile pdf = new PDFFile(buf);

            for (int i = 0; i < pdf.getNumPages(); i++) {
               result = this.createImage(pdf.getPage(i), str_path_image + str_file_image + "." + str_extension_image, str_extension_image);
            }
        } catch (Exception e) {
        }
        return result;
    }

    public static String createImage(PDFPage page, String destination, String extension) {
        try {
            Rectangle rect = new Rectangle(0, 0, (int) page.getBBox().getWidth(),
                    (int) page.getBBox().getHeight());
            BufferedImage bufferedImage = new BufferedImage(rect.width, rect.height,
                    BufferedImage.TYPE_INT_RGB);

            Image image = page.getImage(rect.width, rect.height, // width & height
                    rect, // clip rect
                    null, // null for the ImageObserver
                    true, // fill background with white
                    true // block until drawing is done
            );
            Graphics2D bufImageGraphics = bufferedImage.createGraphics();
            bufImageGraphics.drawImage(image, 0, 0, null);
//        ImageIO.write(bufferedImage, "JPG", new File( destination ));
            ImageIO.write(bufferedImage, extension, new File(destination));
            return destination;
        } catch (Exception e) {
            return null;
        }

    }
    //fin conversion de fichier pdf en image

    //fusion de plusieurs fichiers pdf dans un seul
    public static void mergePdfFiles(List<InputStream> inputPdfList, OutputStream outputStream) throws Exception{
		//Create document and pdfReader objects.
		Document document = new Document();
        List<PdfReader> readers = new ArrayList<>();
        int totalPages = 0;
        
        //Create pdf Iterator object using inputPdfList.
        Iterator<InputStream> pdfIterator = inputPdfList.iterator();

        // Create reader list for the input pdf files.
        while (pdfIterator.hasNext()) {
                InputStream pdf = pdfIterator.next();
                PdfReader pdfReader = new PdfReader(pdf);
                readers.add(pdfReader);
                totalPages = totalPages + pdfReader.getNumberOfPages();
        }

        // Create writer for the outputStream
        PdfWriter writer = PdfWriter.getInstance(document, outputStream);
        
        //Open document.
        document.open();
       
        //Contain the pdf data.
        PdfContentByte pageContentByte = writer.getDirectContent();

        PdfImportedPage pdfImportedPage;
        int currentPdfReaderPage = 1;
        Iterator<PdfReader> iteratorPDFReader = readers.iterator();

        // Iterate and process the reader list.
        while (iteratorPDFReader.hasNext()) {
                PdfReader pdfReader = iteratorPDFReader.next();
                //Create page and add content.
                while (currentPdfReaderPage <= pdfReader.getNumberOfPages()) {
                      document.newPage();
                      pdfImportedPage = writer.getImportedPage(
                    		  pdfReader,currentPdfReaderPage);
                      pageContentByte.addTemplate(pdfImportedPage, 0, 0);
                      currentPdfReaderPage++;
                }
                currentPdfReaderPage = 1;
        }
        
        //Close document and outputStream.
        outputStream.flush();
        document.close();
        outputStream.close();
        
        System.out.println("Pdf files merged successfully.");
	}
    //fin fusion de plusieurs fichiers pdf dans un seul
}
