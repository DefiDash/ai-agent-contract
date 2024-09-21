"use strict";
/// <summary>
/// This file will contain a list of all the output schemas (graphs)
/// that will be displayed and appended to the final result
/// </summary>
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnResponse = exports.Status = exports.TableSchema = void 0;
/// The Base Schema class that handles all the different types of schemas
var Schema = /** @class */ (function () {
    function Schema(type, labels, data) {
        this.type = type;
        this.labels = labels;
        this.data = data;
    }
    Schema.prototype.generateSchema = function () {
        return JSON.stringify(this);
    };
    return Schema;
}());
/// The Table Schema class that extends the Schema class
var TableSchema = /** @class */ (function (_super) {
    __extends(TableSchema, _super);
    function TableSchema(columns, data) {
        return _super.call(this, "Table", columns, data) || this;
    }
    return TableSchema;
}(Schema));
exports.TableSchema = TableSchema;
var Status;
(function (Status) {
    Status["success"] = "success";
    Status["error"] = "error";
})(Status || (exports.Status = Status = {}));
/// The Return Response that handles the response
var ReturnResponse = /** @class */ (function () {
    function ReturnResponse(status, response) {
        this.response = response;
    }
    ReturnResponse.prototype.generateResponse = function () {
        return JSON.stringify(this.response);
    };
    return ReturnResponse;
}());
exports.ReturnResponse = ReturnResponse;
