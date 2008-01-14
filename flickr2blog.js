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
    document.body.appendChild(script);
    setTimeout(function() {
      if (!check()) setTimeout(arguments.callee, 100);
      else next();
    }, 100);
  }
  else next();
};

// load jQuery library
load(flickrToBlogBaseUrl + 'lib/jquery-1.2.1.min.js', 'window.jQuery', function(){
// jQuery.fn.prevAll は jQuery1.1系には存在しない
// （jQuery1.1系が使われている場合は1.2系で上書きする）
load(flickrToBlogBaseUrl + 'lib/jquery-1.2.1.min.js', 'window.jQuery.fn.prevAll', function(){
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
  setup: function(userId, blogType) {
    this.userId = userId;
    this.blogType = blogType;
    this.showWindow();
    this.flickrClient.peopleInfo(userId, function(person) {
      flickrToBlog.user = person;
      flickrToBlog.getRecentPhotos();
    });
  },

  // 最新の画像を取得する
  getRecentPhotos: function() {
    this.flickrClient.peoplePhotos(this.user.id, function(photos) {
      flickrToBlog.photos = photos.photo;
      flickrToBlog.showWindow();
      flickrToBlog.window.updatePhotos(flickrToBlog.photos);
    });
  },

  // 画像を検索する
  // TODO Searchボタンのclickと関連付け
  searchPhotos: function() {
    //this.flickrClient.searchPhotos(this.user.id, function(photos) {
    //  flickrToBlog.photos = photos;
    //});
    flickrToBlog.showWindow();
    flickrToBlog.window.updatePhotos(flickrToBlog.photos);
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
    // 写真サイズ選択領域
    var control = jQuery('<div id="flickr_to_blog_control">').text("photo size: ");
    // 写真表示領域
    this.photos = jQuery('<div id="' + photos_id + '">');
    // メインウィンドウ
    this.main = jQuery('<div id="' + main_id + '">')
      .css({ display: "none" })
      .append(control)
      .append(this.photos)
      .appendTo(jQuery('body'));
    jQuery.each(["square", "thumbnail", "small", "medium", "large"], function(i, size) {
      control.append('<input type="radio" id="flickr_to_blog_photo_size_' + size + '" name="flickr_to_blog_photo_size" value="' + size + '">')
      .append('<label for="flickr_to_blog_photo_size_' + size + '">' + size + '</label> ');
    });
    // IEだとtb_show()のタイミングでradioのcheckedが外れるので、
    // 選択内容を退避するためのフック
    jQuery('input[@name=flickr_to_blog_photo_size]').change(function() {
      flickrToBlog.window.photoSize = flickrToBlog.window.getPhotoSize();
    });
    // デフォルトはsmall
    flickrToBlog.window.photoSize = "small";
  },

  // 引数で受け取った画像を取得する
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
      var img = '<img src="' + srcUrl + '" title="' + photo.title + '">';
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

// Flickr API のクライアントライブラリ
flickrToBlog.flickrClient = {
  baseUrl: 'http://api.flickr.com/services/rest/?',
  apiKey:  '4b83a2343636ac77751fb722a6988593',

  // ユーザIDからユーザ情報を取得する
  peopleInfo: function(userId, callback) {
    var params = {
      api_key: this.apiKey,
      method: 'flickr.people.getInfo',
      user_id: userId,
      format: 'json'
    };
    this.item = params;
    var url = this.baseUrl + this.serialize(params);
    jQuery.ajax({
      url: url,
      dataType: "jsonp",
      jsonp: "jsoncallback",
      success: function(data, textStatus) {
        if (data.stat != "ok") {
          alert('Sorry, failed to connect to Flickr server.');
          return;
        }
        callback(data.person);
      }
    });
  },

  // ユーザIDから最近更新された写真を取得する
  peoplePhotos: function(userId, callback) {
    var params = {
      api_key: this.apiKey,
      method: 'flickr.people.getPublicPhotos',
      user_id: userId,
      per_page: 10,
      format: 'json'
    };
    var url = this.baseUrl + this.serialize(params);
    jQuery.ajax({
      url: url,
      dataType: "jsonp",
      jsonp: "jsoncallback",
      success: function(data, textStatus) {
        if (data.stat != "ok") {
          alert('Sorry, failed to connect to Flickr server.');
          return;
        }
        callback(data.photos);
      }
    });
  },

  // 写真ファイルのURLを返す
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

  // 写真のWebページのURLを返す
  webUrl: function(user, photo) {
    return user.photosurl._content + photo.id;
  },

  // ハッシュ形式のパラメータをクエリストリングに変換する
  // FIXME: フォームデータのシリアライズ
  serialize: function(params) {
    var query = [];
    jQuery.each(params, function(key, val){ query.push(key + "=" + val)});
    return query.join("&");
  }
// end of flickrToBlog.flickrClient
};

// flickrToBlog を起動
if (typeof flickrToBlogUserId != "undefined") {
  flickrToBlog.setup(flickrToBlogUserId, flickrToBlogBlogType);
}

})});
