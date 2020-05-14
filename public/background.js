console.log(new Date())

const messages = new Map()
messages.set("tr","translateRanges")


chrome.runtime.onConnect.addListener(function(port){
    if(messages.get("tr") === port.name){
        port.onMessage.addListener(function(data){
            let translateResult = new Array()
            let promiseQueue = new Array()
            console.log("已接受数据，准备处理",data)
            for(let i=0;i<data.translateTexts.length;i++){
                let text = data.translateTexts[i]
                promiseQueue.push(
                    new Promise(function(resolve,reject){
                        $.getGoogleTranslateRequest({
                            q:text,
                            sl:data.sl,
                            tl:data.tl
                        },function(){
                            try{
                                let d = this.response

                                // translatePhoneticSymbol[0]是原文音标，translatePhoneticSymbol[1]是翻译过的文本音标
                                let translatePhoneticSymbol = d[0][d[0].length-1].slice(2).reverse(),translateText = "",originText = ""
                                // tr是translateResult的缩写
                                //这个语句块执行 翻译文本和源文本的追加拼接字符串操作
                                {
                                    for(let i=0;i<d[0].length-1;i++){
                                        //拼接翻译的文本
                                        translateText += d[0][i][0]
                                        //拼接源文本
                                        originText += d[0][i][1]
                                    }
                                }
                                //当 音标 集合具有一个值的时候，说明没有原文的音标，这里添加一个空字符串到这个数组的头部，方便下面的使用
                                if(translatePhoneticSymbol.length === 1){
                                    translatePhoneticSymbol.unshift("")
                                }

                                //缩写词，频率词
                                let wordTranslate = ""
                                if(d[1] !== null){
                                    switch (d[1][0][0]) {
                                        case "缩写词":
                                            wordTranslate = d[1][0][1][0]
                                            break;
                                        case "频率词":

                                            break;
                                        case "名词":
                                            wordTranslate = d[1][0][1][0]
                                            break;
                                    }
                                }

                                translateResult[i] = {
                                    //翻译过的文本
                                    translateText: wordTranslate.trim() === "" ?translateText:wordTranslate,
                                    //翻译过的文本的音标
                                    translatePhoneticSymbol: {
                                        //翻译过的文本的音标
                                        translate:translatePhoneticSymbol[1],
                                        //原文的音标
                                        origin:translatePhoneticSymbol[0]
                                    },
                                    //翻译之前的原文
                                    originText: originText
                                }
                                resolve()
                            }catch(e){
                                reject()
                            }
                        })
                    })
                )
            }
            Promise.all(promiseQueue).then(function(){
                console.log("translateResult",translateResult)
                port.postMessage({status:"success",translateData:translateResult})
            }).catch(function(){
                //刷新TKK值
                Translator.refershGoogleTKK();
            })
        })
    }
})