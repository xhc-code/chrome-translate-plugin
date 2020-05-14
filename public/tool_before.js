window.$ = window.$  || {};
(function($){

    $.getRequest = function(url,data,success,responseType){
        data = data || {}
        let host = url,params = $.convertGetRequestParams(data,true)
        let xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("get",host.concat(params),true)
        xmlHttpRequest.responseType = responseType || "text"
        xmlHttpRequest.withCredentials = true
        xmlHttpRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=utf-8")
        xmlHttpRequest.addEventListener("load",function(){success.call(this,...arguments,xmlHttpRequest)})
        xmlHttpRequest.setRequestHeader("Access-Control-Allow-Origin","no-cors")
        xmlHttpRequest.send()
    }

})(window.$)