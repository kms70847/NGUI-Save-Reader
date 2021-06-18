const pako = require('pako')
const fs = require("fs")
const bigint = require('json-bigint');
const Unpacker = require("./unpacker").Unpacker;
const nrbf = require("./nrbf");

function g64_inflate(buf){
    buf = Buffer.from(buf.toString("ascii"), "base64");
    return Buffer.from(pako.inflate(buf));
}

exports.decode_save = function (arraybuf, stringify_result = false){
    let buf = Buffer.from(arraybuf);
    //layer 1: extract the _real_ data from the SaveData and checksum dict
    let unpacker = new Unpacker(g64_inflate(buf));
    let record = nrbf.parse(unpacker)["final"];

    //layer 2: parse the real data
    unpacker = new Unpacker(g64_inflate(record.data));
    record = nrbf.parse(unpacker)["final"];

    if (stringify_result){
        return bigint.stringify(record);
    }
    else{
        return record;
    }
}