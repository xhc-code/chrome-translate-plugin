chrome.runtime.onInstalled.addListener(function(details){
    if("install" === details.reason || true){
        Translator.refershGoogleTKK()
    }
})

chrome.contextMenus.onClicked.addListener(function(){
    chrome.tabs.query({active:true,currentWindow:true},function(tabs){
        chrome.tabs.sendMessage(tabs[0].id,{eventOperate:"triggerTranslate"})
    })

});

chrome.runtime.onInstalled.addListener(function(){
    chrome.contextMenus.create({
        id:"translateText",
        title:"翻译文本",
        // checked:true,
        contexts:["selection","editable"],
        // visible:true,
    })

})