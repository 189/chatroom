var http = require('http');
var express = require('express');
var path = require('path');
var app = express();
var nicknames = []; // 存储所有在线的用户昵称列表

// 创建 websocket 服务
var server = http.createServer(app);
var io = require('socket.io')(server);

// 托管静态目录
app.use(express.static(path.join(__dirname, 'public')));

var port = process.env.PROT || 3000;

// 路由 响应 http:127.0.0.1:3000/ 请求
app.get('/', function(req, res) {
    res.sendFile('home.html', { root: __dirname, dotfiles: 'deny' });
})

// 监听socket连接
io.on('connection', function(socket) {
    console.log('socket connected');
    // 广播所有在线的用户
    socket.emit('nicknames', nicknames);

    // 监听 nicname 事件 校验客户端推送过来的 nickname 
    socket.on('nickname', function(data, callback) {
    	callback = callback || function(){};
        // nickname 已经存在 返回错误信息
        if (nicknames.indexOf(data) > -1) {
            callback({ msg: '昵称已经存在' });
            return;
        }
        // nickname 不存在，保存当前 nickname 至当前 socket
        socket.nickname = data;
        nicknames.push(data);
        
        // 推送返回设置成功的信息给客户端
        callback({
            msg: 'ok'
        });

        // 广播当前 nickname列表给所有客户端 包括当前sender
        io.emit('nicknames', nicknames);
        console.log(nicknames);
    })

    // 监听 客户端消息推送
    socket.on('message', function(data) {
        io.emit('message', {
            nickname: data.nickname,
            msg: data.msg
        });
    })

    // 监听 客户端 socket 断开连接
    socket.on('disconnect', function() {
        if (!socket.nickname) {
            return;
        }
        // 若客户端断开连接 清除当前存储在 socket 上的 nickname 属性
        // 清除存储中的 nickname
        if (nicknames.indexOf(socket.nickname) > -1) {
            nicknames.splice(nicknames.indexOf(socket.nickname), 1);
            delete socket.nickname;
        }
        // 广播nicknames 变动
        io.emit('nicknames', nicknames);
    })
})

// 服务器监听端口
server.listen(port);
console.log('server run ok');
