console.log("谷歌翻译",window.document,document.body)


chrome.runtime.onMessage.addListener(function(data){
    if(data.eventOperate && data.eventOperate === "triggerTranslate"){
        translateDom()
    }
})

function translateDom(){
    let selection = window.getSelection();

    if(selection.isCollapsed || selection.rangeCount === 0){
        throw new Error("请选择文本再进行翻译");
    }

    let [host,pathname] = [window.location.host,window.location.pathname]

    let excludes = DOMUtils.getExclude(host)

    let elements = DOMUtils.extractTranslateDomsBySelection(null,selection,excludes)
    console.log("提取的DOMS:",elements)
    let allRanges = []
    elements.forEach(function(dom){
        let ranges =  DOMUtils.extractDomConvertRange(dom,selection);
        allRanges.push(...ranges.array)
    })

        console.log("搜索的结果，交给后台脚本处理",allRanges)
    let port = chrome.runtime.connect({name:"translateRanges"})
    port.postMessage({
        translateTexts:allRanges.map(function(range){
            return range.o.toString().trim()
        }),
        sl:"en",
        tl:"zh-CN"
    })
    port.onMessage.addListener(function(data){
        console.log("返回的结果",data)
        if(data.status === "success"){
            console.log("接受翻译的结果数据",data)
            let translateData = data.translateData
            allRanges.forEach(function(range,index){
                let ele = createTranslateNode(translateData[index].translateText)
                range.o.collapse()
                range.o.insertNode(ele)
            })
        }
    })
    //移除选区信息
    selection.removeAllRanges()
}

function createElement(node,text){
    let nodeElement = document.createElement(node),textNode = document.createTextNode(text)
    nodeElement.appendChild(textNode)
    return nodeElement
}

function createTranslateNode(text){
    let element = createElement("inline-translate",text);
    element.className = "translate"
    return element
}


class DOMUtils{
    static excludes = {
        //一个域名下有多个匹配规则
        "域名":[
            {
                path:"子路径(匹配形式)",//前端给的路径匹配正则，应用排除元素选择器规则，决定是否应用这个排除规则,正则表达式
                //带css选择器的排除规则，只能排除DOM，这个是根据DOM对象进行排除的
                excludeElementSelector:"span>a,em strong",
                //单个元素的排除规则，这个是根据标签名进行排除的
                excludeElementSelectors:["span","a","em","strong"]
            }
        ]
    };

    static excludeRuleMatchers(excludes,callback){
        excludes = excludes || []
        return excludes.some(function(exclude){
            callback(exclude)
        })
    }

    static findMatcherExcludes(key,path){
        let excludeRules = this.excludes[key]
        if(!excludeRules){
            excludeRules = []
        }
        let regExp,result = []
        excludeRules.forEach(function(exclude){
            if(exclude.path === null || exclude.path.trim() === ""){
                result.push(exclude)
            }else{
                regExp = new RegExp(exclude.path)
                if(regExp.test(path)){
                    result.push(exclude)
                }
            }
        })
        return result
    }
    /**
     * 设置排除元素规则
     * @parm key 域名
     * @param exclude
     */
    static setExclude(key,...exclude){
        this.excludes[key] = exclude
    }
    static addExclude(key,...exclude){
        this.excludes[key].push(...exclude)
    }

    /**
     * 根据域名提取排除规则对象
     * @param host 域名
     */
    static getExclude(host){
        let exclude = this.excludes[host];
        if(!exclude){
            console.info("%s 未包含在排除规则中",host)
            //保持兼容，返回空对象
            return [
                {
                    path:"",
                    excludeElementSelector:"",
                    excludeElementSelectors:[]
                }
            ]
        }
        return JSON.parse(JSON.stringify(exclude))
    }

