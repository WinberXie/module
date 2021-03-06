var require;
/* eslint-disable no-unused-vars */
var define;

(function(global) {

    // 避免重复加载而导致已定义模块丢失
    if (require) {
        return;
    }
    
    // localstorage/cookie相关操作
    var lsUtil = (function() {
        
        var COOKIE_NAME = 'isLsForbidden';
        var COOKIE_VALUE = 'y';
        
        
        // 放弃缓存，因为后续任何localstorage.set/get都可能触发forbidLs()
        var isLsForbidden = function() {
            //cookie中的数据都是以分号加空格区分开
            var arr = document.cookie.split("; ");
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].split("=")[0] == COOKIE_NAME) {
                    return arr[i].split("=")[1];
                }
            }
            //未找到对应的cookie则返回空字符串
            return '';
        };
        
        
        // 当本地localStorage抛出异常时设置cookie标识此时使用script标签请求依赖内容
        var forbidLs = function() {
            var oDate = new Date();
            oDate.setTime(oDate.getTime() + 24 * 60 * 60 * 1000);
            document.cookie = COOKIE_NAME + '=' + COOKIE_VALUE + ';expires=' + oDate.toGMTString();
        };
            
        
        // 探测浏览器是否支持localStorage
        var isLsSupport = (function() {
            var flag = null,    // 
                key = "jr8_ls_detect";
            
            return function() {
                if(flag === null) {
                    try {
                        flag = (window.localStorage.setItem(key, 1), 
                                window.localStorage.getItem(key), 
                                window.localStorage.removeItem(key), 
                                1);
                    } catch (e) {
                        flag = 0;
                    }
                }
                return flag;
            };
        })();
        
        
        // localstorage出错
        var lsError = function(url) {
            forbidLs();

            if (url) {
                var isOnline = url.indexOf(CND_PREFIX) > -1,
                    index,
                    key;
                if(isOnline) {
                    index = url.lastIndexOf('_') == -1 ? url.lastIndexOf('-') : url.lastIndexOf('_');
                    key = url.substring(0, index) + '.js'; //本地缓存中的key值
                } else {
                    key = url;
                }
                        
                lsUtil.remLsContent(key);
            } else {
                try {
                    window.localStorage.clear();
                } catch (e) {
                    // 忽略
                }
            }

            window.location.href = window.location.href;
        };
        
        
        // 获取本地缓存值
        var getLsContent = function(key) {
            try {
                return window.localStorage.getItem(key);
            } catch (e) {
                lsError();
            }
        };
              
        // 删除
        var remLsContent = function(key) {
            try {
                return window.localStorage.removeItem(key);
            } catch (e) {
                lsError();
            }
        };
               
        // 将数据缓存到本地
        var setLsContent = function(key, value) {
            try {
                window.localStorage.setItem(key, value);
            } catch (e) {
                lsError();
            }
        };
            
        // 判断本地缓存是否存在
        var doesLsHave = function(key) {
            try {
                return window.localStorage.hasOwnProperty(key);
            } catch (e) {
                lsError();
            }
        };
        
        
        return {
            isLsForbidden: isLsForbidden,
            
            lsError: lsError,
            
            doesLsHave: doesLsHave,
            getLsContent: getLsContent,
            setLsContent: setLsContent,
            remLsContent: remLsContent,
            
            isLsSupport: isLsSupport
        }
        
    }());
    
    
    var factoryMap = {},
        modulesMap = {},
        scriptsMap = {},      
        // 当前已加载的module
        loadedModsCount = 0,
        // 全部module个数
        totalModsCount,       
        // 最后一个js文件，需要手动执行require
        theLastJsUrl,
        // 最后一个js文件所对应的模块名，手动执行require时需要指定
        theLastJsModName,      
        // 所有module name
        modNameArray = [],
        // 所有module name 对应的url
        modNameMap = {},
        // 本地失效或者缓存没有的需要combo请求拉取的url
        fetchArray = [];
       
    var C_RES_MAP = 'res_map';
    var C_VER_DEV = 'dev';
    var CND_PREFIX = ''; //cdn前缀地址

       
    // 获取本地缓存的版本及长度对象，用于校验本地缓存中的数据是否可信
    var resMap = (function() {
        
        if ( !lsUtil.isLsSupport() || lsUtil.isLsForbidden() )
            return {};
        
        if ( lsUtil.doesLsHave(C_RES_MAP) ) {
            try {
                return JSON.parse( lsUtil.getLsContent(C_RES_MAP) );
            } catch (e) {
                lsUtil.remLsContent(C_RES_MAP);
            }
        }
        
        return {};
    })();
    
      
    var jsExecuted = function(url) {
     
        if ( url==theLastJsUrl && !theLastJsModName ) {
            theLastJsModName = modNameArray[modNameArray.length - 1];
        }

        modNameMap[modNameArray[modNameArray.length - 1]] = url;

        loadedModsCount++;
                
        // -------------------------------
        // 当所有模块加载完成后手动触发当前的业务逻辑代码
        // -------------------------------
        
        if ( !(loadedModsCount == totalModsCount && theLastJsModName) ) return;

        // 存入长度对象，并将版本号存储进去
        lsUtil.setLsContent(C_RES_MAP, JSON.stringify(resMap));

        require([theLastJsModName], function(app) {
            try {
                app();
            } catch (e) {

                if (!lsUtil.isLsSupport() || lsUtil.isLsForbidden()) {
                    throw new Error(e);
                }

                lsUtil.lsError(modNameMap[theLastJsModName]);
            }
        });
    }

    //eval fetch过来的代码
    var getEval = function (url, scriptText) {     
        var isOnline = url.indexOf(CND_PREFIX) > -1,
            index,
            key,
            version;
        if(isOnline) {
            index = url.lastIndexOf('_') == -1 ? url.lastIndexOf('-') : url.lastIndexOf('_');
            key = url.substring(0, index) + '.js'; //本地缓存中的key值
            version = url.substring(index + 1, url.lastIndexOf('.js'));
        } else {
            key = url;
            version = C_VER_DEV;
        }
        
        eval(scriptText + '\n //# sourceURL=' + url.replace(CND_PREFIX, ''));

        resMap[key] = {
            l: scriptText.length,
            v: version,
            d: new Date().getTime(),
            c: 0
        };

        lsUtil.setLsContent(key, scriptText);
        
    };
       

    var createScript = function(url, onerror) {

        if (url in scriptsMap) {
            return;
        }

        scriptsMap[url] = true;

        // 当浏览器不支持ls或者本地的ls不可用
        if ( !lsUtil.isLsSupport() || lsUtil.isLsForbidden() ) {
            noLs(url, onerror);
            return;
        }

        var isOnline = url.indexOf(CND_PREFIX) > -1,
            index,
            key,
            version;
        if(isOnline) {
            index = url.lastIndexOf('_') == -1 ? url.lastIndexOf('-') : url.lastIndexOf('_');
            key = url.substring(0, index) + '.js'; //本地缓存中的key值
            version = url.substring(index + 1, url.lastIndexOf('.js'));
        } else {
            key = url;
            version = C_VER_DEV;
        }
        
        // 开发模式
        if (version == C_VER_DEV) {
            noLs(url, onerror);
            return;
        }

        // 本地ls无缓冲
        if(!lsUtil.doesLsHave(key)) {
            fetchCombo(url);
            return;
        }


        //本地resmap
        if(!resMap[key] || !resMap[key]['v']) {
            fetchCombo(url);
            return; 
        }

        var scriptText = lsUtil.getLsContent(key);

        // 本地ls失效
        if(resMap[key]['l'] != scriptText.length || resMap[key]['v'] != version){
            fetchCombo(url);
            return;
        }

        // 本地ls有效
        try {
            var count = resMap[key]['c'] + 1;

            eval(scriptText + '\n //# sourceURL=' + url.replace(CND_PREFIX, ''));
            
            resMap[key]['c'] = count;
            
            jsExecuted(url);
            
            fetchCombo();
        } catch (e) {
            fetchCombo(url);
        }
    };
    
      
    var noLs = function(url, onerror) {
        
        var script = document.createElement('script');

        var onload = function() {
            jsExecuted(url);
        };
        
        script.onload = onload;
        script.onerror = onerror;
        script.type = 'text/javascript';
        script.src = url;
        script.setAttribute('async','async');

        document.body.appendChild(script);
    };


    var fetchCombo = function(item) {

        item && fetchArray.push(item);

        var length = fetchArray.length;

        if (!(loadedModsCount + length == totalModsCount && length)) {
            return;
        }

        for (var i = 0, n = fetchArray.length; i < n; i++) {
            fetchArray[i] = fetchArray[i].replace(require.baseUrl, '');
            fetchArray[i] = fetchArray[i].replace(CND_PREFIX, '');
        }

        var url = require.baseUrl + fetchArray.join(','),
            request = new XMLHttpRequest();

        request.open('GET', url, true);

        request.onload = function() {
            var responseText = request.responseText,
                array = responseText.split('\n/*==content==*/\n');

            for (var i = 0, n = array.length; i < n; i++) {
                var scriptText = array[i];
                getEval(fetchArray[i], scriptText);
                jsExecuted(fetchArray[i]);
            }
        }

        request.send();
    };


    define = function(id, factory) {
        
        id = require.alias(id);
        
        factoryMap[id] = factory;

        modNameArray.push(id);
    };
    
    
    require = function(id, flag) {

        // compatible with require([dep, dep2...]) syntax.
        if (id && id.splice) {

            totalModsCount = id.length;

            theLastJsUrl = id[totalModsCount - 1];

            return require.async.apply(this, arguments);
        }

        id = require.alias(id);

        var mod = modulesMap[id];

        if (mod) {
            return mod.exports;
        }

        // init module
        var factory = factoryMap[id];

        if (!factory) {
            throw '[ModJS] Cannot find module `' + id + '`';
        }

        mod = modulesMap[id] = {
            exports: {}
        };
        var ret;

        try {
            ret = (typeof factory === 'function') ? factory.apply(mod, [require, mod.exports, mod]) : factory;
        } catch (e) {

            if (!lsUtil.isLsSupport() || lsUtil.isLsForbidden()) {
                throw new Error(e);
            }

            lsUtil.lsError(modNameMap[id]);
        }

        if (ret) {
            mod.exports = ret;
        }

        if (mod.exports && !mod.exports['default']) {
            mod.exports['default'] = mod.exports;
        }

        return mod.exports;
    };
    
    
    require.async = function(names, onload, onerror) {

        if (typeof names === 'string') {
            names = [names];
        }

        function updateNeed() {

            var args = [];

            for (var i = 0, n = names.length; i < n; i++) {
                args[i] = require(names[i]);
            }

            onload && onload.apply(global, args);

        }

        if (onload) {
            updateNeed();
            return;
        }

        for (var i = 0, n = names.length; i < n; i++) {
            createScript(names[i], onerror && function() {
                onerror(names[i]);
            });

        }
    };
    
    require.alias = function(id) {
        return id.replace(/\.js$/i, '');
    };

})(this);


require.baseUrl = ''; //支持跨域的静态资源服务器地址
