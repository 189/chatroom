/**
 * cookie
 * Create by Kelvin Wang[kv.wang87@gmail.com]
 */

var Cookie = (function(){
    var doc = document,
        day = 24 * 60 * 60 * 1000,
        encode = encodeURIComponent,
        decode = decodeURIComponent;

    return {

        /**
         * Get a cookie with given name
         * @param  {[string]} name [cookie name]
         * @return {[string]}      [cookie value]
         * 
         */
        get:function (name) {
            var ret, m;
            if ( (m = doc.cookie.match(new RegExp('(?:^| )' + name + '(?:(?:=([^;]*))|;|$)'))) ) {
                ret = m[1] ? decode(m[1]) : '';
            }
            return ret;
        },

        /**
         * Set a cookie with a given name and value
         * @param {[string]}     name    [the name of cookie need to set]
         * @param {[string]}     val     [the value of this name in cookie ]
         * @param {[num|date]}   expires [expires time]
         * @param {[string]}     domain  [domain]
         * @param {[string]}     path    [set cookie path]
         * @param {[boolean]}    secure  [whether the cookie only can be sent to servers on https]
         */
        set:function (name, val, expires, domain, path, secure) {
            var text = encode(val), now = new Date();
            // 从当前时间开始，多少天后过期
            if (typeof expires === 'number') {
                now.setTime(now.getTime() + expires * day);
                text += '; expires=' + now.toUTCString();
            }
            // expiration date
            if (expires instanceof Date) {
                if(expires === 0){
                    text += ';';  //支持session cookie
                }else{
                    text += '; expires=' + now.toUTCString();
                }
            }

            // domain
            domain && (text += '; domain=' + domain);

            // path
            path && (text += '; path=' + path);

            // secure
            secure && (text += '; secure');

            doc.cookie = name + '=' + text;
        },

        /**
         * [remove a cookie]
         * @param  {[string]} name   [the name of cookie to remove]
         * @param  {[string]} domain [domain of the cookie]
         * @param  {[stirng]} path   [the cookie's path]
         * @param  {[string]} secure [the cookie's path]
         */
        remove:function (name, domain, path, secure) {
            this.set(name, '', -1, domain, path, secure);
        }
    };
})();
