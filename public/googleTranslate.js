console.log("谷歌翻译",window.document,document.body)




function translateDom(){
    let selection = window.getSelection();

    if(selection.rangeCount>0){
        let rangeAt = selection.getRangeAt(0)
    }


    if(selection.isCollapsed){
        throw new Error("请选择文本再进行翻译");
    }

    let host = Window.location.host;
    let pathname = window.location.pathname

    let exclude = this.excludes[host]

    let selectContainer = rangeAt.commonAncestorContainer

    DOMUtils.extractDOM(selectContainer,selection,{})

}


class DOMUtils{
    static excludes = {
        "域名":{
            path:"子路径(匹配形式)",//前端给的路径匹配正则，应用排除元素选择器规则
            //带css表达式的排除规则
            excludeElementSelector:"span>a,em strong",
            //单个元素的排除规则
            excludeElementSelectors:["span","a","em","strong"]
        }
    };

    /**
     * 添加排除元素规则
     * 格式：
     *  {
     *      "域名":{
            path:"子路径(匹配形式)",//前端给的路径匹配正则，应用排除元素选择器规则
            //带css表达式的排除规则
            excludeElementSelector:"span>a,em strong",
            //单个元素的排除规则
            excludeElementSelectors:["span","a","em","strong"]
            }
     *  }
     * @param exclude
     */
    static addExclude(...exclude){
        this.excludes.push(exclude)
    }

    /**
     * 根据域名提取排除规则对象
     * @param host 域名
     */
    static extractExclude(host){
        let exclude = this.excludes[host];
        if(exclude){
            console.warn("%s 未包含在排除规则中",host)
            //保持兼容，返回空对象
            return {}
        }
        return JSON.parse(JSON.stringify(exclude))
    }

    function extractRanges(ranges,textRange,node,nodeValue,startOffset){
        let that = this
        startOffset = startOffset || 0
        let r = that.matchPoint(nodeValue,startOffset)
        let result = r.result
        while(true) {
            if(result!==null) {
                //offset基于1开始
                textRange.setEnd(node, r.re.lastIndex)
                ranges.processing.toEnd = false
                ranges.processing.isComplete = true
                ranges.array.push(ranges.processing)

                //设置新Range对象
                // startOffset = result.index + 1
                startOffset = r.re.lastIndex
                textRange = new Range()
                //offset基于0开始
                textRange.setStart(node,startOffset)
                ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
            }else{
                break
            }
            result = that.matchPoint(nodeValue,startOffset).result
        }
    }

    //最新版本
    /**
     * 提取指定dom里的以句号分隔的Ranges对象集合
     * @param dom 针对的根DOM元素
     * @param ranges 数组Ranges集合
     * @param constituency 选区的对象，保存DOM里的Selection和Range对象
     */
    static extractRangesByDom(dom,ranges,constituency) {
        let that = this
        // constituency选区的对象 ==> {selection:{},ranges:[range]}
        // Range==>{range:对象,isComplete:false,toStart:false,toEnd:true}
        ranges = Object.assign(ranges,{array:ranges.array || [],processing:ranges.processing || null})

        let childNodes =dom.childNodes
        let range = constituency.range
        childNodes.forEach(function(node){
            let nodeType = node.nodeType
            let nodeValue = node.nodeValue
            if(Node.ELEMENT_NODE === nodeType){
                that.extractRangesByDom(node,ranges,constituency)
            }else if(Node.TEXT_NODE === nodeType){
                if(node === range.startContainer){
                    let startOffset = range.startOffset
                    let textRange = new Range()
                    textRange.setStart(node,startOffset)
                    ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                    //====
                    let r = that.matchPoint(nodeValue,startOffset)
                    let result = r.result
                    while(true) {
                        if(result!==null) {
                            //offset基于1开始
                            textRange.setEnd(node, r.re.lastIndex)
                            ranges.processing.toEnd = false
                            ranges.processing.isComplete = true
                            ranges.array.push(ranges.processing)

                            //设置新Range对象
                            // startOffset = result.index + 1
                            startOffset = r.re.lastIndex
                            textRange = new Range()
                            //offset基于0开始
                            textRange.setStart(node,startOffset)
                            ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                        }else{
                            break
                        }
                        result = that.matchPoint(nodeValue,startOffset).result
                    }
                    //====
                }else if(node === range.endContainer){
                    let textRange = ranges.processing.o
                    let endOffset = range.endOffset
                    let startOffset
                    let r = that.matchPoint(nodeValue)
                    let result = r.result
                    while(true){
                        if(result !== null){
                            //offset基于1开始
                            textRange.setEnd(node, r.re.lastIndex)
                            ranges.processing.toEnd = false
                            ranges.processing.isComplete = true
                            ranges.array.push(ranges.processing)

                            //设置新Range对象
                            startOffset = r.re.lastIndex
                            textRange = new Range()
                            //offset基于0开始
                            textRange.setStart(node,startOffset)
                            ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                        }else{
                            break;
                        }
                        result = that.matchPoint(nodeValue,startOffset).result
                    }
                    //当未完成并且需要设置结束节点时进入
                    if(!ranges.processing.isComplete && ranges.processing.toEnd){
                        textRange.setEnd(node,endOffset)
                        ranges.processing.toEnd = false
                        ranges.processing.isComplete = true
                        ranges.array.push(ranges.processing)
                        ranges.processing = null
                    }
                }else{
                    let textRange = ranges.processing.o
                    //更换新的节点，从0开始
                    let startOffset
                    let r = that.matchPoint(nodeValue)
                    let result = r.result
                    while(true) {
                        if(result!==null) {
                            //offset基于1开始
                            textRange.setEnd(node, r.re.lastIndex)
                            ranges.processing.toEnd = false
                            ranges.processing.isComplete = true
                            ranges.array.push(ranges.processing)

                            //设置新Range对象
                            startOffset = r.re.lastIndex
                            textRange = new Range()
                            //offset基于0开始
                            textRange.setStart(node,startOffset)
                            ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                        }else{
                            break
                        }
                        result = that.matchPoint(nodeValue,startOffset).result
                    }
                }
            }
        })
        console.log("result",dom,ranges,constituency)

    }





