chrome.runtime.onInstalled.addListener(function(details){
    if("install" === details.reason || true){
        Translator.refershGoogleTKK()
    }
})