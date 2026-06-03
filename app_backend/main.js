
var http = require('http');//node js is a asynchronous programming language, it does not wait for the response to come back, it moves on to the next line of code, and when the response comes back, it executes the callback function. This is called non-blocking I/O. This is why we use callbacks in node js, to handle the response when it comes back. This is also why we use promises and async/await in node js, to handle the asynchronous nature of node js. This is also why we use event emitters in node js, to handle events that happen in node js. This is also why we use streams in node js, to handle large amounts of data that come in chunks. This is also why we use buffers in node js, to handle binary data. This is also why we use modules in node js, to organize our code and reuse it. This is also why we use npm in node js, to manage our dependencies and packages. This is also why we use express in node js, to create web applications and APIs. This is also why we use mongoose in node js, to interact with MongoDB databases. This is also why we use socket.io in node js, to create real-time applications and chat applications. This is also why we use passport in node js, to handle authentication and authorization. This is also why we use bcrypt in node js, to hash passwords and secure user data. This is also why we use jsonwebtoken in node js, to create and verify JSON Web Tokens for authentication and authorization. This is also why we use cors in node js, to handle cross-origin resource sharing and allow requests from different origins. This is also why we use dotenv in node js, to manage environment variables and keep sensitive information out of our codebase.
let fs = require('fs');
http.createServer(function (request, response) {
    fs.readFile('./login.html', 'utf-8', (error, data) => {//readFile is a asynchronous function.
        if (error) {//read ia a synchronous function.
            console.error(error);
            response.writeHead(404);//,{ 'Content-Type': 'text/plain' });
            response.end('File not found');
            return;
        }
        else{
            response.writeHead(200, { 'Content-Type': 'text/html' });
            if(request.url === '/Index'){
                fs.readFile('./index.html', 'utf-8', (error, data) => {
                    if (error) {
                        console.error(error);
                        response.writeHead(404);//,{ 'Content-Type': 'text/plain' });
                        response.end('File not found');
                        return;
                    }
                    response.write(data);
                });
            } else {
                response.write(data);
            }
        }
        response.end();
    });
}).listen(3000);
// http.createServer(function (req, res) {
//     res.write('<h1>Our Program is running on port 3000</h1>');
//     res.end();
// }).listen(3000)