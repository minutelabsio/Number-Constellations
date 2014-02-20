// doT.js
// 2011, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.

(function(){function encodeHTMLSource(){var e={"&":"&#38;","<":"&#60;",">":"&#62;",'"':"&#34;","'":"&#39;","/":"&#47;"},t=/&(?!#?\w+;)|<|>|"|'|\//g;return function(){return this?this.replace(t,function(t){return e[t]||t}):this}}function resolveDefs(e,t,n){return(typeof t=="string"?t:t.toString()).replace(e.define||skip,function(t,r,i,s){return r.indexOf("def.")===0&&(r=r.substring(4)),r in n||(i===":"?(e.defineParams&&s.replace(e.defineParams,function(e,t,i){n[r]={arg:t,text:i}}),r in n||(n[r]=s)):(new Function("def","def['"+r+"']="+s))(n)),""}).replace(e.use||skip,function(t,r){e.useParams&&(r=r.replace(e.useParams,function(e,t,r,i){if(n[r]&&n[r].arg&&i){var s=(r+":"+i).replace(/'|\\/g,"_");return n.__exp=n.__exp||{},n.__exp[s]=n[r].text.replace(new RegExp("(^|[^\\w$])"+n[r].arg+"([^\\w$])","g"),"$1"+i+"$2"),t+"def.__exp['"+s+"']"}}));var i=(new Function("def","return "+r))(n);return i?resolveDefs(e,i,n):i})}function unescape(e){return e.replace(/\\('|\\)/g,"$1").replace(/[\r\t\n]/g," ")}var doT={version:"1.0.1",templateSettings:{evaluate:/\{\{([\s\S]+?(\}?)+)\}\}/g,interpolate:/\{\{=([\s\S]+?)\}\}/g,encode:/\{\{!([\s\S]+?)\}\}/g,use:/\{\{#([\s\S]+?)\}\}/g,useParams:/(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,define:/\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,defineParams:/^\s*([\w$]+):([\s\S]+)/,conditional:/\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,iterate:/\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,varname:"it",strip:!0,append:!0,selfcontained:!1},template:undefined,compile:undefined},global;typeof module!="undefined"&&module.exports?module.exports=doT:typeof define=="function"&&define.amd?define([],function(){return doT}):(global=function(){return this||(0,eval)("this")}(),global.doT=doT),String.prototype.encodeHTML=encodeHTMLSource();var startend={append:{start:"'+(",end:")+'",endencode:"||'').toString().encodeHTML()+'"},split:{start:"';out+=(",end:");out+='",endencode:"||'').toString().encodeHTML();out+='"}},skip=/$^/;doT.template=function(e,t,n){t=t||doT.templateSettings;var r=t.append?startend.append:startend.split,i,s=0,o,u=t.use||t.define?resolveDefs(t,e,n||{}):e;u=("var out='"+(t.strip?u.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g," ").replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,""):u).replace(/'|\\/g,"\\$&").replace(t.interpolate||skip,function(e,t){return r.start+unescape(t)+r.end}).replace(t.encode||skip,function(e,t){return i=!0,r.start+unescape(t)+r.endencode}).replace(t.conditional||skip,function(e,t,n){return t?n?"';}else if("+unescape(n)+"){out+='":"';}else{out+='":n?"';if("+unescape(n)+"){out+='":"';}out+='"}).replace(t.iterate||skip,function(e,t,n,r){return t?(s+=1,o=r||"i"+s,t=unescape(t),"';var arr"+s+"="+t+";if(arr"+s+"){var "+n+","+o+"=-1,l"+s+"=arr"+s+".length-1;while("+o+"<l"+s+"){"+n+"=arr"+s+"["+o+"+=1];out+='"):"';} } out+='"}).replace(t.evaluate||skip,function(e,t){return"';"+unescape(t)+"out+='"})+"';return out;").replace(/\n/g,"\\n").replace(/\t/g,"\\t").replace(/\r/g,"\\r").replace(/(\s|;|\}|^|\{)out\+='';/g,"$1").replace(/\+''/g,"").replace(/(\s|;|\}|^|\{)out\+=''\+/g,"$1out+="),i&&t.selfcontained&&(u="String.prototype.encodeHTML=("+encodeHTMLSource.toString()+"());"+u);try{return new Function(t.varname,u)}catch(a){throw typeof console!="undefined"&&console.log("Could not create a template function: "+u),a}},doT.compile=function(e,t){return doT.template(e,null,t)}})();