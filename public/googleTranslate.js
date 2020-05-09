console.log("谷歌翻译",window.document,document.body)




function translateDom(){
    let selection = window.getSelection();

    if(selection.isCollapsed || selection.rangeCount === 0){
        throw new Error("请选择文本再进行翻译");
    }

    let [host,pathname] = [window.location.host,window.location.pathname]

    let excludes = DOMUtils.getExclude(host)

    let elements = DOMUtils.extractTranslateDomsBySelection(null,selection,excludes)

    let allRanges = []
    elements.forEach(function(dom){
        // let ranges =  DOMUtils.extractRangesByDom(dom,selection);
        console.log("将要遍历的DOM: %s",dom,dom)
        let ranges =  DOMUtils.extractDomConvertRange(dom,selection);
        allRanges.push(...ranges.array)
    })

    allRanges.forEach(function(range,index){
        let text = range.o.toString()
        console.log("allRanges [%d]: %s",index,text)
    })

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
        let childNodes = dom.childNodes,constituency = selection
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
            console.log("选区的对象只是文本")
        }else{
            for(let i=0,node,nodeType,textRange,isLast=false;i<childNodes.length;i++){
                node = childNodes[i]
                isLast=(i===childNodes.length-1)
                nodeType = node.nodeType
                switch (nodeType) {
                    case Node.ELEMENT_NODE:
                        this.extractDomConvertRange(node,selection,ranges,deep,stateEvent)
                        break
                    case Node.TEXT_NODE:
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
                            this.findAllRangesByNode(ranges,node,0,deep ===1 && isLast)
                        }
                        break
                }
                if(stateEvent.isExit){
                    break
                }
            }
        }
        return ranges
    }

    /**
     * 提取Ranges
     * @param dom
     * @param startOffset
     * @param executeType 当前执行的节点所属类型：1开始节点/2结束节点/3正常(中间)节点
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
            ranges.array.push(ranges.processing)
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
        const regex = new RegExp(/\.(?:\s|\s?$)/,"g")
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
        //返回的结果元素数组
        elements = elements || []

        let range = selection.getRangeAt(0)
        if(dom === null){
            dom = range.commonAncestorContainer
        }

        if(dom === this.getOwnElement(range.startContainer) || dom === this.getOwnElement(range.endContainer)){
            elements.push(dom)
        }else{
            if(selection.containsNode(dom)){
                //完全包含节点
                elements.push(dom)
            }else if(selection.containsNode(dom,true) && Array.from(dom.childNodes).some(function(node){
                if(Node.TEXT_NODE === node.nodeType && node.nodeValue.trim().length>0){
                    return true
                }
            })){
                //半完全包含节点并且子节点等于1
                elements.push(dom)
            }else{
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
            }
        }
        return elements
    }

}
