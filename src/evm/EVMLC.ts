import * as fs from 'fs';
import * as solc from 'solc';

import { Address, AddressType, Gas, GasPrice, Value } from './types';
import { ABI } from './utils/Interfaces';

import Transaction, { BaseTX } from './classes/Transaction';

import SolidityContract, {
	BaseContractSchema
} from './classes/SolidityContract';
import DefaultClient from './client/DefaultClient';

interface UserDefinedDefaultTXOptions extends BaseTX {
	from: string;
}

interface DefaultTXOptions extends BaseTX {
	from: Address;
}

export default class EVMLC extends DefaultClient {
	private readonly defaultTXOptions: DefaultTXOptions;

	constructor(
		host: string,
		port: number,
		private readonly userDefaultTXOptions: UserDefinedDefaultTXOptions
	) {
		super(host, port);

		this.defaultTXOptions = {
			...userDefaultTXOptions,
			from: new AddressType(userDefaultTXOptions.from)
		};
	}

	get defaultOptions(): UserDefinedDefaultTXOptions {
		return this.userDefaultTXOptions;
	}

	get defaultFrom(): string {
		return this.defaultTXOptions.from.value;
	}

	set defaultFrom(address: string) {
		this.defaultTXOptions.from = new AddressType(address);
	}

	get defaultGas(): Gas {
		return this.defaultTXOptions.gas;
	}

	set defaultGas(gas: Gas) {
		this.defaultTXOptions.gas = gas;
	}

	get defaultGasPrice(): GasPrice {
		return this.defaultTXOptions.gasPrice;
	}

	set defaultGasPrice(gasPrice: GasPrice) {
		this.defaultTXOptions.gasPrice = gasPrice;
	}

	public compileContract(name: string, path: string) {
		const output = solc.compile(fs.readFileSync(path, 'utf8'), 1);
		const ABI: any[] = JSON.parse(output.contracts[`:${name}`].interface);
		const bytecode: string = output.contracts[`:${name}`].bytecode;

		return {
			abi: ABI,
			bytecode
		};
	}

	public loadContract<ContractSchema extends BaseContractSchema>(
		abi: ABI[],
		options?: { data?: string; contractAddress?: string }
	): Promise<SolidityContract<ContractSchema>> {
		this.requireAddress();

		const data: string = (options && options.data) || '';
		const address =
			options && options.contractAddress
				? new AddressType(options.contractAddress)
				: undefined;

		return this.getAccount(this.defaultFrom.trim()).then(
			account =>
				new SolidityContract<ContractSchema>(
					{
						from: this.defaultTXOptions.from,
						interface: abi,
						gas: this.defaultTXOptions.gas,
						gasPrice: this.defaultTXOptions.gasPrice,
						nonce: account.nonce,
						address,
						data
					},
					this.host,
					this.port
				)
		);
	}

	public prepareTransfer(
		to: string,
		value: Value,
		from?: string
	): Promise<Transaction> {
		const fromObject = new AddressType((from || this.defaultFrom).trim());

		if (!fromObject.value) {
			throw new Error(
				'Default `from` address cannot be left blank or empty.'
			);
		}

		if (!to) {
			throw new Error('Must provide a `to` address!');
		}

		if (value <= 0) {
			throw new Error(
				'A transfer of funds must have a `value` greater than 0.'
			);
		}

		return this.getAccount(fromObject.value).then(
			account =>
				new Transaction(
					{
						from: fromObject,
						to: new AddressType(to.trim()),
						value,
						gas: this.defaultGas,
						gasPrice: this.defaultGasPrice,
						nonce: account.nonce,
						chainId: 1
					},
					this.host,
					this.port,
					false
				)
		);
	}

	private requireAddress() {
		if (!this.defaultTXOptions.from.value) {
			throw new Error(
				'Default from address cannot be left blank or empty!'
			);
		}
	}
}
