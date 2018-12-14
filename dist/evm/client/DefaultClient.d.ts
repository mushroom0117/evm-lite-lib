import { BaseAccount } from "../classes/Account";
import BaseClient from "./BaseClient";
export default abstract class DefaultClient extends BaseClient {
    protected constructor(host: string, port: number);
    getAccount(address: string): Promise<BaseAccount>;
    testConnection(): Promise<boolean>;
    getAccounts(): Promise<BaseAccount[]>;
    getInfo(): Promise<object>;
}