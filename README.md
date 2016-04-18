Node一个经典的应用场景之一便是实时聊天程序，得益于HTML5定义的 websocket协议，服务器和客户端可以建立双向连接通道，以事件的方式，实现双向通信，客户端可以主动提交消息给服务端，服务端也可以主动推送消息给客户端。然而并不是每个浏览器都支持 websocket 协议，这便诞生了 Socket.io。

Socket.IO是一个开源的WebSocket库，它基于Node.js环境实现WebSocket服务端，同时也提供客户端JS库，可以工作在任何平台，如浏览器、手持设备等。

Socket.IO支持4种协议：WebSocket、htmlfile、xhr-polling、jsonp-polling，它会自动根据浏览 器选择适合的通讯方式，从而让开发者可以聚焦到功能的实现而不是平台的兼容性，同时Socket.IO具有不错的稳定性和性能。

本文使用 Node的 express 框架 + Socket.io 实现简易版聊天程序。
##当前执行环境
node v5.1.0  
npm 3.3.12  
package.json 内容：

	{
	  ...
	  "dependencies": {
	    "cookie-parser": "^1.4.1",
	    "express": "^4.13.4",
	    "socket.io": "^1.4.5"
	  }
	  ...
	}

##项目架构
	├── app.js
	├── home.html
	├── package.json
	├── public
    	├── js
        	└──cookie.js
cookie.js 封装了一个全局对象 Cookie，用来读写 cookie, cookie.js 的完整内容可以查看文章最后的源码文件。
app.js 是项目的入口文件。
home.html 是聊天室静态 html 页面
##自定义事件
'nickname' 为客户端推送和服务端监听的昵称事件；
'nicknames' 为服务端推送和客户端监听的全体昵称事件；
'message' 为客户端推送和监听，服务端推送的聊天消息事件；

##服务端程序逻辑
app.js 文件完整内容如下：  
	
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
	    io.emit('nicknames', nicknames);
	    
		// 监听 nicname 事件 校验客户端推送过来的 nickname 
		socket.on('nickname', function(data, callback) {
			callback = callback || function(){};
		    // nickname 已经存在 返回错误信息
		    if (nicknames.indexOf(data) &gt; -1) {
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
		    if (nicknames.indexOf(socket.nickname) &gt; -1) {
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
分步说明核心逻辑:

1、启用 socket服务
<pre class="lang:default decode:true " >
...
var express = require('express');
var app = express();
...
// 创建 websocket 服务
var server = http.createServer(app);
var io = require('socket.io')(server);
...
</pre> 
2、监听和推送核心逻辑
核心逻辑主要分2块，第一块跟昵称相关的设置昵称和广播昵称列表，第二块聊天
昵称相关的主要思路如下：  
1)socket连接成功，推送当前用户列表给客户端  

	// 监听socket连接
	io.on('connection', function(socket) {
	    //...
	    socket.emit('nicknames', nicknames);
	    // ...
	})
	
2)监听客户端推送过来的 nickname 事件，先检测当前设置的 nickname已经存在于服务器(即被他人使用)，则利用 socket 的事件回调，返回错误信息告知客户端昵称设置失败；反之，缓存当前昵称至全局的 nicknames 数组，同时将该数组广播给所有客户端(包括当前连接的客户端)

	io.on('connection', function(socket) {
	    //...
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
	    })
	    // ...
	})
	
聊天相关的：
监听客户端推送过来的 message 事件，同时广播给所有在连的客户端

	io.on('connection', function(socket) {
	    //...
	    // 监听 客户端消息推送
	    socket.on('message', function(data) {
	        io.emit('message', {
	            nickname: data.nickname,
	            msg: data.msg
	        });
	    })
	    // ...
	})

断开连接处理思路:
清除当前昵称，从昵称列表里面剔除已经断开连接的昵称，同时广播给所有客户端。 

	io.on('connection', function(socket) {
	    //...
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
	    // ...
	})


