const RecordType = { //NRBF 2.1.2.1
    SerializedStreamHeader: 0,
    ClassWithId: 1,
    SystemClassWithMembersAndTypes: 4,
    ClassWithMembersAndTypes: 5,
    BinaryObjectString: 6,
    BinaryArray: 7,
    MemberReference: 9,
    MessageEnd: 11,
    ObjectNull: 10,
    BinaryLibrary: 12,
    ObjectNullMultiple256: 13,
    ObjectNullMultiple: 14,
    ArraySinglePrimitive: 15,
};

const BinaryType = { //NRBF 2.1.2.2
    Primitive: 0,
    String: 1,
    //Object: 2,
    SystemClass: 3,
    Class: 4,
    //ObjectArray: 5,
    //StringArray: 6,
    PrimitiveArray: 7
};

const PrimitiveType = {
    Boolean: 1,
    Double: 6,
    Int32: 8,
    Int64: 9,
    SByte: 10,
    Single: 11,
};

const BinaryArrayType = {
    Single: 0,
    Jagged: 1,
    Rectangular: 2,
    SingleOffset: 3,
    JaggedOffset: 4,
    RectangularOffset: 5
};

exports.parse = function(unpacker){

    class TypedValue {
        //small hack that makes it easier to recurse through our nested data structure after parsing.
        constructor(name, value){
            this.strong_type_name = name;
            this.value = value;
        }
    }

    function __read_primitive(unpacker, t){
        switch(t){
            case PrimitiveType.Double:
                return unpacker.read_double();
            case PrimitiveType.Single:
                return unpacker.read_single();
            case PrimitiveType.Boolean:
                return unpacker.read_byte() == 1;
            case PrimitiveType.Int32: 
                return unpacker.read_int32();
            case PrimitiveType.Int64:
                return unpacker.read_int64();
            case PrimitiveType.SByte:
                return unpacker.read_byte();
            default:
                throw `primitive not implemented: ${t}`;
        }
    }
    function read_primitive(unpacker, t){
        return new TypedValue("primitive", __read_primitive(unpacker, t))
    }


    function read_class_instance(unpacker, schema){
        let instance = {};
        for(let i = 0; i < schema.MemberCount; i += 1){
            let name = schema.MemberNames[i];
            let t = schema.BinaryTypeEnums[i];
            let additional_info = schema.AdditionalInfos[i];


            switch(t){
                case BinaryType.Primitive:
                    instance[name] = read_primitive(unpacker, additional_info);
                    break;
                default:
                    instance[name] = read_record(unpacker);
            }
        }
        return new TypedValue("dict", instance);
    }

    function read_binary_array(unpacker){
        let binaryArrayType = unpacker.read_byte()
        let rank = unpacker.read_int32();
        let lengths = [];
        for(let i = 0; i < rank; i += 1){
            lengths.push(unpacker.read_int32());
        }
        
        switch(binaryArrayType){
            case BinaryArrayType.SingleOffset:
            case BinaryArrayType.JaggedOffset: 
            case BinaryArrayType.RectangularOffset:
            throw "todo: LowerBounds for binaryArrayTypes with offsets";
        }

        let t = unpacker.read_byte() //BinaryType
        let additional_type_info = null;

        //collect additional data. We're not actually interested in it, so we just remove it from the stream and discard it.
        switch(t){
            case BinaryType.SystemClass:
                unpacker.read_string();
                break;
            case BinaryType.Class:
                unpacker.read_string();
                unpacker.read_int32();
                break;
            default:
                throw `Not implemented: additional info for array of BinaryType ${t}`;
        }

        switch(binaryArrayType){
            case BinaryArrayType.Single:
                let results = [];
                for(let i = 0; i < lengths[0]; i += 1){
                    results.push(read_record(unpacker))
                }
                return new TypedValue("array", results);
            default:
                `Not implemented: array parsing for BinaryArrayType ${binaryArrayType}`;
        }

    }

    function read_class_info(unpacker){ //NRBF 2.3.1.1.
        let schema = {
            ObjectId: unpacker.read_int32(), 
            Name: unpacker.read_string(), 
            MemberCount: unpacker.read_int32(),
            MemberNames: [],
            BinaryTypeEnums: [],
            AdditionalInfos: []
        };
        for (let i = 0; i < schema.MemberCount; i += 1){
            schema.MemberNames.push(unpacker.read_string());
        }

        //NRBF 2.3.1.2

        for(let i = 0; i < schema.MemberCount; i += 1){
            schema.BinaryTypeEnums.push(unpacker.read_byte());
        }

        for(let i = 0; i < schema.MemberCount; i += 1){
            let t = schema.BinaryTypeEnums[i];
            switch(t){
                case BinaryType.String:
                    schema.AdditionalInfos.push(null);
                    break;
                case BinaryType.Class:
                    schema.AdditionalInfos.push({"Name": unpacker.read_string(), "LibraryId": unpacker.read_int32()});
                    break;
                case BinaryType.SystemClass:
                    schema.AdditionalInfos.push(unpacker.read_string());
                    break;
                case BinaryType.Primitive:
                    schema.AdditionalInfos.push(unpacker.read_byte()); //PrimitiveType
                    break;
                case BinaryType.PrimitiveArray:
                    schema.AdditionalInfos.push(unpacker.read_byte()); //PrimitiveType
                    break;
                default:
                    throw `Not implmented: BinaryType ${t}`
            }
        }

        return schema;

    }

    function read_record(unpacker, toplevel=false){
        if (virtual_nulls > 0){
            virtual_nulls -= 1;
            return new TypedValue("null", null);
        }
        t = unpacker.read_byte();
        switch(t){
            case RecordType.SerializedStreamHeader:
                return {
                    "RootId": unpacker.read_int32(),
                    "HeaderId": unpacker.read_int32(),
                    "MajorVersion": unpacker.read_int32(),
                    "MinorVersion": unpacker.read_int32()
                };
            case RecordType.BinaryLibrary:
                return {
                    "LibraryId": unpacker.read_int32(),
                    "LibraryName": unpacker.read_string()
                }
            case RecordType.SystemClassWithMembersAndTypes:
            case RecordType.ClassWithMembersAndTypes:
                let schema = read_class_info(unpacker);
                if (t == RecordType.ClassWithMembersAndTypes){
                    let LibraryId = unpacker.read_int32();
                }

                schemas[schema.ObjectId] = schema;
                let instance = read_class_instance(unpacker, schema);
                records[schema.ObjectId] = instance;
                return instance;
            case RecordType.ClassWithId:
                {//create anonymous scope so we can use `let` statements with the same name as in other cases
                let ObjectId = unpacker.read_int32();
                let schemaId = unpacker.read_int32();
                let instance = read_class_instance(unpacker, schemas[schemaId]);
                records[ObjectId] = instance;
                return instance;
                }
            case RecordType.BinaryObjectString:
                let ObjectId = unpacker.read_int32();
                let value = new TypedValue("primitive", unpacker.read_string());
                records[ObjectId] = value;
                return value;
            case RecordType.ArraySinglePrimitive:
            {
                let ObjectId = unpacker.read_int32();
                let Length = unpacker.read_int32();
                let t = unpacker.read_byte(); //PrimitiveType
                let value = [];
                for(let i = 0; i < Length; i += 1){
                    value.push(read_primitive(unpacker, t));
                }
                value = new TypedValue("array", value);
                records[ObjectId] = value;
                return value;
            }
            case RecordType.BinaryArray:
            {
                let ObjectId = unpacker.read_int32();
                let value = read_binary_array(unpacker);
                records[ObjectId] = value;
                return value;
            }    
            case RecordType.MemberReference:
                return new TypedValue("surrogate", unpacker.read_int32());
            case RecordType.ObjectNull:
                return new TypedValue("null", null);
            case RecordType.ObjectNullMultiple256:
                virtual_nulls += unpacker.read_byte() - 1;
                return new TypedValue("null", null);
            case RecordType.ObjectNullMultiple:
                virtual_nulls += unpacker.read_int32() - 1;
                return new TypedValue("null", null);
            case RecordType.MessageEnd:
                return MessageEndSentinel;
            default:
                throw `Not implemented: RecordType ${t}`;
        }
    }

    function combine_records(records, top_level_id){
        //combines the elements of the records table into a single object.

        function copy_without_surrogates(obj){
            
            //recurse through our data structure, replacing all surrogates with actual references, and stripping out all the TypedValue layers.
            if (!obj.hasOwnProperty("strong_type_name")){
                console.log(obj);
                throw `didn't expect weakly typed object here: ${obj}`;
            }
            switch(obj.strong_type_name){
                case "primitive":
                case "null":
                    return obj.value;
                case "dict":{
                    let d = obj.value;
                    if (d.hasOwnProperty("_items")){
                        //C# Lists have an extra layer of indirection we don't care about, may as well remove it here.
                        return copy_without_surrogates(d["_items"]).slice(0, d._size.value);
                    }
                    if (d.hasOwnProperty("value__")){
                        //may as well stirp enums too.
                        return copy_without_surrogates(d["value__"]);
                    }
                    let result = {};
                    for(var key in d){
                        result[key] = copy_without_surrogates(d[key]);
                    }
                    return result;
                }
                case "array":{
                    let seq = obj.value;
                    let result = [];
                    for(let i = 0; i < seq.length; i += 1){
                        result.push(copy_without_surrogates(seq[i]));
                    }
                    return result;
                }
                case "surrogate":
                    return copy_without_surrogates(records[obj.value]);
                default:
                    throw `Unrecognized type ${obj.strong_type_name}`;
            }
        }

        return copy_without_surrogates(records[top_level_id]);
    }

    //The ObjectNullMultiple RecordTypes effectively insert virtual nulls into the stream that aren't actually present in the real data.
    let virtual_nulls = 0;

    //Class definitions will be declared by RecordType.ClassWithMembersAndTypes,
    //and we need to remember them so "Class without members and types" can use them later.
    //keys are ObjectIds (which the schema shares with the class instance following it, but there is no ambiguity since context is always clear)
    let schemas = {};

    //also keyed by ObjectId
    let records = {};

    let MessageEndSentinel = new Object();
    
    let header = read_record(unpacker);

    while(true){
        let record = read_record(unpacker, true);
        if (record === MessageEndSentinel){
            break;
        }
    }

    return {
        "header": header,
        "records": records,
        "schema": schemas,
        "final": combine_records(records, header.RootId)
    }
}