    //第二个版本
    //// 函数名称_主版本_次版本_状态
    static findRanges_2_0_nucomplete(dom,selection,range,ranges,stateObject){
        //总的Ranges结果数组
        ranges = ranges || []
        //保存状态对象西悉尼，可在递归的时候进行判断
        stateObject = stateObject || {}

        let nodeType = dom.nodeType
        if(nodeType === Node.ELEMENT_NODE){
            let childNodes = dom.childNodes
            for(let i=0;i<childNodes.length;i++){
                this.findRanges(childNodes.item(i),selection,range,ranges, stateObject)
            }
        }else if(nodeType === Node.TEXT_NODE){
            let range = selection.getRangeAt(0)
            let nodeValue = dom.nodeValue
            if(range.startContainer === range.endContainer && range.startContainer === dom){
                let result=null,isStart=true;
                while((result = this.matchPoint(nodeValue)).result){
                    let domTextNode = dom
                    let startOffset = isStart ? range.startOffset:(isStart=false,result.re.lastIndex)
                    let endOffset = range.endOffset
                    let range = new Range()
                    range.setStart(domTextNode,startOffset)
                    range.setEnd(domTextNode,(result.result !== null ? result.result.index+1:endOffset))
                    ranges.push(range)
                }
            }else{
                //先开始，通过 stateObject 对象里的一个状态进行控制
                if(stateObject.injectStart && dom === range.startContainer) {
                    let startContainer = range.startContainer
                    let startOffset = range.startOffset

                    let range = new Range()
                    range.setStart(startContainer,startOffset)
                }
                //后结束
                if(stateObject.injectEnd && dom === range.endContainer){
                    //结束结点

                }

            }

        }

    }

    // 函数名称_主版本_次版本_状态
    static translateContent_1_0_nucomplete(dom,selection){
        let that = this;
        const nodeRanges = new Array();
        let childNodes = dom.childNodes;
        let range = selection.getRangeAt(0)

        for(let i=0,nextStartNote=null;i<childNodes.length;i++){
            let nodeElement = childNodes.item(i)

            let nodeType = nodeElement.nodeType
            if(nodeType === Node.ELEMENT_NODE){
                return that.translateContent(dom,selection)
            }else if(nodeType === Node.TEXT_NODE){
                if(range.startContainer === range.endContainer){
                    //当开始和结束节点是同一节点，代表从一个节点上搜索 英文句号  就可以了，否则，直接选中整个Range范围


                }else if(nodeElement === range.startContainer){
                    //开始节点
                    //设置开始节点
                    let startOffset = range.startOffset
                    let textStartRange = new Range()
                    textStartRange.setStart(nodeElement,startOffset)
                    //设置结束的节点,这里遍历节点开始寻找 英文的句号，设置Range对象
                    let endIndex=i+1
                    for(;endIndex < childNodes.length; endIndex++){
                        let endNode = childNodes.item(endIndex)
                        let result = that.setRangeEndNodeByPoint(endNode,textStartRange);
                        if(result.setState){
                            //设置下一个Range范围
                            nextStartNote = result
                            break;
                        }
                    }
                    //同步外层的 i 循环索引变量
                    i = endIndex
                    nodeRanges.push(textStartRange)
                }else if(nodeElement === range.endContainer){
                    //结束结点

                }else{
                    //普通节点的操作


                }
            }
        }

    }


