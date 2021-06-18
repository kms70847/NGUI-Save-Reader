//main file for using the ngui reader in a node environment

const ngui = require("./src/ngui")
const fs = require("fs");

function sample(){
    const filename = "res/saves/github.txt";
    encoded_data = fs.readFileSync(filename);
    let data = ngui.decode_save(encoded_data, true);
    
    const outfilename = "res/output/result.json";
    fs.writeFileSync(outfilename, data);
    console.log("data written to", outfilename);
}

sample();