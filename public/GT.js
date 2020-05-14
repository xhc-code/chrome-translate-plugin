class Translator{

    static googleTranslateVariable = null
    static uu = null

    static su(a) {
        return function() {
            return a
        }
    }
    static tu(a, b) {
        for (var c = 0; c < b.length - 2; c += 3) {
            var d = b.charAt(c + 2);
            d = "a" <= d ? d.charCodeAt(0) - 87 : Number(d);
            d = "+" == b.charAt(c + 1) ? a >>> d : a << d;
            a = "+" == b.charAt(c) ? a + d & 4294967295 : a ^ d
        }
        return a
    }
    static vu(a) {
        if (null !== this.uu)
            var b = this.uu;
        else {
            b = this.su(String.fromCharCode(84));
            var c = this.su(String.fromCharCode(75));
            b = [b(), b()];
            b[1] = c();
            b = (uu = window[b.join(c())] || "") || ""
        }
        var d = this.su(String.fromCharCode(116));
        c = this.su(String.fromCharCode(107));
        d = [d(), d()];
        d[1] = c();
        c = "&" + d.join("") + "=";
        d = b.split(".");
        b = Number(d[0]) || 0;
        for (var e = [], f = 0, g = 0; g < a.length; g++) {
            var k = a.charCodeAt(g);
            128 > k ? e[f++] = k : (2048 > k ? e[f++] = k >> 6 | 192 : (55296 == (k & 64512) && g + 1 < a.length && 56320 == (a.charCodeAt(g + 1) & 64512) ? (k = 65536 + ((k & 1023) << 10) + (a.charCodeAt(++g) & 1023),
                e[f++] = k >> 18 | 240,
                e[f++] = k >> 12 & 63 | 128) : e[f++] = k >> 12 | 224,
                e[f++] = k >> 6 & 63 | 128),
                e[f++] = k & 63 | 128)
        }
        a = b;
        for (f = 0; f < e.length; f++)
            a += e[f],
                a = this.tu(a, "+-a^+6");
        a = this.tu(a, "+-3^+b+-f");
        a ^= Number(d[1]) || 0;
        0 > a && (a = (a & 2147483647) + 2147483648);
        a %= 1E6;
        return c + (a.toString() + "." + (a ^ b))
    }

    static getGoogleTkValue(text){
        return this.vu(text)
    }

    static refershGoogleTKK(){
        let that = this
        let prefix_reg = /\s*\(function\(\)\{var mobileWebapp=/,suffix_reg = /\};\s?var\s+\w+=\{/
        $.getRequest("https://translate.google.cn/",null,function(){
            let document = this.response
            let scripts = Array.from(document.querySelectorAll("script"))
            scripts.forEach(function(script){
                let text = script.innerText
                let r = prefix_reg.exec(text)
                if(r !== null){
                    suffix_reg.lastIndex = r.lastIndex
                    let r1 = suffix_reg.exec(text)
                    if(r1 === null){
                        return false
                    }
                    let newStr = text.substring(r[0].length + r.index,r1.index+1)
                    that.googleTranslateVariable = Function("\"use strict\";return ".concat(newStr))()
                    that.uu = that.googleTranslateVariable.tkk
                }
            })
        },'document')

    }

}