    /**
     *
     * @param dom
     * @param range
     * @param parents 嵌套节点的所有父节点
     * @returns {{setState: boolean}|{nextStartOffset: *, nextStartNode: Node, hasNextNode: boolean, setState: boolean}|{setState: boolean}|{nextStartOffset: *, nextStartNode: TNode, hasNextNode: boolean, setState: boolean}}
     */
    static setRangeEndNodeByPoint(dom,range,parents){
        parents = parents || []
        let childNodes = dom.childNodes
        for(let i=0;i<childNodes.length;i++) {
            let nodeElement = childNodes.item(i)
            let nodeType = nodeElement.nodeType
            if(nodeType === Node.ELEMENT_NODE){
                parents.push({
                    currentDom:dom,
                    currentNodeArray:childNodes,
                    currentIndex:i
                })
                let result = this.setRangeEndNodeByPoint(nodeElement,range,parents)
                if(result.setState){
                    result.parents = parents
                    //深度
                    result.deep = parents.length
                    return result
                }
            }else if(nodeType === Node.TEXT_NODE) {
                let nodeValue = nodeElement.nodeValue
                let result = this.matchPoint(nodeValue).result
                if(result !== null){
                    let [,endPosition] = result
                    range.setEnd(nodeElement,endPosition)
                    return {
                        //设置操作的Range结束节点状态，True成功，false失败，需要切换下一个节点再调用此方法
                        setState:true,
                        //所属节点数据，currentNode在这个数组里存在
                        pertainNodeArray: childNodes,
                        currentNodeIndex: i,
                        currentNode:nodeElement,
                        hasPertainNodeArrayEnd: childNodes.length-1 === i,
                        //基于0开始的索引值;前提是当前文本未处于末尾，此属性才有用
                        nextStartOffset:endPosition+1,
                        //是否直接切换下一个节点，代表当前的结束位置已是此节点的末尾
                        hasNextNode: (nodeValue.length === endPosition+1)
                    }
                }
            }
        }
        return {setState:false}
    }

    static matchPoint(text,startIndex){
        const regex = new RegExp(/\.\s/,"g")
        regex.lastIndex = startIndex || 0
        return {result:regex.exec(text),re:regex}
    }



    static hasCurrentTextNode(){
        return this.hasTextNode(document.getSelection())
    }

    /**
     * 判断当前选区Selection的包容容器是否是 文本节点
     * @param selection
     * @returns {boolean}
     */
    static hasTextNode(selection) {
        if(!(selection instanceof Selection)){
            throw new ObjectTypeNotMatcher("对象类型不匹配")
        }
        let range = selection.getRangeAt(0)
        return range.commonAncestorContainer.nodeType === Node.TEXT_NODE
    }

    static extractDOM(dom,selection,exclude){
        let doms = []
        //选取的范围对象
        if(exclude){
            if(dom.childElementCount > 0){
                let childrens = Array.prototype.slice.call(dom.children);
                //过滤出只需要翻译的dom
                let translateElements = childrens.filter(
                    (ele)=> {
                        console.log("filter",selection,ele,selection.containsNode(ele,true))
                        if(!selection.containsNode(ele,true)) return false;
                        let nodeName = ele.nodeName.toLowerCase();
                        return !exclude.excludeElementSelectors.includes(nodeName)
                    })
                if(translateElements.length > 0){
                    console.log("进行遍历的的集合：",translateElements)
                    //提取出来要翻译的doms对象
                    translateElements.forEach((ele)=>{
                        doms.push(...DOMUtils.extractDOM(ele,selection,exclude))
                    })
                    return doms;
                }
            }
        }
        doms.push(dom)
        return doms;
    }
}


function ObjectTypeNotMatcher(message){
    this.message = message
}