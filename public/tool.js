(function($){
    const defaultParams = {
        client:"webapp", //客户端
        sl:"zh-CN",  //源语言
        tl:"en",    //目标语言
        hl:"zh-CN", //本地语言
        dt:["at","bd","ex","ld","md","qca","rw","rm","sos","ss","t"],
        //tk:-1, //结合文本计算出的TK值
        q:""  //所需要翻译的文本
    }
    $.getGoogleTranslateRequest = function(data,success){
        let xmlHttpRequest = new XMLHttpRequest(),
            newText = data.q.replace(/\n/g,' '),
            encodingText = encodeURIComponent(newText),
            d = Object.assign({},defaultParams,{
                q:encodingText,
                sl:data.sl,
                tl:data.tl
            })
        let params = $.convertGetRequestParams(d,true).concat(Translator.getGoogleTkValue(newText))
        let host="https://translate.google.cn/translate_a/single"
        let url = host.concat(params)

        xmlHttpRequest.addEventListener("load",function(){success.call(this,...arguments,xmlHttpRequest)})
        xmlHttpRequest.addEventListener("error",function(){console.log("onError",this,...arguments,xmlHttpRequest)})

        xmlHttpRequest.open("get",url,true)
        xmlHttpRequest.responseType = "json"
        xmlHttpRequest.withCredentials = true
        xmlHttpRequest.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=utf-8")
        xmlHttpRequest.setRequestHeader("Access-Control-Allow-Origin","no-cors")

        xmlHttpRequest.send()
        return xmlHttpRequest
    }

    $.convertGetRequestParams = function(data,isFirst){
        let params = $._convertGetRequestParams(null,data,isFirst,null)
        if(params==='?'){
            return ""
        }
        return params
    }

    $._convertGetRequestParams = function(key,data,isFirst,deep){
        let params = isFirst?"?":"",d = Object.keys(data)
        deep = (deep === null || deep === undefined)?1:deep++
        for(let i=0;i<d.length;i++){
            let k = key === null?d[i]:key,v = key === null?data[k]:data[i];
            if(v instanceof Array){
                params = params.concat((deep===1 && i ===0)?"":"&",$._convertGetRequestParams(k,v,false,deep))
                continue
            }
            if((deep ===1 && i>0) || deep > 1){
                params = params.concat("&")
            }
            params = params.concat(k,'=',v)
        }
        return params
    }

})(window.$)


