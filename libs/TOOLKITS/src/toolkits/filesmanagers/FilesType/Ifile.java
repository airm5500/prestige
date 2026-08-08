/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

package toolkits.filesmanagers.FilesType;

import java.util.Collection;
import java.util.List;

/**
 *
 * @author User
 */
public interface Ifile {

    public void InitFiles();
    public void SaveToFile(String data);
    public void SaveToFile(List <String> Collection_data);
    public void LoadFile(String path);
 //   public List <String>  LoadDataToFiles();
    public void LoadRessource();
    public void Delete();



}
