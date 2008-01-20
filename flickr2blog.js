/*
 * FlickrToBlog - a bookmarklet to insert flickr photos into your blog
 * By MATSUOKA Kohei (http://www.machu.jp/diary/)
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */

// dynamic script loading
// (from http://d.hatena.ne.jp/amachang/20071116/1195202294 )
var load = function(src, check, next) {
  check = new Function('return !!(' + check + ')');
  if (!check()) {
    var script = document.createElement('script');
    script.src = src;
    document.documentElement.appendChild(script);
    setTimeout(function() {
      if (!check()) setTimeout(arguments.callee, 100);
      else next();
    }, 100);
  }
  else next();
};

// load jQuery library
load(flickrToBlogBaseUrl + 'lib/jquery-1.2.2.min.js', 'window.jQuery', function(){
// jQuery.fn.prevAll は jQuery1.1系には存在しない
// （jQuery1.1系が使われている場合は1.2系で上書きする）
load(flickrToBlogBaseUrl + 'lib/jquery-1.2.2.min.js', 'window.jQuery.fn.prevAll', function(){
jQuery.noConflict();

// load ThickBox library
(function() {
  var link = document.createElement('link');
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = flickrToBlogBaseUrl + "lib/thickbox.css";
  document.getElementsByTagName('head')[0].appendChild(link);
})();
load(flickrToBlogBaseUrl + 'lib/thickbox.js', 'window.tb_init', function(){
// ThickBox の初期化
imgLoader = new Image();
imgLoader.src = flickrToBlogBaseUrl + "lib/loadingAnimation.gif";


// flickrToBlog のメインオブジェクト
flickrToBlog = {
  // 初期設定: 画面の生成とユーザ情報の取得
  setup: function(userId, blogType, flickrClient) {
    this.userId = userId;
    this.blogType = blogType;
    this.flickrClient = flickrClient;
    this.showWindow();
    var method = 'flickr.people.getInfo';
    var params = { user_id: userId };
    this.flickrClient.call(method, params, function(data) {
      flickrToBlog.user = data.person;
      flickrToBlog.getRecentPhotos();
    });
  },

  // 最新の画像を取得する
  getRecentPhotos: function() {
    jQuery('#flickr_to_blog_loading').show();
    var method = 'flickr.people.getPublicPhotos';
    var params = {
      user_id: this.user.id,
      per_page: jQuery('#flickr_to_blog_photo_search_count').val()
    };
    this.flickrClient.call(method, params, function(data) {
      jQuery('#flickr_to_blog_loading').hide();
      flickrToBlog.photos = data.photos.photo;
      flickrToBlog.showWindow();
      flickrToBlog.window.updatePhotos(flickrToBlog.photos);
    });
  },

  // 画像を検索する
  searchPhotos: function() {
    jQuery('#flickr_to_blog_loading').show();
    var method = 'flickr.photos.search';
    var params = {
      user_id: this.user.id,
      text: jQuery('#flickr_to_blog_photo_search_text').val(),
      per_page: jQuery('#flickr_to_blog_photo_search_count').val()
    };
    this.flickrClient.call(method, params, function(data) {
      jQuery('#flickr_to_blog_loading').hide();
      flickrToBlog.photos = data.photos.photo;
      flickrToBlog.showWindow();
      flickrToBlog.window.updatePhotos(flickrToBlog.photos);
    });
  },

  // 画像を表示する
  showWindow: function() {
    if (!flickrToBlog.window.main) {
      flickrToBlog.window.create();
    }
    flickrToBlog.window.show();
  }
}

// 画像選択画面
flickrToBlog.window = {
  // 画像表示用のHTMLを生成する (この時点では非表示)
  create: function() {
    var main_id = 'flickr_to_blog';
    var photos_id = 'flickr_to_blog_photos';
    // メインウィンドウ
    this.main = jQuery('<div id="' + main_id + '">')
      .css({ display: "none" })
      .appendTo(jQuery('body'));
    // コントロール領域
    var control = jQuery('<div id="flickr_to_blog_control">')
      .appendTo(this.main);
    // 読み込み中のアイコン
    jQuery('<img id="flickr_to_blog_loading" src="' + imgLoader.src + '" />')
      .css({display: "none", float: "right", margin: "1em"})
      .appendTo(control);
    // 写真検索領域
    jQuery('<form id="flickr_to_blog_photo_search"></form>')
      // IEだとformは先にappendToでノードに含めないと反映されない
      .appendTo(control);
    jQuery('#flickr_to_blog_photo_search')
      .css({padding: "0.5em", borderBottom: "solid 1px #999"})
      .append('<input type="text" id="flickr_to_blog_photo_search_text"> ')
      .append('<button id="flickr_to_blog_photo_search_submit" type="submit">Search</button> ')
      .append('<select id="flickr_to_blog_photo_search_count"></select>')
      .submit(function() { flickrToBlog.searchPhotos();  return false; });
    // 検索結果の表示件数
    jQuery.each(["10", "20", "30", "40", "50"], function(i, count) {
      jQuery('<option>')
        .attr({value: count})
        .text(count)
        .appendTo('#flickr_to_blog_photo_search_count');
    });
    jQuery('#flickr_to_blog_photo_search_count')
      .css({width: "3em"})
      .val("10");
    // 写真サイズ選択領域
    var photoSize = jQuery('<div id="flickr_to_blog_photo_size">')
      .css({margin: "0.5em"})
      .append("photo size: ")
      .appendTo(control);
    jQuery.each(["square", "thumbnail", "small", "medium", "large"], function(i, size) {
      photoSize.append('<input type="radio" id="flickr_to_blog_photo_size_' + size + '" name="flickr_to_blog_photo_size" value="' + size + '">')
      .append('<label for="flickr_to_blog_photo_size_' + size + '">' + size + '</label> ');
    });
    // 写真表示領域
    this.photos = jQuery('<div id="' + photos_id + '">').appendTo(this.main);
    // IEだとtb_show()のタイミングでradioのcheckedが外れるので、
    // 選択内容を退避するためのフック
    jQuery('input[@name=flickr_to_blog_photo_size]').change(function() {
      flickrToBlog.window.photoSize = flickrToBlog.window.getPhotoSize();
    });
    // デフォルトはsmall
    flickrToBlog.window.photoSize = "small";
  },

  // 引数で受け取った画像を表示する
  updatePhotos: function(photos) {
    var main = this.main;
    var target = this.photos;
    this.show();
    target.children().remove();
    jQuery.each(photos, function(i, photo) {
      var srcUrl = flickrToBlog.flickrClient.photoUrl(photo, "square");
      var webUrl = flickrToBlog.flickrClient.webUrl(flickrToBlog.user, photo);
      flickrToBlog.image.create(photo, srcUrl, webUrl)
        .click(function() { flickrToBlog.window.hide() })
        .appendTo(target);
    });
  },

  // ブログへ挿入する写真のサイズを返す
  getPhotoSize: function() {
    return jQuery('input[@name=flickr_to_blog_photo_size]:checked').val();
  },

  // 写真選択画面を開く
  show: function() {
    tb_show('FlickrToBlog: insert flickr photos into your blog', '#TB_inline?inlineId=' + this.main.attr('id'), false);
    // IEだとなぜかtb_show()のタイミングでradioのcheckedが外れてしまうので
    // ここでもういちどcheckedをつけている
    jQuery('#flickr_to_blog_photo_size_' + this.photoSize).attr({checked: true});
  },

  // 写真選択画面を閉じる
  hide: function() {
    tb_remove();
  }
// end of flickrToBlog.window
};

flickrToBlog.image = {
  create: function(photo, srcUrl, webUrl) {
    var image = jQuery('<img>')
      .attr({src: srcUrl, rel: webUrl, title: photo.title})
      .css({margin: "2px", border: "solid 1px #999", cursor: "pointer"})
      .click(this.insertTextArea)
    image[0].photo = photo;
    return image;
  },

  // textarea に Flickr の画像へのリンクを挿入する
  insertTextArea: function() {
    var size = flickrToBlog.window.getPhotoSize();
    var srcUrl = flickrToBlog.flickrClient.photoUrl(this.photo, size);
    var webUrl = jQuery(this).attr('rel');
    var blog = flickrToBlog.blog[flickrToBlog.blogType];
    var textarea = blog.textarea();
    textarea.val(textarea.val() + blog.link(webUrl, srcUrl, this.photo, size) + "\n");
  }
// end of flickrToBlog.image
};

// ブログに挿入するリンク文字列を生成する
flickrToBlog.blog= {
  // HTML
  html: {
    link: function(webUrl, srcUrl, photo, size) {
      var img = '<img src="' + srcUrl + '" title="' + photo.title + '" alt="' +  photo.title + '" />';
      return '<a href="' + webUrl + '">' + img + '</a>';
    },
    textarea: function() {
      return jQuery('textarea:first');
    }
  },

  // はてなダイアリー
  hatena: {
    link: function(webUrl, srcUrl, photo, size) {
      return flickrToBlog.blog.html.link(webUrl, srcUrl, photo);
    },
    textarea: function() {
      return jQuery('#textarea-edit');
    }
  },

  // tDiary (Wikiスタイル)
  tdiary: {
    link: function(webUrl, srcUrl, photo, size) {
      tmp_photo = { title: photo.title.replace(/'/, "\\'") }
      return "{{'" + flickrToBlog.blog.html.link(webUrl, srcUrl, tmp_photo) + "'}}";
    },
    textarea: function() {
      return jQuery('textarea[@name=body]');
    }
  },

  // tDiary (Wikiスタイル＆flickrプラグイン)
  tdiary_plugin: {
    link: function(webUrl, srcUrl, photo, size) {
      return '{{flickr ' + photo.id  + ', "' + size + '"}}';
    },
    textarea: function() {
      return jQuery('textarea[@name=body]');
    }
  }
// end of flickrToBlog.blogging
};

/**
 * a Flickr API client for JavaScript
 */
flickrClient = function(apiKey) {
  this.baseUrl = 'http://api.flickr.com/services/rest/?';
  this.apiKey = apiKey;
}

flickrClient.prototype = {
  /**
   * return photo URL for this photo
   * @param {Object} photo
   * @param {String} size
   * @return
   */
  call: function(method, params, callback) {
    params = jQuery.extend({
      api_key: this.apiKey,
      method: method,
      format: 'json'
    }, params);
    jQuery.ajax({
      url: this.baseUrl + this.serialize(params),
      dataType: "jsonp",
      jsonp: "jsoncallback",
      success: function(data, textStatus) {
        if (data.stat != "ok") {
          alert('Sorry, failed to connect to Flickr server.');
          return;
        }
        callback(data);
      }
    });
  },

  /**
   * return photo URL for this photo
   * @param {Object} photo
   * @param {String} size
   * @return
   */
  photoUrl: function(photo, size) {
    if (typeof size == "undefined") {
      size = "small";
    }
    var url = "http://farm" + photo.farm + ".static.flickr.com/" + photo.server + "/" + photo.id + "_" + photo.secret;
    url += {
      square: "_s",
      thumbnail: "_t",
      small: "_m",
      medium: "",
      large: "_b"
    }[size];
    return url + ".jpg";
  },


  /**
   * return Flickr web URL for this photo
   * @param {Object} user
   * @param {Object} photo
   * @return
   */
  webUrl: function(user, photo) {
    return user.photosurl._content + photo.id;
  },

  /**
   * convert hash format parameter to query string
   * @param {Object} params
   * @return
   */
  serialize: function(params) {
    var query = [];
    jQuery.each(params, function(key, val){ query.push(key + "=" + val)});
    return query.join("&");
  }
// end of flickrToBlog.flickrClient
};

// flickrToBlog を起動
if (typeof flickrToBlogUserId != "undefined") {
  flickrToBlog.setup(flickrToBlogUserId, flickrToBlogBlogType,
    new flickrClient('4b83a2343636ac77751fb722a6988593'));
}

})})});
