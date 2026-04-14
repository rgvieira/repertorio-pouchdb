package br.seuapp.safscanner;

import android.net.Uri;
import android.provider.DocumentsContract;
import android.database.Cursor;
import android.content.ContentResolver;
import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class SAFScannerPlugin extends CordovaPlugin {
    private CallbackContext callbackContext;
    
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        this.callbackContext = callbackContext;
        
        if ("scanDirectory".equals(action)) {
            String uriString = args.getString(0);
            Uri contentUri = Uri.parse(uriString);
            scanDirectoryRecursive(contentUri);
            return true;
        }
        
        if ("listFiles".equals(action)) {
            String uriString = args.getString(0);
            Uri contentUri = Uri.parse(uriString);
            listFiles(contentUri);
            return true;
        }
        
        if ("readPdfBlob".equals(action)) {
            String uriString = args.getString(0);
            Uri contentUri = Uri.parse(uriString);
            readPdfAsBase64(contentUri);
            return true;
        }
        
        return false;
    }
    
    private void listFiles(Uri contentUri) {
        try {
            ArrayList<JSONObject> results = new ArrayList<>();
            ContentResolver resolver = cordova.getActivity().getContentResolver();
            
            Cursor cursor = resolver.query(
                contentUri,
                new String[]{ 
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE,
                    DocumentsContract.Document.COLUMN_SIZE,
                    DocumentsContract.Document.COLUMN_LAST_MODIFIED
                },
                null, null, null
            );
            
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    String documentId = cursor.getString(0);
                    String displayName = cursor.getString(1);
                    String mimeType = cursor.getString(2);
                    String size = cursor.getString(3);
                    Long lastModified = cursor.isNull(4) ? null : cursor.getLong(4);
                    
                    JSONObject file = new JSONObject();
                    file.put("documentId", documentId);
                    file.put("name", displayName);
                    file.put("mimeType", mimeType);
                    file.put("size", size != null ? Long.parseLong(size) : 0);
                    file.put("lastModified", lastModified != null ? lastModified : 0);
                    file.put("isDirectory", mimeType == null || mimeType.equals("vnd.android.document/directory"));
                    
                    Uri childUri = DocumentsContract.buildDocumentUriUsingTree(
                        contentUri, documentId);
                    file.put("uri", childUri.toString());
                    
                    results.add(file);
                }
                cursor.close();
            }
            
            callbackContext.success(new JSONArray(results));
            
        } catch (Exception e) {
            callbackContext.error("Erro listFiles: " + e.getMessage());
        }
    }
    
    private void scanDirectoryRecursive(Uri contentUri) {
        try {
            ContentResolver resolver = cordova.getActivity().getContentResolver();
            
            Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                contentUri, DocumentsContract.getDocumentId(contentUri));
            
            Cursor cursor = resolver.query(
                childrenUri,
                new String[]{ 
                    DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                    DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                    DocumentsContract.Document.COLUMN_MIME_TYPE,
                    DocumentsContract.Document.COLUMN_SIZE
                },
                null, null, null
            );
            
            ArrayList<JSONObject> files = new ArrayList<>();
            ArrayList<Uri> folders = new ArrayList<>();
            ArrayList<String> folderNames = new ArrayList<>();
            
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    String documentId = cursor.getString(0);
                    String displayName = cursor.getString(1);
                    String mimeType = cursor.getString(2);
                    String size = cursor.getString(3);
                    
                    Uri childUri = DocumentsContract.buildDocumentUriUsingTree(contentUri, documentId);
                    boolean isDirectory = mimeType == null || mimeType.equals("vnd.android.document/directory");
                    
                    if (isDirectory) {
                        folders.add(childUri);
                        folderNames.add(displayName);
                    } else if (displayName != null && displayName.toLowerCase().endsWith(".pdf")) {
                        JSONObject file = new JSONObject();
                        file.put("name", displayName.replace(".pdf", "").replace("_", " "));
                        file.put("pasta", "Raiz");
                        file.put("path", childUri.toString());
                        file.put("_id", childUri.toString());
                        file.put("tipo", "musica");
                        file.put("size", size != null ? Long.parseLong(size) : 0);
                        file.put("mimeType", mimeType);
                        file.put("isDirectory", false);
                        files.add(file);
                    }
                }
                cursor.close();
            }
            
            if (!files.isEmpty()) {
                callbackContext.success(new JSONArray(files));
            }
            
            for (int i = 0; i < folders.size(); i++) {
                scanDirectoryRecursive(folders.get(i));
            }
            
        } catch (Exception e) {
            if (callbackContext != null) {
                callbackContext.error("Erro scan: " + e.getMessage());
            }
        }
    }
    
    private void readPdfAsBase64(Uri uri) {
        try {
            ContentResolver resolver = cordova.getActivity().getContentResolver();
            InputStream inputStream = resolver.openInputStream(uri);
            
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[4096];
            int bytesRead;
            
            while ((bytesRead = inputStream.read(data)) != -1) {
                buffer.write(data, 0, bytesRead);
            }
            
            inputStream.close();
            
            String base64 = android.util.Base64.encodeToString(buffer.toByteArray(), android.util.Base64.NO_WRAP);
            
            JSONObject result = new JSONObject();
            result.put("base64", base64);
            result.put("mimeType", "application/pdf");
            
            callbackContext.success(result);
            
        } catch (IOException e) {
            callbackContext.error("Erro readPdf: " + e.getMessage());
        } catch (JSONException e) {
            callbackContext.error("Erro JSON: " + e.getMessage());
        }
    }
}