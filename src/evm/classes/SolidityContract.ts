// @ts-ignore
import * as coder from 'web3/lib/solidity/coder';

import * as checks from '../utils/checks';
import * as errors from '../utils/errors';

import { ABI, TXReceipt } from '../..';
import { Address, AddressType, Data, Gas, GasPrice, Nonce } from '../types';

import Account from './Account';
import SolidityFunction from './SolidityFunction';
import Transaction from './Transaction';


interface OverrideContractDeployParameters {
	gas?: Gas,
	gasPrice?: GasPrice,
	data?: Data
}

export interface ContractOptions {
	gas: Gas;
	gasPrice: GasPrice;
	from: Address;
	address?: Address;
	nonce?: Nonce;
	data?: Data;
	jsonInterface: ABI[];
}

export interface BaseContractSchema {
	[key: string]: (...args: any[]) => Transaction;
}

export default class SolidityContract<ContractFunctionSchema extends BaseContractSchema> {

	public methods: ContractFunctionSchema | BaseContractSchema;
	public web3Contract: any;
	public receipt?: TXReceipt;

	constructor(public options: ContractOptions, private host: string, private port: number) {
		this.options.address = options.address;
		this.methods = {};

		if (this.options.address) {
			this.attachMethodsToContract();
		}
	}

	public async deploy(account: Account, params?: any[], options?: OverrideContractDeployParameters): Promise<this> {
		if (this.options.address) {
			throw errors.ContractAddressFieldSetAndDeployed();
		}

		this.options.jsonInterface.filter((abi: ABI) => {
			if (abi.type === 'constructor' && (params)) {
				checks.requireArgsLength(abi.inputs.length, params.length);
			}
		});

		if (options) {
			this.options.data = options.data || this.options.data;
			this.options.gas = options.gas || this.options.gas;
			this.options.gasPrice = options.gasPrice || this.options.gasPrice;
		}

		if (this.options.data) {
			let encodedData = this.options.data;

			if (params) {
				encodedData = encodedData + this.encodeConstructorParams(params);
			}

			const transaction = new Transaction({
				from: this.options.from,
				data: encodedData,
				gas: this.options.gas,
				gasPrice: this.options.gasPrice,
				nonce: this.options.nonce
			}, this.host, this.port, false)
				.gas(this.options.gas)
				.gasPrice(this.options.gasPrice);

			await transaction.sign(account);
			await transaction.submit();

			const receipt = await transaction.receipt;

			return this.setAddressAndPopulate(receipt.contractAddress);
		} else {
			throw errors.InvalidDataFieldInOptions();
		}
	}

	public setAddressAndPopulate(address: string): this {
		this.options.address = new AddressType(address);
		this.attachMethodsToContract();
		return this;
	}

	public address(address: string): this {
		this.options.address = new AddressType(address);
		return this;
	}

	public gas(gas: Gas): this {
		this.options.gas = gas;
		return this;
	}

	public gasPrice(gasPrice: GasPrice): this {
		this.options.gasPrice = gasPrice;
		return this;
	}

	public data(data: Data): this {
		this.options.data = data;
		return this;
	}

	public JSONInterface(abis: ABI[]): this {
		this.options.jsonInterface = abis;
		return this;
	}

	private attachMethodsToContract(): void {
		if (!this.options.address) {
			throw new Error('Cannot attach functions. No contract address set.');
		}

		this.options.jsonInterface
			.filter((json) => json.type === 'function')
			.map((funcJSON: ABI) => {
				if (!this.options.address) {
					throw new Error('Cannot attach function');
				}

				const solFunction = new SolidityFunction(funcJSON, this.options.address, this.host, this.port);

				this.methods[funcJSON.name] = solFunction.generateTransaction.bind(solFunction, {
					gas: this.options.gas,
					gasPrice: this.options.gasPrice,
					from: this.options.from
				});
			});
	}

	private encodeConstructorParams(params: any[]): any {
		return this.options.jsonInterface.filter((json) =>
			json.type === 'constructor' && json.inputs.length === params.length
		)
			.map((json) => json.inputs.map((input) => input.type))
			.map((types) => coder.encodeParams(types, params))[0] || '';
	}

}