##编写静态聊天室页面
静态页面的逻辑比较简单，主要逻辑包括  
1、验证和设置用户昵称，设置成功则存入 cookie 下次直接使用 cookie 中的昵称；  
2、客户端推送信息给服务端，同时监听服务端推送来的聊天消息；  
3、监听服务端推送过来的昵称列表，重新初始化右侧昵称列表面板；  
代码用的原生 js，感兴趣可以自行换成其他 js 类库。

	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<title>Document</title>
	<style>
		html,body,div,section,form,button,input,ul,li,p,textarea { margin: 0; padding: 0; outline: none; }
		body { font-size: 12px;  } 
		li { list-style: none;  }
		p { line-height: 1.5;  }
		textarea,button { border: none; }
		form { margin: 10px 0 10px;  }
		.layout { overflow: hidden; padding: 10px; }
		.message-box,
		.user-box { border: 1px solid #ccc; height: 300px; overflow: auto; float: left;  }
		.message-box { width: 300px; }
		.user-box .tit,
		.user-box p { padding-left: 10px; }
		.message-list { height: 85%; border-bottom: 1px solid #ccc; padding: 5px;  }
		.user-box { width: 150px; }
		.msg { height: 15%; width: 80%; border-right: 1px solid #ccc; padding: 5px; }
		.send-btn { width: 18%; height: 15%; -webkit-appearance : none; background: none; }
		.none { display: none;  }
		.i-b { display: inline-block; vertical-align: middle;  }
		.mb-10 { margin-bottom: 10px;  } 
		.border-box { -webkit-box-sizing : border-box; -moz-box-sizing : border-box; -ms-box-sizing : border-box; box-sizing : border-box;}
		.tit { height: 25px; line-height: 25px; border-bottom: 1px solid #ccc; }
		.t-r { text-align: right;  }  
	</style>
	</head>
	<body>
	<div class="layout">
		<span id="nickname-txt" class="none mb-10"></span>
		<form  id="nickname-form">
			<input type="text" name="nickname" placeholder="请填写昵称" />
			<input type="submit" value="提交昵称">
			<span class="tip none"></span>
		</form>
		<div class="message-box border-box">
			<div class="message-list border-box"></div>
			<textarea name="msg" class="msg i-b border-box" placeholder="说点啥呗"></textarea>
			<button class="send-btn i-b">发送</button>
		</div>
		<div class="user-box border-box"></div>
	</div>
	<script src="/js/socket.io.js"></script>
	<script src="/js/cookie.js"></script>
	<script>
	document.addEventListener('DOMContentLoaded', function(){
		var socket = io.connect('127.0.0.1:3000');
		var form = document.querySelector('#nickname-form'),
			nicknameInput = document.querySelector('input[name=nickname]'),
			userBox = document.querySelector('.user-box'),
			msgBox = document.querySelector('.message-list'),
			tip = document.querySelector('.tip');
	
		var msg = document.querySelector('.msg');
	
		// 标记当前 nickname 是否验证通过
		var nicknameOk = false;
		var name = Cookie.get('nickname');
	
		// 尝试从 cookie 读取昵称 若不存在，则用户填写昵称
		if(!name){
			// 填写昵称
			form.addEventListener('submit', function(e){
				var v = nicknameInput.value.trim();
				e = e || event;
				e.preventDefault();
	
				if(!v){
					alert('请输入昵称');
					return;
				}
	
				// 推送当前昵称给服务器校验
				socket.emit('nickname', v, function(data){
					// 校验成功
					if(data && data.msg === 'ok'){
						showNickname(v);
						Cookie.set('nickname', v, 3);
						return;
					}
					// 校验失败
					tip.style.display = 'inline-block';
					tip.innerHTML = data.msg;
				});
	
			}, false);
		}
		// 若存在 昵称直接从 cookie 中读取 同时推送昵称给服务器
		else {
			showNickname(name);
			socket.emit('nickname', name);
		}
	
		// 发送信息
		document.querySelector('.send-btn').addEventListener('click', function(e){
			e = e || event;
			e.preventDefault();
			if(!nicknameOk){
				alert('先填个昵称呗');
				return;
			}
	
			if(!msg.value){
				alert('啥也不写发毛线呢');
				return;
			}
	
			// 推送消息给服务器
			socket.emit('message', {
				nickname : name,
				msg : msg.value
			});
		}, false);
	
		// 监听服务器推送过来的消息
		socket.on('message', function(data){
			var node = document.createElement('p');
			if(data.nickname === name){
				node.classList.add('t-r');
			}
			node.innerHTML = data.nickname + "说:" + data.msg;
			prepend(msgBox, node);
			msg.value = '';
		})
	
		// 监听当前 nicknames列表
		socket.on('nicknames', function(data){
			console.log('nicknames', data);
			var html = '<div class="tit">在线成员:<span">（<%=num%>）</span></div>'.replace(/<%\=num%>/, data.length);
			data.forEach(function(v, i){
				html += '<p>' + v + '</p>';
			})
			userBox.innerHTML = html;
		})
	
		function showNickname(nickname){
			document.querySelector('#nickname-txt').style.display = 'block';
			document.querySelector('#nickname-txt').innerHTML = '您好,' + nickname;
			form.parentNode.removeChild(form);
			tip.innerHTML = '';
			nicknameOk = true;
			name = nickname;
		}
	
	
		function prepend(parentNode, node){
			if(parentNode.hasChildNodes()){
				parentNode.insertBefore(node, parentNode.firstChild);
			}
			else {
				parentNode.appendChild(node);
			}
		}
	}, false);
	
	</script>
	</body>
	</html> 
##如何使用
	$ cd chatroom
	$ npm install
	$ node app.js
	
	