    static extractDomConvertRange(dom,selection,ranges,deep,stateEvent){
        //元素节点不一定有文本节点，需要谨记
        let childNodes = dom.childNodes,
            constituency = selection
        //结构化初始数据-----开始
        if(selection instanceof Selection){
            constituency = {
                selection: selection,
                firstRange: selection.getRangeAt(0)
            }
        }
        stateEvent = stateEvent || {};
        ranges = ranges || []
        ranges.array = ranges.array || []
        ranges.processing = ranges.processing || null
        //递归层级，从1开始
        deep = (deep === undefined || deep === null)?1:++deep
        //结构化初始数据-----结束

        //选区索引为0的Range对象
        let range = constituency.firstRange
        let startContainer = range.startContainer,startOffset = range.startOffset
        let endContainer = range.endContainer,endOffset = range.endOffset
        if(startContainer === endContainer){
            //当开始和结束是同一节点时
            let textRange = new Range()
            //offset基于0开始
            textRange.setStart(startContainer,startOffset)
            ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
            this.findAllRangesByNode(ranges,startContainer,startOffset,false,true,endOffset)
            if(ranges.processing!==null && !ranges.processing.isComplete && ranges.processing.toEnd){
                ranges.processing.o.setEnd(endContainer, endOffset)
                ranges.processing.toEnd = false
                ranges.processing.isComplete = true
                ranges.array.push(ranges.processing)
                ranges.processing = null
            }
        }else{
            for(let i=0,node,nodeType,textRange,isLast=false;i<childNodes.length;i++){
                if(deep === 1){
                    stateEvent.isFirstLevelLastNode = (i===childNodes.length-1)
                }
                node = childNodes[i]
                if(node.nodeValue)
                isLast=(i===childNodes.length-1)
                nodeType = node.nodeType
                switch (nodeType) {
                    case Node.ELEMENT_NODE:
                        this.extractDomConvertRange(node,selection,ranges,deep,stateEvent)
                        break
                    case Node.TEXT_NODE:
                        /*能进到这里面进行判断的，应该都是 文本 节点*/
                        if(startContainer === node){
                            textRange = new Range()
                            //offset基于0开始
                            textRange.setStart(node,startOffset)
                            ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                            this.findAllRangesByNode(ranges,node,startOffset,isLast)
                        }else if(endContainer === node){
                            if(ranges.processing === null){
                                textRange = new Range()
                                //offset基于0开始
                                textRange.setStart(node,0)
                                ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                            }
                            //需要手动设置结束节点
                            this.findAllRangesByNode(ranges,node,null,false,true,endOffset)
                            if(ranges.processing!==null && !ranges.processing.isComplete && ranges.processing.toEnd){
                                ranges.processing.o.setEnd(node, endOffset)
                                ranges.processing.toEnd = false
                                ranges.processing.isComplete = true
                                ranges.array.push(ranges.processing)
                                ranges.processing = null
                                //退出循环信号
                                stateEvent.isExit = true
                            }
                        }else{
                            if(ranges.processing === null){
                                textRange = new Range()
                                //offset基于0开始
                                textRange.setStart(node,0)
                                ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                            }
                            // isLoastNode 代表层级是首层并且是集合中最后一个元素
                            this.findAllRangesByNode(ranges,node,0,stateEvent.isFirstLevelLastNode)
                            //当是第一层循环的最后一个子节点时，就说明这是最后一个元素，这里该进行关闭操作
                            if(stateEvent.isFirstLevelLastNode && isLast && ranges.processing!==null && !ranges.processing.isComplete && ranges.processing.toEnd) {
                                let middleRange = new Range()
                                middleRange.selectNodeContents(node)
                                ranges.processing.o.setEnd(node, middleRange.endOffset)
                                ranges.processing.toEnd = false
                                ranges.processing.isComplete = true
                                ranges.array.push(ranges.processing)
                                ranges.processing = null
                            }

                        }
                        break
                }
                if(stateEvent.isExit){
                    break
                }
            }
        }
        //紧急措施，当第一层循环遍历完，还有未结束的Range范围时，需要从Ranges正在处理的Range对象上提取结束容器和偏移值，并且把文本的end节点进行设置到这一个节点中
        //能到这里，就说明这里再不处理，就有可能丢掉一个Range范围
        if(stateEvent.isFirstLevelLastNode && ranges.processing!==null && !ranges.processing.isComplete && ranges.processing.toEnd){
            let middleRange = new Range()
            middleRange.selectNodeContents(ranges.processing.o.endContainer)
            ranges.processing.o.setEnd(ranges.processing.o.endContainer,middleRange.endOffset)
            ranges.processing.toEnd = false
            ranges.processing.isComplete = true
            ranges.array.push(ranges.processing)
            ranges.processing = null
        }
        return ranges
    }


