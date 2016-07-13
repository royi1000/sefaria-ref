/**
 * Created by admin on 03/07/2016.
 */

if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
}

function check(hay, needle, from) {
    var i = 1;
    while (i < needle.length - 1) {
        if (hay[from] != needle[i])
            return false;
        i++;
        from++;
    }
    return true;
}

function FindWordIndex(str, findme) {
    var indices = [];
    var needle = findme.split(" ");
    var hay = str.split(" ");

    for (var i = 0; i < hay.length - needle.length; i++) {
        if (hay[i] == needle[0] && (needle.length==1||check(hay, needle, i)))
            indices.push(i);
    }
    return indices;
}

var ref_url = 'http://localhost:5000/';
var sef_url = 'http://www.sefaria.org/api/';
var ref_types = ["rt", "aramic", "location", "paragraph type", "biography", "beur"];
var he_ref_types = ["ראשי תיבות", "מילון ארמי", "מקום", "קטע", "ביוגרפיה", "ביאור קצר"];

//http://127.0.0.1:5000/refs?where={"ref_location":"Berakhot 2a"}&embedded={"link":1}
//http://127.0.0.1:5000/simple_refs?where={"words": "x" }
//http://127.0.0.1:5000/simple_refs?where={"words" : {"$in":["x",]}}&max_results=10000

function get_name(i) {
    if($.is_bavli) {
        d = 'a';
        if (i%2) {
            d = 'b';
        }
        return Math.floor(i/2+2).toString()+d;
    }
    else {
        return i+1;
    }

}

function load_suggested_refs(){
    u = ref_url+'simple_refs?max_results=100000&where={"single":false}';
    console.log(u);
    j={};
    $.ajax({
        type: "GET",
        url: u,
        data: '',
        dataType : 'json',
        contentType : 'application/x-www-form-urlencoded; charset=UTF-8',
        success: function (a,b,c) {
            console.log(a,b,c);
            $.suggestions = [];
            $.suggestions_count = 0;
            $.suggested_refs_to_page = a;
            $.each($.suggested_refs_to_page['_items'], function (i, v) {
                $.each(v['words'], function (i, w) {
                    arr = FindWordIndex($.content_str, w);
                    res_arr = [];
                    $.each(arr, function (i, wi) {
                        if (!((v['_id'] in $.existing_word_refs) && ($.existing_word_refs[v['_id']].indexOf(wi)>-1))){
                            res_arr.push(wi);
                        }
                    });
                    if (res_arr.length) {
                        $.suggestions.push([res_arr, v, w]);
                        $.suggestions_count += res_arr.length;
                    }
                });
            });
            $('#badge2').text($.suggestions_count);

        },
        error:function (a,b,c) {
            console.log(a,b,c);
        },
        headers : {
            'Content-Type' : 'application/json'
        }
    });
}

function load_page_refs() {
    $.reflink = {};
    u = ref_url+'refs?max_results=100000&where="ref_location"=="'+$.current_content+'"&embedded={"link":1}';
    console.log(u);
    j={};
    $.ajax({
        type: "GET",
        url: u,
        data: '',
        dataType : 'json',
        contentType : 'application/x-www-form-urlencoded; charset=UTF-8',
        success: function (a,b,c) {
            console.log(a,b,c);
            $.refs_to_page = a;
            $.existing_word_refs = {}
            $('#badge1').text('0');
            if ('_items' in $.refs_to_page){
                $('#badge1').text($.refs_to_page['_items'].length);
                var c_array = $.content_str.split(' ');
                $.each($.refs_to_page['_items'], function (i, v) {
                    var w = v['first_word'];
                    var count = v['words_count'];
                    if (!(v['link']['_id'] in $.existing_word_refs)) {
                        $.existing_word_refs[v['link']['_id']] = []
                    }
                    $.existing_word_refs[v['link']['_id']].push(w);
                    var all_w = c_array.slice(w,w+count).join(' ');
                    for (var j=0; j<count; j++) {
                        var ind = w+j;
                        var o = $('#w'+ind);
                        var refs = o.attr('refs');
                        if (!refs) {
                            refs = [];
                        }
                        else {
                            refs = refs.split(',');
                        }
                        o.addClass('reflink');
                        refs.push(v['link']['_id']);
                        o.attr('refs', refs.join(','));
                        $.reflink['w'+ ind + v['link']['_id']] = [v['link']['ref_type'], v['link']['content'], all_w];
                    }
                })
            }
        },
        error:function (a,b,c) {
            console.log(a,b,c);
        },
        headers : {
            'Content-Type' : 'application/json'
        }
    });
}

