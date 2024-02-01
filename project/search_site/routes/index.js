var express = require('express');
var router = express.Router();
var mysql = require('../mysql.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/process_get', function(request, response) {
    // sql字符串和参数
    if (request.query.type === "heat") { // 热度分析的请求格式
        var fetchSql = "select createtime " + 
        "from " + request.query.tablename + " where title like '%" + request.query.title1 + "%' and title like '%"  + request.query.title2 + "%'";
    }
    else { // 正常关键字搜索的请求格式
        var fetchSql = "select url,title,keywords,author,publish_date " + 
        "from " + request.query.tablename + " where title like '%" + request.query.title1 + "%' and title like '%"  + request.query.title2 + "%' and publish_date like '%"  + request.query.date + "%'";
    }
    mysql.query(fetchSql, function(err, result, fields) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        });
        response.write(JSON.stringify(result));
        response.end();
    });
});

module.exports = router;
