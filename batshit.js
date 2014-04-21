var batshit = {};


// in-page routing

batshit.meta  = function (attr){
    var metas = document.getElementsByTagName('meta');
    for (var x=0,y=metas.length; x<y; x++) {
        if (metas[x].name == attr) return metas[x].content;
    }
};

batshit.parse_my_url = function(){
    var route = batshit.meta('route');
    var assignments = [];
    var regex = route.replace(/:(\w+)/, function(m) {
        console.log(m.slice(1));
        assignments.push(m.slice(1));
        return "(.*?)";
    });
    regex += "$";
    var base = window.location.pathname + window.location.search;
    var m = base.match(regex);
    if (!m) return alert('unrecognized path for: ' + route);
    console.log(m);
    for (var x=0; x<assignments.length; x++) window[assignments[x]] = m[x+1];
};



// building blocks

batshit.$ = function(x){
    if (x.on || x.addEventListener) return x;
    return (batshit.focus || document).querySelector(x);
};

batshit.on = function(el, ev, c){
    el = batshit.$(el);
    if (!batshit.focus) batshit.focus = document.body;
    if (!batshit.focus.unshow_fns) batshit.focus.unshow_fns = [];
    batshit.focus.unshow_fns.push(function(){ if (el.off) el.off(ev,c); else el.removeEventListener(ev,c); });
    if (el.on) el.on(ev, c); else el.addEventListener(ev, c);
};




// define some widgets

(function () {
    var $ = batshit.$, on = batshit.on;

    batshit.input = function(id, onchange){
        var el = $(id);
        on(el.form, 'submit', function(ev){ onchange(el.value); ev.preventDefault(); el.value = ''; return false; });
    };

    batshit.button = function(id, does){
        on(id, 'click', function (ev) { ev.preventDefault(); does(); return false; });
    };

    batshit.dataupload = function (id, cb) {
        on(id, 'change', function (ev) {
            var f = ev.target.files[0];
            var reader = new FileReader();
            reader.onload = function(e) { cb(e.target.result); };
            reader.readAsDataURL(f);
        });
    };
})();




// mikrotemplate

function mikrotemplate(el, obj_or_array, id_pfx){
    function decorate_element(el, json){
        var directives = el.getAttribute('data-set') ? el.getAttribute('data-set').split(' ') : [];
        directives.forEach(function(word){
            var parts = word.split(':');
            var attr = parts[0];
            var path = parts[1] || parts[0];
            if (attr == 'text')       el.innerHTML = json[path];
            else if (attr == 'value') el.value = json[path];
            else el.setAttribute(attr, json[path]);
        });
    }
    function decorate_subtree(el, json){
        el.data = json;
        decorate_element(el, json);
        var matches = el.querySelectorAll('[data-set]');
        for (var i = 0; i < matches.length; i++) decorate_element(matches[i], json);
    }
    if (!id_pfx) id_pfx = '';
    if (!obj_or_array) return;
    if (!obj_or_array.forEach) return decorate_subtree(el, obj_or_array);
    if (!mikrotemplate.templates) mikrotemplate.templates = {};
    if (!mikrotemplate.templates[el.id]) mikrotemplate.templates[el.id] = el.firstElementChild.cloneNode(true);
    el.innerHTML = "";
    obj_or_array.forEach(function(o){
        var clone = mikrotemplate.templates[el.id].cloneNode(true);
        clone.id = id_pfx + o.id;
        decorate_subtree(clone, o);
        el.appendChild(clone);
    });
}











// firebase stuff (flaming bat shit)

var F, facebook_id, facebook_name, current_user_id, on_auth, fb_auth;

batshit.setup_firebase = function () {
    if (!F) F = new Firebase(batshit.meta('firebase'));
};

batshit.authenticate = function (cb) {
    batshit.setup_firebase();
    window.on_auth_ready = cb;
    fb_auth = new FirebaseSimpleLogin(F, function(error, user) {
        if (error) return alert(error);
        if (user) {
            current_user_id = user.uid;
            facebook_id = user.id;
            facebook_name = user.displayName;
            F.child('users').child(user.uid).update({
                name: user.displayName,
                facebook_id: facebook_id
            });
        }
        if (window.on_auth_ready) window.on_auth_ready();
        window.auth_ready = true;
    });
};

batshit.please_login = function  () {
    alert('Please login with facebook to complete this action!');
    auth.login('facebook', { rememberMe: true });
};

function fb(){
    var args = Array.prototype.slice.call(arguments);
    var str = args.shift();
    var path = str.replace(/%/g, function(m){ return args.shift(); });
    return F.child(path);
}






Firebase.prototype.paint = function(el, calcfns){
    var ref = this;
    el = batshit.$(el);
    batshit.on(ref, 'value', function(snap){
        var o = snap.val() || {};
        if (calcfns) for (var k in calcfns) o[k] = calcfns[k](o);
        mikrotemplate(el, o);
    });
};


Firebase.prototype.paint_list = function(el, onclick, calcfns){
    function values(obj){
        if (!obj) return [];
        return Object.keys(obj).map(function(x){ obj[x].id = x; return obj[x]; });
    }

    var ref = this;
    el = batshit.$(el);
    batshit.on(ref, 'value', function(snap){
        var value = snap.val();
        var array = value ? values(value) : [];
        if (calcfns) array.forEach(function(o){
            for (var k in calcfns){
                o[k] = calcfns[k](o, function(v){
                    var item = document.getElementById(o.id);
                    o[k] = v;
                    mikrotemplate(item, o);
                });
            }
        });
        mikrotemplate(el, array);
        if (onclick) {
            var children = el.childNodes;
            for (var i = children.length - 1; i >= 0; i--) {
                children[i].onclick = function(ev){ onclick( this.data, ev, this ); };
            }
        }
    });
};