function update_content() {
    html_str = '';
    $.each($.content['he'], function (i,v) {
        html_str += v +' ';
        }
    );
    $.content_str = html_str.replace(/<\/?[^>]+(>|$)/g, "");
    new_str = '';
    $.each(html_str.split(' '), function (i, v) {
            if ((v.search('<') > -1) && (v.search('>') > -1)) {
                w = />[^<>]+</.exec(v)[0];
                w = w.substring(1, w.length - 1);
                s = '<span class="word" id="w{0}">{1}&nbsp;</span>'.format(i, w);
                v = v.replace(w, '{0}');
                new_str += v.format(s);
            }
        else {
                new_str += '<span class="word" id="w{0}">{1}&nbsp;</span>'.format(i, v);
            }
        }
    );
    $('.content').html(new_str);
    $('.content').mouseup(function () {
        cont_select();
    });
    $('#pagename').html($.current_content);
    load_page_refs();
    load_suggested_refs();
    setview(1);
}

function update_chaps() {
    form_string = '<div class="col-xs-2"><select class="chaps form-control">';
    selected = '';
    for(i=0;i<$.content['length'];i++){
        name = get_name(i);
        form_string += '<option value="{0}" {2}>{1}</option>'.format(name, name, selected);
    }
    form_string += '</select></div>';
    $('#chaps-h').html(form_string);
    $('.chaps').change(function () {
        ind = $(this).find('option:selected')[0].value;
        a = $.current_content.split(' ');
        a.pop();
        $.current_content = a.join(' ')+' '+ind;
        $.ajax({
            url: sef_url+'texts/'+$.current_content,
            jsonp: "callback",
            dataType: "jsonp",
            data: {
            },
            success: function( response ) {
                $.content = response;
                update_content();
            }
        });

    });
}

function get_first_chap() {
    $.ajax({
        url: sef_url+'texts/'+$.current_content,
        jsonp: "callback",
        dataType: "jsonp",
        data: {
        },
        success: function( response ) {
            $.content = response;
            update_chaps();
            update_content();
        }
    });

}

function get_ref(ref_id) {
    $.getJSON(ref_url, {}, function (data) {
            console.log(data['content']);
            var items = [];
            $.each( data, function( key, val ) {
                items.push( "<li id='" + key + "'>" + val + "</li>" );
            });

            $( "<ul/>", {
                "class": "my-new-list",
                html: items.join( "" )
            }).appendTo( "body" );
        }
    );

}

function suggest_next() {
    if($.suggestions_count<2){
        return;
    }
    $('.word').unbind( "click" );
    $('.word').removeClass('high');
    $.current_suggest = ($.current_suggest + 1) % $.suggestions.length;
    ref_suggest();
}

function suggest_prev() {
    if($.suggestions_count<2){
        return;
    }
    $('.word').unbind( "click" );
    $('.word').removeClass('high');
    $.current_suggest-=1;
    if ($.current_suggest < 0) {
        $.current_suggest = $.suggestions.length-1;
    }
    ref_suggest();
}

function ref_suggest() {
    if($.suggestions_count) {
        r = $.suggestions[$.current_suggest];
        r_len = r[2].split(' ').length;
        ref_str = '<em>'+ $.ref_type_dict[r[1]['ref_type']] +'</em><br/>' + r[1]['content'];
        $.each(r[0], function (i, v) {
            for(var j=0;j<r_len;j++){
                $('#w'+(v+j)).addClass('high');
                $('#w'+(v+j)).click(function () {
                    $.sel_start = v;
                    $.sel_end = v + r_len - 1;
                    linkref(r[1]['_id']);
                });
            }
        })
        $('.reftext').html('<a class="btn btn-default" onclick="suggest_next();">הבא</a> <a class="btn btn-default" onclick="suggest_prev();">הקודם</a>');
        $('#ref_elements').html(ref_str);
    }
}

function setview(v) {
    $.view = v;
    for(var i=1; i<4; i++) {
        if(i == v) {
            $('#view' + i).addClass('active');
        }
        else {
            $('#view' + i).removeClass('active')
        }
    }
    $(".reftext").html('');
    $("#choosed_text").html('');
    $("#ref_elements").html('');
    $('.word').unbind( "click" );
    $('.word').removeClass('high');
    if ($.view==1) {
        $('.word').click(function () {
            cont_click(this);
        });
    }
    if ($.view==3) {
        $.current_suggest=0;
        ref_suggest()
    }
}

