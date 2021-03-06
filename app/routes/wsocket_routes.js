module.exports = function (server) {
    const checkStrategy = require('../authorisation/oauth').checkStrategy;
    const RecommendationModel = require('../libs/mongoose').RecommendationModel;
    const CarOrderModel = require('../libs/mongoose').CarOrderModel;

    const io = require('socket.io')(server);

    io.use(function (socket, next) {
        console.log('socket try to connect');
        let token = socket.handshake.headers.authorization;
        checkStrategy(token,function (err, user) {
            if (!user) {
                return next(new Error(err));
            }
                if (!err){
                    socket.user = user;
                    return next()
                }
             else {
                return next(new Error('Server error'))
            }
        });
    });

    io.on('connection', function (socket) {
        socket.leaveAll();
        const user = socket.user;
        const room = String(user.companyName);
        console.log('User ' + user.username + ' connected on websocket');
        socket.join(room);
        console.log('user joined to room - ' + room);

        socket.on('disconnect', function () {
            console.log('User '+ user.username +' disconnected');
        });

        socket.on('add message', function (data, callback) {
            console.log(data);
            addMessage(data, socket,callback);
        });

        socket.on('get messages', function(data) {
            const limit = Number(data.limit);
            const offset = Number(data.offset);
            const orderNum = Number(data.orderNum);
            getMessages(socket, limit, offset, orderNum)
        });

        socket.on('delete message', function (data) {
            const _id = Number(data._id);
            deleteMessage(socket,_id)
        })

    });

    function addMessage (data, socket,callback) {
        const recommendation = new RecommendationModel ({
            companyName: socket.user.companyName,
            orderNum : data.orderNum,
            username : socket.user.username,
            message : data.message
        });
        recommendation.save(function (err, recommendation) {
            if (!recommendation) {
                return callback(404)
            }
            if (!err) {
                CarOrderModel.findOneAndUpdate({companyName: socket.user.companyName, orderNum: data.orderNum},
                    {updateDate: Date.now()},{new: true},function (err, order) {
                    });
                socket.to(socket.user.companyName).emit('get new message',
                    {
                        created: recommendation.created,
                        isMy: recommendation.isMy,
                        username: recommendation.username,
                        message: recommendation.message,
                        _id: recommendation._id
                });
                callback(200)
            } else {
                callback(500)
            }
        })
    }

    function getMessages(socket, limit, offset, orderNum) {
        RecommendationModel.find({companyName: socket.user.companyName, orderNum: orderNum},{__v:0, companyName:0, orderNum:0}).limit(limit).skip(offset).exec( function (err, recommendation) {
            if (!recommendation) {
                return socket.emit('get messages response', {error: 'Not found'});
            }
            if (!err) {
                recommendation.map(message => {
                    if (message.username === socket.user.username) {
                        message.isMy = true}}
                );
                return socket.emit('get messages response', recommendation);
            } else {
                return socket.emit('get messages response', {error: 'Server error'});
            }
        });
    }

    function deleteMessage(socket, _id) {
        RecommendationModel.findOneAndUpdate({username: socket.user.username, _id: _id},{message: 'This message was deleted'},{new: true},function (err,recommendation) {
            if (!recommendation) {
                return socket.emit('delete message response', {error: 'not found'});
            }
            if (!err) {
                return socket.emit('delete message response', {recommendation})
            } else {
                return socket.emit('delete message response', {error: 'Server error'})            }
        })
    }
};