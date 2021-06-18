exports.Unpacker = class {
    constructor(buffer){
        this.buffer = buffer;
        this.idx = 0;
    }

    read_byte(){
        let result = this.buffer[this.idx];
        this.idx += 1;
        return result;
    }

    read_int32(){
        let result = this.buffer.readInt32LE(this.idx);
        this.idx += 4;
        return result;
    }

    read_uint64(){
        let result = 0n;
        for(let i = 0n; i < 64; i += 8n){
            result |= BigInt(this.read_byte()) << i;
        }
        return result;
    }

    read_int64(){
        //hmm, Node can't find buffer.readBigInt64LE.
        //maybe it's because my version is outdated.

        let x = this.read_uint64();
        if (x >> 63n){
            return x - (1n << 64n)
        }
        else{
            return x;
        }
    }

    read_double(){
        let result = this.buffer.readDoubleLE(this.idx);
        this.idx += 8;
        return result;
    }

    read_single(){
        let result = this.buffer.readFloatLE(this.idx);
        this.idx += 4;
        return result;
    }

    read_7_bit_int(){ //NRBF 2.1.1.6
        let val = 0
        for (let i = 0; i < 4; i += 1){
            let x = this.read_byte();
            val |= (x & 0x7F) << (i*7);
            if (x <= 0x7F){
                return val;
            }
        }
        x = this.read_byte() & 0x7F
        return val | (x << (4*7));
    }

    read_string(){ //NRBF 2.1.1.6
        let size = this.read_7_bit_int();
        let result = this.buffer.slice(this.idx, this.idx+size).toString();
        this.idx += size;
        return result;
    }
}