    /**
     * 根据node提取Ranges对象
     * @param ranges
     * @param node DOM对象
     * @param startOffset
     * @param isLastNode 是否是集合中的最后一个节点
     * @param isEndNode 是否是Range选区对象的EndContainer对象
     * @param endOffset 选区Range对象的endOffset值
     */
    static findAllRangesByNode(ranges,node,startOffset,isLastNode,isEndNode,endOffset){
        startOffset = startOffset || 0
        let nodeValue = node.nodeValue,
            r = this.matchPoint(nodeValue,startOffset),
            result = r.result,
            textRange=ranges.processing.o

        if(result === null && isLastNode){
            let middleRange = new Range()
            middleRange.selectNodeContents(node)
            textRange.setEnd(node, middleRange.endOffset)
            ranges.processing.toEnd = false
            ranges.processing.isComplete = true
            //判断这个Range对象的选区信息不是 空字符串，是空字符串则舍弃，否则push到结果集合中
            if(textRange.toString().trim() !== ""){
                ranges.array.push(ranges.processing)
            }
            ranges.processing = null
        }else{
            while(result !== null){
                startOffset = r.re.lastIndex
                if(isEndNode){
                    //是 【结束节点】 需要额外判断是否超出 选区的结束范围，则break退出
                    if(startOffset >= endOffset){
                        break
                    }
                }
                //设置新Range对象
                textRange.setEnd(node, startOffset)
                ranges.processing.toEnd = false
                ranges.processing.isComplete = true
                ranges.array.push(ranges.processing)
                ranges.processing = null

                //判断当前节点值是否还可以找到 “点” 的索引
                result = r.re.exec(nodeValue)
                if(result === null && isLastNode){
                    break;
                }
                textRange = new Range()
                //offset基于0开始
                textRange.setStart(node,startOffset)
                ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
            }
        }

    }

    static matchPoint(text,startIndex){
        const regex = new RegExp(/(?:\.(?:\s|\s?$))|(:\s*$)/,"g")
        regex.lastIndex = startIndex || 0
        return {result:regex.exec(text),re:regex}
    }

    static getOwnElement(dom){
        if(Node.ELEMENT_NODE === dom.nodeType){
            return dom
        }
        let parentElement = dom.parentElement
        return this.getOwnElement(parentElement)
    }


    /**
     * 捕获方式进行遍历出选区的DOM对象
     * @param dom
     * @param selection
     * @param exclude
     * @param elements
     * @returns {*}
     */
    static extractTranslateDomsBySelection(dom,selection,excludes,elements){

        if(dom !== null && dom.nodeType === Node.TEXT_NODE && dom.nodeValue.trim().length === 0) {
            return
        }
        let that = this
        //返回的结果元素数组
        elements = elements || []

        let range = selection.getRangeAt(0)
        if(dom === null){
            dom = range.commonAncestorContainer
        }
        //开始和结束节点等于当前dom，则直接push到结果集合中(elements)  , 或者是文本节点，直接进入
        if((dom === range.startContainer || dom === range.endContainer)){
            elements.push(dom)
        }else if(selection.containsNode(dom,true)){
            let nodes = Array.from(dom.childNodes);
            // 判断子节点是否大于0并且判断当前当前dom的子节点集合是否存在 文本 节点，如果存在则直接push到结果(elements)中
            if((nodes.length>0 && nodes.some(function(node){
                // 当为文本节点并且有值的时候，则返回true，代表存入最终的DOM中
                if(selection.containsNode(node,true) && Node.TEXT_NODE === node.nodeType && node.nodeValue.trim().length>0){
                    return true
                }
                return false
            }))){
                // push到结果集合中
                elements.push(dom)
            }else{
                //遍历元素
                let childrens = Array.from(dom.children)
                childrens.forEach(function(dom){
                    if(selection.containsNode(dom,true)){
                        that.extractTranslateDomsBySelection(dom,selection,excludes,elements)
                    }
                })
            }
        }/*else{
            console.log("else",dom)
            let children = dom.children
            if(children.length>0){
                for(let i=0;i<children.length;i++){
                    let dom = children.item(i)
                    let nodeName = dom.nodeName
                    if(dom.nodeType === Node.ELEMENT_NODE && this.excludeRuleMatchers(excludes,function(exclude){
                        exclude.excludeElementSelectors.includes(nodeName.toLowerCase())
                    })){
                        continue
                    }

                    //当此节点被部分包含选中的范围
                    if(selection.containsNode(dom,true)){
                        this.extractTranslateDomsBySelection(dom,selection,excludes,elements)
                    }
                }
            }
        }*/
        return elements
    }


}


function testExtractTranslateDomsBySelection(){
    let selection = window.getSelection();

    if(selection.isCollapsed || selection.rangeCount === 0){
        throw new Error("请选择文本再进行翻译");
    }

    let [host,pathname] = [window.location.host,window.location.pathname]

    let excludes = DOMUtils.getExclude(host)

    let elements = DOMUtils.extractTranslateDomsBySelection(null,selection,excludes)
    console.log("test:",elements)
}
