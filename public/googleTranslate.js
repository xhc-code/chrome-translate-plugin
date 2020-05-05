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

    DOMUtils.extractDoms(selectContainer,selection,DOMUtils.extractExclude(host))

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

    static extractRanges(ranges,node,startOffset){
        let that = this,nodeValue = node.nodeValue,textRange=ranges.processing.o
        startOffset = startOffset || 0
        let r = that.matchPoint(nodeValue,startOffset)
        let result = r.result
        while(true) {
            if(result === null) break
            //offset基于1开始
            textRange.setEnd(node, r.re.lastIndex)
            ranges.processing.toEnd = false
            ranges.processing.isComplete = true
            ranges.array.push(ranges.processing)
            //设置新Range对象
            console.log("extractRanges",ranges,node)
            // startOffset = result.index + 1
            startOffset = r.re.lastIndex
            textRange = new Range()
            //offset基于0开始
            textRange.setStart(node,startOffset)
            ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}

            result = r.re.exec(nodeValue)
        }
    }

    static extractAfterEndNode(ranges,node,range){
        let textRange = ranges.processing.o
        if(!ranges.processing.isComplete && ranges.processing.toEnd){
            let endOffset = range.endOffset
            textRange.setEnd(node,endOffset)
            ranges.processing.toEnd = false
            ranges.processing.isComplete = true
            ranges.array.push(ranges.processing)
            ranges.processing = null
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
        debugger
        childNodes.forEach(function(node){
            let nodeType = node.nodeType
            if(Node.ELEMENT_NODE === nodeType){
                that.extractRangesByDom(node,ranges,constituency)
            }else if(Node.TEXT_NODE === nodeType){
                if(range.startContainer === range.endContainer){
                    let startOffset = range.startOffset
                    let textRange = new Range()
                    textRange.setStart(node,startOffset)
                    ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                    that.extractRanges(ranges,node,startOffset)
                    //结束最后的一个节点对象Range的End结束
                    that.extractAfterEndNode(ranges,node,range)
                }else if(node === range.startContainer){
                    let startOffset = range.startOffset
                    let textRange = new Range()
                    textRange.setStart(node,startOffset)
                    ranges.processing = {o:textRange,isComplete:false,toStart:false,toEnd:true}
                    that.extractRanges(ranges,node,startOffset)
                }else if(node === range.endContainer){
                    that.extractRanges(ranges,node)
                    //结束最后的一个节点对象Range的End结束
                    that.extractAfterEndNode(ranges,node,range)
                }else{
                    that.extractRanges(ranges,node)
                }
            }
        })
    }


    static matchPoint(text,startIndex){
        const regex = new RegExp(/\.\s/,"g")
        regex.lastIndex = startIndex || 0
        return {result:regex.exec(text),re:regex}
    }


    static extractDoms(dom,selection,exclude){
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
                        doms.push(...DOMUtils.extractDoms(ele,selection,exclude))
                    })
                    return doms;
                }
            }
        }
        doms.push(dom)
        return doms;
    }
}
