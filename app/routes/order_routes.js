module.exports = function (app) {

    const CarOrderModel = require('../libs/mongoose').CarOrderModel;
    const routerSaver = require('./route_saver');
    const oauth2 = require('../authorisation/oauth2');
    const passport = require('passport');

    app.get('/api/carorders/', passport.authenticate('bearer', { session: false }),
        function(req, res) {
            return CarOrderModel.find({companyID: req.user.companyID}, function (err, carOrder) {
                if (!carOrder) {
                    res.statusCode = 404;
                    return res.send({error: 'Not found'});
                }
                if (!err) {
                    console.log("Order request ok");
                    return res.send({status: 'OK', carOrder: carOrder});
                } else {
                    res.statusCode = 500;
                    console.log('Internal error: ' +  res.statusCode, err.message);
                    return res.send({error: 'Server error'});
                }
            });
        });

    app.post('/api/carOrders/',passport.authenticate('bearer', { session: false }),
        function(req, res) {
        return CarOrderModel.findOne({
            orderNum: req.body.orderNum,
            companyID: req.user.companyID
        }, function (err, carOrder) {
            if (!carOrder) {
                carOrder = CarOrderModel();
            }
            carOrder.companyID = req.user.companyID;
            carOrder.manufacturer = req.body.manufacturer;
            carOrder.model = req.body.model;
            carOrder.plate = req.body.plate;
            carOrder.date = req.body.date;
            carOrder.reason = req.body.reason;
            carOrder.status = req.body.status;
            carOrder.orderNum = req.body.orderNum;
            carOrder.save(routerSaver(carOrder,res))
        });
    });
};