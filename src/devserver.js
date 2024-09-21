"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var outputSchema_1 = require("./outputSchema");
var app = (0, express_1.default)();
var port = 5000;
app.use(express_1.default.json());
app.post('/post', function (req, res) {
    var data = req.body;
    console.log('Received data:', data);
    res.send('Data received');
});
app.listen(port, function () {
    var exampleTable = new outputSchema_1.TableSchema(["Hello", "World"], [["12345", "yes"], ["1234", "no"]]);
    return new outputSchema_1.ReturnResponse(outputSchema_1.Status.success, [
        exampleTable
    ]).generateResponse();
});
