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





    static translateContent(dom,selection){
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
                let result = this.matchPoint(nodeValue)
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

    static matchPoint(text){
        const regex = new RegExp(/\.\s/,"g")
        return regex.exec(text)
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