import AddressType from './lib/AddressType';
import ArrayType from './lib/ArrayType';
import BooleanType from './lib/BooleanType';
import ByteType from './lib/ByteType';
import EVMType from './lib/EVMType';
import StringType from './lib/StringType';
export { AddressType, ArrayType, BooleanType, ByteType, StringType, EVMType };
export * from './lib/TransactionTypes';
export declare function parseSolidityTypes(raw: string): AddressType | BooleanType | ByteType | StringType | ArrayType<ByteType> | undefined;
