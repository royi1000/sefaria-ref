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
var ref_url = 'http://localhost:5000/';
var sef_url = 'http://www.sefaria.org/api/';

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

function update_toc()
{
    level = 0;
    toc = $.toc;
    form_string ='';
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
        form_string += '<select class="opt" name="toc{0}">'.format(level);
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
        form_string += '</select>';
        level += 1;
    }
    $('#toc').html(form_string);
    $('.opt').change(function () {
        console.log($(this).find('option:selected'));
        ind = parseInt($(this).find('option:selected')[0].value);
        l = parseInt($(this)[0].name.substring(3));
        $.toc_index = $.toc_index.slice(0,l+1);
        $.toc_index[l] = ind;
        update_toc();
    });

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

$( document ).ready(function() {
    $.toc_index = [3];
    get_toc();
});