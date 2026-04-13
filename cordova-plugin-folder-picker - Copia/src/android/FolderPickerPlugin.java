java
package br.seuapp.plugins;

import android.content.Intent;
import android.net.Uri;
import android.content.ContentResolver;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;

public class FolderPickerPlugin extends CordovaPlugin {

    private static final int REQUEST_CODE_FOLDER_PICKER = 1001;
    private CallbackContext callbackContext;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        this.callbackContext = callbackContext;

        if ("openFolderPicker".equals(action)) {
            openFolderPicker();
            return true;
        }

        return false;
    }

    private void openFolderPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );

        try {
            cordova.startActivityForResult(this, intent, REQUEST_CODE_FOLDER_PICKER);
        } catch (Exception e) {
            callbackContext.error("Não é possível abrir o seletor de pasta: " + e.getMessage());
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == REQUEST_CODE_FOLDER_PICKER) {
            if (resultCode == cordova.getActivity().RESULT_OK && intent != null) {
                Uri treeUri = intent.getData();
                
                if (treeUri != null) {
                    // Garantir permissão persistente
                    cordova.getActivity().getContentResolver()
                        .takePersistableUriPermission(
                            treeUri,
                            Intent.FLAG_GRANT_READ_URI_PERMISSION |
                            Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        );
                    
                    PluginResult result = new PluginResult(
                        PluginResult.Status.OK,
                        treeUri.toString()
                    );
                    result.setKeepCallback(false);
                    callbackContext.sendPluginResult(result);
                } else {
                    callbackContext.error("URI da pasta é nulo");
                }
            } else {
                callbackContext.error("Usuário cancelou ou erro ao escolher pasta");
            }
        }
    }
}
