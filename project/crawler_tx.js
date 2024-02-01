var myRequest = require('request');
var myCheerio = require('cheerio');
var myIconv = require('iconv-lite');
var mysql = require('./mysql.js');

var source_name = "腾讯体育";
var myEncoding = "utf-8";
var seedURL = "https://sports.qq.com/";

// 将要爬取数据的格式（通过检页面源代码获得）
var seedURL_format = "$('a')";
var title_format = "$('.title .txt.J_bcTitle').text()";
var content_format = "$('.content').text()";
var keywords_format = "$('.detail .group.l span').text()";
var date_format = "$('.detail .txt').text()";
var author_format = "$('.detail .name.l').text()";
var url_reg = /\/post.htm/;
var regExp = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;

// 防止网站屏蔽我的爬虫
var headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
}

// request模块异步fetch url
function request(url, callback) {
    var options = {
        url: url,
        encoding: null,
        //proxy: 'http://x.x.x.x:8080',
        headers: headers,
        timeout: 10000 //
    }
    myRequest(options, callback)
};

// 处理种子页面
function seedget() {
    request(seedURL, function(err, res, body) { // 读取种子页面
        // 用iconv转换编码，获取种子页面html
        var html = myIconv.decode(body, "gbk");
        // 用cheerio解析种子页面html
        var $ = myCheerio.load(html, { decodeEntities: true });
        // 获取种子页面里所有的新闻页面a链接
        var seedurl_news;
        try {
            seedurl_news = eval(seedURL_format);
        } catch (e) { console.log('url列表所处的html块识别出错：' + e) };
        seedurl_news.each(function(i, e) {
            var myURL = "";
            try {
                // 获取新闻页面的url
                var href = "";
                href = $(e).attr("href");
                if (href == undefined) {
                    return;
                }
                if (href && (href.toLowerCase().indexOf("http://") >= 0 || href.toLowerCase().indexOf("https://") >= 0)) {
                    myURL = href;
                } // 以"http://"开头的url 
                else if (href.startsWith("//")) {
                    myURL = "http:" + href;
                } // 以"//"开头的url
                else {
                    var lastIndex = seedURL.lastIndexOf("/");
                    myURL = seedURL.substr(0, seedURL.lastIndexOf("/", lastIndex - 1)) + href;
                } // 其他形式的url
            } catch (e) { console.log('识别种子页面中的新闻链接出错：' + e) }
            // 检验获取的url是否符合新闻页面url的正则表达式
            if (!url_reg.test(myURL)) return;
            // 在数据库中查询url是否已经存在
            var fetch_url_Sql = 'select url from fetches where url=?';
            var fetch_url_Sql_Params = [myURL];
            mysql.query(fetch_url_Sql, fetch_url_Sql_Params, function(qerr, vals, fields) {
                if (vals.length > 0) { // 若存在，无需存入数据库
                    console.log('URL duplicate!')
                } else newsGet(myURL); // 若不存在，读取新闻页面的具体信息
            });
        });
    });
};

// 处理新闻页面
function newsGet(myURL) {
    request(myURL, function(err, res, body) { // 读取新闻页面
        // 用iconv转换编码，获取新闻页面html
        var html_news = myIconv.decode(body, myEncoding);
        // 用cheerio解析新闻页面html
        var $ = myCheerio.load(html_news, { decodeEntities: true });
        myhtml = html_news;       
        console.log("转码读取成功:" + myURL);
        // 动态执行format字符串，构建json对象准备写入数据库
        var fetch = {};
        fetch.title = "";
        fetch.content = "";
        fetch.keywords = "";
        fetch.author = "";
        fetch.publish_date = "";
        fetch.url = myURL;
        fetch.source_name = source_name;
        fetch.source_encoding = myEncoding;
        fetch.crawltime = new Date();
        // 获取标题  
        if (title_format == "") {
            fetch.title = "";
        }
        else {
            fetch.title = eval(title_format);
        }
        // 获取内容
        if (content_format == "") {
            fetch.content = "";
        }
        else { // 去除作者信息
            fetch.content = eval(content_format).replace("\r\n" + fetch.author, "").trim();
        }
        // 获取关键词
        if (keywords_format == "") { // 若没有关键词，以source_name填充
            fetch.keywords = source_name;
        }
        else {
            fetch.keywords = eval(keywords_format);
        }
        // 获取作者
        if (!eval(author_format)) {
            fetch.author = source_name;
        }
        else {
            fetch.author = eval(author_format);
        }
        // 获取刊登日期
        if (!eval(date_format)) {
            fetch.publish_date = eval(date_format);
        }
        if(fetch.publish_date) {
            fetch.publish_date = regExp.exec(fetch.publish_date)[0];
        }
        else {
            fetch.publish_date = new Date().toLocaleDateString().split('/').join('-');
        }
        fetch.publish_date = fetch.publish_date.replace("年", "-");
        fetch.publish_date = fetch.publish_date.replace("月", "-");
        fetch.publish_date = fetch.publish_date.replace("日", "");
        fetch.publish_date = new Date(fetch.publish_date).toLocaleDateString().split('/').join('-');
        // 将新闻页面信息写入数据库
        if (fetch.title != "") {
            var fetchAddSql = 'INSERT INTO fetches_3(url,source_name,source_encoding,title,' +
                'keywords,author,publish_date,crawltime,content) VALUES(?,?,?,?,?,?,?,?,?)';
            var fetchAddSql_Params = [fetch.url, fetch.source_name, fetch.source_encoding,
            fetch.title, fetch.keywords, fetch.author, fetch.publish_date,
            fetch.crawltime.toLocaleDateString().split('/').join('-'), fetch.content];
            mysql.query(fetchAddSql, fetchAddSql_Params, function(qerr, vals, fields) {
                if (qerr) {
                    console.log(qerr);
                }
            });
        }
    });
}

// 开始爬虫
seedget();