function update_toc()
{
    level = 0;
    toc = $.toc;
    form_string ='<div class="row">';
    last_object = {'contents': toc};
    while ('contents' in last_object) {
        last_object_list = last_object['contents'];
        last_object = last_object_list[0];
        choose_ind = 0;
        if ($.toc_index.length > level) {
            choose_ind = $.toc_index[level];
            last_object = last_object_list[choose_ind];
        }
        else {
            $.toc_index[level] = 0;
        }
        form_string += '<div class="col-xs-2"><select class="opt form-control" name="toc{0}">'.format(level);
        $.each(last_object_list, function (i, v) {
            selected = '';

            if (choose_ind == i) {
                selected = 'selected';
            }
            name = ''
            if ('heCategory' in v){
                name = v['heCategory'];
            }
            else {
                name = v['heTitle'];
            }
            form_string += '<option value="{0}" {2}>{1}</option>'.format(i, name, selected);
        });
        form_string += '</select></div>';
        level += 1;
    }
    form_string += '<span id="chaps-h"></span></div>';
    first_section = last_object['firstSection'];
    $.last_object = last_object;
    $.current_content = last_object['firstSection'];
    $.is_bavli = false;
    if (first_section.split(" ").last() == '2a'){
        $.is_bavli = true;
    }

    $('#toc').html(form_string);
    $('.opt').change(function () {
        //console.log($(this).find('option:selected'));
        ind = parseInt($(this).find('option:selected')[0].value);
        l = parseInt($(this)[0].name.substring(3));
        $.toc_index = $.toc_index.slice(0,l+1);
        $.toc_index[l] = ind;
        update_toc();
    });

    get_first_chap();
}

function get_toc() {
    $.ajax({
        url: sef_url+'index',
        jsonp: "callback",
        dataType: "jsonp",
        data: {
        },
        success: function( response ) {
            $.toc = response;
            update_toc();
        }
    });
}

function linkref(id) {
    link_json = {
        'ref_location' : $.current_content,
        'first_word' : $.sel_start,
        'words_count': $.sel_end - $.sel_start + 1,
        'link': id
    };
    $.ajax({
        type: "POST",
        url: ref_url+'refs/',
        data: JSON.stringify(link_json),
        dataType : 'json',
        contentType : 'application/x-www-form-urlencoded; charset=UTF-8',
        success: function (a,b,c) {
            console.log(a,b,c);
        },
        error:function (a,b,c) {
            console.log(a,b,c);
        },
        headers : {
            'Content-Type' : 'application/json'
        }
    });
    console.log("create link ref");
}

function menucreateref(ref_type, content, words, single) {
    j = {
        'ref_type': ref_type,
        'content' : content,
        'words' : words,
        'single' : single
    };
    $.ajax({
        type: "POST",
        url: ref_url+'simple_refs/',
        data: JSON.stringify(j),
        dataType : 'json',
        contentType : 'application/x-www-form-urlencoded; charset=UTF-8',
        success: function (a,b,c) {
            linkref(a["_id"]);
            console.log(a,b,c);
        },
        error:function (a,b,c) {
            console.log(a,b,c);
        },
        headers : {
            'Content-Type' : 'application/json'
        }
    });
    console.log("create ref");
}

function createref() {
    menucreateref($('.reftype')[0].value, $('.reftextcontent')[0].value, [$('#choosed_text').text()], $('.uniqe')[0].checked)
    console.log("create ref");
}

function new_ref(start, end) {
    text = $.content_str.split(' ').slice(start, end+1).join(' ');
    $('#choosed_text').html(text);
    ref_str =  'סוג:' + '<div class="row"><div class="col-xs-4 pull-right" ><select class="reftype form-control">';
    $.each(ref_types, function (i, v) {
        ref_str += '<option value="{0}">{1}</option>'.format(v, he_ref_types[i]);
    });
    ref_str += '</select></div></div><br/>' + 'ייחודי:';
    ref_str += '<input type="checkbox" class="uniqe"></input><br/>' + 'תוכן:';
    ref_str += '<textarea class="reftextcontent form-control" style="width: 100%; height: 300px;"></textarea><br/>';
    ref_str += '<button onclick="createref()" class="btn btn-default"> יצירת קישור </button>';
    $('#ref_elements').html(ref_str);
}

function cont_click(t) {
    if ($.view != 1 || !$(t).attr('refs')) {
        return;
    }
    var local_refs = $(t).attr('refs').split(',');
    var ref_str = '';
    $.each(local_refs, function (i, v) {
        r = $.reflink[$(t).attr('id') + v];
        ref_str += '<em>{0}</em><br/><b>{1}:</b><br/>{2}<br/>'.format($.ref_type_dict[r[0]], r[2], r[1]);
    });
    $(".reftext").html(ref_str);
}

function cont_select() {
    if ($.view != 2) {
        return;
    }
    userSelection = window.getSelection();
    rangeObject = userSelection.getRangeAt(0);

    $.sel_start = parseInt(rangeObject.startContainer.parentNode.id.substring(1));
    $.sel_end = parseInt(rangeObject.endContainer.parentNode.id.substring(1));
    //console.log($.sel_start, $.sel_end-$.sel_start+1, rangeObject.startContainer.parentNode.textContent.replace(/\s/g, ''));
    new_ref($.sel_start, $.sel_end);
}

$( document ).ready(function() {
    $.toc_index = [3];
    $.ref_type_dict = {};
    $.each(ref_types, function (i, v) {
        $.ref_type_dict[v] = he_ref_types[i];
    });
    get_toc();
});